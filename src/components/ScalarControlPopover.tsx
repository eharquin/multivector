import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { ExpressionControl } from '../document/expressionDocument'
import type { ScalarControlEvaluation, ScalarControlField } from '../application/evaluateScalarControl'
import { popoverPosition } from './popoverPosition'

type Props = Readonly<{
  name: string
  control: ExpressionControl
  evaluation: ScalarControlEvaluation
  anchorRef: RefObject<HTMLButtonElement | null>
  onChange(control: ExpressionControl): void
  onRemove(): void
  onClose(): void
}>

const fields: readonly Readonly<{
  key: ScalarControlField
  property: 'minimumSource' | 'maximumSource' | 'stepSource'
  label: string
}>[] = [
  { key: 'minimum', property: 'minimumSource', label: 'Minimum source' },
  { key: 'maximum', property: 'maximumSource', label: 'Maximum source' },
  { key: 'step', property: 'stepSource', label: 'Step source' },
]

export function ScalarControlPopover({
  name, control, evaluation, anchorRef, onChange, onRemove, onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLButtonElement>(null)
  const placement = popoverPosition(anchorRef.current, 288, 350)

  useEffect(() => {
    const returnFocusTarget = anchorRef.current
    firstRef.current?.focus()
    const pointerDown = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node) ||
          returnFocusTarget?.contains(event.target as Node)) return
      onClose()
    }
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', pointerDown)
    document.addEventListener('keydown', keyDown)
    return () => {
      document.removeEventListener('mousedown', pointerDown)
      document.removeEventListener('keydown', keyDown)
      returnFocusTarget?.focus()
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={ref}
      className="scalar-control-popover"
      role="dialog"
      aria-label={`Control — ${name}`}
      style={{ top: placement.top, left: placement.left, width: 288 }}
    >
      <header className="scalar-control-header">
        <strong>Control — Scalar</strong>
        <button type="button" onClick={onClose} aria-label="Close scalar control">×</button>
      </header>
      <section className="scalar-control-section">
        <div className="scalar-control-section-title">Mode</div>
        <div className="scalar-control-mode-grid">
          {(['number', 'slider'] as const).map((mode, index) => (
            <button
              ref={index === 0 ? firstRef : undefined}
              key={mode}
              type="button"
              className={control.mode === mode ? 'active' : ''}
              aria-pressed={control.mode === mode}
              onClick={() => onChange({ ...control, mode })}
            >
              {mode === 'number' ? 'Number' : 'Slider'}
            </button>
          ))}
        </div>
      </section>
      <section className="scalar-control-section">
        <div className="scalar-control-section-title">Interval</div>
        {fields.map(({ key, property, label }) => {
          const state = evaluation.fields[key]
          return <label className="scalar-control-field" key={key}>
            <span>{label.replace(' source', '')}</span>
            <input
              value={control[property]}
              aria-label={label}
              aria-invalid={state.status === 'invalid'}
              onChange={(event) => onChange({ ...control, [property]: event.target.value })}
            />
            {state.status === 'invalid' && <small role="alert">
              {state.diagnostic.message}
            </small>}
          </label>
        })}
        {evaluation.diagnostic && <p className="scalar-control-diagnostic" role="status">
          {evaluation.diagnostic}
        </p>}
      </section>
      <section className="scalar-control-section scalar-control-remove-section">
        <button type="button" className="remove-scalar-control" onClick={onRemove}>
          Remove control
        </button>
      </section>
    </div>,
    document.body,
  )
}
