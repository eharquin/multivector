import Algebra from 'ganja.js'
import { ownedMultivector, type OwnedMultivector } from '../domain/multivector'

/**
 * The backend-independent construction, product, involution, projection, and
 * coefficient operations required by the current VGA(2) core evaluator.
 *
 * Implementations return owned values and must not expose backend objects.
 */
export type VgaEngine = Readonly<{
  scalar(value: number): OwnedMultivector
  basisBlade(name: 'e1' | 'e2'): OwnedMultivector
  pseudoscalar(): OwnedMultivector
  add(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  multiply(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  outer(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  inner(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  regressive(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  negate(value: OwnedMultivector): OwnedMultivector
  reverse(value: OwnedMultivector): OwnedMultivector
  dual(value: OwnedMultivector): OwnedMultivector
  gradeInvolution(value: OwnedMultivector): OwnedMultivector
  grade(value: OwnedMultivector, grade: 0 | 1 | 2): OwnedMultivector
  coefficient(
    value: OwnedMultivector,
    blade: 'e' | 'e1' | 'e2' | 'e12',
  ): OwnedMultivector
}>

const Vga2 = Algebra({
  p: 2,
  q: 0,
  r: 0,
  baseType: Float64Array,
})

function toBackend(value: OwnedMultivector): InstanceType<typeof Vga2> {
  return new Vga2(value.coefficients)
}

function fromBackend(
  backendValue: InstanceType<typeof Vga2>,
): OwnedMultivector {
  return ownedMultivector([
    backendValue[0],
    backendValue[1],
    backendValue[2],
    backendValue[3],
  ])
}

function outerOwned(
  left: OwnedMultivector,
  right: OwnedMultivector,
): OwnedMultivector {
  const [a, x, y, b] = left.coefficients
  const [c, u, v, d] = right.coefficients
  return ownedMultivector([
    a * c,
    a * u + x * c,
    a * v + y * c,
    a * d + x * v - y * u + b * c,
  ])
}

function dualOwned(value: OwnedMultivector): OwnedMultivector {
  const [scalar, e1, e2, e12] = value.coefficients
  return ownedMultivector([-e12, -e2, e1, scalar])
}

/**
 * Creates the ganja.js-backed VGA(2) adapter using signature `(2, 0, 0)`.
 *
 * Every result is copied out of ganja.js before it crosses this boundary.
 */
export function createVga2Engine(): VgaEngine {
  return {
    scalar(value) {
      return fromBackend(new Vga2([value, 0, 0, 0]))
    },
    basisBlade(name) {
      return fromBackend(
        new Vga2(name === 'e1' ? [0, 1, 0, 0] : [0, 0, 1, 0]),
      )
    },
    pseudoscalar() {
      return ownedMultivector([0, 0, 0, 1])
    },
    add(left, right) {
      return fromBackend(toBackend(left).Add(toBackend(right)))
    },
    multiply(left, right) {
      return fromBackend(toBackend(left).Mul(toBackend(right)))
    },
    outer(left, right) {
      return outerOwned(left, right)
    },
    inner(left, right) {
      const [a, x, y, b] = left.coefficients
      const [c, u, v, d] = right.coefficients
      return ownedMultivector([
        a * c + x * u + y * v - b * d,
        a * u + x * c - y * d + b * v,
        a * v + y * c + x * d - b * u,
        a * d + b * c,
      ])
    },
    regressive(left, right) {
      return dualOwned(outerOwned(dualOwned(left), dualOwned(right)))
    },
    negate(value) {
      return fromBackend(toBackend(value).Scale(-1))
    },
    reverse(value) {
      const [scalar, e1, e2, e12] = value.coefficients
      return ownedMultivector([scalar, e1, e2, -e12])
    },
    dual(value) {
      return dualOwned(value)
    },
    gradeInvolution(value) {
      const [scalar, e1, e2, e12] = value.coefficients
      return ownedMultivector([scalar, -e1, -e2, e12])
    },
    grade(value, grade) {
      const [scalar, e1, e2, e12] = value.coefficients
      if (grade === 0) return ownedMultivector([scalar, 0, 0, 0])
      if (grade === 1) return ownedMultivector([0, e1, e2, 0])
      return ownedMultivector([0, 0, 0, e12])
    },
    coefficient(value, blade) {
      const index = { e: 0, e1: 1, e2: 2, e12: 3 }[blade]
      return ownedMultivector([value.coefficients[index], 0, 0, 0])
    },
  }
}
