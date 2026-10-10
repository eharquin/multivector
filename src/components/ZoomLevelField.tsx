import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import {
  DEFAULT_PIXELS_PER_UNIT,
  formatZoomPercentage,
  parseZoomPercentage,
} from '../visualization/viewport'

type ZoomLevelFieldProps = Readonly<{
  pixelsPerUnit: number
  locked: boolean
  onZoom: (pixelsPerUnit: number) => void
}>

/**
 * The viewport's zoom read-out, editable as a percentage. Enter applies a
 * clamped scale, and text that is not a positive percentage returns to 100 %;
 * Escape or leaving the field restores the read-out. After Enter or Escape the read-out is selected again, so the next
 * typed value replaces it. The field is sized to its text through `--zoom-chars`, so the
 * read-out keeps overflowing leftwards from the toolbar column. A separate
 * live region announces every scale change, whatever caused it.
 */
export function ZoomLevelField({
  pixelsPerUnit,
  locked,
  onZoom,
}: ZoomLevelFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const reselect = useRef(false)
  const readout = formatZoomPercentage(pixelsPerUnit)
  const value = draft ?? readout

  useLayoutEffect(() => {
    if (!reselect.current) return
    reselect.current = false
    if (document.activeElement === input.current) input.current?.select()
  })

  const restore = () => setDraft(null)

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      reselect.current = true
      restore()
      return
    }
    if (event.key !== 'Enter' || draft === null) return
    event.preventDefault()
    reselect.current = true
    restore()
    onZoom(parseZoomPercentage(draft) ?? DEFAULT_PIXELS_PER_UNIT)
  }

  return (
    <span className="viewport-zoom">
      <input
        ref={input}
        className="viewport-zoom-input"
        type="text"
        inputMode="decimal"
        aria-label="Zoom level"
        readOnly={locked}
        spellCheck={false}
        autoComplete="off"
        value={value}
        style={{ '--zoom-chars': value.length } as CSSProperties}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={restore}
      />
      <output className="visually-hidden" aria-live="polite">
        {readout}
      </output>
    </span>
  )
}
