export type ExerciseType = 'multiple_choice' | 'fill_blank'

export interface Exercise {
  id: string
  type: ExerciseType
  prompt: string
  options?: string[] // for multiple_choice
  answer: string
  explanation?: string
}

export interface Lesson {
  id: string
  title: string
  description: string
  xp: number
  exercises: Exercise[]
}

export interface Language {
  code: string
  name: string
  flag: string
  available: boolean
}

export interface Course {
  from: Language
  to: Language
}
