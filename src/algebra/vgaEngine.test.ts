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
})
