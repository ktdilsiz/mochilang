/**
 * Google Identity Services bootstrap.
 *
 * GIS isn't bundled — we load it on demand from accounts.google.com so
 * users who never visit the LoginScreen don't pay the script cost. Once
 * loaded, `window.google.accounts.id` is the entry point for rendering
 * the Sign-in button and prompting One Tap.
 *
 * Types are declared locally (rather than installed via @types) so we
 * don't drag in the whole Google API surface. Only the methods we
 * actually call are typed.
 */

interface GoogleIdConfig {
  client_id: string
  callback: (response: { credential: string }) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
}

interface GoogleIdButtonOpts {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'small' | 'medium' | 'large'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  width?: number
  locale?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void
          renderButton: (el: HTMLElement, opts: GoogleIdButtonOpts) => void
          prompt: () => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<void> | null = null

/**
 * loadGSI returns a promise that resolves once `window.google.accounts.id`
 * is available. Idempotent — repeated calls share one network request.
 */
export function loadGSI(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const tag = document.createElement('script')
    tag.src = SCRIPT_URL
    tag.async = true
    tag.defer = true
    tag.onload = () => {
      if (window.google?.accounts?.id) resolve()
      else reject(new Error('GSI loaded but window.google.accounts.id missing'))
    }
    tag.onerror = () => reject(new Error('failed to load GSI script'))
    document.head.appendChild(tag)
  })
  return scriptPromise
}

export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
