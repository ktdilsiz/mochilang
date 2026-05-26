import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type {
  DialogueExercise,
  DialogueTurn,
} from '@mochilang/shared'
import { parseCourseId } from '@mochilang/shared'
import LedgeButton from '../LedgeButton'
import TappableText from '../TappableText'
import { speak, stopSpeaking } from '../../lib/tts'
import { sfx } from '../../lib/sfx'
import { getSettings } from '../../state/useSettings'
import { colors, fontSizes, radius, space } from '../../lib/theme'

interface Props {
  exercise: DialogueExercise
  courseId: string
  locked: boolean
  /** Reports total "failed-turn count" once the dialogue finishes. Same shape as MatchPairs. */
  onComplete: (extraMistakes: number) => void
  resetKey: number
}

type SpeakerColor = {
  bubble: string
  border: string
  text: string
  align: 'left' | 'right'
}

/**
 * Chat-style renderer for `dialogue` exercises.
 *
 * Scrolls forward through `turns` in order. `line` turns auto-advance
 * — when text-to-speech is on, when the audio finishes (with a small
 * grace timer as a safety); otherwise after a length-scaled delay.
 * Interactive turns (`choice` / `fill`) lock until the user answers
 * correctly. The first wrong attempt on a turn marks it as "failed";
 * subsequent attempts on the same turn don't re-count, matching the
 * "one mistake per failed turn" rule the screen was specced for.
 */
export default function Dialogue({
  exercise,
  courseId,
  locked,
  onComplete,
  resetKey,
}: Props) {
  // turnIdx is the index of the turn the user is CURRENTLY interacting with
  // (or watching, if it's a line). Bubbles at index < turnIdx are revealed.
  const [turnIdx, setTurnIdx] = useState(0)
  const [failedTurns, setFailedTurns] = useState<Set<number>>(() => new Set())
  const [choicePick, setChoicePick] = useState<string | null>(null)
  const [fillValue, setFillValue] = useState('')
  // `turnError` flashes a red wrong-answer message under the active
  // input; cleared as soon as the user edits or picks again.
  const [turnError, setTurnError] = useState<string | null>(null)

  const scrollRef = useRef<ScrollView>(null)
  const lineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset when the parent flips `resetKey` (e.g. exercise switch).
  useEffect(() => {
    setTurnIdx(0)
    setFailedTurns(new Set())
    setChoicePick(null)
    setFillValue('')
    setTurnError(null)
  }, [resetKey])

  // Speaker styling: index 0 → primary (right-aligned, the "user" side),
  // remaining speakers → cycling cooler tones on the left. Color-only,
  // no avatars per the design.
  const speakerStyle = useMemo<Record<string, SpeakerColor>>(() => {
    const out: Record<string, SpeakerColor> = {}
    exercise.speakers.forEach((s, i) => {
      if (i === 0) {
        out[s.id] = {
          bubble: colors.cream100,
          border: colors.primary300,
          text: colors.text,
          align: 'right',
        }
      } else {
        const palette = leftPalette[(i - 1) % leftPalette.length]
        out[s.id] = { ...palette, align: 'left' }
      }
    })
    return out
  }, [exercise.speakers])

  const targetLang = useMemo(() => {
    const parsed = parseCourseId(courseId)
    return parsed?.target ?? 'en'
  }, [courseId])

  // Drive autoplay + auto-advance for line turns. Speech.onDone fires
  // when TTS finishes the line; if TTS isn't on we still advance via
  // a length-scaled timer so the dialogue keeps moving.
  const turn: DialogueTurn | undefined = exercise.turns[turnIdx]
  useEffect(() => {
    if (!turn || turn.kind !== 'line' || locked) return
    const settings = getSettings()
    const speakText = turn.spokenText ?? turn.text
    const fallbackMs = Math.min(
      4000,
      Math.max(1200, speakText.length * 80),
    )

    const cancelTimer = () => {
      if (lineTimerRef.current !== null) {
        clearTimeout(lineTimerRef.current)
        lineTimerRef.current = null
      }
    }
    cancelTimer()

    const advanceOnce = (() => {
      let fired = false
      return () => {
        if (fired) return
        fired = true
        cancelTimer()
        advance()
      }
    })()

    if (settings.autoPlayAudio) {
      // Both routes: TTS onDone advances, and the safety timer covers
      // the case where the engine never reports completion (rare on
      // some Android voices).
      speak(speakText, {
        language: ttsLangFor(targetLang),
        onDone: advanceOnce,
      })
      lineTimerRef.current = setTimeout(advanceOnce, fallbackMs + 800)
    } else {
      lineTimerRef.current = setTimeout(advanceOnce, fallbackMs)
    }

    return () => {
      cancelTimer()
      stopSpeaking()
    }
    // We deliberately key on turnIdx + the active turn kind. New turn
    // → new effect run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnIdx, turn?.kind, locked, targetLang])

  // When the active turn changes, scroll the chat to the bottom so the
  // newest bubble + input row are visible.
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    })
  }, [turnIdx])

  function advance() {
    setChoicePick(null)
    setFillValue('')
    setTurnError(null)
    setTurnIdx((i) => {
      const nextI = i + 1
      if (nextI >= exercise.turns.length) {
        // Defer the completion handoff so the final bubble paints first.
        setTimeout(() => onComplete(failedTurns.size), 60)
      }
      return nextI
    })
  }

  function markFailure() {
    setFailedTurns((prev) => {
      if (prev.has(turnIdx)) return prev
      const next = new Set(prev)
      next.add(turnIdx)
      return next
    })
  }

  function submitChoice() {
    if (!turn || turn.kind !== 'choice' || !choicePick) return
    if (choicePick === turn.answer) {
      sfx.correct()
      // Speak the user's correct line in the target language before
      // advancing — same reinforcement we give for fill_blank and
      // tap_words_in_order. The next line's auto-play will queue up
      // after this one finishes (Speech.stop in the effect cleanup).
      speak(turn.answer, { language: ttsLangFor(targetLang) })
      advance()
    } else {
      markFailure()
      sfx.wrong()
      setTurnError(`Try again — “${choicePick}” isn't quite right.`)
    }
  }

  function submitFill() {
    if (!turn || turn.kind !== 'fill') return
    const v = fillValue.trim()
    if (v.length === 0) return
    const accepted = [turn.answer, ...(turn.acceptableAnswers ?? [])].map(
      (a) => a.toLowerCase(),
    )
    if (accepted.includes(v.toLowerCase())) {
      sfx.correct()
      // Speak the full completed line ("$before$answer$after") so
      // the learner hears their fill in context.
      const full = `${turn.before}${turn.answer}${turn.after}`
      speak(full, { language: ttsLangFor(targetLang) })
      advance()
    } else {
      markFailure()
      sfx.wrong()
      setTurnError(`Not quite — the missing word is “${turn.answer}”.`)
      // Don't auto-clear the input; let the user edit toward the
      // correct answer.
    }
  }

  return (
    <View style={styles.shell}>
      <Text style={styles.scene}>{exercise.prompt}</Text>

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatInner}
      >
        {exercise.turns.slice(0, turnIdx).map((t, i) => (
          <Bubble
            key={i}
            turn={t}
            speakerName={nameFor(exercise, t.speaker)}
            style={speakerStyle[t.speaker]}
            past
          />
        ))}
        {turn && (
          <Bubble
            turn={turn}
            speakerName={nameFor(exercise, turn.speaker)}
            style={speakerStyle[turn.speaker]}
            past={false}
            // For interactive turns we lay the prompt over the bubble.
            interactiveActive
          />
        )}
      </ScrollView>

      {turn && turn.kind === 'choice' && (
        <View style={styles.inputArea}>
          {turn.prompt && <Text style={styles.inputPrompt}>{turn.prompt}</Text>}
          <View style={styles.options}>
            {turn.options.map((opt) => {
              const selected = choicePick === opt
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    if (locked) return
                    setChoicePick(opt)
                    setTurnError(null)
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <TappableText text={opt} style={styles.optionText} />
                </Pressable>
              )
            })}
          </View>
          {turnError && <Text style={styles.error}>{turnError}</Text>}
          <LedgeButton
            label="Check"
            tone="primary"
            size="lg"
            disabled={!choicePick || locked}
            onPress={submitChoice}
          />
        </View>
      )}

      {turn && turn.kind === 'fill' && (
        <View style={styles.inputArea}>
          {turn.prompt && <Text style={styles.inputPrompt}>{turn.prompt}</Text>}
          <View style={styles.fillLine}>
            <Text style={styles.fillText}>{turn.before}</Text>
            <TextInput
              value={fillValue}
              onChangeText={(v) => {
                setFillValue(v)
                setTurnError(null)
              }}
              placeholder="…"
              placeholderTextColor={colors.textSubtle}
              style={styles.fillInput}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!locked}
            />
            <Text style={styles.fillText}>{turn.after}</Text>
          </View>
          {turnError && <Text style={styles.error}>{turnError}</Text>}
          <LedgeButton
            label="Check"
            tone="primary"
            size="lg"
            disabled={fillValue.trim().length === 0 || locked}
            onPress={submitFill}
          />
        </View>
      )}

      {turn && turn.kind === 'line' && (
        <View style={styles.inputArea}>
          <Pressable
            onPress={() => !locked && advance()}
            style={styles.continueHint}
          >
            <Text style={styles.continueHintText}>Tap to continue ›</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

interface BubbleProps {
  turn: DialogueTurn
  speakerName: string
  style: SpeakerColor
  past: boolean
  interactiveActive?: boolean
}

function Bubble({ turn, speakerName, style, past, interactiveActive }: BubbleProps) {
  // What's shown inside the bubble: line text for narration; an ellipsis
  // placeholder for interactive turns that are still "current" (the user
  // hasn't answered yet — their bubble fills in with their pick after
  // they advance); the chosen / filled-in text once the turn is past.
  const bubbleText = (() => {
    if (turn.kind === 'line') return turn.text
    if (interactiveActive) return '…'
    if (turn.kind === 'choice') return turn.answer
    return `${turn.before}${turn.answer}${turn.after}`
  })()

  return (
    <View
      style={[
        styles.row,
        { justifyContent: style.align === 'right' ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: style.bubble,
            borderColor: style.border,
            alignSelf: style.align === 'right' ? 'flex-end' : 'flex-start',
            opacity: past ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.speaker, { color: style.border }]}>{speakerName}</Text>
        <TappableText
          text={bubbleText}
          style={[styles.bubbleText, { color: style.text }]}
        />
      </View>
    </View>
  )
}

function nameFor(ex: DialogueExercise, id: string): string {
  return ex.speakers.find((s) => s.id === id)?.name ?? id
}

function ttsLangFor(target: string): string {
  // expo-speech wants BCP-47-style codes. The course id only carries
  // the ISO 639-1 part; add a sensible region default for the few
  // languages where the engines need it.
  switch (target) {
    case 'zh':
      return 'zh-CN'
    case 'tr':
      return 'tr-TR'
    case 'ja':
      return 'ja-JP'
    case 'ko':
      return 'ko-KR'
    case 'es':
      return 'es-ES'
    case 'fr':
      return 'fr-FR'
    case 'de':
      return 'de-DE'
    case 'pt':
      return 'pt-PT'
    case 'it':
      return 'it-IT'
    case 'ru':
      return 'ru-RU'
    case 'ar':
      return 'ar-SA'
    case 'hi':
      return 'hi-IN'
    default:
      return target
  }
}

const leftPalette: Omit<SpeakerColor, 'align'>[] = [
  { bubble: '#e0ecff', border: '#5a8be0', text: colors.text },
  { bubble: '#d7f5b5', border: '#5da953', text: colors.text },
  { bubble: '#ffe1ec', border: '#e26e96', text: colors.text },
  { bubble: '#ece1ff', border: '#8d6cd6', text: colors.text },
  { bubble: '#ffe6d1', border: '#e07c3a', text: colors.text },
]

const styles = StyleSheet.create({
  shell: { gap: space.md },
  scene: {
    textAlign: 'center',
    fontSize: fontSizes.sm,
    color: colors.textSubtle,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: space.xs,
  },
  chat: { maxHeight: 320 },
  chatInner: { gap: space.sm, paddingBottom: space.sm },
  row: { flexDirection: 'row' },
  bubble: {
    maxWidth: '85%',
    borderRadius: radius.md,
    borderWidth: 2,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    gap: 2,
  },
  speaker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  inputArea: { gap: space.sm },
  inputPrompt: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '700',
  },
  options: { gap: space.sm },
  option: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.md,
  },
  optionSelected: {
    borderColor: colors.primary500,
    backgroundColor: colors.cream100,
  },
  optionText: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '700',
  },
  fillLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  fillText: { fontSize: fontSizes.md, color: colors.text },
  fillInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: fontSizes.md,
    color: colors.text,
    minWidth: 100,
  },
  error: {
    fontSize: fontSizes.sm,
    color: colors.error700,
    fontWeight: '700',
  },
  continueHint: {
    alignItems: 'center',
    paddingVertical: space.md,
  },
  continueHintText: {
    color: colors.textMuted,
    fontWeight: '800',
    fontSize: fontSizes.sm,
    letterSpacing: 0.6,
  },
})
