import type { Point2d } from '../geometry/interpretation'
import type { RenderedPrimitive } from './layout'
import type { VisualizationPrimitive } from './primitives'
import { toScreen, type Viewport2d } from './viewport'

export type AnchorProperty = 'position' | 'head'

export type AnchorCandidate = Readonly<{
  draggedId: string
  targetId: string
  targetName: string
  property: AnchorProperty
  point: Point2d
  mathematical: Point2d
  order: number
  distance: number
}>

/** Snap radius for taking a new anchor and the wider radius that keeps one (INTERACT2D). */
export const ANCHOR_SNAP_DISTANCE = 16
export const ANCHOR_RETAIN_DISTANCE = 22

/** The points of a primitive another object's base may anchor to, in property order. */
export function anchorPoints(
  primitive: VisualizationPrimitive,
): readonly Readonly<{ property: AnchorProperty; mathematical: Point2d }>[] {
  switch (primitive.kind) {
    case 'oriented-segment':
      return [
        { property: 'position', mathematical: primitive.start },
        { property: 'head', mathematical: primitive.end },
      ]
    case 'oriented-area':
      return [{
        property: 'position',
        mathematical: primitive.shape.kind === 'loop'
          ? primitive.shape.center
          : primitive.shape.vertices[0],
      }]
    case 'point-marker':
      return [{ property: 'position', mathematical: primitive.point }]
    case 'unbounded-line':
    case 'direction-marker':
      return []
  }
}

export type AnchorSearch = Readonly<{
  draggedId: string
  rendered: readonly RenderedPrimitive[]
  viewport: Viewport2d
  /** Screen-space pointer in viewport coordinates. */
  pointer: Point2d
  /** CSS pixels per viewport unit on each axis, so distances are in CSS pixels. */
  cssScale: Point2d
  /** Declared name of a document item, or `null` when it cannot be referenced. */
  nameOf(itemId: string): string | null
  /** Whether linking the dragged base to `target.property` evaluates validly. */
  isValid(candidate: AnchorCandidate): boolean
}>

/**
 * Lists the anchors within the retain radius of the pointer, nearest first,
 * excluding list elements and the dragged object itself.
 */
export function findAnchorCandidates(search: AnchorSearch): readonly AnchorCandidate[] {
  return search.rendered.flatMap((rendered) => {
    if (rendered.id.includes(':') || rendered.id === search.draggedId) return []
    const targetName = search.nameOf(rendered.id)
    if (!targetName) return []
    return anchorPoints(rendered.primitive).map(({ property, mathematical }, order): AnchorCandidate => {
      const point = toScreen(search.viewport, mathematical)
      return {
        draggedId: search.draggedId,
        targetId: rendered.id,
        targetName,
        property,
        point,
        mathematical,
        order,
        distance: Math.hypot(
          (search.pointer.x - point.x) * search.cssScale.x,
          (search.pointer.y - point.y) * search.cssScale.y,
        ),
      }
    })
  })
    .filter((candidate) => candidate.distance <= ANCHOR_RETAIN_DISTANCE)
    .filter((candidate) => search.isValid(candidate))
    .sort((left, right) => left.distance - right.distance ||
      left.targetId.localeCompare(right.targetId) || left.order - right.order)
}

/**
 * Keeps the previously previewed anchor while it stays within the retain
 * radius; otherwise takes the nearest candidate within the snap radius.
 */
export function selectAnchor(
  candidates: readonly AnchorCandidate[],
  previous: AnchorCandidate | null,
): AnchorCandidate | null {
  const retained = previous
    ? candidates.find((candidate) =>
        candidate.targetId === previous.targetId &&
        candidate.property === previous.property) ?? null
    : null
  if (retained) return retained
  const nearest = candidates[0]
  return nearest && nearest.distance <= ANCHOR_SNAP_DISTANCE ? nearest : null
}
