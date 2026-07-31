import { describe, expect, it } from 'vitest'
import {
  parseDocumentExpression,
  parseExpression,
} from './parseExpression'

describe('minimal expression parser', () => {
  it('parses a scalar literal as a complete expression', () => {
    expect(parseExpression('  -12.5 ')).toEqual({
      ok: true,
      expression: {
        kind: 'unary-expression',
        operator: '-',
        operand: {
          kind: 'scalar-literal',
          value: 12.5,
          span: { start: 3, end: 7 },
        },
        span: { start: 2, end: 7 },
      },
    })
  })

  it('parses vector constructor components with owned source spans', () => {
    expect(parseExpression('  vector(2, -1.5e+1) ')).toEqual({
      ok: true,
      expression: {
        kind: 'vector-constructor',
        components: [
          { kind: 'scalar-literal', value: 2, span: { start: 9, end: 10 } },
          {
            kind: 'unary-expression',
            operator: '-',
            operand: {
              kind: 'scalar-literal',
              value: 15,
              span: { start: 13, end: 19 },
            },
            span: { start: 12, end: 19 },
          },
        ],
        span: { start: 2, end: 20 },
      },
    })
  })

  it('parses a two-component tuple as concise vector syntax', () => {
    expect(parseExpression(' (2, -1.5e+1) ')).toEqual({
      ok: true,
      expression: {
        kind: 'vector-constructor',
        components: [
          { kind: 'scalar-literal', value: 2, span: { start: 2, end: 3 } },
          {
            kind: 'unary-expression',
            operator: '-',
            operand: {
              kind: 'scalar-literal',
              value: 15,
              span: { start: 6, end: 12 },
            },
            span: { start: 5, end: 12 },
          },
        ],
        span: { start: 1, end: 13 },
      },
    })
  })

  it('keeps a single parenthesized expression scalar', () => {
    expect(parseExpression('(1 + 2)')).toMatchObject({
      ok: true,
      expression: {
        kind: 'binary-expression',
        operator: '+',
      },
    })
  })

  it('rejects invalid syntax without returning a recovered expression', () => {
    expect(parseExpression('vector(2)')).toEqual({
      ok: false,
      diagnostic: {
        code: 'LANG_SYNTAX',
        severity: 'error',
        message: 'Expected “,” between vector components.',
        span: { start: 8, end: 8 },
      },
    })
  })

  it('rejects scientific notation without an explicit exponent sign', () => {
    const result = parseExpression('vector(1e3, 2)')

    expect(result).toMatchObject({
      ok: false,
      diagnostic: { code: 'LANG_SYNTAX' },
    })
  })

  it('preserves unary negative zero syntax and its source span', () => {
    expect(parseExpression('-0')).toEqual({
      ok: true,
      expression: {
        kind: 'unary-expression',
        operator: '-',
        operand: {
          kind: 'scalar-literal',
          value: 0,
          span: { start: 1, end: 2 },
        },
        span: { start: 0, end: 2 },
      },
    })
  })

  it('parses explicit and implicit products with additive precedence', () => {
    expect(parseExpression('1e1 + 2 * e2')).toMatchObject({
      ok: true,
      expression: {
        kind: 'binary-expression',
        operator: '+',
        left: {
          kind: 'binary-expression',
          operator: '*',
          implicit: true,
        },
        right: {
          kind: 'binary-expression',
          operator: '*',
          implicit: false,
        },
      },
    })
  })

  it('rejects a blade-valued vector component before lowering', () => {
    expect(parseExpression('vector(e1, 2)')).toEqual({
      ok: false,
      diagnostic: {
        code: 'LANG_SYNTAX',
        severity: 'error',
        message: 'Vector components must be scalar expressions.',
        span: { start: 7, end: 9 },
      },
    })
  })

  it('parses an optional declaration and identifier references', () => {
    expect(parseDocumentExpression(' B = V1 * V2 ')).toMatchObject({
      ok: true,
      source: {
        declaration: {
          name: 'B',
          span: { start: 1, end: 2 },
        },
        expression: {
          kind: 'binary-expression',
          operator: '*',
          left: { kind: 'reference', name: 'V1' },
          right: { kind: 'reference', name: 'V2' },
        },
      },
    })
  })

  it('keeps built-in names reserved from declarations', () => {
    expect(parseDocumentExpression('e1 = 2')).toMatchObject({
      ok: false,
      diagnostic: { code: 'LANG_SYNTAX' },
    })
    expect(parseDocumentExpression('vector = 2')).toMatchObject({
      ok: false,
      diagnostic: { code: 'LANG_SYNTAX' },
    })
  })

  it('parses read-only position and head properties', () => {
    expect(parseExpression('V.position + V.head')).toMatchObject({
      ok: true,
      expression: {
        kind: 'binary-expression',
        left: {
          kind: 'reference',
          name: 'V',
          property: 'position',
        },
        right: {
          kind: 'reference',
          name: 'V',
          property: 'head',
        },
      },
    })
  })
})
