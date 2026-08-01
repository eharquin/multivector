export type PopoverPlacement = Readonly<{ top: number; left: number }>

const VIEWPORT_MARGIN = 8
const ANCHOR_GAP = 6

/**
 * Places a popover beside its anchor in viewport coordinates, flipping above
 * the anchor when it would overflow the bottom edge and clamping to the margin
 * on every side. Returns the fallback margin position when no anchor is
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

  const flipsAbove =
    rect.bottom + ANCHOR_GAP + height > viewportHeight - VIEWPORT_MARGIN &&
    rect.top - ANCHOR_GAP - height >= VIEWPORT_MARGIN
  const top = flipsAbove
    ? rect.top - ANCHOR_GAP - height
    : rect.bottom + ANCHOR_GAP

  return {
    top: clamp(top, VIEWPORT_MARGIN, viewportHeight - height - VIEWPORT_MARGIN),
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
