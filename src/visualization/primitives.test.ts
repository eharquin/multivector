import { describe, expect, it } from 'vitest'
import { vectorToPrimitive } from './primitives'

describe('vector primitive adapter', () => {
  it('creates an oriented segment without algebra identifiers or coefficients', () => {
    const primitive = vectorToPrimitive({ kind: 'vector-2d', x: 2, y: 1 })

    expect(primitive).toEqual({
      kind: 'oriented-segment',
      start: { x: 0, y: 0 },
      end: { x: 2, y: 1 },
      accessibleName: 'Vector 1',
    })
    expect(primitive).not.toHaveProperty('algebraId')
    expect(primitive).not.toHaveProperty('coefficients')
  })

  it('translates both endpoints without changing the vector entity', () => {
    expect(
      vectorToPrimitive(
        { kind: 'vector-2d', x: 2, y: 1 },
        'V',
        { x: -1, y: 2 },
      ),
    ).toMatchObject({
      start: { x: -1, y: 2 },
      end: { x: 1, y: 3 },
      accessibleName: 'V',
    })
  })
})
