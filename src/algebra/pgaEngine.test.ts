import { describe, expect, it } from 'vitest'
import { AlgebraOperationError } from './algebraEngine'
import {
  PGA2_BASIS,
  PGA2_CLASSIFICATION_FIXTURES,
  PGA2_MOTOR_REFUSAL_FIXTURES,
  PGA2_OPERATION_FIXTURES,
  blade,
  line,
  motorD9,
  point,
  rotation,
  scale,
  translator,
  type Pga2Coefficients,
} from './pga2ReferenceFixtures'
import { createPga2Engine, PGA_2D_BASIS } from './pgaEngine'
import { ownedMultivector } from '../domain/multivector'

const engine = createPga2Engine()
const owned = (coefficients: Pga2Coefficients) => ownedMultivector(coefficients, PGA_2D_BASIS)

const expectClose = (actual: readonly number[], expected: Pga2Coefficients, digits = 10) => {
  actual.forEach((coefficient, index) => {
    expect(coefficient, PGA2_BASIS[index]).toBeCloseTo(expected[index], digits)
  })
}

describe('PGA(2) engine against the convention reference fixtures', () => {
  it('uses the canonical basis of the convention', () => {
    expect(engine.basis.blades.map((blade) => blade.name)).toEqual([...PGA2_BASIS])
    expect(engine.pseudoscalar().coefficients).toEqual([0, 0, 0, 0, 0, 0, 0, 1])
  })

  for (const fixture of PGA2_OPERATION_FIXTURES) {
    it(`${fixture.id} (${fixture.decision}): ${fixture.description}`, () => {
      const [left, right] = fixture.operands.map(owned)
      const result = (() => {
        switch (fixture.operation) {
          case 'product': return engine.multiply(left, right)
          case 'outer': return engine.outer(left, right)
          case 'regressive': return engine.regressive(left, right)
          case 'dual': return engine.dual(left)
          case 'reverse': return engine.reverse(left)
          case 'sandwich': return engine.sandwich(left, right)
          case 'exp': return engine.exp(left)
          case 'log': return engine.scalarFunction('log', [left])
          case 'sqrt': return engine.scalarFunction('sqrt', [left])
        }
      })()
      expectClose(result.coefficients, fixture.expected)
    })
  }

  for (const fixture of PGA2_CLASSIFICATION_FIXTURES) {
    it(`${fixture.id} (${fixture.decision}): norms of ${fixture.description}`, () => {
      const value = owned(fixture.value)
      expect(engine.norm(value).coefficients[0]).toBeCloseTo(fixture.euclideanNorm, 12)
      expect(engine.call('inorm', [value]).coefficients[0]).toBeCloseTo(fixture.idealNorm, 12)
      const normalized = engine.normalize(value)
      if (fixture.normalized) {
        expect(normalized.status).toBe('normalized')
        expectClose(normalized.value.coefficients, fixture.normalized)
      } else {
        expect(normalized.status).toBe('unavailable')
      }
    })
  }
})

describe('PGA(2) engine capabilities', () => {
  it('builds points, ideal points, and lines from the registered constructors', () => {
    const s = engine.scalar
    expectClose(engine.call('point', [s(1), s(2)]).coefficients, point(1, 2))
    expectClose(engine.call('point', [s(2), s(4), s(2)]).coefficients, point(2, 4, 2))
    expectClose(engine.call('ipoint', [s(3), s(4)]).coefficients, point(3, 4, 0))
    expectClose(engine.call('line', [s(1), s(-1), s(0)]).coefficients, line(1, -1, 0))
    expect(engine.functions.get('point')).toEqual([2, 3])
    expect(() => engine.call('point', [engine.basisBlade('e1'), s(0)])).toThrow(AlgebraOperationError)
    expect(() => engine.call('vector', [s(1), s(2)])).toThrow(AlgebraOperationError)
  })

  it('inverts invertible values and refuses null ones', () => {
    const rotor = owned([Math.SQRT1_2, 0, 0, 0, 0, 0, -Math.SQRT1_2, 0])
    expectClose(engine.multiply(rotor, engine.inverse(rotor)).coefficients, [1, 0, 0, 0, 0, 0, 0, 0])
    const mixed = engine.add(engine.scalar(2), engine.add(engine.basisBlade('e1'), engine.basisBlade('e01')))
    expectClose(engine.multiply(engine.inverse(mixed), mixed).coefficients, [1, 0, 0, 0, 0, 0, 0, 0])
    for (const blade of ['e0', 'e01', 'e02', 'e012']) {
      expect(() => engine.inverse(engine.basisBlade(blade))).toThrow(/not invertible/)
    }
    expect(() => engine.inverse(owned(point(3, 4, 0)))).toThrow(/not invertible/)
    expect(() => engine.divide(engine.scalar(1), engine.pseudoscalar())).toThrow(/not invertible/)
  })

  it('computes the degenerate inner product and grade access through the basis', () => {
    const l = owned(line(3, 4, 5))
    expect(engine.inner(l, l).coefficients).toEqual([25, 0, 0, 0, 0, 0, 0, 0])
    expect(engine.inner(engine.basisBlade('e0'), engine.basisBlade('e0')).coefficients).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    expect(engine.grade(owned(point(1, 2)), 2).coefficients).toEqual([...point(1, 2)])
    expect(engine.coefficient(owned(point(1, 2)), 'e02').coefficients[0]).toBe(-1)
    expect(engine.grade(l, 1).coefficients).toEqual([...l.coefficients])
    expect(() => engine.grade(l, 4)).toThrow(AlgebraOperationError)
    expect(() => engine.basisBlade('e3')).toThrow(AlgebraOperationError)
  })

  it('powers, involutions, and scalar functions follow the common definitions', () => {
    const p = owned(point(2, 1))
    expectClose(engine.power(p, 2).coefficients, [-1, 0, 0, 0, 0, 0, 0, 0])
    expectClose(engine.power(p, 0).coefficients, [1, 0, 0, 0, 0, 0, 0, 0])
    expectClose(engine.power(p, -1).coefficients, engine.inverse(p).coefficients as unknown as Pga2Coefficients)
    expect(engine.gradeInvolution(engine.add(engine.basisBlade('e1'), engine.basisBlade('e12'))).coefficients)
      .toEqual([0, 0, -1, 0, 0, 0, 1, 0])
    expect(engine.scalarFunction('cos', [engine.scalar(0)]).coefficients[0]).toBe(1)
    expect(() => engine.scalarFunction('sin', [engine.basisBlade('e1')])).toThrow(AlgebraOperationError)
    expect(engine.exp(engine.scalar(1)).coefficients[0]).toBeCloseTo(Math.E, 12)
    expect(() => engine.exp(engine.add(engine.scalar(1), engine.basisBlade('e12')))).toThrow(/closed forms/)
  })
})

describe('PGA(2) motor logarithm and square root', () => {
  const log = (value: Pga2Coefficients) => engine.scalarFunction('log', [owned(value)])
  const sqrt = (value: Pga2Coefficients) => engine.scalarFunction('sqrt', [owned(value)])
  const close = (left: readonly number[], right: readonly number[], digits = 10) =>
    expectClose(left, right as unknown as Pga2Coefficients, digits)

  for (const fixture of PGA2_MOTOR_REFUSAL_FIXTURES) {
    it(`refuses ${fixture.id} (${fixture.reason})`, () => {
      const call = fixture.function === 'log' ? log : sqrt
      expect(() => call(fixture.value)).toThrow(
        fixture.reason === 'branch-cut' ? /branch cut/ : /requires a unit motor/)
    })
  }

  it('keeps the scalar branches of language section 10', () => {
    expect(log(scalarValue(Math.exp(2))).coefficients[0]).toBeCloseTo(2, 12)
    expect(sqrt(scalarValue(4)).coefficients[0]).toBe(2)
    expect(log(scalarValue(1)).coefficients).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
    for (const value of [0, -1]) expect(() => log(scalarValue(value))).toThrow(/positive scalar/)
    expect(() => sqrt(scalarValue(-1))).toThrow(/non-negative scalar/)
    expect(() => engine.scalarFunction('sin', [owned(motorD9)])).toThrow(/must be scalar/)
  })

  // D18 identities, on a composed motor (w != 0 and a translation) and on a
  // rotation whose half-angle theta is within 1e-6 of pi, next to the cut.
  const nearCut = rotation(2 * (Math.PI - 1e-6), point(2, 1))
  const motors: readonly Pga2Coefficients[] = [
    motorD9, nearCut, translator(3, -4), scale(point(2, 1), -1), rotation(1.5 * Math.PI, blade('e12')),
  ]
  for (const [index, motor] of motors.entries()) {
    it(`satisfies exp(log M) = M, sqrt(M)^2 = M, exp(log(M)/2) = sqrt(M), exp(2 log M) = M M (motor ${index})`, () => {
      const m = owned(motor)
      const l = log(motor)
      const root = sqrt(motor)
      close(engine.exp(l).coefficients, motor)
      close(engine.multiply(root, root).coefficients, motor)
      close(engine.exp(engine.multiply(engine.scalar(0.5), l)).coefficients, root.coefficients)
      close(engine.exp(engine.multiply(engine.scalar(2), l)).coefficients, engine.multiply(m, m).coefficients)
    })
  }

  it('returns translators exactly and inverts exp for abs(w) < pi', () => {
    expect(log(translator(3, 0)).coefficients).toEqual([0, 0, 0, 0, -1.5, 0, 0, 0])
    expect(engine.exp(log(translator(3, 0))).coefficients).toEqual([1, 0, 0, 0, -1.5, 0, 0, 0])
    const generator = engine.add(engine.multiply(engine.scalar(-2.5), engine.basisBlade('e12')), engine.basisBlade('e01'))
    close(log([...engine.exp(generator).coefficients] as unknown as Pga2Coefficients).coefficients, generator.coefficients)
  })

  it('takes the principal branch of the group', () => {
    const fullTurn = engine.exp(engine.multiply(engine.scalar(2 * Math.PI), engine.basisBlade('e12')))
    close(log([...fullTurn.coefficients] as unknown as Pga2Coefficients).coefficients, [0, 0, 0, 0, 0, 0, 0, 0])
    const r = rotation(1.5 * Math.PI, blade('e12'))
    const negated = scale(r, -1)
    close(log(negated).coefficients, [0, 0, 0, 0, 0, 0, Math.PI / 4, 0])
    const shortHalf = engine.exp(engine.multiply(engine.scalar(0.5), log(negated)))
    close(engine.multiply(shortHalf, shortHalf).coefficients, negated)
    expect(Math.abs(shortHalf.coefficients[0] - sqrt(r).coefficients[0])).toBeGreaterThan(0.1)
  })

  it('decides the branch cut with the convention comparison bound', () => {
    const bound = 64 * Number.EPSILON
    const motorAbove = (gap: number): Pga2Coefficients => {
      const s = -1 + gap
      return [s, 0, 0, 0, 0, 0, Math.sqrt((1 - s) * (1 + s)), 0]
    }
    expect(() => log(motorAbove(4 * bound))).not.toThrow()
    expect(() => sqrt(motorAbove(4 * bound))).not.toThrow()
    expect(() => log(motorAbove(bound / 2))).toThrow(/branch cut/)
    expect(() => sqrt(motorAbove(bound / 2))).toThrow(/branch cut/)
    const product = engine.multiply(owned(translator(0.3, -7)), owned(rotation(1, point(5, 2))))
    expect(() => engine.scalarFunction('log', [engine.multiply(product, product)])).not.toThrow()
  })
})

function scalarValue(value: number): Pga2Coefficients {
  return [value, 0, 0, 0, 0, 0, 0, 0]
}
