import { createAlgebraRegistry, type AlgebraRegistry } from './registry'
import { VGA_DEFINITION } from './vgaDefinition'

/** The registry of definitions shipped with this runtime. */
export function createBuiltinAlgebraRegistry(): AlgebraRegistry {
  const registry = createAlgebraRegistry()
  registry.register(VGA_DEFINITION)
  return registry
}
