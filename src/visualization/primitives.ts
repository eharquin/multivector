import type {
  Bivector2dEntity,
  Vector2dEntity,
} from '../geometry/vga2Interpretation'

export type Point2d = Readonly<{ x: number; y: number }>

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

/** A positioned signed-area glyph in mathematical coordinates. */
export type OrientedAreaPrimitive = Readonly<{
  kind: 'oriented-area'
  shape:
    | Readonly<{ kind: 'loop'; center: Point2d; radius: number }>
    | Readonly<{ kind: 'parallelogram'; vertices: readonly Point2d[] }>
  area: number
  orientation: 'counterclockwise' | 'clockwise'
  accessibleName: string
  accessibleDescription: string
}>

export type VisualizationPrimitive =
  | OrientedSegmentPrimitive
  | OrientedAreaPrimitive

export const MAX_RENDERED_LIST_ELEMENTS = 1_000

/** Preserves the renderable prefix and reports exact list truncation. */
export function limitRenderedListElements<T>(
  elements: readonly T[],
): Readonly<{ visible: readonly T[]; omitted: number }> {
  return Object.freeze({
    visible: Object.freeze(elements.slice(0, MAX_RENDERED_LIST_ELEMENTS)),
    omitted: Math.max(0, elements.length - MAX_RENDERED_LIST_ELEMENTS),
  })
}

/** Converts a semantic vector and separate position into a render primitive. */
export function vectorToPrimitive(
  entity: Vector2dEntity,
  accessibleName = 'Vector 1',
  position: Readonly<{ x: number; y: number }> = { x: 0, y: 0 },
): OrientedSegmentPrimitive {
  return Object.freeze({
    kind: 'oriented-segment' as const,
    start: Object.freeze({ x: position.x, y: position.y }),
    end: Object.freeze({
      x: position.x + entity.x,
      y: position.y + entity.y,
    }),
    accessibleName,
  })
}

/**
 * Converts a semantic bivector into a loop or a construction-aware
 * parallelogram. Both shapes use mathematical area equal to `abs(value)`.
 */
export function bivectorToPrimitive(
  entity: Bivector2dEntity,
  accessibleName = 'Bivector 1',
  position: Point2d = { x: 0, y: 0 },
  sides?: readonly [Vector2dEntity, Vector2dEntity],
): OrientedAreaPrimitive {
  const area = Math.abs(entity.value)
  const orientation = entity.value > 0 ? 'counterclockwise' : 'clockwise'
  const at = position.x === 0 && position.y === 0
    ? 'the origin'
    : `(${position.x}, ${position.y})`
  const determinant = sides
    ? sides[0].x * sides[1].y - sides[0].y * sides[1].x
    : null
  const safeSides = sides && determinant !== null &&
    Number.isFinite(determinant) &&
    Math.abs(determinant - entity.value) <=
      Number.EPSILON * 16 * Math.max(1, area)

  const shape: OrientedAreaPrimitive['shape'] = safeSides
    ? Object.freeze({
        kind: 'parallelogram' as const,
        vertices: Object.freeze([
          Object.freeze({ x: position.x, y: position.y }),
          Object.freeze({
            x: position.x + sides[0].x,
            y: position.y + sides[0].y,
          }),
          Object.freeze({
            x: position.x + sides[0].x + sides[1].x,
            y: position.y + sides[0].y + sides[1].y,
          }),
          Object.freeze({
            x: position.x + sides[1].x,
            y: position.y + sides[1].y,
          }),
        ]),
      })
    : Object.freeze({
        kind: 'loop' as const,
        center: Object.freeze({ x: position.x, y: position.y }),
        radius: Math.sqrt(area / Math.PI),
      })

  const shapeName = shape.kind === 'parallelogram'
    ? 'oriented parallelogram'
    : 'oriented loop'
  return Object.freeze({
    kind: 'oriented-area' as const,
    shape,
    area,
    orientation,
    accessibleName,
    accessibleDescription:
      `${accessibleName} is an ${shapeName} with signed value ${entity.value}, ` +
      `area ${area}, ${orientation} orientation, positioned at ${at}.`,
  })
}
