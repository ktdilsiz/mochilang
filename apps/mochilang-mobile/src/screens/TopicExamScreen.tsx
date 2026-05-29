import { Text } from 'react-native'
import {
  type Topic,
  EXAM_PASS_THRESHOLD,
  EXAM_QUESTION_COUNT,
  pickExamQuestions,
} from '@mochilang/shared'
import ExamScreen from './ExamScreen'

interface Props {
  topic: Topic
  courseId: string
  onPass: () => void
  onBack: () => void
  onWrongAnswer?: (exerciseId: string) => void
}

export default function TopicExamScreen({
  topic,
  courseId,
  onPass,
  onBack,
  onWrongAnswer,
}: Props) {
  const requiredCorrect = Math.ceil(EXAM_PASS_THRESHOLD * EXAM_QUESTION_COUNT)
  return (
    <ExamScreen
      eyebrow={`Topic exam — ${topic.title}`}
      getQuestions={() => pickExamQuestions(topic, EXAM_QUESTION_COUNT)}
      passThreshold={EXAM_PASS_THRESHOLD}
      courseId={courseId}
      pass={{
        title: 'Topic exam passed!',
        body: (
          <Text>
            You skipped {topic.title}. The next topic is now unlocked — go nail
            it.
          </Text>
        ),
      }}
      fail={{
        title: 'Not quite there',
        body: (
          <Text>
            You need {requiredCorrect} of {EXAM_QUESTION_COUNT} to pass. Try
            again, or play through the lessons in {topic.title} for full
            credit.
          </Text>
        ),
      }}
      onPass={onPass}
      onBack={onBack}
      onWrongAnswer={onWrongAnswer}
    />
  )
}
