export const MAX_EXPRESSION_ITEMS = 1_000

export type ExpressionAppearance = Readonly<{
  visible?: boolean
  style?: string
  labelVisible?: boolean
  label?: string
}>

export type ExpressionItem = Readonly<{
  id: string
  source: string
  positionSource?: string
  normalization?: 'natural'
}>

export type ExpressionDocument = Readonly<{
  items: readonly ExpressionItem[]
  appearance: Readonly<Record<string, ExpressionAppearance>>
}>

/** Creates a document whose item identities are independent of their source. */
export function expressionDocument(
  items: readonly ExpressionItem[],
  appearance: Readonly<Record<string, ExpressionAppearance>> = {},
): ExpressionDocument {
  const retainedItems = items.slice(0, MAX_EXPRESSION_ITEMS)
  const retainedIds = new Set(retainedItems.map((item) => item.id))
  return {
    items: retainedItems.map((item) => ({ ...item })),
    appearance: Object.fromEntries(
      Object.entries(appearance)
        .filter(([id]) => retainedIds.has(id))
        .map(([id, value]) => [id, { ...value }]),
    ),
  }
}

/** Toggles the item's algebraic natural-normalization control. */
export function updateExpressionNormalization(
  document: ExpressionDocument,
  id: string,
  normalization: 'natural' | undefined,
): ExpressionDocument {
  return {
    ...document,
    items: document.items.map((item) =>
      item.id === id ? { ...item, normalization } : item,
    ),
  }
}

/** Updates renderer-independent presentation metadata without changing source. */
export function updateExpressionAppearance(
  document: ExpressionDocument,
  id: string,
  appearance: ExpressionAppearance,
): ExpressionDocument {
  return {
    ...document,
    appearance: {
      ...document.appearance,
      [id]: { ...document.appearance[id], ...appearance },
    },
  }
}

/**
 * Inserts an expression after the requested item, or at the end when no
 * matching item exists. A document at its normative item limit is unchanged.
 */
export function addExpression(
  document: ExpressionDocument,
  item: ExpressionItem,
  afterId?: string,
): ExpressionDocument {
  if (document.items.length >= MAX_EXPRESSION_ITEMS) return document

  const index =
    afterId === undefined
      ? document.items.length
      : document.items.findIndex((candidate) => candidate.id === afterId) + 1
  const insertionIndex = index <= 0 ? document.items.length : index

  return {
    ...document,
    items: [
      ...document.items.slice(0, insertionIndex),
      { ...item },
      ...document.items.slice(insertionIndex),
    ],
  }
}

/** Updates one item without changing its stable identity or list position. */
export function updateExpression(
  document: ExpressionDocument,
  id: string,
  source: string,
): ExpressionDocument {
  return {
    ...document,
    items: document.items.map((item) =>
      item.id === id ? { ...item, source } : item,
    ),
  }
}

/** Updates one item's optional position source without changing its value source. */
export function updateExpressionPosition(
  document: ExpressionDocument,
  id: string,
  positionSource: string,
): ExpressionDocument {
  return {
    ...document,
    items: document.items.map((item) =>
      item.id === id ? { ...item, positionSource } : item,
    ),
  }
}

/**
 * Removes every item and its appearance. The document identity survives, so
 * this is an emptying rather than a replacement.
 */
export function clearExpressions(
  document: ExpressionDocument,
): ExpressionDocument {
  return { ...document, items: [], appearance: {} }
}

/** Removes one item while preserving the identity and order of every sibling. */
export function deleteExpression(
  document: ExpressionDocument,
  id: string,
): ExpressionDocument {
  return {
    ...document,
    items: document.items.filter((item) => item.id !== id),
    appearance: Object.fromEntries(
      Object.entries(document.appearance).filter(([itemId]) => itemId !== id),
    ),
  }
}
