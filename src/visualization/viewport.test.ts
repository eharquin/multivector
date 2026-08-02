import { describe, expect, it } from 'vitest'
import {
  adaptiveGrid,
  MAX_GRID_LINES,
  MAX_PIXELS_PER_UNIT,
  MIN_PIXELS_PER_UNIT,
  panByScreen,
  toMathematical,
  toScreen,
  zoomAt,
} from './viewport'

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

  it('round-trips screen and mathematical coordinates', () => {
    const viewport = { width: 997, height: 613, centerX: -4.25, centerY: 8.5, pixelsPerUnit: 37 }
    const point = { x: 12.125, y: -0.75 }
    expect(toMathematical(viewport, toScreen(viewport, point))).toEqual(point)
  })

  it('keeps the cursor anchor fixed and clamps continuous zoom', () => {
    const viewport = { width: 640, height: 480, centerX: 2, centerY: -3, pixelsPerUnit: 72 }
    const cursor = { x: 123, y: 321 }
    const anchor = toMathematical(viewport, cursor)
    const zoomed = zoomAt(viewport, cursor, 144)
    expect(toMathematical(zoomed, cursor)).toEqual(anchor)
    expect(zoomAt(viewport, cursor, 0).pixelsPerUnit).toBe(MIN_PIXELS_PER_UNIT)
    expect(zoomAt(viewport, cursor, 1e9).pixelsPerUnit).toBe(MAX_PIXELS_PER_UNIT)
  })

  it('pans in screen space without changing scale', () => {
    const viewport = { width: 640, height: 480, centerX: 0, centerY: 0, pixelsPerUnit: 50 }
    expect(panByScreen(viewport, { x: 100, y: -50 })).toEqual({
      ...viewport, centerX: -2, centerY: -1,
    })
  })

  it('uses a bounded 1–2–5 adaptive grid at extreme zoom levels', () => {
    for (const pixelsPerUnit of [MIN_PIXELS_PER_UNIT, 72, MAX_PIXELS_PER_UNIT]) {
      const grid = adaptiveGrid({ width: 1920, height: 1080, centerX: 1e6, centerY: -1e6, pixelsPerUnit })
      const normalized = grid.majorStep / 10 ** Math.floor(Math.log10(grid.majorStep))
      expect([1, 2, 5, 10]).toContain(normalized)
      expect(grid.vertical.length).toBeLessThanOrEqual(MAX_GRID_LINES)
      expect(grid.horizontal.length).toBeLessThanOrEqual(MAX_GRID_LINES)
      expect(grid.vertical.every(({ screen }) => Number.isFinite(screen))).toBe(true)
    }
  })
})
