/**
 * The built-in scalar functions of language section 10 and `atan2`: their
 * arities, their domain rules, and their numeric evaluation. Arguments and
 * results are plain numbers on the common scalar boundary; the engines wrap
 * them and reject non-finite results.
 */

type ScalarFunction = Readonly<{
  arity: number
  /** A domain diagnostic message, or null when the arguments are admissible. */
  domainError(args: readonly number[]): string | null
  apply(args: readonly number[]): number
}>

const admissible = () => null

/** The comparison bound of the tangent pole rule, relative to the magnitudes involved. */
function nearTangentPole(scalar: number): boolean {
  const nearestPole = Math.PI / 2 + Math.round((scalar - Math.PI / 2) / Math.PI) * Math.PI
  const tolerance = 64 * Number.EPSILON * Math.max(1, Math.abs(scalar), Math.abs(nearestPole))
  return Math.abs(scalar - nearestPole) <= tolerance
}

export const SCALAR_FUNCTIONS = {
  abs: { arity: 1, domainError: admissible, apply: ([x]) => Math.abs(x) },
  sqrt: {
    arity: 1,
    domainError: ([x]) => (x < 0 ? 'The square root requires a non-negative scalar value.' : null),
    apply: ([x]) => Math.sqrt(x),
  },
  log: {
    arity: 1,
    domainError: ([x]) => (x <= 0 ? 'The logarithm requires a positive scalar value.' : null),
    apply: ([x]) => Math.log(x),
  },
  sin: { arity: 1, domainError: admissible, apply: ([x]) => Math.sin(x) },
  cos: { arity: 1, domainError: admissible, apply: ([x]) => Math.cos(x) },
  tan: {
    arity: 1,
    domainError: ([x]) => (nearTangentPole(x) ? 'The tangent is undefined at this scalar value.' : null),
    apply: ([x]) => Math.tan(x),
  },
  sinh: { arity: 1, domainError: admissible, apply: ([x]) => Math.sinh(x) },
  cosh: { arity: 1, domainError: admissible, apply: ([x]) => Math.cosh(x) },
  tanh: { arity: 1, domainError: admissible, apply: ([x]) => Math.tanh(x) },
  asin: {
    arity: 1,
    domainError: ([x]) => (Math.abs(x) > 1 ? 'The arc sine requires a scalar value in [-1, 1].' : null),
    apply: ([x]) => Math.asin(x),
  },
  acos: {
    arity: 1,
    domainError: ([x]) => (Math.abs(x) > 1 ? 'The arc cosine requires a scalar value in [-1, 1].' : null),
    apply: ([x]) => Math.acos(x),
  },
  atan: { arity: 1, domainError: admissible, apply: ([x]) => Math.atan(x) },
  atan2: {
    arity: 2,
    domainError: ([y, x]) => (y === 0 && x === 0 ? 'The two-argument arc tangent is undefined at the origin.' : null),
    apply: ([y, x]) => Math.atan2(y, x),
  },
  min: { arity: 2, domainError: admissible, apply: ([a, b]) => Math.min(a, b) },
  max: { arity: 2, domainError: admissible, apply: ([a, b]) => Math.max(a, b) },
} as const satisfies Record<string, ScalarFunction>

export type ScalarFunctionName = keyof typeof SCALAR_FUNCTIONS

export const SCALAR_FUNCTION_NAMES = Object.keys(SCALAR_FUNCTIONS) as readonly ScalarFunctionName[]

export function isScalarFunctionName(name: string): name is ScalarFunctionName {
  return Object.hasOwn(SCALAR_FUNCTIONS, name)
}
