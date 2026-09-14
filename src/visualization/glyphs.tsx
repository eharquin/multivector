import type {
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type { Point2d } from '../geometry/interpretation'
import type { AreaLayout, DirectionLayout, InfinityLayout, LineLayout, SegmentLayout } from './layout'
import type {
  OrientedAreaPrimitive,
  OrientedSegmentPrimitive,
  PointMarkerPrimitive,
  UnboundedLinePrimitive,
} from './primitives'

/** `line` translates a line, `normal` rotates it about the selected anchor. */
export type ManipulationKind = 'head' | 'base' | 'line' | 'normal'

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
  pointerDown(event: ReactPointerEvent<SVGElement>, itemId: string, kind: ManipulationKind): void
  keyDown(
    event: KeyboardEvent<SVGElement>,
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

export type LineSelection = Readonly<{
  /** The anchor on the line, where the normal handle is drawn from (screen space). */
  anchor: Point2d
  /** The mathematical anchor, passed to keyboard handlers. */
  mathematicalAnchor: Point2d
  /** The tip of the normal handle (screen space). */
  normalTip: Point2d
  arrowPoints: string
}>

export type UnboundedLineGlyphProps = Readonly<{
  id: string
  primitive: UnboundedLinePrimitive
  layout: NonNullable<LineLayout>
  color: string
  label: string | null
  scale: number
  itemPresent: boolean
  /** The line's coefficients are a literal, so it can be translated and rotated. */
  movable: boolean
  orientationVisible: boolean
  /** Short ticks on the positive side, as `M x y L x y` segments. */
  orientationTicks: string
  selection: LineSelection | null
  controller: HandleController
}>

/**
 * A line clipped to the viewport. A movable line shows a translucent double
 * border on hover, translates when dragged, and once selected shows its unit
 * normal, whose head rotates it about the anchor (PGA-VIZ-004).
 */
export function UnboundedLineGlyph({
  id, primitive, layout, color, label, scale, itemPresent, movable, orientationVisible, orientationTicks, selection, controller,
}: UnboundedLineGlyphProps) {
  const lineKey = `${id}:line`
  const normalKey = `${id}:normal`
  const hovered = controller.hoveredKey === lineKey
  return <g style={{ color }}>
    {movable && (hovered || selection) && <line
      className="unbounded-line-halo"
      x1={layout.start.x} y1={layout.start.y}
      x2={layout.end.x} y2={layout.end.y}
      strokeWidth={12 * scale}
      aria-hidden="true"
    />}
    {orientationVisible && orientationTicks && <path
      className="line-orientation"
      d={orientationTicks}
      strokeWidth={1.2 * scale}
      aria-hidden="true"
    />}
    <line
      className="unbounded-line"
      x1={layout.start.x} y1={layout.start.y}
      x2={layout.end.x} y2={layout.end.y}
      strokeWidth={2.5 * scale}
      aria-label={primitive.accessibleName}
    />
    {itemPresent && movable && <line
      className="manipulation-hit-target unbounded-line-hit"
      x1={layout.start.x} y1={layout.start.y}
      x2={layout.end.x} y2={layout.end.y}
      strokeWidth={16}
      tabIndex={0}
      role="button"
      aria-keyshortcuts="Enter"
      aria-label={`Move ${primitive.accessibleName}`}
      onPointerEnter={() => controller.hover(lineKey)}
      onPointerLeave={() => controller.unhover(lineKey)}
      onFocus={() => controller.focus(lineKey)}
      onBlur={() => controller.blur(lineKey)}
      onPointerDown={(event) => controller.pointerDown(event, id, 'line')}
      onKeyDown={(event) => controller.keyDown(event, id, 'line', selection?.mathematicalAnchor ?? primitive.point)}
    />}
    {controller.focusRingKey === lineKey && <line
      className="manipulation-focus-ring"
      x1={layout.start.x} y1={layout.start.y}
      x2={layout.end.x} y2={layout.end.y}
      strokeWidth={8 * scale}
      aria-hidden="true"
    />}
    {selection && <g className="line-normal">
      <circle
        className="line-anchor"
        cx={selection.anchor.x} cy={selection.anchor.y} r={3.5 * scale}
        strokeWidth={1.5 * scale}
        aria-hidden="true"
      />
      <line
        className="line-normal-shaft"
        x1={selection.anchor.x} y1={selection.anchor.y}
        x2={selection.normalTip.x} y2={selection.normalTip.y}
        strokeWidth={2 * scale}
        strokeDasharray={`${4 * scale} ${4 * scale}`}
        aria-hidden="true"
      />
      <polygon className="line-normal-head" points={selection.arrowPoints} aria-hidden="true" />
      {controller.focusRingKey === normalKey && <circle
        className="manipulation-focus-ring"
        cx={selection.normalTip.x} cy={selection.normalTip.y} r={14 * scale}
        aria-hidden="true"
      />}
      {controller.hoveredKey === normalKey && <circle
        className="vector-head-indicator"
        cx={selection.normalTip.x} cy={selection.normalTip.y} r={5 * scale}
        aria-hidden="true"
      />}
      <circle
        className="manipulation-hit-target vector-head-target"
        cx={selection.normalTip.x} cy={selection.normalTip.y} r="12"
        tabIndex={0}
        role="button"
        aria-label={`Rotate ${primitive.accessibleName}`}
        onPointerEnter={() => controller.hover(normalKey)}
        onPointerLeave={() => controller.unhover(normalKey)}
        onFocus={() => controller.focus(normalKey)}
        onBlur={() => controller.blur(normalKey)}
        onPointerDown={(event) => controller.pointerDown(event, id, 'normal')}
        onKeyDown={(event) => controller.keyDown(event, id, 'normal', selection.mathematicalAnchor)}
      />
    </g>}
    {label && <text className="object-label" x={layout.labelPoint.x + 8} y={layout.labelPoint.y - 8}>{label}</text>}
  </g>
}

export type DirectionMarkerGlyphProps = Readonly<{
  accessibleName: string
  layout: DirectionLayout
  color: string
  label: string | null
  scale: number
}>

/** An ideal point on the line at infinity: an outward arrow whose tip sits on the ellipse. */
export function DirectionMarkerGlyph({ accessibleName, layout, color, label, scale }: DirectionMarkerGlyphProps) {
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
      aria-label={`${accessibleName} at infinity`}
    />
    <polygon className="direction-marker-head" points={head} aria-hidden="true" />
    {label && <text className="object-label" x={layout.tail.x + 8} y={layout.tail.y - 8}>{label}</text>}
  </g>
}

export type LineAtInfinityGlyphProps = Readonly<{
  accessibleName: string
  layout: InfinityLayout
  color: string
  label: string | null
  scale: number
}>

/** The line at infinity: a dashed ellipse inscribed in the viewport. */
export function LineAtInfinityGlyph({ accessibleName, layout, color, label, scale }: LineAtInfinityGlyphProps) {
  return <g style={{ color }}>
    <ellipse
      className="line-at-infinity"
      cx={layout.center.x} cy={layout.center.y}
      rx={layout.radiusX} ry={layout.radiusY}
      strokeWidth={2 * scale}
      strokeDasharray={`${6 * scale} ${5 * scale}`}
      aria-label={accessibleName}
    />
    {label && <text className="object-label" x={layout.center.x + layout.radiusX * Math.SQRT1_2 + 8} y={layout.center.y - layout.radiusY * Math.SQRT1_2 - 8}>{label}</text>}
  </g>
}
