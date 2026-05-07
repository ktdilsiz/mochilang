import { useEffect, useMemo, useState } from 'react'
import type { TapWordsInOrderExercise } from '@mochilang/shared'
import './exercise.css'

interface Props {
  exercise: TapWordsInOrderExercise
  locked: boolean
  /** Reports the currently-built sentence so the parent can grade. */
  onChange: (built: string) => void
  resetKey: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TapWordsInOrder({
  exercise,
  locked,
  onChange,
  resetKey,
}: Props) {
  const initialBank = useMemo(
    () => shuffle(exercise.bank).map((w, i) => ({ word: w, key: `${i}-${w}` })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resetKey, exercise]
  )
  const [bank, setBank] = useState(initialBank)
  const [built, setBuilt] = useState<typeof initialBank>([])

  useEffect(() => {
    setBank(initialBank)
    setBuilt([])
  }, [initialBank])

  useEffect(() => {
    onChange(built.map((b) => b.word).join(''))
  }, [built, onChange])

  function moveToBuilt(idx: number) {
    if (locked) return
    setBank((prev) => {
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      setBuilt((b) => [...b, item])
      return next
    })
  }
  function moveToBank(idx: number) {
    if (locked) return
    setBuilt((prev) => {
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      setBank((b) => [...b, item])
      return next
    })
  }

  const builtSentence = built.map((b) => b.word).join('')
  const isCorrect = locked && builtSentence === exercise.answer
  const isWrong = locked && !isCorrect

  // For long sentences (≥8 expected tokens) show a "5 / 12" progress
  // counter so the learner has a sense of how much sentence is left.
  // The cap of 8 was picked to match the cognitive-load break Dr. Chen
  // flagged in the C1/C2 review.
  const expectedTokenCount = exercise.answer.split(' ').filter(Boolean).length
  const showProgress = expectedTokenCount >= 8

  return (
    <div className="ex-root">
      <h2 className="ex-prompt">{exercise.prompt}</h2>
      {showProgress && (
        <div className="ex-build-progress" aria-live="polite">
          {built.length} / {expectedTokenCount}
        </div>
      )}
      <div
        className={
          'ex-build-area ' +
          (showProgress ? 'ex-build-area-long ' : '') +
          (isCorrect ? 'ex-build-correct' : isWrong ? 'ex-build-wrong' : '')
        }
      >
        {built.length === 0 && (
          <span className="ex-build-empty">Tap words below to build the sentence</span>
        )}
        {built.map((b, i) => (
          <button
            key={b.key}
            type="button"
            className="ex-word-chip ex-word-chip-built"
            disabled={locked}
            onClick={() => moveToBank(i)}
          >
            {b.word}
          </button>
        ))}
      </div>
      <div className="ex-bank">
        {bank.map((b, i) => (
          <button
            key={b.key}
            type="button"
            className="ex-word-chip"
            disabled={locked}
            onClick={() => moveToBuilt(i)}
          >
            {b.word}
          </button>
        ))}
      </div>
      {locked && !isCorrect && (
        <div className="ex-correction">
          Correct: <strong>{exercise.answer}</strong>
        </div>
      )}
    </div>
  )
}
