import { useEffect, useRef, useState, type RefObject } from 'react'

export type AlgebraChoice = Readonly<{ algebraId: string; badge: string; name: string }>

type AlgebraMenuProps = Readonly<{
  badge: string
  choices: readonly AlgebraChoice[]
  selectedAlgebraId: string
  onSelect: (algebraId: string) => void
  onInfo: () => void
  infoButtonRef: RefObject<HTMLButtonElement | null>
}>

/**
 * The header capsule: the badge opens a menu of registered algebras, the
 * `i` segment opens the algebra information dialog. Selection is delegated
 * to the shell, which confirms clearing a document with content.
 */
export function AlgebraMenu({
  badge, choices, selectedAlgebraId, onSelect, onInfo, infoButtonRef,
}: AlgebraMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef(new Map<string, HTMLButtonElement>())
  const restoreFocusOnClose = useRef(false)

  useEffect(() => {
    if (!open) return
    const returnFocusTarget = triggerRef.current
    itemRefs.current.get(selectedAlgebraId)?.focus()
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
  }, [open, selectedAlgebraId])

  const choose = (algebraId: string) => {
    restoreFocusOnClose.current = true
    setOpen(false)
    if (algebraId !== selectedAlgebraId) onSelect(algebraId)
  }

  const moveFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const ids = choices.map((choice) => choice.algebraId)
    const current = ids.findIndex((id) => itemRefs.current.get(id) === document.activeElement)
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? ids.length - 1
        : event.key === 'ArrowDown' ? (current + 1) % ids.length
          : (current - 1 + ids.length) % ids.length
    itemRefs.current.get(ids[next])?.focus()
  }

  return (
    <div className="algebra-capsule" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`algebra-badge algebra-badge-select${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${badge}. Change algebra`}
        onClick={() => setOpen((current) => {
          restoreFocusOnClose.current = current
          return !current
        })}
      >
        <span aria-hidden="true">{badge}</span>
        <svg className="algebra-badge-chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        ref={infoButtonRef}
        type="button"
        className="algebra-badge algebra-badge-info"
        aria-haspopup="dialog"
        aria-label="Algebra information"
        onClick={onInfo}
      >
        <span aria-hidden="true">i</span>
      </button>
      {open && (
        <div
          className="algebra-menu"
          role="menu"
          aria-label="Document algebra"
          onKeyDown={moveFocus}
        >
          {choices.map((choice) => (
            <button
              key={choice.algebraId}
              ref={(element) => {
                if (element) itemRefs.current.set(choice.algebraId, element)
                else itemRefs.current.delete(choice.algebraId)
              }}
              type="button"
              className="algebra-menu-item"
              role="menuitemradio"
              aria-checked={choice.algebraId === selectedAlgebraId}
              onClick={() => choose(choice.algebraId)}
            >
              <span className="algebra-menu-badge">{choice.badge}</span>
              <span className="algebra-menu-name">{choice.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
