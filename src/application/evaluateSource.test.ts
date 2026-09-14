import { VGA_2D_BASIS } from '../algebra/vgaEngine'
import { describe, expect, it } from 'vitest'
import { createVga2Engine } from '../algebra/vgaEngine'
import { VGA_2D_INTERPRETATION } from '../geometry/vga2Interpretation'
import type { Vector2dEntity } from '../geometry/vga2Interpretation'
import { evaluateSource } from './evaluateSource'
import { ownedList, type LanguageValue } from '../domain/languageValue'
import { evaluateExpression } from '../evaluation/evaluateExpression'
import { lowerExpression } from '../language/lowerExpression'
import { parseExpression } from '../language/parseExpression'

const engine = createVga2Engine()
const context = { engine, interpretation: VGA_2D_INTERPRETATION }

function validValue(source: string) {
  const result = evaluateSource(source, context)
  if (result.status !== 'valid') throw new Error(result.diagnostic.message)
  if (result.valueType !== 'single') throw new Error('Expected one multivector')
  return result.value
}

describe('source evaluation pipeline', () => {
  it('evaluates heterogeneous lists with stable element identities and text', () => {
    const first = evaluateSource('[1, e1, 2e12]', context, 'L')
    const second = evaluateSource('[1, e1, 2e12]', context, 'L')

    expect(first).toMatchObject({
      status: 'valid',
      valueType: 'list',
      inspection: '[1, e1, 2e12]',
      entity: { kind: 'list', length: 3 },
      elements: [
        { entity: { kind: 'scalar' }, primitive: null },
        { entity: { kind: 'vector-2d' } },
        { entity: { kind: 'bivector-2d' } },
      ],
    })
    if (first.status !== 'valid' || first.valueType !== 'list' ||
        second.status !== 'valid' || second.valueType !== 'list') return
    expect(first.value.elements.map((element) => element.id)).toEqual(
      second.value.elements.map((element) => element.id),
    )
  })

  it.each([
    ['[1...3]', '[1, 2, 3]'],
    ['[3...1]', '[3, 2, 1]'],
    ['[1,3...6]', '[1, 3, 5]'],
    ['[3,1...0]', '[3, 1]'],
  ])('evaluates arithmetic range %s', (source, inspection) => {
    expect(evaluateSource(source, context)).toMatchObject({
      status: 'valid', valueType: 'list', inspection,
    })
  })

  it('broadcasts values and singleton lists without nesting', () => {
    expect(evaluateSource('[e1, e2] + 2e1', context)).toMatchObject({
      status: 'valid', inspection: '[3e1, 2e1 + e2]',
    })
    expect(evaluateSource('[e1, e2] + [e2]', context)).toMatchObject({
      status: 'valid', inspection: '[e1 + e2, 2e2]',
    })
    expect(evaluateSource('[] + e1', context)).toMatchObject({
      status: 'valid', inspection: '[]',
    })
  })

  it('indexes lists and reports range, length, and nesting diagnostics', () => {
    expect(evaluateSource('[e1, e2][1]', context)).toMatchObject({
      status: 'valid', valueType: 'single', inspection: 'e2',
    })
    expect(evaluateSource('[e1, e2][2]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_INDEX_RANGE' },
    })
    expect(evaluateSource('[e1, e2] + [e1, e2, e1]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_LIST_LENGTH' },
    })
    expect(evaluateSource('[e1, [e2]]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_NESTED_LIST' },
    })
    expect(evaluateSource('[1,1...3]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_RANGE_DIRECTION' },
    })
    expect(evaluateSource('[1,1...1]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_RANGE_DIRECTION' },
    })
    expect(evaluateSource('[0...10000]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LIMIT_GENERATED_VALUES' },
    })
    expect(evaluateSource('[] + [e1]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_LIST_LENGTH' },
    })
    expect(evaluateSource('[e1][-1]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_INDEX_DOMAIN' },
    })
    expect(evaluateSource('[e1][0.5]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_INDEX_DOMAIN' },
    })
    expect(evaluateSource('e1[0]', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_INDEX_TYPE' },
    })
    expect(evaluateSource('[1, 0].inverse', context)).toMatchObject({
      status: 'invalid',
      diagnostic: {
        code: 'ALG_SINGULAR',
        message: expect.stringContaining('List element 1'),
      },
    })
  })
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
      basis: VGA_2D_BASIS,
      coefficients: [0, 1, 0, 0],
    })
    expect(validValue('1e+1')).toEqual({
      kind: 'multivector',
      basis: VGA_2D_BASIS,
      coefficients: [10, 0, 0, 0],
    })
  })

  it('canonicalizes negative zero after core evaluation', () => {
    expect(validValue('-0')).toEqual({
      kind: 'multivector',
      basis: VGA_2D_BASIS,
      coefficients: [0, 0, 0, 0],
    })
  })

  it('interprets a bivector and creates an accessible oriented-area primitive', () => {
    const result = evaluateSource('e1 * e2', context)

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
      basis: VGA_2D_BASIS,
      coefficients: [0, 0, 0, 1],
    })
    expect(validValue('e21')).toEqual({
      kind: 'multivector',
      basis: VGA_2D_BASIS,
      coefficients: [0, 0, 0, -1],
    })
    expect(validValue('e12 + e21')).toEqual({
      kind: 'multivector',
      basis: VGA_2D_BASIS,
      coefficients: [0, 0, 0, 0],
    })
    expect(evaluateSource('e21', context)).toMatchObject({
      status: 'valid',
      inspection: '-e12',
    })
  })

  it.each([
    ['12 + e1', '12 + e1'],
    ['vector(1, 1) + 12', '12 + e1 + e2'],
    ['12 + 2e1 + 80e12', '12 + 2e1 + 80e12'],
  ])('evaluates and interprets mixed expression %s', (source, inspection) => {
    const result = evaluateSource(source, context)

    expect(result).toMatchObject({
      status: 'valid',
      inspection,
      entity: { kind: 'mixed-multivector' },
      visualization: { status: 'unsupported' },
    })
  })

  it('distinguishes a rotor from a pure bivector', () => {
    expect(evaluateSource('1 + e12', context)).toMatchObject({
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
    expect(evaluateSource(source, context)).toMatchObject({
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
    expect(evaluateSource('e1.rev', context)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'LANG_UNSUPPORTED_PROPERTY' },
    })
    expect(evaluateSource('e1.invo', context)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'LANG_UNSUPPORTED_PROPERTY' },
    })
  })

  it('reports an unknown property at its source span', () => {
    expect(evaluateSource('(1 + e1).unknown', context)).toEqual({
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
    const result = evaluateSource('exp(-(pi/4)e12) >>> e1', context)
    expect(result).toMatchObject({ status: 'valid', entity: { kind: 'vector-2d' } })
    if (result.status !== 'valid' || result.entity.kind !== 'vector-2d') return
    const vector = result.entity as Vector2dEntity
    expect(vector.x).toBeCloseTo(0, 14)
    expect(vector.y).toBeCloseTo(1, 14)
  })

  it.each([
    ['sin(pi/2)', 1],
    ['cos(pi)', -1],
    ['sinh(0)', 0],
    ['cosh(0)', 1],
    ['tanh(0)', 0],
    ['abs(-2.5)', 2.5],
    ['sqrt(16)', 4],
    ['log(exp(2))', 2],
    ['asin(1)', Math.PI / 2],
    ['acos(0)', Math.PI / 2],
    ['atan(1)', Math.PI / 4],
    ['atan2(1, 1)', Math.PI / 4],
    ['atan2(-1, -1)', -3 * Math.PI / 4],
    ['atan2(1, 0)', Math.PI / 2],
    ['min(2, -3)', -3],
    ['max(2, -3)', 2],
    ['acos(e1 | e1)', 0],
    ['sqrt(4) e12 * e21', 2],
  ])('evaluates scalar function %s', (source, expected) => {
    expect(validValue(source).coefficients[0]).toBeCloseTo(expected, 14)
  })

  it.each([
    'sqrt(-1)', 'log(0)', 'log(-1)', 'asin(1.5)', 'acos(-1.0001)', 'atan2(0, 0)',
    'abs(e1)', 'min(1, e1)', 'max(e12, 1)',
  ])('reports the scalar-domain failure of %s', (source) => {
    expect(evaluateSource(source, context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'ALG_DOMAIN' },
    })
  })

  it('checks the arity of the built-in scalar functions at parse time', () => {
    expect(evaluateSource('sqrt(1, 2)', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_SYNTAX', span: { start: 0, end: 10 } },
    })
    expect(evaluateSource('atan2(1)', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_SYNTAX' },
    })
    expect(evaluateSource('min = 1', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_SYNTAX' },
    })
  })

  it('broadcasts scalar functions over lists', () => {
    expect(validValue('sqrt([1, 4, 9])[2]').coefficients[0]).toBe(3)
    expect(validValue('max([1, 5], 3)[1]').coefficients[0]).toBe(5)
    expect(validValue('atan2([1, -1], [1, 1])[1]').coefficients[0]).toBeCloseTo(-Math.PI / 4, 14)
  })

  it('reports singular and scalar-domain failures with source spans', () => {
    expect(evaluateSource('(1 + e1).inverse', context)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'ALG_SINGULAR', span: { start: 0, end: 16 } },
    })
    expect(evaluateSource('sin(e1)', context)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'ALG_DOMAIN', span: { start: 0, end: 7 } },
    })
    expect(evaluateSource('tan(pi/2)', context)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'ALG_DOMAIN' },
    })
    expect(evaluateSource('unknown(1)', context)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'LANG_UNSUPPORTED_FUNCTION' },
    })
  })

  it('resolves blades in any generator order against the active basis', () => {
    const engine = createVga2Engine()
    const context = { engine, interpretation: VGA_2D_INTERPRETATION }
    expect(evaluateSource('e21', context)).toMatchObject({
      status: 'valid', value: { coefficients: [0, 0, 0, -1] },
    })
    expect(evaluateSource('(e1 + 2 e12).e21', context)).toMatchObject({
      status: 'valid', value: { coefficients: [-2, 0, 0, 0] },
    })
    expect(evaluateSource('(1 + e1 + e12).g2', context)).toMatchObject({
      status: 'valid', value: { coefficients: [0, 0, 0, 1] },
    })
  })

  it('reports blades and grades the active algebra does not have, with their spans', () => {
    const engine = createVga2Engine()
    const context = { engine, interpretation: VGA_2D_INTERPRETATION }
    expect(evaluateSource('e1 + e0', context)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'ALG_UNKNOWN_BLADE', span: { start: 5, end: 7 } },
    })
    expect(evaluateSource('e012', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'ALG_UNKNOWN_BLADE' },
    })
    expect(evaluateSource('(e1).e20', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'ALG_UNKNOWN_BLADE' },
    })
    expect(evaluateSource('(1 + e1).g3', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'ALG_UNKNOWN_GRADE' },
    })
  })

  it('dispatches calls through the registered functions of the active algebra', () => {
    const engine = createVga2Engine()
    const context = { engine, interpretation: VGA_2D_INTERPRETATION }
    expect(evaluateSource('point(1, 2)', context)).toMatchObject({
      status: 'invalid',
      diagnostic: { code: 'LANG_UNSUPPORTED_FUNCTION', span: { start: 0, end: 11 } },
    })
    expect(evaluateSource('vector(1, 2, 3)', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_SYNTAX' },
    })
    expect(evaluateSource('exp(1, 2)', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_SYNTAX' },
    })
    expect(evaluateSource('vector(e1, 2)', context)).toMatchObject({
      status: 'invalid', diagnostic: { code: 'LANG_SYNTAX' },
    })
  })

  it('broadcasts constructor calls over list arguments', () => {
    const engine = createVga2Engine()
    const lists: Record<string, LanguageValue> = {
      a: ownedList([1, 2].map((x) => ({ id: `a${x}`, value: engine.scalar(x), sources: [] }))),
      b: ownedList([3, 4, 5].map((x) => ({ id: `b${x}`, value: engine.scalar(x), sources: [] }))),
    }
    const evaluate = (source: string) => {
      const parsed = parseExpression(source)
      if (!parsed.ok) throw new Error(parsed.diagnostic.message)
      return evaluateExpression(lowerExpression(parsed.expression), engine, (name) => lists[name])
    }
    expect(evaluate('vector(a, 3)')).toMatchObject({
      kind: 'list',
      elements: [
        { value: { coefficients: [0, 1, 3, 0] }, sources: ['a1'] },
        { value: { coefficients: [0, 2, 3, 0] }, sources: ['a2'] },
      ],
    })
    expect(() => evaluate('vector(a, b)')).toThrow(/List lengths/)
  })
})
