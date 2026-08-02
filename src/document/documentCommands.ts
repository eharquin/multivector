import {
  MAX_EXPRESSION_ITEMS,
  type ExpressionAppearance,
  type ExpressionControl,
  type ExpressionDocument,
  type ExpressionItem,
} from './expressionDocument'

export type DocumentCommand =
  | Readonly<{ kind: 'insert-item'; item: ExpressionItem; anchorId?: string; placement?: 'before' | 'after' }>
  | Readonly<{ kind: 'delete-item'; itemId: string }>
  | Readonly<{ kind: 'clear-items' }>
  | Readonly<{ kind: 'update-source'; itemId: string; source: string }>
  | Readonly<{ kind: 'update-position'; itemId: string; positionSource: string }>
  | Readonly<{ kind: 'update-normalization'; itemId: string; normalization?: 'natural' }>
  | Readonly<{ kind: 'update-appearance'; itemId: string; appearance: ExpressionAppearance }>
  | Readonly<{ kind: 'update-control'; itemId: string; control?: ExpressionControl }>
  | Readonly<{ kind: 'update-algebra'; algebra: ExpressionDocument['algebra']; interpretation: ExpressionDocument['interpretation'] }>
  | Readonly<{
      kind: 'rewrite-source-literal'
      itemId: string
      property: 'source' | 'positionSource'
      span: Readonly<{ start: number; end: number }>
      replacement: string
    }>

export type CommandResult =
  | Readonly<{ status: 'applied'; document: ExpressionDocument }>
  | Readonly<{ status: 'unsupported' | 'invalid'; document: ExpressionDocument; reason: string }>

function itemIndex(document: ExpressionDocument, itemId: string): number {
  return document.items.findIndex((item) => item.id === itemId)
}

function invalid(document: ExpressionDocument, reason: string): CommandResult {
  return { status: 'invalid', document, reason }
}

/** Applies document-owned changes by stable identity, without consulting evaluated or rendered state. */
export function executeDocumentCommand(
  document: ExpressionDocument,
  command: DocumentCommand,
): CommandResult {
  if (command.kind === 'clear-items') {
    if (document.items.length === 0) return invalid(document, 'The document is already empty.')
    return { status: 'applied', document: { ...document, items: [], appearance: {} } }
  }

  if (command.kind === 'insert-item') {
    if (!command.item.id) return invalid(document, 'An item identity cannot be empty.')
    if (itemIndex(document, command.item.id) >= 0)
      return invalid(document, `Item “${command.item.id}” already exists.`)
    if (document.items.length >= MAX_EXPRESSION_ITEMS)
      return invalid(document, `A document may contain at most ${MAX_EXPRESSION_ITEMS} items.`)
    let index = document.items.length
    if (command.anchorId !== undefined) {
      const anchor = itemIndex(document, command.anchorId)
      if (anchor < 0) return invalid(document, `Item “${command.anchorId}” does not exist.`)
      index = anchor + (command.placement === 'before' ? 0 : 1)
    }
    return {
      status: 'applied',
      document: {
        ...document,
        items: [...document.items.slice(0, index), { ...command.item }, ...document.items.slice(index)],
      },
    }
  }

  if (command.kind === 'update-algebra') {
    return {
      status: 'applied',
      document: { ...document, algebra: command.algebra, interpretation: command.interpretation },
    }
  }

  const index = itemIndex(document, command.itemId)
  if (index < 0) return invalid(document, `Item “${command.itemId}” does not exist.`)
  const item = document.items[index]

  if (command.kind === 'delete-item') {
    return {
      status: 'applied',
      document: {
        ...document,
        items: document.items.filter(({ id }) => id !== command.itemId),
        appearance: Object.fromEntries(Object.entries(document.appearance)
          .filter(([id]) => id !== command.itemId)),
      },
    }
  }
  if (command.kind === 'update-position' && item.kind === 'annotation')
    return { status: 'unsupported', document, reason: 'Annotations do not own position source.' }
  if ((command.kind === 'update-normalization' || command.kind === 'update-control') && item.kind === 'annotation')
    return { status: 'unsupported', document, reason: 'Annotations do not own algebraic controls.' }

  if (command.kind === 'rewrite-source-literal') {
    if (item.kind === 'annotation')
      return { status: 'unsupported', document, reason: 'Annotations are non-executable and cannot be inverse-edited.' }
    const source = command.property === 'source' ? item.source : item.positionSource
    if (source === undefined)
      return { status: 'unsupported', document, reason: 'The requested source property is not present.' }
    const { start, end } = command.span
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > source.length)
      return invalid(document, 'The requested source span is invalid.')
    const numericLiteral = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
    if (!numericLiteral.test(source.slice(start, end))) {
      return {
        status: 'unsupported', document,
        reason: 'Only a direct numeric or unary-signed numeric literal can be rewritten.',
      }
    }
    if (!numericLiteral.test(command.replacement) || !Number.isFinite(Number(command.replacement)))
      return invalid(document, 'The replacement must be a finite numeric literal.')
    const rewritten = source.slice(0, start) + command.replacement + source.slice(end)
    const replacement = command.property === 'source'
      ? { ...item, source: rewritten }
      : { ...item, positionSource: rewritten }
    return {
      status: 'applied',
      document: {
        ...document,
        items: document.items.map((candidate, candidateIndex) =>
          candidateIndex === index ? replacement : candidate),
      },
    }
  }

  if (command.kind === 'update-appearance') {
    return {
      status: 'applied',
      document: {
        ...document,
        appearance: {
          ...document.appearance,
          [command.itemId]: { ...document.appearance[command.itemId], ...command.appearance },
        },
      },
    }
  }

  const replacement = command.kind === 'update-source'
    ? { ...item, source: command.source }
    : command.kind === 'update-position'
      ? { ...item, positionSource: command.positionSource }
      : command.kind === 'update-normalization'
        ? { ...item, normalization: command.normalization }
        : { ...item, control: command.control }
  return {
    status: 'applied',
    document: {
      ...document,
      items: document.items.map((candidate, candidateIndex) =>
        candidateIndex === index ? replacement : candidate),
    },
  }
}
