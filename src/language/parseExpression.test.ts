import { describe, expect, it } from 'vitest'
import {
  parseDocumentExpression,
  parseExpression,
} from './parseExpression'

describe('minimal expression parser', () => {
  it('parses list literals, ranges, and zero-based indexing', () => {
    expect(parseExpression('[]')).toMatchObject({
      ok: true, expression: { kind: 'list-expression', elements: [] },
    })
    expect(parseExpression('[e1, 2e2,]')).toMatchObject({
      ok: true,
      expression: {
        kind: 'list-expression',
        elements: [{ kind: 'basis-blade' }, { kind: 'binary-expression' }],
      },
    })
    expect(parseExpression('[1...3]')).toMatchObject({
      ok: true, expression: { kind: 'range-expression', next: null },
    })
    expect(parseExpression('[5,3...0]')).toMatchObject({
      ok: true,
      expression: {
        kind: 'range-expression',
        start: { value: 5 }, next: { value: 3 }, end: { value: 0 },
      },
    })
    expect(parseExpression('[e1, e2][1].dual')).toMatchObject({
      ok: true,
      expression: {
        kind: 'property-expression',
        object: { kind: 'index-expression', index: { value: 1 } },
        property: 'dual',
      },
    })
  })

  it('rejects list elisions', () => {
    expect(parseExpression('[e1,,e2]')).toMatchObject({
      ok: false, diagnostic: { code: 'LANG_SYNTAX' },
    })
  })
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
    expect(parseDocumentExpression('sin = 2')).toMatchObject({
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

  it('applies geometric-product precedence below outer, inner, and regressive products', () => {
    expect(parseExpression('A * B ^ C | D & F + E')).toMatchObject({
      ok: true,
      expression: {
        kind: 'binary-expression',
        operator: '+',
        left: {
          kind: 'binary-expression',
          operator: '*',
          left: { kind: 'reference', name: 'A' },
          right: {
            kind: 'binary-expression',
            operator: '&',
            left: {
              kind: 'binary-expression',
              operator: '|',
              left: {
                kind: 'binary-expression',
                operator: '^',
                left: { kind: 'reference', name: 'B' },
                right: { kind: 'reference', name: 'C' },
              },
              right: { kind: 'reference', name: 'D' },
            },
            right: { kind: 'reference', name: 'F' },
          },
        },
        right: { kind: 'reference', name: 'E' },
      },
    })
  })

  it('parses reverse, dual, pseudoscalar, and postfix algebra properties', () => {
    expect(parseExpression('(~(A + ps)).g1.e2')).toMatchObject({
      ok: true,
      expression: {
        kind: 'property-expression',
        property: 'e2',
        object: {
          kind: 'property-expression',
          property: 'g1',
          object: {
            kind: 'unary-expression',
            operator: '~',
          },
        },
      },
    })
  })

  it('parses canonical postfix involution properties', () => {
    expect(parseExpression('A.dual.reverse.involution')).toMatchObject({
      ok: true,
      expression: {
        kind: 'property-expression',
        property: 'involution',
        object: {
          kind: 'property-expression',
          property: 'reverse',
          object: {
            kind: 'property-expression',
            property: 'dual',
          },
        },
      },
    })
  })

  it('parses generic calls, powers, division, and sandwich precedence', () => {
    expect(parseExpression('exp(-(pi/4) * e12) >>> e1 + e2**2')).toMatchObject({
      ok: true,
      expression: {
        kind: 'binary-expression',
        operator: '+',
        left: {
          kind: 'binary-expression',
          operator: '>>>',
          left: { kind: 'call-expression', callee: 'exp' },
        },
        right: { kind: 'binary-expression', operator: '**' },
      },
    })
  })

  it('accepts a parenthesized scalar coefficient before a blade', () => {
    expect(parseExpression('exp(-(pi/4)e12)')).toMatchObject({
      ok: true,
      expression: {
        kind: 'call-expression',
        arguments: [{ kind: 'binary-expression', operator: '*', implicit: true }],
      },
    })
  })

  it('keeps geometric power right-associative', () => {
    expect(parseExpression('A**B**2')).toMatchObject({
      ok: true,
      expression: {
        operator: '**',
        right: { operator: '**' },
      },
    })
  })
})
