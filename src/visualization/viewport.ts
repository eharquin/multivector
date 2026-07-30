/**
 * An axis-aligned 2D view with a mathematical center and reference-pixel
 * scale. An SVG renderer may scale those reference pixels during layout.
 *
 * Mathematical `y` increases upward; screen `y` increases downward.
 */
export type Viewport2d = Readonly<{
  width: number
  height: number
  centerX: number
  centerY: number
  pixelsPerUnit: number
}>

/**
 * Maps mathematical coordinates to viewport coordinates without modifying the
 * mathematical point.
 */
export function toScreen(
  viewport: Viewport2d,
  point: Readonly<{ x: number; y: number }>,
): Readonly<{ x: number; y: number }> {
  return {
    x: viewport.width / 2 + (point.x - viewport.centerX) * viewport.pixelsPerUnit,
    y:
      viewport.height / 2 -
      (point.y - viewport.centerY) * viewport.pixelsPerUnit,
  }
}
