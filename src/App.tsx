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
} from 'react'
import { type AlgebraEngine } from './algebra/algebraEngine'
import { createBuiltinAlgebraRegistry } from './algebra/builtinAlgebras'
import { evaluateDocument } from './application/evaluateDocument'
import { AlgebraInfoDialog } from './components/AlgebraInfoDialog'
import { AlgebraMenu } from './components/AlgebraMenu'
import { ExpressionReferenceDialog } from './components/ExpressionReferenceDialog'
import { AppearancePopover } from './components/AppearancePopover'
import { ClearExpressionsButton } from './components/ClearExpressionsButton'
import {
  DisplaySettingsMenu,
  type DisplaySettings,
} from './components/DisplaySettingsMenu'
import { resolveItemAppearance } from './components/appearancePalette'
import { OPAQUE_INTERPRETATION, type InterpretedEntity, type Point2d } from './geometry/interpretation'
import type { VisualizationPrimitive } from './visualization/primitives'
import {
  expressionDocument,
  MAX_EXPRESSION_ITEMS,
  showcaseItems,
  vga2FoundationExampleDocument,
  type ExpressionControl,
  type ExpressionItem,
} from './document/expressionDocument'
import { hasContent, type DocumentCommand } from './document/documentCommands'
import {
  createDocumentHistory,
  documentHistoryReducer,
} from './document/documentHistory'
import {
  adaptiveGrid,
  clampZoom,
  DEFAULT_PIXELS_PER_UNIT,
  formatGridNumber,
  formatZoomPercentage,
  panByScreen,
  toMathematical,
  toScreen,
  zoomAt,
  type Viewport2d,
} from './visualization/viewport'
import {
  creationSource,
  nextObjectName,
} from './visualization/viewportCreation'
import { DirectionMarkerGlyph, LineAtInfinityGlyph, OrientedAreaGlyph, OrientedSegmentGlyph, PointMarkerGlyph, UnboundedLineGlyph, type HandleController } from './visualization/glyphs'
import { findAnchorCandidates, selectAnchor, type AnchorCandidate } from './visualization/anchoring'
import { collectRenderedPrimitives, layoutIdealArrow, layoutIdealMarker, layoutLineAtInfinity, layoutLineSelection, layoutOrientedArea, layoutOrientedSegment, layoutUnboundedLine, lineOrientationTicks } from './visualization/layout'
import { requireAvailableAlgebra } from './application/algebraAvailability'
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
import {
  formatDisplayMultivector,
  formatDisplayNumber,
  formatDisplayValue,
} from './presentation/formatNumber'
import { evaluateScalarControl } from './application/evaluateScalarControl'
import { directScalarEdit } from './language/directScalarEdit'
import {
  directConstructorComponents,
  directItemConstructorComponents,
  rewriteConstructorLiterals,
  type ConstructorComponentEdit,
} from './language/constructorLiteralEdit'
import { primitiveBase } from './visualization/anchoring'
import { directPositionAnchorReference } from './language/directVectorEdit'
import {
  scalarPlaybackFrame,
  scalarPlaybackOffset,
  snapToControlBounds,
  type PlaybackParameters,
} from './application/scalarPlayback'
import './App.css'

// Composition root: the runtime's registered definitions. A document's
// algebra record is resolved against it whenever a document is restored,
// imported, or evaluated (ALG-004, ALG-005).
const algebraRegistry = createBuiltinAlgebraRegistry()
const restoreOptions = {
  visualizerAvailable: (visualizerId: string) => algebraRegistry.resolveVisualizer(visualizerId) !== null,
}
const MIN_PANEL_WIDTH = 240
const UNIT_NORM_TOLERANCE = 1e-10
/** Keeps the `.panel-resize` separator reachable at any panel width. */
const PANEL_RESIZE_WIDTH = 6

function isUnitNaturalNorm(engine: AlgebraEngine, value: Parameters<AlgebraEngine['norm']>[0]): boolean {
  try {
    return Math.abs(engine.norm(value).coefficients[0] - 1) <= UNIT_NORM_TOLERANCE
  } catch {
    return false
  }
}

type EditorFocus = Readonly<{
  id: string
  start: number
  end: number
  direction: 'forward' | 'backward' | 'none'
}>
type ActiveScalarPlayback = Readonly<{
  itemId: string
  startedAt: number
  offsetMilliseconds: number
  parameters: PlaybackParameters
}>
type ManipulationKind = 'base' | 'head' | 'line' | 'normal'

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
const DEFAULT_SCALAR_ANIMATION = {
  mode: 'ping-pong' as const,
  direction: 'forward' as const,
  durationSeconds: 2,
}
const DEFAULT_SCALAR_CONTROL: ExpressionControl = {
  mode: 'slider',
  minimumSource: '-10',
  maximumSource: '10',
  stepSource: '0.1',
  animation: DEFAULT_SCALAR_ANIMATION,
}
const VIEWPORT_LOCK_STORAGE_KEY = 'multivector.viewportLocked'

function restoredViewportLock(): boolean {
  try {
    return window.localStorage.getItem(VIEWPORT_LOCK_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function persistViewportLock(locked: boolean): void {
  try {
    window.localStorage.setItem(VIEWPORT_LOCK_STORAGE_KEY, String(locked))
  } catch {
    // The lock remains usable for this session when browser storage is unavailable.
  }
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
      const restored = fromCanonicalDocument(stored, restoreOptions)
      requireAvailableAlgebra(algebraRegistry, restored.document.algebra)
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
  // Documents entering the history are checked at restore and import, so a
  // failed resolution here is a programming error, not a user-facing state.
  const algebraResolution = useMemo(
    () => algebraRegistry.resolve(expressionDoc.algebra),
    [expressionDoc.algebra],
  )
  if (algebraResolution.status !== 'resolved') {
    throw new Error(`${algebraResolution.code}: ${algebraResolution.message}`)
  }
  const { engine, definition: algebraDefinition } = algebraResolution
  // The interpretation may be unavailable without blocking evaluation: values
  // still evaluate and inspect, only geometry and visualization are withheld.
  const interpretationResolution = useMemo(
    () => algebraRegistry.resolveInterpretation(expressionDoc.interpretation),
    [expressionDoc.interpretation],
  )
  const interpretation = interpretationResolution.status === 'resolved'
    ? interpretationResolution.interpretation
    : OPAQUE_INTERPRETATION
  const evaluationContext = useMemo(() => ({ engine, interpretation }), [engine, interpretation])
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
  const pausedPlayback = useRef<Readonly<{
    itemId: string
    offsetMilliseconds: number
    parameters: PlaybackParameters
  }> | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const algebraInfoButtonRef = useRef<HTMLButtonElement>(null)
  const expressionReferenceButtonRef = useRef<HTMLButtonElement>(null)
  const resizeDrag = useRef<Readonly<{ startX: number; startWidth: number }> | null>(
    null,
  )
  const reorderDrag = useRef<Readonly<{
    itemId: string
    pointerId: number
    fromIndex: number
    targetIndex: number
  }> | null>(null)
  const expressionRowRefs = useRef(new Map<string, HTMLElement>())
  const appearanceAnchorRef = useRef<HTMLButtonElement | null>(null)
  const viewportSvgRef = useRef<SVGSVGElement>(null)
  const viewportWheelHandler = useRef<((event: WheelEvent) => void) | null>(null)
  const canvasFrameRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLElement>(null)
  const viewportPan = useRef<Readonly<{
    pointerId: number
    lastX: number
    lastY: number
    start: Viewport2d
  }> | null>(null)
  const manipulationDrag = useRef<Readonly<{
    itemId: string
    kind: ManipulationKind
    pointerId: number
  }> | null>(null)
  /** Where a line translation started, so each move is measured from the press. */
  const lineDragOrigin = useRef<Readonly<{ point: Point2d; coefficients: readonly [number, number, number] }> | null>(null)
  /** The selected line and the anchor its unit normal is drawn from. */
  const [selectedLine, setSelectedLine] = useState<Readonly<{ itemId: string; anchor: Point2d }> | null>(null)
  const anchorValidityCache = useRef(new Map<string, boolean>())
  const [hoveredManipulation, setHoveredManipulation] = useState<string | null>(null)
  // Keyboard focus on a handle is drawn as an SVG ring rather than a CSS
  // outline, which WebKit fails to repaint when focus moves between SVG
  // elements. The ring follows the input modality at the moment of focus,
  // so a later key press does not turn pointer focus into a ring either.
  const [focusRingKey, setFocusRingKey] = useState<string | null>(null)
  const inputModality = useRef<'pointer' | 'keyboard'>('pointer')
  useEffect(() => {
    const pointer = () => { inputModality.current = 'pointer' }
    const keyboard = () => { inputModality.current = 'keyboard' }
    window.addEventListener('pointerdown', pointer, true)
    window.addEventListener('keydown', keyboard, true)
    return () => {
      window.removeEventListener('pointerdown', pointer, true)
      window.removeEventListener('keydown', keyboard, true)
    }
  }, [])
  const focusHandle = (key: string) => {
    setHoveredManipulation(key)
    setFocusRingKey(inputModality.current === 'keyboard' ? key : null)
  }
  const blurHandle = (key: string) => {
    setHoveredManipulation((current) => current === key ? null : current)
    setFocusRingKey((current) => current === key ? null : current)
  }
  const handleController: HandleController = {
    hoveredKey: hoveredManipulation,
    focusRingKey,
    hover: (key) => setHoveredManipulation(key),
    unhover: (key) => setHoveredManipulation((current) => current === key ? null : current),
    focus: focusHandle,
    blur: blurHandle,
    pointerDown: (event, itemId, kind) => beginManipulation(event, itemId, kind),
    keyDown: (event, itemId, kind, current) => manipulateWithKeyboard(event, itemId, kind, current),
  }
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
  const [reorderAnnouncement, setReorderAnnouncement] = useState('')
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [anchorPreview, setAnchorPreview] = useState<AnchorCandidate | null>(null)
  const [viewportLocked, setViewportLocked] = useState(restoredViewportLock)
  const [activePlayback, setActivePlayback] = useState<ActiveScalarPlayback | null>(null)
  const [playbackAnnouncement, setPlaybackAnnouncement] = useState('')
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
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
        ...viewportSize,
        centerX: expressionDoc.view.viewport.centerX,
        centerY: expressionDoc.view.viewport.centerY,
        pixelsPerUnit: clampZoom(expressionDoc.view.viewport.zoom),
      }
    : { ...defaultViewport, ...viewportSize }
  const visualizerActive = interpretationResolution.status === 'resolved' &&
    algebraRegistry.resolveVisualizer(expressionDoc.view.visualizerId) !== null &&
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
  const handleViewportWheel = (event: WheelEvent) => {
    event.preventDefault()
    if (viewportLocked) return
    zoomViewport(Math.exp(-event.deltaY * 0.0015), screenPoint(event.clientX, event.clientY))
  }
  viewportWheelHandler.current = handleViewportWheel
  // React registers wheel listeners as passive, which silently discards
  // preventDefault and lets the browser page-zoom on Ctrl+wheel or pinch; the
  // listener is attached natively so it can be non-passive.
  const attachViewportSvg = useCallback((svg: SVGSVGElement | null) => {
    viewportSvgRef.current = svg
    if (!svg) return
    const onWheel = (event: WheelEvent) =>
      viewportWheelHandler.current?.(event)
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])
  // Safari extends a selection started on the canvas into any selectable
  // text the pointer crosses, and form controls ignore an inherited
  // user-select, so while a button is held the class also removes the
  // panels from hit-testing and any selection start is cancelled. Released
  // on pointerup or pointercancel anywhere.
  // The gesture kind also fixes the cursor: browsers that hit-test under the
  // pointer during capture would otherwise show the arrow over the panels.
  const guardGestureSelection = (kind: 'manipulate' | 'pan') =>
    document.body.classList.add('canvas-gesture', `canvas-gesture-${kind}`)
  useEffect(() => {
    const release = () => document.body.classList.remove(
      'canvas-gesture', 'canvas-gesture-manipulate', 'canvas-gesture-pan',
    )
    const cancelSelection = (event: Event) => {
      if (document.body.classList.contains('canvas-gesture')) event.preventDefault()
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    document.addEventListener('selectstart', cancelSelection, true)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      document.removeEventListener('selectstart', cancelSelection, true)
      release()
    }
  }, [])
  const beginViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    setAppearanceItemId(null)
    setSelectedLine(null)
    if (viewportLocked || event.button !== 0 || event.target !== event.currentTarget) return
    event.currentTarget.focus({ preventScroll: true })
    guardGestureSelection('pan')
    viewportPan.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      start: viewport,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }
  const updateManipulatedItem = (
    itemId: string,
    kind: ManipulationKind,
    point: Readonly<{ x: number; y: number }>,
  ) => {
    const item = expressionDoc.items.find((candidate) => candidate.id === itemId)
    const rendered = renderedPrimitives.find((candidate) => candidate.id === itemId)
    if (!item || !rendered) return
    const roundingStep = 1 / viewport.pixelsPerUnit
    const target = {
      x: Number(formatGridNumber(point.x, roundingStep)),
      y: Number(formatGridNumber(point.y, roundingStep)),
    }
    if (kind === 'line' || kind === 'normal') {
      if (rendered.primitive.kind !== 'unbounded-line') return
      const components = literalEditComponents(item, rendered.entity)
      if (!components) return
      const [a0, b0, c0] = lineCoefficients(rendered.primitive)
      let values: readonly [number, number, number]
      if (kind === 'line') {
        // Translating changes only c; motion along the line has no effect.
        const origin = lineDragOrigin.current
        if (!origin) return
        const [a, b, c] = origin.coefficients
        values = [a, b, c - a * (target.x - origin.point.x) - b * (target.y - origin.point.y)]
      } else {
        // Rotating keeps the norm of (a, b) and the anchor on the line.
        const anchor = selectedLine?.itemId === itemId ? selectedLine.anchor : rendered.primitive.point
        const dx = point.x - anchor.x
        const dy = point.y - anchor.y
        const length = Math.hypot(dx, dy)
        if (length === 0) return
        const scale = Math.hypot(a0, b0)
        const a = dx / length * scale
        const b = dy / length * scale
        values = [a, b, -(a * anchor.x + b * anchor.y)]
      }
      const rounded = values.map((value) => Number(formatGridNumber(value, roundingStep / 10)))
      const rewritten = rewriteConstructorLiterals(item.source, components, rounded)
      if (rewritten !== item.source) executeCommand({ kind: 'update-source', itemId, source: rewritten })
      components.forEach((component, index) => {
        if (component.kind !== 'reference') return
        const scalarItem = expressionDoc.items.find((candidate) =>
          declaredName(candidate.source) === component.name &&
          directScalarEdit(candidate.source) !== null)
        if (scalarItem) executeCommand({
          kind: 'set-scalar-value', itemId: scalarItem.id, value: rounded[index] * component.sign,
        })
      })
      void c0
      return
    }
    if (kind === 'head' && interpretation.supportsHead(rendered.entity)) {
      const components = literalEditComponents(item, rendered.entity)
      const base = primitiveBase(rendered.primitive)
      if (!components || !base) return
      const values = [
        Number(formatGridNumber(target.x - base.x, roundingStep)),
        Number(formatGridNumber(target.y - base.y, roundingStep)),
      ] as const
      const rewritten = rewriteConstructorLiterals(item.source, components, values)
      if (rewritten !== item.source) executeCommand({
        kind: 'update-source', itemId, source: rewritten,
      })
      components.forEach((component, index) => {
        if (component.kind !== 'reference') return
        const target = expressionDoc.items.find((candidate) =>
          declaredName(candidate.source) === component.name &&
          directScalarEdit(candidate.source) !== null)
        if (target) executeCommand({
          kind: 'set-scalar-value', itemId: target.id,
          value: values[index] * component.sign,
        })
      })
      return
    }
    if (!interpretation.supportsPosition(rendered.entity)) {
      // The entity carries its own location: rewrite its constructor literal
      // (PGA-VIZ-003) with the pointer's grid-rounded coordinates.
      const components = literalEditComponents(item, rendered.entity)
      if (!components) return
      const values = [target.x, target.y]
      const rewritten = rewriteConstructorLiterals(item.source, components, values)
      if (rewritten !== item.source) executeCommand({
        kind: 'update-source', itemId, source: rewritten,
      })
      components.forEach((component, index) => {
        if (component.kind !== 'reference') return
        const scalarItem = expressionDoc.items.find((candidate) =>
          declaredName(candidate.source) === component.name &&
          directScalarEdit(candidate.source) !== null)
        if (scalarItem) executeCommand({
          kind: 'set-scalar-value', itemId: scalarItem.id,
          value: values[index] * component.sign,
        })
      })
      return
    }
    const literalPosition = interpretation.formatPosition(
      formatGridNumber(target.x, roundingStep), formatGridNumber(target.y, roundingStep),
    )
    if (!item.positionSource) {
      executeCommand({ kind: 'update-position', itemId, positionSource: literalPosition })
      return
    }
    const components = positionComponents(item.positionSource)
    if (!components) {
      executeCommand({ kind: 'update-position', itemId, positionSource: literalPosition })
      return
    }
    const rewritten = rewriteConstructorLiterals(item.positionSource, components, [target.x, target.y])
    if (rewritten !== item.positionSource) executeCommand({
      kind: 'update-position', itemId, positionSource: rewritten,
    })
    components.forEach((component, index) => {
      if (component.kind !== 'reference') return
      const targetItem = expressionDoc.items.find((candidate) =>
        declaredName(candidate.source) === component.name &&
        directScalarEdit(candidate.source) !== null)
      if (targetItem) executeCommand({
        kind: 'set-scalar-value', itemId: targetItem.id,
        value: (index === 0 ? target.x : target.y) * component.sign,
      })
    })
  }
  const gestureLabel = (kind: ManipulationKind) =>
    kind === 'head' ? 'Vector head' : kind === 'base' ? 'Object base' : kind === 'line' ? 'Line' : 'Line normal'
  const lineCoefficients = (primitive: Extract<VisualizationPrimitive, { kind: 'unbounded-line' }>): readonly [number, number, number] => {
    const a = primitive.normal.x * primitive.scale
    const b = primitive.normal.y * primitive.scale
    return [a, b, -(a * primitive.point.x + b * primitive.point.y)]
  }
  const beginManipulation = (
    event: ReactPointerEvent<SVGElement>,
    itemId: string,
    kind: ManipulationKind,
  ) => {
    if (event.button !== 0) return
    event.stopPropagation()
    // The default pointerdown action is kept: it is what lets the browser
    // treat the resulting focus as pointer-driven and withhold the focus
    // ring. Selection is prevented by user-select on the canvas instead.
    event.currentTarget.setPointerCapture?.(event.pointerId)
    guardGestureSelection('manipulate')
    manipulationDrag.current = { itemId, kind, pointerId: event.pointerId }
    anchorValidityCache.current.clear()
    if (kind === 'line') {
      const rendered = renderedPrimitives.find((candidate) => candidate.id === itemId)
      const point = toMathematical(viewport, screenPoint(event.clientX, event.clientY))
      if (rendered?.primitive.kind === 'unbounded-line') {
        const { point: on, direction } = rendered.primitive
        lineDragOrigin.current = { point, coefficients: lineCoefficients(rendered.primitive) }
        // A press selects the line and anchors its normal at the pressed
        // point projected onto the line.
        const along = (point.x - on.x) * direction.x + (point.y - on.y) * direction.y
        setSelectedLine({ itemId, anchor: { x: on.x + direction.x * along, y: on.y + direction.y * along } })
      }
    }
    dispatchHistory({ type: 'boundary' })
    dispatchHistory({ type: 'begin-transaction' })
    setViewportAnnouncement(`${gestureLabel(kind)} drag started.`)
  }
  const lineMovable = (item: ExpressionItem, entity: InterpretedEntity): boolean =>
    interpretation.literalEdit(entity)?.constructor === 'line' &&
    componentsMovable(literalEditComponents(item, entity))
  const componentsMovable = (
    components: readonly ConstructorComponentEdit[] | null,
  ): boolean => {
    if (!components) return false
    const references = components.filter((component) => component.kind === 'reference')
    if (new Set(references.map((component) => component.name)).size !== references.length)
      return false
    return references.every((component) => expressionDoc.items.filter((candidate) =>
      declaredName(candidate.source) === component.name &&
      directScalarEdit(candidate.source) !== null).length === 1)
  }
  const literalEditComponents = (item: ExpressionItem, entity: InterpretedEntity) => {
    const edit = interpretation.literalEdit(entity)
    return edit ? directItemConstructorComponents(item.source, edit.constructor, edit.arity) : null
  }
  /** A position source is a two-argument literal of the interpretation's creation constructor. */
  const positionComponents = (positionSource: string) =>
    directConstructorComponents(positionSource, interpretation.creation.constructor, 2)
  const headMovable = (item: ExpressionItem, entity: InterpretedEntity): boolean =>
    interpretation.supportsHead(entity) && componentsMovable(literalEditComponents(item, entity))
  const objectBaseMovable = (item: ExpressionItem, entity: InterpretedEntity): boolean =>
    interpretation.supportsPosition(entity)
      ? !item.positionSource ||
        directPositionAnchorReference(item.positionSource) !== null ||
        componentsMovable(positionComponents(item.positionSource))
      : componentsMovable(literalEditComponents(item, entity))
  const manipulateWithKeyboard = (
    event: KeyboardEvent<SVGElement>,
    itemId: string,
    kind: ManipulationKind,
    current: Readonly<{ x: number; y: number }>,
  ) => {
    if (kind === 'line' && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      setSelectedLine((selected) => (selected?.itemId === itemId ? null : { itemId, anchor: current }))
      setViewportAnnouncement(selectedLine?.itemId === itemId ? 'Line normal hidden.' : 'Line normal shown; move its head to rotate the line.')
      return
    }
    if (kind === 'base' && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      const item = expressionDoc.items.find((candidate) => candidate.id === itemId)
      if (!item) return
      const currentReference = item.positionSource
        ? directPositionAnchorReference(item.positionSource)
        : null
      const candidates = renderedPrimitives.flatMap((rendered) => {
        if (rendered.id.includes(':') || rendered.id === itemId) return []
        const target = expressionDoc.items.find((candidate) => candidate.id === rendered.id)
        const name = target ? declaredName(target.source) : null
        if (!name) return []
        const properties = rendered.primitive.kind === 'oriented-segment'
          ? ['position', 'head'] as const
          : ['position'] as const
        return properties.map((property) => ({ name, property }))
      })
      const currentIndex = candidates.findIndex((candidate) =>
        candidate.name === currentReference?.name &&
        candidate.property === currentReference.property)
      const ordered = candidates.length === 0 ? [] : candidates.map((_, offset) =>
        candidates[(currentIndex + 1 + offset) % candidates.length])
      const next = ordered.find((candidate) => {
        const positionSource = `${candidate.name}.${candidate.property}`
        const proposed = {
          ...expressionDoc,
          items: expressionDoc.items.map((entry) => entry.id === itemId
            ? { ...entry, positionSource }
            : entry),
        }
        return evaluateDocument(proposed, evaluationContext).find(
          (result) => result.item.id === itemId,
        )?.positionEvaluation?.status === 'valid'
      })
      if (!next) {
        setViewportAnnouncement('No valid anchor target is available.')
        return
      }
      dispatchHistory({ type: 'boundary' })
      dispatchHistory({ type: 'begin-transaction' })
      executeCommand({
        kind: 'update-position', itemId,
        positionSource: `${next.name}.${next.property}`,
      })
      dispatchHistory({ type: 'commit-transaction' })
      setViewportAnnouncement(`Object base linked to ${next.name} ${next.property}.`)
      return
    }
    if (kind === 'base' && (event.key === 'Delete' || event.key === 'Backspace')) {
      const item = expressionDoc.items.find((candidate) => candidate.id === itemId)
      if (!item?.positionSource || !directPositionAnchorReference(item.positionSource)) return
      event.preventDefault()
      event.stopPropagation()
      dispatchHistory({ type: 'boundary' })
      dispatchHistory({ type: 'begin-transaction' })
      updateManipulatedItem(itemId, kind, current)
      dispatchHistory({ type: 'commit-transaction' })
      setViewportAnnouncement('Object base unlinked and kept at its resolved position.')
      return
    }
    const step = event.shiftKey ? 1 : 0.1
    const delta = event.key === 'ArrowLeft' ? { x: -step, y: 0 }
      : event.key === 'ArrowRight' ? { x: step, y: 0 }
        : event.key === 'ArrowUp' ? { x: 0, y: step }
          : event.key === 'ArrowDown' ? { x: 0, y: -step }
            : null
    if (!delta) return
    event.preventDefault()
    event.stopPropagation()
    dispatchHistory({ type: 'boundary' })
    dispatchHistory({ type: 'begin-transaction' })
    if (kind === 'line') {
      const rendered = renderedPrimitives.find((candidate) => candidate.id === itemId)
      if (rendered?.primitive.kind === 'unbounded-line') {
        lineDragOrigin.current = { point: current, coefficients: lineCoefficients(rendered.primitive) }
      }
    }
    const target = kind === 'normal'
      // The normal's head is one unit from the anchor; nudge it, then renormalize.
      ? (() => {
          const rendered = renderedPrimitives.find((candidate) => candidate.id === itemId)
          const normal = rendered?.primitive.kind === 'unbounded-line' ? rendered.primitive.normal : { x: 1, y: 0 }
          return { x: current.x + normal.x + delta.x, y: current.y + normal.y + delta.y }
        })()
      : { x: current.x + delta.x, y: current.y + delta.y }
    updateManipulatedItem(itemId, kind, target)
    dispatchHistory({ type: 'commit-transaction' })
    setViewportAnnouncement(kind === 'normal'
      ? `${gestureLabel(kind)} rotated.`
      : `${gestureLabel(kind)} moved to ${
          formatGridNumber(current.x + delta.x, step)}, ${
          formatGridNumber(current.y + delta.y, step)}.`)
  }
  const moveViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    const manipulation = manipulationDrag.current
    if (manipulation?.pointerId === event.pointerId) {
      const pointer = screenPoint(event.clientX, event.clientY)
      if (manipulation.kind === 'base') {
        const rectangle = event.currentTarget.getBoundingClientRect()
        const cssScaleX = rectangle.width > 0 ? rectangle.width / viewport.width : 1
        const cssScaleY = rectangle.height > 0 ? rectangle.height / viewport.height : 1
        const candidates = findAnchorCandidates({
          draggedId: manipulation.itemId,
          rendered: renderedPrimitives,
          viewport,
          pointer,
          cssScale: { x: cssScaleX, y: cssScaleY },
          nameOf: (itemId) => {
            const targetItem = expressionDoc.items.find((item) => item.id === itemId)
            return targetItem ? declaredName(targetItem.source) : null
          },
          isValid: (candidate) => {
            const key = `${manipulation.itemId}:${candidate.targetId}:${candidate.property}`
            const cached = anchorValidityCache.current.get(key)
            if (cached !== undefined) return cached
            const positionSource = `${candidate.targetName}.${candidate.property}`
            const proposed = {
              ...expressionDoc,
              items: expressionDoc.items.map((item) => item.id === manipulation.itemId
                ? { ...item, positionSource }
                : item),
            }
            const valid = evaluateDocument(proposed, evaluationContext).find(
              (result) => result.item.id === manipulation.itemId,
            )?.positionEvaluation?.status === 'valid'
            anchorValidityCache.current.set(key, valid)
            return valid
          },
        })
        const candidate = selectAnchor(
          candidates,
          anchorPreview?.draggedId === manipulation.itemId ? anchorPreview : null,
        )
        setAnchorPreview(candidate)
        updateManipulatedItem(
          manipulation.itemId,
          manipulation.kind,
          candidate?.mathematical ?? toMathematical(viewport, pointer),
        )
        return
      }
      setAnchorPreview(null)
      updateManipulatedItem(
        manipulation.itemId,
        manipulation.kind,
        toMathematical(viewport, pointer),
      )
      return
    }
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
  // A pointer gesture leaves nothing selected: the handle gives focus back
  // to the canvas so arrow keys pan and hover indicators stay pointer-only.
  // Keyboard users reach handles with Tab as before.
  const finishManipulation = (outcome: 'commit' | 'cancel') => {
    manipulationDrag.current = null
    anchorValidityCache.current.clear()
    setAnchorPreview(null)
    dispatchHistory({ type: outcome === 'commit' ? 'commit-transaction' : 'cancel-transaction' })
    viewportSvgRef.current?.focus({ preventScroll: true })
  }
  const endViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    const manipulation = manipulationDrag.current
    if (manipulation?.pointerId === event.pointerId) {
      const preview = anchorPreview?.draggedId === manipulation.itemId
        ? anchorPreview
        : null
      if (preview) {
        const positionSource = `${preview.targetName}.${preview.property}`
        const candidateDocument = {
          ...expressionDoc,
          items: expressionDoc.items.map((item) => item.id === manipulation.itemId
            ? { ...item, positionSource }
            : item),
        }
        const candidate = evaluateDocument(candidateDocument, evaluationContext).find(
          (result) => result.item.id === manipulation.itemId,
        )
        if (candidate?.positionEvaluation?.status === 'valid') {
          executeCommand({
            kind: 'update-position', itemId: manipulation.itemId, positionSource,
          })
          setViewportAnnouncement(
            `Object base linked to ${preview.targetName} ${preview.property}.`,
          )
        } else {
          setViewportAnnouncement('Anchor link refused because it would be invalid.')
          finishManipulation('cancel')
          return
        }
      } else {
        setViewportAnnouncement('Object manipulation committed.')
      }
      finishManipulation('commit')
      return
    }
    if (viewportPan.current?.pointerId === event.pointerId) viewportPan.current = null
  }
  const cancelViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (manipulationDrag.current?.pointerId === event.pointerId) {
      finishManipulation('cancel')
      setViewportAnnouncement('Object manipulation cancelled.')
      return
    }
    const pan = viewportPan.current
    if (!pan || pan.pointerId !== event.pointerId) return
    viewportPan.current = null
    updateViewport(pan.start)
  }
  const loseViewportCapture = () => {
    if (manipulationDrag.current) {
      finishManipulation('cancel')
      setViewportAnnouncement('Object manipulation cancelled.')
      return
    }
    const pan = viewportPan.current
    if (!pan) return
    viewportPan.current = null
    updateViewport(pan.start)
  }
  const navigateViewportWithKeyboard = (event: KeyboardEvent<SVGSVGElement>) => {
    const amount = event.shiftKey ? 120 : 40
    let next: Viewport2d | null = null
    const navigationKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0', 'Home']
      .includes(event.key)
    if (viewportLocked && navigationKey) {
      event.preventDefault()
      return
    }
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

  const toggleViewportLock = () => {
    const locked = !viewportLocked
    viewportPan.current = null
    setViewportLocked(locked)
    setViewportAnnouncement(locked ? 'Viewport locked.' : 'Viewport unlocked.')
    persistViewportLock(locked)
  }

  const createVectorFromViewport = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return
    if (expressionDoc.items.length >= MAX_EXPRESSION_ITEMS) {
      setViewportAnnouncement(
        `${interpretation.creation.objectName} not created. The document already contains the maximum of ${MAX_EXPRESSION_ITEMS} expressions.`,
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
    const name = nextObjectName(expressionDoc.items.map(({ source }) => source), interpretation.creation.namePrefix)
    const source = creationSource(interpretation.creation.constructor, name, point, viewport.pixelsPerUnit)
    viewportCreatedItemIds.current.add(id)
    pendingFocus.current = id
    executeCommand({ kind: 'insert-item', item: { id, source } })
    setViewportAnnouncement(`${name} created at ${
      source.slice(source.indexOf('(') + 1, -1)
    }.`)
  }

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const change = () => setReducedMotion(query.matches)
    query.addEventListener?.('change', change)
    return () => query.removeEventListener?.('change', change)
  }, [])

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
    () => evaluateDocument(expressionDoc, evaluationContext),
    [expressionDoc],
  )
  const scalarControlEvaluations = useMemo(
    () => new Map(evaluatedItems.flatMap((evaluated) => evaluated.item.control
      ? [[evaluated.item.id, evaluateScalarControl(
          evaluated.item.control,
          evaluatedItems,
          engine,
        )] as const]
      : [])),
    [evaluatedItems],
  )

  const stopPlayback = useCallback((cancel = false) => {
    if (!activePlayback) return
    pausedPlayback.current = cancel ? null : {
      itemId: activePlayback.itemId,
      offsetMilliseconds:
        performance.now() - activePlayback.startedAt + activePlayback.offsetMilliseconds,
      parameters: activePlayback.parameters,
    }
    dispatchHistory({ type: cancel ? 'cancel-transaction' : 'commit-transaction' })
    setPlaybackAnnouncement(cancel ? 'Scalar animation cancelled.' : 'Scalar animation paused.')
    setActivePlayback(null)
  }, [activePlayback])

  const startPlayback = (
    item: ExpressionItem,
    parameters: PlaybackParameters,
    currentValue: number,
  ) => {
    if (activePlayback) dispatchHistory({ type: 'commit-transaction' })
    dispatchHistory({ type: 'boundary' })
    dispatchHistory({ type: 'begin-transaction' })
    const currentOffset = scalarPlaybackOffset(parameters, currentValue)
    const duration = parameters.animation.durationSeconds * 1000
    const resumable = pausedPlayback.current?.itemId === item.id
      ? pausedPlayback.current
      : null
    pausedPlayback.current = null
    setActivePlayback({
      itemId: item.id,
      startedAt: performance.now(),
      offsetMilliseconds: resumable?.offsetMilliseconds ?? (
        parameters.animation.mode === 'once' && currentOffset >= duration
          ? 0
          : currentOffset
      ),
      parameters,
    })
    setPlaybackAnnouncement(
      `${declaredName(item.source) ?? 'Scalar'} animation started.${
        reducedMotion ? ' Reduced motion preference is active.' : ''
      }`,
    )
  }

  useEffect(() => {
    if (!activePlayback) return
    let frame = 0
    const tick = (now: number) => {
      const playback = scalarPlaybackFrame(
        activePlayback.parameters,
        now - activePlayback.startedAt + activePlayback.offsetMilliseconds,
      )
      executeCommand({
        kind: 'set-scalar-value', itemId: activePlayback.itemId,
        value: playback.value,
      })
      if (playback.completed) {
        pausedPlayback.current = null
        dispatchHistory({ type: 'commit-transaction' })
        setPlaybackAnnouncement('Scalar animation completed.')
        setActivePlayback(null)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [activePlayback, executeCommand])

  useEffect(() => {
    if (!activePlayback) return
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      stopPlayback(true)
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [activePlayback, stopPlayback])
  useEffect(() => {
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (!manipulationDrag.current) {
        // Outside a gesture, Escape drops the line selection and its normal.
        setSelectedLine((selected) => (selected ? null : selected))
        return
      }
      event.preventDefault()
      manipulationDrag.current = null
      anchorValidityCache.current.clear()
      setAnchorPreview(null)
      dispatchHistory({ type: 'cancel-transaction' })
      viewportSvgRef.current?.focus({ preventScroll: true })
      setViewportAnnouncement('Object manipulation cancelled.')
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [])
  const resolvedStyles = useMemo(
    () => Object.fromEntries(evaluatedItems.map(({ item, evaluation }) => {
      const kind = evaluation?.status === 'valid'
        ? evaluation.valueType === 'list'
          ? 'List'
          : interpretation.describe(evaluation.entity)
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
  // The Studio-sized glyphs are the 1× baseline exposed to users. The
  // historical renderer used 1.5 as that baseline, so keep the visual size
  // while restoring a meaningful multiplicative setting.
  const objectRenderScale = expressionDoc.view.display.objectScale * 1.5
  const { rendered: renderedPrimitives, omitted: omittedRenderElements } = collectRenderedPrimitives(
    evaluatedItems, expressionDoc.appearance, interpretation, declaredName,
  )
  const renderedVectors = renderedPrimitives.flatMap((entry) =>
    entry.primitive.kind === 'oriented-segment'
      ? [{ ...entry, primitive: entry.primitive, layout: layoutOrientedSegment(entry.primitive, viewport, objectRenderScale) }]
      : [])
  const renderedAreas = renderedPrimitives.flatMap((entry) =>
    entry.primitive.kind === 'oriented-area'
      ? [{ ...entry, primitive: entry.primitive, layout: layoutOrientedArea(entry.primitive, viewport, entry.bivectorShape) }]
      : [])
  const renderedPoints = renderedPrimitives.flatMap((entry) =>
    entry.primitive.kind === 'point-marker'
      ? [{ ...entry, primitive: entry.primitive, point: toScreen(viewport, entry.primitive.point) }]
      : [])
  const renderedLines = renderedPrimitives.flatMap((entry) => {
    if (entry.primitive.kind !== 'unbounded-line') return []
    const layout = layoutUnboundedLine(entry.primitive, viewport)
    return layout ? [{ ...entry, primitive: entry.primitive, layout }] : []
  })
  const renderedIdealPoints = renderedPrimitives.flatMap((entry) =>
    entry.primitive.kind === 'ideal-point'
      ? [{
          ...entry,
          primitive: entry.primitive,
          arrow: entry.idealPointDisplay === 'ideal' ? null : layoutIdealArrow(entry.primitive, viewport, objectRenderScale),
          marker: entry.idealPointDisplay === 'vector' ? null : layoutIdealMarker(entry.primitive.direction, viewport, objectRenderScale),
        }]
      : [])
  const renderedInfinity = renderedPrimitives.flatMap((entry) =>
    entry.primitive.kind === 'line-at-infinity'
      ? [{ ...entry, primitive: entry.primitive, layout: layoutLineAtInfinity(viewport, objectRenderScale) }]
      : [])

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

  /** Insertion index into the current item order nearest a pointer position. */
  const resolveDropTargetIndex = useCallback((clientY: number): number => {
    const rows = expressionDoc.items
      .map((item) => expressionRowRefs.current.get(item.id))
      .filter((row): row is HTMLElement => row !== undefined)
    for (let index = 0; index < rows.length; index += 1) {
      const rect = rows[index].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return index
    }
    return rows.length
  }, [expressionDoc.items])

  const announceMove = useCallback((itemId: string, targetIndex: number) => {
    const item = expressionDoc.items.find((candidate) => candidate.id === itemId)
    if (!item) return
    const name = declaredName(item.source) ?? 'Expression'
    setReorderAnnouncement(
      `Moved ${name} to position ${targetIndex + 1} of ${expressionDoc.items.length}.`,
    )
  }, [expressionDoc.items])

  /** Dispatches a move-item command placing itemId at the given final position. */
  const moveItemToIndex = useCallback((itemId: string, target: number) => {
    const from = expressionDoc.items.findIndex((item) => item.id === itemId)
    if (from < 0) return
    const withoutItem = expressionDoc.items.filter((item) => item.id !== itemId)
    const clamped = Math.max(0, Math.min(withoutItem.length, target))
    if (clamped === from) return
    const anchor = withoutItem[clamped]
    executeCommand(anchor === undefined
      ? { kind: 'move-item', itemId }
      : { kind: 'move-item', itemId, anchorId: anchor.id, placement: 'before' })
    announceMove(itemId, clamped)
  }, [expressionDoc.items, executeCommand, announceMove])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!reorderDrag.current) return
      const index = resolveDropTargetIndex(event.clientY)
      reorderDrag.current = { ...reorderDrag.current, targetIndex: index }
      setDropTargetIndex(index)
    }
    const endDrag = (commit: boolean) => {
      const drag = reorderDrag.current
      reorderDrag.current = null
      document.body.classList.remove('reordering-items')
      setDropTargetIndex(null)
      if (!drag) return
      if (commit) {
        // The pointer target is an insertion index in the list that still
        // holds the dragged row; past its own slot that is one final index
        // too far.
        moveItemToIndex(
          drag.itemId,
          drag.targetIndex > drag.fromIndex ? drag.targetIndex - 1 : drag.targetIndex,
        )
        dispatchHistory({ type: 'commit-transaction' })
      } else {
        dispatchHistory({ type: 'cancel-transaction' })
      }
    }
    const handlePointerUp = () => endDrag(true)
    const handlePointerCancel = () => endDrag(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerCancel)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerCancel)
      document.body.classList.remove('reordering-items')
    }
  }, [resolveDropTargetIndex, moveItemToIndex])

  const beginRowReorder = (
    event: ReactPointerEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    const index = expressionDoc.items.findIndex((item) => item.id === itemId)
    reorderDrag.current = {
      itemId, pointerId: event.pointerId, fromIndex: index, targetIndex: index,
    }
    dispatchHistory({ type: 'begin-transaction' })
    document.body.classList.add('reordering-items')
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  const reorderRowWithKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    if (!event.shiftKey && !event.altKey) return
    const from = expressionDoc.items.findIndex((item) => item.id === itemId)
    if (from < 0) return
    let target = from
    if (event.key === 'ArrowUp') target = from - 1
    else if (event.key === 'ArrowDown') target = from + 1
    else if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = expressionDoc.items.length - 1
    else return

    event.preventDefault()
    moveItemToIndex(itemId, target)
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
    if (activePlayback) stopPlayback()
    try {
      const parsed = parseCanonicalDocumentBytes(new Uint8Array(await file.arrayBuffer()))
      const collision = parsed.id === expressionDoc.id
      const choice = collision && !window.confirm(
        'A document with this identity is already open. Choose OK to replace it, or Cancel to duplicate the import with fresh identities.',
      ) ? 'duplicate' : 'replace'
      const imported = fromCanonicalDocument(
        resolveCanonicalImport(expressionDoc.id, parsed, choice),
        restoreOptions,
      )
      requireAvailableAlgebra(algebraRegistry, imported.document.algebra)
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
    if (activePlayback?.itemId === id) stopPlayback()
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

  /**
   * Applies a registered definition with its standard interpretation and
   * visualizer (ALG-004). A document with content is cleared first, after
   * confirmation, in the same history entry so one undo restores both.
   */
  const selectAlgebra = (algebraId: string) => {
    const definition = algebraRegistry.definitions().find((candidate) => candidate.algebraId === algebraId)
    if (!definition || definition.algebraId === expressionDoc.algebra.algebraId) return
    const conventionVersion = definition.conventionVersions[definition.conventionVersions.length - 1]
    const validation = definition.validateParameters({})
    if (validation.status !== 'valid') return
    const clearing = hasContent(expressionDoc)
    if (clearing && !window.confirm(
      `Switching to ${definition.badge} replaces every expression of this document with its example. Continue?`,
    )) return
    if (activePlayback) stopPlayback()
    setAppearanceItemId(null)
    setExpandedListIds(new Set())
    dispatchHistory({ type: 'begin-transaction' })
    if (expressionDoc.items.length > 0) executeCommand({ kind: 'clear-items' })
    executeCommand({
      kind: 'select-algebra',
      algebra: {
        algebraId: definition.algebraId,
        definitionVersion: definition.definitionVersion,
        conventionVersion,
        parameters: validation.parameters,
      },
      interpretation: { interpretationId: definition.standardInterpretationId, interpretationVersion: 1 },
      visualizerId: definition.standardVisualizerId,
    })
    // The algebra's showcase makes the switch land on a working example.
    showcaseItems(definition.showcase).forEach((item) => executeCommand({ kind: 'insert-item', item }))
    nextId.current = definition.showcase.length + 1
    dispatchHistory({ type: 'commit-transaction' })
    setViewportAnnouncement(`${definition.badge} selected; its example document was loaded.`)
  }

  const clearAllExpressions = () => {
    if (activePlayback) stopPlayback()
    setAppearanceItemId(null)
    setExpandedListIds(new Set())
    executeCommand({ kind: 'clear-items' })
    requestAnimationFrame(() => addButtonRef.current?.focus())
  }

  /** Moves the row of a focused editor and restores its caret afterwards. */
  const moveItemFromEditor = (
    editor: HTMLInputElement,
    itemId: string,
    target: number,
  ) => {
    rememberEditorFocus(editor)
    pendingHistoryFocus.current = lastEditorFocus.current
    moveItemToIndex(itemId, target)
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
      if (event.altKey) moveItemFromEditor(event.currentTarget, item.id, index - 1)
      else inputRefs.current.get(expressionDoc.items[index - 1].id)?.focus()
    } else if (
      event.key === 'ArrowDown' &&
      index < expressionDoc.items.length - 1
    ) {
      event.preventDefault()
      if (event.altKey) moveItemFromEditor(event.currentTarget, item.id, index + 1)
      else inputRefs.current.get(expressionDoc.items[index + 1].id)?.focus()
    }
  }

  const visibleCount = renderedVectors.length + renderedAreas.length
  const displayedNumber = (value: number) => formatDisplayNumber(
    value,
    expressionDoc.view.display.decimalPlaces,
  )
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
                  : `${displayedNumber(primitive.start.x)}, ${displayedNumber(primitive.start.y)}`
              } to ${displayedNumber(primitive.end.x)}, ${displayedNumber(primitive.end.y)}.`,
          )
          .join(' ')} ${renderedAreas
          .map(({ primitive }) => {
            const position = primitive.shape.kind === 'loop'
              ? primitive.shape.center
              : primitive.shape.vertices[0]
            const at = position.x === 0 && position.y === 0
              ? 'the origin'
              : `(${displayedNumber(position.x)}, ${displayedNumber(position.y)})`
            const shape = primitive.shape.kind === 'parallelogram'
              ? 'oriented parallelogram'
              : 'oriented loop'
            const signedValue = primitive.orientation === 'counterclockwise'
              ? primitive.area
              : -primitive.area
            return `${primitive.accessibleName} is an ${shape} with signed value ${
              displayedNumber(signedValue)
            }, area ${displayedNumber(primitive.area)}, ${primitive.orientation} orientation, positioned at ${at}.`
          })
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
        <AlgebraMenu
          badge={algebraDefinition.badge}
          choices={algebraRegistry.definitions().map((definition) => ({
            algebraId: definition.algebraId,
            badge: definition.badge,
            name: definition.info({}).name,
          }))}
          selectedAlgebraId={algebraDefinition.algebraId}
          onSelect={selectAlgebra}
          onInfo={() => setInfoDialog('algebra')}
          infoButtonRef={algebraInfoButtonRef}
        />
        <input
          ref={importInputRef}
          className="document-file-input"
          type="file"
          accept="application/json,.json"
          aria-label="Import document file"
          onChange={importDocument}
        />
        <button type="button" className="document-command document-import-command" onClick={() => importInputRef.current?.click()}>
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
      {interpretationResolution.status === 'unavailable' && (
        <div className="document-diagnostic" role="alert">
          {interpretationResolution.code}: {interpretationResolution.message}
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
                interpretation.supportsPosition(evaluation.entity)
              const supportsNormalization =
                evaluation?.status === 'valid' &&
                evaluation.valueType === 'single' &&
                evaluation.entity.kind !== 'scalar'
              const normalizationUnavailable =
                supportsNormalization &&
                item.normalization === 'natural' &&
                engine.normalize(evaluation.value).status === 'unavailable'
              const hasUnitNaturalNorm =
                supportsNormalization &&
                isUnitNaturalNorm(engine, evaluation.value)
              const kind = evaluation?.status === 'valid'
                ? evaluation.valueType === 'list'
                  ? `List (${evaluation.value.elements.length})`
                  : interpretation.describe(evaluation.entity)
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
              const approximated = valid && evaluation.valueType === 'single' &&
                evaluation.entity.kind !== 'mixed-multivector' &&
                evaluation.entity.approximated
              const scalar = valid && evaluation.valueType === 'single' &&
                evaluation.entity.kind === 'scalar'
              const scalarEdit = scalar ? directScalarEdit(item.source) : null
              const effectiveControl = item.control ?? (scalarEdit
                ? DEFAULT_SCALAR_CONTROL
                : undefined)
              const controlEvaluation = effectiveControl
                ? scalarControlEvaluations.get(item.id) ?? evaluateScalarControl(
                    effectiveControl, evaluatedItems, engine,
                  )
                : null
              const scalarControlAvailable = effectiveControl !== undefined
              const playbackParameters = effectiveControl?.mode === 'slider' &&
                controlEvaluation?.status === 'valid'
                ? {
                    minimum: controlEvaluation.minimum!,
                    maximum: controlEvaluation.maximum!,
                    step: controlEvaluation.step!,
                    animation: effectiveControl.animation ?? DEFAULT_SCALAR_ANIMATION,
                  }
                : null
              const isPlaying = activePlayback?.itemId === item.id
              const empty = item.source.trim() === ''
              const listExpanded = expandedListIds.has(item.id)
              const listDetailsId = `list-details-${item.id}`

              const dropBefore = dropTargetIndex === index
              const dropAfter = dropTargetIndex === evaluatedItems.length &&
                index === evaluatedItems.length - 1

              return (
                <article
                  key={item.id}
                  ref={(element) => {
                    if (element) expressionRowRefs.current.set(item.id, element)
                    else expressionRowRefs.current.delete(item.id)
                  }}
                  className={`expression-item${visible ? '' : ' is-hidden'}${
                    empty ? ' is-empty-expression' : ''
                  }${dropBefore ? ' drop-before' : ''}${dropAfter ? ' drop-after' : ''} ${
                    invalid || invalidPosition ? 'has-error' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="reorder-handle"
                    aria-label={`Reorder ${objectName}. Alt plus arrow keys to move.`}
                    onPointerDown={(event) => beginRowReorder(event, item.id)}
                    onKeyDown={(event) => reorderRowWithKeyboard(event, item.id)}
                  >
                    <span aria-hidden="true">⠿</span>
                  </button>
                  <div className="expression-input-row">
                    <div className="expression-actions">
                      {scalar && effectiveControl?.mode === 'slider' ? (
                        <button
                          type="button"
                          className={`scalar-play-button${isPlaying ? ' is-playing' : ''}`}
                          aria-label={isPlaying ? 'Pause scalar animation' : 'Play scalar animation'}
                          disabled={!scalarEdit || !playbackParameters}
                          onClick={() => isPlaying
                            ? stopPlayback()
                            : startPlayback(item, playbackParameters!, scalarEdit!.value)}
                        >{isPlaying
                          ? <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                              <rect x="1.5" y="1" width="2.5" height="8" />
                              <rect x="6" y="1" width="2.5" height="8" />
                            </svg>
                          : <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                              <path d="M2.5 1.2 8.5 5 2.5 8.8z" />
                            </svg>}</button>
                      ) : drawable && valid && (
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
                      {valid && !drawable &&
                        !(scalar && effectiveControl?.mode === 'slider') && (
                        <span className="expression-action-spacer" aria-hidden="true" />
                      )}
                      {valid ? (
                          <button
                            type="button"
                            className="appearance-swatch"
                            aria-label={`Open ${kind} menu for ${objectName}`}
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
                          onChange={(event) => {
                            if (isPlaying) stopPlayback()
                            pausedPlayback.current = null
                            executeCommand({
                              kind: 'update-source', itemId: item.id,
                              source: event.target.value,
                            }, `source:${item.id}`)
                          }}
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
                        {supportsNormalization && (
                          <span className="normalize-control">
                            <button
                              type="button"
                              className={`normalize-toggle${item.normalization ? ' active' : ''}`}
                              aria-pressed={item.normalization === 'natural'}
                              onClick={() => executeCommand({
                                kind: 'update-normalization', itemId: item.id,
                                normalization: item.normalization === 'natural' ? undefined : 'natural',
                              })}
                            >norm</button>
                            <span
                              className={`unit-norm-indicator${hasUnitNaturalNorm ? ' is-unit' : ''}`}
                              title={hasUnitNaturalNorm ? 'Unit norm' : undefined}
                            >
                              {hasUnitNaturalNorm && (
                                <span className="visually-hidden">Unit norm</span>
                              )}
                            </span>
                          </span>
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
                                  {evaluation?.status === 'valid' && evaluation.valueType === 'single' &&
                                    interpretation.detail(evaluation.entity) && (
                                    <span className="object-detail"> {interpretation.detail(evaluation.entity)}</span>
                                  )}
                                  {approximated && (
                                    <span
                                      className="approximated-indicator"
                                      title="A negligible coefficient was ignored when classifying this object"
                                    >
                                      <span aria-hidden="true">≈</span>
                                      <span className="visually-hidden">
                                        {' '}(approximated; a negligible coefficient was ignored)
                                      </span>
                                    </span>
                                  )}
                                </span>
                              )}
                              <output>{formatDisplayValue(
                                evaluation.value,
                                expressionDoc.view.display.decimalPlaces,
                                expressionDoc.view.display.showApproximatedResidue,
                              )}</output>
                              {normalizationUnavailable && <>
                                <span className="feedback-label">Normalization unavailable</span>
                                <span>This multivector has zero natural norm and was left unchanged.</span>
                              </>}
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

                      {scalar && effectiveControl?.mode === 'slider' && controlEvaluation && (
                        <div className="scalar-slider-row">
                          <span>{controlEvaluation.minimum == null
                            ? '—'
                            : displayedNumber(controlEvaluation.minimum)}</span>
                          <input
                            type="range"
                            aria-label={`Value for ${declaredName(item.source) ?? `Scalar ${position}`}`}
                            min={controlEvaluation.minimum ?? 0}
                            max={controlEvaluation.maximum ?? 1}
                            step={controlEvaluation.step ?? 1}
                            value={scalarEdit?.value ?? 0}
                            disabled={controlEvaluation.status === 'invalid' || !scalarEdit ||
                              scalarEdit.value < controlEvaluation.minimum! ||
                              scalarEdit.value > controlEvaluation.maximum!}
                            style={{ accentColor: color }}
                            onPointerDown={() => dispatchHistory({ type: 'begin-transaction' })}
                            onPointerUp={() => dispatchHistory({ type: 'commit-transaction' })}
                            onPointerCancel={() => dispatchHistory({ type: 'cancel-transaction' })}
                            onBlur={() => dispatchHistory({ type: 'boundary' })}
                            onChange={(event) => {
                              pausedPlayback.current = null
                              executeCommand({
                                kind: 'set-scalar-value', itemId: item.id,
                                value: snapToControlBounds(
                                  Number(event.target.value),
                                  controlEvaluation.minimum ?? 0,
                                  controlEvaluation.maximum ?? 1,
                                  controlEvaluation.step ?? 1,
                                ),
                              }, `scalar-control:${item.id}`)
                            }}
                          />
                          <span>{controlEvaluation.maximum == null
                            ? '—'
                            : displayedNumber(controlEvaluation.maximum)}</span>
                          {!scalarEdit && <small>Direct control requires a declared numeric literal.</small>}
                          {scalarEdit && controlEvaluation.status === 'valid' &&
                            (scalarEdit.value < controlEvaluation.minimum! ||
                              scalarEdit.value > controlEvaluation.maximum!) &&
                            <small role="status">Value is outside the configured interval.</small>}
                        </div>
                      )}

                      {scalar && effectiveControl?.mode === 'slider' && controlEvaluation && (
                        <>
                          <div className="scalar-interval-row">
                            <span className="scalar-interval-label">interval</span>
                            {([
                              ['minimumSource', 'Minimum source'],
                              ['maximumSource', 'Maximum source'],
                              ['stepSource', 'Step source'],
                            ] as const).map(([property, label]) => (
                              <input
                                key={property}
                                value={effectiveControl[property]}
                                aria-label={label}
                                aria-invalid={controlEvaluation.fields[
                                  property === 'minimumSource' ? 'minimum' :
                                    property === 'maximumSource' ? 'maximum' : 'step'
                                ].status === 'invalid'}
                                onBlur={() => dispatchHistory({ type: 'boundary' })}
                                onChange={(event) => {
                                  if (isPlaying) stopPlayback()
                                  pausedPlayback.current = null
                                  executeCommand({
                                    kind: 'update-control', itemId: item.id,
                                    control: { ...effectiveControl, [property]: event.target.value },
                                  }, `control-${property}:${item.id}`)
                                }}
                              />
                            ))}
                          </div>
                          {controlEvaluation.status === 'invalid' && (
                            <div className="scalar-interval-diagnostic" role="alert">
                              {Object.values(controlEvaluation.fields).find(
                                (field) => field.status === 'invalid',
                              )?.status === 'invalid'
                                ? Object.values(controlEvaluation.fields).find(
                                    (field) => field.status === 'invalid',
                                  )!.diagnostic.message
                                : controlEvaluation.diagnostic}
                            </div>
                          )}
                        </>
                      )}

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
                                  {interpretation.describe(element.entity)}
                                </span>
                                {element.entity.kind !== 'mixed-multivector' &&
                                  element.entity.approximated && (
                                    <span
                                      className="approximated-indicator"
                                      title="A negligible coefficient was ignored when classifying this object"
                                    >
                                      <span aria-hidden="true">≈</span>
                                      <span className="visually-hidden">
                                        {' '}(approximated; a negligible coefficient was ignored)
                                      </span>
                                    </span>
                                  )}
                                <code>{formatDisplayMultivector(
                                  element.value,
                                  expressionDoc.view.display.decimalPlaces,
                                  expressionDoc.view.display.showApproximatedResidue,
                                )}</code>
                                {element.positionConflict ? (
                                  <span className="list-element-position is-error">
                                    position conflict
                                  </span>
                                ) : element.position ? (
                                  <span className="list-element-position">
                                    position ({formatDisplayNumber(
                                      element.position.x,
                                      expressionDoc.view.display.decimalPlaces,
                                    )}, {formatDisplayNumber(
                                      element.position.y,
                                      expressionDoc.view.display.decimalPlaces,
                                    )})
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
                      borderVisible={expressionDoc.appearance[item.id]?.borderVisible ?? false}
                      orientationVisible={expressionDoc.appearance[item.id]?.orientationVisible ?? true}
                      bivectorShape={expressionDoc.appearance[item.id]?.bivectorShape ?? 'from-vectors'}
                      idealPointDisplay={expressionDoc.appearance[item.id]?.idealPointDisplay ?? 'vector'}
                      parallelogramAvailable={evaluation?.status === 'valid' &&
                        evaluation.valueType === 'single' &&
                        evaluation.primitive?.kind === 'oriented-area' &&
                        evaluation.primitive.shape.kind === 'parallelogram'}
                      colorOnly={!drawable}
                      control={scalarControlAvailable ? effectiveControl : undefined}
                      reducedMotion={reducedMotion}
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
                      onBorderVisibleChange={(borderVisible) => executeCommand({
                        kind: 'update-appearance', itemId: item.id, appearance: { borderVisible },
                      })}
                      onOrientationVisibleChange={(orientationVisible) => executeCommand({
                        kind: 'update-appearance', itemId: item.id, appearance: { orientationVisible },
                      })}
                      onBivectorShapeChange={(bivectorShape) => executeCommand({
                        kind: 'update-appearance', itemId: item.id, appearance: { bivectorShape },
                      })}
                      onIdealPointDisplayChange={(idealPointDisplay) => executeCommand({
                        kind: 'update-appearance', itemId: item.id, appearance: { idealPointDisplay },
                      })}
                      onControlChange={(control) => {
                        if (isPlaying) stopPlayback()
                        pausedPlayback.current = null
                        executeCommand({ kind: 'update-control', itemId: item.id, control })
                      }}
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
                className="viewport-command viewport-lock"
                onClick={toggleViewportLock}
                aria-label={viewportLocked ? 'Unlock viewport' : 'Lock viewport'}
                aria-pressed={viewportLocked}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="3.25" y="7" width="9.5" height="7" rx="1.25" fill="none" />
                  <path
                    d={viewportLocked
                      ? 'M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2'
                      : 'M10.75 7V5a2.75 2.75 0 0 0-5.5 0'}
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <div className="viewport-navigation">
              <button
                type="button"
                className="viewport-command"
                onClick={() => zoomViewport(1.25)}
                aria-label="Zoom in"
                disabled={viewportLocked}
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
                disabled={viewportLocked}
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
                disabled={viewportLocked}
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
                {formatZoomPercentage(viewport.pixelsPerUnit)}
              </output>
              </div>
            </div>
            <svg
              ref={attachViewportSvg}
              className={`canvas${viewportLocked ? ' is-viewport-locked' : ''}`}
              viewBox={`0 0 ${viewport.width} ${viewport.height}`}
              role="img"
              aria-label="Two-dimensional VGA viewport"
              aria-describedby="canvas-description"
              tabIndex={0}
              onPointerDown={beginViewportPan}
              onPointerMove={moveViewportPan}
              onPointerUp={endViewportPan}
              onPointerCancel={cancelViewportPan}
              onLostPointerCapture={loseViewportCapture}
              onKeyDown={navigateViewportWithKeyboard}
              onDoubleClick={createVectorFromViewport}
            >
              <desc id="canvas-description">{canvasDescription}</desc>
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
                <circle className="origin" cx={origin.x} cy={origin.y} r={3 * objectRenderScale} />
                <text className="axis-name" x={viewport.width - 14} y={Math.max(16, Math.min(viewport.height - 8, origin.y - 8))}>x</text>
                <text className="axis-name" x={Math.max(8, Math.min(viewport.width - 18, origin.x + 8))} y="16">y</text>
              </g>}

              {expressionDoc.view.display.graduationsVisible && <g aria-hidden="true">
                {grid.vertical.filter((line) => line.major && line.coordinate !== 0).map((line) => {
                  const axisY = Math.max(16, Math.min(viewport.height - 18, origin.y))
                  return <g key={`graduation-x-${line.coordinate}`}>
                    <line className="graduation" x1={line.screen} y1={axisY - 4} x2={line.screen} y2={axisY + 4} />
                    <text className="graduation-label" x={line.screen} y={axisY + 16}>{displayedNumber(line.coordinate)}</text>
                  </g>
                })}
                {grid.horizontal.filter((line) => line.major && line.coordinate !== 0).map((line) => {
                  const axisX = Math.max(28, Math.min(viewport.width - 28, origin.x))
                  return <g key={`graduation-y-${line.coordinate}`}>
                    <line className="graduation" x1={axisX - 4} y1={line.screen} x2={axisX + 4} y2={line.screen} />
                    <text className="graduation-label is-y" x={axisX - 8} y={line.screen + 4}>{displayedNumber(line.coordinate)}</text>
                  </g>
                })}
              </g>}

              {renderedVectors.map(({ id, primitive, entity, layout, color, label }) => {
                const item = expressionDoc.items.find((candidate) => candidate.id === id)
                return <OrientedSegmentGlyph
                  key={id}
                  id={id}
                  primitive={primitive}
                  layout={layout}
                  color={color}
                  label={label}
                  scale={objectRenderScale}
                  itemPresent={!!item}
                  headMovable={!!item && headMovable(item, entity)}
                  baseMovable={!!item && objectBaseMovable(item, entity)}
                  controller={handleController}
                />
              })}
              {renderedAreas.map(({ id, primitive, entity, layout, color, label, borderVisible, orientationVisible }) => {
                const item = expressionDoc.items.find((candidate) => candidate.id === id)
                return <OrientedAreaGlyph
                  key={id}
                  id={id}
                  primitive={primitive}
                  layout={layout}
                  color={color}
                  label={label}
                  scale={objectRenderScale}
                  borderVisible={borderVisible}
                  orientationVisible={orientationVisible}
                  itemPresent={!!item}
                  baseMovable={!!item && objectBaseMovable(item, entity)}
                  controller={handleController}
                />
              })}
              {renderedLines.map(({ id, primitive, entity, layout, color, label, orientationVisible }) => {
                const item = expressionDoc.items.find((candidate) => candidate.id === id)
                const selection = selectedLine?.itemId === id
                  ? layoutLineSelection(primitive, selectedLine.anchor, viewport, objectRenderScale)
                  : null
                return <UnboundedLineGlyph
                  key={id}
                  id={id}
                  primitive={primitive}
                  layout={layout}
                  color={color}
                  label={label}
                  scale={objectRenderScale}
                  itemPresent={!!item}
                  movable={!!item && lineMovable(item, entity)}
                  orientationVisible={orientationVisible}
                  orientationTicks={lineOrientationTicks(primitive, layout, objectRenderScale)}
                  selection={selection}
                  controller={handleController}
                />
              })}
              {renderedInfinity.map(({ id, primitive, layout, color, label }) => (
                <LineAtInfinityGlyph key={id} accessibleName={primitive.accessibleName} layout={layout} color={color} label={label} scale={objectRenderScale} />
              ))}
              {renderedIdealPoints.map(({ id, primitive, entity, arrow, marker, color, label }) => {
                const item = expressionDoc.items.find((candidate) => candidate.id === id)
                return <g key={id}>
                  {marker && <DirectionMarkerGlyph
                    accessibleName={primitive.accessibleName}
                    layout={marker}
                    color={color}
                    label={arrow ? null : label}
                    scale={objectRenderScale}
                  />}
                  {arrow && <OrientedSegmentGlyph
                    id={id}
                    primitive={{ kind: 'oriented-segment', start: primitive.position, end: {
                      x: primitive.position.x + primitive.direction.x * primitive.magnitude,
                      y: primitive.position.y + primitive.direction.y * primitive.magnitude,
                    }, accessibleName: primitive.accessibleName }}
                    layout={arrow}
                    color={color}
                    label={label}
                    scale={objectRenderScale}
                    itemPresent={!!item}
                    headMovable={!!item && headMovable(item, entity)}
                    baseMovable={!!item && objectBaseMovable(item, entity)}
                    controller={handleController}
                  />}
                </g>
              })}
              {renderedPoints.map(({ id, primitive, entity, point, color, label }) => {
                const item = expressionDoc.items.find((candidate) => candidate.id === id)
                return <PointMarkerGlyph
                  key={id}
                  id={id}
                  primitive={primitive}
                  point={point}
                  color={color}
                  label={label}
                  scale={objectRenderScale}
                  itemPresent={!!item}
                  movable={!!item && objectBaseMovable(item, entity)}
                  controller={handleController}
                />
              })}
              {anchorPreview && <g className="anchor-preview" aria-hidden="true">
                <circle cx={anchorPreview.point.x} cy={anchorPreview.point.y} r="12" />
                <circle cx={anchorPreview.point.x} cy={anchorPreview.point.y} r="3" />
              </g>}
            </svg>
            <output className="visually-hidden" aria-live="polite">
              {viewportAnnouncement}
            </output>
          </div>
        </section>}
      </main>
      {infoDialog === 'algebra' && (
        <AlgebraInfoDialog
          info={algebraDefinition.info(algebraResolution.parameters)}
          returnFocusRef={algebraInfoButtonRef}
          onClose={closeInfoDialog}
        />
      )}
      <output className="visually-hidden" aria-live="polite">
        {playbackAnnouncement}
      </output>
      <output className="visually-hidden" aria-live="polite">
        {reorderAnnouncement}
      </output>
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
