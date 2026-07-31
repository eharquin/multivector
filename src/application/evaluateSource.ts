import type { VgaEngine } from '../algebra/vgaEngine'
import type { Diagnostic } from '../domain/diagnostic'
import {
  inspectMultivector,
  type OwnedMultivector,
} from '../domain/multivector'
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
  vectorToPrimitive,
  type OrientedSegmentPrimitive,
} from '../visualization/primitives'

/**
 * The complete presentation-ready result of the current source evaluation use
 * case. Invalid states never retain stale mathematical or visual output.
 */
export type EvaluationState =
  | Readonly<{
      status: 'valid'
      value: OwnedMultivector
      inspection: string
      entity: StandardVga2Entity
      primitive: OrientedSegmentPrimitive | null
      visualization:
        | Readonly<{ status: 'available' }>
        | Readonly<{ status: 'non-spatial' }>
        | Readonly<{ status: 'unsupported'; message: string }>
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
    case 'scalar-literal':
    case 'basis-blade':
    case 'pseudoscalar':
      return null
  }
}

/** Builds presentation state from an already evaluated owned value. */
export function presentEvaluation(
  value: OwnedMultivector,
  accessibleName = 'Vector 1',
): EvaluationState {
  const entity = interpretVga2(value)
  return {
    status: 'valid',
    value,
    inspection: inspectMultivector(value),
    entity,
    primitive:
      entity.kind === 'vector-2d'
        ? vectorToPrimitive(entity, accessibleName)
        : null,
    visualization:
      entity.kind === 'vector-2d'
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
  accessibleName = 'Vector 1',
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
