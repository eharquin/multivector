import { afterEach, describe, expect, it, vi } from 'vitest'
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

  describe('on a short window', () => {
    // About 600 px high, as in the acceptance criteria of #188.
    afterEach(() => vi.unstubAllGlobals())

    it('opens below the first row and keeps the whole menu inside the window', () => {
      vi.stubGlobal('innerHeight', 600)
      const placement = popoverPosition(anchorAt({ top: 60, bottom: 84, left: 40 }), 272, 480)

      expect(placement.top).toBe(90)
      expect(placement.top + 480).toBeLessThanOrEqual(600 - 8)
    })

    it('flips a measured menu above the last row', () => {
      vi.stubGlobal('innerHeight', 600)
      const placement = popoverPosition(anchorAt({ top: 560, bottom: 584, left: 40 }), 272, 480)

      expect(placement.top).toBe(560 - 6 - 480)
    })

    it('opens on the roomier side and clamps when neither side fits', () => {
      vi.stubGlobal('innerHeight', 600)
      // A 400 px menu fits on neither side of these anchors.
      // 276 px above and 272 px below: it opens above, clamped to the top margin.
      expect(popoverPosition(anchorAt({ top: 290, bottom: 314, left: 40 }), 272, 400).top).toBe(8)
      // 246 px above and 302 px below: it opens below, clamped to the bottom margin.
      expect(popoverPosition(anchorAt({ top: 260, bottom: 284, left: 40 }), 272, 400).top).toBe(600 - 8 - 400)
    })

    it('caps a menu taller than the window to the window, less the margins', () => {
      vi.stubGlobal('innerHeight', 600)
      for (const anchorTop of [60, 300, 560]) {
        const placement = popoverPosition(anchorAt({ top: anchorTop, bottom: anchorTop + 24, left: 40 }), 272, 900)
        expect(placement.top).toBe(8)
      }
    })
  })

  it('falls back to the margin position when no anchor is measurable', () => {
    expect(popoverPosition(null, 272, 300)).toEqual({ top: 8, left: 8 })
  })
})
