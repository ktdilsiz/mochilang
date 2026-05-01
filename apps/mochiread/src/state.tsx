import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpeechRate = 'slow' | 'normal' | 'fast';

export type Preferences = {
  fontSize: FontSize;
  showPinyin: boolean;
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
};

const DEFAULT_PREFS: Preferences = {
  fontSize: 'md',
  showPinyin: true,
  speechRate: 'normal',
  autoPlay: true,
};

const KEY_PREFS = 'mochiread:prefs';
const KEY_LIBRARY = 'mochiread:library';
const KEY_VOCAB = 'mochiread:vocab';
const KEY_SEEDED = 'mochiread:seeded';

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
        const [p, l, v, seeded] = await Promise.all([
          AsyncStorage.getItem(KEY_PREFS),
          AsyncStorage.getItem(KEY_LIBRARY),
          AsyncStorage.getItem(KEY_VOCAB),
          AsyncStorage.getItem(KEY_SEEDED),
        ]);
        if (p) setPrefsState({ ...DEFAULT_PREFS, ...JSON.parse(p) });
        if (seeded) {
          if (l) setLibrary(JSON.parse(l));
        } else {
          setLibrary(SEED_LIBRARY);
          AsyncStorage.setItem(KEY_SEEDED, '1');
        }
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
          return [
            {
              ...entry,
              savedAt: Date.now(),
              remembered: 0,
              forgotten: 0,
            },
            ...prev,
          ];
        }),
      removeWord: (word) =>
        setVocab((prev) => prev.filter((v) => v.word !== word)),
      isWordSaved: (word) => vocab.some((v) => v.word === word),
      recordReview: (word, remembered) =>
        setVocab((prev) =>
          prev.map((v) =>
            v.word === word
              ? {
                  ...v,
                  remembered: v.remembered + (remembered ? 1 : 0),
                  forgotten: v.forgotten + (remembered ? 0 : 1),
                  lastReviewedAt: Date.now(),
                }
              : v
          )
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
  return items.map((item, i) => ({
    id: `seed-${i + 1}`,
    title: item.title,
    text: item.text,
    createdAt: now - i * 60_000,
  }));
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
