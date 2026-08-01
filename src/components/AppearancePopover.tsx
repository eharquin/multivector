import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { RAMP_ORDER, STUDIO_COLORS } from './appearancePalette'
import { popoverPosition } from './popoverPosition'

const POPOVER_WIDTH = 272
const POPOVER_HEIGHT = 300

type AppearancePopoverProps = Readonly<{
  kind: string
  styleId: string
  visible: boolean
  labelVisible: boolean
  label: string
  colorOnly?: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  onStyleChange(style: string): void
  onVisibleChange(visible: boolean): void
  onLabelVisibleChange(visible: boolean): void
  onLabelChange(label: string): void
  onClose(): void
}>

export function AppearancePopover({
  kind,
  styleId,
  visible,
  labelVisible,
  label,
  colorOnly = false,
  anchorRef,
  onStyleChange,
  onVisibleChange,
  onLabelVisibleChange,
  onLabelChange,
  onClose,
}: AppearancePopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const visibilityRef = useRef<HTMLInputElement>(null)
  const placement = popoverPosition(
    anchorRef.current,
    POPOVER_WIDTH,
    POPOVER_HEIGHT,
  )

  useEffect(() => {
    const returnFocusTarget = anchorRef.current
    visibilityRef.current?.focus()
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
      aria-label={`Appearance — ${kind}`}
      style={{ top: placement.top, left: placement.left, width: POPOVER_WIDTH }}
    >
      <header className="appearance-header">
        <strong>Appearance — {kind}</strong>
        <button type="button" onClick={onClose} aria-label="Close appearance">×</button>
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
