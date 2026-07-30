import { describe, expect, it } from 'vitest'
import { tokenize } from './tokenize'

describe('expression tokenizer', () => {
  it('distinguishes an implicit blade coefficient from scientific notation', () => {
    expect(tokenize('1e1 1e+1 1e-1')).toMatchObject({
      ok: true,
      tokens: [
        { kind: 'number', text: '1' },
        { kind: 'blade', text: 'e1' },
        { kind: 'number', text: '1e+1' },
        { kind: 'number', text: '1e-1' },
        { kind: 'end' },
      ],
    })
  })

  it('retains user identifiers for document-level name resolution', () => {
    expect(tokenize('V1 = e3')).toMatchObject({
      ok: true,
      tokens: [
        { kind: 'identifier', text: 'V1', span: { start: 0, end: 2 } },
        { kind: 'equals', text: '=', span: { start: 3, end: 4 } },
        { kind: 'identifier', text: 'e3', span: { start: 5, end: 7 } },
        { kind: 'end' },
      ],
    })
  })

  it('recognizes canonical and permuted VGA(2) compact blades', () => {
    expect(tokenize('e12 + e21')).toMatchObject({
      ok: true,
      tokens: [
        { kind: 'blade', text: 'e12' },
        { kind: 'plus' },
        { kind: 'blade', text: 'e21' },
        { kind: 'end' },
      ],
    })
  })
})
