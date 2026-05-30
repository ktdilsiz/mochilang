import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Exercise, Lesson } from '@mochilang/shared'
import { matchesSequenceAnswer, parseCourseId } from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import FillBlank, {
  checkAnswer as checkFillBlank,
} from '../components/exercises/FillBlank'
import MatchPairs from '../components/exercises/MatchPairs'
import ListenAndChoose from '../components/exercises/ListenAndChoose'
import TapWordsInOrder from '../components/exercises/TapWordsInOrder'
import Translate, {
  checkTranslateAnswer as checkTranslate,
} from '../components/exercises/Translate'
import Dialogue from '../components/exercises/Dialogue'
import TappableText from '../components/TappableText'
import { WordTranslationProvider } from '../lib/wordTranslation'
import { localeForOption, speak, targetLocaleForCourse } from '../lib/tts'
import { sfx } from '../lib/sfx'
import { useT } from '../lib/i18n'
import { findLanguage } from '@mochilang/shared'
import { colors, fontSizes, radius, space } from '../lib/theme'

/**
 * Try to pull the target-language sentence out of a fill-blank prompt.
 *
 * Convention: target-language fragments in en-tr/en-zh/en-es etc.
 * lessons are wrapped in quotes inside source-language instructions.
 * Example: "Birine cevap verdikten sonra: 'And ___?'"
 *
 * We scan for any quoted segment containing the blank `___` and treat
 * its inner contents as the target sentence. If no such segment exists
 * (older zh-en lessons often used a bare-prompt format), returns null
 * and the caller should fall back to just speaking the answer alone.
 */
function extractTargetSegment(prompt: string): string | null {
  // Each pair: [open quote, close quote]. ASCII first, then Unicode curls.
  const pairs: Array<[string, string]> = [
    ["'", "'"],
    ['"', '"'],
    ['‘', '’'],
    ['“', '”'],
  ]
  for (const [open, close] of pairs) {
    let cursor = 0
    while (cursor < prompt.length) {
      const start = prompt.indexOf(open, cursor)
      if (start < 0) break
      const end = prompt.indexOf(close, start + 1)
      if (end < 0) break
      const inner = prompt.slice(start + 1, end)
      if (/_+/.test(inner)) return inner
      cursor = end + 1
    }
  }
  return null
}

/**
 * Render a fill-blank prompt with the learner's answer slotted in,
 * stripped of quotes and parenthetical hints so the TTS reads cleanly.
 * Returns null when we can't isolate a target-language sentence — the
 * caller should then speak the answer alone instead of mangling the
 * whole prompt (which often contains source-language instructions).
 *
 *   "Birine cevap verdikten sonra: 'And ___?'"   +  "you"
 *     → "And you?"
 *   "In ___, it is hot." (yaz)                    +  "summer"
 *     → "In summer, it is hot."
 */
function fillSentence(prompt: string, answer: string): string | null {
  const extracted = extractTargetSegment(prompt)
  if (extracted) {
    return extracted.replace(/_+/g, answer.trim()).trim()
  }
  // No quoted blank. Try the bare-prompt format as a last resort —
  // legacy zh-en exercises sometimes have the blank directly in the
  // prompt with no quoting.
  const trimmed = prompt
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/^['"]|['"]$/g, '')
  if (!trimmed.includes('___') && !/_/.test(trimmed)) return null
  return trimmed.replace(/_+/g, answer.trim()).trim()
}

interface Props {
  lesson: Lesson
  /** Active courseId — used to derive Lingva from/to languages for word taps. */
  courseId: string
  onComplete: (mistakes: number) => void
  onBack: () => void
  /** Optional — fires per-exercise on wrong answers (mistake tracking). */
  onWrongAnswer?: (exerciseId: string) => void
  /** Optional — fires per-exercise on correct answers. */
  onCorrectAnswer?: (exerciseId: string) => void
}

type Feedback = 'idle' | 'correct' | 'wrong'

/**
 * LessonScreen — dispatches each `Exercise` to its specialized component
 * and grades on the unified inputs (mcSelected / fbValue / tapValue) +
 * the match_pairs auto-complete callback. Mirrors the web LessonScreen.
 */
export default function LessonScreen({
  lesson,
  courseId,
  onComplete,
  onBack,
  onWrongAnswer,
  onCorrectAnswer,
}: Props) {
  const insets = useSafeAreaInsets()
  const [index, setIndex] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [resetKey, setResetKey] = useState(0)

  // Per-type input state. Lifted here so LessonScreen can grade on Check.
  const [mcSelected, setMcSelected] = useState<string | null>(null)
  const [fbValue, setFbValue] = useState('')
  const [tapValue, setTapValue] = useState('')
  const [translateValue, setTranslateValue] = useState('')

  // Shuffle exercises once per lesson attempt so the same lesson doesn't
  // drill the same sequence every time — defeats memorization without
  // changing content. `useMemo` is keyed on lesson.id so a re-attempt
  // (component remounts) gets a fresh shuffle, but mid-lesson re-renders
  // keep the order stable. Dialogue exercises are pinned to the end —
  // they read as a capstone scene and feel wrong opening cold.
  const exercises = useMemo(() => {
    const arr = [...lesson.exercises]
    const dialogues = arr.filter((e) => e.type === 'dialogue')
    const rest = arr.filter((e) => e.type !== 'dialogue')
    // Fisher-Yates on the non-dialogue chunk.
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[rest[i], rest[j]] = [rest[j], rest[i]]
    }
    return [...rest, ...dialogues]
  }, [lesson.id, lesson.exercises])

  const ex = exercises[index]
  const isLast = index === exercises.length - 1
  const total = exercises.length
  const locked = feedback !== 'idle'

  function check() {
    if (locked) return
    const result = grade(ex, { mcSelected, fbValue, tapValue, translateValue })
    if (!result) return
    if (result.correct) {
      setFeedback('correct')
      onCorrectAnswer?.(ex.id)
      sfx.correct()
      // Play the completed target-language sentence so the learner
      // hears the answer in context. Each type knows what to speak:
      // fill_blank extracts the quoted target sentence; translate
      // speaks the answer in its declared direction's locale;
      // tap_words_in_order's built string is already pure target.
      const targetLoc = targetLocaleForCourse(courseId)
      if (ex.type === 'fill_blank') {
        const sentence = ex.prompt ? fillSentence(ex.prompt, fbValue) : null
        speak(sentence ?? fbValue, { language: targetLoc })
      } else if (ex.type === 'tap_words_in_order') {
        speak(tapValue, { language: targetLoc })
      } else if (ex.type === 'translate') {
        const parsed = parseCourseId(courseId)
        const target = parsed?.target ?? 'en'
        const source = parsed?.source ?? 'en'
        const sourceLoc = targetLocaleForCourse(`${source}-${target}`)
        const loc = ex.direction === 'to_target' ? targetLoc : sourceLoc
        speak(translateValue, { language: loc })
      } else if (
        (ex.type === 'multiple_choice' || ex.type === 'listen_and_choose') &&
        mcSelected
      ) {
        // For multiple_choice, fill any blank in the prompt with the
        // selected option so the learner hears the complete sentence
        // ("She was a teacher in 2010.") not just "was". When the
        // prompt has no blank or no prompt at all, fall back to
        // speaking the option alone in its detected language.
        const sentence = ex.prompt ? fillSentence(ex.prompt, mcSelected) : null
        if (sentence) {
          speak(sentence, { language: targetLoc })
        } else {
          const loc = localeForOption(
            mcSelected,
            [ex.prompt ?? '', ...ex.options],
            courseId,
          )
          speak(mcSelected, { language: loc })
        }
      }
    } else {
      setFeedback('wrong')
      setMistakes((m) => m + 1)
      onWrongAnswer?.(ex.id)
      sfx.wrong()
    }
  }

  function next() {
    if (isLast) {
      sfx.complete()
      onComplete(mistakes)
      return
    }
    setIndex((i) => i + 1)
    setFeedback('idle')
    setMcSelected(null)
    setFbValue('')
    setTapValue('')
    setTranslateValue('')
    setResetKey((k) => k + 1)
  }

  function canCheck(): boolean {
    switch (ex.type) {
      case 'multiple_choice':
      case 'listen_and_choose':
        return mcSelected !== null
      case 'fill_blank':
        return fbValue.trim().length > 0
      case 'tap_words_in_order':
        return tapValue.length > 0
      case 'translate':
        return translateValue.trim().length > 0
      case 'match_pairs':
      case 'dialogue':
        return false
    }
  }

  // match_pairs auto-completes once all pairs match. Treat extraMistakes
  // (mismatches during the matching) the same as wrong attempts.
  function handleMatchComplete(extraMistakes: number) {
    if (extraMistakes > 0) {
      setMistakes((m) => m + extraMistakes)
      setFeedback('wrong')
      onWrongAnswer?.(ex.id)
      sfx.wrong()
    } else {
      setFeedback('correct')
      onCorrectAnswer?.(ex.id)
      sfx.correct()
    }
  }

  // Translation tap-target wiring. Course id is `${target}-${source}`
  // where `target` is the language being learned and `source` is the
  // user's native. The TappableText component handles auto-detect +
  // smart direction internally, so we just hand it both codes.
  const parsed = parseCourseId(courseId)
  const targetLang = parsed?.target ?? 'en'
  const sourceLang = parsed?.source ?? 'en'

  return (
    <WordTranslationProvider
      value={{
        enabled: true,
        targetLang,
        sourceLang,
        wordTranslations: lesson.wordTranslations,
      }}
    >
    <View style={styles.shell}>
      <View style={[styles.topbar, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={onBack} style={styles.x}>
          <Text style={styles.xText}>×</Text>
        </Pressable>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / total) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {index + 1}/{total}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <ExerciseInstruction exercise={ex} courseId={courseId} />
        {ex.hint ? <ExerciseHint hint={ex.hint} /> : null}
        <ExerciseView
          ex={ex}
          courseId={courseId}
          locked={locked}
          mcSelected={mcSelected}
          setMcSelected={setMcSelected}
          fbValue={fbValue}
          setFbValue={setFbValue}
          setTapValue={setTapValue}
          translateValue={translateValue}
          setTranslateValue={setTranslateValue}
          onMatchComplete={handleMatchComplete}
          resetKey={resetKey}
        />
      </ScrollView>

      <View style={styles.footer}>
        {feedback === 'correct' && (
          <Text style={[styles.feedback, { color: colors.success700 }]}>
            ✓ Correct!
          </Text>
        )}
        {feedback === 'wrong' && (
          <Text style={[styles.feedback, { color: colors.error700 }]}>
            {wrongMessage(ex)}
          </Text>
        )}
        {feedback === 'idle' && ex.type === 'match_pairs' ? (
          <LedgeButton
            label="Match all pairs to continue"
            tone="neutral"
            size="lg"
            disabled
          />
        ) : feedback === 'idle' && ex.type === 'dialogue' ? (
          <LedgeButton
            label="Play through the dialogue"
            tone="neutral"
            size="lg"
            disabled
          />
        ) : (
          <LedgeButton
            label={feedback === 'idle' ? 'Check' : isLast ? 'Finish' : 'Continue'}
            tone={feedback === 'wrong' ? 'error' : 'primary'}
            size="lg"
            disabled={feedback === 'idle' && !canCheck()}
            onPress={feedback === 'idle' ? check : next}
          />
        )}
      </View>
    </View>
    </WordTranslationProvider>
  )
}

interface ExerciseViewProps {
  ex: Exercise
  courseId: string
  locked: boolean
  mcSelected: string | null
  setMcSelected: (v: string) => void
  fbValue: string
  setFbValue: (v: string) => void
  setTapValue: (v: string) => void
  translateValue: string
  setTranslateValue: (v: string) => void
  /** Reused for match_pairs AND dialogue — both report a final mistake count. */
  onMatchComplete: (mistakes: number) => void
  resetKey: number
}

function ExerciseView({
  ex,
  courseId,
  locked,
  mcSelected,
  setMcSelected,
  fbValue,
  setFbValue,
  setTapValue,
  translateValue,
  setTranslateValue,
  onMatchComplete,
  resetKey,
}: ExerciseViewProps) {
  switch (ex.type) {
    case 'multiple_choice':
      return (
        <View style={styles.exRoot}>
          {ex.prompt ? (
            <TappableText
              text={ex.prompt}
              tokens={ex.promptTokens}
              style={styles.prompt}
            />
          ) : null}
          <View style={styles.options}>
            {ex.options.map((opt) => {
              const isSel = mcSelected === opt
              const isCorrect = locked && opt === ex.answer
              const isWrong = locked && isSel && opt !== ex.answer
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    if (locked) return
                    setMcSelected(opt)
                    speak(opt, {
                      language: localeForOption(
                        opt,
                        [ex.prompt ?? '', ...ex.options],
                        courseId,
                      ),
                    })
                  }}
                  style={[
                    styles.option,
                    isSel && !locked && styles.optionSelected,
                    isCorrect && styles.optionCorrect,
                    isWrong && styles.optionWrong,
                  ]}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      )
    case 'fill_blank':
      return (
        <FillBlank
          exercise={ex}
          value={fbValue}
          locked={locked}
          onChange={setFbValue}
        />
      )
    case 'match_pairs':
      return (
        <MatchPairs
          exercise={ex}
          courseId={courseId}
          locked={locked}
          onComplete={onMatchComplete}
          resetKey={resetKey}
        />
      )
    case 'listen_and_choose':
      return (
        <ListenAndChoose
          exercise={ex}
          courseId={courseId}
          selected={mcSelected}
          locked={locked}
          onSelect={setMcSelected}
        />
      )
    case 'tap_words_in_order':
      return (
        <TapWordsInOrder
          exercise={ex}
          courseId={courseId}
          locked={locked}
          onChange={setTapValue}
          resetKey={resetKey}
        />
      )
    case 'translate': {
      // Decode source/answer locales based on direction. to_target =
      // source-lang prompt, target-lang answer; to_source flips it.
      const parsed = parseCourseId(courseId)
      const target = parsed?.target ?? 'en'
      const source = parsed?.source ?? 'en'
      const targetLoc = targetLocaleForCourse(courseId)
      const sourceLoc = targetLocaleForCourse(`${source}-${target}`)
      const sourceLocale = ex.direction === 'to_target' ? sourceLoc : targetLoc
      const answerLocale = ex.direction === 'to_target' ? targetLoc : sourceLoc
      return (
        <Translate
          exercise={ex}
          value={translateValue}
          locked={locked}
          sourceLocale={sourceLocale}
          answerLocale={answerLocale}
          onChange={setTranslateValue}
        />
      )
    }
    case 'dialogue':
      return (
        <Dialogue
          exercise={ex}
          courseId={courseId}
          locked={locked}
          onComplete={onMatchComplete}
          resetKey={resetKey}
        />
      )
  }
}

/**
 * Type-derived instruction header rendered above every exercise.
 * Lets content authors stop putting instructions inside the prompt —
 * "Boşluğu doldur:", "Translate to English", etc. now come from the
 * type's i18n key and the prompt is just the content itself.
 *
 * For `translate`, the header interpolates the language being asked
 * for ("Translate to English" vs "Translate to Turkish") based on
 * the exercise's direction and the course's target/source pair.
 */
function ExerciseInstruction({
  exercise,
  courseId,
}: {
  exercise: Exercise
  courseId: string
}) {
  const t = useT()
  let text: string
  if (exercise.type === 'translate') {
    const parsed = parseCourseId(courseId)
    const target = parsed?.target ?? 'en'
    const source = parsed?.source ?? 'en'
    const toCode = exercise.direction === 'to_target' ? target : source
    const langInfo = findLanguage(toCode)
    text = t('exercise.translate.instruction', {
      target: langInfo?.name ?? toCode,
    })
  } else {
    text = t(`exercise.${exercise.type}.instruction`)
  }
  return (
    <View style={styles.instructionWrap}>
      <Text style={styles.instructionText}>{text}</Text>
    </View>
  )
}

/**
 * Source-language hint shown above the prompt. Optional per exercise.
 * Renders smaller + secondary color so it reads as a translation cue,
 * not the primary content the learner is responding to.
 */
function ExerciseHint({ hint }: { hint: string }) {
  return (
    <View style={styles.hintWrap}>
      <Text style={styles.hintText}>{hint}</Text>
    </View>
  )
}

function grade(
  exercise: Exercise,
  inputs: {
    mcSelected: string | null
    fbValue: string
    tapValue: string
    translateValue: string
  },
): { correct: boolean } | null {
  switch (exercise.type) {
    case 'multiple_choice':
    case 'listen_and_choose':
      if (inputs.mcSelected === null) return null
      return { correct: inputs.mcSelected === exercise.answer }
    case 'fill_blank':
      if (inputs.fbValue.trim().length === 0) return null
      return { correct: checkFillBlank(inputs.fbValue, exercise) }
    case 'tap_words_in_order':
      if (inputs.tapValue.length === 0) return null
      return { correct: matchesSequenceAnswer(inputs.tapValue, exercise.answer) }
    case 'translate':
      if (inputs.translateValue.trim().length === 0) return null
      return { correct: checkTranslate(inputs.translateValue, exercise) }
    case 'match_pairs':
    case 'dialogue':
      // Both are self-driving — the inner component reports its result
      // via the onMatchComplete callback. There's no top-level Check.
      return null
  }
}

function wrongMessage(ex: Exercise): string {
  switch (ex.type) {
    case 'multiple_choice':
    case 'listen_and_choose':
      return `Correct: ${ex.answer}`
    case 'fill_blank':
      return `Answer: ${ex.answer}`
    case 'tap_words_in_order':
      return `Correct: ${ex.answer}`
    case 'translate':
      return `Answer: ${ex.answer}`
    case 'match_pairs':
      return 'Some pairs were missed.'
    case 'dialogue':
      return 'You missed a turn or two — keep going!'
  }
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  x: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xText: { fontSize: 24, fontWeight: '900', color: colors.textMuted },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.success500 },
  progressText: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '700' },
  body: { padding: space.lg, gap: space.lg, flexGrow: 1 },
  instructionWrap: {
    alignItems: 'center',
    marginBottom: -space.sm,
  },
  instructionText: {
    fontSize: fontSizes.xs,
    fontFamily: 'Nunito_900Black',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  hintWrap: {
    alignItems: 'center',
    marginTop: -space.sm,
    paddingHorizontal: space.lg,
  },
  hintText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: fontSizes.sm * 1.4,
  },
  exRoot: { gap: space.lg },
  prompt: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: fontSizes.xxl * 1.3,
  },
  options: { gap: space.sm },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    alignItems: 'center',
  },
  optionSelected: { borderColor: colors.primary500, backgroundColor: colors.primary100 },
  optionCorrect: { borderColor: colors.success500, backgroundColor: colors.success100 },
  optionWrong: { borderColor: colors.error500, backgroundColor: colors.error100 },
  optionText: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  footer: {
    padding: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.sm,
  },
  feedback: { fontSize: fontSizes.md, fontWeight: '800' },
})
