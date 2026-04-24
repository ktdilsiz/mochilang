import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Tone = 'default' | 'success' | 'locked'

interface Props {
  ariaLabel: string
  icon?: ReactNode
  tone?: Tone
  disabled?: boolean
  onClick?: () => void
}

export default function SquareButton({
  icon,
  ariaLabel,
  tone = 'default',
  disabled,
  onClick,
}: Props) {
  const [pressed, setPressed] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const ignoreClickUntilRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  function triggerPress() {
    if (disabled) return
    setPressed(true)
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setPressed(false), 100)
    onClick?.()
  }

  return (
    <div className={`sqbtnWrap sqbtnWrap--${tone}`}>
      <div className="sqbtnShadow" aria-hidden="true" />
      <button
        type="button"
        className={`sqbtn ${pressed ? 'sqbtn--pressed' : ''}`}
        aria-label={ariaLabel}
        disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return
          // Prevent a follow-up synthetic click (common on touch) from double-triggering.
          ignoreClickUntilRef.current = Date.now() + 700
          ;(e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId)
          triggerPress()
        }}
        onClick={() => {
          if (disabled) return
          if (Date.now() < ignoreClickUntilRef.current) return
          triggerPress()
        }}
        onKeyDown={(e) => {
          if (disabled) return
          // Support keyboard activation (Space / Enter).
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            triggerPress()
          }
        }}
      >
        <div className="sqbtnFace">
          {icon ? <div className="sqbtnIcon">{icon}</div> : null}
        </div>
      </button>
    </div>
  )
}

