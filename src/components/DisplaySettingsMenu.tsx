import { useEffect, useRef, useState } from 'react'
import { type ThemeMode } from '../document/canonicalDocument'
import {
  MAX_DECIMAL_PLACES,
  MIN_DECIMAL_PLACES,
} from '../presentation/formatNumber'

export type DisplaySettings = Readonly<{
  decimalPlaces: number
  gridVisible: boolean
  axisLabelsVisible: boolean
  graduationsVisible: boolean
  objectScale: number
}>

export const MIN_OBJECT_SCALE = 0.25
export const MAX_OBJECT_SCALE = 4

type DisplaySettingsMenuProps = Readonly<{
  display: DisplaySettings
  theme: ThemeMode
  onDisplayChange(change: Partial<DisplaySettings>): void
  onThemeChange(theme: ThemeMode): void
}>

type SwitchRowProps = Readonly<{
  label: string
  checked: boolean
  inputRef?: React.Ref<HTMLInputElement>
  onChange(checked: boolean): void
}>

function SwitchRow({ label, checked, inputRef, onChange }: SwitchRowProps) {
  return (
    <label className="settings-row">
      <span className="settings-row-label">{label}</span>
      <span className="settings-switch">
        <input
          ref={inputRef}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="settings-switch-track" aria-hidden="true">
          <span className="settings-switch-thumb" />
        </span>
      </span>
    </label>
  )
}

/**
 * Presentation-only display settings (APP-006) gathered behind one header
 * control. Every change is reported to the caller, which owns the view command;
 * this component never mutates a document.
 */
export function DisplaySettingsMenu({
  display,
  theme,
  onDisplayChange,
  onThemeChange,
}: DisplaySettingsMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstControlRef = useRef<HTMLInputElement>(null)
  const restoreFocusOnClose = useRef(false)

  useEffect(() => {
    if (!open) return
    const returnFocusTarget = triggerRef.current
    firstControlRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return
      restoreFocusOnClose.current = false
      setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        restoreFocusOnClose.current = true
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      if (restoreFocusOnClose.current) returnFocusTarget?.focus()
    }
  }, [open])

  return (
    <div className="display-settings" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`display-settings-button${open ? ' is-open' : ''}`}
        aria-label="Display settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => {
          restoreFocusOnClose.current = current
          return !current
        })}
      >
        <span aria-hidden="true">⚙</span>
      </button>
      {open && (
        <div
          className="display-settings-popover"
          role="dialog"
          aria-label="Display settings"
        >
          <section className="settings-section">
            <h3>Display</h3>
            <SwitchRow
              label="Grid"
              checked={display.gridVisible}
              inputRef={firstControlRef}
              onChange={(gridVisible) => onDisplayChange({ gridVisible })}
            />
            <SwitchRow
              label="Axes and labels"
              checked={display.axisLabelsVisible}
              onChange={(axisLabelsVisible) =>
                onDisplayChange({ axisLabelsVisible })
              }
            />
            <SwitchRow
              label="Graduations"
              checked={display.graduationsVisible}
              onChange={(graduationsVisible) =>
                onDisplayChange({ graduationsVisible })
              }
            />
            <label className="settings-row">
              <span className="settings-row-label">Decimal places</span>
              <input
                className="settings-number"
                type="number"
                aria-label="Decimal places"
                min={MIN_DECIMAL_PLACES}
                max={MAX_DECIMAL_PLACES}
                step="1"
                value={display.decimalPlaces}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (!Number.isInteger(value)) return
                  onDisplayChange({
                    decimalPlaces: Math.max(
                      MIN_DECIMAL_PLACES,
                      Math.min(MAX_DECIMAL_PLACES, value),
                    ),
                  })
                }}
              />
            </label>
            <label className="settings-row settings-row-slider">
              <span className="settings-row-label">Object size</span>
              <input
                type="range"
                aria-label="Object scale"
                min={MIN_OBJECT_SCALE}
                max={MAX_OBJECT_SCALE}
                step="0.25"
                value={display.objectScale}
                onChange={(event) =>
                  onDisplayChange({
                    objectScale: Math.max(
                      MIN_OBJECT_SCALE,
                      Math.min(
                        MAX_OBJECT_SCALE,
                        Number(event.target.value) || 1,
                      ),
                    ),
                  })
                }
              />
              <output className="settings-slider-value">
                {display.objectScale.toFixed(2)}×
              </output>
            </label>
          </section>
          <section className="settings-section">
            <h3>Theme</h3>
            <label className="settings-row">
              <span className="settings-row-label">Theme</span>
              <select
                className="settings-select"
                value={theme}
                onChange={(event) =>
                  onThemeChange(event.target.value as ThemeMode)
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </section>
        </div>
      )}
    </div>
  )
}
