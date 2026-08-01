import type { VgaEngine } from '../algebra/vgaEngine'
import type { Diagnostic } from '../domain/diagnostic'
import {
  inspectMultivector,
  type OwnedMultivector,
} from '../domain/multivector'
import {
  inspectLanguageValue,
  elementIdentity,
  type LanguageValue,
  type OwnedList,
} from '../domain/languageValue'
import {
  evaluateExpression,
  ExpressionEvaluationError,
} from '../evaluation/evaluateExpression'
import {
  interpretVga2,
  type StandardVga2Entity,
} from '../geometry/vga2Interpretation'
import { lowerExpression } from '../language/lowerExpression'
import { parseExpression } from '../language/parseExpression'
import type { SurfaceExpressionNode } from '../language/ast'
import {
  bivectorToPrimitive,
  vectorToPrimitive,
  type VisualizationPrimitive,
} from '../visualization/primitives'

/**
 * The complete presentation-ready result of the current source evaluation use
 * case. Invalid states never retain stale mathematical or visual output.
 */
export type EvaluationState =
  | Readonly<{
      status: 'valid'
      valueType: 'single'
      value: OwnedMultivector
      inspection: string
      entity: StandardVga2Entity
      primitive: VisualizationPrimitive | null
      elements: null
      elementId: string | null
      visualization:
        | Readonly<{ status: 'available' }>
        | Readonly<{ status: 'non-spatial' }>
        | Readonly<{ status: 'unsupported'; message: string }>
    }>
  | Readonly<{
      status: 'valid'
      valueType: 'list'
      value: OwnedList
      inspection: string
      entity: Readonly<{ kind: 'list'; length: number }>
      primitive: null
      elementId: null
      elements: readonly Readonly<{
        id: string
        value: OwnedMultivector
        inspection: string
        entity: StandardVga2Entity
        primitive: VisualizationPrimitive | null
        position: Readonly<{ x: number; y: number }> | null
        positionConflict: boolean
      }>[]
      visualization: Readonly<{ status: 'available' }>
    }>
  | Readonly<{
      status: 'invalid'
      diagnostic: Diagnostic
    }>

function firstReference(
  expression: SurfaceExpressionNode,
): Extract<SurfaceExpressionNode, { kind: 'reference' }> | null {
  switch (expression.kind) {
    case 'reference':
      return expression
    case 'unary-expression':
      return firstReference(expression.operand)
    case 'binary-expression':
      return firstReference(expression.left) ?? firstReference(expression.right)
    case 'property-expression':
      return firstReference(expression.object)
    case 'vector-constructor':
      return (
        firstReference(expression.components[0]) ??
        firstReference(expression.components[1])
      )
    case 'call-expression':
      return expression.arguments
        .map(firstReference)
        .find((reference) => reference !== null) ?? null
    case 'list-expression':
      return expression.elements.map(firstReference)
        .find((reference) => reference !== null) ?? null
    case 'range-expression':
      return firstReference(expression.start) ??
        (expression.next ? firstReference(expression.next) : null) ??
        firstReference(expression.end)
    case 'index-expression':
      return firstReference(expression.object) ?? firstReference(expression.index)
    case 'scalar-literal':
    case 'basis-blade':
    case 'pseudoscalar':
      return null
  }
}

/** Builds presentation state from an already evaluated owned value. */
export function presentEvaluation(
  value: LanguageValue,
  accessibleName?: string,
): EvaluationState {
  if (value.kind === 'list') {
    return {
      status: 'valid',
      valueType: 'list',
      value,
      inspection: inspectLanguageValue(value),
      entity: Object.freeze({ kind: 'list' as const, length: value.elements.length }),
      primitive: null,
      elementId: null,
      elements: Object.freeze(value.elements.map((element, index) => {
        const entity = interpretVga2(element.value)
        const name = `${accessibleName ?? 'List 1'}[${index}]`
        return Object.freeze({
          id: element.id,
          value: element.value,
          inspection: inspectMultivector(element.value),
          entity,
          position: null,
          positionConflict: false,
          primitive: entity.kind === 'vector-2d'
            ? vectorToPrimitive(entity, name)
            : entity.kind === 'bivector-2d'
              ? bivectorToPrimitive(entity, name)
              : null,
        })
      })),
      visualization: { status: 'available' },
    }
  }
  const entity = interpretVga2(value)
  const name = accessibleName ??
    (entity.kind === 'bivector-2d' ? 'Bivector 1' : 'Vector 1')
  return {
    status: 'valid',
    valueType: 'single',
    value,
    inspection: inspectMultivector(value),
    entity,
    primitive: entity.kind === 'vector-2d'
      ? vectorToPrimitive(entity, name)
      : entity.kind === 'bivector-2d'
        ? bivectorToPrimitive(entity, name)
        : null,
    elements: null,
    elementId: elementIdentity(value),
    visualization:
      entity.kind === 'vector-2d' || entity.kind === 'bivector-2d'
        ? { status: 'available' }
        : entity.kind === 'scalar'
          ? { status: 'non-spatial' }
          : {
              status: 'unsupported',
              message: 'This VGA 2D object has no supported visualization.',
            },
  }
}

/**
 * Coordinates parsing, evaluation, standard interpretation, and primitive
 * creation for one VGA(2) expression.
 */
export function evaluateSource(
  source: string,
  engine: VgaEngine,
  accessibleName?: string,
): EvaluationState {
  const parsed = parseExpression(source)
  if (!parsed.ok) {
    return { status: 'invalid', diagnostic: parsed.diagnostic }
  }

  const unresolved = firstReference(parsed.expression)
  if (unresolved) {
    return {
      status: 'invalid',
      diagnostic: {
        code: 'LANG_UNDEFINED_NAME',
        severity: 'error',
        message: `The name “${unresolved.name}” is not defined.`,
        span: unresolved.span,
      },
    }
  }

  const coreExpression = lowerExpression(parsed.expression)
  try {
    const value = evaluateExpression(coreExpression, engine)
    return presentEvaluation(value, accessibleName)
  } catch (error) {
    if (error instanceof ExpressionEvaluationError) {
      return {
        status: 'invalid',
        diagnostic: {
          code: error.code,
          severity: 'error',
          message: error.message,
          span: error.origin,
        },
      }
    }
    throw error
  }
}
