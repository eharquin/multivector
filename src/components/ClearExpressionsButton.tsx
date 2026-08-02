import { useEffect, useRef, useState, type CSSProperties } from 'react'

/** Hold duration that discards the document's expressions. */
export const CLEAR_HOLD_MS = 1_000

type ClearExpressionsButtonProps = Readonly<{
  count: number
  onClear: () => void
}>

/**
 * Clearing every expression is recoverable through document history. The
 * control retains a sustained hold to prevent accidental broad edits. The
 * hold is available to pointer and keyboard alike (A11Y-007); the sweeping ring
 * is progress feedback driven by `--hold-duration`, and reduced-motion users get
 * a static armed state instead.
 */
export function ClearExpressionsButton({
  count,
  onClear,
}: ClearExpressionsButtonProps) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelHold = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }

  useEffect(() => cancelHold, [])

  const beginHold = () => {
    if (count === 0 || timer.current !== null) return
    setHolding(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setHolding(false)
      onClear()
    }, CLEAR_HOLD_MS)
  }

  return (
    <button
      type="button"
      className={`clear-expressions${holding ? ' is-holding' : ''}`}
      style={{ '--hold-duration': `${CLEAR_HOLD_MS}ms` } as CSSProperties}
      disabled={count === 0}
      aria-label="Clear all expressions"
      aria-describedby="clear-expressions-hint"
      onPointerDown={beginHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onBlur={cancelHold}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        if (!event.repeat) beginHold()
      }}
      onKeyUp={cancelHold}
    >
      <span aria-hidden="true">✕</span>
      <span className="visually-hidden" id="clear-expressions-hint">
        Hold to clear all {count}{' '}
        {count === 1 ? 'expression' : 'expressions'}.
      </span>
    </button>
  )
}
