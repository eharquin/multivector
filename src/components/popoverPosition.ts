export type PopoverPlacement = Readonly<{ top: number; left: number }>

const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6

/**
 * Places a popover beside its anchor in viewport coordinates. A popover taller
 * than the window is capped to the window height, less the margins, and is
 * expected to scroll internally. It opens below the anchor when it fits there,
 * above when it fits there instead, and otherwise on the roomier side; it is
 * then clamped to the margin on every side, so the whole popover stays
 * reachable. Returns the fallback margin position when no anchor is
 * measurable, which is the case under a test DOM without layout.
 */
export function popoverPosition(
  anchor: HTMLElement | null,
  width: number,
  height: number,
): PopoverPlacement {
  if (!anchor?.getBoundingClientRect) {
    return { top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN }
  }

  const rect = anchor.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const shownHeight = Math.min(height, Math.max(0, viewportHeight - 2 * VIEWPORT_MARGIN))

  const roomBelow = viewportHeight - VIEWPORT_MARGIN - (rect.bottom + ANCHOR_GAP)
  const roomAbove = rect.top - ANCHOR_GAP - VIEWPORT_MARGIN
  const flipsAbove = shownHeight > roomBelow &&
    (shownHeight <= roomAbove || roomAbove > roomBelow)
  const top = flipsAbove
    ? rect.top - ANCHOR_GAP - shownHeight
    : rect.bottom + ANCHOR_GAP

  return {
    top: clamp(top, VIEWPORT_MARGIN, viewportHeight - shownHeight - VIEWPORT_MARGIN),
    left: clamp(
      rect.left,
      VIEWPORT_MARGIN,
      viewportWidth - width - VIEWPORT_MARGIN,
    ),
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(Math.max(minimum, maximum), value))
}
