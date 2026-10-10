import type { VisualizerDescriptor } from '../algebra/registry'

/** The SVG 2D visualizer of the VGA foundation: oriented segments and areas. */
export const VGA_2D_VISUALIZER: VisualizerDescriptor = Object.freeze<VisualizerDescriptor>({
  visualizerId: 'org.multivector.vga-2d',
  primitiveKinds: new Set(['oriented-segment', 'oriented-area']),
  regionName: 'VGA 2D viewport',
  canvasName: 'Two-dimensional VGA viewport',
  describedKinds: [
    { kind: 'oriented-segment', singular: 'vector', plural: 'vectors' },
    { kind: 'oriented-area', singular: 'bivector', plural: 'bivectors' },
  ],
})
