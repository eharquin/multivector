import type { VisualizerDescriptor } from '../algebra/registry'

/** The SVG 2D visualizer of the VGA foundation: oriented segments and areas. */
export const VGA_2D_VISUALIZER: VisualizerDescriptor = Object.freeze({
  visualizerId: 'org.multivector.vga-2d',
  primitiveKinds: new Set(['oriented-segment', 'oriented-area']),
})
