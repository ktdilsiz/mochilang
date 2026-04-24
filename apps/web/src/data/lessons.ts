import type { Lesson } from '../types'

export const LESSONS_BY_COURSE: Record<string, Lesson[]> = {
  'zh-en': [
    {
      id: 'zh-en-lesson-1',
      title: 'Greetings',
      description: 'Learn basic hello and goodbye phrases',
      xp: 10,
      exercises: [
        {
          id: 'e1',
          type: 'multiple_choice',
          prompt: 'What does "你好" (nǐ hǎo) mean?',
          options: ['Goodbye', 'Hello', 'Thank you', 'Sorry'],
          answer: 'Hello',
        },
        {
          id: 'e2',
          type: 'multiple_choice',
          prompt: 'How do you say "Thank you" in Chinese?',
          options: ['你好', '再见', '谢谢', '对不起'],
          answer: '谢谢',
        },
        {
          id: 'e3',
          type: 'fill_blank',
          prompt: '"再见" (zài jiàn) means ___',
          answer: 'Goodbye',
          explanation: '"再见" literally means "see you again" — the standard goodbye in Mandarin.',
        },
      ],
    },
    {
      id: 'zh-en-lesson-2',
      title: 'Numbers 1–5',
      description: 'Count from one to five in Mandarin',
      xp: 10,
      exercises: [
        {
          id: 'e4',
          type: 'multiple_choice',
          prompt: 'What is "三" (sān)?',
          options: ['One', 'Two', 'Three', 'Four'],
          answer: 'Three',
        },
        {
          id: 'e5',
          type: 'multiple_choice',
          prompt: 'How do you write "five" in Chinese?',
          options: ['一', '三', '四', '五'],
          answer: '五',
        },
      ],
    },
  ],
}
