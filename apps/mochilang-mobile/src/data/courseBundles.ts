import type { Level } from '@mochilang/shared'
import courseEnTr from '../../assets/course-en-tr.json'
import courseZhEn from '../../assets/course-zh-en.json'

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
  'en-tr': courseEnTr as unknown as CourseEnvelope,
  'zh-en': courseZhEn as unknown as CourseEnvelope,
}

/** Course ids the app can serve fully offline. */
export const BUNDLED_COURSE_IDS = Object.keys(COURSE_BUNDLES)
