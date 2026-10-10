import { executeDocumentCommand, type CommandResult, type DocumentCommand } from './documentCommands'
import type { ExpressionDocument } from './expressionDocument'

export const MAX_HISTORY_ENTRIES = 100
export const KEYBOARD_COALESCE_MS = 750

/**
 * Where a history step came from. A viewport gesture records the handle a
 * keyboard gesture moved, or null for a pointer gesture, so that undoing or
 * redoing it returns focus to the viewport rather than to an editor.
 */
export type HistoryOrigin = Readonly<{ kind: 'viewport'; handleKey: string | null }>

/** A document snapshot and the origin of the step between it and its neighbour. */
export type HistoryEntry = Readonly<{
  document: ExpressionDocument
  origin: HistoryOrigin | null
}>

export type DocumentHistory = Readonly<{
  past: readonly HistoryEntry[]
  present: ExpressionDocument
  future: readonly HistoryEntry[]
  transaction: Readonly<{ before: ExpressionDocument }> | null
  coalescing: Readonly<{ key: string; timestamp: number }> | null
  lastResult: CommandResult | null
  /** The origin of the step the last undo or redo traversed, if any. */
  lastTraversal: HistoryOrigin | null
}>

export type HistoryAction =
  | Readonly<{ type: 'execute'; command: DocumentCommand; coalesceKey?: string; timestamp?: number }>
  | Readonly<{ type: 'boundary' }>
  | Readonly<{ type: 'undo' }>
  | Readonly<{ type: 'redo' }>
  | Readonly<{ type: 'begin-transaction' }>
  | Readonly<{ type: 'commit-transaction'; origin?: HistoryOrigin }>
  | Readonly<{ type: 'cancel-transaction' }>
  | Readonly<{ type: 'replace'; document: ExpressionDocument }>
  | Readonly<{ type: 'update-view'; view: ExpressionDocument['view'] }>

export function createDocumentHistory(document: ExpressionDocument): DocumentHistory {
  return {
    past: [], present: document, future: [], transaction: null, coalescing: null, lastResult: null,
    lastTraversal: null,
  }
}

function bounded(entries: readonly HistoryEntry[]): readonly HistoryEntry[] {
  return entries.length <= MAX_HISTORY_ENTRIES ? entries : entries.slice(-MAX_HISTORY_ENTRIES)
}

export function documentHistoryReducer(state: DocumentHistory, action: HistoryAction): DocumentHistory {
  if (action.type === 'update-view') {
    const withView = (document: ExpressionDocument): ExpressionDocument =>
      ({ ...document, view: action.view })
    return {
      ...state,
      past: state.past.map((entry) => ({ ...entry, document: withView(entry.document) })),
      present: withView(state.present),
      future: state.future.map((entry) => ({ ...entry, document: withView(entry.document) })),
      transaction: state.transaction
        ? { before: withView(state.transaction.before) }
        : null,
      coalescing: null,
    }
  }
  if (action.type === 'boundary') return { ...state, coalescing: null }
  if (action.type === 'replace') return createDocumentHistory(action.document)
  if (action.type === 'begin-transaction')
    return state.transaction ? state : { ...state, transaction: { before: state.present }, coalescing: null }
  if (action.type === 'cancel-transaction')
    return state.transaction
      ? { ...state, present: state.transaction.before, transaction: null, coalescing: null, lastResult: null }
      : state
  if (action.type === 'commit-transaction') {
    if (!state.transaction) return state
    const changed = state.present !== state.transaction.before
    return {
      ...state,
      past: changed
        ? bounded([...state.past, { document: state.transaction.before, origin: action.origin ?? null }])
        : state.past,
      future: changed ? [] : state.future,
      transaction: null,
      coalescing: null,
    }
  }
  if (action.type === 'undo') {
    const previous = state.past.at(-1)
    if (!previous || state.transaction) return { ...state, coalescing: null }
    return {
      ...state,
      past: state.past.slice(0, -1), present: previous.document,
      future: [{ document: state.present, origin: previous.origin }, ...state.future],
      coalescing: null, lastResult: null, lastTraversal: previous.origin,
    }
  }
  if (action.type === 'redo') {
    const next = state.future[0]
    if (!next || state.transaction) return { ...state, coalescing: null }
    return {
      ...state,
      past: bounded([...state.past, { document: state.present, origin: next.origin }]),
      present: next.document,
      future: state.future.slice(1), coalescing: null, lastResult: null, lastTraversal: next.origin,
    }
  }

  const result = executeDocumentCommand(state.present, action.command)
  if (result.status !== 'applied') return { ...state, coalescing: null, lastResult: result }
  const timestamp = action.timestamp ?? Date.now()
  const coalesces = action.coalesceKey !== undefined &&
    state.coalescing?.key === action.coalesceKey &&
    timestamp - state.coalescing.timestamp <= KEYBOARD_COALESCE_MS
  return {
    ...state,
    past: state.transaction || coalesces
      ? state.past
      : bounded([...state.past, { document: state.present, origin: null }]),
    present: result.document,
    future: state.transaction ? state.future : [],
    coalescing: action.coalesceKey ? { key: action.coalesceKey, timestamp } : null,
    lastResult: result,
  }
}
