import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { RAMP_ORDER, STUDIO_COLORS } from './appearancePalette'
import { popoverPosition } from './popoverPosition'
import type { ExpressionControl } from '../document/expressionDocument'

const POPOVER_WIDTH = 272
const POPOVER_HEIGHT = 300

type AppearancePopoverProps = Readonly<{
  kind: string
  styleId: string
  visible: boolean
  labelVisible: boolean
  label: string
  colorOnly?: boolean
  control?: ExpressionControl
  reducedMotion?: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  onStyleChange(style: string): void
  onVisibleChange(visible: boolean): void
  onLabelVisibleChange(visible: boolean): void
  onLabelChange(label: string): void
  onControlChange?(control: ExpressionControl): void
  onClose(): void
}>

export function AppearancePopover({
  kind,
  styleId,
  visible,
  labelVisible,
  label,
  colorOnly = false,
  control,
  reducedMotion = false,
  anchorRef,
  onStyleChange,
  onVisibleChange,
  onLabelVisibleChange,
  onLabelChange,
  onControlChange,
  onClose,
}: AppearancePopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const visibilityRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const placement = popoverPosition(
    anchorRef.current,
    POPOVER_WIDTH,
    POPOVER_HEIGHT,
  )

  useEffect(() => {
    const returnFocusTarget = anchorRef.current
    ;(visibilityRef.current ?? closeRef.current)?.focus()
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) return
      if (returnFocusTarget?.contains(event.target as Node)) return
      onClose()
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      returnFocusTarget?.focus()
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={ref}
      className="appearance-popover"
      role="dialog"
      aria-label={kind}
      style={{ top: placement.top, left: placement.left, width: POPOVER_WIDTH }}
    >
      <header className="appearance-header">
        <strong>{kind}</strong>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={`Close ${kind} menu`}>×</button>
      </header>
      {!colorOnly && (
        <section className="appearance-section">
          <h3>Visibility</h3>
          <label className="appearance-toggle-row">
            <span>{visible ? 'Visible' : 'Hidden'}</span>
            <input
              ref={visibilityRef}
              type="checkbox"
              role="switch"
              checked={visible}
              onChange={(event) => onVisibleChange(event.target.checked)}
            />
          </label>
        </section>
      )}
      <section className="appearance-section">
        <h3>Color</h3>
        <div className="appearance-colors">
          {RAMP_ORDER.map((ramp) => (
            <div className="appearance-ramp" key={ramp}>
              {STUDIO_COLORS.filter((candidate) => candidate.ramp === ramp).map(
                (candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    className={candidate.id === styleId ? 'selected' : ''}
                    style={{ backgroundColor: candidate.hex }}
                    title={candidate.hex}
                    aria-label={`Use color ${candidate.name}`}
                    aria-pressed={candidate.id === styleId}
                    onClick={() => onStyleChange(candidate.id)}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </section>
      {control && onControlChange && (
        <>
          <section className="appearance-section">
            <h3>Trigger</h3>
            <div className="scalar-control-mode-grid">
              {(['number', 'slider'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={control.mode === mode ? 'active' : ''}
                  aria-pressed={control.mode === mode}
                  onClick={() => onControlChange({ ...control, mode })}
                >{mode === 'number' ? 'Number' : 'Slider'}</button>
              ))}
            </div>
          </section>
          {control.mode === 'slider' && (
            <section className="appearance-section">
              <h3>Animation mode</h3>
              {reducedMotion && <p className="scalar-reduced-motion-note">
                Motion starts only with Play.
              </p>}
              <div className="scalar-animation-mode-grid">
                {([
                  ['once', '⇥', 'Once'],
                  ['loop', '↻', 'Loop'],
                  ['ping-pong', '⇄', 'Ping-pong'],
                ] as const).map(([mode, icon, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={(control.animation?.mode ?? 'ping-pong') === mode ? 'active' : ''}
                    aria-label={label}
                    aria-pressed={(control.animation?.mode ?? 'ping-pong') === mode}
                    onClick={() => onControlChange({
                      ...control,
                      animation: {
                        mode,
                        direction: control.animation?.direction ?? 'forward',
                        durationSeconds: control.animation?.durationSeconds ?? 2,
                      },
                    })}
                  ><span aria-hidden="true">{icon}</span></button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {!colorOnly && (
        <section className="appearance-section">
          <h3>Label</h3>
          <label className="appearance-toggle-row">
            <span>Show label</span>
            <input
              type="checkbox"
              role="switch"
              checked={labelVisible}
              onChange={(event) => onLabelVisibleChange(event.target.checked)}
            />
          </label>
          <label className="appearance-label-row">
            <span>Text</span>
            <input
              value={label}
              disabled={!labelVisible}
              onChange={(event) => onLabelChange(event.target.value)}
            />
          </label>
        </section>
      )}
    </div>,
    document.body,
  )
}
