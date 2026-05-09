/**
 * Mochi Village — collection roster.
 *
 * The roster is a fixed-size set of 60 mochies, unlocked one-by-one
 * as the user accumulates total XP. Independent of course content:
 * studying zh-en or en-tr or whatever shares the same village
 * population, since XP is tracked per user, not per course.
 *
 * Each mochi has a placeholder "archetype" (role + emoji glyph +
 * flavor line) cycled through the LessonTheme set so the 60 feel
 * varied. Real PNG art will replace the glyph later; the data model
 * doesn't change.
 */

import type { LessonTheme } from './types'

export interface MochiArchetype {
  /** Title-cased role appended to "Mochi the …", e.g. "Chef". */
  role: string
  /** Emoji used as a placeholder until real PNG art replaces it. */
  glyph: string
  /** One-line flavor text shown on the mochi card / detail. */
  flavor: string
}

/**
 * Per-theme mochi archetype. Used to give 60 mochies varied identities
 * by cycling through these in MOCHI_ROSTER.
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
  /** Stable id like 'mochi-1', 'mochi-2', … 'mochi-60'. */
  id: string
  /** 0-indexed slot in the roster. */
  index: number
  archetype: MochiArchetype
  /** Total-XP threshold required to unlock this mochi. */
  unlockXp: number
}

export const MOCHI_ROSTER_SIZE = 120

/**
 * Order in which archetype themes get cycled through the roster.
 * Front-loaded with welcoming archetypes so the first mochies feel
 * varied + friendly; later positions repeat archetypes deeper into
 * the curve.
 */
const ARCHETYPE_CYCLE: LessonTheme[] = [
  'greetings',
  'basics',
  'numbers',
  'family',
  'food',
  'verbs',
  'colors',
  'weather',
  'time',
  'location',
  'directions',
  'questions',
  'review',
]

/**
 * XP threshold for the n-th mochi (0-indexed). Mild polynomial curve
 * stretched to span 120 mochies without making the late-roster grind
 * absurd:
 *   n=0:   ~10 XP   (immediate first reward)
 *   n=29:  ~455 XP  (first batch in a few sessions)
 *   n=59:  ~1,130 XP
 *   n=89:  ~1,960 XP
 *   n=119: ~2,900 XP (full roster — long-term aspiration)
 *
 * Reachable for dedicated learners; aspirational for casuals. We can
 * tune the exponent later without changing the data model.
 */
function unlockXpFor(n: number): number {
  // Round to friendly-looking numbers (multiples of 5) so the
  // milestones feel hand-picked rather than arbitrary.
  const raw = 10 * Math.pow(n / 2 + 1, 1.4)
  return Math.max(5, Math.round(raw / 5) * 5)
}

export const MOCHI_ROSTER: MochiSpec[] = Array.from(
  { length: MOCHI_ROSTER_SIZE },
  (_, i): MochiSpec => ({
    id: `mochi-${i + 1}`,
    index: i,
    archetype:
      MOCHI_ARCHETYPES[ARCHETYPE_CYCLE[i % ARCHETYPE_CYCLE.length]],
    unlockXp: unlockXpFor(i),
  })
)

/** True when the user's total XP meets the mochi's threshold. */
export function mochiUnlocked(mochi: MochiSpec, totalXp: number): boolean {
  return totalXp >= mochi.unlockXp
}

/**
 * How many mochies the user has unlocked. Roster is sorted by
 * unlockXp ascending, so the first miss terminates the count.
 */
export function countUnlockedMochis(totalXp: number): number {
  let n = 0
  for (const m of MOCHI_ROSTER) {
    if (mochiUnlocked(m, totalXp)) n++
    else break
  }
  return n
}

/**
 * The next mochi the user will unlock — useful for "next at X XP"
 * teasers. Returns null when the whole roster is unlocked.
 */
export function nextMochi(totalXp: number): MochiSpec | null {
  for (const m of MOCHI_ROSTER) {
    if (totalXp < m.unlockXp) return m
  }
  return null
}
