import {
  type Level,
  LEVEL_EXAM_PASS_THRESHOLD,
  LEVEL_EXAM_QUESTION_COUNT,
} from '@mochilang/shared'
import mochiThinking from '../assets/mochi-thinking.png'
import './LevelExamIntroScreen.css'

interface Props {
  level: Level
  onStart: () => void
  onCancel: () => void
}

/**
 * Pre-exam intro for the level-skip flow. Sets expectations before
 * the user commits to the 40-question grind:
 *   - what's being tested (synthesis material across the level)
 *   - the pass bar (85%)
 *   - that retries draw fresh questions
 *   - that passing unlocks the next level immediately
 *
 * Stays separate from ExamScreen so the user always sees the intro
 * (rather than the timer-style top bar) when they first arrive.
 */
export default function LevelExamIntroScreen({ level, onStart, onCancel }: Props) {
  const requiredCorrect = Math.ceil(
    LEVEL_EXAM_PASS_THRESHOLD * LEVEL_EXAM_QUESTION_COUNT
  )
  const passPercent = Math.round(LEVEL_EXAM_PASS_THRESHOLD * 100)

  return (
    <div className="exam-intro-shell">
      <header className="exam-intro-topbar">
        <button
          type="button"
          className="lesson-close"
          onClick={onCancel}
          aria-label="Close"
        >
          ✕
        </button>
      </header>

      <main className="exam-intro-body">
        <img src={mochiThinking} alt="" className="exam-intro-mochi" />
        <div className="exam-intro-eyebrow">Level placement exam</div>
        <h1 className="exam-intro-title">Skip {level.name}?</h1>
        <p className="exam-intro-tagline">
          Pass once and the entire level is yours. {level.description}
        </p>

        <ul className="exam-intro-bullets">
          <li>
            <span className="exam-intro-icon">📝</span>
            <span>
              <strong>{LEVEL_EXAM_QUESTION_COUNT} questions</strong>, drawn from
              the synthesis lesson of every topic in {level.name}.
            </span>
          </li>
          <li>
            <span className="exam-intro-icon">🎯</span>
            <span>
              Need <strong>{requiredCorrect} / {LEVEL_EXAM_QUESTION_COUNT}</strong>{' '}
              correct ({passPercent}%) to pass.
            </span>
          </li>
          <li>
            <span className="exam-intro-icon">⚖️</span>
            <span>
              Questions are weighted toward <strong>later topics</strong> — the
              hard, latter-half material decides it.
            </span>
          </li>
          <li>
            <span className="exam-intro-icon">🔁</span>
            <span>Fresh randomized deck on every attempt — retries are free.</span>
          </li>
          <li>
            <span className="exam-intro-icon">✨</span>
            <span>
              Pass and the next level unlocks immediately. Lessons inside{' '}
              {level.name} stay open if you want to come back for review XP.
            </span>
          </li>
        </ul>
      </main>

      <footer className="exam-intro-footer">
        <button
          type="button"
          className="ledge-button tone-primary size-lg exam-intro-cta"
          onClick={onStart}
          autoFocus
        >
          Start exam
        </button>
        <button
          type="button"
          className="ledge-button tone-neutral exam-intro-cta"
          onClick={onCancel}
        >
          Maybe later
        </button>
      </footer>
    </div>
  )
}
