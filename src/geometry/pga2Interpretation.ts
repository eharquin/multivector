import { type AlgebraBasis } from '../domain/algebraBasis'
import { type OwnedMultivector } from '../domain/multivector'
import {
  type DirectionMarkerPrimitive,
  type PointMarkerPrimitive,
  type UnboundedLinePrimitive,
} from '../visualization/primitives'
import { type Interpretation, type Point2d } from './interpretation'
import {
  classificationEpsilon,
  classificationScale,
  STANDARD_VGA2_CLASSIFICATION_POLICY,
  type Vga2ClassificationPolicy,
} from './vga2ClassificationPolicy'

/*
 * Entities of the plane-based PGA(2) interpretation (PGA-INT-003). Numeric
 * fields are the exact owned coefficients; positions and directions are
 * derived from them under D3 without altering the value.
 */
export type Pga2Entity =
  | Readonly<{ kind: 'zero' }>
  | Readonly<{ kind: 'scalar'; value: number; approximated: boolean }>
  | Readonly<{ kind: 'euclidean-point'; x: number; y: number; weight: number; approximated: boolean }>
  | Readonly<{ kind: 'ideal-point'; x: number; y: number; approximated: boolean }>
  | Readonly<{ kind: 'euclidean-line'; a: number; b: number; c: number; approximated: boolean }>
  | Readonly<{ kind: 'line-at-infinity'; c: number; approximated: boolean }>
  | Readonly<{ kind: 'rotor' | 'translator' | 'motor' | 'reflection'; approximated: boolean }>
  | Readonly<{ kind: 'mixed-multivector' }>

/** The PGA-INT-005 tolerance uses the same formula and values as VGA-INT-005. */
export const STANDARD_PGA2_CLASSIFICATION_POLICY: Vga2ClassificationPolicy =
  STANDARD_VGA2_CLASSIFICATION_POLICY

const INDEX = { e: 0, e0: 1, e1: 2, e2: 3, e01: 4, e02: 5, e12: 6, e012: 7 } as const
const GRADE = [0, 1, 1, 1, 2, 2, 2, 3] as const

/**
 * Classifies an owned `Cl(2,0,1)` value under PGA convention section 10.
 * Norm comparisons come first so that a point stays a point even though a
 * unit point is also a valid rotor generator.
 */
export function interpretPga2(
  value: OwnedMultivector,
  policy: Vga2ClassificationPolicy = STANDARD_PGA2_CLASSIFICATION_POLICY,
): Pga2Entity {
  const c = value.coefficients
  const epsilon = classificationEpsilon(policy, classificationScale(c))
  const negligible = (v: number) => v !== 0 && Math.abs(v) <= epsilon
  const zeroLike = (v: number) => v === 0 || negligible(v)
  const gradePresent = (grade: number) =>
    c.some((coefficient, index) => GRADE[index] === grade && !zeroLike(coefficient))
  const approximatedOutside = (grades: readonly number[]) =>
    c.some((coefficient, index) => !grades.includes(GRADE[index]) && negligible(coefficient))

  if (c.every(zeroLike)) return Object.freeze({ kind: 'zero' as const })

  const present = [0, 1, 2, 3].filter(gradePresent)
  if (present.length === 1 && present[0] === 0) {
    return Object.freeze({ kind: 'scalar' as const, value: c[INDEX.e], approximated: approximatedOutside([0]) })
  }
  if (present.length === 1 && present[0] === 1) {
    const a = c[INDEX.e1], b = c[INDEX.e2], cc = c[INDEX.e0]
    const approximated = approximatedOutside([1])
    if (!zeroLike(Math.hypot(a, b))) {
      return Object.freeze({ kind: 'euclidean-line' as const, a, b, c: cc, approximated })
    }
    return Object.freeze({ kind: 'line-at-infinity' as const, c: cc, approximated: approximated || negligible(a) || negligible(b) })
  }
  if (present.length === 1 && present[0] === 2) {
    const weight = c[INDEX.e12], x = -c[INDEX.e02], y = c[INDEX.e01]
    const approximated = approximatedOutside([2])
    if (!zeroLike(weight)) {
      return Object.freeze({ kind: 'euclidean-point' as const, x, y, weight, approximated })
    }
    return Object.freeze({ kind: 'ideal-point' as const, x, y, approximated: approximated || negligible(weight) })
  }
  const even = present.every((grade) => grade % 2 === 0)
  const odd = present.every((grade) => grade % 2 === 1)
  if (even || odd) {
    // V * ~V for an even or odd element of Cl(2,0,1) is scalar; a unit one is a versor.
    const s = c[INDEX.e], w = c[INDEX.e12]
    const a = c[INDEX.e1], b = c[INDEX.e2]
    const norm = even ? s * s + w * w : a * a + b * b
    const unitTolerance = classificationEpsilon(policy, 1)
    if (Math.abs(norm - 1) <= unitTolerance) {
      const approximated = approximatedOutside(even ? [0, 2] : [1, 3])
      if (odd) return Object.freeze({ kind: 'reflection' as const, approximated })
      if (zeroLike(c[INDEX.e01]) && zeroLike(c[INDEX.e02])) {
        return Object.freeze({ kind: 'rotor' as const, approximated: approximated || negligible(c[INDEX.e01]) || negligible(c[INDEX.e02]) })
      }
      if (zeroLike(w)) {
        return Object.freeze({ kind: 'translator' as const, approximated: approximated || negligible(w) })
      }
      return Object.freeze({ kind: 'motor' as const, approximated })
    }
  }
  return Object.freeze({ kind: 'mixed-multivector' as const })
}

export function describePga2Entity(entity: Pga2Entity): string {
  switch (entity.kind) {
    case 'zero': return 'Zero'
    case 'scalar': return 'Scalar'
    case 'euclidean-point': return 'Point'
    case 'ideal-point': return 'Ideal point'
    case 'euclidean-line': return 'Line'
    case 'line-at-infinity': return 'Line at infinity'
    case 'rotor': return 'Rotor'
    case 'translator': return 'Translator'
    case 'motor': return 'Motor'
    case 'reflection': return 'Reflection'
    case 'mixed-multivector': return 'Mixed multivector'
  }
}

const number = (value: number) => Number(value.toPrecision(6)).toString()

/** The projective reading (PGA-INT-004): position and weight, or equation and scale. */
export function detailPga2Entity(entity: Pga2Entity): string | null {
  switch (entity.kind) {
    case 'euclidean-point':
      return `at (${number(entity.x / entity.weight)}, ${number(entity.y / entity.weight)})` +
        (entity.weight === 1 ? '' : `, weight ${number(entity.weight)}`)
    case 'ideal-point':
      return `direction (${number(entity.x)}, ${number(entity.y)})`
    case 'euclidean-line': {
      const scale = Math.hypot(entity.a, entity.b)
      const terms = [[entity.a / scale, 'x'], [entity.b / scale, 'y'], [entity.c / scale, '']] as const
      const equation = terms
        .filter(([coefficient]) => coefficient !== 0)
        .map(([coefficient, variable], index) => {
          const magnitude = number(Math.abs(coefficient))
          const body = variable && magnitude === '1' ? variable : `${magnitude}${variable}`
          return index === 0
            ? `${coefficient < 0 ? '−' : ''}${body}`
            : ` ${coefficient < 0 ? '−' : '+'} ${body}`
        })
        .join('')
      return `${equation} = 0` + (scale === 1 ? '' : `, scale ${number(scale)}`)
    }
    case 'line-at-infinity':
      return `scale ${number(entity.c)}`
    default:
      return null
  }
}

function pointMarker(entity: Extract<Pga2Entity, { kind: 'euclidean-point' }>, accessibleName: string): PointMarkerPrimitive {
  return Object.freeze({
    kind: 'point-marker' as const,
    point: Object.freeze({ x: entity.x / entity.weight, y: entity.y / entity.weight }),
    accessibleName,
  })
}

function unboundedLine(entity: Extract<Pga2Entity, { kind: 'euclidean-line' }>, accessibleName: string): UnboundedLinePrimitive {
  const scale = entity.a * entity.a + entity.b * entity.b
  return Object.freeze({
    kind: 'unbounded-line' as const,
    // The foot of the perpendicular from the origin, and the direction along the line.
    point: Object.freeze({ x: -entity.a * entity.c / scale, y: -entity.b * entity.c / scale }),
    direction: Object.freeze({ x: -entity.b / Math.sqrt(scale), y: entity.a / Math.sqrt(scale) }),
    accessibleName,
  })
}

function directionMarker(entity: Extract<Pga2Entity, { kind: 'ideal-point' }>, accessibleName: string): DirectionMarkerPrimitive {
  const length = Math.hypot(entity.x, entity.y)
  return Object.freeze({
    kind: 'direction-marker' as const,
    direction: Object.freeze({ x: entity.x / length, y: entity.y / length }),
    accessibleName,
  })
}

/**
 * The standard plane-based PGA(2) interpretation, `org.multivector.pga-2d`
 * version 1 (PGA-INT-001 through PGA-INT-008). Points and lines have
 * intrinsic locations, so no entity accepts a position or a head; dragging a
 * point rewrites its `point(x, y)` literal instead (PGA-VIZ-003).
 */
export const PGA_2D_INTERPRETATION: Interpretation<Pga2Entity> = Object.freeze({
  interpretationId: 'org.multivector.pga-2d',
  interpretationVersion: 1,
  model: 'plane-based',
  interpret: (value) => interpretPga2(value),
  describe: describePga2Entity,
  detail: detailPga2Entity,
  supportsPosition: () => false,
  supportsHead: () => false,
  isPositionValue: () => false,
  positionOf: () => ({ x: 0, y: 0 }),
  positionValue(_point: Point2d, basis: AlgebraBasis) {
    throw new RangeError(`PGA entities carry their own location (${basis.blades.length} blades).`)
  },
  visualization(entity) {
    switch (entity.kind) {
      case 'euclidean-point':
      case 'euclidean-line':
      case 'ideal-point':
        return { status: 'available' }
      case 'scalar':
      case 'zero':
        return { status: 'non-spatial' }
      case 'line-at-infinity':
        return { status: 'unsupported', message: 'The line at infinity has no drawn form; it is reported textually.' }
      default:
        return { status: 'unsupported', message: 'This PGA 2D object has no supported visualization.' }
    }
  },
  defaultName(entity, index) {
    const family = entity.kind === 'euclidean-line' || entity.kind === 'line-at-infinity'
      ? 'Line'
      : entity.kind === 'ideal-point' ? 'Direction' : 'Point'
    return `${family} ${index + 1}`
  },
  creation: { constructor: 'point', namePrefix: 'P', objectName: 'Point' },
  literalEdit: { constructor: 'point', arity: 2 },
  toPrimitive(entity, { accessibleName }) {
    switch (entity.kind) {
      case 'euclidean-point': return pointMarker(entity, accessibleName)
      case 'euclidean-line': return unboundedLine(entity, accessibleName)
      case 'ideal-point': return directionMarker(entity, accessibleName)
      default: return null
    }
  },
})
