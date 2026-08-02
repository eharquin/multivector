import { defaultStyleForKind, STUDIO_COLORS } from '../components/appearancePalette'
import type {
  ExpressionControl,
  ExpressionDocument,
  ExpressionItem,
} from './expressionDocument'

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024
export const MAX_SOURCE_LENGTH = 65_536
export const MAX_MIGRATION_STEPS = 32
export type ThemeMode = 'system' | 'light' | 'dark'
type Appearance = Readonly<{ visible: boolean; labelVisible: boolean; label: string; style: string }>
type Item = Readonly<{ id: string; kind: 'expression' | 'annotation'; source: string; positionSource: string | null; normalization: 'natural' | null; control: ExpressionControl | null }>
export type CanonicalViewport = Readonly<{ kind: 'none' }> | Readonly<{ kind: 'two-dimensional'; centerX: number; centerY: number; zoom: number }>

export type CanonicalDocument = Readonly<{
  id: string
  formatVersion: 1
  languageVersion: number
  algebra: Readonly<{ algebraId: string; definitionVersion: number; conventionVersion: number; parameters: Readonly<Record<string, unknown>> }>
  interpretation: Readonly<{ interpretationId: string; interpretationVersion: number }> | null
  metadata: Readonly<{ title: string; description: string }>
  items: readonly Item[]
  appearance: Readonly<Record<string, Appearance>>
  view: Readonly<{
    visualizerId: string | null
    positionEnabled: boolean
    viewport: CanonicalViewport
    display: Readonly<{ decimalPlaces: number; axisLabelsVisible: boolean; graduationsVisible: boolean; gridVisible: boolean; objectScale: number; theme: ThemeMode }>
  }>
}>

export class DocumentFormatError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'DocumentFormatError'
  }
}

const registeredStyles = new Set(STUDIO_COLORS.map(({ id }) => id))
const requiredRoot = ['id', 'formatVersion', 'languageVersion', 'algebra', 'interpretation', 'metadata', 'items', 'appearance', 'view']

function fail(code: string, message: string): never {
  throw new DocumentFormatError(code, message)
}

function record(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    fail('DOCUMENT_SCHEMA', path + ' must be an object.')
  const result = value as Record<string, unknown>
  const actual = Object.keys(result).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
    fail('DOCUMENT_UNKNOWN_FIELD', path + ' must contain exactly: ' + expected.join(', ') + '.')
  return result
}

function text(value: unknown, path: string, nonempty = false): string {
  if (typeof value !== 'string' || (nonempty && value.length === 0))
    fail('DOCUMENT_SCHEMA', path + ' must be a string' + (nonempty ? ' and cannot be empty.' : '.'))
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (next < 0xdc00 || next > 0xdfff) fail('DOCUMENT_UNICODE', path + ' contains a lone surrogate.')
      index += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) fail('DOCUMENT_UNICODE', path + ' contains a lone surrogate.')
  }
  return value
}

function truth(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail('DOCUMENT_SCHEMA', path + ' must be a boolean.')
  return value
}

function finite(value: unknown, path: string, positive = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (positive && value <= 0))
    fail('DOCUMENT_NUMBER', path + ' must be a finite' + (positive ? ' positive' : '') + ' number.')
  if (Number.isInteger(value) && !Number.isSafeInteger(value))
    fail('DOCUMENT_NUMBER', path + ' is outside the safe integer range.')
  return Object.is(value, -0) ? 0 : value
}

function positiveInteger(value: unknown, path: string): number {
  const result = finite(value, path, true)
  if (!Number.isSafeInteger(result)) fail('DOCUMENT_SCHEMA', path + ' must be a positive integer.')
  return result
}

function jsonValue(value: unknown, path: string): unknown {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'string') return text(value, path)
  if (typeof value === 'number') return finite(value, path)
  if (Array.isArray(value)) return value.map((entry, index) => jsonValue(entry, path + '[' + index + ']'))
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(
      ([key, entry]) => [text(key, path + ' key'), jsonValue(entry, path + '.' + key)],
    ))
  }
  fail('DOCUMENT_SCHEMA', path + ' is not a JSON value.')
}

function control(value: unknown, path: string): ExpressionControl | null {
  if (value === null) return null
  const item = record(value, path, ['mode', 'minimumSource', 'maximumSource', 'stepSource', 'animation'])
  if (item.mode !== 'number' && item.mode !== 'slider')
    fail('DOCUMENT_SCHEMA', path + '.mode is invalid.')
  const sources = ['minimumSource', 'maximumSource', 'stepSource'] as const
  const parsedSources = Object.fromEntries(sources.map((key) => {
    const source = text(item[key], path + '.' + key)
    if (source.length > MAX_SOURCE_LENGTH) fail('LIMIT_SOURCE_LENGTH', path + '.' + key + ' exceeds the source limit.')
    return [key, source]
  })) as Pick<ExpressionControl, typeof sources[number]>
  let animation: ExpressionControl['animation'] = null
  if (item.animation !== null) {
    const value = record(item.animation, path + '.animation', ['mode', 'direction', 'durationSeconds'])
    if (value.mode !== 'once' && value.mode !== 'loop' && value.mode !== 'ping-pong')
      fail('DOCUMENT_SCHEMA', path + '.animation.mode is invalid.')
    if (value.direction !== 'forward' && value.direction !== 'reverse')
      fail('DOCUMENT_SCHEMA', path + '.animation.direction is invalid.')
    animation = {
      mode: value.mode,
      direction: value.direction,
      durationSeconds: finite(value.durationSeconds, path + '.animation.durationSeconds', true),
    }
  }
  return { mode: item.mode, ...parsedSources, animation }
}

// JSON.parse does not expose duplicate members. Scan the bounded input first,
// then let JSON.parse enforce the remaining JSON grammar.
function rejectDuplicateKeys(source: string): void {
  const stack: Array<{ keys: Set<string>; expectsKey: boolean }> = []
  let inString = false
  let escaped = false
  let start = 0
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') {
        inString = false
        const frame = stack.at(-1)
        let cursor = index + 1
        while (/\s/.test(source[cursor] ?? '')) cursor += 1
        if (frame?.expectsKey && source[cursor] === ':') {
          const key = JSON.parse(source.slice(start, index + 1)) as string
          if (frame.keys.has(key)) fail('DOCUMENT_DUPLICATE_KEY', 'Duplicate object key “' + key + '”.')
          frame.keys.add(key)
          frame.expectsKey = false
        }
      }
      continue
    }
    if (char === '"') { inString = true; start = index }
    else if (char === '{') stack.push({ keys: new Set(), expectsKey: true })
    else if (char === '}') stack.pop()
    else if (char === ',' && stack.length > 0) stack[stack.length - 1].expectsKey = true
  }
}

export function parseCanonicalDocument(source: string): CanonicalDocument {
  if (new TextEncoder().encode(source).byteLength > MAX_DOCUMENT_BYTES)
    fail('LIMIT_DOCUMENT_DECODED_SIZE', 'Document exceeds the 4 MiB limit.')
  rejectDuplicateKeys(source)
  let value: unknown
  try { value = JSON.parse(source) } catch { fail('DOCUMENT_JSON', 'Document is not valid JSON.') }
  return validateCanonicalDocument(migrateDocument(value))
}

/**
 * Version-selection boundary. Version one needs no transform; future formats
 * add one deterministic step at a time here, bounded before schema evaluation.
 */
export function migrateDocument(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    fail('DOCUMENT_SCHEMA', 'document must be an object.')
  const version = (value as Record<string, unknown>).formatVersion
  if (version === 1) return value
  fail('DOCUMENT_FORMAT_VERSION', 'Unsupported format version ' + String(version) + '.')
}

export function parseCanonicalDocumentBytes(bytes: Uint8Array): CanonicalDocument {
  if (bytes.byteLength > MAX_DOCUMENT_BYTES)
    fail('LIMIT_DOCUMENT_DECODED_SIZE', 'Document exceeds the 4 MiB limit.')
  let source: string
  try {
    source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } catch {
    fail('DOCUMENT_UTF8', 'Document is not valid UTF-8.')
  }
  if (source.charCodeAt(0) === 0xfeff)
    fail('DOCUMENT_BOM', 'A canonical document cannot contain a byte-order mark.')
  return parseCanonicalDocument(source)
}

export function validateCanonicalDocument(value: unknown): CanonicalDocument {
  const root = record(value, 'document', requiredRoot)
  if (root.formatVersion !== 1) fail('DOCUMENT_FORMAT_VERSION', 'Unsupported format version ' + String(root.formatVersion) + '.')
  const algebra = record(root.algebra, 'algebra', ['algebraId', 'definitionVersion', 'conventionVersion', 'parameters'])
  if (algebra.parameters === null || typeof algebra.parameters !== 'object' || Array.isArray(algebra.parameters))
    fail('DOCUMENT_SCHEMA', 'algebra.parameters must be an object.')
  const parameters = jsonValue(algebra.parameters, 'algebra.parameters') as Record<string, unknown>
  const metadata = record(root.metadata, 'metadata', ['title', 'description'])
  if (!Array.isArray(root.items)) fail('DOCUMENT_SCHEMA', 'items must be an array.')
  if (root.items.length > 1_000) fail('LIMIT_ITEM_COUNT', 'A document may contain at most 1000 items.')
  const ids = new Set<string>()
  const items = root.items.map((entry, index): Item => {
    const path = 'items[' + index + ']'
    const item = record(entry, path, ['id', 'kind', 'source', 'positionSource', 'normalization', 'control'])
    const id = text(item.id, path + '.id', true)
    if (ids.has(id)) fail('DOCUMENT_DUPLICATE_ID', 'Duplicate item identity “' + id + '”.')
    ids.add(id)
    if (item.kind !== 'expression' && item.kind !== 'annotation') fail('DOCUMENT_SCHEMA', path + '.kind is invalid.')
    const source = text(item.source, path + '.source')
    if (source.length > MAX_SOURCE_LENGTH) fail('LIMIT_SOURCE_LENGTH', path + '.source exceeds the source limit.')
    const positionSource = item.positionSource === null ? null : text(item.positionSource, path + '.positionSource')
    if (positionSource !== null && positionSource.length > MAX_SOURCE_LENGTH) fail('LIMIT_SOURCE_LENGTH', path + '.positionSource exceeds the source limit.')
    if (item.normalization !== null && item.normalization !== 'natural') fail('DOCUMENT_SCHEMA', path + '.normalization is invalid.')
    const parsedControl = control(item.control, path + '.control')
    if (item.kind === 'annotation' && (positionSource !== null || item.normalization !== null || parsedControl !== null))
      fail('DOCUMENT_SCHEMA', 'Annotations cannot have position, normalization, or controls.')
    return { id, kind: item.kind, source, positionSource, normalization: item.normalization as 'natural' | null, control: parsedControl }
  })
  if (root.appearance === null || typeof root.appearance !== 'object' || Array.isArray(root.appearance))
    fail('DOCUMENT_SCHEMA', 'appearance must be an object.')
  const appearance: Record<string, Appearance> = {}
  for (const [id, entry] of Object.entries(root.appearance as Record<string, unknown>)) {
    if (!ids.has(id)) fail('DOCUMENT_ORPHAN_APPEARANCE', 'Appearance refers to unknown item “' + id + '”.')
    const item = record(entry, 'appearance.' + id, ['visible', 'labelVisible', 'label', 'style'])
    const style = text(item.style, 'appearance.' + id + '.style', true)
    if (!registeredStyles.has(style)) fail('DOCUMENT_STYLE', 'Unknown style “' + style + '”.')
    appearance[id] = { visible: truth(item.visible, 'appearance.' + id + '.visible'), labelVisible: truth(item.labelVisible, 'appearance.' + id + '.labelVisible'), label: text(item.label, 'appearance.' + id + '.label'), style }
  }
  if (Object.keys(appearance).length !== items.length) fail('DOCUMENT_SCHEMA', 'Every item requires one appearance record.')
  const interpretation = root.interpretation === null ? null : record(root.interpretation, 'interpretation', ['interpretationId', 'interpretationVersion'])
  const view = record(root.view, 'view', ['visualizerId', 'positionEnabled', 'viewport', 'display'])
  if (view.viewport === null || typeof view.viewport !== 'object' || Array.isArray(view.viewport))
    fail('DOCUMENT_VIEWPORT', 'view.viewport must be a closed viewport object.')
  const viewportKind = (view.viewport as Record<string, unknown>).kind
  let viewport: CanonicalViewport
  if (viewportKind === 'none') {
    record(view.viewport, 'view.viewport', ['kind'])
    viewport = { kind: 'none' }
  } else if (viewportKind === 'two-dimensional') {
    const value = record(view.viewport, 'view.viewport', ['kind', 'centerX', 'centerY', 'zoom'])
    viewport = {
      kind: 'two-dimensional',
      centerX: finite(value.centerX, 'view.viewport.centerX'),
      centerY: finite(value.centerY, 'view.viewport.centerY'),
      zoom: finite(value.zoom, 'view.viewport.zoom', true),
    }
  } else {
    fail('DOCUMENT_VIEWPORT', 'view.viewport.kind must be “none” or “two-dimensional”.')
  }
  const display = record(view.display, 'view.display', ['decimalPlaces', 'axisLabelsVisible', 'graduationsVisible', 'gridVisible', 'objectScale', 'theme'])
  const decimalPlaces = finite(display.decimalPlaces, 'view.display.decimalPlaces')
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 15)
    fail('DOCUMENT_SCHEMA', 'decimalPlaces must be an integer from 0 through 15.')
  if (!['light', 'dark', 'system'].includes(display.theme as string))
    fail('DOCUMENT_SCHEMA', 'view.display.theme is invalid.')
  return {
    id: text(root.id, 'document.id', true), formatVersion: 1,
    languageVersion: positiveInteger(root.languageVersion, 'languageVersion'),
    algebra: { algebraId: text(algebra.algebraId, 'algebra.algebraId', true), definitionVersion: positiveInteger(algebra.definitionVersion, 'algebra.definitionVersion'), conventionVersion: positiveInteger(algebra.conventionVersion, 'algebra.conventionVersion'), parameters },
    interpretation: interpretation && { interpretationId: text(interpretation.interpretationId, 'interpretation.interpretationId', true), interpretationVersion: positiveInteger(interpretation.interpretationVersion, 'interpretation.interpretationVersion') },
    metadata: { title: text(metadata.title, 'metadata.title'), description: text(metadata.description, 'metadata.description') },
    items, appearance,
    view: {
      visualizerId: view.visualizerId === null ? null : text(view.visualizerId, 'view.visualizerId', true),
      positionEnabled: truth(view.positionEnabled, 'view.positionEnabled'),
      viewport,
      display: { decimalPlaces, axisLabelsVisible: truth(display.axisLabelsVisible, 'view.display.axisLabelsVisible'), graduationsVisible: truth(display.graduationsVisible, 'view.display.graduationsVisible'), gridVisible: truth(display.gridVisible, 'view.display.gridVisible'), objectScale: finite(display.objectScale, 'view.display.objectScale', true), theme: display.theme as ThemeMode },
    },
  }
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) as number)
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) as number)
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    if (leftPoints[index] !== rightPoints[index]) return leftPoints[index] - rightPoints[index]
  }
  return leftPoints.length - rightPoints.length
}

export function serializeCanonicalDocument(document: CanonicalDocument): string {
  const source = canonicalJson(validateCanonicalDocument(document))
  if (new TextEncoder().encode(source).byteLength > MAX_DOCUMENT_BYTES)
    fail('LIMIT_DOCUMENT_DECODED_SIZE', 'Document exceeds the 4 MiB limit.')
  return source
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value)
  if (typeof value === 'number')
    return Object.is(value, -0) ? '0' : JSON.stringify(value)
  if (Array.isArray(value))
    return '[' + value.map(canonicalJson).join(',') + ']'
  const object = value as Record<string, unknown>
  return '{' + Object.keys(object).sort(compareCodePoints).map(
    (key) => JSON.stringify(key) + ':' + canonicalJson(object[key]),
  ).join(',') + '}'
}

export function toCanonicalDocument(
  document: ExpressionDocument,
  theme: ThemeMode,
  resolvedStyles: Readonly<Record<string, string>> = {},
): CanonicalDocument {
  const appearance = Object.fromEntries(document.items.map((item) => {
    const stored = document.appearance[item.id]
    return [item.id, { visible: stored?.visible ?? true, labelVisible: stored?.labelVisible ?? true, label: stored?.label ?? '', style: stored?.style ?? resolvedStyles[item.id] ?? defaultStyleForKind('Object') }]
  }))
  return validateCanonicalDocument({
    id: document.id, formatVersion: 1, languageVersion: document.languageVersion,
    algebra: document.algebra,
    interpretation: document.interpretation,
    metadata: { title: document.title, description: document.description },
    items: document.items.map((item) => ({ id: item.id, kind: item.kind ?? 'expression', source: item.source, positionSource: item.positionSource ?? null, normalization: item.normalization ?? null, control: item.control ?? null })),
    appearance,
    view: {
      ...document.view,
      display: { ...document.view.display, theme },
    },
  })
}

export type RestoredCanonicalDocument = Readonly<{
  document: ExpressionDocument
  theme: ThemeMode
  recoveryDiagnostic: string | null
}>

export function fromCanonicalDocument(document: CanonicalDocument): RestoredCanonicalDocument {
  const items: ExpressionItem[] = document.items.map((item) => ({
    id: item.id, ...(item.kind === 'annotation' ? { kind: item.kind } : {}), source: item.source,
    ...(item.positionSource === null ? {} : { positionSource: item.positionSource }),
    ...(item.normalization === null ? {} : { normalization: item.normalization }),
    ...(item.control === null ? {} : { control: item.control }),
  }))
  const { theme, ...display } = document.view.display
  return {
    document: {
      id: document.id,
      title: document.metadata.title,
      description: document.metadata.description,
      languageVersion: document.languageVersion,
      algebra: document.algebra,
      interpretation: document.interpretation,
      view: { ...document.view, display },
      items,
      appearance: document.appearance,
    },
    theme,
    recoveryDiagnostic: document.view.viewport.kind === 'none' && document.view.visualizerId === null
      ? null
      : document.view.viewport.kind === 'two-dimensional' &&
          document.view.visualizerId === 'org.multivector.vga-2d'
        ? null
        : 'DOCUMENT_VIEW_UNSUPPORTED: The document was preserved, but its visualizer and viewport combination cannot be displayed by this runtime.',
  }
}

export type ImportCollisionChoice = 'replace' | 'duplicate'

/** Resolves STORE-007 without mutating the validated imported revision. */
export function resolveCanonicalImport(
  currentDocumentId: string,
  imported: CanonicalDocument,
  choice: ImportCollisionChoice,
  createId: () => string = () => crypto.randomUUID(),
): CanonicalDocument {
  if (currentDocumentId !== imported.id || choice === 'replace') return imported

  const reserved = new Set([currentDocumentId, imported.id, ...imported.items.map((item) => item.id)])
  const freshId = (): string => {
    for (let attempt = 0; attempt < 1_000; attempt += 1) {
      const id = createId()
      if (id.length > 0 && !reserved.has(id)) {
        reserved.add(id)
        return id
      }
    }
    fail('DOCUMENT_ID_GENERATION', 'Fresh identities could not be generated for the duplicated document.')
  }
  const documentId = freshId()
  const itemIds = new Map(imported.items.map((item) => [item.id, freshId()]))
  return validateCanonicalDocument({
    ...imported,
    id: documentId,
    items: imported.items.map((item) => ({ ...item, id: itemIds.get(item.id)! })),
    appearance: Object.fromEntries(Object.entries(imported.appearance).map(
      ([id, appearance]) => [itemIds.get(id)!, appearance],
    )),
  })
}
