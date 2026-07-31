import type { VgaEngine } from '../algebra/vgaEngine'
import type {
  ExpressionDocument,
  ExpressionItem,
} from '../document/expressionDocument'
import type { SourceSpan } from '../domain/diagnostic'
import {
  inspectMultivector,
  type OwnedMultivector,
} from '../domain/multivector'
import { evaluateExpression } from '../evaluation/evaluateExpression'
import type { SurfaceExpressionNode } from '../language/ast'
import { lowerExpression } from '../language/lowerExpression'
import {
  parseDocumentExpression,
  parseExpression,
  type ParsedDocumentExpression,
} from '../language/parseExpression'
import { vectorToPrimitive } from '../visualization/primitives'
import {
  presentEvaluation,
  type EvaluationState,
} from './evaluateSource'

export type EvaluatedDocumentItem = Readonly<{
  item: ExpressionItem
  position: number
  evaluation: EvaluationState | null
  positionEvaluation: EvaluationState | null
  headInspection: string | null
}>

type NodeProperty = 'value' | 'position'
type ReferenceProperty = 'position' | 'head' | null
type Reference = Readonly<{
  name: string
  property: ReferenceProperty
  span: SourceSpan
}>
type ParsedNode = Readonly<{
  key: string
  item: ExpressionItem
  position: number
  property: NodeProperty
  expression: SurfaceExpressionNode
  declaration: ParsedDocumentExpression['declaration']
  references: readonly Reference[]
}>

function nodeKey(itemId: string, property: NodeProperty): string {
  return `${itemId}:${property}`
}

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
      return [{
        name: expression.name,
        property: expression.property,
        span: expression.span,
      }]
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

function isPositionValue(value: OwnedMultivector): boolean {
  const [scalar, , , bivector] = value.coefficients
  return scalar === 0 && bivector === 0
}

/**
 * Evaluates value and position sources as separate document graph nodes.
 *
 * Position metadata never enters the owned value. Missing and invalid
 * positions render at the origin while preserving a valid item value.
 */
export function evaluateDocument(
  document: ExpressionDocument,
  engine: VgaEngine,
): readonly EvaluatedDocumentItem[] {
  const nodes = new Map<string, ParsedNode>()
  const results = new Map<string, EvaluationState | null>()

  document.items.forEach((item, index) => {
    const valueKey = nodeKey(item.id, 'value')
    if (item.source.trim() === '') {
      results.set(valueKey, null)
    } else {
      const parsed = parseDocumentExpression(item.source)
      if (!parsed.ok) {
        results.set(valueKey, {
          status: 'invalid',
          diagnostic: parsed.diagnostic,
        })
      } else {
        nodes.set(valueKey, {
          key: valueKey,
          item,
          position: index + 1,
          property: 'value',
          expression: parsed.source.expression,
          declaration: parsed.source.declaration,
          references: collectReferences(parsed.source.expression),
        })
      }
    }

    const positionSource = item.positionSource?.trim() ?? ''
    if (!positionSource) return
    const positionKey = nodeKey(item.id, 'position')
    const parsedPosition = parseExpression(item.positionSource!)
    if (!parsedPosition.ok) {
      results.set(positionKey, {
        status: 'invalid',
        diagnostic: parsedPosition.diagnostic,
      })
    } else {
      nodes.set(positionKey, {
        key: positionKey,
        item,
        position: index + 1,
        property: 'position',
        expression: parsedPosition.expression,
        declaration: null,
        references: collectReferences(parsedPosition.expression),
      })
    }
  })

  const declarations = new Map<string, ParsedNode[]>()
  for (const node of nodes.values()) {
    if (node.property !== 'value' || !node.declaration) continue
    const entries = declarations.get(node.declaration.name) ?? []
    entries.push(node)
    declarations.set(node.declaration.name, entries)
  }

  for (const [name, entries] of declarations) {
    if (entries.length < 2) continue
    for (const entry of entries) {
      results.set(
        entry.key,
        diagnostic(
          'LANG_DUPLICATE_NAME',
          `The name “${name}” is declared more than once.`,
          entry.declaration!.span,
        ),
      )
    }
  }

  const dependencyKeys = (reference: Reference): string[] => {
    const targets = declarations.get(reference.name)
    if (targets?.length !== 1) return []
    const target = targets[0]
    if (reference.property === null) return [target.key]
    const positionKey = nodeKey(target.item.id, 'position')
    if (reference.property === 'position') {
      return nodes.has(positionKey) ? [positionKey] : []
    }
    return [
      target.key,
      ...(nodes.has(positionKey) ? [positionKey] : []),
    ]
  }

  const cycleKeys = new Set<string>()
  const visited = new Set<string>()
  const visiting: string[] = []
  const findCycles = (node: ParsedNode) => {
    if (visited.has(node.key)) return
    const cycleStart = visiting.indexOf(node.key)
    if (cycleStart >= 0) {
      visiting.slice(cycleStart).forEach((key) => cycleKeys.add(key))
      return
    }
    visiting.push(node.key)
    for (const reference of node.references) {
      dependencyKeys(reference).forEach((key) => {
        const dependency = nodes.get(key)
        if (dependency) findCycles(dependency)
      })
    }
    visiting.pop()
    visited.add(node.key)
  }
  nodes.forEach(findCycles)

  for (const key of cycleKeys) {
    const node = nodes.get(key)!
    results.set(
      key,
      diagnostic(
        'LANG_DEPENDENCY_CYCLE',
        `This ${node.property} source is part of a dependency cycle.`,
        node.declaration?.span ?? node.expression.span,
      ),
    )
  }

  const evaluateNode = (node: ParsedNode): EvaluationState => {
    const existing = results.get(node.key)
    if (existing !== undefined && existing !== null) return existing

    const resolved = new Map<string, OwnedMultivector>()
    for (const reference of node.references) {
      const targets = declarations.get(reference.name)
      if (!targets) {
        const invalid = diagnostic(
          'LANG_UNDEFINED_NAME',
          `The name “${reference.name}” is not defined.`,
          reference.span,
        )
        results.set(node.key, invalid)
        return invalid
      }
      if (targets.length > 1) {
        const invalid = diagnostic(
          'LANG_DUPLICATE_NAME',
          `The name “${reference.name}” is declared more than once.`,
          reference.span,
        )
        results.set(node.key, invalid)
        return invalid
      }

      const target = targets[0]
      const valueResult = evaluateNode(target)
      if (valueResult.status === 'invalid') {
        const invalid = diagnostic(
          'LANG_INVALID_DEPENDENCY',
          `The dependency “${reference.name}” is invalid.`,
          reference.span,
        )
        results.set(node.key, invalid)
        return invalid
      }

      if (
        reference.property !== null &&
        valueResult.entity?.kind !== 'vector-2d'
      ) {
        const invalid = diagnostic(
          'LANG_UNSUPPORTED_PROPERTY',
          `The value “${reference.name}” does not support position.`,
          reference.span,
        )
        results.set(node.key, invalid)
        return invalid
      }

      const positionNode = nodes.get(nodeKey(target.item.id, 'position'))
      let positionValue = engine.scalar(0)
      if (reference.property !== null && positionNode) {
        const positionResult = evaluateNode(positionNode)
        if (positionResult.status === 'invalid') {
          const invalid = diagnostic(
            'LANG_INVALID_DEPENDENCY',
            `The dependency “${reference.name}.position” is invalid.`,
            reference.span,
          )
          results.set(node.key, invalid)
          return invalid
        }
        positionValue = positionResult.value
      }

      let value = positionValue
      if (reference.property !== 'position') {
        value =
          reference.property === 'head'
            ? engine.add(positionValue, valueResult.value)
            : valueResult.value
      }
      resolved.set(
        `${reference.name}:${reference.property ?? 'value'}`,
        value,
      )
    }

    const value = evaluateExpression(
      lowerExpression(node.expression),
      engine,
      (name, property) =>
        resolved.get(`${name}:${property ?? 'value'}`)!,
    )
    if (node.property === 'position' && !isPositionValue(value)) {
      const invalid = diagnostic(
        'GEOM_INVALID_POSITION',
        'A position must evaluate to a VGA 2D vector or zero.',
        node.expression.span,
      )
      results.set(node.key, invalid)
      return invalid
    }

    const presented = presentEvaluation(
      value,
      node.declaration?.name ?? `Vector ${node.position}`,
    )
    results.set(node.key, presented)
    return presented
  }

  for (const node of nodes.values()) {
    if (node.property === 'value') evaluateNode(node)
  }
  for (const node of nodes.values()) {
    if (node.property !== 'position') continue
    const valueResult = results.get(nodeKey(node.item.id, 'value'))
    if (
      valueResult?.status === 'valid' &&
      valueResult.entity?.kind === 'vector-2d'
    ) {
      evaluateNode(node)
    }
  }

  return document.items.map((item, index) => {
    const valueEvaluation =
      results.get(nodeKey(item.id, 'value')) ?? null

    if (
      valueEvaluation?.status === 'valid' &&
      valueEvaluation.entity?.kind === 'vector-2d'
    ) {
      const positionEvaluation =
        results.get(nodeKey(item.id, 'position')) ?? null
      const positionEntity =
        positionEvaluation?.status === 'valid' &&
        positionEvaluation.entity?.kind === 'vector-2d'
          ? positionEvaluation.entity
          : { x: 0, y: 0 }
      return {
        item,
        position: index + 1,
        positionEvaluation,
        headInspection: inspectMultivector(
          engine.add(
            valueEvaluation.value,
            positionEvaluation?.status === 'valid'
              ? positionEvaluation.value
              : engine.scalar(0),
          ),
        ),
        evaluation: {
          ...valueEvaluation,
          primitive: vectorToPrimitive(
            valueEvaluation.entity,
            valueEvaluation.primitive?.accessibleName ??
              `Vector ${index + 1}`,
            positionEntity,
          ),
        },
      }
    }

    return {
      item,
      position: index + 1,
      evaluation: valueEvaluation,
      positionEvaluation: null,
      headInspection: null,
    }
  })
}
