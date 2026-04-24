import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  title?: string
  children: React.ReactNode
  onClose: () => void
  initialFocusSelector?: string
}

export default function Modal({ open, title, children, onClose, initialFocusSelector }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    if (!panel) return

    const focusTarget = initialFocusSelector
      ? (panel.querySelector(initialFocusSelector) as HTMLElement | null)
      : null

    ;(focusTarget ?? panel).focus()
  }, [open, initialFocusSelector])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modalOverlay" onMouseDown={onClose} role="presentation">
      <div
        className="modalPanel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title ? <div className="modalTitle">{title}</div> : null}
        <div className="modalBody">{children}</div>
      </div>
    </div>
  )
}

