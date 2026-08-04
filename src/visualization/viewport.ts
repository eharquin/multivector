import { formatRoundTripNumber } from '../domain/numberFormat'

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

export const DEFAULT_PIXELS_PER_UNIT = 72
export const MIN_PIXELS_PER_UNIT = 0.001
export const MAX_PIXELS_PER_UNIT = 1_000_000
export const GRID_TARGET_PIXELS = 72
export const MAX_GRID_LINES = 256

export type GridLine = Readonly<{
  coordinate: number
  screen: number
  major: boolean
  label: string | null
}>

export type AdaptiveGrid = Readonly<{
  majorStep: number
  minorStep: number
  vertical: readonly GridLine[]
  horizontal: readonly GridLine[]
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

/** Exact inverse of `toScreen` for the same finite viewport. */
export function toMathematical(
  viewport: Viewport2d,
  point: Readonly<{ x: number; y: number }>,
): Readonly<{ x: number; y: number }> {
  return {
    x: viewport.centerX + (point.x - viewport.width / 2) / viewport.pixelsPerUnit,
    y: viewport.centerY - (point.y - viewport.height / 2) / viewport.pixelsPerUnit,
  }
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_PIXELS_PER_UNIT, Math.max(MIN_PIXELS_PER_UNIT, zoom))
}

/** Formats the camera scale compactly across the complete supported range. */
export function formatZoomPercentage(pixelsPerUnit: number): string {
  const percentage = pixelsPerUnit / DEFAULT_PIXELS_PER_UNIT * 100
  if (percentage < 0.01 || percentage >= 10_000) {
    return `${percentage.toExponential(2).replace('e', 'E').replace('E+', 'E')}%`
  }
  if (percentage >= 100) return `${Math.round(percentage)}%`
  return `${Number(percentage.toPrecision(3))}%`
}

/** Changes scale while leaving the mathematical point under the cursor fixed. */
export function zoomAt(
  viewport: Viewport2d,
  screenPoint: Readonly<{ x: number; y: number }>,
  requestedZoom: number,
): Viewport2d {
  const anchor = toMathematical(viewport, screenPoint)
  const pixelsPerUnit = clampZoom(requestedZoom)
  return {
    ...viewport,
    pixelsPerUnit,
    centerX: anchor.x - (screenPoint.x - viewport.width / 2) / pixelsPerUnit,
    centerY: anchor.y + (screenPoint.y - viewport.height / 2) / pixelsPerUnit,
  }
}

/** Converts a screen-space drag into a mathematical center translation. */
export function panByScreen(
  viewport: Viewport2d,
  delta: Readonly<{ x: number; y: number }>,
): Viewport2d {
  return {
    ...viewport,
    centerX: viewport.centerX - delta.x / viewport.pixelsPerUnit,
    centerY: viewport.centerY + delta.y / viewport.pixelsPerUnit,
  }
}

function oneTwoFiveStep(raw: number): number {
  const exponent = Math.floor(Math.log10(raw))
  const power = 10 ** exponent
  const normalized = raw / power
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return factor * power
}

export function formatGridNumber(value: number, step: number): string {
  const normalized = Math.abs(value) < step * 1e-10 ? 0 : value
  const decimals = Math.max(0, Math.min(12, -Math.floor(Math.log10(step)) + 1))
  return formatRoundTripNumber(Number(normalized.toFixed(decimals)))
}

function axisLines(
  minimum: number,
  maximum: number,
  majorStep: number,
  minorStep: number,
  screen: (coordinate: number) => number,
): readonly GridLine[] {
  const first = Math.ceil(minimum / minorStep) * minorStep
  const estimated = Math.floor((maximum - first) / minorStep) + 1
  if (!Number.isFinite(estimated) || estimated <= 0 || estimated > MAX_GRID_LINES) return []
  return Array.from({ length: estimated }, (_, index) => {
    const coordinate = first + index * minorStep
    const majorIndex = Math.round(coordinate / majorStep)
    const major = Math.abs(coordinate - majorIndex * majorStep) <= minorStep * 1e-6
    return {
      coordinate,
      screen: screen(coordinate),
      major,
      label: major ? formatGridNumber(coordinate, majorStep) : null,
    }
  })
}

/** Generates a bounded adaptive 1–2–5 grid for the visible mathematical area. */
export function adaptiveGrid(viewport: Viewport2d): AdaptiveGrid {
  const majorStep = oneTwoFiveStep(GRID_TARGET_PIXELS / viewport.pixelsPerUnit)
  const leading = majorStep / 10 ** Math.floor(Math.log10(majorStep))
  const subdivisions = leading === 2 ? 4 : 5
  const minorStep = majorStep / subdivisions
  const minimum = toMathematical(viewport, { x: 0, y: viewport.height })
  const maximum = toMathematical(viewport, { x: viewport.width, y: 0 })
  return {
    majorStep,
    minorStep,
    vertical: axisLines(minimum.x, maximum.x, majorStep, minorStep, (x) => toScreen(viewport, { x, y: 0 }).x),
    horizontal: axisLines(minimum.y, maximum.y, majorStep, minorStep, (y) => toScreen(viewport, { x: 0, y }).y),
  }
}
