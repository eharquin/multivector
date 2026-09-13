import type { EvaluatedDocumentItem } from '../application/evaluateDocument'
import type { ExpressionAppearance } from '../document/expressionDocument'
import { resolveItemAppearance } from '../components/appearancePalette'
import type { AnyInterpretation } from '../geometry/interpretation'
import type { Point2d } from '../geometry/interpretation'
import {
  limitRenderedListElements,
  type OrientedAreaPrimitive,
  type OrientedSegmentPrimitive,
  type VisualizationPrimitive,
} from './primitives'
import { toScreen, type Viewport2d } from './viewport'

/** One primitive selected for rendering, with its resolved appearance. */
export type RenderedPrimitive = Readonly<{
  id: string
  primitive: VisualizationPrimitive
  color: string
  label: string | null
  borderVisible: boolean
  orientationVisible: boolean
  bivectorShape: 'from-vectors' | 'disk' | 'square'
}>

/**
 * Selects the visible primitives of every valid item in document order,
 * applying appearance, label, and list-truncation rules. List elements get
 * composite identifiers `itemId:elementId`.
 */
export function collectRenderedPrimitives(
  evaluatedItems: readonly EvaluatedDocumentItem[],
  appearance: Readonly<Record<string, ExpressionAppearance | undefined>>,
  interpretation: AnyInterpretation,
  declaredName: (source: string) => string | null,
): Readonly<{ rendered: readonly RenderedPrimitive[]; omitted: number }> {
  const rendered = evaluatedItems.flatMap((evaluated): RenderedPrimitive[] => {
    if (evaluated.evaluation?.status !== 'valid') return []
    const kind = evaluated.evaluation.valueType === 'list'
      ? `List (${evaluated.evaluation.value.elements.length})`
      : interpretation.describe(evaluated.evaluation.entity)
    const { visible, color, labelVisible, displayLabel, borderVisible, orientationVisible, bivectorShape } = resolveItemAppearance(
      appearance[evaluated.item.id],
      kind,
      declaredName(evaluated.item.source),
    )
    if (!visible) return []
    const baseLabel = displayLabel
    if (evaluated.evaluation.valueType === 'list') {
      return limitRenderedListElements(
        evaluated.evaluation.elements.filter((element) => element.primitive),
      ).visible.flatMap((element, elementIndex) => element.primitive
        ? [{
            id: `${evaluated.item.id}:${element.id}`,
            primitive: element.primitive,
            color,
            borderVisible,
            orientationVisible,
            bivectorShape,
            label: labelVisible ? (baseLabel ? `${baseLabel}[${elementIndex}]` : element.primitive.accessibleName) : null,
          }]
        : [])
    }
    return evaluated.evaluation.primitive
      ? [{
          id: evaluated.item.id,
          primitive: evaluated.evaluation.primitive,
          color,
          borderVisible,
          orientationVisible,
          bivectorShape,
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
  return { rendered, omitted }
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
