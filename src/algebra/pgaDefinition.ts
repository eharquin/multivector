import { type AlgebraDefinition } from './algebraDefinition'
import { PGA_2_INFO } from './pga2Info'
import { createPga2Engine } from './pgaEngine'

/**
 * The built-in PGA definition, `definitionVersion: 1`: the PGA(n) family with
 * `dimension` as its only parameter, of which version 1 supports 2 (PGA-001).
 */
export const PGA_DEFINITION: AlgebraDefinition = Object.freeze({
  algebraId: 'org.multivector.pga',
  badge: 'PGA · 2D',
  definitionVersion: 1,
  conventionVersions: [1],
  capabilities: new Set([
    'org.multivector.capability.constructor.point',
    'org.multivector.capability.constructor.ipoint',
    'org.multivector.capability.constructor.line',
    'org.multivector.capability.outer',
    'org.multivector.capability.inner',
    'org.multivector.capability.regressive',
    'org.multivector.capability.dual',
    'org.multivector.capability.reverse',
    'org.multivector.capability.grade-involution',
    'org.multivector.capability.inverse',
    'org.multivector.capability.power',
    'org.multivector.capability.sandwich',
    'org.multivector.capability.norm',
    'org.multivector.capability.inorm',
    'org.multivector.capability.normalize',
    'org.multivector.capability.exp',
    'org.multivector.capability.scalar-functions',
    'org.multivector.capability.pseudoscalar',
  ]),
  validateParameters(parameters) {
    const unknown = Object.keys(parameters).find((key) => key !== 'dimension')
    if (unknown) return { status: 'invalid', message: `unknown parameter “${unknown}”.` }
    const dimension = parameters.dimension ?? 2
    if (dimension !== 2) {
      return {
        status: 'invalid',
        message: `dimension ${String(dimension)} is not supported by definition version 1; only 2 is.`,
      }
    }
    return { status: 'valid', parameters: { dimension: 2 } }
  },
  createEngine() {
    return createPga2Engine()
  },
  info() {
    return PGA_2_INFO
  },
  standardInterpretationId: 'org.multivector.pga-2d',
  standardVisualizerId: 'org.multivector.pga-2d',
  // Two points, the line through them, a fixed line and their meet, an ideal
  // point, a slider-driven rotation about A, a translation, and a reflection.
  // A triangle whose sides are joins: distances are norms of joins, the
  // angle at A comes from the inner product and the meet of two sides, the
  // height from the outer product of a side and the opposite vertex, and the
  // area from the triple join. N is a literal line, movable from the viewport.
  showcase: [
    { source: 'A = point(-2, 1)' },
    { source: 'B = point(2, 2)' },
    { source: 'C = point(1, -2)' },
    { source: 'L = A & B' },
    { source: 'M = A & C' },
    { source: 'dAB = norm(A & B)' },
    { source: 'dBC = norm(B & C)' },
    { source: 'alpha = atan2((L ^ M).e12, L | M)' },
    { source: 'deg = alpha * 180 / pi' },
    { source: 'hC = (L ^ C).e012 / L.norm' },
    { source: 'area = (A & B & C) / 2' },
    { source: 'N = line(1, 0, -1)' },
    { source: 'beta = atan2((L ^ N).e12, L | N)' },
  ],
})
