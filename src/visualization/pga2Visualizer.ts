import type { VisualizerDescriptor } from '../algebra/registry'

/** The SVG 2D visualizer of the PGA foundation: point markers, unbounded lines, ideal points, and the line at infinity. */
export const PGA_2D_VISUALIZER: VisualizerDescriptor = Object.freeze<VisualizerDescriptor>({
  visualizerId: 'org.multivector.pga-2d',
  primitiveKinds: new Set(['point-marker', 'unbounded-line', 'ideal-point', 'line-at-infinity']),
  regionName: 'PGA 2D viewport',
  canvasName: 'Two-dimensional PGA viewport',
  describedKinds: [
    { kind: 'point-marker', singular: 'point', plural: 'points' },
    { kind: 'unbounded-line', singular: 'line', plural: 'lines' },
    { kind: 'ideal-point', singular: 'ideal point', plural: 'ideal points' },
    { kind: 'line-at-infinity', singular: 'line at infinity', plural: 'lines at infinity' },
  ],
})
