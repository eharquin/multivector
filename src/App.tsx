import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createVga2Engine } from './algebra/vgaEngine'
import { evaluateDocument } from './application/evaluateDocument'
import { AlgebraInfoDialog } from './components/AlgebraInfoDialog'
import { ExpressionReferenceDialog } from './components/ExpressionReferenceDialog'
import {
  describeVga2Entity,
  supportsVga2Position,
} from './geometry/vga2Interpretation'
import {
  addExpression,
  deleteExpression,
  expressionDocument,
  MAX_EXPRESSION_ITEMS,
  updateExpression,
  updateExpressionPosition,
  type ExpressionItem,
} from './document/expressionDocument'
import { toScreen, type Viewport2d } from './visualization/viewport'
import { limitRenderedListElements } from './visualization/primitives'
import './App.css'

const engine = createVga2Engine()
const MIN_PANEL_WIDTH = 240
const MAX_PANEL_WIDTH = 720

const viewport: Viewport2d = {
  width: 640,
  height: 480,
  centerX: 0,
  centerY: 0,
  pixelsPerUnit: 72,
}

function App() {
  const [expressionDoc, setExpressionDoc] = useState(() =>
    expressionDocument([{ id: 'item-1', source: 'vector(2, 1)' }]),
  )
  const nextId = useRef(2)
  const inputRefs = useRef(new Map<string, HTMLInputElement>())
  const pendingFocus = useRef<string | null>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const algebraInfoButtonRef = useRef<HTMLButtonElement>(null)
  const expressionReferenceButtonRef = useRef<HTMLButtonElement>(null)
  const resizeDrag = useRef<Readonly<{ startX: number; startWidth: number }> | null>(
    null,
  )
  const [panelWidth, setPanelWidth] = useState(340)
  const [infoDialog, setInfoDialog] = useState<
    'algebra' | 'expressions' | null
  >(null)
  const closeInfoDialog = useCallback(() => setInfoDialog(null), [])

  const evaluatedItems = useMemo(
    () => evaluateDocument(expressionDoc, engine),
    [expressionDoc],
  )

  const origin = toScreen(viewport, { x: 0, y: 0 })
  const renderedPrimitives = evaluatedItems.flatMap((evaluated) => {
    if (evaluated.evaluation?.status !== 'valid') return []
    return evaluated.evaluation.valueType === 'list'
      ? limitRenderedListElements(
          evaluated.evaluation.elements.filter((element) => element.primitive),
        ).visible
        .flatMap((element) => element.primitive
        ? [{ id: `${evaluated.item.id}:${element.id}`, primitive: element.primitive }]
        : [])
      : evaluated.evaluation.primitive
        ? [{ id: evaluated.item.id, primitive: evaluated.evaluation.primitive }]
        : []
  })
  const omittedRenderElements = evaluatedItems.reduce((total, evaluated) => {
    if (evaluated.evaluation?.status !== 'valid' ||
        evaluated.evaluation.valueType !== 'list') return total
    return total + limitRenderedListElements(
      evaluated.evaluation.elements.filter((element) => element.primitive),
    ).omitted
  }, 0)
  const renderedVectors = renderedPrimitives.flatMap(({ id, primitive }) => {
    if (primitive.kind !== 'oriented-segment') return []
    return [{
        id,
        primitive,
        start: toScreen(viewport, primitive.start),
        end: toScreen(viewport, primitive.end),
      }]
  })
  const renderedAreas = renderedPrimitives.flatMap(({ id, primitive }) => {
    if (primitive.kind !== 'oriented-area') return []
    if (primitive.shape.kind === 'parallelogram') {
      const points = primitive.shape.vertices.map((point) => toScreen(viewport, point))
      return [{
        id,
        primitive,
        path: `${points.map((point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`,
      }]
    }
    const center = toScreen(viewport, primitive.shape.center)
    const radius = primitive.shape.radius * viewport.pixelsPerUnit
    const sweep = primitive.orientation === 'counterclockwise' ? 1 : 0
    return [{
      id,
      primitive,
      path: `M ${center.x + radius} ${center.y} ` +
        `A ${radius} ${radius} 0 1 ${sweep} ${center.x - radius} ${center.y} ` +
        `A ${radius} ${radius} 0 1 ${sweep} ${center.x + radius} ${center.y} Z`,
    }]
  })

  useEffect(() => {
    const id = pendingFocus.current
    if (!id) return
    inputRefs.current.get(id)?.focus()
    pendingFocus.current = null
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

  const insertExpression = (afterId?: string) => {
    if (expressionDoc.items.length >= MAX_EXPRESSION_ITEMS) return
    const id = `item-${nextId.current++}`
    pendingFocus.current = id
    setExpressionDoc((current) =>
      addExpression(current, { id, source: '' }, afterId),
    )
  }

  const removeExpression = (id: string) => {
    const index = expressionDoc.items.findIndex((item) => item.id === id)
    const neighbor =
      expressionDoc.items[index - 1] ??
      expressionDoc.items[index + 1] ??
      null
    pendingFocus.current = neighbor?.id ?? null
    setExpressionDoc((current) => deleteExpression(current, id))
    if (!neighbor) {
      requestAnimationFrame(() => addButtonRef.current?.focus())
    }
  }

  const handleItemKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    item: ExpressionItem,
    index: number,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      insertExpression(item.id)
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
        <span className="app-status">Research preview</span>
      </header>

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
              const feedbackId = `expression-feedback-${item.id}`
              const inputId = `expression-source-${item.id}`
              const invalid = evaluation?.status === 'invalid'
              const invalidPosition =
                positionEvaluation?.status === 'invalid'
              const supportsPosition =
                evaluation?.status === 'valid' &&
                (evaluation.valueType === 'list'
                  ? evaluation.elements.length > 0 &&
                    evaluation.elements.every((element) =>
                      supportsVga2Position(element.entity))
                  : supportsVga2Position(evaluation.entity))

              return (
                <article
                  className={`expression-item ${
                    invalid || invalidPosition ? 'has-error' : ''
                  }`}
                  key={item.id}
                >
                  <div className="expression-input-row">
                    <div className="expression-body">
                      <input
                        ref={(element) => {
                          if (element) inputRefs.current.set(item.id, element)
                          else inputRefs.current.delete(item.id)
                        }}
                        id={inputId}
                        className="expression-source"
                        aria-label={`Expression ${position}`}
                        value={item.source}
                        onChange={(event) =>
                          setExpressionDoc((current) =>
                            updateExpression(current, item.id, event.target.value),
                          )
                        }
                        onKeyDown={(event) =>
                          handleItemKeyDown(event, item, index)
                        }
                        aria-describedby={evaluation ? feedbackId : undefined}
                        aria-invalid={invalid}
                        spellCheck={false}
                        autoComplete="off"
                      />

                      {evaluation || positionEvaluation ? (
                        <div
                          id={feedbackId}
                          className="expression-feedback"
                          role={invalid || invalidPosition ? 'alert' : 'status'}
                        >
                          {evaluation?.status === 'valid' ? (
                            <>
                              <span className="object-kind">
                                {evaluation.valueType === 'list'
                                  ? `List (${evaluation.value.elements.length})`
                                  : describeVga2Entity(evaluation.entity)}
                              </span>
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
                      ) : (
                        <div className="expression-empty-state">
                          Enter an expression, or press Backspace to remove this row.
                        </div>
                      )}

                      {supportsPosition && (
                        <div className="position-input-row">
                          <span className="position-prefix" aria-hidden="true">@</span>
                          <input
                            className="position-source"
                            aria-label={`Position ${position}`}
                            placeholder="(0, 0)"
                            value={item.positionSource ?? ''}
                            onChange={(event) =>
                              setExpressionDoc((current) =>
                                updateExpressionPosition(
                                  current,
                                  item.id,
                                  event.target.value,
                                ),
                              )
                            }
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
                </article>
              )
            })}
          </div>
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

        <section className="visualizer" aria-label="VGA 2D viewport">
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

              {renderedVectors.map(({ id, primitive, start, end }) => (
                <line
                  key={id}
                  className="vector"
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  markerEnd="url(#arrowhead)"
                  aria-label={primitive.accessibleName}
                />
              ))}
              {renderedAreas.map(({ id, primitive, path }) => (
                <path
                  key={id}
                  className="bivector"
                  d={path}
                  markerEnd="url(#area-arrowhead)"
                  aria-label={primitive.accessibleDescription}
                />
              ))}
            </svg>
          </div>
        </section>
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
