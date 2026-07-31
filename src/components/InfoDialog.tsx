import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

type InfoDialogProps = Readonly<{
  title: string
  labelledBy: string
  returnFocusRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  children: ReactNode
}>

export function InfoDialog({
  title,
  labelledBy,
  returnFocusRef,
  onClose,
  children,
}: InfoDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const returnFocusTarget = returnFocusRef.current
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      returnFocusTarget?.focus()
    }
  }, [onClose, returnFocusRef])

  return (
    <div className="info-overlay" onMouseDown={onClose}>
      <section
        className="info-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="info-dialog-header">
          <h2 id={labelledBy}>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="info-dialog-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="info-dialog-body">{children}</div>
      </section>
    </div>
  )
}
