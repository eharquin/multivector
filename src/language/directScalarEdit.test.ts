import { describe, expect, it } from 'vitest'
import { directScalarEdit, formatScalarSource } from './directScalarEdit'

describe('direct scalar edit boundary', () => {
  it('accepts direct numeric declarations and parenthesized unary signs', () => {
    expect(directScalarEdit('a = 2')).toMatchObject({ name: 'a', value: 2 })
    expect(directScalarEdit('a = ((-2))')).toMatchObject({ name: 'a', value: -2 })
  })

  it('refuses anonymous, computed, constant, and non-scalar sources', () => {
    expect(directScalarEdit('2')).toBeNull()
    expect(directScalarEdit('a = b + 1')).toBeNull()
    expect(directScalarEdit('a = pi')).toBeNull()
    expect(directScalarEdit('a = e1')).toBeNull()
  })

  it('formats finite replacement source without negative zero', () => {
    expect(formatScalarSource(-0)).toBe('0')
    expect(formatScalarSource(1 / 3)).toBe('0.3333333333333333')
    expect(Number(formatScalarSource(Math.PI * 2))).toBe(Math.PI * 2)
  })
})
