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
