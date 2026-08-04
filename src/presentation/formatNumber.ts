import type { LanguageValue } from '../domain/languageValue'
import {
  VGA_2D_BLADE_NAMES,
  type OwnedMultivector,
} from '../domain/multivector'

export const MIN_DECIMAL_PLACES = 0
export const MAX_DECIMAL_PLACES = 15

function normalizedExponent(value: string): string {
  return value.replace('e', 'E').replace(/E\+/, 'E')
}

/** Formats a finite number for compact, presentation-only inspection. */
export function formatDisplayNumber(value: number, decimalPlaces: number): string {
  if (!Number.isFinite(value)) throw new RangeError('Display values must be finite.')
  const places = Math.max(
    MIN_DECIMAL_PLACES,
    Math.min(MAX_DECIMAL_PLACES, Math.trunc(decimalPlaces)),
  )
  if (value === 0 || Object.is(value, -0)) return '0'

  const magnitude = Math.abs(value)
  const rounded = Number(value.toFixed(places))
  if (rounded === 0 || magnitude >= 1e9) {
    return normalizedExponent(value.toExponential(places))
  }
  return rounded.toString()
}

/** Formats a VGA(2) value without changing its coefficients or semantic kind. */
export function formatDisplayMultivector(
  value: OwnedMultivector,
  decimalPlaces: number,
): string {
  const terms: string[] = []
  value.coefficients.forEach((coefficient, index) => {
    if (coefficient === 0) return
    const magnitude = Math.abs(coefficient)
    const formatted = formatDisplayNumber(magnitude, decimalPlaces)
    const blade = VGA_2D_BLADE_NAMES[index]
    const body = index === 0
      ? formatted
      : `${formatted === '1' ? '' : formatted}${blade}`
    terms.push(terms.length === 0
      ? `${coefficient < 0 ? '-' : ''}${body}`
      : `${coefficient < 0 ? '-' : '+'} ${body}`)
  })
  return terms.join(' ') || '0'
}

/** Formats a scalar, multivector, or list for the expression panel. */
export function formatDisplayValue(
  value: LanguageValue,
  decimalPlaces: number,
): string {
  if (value.kind === 'multivector') {
    return formatDisplayMultivector(value, decimalPlaces)
  }
  return `[${value.elements.map(({ value: element }) =>
    formatDisplayMultivector(element, decimalPlaces)).join(', ')}]`
}
