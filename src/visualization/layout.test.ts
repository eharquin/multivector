import { describe, expect, it } from 'vitest'
import { layoutDirectionMarker, layoutUnboundedLine } from './layout'
import type { Viewport2d } from './viewport'

const viewport: Viewport2d = { width: 800, height: 600, centerX: 0, centerY: 0, pixelsPerUnit: 50 }

describe('PGA primitive layouts', () => {
  it('clips an unbounded line to the viewport edges', () => {
    const horizontal = layoutUnboundedLine(
      { kind: 'unbounded-line', point: { x: 0, y: 2 }, direction: { x: 1, y: 0 }, accessibleName: 'L' },
      viewport,
    )
    expect(horizontal).not.toBeNull()
    expect([horizontal!.start.x, horizontal!.end.x].sort((a, b) => a - b)).toEqual([0, 800])
    expect(horizontal!.start.y).toBeCloseTo(200, 10)
    expect(horizontal!.foot).toEqual({ x: 400, y: 200 })
    const diagonal = layoutUnboundedLine(
      { kind: 'unbounded-line', point: { x: 0, y: 0 }, direction: { x: Math.SQRT1_2, y: Math.SQRT1_2 }, accessibleName: 'D' },
      viewport,
    )
    expect(diagonal!.start.y).toBeCloseTo(600, 10)
    expect(diagonal!.end.y).toBeCloseTo(0, 10)
  })

  it('returns null for a line outside the viewport', () => {
    const far = layoutUnboundedLine(
      { kind: 'unbounded-line', point: { x: 0, y: 100 }, direction: { x: 1, y: 0 }, accessibleName: 'F' },
      viewport,
    )
    expect(far).toBeNull()
  })

  it('places a direction marker on the viewport edge pointing outward', () => {
    const right = layoutDirectionMarker(
      { kind: 'direction-marker', direction: { x: 1, y: 0 }, accessibleName: 'E' }, viewport, 1,
    )
    expect(right.tip).toEqual({ x: 782, y: 300 })
    expect(right.tail.x).toBeLessThan(right.tip.x)
    const up = layoutDirectionMarker(
      { kind: 'direction-marker', direction: { x: 0, y: 1 }, accessibleName: 'N' }, viewport, 1,
    )
    expect(up.tip).toEqual({ x: 400, y: 18 })
    expect(up.angle).toBeCloseTo(-Math.PI / 2, 10)
  })
})
