import type { OwnedMultivector } from '../domain/multivector'
import {
  classificationEpsilon,
  classificationScale,
  STANDARD_VGA2_CLASSIFICATION_POLICY,
  type Vga2ClassificationPolicy,
} from './vga2ClassificationPolicy'

/** A renderer-independent Euclidean vector in mathematical coordinates. */
export type Vector2dEntity = Readonly<{
  kind: 'vector-2d'
  x: number
  y: number
  approximated: boolean
}>

/** A renderer-independent scalar value with no spatial extent. */
export type ScalarEntity = Readonly<{
  kind: 'scalar'
  value: number
  approximated: boolean
}>

/** A signed oriented area with no intrinsic location. */
export type Bivector2dEntity = Readonly<{
  kind: 'bivector-2d'
  value: number
  approximated: boolean
}>

/** An even-grade VGA(2) value with scalar and bivector parts. */
export type Rotor2dEntity = Readonly<{
  kind: 'rotor-2d'
  scalar: number
  bivector: number
  approximated: boolean
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
 *
 * Classification tolerates harmless floating-point leakage per VGA-INT-005:
 * a coefficient outside a candidate kind's retained fields does not block
 * that classification when it is nonzero but within
 * `epsilon = absoluteFloor + relativeTerm * scale`, where `scale` is the
 * largest absolute coefficient. The returned entity reports
 * `approximated: true` whenever such a coefficient was ignored. This only
 * affects the classification decision — the returned numeric fields are
 * always the exact, untouched owned coefficients.
 */
export function interpretVga2(
  value: OwnedMultivector,
  policy: Vga2ClassificationPolicy = STANDARD_VGA2_CLASSIFICATION_POLICY,
): StandardVga2Entity {
  const [scalar, x, y, bivector] = value.coefficients
  const epsilon = classificationEpsilon(
    policy,
    classificationScale(value.coefficients),
  )
  // A coefficient that is exactly zero was never "ignored" — only a
  // genuinely nonzero-but-negligible one makes a classification approximate.
  const negligible = (v: number) => v !== 0 && Math.abs(v) <= epsilon
  const zeroLike = (v: number) => v === 0 || negligible(v)

  if (zeroLike(x) && zeroLike(y) && zeroLike(bivector)) {
    return Object.freeze({
      kind: 'scalar' as const,
      value: scalar,
      approximated: negligible(x) || negligible(y) || negligible(bivector),
    })
  }

  if (zeroLike(scalar) && zeroLike(bivector)) {
    return Object.freeze({
      kind: 'vector-2d' as const,
      x,
      y,
      approximated: negligible(scalar) || negligible(bivector),
    })
  }

  if (zeroLike(scalar) && zeroLike(x) && zeroLike(y)) {
    return Object.freeze({
      kind: 'bivector-2d' as const,
      value: bivector,
      approximated: negligible(scalar) || negligible(x) || negligible(y),
    })
  }

  if (zeroLike(x) && zeroLike(y)) {
    return Object.freeze({
      kind: 'rotor-2d' as const,
      scalar,
      bivector,
      approximated: negligible(x) || negligible(y),
    })
  }

  return Object.freeze({ kind: 'mixed-multivector' as const })
}
