import {
  type Level,
  LEVEL_EXAM_PASS_THRESHOLD,
  LEVEL_EXAM_QUESTION_COUNT,
  pickLevelExamQuestions,
} from '@mochilang/shared'
import ExamScreen from './ExamScreen'

interface Props {
  level: Level
  onPass: () => void
  onBack: () => void
  /** Optional — fires per wrong answer so callers can track mistakes. */
  onWrongAnswer?: (exerciseId: string) => void
}

/**
 * Level-skip exam — 40 questions sampled from each topic's last lesson
 * with later topics weighted heavier (see pickLevelExamQuestions). Pass
 * threshold is 85% (34/40). Successful passes mark the level as
 * cleared, which unlocks the first topic of the next level *and*
 * unlocks every topic inside this level so the learner can revisit
 * material they actually want without re-grinding to get there.
 */
export default function LevelExamScreen({
  level,
  onPass,
  onBack,
  onWrongAnswer,
}: Props) {
  const requiredCorrect = Math.ceil(
    LEVEL_EXAM_PASS_THRESHOLD * LEVEL_EXAM_QUESTION_COUNT
  )
  return (
    <ExamScreen
      eyebrow={`Level exam — ${level.name}`}
      getQuestions={() =>
        pickLevelExamQuestions(level, LEVEL_EXAM_QUESTION_COUNT)
      }
      passThreshold={LEVEL_EXAM_PASS_THRESHOLD}
      pass={{
        title: 'Level passed!',
        body: (
          <>
            You skipped <strong>{level.name}</strong> and unlocked the next
            level. Lessons inside it stay open if you want to come back for
            review XP.
          </>
        ),
        cta: 'Onwards',
      }}
      fail={{
        title: 'Not quite — yet',
        body: (
          <>
            You need {requiredCorrect} of {LEVEL_EXAM_QUESTION_COUNT} correct to
            skip {level.name}. The questions weight toward later topics, so
            the synthesis material is what to brush up on. Try again or
            keep working through the lessons.
          </>
        ),
      }}
      onPass={onPass}
      onBack={onBack}
      onWrongAnswer={onWrongAnswer}
    />
  )
}
