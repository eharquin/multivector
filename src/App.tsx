import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react'
import { createVga2Engine } from './algebra/vgaEngine'
import { evaluateDocument } from './application/evaluateDocument'
import { AlgebraInfoDialog } from './components/AlgebraInfoDialog'
import { ExpressionReferenceDialog } from './components/ExpressionReferenceDialog'
import { AppearancePopover } from './components/AppearancePopover'
import { ClearExpressionsButton } from './components/ClearExpressionsButton'
import {
  DisplaySettingsMenu,
  type DisplaySettings,
} from './components/DisplaySettingsMenu'
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
import {
  adaptiveGrid,
  clampZoom,
  DEFAULT_PIXELS_PER_UNIT,
  panByScreen,
  toMathematical,
  toScreen,
  zoomAt,
  type Viewport2d,
} from './visualization/viewport'
import {
  nextVectorName,
  vectorCreationSource,
} from './visualization/viewportCreation'
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
/** Keeps the `.panel-resize` separator reachable at any panel width. */
const PANEL_RESIZE_WIDTH = 6
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
  const viewportCreatedItemIds = useRef(new Set<string>())
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const algebraInfoButtonRef = useRef<HTMLButtonElement>(null)
  const expressionReferenceButtonRef = useRef<HTMLButtonElement>(null)
  const resizeDrag = useRef<Readonly<{ startX: number; startWidth: number }> | null>(
    null,
  )
  const appearanceAnchorRef = useRef<HTMLButtonElement | null>(null)
  const viewportSvgRef = useRef<SVGSVGElement>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLElement>(null)
  const viewportPan = useRef<Readonly<{
    pointerId: number
    lastX: number
    lastY: number
    start: Viewport2d
  }> | null>(null)
  const [panelWidth, setPanelWidth] = useState(340)
  const [workspaceWidth, setWorkspaceWidth] = useState(0)
  const maximumPanelWidth = Math.max(
    MIN_PANEL_WIDTH,
    (workspaceWidth || window.innerWidth) - PANEL_RESIZE_WIDTH,
  )
  const [viewportSize, setViewportSize] = useState({
    width: defaultViewport.width,
    height: defaultViewport.height,
  })
  const [appearanceItemId, setAppearanceItemId] = useState<string | null>(null)
  const [expandedListIds, setExpandedListIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [theme, setTheme] = useState<ThemeMode>(initial.theme)
  const [documentDiagnostic, setDocumentDiagnostic] = useState<string | null>(
    initial.diagnostic,
  )
  const [viewportAnnouncement, setViewportAnnouncement] = useState('')
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
        ...viewportSize,
        centerX: expressionDoc.view.viewport.centerX,
        centerY: expressionDoc.view.viewport.centerY,
        pixelsPerUnit: clampZoom(expressionDoc.view.viewport.zoom),
      }
    : { ...defaultViewport, ...viewportSize }
  const visualizerActive = expressionDoc.view.visualizerId === 'org.multivector.vga-2d' &&
    expressionDoc.view.viewport.kind === 'two-dimensional'
  const grid = adaptiveGrid(viewport)
  const updateView = useCallback((view: typeof expressionDoc.view) => {
    dispatchHistory({ type: 'update-view', view })
  }, [])
  const updateDisplay = useCallback((change: Partial<DisplaySettings>) => {
    updateView({
      ...expressionDoc.view,
      display: { ...expressionDoc.view.display, ...change },
    })
  }, [expressionDoc.view, updateView])
  const updateViewport = useCallback((next: Viewport2d) => {
    updateView({
      ...expressionDoc.view,
      viewport: {
        kind: 'two-dimensional',
        centerX: next.centerX,
        centerY: next.centerY,
        zoom: next.pixelsPerUnit,
      },
    })
  }, [expressionDoc.view, updateView])
  const screenPoint = (clientX: number, clientY: number) => {
    const rectangle = viewportSvgRef.current?.getBoundingClientRect()
    if (!rectangle || rectangle.width <= 0 || rectangle.height <= 0)
      return { x: viewport.width / 2, y: viewport.height / 2 }
    return {
      x: (clientX - rectangle.left) * viewport.width / rectangle.width,
      y: (clientY - rectangle.top) * viewport.height / rectangle.height,
    }
  }
  const zoomViewport = (factor: number, anchor = { x: viewport.width / 2, y: viewport.height / 2 }) =>
    updateViewport(zoomAt(viewport, anchor, viewport.pixelsPerUnit * factor))
  const resetViewport = () => updateViewport({
    ...viewport, centerX: 0, centerY: 0, pixelsPerUnit: DEFAULT_PIXELS_PER_UNIT,
  })
  const handleViewportWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    zoomViewport(Math.exp(-event.deltaY * 0.0015), screenPoint(event.clientX, event.clientY))
  }
  const beginViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return
    event.currentTarget.focus({ preventScroll: true })
    viewportPan.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      start: viewport,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }
  const moveViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pan = viewportPan.current
    if (!pan || pan.pointerId !== event.pointerId) return
    const rectangle = event.currentTarget.getBoundingClientRect()
    const scaleX = rectangle.width > 0 ? viewport.width / rectangle.width : 1
    const scaleY = rectangle.height > 0 ? viewport.height / rectangle.height : 1
    updateViewport(panByScreen(viewport, {
      x: (event.clientX - pan.lastX) * scaleX,
      y: (event.clientY - pan.lastY) * scaleY,
    }))
    viewportPan.current = { ...pan, lastX: event.clientX, lastY: event.clientY }
  }
  const endViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (viewportPan.current?.pointerId === event.pointerId) viewportPan.current = null
  }
  const cancelViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pan = viewportPan.current
    if (!pan || pan.pointerId !== event.pointerId) return
    viewportPan.current = null
    updateViewport(pan.start)
  }
  const loseViewportCapture = () => {
    const pan = viewportPan.current
    if (!pan) return
    viewportPan.current = null
    updateViewport(pan.start)
  }
  const navigateViewportWithKeyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    const amount = event.shiftKey ? 120 : 40
    let next: Viewport2d | null = null
    if (event.key === 'ArrowLeft') next = panByScreen(viewport, { x: amount, y: 0 })
    else if (event.key === 'ArrowRight') next = panByScreen(viewport, { x: -amount, y: 0 })
    else if (event.key === 'ArrowUp') next = panByScreen(viewport, { x: 0, y: amount })
    else if (event.key === 'ArrowDown') next = panByScreen(viewport, { x: 0, y: -amount })
    else if (event.key === '+' || event.key === '=') next = zoomAt(viewport, { x: viewport.width / 2, y: viewport.height / 2 }, viewport.pixelsPerUnit * 1.25)
    else if (event.key === '-') next = zoomAt(viewport, { x: viewport.width / 2, y: viewport.height / 2 }, viewport.pixelsPerUnit / 1.25)
    else if (event.key === '0' || event.key === 'Home') {
      event.preventDefault()
      resetViewport()
      return
    } else return
    event.preventDefault()
    updateViewport(next)
  }

  const createVectorFromViewport = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return
    if (expressionDoc.items.length >= MAX_EXPRESSION_ITEMS) {
      setViewportAnnouncement(
        `Vector not created. The document already contains the maximum of ${MAX_EXPRESSION_ITEMS} expressions.`,
      )
      return
    }
    let id = `item-${nextId.current++}`
    while (expressionDoc.items.some((item) => item.id === id)) {
      id = `item-${nextId.current++}`
    }
    const point = toMathematical(
      viewport,
      screenPoint(event.clientX, event.clientY),
    )
    const name = nextVectorName(expressionDoc.items.map(({ source }) => source))
    const source = vectorCreationSource(name, point, viewport.pixelsPerUnit)
    viewportCreatedItemIds.current.add(id)
    pendingFocus.current = id
    executeCommand({ kind: 'insert-item', item: { id, source } })
    setViewportAnnouncement(`${name} created at ${
      source.slice(source.indexOf('(') + 1, -1)
    }.`)
  }

  useEffect(() => {
    const element = workspaceRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) =>
      setWorkspaceWidth(Math.max(0, Math.round(entry.contentRect.width))),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const element = canvasFrameRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.round(entry.contentRect.width))
      const height = Math.max(1, Math.round(entry.contentRect.height))
      setViewportSize((current) => current.width === width && current.height === height
        ? current
        : { width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [visualizerActive])

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
    if (!(input instanceof HTMLInputElement) &&
        viewportCreatedItemIds.current.has(selection.id.replace('expression-source-', ''))) {
      viewportSvgRef.current?.focus({ preventScroll: true })
      return
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
      const maximum = Math.max(
        MIN_PANEL_WIDTH,
        (workspaceRef.current?.getBoundingClientRect().width ??
          window.innerWidth) - PANEL_RESIZE_WIDTH,
      )
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
    let next = panelWidth
    if (event.key === 'ArrowLeft') next -= 16
    else if (event.key === 'ArrowRight') next += 16
    else if (event.key === 'Home') next = MIN_PANEL_WIDTH
    else if (event.key === 'End') next = maximumPanelWidth
    else return

    event.preventDefault()
    setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(maximumPanelWidth, next)))
  }

  /**
   * Widens the expression panel until the remaining canvas is as wide as it is
   * tall. The panel cap does not apply: squaring needs the exact width the
   * workspace geometry demands.
   */
  const squareCanvas = () => {
    const workspace = workspaceRef.current?.getBoundingClientRect()
    if (!workspace || workspace.width <= 0) return
    const available = workspace.width - PANEL_RESIZE_WIDTH
    setPanelWidth(
      Math.max(MIN_PANEL_WIDTH, Math.min(available, available - workspace.height)),
    )
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
      viewportCreatedItemIds.current.clear()
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
      ? `No spatial objects are visible from ${expressionDoc.items.length} expressions. ` +
        'Double-click empty viewport space to create a vector.'
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
            : ''} Double-click empty viewport space to create a vector.`

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
        <span className="app-status">Research preview</span>
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
        <DisplaySettingsMenu
          display={expressionDoc.view.display}
          theme={theme}
          onDisplayChange={updateDisplay}
          onThemeChange={setTheme}
        />
      </header>

      {documentDiagnostic && (
        <div className="document-diagnostic" role="alert">
          {documentDiagnostic}
        </div>
      )}

      <main className="workspace" ref={workspaceRef}>
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
            <div className="expression-history-controls" role="group" aria-label="Expression history">
              <button
                type="button"
                className="history-command"
                disabled={history.past.length === 0}
                aria-label="Undo document change"
                title="Undo (Ctrl/Cmd+Z)"
                onClick={() => dispatchHistoryWithFocus('undo')}
              >
                <span aria-hidden="true">↶</span>
              </button>
              <button
                type="button"
                className="history-command"
                disabled={history.future.length === 0}
                aria-label="Redo document change"
                title="Redo (Ctrl/Cmd+Shift+Z)"
                onClick={() => dispatchHistoryWithFocus('redo')}
              >
                <span aria-hidden="true">↷</span>
              </button>
            </div>
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
          aria-valuemax={maximumPanelWidth}
          aria-valuenow={panelWidth}
          tabIndex={0}
          onPointerDown={beginPanelResize}
          onKeyDown={resizePanelWithKeyboard}
        />

        {visualizerActive && <section className="visualizer" aria-label="VGA 2D viewport">
          <div ref={canvasFrameRef} className="canvas-frame">
            <div
              className="viewport-toolbar"
              role="toolbar"
              aria-label="Viewport controls"
            >
              <button
                type="button"
                className="viewport-command"
                onClick={() => zoomViewport(1.25)}
                aria-label="Zoom in"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <line x1="8" y1="3" x2="8" y2="13" strokeLinecap="round" />
                  <line x1="3" y1="8" x2="13" y2="8" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="viewport-command"
                onClick={() => zoomViewport(0.8)}
                aria-label="Zoom out"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <line x1="3" y1="8" x2="13" y2="8" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="viewport-command"
                onClick={resetViewport}
                aria-label="Reset view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <line x1="8" y1="1.5" x2="8" y2="14.5" strokeLinecap="round" />
                  <line x1="1.5" y1="8" x2="14.5" y2="8" strokeLinecap="round" />
                  <circle cx="8" cy="8" r="3.2" fill="none" />
                </svg>
              </button>
              <button
                type="button"
                className="viewport-command"
                onClick={squareCanvas}
                aria-label="Make canvas square"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="11" height="11" fill="none" />
                </svg>
              </button>
              <output className="viewport-zoom" aria-live="polite">
                {Math.round(viewport.pixelsPerUnit / DEFAULT_PIXELS_PER_UNIT * 100)}%
              </output>
            </div>
            <svg
              ref={viewportSvgRef}
              className="canvas"
              viewBox={`0 0 ${viewport.width} ${viewport.height}`}
              role="img"
              aria-labelledby="canvas-title canvas-description"
              tabIndex={0}
              onWheel={handleViewportWheel}
              onPointerDown={beginViewportPan}
              onPointerMove={moveViewportPan}
              onPointerUp={endViewportPan}
              onPointerCancel={cancelViewportPan}
              onLostPointerCapture={loseViewportCapture}
              onKeyDown={navigateViewportWithKeyboard}
              onDoubleClick={createVectorFromViewport}
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

              {expressionDoc.view.display.gridVisible && <g aria-hidden="true">
                {grid.vertical.map((line) => <line
                  key={`grid-x-${line.coordinate}`}
                  className={line.major ? 'grid-line is-major' : 'grid-line'}
                  x1={line.screen} y1="0" x2={line.screen} y2={viewport.height}
                />)}
                {grid.horizontal.map((line) => <line
                  key={`grid-y-${line.coordinate}`}
                  className={line.major ? 'grid-line is-major' : 'grid-line'}
                  x1="0" y1={line.screen} x2={viewport.width} y2={line.screen}
                />)}
              </g>}

              {expressionDoc.view.display.axisLabelsVisible && <g aria-hidden="true">
                <line className="axis" x1="0" y1={origin.y} x2={viewport.width} y2={origin.y} />
                <line className="axis" x1={origin.x} y1="0" x2={origin.x} y2={viewport.height} />
                <circle className="origin" cx={origin.x} cy={origin.y} r={3 * expressionDoc.view.display.objectScale} />
                <text className="axis-name" x={viewport.width - 14} y={Math.max(16, Math.min(viewport.height - 8, origin.y - 8))}>x</text>
                <text className="axis-name" x={Math.max(8, Math.min(viewport.width - 18, origin.x + 8))} y="16">y</text>
              </g>}

              {expressionDoc.view.display.graduationsVisible && <g aria-hidden="true">
                {grid.vertical.filter((line) => line.major && line.coordinate !== 0).map((line) => {
                  const axisY = Math.max(16, Math.min(viewport.height - 18, origin.y))
                  return <g key={`graduation-x-${line.coordinate}`}>
                    <line className="graduation" x1={line.screen} y1={axisY - 4} x2={line.screen} y2={axisY + 4} />
                    <text className="graduation-label" x={line.screen} y={axisY + 16}>{line.label}</text>
                  </g>
                })}
                {grid.horizontal.filter((line) => line.major && line.coordinate !== 0).map((line) => {
                  const axisX = Math.max(28, Math.min(viewport.width - 28, origin.x))
                  return <g key={`graduation-y-${line.coordinate}`}>
                    <line className="graduation" x1={axisX - 4} y1={line.screen} x2={axisX + 4} y2={line.screen} />
                    <text className="graduation-label is-y" x={axisX - 8} y={line.screen + 4}>{line.label}</text>
                  </g>
                })}
              </g>}

              {renderedVectors.map(({ id, primitive, start, end, color, label }) => (
                <g key={id} style={{ color }}>
                  <line
                    className="vector"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    markerEnd="url(#arrowhead)"
                    strokeWidth={4 * expressionDoc.view.display.objectScale}
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
                    strokeWidth={3 * expressionDoc.view.display.objectScale}
                    aria-label={primitive.accessibleDescription}
                  />
                  {label && <text className="object-label" x={labelPoint.x + 8} y={labelPoint.y - 8}>{label}</text>}
                </g>
              ))}
            </svg>
            <output className="visually-hidden" aria-live="polite">
              {viewportAnnouncement}
            </output>
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
