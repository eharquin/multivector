export const MAX_EXPRESSION_ITEMS = 1_000

export type ExpressionAppearance = Readonly<{
  visible?: boolean
  style?: string
  labelVisible?: boolean
  label?: string
  borderVisible?: boolean
}>

export type ExpressionControl = Readonly<{
  mode: 'number' | 'slider'
  minimumSource: string
  maximumSource: string
  stepSource: string
  animation: Readonly<{
    mode: 'once' | 'loop' | 'ping-pong'
    direction: 'forward' | 'reverse'
    durationSeconds: number
  }> | null
}>

export type ExpressionItem = Readonly<{
  id: string
  kind?: 'expression' | 'annotation'
  source: string
  positionSource?: string
  normalization?: 'natural'
  control?: ExpressionControl
}>

export type ExpressionDocument = Readonly<{
  id: string
  title: string
  description: string
  languageVersion: number
  algebra: Readonly<{
    algebraId: string
    definitionVersion: number
    conventionVersion: number
    parameters: Readonly<Record<string, unknown>>
  }>
  interpretation: Readonly<{
    interpretationId: string
    interpretationVersion: number
  }> | null
  view: Readonly<{
    visualizerId: string | null
    positionEnabled: boolean
    viewport: Readonly<{ kind: 'none' }> | Readonly<{
      kind: 'two-dimensional'
      centerX: number
      centerY: number
      zoom: number
    }>
    display: Readonly<{
      decimalPlaces: number
      axisLabelsVisible: boolean
      graduationsVisible: boolean
      gridVisible: boolean
      objectScale: number
    }>
  }>
  items: readonly ExpressionItem[]
  appearance: Readonly<Record<string, ExpressionAppearance>>
}>

/** Creates a document whose item identities are independent of their source. */
export function expressionDocument(
  items: readonly ExpressionItem[],
  appearance: Readonly<Record<string, ExpressionAppearance>> = {},
  metadata: Readonly<{ id?: string; title?: string; description?: string }> = {},
): ExpressionDocument {
  const retainedItems = items.slice(0, MAX_EXPRESSION_ITEMS)
  const retainedIds = new Set(retainedItems.map((item) => item.id))
  return {
    id: metadata.id ?? 'local-document',
    title: metadata.title ?? 'Untitled document',
    description: metadata.description ?? '',
    languageVersion: 1,
    algebra: {
      algebraId: 'org.multivector.vga',
      definitionVersion: 1,
      conventionVersion: 1,
      parameters: {},
    },
    interpretation: {
      interpretationId: 'org.multivector.vga-2d',
      interpretationVersion: 1,
    },
    view: {
      visualizerId: 'org.multivector.vga-2d',
      positionEnabled: true,
      viewport: { kind: 'two-dimensional', centerX: 0, centerY: 0, zoom: 72 },
      display: {
        decimalPlaces: 6,
        axisLabelsVisible: true,
        graduationsVisible: true,
        gridVisible: true,
        objectScale: 1,
      },
    },
    items: retainedItems.map((item) => ({ ...item })),
    appearance: Object.fromEntries(
      Object.entries(appearance)
        .filter(([id]) => retainedIds.has(id))
        .map(([id, value]) => [id, { ...value }]),
    ),
  }
}

/** The documented VGA(2) workflow shown for a new local browser session. */
export function vga2FoundationExampleDocument(): ExpressionDocument {
  return expressionDocument(
    [
      {
        id: 'item-1',
        source: 'V1 = vector(0.66, 3.042)',
      },
      {
        id: 'item-2',
        source: 'a = 0',
        control: {
          mode: 'slider',
          minimumSource: '0',
          maximumSource: 'tau',
          stepSource: '0.01',
          animation: {
            mode: 'loop',
            direction: 'forward',
            durationSeconds: 2,
          },
        },
      },
      { id: 'item-3', source: 'R = exp(0.5*a*e12)' },
      { id: 'item-4', source: 'V2 = R>>>V1' },
      { id: 'item-5', source: 'B = V1 ^ V2' },
    ],
    {},
    {
      id: 'vga2-foundation-example',
      title: 'VGA 2D Rotation Example',
      description:
        'A vector, a looping angle, its rotor, the rotated vector, and their bivector.',
    },
  )
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

/** Inserts an expression immediately before the requested item. */
export function addExpressionBefore(
  document: ExpressionDocument,
  item: ExpressionItem,
  beforeId: string,
): ExpressionDocument {
  if (document.items.length >= MAX_EXPRESSION_ITEMS) return document
  const index = document.items.findIndex((candidate) => candidate.id === beforeId)
  if (index < 0) return addExpression(document, item)
  return {
    ...document,
    items: [
      ...document.items.slice(0, index),
      { ...item },
      ...document.items.slice(index),
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
