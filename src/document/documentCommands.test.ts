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

  it('moves an item before or after an anchor, preserving other items', () => {
    const document = expressionDocument([
      { id: 'a', source: 'A = 1' },
      { id: 'b', source: 'B = 2' },
      { id: 'c', source: 'C = 3' },
    ])
    const beforeA = executeDocumentCommand(document, {
      kind: 'move-item', itemId: 'c', anchorId: 'a', placement: 'before',
    })
    expect(beforeA.document.items.map(({ id }) => id)).toEqual(['c', 'a', 'b'])

    const afterA = executeDocumentCommand(document, {
      kind: 'move-item', itemId: 'c', anchorId: 'a', placement: 'after',
    })
    expect(afterA.document.items.map(({ id }) => id)).toEqual(['a', 'c', 'b'])
  })

  it('moves an item to the end when no anchor is given', () => {
    const document = expressionDocument([
      { id: 'a', source: 'A = 1' },
      { id: 'b', source: 'B = 2' },
    ])
    const result = executeDocumentCommand(document, { kind: 'move-item', itemId: 'a' })
    expect(result.document.items.map(({ id }) => id)).toEqual(['b', 'a'])
  })

  it('moves an item to the start using the first item as a before-anchor', () => {
    const document = expressionDocument([
      { id: 'a', source: 'A = 1' },
      { id: 'b', source: 'B = 2' },
      { id: 'c', source: 'C = 3' },
    ])
    const result = executeDocumentCommand(document, {
      kind: 'move-item', itemId: 'c', anchorId: 'a', placement: 'before',
    })
    expect(result.document.items.map(({ id }) => id)).toEqual(['c', 'a', 'b'])
  })

  it('rejects moving an item relative to itself or a missing item', () => {
    const document = expressionDocument([
      { id: 'a', source: 'A = 1' },
      { id: 'b', source: 'B = 2' },
    ])
    expect(executeDocumentCommand(document, {
      kind: 'move-item', itemId: 'a', anchorId: 'a',
    })).toEqual({
      status: 'invalid', document,
      reason: 'An item cannot move relative to itself.',
    })
    expect(executeDocumentCommand(document, {
      kind: 'move-item', itemId: 'a', anchorId: 'missing',
    })).toEqual({
      status: 'invalid', document,
      reason: 'Item “missing” does not exist.',
    })
    expect(executeDocumentCommand(document, {
      kind: 'move-item', itemId: 'missing',
    })).toEqual({
      status: 'invalid', document,
      reason: 'Item “missing” does not exist.',
    })
  })

  it('preserves appearance, control, and other item fields across a move', () => {
    const document = expressionDocument([
      { id: 'a', source: 'A = 1', control: { mode: 'number', minimumSource: '0', maximumSource: '1', stepSource: '0.1', animation: null } },
      { id: 'b', source: 'B = 2' },
    ], { a: { visible: false } })
    const result = executeDocumentCommand(document, {
      kind: 'move-item', itemId: 'a', anchorId: 'b', placement: 'after',
    })
    expect(result.document.items.find(({ id }) => id === 'a')).toEqual(document.items[0])
    expect(result.document.appearance).toEqual(document.appearance)
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

  it('selects an algebra with its interpretation and visualizer only on an empty document', () => {
    const selection = {
      kind: 'select-algebra' as const,
      algebra: { algebraId: 'org.multivector.pga', definitionVersion: 1, conventionVersion: 1, parameters: { dimension: 2 } },
      interpretation: { interpretationId: 'org.multivector.pga-2d', interpretationVersion: 1 },
      visualizerId: 'org.multivector.pga-2d',
    }
    const empty = expressionDocument([{ id: 'item-1', source: '' }, { id: 'item-2', source: '   ' }])
    const applied = executeDocumentCommand(empty, selection)
    expect(applied.status).toBe('applied')
    expect(applied.document.algebra).toEqual(selection.algebra)
    expect(applied.document.interpretation).toEqual(selection.interpretation)
    expect(applied.document.view.visualizerId).toBe('org.multivector.pga-2d')
    expect(applied.document.items).toHaveLength(2)

    const withContent = expressionDocument([{ id: 'item-1', source: 'V = vector(1, 2)' }])
    const refused = executeDocumentCommand(withContent, selection)
    expect(refused.status).toBe('invalid')
    expect(refused.document).toBe(withContent)

    const withPosition = expressionDocument([{ id: 'item-1', source: '', positionSource: '(1, 2)' }])
    expect(executeDocumentCommand(withPosition, selection).status).toBe('invalid')
  })
})
