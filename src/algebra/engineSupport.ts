import { bladeIndex, type AlgebraBasis } from '../domain/algebraBasis'
import { type OwnedMultivector } from '../domain/multivector'
import { SCALAR_FUNCTIONS, type ScalarFunctionName } from '../domain/scalarFunctions'
import { AlgebraOperationError } from './algebraEngine'

/*
 * Basis-driven helpers shared by engine adapters. They only see owned
 * values and the basis; each adapter supplies its own products.
 */

export type OwnedFactory = (coefficients: readonly number[]) => OwnedMultivector

export function requireBladeIndex(basis: AlgebraBasis, blade: string): number {
  const index = bladeIndex(basis, blade)
  if (index < 0) {
    throw new AlgebraOperationError(
      'ALG_UNKNOWN_BLADE',
      `The blade “${blade}” does not exist in this algebra.`,
    )
  }
  return index
}

export function unitCoefficients(basis: AlgebraBasis, index: number): number[] {
  return basis.blades.map((_, position) => (position === index ? 1 : 0))
}

export function gradeProjection(
  basis: AlgebraBasis,
  value: OwnedMultivector,
  grade: number,
  owned: OwnedFactory,
): OwnedMultivector {
  if (!Number.isInteger(grade) || grade < 0 || grade > basis.maxGrade) {
    throw new AlgebraOperationError(
      'ALG_UNKNOWN_GRADE',
      `Grade ${grade} does not exist in this algebra.`,
    )
  }
  return owned(value.coefficients.map((coefficient, index) =>
    basis.blades[index].grade === grade ? coefficient : 0))
}

/** Applies a per-grade sign, as reverse, grade involution, and Clifford conjugation do. */
export function gradeSigned(
  basis: AlgebraBasis,
  value: OwnedMultivector,
  sign: (grade: number) => 1 | -1,
  owned: OwnedFactory,
): OwnedMultivector {
  return owned(value.coefficients.map((coefficient, index) =>
    coefficient * sign(basis.blades[index].grade)))
}

export const reverseSign = (grade: number): 1 | -1 =>
  (grade * (grade - 1) / 2) % 2 === 0 ? 1 : -1
export const involutionSign = (grade: number): 1 | -1 => grade % 2 === 0 ? 1 : -1
export const conjugateSign = (grade: number): 1 | -1 =>
  (grade * (grade + 1) / 2) % 2 === 0 ? 1 : -1

export function scalarOf(value: OwnedMultivector, label: string): number {
  if (value.coefficients.slice(1).some((coefficient) => coefficient !== 0)) {
    throw new AlgebraOperationError('ALG_DOMAIN', `${label} must be scalar.`)
  }
  return value.coefficients[0]
}

export function integerPower(
  value: OwnedMultivector,
  exponent: number,
  operations: Readonly<{
    one: OwnedMultivector
    multiply(left: OwnedMultivector, right: OwnedMultivector): OwnedMultivector
    inverse(value: OwnedMultivector): OwnedMultivector
  }>,
): OwnedMultivector {
  if (!Number.isSafeInteger(exponent)) {
    throw new AlgebraOperationError(
      'ALG_DOMAIN',
      'A geometric power exponent must be a safe integer.',
    )
  }
  if (exponent < 0) return integerPower(operations.inverse(value), -exponent, operations)
  let result = operations.one
  let factor = value
  let remaining = exponent
  while (remaining > 0) {
    if (remaining % 2 === 1) result = operations.multiply(result, factor)
    remaining = Math.floor(remaining / 2)
    if (remaining > 0) factor = operations.multiply(factor, factor)
  }
  return result
}

/**
 * The common scalar boundary for the built-in scalar functions: every argument
 * must be scalar and the function's domain rule must admit the values.
 */
export function scalarFunctionValue(name: ScalarFunctionName, args: readonly OwnedMultivector[]): number {
  const definition = SCALAR_FUNCTIONS[name]
  if (args.length !== definition.arity) {
    throw new AlgebraOperationError(
      'ALG_DOMAIN',
      `“${name}” takes ${definition.arity} ${definition.arity === 1 ? 'argument' : 'arguments'}.`,
    )
  }
  const scalars = args.map((value, index) =>
    scalarOf(value, definition.arity === 1 ? `The argument of “${name}”` : `Argument ${index + 1} of “${name}”`))
  const domainError = definition.domainError(scalars)
  if (domainError !== null) throw new AlgebraOperationError('ALG_DOMAIN', domainError)
  return definition.apply(scalars)
}

/**
 * The closed forms of the exponential when the square is scalar:
 * `cos`/`sin` for a negative square, `cosh`/`sinh` for a positive one, and
 * `1 + X` for a null one. Returns `null` when the square is not scalar.
 */
export function exponentialFromScalarSquare(
  value: OwnedMultivector,
  square: OwnedMultivector,
  owned: OwnedFactory,
): OwnedMultivector | null {
  if (square.coefficients.slice(1).some((coefficient) => coefficient !== 0)) return null
  const s = square.coefficients[0]
  const [scalarPart, ...rest] = value.coefficients
  if (s === 0) return owned([1 + scalarPart, ...rest])
  const magnitude = Math.sqrt(Math.abs(s))
  const cosine = s < 0 ? Math.cos(magnitude) : Math.cosh(magnitude)
  const factor = (s < 0 ? Math.sin(magnitude) : Math.sinh(magnitude)) / magnitude
  return owned([cosine + scalarPart * factor, ...rest.map((coefficient) => coefficient * factor)])
}
