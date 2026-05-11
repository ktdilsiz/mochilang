import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from 'react-native'
import { lookup, tokenize as zhTokenize } from '@mochilang/dict'
import { translate } from '@mochilang/translate'
import { useWordTranslation } from '../lib/wordTranslation'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  /** The text to render. */
  text: string
  /** Style applied to the outer Text. */
  style?: TextStyle | TextStyle[]
}

interface Token {
  word: string
  /** True for letter/character tokens, false for whitespace/punct. */
  isWord: boolean
  pinyin?: string
}

interface ActiveLookup {
  word: string
  pinyin?: string
  source: 'pre-baked' | 'dict' | 'lingva' | 'none'
  translation: string | null
  loading: boolean
}

const CJK_RE = /[　-鿿]/
const WORD_LETTER_RE = /[\p{L}]/u
// Latin-script splitter: greedy alternation that emits whitespace,
// letter+number runs, and individual non-letter symbols separately.
const LATIN_RE = /(\s+|[\p{L}\p{N}'’\-]+|[^\s\p{L}\p{N}'’\-])/gu

function tokenize(text: string): Token[] {
  if (CJK_RE.test(text)) {
    return zhTokenize(text).map((t) => ({
      word: t.word,
      isWord: WORD_LETTER_RE.test(t.word) || CJK_RE.test(t.word),
      pinyin: t.pinyin && t.pinyin !== t.word ? t.pinyin : undefined,
    }))
  }
  const out: Token[] = []
  for (const m of text.matchAll(LATIN_RE)) {
    const w = m[0]
    out.push({ word: w, isWord: WORD_LETTER_RE.test(w) })
  }
  return out
}

const lingvaCache = new Map<string, string>()
function lingvaKey(word: string, from: string, to: string): string {
  return `${from}|${to}|${word.toLowerCase()}`
}

async function fetchLingva(
  word: string,
  from: string,
  to: string
): Promise<string | null> {
  const key = lingvaKey(word, from, to)
  const cached = lingvaCache.get(key)
  if (cached) return cached
  try {
    const r = await translate(word, { from, to })
    if (r?.translation && r.translation.length > 0) {
      lingvaCache.set(key, r.translation)
      return r.translation
    }
  } catch {
    // Network or all endpoints failed.
  }
  return null
}

/**
 * Renders text with each word independently tappable. Tapping opens
 * a translation card. When the lesson's `wordTranslations` map has
 * a pre-baked answer, that's used directly (instant); otherwise the
 * CC-CEDICT dict handles CJK words offline, and finally Lingva
 * handles anything else over the network.
 *
 * When `enabled` is false in the surrounding WordTranslationProvider
 * (e.g. ExamScreen), the component renders plain text and no taps
 * fire — so wiring it into both Lesson and Exam paths is safe.
 */
export default function TappableText({ text, style }: Props) {
  const ctx = useWordTranslation()
  const tokens = useMemo(() => tokenize(text), [text])
  const [active, setActive] = useState<ActiveLookup | null>(null)

  async function onWordTap(token: Token) {
    if (!ctx.enabled || !token.isWord) return

    // 1. Pre-baked
    const baked = ctx.wordTranslations?.[token.word]
    if (baked) {
      setActive({
        word: token.word,
        pinyin: token.pinyin,
        translation: baked,
        source: 'pre-baked',
        loading: false,
      })
      return
    }

    // 2. Offline dict — only relevant for CJK
    if (CJK_RE.test(token.word)) {
      const entry = lookup(token.word)
      if (entry) {
        setActive({
          word: token.word,
          pinyin: token.pinyin,
          translation: entry.meanings.join('; '),
          source: 'dict',
          loading: false,
        })
        return
      }
    }

    // 3. Lingva
    setActive({
      word: token.word,
      pinyin: token.pinyin,
      translation: null,
      source: 'lingva',
      loading: true,
    })
    const t = await fetchLingva(token.word, ctx.fromLang, ctx.toLang)
    setActive((curr) =>
      curr && curr.word === token.word
        ? {
            ...curr,
            translation: t ?? 'No translation available.',
            source: t ? 'lingva' : 'none',
            loading: false,
          }
        : curr
    )
  }

  return (
    <>
      <Text style={style}>
        {tokens.map((t, i) => {
          if (!t.isWord || !ctx.enabled) {
            return <Text key={i}>{t.word}</Text>
          }
          return (
            <Text key={i} onPress={() => onWordTap(t)} style={styles.tappable}>
              {t.word}
            </Text>
          )
        })}
      </Text>

      <Modal
        visible={active !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActive(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setActive(null)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {active && (
              <>
                <View style={styles.cardHeader}>
                  {active.pinyin && (
                    <Text style={styles.cardPinyin}>{active.pinyin}</Text>
                  )}
                  <Text style={styles.cardWord}>{active.word}</Text>
                </View>
                {active.loading ? (
                  <View style={styles.cardBody}>
                    <ActivityIndicator color={colors.primary500} />
                    <Text style={styles.cardLoading}>Translating…</Text>
                  </View>
                ) : (
                  <Text style={styles.cardTranslation}>
                    {active.translation ?? 'No translation available.'}
                  </Text>
                )}
                <Text style={styles.cardSource}>
                  {active.source === 'pre-baked'
                    ? 'from lesson'
                    : active.source === 'dict'
                      ? 'from dictionary'
                      : active.source === 'lingva'
                        ? 'via Lingva'
                        : ''}
                </Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  tappable: {
    // Subtle dotted underline so users discover words are tappable
    // without it being visually loud. RN doesn't support
    // `text-decoration-style: dotted` so we approximate with a
    // contrasting underline color.
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: colors.primary300,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
    borderTopWidth: 4,
    borderColor: colors.primary500,
  },
  cardHeader: { gap: 2 },
  cardPinyin: {
    fontSize: fontSizes.sm,
    color: colors.primary700,
    fontFamily: 'Nunito_700Bold',
  },
  cardWord: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    fontFamily: 'Nunito_900Black',
  },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardLoading: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cardTranslation: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: fontSizes.md * 1.45,
    fontFamily: 'Nunito_600SemiBold',
  },
  cardSource: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
})
