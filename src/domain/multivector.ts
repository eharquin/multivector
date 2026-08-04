import { formatRoundTripNumber } from './numberFormat'

export const VGA_2D_BLADE_NAMES = ['e', 'e1', 'e2', 'e12'] as const

/**
 * A backend-independent multivector whose coefficients are owned by
 * MultiVector.
 *
 * The current VGA(2) slice orders coefficients as `e`, `e1`, `e2`, `e12`.
 * Backend element instances must never be stored in this representation.
 */
export type OwnedMultivector = Readonly<{
  kind: 'multivector'
  coefficients: readonly number[]
}>

/**
 * Copies coefficients into an immutable value safe to return across the
 * algebra-engine boundary.
 */
export function ownedMultivector(
  coefficients: readonly number[],
): OwnedMultivector {
  if (coefficients.some((coefficient) => !Number.isFinite(coefficient))) {
    throw new RangeError('Multivector coefficients must be finite.')
  }
  return Object.freeze({
    kind: 'multivector' as const,
    coefficients: Object.freeze(
      coefficients.map((coefficient) =>
        Object.is(coefficient, -0) ? 0 : coefficient,
      ),
    ),
  })
}

/** Formats a VGA(2) owned value in canonical blade order for inspection. */
export function inspectMultivector(value: OwnedMultivector): string {
  const terms: string[] = []

  value.coefficients.forEach((coefficient, index) => {
    if (coefficient === 0) return

    const magnitude = Math.abs(coefficient)
    const blade = VGA_2D_BLADE_NAMES[index]
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
