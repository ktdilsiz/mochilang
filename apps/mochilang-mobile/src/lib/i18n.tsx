import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  EN_DICT,
  type I18nDict,
  type UiLocale,
  api,
  ApiError,
} from '@mochilang/shared'
import { useSettings } from '../state/useSettings'

/**
 * UI localization runtime.
 *
 * Boot sequence:
 *   1. Read cached dict for `settings.uiLocale` from AsyncStorage.
 *   2. Use that cached copy (or bundled English) for the first paint.
 *   3. Re-fetch from the API in the background and swap in the fresh
 *      dict + persist.
 *
 * Missing keys cascade: requested locale → bundled English → key name
 * itself, so a brand-new screen string always renders something even
 * if translators haven't caught up.
 */

interface I18nCtx {
  locale: UiLocale
  /** Lookup a string by key, with optional {placeholder} substitution. */
  t: (key: string, params?: Record<string, string | number>) => string
}

const STORAGE_PREFIX = 'mochilang:i18n:v1:'

const dictCache: Partial<Record<UiLocale, I18nDict>> = { en: EN_DICT }

function fillTemplate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s
  return s.replace(/\{(\w+)\}/g, (_, name) => {
    const v = params[name]
    return v === undefined ? `{${name}}` : String(v)
  })
}

const Ctx = createContext<I18nCtx>({
  locale: 'en',
  t: (key, params) => fillTemplate(EN_DICT[key] ?? key, params),
})

export function useT(): I18nCtx['t'] {
  return useContext(Ctx).t
}

export function useUiLocale(): UiLocale {
  return useContext(Ctx).locale
}

interface ProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: ProviderProps) {
  const { state: settings } = useSettings()
  const locale = settings.uiLocale
  const [dict, setDict] = useState<I18nDict>(dictCache[locale] ?? EN_DICT)

  useEffect(() => {
    let alive = true
    const cached = dictCache[locale]
    if (cached) {
      setDict(cached)
    } else {
      // Hydrate from AsyncStorage cache first so swapping languages
      // is instant on the second run.
      ;(async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_PREFIX + locale)
          if (!alive || !raw) return
          const parsed = JSON.parse(raw) as I18nDict
          dictCache[locale] = parsed
          setDict(parsed)
        } catch {
          /* ignore */
        }
      })()
    }

    // Always re-fetch from API to pick up updated strings.
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const fresh = await api.getLocale(locale, ctrl.signal)
        if (!alive) return
        dictCache[locale] = fresh
        setDict(fresh)
        await AsyncStorage.setItem(STORAGE_PREFIX + locale, JSON.stringify(fresh)).catch(
          () => {}
        )
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (err instanceof ApiError && err.status !== 0) return
        // Network or non-API error — fall back to whatever we have.
      }
    })()

    return () => {
      alive = false
      ctrl.abort()
    }
  }, [locale])

  const t = useCallback<I18nCtx['t']>(
    (key, params) => {
      const v = dict[key] ?? EN_DICT[key] ?? key
      return fillTemplate(v, params)
    },
    [dict]
  )

  const value = useMemo<I18nCtx>(() => ({ locale, t }), [locale, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
