import { describe, expect, it } from 'vitest'
import { toScreen } from './viewport'

describe('2D viewport transform', () => {
  it('maps mathematical coordinates using a centered, upward-positive frame', () => {
    const viewport = {
      width: 640,
      height: 480,
      centerX: 0,
      centerY: 0,
      pixelsPerUnit: 72,
    }

    expect(toScreen(viewport, { x: 0, y: 0 })).toEqual({ x: 320, y: 240 })
    expect(toScreen(viewport, { x: 2, y: 1 })).toEqual({ x: 464, y: 168 })
  })
})
