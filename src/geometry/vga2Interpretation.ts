import { type AlgebraBasis } from '../domain/algebraBasis'
import { ownedMultivector, type OwnedMultivector } from '../domain/multivector'
import { bivectorToPrimitive, vectorToPrimitive } from '../visualization/primitives'
import { type Interpretation } from './interpretation'
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

/**
 * The standard VGA(2) interpretation, `org.multivector.vga-2d` version 1
 * (VGA-INT-001 through VGA-INT-005, VGA-POS-001 through VGA-POS-007).
 */
export const VGA_2D_INTERPRETATION: Interpretation<StandardVga2Entity> = Object.freeze({
  interpretationId: 'org.multivector.vga-2d',
  interpretationVersion: 1,
  interpret: (value) => interpretVga2(value),
  describe: describeVga2Entity,
  detail: () => null,
  supportsPosition: supportsVga2Position,
  supportsHead: (entity) => entity.kind === 'vector-2d',
  // A position is a pure vector: no scalar and no bivector part (VGA-POS-004).
  isPositionValue(value) {
    const [scalar, , , bivector] = value.coefficients
    return scalar === 0 && bivector === 0
  },
  positionOf: (value) => ({ x: value.coefficients[1], y: value.coefficients[2] }),
  positionValue: (point, basis: AlgebraBasis) => ownedMultivector([0, point.x, point.y, 0], basis),
  visualization(entity) {
    if (entity.kind === 'vector-2d' || entity.kind === 'bivector-2d') return { status: 'available' }
    if (entity.kind === 'scalar') return { status: 'non-spatial' }
    return { status: 'unsupported', message: 'This VGA 2D object has no supported visualization.' }
  },
  defaultName: (entity, index) => `${entity.kind === 'bivector-2d' ? 'Bivector' : 'Vector'} ${index + 1}`,
  creation: { constructor: 'vector', namePrefix: 'V', objectName: 'Vector' },
  literalEdit: (entity) => (entity.kind === 'vector-2d' ? { constructor: 'vector', arity: 2 } : null),
  formatPosition: (x, y) => `(${x}, ${y})`,
  toPrimitive(entity, { accessibleName, position, construction }) {
    if (entity.kind === 'vector-2d') return vectorToPrimitive(entity, accessibleName, position)
    if (entity.kind !== 'bivector-2d') return null
    const sides = construction?.operator === '^' &&
      construction.operands.length === 2 &&
      construction.operands.every((operand) => operand.kind === 'vector-2d')
      ? construction.operands as readonly [Vector2dEntity, Vector2dEntity]
      : undefined
    return bivectorToPrimitive(entity, accessibleName, position, sides)
  },
})
