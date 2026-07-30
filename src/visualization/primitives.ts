import type { Vector2dEntity } from '../geometry/vga2Interpretation'

/**
 * A renderer-independent directed segment in mathematical coordinates.
 *
 * Primitives contain accessible meaning but no algebra identifiers,
 * coefficients, or backend values.
 */
export type OrientedSegmentPrimitive = Readonly<{
  kind: 'oriented-segment'
  start: Readonly<{ x: number; y: number }>
  end: Readonly<{ x: number; y: number }>
  accessibleName: string
}>

/** Converts an origin-based semantic vector into a directed render primitive. */
export function vectorToPrimitive(
  entity: Vector2dEntity,
  accessibleName = 'Vector 1',
): OrientedSegmentPrimitive {
  return Object.freeze({
    kind: 'oriented-segment' as const,
    start: Object.freeze({ x: 0, y: 0 }),
    end: Object.freeze({ x: entity.x, y: entity.y }),
    accessibleName,
  })
}
