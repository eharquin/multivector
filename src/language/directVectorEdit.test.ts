import { describe, expect, it } from 'vitest'
import {
  directDeclaredVectorEdit,
  directDeclaredVectorComponents,
  directPositionAnchorReference,
  directPositionEdit,
  rewriteDirectVector,
  rewriteLiteralComponents,
} from './directVectorEdit'

describe('direct vector inverse editing', () => {
  it('recognizes only explicit position anchor references', () => {
    expect(directPositionAnchorReference('V.position')).toEqual({
      name: 'V', property: 'position',
    })
    expect(directPositionAnchorReference('V.head')).toEqual({
      name: 'V', property: 'head',
    })
    expect(directPositionAnchorReference('V')).toBeNull()
    expect(directPositionAnchorReference('(1, 2)')).toBeNull()
  })
  it('rewrites vector constructor components without changing surrounding source', () => {
    const source = 'V = vector(-2, +3)'
    const edit = directDeclaredVectorEdit(source)
    expect(edit).not.toBeNull()
    expect(rewriteDirectVector(source, edit!, 1.25, -4)).toBe('V = vector(1.25, -4)')
  })

  it('supports tuple position sources', () => {
    const source = '(-1, 2)'
    const edit = directPositionEdit(source)
    expect(rewriteDirectVector(source, edit!, 3, 4)).toBe('(3, 4)')
  })

  it('refuses compound components', () => {
    expect(directDeclaredVectorEdit('V = vector(a + 1, 2)')).toBeNull()
    expect(directPositionEdit('(1 / 2, 3)')).toBeNull()
  })

  it('identifies signed direct scalar references without rewriting them', () => {
    const components = directDeclaredVectorComponents('V = vector(-a, 2)')
    expect(components).toEqual([
      { kind: 'reference', name: 'a', sign: -1 },
      { kind: 'literal', span: { start: 15, end: 16 } },
    ])
    expect(rewriteLiteralComponents('V = vector(-a, 2)', components!, 3, 4))
      .toBe('V = vector(-a, 4)')
  })
})
