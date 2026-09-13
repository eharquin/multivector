import { type AlgebraBasis } from '../domain/algebraBasis'
import { type OwnedMultivector } from '../domain/multivector'

/**
 * The operation contract every registered algebra definition provides.
 *
 * Blade names, grades, and coefficient access are resolved against the
 * engine's basis; an unknown blade or an out-of-range grade is an
 * `AlgebraOperationError`, never a silent zero. Every value that crosses this
 * boundary is owned (ALG-010).
 */
export type AlgebraEngine = Readonly<{
  basis: AlgebraBasis
  /** Registered function and constructor names with their arity (ALG-028). */
  functions: ReadonlyMap<string, number>
  /** Applies a registered function; the caller has checked name and arity. */
  call(name: string, args: readonly OwnedMultivector[]): OwnedMultivector
  scalar(value: number): OwnedMultivector
  basisBlade(name: string): OwnedMultivector
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
  grade(value: OwnedMultivector, grade: number): OwnedMultivector
  coefficient(value: OwnedMultivector, blade: string): OwnedMultivector
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
