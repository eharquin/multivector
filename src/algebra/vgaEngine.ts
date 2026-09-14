import Algebra from 'ganja.js'
import { bladeIndex, createAlgebraBasis } from '../domain/algebraBasis'
import { ownedMultivector, type OwnedMultivector } from '../domain/multivector'
import {
  AlgebraOperationError,
  type AlgebraEngine,
} from './algebraEngine'
import { scalarFunctionValue } from './engineSupport'

/** Canonical VGA(2) basis: `e, e1, e2, e12`. */
export const VGA_2D_BASIS = createAlgebraBasis([1, 2])

/**
 * The backend-independent algebra operations required by the VGA(2) evaluator.
 *
 * Implementations return owned values and must not expose backend objects.
 */
function finiteOwned(coefficients: readonly number[]): OwnedMultivector {
  try {
    return ownedMultivector(coefficients, VGA_2D_BASIS)
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
export function createVga2Engine(): AlgebraEngine {
  const basis = VGA_2D_BASIS
  const indexOf = (blade: string): number => {
    const index = bladeIndex(basis, blade)
    if (index < 0) {
      throw new AlgebraOperationError(
        'ALG_UNKNOWN_BLADE',
        `The blade “${blade}” does not exist in this algebra.`,
      )
    }
    return index
  }
  const unit = (index: number): number[] =>
    basis.blades.map((_, position) => (position === index ? 1 : 0))
  const scalarArgument = (value: OwnedMultivector, label: string): number => {
    if (value.coefficients.slice(1).some((coefficient) => coefficient !== 0)) {
      throw new AlgebraOperationError('ALG_DOMAIN', `${label} must be scalar.`)
    }
    return value.coefficients[0]
  }
  return {
    basis,
    functions: new Map([['vector', [2]]]),
    call(name, args) {
      if (name !== 'vector') {
        throw new AlgebraOperationError('ALG_UNSUPPORTED_FUNCTION', `The function “${name}” is not provided by this algebra.`)
      }
      return finiteOwned([
        0,
        scalarArgument(args[0], 'A vector component'),
        scalarArgument(args[1], 'A vector component'),
        0,
      ])
    },
    scalar(value) {
      return fromBackend(new Vga2([value, 0, 0, 0]))
    },
    basisBlade(name) {
      return fromBackend(new Vga2(unit(indexOf(name))))
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
      if (!Number.isInteger(grade) || grade < 0 || grade > basis.maxGrade) {
        throw new AlgebraOperationError(
          'ALG_UNKNOWN_GRADE',
          `Grade ${grade} does not exist in this algebra.`,
        )
      }
      return finiteOwned(value.coefficients.map((coefficient, index) =>
        basis.blades[index].grade === grade ? coefficient : 0))
    },
    coefficient(value, blade) {
      return finiteOwned([value.coefficients[indexOf(blade)], 0, 0, 0])
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
    scalarFunction(name, args) {
      return finiteOwned([scalarFunctionValue(name, args), 0, 0, 0])
    },
  }
}
