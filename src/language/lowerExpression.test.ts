import { describe, expect, it } from 'vitest'
import { lowerExpression } from './lowerExpression'
import { parseExpression } from './parseExpression'

function parse(source: string) {
  const parsed = parseExpression(source)
  if (!parsed.ok) throw new Error(parsed.diagnostic.message)
  return parsed.expression
}

describe('surface-to-core lowering', () => {
  it('lowers vector construction to a registered constructor call', () => {
    expect(lowerExpression(parse('vector(1, 2)'))).toMatchObject({
      kind: 'call',
      name: 'vector',
      arguments: [
        { kind: 'scalar', value: 1 },
        { kind: 'scalar', value: 2 },
      ],
    })
  })

  it('lowers tuple vector syntax through the same constructor call', () => {
    expect(lowerExpression(parse('(1, 2)'))).toMatchObject({
      kind: 'call',
      name: 'vector',
      arguments: [{ kind: 'scalar', value: 1 }, { kind: 'scalar', value: 2 }],
    })
  })

  it('lowers any other call to a call resolved at evaluation', () => {
    expect(lowerExpression(parse('point(1, 2, 3)'))).toMatchObject({
      kind: 'call',
      name: 'point',
      arguments: [{ value: 1 }, { value: 2 }, { value: 3 }],
    })
    expect(lowerExpression(parse('exp(1)'))).toMatchObject({ kind: 'exp' })
    expect(lowerExpression(parse('sin(1)'))).toMatchObject({ kind: 'scalar-function', name: 'sin' })
  })

  it('retains surface origins on generated constructor operations', () => {
    const lowered = lowerExpression(parse(' vector(1, 2) '))

    expect(lowered.origin).toEqual({ start: 1, end: 13 })
    expect(lowered).toMatchObject({
      arguments: [{ origin: { start: 8, end: 9 } }, { origin: { start: 11, end: 12 } }],
    })
  })

  it('keeps blade names, permuted or not, for resolution against the active basis', () => {
    expect(lowerExpression(parse('e21'))).toEqual({
      kind: 'basis-blade',
      name: 'e21',
      origin: { start: 0, end: 3 },
    })
    expect(lowerExpression(parse('e012'))).toMatchObject({ kind: 'basis-blade', name: 'e012' })
    expect(lowerExpression(parse('V.e21'))).toMatchObject({ kind: 'coefficient', blade: 'e21' })
    expect(lowerExpression(parse('V.g3'))).toMatchObject({ kind: 'grade', grade: 3 })
  })
})
