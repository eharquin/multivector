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

  it('accepts uppercase scientific exponents emitted by generated output', () => {
    expect(tokenize('7.179585925776166E-9e12')).toMatchObject({
      ok: true,
      tokens: [
        { kind: 'number', text: '7.179585925776166E-9' },
        { kind: 'blade', text: 'e12' },
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

  it('recognizes fundamental VGA operators and the pseudoscalar', () => {
    expect(tokenize('~A ^ !B | 2ps & C')).toMatchObject({
      ok: true,
      tokens: [
        { kind: 'tilde' },
        { kind: 'identifier', text: 'A' },
        { kind: 'caret' },
        { kind: 'bang' },
        { kind: 'identifier', text: 'B' },
        { kind: 'pipe' },
        { kind: 'number', text: '2' },
        { kind: 'pseudoscalar', text: 'ps' },
        { kind: 'ampersand' },
        { kind: 'identifier', text: 'C' },
        { kind: 'end' },
      ],
    })
  })
})
