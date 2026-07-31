import { describe, expect, it } from 'vitest'
import {
  addExpression,
  deleteExpression,
  expressionDocument,
  MAX_EXPRESSION_ITEMS,
  updateExpression,
  updateExpressionPosition,
} from './expressionDocument'

describe('expression document', () => {
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
