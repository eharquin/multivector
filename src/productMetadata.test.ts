import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'

describe('product metadata', () => {
  it('uses the GAMUT name and expansion in browser metadata', () => {
    expect(html).toContain(
      '<title>GAMUT — Geometric Algebra Multivector Unveiling Tool</title>',
    )
    expect(html).toContain(
      'content="GAMUT — create and visualize reproducible geometric algebra constructions."',
    )
  })
})
