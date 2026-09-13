import { describe, expect, it } from 'vitest'
import { createBuiltinAlgebraRegistry } from './builtinAlgebras'
import { createAlgebraRegistry } from './registry'
import { VGA_DEFINITION } from './vgaDefinition'

const vga = (overrides: Partial<Parameters<ReturnType<typeof createAlgebraRegistry>['resolve']>[0]> = {}) => ({
  algebraId: 'org.multivector.vga',
  definitionVersion: 1,
  conventionVersion: 1,
  parameters: {},
  ...overrides,
})

describe('algebra registry', () => {
  it('resolves the built-in VGA definition to an engine with the VGA(2) basis', () => {
    const resolution = createBuiltinAlgebraRegistry().resolve(vga())
    expect(resolution.status).toBe('resolved')
    if (resolution.status !== 'resolved') return
    expect(resolution.definition).toBe(VGA_DEFINITION)
    expect(resolution.engine.basis.blades.map((blade) => blade.name)).toEqual(['e', 'e1', 'e2', 'e12'])
    expect(resolution.definition.standardInterpretationId).toBe('org.multivector.vga-2d')
  })

  it('reports an unknown definition without substituting another algebra', () => {
    const resolution = createBuiltinAlgebraRegistry().resolve(vga({ algebraId: 'org.example.cga' }))
    expect(resolution).toMatchObject({ status: 'unavailable', code: 'ALG_UNKNOWN_DEFINITION' })
  })

  it('reports unsupported definition and convention versions', () => {
    const registry = createBuiltinAlgebraRegistry()
    expect(registry.resolve(vga({ definitionVersion: 2 })))
      .toMatchObject({ status: 'unavailable', code: 'ALG_UNSUPPORTED_DEFINITION_VERSION' })
    expect(registry.resolve(vga({ conventionVersion: 3 })))
      .toMatchObject({ status: 'unavailable', code: 'ALG_UNSUPPORTED_CONVENTION_VERSION' })
  })

  it('rejects unknown parameters as invalid', () => {
    const resolution = createBuiltinAlgebraRegistry().resolve(vga({ parameters: { dimension: 3 } }))
    expect(resolution).toMatchObject({ status: 'unavailable', code: 'ALG_INVALID_PARAMETERS' })
    if (resolution.status === 'unavailable') expect(resolution.message).toContain('dimension')
  })

  it('refuses to register the same identifier twice', () => {
    const registry = createAlgebraRegistry()
    registry.register(VGA_DEFINITION)
    expect(() => registry.register(VGA_DEFINITION)).toThrow(/already registered/)
    expect(registry.definitions()).toHaveLength(1)
  })
})
