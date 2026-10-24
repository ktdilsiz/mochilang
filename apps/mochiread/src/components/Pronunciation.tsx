import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import type { JapaneseDefinition } from '@mochilang/dict';
import { readingLines } from '../lib/reading-presentation';
import type { JapaneseReadingMode, ReadingLanguage } from '../state';

type Props = {
  reading: string;
  language: ReadingLanguage;
  mode: JapaneseReadingMode;
  word?: string;
  entryId?: string;
  definition?: JapaneseDefinition;
  style?: StyleProp<TextStyle>;
};

export function Pronunciation({ reading, language, mode, word, entryId, definition, style }: Props) {
  return <View>{readingLines(reading, language, mode, word, entryId, definition).map((line, i) => <Text key={i} style={style}>{line}</Text>)}</View>;
}
