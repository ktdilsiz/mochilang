import {
  type Exercise,
  type Level,
  collectMistakeExercises,
  locateExercise,
} from '@mochilang/shared'
import ExamScreen from './ExamScreen'

interface Props {
  /** Display label like "Lesson · Greetings 3" or "Topic · Family". */
  scopeLabel: string
  /** Exercise ids to drill. Order is preserved; missing ones are dropped. */
  exerciseIds: string[]
  /** Course content — used to resolve exercise ids and find context. */
  levels: Level[]
  /** Drop a mistake when the user finally gets it right. */
  onResolve: (exerciseId: string) => void
  /**
   * Re-record a failure when the user gets a previously-failed exercise
   * wrong again. Caller passes the same context-aware `record(id, ctx)`
   * used during regular play; we look up the lesson/topic/level here.
   */
  onFail: (
    exerciseId: string,
    ctx: { lessonId: string; topicId: string; levelId: string }
  ) => void
  onBack: () => void
}

/**
 * PracticeMistakesScreen — drills the user on previously-failed
 * exercises until they get them right. Built on top of ExamScreen
 * with a 0% pass threshold (always "passes"); the result page just
 * summarizes how many got resolved versus how many still need work.
 *
 * Each correct answer calls `onResolve`, removing the mistake from
 * the user's deck. Each wrong answer calls `onFail`, bumping its
 * count. The deck is built fresh on every mount; if the user retries
 * after the result screen, the exam screen re-runs `getQuestions`
 * and rebuilds against the *current* mistake set so resolved ones
 * fall away mid-session.
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
      // No real "pass" — the result page is just a summary. Any score
      // shows the success body so the user gets a friendly close-out.
      passThreshold={0}
      pass={{
        title: 'Practice complete',
        body: (
          <>
            Each one you got right has been removed from your mistake deck.
            Anything you missed will stay there until you nail it.
          </>
        ),
        cta: 'Done',
      }}
      // Threshold is 0, so the fail screen is unreachable in practice —
      // but ExamScreen still requires the prop, so populate it sanely.
      fail={{
        title: 'Practice complete',
        body: <>Come back and try again whenever.</>,
      }}
      onPass={() => {
        /* nothing — resolves happened per-question via onCorrectAnswer */
      }}
      onCorrectAnswer={onResolve}
      onWrongAnswer={handleWrong}
      onBack={onBack}
    />
  )
}
