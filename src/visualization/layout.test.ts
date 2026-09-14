import { describe, expect, it } from 'vitest'
import { layoutIdealArrow, layoutIdealMarker, layoutLineAtInfinity, layoutUnboundedLine } from './layout'
import type { Viewport2d } from './viewport'

const viewport: Viewport2d = { width: 800, height: 600, centerX: 0, centerY: 0, pixelsPerUnit: 50 }

describe('PGA primitive layouts', () => {
  it('clips an unbounded line to the viewport edges', () => {
    const horizontal = layoutUnboundedLine(
      { kind: 'unbounded-line', point: { x: 0, y: 2 }, direction: { x: 1, y: 0 }, normal: { x: 0, y: 1 }, scale: 1, accessibleName: 'L' },
      viewport,
    )
    expect(horizontal).not.toBeNull()
    expect([horizontal!.start.x, horizontal!.end.x].sort((a, b) => a - b)).toEqual([0, 800])
    expect(horizontal!.start.y).toBeCloseTo(200, 10)
    expect(horizontal!.foot).toEqual({ x: 400, y: 200 })
    const diagonal = layoutUnboundedLine(
      { kind: 'unbounded-line', point: { x: 0, y: 0 }, direction: { x: Math.SQRT1_2, y: Math.SQRT1_2 }, normal: { x: -Math.SQRT1_2, y: Math.SQRT1_2 }, scale: 1, accessibleName: 'D' },
      viewport,
    )
    expect(diagonal!.start.y).toBeCloseTo(600, 10)
    expect(diagonal!.end.y).toBeCloseTo(0, 10)
  })

  it('returns null for a line outside the viewport', () => {
    const far = layoutUnboundedLine(
      { kind: 'unbounded-line', point: { x: 0, y: 100 }, direction: { x: 1, y: 0 }, normal: { x: 0, y: 1 }, scale: 1, accessibleName: 'F' },
      viewport,
    )
    expect(far).toBeNull()
  })

  it('draws the line at infinity as the inscribed ellipse and puts ideal markers on it', () => {
    const infinity = layoutLineAtInfinity(viewport, 1)
    expect(infinity).toEqual({ center: { x: 400, y: 300 }, radiusX: 382, radiusY: 282 })
    const right = layoutIdealMarker({ x: 1, y: 0 }, viewport, 1)
    expect(right.tip).toEqual({ x: 782, y: 300 })
    expect(right.tail.x).toBeLessThan(right.tip.x)
    const up = layoutIdealMarker({ x: 0, y: 1 }, viewport, 1)
    expect(up.tip).toEqual({ x: 400, y: 18 })
    expect(up.angle).toBeCloseTo(-Math.PI / 2, 10)
    const diagonal = layoutIdealMarker({ x: Math.SQRT1_2, y: Math.SQRT1_2 }, viewport, 1)
    const onEllipse = ((diagonal.tip.x - 400) / 382) ** 2 + ((diagonal.tip.y - 300) / 282) ** 2
    expect(onEllipse).toBeCloseTo(1, 10)
    const square = layoutLineAtInfinity({ ...viewport, width: 600 }, 1)
    expect(square.radiusX).toBe(square.radiusY)
  })

  it('lays out a positioned ideal point as an arrow from its position', () => {
    const arrow = layoutIdealArrow(
      { kind: 'ideal-point', position: { x: 1, y: 1 }, direction: { x: 0, y: 1 }, magnitude: 2, accessibleName: 'D' },
      viewport, 1,
    )
    expect(arrow.start).toEqual({ x: 450, y: 250 })
    expect(arrow.end).toEqual({ x: 450, y: 150 })
    expect(arrow.arrowPoints).not.toBeNull()
  })
})
