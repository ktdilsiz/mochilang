import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { ReadingLanguage } from '../../storage/schema';

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
  onBoundary?: (charIndex: number, charLength?: number) => void,
  onStart?: () => void
): Promise<void> {
  stop();
  const request = generation;
  await Speech.stop().catch(() => {});
  let voice = language === 'ja' ? config.japaneseVoice : config.voice;
  const voices = await listVoices(language);
  if (!voices.some((candidate) => candidate.identifier === voice)) {
    voice = voices[0]?.identifier;
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
      onStart: () => { if (request === generation) onStart?.(); },
      onBoundary: (event: { charIndex: number; charLength?: number; name?: string }) => {
        if (request === generation && (!event.name || event.name === 'word') && event.charIndex < text.length) onBoundary?.(event.charIndex, event.charLength);
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

export type ReadingVoice = Speech.Voice & { localService?: boolean };

// Names are hints, not a quality guarantee. Prefer the requested dialect first,
// then explicitly advertised higher-quality voices and browser Google voices.
function voiceScore(voice: ReadingVoice, language: ReadingLanguage) {
  const locale = voice.language.toLowerCase().replace(/_/g, '-');
  let score = locale === (language === 'ja' ? 'ja-jp' : 'zh-cn') ? 100 : 0;
  if (language === 'zh' && locale.startsWith('zh-hk')) score -= 100;
  if (/natural|neural|premium/iu.test(voice.name)) score += 40;
  if (voice.quality === Speech.VoiceQuality.Enhanced || /enhanced/iu.test(voice.name)) score += 30;
  if (/google/iu.test(voice.name)) score += 20;
  // Prefer standard language voices over macOS character variants when none
  // advertise a quality tier. Keep every variant available for manual choice.
  if (/^(ting[ -]?ting|meijia|kyoko|otoya)$/iu.test(voice.name)) score += 10;
  return score;
}

export async function listVoices(
  language: ReadingLanguage
): Promise<ReadingVoice[]> {
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const all = await Promise.race([
      Platform.OS === 'web' ? browserVoices() : Speech.getAvailableVoicesAsync(),
      new Promise<Speech.Voice[]>((resolve) => { timer = setTimeout(() => resolve([]), 1500); }),
    ]).finally(() => clearTimeout(timer));
    return all
      .filter((v) => v.language?.toLowerCase().startsWith(language))
      .sort((a, b) => voiceScore(b, language) - voiceScore(a, language) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

async function browserVoices(): Promise<ReadingVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const synth = window.speechSynthesis;
  if (!synth.getVoices().length) {
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        synth.removeEventListener('voiceschanged', done);
        resolve();
      };
      const timer = setTimeout(done, 1200);
      synth.addEventListener('voiceschanged', done);
      if (synth.getVoices().length) done();
    });
  }
  return synth.getVoices().map((voice) => ({
    identifier: voice.voiceURI,
    name: voice.name,
    language: voice.lang,
    quality: Speech.VoiceQuality.Default,
    localService: voice.localService,
  }));
}

export const listChineseVoices = () => listVoices('zh');
