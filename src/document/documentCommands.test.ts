import { describe, expect, it } from 'vitest'
import { executeDocumentCommand } from './documentCommands'
import { expressionDocument } from './expressionDocument'

describe('semantic document commands', () => {
  it('targets stable identities independently of row position', () => {
    const document = expressionDocument([
      { id: 'first', source: 'A = 1' },
      { id: 'target', source: 'B = 2', positionSource: '(1, 2)' },
    ])
    const result = executeDocumentCommand(document, {
      kind: 'update-source', itemId: 'target', source: 'B = 3',
    })
    expect(result.status).toBe('applied')
    expect(result.document.items).toEqual([
      { id: 'first', source: 'A = 1' },
      { id: 'target', source: 'B = 3', positionSource: '(1, 2)' },
    ])
  })

  it('returns explicit invalid and unsupported results without mutation', () => {
    const document = expressionDocument([
      { id: 'note', kind: 'annotation', source: 'prose' },
    ])
    expect(executeDocumentCommand(document, {
      kind: 'update-source', itemId: 'missing', source: 'A = 1',
    })).toEqual(expect.objectContaining({ status: 'invalid', document }))
    expect(executeDocumentCommand(document, {
      kind: 'update-position', itemId: 'note', positionSource: '(1, 2)',
    })).toEqual({
      status: 'unsupported', document,
      reason: 'Annotations do not own position source.',
    })
  })

  it('rewrites the smallest eligible literal and refuses compound inverse edits', () => {
    const document = expressionDocument([
      { id: 'vector', source: 'V = vector(-2, s + 1)' },
    ])
    const applied = executeDocumentCommand(document, {
      kind: 'rewrite-source-literal', itemId: 'vector', property: 'source',
      span: { start: 11, end: 13 }, replacement: '-3.5',
    })
    expect(applied.document.items[0].source).toBe('V = vector(-3.5, s + 1)')

    const refused = executeDocumentCommand(document, {
      kind: 'rewrite-source-literal', itemId: 'vector', property: 'source',
      span: { start: 15, end: 20 }, replacement: '4',
    })
    expect(refused).toEqual(expect.objectContaining({
      status: 'unsupported', document,
      reason: 'Only a direct numeric or unary-signed numeric literal can be rewritten.',
    }))
  })

  it('sets a direct scalar through a language-owned semantic command', () => {
    const document = expressionDocument([
      { id: 'scalar', source: 'a = ((-2))' },
      { id: 'computed', source: 'b = a + 1' },
    ])
    expect(executeDocumentCommand(document, {
      kind: 'set-scalar-value', itemId: 'scalar', value: 3.5,
    }).document.items[0].source).toBe('a = ((3.5))')
    expect(executeDocumentCommand(document, {
      kind: 'set-scalar-value', itemId: 'computed', value: 4,
    })).toEqual(expect.objectContaining({ status: 'unsupported', document }))
  })

  it('clears item-keyed appearance atomically and keeps document identity', () => {
    const document = expressionDocument(
      [{ id: 'value', source: 'A = 1' }],
      { value: { style: 'green-4' } },
      { id: 'stable-document' },
    )
    const result = executeDocumentCommand(document, { kind: 'clear-items' })
    expect(result.document).toEqual(expect.objectContaining({
      id: 'stable-document', items: [], appearance: {},
    }))
  })
})
