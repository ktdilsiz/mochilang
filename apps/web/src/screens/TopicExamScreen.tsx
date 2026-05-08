import {
  type Topic,
  EXAM_PASS_THRESHOLD,
  EXAM_QUESTION_COUNT,
  pickExamQuestions,
} from '@mochilang/shared'
import ExamScreen from './ExamScreen'

interface Props {
  topic: Topic
  onPass: () => void
  onBack: () => void
}

/**
 * Thin wrapper that configures the generic ExamScreen for the topic-
 * skip flow: 20 random questions across all lessons in the topic, 80%
 * to pass.
 */
export default function TopicExamScreen({ topic, onPass, onBack }: Props) {
  const requiredCorrect = Math.ceil(EXAM_PASS_THRESHOLD * EXAM_QUESTION_COUNT)
  return (
    <ExamScreen
      eyebrow={`Topic exam — ${topic.title}`}
      getQuestions={() => pickExamQuestions(topic, EXAM_QUESTION_COUNT)}
      passThreshold={EXAM_PASS_THRESHOLD}
      pass={{
        title: 'Topic exam passed!',
        body: (
          <>
            You skipped <strong>{topic.title}</strong>. The next topic is now
            unlocked — go nail it.
          </>
        ),
      }}
      fail={{
        title: 'Not quite there',
        body: (
          <>
            You need {requiredCorrect} of {EXAM_QUESTION_COUNT} to pass. Try
            again, or play through the lessons in {topic.title} for full
            credit.
          </>
        ),
      }}
      onPass={onPass}
      onBack={onBack}
    />
  )
}
