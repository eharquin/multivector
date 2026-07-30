import type { OwnedMultivector } from '../domain/multivector'

/** A renderer-independent Euclidean vector in mathematical coordinates. */
export type Vector2dEntity = Readonly<{
  kind: 'vector-2d'
  x: number
  y: number
}>

/** A renderer-independent scalar value with no spatial extent. */
export type ScalarEntity = Readonly<{
  kind: 'scalar'
  value: number
}>

export type StandardVga2Entity = ScalarEntity | Vector2dEntity

/**
 * Applies the canonical standard VGA(2) interpretation to an owned value.
 *
 * Interpretation depends only on coefficients. The all-zero multivector is
 * therefore classified canonically as scalar zero, regardless of its source
 * construction.
 */
export function interpretVga2(
  value: OwnedMultivector,
): StandardVga2Entity | null {
  const [scalar, x, y, bivector] = value.coefficients
  if (x === 0 && y === 0 && bivector === 0) {
    return Object.freeze({
      kind: 'scalar' as const,
      value: scalar,
    })
  }

  if (scalar !== 0 || bivector !== 0) return null

  return Object.freeze({
    kind: 'vector-2d' as const,
    x,
    y,
  })
}
