import { Text } from 'react-native'
import {
  type Exercise,
  type Level,
  collectMistakeExercises,
  locateExercise,
} from '@mochilang/shared'
import ExamScreen from './ExamScreen'

interface Props {
  scopeLabel: string
  exerciseIds: string[]
  levels: Level[]
  onResolve: (exerciseId: string) => void
  onFail: (
    exerciseId: string,
    ctx: { lessonId: string; topicId: string; levelId: string }
  ) => void
  onBack: () => void
}

/**
 * Mobile mirror of apps/web/src/screens/PracticeMistakesScreen.tsx.
 * Drills the user on previously-failed exercises, resolves on
 * correct, increments the count on wrong.
 */
export default function PracticeMistakesScreen({
  scopeLabel,
  exerciseIds,
  levels,
  onResolve,
  onFail,
  onBack,
}: Props) {
  function getQuestions(): Exercise[] {
    return collectMistakeExercises(levels, exerciseIds)
  }

  function handleWrong(exerciseId: string) {
    const found = locateExercise(levels, exerciseId)
    if (!found) return
    onFail(exerciseId, {
      lessonId: found.lesson.id,
      topicId: found.topic.id,
      levelId: found.level.id,
    })
  }

  return (
    <ExamScreen
      eyebrow={`Practice mistakes — ${scopeLabel}`}
      getQuestions={getQuestions}
      passThreshold={0}
      pass={{
        title: 'Practice complete',
        body: (
          <Text>
            Each one you got right has been removed from your mistake deck.
            Anything you missed will stay there until you nail it.
          </Text>
        ),
        cta: 'Done',
      }}
      fail={{
        title: 'Practice complete',
        body: <Text>Come back and try again whenever.</Text>,
      }}
      onPass={() => {
        /* per-question resolution happens via onCorrectAnswer */
      }}
      onCorrectAnswer={onResolve}
      onWrongAnswer={handleWrong}
      onBack={onBack}
    />
  )
}
