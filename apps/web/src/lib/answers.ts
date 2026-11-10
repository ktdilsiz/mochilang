import type { FillBlankExercise, TranslateExercise } from '@mochilang/core'
import { matchesAnswer } from '@mochilang/core'

/** Grade typed exercises using the shared answer normalization rules. */
export function checkTypedAnswer(
  value: string,
  exercise: FillBlankExercise | TranslateExercise
): boolean {
  return matchesAnswer(value, exercise)
}
