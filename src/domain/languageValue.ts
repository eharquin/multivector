import type { OwnedMultivector } from './multivector'
import { formatRoundTripNumber } from './numberFormat'

export const MAX_GENERATED_VALUES = 10_000

export type ListElement = Readonly<{
  id: string
  value: OwnedMultivector
  sources?: readonly string[]
}>

export type OwnedList = Readonly<{
  kind: 'list'
  elements: readonly ListElement[]
}>

export type LanguageValue = OwnedMultivector | OwnedList

const elementIdentities = new WeakMap<OwnedMultivector, string>()

export function retainElementIdentity(
  value: OwnedMultivector,
  identity: string,
): OwnedMultivector {
  elementIdentities.set(value, identity)
  return value
}

export function elementIdentity(value: OwnedMultivector): string | null {
  return elementIdentities.get(value) ?? null
}

export function ownedList(elements: readonly ListElement[]): OwnedList {
  if (elements.length > MAX_GENERATED_VALUES) {
    throw new RangeError('A list cannot contain more than 10,000 elements.')
  }
  elements.forEach((element) => retainElementIdentity(element.value, element.id))
  return Object.freeze({
    kind: 'list' as const,
    elements: Object.freeze(elements.map((element) => Object.freeze(element))),
  })
}

export function inspectLanguageValue(value: LanguageValue): string {
  if (value.kind === 'multivector') {
    const terms: string[] = []
    const blades = ['e', 'e1', 'e2', 'e12'] as const
    value.coefficients.forEach((coefficient, index) => {
      if (coefficient === 0) return
      const magnitude = Math.abs(coefficient)
      const body = index === 0
        ? formatRoundTripNumber(magnitude)
        : `${magnitude === 1 ? '' : formatRoundTripNumber(magnitude)}${blades[index]}`
      terms.push(terms.length === 0
        ? `${coefficient < 0 ? '-' : ''}${body}`
        : `${coefficient < 0 ? '-' : '+'} ${body}`)
    })
    return terms.join(' ') || '0'
  }
  return `[${value.elements.map((element) => inspectLanguageValue(element.value)).join(', ')}]`
}
