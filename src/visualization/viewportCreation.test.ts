import { describe, expect, it } from 'vitest'
import {
  formatViewportCoordinate,
  nextObjectName,
  vectorCreationSource,
} from './viewportCreation'
import { MAX_PIXELS_PER_UNIT, MIN_PIXELS_PER_UNIT } from './viewport'

describe('viewport vector creation', () => {
  it('names created objects A to Z, then A1 to Z1, skipping declared names', () => {
    expect(nextObjectName([])).toBe('A')
    expect(nextObjectName([
      'A = point(1, 2)',
      '  B = vector(3, 0)',
      'Cvalue = 2',
      'c = 3',
      'vector(1, 1)',
    ])).toBe('C')
    const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
    expect(nextObjectName(alphabet.map((letter) => `${letter} = 1`))).toBe('A1')
    expect(nextObjectName([
      ...alphabet.map((letter) => `${letter} = 1`),
      'A1 = 1',
      'B1 = 1',
    ])).toBe('C1')
    expect(nextObjectName([
      ...alphabet.map((letter) => `${letter} = 1`),
      ...alphabet.map((letter) => `${letter}1 = 1`),
    ])).toBe('A2')
  })

  it('formats coordinates at zoom-aware precision without negative zero', () => {
    expect(formatViewportCoordinate(1 / 3, 72)).toBe('0.333')
    expect(formatViewportCoordinate(-0.0001, 72)).toBe('0')
    expect(formatViewportCoordinate(1 / 3, 512)).toBe('0.3333')
    expect(formatViewportCoordinate(1 / 3, MIN_PIXELS_PER_UNIT)).toBe('0')
    expect(formatViewportCoordinate(1 / 3, MAX_PIXELS_PER_UNIT)).toBe('0.3333333')
    expect(formatViewportCoordinate(1e-7, MAX_PIXELS_PER_UNIT)).toBe('1E-7')
  })

  it('builds documented VGA vector source', () => {
    expect(vectorCreationSource('V4', { x: 1.25, y: -2.5 }, 72))
      .toBe('V4 = vector(1.25, -2.5)')
  })
})
