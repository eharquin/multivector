import { describe, expect, it } from 'vitest'
import {
  directConstructorComponents,
  directDeclaredConstructorComponents,
  rewriteConstructorLiterals,
} from './constructorLiteralEdit'

describe('constructor literal editing', () => {
  it('edits any registered constructor call by name and arity', () => {
    const source = 'P = point(1, -2, 1)'
    const components = directDeclaredConstructorComponents(source, 'point', 3)
    expect(components).toEqual([
      { kind: 'literal', span: { start: 10, end: 11 } },
      { kind: 'literal', span: { start: 13, end: 15 } },
      { kind: 'literal', span: { start: 17, end: 18 } },
    ])
    expect(rewriteConstructorLiterals(source, components!, [3.5, 4, 1])).toBe('P = point(3.5, 4, 1)')
  })

  it('accepts the vector tuple syntax only for the vector constructor', () => {
    expect(directConstructorComponents('(1, 2)', 'vector', 2)).toHaveLength(2)
    expect(directConstructorComponents('(1, 2)', 'point', 2)).toBeNull()
  })

  it('refuses a different constructor, arity, or compound argument', () => {
    expect(directDeclaredConstructorComponents('P = point(1, 2)', 'point', 3)).toBeNull()
    expect(directDeclaredConstructorComponents('P = line(1, 2, 3)', 'point', 3)).toBeNull()
    expect(directDeclaredConstructorComponents('P = point(1 + 1, 2, 3)', 'point', 3)).toBeNull()
    expect(directDeclaredConstructorComponents('point(1, 2, 3)', 'point', 3)).toBeNull()
  })

  it('rewrites literals around signed references without touching them', () => {
    const source = 'P = point(-a, 2, w)'
    const components = directDeclaredConstructorComponents(source, 'point', 3)
    expect(components).toMatchObject([
      { kind: 'reference', name: 'a', sign: -1 },
      { kind: 'literal' },
      { kind: 'reference', name: 'w', sign: 1 },
    ])
    expect(rewriteConstructorLiterals(source, components!, [9, 7.25, 9])).toBe('P = point(-a, 7.25, w)')
  })
})
