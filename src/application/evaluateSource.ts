import type { VgaEngine } from '../algebra/vgaEngine'
import type { Diagnostic } from '../domain/diagnostic'
import {
  inspectMultivector,
  type OwnedMultivector,
} from '../domain/multivector'
import { evaluateExpression } from '../evaluation/evaluateExpression'
import {
  interpretVga2,
  type StandardVga2Entity,
} from '../geometry/vga2Interpretation'
import { lowerExpression } from '../language/lowerExpression'
import { parseExpression } from '../language/parseExpression'
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
      entity: StandardVga2Entity | null
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

  const coreExpression = lowerExpression(parsed.expression)
  const value = evaluateExpression(coreExpression, engine)
  const entity = interpretVga2(value)
  if (!entity) {
    return {
      status: 'valid',
      value,
      inspection: inspectMultivector(value),
      entity: null,
      primitive: null,
      visualization: {
        status: 'unsupported',
        message:
          'This multivector has no supported VGA 2D geometric interpretation.',
      },
    }
  }

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
        : { status: 'non-spatial' },
  }
}
