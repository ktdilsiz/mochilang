import { useEffect, useMemo, useState } from 'react'
import {
  api,
  ApiError,
  buildCourseId,
  findLanguage,
  parseCourseId,
  type CourseSummary,
} from '@mochilang/shared'
import { coursesFallback } from '../data/generated'
import { APP_NAME, MASCOT_NAME } from '../data/languages'
import { mochiMain } from '../assets'
import './LanguageSelectScreen.css'

interface Props {
  /** Initial selection so the picker can re-open on the user's existing course. */
  initialCourseId?: string | null
  onSelect: (courseId: string) => void
}

/**
 * Two-column from/to picker. The set of choices is driven by what
 * /api/content/courses ships — anything offline mode can fall back to is
 * already in the bundled `coursesFallback`, so we union the two as the
 * source of truth. Each course id is `${target}-${source}` (the language
 * the user is learning, then the language they speak).
 */
export default function LanguageSelectScreen({ initialCourseId, onSelect }: Props) {
  const [courses, setCourses] = useState<CourseSummary[]>(() =>
    fallbackCourses()
  )

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await api.listCourses(ctrl.signal)
        if (r.courses.length > 0) setCourses(r.courses)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!(err instanceof ApiError)) {
          // Network/CORS failure — bundled list already loaded.
        }
      }
    })()
    return () => ctrl.abort()
  }, [])

  // Initial pair: try to honor the user's last selection, otherwise pick
  // the first available course so the Continue button is reachable.
  const initial = useMemo(() => {
    const parsed = initialCourseId ? parseCourseId(initialCourseId) : null
    if (parsed) return parsed
    const first = courses[0]
    return first
      ? parseCourseId(first.id) ?? { source: 'en', target: 'zh' }
      : { source: 'en', target: 'zh' }
  }, [initialCourseId, courses])

  const [source, setSource] = useState<string>(initial.source)
  const [target, setTarget] = useState<string>(initial.target)

  // Re-seed when courses arrive from the API and we still have the
  // bootstrap defaults (no user interaction yet).
  useEffect(() => {
    setSource(initial.source)
    setTarget(initial.target)
  }, [initial.source, initial.target])

  const sources = useMemo(
    () => unique(courses.map((c) => parseCourseId(c.id)?.source).filter(Boolean) as string[]),
    [courses]
  )
  const targetsForSource = useMemo(
    () =>
      unique(
        courses
          .map((c) => parseCourseId(c.id))
          .filter((p): p is { target: string; source: string } => p !== null)
          .filter((p) => p.source === source)
          .map((p) => p.target)
      ),
    [courses, source]
  )

  // If the user switches source and the current target isn't offered for
  // that source, snap to the first available target.
  useEffect(() => {
    if (targetsForSource.length === 0) return
    if (!targetsForSource.includes(target)) {
      setTarget(targetsForSource[0])
    }
  }, [source, targetsForSource, target])

  const canContinue = source && target && source !== target
  const courseId = canContinue ? buildCourseId(target, source) : null

  return (
    <div className="lang-shell">
      <div className="lang-hero">
        <img src={mochiMain} alt={MASCOT_NAME} className="lang-mochi" />
        <h1 className="lang-title">Welcome to {APP_NAME}</h1>
        <p className="lang-tagline">
          {MASCOT_NAME} the hedgehog will guide your journey.
        </p>
      </div>

      <div className="lang-pickerColumns">
        <LanguageColumn
          heading="I speak"
          codes={sources}
          selected={source}
          onSelect={setSource}
        />
        <LanguageColumn
          heading="I want to learn"
          codes={targetsForSource}
          selected={target}
          onSelect={setTarget}
          disabledHint={
            targetsForSource.length === 0 ? 'No courses for this source language yet' : undefined
          }
        />
      </div>

      <button
        type="button"
        className="ledge-button tone-primary size-lg lang-continue"
        disabled={!canContinue}
        onClick={() => courseId && onSelect(courseId)}
      >
        Start learning
      </button>
    </div>
  )
}

interface ColumnProps {
  heading: string
  codes: string[]
  selected: string
  onSelect: (code: string) => void
  disabledHint?: string
}

function LanguageColumn({ heading, codes, selected, onSelect, disabledHint }: ColumnProps) {
  return (
    <div className="lang-col">
      <h2 className="lang-colHeading">{heading}</h2>
      {disabledHint ? (
        <div className="lang-emptyHint">{disabledHint}</div>
      ) : (
        <div className="lang-colList">
          {codes.map((code) => {
            const info = findLanguage(code)
            const flag = info?.flag ?? '🏳️'
            const name = info?.name ?? code.toUpperCase()
            const native = info?.nativeName
            const active = code === selected
            return (
              <button
                key={code}
                type="button"
                className={'lang-row ' + (active ? 'lang-row-active' : '')}
                onClick={() => onSelect(code)}
              >
                <span className="lang-row-flag">{flag}</span>
                <span className="lang-row-text">
                  <span className="lang-row-name">{name}</span>
                  {native && native !== name && (
                    <span className="lang-row-native">{native}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs))
}

/**
 * Synthesize the same shape /api/content/courses returns from whatever
 * we shipped offline. Lets the picker render before (or instead of) the
 * network round-trip.
 */
function fallbackCourses(): CourseSummary[] {
  return Object.keys(coursesFallback).map((id) => ({
    id,
    levels: [],
    topicCount: 0,
  }))
}
