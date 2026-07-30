import type { VgaEngine } from '../algebra/vgaEngine'
import type {
  ExpressionDocument,
  ExpressionItem,
} from '../document/expressionDocument'
import type { SourceSpan } from '../domain/diagnostic'
import type { OwnedMultivector } from '../domain/multivector'
import { evaluateExpression } from '../evaluation/evaluateExpression'
import type { SurfaceExpressionNode } from '../language/ast'
import { lowerExpression } from '../language/lowerExpression'
import {
  parseDocumentExpression,
  type ParsedDocumentExpression,
} from '../language/parseExpression'
import {
  presentEvaluation,
  type EvaluationState,
} from './evaluateSource'

export type EvaluatedDocumentItem = Readonly<{
  item: ExpressionItem
  position: number
  evaluation: EvaluationState | null
}>

type Reference = Readonly<{ name: string; span: SourceSpan }>

type ParsedItem = Readonly<{
  item: ExpressionItem
  position: number
  source: ParsedDocumentExpression
  references: readonly Reference[]
}>

function diagnostic(
  code: string,
  message: string,
  span: SourceSpan,
): EvaluationState {
  return {
    status: 'invalid',
    diagnostic: { code, severity: 'error', message, span },
  }
}

function collectReferences(expression: SurfaceExpressionNode): Reference[] {
  switch (expression.kind) {
    case 'reference':
      return [{ name: expression.name, span: expression.span }]
    case 'unary-expression':
      return collectReferences(expression.operand)
    case 'binary-expression':
      return [
        ...collectReferences(expression.left),
        ...collectReferences(expression.right),
      ]
    case 'vector-constructor':
      return expression.components.flatMap(collectReferences)
    case 'scalar-literal':
    case 'basis-blade':
      return []
  }
}

/**
 * Parses and evaluates a complete expression document.
 *
 * Declarations are resolved by name rather than row order. Invalid dependency
 * components do not prevent independent rows from producing values.
 */
export function evaluateDocument(
  document: ExpressionDocument,
  engine: VgaEngine,
): readonly EvaluatedDocumentItem[] {
  const parsedById = new Map<string, ParsedItem>()
  const results = new Map<string, EvaluationState | null>()

  document.items.forEach((item, index) => {
    if (item.source.trim() === '') {
      results.set(item.id, null)
      return
    }

    const parsed = parseDocumentExpression(item.source)
    if (!parsed.ok) {
      results.set(item.id, {
        status: 'invalid',
        diagnostic: parsed.diagnostic,
      })
      return
    }

    parsedById.set(item.id, {
      item,
      position: index + 1,
      source: parsed.source,
      references: collectReferences(parsed.source.expression),
    })
  })

  const declarations = new Map<string, ParsedItem[]>()
  for (const parsed of parsedById.values()) {
    const declaration = parsed.source.declaration
    if (!declaration) continue
    const entries = declarations.get(declaration.name) ?? []
    entries.push(parsed)
    declarations.set(declaration.name, entries)
  }

  for (const [name, entries] of declarations) {
    if (entries.length < 2) continue
    for (const entry of entries) {
      results.set(
        entry.item.id,
        diagnostic(
          'LANG_DUPLICATE_NAME',
          `The name “${name}” is declared more than once.`,
          entry.source.declaration!.span,
        ),
      )
    }
  }

  const cycleIds = new Set<string>()
  const visited = new Set<string>()
  const visiting: string[] = []

  const findCycles = (entry: ParsedItem) => {
    if (visited.has(entry.item.id)) return
    const cycleStart = visiting.indexOf(entry.item.id)
    if (cycleStart >= 0) {
      visiting.slice(cycleStart).forEach((id) => cycleIds.add(id))
      return
    }

    visiting.push(entry.item.id)
    for (const reference of entry.references) {
      const targets = declarations.get(reference.name)
      if (targets?.length === 1) findCycles(targets[0])
    }
    visiting.pop()
    visited.add(entry.item.id)
  }

  parsedById.forEach(findCycles)
  for (const id of cycleIds) {
    const entry = parsedById.get(id)!
    results.set(
      id,
      diagnostic(
        'LANG_DEPENDENCY_CYCLE',
        'This declaration is part of a dependency cycle.',
        entry.source.declaration?.span ?? entry.source.expression.span,
      ),
    )
  }

  const evaluate = (entry: ParsedItem): EvaluationState => {
    const existing = results.get(entry.item.id)
    if (existing !== undefined && existing !== null) return existing

    const values = new Map<string, OwnedMultivector>()
    for (const reference of entry.references) {
      const targets = declarations.get(reference.name)
      if (!targets) {
        const invalid = diagnostic(
          'LANG_UNDEFINED_NAME',
          `The name “${reference.name}” is not defined.`,
          reference.span,
        )
        results.set(entry.item.id, invalid)
        return invalid
      }
      if (targets.length > 1) {
        const invalid = diagnostic(
          'LANG_DUPLICATE_NAME',
          `The name “${reference.name}” is declared more than once.`,
          reference.span,
        )
        results.set(entry.item.id, invalid)
        return invalid
      }

      const dependency = evaluate(targets[0])
      if (dependency.status === 'invalid') {
        const invalid = diagnostic(
          'LANG_INVALID_DEPENDENCY',
          `The dependency “${reference.name}” is invalid.`,
          reference.span,
        )
        results.set(entry.item.id, invalid)
        return invalid
      }
      values.set(reference.name, dependency.value)
    }

    const value = evaluateExpression(
      lowerExpression(entry.source.expression),
      engine,
      (name) => values.get(name)!,
    )
    const presented = presentEvaluation(
      value,
      entry.source.declaration?.name ?? `Vector ${entry.position}`,
    )
    results.set(entry.item.id, presented)
    return presented
  }

  parsedById.forEach(evaluate)

  return document.items.map((item, index) => ({
    item,
    position: index + 1,
    evaluation: results.get(item.id) ?? null,
  }))
}
