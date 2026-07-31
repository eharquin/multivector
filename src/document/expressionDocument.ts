export const MAX_EXPRESSION_ITEMS = 1_000

export type ExpressionItem = Readonly<{
  id: string
  source: string
  positionSource?: string
}>

export type ExpressionDocument = Readonly<{
  items: readonly ExpressionItem[]
}>

/** Creates a document whose item identities are independent of their source. */
export function expressionDocument(
  items: readonly ExpressionItem[],
): ExpressionDocument {
  return {
    items: items.slice(0, MAX_EXPRESSION_ITEMS).map((item) => ({ ...item })),
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
    items: document.items.map((item) =>
      item.id === id ? { ...item, positionSource } : item,
    ),
  }
}

/** Removes one item while preserving the identity and order of every sibling. */
export function deleteExpression(
  document: ExpressionDocument,
  id: string,
): ExpressionDocument {
  return {
    items: document.items.filter((item) => item.id !== id),
  }
}
