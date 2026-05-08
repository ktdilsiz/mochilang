import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  type AppSettings,
  SETTINGS_DEFAULT,
  SETTINGS_STORAGE_KEY,
  mergeSettings,
} from '@mochilang/shared'

/**
 * Mobile useSettings — mirrors the web hook so the same SettingsScreen
 * UI can ride on both. The module-level `current` mirror lets non-React
 * consumers (the speak() helper, haptics calls) read settings
 * synchronously without prop-drilling through every component.
 *
 * AsyncStorage is async so `current` is initialized from defaults and
 * hydrated after the first read; the spelling cache miss is fine since
 * the only synchronous reader is TTS, which fires later than the first
 * render anyway.
 */

let current: AppSettings = { ...SETTINGS_DEFAULT }
let hydrated = false
const subscribers = new Set<(s: AppSettings) => void>()

async function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      current = mergeSettings(JSON.parse(raw))
      subscribers.forEach((fn) => fn(current))
    }
  } catch {
    /* ignore */
  }
}

void hydrate()

async function save(next: AppSettings) {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/** Synchronous read for non-React consumers (TTS, haptics). */
export function getSettings(): AppSettings {
  return current
}

export function useSettings() {
  const [state, setState] = useState<AppSettings>(current)

  useEffect(() => {
    subscribers.add(setState)
    // If hydration finished before this hook mounted, sync immediately.
    if (state !== current) setState(current)
    return () => {
      subscribers.delete(setState)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    current = { ...current, [key]: value }
    void save(current)
    subscribers.forEach((fn) => fn(current))
  }, [])

  const reset = useCallback(() => {
    current = { ...SETTINGS_DEFAULT }
    void save(current)
    subscribers.forEach((fn) => fn(current))
  }, [])

  return { state, update, reset }
}
