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
  const renderedVectors = evaluatedItems.flatMap((evaluated) => {
    const primitive =
      evaluated.evaluation?.status === 'valid'
        ? evaluated.evaluation.primitive
        : null
    if (!primitive) return []
    return [
      {
        id: evaluated.item.id,
        primitive,
        start: toScreen(viewport, primitive.start),
        end: toScreen(viewport, primitive.end),
      },
    ]
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

  const canvasDescription =
    renderedVectors.length === 0
      ? `No vectors are visible from ${expressionDoc.items.length} expressions.`
      : `${renderedVectors.length} ${
          renderedVectors.length === 1 ? 'vector is' : 'vectors are'
        } visible. ${renderedVectors
          .map(
            ({ primitive }) =>
              `${primitive.accessibleName} runs from ${
                primitive.start.x === 0 && primitive.start.y === 0
                  ? 'the origin'
                  : `${primitive.start.x}, ${primitive.start.y}`
              } to ${primitive.end.x}, ${primitive.end.y}.`,
          )
          .join(' ')}`

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
                supportsVga2Position(evaluation.entity)

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
                                {describeVga2Entity(evaluation.entity)}
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
              <title id="canvas-title">Two-dimensional vector viewport</title>
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
