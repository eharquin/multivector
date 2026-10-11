/**
 * Independent reference fixtures for the PGA(2) convention, version 1.
 *
 * Every expected value was computed by hand from the decision records
 * (`docs/architecture/pga-2d-convention-decisions.md`, and
 * `pga-2d-motor-logarithm-decisions.md` for `log` and `sqrt`) and confirmed by an
 * eight-coefficient `Cl(2,0,1)` product written for that review. Nothing here
 * depends on an engine or a backend: the fixtures exist before the PGA engine
 * so that the engine, and any reference library used to cross-check it, are
 * measured against the specification rather than the other way round.
 *
 * Coefficients follow the canonical storage order `1, e0, e1, e2, e01, e02,
 * e12, e012`.
 */

export const PGA2_BASIS = ['e', 'e0', 'e1', 'e2', 'e01', 'e02', 'e12', 'e012'] as const

export type Pga2Coefficients = readonly [
  number, number, number, number, number, number, number, number,
]

const zero: Pga2Coefficients = [0, 0, 0, 0, 0, 0, 0, 0]

function blades(entries: Partial<Record<(typeof PGA2_BASIS)[number], number>>): Pga2Coefficients {
  const result = [...zero] as [number, number, number, number, number, number, number, number]
  for (const [name, value] of Object.entries(entries)) {
    result[PGA2_BASIS.indexOf(name as (typeof PGA2_BASIS)[number])] = value
  }
  return result
}

/** D3: `line(a, b, c) = a e1 + b e2 + c e0`, the line `a x + b y + c = 0`. */
export const line = (a: number, b: number, c: number): Pga2Coefficients =>
  blades({ e1: a, e2: b, e0: c })

/**
 * D3: `point(x, y, w) = w e12 - x e02 + y e01` with raw homogeneous
 * coordinates: the Euclidean position is `(x / w, y / w)`.
 */
export const point = (x: number, y: number, w = 1): Pga2Coefficients =>
  blades({ e12: w, e02: -x, e01: y })

/** D3: `ipoint(x, y) = point(x, y, 0)`. */
export const ipoint = (x: number, y: number): Pga2Coefficients => point(x, y, 0)

export const scalar = (value: number): Pga2Coefficients => blades({ e: value })
export const scale = (value: Pga2Coefficients, factor: number): Pga2Coefficients =>
  value.map((coefficient) => coefficient * factor) as unknown as Pga2Coefficients
export const blade = (name: (typeof PGA2_BASIS)[number]): Pga2Coefficients => blades({ [name]: 1 })

const HALF_SQRT2 = Math.SQRT1_2

/** D9: `exp(-(theta/2) e12)` for `theta = pi/2`. */
export const rotorQuarterTurn: Pga2Coefficients = blades({ e: HALF_SQRT2, e12: -HALF_SQRT2 })
/** D9: `T(dx, dy) = 1 - (dx/2) e01 - (dy/2) e02`. */
export const translator = (dx: number, dy: number): Pga2Coefficients =>
  blades({ e: 1, e01: -dx / 2, e02: -dy / 2 })
/** D9: `M = T(1, 2) * exp(-(pi/4) e12)`, the rotation by `pi/2` about `(-0.5, 1.5)`. */
export const motorD9: Pga2Coefficients =
  blades({ e: HALF_SQRT2, e12: -HALF_SQRT2, e01: -1.5 * HALF_SQRT2, e02: -0.5 * HALF_SQRT2 })

/**
 * `exp(-(alpha/2) P) = cos(alpha/2) - sin(alpha/2) P` for a bivector `P` with
 * `P * P = -1` (convention section 8): the rotation by `alpha` about `P`.
 */
export const rotation = (alpha: number, centre: Pga2Coefficients): Pga2Coefficients =>
  centre.map((coefficient, index) =>
    (index === 0 ? Math.cos(alpha / 2) : 0) - Math.sin(alpha / 2) * coefficient) as unknown as Pga2Coefficients

export type Pga2Operation =
  | 'product'
  | 'outer'
  | 'regressive'
  | 'dual'
  | 'reverse'
  | 'sandwich'
  | 'exp'
  | 'log'
  | 'sqrt'

export type Pga2OperationFixture = Readonly<{
  id: string
  family: 'algebra' | 'incidence' | 'meet' | 'duality' | 'join' | 'versor-even' | 'versor-odd' | 'equivalence'
    | 'motor-log' | 'motor-sqrt'
  decision: string
  description: string
  operation: Pga2Operation
  operands: readonly Pga2Coefficients[]
  expected: Pga2Coefficients
}>

export type Pga2Classification =
  | 'euclidean-point'
  | 'ideal-point'
  | 'euclidean-line'
  | 'line-at-infinity'
  | 'zero'

export type Pga2ClassificationFixture = Readonly<{
  id: string
  decision: string
  description: string
  value: Pga2Coefficients
  euclideanNorm: number
  idealNorm: number
  classification: Pga2Classification
  /** Normalized value under D8, or `null` when the value is zero. */
  normalized: Pga2Coefficients | null
  /** Euclidean position read back under D3, when the value is a Euclidean point. */
  position?: Readonly<{ x: number; y: number }>
}>

export const PGA2_OPERATION_FIXTURES: readonly Pga2OperationFixture[] = [
  // Algebra
  {
    id: 'algebra-e1-e2', family: 'algebra', decision: 'D2',
    description: 'e1 * e2 = e12',
    operation: 'product', operands: [blade('e1'), blade('e2')], expected: blade('e12'),
  },
  {
    id: 'algebra-e0-null', family: 'algebra', decision: 'D2',
    description: 'e0 * e0 = 0',
    operation: 'product', operands: [blade('e0'), blade('e0')], expected: zero,
  },
  {
    id: 'algebra-pseudoscalar-null', family: 'algebra', decision: 'D2',
    description: 'e012 * e012 = 0, so I is not an invertible duality operator',
    operation: 'product', operands: [blade('e012'), blade('e012')], expected: zero,
  },
  {
    id: 'algebra-e12-e02', family: 'algebra', decision: 'D2',
    description: 'e12 * e02 = e01',
    operation: 'product', operands: [blade('e12'), blade('e02')], expected: blade('e01'),
  },
  {
    id: 'algebra-point-square', family: 'algebra', decision: 'D9',
    description: 'a normalized Euclidean point squares to -1',
    operation: 'product', operands: [point(2, 1), point(2, 1)], expected: scalar(-1),
  },
  {
    id: 'algebra-reverse-e012', family: 'algebra', decision: 'D9',
    description: 'reverse negates grade 3',
    operation: 'reverse', operands: [blade('e012')], expected: blades({ e012: -1 }),
  },
  // Incidence
  {
    id: 'incidence-on', family: 'incidence', decision: 'D4',
    description: 'point(2, 2) lies on x - y = 0',
    operation: 'outer', operands: [line(1, -1, 0), point(2, 2)], expected: zero,
  },
  {
    id: 'incidence-off', family: 'incidence', decision: 'D4',
    description: 'point(1, 0) is off x - y = 0 by 1',
    operation: 'outer', operands: [line(1, -1, 0), point(1, 0)], expected: blade('e012'),
  },
  {
    id: 'incidence-weighted', family: 'incidence', decision: 'D4',
    description: 'L ^ P = (a x + b y + c w) e012 with w = 2',
    operation: 'outer', operands: [line(1, 1, 1), point(1, 1, 2)], expected: blades({ e012: 4 }),
  },
  // Meet
  {
    id: 'meet-finite', family: 'meet', decision: 'D4',
    description: 'x = 1 meets y = 2 at point(1, 2)',
    operation: 'outer', operands: [line(1, 0, -1), line(0, 1, -2)], expected: point(1, 2),
  },
  {
    id: 'meet-parallel', family: 'meet', decision: 'D4',
    description: 'x = 1 and x = 2 meet at the ideal point ipoint(0, 1)',
    operation: 'outer', operands: [line(1, 0, -1), line(1, 0, -2)], expected: ipoint(0, 1),
  },
  {
    id: 'meet-coincident', family: 'meet', decision: 'D4',
    description: 'a line and a multiple of itself meet in zero',
    operation: 'outer', operands: [line(1, 2, 3), line(2, 4, 6)], expected: zero,
  },
  {
    id: 'meet-general', family: 'meet', decision: 'D4',
    description: 'x + y = 2 meets x - y = 0 at (1, 1) with weight -2',
    operation: 'outer', operands: [line(1, 1, -2), line(1, -1, 0)], expected: scale(point(1, 1), -2),
  },
  // Duality: the explicit Hodge complement J, e_A ^ J(e_A) = e012.
  ...([
    ['e', blades({ e012: 1 })],
    ['e0', blades({ e12: 1 })],
    ['e1', blades({ e02: -1 })],
    ['e2', blades({ e01: 1 })],
    ['e01', blades({ e2: 1 })],
    ['e02', blades({ e1: -1 })],
    ['e12', blades({ e0: 1 })],
    ['e012', blades({ e: 1 })],
  ] as const).map(([name, expected]): Pga2OperationFixture => ({
    id: `dual-${name}`, family: 'duality', decision: 'D5',
    description: `J(${name})`,
    operation: 'dual', operands: [blade(name)], expected,
  })),
  {
    id: 'dual-involution', family: 'duality', decision: 'D5',
    description: 'J(J(e1 + 2 e02)) returns the value',
    operation: 'dual', operands: [blades({ e02: -1, e1: -2 })], expected: blades({ e1: 1, e02: 2 }),
  },
  {
    id: 'dual-complement-e1', family: 'duality', decision: 'D5',
    description: 'e1 ^ J(e1) = e012',
    operation: 'outer', operands: [blade('e1'), blades({ e02: -1 })], expected: blade('e012'),
  },
  // Join
  {
    id: 'join-diagonal', family: 'join', decision: 'D6',
    description: 'point(0, 0) & point(1, 1) is the line -x + y = 0',
    operation: 'regressive', operands: [point(0, 0), point(1, 1)], expected: line(-1, 1, 0),
  },
  {
    id: 'join-vertical', family: 'join', decision: 'D6',
    description: 'point(1, 0) & point(1, 1) is the line x = 1, as -x + 1 = 0',
    operation: 'regressive', operands: [point(1, 0), point(1, 1)], expected: line(-1, 0, 1),
  },
  {
    id: 'join-swapped', family: 'join', decision: 'D6',
    description: 'swapping the points negates the line',
    operation: 'regressive', operands: [point(1, 1), point(1, 0)], expected: line(1, 0, -1),
  },
  {
    id: 'join-coincident', family: 'join', decision: 'D6',
    description: 'a point joined with itself is zero',
    operation: 'regressive', operands: [point(3, -2), point(3, -2)], expected: zero,
  },
  {
    id: 'join-ideal', family: 'join', decision: 'D6',
    description: 'point(0, 0) & ipoint(1, 0) is the x axis, y = 0, oriented as +e2',
    operation: 'regressive', operands: [point(0, 0), ipoint(1, 0)], expected: line(0, 1, 0),
  },
  // Even versors
  {
    id: 'rotor-quarter-turn-vga', family: 'versor-even', decision: 'D9',
    description: 'exp(-(pi/4) e12) >>> e1 = e2, the VGA reference case',
    operation: 'sandwich', operands: [rotorQuarterTurn, blade('e1')], expected: blade('e2'),
  },
  {
    id: 'rotor-quarter-turn-point', family: 'versor-even', decision: 'D9',
    description: 'exp(-(pi/4) e12) >>> point(1, 0) = point(0, 1)',
    operation: 'sandwich', operands: [rotorQuarterTurn, point(1, 0)], expected: point(0, 1),
  },
  {
    id: 'rotor-exp', family: 'versor-even', decision: 'D9',
    description: 'exp(-(pi/4) e12) = cos(pi/4) - sin(pi/4) e12',
    operation: 'exp', operands: [blades({ e12: -Math.PI / 4 })], expected: rotorQuarterTurn,
  },
  {
    id: 'rotor-about-point', family: 'versor-even', decision: 'D9',
    description: 'half turn about point(2, 1) sends point(3, 1) to point(1, 1)',
    operation: 'sandwich',
    operands: [blades({ e: Math.cos(Math.PI / 2), e12: -Math.sin(Math.PI / 2), e02: 2 * Math.sin(Math.PI / 2), e01: -Math.sin(Math.PI / 2) }), point(3, 1)],
    expected: point(1, 1),
  },
  {
    id: 'translator-exp', family: 'versor-even', decision: 'D9',
    description: 'exp(-(1/2) e0 (3 e1)) = 1 - 1.5 e01 = T(3, 0)',
    operation: 'exp', operands: [blades({ e01: -1.5 })], expected: translator(3, 0),
  },
  {
    id: 'translator-origin', family: 'versor-even', decision: 'D9',
    description: 'T(3, 0) >>> point(0, 0) = point(3, 0)',
    operation: 'sandwich', operands: [translator(3, 0), point(0, 0)], expected: point(3, 0),
  },
  {
    id: 'translator-general', family: 'versor-even', decision: 'D9',
    description: 'T(1, 2) >>> point(1, 1) = point(2, 3)',
    operation: 'sandwich', operands: [translator(1, 2), point(1, 1)], expected: point(2, 3),
  },
  {
    id: 'translator-ideal-exponent', family: 'versor-even', decision: 'D9',
    description: '(1 + ipoint(1, 0)) >>> point(0, 0) = point(0, 2): an ideal point translates perpendicular to its direction',
    operation: 'sandwich', operands: [blades({ e: 1, e02: -1 }), point(0, 0)], expected: point(0, 2),
  },
  {
    id: 'motor-product', family: 'versor-even', decision: 'D9',
    description: 'M = T(1, 2) * exp(-(pi/4) e12)',
    operation: 'product', operands: [translator(1, 2), rotorQuarterTurn],
    expected: motorD9,
  },
  {
    id: 'motor-action', family: 'versor-even', decision: 'D9',
    description: '(T(1, 2) * exp(-(pi/4) e12)) >>> point(1, 0) = point(1, 3): rotate, then translate',
    operation: 'sandwich',
    operands: [motorD9, point(1, 0)],
    expected: point(1, 3),
  },
  // Odd versors
  {
    id: 'reflect-point-in-y-axis', family: 'versor-odd', decision: 'D9',
    description: 'e1 >>> point(1, 0) = -point(-1, 0): reflected point with weight -1',
    operation: 'sandwich', operands: [blade('e1'), point(1, 0)], expected: scale(point(-1, 0), -1),
  },
  {
    id: 'reflect-point-in-x-axis', family: 'versor-odd', decision: 'D9',
    description: 'line(0, 1, 0) >>> point(0, 1) = -point(0, -1)',
    operation: 'sandwich', operands: [line(0, 1, 0), point(0, 1)], expected: scale(point(0, -1), -1),
  },
  {
    id: 'reflect-line-in-line', family: 'versor-odd', decision: 'D9',
    description: 'e1 >>> line(1, 1, 0) = line(1, -1, 0)',
    operation: 'sandwich', operands: [blade('e1'), line(1, 1, 0)], expected: line(1, -1, 0),
  },
  {
    id: 'glide-product', family: 'versor-odd', decision: 'D9',
    description: 'G = T(1, 0) * e2 = e2 - (1/2) e012',
    operation: 'product', operands: [translator(1, 0), blade('e2')], expected: blades({ e2: 1, e012: -0.5 }),
  },
  {
    id: 'glide-unit', family: 'versor-odd', decision: 'D9',
    description: 'G * ~G = 1',
    operation: 'product', operands: [blades({ e2: 1, e012: -0.5 }), blades({ e2: 1, e012: 0.5 })], expected: scalar(1),
  },
  {
    id: 'glide-action', family: 'versor-odd', decision: 'D9',
    description: 'G >>> point(0, 1) = -point(1, -1)',
    operation: 'sandwich', operands: [blades({ e2: 1, e012: -0.5 }), point(0, 1)], expected: scale(point(1, -1), -1),
  },
  // Motor logarithm and square root (motor-logarithm decision record D13, D14)
  {
    id: 'log-rotor', family: 'motor-log', decision: 'D13',
    description: 'log(exp(-(pi/4) e12)) = -(pi/4) e12: the half-angle generator',
    operation: 'log', operands: [rotorQuarterTurn], expected: blades({ e12: -Math.PI / 4 }),
  },
  {
    id: 'log-rotor-negative-scalar', family: 'motor-log', decision: 'D13',
    description: 'log(exp(-(3 pi/4) e12)) = -(3 pi/4) e12 although the scalar part is negative',
    operation: 'log', operands: [rotation(1.5 * Math.PI, blade('e12'))], expected: blades({ e12: -0.75 * Math.PI }),
  },
  {
    id: 'log-rotation-about-point', family: 'motor-log', decision: 'D13',
    description: 'log(exp(-(pi/2) point(2, 1))) = -(pi/2) point(2, 1): the centre weighted by -alpha/2',
    operation: 'log', operands: [scale(point(2, 1), -1)], expected: scale(point(2, 1), -Math.PI / 2),
  },
  {
    id: 'log-translator', family: 'motor-log', decision: 'D13',
    description: 'log(1 - 1.5 e01) = -1.5 e01 = ipoint(0, -1.5), exactly',
    operation: 'log', operands: [translator(3, 0)], expected: ipoint(0, -1.5),
  },
  {
    id: 'log-general-motor', family: 'motor-log', decision: 'D13',
    description: 'log(T(1, 2) * exp(-(pi/4) e12)) = -(pi/4) point(-0.5, 1.5)',
    operation: 'log', operands: [motorD9], expected: scale(point(-0.5, 1.5), -Math.PI / 4),
  },
  {
    id: 'log-principal-branch', family: 'motor-log', decision: 'D13',
    description: 'log(exp(1.5 pi e12)) = log(-e12) = -(pi/2) e12, not 1.5 pi e12',
    operation: 'log', operands: [blades({ e12: -1 })], expected: blades({ e12: -Math.PI / 2 }),
  },
  {
    id: 'sqrt-rotor', family: 'motor-sqrt', decision: 'D14',
    description: 'sqrt(exp(-(pi/4) e12)) = exp(-(pi/8) e12)',
    operation: 'sqrt', operands: [rotorQuarterTurn], expected: rotation(Math.PI / 4, blade('e12')),
  },
  {
    id: 'sqrt-rotor-negative-scalar', family: 'motor-sqrt', decision: 'D14',
    description: 'sqrt(exp(-(3 pi/4) e12)) = exp(-(3 pi/8) e12), the principal half',
    operation: 'sqrt', operands: [rotation(1.5 * Math.PI, blade('e12'))], expected: rotation(0.75 * Math.PI, blade('e12')),
  },
  {
    id: 'sqrt-rotation-about-point', family: 'motor-sqrt', decision: 'D14',
    description: 'sqrt(-point(2, 1)) = (1 - point(2, 1)) / sqrt(2) = exp(-(pi/4) point(2, 1))',
    operation: 'sqrt', operands: [scale(point(2, 1), -1)], expected: rotation(Math.PI / 2, point(2, 1)),
  },
  {
    id: 'sqrt-translator', family: 'motor-sqrt', decision: 'D14',
    description: 'sqrt(1 - 1.5 e01) = 1 - 0.75 e01, half the translation',
    operation: 'sqrt', operands: [translator(3, 0)], expected: translator(1.5, 0),
  },
  {
    id: 'sqrt-general-motor', family: 'motor-sqrt', decision: 'D14',
    description: 'sqrt(T(1, 2) * exp(-(pi/4) e12)) = exp(-(pi/8) point(-0.5, 1.5))',
    operation: 'sqrt', operands: [motorD9], expected: rotation(Math.PI / 4, point(-0.5, 1.5)),
  },
]

/**
 * Arguments that `log` and `sqrt` refuse (D12, D16): non-unit, odd, mixed,
 * and branch-cut values. `ganjaLog` is what ganja.js `Log` returns without a
 * diagnostic (`'non-finite'` for NaN coefficients); it must not be adopted.
 */
export type Pga2MotorRefusalFixture = Readonly<{
  id: string
  function: 'log' | 'sqrt'
  reason: 'unit-motor' | 'branch-cut'
  value: Pga2Coefficients
  ganjaLog?: Pga2Coefficients | 'non-finite'
}>

export const PGA2_MOTOR_REFUSAL_FIXTURES: readonly Pga2MotorRefusalFixture[] = [
  { id: 'log-negated-translator', function: 'log', reason: 'branch-cut', value: scale(translator(3, 0), -1), ganjaLog: blades({ e01: 1.5 }) },
  { id: 'sqrt-negated-translator', function: 'sqrt', reason: 'branch-cut', value: scale(translator(3, 0), -1) },
  { id: 'log-scaled-rotor', function: 'log', reason: 'unit-motor', value: scale(rotorQuarterTurn, 2), ganjaLog: 'non-finite' },
  { id: 'log-null-bivector', function: 'log', reason: 'unit-motor', value: blade('e01'), ganjaLog: blade('e01') },
  { id: 'log-line', function: 'log', reason: 'unit-motor', value: blade('e1') },
  { id: 'sqrt-line', function: 'sqrt', reason: 'unit-motor', value: line(1, 0, -1) },
  { id: 'log-mixed', function: 'log', reason: 'unit-motor', value: blades({ e: 1, e1: 1 }) },
]

export const PGA2_CLASSIFICATION_FIXTURES: readonly Pga2ClassificationFixture[] = [
  {
    id: 'classify-euclidean-point', decision: 'D8',
    description: '2 * point(1, 2) is the Euclidean point (1, 2) with weight 2',
    value: scale(point(1, 2), 2), euclideanNorm: 2, idealNorm: Math.sqrt(20),
    classification: 'euclidean-point', normalized: point(1, 2), position: { x: 1, y: 2 },
  },
  {
    id: 'classify-negative-weight', decision: 'D7',
    description: '-point(-1, 0) is the Euclidean point (-1, 0) with weight -1; normalization keeps the orientation sign',
    value: scale(point(-1, 0), -1), euclideanNorm: 1, idealNorm: 1,
    classification: 'euclidean-point', normalized: scale(point(-1, 0), -1), position: { x: -1, y: 0 },
  },
  {
    id: 'classify-ideal-point', decision: 'D8',
    description: 'ipoint(3, 4) is ideal with ideal norm 5',
    value: ipoint(3, 4), euclideanNorm: 0, idealNorm: 5,
    classification: 'ideal-point', normalized: ipoint(0.6, 0.8),
  },
  {
    id: 'classify-euclidean-line', decision: 'D8',
    description: '3x + 4y - 10 = 0 normalizes to a^2 + b^2 = 1',
    value: line(3, 4, -10), euclideanNorm: 5, idealNorm: 10,
    classification: 'euclidean-line', normalized: line(0.6, 0.8, -2),
  },
  {
    id: 'classify-line-at-infinity', decision: 'D8',
    description: 'line(0, 0, -2) is the line at infinity with ideal norm 2',
    value: line(0, 0, -2), euclideanNorm: 0, idealNorm: 2,
    classification: 'line-at-infinity', normalized: line(0, 0, -1),
  },
  {
    id: 'classify-zero', decision: 'D8',
    description: 'the zero value has no norm and is never normalized',
    value: zero, euclideanNorm: 0, idealNorm: 0,
    classification: 'zero', normalized: null,
  },
]
