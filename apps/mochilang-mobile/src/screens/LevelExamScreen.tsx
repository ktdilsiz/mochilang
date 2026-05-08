import { Text } from 'react-native'
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
}

/**
 * Level-skip exam — 40 weighted questions drawn from each topic's last
 * lesson. See pickLevelExamQuestions for the weighting; later topics
 * dominate so the synthesis material decides whether the user actually
 * gets to skip the level. Pass at 85% (34/40).
 */
export default function LevelExamScreen({ level, onPass, onBack }: Props) {
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
          <Text>
            You skipped {level.name} and unlocked the next level. Lessons
            inside it stay open if you want to come back for review XP.
          </Text>
        ),
        cta: 'Onwards',
      }}
      fail={{
        title: 'Not quite — yet',
        body: (
          <Text>
            You need {requiredCorrect} of {LEVEL_EXAM_QUESTION_COUNT} correct
            to skip {level.name}. The questions weight toward later topics, so
            the synthesis material is what to brush up on. Try again or keep
            working through the lessons.
          </Text>
        ),
      }}
      onPass={onPass}
      onBack={onBack}
    />
  )
}
