import { describe, expect, it } from 'vitest'
import {
  addExpression,
  addExpressionBefore,
  clearExpressions,
  deleteExpression,
  expressionDocument,
  MAX_EXPRESSION_ITEMS,
  updateExpression,
  updateExpressionAppearance,
  updateExpressionPosition,
  updateExpressionNormalization,
  vga2FoundationExampleDocument,
} from './expressionDocument'

describe('expression document', () => {
  it('provides the documented VGA 2D graph for a new session', () => {
    const document = vga2FoundationExampleDocument()

    expect(document.id).toBe('vga2-foundation-example')
    expect(document.items).toEqual([
      { id: 'item-1', source: 's = 2' },
      {
        id: 'item-2',
        source: 'V1 = vector(s, 1)',
        positionSource: '(1, 1)',
      },
      {
        id: 'item-3',
        source: 'V2 = vector(1, -1)',
        positionSource: '(0.1, 0.1)',
      },
      { id: 'item-4', source: 'L = [V1, V2]' },
      { id: 'item-5', source: 'H = V1.head' },
    ])
  })

  it('inserts an expression before a stable sibling identity', () => {
    const document = expressionDocument([
      { id: 'item-1', source: '1' },
      { id: 'item-2', source: '2' },
    ])

    expect(addExpressionBefore(
      document,
      { id: 'item-new', source: '' },
      'item-1',
    ).items.map(({ id }) => id)).toEqual(['item-new', 'item-1', 'item-2'])
  })

  it('inserts after a stable item identity', () => {
    const document = expressionDocument([
      { id: 'item-1', source: 'e1' },
      { id: 'item-2', source: 'e2' },
    ])

    expect(
      addExpression(document, { id: 'item-3', source: '' }, 'item-1').items,
    ).toEqual([
      { id: 'item-1', source: 'e1' },
      { id: 'item-3', source: '' },
      { id: 'item-2', source: 'e2' },
    ])
  })

  it('updates and deletes without changing sibling identities', () => {
    const document = expressionDocument([
      { id: 'item-1', source: 'e1' },
      { id: 'item-2', source: 'e2' },
    ])

    const updated = updateExpression(document, 'item-1', '2e1')
    expect(deleteExpression(updated, 'item-1').items).toEqual([
      { id: 'item-2', source: 'e2' },
    ])
  })

  it('updates position source separately from value source', () => {
    const document = expressionDocument([{ id: 'item-1', source: 'e1' }])

    expect(
      updateExpressionPosition(document, 'item-1', 'vector(2, 3)').items[0],
    ).toEqual({
      id: 'item-1',
      source: 'e1',
      positionSource: 'vector(2, 3)',
    })
  })

  it('updates appearance without changing mathematical or position source', () => {
    const document = expressionDocument([{
      id: 'item-1', source: 'V = e1', positionSource: '(1, 2)',
    }])

    const updated = updateExpressionAppearance(document, 'item-1', {
      visible: false, style: 'blue-4', labelVisible: true, label: 'Velocity',
    })
    expect(updated.items[0]).toEqual({
      id: 'item-1',
      source: 'V = e1',
      positionSource: '(1, 2)',
    })
    expect(updated.appearance['item-1']).toEqual({
      visible: false,
      style: 'blue-4',
      labelVisible: true,
      label: 'Velocity',
    })
  })

  it('toggles natural normalization without rewriting source', () => {
    const document = expressionDocument([{ id: 'item-1', source: 'V = 2e1' }])
    expect(updateExpressionNormalization(document, 'item-1', 'natural').items[0])
      .toEqual({ id: 'item-1', source: 'V = 2e1', normalization: 'natural' })
  })

  it('clears every item and its appearance together', () => {
    const document = updateExpressionAppearance(
      expressionDocument([
        { id: 'item-1', source: 'V = e1' },
        { id: 'item-2', source: 'W = e2' },
      ]),
      'item-1',
      { visible: false },
    )

    const cleared = clearExpressions(document)

    expect(cleared.items).toEqual([])
    expect(cleared.appearance).toEqual({})
  })

  it('does not exceed the normative document item limit', () => {
    const document = expressionDocument(
      Array.from({ length: MAX_EXPRESSION_ITEMS }, (_, index) => ({
        id: `item-${index}`,
        source: '0',
      })),
    )

    expect(addExpression(document, { id: 'extra', source: '' })).toBe(document)
  })
})
