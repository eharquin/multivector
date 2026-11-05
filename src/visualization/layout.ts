import type { EvaluatedDocumentItem } from '../application/evaluateDocument'
import type { ExpressionAppearance, PointListDisplay } from '../document/expressionDocument'
import { resolveItemAppearance } from '../components/appearancePalette'
import type { AnyInterpretation, InterpretedEntity } from '../geometry/interpretation'
import type { Point2d } from '../geometry/interpretation'
import {
  limitRenderedListElements,
  type IdealPointPrimitive,
  type OrientedAreaPrimitive,
  type OrientedSegmentPrimitive,
  type UnboundedLinePrimitive,
  type VisualizationPrimitive,
} from './primitives'
import { toScreen, type Viewport2d } from './viewport'

/** One primitive selected for rendering, with its resolved appearance. */
export type RenderedPrimitive = Readonly<{
  id: string
  entity: InterpretedEntity
  primitive: VisualizationPrimitive
  color: string
  label: string | null
  borderVisible: boolean
  orientationVisible: boolean
  bivectorShape: 'from-vectors' | 'disk' | 'square'
  idealPointDisplay: 'vector' | 'ideal' | 'both'
  /** False only for the finite and ideal points of a connected list drawn as links alone. */
  markerVisible: boolean
}>

/**
 * One vertex of a connected point list: a finite point, or an ideal point
 * (a direction at infinity) given by its unit direction.
 */
export type PointListVertex =
  | Readonly<{ kind: 'finite'; point: Point2d }>
  | Readonly<{ kind: 'ideal'; direction: Point2d }>

/**
 * The join of two consecutive vertices: a segment between two finite points,
 * or the ray from a finite point towards an ideal point's direction. Two ideal
 * points join along the line at infinity and draw nothing.
 */
export type PointListLink =
  | Readonly<{ kind: 'segment'; start: Point2d; end: Point2d }>
  | Readonly<{ kind: 'ray'; origin: Point2d; direction: Point2d }>

/** The links joining the points of one list item, in list order. */
export type RenderedPointListConnection = Readonly<{
  id: string
  color: string
  segments: readonly PointListLink[]
}>

const finitePoint = (point: Point2d) => Number.isFinite(point.x) && Number.isFinite(point.y)

/**
 * The vertices of a list whose elements are all finite or ideal points, in
 * evaluated list order, or `null` when the list is empty, holds no finite
 * point, or holds any other entity. Only such lists offer connected displays.
 */
export function pointListVertices(
  elements: readonly Readonly<{ primitive: VisualizationPrimitive | null }>[],
): readonly PointListVertex[] | null {
  const vertices: PointListVertex[] = []
  for (const { primitive } of elements) {
    if (primitive?.kind === 'point-marker' && finitePoint(primitive.point))
      vertices.push({ kind: 'finite', point: primitive.point })
    else if (primitive?.kind === 'ideal-point' && finitePoint(primitive.direction))
      vertices.push({ kind: 'ideal', direction: primitive.direction })
    else return null
  }
  return vertices.some((vertex) => vertex.kind === 'finite') ? vertices : null
}

function joinVertices(from: PointListVertex, to: PointListVertex): PointListLink | null {
  if (from.kind === 'finite' && to.kind === 'finite')
    return { kind: 'segment', start: from.point, end: to.point }
  if (from.kind === 'finite' && to.kind === 'ideal')
    return { kind: 'ray', origin: from.point, direction: to.direction }
  if (from.kind === 'ideal' && to.kind === 'finite')
    return { kind: 'ray', origin: to.point, direction: from.direction }
  return null
}

/**
 * Joins consecutive vertices: `n - 1` links for an open polyline, plus the
 * last-to-first link for a closed loop of at least three points, so that
 * two points never draw the same link twice. A finite point and an ideal
 * point join as the ray from the finite point in the ideal direction; two
 * ideal points draw nothing. Repeated finite points give zero-length
 * segments, which remain valid geometry.
 */
export function pointListSegments(
  vertices: readonly PointListVertex[],
  display: PointListDisplay,
): readonly PointListLink[] {
  if (display === 'none') return []
  const pairs = vertices.slice(1).map((end, index) => [vertices[index], end] as const)
  if (display === 'closed-loop' && vertices.length >= 3)
    pairs.push([vertices[vertices.length - 1], vertices[0]])
  return pairs.flatMap(([from, to]) => {
    const link = joinVertices(from, to)
    return link ? [link] : []
  })
}

/**
 * The screen point where a ray from `origin` (screen space) along the screen
 * direction `(dx, dy)` leaves the viewport, or `null` when the ray misses it.
 */
function rayExit(
  origin: Point2d,
  dx: number,
  dy: number,
  viewport: Viewport2d,
): Readonly<{ start: Point2d; end: Point2d }> | null {
  let tMin = 0
  let tMax = Infinity
  for (const [p, q] of [
    [-dx, origin.x], [dx, viewport.width - origin.x],
    [-dy, origin.y], [dy, viewport.height - origin.y],
  ]) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const t = q / p
    if (p < 0) tMin = Math.max(tMin, t)
    else tMax = Math.min(tMax, t)
  }
  if (!Number.isFinite(tMax) || tMin > tMax) return null
  return {
    start: { x: origin.x + tMin * dx, y: origin.y + tMin * dy },
    end: { x: origin.x + tMax * dx, y: origin.y + tMax * dy },
  }
}

/**
 * Screen-space path drawing every link of a point-list connection; rays are
 * clipped to the viewport and omitted when they do not cross it.
 */
export function layoutPointListConnection(
  segments: RenderedPointListConnection['segments'],
  viewport: Viewport2d,
): string {
  return segments.flatMap((link) => {
    if (link.kind === 'segment') {
      const from = toScreen(viewport, link.start)
      const to = toScreen(viewport, link.end)
      return [`M ${from.x} ${from.y} L ${to.x} ${to.y}`]
    }
    const origin = toScreen(viewport, link.origin)
    const along = toScreen(viewport, {
      x: link.origin.x + link.direction.x,
      y: link.origin.y + link.direction.y,
    })
    const clipped = rayExit(origin, along.x - origin.x, along.y - origin.y, viewport)
    return clipped
      ? [`M ${clipped.start.x} ${clipped.start.y} L ${clipped.end.x} ${clipped.end.y}`]
      : []
  }).join(' ')
}

/**
 * Selects the visible primitives of every valid item in document order,
 * applying appearance, label, and list-truncation rules. List elements get
 * composite identifiers `itemId:elementId`. Connected point lists also yield
 * their segments, joining only the rendered prefix of a truncated list, and
 * may hide their markers to show the segments alone.
 */
export function collectRenderedPrimitives(
  evaluatedItems: readonly EvaluatedDocumentItem[],
  appearance: Readonly<Record<string, ExpressionAppearance | undefined>>,
  interpretation: AnyInterpretation,
  declaredName: (source: string) => string | null,
): Readonly<{
  rendered: readonly RenderedPrimitive[]
  connections: readonly RenderedPointListConnection[]
  omitted: number
}> {
  const connections: RenderedPointListConnection[] = []
  const rendered = evaluatedItems.flatMap((evaluated): RenderedPrimitive[] => {
    if (evaluated.evaluation?.status !== 'valid') return []
    const kind = evaluated.evaluation.valueType === 'list'
      ? `List (${evaluated.evaluation.value.elements.length})`
      : interpretation.describe(evaluated.evaluation.entity)
    const { visible, color, labelVisible, displayLabel, borderVisible, orientationVisible, bivectorShape, idealPointDisplay, pointListDisplay, pointMarkersVisible } = resolveItemAppearance(
      appearance[evaluated.item.id],
      kind,
      declaredName(evaluated.item.source),
    )
    if (!visible) return []
    const baseLabel = displayLabel
    if (evaluated.evaluation.valueType === 'list') {
      const elements = limitRenderedListElements(
        evaluated.evaluation.elements.filter((element) => element.primitive),
      ).visible
      // Eligibility is decided on the whole list, so that a mixed list whose
      // other entities have no primitive is never connected.
      const vertices = pointListDisplay === 'none'
        ? null
        : pointListVertices(evaluated.evaluation.elements)
      const segments = vertices
        ? pointListSegments(vertices.slice(0, elements.length), pointListDisplay)
        : []
      if (segments.length > 0) connections.push({ id: evaluated.item.id, color, segments })
      const markerVisible = vertices === null || pointMarkersVisible
      return elements.flatMap((element, elementIndex) => element.primitive
        ? [{
            id: `${evaluated.item.id}:${element.id}`,
            entity: element.entity,
            primitive: element.primitive,
            color,
            borderVisible,
            orientationVisible,
            bivectorShape,
            idealPointDisplay,
            markerVisible,
            label: labelVisible ? (baseLabel ? `${baseLabel}[${elementIndex}]` : element.primitive.accessibleName) : null,
          }]
        : [])
    }
    return evaluated.evaluation.primitive
      ? [{
          id: evaluated.item.id,
          entity: evaluated.evaluation.entity,
          primitive: evaluated.evaluation.primitive,
          color,
          borderVisible,
          orientationVisible,
          bivectorShape,
          idealPointDisplay,
          markerVisible: true,
          label: labelVisible ? (baseLabel ?? evaluated.evaluation.primitive.accessibleName) : null,
        }]
      : []
  })
  const omitted = evaluatedItems.reduce((total, evaluated) => {
    if (evaluated.evaluation?.status !== 'valid' ||
        evaluated.evaluation.valueType !== 'list') return total
    return total + limitRenderedListElements(
      evaluated.evaluation.elements.filter((element) => element.primitive),
    ).omitted
  }, 0)
  return { rendered, connections, omitted }
}

export type SegmentLayout = Readonly<{
  start: Point2d
  end: Point2d
  shaftEnd: Point2d
  arrowPoints: string | null
}>

/** Screen-space geometry of an oriented segment: shaft inset and arrowhead. */
export function layoutOrientedSegment(
  primitive: OrientedSegmentPrimitive,
  viewport: Viewport2d,
  objectRenderScale: number,
): SegmentLayout {
  const start = toScreen(viewport, primitive.start)
  const end = toScreen(viewport, primitive.end)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  const angle = Math.atan2(dy, dx)
  const headLength = Math.min(14 * objectRenderScale, length * 0.35)
  const headAngle = Math.PI / 6
  const arrowVisible = length > 8
  const shaftInset = arrowVisible ? headLength * Math.cos(headAngle) : 0
  const shaftEnd = length > 0
    ? { x: end.x - shaftInset * dx / length, y: end.y - shaftInset * dy / length }
    : end
  return {
    start,
    end,
    shaftEnd,
    arrowPoints: arrowVisible ? [
      `${end.x},${end.y}`,
      `${end.x - headLength * Math.cos(angle - headAngle)},${
        end.y - headLength * Math.sin(angle - headAngle)}`,
      `${end.x - headLength * Math.cos(angle + headAngle)},${
        end.y - headLength * Math.sin(angle + headAngle)}`,
    ].join(' ') : null,
  }
}

export type AreaLayout = Readonly<{
  path: string
  labelPoint: Point2d
  orientationCenter: Point2d
  base: Point2d
}>

/** Screen-space geometry of an oriented area under the selected shape. */
export function layoutOrientedArea(
  primitive: OrientedAreaPrimitive,
  viewport: Viewport2d,
  bivectorShape: RenderedPrimitive['bivectorShape'],
): AreaLayout {
  const mathematicalBase = primitive.shape.kind === 'loop'
    ? primitive.shape.center
    : primitive.shape.vertices[0]
  const base = toScreen(viewport, mathematicalBase)
  if (bivectorShape === 'from-vectors' && primitive.shape.kind === 'parallelogram') {
    const points = primitive.shape.vertices.map((point) => toScreen(viewport, point))
    return {
      base,
      orientationCenter: {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      },
      path: `${points.map((point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`,
      labelPoint: points[2],
    }
  }
  const center = base
  if (bivectorShape === 'square') {
    const side = Math.sqrt(primitive.area) * viewport.pixelsPerUnit
    const half = side / 2
    return {
      base,
      orientationCenter: center,
      path: `M ${center.x - half} ${center.y - half} H ${center.x + half} V ${center.y + half} H ${center.x - half} Z`,
      labelPoint: { x: center.x + half, y: center.y - half },
    }
  }
  const radius = Math.sqrt(primitive.area / Math.PI) * viewport.pixelsPerUnit
  const sweep = primitive.orientation === 'counterclockwise' ? 1 : 0
  return {
    base,
    orientationCenter: center,
    path: `M ${center.x + radius} ${center.y} ` +
      `A ${radius} ${radius} 0 1 ${sweep} ${center.x - radius} ${center.y} ` +
      `A ${radius} ${radius} 0 1 ${sweep} ${center.x + radius} ${center.y} Z`,
    labelPoint: { x: center.x + radius, y: center.y - radius },
  }
}

export type LineLayout = Readonly<{
  /** The clipped segment in screen space, or `null` when the line misses the viewport. */
  start: Point2d
  end: Point2d
  labelPoint: Point2d
  /** The foot of the perpendicular from the origin, where the handle would sit. */
  foot: Point2d
}> | null

/** Clips an unbounded line to the viewport rectangle (Liang–Barsky on the screen segment). */
export function layoutUnboundedLine(
  primitive: UnboundedLinePrimitive,
  viewport: Viewport2d,
): LineLayout {
  const foot = toScreen(viewport, primitive.point)
  const along = toScreen(viewport, {
    x: primitive.point.x + primitive.direction.x,
    y: primitive.point.y + primitive.direction.y,
  })
  const dx = along.x - foot.x
  const dy = along.y - foot.y
  let tMin = -Infinity
  let tMax = Infinity
  for (const [p, q] of [
    [-dx, foot.x], [dx, viewport.width - foot.x],
    [-dy, foot.y], [dy, viewport.height - foot.y],
  ]) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const t = q / p
    if (p < 0) tMin = Math.max(tMin, t)
    else tMax = Math.min(tMax, t)
  }
  if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMin > tMax) return null
  const start = { x: foot.x + tMin * dx, y: foot.y + tMin * dy }
  const end = { x: foot.x + tMax * dx, y: foot.y + tMax * dy }
  return {
    start,
    end,
    labelPoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    foot,
  }
}

export type InfinityLayout = Readonly<{ center: Point2d; radiusX: number; radiusY: number }>

/**
 * The line at infinity drawn as the ellipse inscribed in the viewport, inset
 * so that markers on it stay fully visible; a square viewport gives a circle.
 */
export function layoutLineAtInfinity(viewport: Viewport2d, objectRenderScale: number): InfinityLayout {
  const inset = 18 * objectRenderScale
  return {
    center: { x: viewport.width / 2, y: viewport.height / 2 },
    radiusX: Math.max(1, viewport.width / 2 - inset),
    radiusY: Math.max(1, viewport.height / 2 - inset),
  }
}

export type DirectionLayout = Readonly<{
  /** Where the direction meets the line at infinity, on the ellipse. */
  tip: Point2d
  tail: Point2d
  angle: number
}>

/** Places an ideal point's marker on the line at infinity, pointing outward from the center. */
export function layoutIdealMarker(
  direction: Point2d,
  viewport: Viewport2d,
  objectRenderScale: number,
): DirectionLayout {
  const { center, radiusX, radiusY } = layoutLineAtInfinity(viewport, objectRenderScale)
  // Screen y grows downward while the mathematical y grows upward.
  const dx = direction.x
  const dy = -direction.y
  const t = 1 / Math.sqrt((dx / radiusX) ** 2 + (dy / radiusY) ** 2)
  const tip = { x: center.x + dx * t, y: center.y + dy * t }
  const length = 22 * objectRenderScale
  return {
    tip,
    tail: { x: tip.x - dx * length, y: tip.y - dy * length },
    angle: Math.atan2(dy, dx),
  }
}

/** The arrow of a positioned ideal point, laid out like an oriented segment. */
export function layoutIdealArrow(
  primitive: IdealPointPrimitive,
  viewport: Viewport2d,
  objectRenderScale: number,
): SegmentLayout {
  return layoutOrientedSegment({
    kind: 'oriented-segment',
    start: primitive.position,
    end: {
      x: primitive.position.x + primitive.direction.x * primitive.magnitude,
      y: primitive.position.y + primitive.direction.y * primitive.magnitude,
    },
    accessibleName: primitive.accessibleName,
  }, viewport, objectRenderScale)
}

/** Short ticks on the positive side of a clipped line, every `spacing` screen pixels. */
export function lineOrientationTicks(
  primitive: UnboundedLinePrimitive,
  layout: NonNullable<LineLayout>,
  objectRenderScale: number,
  spacing = 48,
): string {
  const dx = layout.end.x - layout.start.x
  const dy = layout.end.y - layout.start.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return ''
  // The positive side is the normal's side; screen y is flipped.
  const nx = primitive.normal.x
  const ny = -primitive.normal.y
  const tick = 6 * objectRenderScale
  // Ticks are spaced from the foot of the perpendicular from the origin, a
  // point of the line itself, so they stay put while the clipped segment
  // changes with the viewport or with the line's motion.
  const footAlong = ((layout.foot.x - layout.start.x) * dx + (layout.foot.y - layout.start.y) * dy) / length
  const ux = dx / length
  const uy = dy / length
  const ticks: string[] = []
  for (let index = Math.ceil(-footAlong / spacing); footAlong + index * spacing <= length; index += 1) {
    const along = index * spacing
    const x = layout.foot.x + ux * along
    const y = layout.foot.y + uy * along
    ticks.push(`M ${x} ${y} L ${x + nx * tick} ${y + ny * tick}`)
  }
  return ticks.join(' ')
}

/** The normal handle's length in mathematical units at the current zoom. */
export function lineNormalLength(viewport: Viewport2d, objectRenderScale: number): number {
  return LINE_NORMAL_LENGTH * objectRenderScale / viewport.pixelsPerUnit
}

export type LineSelectionLayout = Readonly<{
  anchor: Point2d
  mathematicalAnchor: Point2d
  normalTip: Point2d
  arrowPoints: string
}>

/** Screen length of the normal handle drawn on a selected line, before the object scale. */
export const LINE_NORMAL_LENGTH = 56

/**
 * Projects a point onto the line, then lays out the normal handle drawn from
 * that anchor. The handle has a fixed screen length whatever the zoom: it is
 * a rotation helper, not a vector of the document.
 */
export function layoutLineSelection(
  primitive: UnboundedLinePrimitive,
  near: Point2d,
  viewport: Viewport2d,
  objectRenderScale: number,
): LineSelectionLayout {
  const along = (near.x - primitive.point.x) * primitive.direction.x +
    (near.y - primitive.point.y) * primitive.direction.y
  const mathematicalAnchor = {
    x: primitive.point.x + primitive.direction.x * along,
    y: primitive.point.y + primitive.direction.y * along,
  }
  const length = lineNormalLength(viewport, objectRenderScale)
  const segment = layoutOrientedSegment({
    kind: 'oriented-segment',
    start: mathematicalAnchor,
    end: {
      x: mathematicalAnchor.x + primitive.normal.x * length,
      y: mathematicalAnchor.y + primitive.normal.y * length,
    },
    accessibleName: primitive.accessibleName,
  }, viewport, objectRenderScale)
  return {
    anchor: segment.start,
    mathematicalAnchor,
    normalTip: segment.end,
    arrowPoints: segment.arrowPoints ?? '',
  }
}
