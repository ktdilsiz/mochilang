/**
 * Tappable-word translation infrastructure used by LessonScreen.
 *
 * A Context provides four pieces of state that the TappableText
 * component reads:
 *
 *   - enabled: whether taps fire at all (lessons → true, exams → false)
 *   - fromLang / toLang: the course's target → source pair, used as
 *     Lingva's `from`/`to` when we need to fall back to the network
 *   - wordTranslations: optional pre-baked dictionary from the lesson
 *     content, looked up first so translations are instant when an
 *     author already captured them
 *
 * Default value is `enabled: false`, so any exercise component that
 * uses TappableText automatically becomes inert outside a lesson —
 * exams need no extra wiring to opt out.
 */

import { createContext, useContext } from 'react'

export interface WordTranslationCtx {
  enabled: boolean
  /** The language being learned (course target — e.g. 'en' for en-tr). */
  targetLang: string
  /** The user's native language (course source — e.g. 'tr' for en-tr). */
  sourceLang: string
  wordTranslations?: Record<string, string>
}

const DEFAULT: WordTranslationCtx = {
  enabled: false,
  targetLang: 'en',
  sourceLang: 'en',
}

const Ctx = createContext<WordTranslationCtx>(DEFAULT)

export const WordTranslationProvider = Ctx.Provider

export function useWordTranslation(): WordTranslationCtx {
  return useContext(Ctx)
}
