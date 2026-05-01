import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HSK3_SENTENCES } from './data/hsk3-sentences';

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpeechRate = 'slow' | 'normal' | 'fast';
export type PinyinMode = 'on' | 'off' | 'hint';

export type ThemeMode = 'system' | 'light' | 'dark';

export type Preferences = {
  fontSize: FontSize;
  pinyinMode: PinyinMode;
  showToneColors: boolean;
  themeMode: ThemeMode;
  speechRate: SpeechRate;
  autoPlay: boolean;
  voiceId?: string;
};

export const SPEECH_RATE_VALUES: Record<SpeechRate, number> = {
  slow: 0.7,
  normal: 0.9,
  fast: 1.15,
};

export type LibraryEntry = {
  id: string;
  title: string;
  text: string;
  createdAt: number;
};

export type VocabEntry = {
  word: string;
  pinyin: string;
  meanings: string[];
  savedAt: number;
  remembered: number;
  forgotten: number;
  lastReviewedAt?: number;
  /** SM-2 ease factor; starts at 2.5, floored at 1.3. */
  ease: number;
  /** SM-2 interval in days. 0 = never reviewed. */
  intervalDays: number;
  /** Timestamp (ms) when the card is next due for review. */
  dueAt: number;
};

const DEFAULT_PREFS: Preferences = {
  fontSize: 'md',
  pinyinMode: 'hint',
  showToneColors: true,
  themeMode: 'system',
  speechRate: 'normal',
  autoPlay: true,
};

/**
 * Migrate legacy preferences. The old store used `showPinyin: boolean`; the
 * new tri-state `pinyinMode` replaces it. We respect an explicit
 * showPinyin: false (= 'off'); anyone else lands on the new 'hint' default.
 */
function migratePrefs(raw: unknown): Partial<Preferences> {
  if (!raw || typeof raw !== 'object') return {};
  const next: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  if ('showPinyin' in next && next.pinyinMode === undefined) {
    next.pinyinMode = next.showPinyin === false ? 'off' : 'hint';
  }
  delete next.showPinyin;
  return next as Partial<Preferences>;
}

const KEY_PREFS = 'mochiread:prefs';
const KEY_LIBRARY = 'mochiread:library';
const KEY_VOCAB = 'mochiread:vocab';
const KEY_SEEDED = 'mochiread:seeded';
const KEY_INTRODUCED = 'mochiread:introduced-seeds';

const ORIGINAL_SEED_IDS = ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5'];

type Store = {
  hydrated: boolean;
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
  library: LibraryEntry[];
  saveText: (text: string) => LibraryEntry;
  removeText: (id: string) => void;
  vocab: VocabEntry[];
  saveWord: (entry: Pick<VocabEntry, 'word' | 'pinyin' | 'meanings'>) => void;
  removeWord: (word: string) => void;
  isWordSaved: (word: string) => boolean;
  recordReview: (word: string, remembered: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFS);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [p, l, v, seeded, introducedRaw] = await Promise.all([
          AsyncStorage.getItem(KEY_PREFS),
          AsyncStorage.getItem(KEY_LIBRARY),
          AsyncStorage.getItem(KEY_VOCAB),
          AsyncStorage.getItem(KEY_SEEDED),
          AsyncStorage.getItem(KEY_INTRODUCED),
        ]);
        if (p) {
          setPrefsState({ ...DEFAULT_PREFS, ...migratePrefs(JSON.parse(p)) });
        }

        // Track which seeds have been introduced (added at least once). Once a
        // seed is introduced, the user can delete it without us re-adding.
        const introduced = new Set<string>(
          introducedRaw ? (JSON.parse(introducedRaw) as string[]) : []
        );
        // Migrate legacy users: if KEY_SEEDED was set but introduced is empty,
        // assume the original 5 seeds were introduced.
        if (seeded && introduced.size === 0) {
          ORIGINAL_SEED_IDS.forEach((id) => introduced.add(id));
        }

        const existingLibrary: LibraryEntry[] = l ? JSON.parse(l) : [];
        const newSeeds = SEED_LIBRARY.filter((s) => !introduced.has(s.id));
        for (const s of newSeeds) introduced.add(s.id);
        const nextLibrary = [...newSeeds, ...existingLibrary];
        setLibrary(nextLibrary);

        AsyncStorage.setItem(KEY_INTRODUCED, JSON.stringify([...introduced]));
        if (!seeded) AsyncStorage.setItem(KEY_SEEDED, '1');
        if (v) {
          const parsed = JSON.parse(v) as Partial<VocabEntry>[];
          setVocab(
            parsed
              .filter((e): e is Partial<VocabEntry> & { word: string } => !!e?.word)
              .map((e) => ({
                word: e.word,
                pinyin: e.pinyin ?? '',
                meanings: e.meanings ?? [],
                savedAt: e.savedAt ?? Date.now(),
                remembered: e.remembered ?? 0,
                forgotten: e.forgotten ?? 0,
                lastReviewedAt: e.lastReviewedAt,
                ease: e.ease ?? 2.5,
                intervalDays: e.intervalDays ?? 0,
                dueAt: e.dueAt ?? Date.now(),
              }))
          );
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEY_PREFS, JSON.stringify(prefs));
  }, [prefs, hydrated]);
  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEY_LIBRARY, JSON.stringify(library));
  }, [library, hydrated]);
  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(KEY_VOCAB, JSON.stringify(vocab));
  }, [vocab, hydrated]);

  const value = useMemo<Store>(() => {
    return {
      hydrated,
      prefs,
      setPrefs: (patch) => setPrefsState((prev) => ({ ...prev, ...patch })),
      library,
      saveText: (text) => {
        const existing = library.find((e) => e.text === text);
        if (existing) return existing;
        const entry: LibraryEntry = {
          id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
          title: makeTitle(text),
          text,
          createdAt: Date.now(),
        };
        setLibrary((prev) => [entry, ...prev]);
        return entry;
      },
      removeText: (id) => setLibrary((prev) => prev.filter((e) => e.id !== id)),
      vocab,
      saveWord: (entry) =>
        setVocab((prev) => {
          if (prev.some((v) => v.word === entry.word)) return prev;
          const now = Date.now();
          return [
            {
              ...entry,
              savedAt: now,
              remembered: 0,
              forgotten: 0,
              ease: 2.5,
              intervalDays: 0,
              dueAt: now,
            },
            ...prev,
          ];
        }),
      removeWord: (word) =>
        setVocab((prev) => prev.filter((v) => v.word !== word)),
      isWordSaved: (word) => vocab.some((v) => v.word === word),
      recordReview: (word, remembered) =>
        setVocab((prev) =>
          prev.map((v) => (v.word === word ? applySm2(v, remembered) : v))
        ),
    };
  }, [hydrated, prefs, library, vocab]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

function makeTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 32) return cleaned || 'Untitled';
  return cleaned.slice(0, 32) + '…';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Simplified SM-2 with a binary remembered/forgot grade.
 *
 * Forgot: reset interval to 1 day, knock the ease factor down by 0.2
 *   (floored at 1.3). Card returns tomorrow.
 * Remembered: 1st time → 1 day; 2nd → 6 days; thereafter previous interval ×
 *   ease. Ease nudges up by 0.05 per success, capped at 3.0.
 */
function applySm2(v: VocabEntry, remembered: boolean): VocabEntry {
  const now = Date.now();
  if (!remembered) {
    return {
      ...v,
      forgotten: v.forgotten + 1,
      ease: Math.max(1.3, v.ease - 0.2),
      intervalDays: 1,
      dueAt: now + DAY_MS,
      lastReviewedAt: now,
    };
  }
  let nextInterval: number;
  if (v.intervalDays === 0) nextInterval = 1;
  else if (v.intervalDays < 6) nextInterval = 6;
  else nextInterval = Math.round(v.intervalDays * v.ease);
  const nextEase = Math.min(3.0, v.ease + 0.05);
  return {
    ...v,
    remembered: v.remembered + 1,
    ease: nextEase,
    intervalDays: nextInterval,
    dueAt: now + nextInterval * DAY_MS,
    lastReviewedAt: now,
  };
}

const SEED_LIBRARY: LibraryEntry[] = (() => {
  const now = Date.now();
  const items: Array<Omit<LibraryEntry, 'id' | 'createdAt'>> = [
    {
      title: 'Greeting',
      text: '你好，世界！我喜欢吃苹果。今天天气很好。',
    },
    {
      title: 'Coffee with a friend',
      text: '今天我去咖啡店喝咖啡。我的朋友也来了。我们一起聊天，很开心。',
    },
    {
      title: 'About me',
      text: '我叫小明，是中国人。我在北京工作，做老师。我喜欢看书和听音乐。',
    },
    {
      title: 'Proverb · 路遥知马力',
      text: '路遥知马力，日久见人心。',
    },
    {
      title: '静夜思 · Li Bai',
      text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
    },
  ];
  const baseSeeds = items.map((item, i) => ({
    id: `seed-${i + 1}`,
    title: item.title,
    text: item.text,
    createdAt: now - i * 60_000,
  }));

  const HSK3_CHUNK = 30;
  const hskSeeds: LibraryEntry[] = [];
  for (let i = 0; i < HSK3_SENTENCES.length; i += HSK3_CHUNK) {
    const slice = HSK3_SENTENCES.slice(i, i + HSK3_CHUNK);
    const setNumber = i / HSK3_CHUNK + 1;
    hskSeeds.push({
      id: `seed-hsk3-${setNumber}`,
      title: `HSK 3 · Set ${setNumber} (${i + 1}–${i + slice.length})`,
      text: slice.join(''),
      createdAt: now - (items.length + setNumber) * 60_000,
    });
  }

  return [...baseSeeds, ...hskSeeds];
})();

export const FONT_SIZE_VALUES: Record<FontSize, number> = {
  sm: 22,
  md: 28,
  lg: 34,
  xl: 42,
};

export const PINYIN_SIZE_VALUES: Record<FontSize, number> = {
  sm: 11,
  md: 13,
  lg: 16,
  xl: 19,
};
