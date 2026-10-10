import type { VisualizationPrimitive } from './primitives'

/** How a visualizer counts one primitive kind in the viewport description. */
export type DescribedKind = Readonly<{
  kind: VisualizationPrimitive['kind']
  singular: string
  plural: string
}>

export type ViewportDescriptionInput = Readonly<{
  primitives: readonly VisualizationPrimitive[]
  /** The kinds the active visualizer counts, in reading order. */
  describedKinds: readonly DescribedKind[]
  expressionCount: number
  omittedElements: number
  /** Lower-case name of what a double-click creates, such as `vector` or `point`. */
  creationObject: string
  formatNumber: (value: number) => string
}>

function joinList(parts: readonly string[]): string {
  if (parts.length <= 2) return parts.join(' and ')
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

function coordinates(
  point: Readonly<{ x: number; y: number }>,
  formatNumber: (value: number) => string,
): string {
  return `${formatNumber(point.x)}, ${formatNumber(point.y)}`
}

/** One sentence describing a rendered primitive, in mathematical coordinates. */
export function describePrimitive(
  primitive: VisualizationPrimitive,
  formatNumber: (value: number) => string,
): string {
  switch (primitive.kind) {
    case 'oriented-segment':
      return `${primitive.accessibleName} runs from ${
        primitive.start.x === 0 && primitive.start.y === 0
          ? 'the origin'
          : coordinates(primitive.start, formatNumber)
      } to ${coordinates(primitive.end, formatNumber)}.`
    case 'oriented-area': {
      const position = primitive.shape.kind === 'loop'
        ? primitive.shape.center
        : primitive.shape.vertices[0]
      const at = position.x === 0 && position.y === 0
        ? 'the origin'
        : `(${coordinates(position, formatNumber)})`
      const shape = primitive.shape.kind === 'parallelogram'
        ? 'oriented parallelogram'
        : 'oriented loop'
      const signedValue = primitive.orientation === 'counterclockwise'
        ? primitive.area
        : -primitive.area
      return `${primitive.accessibleName} is an ${shape} with signed value ${
        formatNumber(signedValue)
      }, area ${formatNumber(primitive.area)}, ${primitive.orientation} orientation, positioned at ${at}.`
    }
    case 'point-marker':
      return `${primitive.accessibleName} is a point at ${
        primitive.point.x === 0 && primitive.point.y === 0
          ? 'the origin'
          : coordinates(primitive.point, formatNumber)
      }.`
    case 'unbounded-line':
      return `${primitive.accessibleName} is a line through ${
        coordinates(primitive.point, formatNumber)
      } with direction ${coordinates(primitive.direction, formatNumber)}.`
    case 'ideal-point':
      return `${primitive.accessibleName} is an ideal point in direction ${
        coordinates(primitive.direction, formatNumber)
      } with magnitude ${formatNumber(primitive.magnitude)}.`
    case 'line-at-infinity':
      return `${primitive.accessibleName} is the line at infinity, drawn around the viewport.`
  }
}

/**
 * The canvas description read by assistive technology: a count of the kinds
 * the active visualizer draws, one sentence per drawn primitive, and the
 * creation hint of the active interpretation.
 */
export function describeViewport({
  primitives,
  describedKinds,
  expressionCount,
  omittedElements,
  creationObject,
  formatNumber,
}: ViewportDescriptionInput): string {
  const hint = `Double-click empty viewport space to create a ${creationObject}.`
  const described = primitives.filter((primitive) =>
    describedKinds.some(({ kind }) => kind === primitive.kind))
  if (described.length === 0) {
    return `No spatial objects are visible from ${expressionCount} expressions. ${hint}`
  }
  const counts = describedKinds.map(({ kind, singular, plural }) => {
    const count = described.filter((primitive) => primitive.kind === kind).length
    return `${count} ${count === 1 ? singular : plural}`
  })
  const sentences = describedKinds.flatMap(({ kind }) => described
    .filter((primitive) => primitive.kind === kind)
    .map((primitive) => describePrimitive(primitive, formatNumber)))
  return [
    `${joinList(counts)} ${counts.length === 1 && described.length === 1 ? 'is' : 'are'} visible.`,
    ...sentences,
    ...(omittedElements > 0
      ? [`${omittedElements} additional list elements are omitted by the rendering limit.`]
      : []),
    hint,
  ].join(' ')
}
