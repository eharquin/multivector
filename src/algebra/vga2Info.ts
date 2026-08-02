export const VGA_2_INFO = Object.freeze({
  name: 'Vectorial Geometric Algebra',
  signature: 'ℝ(2,0,0)',
  description:
    'Vector-based 2D geometry: scalars, vectors, bivectors (oriented areas), and rotors. No points or lines—only directions, areas, and rotations.',
  blades: ['1', 'e1', 'e2', 'e12'] as const,
  bladeSquares: ['+1', '+1', '+1', '−1'] as const,
  cayley: [
    ['1', 'e1', 'e2', 'e12'],
    ['e1', '1', 'e12', 'e2'],
    ['e2', '−e12', '1', '−e1'],
    ['e12', '−e2', 'e1', '−1'],
  ] as const,
  objects: [
    ['Scalar', 'a'],
    ['Vector', 'a·e1 + b·e2 — positionable direction'],
    ['Bivector', 's·e12 — signed oriented area with a separate position'],
    ['Rotor', 'a + b·e12 — even multivector'],
    ['Mixed multivector', 'multiple grades without one standard geometric reading'],
  ] as const,
  subalgebras: [
    ['Scalars', '1'],
    ['Even sub-algebra ℝ(2,0,0)⁺', '1, e12 (≅ complex numbers ℂ)'],
  ] as const,
  notes: [
    'The even sub-algebra {1, e12} is isomorphic to the complex numbers ℂ, with e12 playing the role of the imaginary unit.',
    'VGA has no projective representation: it encodes directions and oriented areas, not points or lines.',
    'Bivectors render as positioned oriented-area loops; direct named-vector outer products may render as parallelograms with the same area.',
  ] as const,
})
