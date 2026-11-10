/**
 * Community-authored lesson packs.
 *
 * A pack is a single Level (topics → lessons → exercises) submitted by a
 * signed-in user. Packs declare their own source/target language pair so
 * they live outside the canonical course catalog; the browse screen lists
 * them by language pair, recency, and rating.
 *
 * The full envelope is what authors paste into the submit form; the API
 * returns split metadata + level body so the mobile play screen can render
 * the level through the same code path as canonical content.
 */

import type { Level } from './types'

/**
 * Wire-format version. Bumped when the JSON shape gains backwards-
 * incompatible fields. The server rejects packs whose `schemaVersion`
 * doesn't match.
 */
export const COMMUNITY_PACK_SCHEMA_VERSION = 1

/** Author of a pack or comment, denormalized into responses. */
export interface CommunityAuthor {
  id: string
  /** Display name. Empty string if the user hasn't set one yet. */
  name: string
  /** Public kebab-case handle. Empty until the user picks one. */
  handle: string
}

export interface CommunityRating {
  /** 0.0–5.0; 0 means "no ratings yet". */
  average: number
  count: number
}

/** Reasons accepted by POST /api/community/packs/:id/report. */
export type CommunityReportReason =
  | 'spam'
  | 'offensive'
  | 'copied_content'
  | 'low_quality'
  | 'incorrect'
  | 'other'

/** Row shape returned by GET /api/community/packs (list endpoint). */
export interface CommunityPackSummary {
  id: string
  slug: string
  sourceLang: string
  targetLang: string
  title: string
  description: string
  author: CommunityAuthor
  rating: CommunityRating
  createdAt: number
}

/** Full pack response from GET /api/community/packs/:id. */
export interface CommunityPack {
  id: string
  slug: string
  sourceLang: string
  targetLang: string
  title: string
  description: string
  author: CommunityAuthor
  rating: CommunityRating
  /** Caller's own rating (0 when not signed in or unrated). */
  userRating: number
  commentCount: number
  /** True only when the viewer is the author and the pack has been hidden. */
  hidden?: boolean
  createdAt: number
  updatedAt: number
  /** Level shape, ready to feed HomeScreen/LessonScreen. */
  level: Level
}

export interface CommunityComment {
  id: number
  body: string
  author: CommunityAuthor
  createdAt: number
}

/**
 * Envelope shape authors submit. Identical to what the server stores
 * verbatim in `community_packs.body_json` and validates against on
 * insert. Keep in sync with `apps/api/internal/community/pack.go`.
 */
export interface CommunityPackEnvelope {
  schemaVersion: number
  slug: string
  sourceLang: string
  targetLang: string
  title: string
  description: string
  level: Level
}

/**
 * Namespace a community lesson id so it doesn't collide with canonical
 * lesson ids in `lesson_results`. Used when recording completion +
 * looking up best mistakes for community lessons.
 */
export function communityLessonId(packId: string, lessonId: string): string {
  return `c/${packId}/${lessonId}`
}

/** Reverse of `communityLessonId`. Returns null for non-community ids. */
export function parseCommunityLessonId(
  scoped: string,
): { packId: string; lessonId: string } | null {
  if (!scoped.startsWith('c/')) return null
  const rest = scoped.slice(2)
  const slash = rest.indexOf('/')
  if (slash === -1) return null
  return { packId: rest.slice(0, slash), lessonId: rest.slice(slash + 1) }
}
