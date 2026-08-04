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
  type ExpressionControl,
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
  formatGridNumber,
  formatZoomPercentage,
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
import {
  formatDisplayMultivector,
  formatDisplayNumber,
  formatDisplayValue,
} from './presentation/formatNumber'
import { evaluateScalarControl } from './application/evaluateScalarControl'
import { directScalarEdit } from './language/directScalarEdit'
import {
  directDeclaredVectorComponents,
  directPositionAnchorReference,
  directPositionComponents,
  rewriteLiteralComponents,
} from './language/directVectorEdit'
import {
  scalarPlaybackFrame,
  scalarPlaybackOffset,
  snapToControlBounds,
  type PlaybackParameters,
} from './application/scalarPlayback'
import './App.css'

const engine = createVga2Engine()
const MIN_PANEL_WIDTH = 240
const UNIT_NORM_TOLERANCE = 1e-10
/** Keeps the `.panel-resize` separator reachable at any panel width. */
const PANEL_RESIZE_WIDTH = 6

function isUnitNaturalNorm(value: Parameters<typeof engine.norm>[0]): boolean {
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
type ManipulationKind = 'base' | 'head'

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

function BivectorOrientationArrow({
  center, direction, scale,
}: Readonly<{
  center: Readonly<{ x: number; y: number }>
  direction: 1 | -1
  scale: number
}>) {
  const radius = 13 * scale
  const span = 1.5 * Math.PI
  const headLength = 0.4 * radius
  const startAngle = direction > 0 ? -Math.PI / 2 : Math.PI / 2
  const endAngle = startAngle + direction * span
  const strokeAngle = endAngle - direction * Math.min(headLength / radius, 0.5)
  const point = (angle: number) => ({
    x: center.x + radius * Math.cos(angle),
    y: center.y - radius * Math.sin(angle),
  })
  const start = point(startAngle)
  const strokeEnd = point(strokeAngle)
  const end = point(endAngle)
  const sweep = direction > 0 ? 0 : 1
  const heading = Math.atan2(end.y - strokeEnd.y, end.x - strokeEnd.x)
  const spread = 0.5
  const base = (angle: number) => ({
    x: end.x - headLength * Math.cos(angle),
    y: end.y - headLength * Math.sin(angle),
  })
  const first = base(heading - spread)
  const second = base(heading + spread)
  return <g className="bivector-orientation" aria-hidden="true" pointerEvents="none">
    <path
      d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 1 ${sweep} ${strokeEnd.x} ${strokeEnd.y}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={Math.min(2.2 * scale, 0.16 * radius)}
      strokeLinecap="round"
    />
    <polygon
      points={`${end.x},${end.y} ${first.x},${first.y} ${second.x},${second.y}`}
      fill="currentColor"
    />
  </g>
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
    targetIndex: number
  }> | null>(null)
  const expressionRowRefs = useRef(new Map<string, HTMLElement>())
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
  const manipulationDrag = useRef<Readonly<{
    itemId: string
    kind: ManipulationKind
    pointerId: number
  }> | null>(null)
  const anchorValidityCache = useRef(new Map<string, boolean>())
  const [hoveredManipulation, setHoveredManipulation] = useState<string | null>(null)
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
  const [anchorPreview, setAnchorPreview] = useState<Readonly<{
    draggedId: string
    targetId: string
    targetName: string
    property: 'position' | 'head'
    point: Readonly<{ x: number; y: number }>
  }> | null>(null)
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
    if (viewportLocked) return
    zoomViewport(Math.exp(-event.deltaY * 0.0015), screenPoint(event.clientX, event.clientY))
  }
  const beginViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    setAppearanceItemId(null)
    if (viewportLocked || event.button !== 0 || event.target !== event.currentTarget) return
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
    if (kind === 'head' && rendered.primitive.kind === 'oriented-segment') {
      const components = directDeclaredVectorComponents(item.source)
      if (!components) return
      const values = [
        Number(formatGridNumber(target.x - rendered.primitive.start.x, roundingStep)),
        Number(formatGridNumber(target.y - rendered.primitive.start.y, roundingStep)),
      ] as const
      const rewritten = rewriteLiteralComponents(
        item.source, components, values[0], values[1],
      )
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
    if (!item.positionSource) {
      executeCommand({
        kind: 'update-position', itemId,
        positionSource: `(${formatGridNumber(target.x, roundingStep)}, ${
          formatGridNumber(target.y, roundingStep)})`,
      })
      return
    }
    const components = directPositionComponents(item.positionSource)
    if (!components) {
      executeCommand({
        kind: 'update-position', itemId,
        positionSource: `(${formatGridNumber(target.x, roundingStep)}, ${
          formatGridNumber(target.y, roundingStep)})`,
      })
      return
    }
    const rewritten = rewriteLiteralComponents(
      item.positionSource, components, target.x, target.y,
    )
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
  const beginManipulation = (
    event: ReactPointerEvent<SVGCircleElement>,
    itemId: string,
    kind: ManipulationKind,
  ) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    manipulationDrag.current = { itemId, kind, pointerId: event.pointerId }
    anchorValidityCache.current.clear()
    dispatchHistory({ type: 'boundary' })
    dispatchHistory({ type: 'begin-transaction' })
    setViewportAnnouncement(`${kind === 'head' ? 'Vector head' : 'Object base'} drag started.`)
  }
  const componentsMovable = (
    components: ReturnType<typeof directDeclaredVectorComponents>,
  ): boolean => {
    if (!components) return false
    const references = components.filter((component) => component.kind === 'reference')
    if (new Set(references.map((component) => component.name)).size !== references.length)
      return false
    return references.every((component) => expressionDoc.items.filter((candidate) =>
      declaredName(candidate.source) === component.name &&
      directScalarEdit(candidate.source) !== null).length === 1)
  }
  const vectorHeadMovable = (item: ExpressionItem): boolean =>
    componentsMovable(directDeclaredVectorComponents(item.source))
  const objectBaseMovable = (item: ExpressionItem): boolean =>
    !item.positionSource ||
    directPositionAnchorReference(item.positionSource) !== null ||
    componentsMovable(directPositionComponents(item.positionSource))
  const manipulateWithKeyboard = (
    event: KeyboardEvent<SVGCircleElement>,
    itemId: string,
    kind: ManipulationKind,
    current: Readonly<{ x: number; y: number }>,
  ) => {
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
        return evaluateDocument(proposed, engine).find(
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
    updateManipulatedItem(itemId, kind, {
      x: current.x + delta.x,
      y: current.y + delta.y,
    })
    dispatchHistory({ type: 'commit-transaction' })
    setViewportAnnouncement(
      `${kind === 'head' ? 'Vector head' : 'Object base'} moved to ${
        formatGridNumber(current.x + delta.x, step)}, ${
        formatGridNumber(current.y + delta.y, step)}.`,
    )
  }
  const moveViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    const manipulation = manipulationDrag.current
    if (manipulation?.pointerId === event.pointerId) {
      const pointer = screenPoint(event.clientX, event.clientY)
      if (manipulation.kind === 'base') {
        const rectangle = event.currentTarget.getBoundingClientRect()
        const cssScaleX = rectangle.width > 0 ? rectangle.width / viewport.width : 1
        const cssScaleY = rectangle.height > 0 ? rectangle.height / viewport.height : 1
        const candidates = renderedPrimitives.flatMap((rendered) => {
          if (rendered.id.includes(':') || rendered.id === manipulation.itemId) return []
          const primitive = rendered.primitive
          const targetItem = expressionDoc.items.find((item) => item.id === rendered.id)
          const targetName = targetItem ? declaredName(targetItem.source) : null
          if (!targetName) return []
          const anchors = primitive.kind === 'oriented-segment'
            ? [
                { property: 'position' as const, mathematical: primitive.start },
                { property: 'head' as const, mathematical: primitive.end },
              ]
            : [{
                property: 'position' as const,
                mathematical: primitive.shape.kind === 'loop'
                  ? primitive.shape.center
                  : primitive.shape.vertices[0],
              }]
          return anchors.map(({ property, mathematical }, order) => {
            const point = toScreen(viewport, mathematical)
            return {
              draggedId: manipulation.itemId,
              targetId: rendered.id,
              targetName,
              property,
              point,
              mathematical,
              order,
              distance: Math.hypot(
                (pointer.x - point.x) * cssScaleX,
                (pointer.y - point.y) * cssScaleY,
              ),
            }
          })
        }).filter((candidate) => candidate.distance <= 22)
          .filter((candidate) => {
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
            const valid = evaluateDocument(proposed, engine).find(
              (result) => result.item.id === manipulation.itemId,
            )?.positionEvaluation?.status === 'valid'
            anchorValidityCache.current.set(key, valid)
            return valid
          })
          .sort((left, right) => left.distance - right.distance ||
            left.targetId.localeCompare(right.targetId) || left.order - right.order)
        const retained = anchorPreview?.draggedId === manipulation.itemId
          ? candidates.find((candidate) =>
              candidate.targetId === anchorPreview.targetId &&
              candidate.property === anchorPreview.property &&
              candidate.distance <= 22)
          : null
        const candidate = retained ?? (
          candidates[0]?.distance <= 16 ? candidates[0] : null
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
        const candidate = evaluateDocument(candidateDocument, engine).find(
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
          manipulationDrag.current = null
          anchorValidityCache.current.clear()
          setAnchorPreview(null)
          dispatchHistory({ type: 'cancel-transaction' })
          return
        }
      } else {
        setViewportAnnouncement('Object manipulation committed.')
      }
      manipulationDrag.current = null
      anchorValidityCache.current.clear()
      setAnchorPreview(null)
      dispatchHistory({ type: 'commit-transaction' })
      return
    }
    if (viewportPan.current?.pointerId === event.pointerId) viewportPan.current = null
  }
  const cancelViewportPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (manipulationDrag.current?.pointerId === event.pointerId) {
      manipulationDrag.current = null
      anchorValidityCache.current.clear()
      setAnchorPreview(null)
      dispatchHistory({ type: 'cancel-transaction' })
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
      manipulationDrag.current = null
      anchorValidityCache.current.clear()
      setAnchorPreview(null)
      dispatchHistory({ type: 'cancel-transaction' })
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
    () => evaluateDocument(expressionDoc, engine),
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
      if (event.key !== 'Escape' || !manipulationDrag.current) return
      event.preventDefault()
      manipulationDrag.current = null
      anchorValidityCache.current.clear()
      setAnchorPreview(null)
      dispatchHistory({ type: 'cancel-transaction' })
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
  // The Studio-sized glyphs are the 1× baseline exposed to users. The
  // historical renderer used 1.5 as that baseline, so keep the visual size
  // while restoring a meaningful multiplicative setting.
  const objectRenderScale = expressionDoc.view.display.objectScale * 1.5
  const renderedPrimitives = evaluatedItems.flatMap((evaluated) => {
    if (evaluated.evaluation?.status !== 'valid') return []
    const kind = evaluated.evaluation.valueType === 'list'
      ? `List (${evaluated.evaluation.value.elements.length})`
      : describeVga2Entity(evaluated.evaluation.entity)
    const { visible, color, labelVisible, displayLabel, borderVisible, orientationVisible, bivectorShape } = resolveItemAppearance(
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
            borderVisible,
            orientationVisible,
            bivectorShape,
            label: labelVisible ? (baseLabel ? `${baseLabel}[${elementIndex}]` : element.primitive.accessibleName) : null,
          }]
        : [])
      : evaluated.evaluation.primitive
        ? [{
            id: evaluated.item.id,
            primitive: evaluated.evaluation.primitive,
            color,
            borderVisible,
            orientationVisible,
            bivectorShape,
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
    const start = toScreen(viewport, primitive.start)
    const end = toScreen(viewport, primitive.end)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)
    const headLength = Math.min(
      14 * objectRenderScale,
      length * 0.35,
    )
    const headAngle = Math.PI / 6
    const arrowVisible = length > 8
    const shaftInset = arrowVisible ? headLength * Math.cos(headAngle) : 0
    const shaftEnd = length > 0
      ? {
          x: end.x - shaftInset * dx / length,
          y: end.y - shaftInset * dy / length,
        }
      : end
    return [{
        id,
        primitive,
        color,
        label,
        start,
        end,
        shaftEnd,
        arrowPoints: arrowVisible ? [
          `${end.x},${end.y}`,
          `${end.x - headLength * Math.cos(angle - headAngle)},${
            end.y - headLength * Math.sin(angle - headAngle)}`,
          `${end.x - headLength * Math.cos(angle + headAngle)},${
            end.y - headLength * Math.sin(angle + headAngle)}`,
        ].join(' ') : null,
      }]
  })
  const renderedAreas = renderedPrimitives.flatMap(({ id, primitive, color, label, borderVisible, orientationVisible, bivectorShape }) => {
    if (primitive.kind !== 'oriented-area') return []
    if (bivectorShape === 'from-vectors' && primitive.shape.kind === 'parallelogram') {
      const points = primitive.shape.vertices.map((point) => toScreen(viewport, point))
      return [{
        id,
        primitive,
        color,
        borderVisible,
        orientationVisible,
        orientationCenter: {
          x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
          y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
        },
        label,
        path: `${points.map((point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`,
        labelPoint: points[2],
      }]
    }
    const mathematicalCenter = primitive.shape.kind === 'loop'
      ? primitive.shape.center
      : primitive.shape.vertices[0]
    const center = toScreen(viewport, mathematicalCenter)
    if (bivectorShape === 'square') {
      const side = Math.sqrt(primitive.area) * viewport.pixelsPerUnit
      const half = side / 2
      return [{
        id, primitive, color, borderVisible, orientationVisible,
        orientationCenter: center, label,
        path: `M ${center.x - half} ${center.y - half} H ${center.x + half} V ${center.y + half} H ${center.x - half} Z`,
        labelPoint: { x: center.x + half, y: center.y - half },
      }]
    }
    const radius = Math.sqrt(primitive.area / Math.PI) * viewport.pixelsPerUnit
    const sweep = primitive.orientation === 'counterclockwise' ? 1 : 0
    return [{
      id,
      primitive,
      color,
      borderVisible,
      orientationVisible,
      orientationCenter: center,
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
        moveItemToIndex(drag.itemId, drag.targetIndex)
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
    reorderDrag.current = { itemId, pointerId: event.pointerId, targetIndex: index }
    dispatchHistory({ type: 'begin-transaction' })
    document.body.classList.add('reordering-items')
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }

  const reorderRowWithKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    if (!event.shiftKey) return
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

  const clearAllExpressions = () => {
    if (activePlayback) stopPlayback()
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
                isUnitNaturalNorm(evaluation.value)
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
                    aria-label={`Reorder ${objectName}. Shift plus arrow keys to move.`}
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
                        ><span aria-hidden="true">{isPlaying ? '⏸' : '▶'}</span></button>
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
                                  {describeVga2Entity(element.entity)}
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
              ref={viewportSvgRef}
              className={`canvas${viewportLocked ? ' is-viewport-locked' : ''}`}
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

              {renderedVectors.map(({
                id, primitive, start, end, shaftEnd, arrowPoints, color, label,
              }) => {
                const item = expressionDoc.items.find((candidate) => candidate.id === id)
                const baseMovable = !!item && objectBaseMovable(item)
                const headMovable = !!item && vectorHeadMovable(item)
                const headAndBaseCoincide = Math.hypot(
                  end.x - start.x, end.y - start.y,
                ) < 1
                const baseKey = `${id}:base`
                const headKey = `${id}:head`
                return <g key={id} style={{ color }}>
                  <line
                    className={`vector${hoveredManipulation === headKey ? ' is-head-hovered' : ''}`}
                    x1={start.x}
                    y1={start.y}
                    x2={shaftEnd.x}
                    y2={shaftEnd.y}
                    strokeWidth={4 * objectRenderScale}
                    aria-label={primitive.accessibleName}
                  />
                  {arrowPoints && <polygon
                    className="vector-arrowhead"
                    points={arrowPoints}
                    aria-hidden="true"
                  />}
                  {headMovable && <>
                    <circle
                      className="vector-head-point"
                      cx={end.x} cy={end.y}
                      r={1.25 * objectRenderScale}
                      aria-hidden="true"
                    />
                    {arrowPoints && hoveredManipulation === headKey && <circle
                      className="vector-head-indicator"
                      cx={end.x} cy={end.y} r={5 * objectRenderScale}
                      aria-hidden="true"
                    />}
                    <circle
                      className="manipulation-hit-target vector-head-target"
                      cx={end.x} cy={end.y} r="12"
                      tabIndex={0}
                      role="button"
                      aria-label={`Move head of ${primitive.accessibleName}`}
                      onPointerEnter={() => setHoveredManipulation(headKey)}
                      onPointerLeave={() => setHoveredManipulation((current) => current === headKey ? null : current)}
                      onFocus={() => setHoveredManipulation(headKey)}
                      onBlur={() => setHoveredManipulation((current) => current === headKey ? null : current)}
                      onPointerDown={(event) => beginManipulation(event, id, 'head')}
                      onKeyDown={(event) => manipulateWithKeyboard(
                        event, id, 'head', primitive.end,
                      )}
                    />
                  </>}
                  {item && <><circle
                    className={`manipulation-base-contour${baseMovable ? ' is-movable' : ''}`}
                    cx={start.x} cy={start.y} r={10 * objectRenderScale}
                    style={{
                      strokeWidth: Math.max(
                        0, 24 - 20 * objectRenderScale,
                      ),
                      pointerEvents: headMovable && headAndBaseCoincide ? 'none' : undefined,
                    }}
                    tabIndex={baseMovable ? 0 : undefined}
                    role={baseMovable ? 'button' : undefined}
                    aria-keyshortcuts={baseMovable ? 'Enter Delete' : undefined}
                    aria-label={baseMovable ? `Move base of ${primitive.accessibleName}` : undefined}
                    onPointerEnter={baseMovable ? () => setHoveredManipulation(baseKey) : undefined}
                    onPointerLeave={baseMovable ? () => setHoveredManipulation((current) => current === baseKey ? null : current) : undefined}
                    onFocus={baseMovable ? () => setHoveredManipulation(baseKey) : undefined}
                    onBlur={baseMovable ? () => setHoveredManipulation((current) => current === baseKey ? null : current) : undefined}
                    onPointerDown={baseMovable ? (event) => beginManipulation(event, id, 'base') : undefined}
                    onKeyDown={baseMovable ? (event) => manipulateWithKeyboard(
                      event, id, 'base', primitive.start,
                    ) : undefined}
                  />
                  <circle
                    className={`manipulation-base-point${hoveredManipulation === baseKey ? ' is-hovered' : ''}`}
                    cx={start.x} cy={start.y} r={4.5 * objectRenderScale}
                    aria-hidden="true"
                  /></>}
                  {label && <text className="object-label" x={end.x + 8} y={end.y - 8}>{label}</text>}
                </g>
              })}
              {renderedAreas.map(({ id, primitive, path, color, label, labelPoint, borderVisible, orientationVisible, orientationCenter }) => {
                const item = expressionDoc.items.find((candidate) => candidate.id === id)
                const baseMovable = !!item && objectBaseMovable(item)
                const base = primitive.shape.kind === 'loop'
                  ? toScreen(viewport, primitive.shape.center)
                  : toScreen(viewport, primitive.shape.vertices[0])
                const baseKey = `${id}:base`
                return <g key={id} style={{ color }}>
                  <path
                    className={`bivector${borderVisible ? ' has-border' : ''}`}
                    d={path}
                    strokeWidth={3 * objectRenderScale}
                    pointerEvents="none"
                    aria-label={primitive.accessibleDescription}
                  />
                  {orientationVisible && <BivectorOrientationArrow
                    center={orientationCenter}
                    direction={primitive.orientation === 'counterclockwise' ? 1 : -1}
                    scale={objectRenderScale}
                  />}
                  {item && <><circle
                    className={`manipulation-base-contour${baseMovable ? ' is-movable' : ''}`}
                    cx={base.x} cy={base.y} r={10 * objectRenderScale}
                    style={{ strokeWidth: Math.max(
                      0, 24 - 20 * objectRenderScale,
                    ) }}
                    tabIndex={baseMovable ? 0 : undefined}
                    role={baseMovable ? 'button' : undefined}
                    aria-keyshortcuts={baseMovable ? 'Enter Delete' : undefined}
                    aria-label={baseMovable ? `Move base of ${primitive.accessibleName}` : undefined}
                    onPointerEnter={baseMovable ? () => setHoveredManipulation(baseKey) : undefined}
                    onPointerLeave={baseMovable ? () => setHoveredManipulation((current) => current === baseKey ? null : current) : undefined}
                    onFocus={baseMovable ? () => setHoveredManipulation(baseKey) : undefined}
                    onBlur={baseMovable ? () => setHoveredManipulation((current) => current === baseKey ? null : current) : undefined}
                    onPointerDown={baseMovable ? (event) => beginManipulation(event, id, 'base') : undefined}
                    onKeyDown={baseMovable ? (event) => manipulateWithKeyboard(
                      event, id, 'base', primitive.shape.kind === 'loop'
                        ? primitive.shape.center
                        : primitive.shape.vertices[0],
                    ) : undefined}
                  />
                  <circle
                    className={`manipulation-base-point${hoveredManipulation === baseKey ? ' is-hovered' : ''}`}
                    cx={base.x} cy={base.y} r={4.5 * objectRenderScale}
                    aria-hidden="true"
                  /></>}
                  {label && <text className="object-label" x={labelPoint.x + 8} y={labelPoint.y - 8}>{label}</text>}
                </g>
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
