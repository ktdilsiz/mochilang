import type { FillBlankExercise, TranslateExercise } from '@mochilang/shared'
import { matchesAnswer } from '@mochilang/shared'

/** Grade typed exercises using the shared answer normalization rules. */
export function checkTypedAnswer(
  value: string,
  exercise: FillBlankExercise | TranslateExercise
): boolean {
  return matchesAnswer(value, exercise)
}
