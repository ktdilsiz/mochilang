/**
 * Mochilang content shape.
 *
 * Each Lesson is a sequence of Exercises. An Exercise is a discriminated union
 * over its `type`: each type has its own data shape that the corresponding
 * exercise component understands.
 */

export type ExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'match_pairs'
  | 'listen_and_choose'
  | 'tap_words_in_order'
  | 'translate'
  | 'dialogue'

export type LessonTheme =
  | 'greetings'
  | 'numbers'
  | 'basics'
  | 'family'
  | 'verbs'
  | 'food'
  | 'location'
  | 'time'
  | 'questions'
  | 'directions'
  | 'colors'
  | 'weather'
  | 'review'

interface ExerciseBase {
  id: string
  /** Optional explanation surfaced after the user answers. */
  explanation?: string
}

/** "What does X mean?" — pick one of N options. */
export interface MultipleChoiceExercise extends ExerciseBase {
  type: 'multiple_choice'
  prompt: string
  options: string[]
  answer: string
}

/** Fill-in-the-blank — typed answer matched against `answer`. */
export interface FillBlankExercise extends ExerciseBase {
  type: 'fill_blank'
  prompt: string
  answer: string
  /** Optional alternate accepted answers (case-insensitive). */
  acceptableAnswers?: string[]
}

/** Match a list of left items to a list of right items; tap pairs. */
export interface MatchPairsExercise extends ExerciseBase {
  type: 'match_pairs'
  prompt: string
  /** Pairs the user must connect. Order is shuffled in the UI. */
  pairs: { left: string; right: string }[]
}

/** Hear an audio clip (TTS), then pick the correct character/word from N options. */
export interface ListenAndChooseExercise extends ExerciseBase {
  type: 'listen_and_choose'
  prompt: string
  /** Text the TTS engine speaks aloud (Chinese). */
  spokenText: string
  options: string[]
  answer: string
}

/**
 * "Translate this word/phrase." The user reads `source` and types its
 * translation. Direction tells the UI which way to label the prompt
 * ("Translate to English" vs "Translate to Turkish") and lets the TTS
 * speak each side in the correct language.
 *
 * Replaces the old fill_blank pattern "'Fena değil' İngilizcede ___"
 * where the prompt mixed Turkish instructions with an English answer
 * blank. With `translate`, the source word stands alone and the
 * instruction comes from the type-derived header.
 */
export interface TranslateExercise extends ExerciseBase {
  type: 'translate'
  /** The word/phrase shown to the learner. */
  source: string
  /** Expected translation. Case-insensitive match against learner input. */
  answer: string
  /** Optional alternates accepted (case-insensitive). */
  acceptableAnswers?: string[]
  /**
   * Which way the translation runs.
   * - `to_target`: `source` is in the course's source language,
   *   `answer` is in the target language. Header: "Translate to {target}".
   * - `to_source`: `source` is in the target language, `answer` is in
   *   the source language. Header: "Translate to {source}".
   */
  direction: 'to_target' | 'to_source'
  /** Optional context shown below the source (e.g. a usage hint). */
  context?: string
}

/** Reorder a scrambled set of words (or characters) to form a sentence. */
export interface TapWordsInOrderExercise extends ExerciseBase {
  type: 'tap_words_in_order'
  prompt: string
  /** The full correct sentence; will be split by spaces in display. */
  answer: string
  /** The set of words to choose from, including distractors. */
  bank: string[]
}

/**
 * A back-and-forth dialogue between two or more speakers, with
 * occasional interactive turns where the user picks or fills in the
 * speaker's next line. Renders as a chat-screen — speech bubbles
 * colored per speaker — with interactive turns gated until correct.
 *
 * Mistake counting: one per failed turn (regardless of how many wrong
 * attempts on that turn). Lines that are not interactive don't count.
 */
export interface DialogueExercise extends ExerciseBase {
  type: 'dialogue'
  /** Scene title shown above the chat (e.g. "At the café"). */
  prompt: string
  /**
   * Cast list. Two or more entries; the order here also sets bubble
   * color assignment, so put the user-facing speaker first if you want
   * predictable color across lessons.
   */
  speakers: DialogueSpeaker[]
  /** The script — lines and interactive prompts in order. */
  turns: DialogueTurn[]
}

export interface DialogueSpeaker {
  /** Stable id referenced by each turn's `speaker` field. */
  id: string
  /** Display name shown above the speaker's first bubble. */
  name: string
}

export type DialogueTurn = DialogueLineTurn | DialogueChoiceTurn | DialogueFillTurn

interface DialogueTurnBase {
  /** Id of the speaker (must exist in the parent's `speakers`). */
  speaker: string
}

/** Narrative line — the speaker says `text`. No user input required. */
export interface DialogueLineTurn extends DialogueTurnBase {
  kind: 'line'
  text: string
  /** Optional override of the TTS text (e.g. when `text` carries pinyin annotations the engine should skip). */
  spokenText?: string
}

/** Speaker has options; user picks the correct one. Same shape as MultipleChoiceExercise's choice. */
export interface DialogueChoiceTurn extends DialogueTurnBase {
  kind: 'choice'
  /** Optional setup text shown above the options ("How do you order?"). */
  prompt?: string
  options: string[]
  answer: string
}

/**
 * Fill-in-the-blank inside a sentence. The full line is
 * `${before}${blank}${after}`. User types into the blank.
 */
export interface DialogueFillTurn extends DialogueTurnBase {
  kind: 'fill'
  prompt?: string
  /** Text shown before the blank. */
  before: string
  /** Text shown after the blank. */
  after: string
  answer: string
  /** Optional alternates accepted (case-insensitive). */
  acceptableAnswers?: string[]
}

export type Exercise =
  | MultipleChoiceExercise
  | FillBlankExercise
  | MatchPairsExercise
  | ListenAndChooseExercise
  | TapWordsInOrderExercise
  | TranslateExercise
  | DialogueExercise

export interface Lesson {
  id: string
  title: string
  description: string
  theme: LessonTheme
  /** Base XP awarded for completing the lesson; doubled on a no-mistake run. */
  xp: number
  exercises: Exercise[]
  /**
   * Optional pre-baked word translations. Keyed by the exact token
   * the learner sees in the lesson; value is the translation in the
   * learner's source language. When present, tapping a word in the
   * lesson UI shows the translation instantly (offline). When absent
   * for a given word, the UI falls back to Lingva (network).
   *
   * Authoring is optional — leave it off for cheap content, fill it
   * in later via the genfallbacks build step for first-class lessons.
   */
  wordTranslations?: Record<string, string>
  /**
   * Optional glyph (emoji or single char) the lesson node renders on the
   * home path. Overrides the theme-derived glyph pool, so authors can
   * pick a specific symbol when none of the theme's defaults fit.
   */
  glyph?: string
}

/**
 * Topic — a curated cluster of 3–5 lessons that share a teaching focus
 * (e.g., "Greetings", "Numbers"). Topics are the visible sections on the
 * home screen; lessons inside a topic share `theme` for color/icon tinting.
 *
 * `guide` is optional grammar/explainer content that opens as its own
 * reading page from the topic header — for teaching things like word order,
 * particles, and tones that don't fit a multiple-choice exercise.
 */
export interface Topic {
  id: string
  title: string
  /** Short tagline shown under the topic title. */
  description: string
  /** Drives the section banner color + lesson-node icons. */
  theme: LessonTheme
  lessons: Lesson[]
  guide?: TopicGuide
  /**
   * Optional list of topic ids the learner should finish before this one
   * unlocks. Soft lock — the topic still renders but with a muted "review
   * these first" affordance. Empty/missing means no prerequisites.
   */
  prerequisites?: string[]
}

/**
 * Level — a CEFR-style fluency tier (A1, A2, B1, …) that groups topics.
 * The backend serves them in pedagogical order; the home screen renders
 * a divider above each level so the user sees their progression.
 */
export interface Level {
  /** Stable id like "a1", "a2". Lowercase, no spaces. */
  id: string
  /** Human label like "A1 — Beginner". */
  name: string
  /** One-line description for the level header. */
  description: string
  topics: Topic[]
}

/** A whole course payload as served by /api/content/courses/:id. */
export interface Course {
  id: string
  levels: Level[]
}

/**
 * Long-form grammar/explainer content for a topic. Rendered by
 * `TopicGuideScreen` from a small set of structured section primitives so
 * we get consistent typography without a markdown parser.
 */
export interface TopicGuide {
  /** Optional short summary shown under the topic title at the top. */
  intro?: string
  sections: GuideSection[]
}

export type GuideSection =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'examples'; rows: GuideExample[] }
  | { kind: 'callout'; tone?: 'tip' | 'warn' | 'note' | 'common_mistake'; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }

/**
 * A single bilingual example row. `pinyin` is optional for pre-pinyin
 * languages and for English-only callouts.
 */
export interface GuideExample {
  source: string
  pinyin?: string
  translation: string
}

export interface Language {
  code: string
  name: string
  flag: string
  available: boolean
}

