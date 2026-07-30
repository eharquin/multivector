import Algebra from 'ganja.js'
import { ownedMultivector, type OwnedMultivector } from '../domain/multivector'

/**
 * The backend-independent scalar, blade, and algebra operations required by
 * the current VGA(2) core evaluator.
 *
 * Implementations return owned values and must not expose backend objects.
 */
export type VgaEngine = Readonly<{
  scalar(value: number): OwnedMultivector
  basisBlade(name: 'e1' | 'e2'): OwnedMultivector
  add(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  multiply(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  negate(value: OwnedMultivector): OwnedMultivector
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
    add(left, right) {
      return fromBackend(toBackend(left).Add(toBackend(right)))
    },
    multiply(left, right) {
      return fromBackend(toBackend(left).Mul(toBackend(right)))
    },
    negate(value) {
      return fromBackend(toBackend(value).Scale(-1))
    },
  }
}
