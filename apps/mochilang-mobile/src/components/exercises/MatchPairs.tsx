import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { MatchPairsExercise } from '@mochilang/shared'
import TappableText from '../TappableText'
import { colors, fontSizes, radius, space } from '../../lib/theme'

interface Props {
  exercise: MatchPairsExercise
  locked: boolean
  /**
   * Called whenever the user makes a wrong tap-pair OR when all pairs are
   * matched. The lesson runner uses the all-correct event to advance.
   */
  onComplete: (mistakes: number) => void
  resetKey: number
}

type Side = 'left' | 'right'

interface Pick {
  side: Side
  index: number
  label: string
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function MatchPairs({
  exercise,
  locked,
  onComplete,
  resetKey,
}: Props) {
  const lefts = useMemo(
    () => shuffle(exercise.pairs.map((p, i) => ({ label: p.left, pairIdx: i }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resetKey, exercise]
  )
  const rights = useMemo(
    () => shuffle(exercise.pairs.map((p, i) => ({ label: p.right, pairIdx: i }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resetKey, exercise]
  )

  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [pick, setPick] = useState<Pick | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [shake, setShake] = useState<{ side: Side; index: number } | null>(null)

  useEffect(() => {
    setMatched(new Set())
    setPick(null)
    setMistakes(0)
    setShake(null)
  }, [resetKey])

  function tryHandle(side: Side, label: string, pairIdx: number) {
    if (locked) return
    if (matched.has(pairIdx) && side === 'left') return
    if (
      pick &&
      pick.side === side &&
      pick.index === pairIdx &&
      pick.label === label
    ) {
      setPick(null)
      return
    }
    if (!pick) {
      setPick({ side, index: pairIdx, label })
      return
    }
    if (pick.side === side) {
      setPick({ side, index: pairIdx, label })
      return
    }
    if (pick.index === pairIdx) {
      const next = new Set(matched)
      next.add(pairIdx)
      setMatched(next)
      setPick(null)
      if (next.size === exercise.pairs.length) {
        onComplete(mistakes)
      }
    } else {
      setMistakes((m) => m + 1)
      setShake({ side, index: pairIdx })
      setTimeout(() => setShake(null), 350)
      setPick(null)
    }
  }

  function isMatched(pairIdx: number): boolean {
    return matched.has(pairIdx)
  }
  function isPicked(side: Side, pairIdx: number): boolean {
    return !!(pick && pick.side === side && pick.index === pairIdx)
  }
  function isShaking(side: Side, pairIdx: number): boolean {
    return !!(shake && shake.side === side && shake.index === pairIdx)
  }

  function renderColumn(
    side: Side,
    items: { label: string; pairIdx: number }[],
    keyPrefix: string
  ) {
    return (
      <View style={styles.col}>
        {items.map((item) => {
          const matchedNow = isMatched(item.pairIdx)
          const pickedNow = isPicked(side, item.pairIdx)
          const shakingNow = isShaking(side, item.pairIdx)
          const disabled = locked || matchedNow
          return (
            <Pressable
              key={`${keyPrefix}-${item.pairIdx}`}
              disabled={disabled}
              onPress={() => tryHandle(side, item.label, item.pairIdx)}
              style={[
                styles.pairBtn,
                pickedNow && styles.pairPicked,
                matchedNow && styles.pairMatched,
                shakingNow && styles.pairShake,
              ]}
            >
              <Text
                style={[
                  styles.pairText,
                  matchedNow && styles.pairTextMatched,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <TappableText text={exercise.prompt} style={styles.prompt} />
      <View style={styles.pairs}>
        {renderColumn('left', lefts, 'l')}
        {renderColumn('right', rights, 'r')}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  prompt: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: fontSizes.xxl * 1.3,
  },
  pairs: { flexDirection: 'row', gap: space.lg },
  col: { flex: 1, gap: space.sm },
  pairBtn: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  pairTextMatched: { color: colors.textMuted },
  pairPicked: {
    borderColor: colors.primary500,
    backgroundColor: colors.primary100,
  },
  pairMatched: { opacity: 0.35 },
  pairShake: {
    borderColor: colors.error500,
    backgroundColor: colors.error100,
  },
})
