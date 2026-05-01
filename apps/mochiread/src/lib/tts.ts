import * as Speech from 'expo-speech';

type Config = { rate: number; voice?: string };

let config: Config = { rate: 0.9 };

export function configureTTS(next: Config) {
  config = next;
}

export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, {
    language: 'zh-CN',
    rate: config.rate,
    pitch: 1.0,
    voice: config.voice,
  });
}

/**
 * Speak the text and resolve when playback ends (whether by completion,
 * external stop, or error). Useful for sequential playback loops where you
 * want to await each utterance before moving on.
 */
export function speakAsync(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.stop();
    Speech.speak(text, {
      language: 'zh-CN',
      rate: config.rate,
      pitch: 1.0,
      voice: config.voice,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}

export function stop() {
  Speech.stop();
}

export async function listChineseVoices(): Promise<Speech.Voice[]> {
  try {
    const all = await Speech.getAvailableVoicesAsync();
    return all
      .filter((v) => v.language?.toLowerCase().startsWith('zh'))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  } catch {
    return [];
  }
}
