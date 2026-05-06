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

/** Reorder a scrambled set of words (or characters) to form a sentence. */
export interface TapWordsInOrderExercise extends ExerciseBase {
  type: 'tap_words_in_order'
  prompt: string
  /** The full correct sentence; will be split by spaces in display. */
  answer: string
  /** The set of words to choose from, including distractors. */
  bank: string[]
}

export type Exercise =
  | MultipleChoiceExercise
  | FillBlankExercise
  | MatchPairsExercise
  | ListenAndChooseExercise
  | TapWordsInOrderExercise

export interface Lesson {
  id: string
  title: string
  description: string
  theme: LessonTheme
  /** Base XP awarded for completing the lesson; doubled on a no-mistake run. */
  xp: number
  exercises: Exercise[]
}

export interface Language {
  code: string
  name: string
  flag: string
  available: boolean
}

export interface Course {
  from: Language
  to: Language
}
