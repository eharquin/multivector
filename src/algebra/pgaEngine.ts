import Algebra from 'ganja.js'
import { createAlgebraBasis } from '../domain/algebraBasis'
import { ownedMultivector, type OwnedMultivector } from '../domain/multivector'
import { AlgebraOperationError, type AlgebraEngine } from './algebraEngine'
import {
  conjugateSign,
  exponentialFromScalarSquare,
  gradeProjection,
  gradeSigned,
  integerPower,
  involutionSign,
  requireBladeIndex,
  reverseSign,
  scalarFunctionValue,
  scalarOf,
  unitCoefficients,
} from './engineSupport'

/** Canonical PGA(2) basis: `e, e0, e1, e2, e01, e02, e12, e012`. */
export const PGA_2D_BASIS = createAlgebraBasis([0, 1, 2])

const Pga2 = Algebra({ p: 2, q: 0, r: 1, baseType: Float64Array })
type Backend = InstanceType<typeof Pga2>

const DIMENSION = PGA_2D_BASIS.blades.length

function finiteOwned(coefficients: readonly number[]): OwnedMultivector {
  try {
    return ownedMultivector(coefficients, PGA_2D_BASIS)
  } catch (error) {
    if (error instanceof RangeError) {
      throw new AlgebraOperationError('ALG_NON_FINITE', 'The operation produced a non-finite coefficient.')
    }
    throw error
  }
}

const toBackend = (value: OwnedMultivector): Backend => new Pga2(value.coefficients)
const fromBackend = (value: Backend): OwnedMultivector =>
  finiteOwned(Array.from(value as Iterable<number>))

const multiplyOwned = (left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector =>
  fromBackend(toBackend(left).Mul(toBackend(right)))
const addOwned = (left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector =>
  fromBackend(toBackend(left).Add(toBackend(right)))
const scaleOwned = (value: OwnedMultivector, factor: number): OwnedMultivector =>
  finiteOwned(value.coefficients.map((coefficient) => coefficient * factor))
const grade = (value: OwnedMultivector, k: number): OwnedMultivector =>
  gradeProjection(PGA_2D_BASIS, value, k, finiteOwned)

/** `<A_r B_s>_(r+s)` summed over grades: the outer product under the degenerate metric. */
function outerOwned(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector {
  let result = finiteOwned(new Array(DIMENSION).fill(0))
  for (let r = 0; r <= PGA_2D_BASIS.maxGrade; r += 1) {
    for (let s = 0; s <= PGA_2D_BASIS.maxGrade - r; s += 1) {
      const product = multiplyOwned(grade(left, r), grade(right, s))
      result = addOwned(result, grade(product, r + s))
    }
  }
  return result
}

/** The symmetric grade-difference inner product `<A_r B_s>_|r-s|` (PGA convention section 4). */
function innerOwned(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector {
  let result = finiteOwned(new Array(DIMENSION).fill(0))
  for (let r = 0; r <= PGA_2D_BASIS.maxGrade; r += 1) {
    for (let s = 0; s <= PGA_2D_BASIS.maxGrade; s += 1) {
      const product = multiplyOwned(grade(left, r), grade(right, s))
      result = addOwned(result, grade(product, Math.abs(r - s)))
    }
  }
  return result
}

/** The Hodge complement `J` of PGA convention section 5: `eJ ^ J(eJ) = e012`. */
const HODGE: ReadonlyArray<readonly [number, 1 | -1]> = [
  [7, 1],  // e    -> e012
  [6, 1],  // e0   -> e12
  [5, -1], // e1   -> -e02
  [4, 1],  // e2   -> e01
  [3, 1],  // e01  -> e2
  [2, -1], // e02  -> -e1
  [1, 1],  // e12  -> e0
  [0, 1],  // e012 -> e
]

function dualOwned(value: OwnedMultivector): OwnedMultivector {
  const result = new Array(DIMENSION).fill(0)
  value.coefficients.forEach((coefficient, index) => {
    const [target, sign] = HODGE[index]
    result[target] += sign * coefficient
  })
  return finiteOwned(result)
}

/** Left-multiplication matrix column `k`: the coefficients of `A * e_k`. */
function inverseOwned(value: OwnedMultivector): OwnedMultivector {
  // Solve A * X = 1 on the 8 coefficients; a structurally singular value
  // (every blade containing e0, for instance) hits an exact zero pivot.
  const columns = PGA_2D_BASIS.blades.map((_, k) =>
    multiplyOwned(value, finiteOwned(unitCoefficients(PGA_2D_BASIS, k))).coefficients)
  const matrix = PGA_2D_BASIS.blades.map((_, row) => [
    ...columns.map((column) => column[row]),
    row === 0 ? 1 : 0,
  ])
  for (let pivot = 0; pivot < DIMENSION; pivot += 1) {
    let best = pivot
    for (let row = pivot + 1; row < DIMENSION; row += 1) {
      if (Math.abs(matrix[row][pivot]) > Math.abs(matrix[best][pivot])) best = row
    }
    if (matrix[best][pivot] === 0) {
      throw new AlgebraOperationError('ALG_SINGULAR', 'This multivector is not invertible.')
    }
    ;[matrix[pivot], matrix[best]] = [matrix[best], matrix[pivot]]
    for (let row = 0; row < DIMENSION; row += 1) {
      if (row === pivot) continue
      const factor = matrix[row][pivot] / matrix[pivot][pivot]
      if (factor === 0) continue
      for (let column = pivot; column <= DIMENSION; column += 1) {
        matrix[row][column] -= factor * matrix[pivot][column]
      }
    }
  }
  const solution = matrix.map((row, index) => row[DIMENSION] / row[index])
  if (solution.some((coefficient) => !Number.isFinite(coefficient))) {
    throw new AlgebraOperationError('ALG_NON_FINITE', 'The inverse calculation produced a non-finite intermediate value.')
  }
  return finiteOwned(solution)
}

function normScalar(value: OwnedMultivector): number {
  const conjugate = gradeSigned(PGA_2D_BASIS, value, conjugateSign, finiteOwned)
  const squared = multiplyOwned(value, conjugate).coefficients[0]
  if (!Number.isFinite(squared)) {
    throw new AlgebraOperationError('ALG_NON_FINITE', 'The norm calculation produced a non-finite intermediate value.')
  }
  return Math.sqrt(Math.abs(squared))
}

const idealNormScalar = (value: OwnedMultivector): number => normScalar(dualOwned(value))

/**
 * Creates the ganja.js-backed PGA(2) adapter for `Cl(2, 0, 1)` under PGA
 * convention version 1. Every result is copied out of ganja.js before it
 * crosses this boundary; duality, the regressive product, norms, and the
 * exponential follow the specification rather than the backend.
 */
export function createPga2Engine(): AlgebraEngine {
  const basis = PGA_2D_BASIS
  const one = finiteOwned(unitCoefficients(basis, 0))
  const scalar = (value: number) => finiteOwned([value, 0, 0, 0, 0, 0, 0, 0])
  const point = (x: number, y: number, w: number) => {
    const result = new Array(DIMENSION).fill(0)
    result[requireBladeIndex(basis, 'e12')] = w
    result[requireBladeIndex(basis, 'e02')] = -x
    result[requireBladeIndex(basis, 'e01')] = y
    return finiteOwned(result)
  }
  return {
    basis,
    functions: new Map([
      ['point', [2, 3]],
      ['ipoint', [2]],
      ['line', [3]],
      ['norm', [1]],
      ['inorm', [1]],
    ]),
    call(name, args) {
      const number = (index: number, label: string) => scalarOf(args[index], label)
      switch (name) {
        case 'point':
          return point(
            number(0, 'A point coordinate'),
            number(1, 'A point coordinate'),
            args.length === 3 ? number(2, 'A point weight') : 1,
          )
        case 'ipoint':
          return point(number(0, 'A direction component'), number(1, 'A direction component'), 0)
        case 'line': {
          const result = new Array(DIMENSION).fill(0)
          result[requireBladeIndex(basis, 'e1')] = number(0, 'A line coefficient')
          result[requireBladeIndex(basis, 'e2')] = number(1, 'A line coefficient')
          result[requireBladeIndex(basis, 'e0')] = number(2, 'A line coefficient')
          return finiteOwned(result)
        }
        case 'norm':
          return scalar(normScalar(args[0]))
        case 'inorm':
          return scalar(idealNormScalar(args[0]))
        default:
          throw new AlgebraOperationError('ALG_UNSUPPORTED_FUNCTION', `The function “${name}” is not provided by this algebra.`)
      }
    },
    scalar,
    basisBlade(name) {
      return finiteOwned(unitCoefficients(basis, requireBladeIndex(basis, name)))
    },
    pseudoscalar() {
      return finiteOwned(unitCoefficients(basis, DIMENSION - 1))
    },
    add: addOwned,
    multiply: multiplyOwned,
    outer: outerOwned,
    inner: innerOwned,
    regressive(left, right) {
      return dualOwned(outerOwned(dualOwned(left), dualOwned(right)))
    },
    negate: (value) => scaleOwned(value, -1),
    reverse: (value) => gradeSigned(basis, value, reverseSign, finiteOwned),
    dual: dualOwned,
    gradeInvolution: (value) => gradeSigned(basis, value, involutionSign, finiteOwned),
    grade,
    coefficient(value, blade) {
      return scalar(value.coefficients[requireBladeIndex(basis, blade)])
    },
    divide(left, right) {
      return multiplyOwned(left, inverseOwned(right))
    },
    power(value, exponent) {
      return integerPower(value, exponent, { one, multiply: multiplyOwned, inverse: inverseOwned })
    },
    inverse: inverseOwned,
    sandwich(versor, value) {
      return multiplyOwned(multiplyOwned(versor, value), gradeSigned(basis, versor, reverseSign, finiteOwned))
    },
    norm: (value) => scalar(normScalar(value)),
    normalize(value) {
      const euclidean = normScalar(value)
      if (euclidean > 0) return { status: 'normalized', value: scaleOwned(value, 1 / euclidean) }
      const ideal = idealNormScalar(value)
      if (ideal > 0) return { status: 'normalized', value: scaleOwned(value, 1 / ideal) }
      return { status: 'unavailable', value }
    },
    exp(value) {
      if (value.coefficients.slice(1).every((coefficient) => coefficient === 0)) {
        return scalar(Math.exp(value.coefficients[0]))
      }
      const closed = exponentialFromScalarSquare(value, multiplyOwned(value, value), finiteOwned)
      if (!closed) {
        throw new AlgebraOperationError(
          'ALG_UNSUPPORTED_DOMAIN',
          'This multivector exponential is outside the supported closed forms.',
        )
      }
      return closed
    },
    scalarFunction(name, value) {
      return scalar(scalarFunctionValue(name, value))
    },
  }
}
