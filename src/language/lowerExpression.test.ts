import { describe, expect, it } from 'vitest'
import { lowerExpression } from './lowerExpression'
import { parseExpression } from './parseExpression'

function parse(source: string) {
  const parsed = parseExpression(source)
  if (!parsed.ok) throw new Error(parsed.diagnostic.message)
  return parsed.expression
}

describe('surface-to-core lowering', () => {
  it('lowers vector construction to scalar-blade products and addition', () => {
    expect(lowerExpression(parse('vector(1, 2)'))).toMatchObject({
      kind: 'add',
      left: {
        kind: 'multiply',
        left: { kind: 'scalar', value: 1 },
        right: { kind: 'basis-blade', name: 'e1' },
      },
      right: {
        kind: 'multiply',
        left: { kind: 'scalar', value: 2 },
        right: { kind: 'basis-blade', name: 'e2' },
      },
    })
  })

  it('retains surface origins on generated constructor operations', () => {
    const lowered = lowerExpression(parse(' vector(1, 2) '))

    expect(lowered.origin).toEqual({ start: 1, end: 13 })
    expect(lowered).toMatchObject({
      left: { origin: { start: 1, end: 13 } },
      right: { origin: { start: 1, end: 13 } },
    })
  })

  it('lowers permuted blades to ordered generator products', () => {
    expect(lowerExpression(parse('e21'))).toEqual({
      kind: 'multiply',
      left: {
        kind: 'basis-blade',
        name: 'e2',
        origin: { start: 0, end: 3 },
      },
      right: {
        kind: 'basis-blade',
        name: 'e1',
        origin: { start: 0, end: 3 },
      },
      origin: { start: 0, end: 3 },
    })
  })
})
