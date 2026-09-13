import type { AlgebraEngine } from '../algebra/algebraEngine'
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
  type AnyInterpretation,
  type InterpretedEntity,
  type VisualizationSupport,
} from '../geometry/interpretation'
import { lowerExpression } from '../language/lowerExpression'
import { parseExpression } from '../language/parseExpression'
import type { SurfaceExpressionNode } from '../language/ast'
import {
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
      entity: InterpretedEntity
      primitive: VisualizationPrimitive | null
      elements: null
      elementId: string | null
      visualization: VisualizationSupport
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
        entity: InterpretedEntity
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

/** The engine and interpretation a document resolves to (ALG-004). */
export type EvaluationContext = Readonly<{
  engine: AlgebraEngine
  interpretation: AnyInterpretation
}>

/** Builds presentation state from an already evaluated owned value. */
export function presentEvaluation(
  value: LanguageValue,
  interpretation: AnyInterpretation,
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
        const entity = interpretation.interpret(element.value)
        const name = `${accessibleName ?? 'List 1'}[${index}]`
        return Object.freeze({
          id: element.id,
          value: element.value,
          inspection: inspectMultivector(element.value),
          entity,
          position: null,
          positionConflict: false,
          primitive: interpretation.toPrimitive(entity, {
            accessibleName: name, position: { x: 0, y: 0 },
          }),
        })
      })),
      visualization: { status: 'available' },
    }
  }
  const entity = interpretation.interpret(value)
  const name = accessibleName ?? interpretation.defaultName(entity, 0)
  return {
    status: 'valid',
    valueType: 'single',
    value,
    inspection: inspectMultivector(value),
    entity,
    primitive: interpretation.toPrimitive(entity, {
      accessibleName: name, position: { x: 0, y: 0 },
    }),
    elements: null,
    elementId: elementIdentity(value),
    visualization: interpretation.visualization(entity),
  }
}

/**
 * Coordinates parsing, evaluation, standard interpretation, and primitive
 * creation for one VGA(2) expression.
 */
export function evaluateSource(
  source: string,
  context: EvaluationContext,
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
    const value = evaluateExpression(coreExpression, context.engine)
    return presentEvaluation(value, context.interpretation, accessibleName)
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
