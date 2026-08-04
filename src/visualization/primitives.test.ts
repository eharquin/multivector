import { describe, expect, it } from 'vitest'
import {
  bivectorToPrimitive,
  limitRenderedListElements,
  vectorToPrimitive,
} from './primitives'

describe('vector primitive adapter', () => {
  it('preserves the first 1,000 list elements and reports exact truncation', () => {
    const result = limitRenderedListElements(
      Array.from({ length: 1_003 }, (_, index) => index),
    )

    expect(result.visible).toHaveLength(1_000)
    expect(result.visible[0]).toBe(0)
    expect(result.visible[999]).toBe(999)
    expect(result.omitted).toBe(3)
  })
  it('creates an oriented segment without algebra identifiers or coefficients', () => {
    const primitive = vectorToPrimitive({ kind: 'vector-2d', x: 2, y: 1, approximated: false })

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
        { kind: 'vector-2d', x: 2, y: 1, approximated: false },
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

describe('bivector primitive adapter', () => {
  it('uses area magnitude and non-color orientation for generic loops', () => {
    const positive = bivectorToPrimitive(
      { kind: 'bivector-2d', value: 4, approximated: false },
      'B',
      { x: 2, y: -1 },
    )
    const negative = bivectorToPrimitive(
      { kind: 'bivector-2d', value: -4, approximated: false },
      'C',
      { x: 2, y: -1 },
    )

    expect(positive).toMatchObject({
      kind: 'oriented-area',
      area: 4,
      orientation: 'counterclockwise',
      shape: { kind: 'loop', center: { x: 2, y: -1 } },
    })
    expect(negative).toMatchObject({
      area: 4,
      orientation: 'clockwise',
      shape: { kind: 'loop', center: { x: 2, y: -1 } },
    })
    expect(positive.accessibleDescription).toContain('signed value 4')
    expect(negative.accessibleDescription).toContain('clockwise orientation')
    expect(positive).not.toHaveProperty('algebraId')
    expect(positive).not.toHaveProperty('coefficients')
  })

  it('uses a direct outer-product construction when its area is consistent', () => {
    const primitive = bivectorToPrimitive(
      { kind: 'bivector-2d', value: 5, approximated: false },
      'area',
      { x: -1, y: 2 },
      [
        { kind: 'vector-2d', x: 2, y: 1, approximated: false },
        { kind: 'vector-2d', x: 1, y: 3, approximated: false },
      ],
    )

    expect(primitive).toMatchObject({
      area: 5,
      orientation: 'counterclockwise',
      shape: {
        kind: 'parallelogram',
        vertices: [
          { x: -1, y: 2 },
          { x: 1, y: 3 },
          { x: 2, y: 6 },
          { x: 0, y: 5 },
        ],
      },
    })
  })

  it('falls back to the same-area loop for inconsistent provenance', () => {
    const primitive = bivectorToPrimitive(
      { kind: 'bivector-2d', value: 5, approximated: false },
      'area',
      { x: 0, y: 0 },
      [
        { kind: 'vector-2d', x: 1, y: 0, approximated: false },
        { kind: 'vector-2d', x: 0, y: 1, approximated: false },
      ],
    )

    expect(primitive.shape).toMatchObject({ kind: 'loop' })
    if (primitive.shape.kind !== 'loop') throw new Error('Expected loop')
    expect(Math.PI * primitive.shape.radius ** 2).toBeCloseTo(5)
  })
})
