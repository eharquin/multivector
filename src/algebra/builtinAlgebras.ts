import { VGA_2D_INTERPRETATION } from '../geometry/vga2Interpretation'
import { VGA_2D_VISUALIZER } from '../visualization/vga2Visualizer'
import { createAlgebraRegistry, type AlgebraRegistry } from './registry'
import { PGA_DEFINITION } from './pgaDefinition'
import { VGA_DEFINITION } from './vgaDefinition'

/** The registry of definitions shipped with this runtime. */
export function createBuiltinAlgebraRegistry(): AlgebraRegistry {
  const registry = createAlgebraRegistry()
  registry.register(VGA_DEFINITION)
  registry.register(PGA_DEFINITION)
  registry.registerInterpretation(VGA_2D_INTERPRETATION as unknown as Parameters<AlgebraRegistry['registerInterpretation']>[0])
  registry.registerVisualizer(VGA_2D_VISUALIZER)
  return registry
}
