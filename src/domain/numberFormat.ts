/** Formats a finite binary64 value using its shortest round-tripping form. */
export function formatRoundTripNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError('Canonical numbers must be finite.')
  }
  if (value === 0 || Object.is(value, -0)) return '0'
  return value.toString().replace('e', 'E')
}
