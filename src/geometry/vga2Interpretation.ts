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

/** A signed oriented area with no intrinsic location. */
export type Bivector2dEntity = Readonly<{
  kind: 'bivector-2d'
  value: number
}>

/** An even-grade VGA(2) value with scalar and bivector parts. */
export type Rotor2dEntity = Readonly<{
  kind: 'rotor-2d'
  scalar: number
  bivector: number
}>

/** A valid value spanning object kinds with no single standard reading. */
export type MixedMultivectorEntity = Readonly<{
  kind: 'mixed-multivector'
}>

export type StandardVga2Entity =
  | ScalarEntity
  | Vector2dEntity
  | Bivector2dEntity
  | Rotor2dEntity
  | MixedMultivectorEntity

export function describeVga2Entity(entity: StandardVga2Entity): string {
  switch (entity.kind) {
    case 'scalar': return 'Scalar'
    case 'vector-2d': return 'Vector'
    case 'bivector-2d': return 'Bivector'
    case 'rotor-2d': return 'Rotor'
    case 'mixed-multivector': return 'Mixed multivector'
  }
}

export function supportsVga2Position(entity: StandardVga2Entity): boolean {
  return entity.kind === 'vector-2d' || entity.kind === 'bivector-2d'
}

/**
 * Applies the canonical standard VGA(2) interpretation to an owned value.
 *
 * Interpretation depends only on coefficients. The all-zero multivector is
 * therefore classified canonically as scalar zero, regardless of its source
 * construction.
 */
export function interpretVga2(
  value: OwnedMultivector,
): StandardVga2Entity {
  const [scalar, x, y, bivector] = value.coefficients
  if (x === 0 && y === 0 && bivector === 0) {
    return Object.freeze({
      kind: 'scalar' as const,
      value: scalar,
    })
  }

  if (scalar === 0 && bivector === 0) {
    return Object.freeze({
      kind: 'vector-2d' as const,
      x,
      y,
    })
  }

  if (scalar === 0 && x === 0 && y === 0) {
    return Object.freeze({ kind: 'bivector-2d' as const, value: bivector })
  }

  if (x === 0 && y === 0) {
    return Object.freeze({
      kind: 'rotor-2d' as const,
      scalar,
      bivector,
    })
  }

  return Object.freeze({ kind: 'mixed-multivector' as const })
}
