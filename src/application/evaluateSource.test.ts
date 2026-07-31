import { describe, expect, it } from 'vitest'
import { createVga2Engine } from '../algebra/vgaEngine'
import { evaluateSource } from './evaluateSource'

const engine = createVga2Engine()

function validValue(source: string) {
  const result = evaluateSource(source, engine)
  if (result.status !== 'valid') throw new Error(result.diagnostic.message)
  return result.value
}

describe('source evaluation pipeline', () => {
  it.each([
    ['vector(1, 2)', 'e1 + 2e2'],
    ['vector(3, -4)', '3e1 - 4e2'],
    ['vector(0, 0)', '0e1 + 0e2'],
  ])('evaluates %s and %s through the same core algebra', (left, right) => {
    expect(validValue(left)).toEqual(validValue(right))
  })

  it('distinguishes blade notation from signed scientific notation', () => {
    expect(validValue('1e1')).toEqual({
      kind: 'multivector',
      coefficients: [0, 1, 0, 0],
    })
    expect(validValue('1e+1')).toEqual({
      kind: 'multivector',
      coefficients: [10, 0, 0, 0],
    })
  })

  it('canonicalizes negative zero after core evaluation', () => {
    expect(validValue('-0')).toEqual({
      kind: 'multivector',
      coefficients: [0, 0, 0, 0],
    })
  })

  it('interprets a bivector and creates an accessible oriented-area primitive', () => {
    const result = evaluateSource('e1 * e2', engine)

    expect(result).toMatchObject({
      status: 'valid',
      inspection: 'e12',
      entity: { kind: 'bivector-2d', value: 1 },
      primitive: {
        kind: 'oriented-area',
        area: 1,
        orientation: 'counterclockwise',
        accessibleName: 'Bivector 1',
        shape: { kind: 'loop', center: { x: 0, y: 0 } },
      },
      visualization: { status: 'available' },
    })
  })

  it('derives compact blade permutation signs through the geometric product', () => {
    expect(validValue('e12')).toEqual({
      kind: 'multivector',
      coefficients: [0, 0, 0, 1],
    })
    expect(validValue('e21')).toEqual({
      kind: 'multivector',
      coefficients: [0, 0, 0, -1],
    })
    expect(validValue('e12 + e21')).toEqual({
      kind: 'multivector',
      coefficients: [0, 0, 0, 0],
    })
    expect(evaluateSource('e21', engine)).toMatchObject({
      status: 'valid',
      inspection: '-e12',
    })
  })

  it.each([
    ['12 + e1', '12 + e1'],
    ['vector(1, 1) + 12', '12 + e1 + e2'],
    ['12 + 2e1 + 80e12', '12 + 2e1 + 80e12'],
  ])('evaluates and interprets mixed expression %s', (source, inspection) => {
    const result = evaluateSource(source, engine)

    expect(result).toMatchObject({
      status: 'valid',
      inspection,
      entity: { kind: 'mixed-multivector' },
      visualization: { status: 'unsupported' },
    })
  })

  it('distinguishes a rotor from a pure bivector', () => {
    expect(evaluateSource('1 + e12', engine)).toMatchObject({
      status: 'valid',
      entity: { kind: 'rotor-2d', scalar: 1, bivector: 1 },
      primitive: null,
    })
  })

  it.each([
    ['(1, 0) ^ (0, 1)', 'e12', 'bivector-2d'],
    ['(2, 1) | (1, 3)', '5', 'scalar'],
    ['e1 & e2', '-1', 'scalar'],
    ['~(1 + 2e1 + 3e2 + 4e12)', '1 + 2e1 + 3e2 - 4e12', 'mixed-multivector'],
    ['!e1', 'e2', 'vector-2d'],
    ['ps', 'e12', 'bivector-2d'],
    ['2ps', '2e12', 'bivector-2d'],
    ['(1 + 2e1 + 3e2 + 4e12).g1', '2e1 + 3e2', 'vector-2d'],
    ['(1 + 2e1 + 3e2 + 4e12).e12', '4', 'scalar'],
    ['(1 + 2e1 + 3e2 + 4e12).involution', '1 - 2e1 - 3e2 + 4e12', 'mixed-multivector'],
  ])('evaluates fundamental operation %s', (source, inspection, kind) => {
    expect(evaluateSource(source, engine)).toMatchObject({
      status: 'valid',
      inspection,
      entity: { kind },
    })
  })

  it('keeps prefix and canonical postfix dual and reverse forms equivalent', () => {
    expect(validValue('!e1')).toEqual(validValue('e1.dual'))
    expect(validValue('~e12')).toEqual(validValue('e12.reverse'))
  })

  it('does not reserve abbreviated involution aliases', () => {
    expect(evaluateSource('e1.rev', engine)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'LANG_UNSUPPORTED_PROPERTY' },
    })
    expect(evaluateSource('e1.invo', engine)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'LANG_UNSUPPORTED_PROPERTY' },
    })
  })

  it('reports an unknown property at its source span', () => {
    expect(evaluateSource('(1 + e1).unknown', engine)).toEqual({
      status: 'invalid',
      diagnostic: {
        code: 'LANG_UNSUPPORTED_PROPERTY',
        severity: 'error',
        message: 'The property “unknown” is not supported.',
        span: { start: 9, end: 16 },
      },
    })
  })

  it('evaluates a rotor quarter-turn through source syntax', () => {
    const result = evaluateSource('exp(-(pi/4)e12) >>> e1', engine)
    expect(result).toMatchObject({ status: 'valid', entity: { kind: 'vector-2d' } })
    if (result.status !== 'valid' || result.entity.kind !== 'vector-2d') return
    expect(result.entity.x).toBeCloseTo(0, 14)
    expect(result.entity.y).toBeCloseTo(1, 14)
  })

  it.each([
    ['sin(pi/2)', 1],
    ['cos(pi)', -1],
    ['sinh(0)', 0],
    ['cosh(0)', 1],
    ['tanh(0)', 0],
  ])('evaluates scalar function %s', (source, expected) => {
    expect(validValue(source).coefficients[0]).toBeCloseTo(expected, 14)
  })

  it('reports singular and scalar-domain failures with source spans', () => {
    expect(evaluateSource('(1 + e1).inverse', engine)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'ALG_SINGULAR', span: { start: 0, end: 16 } },
    })
    expect(evaluateSource('sin(e1)', engine)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'ALG_DOMAIN', span: { start: 0, end: 7 } },
    })
    expect(evaluateSource('tan(pi/2)', engine)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'ALG_DOMAIN' },
    })
    expect(evaluateSource('unknown(1)', engine)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'LANG_UNSUPPORTED_FUNCTION' },
    })
  })
})
