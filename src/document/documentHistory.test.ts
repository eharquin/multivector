import { describe, expect, it } from 'vitest'
import {
  createDocumentHistory,
  documentHistoryReducer,
  KEYBOARD_COALESCE_MS,
  MAX_HISTORY_ENTRIES,
} from './documentHistory'
import { expressionDocument } from './expressionDocument'

const source = (history: ReturnType<typeof createDocumentHistory>) =>
  history.present.items[0]?.source

describe('document history', () => {
  it('undoes and redoes complete document snapshots and clears redo after mutation', () => {
    let history = createDocumentHistory(expressionDocument(
      [{ id: 'item', source: 'A = 1', positionSource: '(1, 2)' }],
      { item: { style: 'green-4' } },
    ))
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-position', itemId: 'item', positionSource: '(3, 4)' },
    })
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-appearance', itemId: 'item', appearance: { style: 'red-4' } },
    })
    history = documentHistoryReducer(history, { type: 'undo' })
    expect(history.present.items[0].positionSource).toBe('(3, 4)')
    expect(history.present.appearance.item.style).toBe('green-4')
    history = documentHistoryReducer(history, { type: 'redo' })
    expect(history.present.appearance.item.style).toBe('red-4')
    history = documentHistoryReducer(history, { type: 'undo' })
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-source', itemId: 'item', source: 'A = 9' },
    })
    expect(history.future).toHaveLength(0)
  })

  it('restores control and algebra configuration atomically', () => {
    const initial = expressionDocument([{ id: 'scalar', source: 's = 1' }])
    let history = createDocumentHistory(initial)
    history = documentHistoryReducer(history, {
      type: 'execute',
      command: {
        kind: 'update-control', itemId: 'scalar',
        control: {
          mode: 'slider', minimumSource: '0', maximumSource: '2', stepSource: '0.1',
          animation: null,
        },
      },
    })
    history = documentHistoryReducer(history, {
      type: 'execute',
      command: {
        kind: 'update-algebra',
        algebra: { ...initial.algebra, parameters: { metric: 'alternate' } },
        interpretation: null,
      },
    })
    history = documentHistoryReducer(history, { type: 'undo' })
    expect(history.present.items[0].control?.mode).toBe('slider')
    expect(history.present.algebra).toEqual(initial.algebra)
    expect(history.present.interpretation).toEqual(initial.interpretation)
  })

  it('coalesces uninterrupted edits only for the same key within 750 ms', () => {
    let history = createDocumentHistory(expressionDocument([{ id: 'item', source: '' }]))
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-source', itemId: 'item', source: 'A' },
      coalesceKey: 'source:item', timestamp: 1_000,
    })
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-source', itemId: 'item', source: 'A = 1' },
      coalesceKey: 'source:item', timestamp: 1_000 + KEYBOARD_COALESCE_MS,
    })
    expect(history.past).toHaveLength(1)
    history = documentHistoryReducer(history, { type: 'undo' })
    expect(source(history)).toBe('')
  })

  it('commits a transaction once and cancellation restores the exact snapshot', () => {
    const initial = expressionDocument([{ id: 'item', source: 'A = 1', positionSource: '(0, 0)' }])
    let history = createDocumentHistory(initial)
    history = documentHistoryReducer(history, { type: 'begin-transaction' })
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-source', itemId: 'item', source: 'A = 2' },
    })
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-position', itemId: 'item', positionSource: '(2, 3)' },
    })
    history = documentHistoryReducer(history, { type: 'cancel-transaction' })
    expect(history.present).toBe(initial)
    expect(history.past).toHaveLength(0)

    history = documentHistoryReducer(history, { type: 'begin-transaction' })
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-source', itemId: 'item', source: 'A = 4' },
    })
    history = documentHistoryReducer(history, { type: 'commit-transaction' })
    expect(history.past).toHaveLength(1)
    expect(source(documentHistoryReducer(history, { type: 'undo' }))).toBe('A = 1')
  })

  it('keeps a deterministic bounded history', () => {
    let history = createDocumentHistory(expressionDocument([{ id: 'item', source: '0' }]))
    for (let index = 1; index <= MAX_HISTORY_ENTRIES + 5; index += 1) {
      history = documentHistoryReducer(history, {
        type: 'execute', command: { kind: 'update-source', itemId: 'item', source: String(index) },
      })
    }
    expect(history.past).toHaveLength(MAX_HISTORY_ENTRIES)
  })

  it('persists view-only changes without creating mathematical history', () => {
    let history = createDocumentHistory(expressionDocument([{ id: 'item', source: '1' }]))
    history = documentHistoryReducer(history, {
      type: 'execute', command: { kind: 'update-source', itemId: 'item', source: '2' },
    })
    const view = {
      ...history.present.view,
      viewport: { kind: 'two-dimensional' as const, centerX: 3, centerY: -4, zoom: 90 },
      display: { ...history.present.view.display, gridVisible: true },
    }
    history = documentHistoryReducer(history, { type: 'update-view', view })
    expect(history.past).toHaveLength(1)
    expect(history.present.view).toBe(view)

    history = documentHistoryReducer(history, { type: 'undo' })
    expect(source(history)).toBe('1')
    expect(history.present.view).toBe(view)
  })
})
