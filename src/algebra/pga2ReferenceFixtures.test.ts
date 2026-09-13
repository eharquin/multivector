import Algebra from 'ganja.js'
import { describe, expect, it } from 'vitest'
import {
  PGA2_BASIS,
  PGA2_CLASSIFICATION_FIXTURES,
  PGA2_OPERATION_FIXTURES,
  type Pga2Coefficients,
} from './pga2ReferenceFixtures'

/*
 * Cross-checks the hand-computed fixtures against ganja.js `Cl(2,0,1)`, the
 * library the future engine will wrap. The library is evidence, not
 * authority: the one known difference is recorded below and the fixtures keep
 * the specification's value.
 */

const Pga2 = Algebra({ p: 2, q: 0, r: 1, baseType: Float64Array })
type Backend = InstanceType<typeof Pga2>

const toBackend = (value: Pga2Coefficients): Backend => new Pga2(value)
const fromBackend = (value: Backend): number[] => Array.from(value as Iterable<number>)

const expectClose = (actual: readonly number[], expected: Pga2Coefficients) => {
  actual.forEach((coefficient, index) => {
    expect(coefficient, PGA2_BASIS[index]).toBeCloseTo(expected[index], 10)
  })
}

// D6: the regressive product is J(J(a) ^ J(b)); ganja's `Vee` differs by sign
// in Cl(2,0,1) and is deliberately not used.
const regressive = (left: Backend, right: Backend): Backend =>
  left.Dual.Wedge(right.Dual).Dual

const sandwich = (versor: Backend, value: Backend): Backend =>
  versor.Mul(value).Mul(versor.Reverse)

describe('PGA(2) reference fixtures against ganja.js Cl(2,0,1)', () => {
  it('shares the canonical basis order', () => {
    expect(Pga2.describe().basis).toEqual([...PGA2_BASIS])
  })

  for (const fixture of PGA2_OPERATION_FIXTURES) {
    it(`${fixture.id} (${fixture.decision}): ${fixture.description}`, () => {
      const [left, right] = fixture.operands.map(toBackend)
      const result = (() => {
        switch (fixture.operation) {
          case 'product': return left.Mul(right)
          case 'outer': return left.Wedge(right)
          case 'regressive': return regressive(left, right)
          case 'dual': return left.Dual
          case 'reverse': return left.Reverse
          case 'sandwich': return sandwich(left, right)
          case 'exp': return left.Exp()
        }
      })()
      expectClose(fromBackend(result), fixture.expected)
    })
  }

  it('records that ganja Vee is the negated D6 join', () => {
    const [left, right] = [[0, 0, 0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 1, -1, 1, 0]]
      .map((value) => toBackend(value as unknown as Pga2Coefficients))
    const vee = fromBackend(left.Vee(right))
    const join = fromBackend(regressive(left, right))
    expectClose(vee.map((coefficient) => -coefficient), join as unknown as Pga2Coefficients)
  })
})

describe('PGA(2) classification fixtures', () => {
  const euclideanNorm = (value: Pga2Coefficients, kind: 'point' | 'line') =>
    kind === 'point' ? Math.abs(value[6]) : Math.hypot(value[2], value[3])
  const idealNorm = (value: Pga2Coefficients, kind: 'point' | 'line') =>
    kind === 'point' ? Math.hypot(value[4], value[5]) : Math.abs(value[1])

  for (const fixture of PGA2_CLASSIFICATION_FIXTURES) {
    it(`${fixture.id} (${fixture.decision}): ${fixture.description}`, () => {
      const isLine = fixture.classification === 'euclidean-line' || fixture.classification === 'line-at-infinity'
      const kind = isLine ? 'line' : 'point'
      expect(euclideanNorm(fixture.value, kind)).toBeCloseTo(fixture.euclideanNorm, 12)
      expect(idealNorm(fixture.value, kind)).toBeCloseTo(fixture.idealNorm, 12)
      if (fixture.normalized) {
        const divisor = fixture.classification.startsWith('euclidean')
          ? euclideanNorm(fixture.value, kind)
          : idealNorm(fixture.value, kind)
        expect(divisor).toBeGreaterThan(0)
        expectClose(fixture.value.map((coefficient) => coefficient / divisor), fixture.normalized)
      } else {
        expect(fixture.value.every((coefficient) => coefficient === 0)).toBe(true)
      }
      if (fixture.position) {
        expect(-fixture.value[5] / fixture.value[6]).toBeCloseTo(fixture.position.x, 12)
        expect(fixture.value[4] / fixture.value[6]).toBeCloseTo(fixture.position.y, 12)
      }
    })
  }
})
