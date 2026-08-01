import type { VgaEngine } from '../algebra/vgaEngine'
import type {
  ExpressionDocument,
  ExpressionItem,
} from '../document/expressionDocument'
import type { SourceSpan } from '../domain/diagnostic'
import {
  inspectMultivector,
  ownedMultivector,
  type OwnedMultivector,
} from '../domain/multivector'
import {
  elementIdentity,
  inspectLanguageValue,
  ownedList,
  retainElementIdentity,
  type LanguageValue,
} from '../domain/languageValue'
import {
  evaluateExpression,
  ExpressionEvaluationError,
  type EvaluationBudget,
} from '../evaluation/evaluateExpression'
import {
  supportsVga2Position,
  type Vector2dEntity,
} from '../geometry/vga2Interpretation'
import type { SurfaceExpressionNode } from '../language/ast'
import { lowerExpression } from '../language/lowerExpression'
import {
  parseDocumentExpression,
  parseExpression,
  type ParsedDocumentExpression,
} from '../language/parseExpression'
import {
  bivectorToPrimitive,
  vectorToPrimitive,
} from '../visualization/primitives'
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
    case 'property-expression':
      return collectReferences(expression.object)
    case 'vector-constructor':
      return expression.components.flatMap(collectReferences)
    case 'call-expression':
      return expression.arguments.flatMap(collectReferences)
    case 'list-expression':
      return expression.elements.flatMap(collectReferences)
    case 'range-expression':
      return [expression.start, ...(expression.next ? [expression.next] : []), expression.end]
        .flatMap(collectReferences)
    case 'index-expression':
      return [...collectReferences(expression.object), ...collectReferences(expression.index)]
    case 'scalar-literal':
    case 'basis-blade':
    case 'pseudoscalar':
      return []
  }
}

function isPositionMultivector(value: OwnedMultivector): boolean {
  const [scalar, , , bivector] = value.coefficients
  return scalar === 0 && bivector === 0
}

function isPositionValue(value: LanguageValue): boolean {
  return value.kind === 'multivector'
    ? isPositionMultivector(value)
    : value.elements.every((element) => isPositionMultivector(element.value))
}

function supportsEvaluationPosition(
  evaluation: Extract<EvaluationState, { status: 'valid' }>,
): boolean {
  return evaluation.valueType === 'list'
    ? evaluation.elements.every((element) => supportsVga2Position(element.entity))
    : supportsVga2Position(evaluation.entity)
}

function supportsDirectPosition(
  evaluation: Extract<EvaluationState, { status: 'valid' }>,
): boolean {
  return evaluation.valueType === 'single' && supportsVga2Position(evaluation.entity)
}

function addPositionValues(
  value: LanguageValue,
  position: LanguageValue,
  engine: VgaEngine,
): LanguageValue {
  if (value.kind === 'multivector' && position.kind === 'multivector') {
    return engine.add(position, value)
  }
  if (value.kind !== 'list') return value
  const positions = position.kind === 'list' ? position.elements : null
  if (positions && positions.length !== 1 && positions.length !== value.elements.length) {
    throw new ExpressionEvaluationError(
      'GEOM_POSITION_LENGTH',
      `Position list length ${positions.length} does not match value list length ${value.elements.length}.`,
      { start: 0, end: 0 },
    )
  }
  return ownedList(value.elements.map((element, index) => ({
    id: element.id,
    sources: element.sources,
    value: engine.add(
      positions
        ? positions[positions.length === 1 ? 0 : index].value
        : position as OwnedMultivector,
      element.value,
    ),
  })))
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
  const evaluationBudget: EvaluationBudget = { work: 0, generatedValues: 0 }

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

    const resolved = new Map<string, LanguageValue>()
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
        reference.property === 'position' &&
        !supportsEvaluationPosition(valueResult)
      ) {
        const invalid = diagnostic(
          'LANG_UNSUPPORTED_PROPERTY',
          `The value “${reference.name}” does not support position.`,
          reference.span,
        )
        results.set(node.key, invalid)
        return invalid
      }

      if (
        reference.property === 'head' &&
        (valueResult.valueType === 'list'
          ? valueResult.elements.some((element) => element.entity.kind !== 'vector-2d')
          : valueResult.entity.kind !== 'vector-2d')
      ) {
        const invalid = diagnostic(
          'LANG_UNSUPPORTED_PROPERTY',
          `The value “${reference.name}” does not support head.`,
          reference.span,
        )
        results.set(node.key, invalid)
        return invalid
      }

      const positionNode = supportsDirectPosition(valueResult)
        ? nodes.get(nodeKey(target.item.id, 'position'))
        : undefined
      let positionValue: LanguageValue = valueResult.valueType === 'list'
        ? ownedList(valueResult.elements.map((element) => ({
            id: element.id,
            value: engine.scalar(0),
          })))
        : engine.scalar(0)
      if (
        reference.property !== null &&
        valueResult.valueType === 'list' &&
        !positionNode
      ) {
        for (const candidate of nodes.values()) {
          if (candidate.property !== 'position') continue
          const candidateValue = results.get(nodeKey(candidate.item.id, 'value'))
          if (candidateValue?.status === 'valid' &&
              supportsDirectPosition(candidateValue)) {
            evaluateNode(candidate)
          }
        }
        const localLineage = new Map<string, readonly string[]>()
        const localPositions = new Map<string, Readonly<{ x: number; y: number }>>()
        for (const candidate of nodes.values()) {
          if (candidate.property !== 'value') continue
          const candidateValue = results.get(candidate.key)
          if (candidateValue?.status !== 'valid') continue
          if (candidateValue.valueType === 'list') {
            candidateValue.value.elements.forEach((element) =>
              localLineage.set(element.id, element.sources ?? []))
          }
          const candidatePosition = results.get(nodeKey(candidate.item.id, 'position'))
          if (candidatePosition?.status !== 'valid') continue
          if (candidateValue.valueType === 'single') {
            if (candidateValue.elementId && candidatePosition.value.kind === 'multivector') {
              localPositions.set(candidateValue.elementId, {
                x: candidatePosition.value.coefficients[1],
                y: candidatePosition.value.coefficients[2],
              })
            }
            continue
          }
          candidateValue.value.elements.forEach((element, elementIndex) => {
            const position = candidatePosition.value.kind === 'list'
              ? candidatePosition.value.elements[
                  candidatePosition.value.elements.length === 1 ? 0 : elementIndex
                ]?.value
              : candidatePosition.value
            if (position) localPositions.set(element.id, {
              x: position.coefficients[1], y: position.coefficients[2],
            })
          })
        }
        const resolvePosition = (
          elementId: string,
          visiting = new Set<string>(),
        ): Readonly<{ position: Readonly<{ x: number; y: number }> | null; conflict: boolean }> => {
          const direct = localPositions.get(elementId)
          if (direct) return { position: direct, conflict: false }
          if (visiting.has(elementId)) return { position: null, conflict: false }
          visiting.add(elementId)
          const inherited = (localLineage.get(elementId) ?? [])
            .map((source) => resolvePosition(source, visiting))
            .filter((result) => result.position !== null)
          visiting.delete(elementId)
          const first = inherited[0]?.position ?? null
          const conflict = inherited.some((result) => result.conflict) ||
            inherited.some((result) =>
              result.position!.x !== first!.x || result.position!.y !== first!.y)
          return { position: conflict ? null : first, conflict }
        }
        const inherited = valueResult.value.elements.map((element) =>
          resolvePosition(element.id))
        if (inherited.some((result) => result.conflict)) {
          const invalid = diagnostic(
            'GEOM_POSITION_CONFLICT',
            `The dependency “${reference.name}.position” has conflicting inherited positions.`,
            reference.span,
          )
          results.set(node.key, invalid)
          return invalid
        }
        positionValue = ownedList(valueResult.value.elements.map((element, elementIndex) => {
          const position = inherited[elementIndex].position ?? { x: 0, y: 0 }
          return {
            id: element.id,
            sources: element.sources,
            value: ownedMultivector([0, position.x, position.y, 0]),
          }
        }))
      }
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
        if (
          valueResult.value.kind === 'list' &&
          positionResult.value.kind === 'list' &&
          positionResult.value.elements.length !== 1 &&
          positionResult.value.elements.length !== valueResult.value.elements.length
        ) {
          const invalid = diagnostic(
            'GEOM_POSITION_LENGTH',
            `Position list length ${positionResult.value.elements.length} does not match value list length ${valueResult.value.elements.length}.`,
            reference.span,
          )
          results.set(node.key, invalid)
          return invalid
        }
        positionValue = positionResult.value
      }

      let value: LanguageValue = positionValue
      if (reference.property !== 'position') {
        if (reference.property === 'head') {
          value = addPositionValues(valueResult.value, positionValue, engine)
        } else {
          value = valueResult.value
        }
      }
      resolved.set(
        `${reference.name}:${reference.property ?? 'value'}`,
        value,
      )
    }

    let value: LanguageValue
    try {
      value = evaluateExpression(
        lowerExpression(node.expression),
        engine,
        (name, property) =>
          resolved.get(`${name}:${property ?? 'value'}`)!,
        node.item.id,
        evaluationBudget,
      )
    } catch (error) {
      if (!(error instanceof ExpressionEvaluationError)) throw error
      const invalid = diagnostic(error.code, error.message, error.origin)
      results.set(node.key, invalid)
      return invalid
    }
    if (node.property === 'position' && !isPositionValue(value)) {
      const invalid = diagnostic(
        'GEOM_INVALID_POSITION',
        'A position must evaluate to a VGA 2D vector or zero.',
        node.expression.span,
      )
      results.set(node.key, invalid)
      return invalid
    }

    if (node.property === 'value' && value.kind === 'multivector' && !elementIdentity(value)) {
      retainElementIdentity(value, node.key)
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
      supportsDirectPosition(valueResult)
    ) {
      evaluateNode(node)
    }
  }

  type Point = Readonly<{ x: number; y: number }>
  const lineage = new Map<string, readonly string[]>()
  const explicitPositions = new Map<string, Point>()
  for (const node of nodes.values()) {
    if (node.property !== 'value') continue
    const valueResult = results.get(node.key)
    if (valueResult?.status !== 'valid') continue
    if (valueResult.valueType === 'list') {
      valueResult.value.elements.forEach((element) => {
        lineage.set(element.id, element.sources ?? [])
      })
    }
    const positionResult = results.get(nodeKey(node.item.id, 'position'))
    if (positionResult?.status !== 'valid') continue
    if (valueResult.valueType === 'single') {
      if (valueResult.elementId && positionResult.value.kind === 'multivector') {
        explicitPositions.set(valueResult.elementId, {
          x: positionResult.value.coefficients[1],
          y: positionResult.value.coefficients[2],
        })
      }
      continue
    }
    valueResult.value.elements.forEach((element, elementIndex) => {
      const positionValue = positionResult.value
      const position = positionValue.kind === 'list'
        ? positionValue.elements[positionValue.elements.length === 1 ? 0 : elementIndex]?.value
        : positionValue
      if (!position) return
      explicitPositions.set(element.id, {
        x: position.coefficients[1],
        y: position.coefficients[2],
      })
    })
  }

  const resolveInheritedPosition = (
    elementId: string,
    visiting = new Set<string>(),
  ): Readonly<{ position: Point | null; conflict: boolean }> => {
    const explicit = explicitPositions.get(elementId)
    if (explicit) return { position: explicit, conflict: false }
    if (visiting.has(elementId)) return { position: null, conflict: false }
    visiting.add(elementId)
    const inherited = (lineage.get(elementId) ?? [])
      .map((source) => resolveInheritedPosition(source, visiting))
      .filter((result) => result.position !== null)
    visiting.delete(elementId)
    if (inherited.some((result) => result.conflict)) {
      return { position: null, conflict: true }
    }
    const first = inherited[0]?.position ?? null
    const conflict = inherited.some((result) =>
      result.position!.x !== first!.x || result.position!.y !== first!.y)
    return { position: conflict ? null : first, conflict }
  }

  const directOuterProductSides = (
    item: ExpressionItem,
  ): readonly [Vector2dEntity, Vector2dEntity] | undefined => {
    const node = nodes.get(nodeKey(item.id, 'value'))
    if (
      node?.expression.kind !== 'binary-expression' ||
      node.expression.operator !== '^' ||
      node.expression.left.kind !== 'reference' ||
      node.expression.left.property !== null ||
      node.expression.right.kind !== 'reference' ||
      node.expression.right.property !== null
    ) return undefined

    const left = declarations.get(node.expression.left.name)
    const right = declarations.get(node.expression.right.name)
    if (left?.length !== 1 || right?.length !== 1) return undefined
    const leftResult = results.get(left[0].key)
    const rightResult = results.get(right[0].key)
    if (
      leftResult?.status !== 'valid' ||
      leftResult.entity.kind !== 'vector-2d' ||
      rightResult?.status !== 'valid' ||
      rightResult.entity.kind !== 'vector-2d'
    ) return undefined
    return [leftResult.entity, rightResult.entity]
  }

  return document.items.map((item, index) => {
    const valueEvaluation =
      results.get(nodeKey(item.id, 'value')) ?? null

    if (valueEvaluation?.status === 'valid' && valueEvaluation.valueType === 'list') {
      const rawPositionEvaluation =
        results.get(nodeKey(item.id, 'position')) ?? null
      const positionList = rawPositionEvaluation?.status === 'valid' &&
        rawPositionEvaluation.valueType === 'list'
          ? rawPositionEvaluation.value
          : null
      const positionLengthInvalid =
        rawPositionEvaluation?.status === 'valid' &&
        positionList !== null && positionList.elements.length !== 1 &&
        positionList.elements.length !== valueEvaluation.value.elements.length
      const inheritedConflict = rawPositionEvaluation?.status !== 'valid' &&
        valueEvaluation.value.elements.some((element) =>
          resolveInheritedPosition(element.id).conflict)
      const positionEvaluation = positionLengthInvalid
        ? diagnostic(
            'GEOM_POSITION_LENGTH',
            `Position list length ${positionList!.elements.length} does not match value list length ${valueEvaluation.value.elements.length}.`,
            nodes.get(nodeKey(item.id, 'position'))?.expression.span ?? { start: 0, end: 0 },
          )
        : inheritedConflict
          ? diagnostic(
              'GEOM_POSITION_CONFLICT',
              'Corresponding list elements have conflicting inherited positions.',
              nodes.get(nodeKey(item.id, 'value'))?.expression.span ?? { start: 0, end: 0 },
            )
        : rawPositionEvaluation
      const positionAt = (
        elementIndex: number,
        elementId: string,
      ): Readonly<{ x: number; y: number }> => {
        if (positionEvaluation?.status !== 'valid') {
          return resolveInheritedPosition(elementId).position ?? { x: 0, y: 0 }
        }
        const positionValue = positionEvaluation.value
        const multivector = positionValue.kind === 'list'
          ? positionValue.elements[positionValue.elements.length === 1 ? 0 : elementIndex]?.value
          : positionValue
        return multivector
          ? { x: multivector.coefficients[1], y: multivector.coefficients[2] }
          : { x: 0, y: 0 }
      }
      const listName = nodes.get(nodeKey(item.id, 'value'))?.declaration?.name ??
        `List ${index + 1}`
      const elements = valueEvaluation.elements.map((element, elementIndex) => {
        const position = positionAt(elementIndex, element.id)
        const name = `${listName}[${elementIndex}]`
        return {
          ...element,
          primitive: element.entity.kind === 'vector-2d'
            ? vectorToPrimitive(element.entity, name, position)
            : element.entity.kind === 'bivector-2d'
              ? bivectorToPrimitive(element.entity, name, position)
              : null,
        }
      })
      const allVectors = elements.every((element) => element.entity.kind === 'vector-2d')
      let headInspection: string | null = null
      if (allVectors) {
        const positions = positionEvaluation?.status === 'valid'
          ? positionEvaluation.value
          : ownedList(elements.map((element, elementIndex) => {
              const position = positionAt(elementIndex, element.id)
              return {
                id: element.id,
                value: ownedMultivector([0, position.x, position.y, 0]),
              }
            }))
        headInspection = inspectLanguageValue(
          addPositionValues(valueEvaluation.value, positions, engine),
        )
      }
      return {
        item,
        position: index + 1,
        evaluation: { ...valueEvaluation, elements },
        positionEvaluation,
        headInspection,
      }
    }

    if (
      valueEvaluation?.status === 'valid' &&
      valueEvaluation.valueType === 'single' &&
      (valueEvaluation.entity.kind === 'vector-2d' ||
        valueEvaluation.entity.kind === 'bivector-2d')
    ) {
      const positionEvaluation =
        results.get(nodeKey(item.id, 'position')) ?? null
      const inheritedPosition = valueEvaluation.elementId
        ? resolveInheritedPosition(valueEvaluation.elementId)
        : { position: null, conflict: false }
      const effectivePositionEvaluation =
        positionEvaluation ?? (inheritedPosition.conflict
          ? diagnostic(
              'GEOM_POSITION_CONFLICT',
              'The selected element has conflicting inherited positions.',
              nodes.get(nodeKey(item.id, 'value'))?.expression.span ?? { start: 0, end: 0 },
            )
          : null)
      const positionEntity =
        positionEvaluation?.status === 'valid' &&
        positionEvaluation.entity?.kind === 'vector-2d'
          ? positionEvaluation.entity
          : inheritedPosition.position ?? { x: 0, y: 0 }
      if (valueEvaluation.entity.kind === 'bivector-2d') {
        return {
          item,
          position: index + 1,
          evaluation: {
            ...valueEvaluation,
            primitive: bivectorToPrimitive(
              valueEvaluation.entity,
              nodes.get(nodeKey(item.id, 'value'))?.declaration?.name ??
                `Bivector ${index + 1}`,
              positionEntity,
              directOuterProductSides(item),
            ),
          },
          positionEvaluation: effectivePositionEvaluation,
          headInspection: null,
        }
      }
      return {
        item,
        position: index + 1,
        positionEvaluation: effectivePositionEvaluation,
        headInspection: inspectMultivector(
          engine.add(
            valueEvaluation.value,
            positionEvaluation?.status === 'valid' && positionEvaluation.valueType === 'single'
              ? positionEvaluation.value
              : ownedMultivector([
                  0,
                  inheritedPosition.position?.x ?? 0,
                  inheritedPosition.position?.y ?? 0,
                  0,
                ]),
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
