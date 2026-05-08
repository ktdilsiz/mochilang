/**
 * Mochi Village — Phase 1: collection roster.
 *
 * One mochi per topic. The mochi's "archetype" (role, glyph, flavor)
 * is keyed off the topic's LessonTheme so we don't have to hand-author
 * 60+ mochis — adding a new topic to a course content JSON automatically
 * creates a new collectible. Real artwork will replace the emoji
 * placeholders later; the data model stays the same.
 */

import type { LessonTheme, Level, Topic } from './types'

export interface MochiArchetype {
  /** Title-cased role appended to "Mochi the …", e.g. "Chef". */
  role: string
  /** Emoji used as a placeholder until real PNG art replaces it. */
  glyph: string
  /** One-line flavor text shown on the mochi card / detail. */
  flavor: string
}

/**
 * Per-theme mochi archetype. Keep additions in sync with LessonTheme so
 * `MOCHI_ARCHETYPES[topic.theme]` is always defined.
 */
export const MOCHI_ARCHETYPES: Record<LessonTheme, MochiArchetype> = {
  greetings: {
    role: 'Greeter',
    glyph: '👋',
    flavor: 'Says hi to every leaf in the garden.',
  },
  numbers: {
    role: 'Counter',
    glyph: '🔢',
    flavor: 'Counts everything twice, just to be sure.',
  },
  basics: {
    role: 'Beginner',
    glyph: '🌱',
    flavor: 'Just sprouted. Eager to learn.',
  },
  family: {
    role: 'Sibling',
    glyph: '👪',
    flavor: 'Has a photo of the whole family in their pocket.',
  },
  verbs: {
    role: 'Doer',
    glyph: '⚙️',
    flavor: 'Is always in the middle of doing something.',
  },
  food: {
    role: 'Chef',
    glyph: '🍜',
    flavor: 'Lives in the kitchen. Smells like ginger.',
  },
  location: {
    role: 'Wanderer',
    glyph: '📍',
    flavor: 'Knows every corner of every street.',
  },
  directions: {
    role: 'Navigator',
    glyph: '🧭',
    flavor: 'Never gets lost — even when blindfolded.',
  },
  time: {
    role: 'Timekeeper',
    glyph: '⏰',
    flavor: 'Wakes up before the alarm out of pride.',
  },
  questions: {
    role: 'Asker',
    glyph: '❓',
    flavor: 'Has so many questions. So, so many.',
  },
  colors: {
    role: 'Painter',
    glyph: '🎨',
    flavor: 'Sees the world in technicolor.',
  },
  weather: {
    role: 'Weatherwatcher',
    glyph: '☁️',
    flavor: 'Reads the clouds like a book.',
  },
  review: {
    role: 'Reviewer',
    glyph: '🔄',
    flavor: 'Loves a good "let\'s do it again."',
  },
}

export interface MochiSpec {
  /** Stable id — currently equal to the topic id. */
  id: string
  topicId: string
  topicTitle: string
  /** Topic's level id (a1, a2, …) — drives which region the mochi lives in. */
  levelId: string
  theme: LessonTheme
  archetype: MochiArchetype
}

/**
 * Build the mochi spec for a single topic. Falls back to the `basics`
 * archetype if the theme is somehow unknown — defensive against future
 * content shapes.
 */
export function mochiForTopic(topic: Topic, levelId: string): MochiSpec {
  return {
    id: topic.id,
    topicId: topic.id,
    topicTitle: topic.title,
    levelId,
    theme: topic.theme,
    archetype: MOCHI_ARCHETYPES[topic.theme] ?? MOCHI_ARCHETYPES.basics,
  }
}

export interface VillageRegion {
  levelId: string
  levelName: string
  mochis: MochiSpec[]
}

/** Group mochis by their level so the village UI can render per-region. */
export function buildVillageRoster(levels: Level[]): VillageRegion[] {
  return levels.map((level) => ({
    levelId: level.id,
    levelName: level.name,
    mochis: level.topics.map((t) => mochiForTopic(t, level.id)),
  }))
}

/** Total mochis across the whole course. Useful for the header stat. */
export function rosterSize(levels: Level[]): number {
  let n = 0
  for (const level of levels) n += level.topics.length
  return n
}
