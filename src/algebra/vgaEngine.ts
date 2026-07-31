import Algebra from 'ganja.js'
import { ownedMultivector, type OwnedMultivector } from '../domain/multivector'

/**
 * The backend-independent algebra operations required by the VGA(2) evaluator.
 *
 * Implementations return owned values and must not expose backend objects.
 */
export type VgaEngine = Readonly<{
  scalar(value: number): OwnedMultivector
  basisBlade(name: 'e1' | 'e2'): OwnedMultivector
  pseudoscalar(): OwnedMultivector
  add(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  multiply(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  outer(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  inner(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  regressive(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  negate(value: OwnedMultivector): OwnedMultivector
  reverse(value: OwnedMultivector): OwnedMultivector
  dual(value: OwnedMultivector): OwnedMultivector
  gradeInvolution(value: OwnedMultivector): OwnedMultivector
  grade(value: OwnedMultivector, grade: 0 | 1 | 2): OwnedMultivector
  coefficient(
    value: OwnedMultivector,
    blade: 'e' | 'e1' | 'e2' | 'e12',
  ): OwnedMultivector
  divide(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
  power(value: OwnedMultivector, exponent: number): OwnedMultivector
  inverse(value: OwnedMultivector): OwnedMultivector
  sandwich(rotor: OwnedMultivector, value: OwnedMultivector): OwnedMultivector
  norm(value: OwnedMultivector): OwnedMultivector
  normalize(value: OwnedMultivector): NormalizationResult
  exp(value: OwnedMultivector): OwnedMultivector
  scalarFunction(
    name: 'sin' | 'cos' | 'tan' | 'sinh' | 'cosh' | 'tanh',
    value: OwnedMultivector,
  ): OwnedMultivector
}>

export type NormalizationResult =
  | Readonly<{ status: 'normalized'; value: OwnedMultivector }>
  | Readonly<{ status: 'unavailable'; value: OwnedMultivector }>

export class AlgebraOperationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

function finiteOwned(coefficients: readonly number[]): OwnedMultivector {
  try {
    return ownedMultivector(coefficients)
  } catch (error) {
    if (error instanceof RangeError) {
      throw new AlgebraOperationError('ALG_NON_FINITE', 'The operation produced a non-finite coefficient.')
    }
    throw error
  }
}

const Vga2 = Algebra({
  p: 2,
  q: 0,
  r: 0,
  baseType: Float64Array,
})

function toBackend(value: OwnedMultivector): InstanceType<typeof Vga2> {
  return new Vga2(value.coefficients)
}

function fromBackend(
  backendValue: InstanceType<typeof Vga2>,
): OwnedMultivector {
  return finiteOwned([
    backendValue[0],
    backendValue[1],
    backendValue[2],
    backendValue[3],
  ])
}

function outerOwned(
  left: OwnedMultivector,
  right: OwnedMultivector,
): OwnedMultivector {
  const [a, x, y, b] = left.coefficients
  const [c, u, v, d] = right.coefficients
  return finiteOwned([
    a * c,
    a * u + x * c,
    a * v + y * c,
    a * d + x * v - y * u + b * c,
  ])
}

function dualOwned(value: OwnedMultivector): OwnedMultivector {
  const [scalar, e1, e2, e12] = value.coefficients
  return finiteOwned([-e12, -e2, e1, scalar])
}

function multiplyOwned(
  left: OwnedMultivector,
  right: OwnedMultivector,
): OwnedMultivector {
  const [a, x, y, b] = left.coefficients
  const [c, u, v, d] = right.coefficients
  return finiteOwned([
    a * c + x * u + y * v - b * d,
    a * u + x * c - y * d + b * v,
    a * v + y * c + x * d - b * u,
    a * d + x * v - y * u + b * c,
  ])
}

function scaleOwned(value: OwnedMultivector, scale: number): OwnedMultivector {
  return finiteOwned(
    value.coefficients.map((coefficient) => coefficient * scale),
  )
}

function inverseOwned(value: OwnedMultivector): OwnedMultivector {
  const [a, x, y, b] = value.coefficients
  const determinant = a * a - x * x - y * y + b * b
  if (!Number.isFinite(determinant)) {
    throw new AlgebraOperationError(
      'ALG_NON_FINITE',
      'The inverse calculation produced a non-finite intermediate value.',
    )
  }
  if (determinant === 0) {
    throw new AlgebraOperationError('ALG_SINGULAR', 'This multivector is not invertible.')
  }
  return scaleOwned(finiteOwned([a, -x, -y, -b]), 1 / determinant)
}

function powerOwned(
  value: OwnedMultivector,
  exponent: number,
): OwnedMultivector {
  if (!Number.isSafeInteger(exponent)) {
    throw new AlgebraOperationError(
      'ALG_DOMAIN',
      'A geometric power exponent must be a safe integer.',
    )
  }
  if (exponent < 0) return powerOwned(inverseOwned(value), -exponent)
  let result = finiteOwned([1, 0, 0, 0])
  let factor = value
  let remaining = exponent
  while (remaining > 0) {
    if (remaining % 2 === 1) result = multiplyOwned(result, factor)
    remaining = Math.floor(remaining / 2)
    if (remaining > 0) factor = multiplyOwned(factor, factor)
  }
  return result
}

function normScalar(value: OwnedMultivector): number {
  const [a, x, y, b] = value.coefficients
  const squaredNorm = a * a - x * x - y * y + b * b
  if (!Number.isFinite(squaredNorm)) {
    throw new AlgebraOperationError(
      'ALG_NON_FINITE',
      'The norm calculation produced a non-finite intermediate value.',
    )
  }
  return Math.sqrt(Math.abs(squaredNorm))
}

/**
 * Creates the ganja.js-backed VGA(2) adapter using signature `(2, 0, 0)`.
 *
 * Every result is copied out of ganja.js before it crosses this boundary.
 */
export function createVga2Engine(): VgaEngine {
  return {
    scalar(value) {
      return fromBackend(new Vga2([value, 0, 0, 0]))
    },
    basisBlade(name) {
      return fromBackend(
        new Vga2(name === 'e1' ? [0, 1, 0, 0] : [0, 0, 1, 0]),
      )
    },
    pseudoscalar() {
      return finiteOwned([0, 0, 0, 1])
    },
    add(left, right) {
      return fromBackend(toBackend(left).Add(toBackend(right)))
    },
    multiply(left, right) {
      return fromBackend(toBackend(left).Mul(toBackend(right)))
    },
    outer(left, right) {
      return outerOwned(left, right)
    },
    inner(left, right) {
      const [a, x, y, b] = left.coefficients
      const [c, u, v, d] = right.coefficients
      return finiteOwned([
        a * c + x * u + y * v - b * d,
        a * u + x * c - y * d + b * v,
        a * v + y * c + x * d - b * u,
        a * d + b * c,
      ])
    },
    regressive(left, right) {
      return dualOwned(outerOwned(dualOwned(left), dualOwned(right)))
    },
    negate(value) {
      return fromBackend(toBackend(value).Scale(-1))
    },
    reverse(value) {
      const [scalar, e1, e2, e12] = value.coefficients
      return finiteOwned([scalar, e1, e2, -e12])
    },
    dual(value) {
      return dualOwned(value)
    },
    gradeInvolution(value) {
      const [scalar, e1, e2, e12] = value.coefficients
      return finiteOwned([scalar, -e1, -e2, e12])
    },
    grade(value, grade) {
      const [scalar, e1, e2, e12] = value.coefficients
      if (grade === 0) return finiteOwned([scalar, 0, 0, 0])
      if (grade === 1) return finiteOwned([0, e1, e2, 0])
      return finiteOwned([0, 0, 0, e12])
    },
    coefficient(value, blade) {
      const index = { e: 0, e1: 1, e2: 2, e12: 3 }[blade]
      return finiteOwned([value.coefficients[index], 0, 0, 0])
    },
    divide(left, right) {
      return multiplyOwned(left, inverseOwned(right))
    },
    power(value, exponent) {
      return powerOwned(value, exponent)
    },
    inverse(value) {
      return inverseOwned(value)
    },
    sandwich(rotor, value) {
      const [a, x, y, b] = rotor.coefficients
      const reversed = finiteOwned([a, x, y, -b])
      return multiplyOwned(multiplyOwned(rotor, value), reversed)
    },
    norm(value) {
      return finiteOwned([normScalar(value), 0, 0, 0])
    },
    normalize(value) {
      const norm = normScalar(value)
      if (norm === 0) {
        return { status: 'unavailable', value }
      }
      return { status: 'normalized', value: scaleOwned(value, 1 / norm) }
    },
    exp(value) {
      const [a, x, y, b] = value.coefficients
      if (x === 0 && y === 0 && b === 0) {
        return finiteOwned([Math.exp(a), 0, 0, 0])
      }
      const square = multiplyOwned(value, value)
      if (square.coefficients.slice(1).some((coefficient) => coefficient !== 0)) {
        throw new AlgebraOperationError(
          'ALG_UNSUPPORTED_DOMAIN',
          'This multivector exponential is outside the supported closed forms.',
        )
      }
      const s = square.coefficients[0]
      if (s === 0) return finiteOwned([1+a, x, y, b])
      const magnitude = Math.sqrt(Math.abs(s))
      const scalarPart = s < 0 ? Math.cos(magnitude) : Math.cosh(magnitude)
      const factor =
        (s < 0 ? Math.sin(magnitude) : Math.sinh(magnitude)) / magnitude
      const scaled = scaleOwned(value, factor)
      return finiteOwned([
        scalarPart + scaled.coefficients[0],
        ...scaled.coefficients.slice(1),
      ])
    },
    scalarFunction(name, value) {
      if (value.coefficients.slice(1).some((coefficient) => coefficient !== 0)) {
        throw new AlgebraOperationError(
          'ALG_DOMAIN',
          `The function “${name}” requires a scalar argument.`,
        )
      }
      const scalar = value.coefficients[0]
      if (name === 'tan') {
        const nearestPole =
          Math.PI / 2 +
          Math.round((scalar - Math.PI / 2) / Math.PI) * Math.PI
        const tolerance =
          64 *
          Number.EPSILON *
          Math.max(1, Math.abs(scalar), Math.abs(nearestPole))
        if (Math.abs(scalar - nearestPole) <= tolerance) {
          throw new AlgebraOperationError(
            'ALG_DOMAIN',
            'The tangent is undefined at this scalar value.',
          )
        }
      }
      const functions = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        sinh: Math.sinh,
        cosh: Math.cosh,
        tanh: Math.tanh,
      }
      return finiteOwned([functions[name](scalar), 0, 0, 0])
    },
  }
}
