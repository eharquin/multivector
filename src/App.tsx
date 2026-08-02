import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createVga2Engine } from './algebra/vgaEngine'
import { evaluateDocument } from './application/evaluateDocument'
import { AlgebraInfoDialog } from './components/AlgebraInfoDialog'
import { ExpressionReferenceDialog } from './components/ExpressionReferenceDialog'
import { AppearancePopover } from './components/AppearancePopover'
import { ClearExpressionsButton } from './components/ClearExpressionsButton'
import { resolveItemAppearance } from './components/appearancePalette'
import {
  describeVga2Entity,
  supportsVga2Position,
} from './geometry/vga2Interpretation'
import {
  expressionDocument,
  MAX_EXPRESSION_ITEMS,
  vga2FoundationExampleDocument,
  type ExpressionItem,
} from './document/expressionDocument'
import { type DocumentCommand } from './document/documentCommands'
import {
  createDocumentHistory,
  documentHistoryReducer,
} from './document/documentHistory'
import { toScreen, type Viewport2d } from './visualization/viewport'
import { limitRenderedListElements } from './visualization/primitives'
import {
  DocumentFormatError,
  fromCanonicalDocument,
  parseCanonicalDocumentBytes,
  resolveCanonicalImport,
  serializeCanonicalDocument,
  toCanonicalDocument,
  type ThemeMode,
} from './document/canonicalDocument'
import { browserDocumentStorage } from './document/documentStorage'
import './App.css'

const engine = createVga2Engine()
const MIN_PANEL_WIDTH = 240
const MAX_PANEL_WIDTH = 720
type EditorFocus = Readonly<{
  id: string
  start: number
  end: number
  direction: 'forward' | 'backward' | 'none'
}>

function declaredName(source: string): string | null {
  return /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(source)?.[1] ?? null
}

const defaultViewport: Viewport2d = {
  width: 640,
  height: 480,
  centerX: 0,
  centerY: 0,
  pixelsPerUnit: 72,
}

function App() {
  const persistence = useMemo(
    () => browserDocumentStorage(window.localStorage),
    [],
  )
  const [initial] = useState(() => {
    const fallback = {
      document: import.meta.env.MODE === 'test'
        ? expressionDocument([{ id: 'item-1', source: 'vector(2, 1)' }])
        : vga2FoundationExampleDocument(),
      theme: 'system' as ThemeMode,
      diagnostic: null as string | null,
    }
    if (import.meta.env.MODE === 'test') return fallback
    try {
      const stored = persistence.load()
      if (stored === null) return fallback
      const restored = fromCanonicalDocument(stored)
      return { ...restored, diagnostic: restored.recoveryDiagnostic }
    } catch (error) {
      return {
        ...fallback,
        diagnostic: error instanceof DocumentFormatError
          ? error.code + ': ' + error.message
          : 'STORE_READ_FAILED: The saved document could not be restored.',
      }
    }
  })
  const [history, dispatchHistory] = useReducer(
    documentHistoryReducer,
    initial.document,
    createDocumentHistory,
  )
  const expressionDoc = history.present
  const executeCommand = useCallback((
    command: DocumentCommand,
    coalesceKey?: string,
  ) => dispatchHistory({ type: 'execute', command, coalesceKey }), [])
  const nextId = useRef(2)
  const inputRefs = useRef(new Map<string, HTMLInputElement>())
  const pendingFocus = useRef<string | null>(null)
  const lastEditorFocus = useRef<EditorFocus | null>(null)
  const pendingHistoryFocus = useRef(lastEditorFocus.current)
  const removedEditorFallbacks = useRef(new Map<string, EditorFocus>())
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const algebraInfoButtonRef = useRef<HTMLButtonElement>(null)
  const expressionReferenceButtonRef = useRef<HTMLButtonElement>(null)
  const resizeDrag = useRef<Readonly<{ startX: number; startWidth: number }> | null>(
    null,
  )
  const appearanceAnchorRef = useRef<HTMLButtonElement | null>(null)
  const [panelWidth, setPanelWidth] = useState(340)
  const [appearanceItemId, setAppearanceItemId] = useState<string | null>(null)
  const [expandedListIds, setExpandedListIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [theme, setTheme] = useState<ThemeMode>(initial.theme)
  const [documentDiagnostic, setDocumentDiagnostic] = useState<string | null>(
    initial.diagnostic,
  )
  const [infoDialog, setInfoDialog] = useState<
    'algebra' | 'expressions' | null
  >(null)
  const closeInfoDialog = useCallback(() => setInfoDialog(null), [])
  const closeAppearance = useCallback(() => {
    setAppearanceItemId(null)
    dispatchHistory({ type: 'boundary' })
  }, [])
  const rememberEditorFocus = (element: HTMLInputElement) => {
    lastEditorFocus.current = {
      id: element.id,
      start: element.selectionStart ?? 0,
      end: element.selectionEnd ?? element.selectionStart ?? 0,
      direction: element.selectionDirection ?? 'none',
    }
  }
  const dispatchHistoryWithFocus = useCallback((type: 'undo' | 'redo') => {
    pendingHistoryFocus.current = lastEditorFocus.current
    dispatchHistory({ type })
  }, [])

  const viewport: Viewport2d = expressionDoc.view.viewport.kind === 'two-dimensional'
    ? {
        ...defaultViewport,
        centerX: expressionDoc.view.viewport.centerX,
        centerY: expressionDoc.view.viewport.centerY,
        pixelsPerUnit: expressionDoc.view.viewport.zoom,
      }
    : defaultViewport
  const visualizerActive = expressionDoc.view.visualizerId === 'org.multivector.vga-2d' &&
    expressionDoc.view.viewport.kind === 'two-dimensional'

  const evaluatedItems = useMemo(
    () => evaluateDocument(expressionDoc, engine),
    [expressionDoc],
  )
  const resolvedStyles = useMemo(
    () => Object.fromEntries(evaluatedItems.map(({ item, evaluation }) => {
      const kind = evaluation?.status === 'valid'
        ? evaluation.valueType === 'list'
          ? 'List'
          : describeVga2Entity(evaluation.entity)
        : 'Object'
      return [item.id, resolveItemAppearance(expressionDoc.appearance[item.id], kind, declaredName(item.source)).styleId]
    })),
    [evaluatedItems, expressionDoc.appearance],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const handleHistoryShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const key = event.key.toLowerCase()
      const action = key === 'z'
        ? event.shiftKey ? 'redo' : 'undo'
        : key === 'y' && !event.shiftKey ? 'redo' : null
      if (!action) return
      event.preventDefault()
      dispatchHistoryWithFocus(action)
    }
    window.addEventListener('keydown', handleHistoryShortcut)
    return () => window.removeEventListener('keydown', handleHistoryShortcut)
  }, [dispatchHistoryWithFocus])

  useEffect(() => {
    const result = history.lastResult
    if (result && result.status !== 'applied') {
      setDocumentDiagnostic(`COMMAND_${result.status.toUpperCase()}: ${result.reason}`)
    }
  }, [history.lastResult])

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    try {
      persistence.save(toCanonicalDocument(expressionDoc, theme, resolvedStyles))
      setDocumentDiagnostic((current) => current?.startsWith('DOCUMENT_VIEW_UNSUPPORTED') ? current : null)
    } catch {
      setDocumentDiagnostic('STORE_WRITE_FAILED: Changes remain open, but the last saved revision was retained.')
    }
  }, [expressionDoc, persistence, resolvedStyles, theme])

  const origin = toScreen(viewport, { x: 0, y: 0 })
  const renderedPrimitives = evaluatedItems.flatMap((evaluated) => {
    if (evaluated.evaluation?.status !== 'valid') return []
    const kind = evaluated.evaluation.valueType === 'list'
      ? `List (${evaluated.evaluation.value.elements.length})`
      : describeVga2Entity(evaluated.evaluation.entity)
    const { visible, color, labelVisible, displayLabel } = resolveItemAppearance(
      expressionDoc.appearance[evaluated.item.id],
      kind,
      declaredName(evaluated.item.source),
    )
    if (!visible) return []
    const baseLabel = displayLabel
    return evaluated.evaluation.valueType === 'list'
      ? limitRenderedListElements(
          evaluated.evaluation.elements.filter((element) => element.primitive),
        ).visible
        .flatMap((element, elementIndex) => element.primitive
        ? [{
            id: `${evaluated.item.id}:${element.id}`,
            primitive: element.primitive,
            color,
            label: labelVisible ? (baseLabel ? `${baseLabel}[${elementIndex}]` : element.primitive.accessibleName) : null,
          }]
        : [])
      : evaluated.evaluation.primitive
        ? [{
            id: evaluated.item.id,
            primitive: evaluated.evaluation.primitive,
            color,
            label: labelVisible ? (baseLabel ?? evaluated.evaluation.primitive.accessibleName) : null,
          }]
        : []
  })
  const omittedRenderElements = evaluatedItems.reduce((total, evaluated) => {
    if (evaluated.evaluation?.status !== 'valid' ||
        evaluated.evaluation.valueType !== 'list') return total
    return total + limitRenderedListElements(
      evaluated.evaluation.elements.filter((element) => element.primitive),
    ).omitted
  }, 0)
  const renderedVectors = renderedPrimitives.flatMap(({ id, primitive, color, label }) => {
    if (primitive.kind !== 'oriented-segment') return []
    return [{
        id,
        primitive,
        color,
        label,
        start: toScreen(viewport, primitive.start),
        end: toScreen(viewport, primitive.end),
      }]
  })
  const renderedAreas = renderedPrimitives.flatMap(({ id, primitive, color, label }) => {
    if (primitive.kind !== 'oriented-area') return []
    if (primitive.shape.kind === 'parallelogram') {
      const points = primitive.shape.vertices.map((point) => toScreen(viewport, point))
      return [{
        id,
        primitive,
        color,
        label,
        path: `${points.map((point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`,
        labelPoint: points[2],
      }]
    }
    const center = toScreen(viewport, primitive.shape.center)
    const radius = primitive.shape.radius * viewport.pixelsPerUnit
    const sweep = primitive.orientation === 'counterclockwise' ? 1 : 0
    return [{
      id,
      primitive,
      color,
      label,
      path: `M ${center.x + radius} ${center.y} ` +
        `A ${radius} ${radius} 0 1 ${sweep} ${center.x - radius} ${center.y} ` +
        `A ${radius} ${radius} 0 1 ${sweep} ${center.x + radius} ${center.y} Z`,
      labelPoint: { x: center.x + radius, y: center.y - radius },
    }]
  })

  useEffect(() => {
    const id = pendingFocus.current
    if (id) {
      inputRefs.current.get(id)?.focus()
      pendingFocus.current = null
      return
    }
    const selection = pendingHistoryFocus.current
    if (!selection) return
    pendingHistoryFocus.current = null
    let restoredSelection = selection
    let input = document.getElementById(restoredSelection.id)
    if (!(input instanceof HTMLInputElement)) {
      const fallback = removedEditorFallbacks.current.get(selection.id)
      if (fallback) {
        restoredSelection = fallback
        input = document.getElementById(fallback.id)
      }
    }
    if (!(input instanceof HTMLInputElement)) return
    input.focus()
    const maximum = input.value.length
    input.setSelectionRange(
      Math.min(restoredSelection.start, maximum),
      Math.min(restoredSelection.end, maximum),
      restoredSelection.direction,
    )
    rememberEditorFocus(input)
  }, [expressionDoc])

  useEffect(() => {
    const resize = (clientX: number) => {
      const drag = resizeDrag.current
      if (!drag) return
      const availableWidth = Math.max(
        MIN_PANEL_WIDTH,
        window.innerWidth - 280,
      )
      const maximum = Math.min(MAX_PANEL_WIDTH, availableWidth)
      setPanelWidth(
        Math.max(
          MIN_PANEL_WIDTH,
          Math.min(maximum, drag.startWidth + clientX - drag.startX),
        ),
      )
    }
    const handlePointerMove = (event: PointerEvent) => resize(event.clientX)
    const handlePointerUp = () => {
      resizeDrag.current = null
      document.body.classList.remove('resizing-panel')
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.classList.remove('resizing-panel')
    }
  }, [])

  const beginPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    resizeDrag.current = {
      startX: event.clientX,
      startWidth: panelWidth,
    }
    document.body.classList.add('resizing-panel')
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  const resizePanelWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const maximum = Math.min(
      MAX_PANEL_WIDTH,
      Math.max(MIN_PANEL_WIDTH, window.innerWidth - 280),
    )
    let next = panelWidth
    if (event.key === 'ArrowLeft') next -= 16
    else if (event.key === 'ArrowRight') next += 16
    else if (event.key === 'Home') next = MIN_PANEL_WIDTH
    else if (event.key === 'End') next = maximum
    else return

    event.preventDefault()
    setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(maximum, next)))
  }

  const insertExpression = (
    anchorId?: string,
    placement: 'before' | 'after' = 'after',
  ) => {
    if (expressionDoc.items.length >= MAX_EXPRESSION_ITEMS) return
    let id = `item-${nextId.current++}`
    while (expressionDoc.items.some((item) => item.id === id)) {
      id = `item-${nextId.current++}`
    }
    const originatingEditor = lastEditorFocus.current
    const fallbackItemId = anchorId ?? expressionDoc.items.at(-1)?.id
    if (originatingEditor) {
      removedEditorFallbacks.current.set(`expression-source-${id}`, originatingEditor)
    } else if (fallbackItemId) {
      removedEditorFallbacks.current.set(`expression-source-${id}`, {
        id: `expression-source-${fallbackItemId}`,
        start: 0,
        end: 0,
        direction: 'none',
      })
    }
    pendingFocus.current = id
    executeCommand({
      kind: 'insert-item', item: { id, source: '' }, anchorId, placement,
    })
  }

  const importDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = parseCanonicalDocumentBytes(new Uint8Array(await file.arrayBuffer()))
      const collision = parsed.id === expressionDoc.id
      const choice = collision && !window.confirm(
        'A document with this identity is already open. Choose OK to replace it, or Cancel to duplicate the import with fresh identities.',
      ) ? 'duplicate' : 'replace'
      const imported = fromCanonicalDocument(
        resolveCanonicalImport(expressionDoc.id, parsed, choice),
      )
      dispatchHistory({ type: 'replace', document: imported.document })
      setTheme(imported.theme)
      setAppearanceItemId(null)
      setExpandedListIds(new Set())
      nextId.current = imported.document.items.length + 1
      setDocumentDiagnostic(imported.recoveryDiagnostic)
    } catch (error) {
      setDocumentDiagnostic(
        error instanceof DocumentFormatError
          ? error.code + ': ' + error.message
          : 'DOCUMENT_IMPORT_FAILED: The document could not be imported.',
      )
    }
  }

  const exportDocument = () => {
    try {
      const source = serializeCanonicalDocument(
        toCanonicalDocument(expressionDoc, theme, resolvedStyles),
      )
      const blob = new Blob([source], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const basename = (expressionDoc.title || 'multivector-document')
        .replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'multivector-document'
      link.href = url
      link.download = basename + '.multivector.json'
      link.click()
      URL.revokeObjectURL(url)
      setDocumentDiagnostic(null)
    } catch (error) {
      setDocumentDiagnostic(
        error instanceof DocumentFormatError
          ? error.code + ': ' + error.message
          : 'DOCUMENT_EXPORT_FAILED: The document could not be exported.',
      )
    }
  }

  const removeExpression = (id: string) => {
    const index = expressionDoc.items.findIndex((item) => item.id === id)
    const neighbor =
      expressionDoc.items[index - 1] ??
      expressionDoc.items[index + 1] ??
      null
    pendingFocus.current = neighbor?.id ?? null
    setExpandedListIds((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })
    executeCommand({ kind: 'delete-item', itemId: id })
    if (!neighbor) {
      requestAnimationFrame(() => addButtonRef.current?.focus())
    }
  }

  const clearAllExpressions = () => {
    setAppearanceItemId(null)
    setExpandedListIds(new Set())
    executeCommand({ kind: 'clear-items' })
    requestAnimationFrame(() => addButtonRef.current?.focus())
  }

  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    item: ExpressionItem,
    index: number,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      insertExpression(item.id, event.shiftKey ? 'before' : 'after')
    } else if (event.key === 'Backspace' && item.source === '') {
      event.preventDefault()
      removeExpression(item.id)
    } else if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault()
      inputRefs.current.get(expressionDoc.items[index - 1].id)?.focus()
    } else if (
      event.key === 'ArrowDown' &&
      index < expressionDoc.items.length - 1
    ) {
      event.preventDefault()
      inputRefs.current.get(expressionDoc.items[index + 1].id)?.focus()
    }
  }

  const visibleCount = renderedVectors.length + renderedAreas.length
  const canvasDescription = visibleCount === 0
      ? `No spatial objects are visible from ${expressionDoc.items.length} expressions.`
      : `${renderedVectors.length} ${renderedVectors.length === 1 ? 'vector' : 'vectors'} ` +
        `and ${renderedAreas.length} ${renderedAreas.length === 1 ? 'bivector' : 'bivectors'} ` +
        `are visible. ${renderedVectors
          .map(
            ({ primitive }) =>
              `${primitive.accessibleName} runs from ${
                primitive.start.x === 0 && primitive.start.y === 0
                  ? 'the origin'
                  : `${primitive.start.x}, ${primitive.start.y}`
              } to ${primitive.end.x}, ${primitive.end.y}.`,
          )
          .join(' ')} ${renderedAreas
          .map(({ primitive }) => primitive.accessibleDescription)
          .join(' ')}${omittedRenderElements > 0
            ? ` ${omittedRenderElements} additional list elements are omitted by the rendering limit.`
            : ''}`

  return (
    <div className="app-shell">
      <header className="app-header">
        <a
          className="app-title"
          href={import.meta.env.BASE_URL}
          aria-label="MultiVector home"
        >
          MultiVector
        </a>
        <button
          ref={algebraInfoButtonRef}
          type="button"
          className="algebra-badge"
          aria-haspopup="dialog"
          onClick={() => setInfoDialog('algebra')}
        >
          VGA · 2D
        </button>
        <label className="theme-control">
          <span>Theme</span>
          <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <span className="app-status">Research preview</span>
        <button
          type="button"
          className="document-command"
          disabled={history.past.length === 0}
          aria-label="Undo document change"
          onClick={() => dispatchHistoryWithFocus('undo')}
        >
          Undo
        </button>
        <button
          type="button"
          className="document-command"
          disabled={history.future.length === 0}
          aria-label="Redo document change"
          onClick={() => dispatchHistoryWithFocus('redo')}
        >
          Redo
        </button>
        <input
          ref={importInputRef}
          className="document-file-input"
          type="file"
          accept="application/json,.json"
          aria-label="Import document file"
          onChange={importDocument}
        />
        <button type="button" className="document-command" onClick={() => importInputRef.current?.click()}>
          Import
        </button>
        <button type="button" className="document-command" onClick={exportDocument}>
          Export
        </button>
      </header>

      {documentDiagnostic && (
        <div className="document-diagnostic" role="alert">
          {documentDiagnostic}
        </div>
      )}

      <main className="workspace">
        <aside
          className="expression-panel"
          aria-label="Expressions"
          style={{ width: panelWidth }}
        >
          <div className="expression-toolbar">
            <button
              ref={addButtonRef}
              type="button"
              className="add-expression"
              onClick={() => insertExpression()}
              disabled={
                expressionDoc.items.length >= MAX_EXPRESSION_ITEMS
              }
              aria-label="Add expression"
            >
              <span aria-hidden="true">+</span>
              <span>Add expression</span>
            </button>
          </div>

          <div className="expression-list">
            {evaluatedItems.map(({
              item,
              position,
              evaluation,
              positionEvaluation,
            }, index) => {
              const annotation = item.kind === 'annotation'
              const feedbackId = `expression-feedback-${item.id}`
              const inputId = `expression-source-${item.id}`
              const invalid = evaluation?.status === 'invalid'
              const invalidPosition =
                positionEvaluation?.status === 'invalid'
              const supportsPosition =
                evaluation?.status === 'valid' &&
                evaluation.valueType === 'single' &&
                supportsVga2Position(evaluation.entity)
              const kind = evaluation?.status === 'valid'
                ? evaluation.valueType === 'list'
                  ? `List (${evaluation.value.elements.length})`
                  : describeVga2Entity(evaluation.entity)
                : 'Object'
              const drawable = evaluation?.status === 'valid' &&
                (evaluation.valueType === 'list'
                  ? evaluation.elements.some((element) => element.primitive)
                  : evaluation.primitive !== null)
              const {
                visible,
                styleId,
                color,
                labelVisible,
                label,
                displayLabel,
              } = resolveItemAppearance(
                expressionDoc.appearance[item.id],
                kind,
                declaredName(item.source),
              )
              const objectName = displayLabel ?? kind
              const valid = evaluation?.status === 'valid'
              const empty = item.source.trim() === ''
              const listExpanded = expandedListIds.has(item.id)
              const listDetailsId = `list-details-${item.id}`

              return (
                <article
                  className={`expression-item${visible ? '' : ' is-hidden'}${
                    empty ? ' is-empty-expression' : ''
                  } ${
                    invalid || invalidPosition ? 'has-error' : ''
                  }`}
                  key={item.id}
                >
                  <div className="expression-input-row">
                    <div className="expression-actions">
                      {drawable && valid && (
                          <button
                            type="button"
                            className="visibility-toggle"
                            aria-label={`${visible ? 'Hide' : 'Show'} ${objectName}`}
                            aria-pressed={visible}
                            onClick={() => executeCommand({
                              kind: 'update-appearance', itemId: item.id,
                              appearance: { visible: !visible },
                            })}
                          >
                            <span aria-hidden="true">{visible ? '◉' : '⊘'}</span>
                          </button>
                      )}
                      {valid && !drawable && (
                        <span className="expression-action-spacer" aria-hidden="true" />
                      )}
                      {valid ? (
                          <button
                            type="button"
                            className="appearance-swatch"
                            aria-label={`Edit appearance for ${objectName}`}
                            aria-haspopup="dialog"
                            aria-expanded={appearanceItemId === item.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              appearanceAnchorRef.current = event.currentTarget
                              setAppearanceItemId((current) => current === item.id ? null : item.id)
                            }}
                          >
                            <span
                              className="appearance-swatch-fill"
                              style={{ backgroundColor: color }}
                              aria-hidden="true"
                            />
                          </button>
                      ) : (
                        <span
                          className={`expression-status-pastille${empty ? ' is-empty' : ' is-error'}`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="expression-body">
                      <div className="expression-editor-row">
                        <input
                          ref={(element) => {
                            if (element) inputRefs.current.set(item.id, element)
                            else inputRefs.current.delete(item.id)
                          }}
                          id={inputId}
                          className="expression-source"
                          aria-label={`${annotation ? 'Annotation' : 'Expression'} ${position}`}
                          value={item.source}
                          onChange={(event) => executeCommand({
                            kind: 'update-source', itemId: item.id,
                            source: event.target.value,
                          }, `source:${item.id}`)}
                          onBlur={() => dispatchHistory({ type: 'boundary' })}
                          onFocus={(event) => rememberEditorFocus(event.currentTarget)}
                          onSelect={(event) => rememberEditorFocus(event.currentTarget)}
                          onKeyDown={(event) =>
                            handleItemKeyDown(event, item, index)
                          }
                          aria-describedby={evaluation ? feedbackId : undefined}
                          aria-invalid={invalid}
                          spellCheck={false}
                          autoComplete="off"
                        />
                        {supportsPosition && (
                          <button
                            type="button"
                            className={`normalize-toggle${item.normalization ? ' active' : ''}`}
                            aria-pressed={item.normalization === 'natural'}
                            onClick={() => executeCommand({
                              kind: 'update-normalization', itemId: item.id,
                              normalization: item.normalization === 'natural' ? undefined : 'natural',
                            })}
                          >norm</button>
                        )}
                      </div>

                      {evaluation || positionEvaluation ? (
                        <div
                          id={feedbackId}
                          className="expression-feedback"
                          role={invalid || invalidPosition ? 'alert' : 'status'}
                        >
                          {evaluation?.status === 'valid' ? (
                            <>
                              {evaluation.valueType === 'list' ? (
                                <button
                                  type="button"
                                  className="list-inspection-toggle object-kind"
                                  style={{ color }}
                                  aria-expanded={listExpanded}
                                  aria-controls={listDetailsId}
                                  onClick={() => setExpandedListIds((current) => {
                                    const next = new Set(current)
                                    if (next.has(item.id)) next.delete(item.id)
                                    else next.add(item.id)
                                    return next
                                  })}
                                >
                                  <span aria-hidden="true">{listExpanded ? '▾' : '▸'}</span>
                                  {kind}
                                </button>
                              ) : (
                                <span className="object-kind" style={{ color }}>
                                  {kind}
                                </span>
                              )}
                              <output>{evaluation.inspection}</output>
                            </>
                          ) : evaluation?.status === 'invalid' ? (
                            <>
                              <span className="feedback-label">
                                {evaluation.diagnostic.code}
                              </span>
                              <span>{evaluation.diagnostic.message}</span>
                              <span className="source-location">
                                Source characters{' '}
                                {evaluation.diagnostic.span.start + 1}–
                                {Math.max(
                                  evaluation.diagnostic.span.start + 1,
                                  evaluation.diagnostic.span.end,
                                )}
                              </span>
                            </>
                          ) : null}
                          {positionEvaluation?.status === 'invalid' && (
                            <>
                              <span className="feedback-label">
                                {positionEvaluation.diagnostic.code}
                              </span>
                              <span>{positionEvaluation.diagnostic.message}</span>
                              <span className="source-location">
                                Position characters{' '}
                                {positionEvaluation.diagnostic.span.start + 1}–
                                {Math.max(
                                  positionEvaluation.diagnostic.span.start + 1,
                                  positionEvaluation.diagnostic.span.end,
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      ) : null}

                      {evaluation?.status === 'valid' &&
                        evaluation.valueType === 'list' &&
                        listExpanded && (
                          <ol
                            id={listDetailsId}
                            className="list-inspection"
                            aria-label={`Elements of ${objectName}`}
                          >
                            {evaluation.elements.map((element, elementIndex) => (
                              <li key={element.id} className="list-inspection-item">
                                <span
                                  className="list-element-index"
                                  aria-label={`Element ${elementIndex}`}
                                >
                                  {elementIndex}
                                </span>
                                <span className="list-element-kind">
                                  {describeVga2Entity(element.entity)}
                                </span>
                                <code>{element.inspection}</code>
                                {element.positionConflict ? (
                                  <span className="list-element-position is-error">
                                    position conflict
                                  </span>
                                ) : element.position ? (
                                  <span className="list-element-position">
                                    position ({element.position.x}, {element.position.y})
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ol>
                      )}

                      {supportsPosition && (
                        <div className="position-input-row">
                          <span className="position-prefix" aria-hidden="true">position</span>
                          <input
                            id={`position-source-${item.id}`}
                            className="position-source"
                            aria-label={`Position ${position}`}
                            placeholder="(0, 0)"
                            value={item.positionSource ?? ''}
                            size={Math.max(1, (item.positionSource || '(0, 0)').length)}
                            onChange={(event) => executeCommand({
                              kind: 'update-position', itemId: item.id,
                              positionSource: event.target.value,
                            }, `position:${item.id}`)}
                            onBlur={() => dispatchHistory({ type: 'boundary' })}
                            onFocus={(event) => rememberEditorFocus(event.currentTarget)}
                            onSelect={(event) => rememberEditorFocus(event.currentTarget)}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter') return
                              event.preventDefault()
                              insertExpression(
                                item.id,
                                event.shiftKey ? 'before' : 'after',
                              )
                            }}
                            aria-invalid={invalidPosition}
                            aria-describedby={
                              positionEvaluation ? feedbackId : undefined
                            }
                            spellCheck={false}
                            autoComplete="off"
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="delete-expression"
                      onClick={() => removeExpression(item.id)}
                      aria-label={`Delete expression ${position}`}
                    >
                      ×
                    </button>
                  </div>
                  {appearanceItemId === item.id && valid && (
                    <AppearancePopover
                      kind={kind}
                      styleId={styleId}
                      visible={visible}
                      labelVisible={labelVisible}
                      label={label}
                      colorOnly={!drawable}
                      anchorRef={appearanceAnchorRef}
                      onStyleChange={(style) => executeCommand({
                        kind: 'update-appearance', itemId: item.id, appearance: { style },
                      })}
                      onVisibleChange={(nextVisible) => executeCommand({
                        kind: 'update-appearance', itemId: item.id, appearance: { visible: nextVisible },
                      })}
                      onLabelVisibleChange={(nextVisible) => executeCommand({
                        kind: 'update-appearance', itemId: item.id, appearance: { labelVisible: nextVisible },
                      })}
                      onLabelChange={(nextLabel) => executeCommand({
                        kind: 'update-appearance', itemId: item.id, appearance: { label: nextLabel },
                      }, `appearance-label:${item.id}`)}
                      onClose={closeAppearance}
                    />
                  )}
                </article>
              )
            })}
          </div>
          <div className="expression-panel-footer">
            <button
              ref={expressionReferenceButtonRef}
              type="button"
              className="expression-reference-button"
              aria-haspopup="dialog"
              onClick={() => setInfoDialog('expressions')}
            >
              <span aria-hidden="true">?</span>
              <span>Expression reference</span>
            </button>
            <ClearExpressionsButton
              count={expressionDoc.items.length}
              onClear={clearAllExpressions}
            />
          </div>
        </aside>

        <div
          className="panel-resize"
          role="separator"
          aria-label="Resize expression panel"
          aria-orientation="vertical"
          aria-valuemin={MIN_PANEL_WIDTH}
          aria-valuemax={MAX_PANEL_WIDTH}
          aria-valuenow={panelWidth}
          tabIndex={0}
          onPointerDown={beginPanelResize}
          onKeyDown={resizePanelWithKeyboard}
        />

        {visualizerActive && <section className="visualizer" aria-label="VGA 2D viewport">
          <div className="canvas-frame">
            <svg
              className="canvas"
              viewBox={`0 0 ${viewport.width} ${viewport.height}`}
              role="img"
              aria-labelledby="canvas-title canvas-description"
            >
              <title id="canvas-title">Two-dimensional VGA viewport</title>
              <desc id="canvas-description">{canvasDescription}</desc>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 8 4 L 0 8 z" />
                </marker>
                <marker
                  id="area-arrowhead"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 7 3.5 L 0 7 z" />
                </marker>
              </defs>

              <line
                className="axis"
                x1="0"
                y1={origin.y}
                x2={viewport.width}
                y2={origin.y}
              />
              <line
                className="axis"
                x1={origin.x}
                y1="0"
                x2={origin.x}
                y2={viewport.height}
              />
              <circle
                className="origin"
                cx={origin.x}
                cy={origin.y}
                r="3"
              />

              {renderedVectors.map(({ id, primitive, start, end, color, label }) => (
                <g key={id} style={{ color }}>
                  <line
                    className="vector"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    markerEnd="url(#arrowhead)"
                    aria-label={primitive.accessibleName}
                  />
                  {label && <text className="object-label" x={end.x + 8} y={end.y - 8}>{label}</text>}
                </g>
              ))}
              {renderedAreas.map(({ id, primitive, path, color, label, labelPoint }) => (
                <g key={id} style={{ color }}>
                  <path
                    className="bivector"
                    d={path}
                    markerEnd="url(#area-arrowhead)"
                    aria-label={primitive.accessibleDescription}
                  />
                  {label && <text className="object-label" x={labelPoint.x + 8} y={labelPoint.y - 8}>{label}</text>}
                </g>
              ))}
            </svg>
          </div>
        </section>}
      </main>
      {infoDialog === 'algebra' && (
        <AlgebraInfoDialog
          returnFocusRef={algebraInfoButtonRef}
          onClose={closeInfoDialog}
        />
      )}
      {infoDialog === 'expressions' && (
        <ExpressionReferenceDialog
          returnFocusRef={expressionReferenceButtonRef}
          onClose={closeInfoDialog}
        />
      )}
    </div>
  )
}

export default App
