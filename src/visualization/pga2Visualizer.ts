import type { VisualizerDescriptor } from '../algebra/registry'

/** The SVG 2D visualizer of the PGA foundation: point markers, unbounded lines, direction markers. */
export const PGA_2D_VISUALIZER: VisualizerDescriptor = Object.freeze({
  visualizerId: 'org.multivector.pga-2d',
  primitiveKinds: new Set(['point-marker', 'unbounded-line', 'direction-marker']),
})
