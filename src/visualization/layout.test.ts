import { describe, expect, it } from 'vitest'
import { layoutIdealArrow, layoutIdealMarker, layoutLineAtInfinity, layoutLineSelection, layoutPointListConnection, layoutUnboundedLine, lineOrientationTicks, pointListSegments, pointListVertices } from './layout'
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

  it('spaces the orientation ticks from the foot of the line, independently of the clipping', () => {
    const primitive = { kind: 'unbounded-line', point: { x: 1, y: 2 }, direction: { x: 1, y: 0 }, normal: { x: 0, y: 1 }, scale: 1, accessibleName: 'L' } as const
    const tickStarts = (view: Viewport2d) =>
      [...lineOrientationTicks(primitive, layoutUnboundedLine(primitive, view)!, 1).matchAll(/M ([-\d.]+) ([-\d.]+)/g)]
        .map(([, x, y]) => ({ x: Number(x), y: Number(y) }))
    const wide = tickStarts(viewport)
    // The foot (1, 2) sits at screen (450, 200) and carries a tick; the ticks point up, the positive side.
    expect(wide).toContainEqual({ x: 450, y: 200 })
    expect(wide.every((tick) => tick.y === 200 && (tick.x - 450) % 48 === 0)).toBe(true)
    expect(lineOrientationTicks(primitive, layoutUnboundedLine(primitive, viewport)!, 1)).toContain('M 450 200 L 450 194')
    // A narrower viewport clips the same line differently but keeps the ticks in place.
    const narrow = tickStarts({ ...viewport, width: 700 })
    expect(narrow).toContainEqual({ x: 400, y: 200 })
    expect(narrow.every((tick) => tick.y === 200 && (tick.x - 400) % 48 === 0)).toBe(true)
  })

  it('draws the normal handle with a fixed screen length whatever the zoom', () => {
    const primitive = { kind: 'unbounded-line', point: { x: 0, y: 0 }, direction: { x: 1, y: 0 }, normal: { x: 0, y: 1 }, scale: 3, accessibleName: 'L' } as const
    for (const pixelsPerUnit of [20, 50, 200]) {
      const selection = layoutLineSelection(primitive, { x: 2, y: 5 }, { ...viewport, pixelsPerUnit }, 1.5)
      expect(selection.mathematicalAnchor).toEqual({ x: 2, y: 0 })
      expect(selection.anchor).toEqual({ x: 400 + 2 * pixelsPerUnit, y: 300 })
      // Screen y is flipped: the handle points up, 56 × 1.5 pixels long.
      expect(selection.normalTip.x).toBeCloseTo(selection.anchor.x, 10)
      expect(selection.anchor.y - selection.normalTip.y).toBeCloseTo(84, 10)
    }
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

describe('point-list connections', () => {
  const marker = (x: number, y: number) => ({ primitive: { kind: 'point-marker', point: { x, y }, accessibleName: 'P' } as const })
  const ideal = (x: number, y: number) => ({
    primitive: { kind: 'ideal-point', position: { x: 0, y: 0 }, direction: { x, y }, magnitude: 1, accessibleName: 'V' } as const,
  })
  const finite = (x: number, y: number) => ({ kind: 'finite', point: { x, y } } as const)
  const toward = (x: number, y: number) => ({ kind: 'ideal', direction: { x, y } } as const)
  const segment = (a: readonly [number, number], b: readonly [number, number]) =>
    ({ kind: 'segment', start: { x: a[0], y: a[1] }, end: { x: b[0], y: b[1] } } as const)
  const ray = (origin: readonly [number, number], direction: readonly [number, number]) =>
    ({ kind: 'ray', origin: { x: origin[0], y: origin[1] }, direction: { x: direction[0], y: direction[1] } } as const)
  const square = [marker(0, 0), marker(1, 0), marker(1, 1), marker(0, 1)]

  it('accepts only lists of finite and ideal points holding a finite point', () => {
    expect(pointListVertices(square)).toEqual([finite(0, 0), finite(1, 0), finite(1, 1), finite(0, 1)])
    expect(pointListVertices([marker(2, 3)])).toEqual([finite(2, 3)])
    expect(pointListVertices([marker(0, 0), ideal(0, 1)])).toEqual([finite(0, 0), toward(0, 1)])
    expect(pointListVertices([])).toBeNull()
    expect(pointListVertices([ideal(0, 1), ideal(1, 0)])).toBeNull()
    expect(pointListVertices([marker(0, 0), { primitive: null }])).toBeNull()
    expect(pointListVertices([marker(0, 0), marker(Number.NaN, 1)])).toBeNull()
    expect(pointListVertices([marker(0, 0), marker(Number.POSITIVE_INFINITY, 1)])).toBeNull()
    expect(pointListVertices([marker(0, 0), {
      primitive: { kind: 'oriented-segment', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, accessibleName: 'V' },
    }])).toBeNull()
  })

  it('draws nothing without a connection', () => {
    expect(pointListSegments(pointListVertices(square)!, 'none')).toEqual([])
  })

  it('joins consecutive points in list order for an open polyline', () => {
    expect(pointListSegments(pointListVertices(square)!, 'open-polyline')).toEqual([
      segment([0, 0], [1, 0]), segment([1, 0], [1, 1]), segment([1, 1], [0, 1]),
    ])
  })

  it('closes a loop of at least three points back to the first', () => {
    const segments = pointListSegments(pointListVertices(square)!, 'closed-loop')
    expect(segments).toHaveLength(4)
    expect(segments[3]).toEqual(segment([0, 1], [0, 0]))
  })

  it('draws one segment for two points and none for zero or one', () => {
    const pair = [finite(0, 0), finite(2, 1)]
    expect(pointListSegments(pair, 'open-polyline')).toEqual([segment([0, 0], [2, 1])])
    expect(pointListSegments(pair, 'closed-loop')).toEqual([segment([0, 0], [2, 1])])
    for (const display of ['open-polyline', 'closed-loop'] as const) {
      expect(pointListSegments([], display)).toEqual([])
      expect(pointListSegments([finite(1, 1)], display)).toEqual([])
    }
  })

  it('joins a finite and an ideal point as the ray from the finite point', () => {
    // [e12, e01]: the vertical half-line leaving the origin upwards.
    expect(pointListSegments([finite(0, 0), toward(0, 1)], 'open-polyline')).toEqual([ray([0, 0], [0, 1])])
    // [A, V, B]: two parallel rays, and the segment B A once the loop closes.
    const avb = [finite(-1, 0), toward(0, 1), finite(1, 0)]
    expect(pointListSegments(avb, 'open-polyline')).toEqual([ray([-1, 0], [0, 1]), ray([1, 0], [0, 1])])
    expect(pointListSegments(avb, 'closed-loop')).toEqual([
      ray([-1, 0], [0, 1]), ray([1, 0], [0, 1]), segment([1, 0], [-1, 0]),
    ])
  })

  it('draws nothing between two consecutive ideal points', () => {
    expect(pointListSegments([finite(0, 0), toward(1, 0), toward(0, 1)], 'open-polyline'))
      .toEqual([ray([0, 0], [1, 0])])
  })

  it('keeps repeated points as finite zero-length segments', () => {
    const repeated = [finite(1, 1), finite(1, 1), finite(1, 1)]
    const segments = pointListSegments(repeated, 'closed-loop')
    expect(segments).toHaveLength(3)
    const path = layoutPointListConnection(segments, viewport)
    expect(path).toBe('M 450 250 L 450 250 M 450 250 L 450 250 M 450 250 L 450 250')
    expect(path).not.toMatch(/NaN|Infinity/)
  })

  it('lays the segments out in screen space', () => {
    const segments = pointListSegments([finite(0, 0), finite(2, 1)], 'open-polyline')
    expect(layoutPointListConnection(segments, viewport)).toBe('M 400 300 L 500 250')
    expect(layoutPointListConnection([], viewport)).toBe('')
  })

  it('clips a ray to the viewport edge in its direction', () => {
    expect(layoutPointListConnection([ray([0, 0], [0, 1])], viewport)).toBe('M 400 300 L 400 0')
    expect(layoutPointListConnection([ray([0, 0], [-1, 0])], viewport)).toBe('M 400 300 L 0 300')
    // A ray starting off screen enters the viewport where it crosses an edge.
    expect(layoutPointListConnection([ray([-10, 0], [1, 0])], viewport)).toBe('M 0 300 L 800 300')
    // A ray pointing away from the viewport draws nothing.
    expect(layoutPointListConnection([ray([-10, 0], [-1, 0])], viewport)).toBe('')
    // An axis-parallel ray beside the viewport never crosses it.
    expect(layoutPointListConnection([ray([0, 100], [1, 0])], viewport)).toBe('')
    expect(layoutPointListConnection([ray([-100, 0], [0, 1])], viewport)).toBe('')
  })
})
