import { type AlgebraInfo } from './algebraDefinition'
import { createPga2Engine, PGA_2D_BASIS } from './pgaEngine'

const DISPLAY_NAMES = ['1', 'e0', 'e1', 'e2', 'e01', 'e02', 'e12', 'e012'] as const

function term(coefficients: readonly number[]): string {
  const index = coefficients.findIndex((coefficient) => coefficient !== 0)
  if (index < 0) return '0'
  const sign = coefficients[index] < 0 ? '−' : ''
  return `${sign}${DISPLAY_NAMES[index]}`
}

/** Blade squares and the Cayley table come from the engine, so they cannot drift from it. */
function tables(): Readonly<{ bladeSquares: string[]; cayley: string[][] }> {
  const engine = createPga2Engine()
  const blades = PGA_2D_BASIS.blades.map((blade) => engine.basisBlade(blade.name))
  return {
    bladeSquares: blades.map((blade) => {
      const square = engine.multiply(blade, blade).coefficients[0]
      return square === 0 ? '0' : square > 0 ? '+1' : '−1'
    }),
    cayley: blades.map((left) => blades.map((right) => term(engine.multiply(left, right).coefficients))),
  }
}

const { bladeSquares, cayley } = tables()

export const PGA_2_INFO: AlgebraInfo = Object.freeze<AlgebraInfo>({
  name: 'Projective Geometric Algebra',
  signature: 'ℝ(2,0,1)',
  description:
    'Plane-based 2D geometry: points, ideal points (directions), lines, the line at infinity, and the rigid motions and reflections that act on them uniformly.',
  blades: DISPLAY_NAMES,
  bladeSquares,
  cayley,
  objects: [
    ['Line', 'a·e1 + b·e2 + c·e0 — the line a·x + b·y + c = 0; the line at infinity when a = b = 0'],
    ['Point', 'w·e12 − x·e02 + y·e01 — the point (x/w, y/w) with weight w'],
    ['Ideal point', 'ipoint(x, y) — the direction (x, y), a point with weight 0'],
    ['Motor', 'even versor — a rotation, translation, or their product'],
    ['Reflection', 'odd versor — a reflection or glide reflection; reflected points carry weight −1'],
    ['Mixed multivector', 'multiple grades without one standard geometric reading'],
  ],
  subalgebras: [
    ['Scalars', '1'],
    ['Complex numbers', '1, e12'],
    ['Dual numbers', '1, e0 (also 1, e01; 1, e02; 1, e012)'],
    ['Even sub-algebra ℝ(2,0,1)⁺', '1, e01, e02, e12 — the rigid motions SE(2)'],
  ],
  notes: [
    'The pseudoscalar e012 is null: duality is the explicit Hodge complement J, never multiplication by e012.',
    'The meet of two lines is their outer product; the join of two points is the regressive product A & B = J(J(A) ^ J(B)).',
    'norm(X) is the Euclidean norm and inorm(X) the ideal norm; normalization divides by the one that classification selected and keeps the sign of the weight.',
    'e20 may be written in source as −e02; display uses the canonical name e02.',
  ],
})
