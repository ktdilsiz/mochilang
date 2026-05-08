import { useCallback, useEffect, useState } from 'react'
import {
  type AppSettings,
  SETTINGS_DEFAULT,
  SETTINGS_STORAGE_KEY,
  mergeSettings,
} from '@mochilang/shared'

/**
 * Hook + module-level cache for app settings.
 *
 * Settings live in localStorage (no API yet — they're device-scoped
 * preferences). The module-level `current` mirror lets non-React
 * consumers (the speech engine, sound-effect helpers) read settings
 * synchronously without threading a hook through every call site, while
 * `subscribers` keeps each useSettings caller in sync after a write.
 */

let current: AppSettings = load()
const subscribers = new Set<(s: AppSettings) => void>()

function load(): AppSettings {
  if (typeof window === 'undefined') return { ...SETTINGS_DEFAULT }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return raw ? mergeSettings(JSON.parse(raw)) : { ...SETTINGS_DEFAULT }
  } catch {
    return { ...SETTINGS_DEFAULT }
  }
}

function save(next: AppSettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** Synchronous read — used by audio/effects code outside React. */
export function getSettings(): AppSettings {
  return current
}

export function useSettings() {
  const [state, setState] = useState<AppSettings>(current)

  useEffect(() => {
    subscribers.add(setState)
    return () => {
      subscribers.delete(setState)
    }
  }, [])

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    current = { ...current, [key]: value }
    save(current)
    subscribers.forEach((fn) => fn(current))
  }, [])

  const reset = useCallback(() => {
    current = { ...SETTINGS_DEFAULT }
    save(current)
    subscribers.forEach((fn) => fn(current))
  }, [])

  return { state, update, reset }
}
