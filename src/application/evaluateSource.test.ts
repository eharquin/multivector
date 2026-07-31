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

  it('interprets a bivector without creating a render primitive', () => {
    const result = evaluateSource('e1 * e2', engine)

    expect(result).toMatchObject({
      status: 'valid',
      inspection: 'e12',
      entity: { kind: 'bivector-2d', value: 1 },
      primitive: null,
      visualization: {
        status: 'unsupported',
        message: 'This VGA 2D object has no supported visualization.',
      },
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
})
