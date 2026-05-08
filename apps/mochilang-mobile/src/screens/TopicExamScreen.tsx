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
  onPass: () => void
  onBack: () => void
}

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
    />
  )
}
