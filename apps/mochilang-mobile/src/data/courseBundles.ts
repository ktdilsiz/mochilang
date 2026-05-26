import type { Level } from '@mochilang/shared'
import courseEnEs from '../../assets/course-en-es.json'
import courseEnTr from '../../assets/course-en-tr.json'
import courseEnZh from '../../assets/course-en-zh.json'
import courseEsEn from '../../assets/course-es-en.json'
import courseZhEn from '../../assets/course-zh-en.json'
import courseZhTwEn from '../../assets/course-zh-tw-en.json'

/**
 * Bundled course payloads inlined by Metro at build time.
 *
 * Each entry mirrors the wire shape `/api/content/courses/:id` returns,
 * so useCourse can swap between API and bundle without translation. To
 * ship a new course offline, run `cmd/genfallbacks` and add a row here.
 */
export interface CourseEnvelope {
  id: string
  levels: Level[]
}

export const COURSE_BUNDLES: Record<string, CourseEnvelope> = {
  'en-es': courseEnEs as unknown as CourseEnvelope,
  'en-tr': courseEnTr as unknown as CourseEnvelope,
  'en-zh': courseEnZh as unknown as CourseEnvelope,
  'es-en': courseEsEn as unknown as CourseEnvelope,
  'zh-en': courseZhEn as unknown as CourseEnvelope,
  'zh-tw-en': courseZhTwEn as unknown as CourseEnvelope,
}

/** Course ids the app can serve fully offline. */
export const BUNDLED_COURSE_IDS = Object.keys(COURSE_BUNDLES)
