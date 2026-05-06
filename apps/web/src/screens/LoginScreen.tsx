import { useEffect, useRef, useState } from 'react'
import mochiHero from '../assets/hero.png'
import { api, ApiError } from '../lib/api'
import { loadGSI, GOOGLE_CLIENT_ID } from '../lib/google'
import './LoginScreen.css'

interface Props {
  onSignedIn: () => void
  onContinueOffline: () => void
}

export default function LoginScreen({ onSignedIn, onContinueOffline }: Props) {
  const buttonRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(() =>
    GOOGLE_CLIENT_ID
      ? null
      : 'Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in apps/web/.env.local.'
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    let cancelled = false
    void (async () => {
      try {
        await loadGSI()
        if (cancelled || !window.google || !buttonRef.current) return

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            setLoading(true)
            setError(null)
            try {
              await api.loginWithGoogle(credential)
              onSignedIn()
            } catch (err) {
              setLoading(false)
              if (err instanceof ApiError) {
                setError(`Sign-in failed: ${err.message}`)
              } else {
                setError('Network error — is the API running?')
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 280,
        })
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load Google Sign-In script'
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [onSignedIn])

  return (
    <div className="login-shell">
      <div className="login-card card">
        <img src={mochiHero} alt="" className="login-hero" />
        <h1 className="login-title">Welcome to Mochilang</h1>
        <p className="login-tagline">
          Bite-sized lessons, cute mascot, friendly competition.
        </p>

        <div className="login-button-row" ref={buttonRef} />

        {loading && <div className="login-status">Signing you in…</div>}
        {error && <div className="login-error">{error}</div>}

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="ledge-button tone-ghost login-skip"
          onClick={onContinueOffline}
        >
          Continue without an account
        </button>

        <p className="login-fineprint">
          Sign in to sync across devices and join the league. Or continue
          offline — your progress lives on this device only.
        </p>
      </div>
    </div>
  )
}
