import { VGA_2D_INTERPRETATION } from '../geometry/vga2Interpretation'
import { createAlgebraRegistry, type AlgebraRegistry } from './registry'
import { VGA_DEFINITION } from './vgaDefinition'

/** The registry of definitions shipped with this runtime. */
export function createBuiltinAlgebraRegistry(): AlgebraRegistry {
  const registry = createAlgebraRegistry()
  registry.register(VGA_DEFINITION)
  registry.registerInterpretation(VGA_2D_INTERPRETATION as unknown as Parameters<AlgebraRegistry['registerInterpretation']>[0])
  return registry
}
