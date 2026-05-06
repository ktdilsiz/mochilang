import { useEffect, useMemo, useState } from 'react'
import type { MatchPairsExercise } from '../../types'
import './exercise.css'

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

  // pairIdx of each item that has been correctly matched & disabled
  const [matched, setMatched] = useState<Set<number>>(new Set())
  // Currently picked item on each side (or null)
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
      // Tap to deselect
      setPick(null)
      return
    }
    if (!pick) {
      setPick({ side, index: pairIdx, label })
      return
    }
    if (pick.side === side) {
      // Replace selection on same side
      setPick({ side, index: pairIdx, label })
      return
    }
    // Two sides chosen — check the underlying pair indices.
    if (pick.index === pairIdx) {
      // Match!
      const next = new Set(matched)
      next.add(pairIdx)
      setMatched(next)
      setPick(null)
      if (next.size === exercise.pairs.length) {
        onComplete(mistakes)
      }
    } else {
      // Mismatch — flash, count, clear
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

  return (
    <div className="ex-root">
      <h2 className="ex-prompt">{exercise.prompt}</h2>
      <div className="ex-pairs">
        <div className="ex-pairs-col">
          {lefts.map((item) => (
            <button
              key={`l-${item.pairIdx}`}
              type="button"
              disabled={locked || isMatched(item.pairIdx)}
              onClick={() => tryHandle('left', item.label, item.pairIdx)}
              className={
                'ex-pair-btn ' +
                (isMatched(item.pairIdx)
                  ? 'ex-pair-matched'
                  : isPicked('left', item.pairIdx)
                    ? 'ex-pair-picked'
                    : '') +
                (isShaking('left', item.pairIdx) ? ' ex-shake' : '')
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="ex-pairs-col">
          {rights.map((item) => (
            <button
              key={`r-${item.pairIdx}`}
              type="button"
              disabled={locked || isMatched(item.pairIdx)}
              onClick={() => tryHandle('right', item.label, item.pairIdx)}
              className={
                'ex-pair-btn ' +
                (isMatched(item.pairIdx)
                  ? 'ex-pair-matched'
                  : isPicked('right', item.pairIdx)
                    ? 'ex-pair-picked'
                    : '') +
                (isShaking('right', item.pairIdx) ? ' ex-shake' : '')
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
