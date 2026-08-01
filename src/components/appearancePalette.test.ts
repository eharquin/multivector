import { describe, expect, it } from 'vitest'
import { describeVga2Entity } from '../geometry/vga2Interpretation'
import type { StandardVga2Entity } from '../geometry/vga2Interpretation'
import {
  DEFAULT_OBJECT_STYLES,
  defaultStyleForKind,
  paletteEntry,
  resolveItemAppearance,
} from './appearancePalette'

const entities: readonly StandardVga2Entity[] = [
  { kind: 'scalar', value: 0 },
  { kind: 'vector-2d', x: 1, y: 0 },
  { kind: 'bivector-2d', value: 1 },
  { kind: 'rotor-2d', scalar: 1, bivector: 0 },
  { kind: 'mixed-multivector' },
]

describe('default object styles', () => {
  it('documents every semantic kind the interpretation can produce', () => {
    const documented = DEFAULT_OBJECT_STYLES.map(([kind]) => kind)

    for (const entity of entities) {
      expect(documented).toContain(describeVga2Entity(entity))
    }
    expect(documented).toContain('List')
  })

  it('names a real palette entry for every documented kind', () => {
    for (const [kind, style] of DEFAULT_OBJECT_STYLES) {
      expect(paletteEntry(style), `${kind} uses unknown style ${style}`)
        .toBeDefined()
    }
  })

  it('resolves each documented kind to its documented style', () => {
    for (const [kind, style] of DEFAULT_OBJECT_STYLES) {
      expect(defaultStyleForKind(kind)).toBe(style)
    }
  })

  it('applies the list style to a counted list kind', () => {
    expect(defaultStyleForKind('List (3)')).toBe(defaultStyleForKind('List'))
  })

  it('falls back to a defined style for an unknown kind', () => {
    expect(paletteEntry(defaultStyleForKind('Trivector'))).toBeDefined()
  })
})

describe('resolveItemAppearance', () => {
  it('draws the declared name when no label text is stored', () => {
    expect(resolveItemAppearance(undefined, 'Vector', 'V').displayLabel).toBe('V')
  })

  it('keeps stored label text authoritative for editing and drawing', () => {
    const resolved = resolveItemAppearance({ label: 'Velocity' }, 'Vector', 'V')

    expect(resolved.label).toBe('Velocity')
    expect(resolved.displayLabel).toBe('Velocity')
  })

  it('returns to the declared name when label text is cleared', () => {
    const resolved = resolveItemAppearance({ label: '' }, 'Vector', 'V')

    expect(resolved.label).toBe('')
    expect(resolved.displayLabel).toBe('V')
  })
})
