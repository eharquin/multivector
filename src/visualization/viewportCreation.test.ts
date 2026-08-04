import { describe, expect, it } from 'vitest'
import {
  formatViewportCoordinate,
  nextVectorName,
  vectorCreationSource,
} from './viewportCreation'

describe('viewport vector creation', () => {
  it('chooses the first collision-free generated declaration name', () => {
    expect(nextVectorName([
      'V1 = e1',
      '  V3 = vector(3, 0)',
      'V2value = 2',
      'vector(1, 1)',
    ])).toBe('V2')
  })

  it('formats coordinates at zoom-aware precision without negative zero', () => {
    expect(formatViewportCoordinate(1 / 3, 72)).toBe('0.333')
    expect(formatViewportCoordinate(-0.0001, 72)).toBe('0')
    expect(formatViewportCoordinate(1 / 3, 512)).toBe('0.3333')
    expect(formatViewportCoordinate(1 / 3, 1e12)).toBe('0.33333333')
    expect(formatViewportCoordinate(1e-8, 1e12)).toBe('1E-8')
  })

  it('builds documented VGA vector source', () => {
    expect(vectorCreationSource('V4', { x: 1.25, y: -2.5 }, 72))
      .toBe('V4 = vector(1.25, -2.5)')
  })
})
