import { describe, expect, it } from 'vitest'
import { OPAQUE_INTERPRETATION } from '../geometry/interpretation'
import { evaluateSource } from '../application/evaluateSource'
import { createBuiltinAlgebraRegistry } from './builtinAlgebras'
import { createVga2Engine } from './vgaEngine'
import { VGA_2D_INTERPRETATION } from '../geometry/vga2Interpretation'

const pga = (parameters: Record<string, unknown> = { dimension: 2 }) => ({
  algebraId: 'org.multivector.pga', definitionVersion: 1, conventionVersion: 1, parameters,
})

describe('PGA definition registration', () => {
  const registry = createBuiltinAlgebraRegistry()

  it('resolves PGA(2) with canonical parameters and its standard identifiers', () => {
    const resolution = registry.resolve(pga())
    expect(resolution.status).toBe('resolved')
    if (resolution.status !== 'resolved') return
    expect(resolution.parameters).toEqual({ dimension: 2 })
    expect(resolution.engine.basis.blades.map((blade) => blade.name))
      .toEqual(['e', 'e0', 'e1', 'e2', 'e01', 'e02', 'e12', 'e012'])
    expect(resolution.definition.standardInterpretationId).toBe('org.multivector.pga-2d')
    expect(resolution.definition.badge).toBe('PGA · 2D')
  })

  it('defaults the dimension to 2 and rejects every other dimension or parameter (PGA-001, PGA-004)', () => {
    const defaulted = registry.resolve(pga({}))
    expect(defaulted.status).toBe('resolved')
    if (defaulted.status === 'resolved') expect(defaulted.parameters).toEqual({ dimension: 2 })
    expect(registry.resolve(pga({ dimension: 3 })))
      .toMatchObject({ status: 'unavailable', code: 'ALG_INVALID_PARAMETERS' })
    expect(registry.resolve(pga({ dimension: 2, metric: 'x' })))
      .toMatchObject({ status: 'unavailable', code: 'ALG_INVALID_PARAMETERS' })
  })

  it('describes the algebra from the engine, so the tables match the products', () => {
    const resolution = registry.resolve(pga())
    if (resolution.status !== 'resolved') throw new Error('unresolved')
    const info = resolution.definition.info(resolution.parameters)
    expect(info.blades).toEqual(['1', 'e0', 'e1', 'e2', 'e01', 'e02', 'e12', 'e012'])
    expect(info.bladeSquares).toEqual(['+1', '0', '+1', '+1', '0', '0', '−1', '0'])
    expect(info.cayley[2][3]).toBe('e12')
    expect(info.cayley[3][2]).toBe('−e12')
    expect(info.cayley[6][5]).toBe('e01')
    expect(info.cayley[7][7]).toBe('0')
  })
})

describe('PGA(2) sources through the language', () => {
  const registry = createBuiltinAlgebraRegistry()
  const resolution = registry.resolve(pga())
  if (resolution.status !== 'resolved') throw new Error('unresolved')
  const context = { engine: resolution.engine, interpretation: OPAQUE_INTERPRETATION }
  const value = (source: string) => {
    const result = evaluateSource(source, context)
    if (result.status !== 'valid' || result.valueType !== 'single') throw new Error(JSON.stringify(result))
    return result
  }

  it('evaluates constructors, meet, join, dual, incidence, and norms', () => {
    expect(value('point(1, 2)').inspection).toBe('2e01 - e02 + e12')
    expect(value('line(1, 0, -1) ^ line(0, 1, -2)').inspection).toBe('2e01 - e02 + e12')
    expect(value('line(1, 0, -1) ^ line(1, 0, -2)').inspection).toBe('e01')
    expect(value('point(0, 0) & point(1, 1)').inspection).toBe('-e1 + e2')
    expect(value('!e1').inspection).toBe('-e02')
    expect(value('e20').inspection).toBe('-e02')
    expect(value('line(1, -1, 0) ^ point(2, 2)').inspection).toBe('0')
    expect(value('norm(line(3, 4, 5))').inspection).toBe('5')
    expect(value('inorm(line(3, 4, 5))').inspection).toBe('5')
    expect(value('inorm(ipoint(3, 4))').inspection).toBe('5')
    expect(value('ipoint(3, 4).inorm').inspection).toBe('5')
    expect(value('ps').inspection).toBe('e012')
  })

  it('evaluates motors and reflections with the convention signs', () => {
    const rotated = value('exp(-(pi/4) e12) >>> point(1, 0)')
    expect(rotated.value.coefficients[4]).toBeCloseTo(1, 12)
    expect(rotated.value.coefficients[5]).toBeCloseTo(0, 12)
    expect(rotated.value.coefficients[6]).toBeCloseTo(1, 12)
    expect(value('(1 - 1.5 e01) >>> point(0, 0)').inspection).toBe('-3e02 + e12')
    expect(value('e1 >>> point(1, 0)').inspection).toBe('-e02 - e12')
  })

  it('reports arity, non-scalar arguments, and unavailable functions', () => {
    expect(evaluateSource('point(1)', context)).toMatchObject({ status: 'invalid', diagnostic: { code: 'LANG_ARITY' } })
    expect(evaluateSource('point(e1, 2)', context)).toMatchObject({ status: 'invalid', diagnostic: { code: 'ALG_DOMAIN' } })
    expect(evaluateSource('vector(1, 2)', context)).toMatchObject({ status: 'invalid', diagnostic: { code: 'LANG_UNSUPPORTED_FUNCTION' } })
    expect(evaluateSource('1 / e0', context)).toMatchObject({ status: 'invalid', diagnostic: { code: 'ALG_SINGULAR' } })
  })

  it('leaves VGA(2) sources unaffected by the PGA registration', () => {
    const vga = { engine: createVga2Engine(), interpretation: VGA_2D_INTERPRETATION }
    expect(evaluateSource('point(1, 2)', vga)).toMatchObject({ status: 'invalid', diagnostic: { code: 'LANG_UNSUPPORTED_FUNCTION' } })
    expect(evaluateSource('inorm(e1)', vga)).toMatchObject({ status: 'invalid', diagnostic: { code: 'LANG_UNSUPPORTED_FUNCTION' } })
    expect(evaluateSource('e1.inorm', vga)).toMatchObject({ status: 'invalid', diagnostic: { code: 'LANG_UNSUPPORTED_FUNCTION' } })
    expect(evaluateSource('vector(1, 2)', vga)).toMatchObject({ status: 'valid', inspection: 'e1 + 2e2' })
  })
})
