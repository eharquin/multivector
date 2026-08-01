import { describe, expect, it } from 'vitest'
import { popoverPosition } from './popoverPosition'

function anchorAt(rect: Partial<DOMRect>): HTMLElement {
  return {
    getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0, ...rect }),
  } as HTMLElement
}

describe('popoverPosition', () => {
  it('places the popover below its anchor when there is room', () => {
    const placement = popoverPosition(anchorAt({ top: 100, bottom: 124, left: 40 }), 272, 300)

    expect(placement).toEqual({ top: 130, left: 40 })
  })

  it('flips above the anchor when the popover would overflow the bottom edge', () => {
    const placement = popoverPosition(anchorAt({ top: 500, bottom: 524, left: 40 }), 272, 300)

    expect(placement).toEqual({ top: 194, left: 40 })
  })

  it('clamps to the viewport margin when the anchor sits near the right edge', () => {
    const placement = popoverPosition(anchorAt({ top: 100, bottom: 124, left: 900 }), 272, 300)

    expect(placement.left).toBe(window.innerWidth - 272 - 8)
  })

  it('falls back to the margin position when no anchor is measurable', () => {
    expect(popoverPosition(null, 272, 300)).toEqual({ top: 8, left: 8 })
  })
})
