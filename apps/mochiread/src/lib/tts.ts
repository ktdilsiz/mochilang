import * as Speech from 'expo-speech';
import type { ReadingLanguage } from '../state';

type Config = { rate: number; voice?: string; japaneseVoice?: string };

let config: Config = { rate: 0.9 };
let generation = 0;
let finishPending: (() => void) | undefined;

export function configureTTS(next: Config) {
  config = next;
}

export function speak(text: string, language: ReadingLanguage = 'zh') {
  void speakAsync(text, language);
}

/**
 * Speak the text and resolve when playback ends (whether by completion,
 * external stop, or error). Useful for sequential playback loops where you
 * want to await each utterance before moving on.
 */
export async function speakAsync(
  text: string,
  language: ReadingLanguage = 'zh',
  onBoundary?: (charIndex: number) => void
): Promise<void> {
  stop();
  const request = generation;
  await Speech.stop().catch(() => {});
  let voice = language === 'ja' ? config.japaneseVoice : config.voice;
  if (voice) {
    const voices = await listVoices(language);
    if (!voices.some((candidate) => candidate.identifier === voice)) voice = undefined;
  }
  if (request !== generation || !text.trim()) return;
  return new Promise((resolve) => {
    const finish = () => {
      if (finishPending === finish) finishPending = undefined;
      resolve();
    };
    finishPending = finish;
    try { Speech.speak(text, {
      language: language === 'ja' ? 'ja-JP' : 'zh-CN',
      rate: config.rate,
      pitch: 1.0,
      voice,
      onBoundary: (event: { charIndex: number }) => {
        if (request === generation) onBoundary?.(event.charIndex);
      },
      onDone: finish,
      onStopped: finish,
      onError: finish,
    }); } catch { finish(); }
  });
}

export function stop() {
  generation++;
  finishPending?.();
  void Speech.stop().catch(() => {});
}

export async function listVoices(
  language: ReadingLanguage
): Promise<Speech.Voice[]> {
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const all = await Promise.race([
      Speech.getAvailableVoicesAsync(),
      new Promise<Speech.Voice[]>((resolve) => { timer = setTimeout(() => resolve([]), 1500); }),
    ]).finally(() => clearTimeout(timer));
    return all
      .filter((v) => v.language?.toLowerCase().startsWith(language))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  } catch {
    return [];
  }
}

export const listChineseVoices = () => listVoices('zh');
