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
})
