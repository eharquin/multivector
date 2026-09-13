import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { Point2d } from '../geometry/interpretation'
import type { AreaLayout, DirectionLayout, LineLayout, SegmentLayout } from './layout'
import type {
  DirectionMarkerPrimitive,
  OrientedAreaPrimitive,
  OrientedSegmentPrimitive,
  PointMarkerPrimitive,
  UnboundedLinePrimitive,
} from './primitives'

export type ManipulationKind = 'head' | 'base'

/**
 * What a glyph needs from the application shell to expose its handles: the
 * hover and keyboard-focus state keyed by `itemId:kind`, and the gesture
 * entry points. The shell owns pointer capture, history, and rewriting.
 */
export type HandleController = Readonly<{
  hoveredKey: string | null
  focusRingKey: string | null
  hover(key: string): void
  unhover(key: string): void
  focus(key: string): void
  blur(key: string): void
  pointerDown(event: ReactPointerEvent<SVGCircleElement>, itemId: string, kind: ManipulationKind): void
  keyDown(
    event: KeyboardEvent<SVGCircleElement>,
    itemId: string,
    kind: ManipulationKind,
    current: Point2d,
  ): void
}>

type BaseHandleProps = Readonly<{
  itemId: string
  point: Point2d
  mathematical: Point2d
  accessibleName: string
  movable: boolean
  scale: number
  controller: HandleController
  /** Lets a coincident head handle win the press (zero-length vectors). */
  yieldToHead?: boolean
  /** Verb of the accessible name; `Move base of` for objects with a separate position. */
  handleLabel?: string
}>

/** The base contour, base point, and keyboard focus ring shared by every located glyph. */
function BaseHandle({
  itemId, point, mathematical, accessibleName, movable, scale, controller, yieldToHead,
  handleLabel = 'Move base of',
}: BaseHandleProps) {
  const key = `${itemId}:base`
  return <>
    <circle
      className={`manipulation-base-contour${movable ? ' is-movable' : ''}`}
      cx={point.x} cy={point.y} r={10 * scale}
      style={{
        strokeWidth: Math.max(0, 24 - 20 * scale),
        ...(yieldToHead ? { pointerEvents: 'none' as const } : {}),
      }}
      tabIndex={movable ? 0 : undefined}
      role={movable ? 'button' : undefined}
      aria-keyshortcuts={movable ? 'Enter Delete' : undefined}
      aria-label={movable ? `${handleLabel} ${accessibleName}` : undefined}
      onPointerEnter={movable ? () => controller.hover(key) : undefined}
      onPointerLeave={movable ? () => controller.unhover(key) : undefined}
      onFocus={movable ? () => controller.focus(key) : undefined}
      onBlur={movable ? () => controller.blur(key) : undefined}
      onPointerDown={movable ? (event) => controller.pointerDown(event, itemId, 'base') : undefined}
      onKeyDown={movable ? (event) => controller.keyDown(event, itemId, 'base', mathematical) : undefined}
    />
    <circle
      className={`manipulation-base-point${controller.hoveredKey === key ? ' is-hovered' : ''}`}
      cx={point.x} cy={point.y} r={4.5 * scale}
      aria-hidden="true"
    />
    {controller.focusRingKey === key && <circle
      className="manipulation-focus-ring"
      cx={point.x} cy={point.y} r={14 * scale}
      aria-hidden="true"
    />}
  </>
}

export type OrientedSegmentGlyphProps = Readonly<{
  id: string
  primitive: OrientedSegmentPrimitive
  layout: SegmentLayout
  color: string
  label: string | null
  scale: number
  /** The primitive belongs to a document item (list elements do not). */
  itemPresent: boolean
  headMovable: boolean
  baseMovable: boolean
  controller: HandleController
}>

export function OrientedSegmentGlyph({
  id, primitive, layout, color, label, scale, itemPresent, headMovable, baseMovable, controller,
}: OrientedSegmentGlyphProps) {
  const { start, end, shaftEnd, arrowPoints } = layout
  const headKey = `${id}:head`
  const headAndBaseCoincide = Math.hypot(end.x - start.x, end.y - start.y) < 1
  return <g style={{ color }}>
    <line
      className={`vector${controller.hoveredKey === headKey ? ' is-head-hovered' : ''}`}
      x1={start.x}
      y1={start.y}
      x2={shaftEnd.x}
      y2={shaftEnd.y}
      strokeWidth={4 * scale}
      aria-label={primitive.accessibleName}
    />
    {arrowPoints && <polygon
      className="vector-arrowhead"
      points={arrowPoints}
      aria-hidden="true"
    />}
    {headMovable && <>
      <circle
        className="vector-head-point"
        cx={end.x} cy={end.y}
        r={1.25 * scale}
        aria-hidden="true"
      />
      {controller.focusRingKey === headKey && <circle
        className="manipulation-focus-ring"
        cx={end.x} cy={end.y} r={14 * scale}
        aria-hidden="true"
      />}
      {arrowPoints && controller.hoveredKey === headKey && <circle
        className="vector-head-indicator"
        cx={end.x} cy={end.y} r={5 * scale}
        aria-hidden="true"
      />}
      <circle
        className="manipulation-hit-target vector-head-target"
        cx={end.x} cy={end.y} r="12"
        tabIndex={0}
        role="button"
        aria-label={`Move head of ${primitive.accessibleName}`}
        onPointerEnter={() => controller.hover(headKey)}
        onPointerLeave={() => controller.unhover(headKey)}
        onFocus={() => controller.focus(headKey)}
        onBlur={() => controller.blur(headKey)}
        onPointerDown={(event) => controller.pointerDown(event, id, 'head')}
        onKeyDown={(event) => controller.keyDown(event, id, 'head', primitive.end)}
      />
    </>}
    {itemPresent && <BaseHandle
      itemId={id}
      point={start}
      mathematical={primitive.start}
      accessibleName={primitive.accessibleName}
      movable={baseMovable}
      scale={scale}
      controller={controller}
      yieldToHead={headMovable && headAndBaseCoincide}
    />}
    {label && <text className="object-label" x={end.x + 8} y={end.y - 8}>{label}</text>}
  </g>
}

function BivectorOrientationArrow({
  center, direction, scale,
}: Readonly<{
  center: Point2d
  direction: 1 | -1
  scale: number
}>) {
  const radius = 13 * scale
  const span = 1.5 * Math.PI
  const headLength = 0.4 * radius
  const startAngle = direction > 0 ? -Math.PI / 2 : Math.PI / 2
  const endAngle = startAngle + direction * span
  const strokeAngle = endAngle - direction * Math.min(headLength / radius, 0.5)
  const point = (angle: number) => ({
    x: center.x + radius * Math.cos(angle),
    y: center.y - radius * Math.sin(angle),
  })
  const start = point(startAngle)
  const strokeEnd = point(strokeAngle)
  const end = point(endAngle)
  const sweep = direction > 0 ? 0 : 1
  const heading = Math.atan2(end.y - strokeEnd.y, end.x - strokeEnd.x)
  const spread = 0.5
  const base = (angle: number) => ({
    x: end.x - headLength * Math.cos(angle),
    y: end.y - headLength * Math.sin(angle),
  })
  const first = base(heading - spread)
  const second = base(heading + spread)
  return <g className="bivector-orientation" aria-hidden="true" pointerEvents="none">
    <path
      d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 1 ${sweep} ${strokeEnd.x} ${strokeEnd.y}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={Math.min(2.2 * scale, 0.16 * radius)}
      strokeLinecap="round"
    />
    <polygon
      points={`${end.x},${end.y} ${first.x},${first.y} ${second.x},${second.y}`}
      fill="currentColor"
    />
  </g>
}

export type OrientedAreaGlyphProps = Readonly<{
  id: string
  primitive: OrientedAreaPrimitive
  layout: AreaLayout
  color: string
  label: string | null
  scale: number
  borderVisible: boolean
  orientationVisible: boolean
  itemPresent: boolean
  baseMovable: boolean
  controller: HandleController
}>

export function OrientedAreaGlyph({
  id, primitive, layout, color, label, scale, borderVisible, orientationVisible, itemPresent, baseMovable, controller,
}: OrientedAreaGlyphProps) {
  const { path, labelPoint, orientationCenter, base } = layout
  return <g style={{ color }}>
    <path
      className={`bivector${borderVisible ? ' has-border' : ''}`}
      d={path}
      strokeWidth={3 * scale}
      pointerEvents="none"
      aria-label={primitive.accessibleDescription}
    />
    {orientationVisible && <BivectorOrientationArrow
      center={orientationCenter}
      direction={primitive.orientation === 'counterclockwise' ? 1 : -1}
      scale={scale}
    />}
    {itemPresent && <BaseHandle
      itemId={id}
      point={base}
      mathematical={primitive.shape.kind === 'loop' ? primitive.shape.center : primitive.shape.vertices[0]}
      accessibleName={primitive.accessibleName}
      movable={baseMovable}
      scale={scale}
      controller={controller}
    />}
    {label && <text className="object-label" x={labelPoint.x + 8} y={labelPoint.y - 8}>{label}</text>}
  </g>
}

export type PointMarkerGlyphProps = Readonly<{
  id: string
  primitive: PointMarkerPrimitive
  point: Point2d
  color: string
  label: string | null
  scale: number
  itemPresent: boolean
  movable: boolean
  controller: HandleController
}>

/** A located point: a filled marker whose handle moves the point itself. */
export function PointMarkerGlyph({
  id, primitive, point, color, label, scale, itemPresent, movable, controller,
}: PointMarkerGlyphProps) {
  return <g style={{ color }}>
    <circle
      className="point-marker"
      cx={point.x} cy={point.y} r={4.5 * scale}
      aria-label={primitive.accessibleName}
    />
    {itemPresent && <BaseHandle
      itemId={id}
      point={point}
      mathematical={primitive.point}
      accessibleName={primitive.accessibleName}
      handleLabel="Move"
      movable={movable}
      scale={scale}
      controller={controller}
    />}
    {label && <text className="object-label" x={point.x + 8} y={point.y - 8}>{label}</text>}
  </g>
}

export type UnboundedLineGlyphProps = Readonly<{
  primitive: UnboundedLinePrimitive
  layout: NonNullable<LineLayout>
  color: string
  label: string | null
  scale: number
}>

/** A line clipped to the viewport; no handle in this milestone (PGA-VIZ-003). */
export function UnboundedLineGlyph({ primitive, layout, color, label, scale }: UnboundedLineGlyphProps) {
  return <g style={{ color }}>
    <line
      className="unbounded-line"
      x1={layout.start.x} y1={layout.start.y}
      x2={layout.end.x} y2={layout.end.y}
      strokeWidth={2.5 * scale}
      aria-label={primitive.accessibleName}
    />
    {label && <text className="object-label" x={layout.labelPoint.x + 8} y={layout.labelPoint.y - 8}>{label}</text>}
  </g>
}

export type DirectionMarkerGlyphProps = Readonly<{
  primitive: DirectionMarkerPrimitive
  layout: DirectionLayout
  color: string
  label: string | null
  scale: number
}>

/** An ideal point: an outward arrow at the viewport edge in its direction. */
export function DirectionMarkerGlyph({ primitive, layout, color, label, scale }: DirectionMarkerGlyphProps) {
  const headLength = 10 * scale
  const spread = Math.PI / 6
  const head = [
    `${layout.tip.x},${layout.tip.y}`,
    `${layout.tip.x - headLength * Math.cos(layout.angle - spread)},${layout.tip.y - headLength * Math.sin(layout.angle - spread)}`,
    `${layout.tip.x - headLength * Math.cos(layout.angle + spread)},${layout.tip.y - headLength * Math.sin(layout.angle + spread)}`,
  ].join(' ')
  return <g style={{ color }}>
    <line
      className="direction-marker"
      x1={layout.tail.x} y1={layout.tail.y}
      x2={layout.tip.x} y2={layout.tip.y}
      strokeWidth={2.5 * scale}
      strokeDasharray={`${4 * scale} ${3 * scale}`}
      aria-label={primitive.accessibleName}
    />
    <polygon className="direction-marker-head" points={head} aria-hidden="true" />
    {label && <text className="object-label" x={layout.tail.x + 8} y={layout.tail.y - 8}>{label}</text>}
  </g>
}
