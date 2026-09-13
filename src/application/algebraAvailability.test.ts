import { describe, expect, it } from 'vitest'
import { createBuiltinAlgebraRegistry } from '../algebra/builtinAlgebras'
import { DocumentFormatError } from '../document/canonicalDocument'
import { requireAvailableAlgebra } from './algebraAvailability'

describe('algebra availability gate', () => {
  const registry = createBuiltinAlgebraRegistry()

  it('accepts a document of a registered algebra', () => {
    expect(() => requireAvailableAlgebra(registry, {
      algebraId: 'org.multivector.vga', definitionVersion: 1, conventionVersion: 1, parameters: {},
    })).not.toThrow()
  })

  it('rejects an unavailable algebra with a structured document error', () => {
    let error: unknown
    try {
      requireAvailableAlgebra(registry, {
        algebraId: 'org.multivector.pga', definitionVersion: 1, conventionVersion: 1, parameters: { dimension: 2 },
      })
    } catch (caught) { error = caught }
    expect(error).toBeInstanceOf(DocumentFormatError)
    expect((error as DocumentFormatError).code).toBe('DOCUMENT_ALGEBRA_UNAVAILABLE')
    expect((error as DocumentFormatError).message).toMatch(/^ALG_UNKNOWN_DEFINITION: /)
  })
})
