import { type AlgebraBasis } from './algebraBasis'
import { formatRoundTripNumber } from './numberFormat'

/**
 * A backend-independent multivector whose coefficients are owned by
 * MultiVector and stored in the canonical order of its basis.
 *
 * Backend element instances must never be stored in this representation.
 */
export type OwnedMultivector = Readonly<{
  kind: 'multivector'
  basis: AlgebraBasis
  coefficients: readonly number[]
}>

/**
 * Copies coefficients into an immutable value safe to return across the
 * algebra-engine boundary. The coefficient count must match the basis.
 */
export function ownedMultivector(
  coefficients: readonly number[],
  basis: AlgebraBasis,
): OwnedMultivector {
  if (coefficients.length !== basis.blades.length) {
    throw new RangeError(
      `Expected ${basis.blades.length} coefficients for this basis, received ${coefficients.length}.`,
    )
  }
  if (coefficients.some((coefficient) => !Number.isFinite(coefficient))) {
    throw new RangeError('Multivector coefficients must be finite.')
  }
  return Object.freeze({
    kind: 'multivector' as const,
    basis,
    coefficients: Object.freeze(
      coefficients.map((coefficient) =>
        Object.is(coefficient, -0) ? 0 : coefficient,
      ),
    ),
  })
}

/** Formats an owned value in the canonical blade order of its basis for inspection. */
export function inspectMultivector(value: OwnedMultivector): string {
  const terms: string[] = []

  value.coefficients.forEach((coefficient, index) => {
    if (coefficient === 0) return

    const magnitude = Math.abs(coefficient)
    const blade = value.basis.blades[index].name
    const body =
      index === 0
        ? formatRoundTripNumber(magnitude)
        : `${magnitude === 1 ? '' : formatRoundTripNumber(magnitude)}${blade}`

    if (terms.length === 0) {
      terms.push(coefficient < 0 ? `-${body}` : body)
    } else {
      terms.push(`${coefficient < 0 ? '-' : '+'} ${body}`)
    }
  })

  return terms.join(' ') || '0'
}
