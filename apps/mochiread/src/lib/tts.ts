import * as Speech from 'expo-speech';
import type { ReadingLanguage } from '../state';

type Config = { rate: number; voice?: string; japaneseVoice?: string };

let config: Config = { rate: 0.9 };

export function configureTTS(next: Config) {
  config = next;
}

export function speak(text: string, language: ReadingLanguage = 'zh') {
  Speech.stop();
  Speech.speak(text, {
    language: language === 'ja' ? 'ja-JP' : 'zh-CN',
    rate: config.rate,
    pitch: 1.0,
    voice: language === 'ja' ? config.japaneseVoice : config.voice,
  });
}

/**
 * Speak the text and resolve when playback ends (whether by completion,
 * external stop, or error). Useful for sequential playback loops where you
 * want to await each utterance before moving on.
 */
export function speakAsync(
  text: string,
  language: ReadingLanguage = 'zh'
): Promise<void> {
  return new Promise((resolve) => {
    Speech.stop();
    Speech.speak(text, {
      language: language === 'ja' ? 'ja-JP' : 'zh-CN',
      rate: config.rate,
      pitch: 1.0,
      voice: language === 'ja' ? config.japaneseVoice : config.voice,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}

export function stop() {
  Speech.stop();
}

export async function listVoices(
  language: ReadingLanguage
): Promise<Speech.Voice[]> {
  try {
    const all = await Speech.getAvailableVoicesAsync();
    return all
      .filter((v) => v.language?.toLowerCase().startsWith(language))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  } catch {
    return [];
  }
}

export const listChineseVoices = () => listVoices('zh');
