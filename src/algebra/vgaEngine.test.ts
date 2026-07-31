import { describe, expect, it } from 'vitest'
import { createVga2Engine } from './vgaEngine'

describe('VGA engine adapter', () => {
  it('constructs an independently known VGA(2) scalar value', () => {
    expect(createVga2Engine().scalar(12)).toEqual({
      kind: 'multivector',
      coefficients: [12, 0, 0, 0],
    })
  })

  it('constructs the independently known VGA(2) vector coefficients', () => {
    const engine = createVga2Engine()
    const value = engine.add(
      engine.multiply(engine.scalar(2), engine.basisBlade('e1')),
      engine.basisBlade('e2'),
    )

    expect(value).toEqual({
      kind: 'multivector',
      coefficients: [0, 2, 1, 0],
    })
  })

  it('computes an independently known basis product', () => {
    const engine = createVga2Engine()

    expect(
      engine.multiply(engine.basisBlade('e1'), engine.basisBlade('e2')),
    ).toEqual({
      kind: 'multivector',
      coefficients: [0, 0, 0, 1],
    })
  })

  it('provides the canonical VGA(2) pseudoscalar', () => {
    expect(createVga2Engine().pseudoscalar()).toEqual({
      kind: 'multivector',
      coefficients: [0, 0, 0, 1],
    })
  })

  it('computes outer and inner products from analytical VGA(2) fixtures', () => {
    const engine = createVga2Engine()
    const e1 = engine.basisBlade('e1')
    const e2 = engine.basisBlade('e2')
    const v = engine.add(engine.multiply(engine.scalar(2), e1), e2)
    const w = engine.add(e1, engine.multiply(engine.scalar(3), e2))

    expect(engine.outer(v, w)).toEqual({
      kind: 'multivector',
      coefficients: [0, 0, 0, 5],
    })
    expect(engine.inner(v, w)).toEqual({
      kind: 'multivector',
      coefficients: [5, 0, 0, 0],
    })
  })

  it('computes the convention-defined regressive product through duality', () => {
    const engine = createVga2Engine()

    expect(
      engine.regressive(engine.basisBlade('e1'), engine.basisBlade('e2')),
    ).toEqual({
      kind: 'multivector',
      coefficients: [-1, 0, 0, 0],
    })
  })

  it.each([
    [[1, 0, 0, 0], [1, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 1], [0, 0, 0, -1]],
  ])('reverses basis value %j analytically', (input, expected) => {
    const engine = createVga2Engine()
    const value = engine.add(
      engine.add(
        engine.scalar(input[0]),
        engine.multiply(engine.scalar(input[1]), engine.basisBlade('e1')),
      ),
      engine.add(
        engine.multiply(engine.scalar(input[2]), engine.basisBlade('e2')),
        engine.multiply(engine.scalar(input[3]), engine.pseudoscalar()),
      ),
    )

    expect(engine.reverse(value).coefficients).toEqual(expected)
  })

  it.each([
    [[1, 0, 0, 0], [0, 0, 0, 1]],
    [[0, 1, 0, 0], [0, 0, 1, 0]],
    [[0, 0, 1, 0], [0, -1, 0, 0]],
    [[0, 0, 0, 1], [-1, 0, 0, 0]],
  ])('duals basis value %j by right multiplication with ps', (input, expected) => {
    const engine = createVga2Engine()
    const value = engine.add(
      engine.add(
        engine.scalar(input[0]),
        engine.multiply(engine.scalar(input[1]), engine.basisBlade('e1')),
      ),
      engine.add(
        engine.multiply(engine.scalar(input[2]), engine.basisBlade('e2')),
        engine.multiply(engine.scalar(input[3]), engine.pseudoscalar()),
      ),
    )

    expect(engine.dual(value).coefficients).toEqual(expected)
  })

  it('projects grades and extracts coefficients as scalar multivectors', () => {
    const engine = createVga2Engine()
    const value = engine.add(
      engine.add(engine.scalar(2), engine.basisBlade('e1')),
      engine.multiply(engine.scalar(3), engine.pseudoscalar()),
    )

    expect(engine.grade(value, 1).coefficients).toEqual([0, 1, 0, 0])
    expect(engine.grade(value, 2).coefficients).toEqual([0, 0, 0, 3])
    expect(engine.coefficient(value, 'e12').coefficients).toEqual([3, 0, 0, 0])
    expect(engine.coefficient(value, 'e2').coefficients).toEqual([0, 0, 0, 0])
  })

  it('negates odd grades under grade involution', () => {
    const engine = createVga2Engine()
    const value = engine.add(
      engine.add(engine.scalar(1), engine.basisBlade('e1')),
      engine.pseudoscalar(),
    )

    expect(engine.gradeInvolution(value).coefficients).toEqual([1, -1, 0, 1])
  })

  it('does not expose a ganja value across the engine boundary', () => {
    const engine = createVga2Engine()
    const value = engine.add(engine.basisBlade('e1'), engine.basisBlade('e2'))

    expect(value).not.toBeInstanceOf(Float32Array)
    expect(value).not.toBeInstanceOf(Float64Array)
    expect(Array.isArray(value.coefficients)).toBe(true)
    expect(Object.isFrozen(value)).toBe(true)
    expect(Object.isFrozen(value.coefficients)).toBe(true)
  })

  it('constructs the quarter-turn rotor and applies the specified sandwich', () => {
    const engine = createVga2Engine()
    const exponent = engine.multiply(engine.scalar(-Math.PI / 4), engine.pseudoscalar())
    const rotated = engine.sandwich(engine.exp(exponent), engine.basisBlade('e1'))

    expect(rotated.coefficients[1]).toBeCloseTo(0, 14)
    expect(rotated.coefficients[2]).toBeCloseTo(1, 14)
  })

  it('uses all three closed multivector exponential forms', () => {
    const engine = createVga2Engine()
    const nilpotent = engine.add(engine.basisBlade('e1'), engine.pseudoscalar())

    expect(engine.exp(engine.pseudoscalar()).coefficients).toEqual([
      Math.cos(1), 0, 0, Math.sin(1),
    ])
    expect(engine.exp(engine.basisBlade('e1')).coefficients).toEqual([
      Math.cosh(1), Math.sinh(1), 0, 0,
    ])
    expect(engine.exp(nilpotent).coefficients).toEqual([1, 1, 0, 1])

    const twiceBivector = engine.multiply(engine.scalar(2), engine.pseudoscalar())
    expect(engine.exp(twiceBivector).coefficients).toEqual([
      Math.cos(2), 0, 0, Math.sin(2),
    ])
  })

  it('supports inverse, division, integer powers, norm, and normalization', () => {
    const engine = createVga2Engine()
    const value = engine.add(engine.scalar(2), engine.pseudoscalar())

    expect(engine.multiply(value, engine.inverse(value)).coefficients).toEqual([1, 0, 0, 0])
    expect(engine.divide(value, value).coefficients).toEqual([1, 0, 0, 0])
    expect(engine.power(engine.pseudoscalar(), -1).coefficients).toEqual([0, 0, 0, -1])
    expect(engine.norm(value).coefficients).toEqual([Math.sqrt(5), 0, 0, 0])
    const normalized = engine.normalize(value)
    expect(normalized.status).toBe('normalized')
    expect(engine.norm(normalized.value).coefficients[0]).toBeCloseTo(1, 14)
  })

  it('rejects singular inverses and non-scalar elementary functions', () => {
    const engine = createVga2Engine()
    const singular = engine.add(engine.scalar(1), engine.basisBlade('e1'))

    expect(() => engine.inverse(singular)).toThrow('not invertible')
    expect(() => engine.scalarFunction('sin', engine.basisBlade('e1'))).toThrow('requires a scalar')
    expect(engine.normalize(engine.scalar(0))).toEqual({
      status: 'unavailable',
      value: engine.scalar(0),
    })
    expect(() => engine.exp(singular)).toThrow('outside the supported closed forms')
  })

  it('rejects non-finite intermediate inverse and norm calculations', () => {
    const engine = createVga2Engine()
    const large = engine.scalar(Number.MAX_VALUE)

    expect(() => engine.inverse(large)).toThrow('non-finite intermediate')
    expect(() => engine.norm(large)).toThrow('non-finite intermediate')
  })
})
