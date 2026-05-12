import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  api,
  ApiError,
  COMMUNITY_PACK_SCHEMA_VERSION,
  type CommunityPackEnvelope,
} from '@mochilang/shared'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  onBack: () => void
  onPublished: (packId: string) => void
}

/**
 * Submit a community pack via paste-JSON. The full envelope (metadata +
 * level) is what authors paste; we do a light client-side parse to
 * surface obvious JSON errors before round-tripping to the server, then
 * the server re-validates strictly.
 *
 * Two-step flow: if the API responds with "handle_required" on submit,
 * we prompt for a handle inline and retry the submission once it's set.
 *
 * File-upload UX is intentionally deferred — adding expo-document-picker
 * here would mean a native rebuild, so for now authors paste the
 * contents of their .json file. A small starter template at the top
 * shows the expected shape.
 */
export default function CommunitySubmitScreen({ onBack, onPublished }: Props) {
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState('')
  const [handle, setHandle] = useState('')
  const [showHandlePrompt, setShowHandlePrompt] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function loadStarter() {
    setDraft(STARTER_TEMPLATE)
  }

  async function publish(parsed: CommunityPackEnvelope) {
    setBusy(true)
    setError(null)
    try {
      const r = await api.community.submit(parsed)
      onPublished(r.id)
    } catch (err) {
      if (err instanceof ApiError) {
        // The server returns 409 with code=handle_required when the user
        // hasn't picked a public handle yet.
        if (err.status === 409 && err.message.includes('handle_required')) {
          setShowHandlePrompt(true)
          return
        }
        setError(err.message)
      } else {
        setError(String(err))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit() {
    setError(null)
    let parsed: CommunityPackEnvelope
    try {
      parsed = JSON.parse(draft) as CommunityPackEnvelope
    } catch {
      setError('That doesn’t look like valid JSON. Double-check braces and quotes.')
      return
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.title !== 'string' ||
      typeof parsed.slug !== 'string'
    ) {
      setError('Missing required fields (title, slug). See the template above.')
      return
    }
    if (parsed.schemaVersion !== COMMUNITY_PACK_SCHEMA_VERSION) {
      parsed.schemaVersion = COMMUNITY_PACK_SCHEMA_VERSION
    }
    await publish(parsed)
  }

  async function handleSetHandle() {
    const trimmed = handle.trim().toLowerCase()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed) || trimmed.length < 2 || trimmed.length > 24) {
      Alert.alert('Invalid handle', 'Handles must be 2–24 chars, lowercase letters / digits / dashes.')
      return
    }
    setBusy(true)
    try {
      await api.community.setHandle(trimmed)
      setShowHandlePrompt(false)
      // Retry the submission now that we have a handle.
      let parsed: CommunityPackEnvelope
      try {
        parsed = JSON.parse(draft) as CommunityPackEnvelope
        parsed.schemaVersion = COMMUNITY_PACK_SCHEMA_VERSION
      } catch {
        setError('Pack JSON became unparseable; please re-paste.')
        return
      }
      await publish(parsed)
    } catch (err) {
      if (err instanceof ApiError) {
        Alert.alert('Couldn’t set handle', err.message)
      } else {
        Alert.alert('Couldn’t set handle', String(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.shell}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Submit a pack</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.tagline}>
          Paste your pack JSON below. Need a starting point? Tap{' '}
          <Text style={styles.inlineLink} onPress={loadStarter}>
            "Load template"
          </Text>{' '}
          to fill the editor with an example.
        </Text>

        <View style={styles.toolbar}>
          <TouchableOpacity onPress={loadStarter} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>📋 Load template</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDraft('')} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>✕ Clear</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="{ ...paste your pack JSON here }"
          placeholderTextColor={colors.textSubtle}
          multiline
          style={styles.editor}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {showHandlePrompt && (
          <View style={styles.handleBox}>
            <Text style={styles.handleTitle}>Pick a public handle</Text>
            <Text style={styles.handleHint}>
              Your handle shows up next to packs you publish. Lowercase letters, digits,
              and dashes (2–24 chars). You can't change it later.
            </Text>
            <TextInput
              value={handle}
              onChangeText={setHandle}
              placeholder="e.g. mochi-fan"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.handleInput}
              maxLength={24}
            />
            <LedgeButton
              label={busy ? 'Saving…' : 'Save handle & publish'}
              tone="primary"
              onPress={() => void handleSetHandle()}
              disabled={busy || !handle.trim()}
            />
          </View>
        )}

        <LedgeButton
          label={busy ? 'Publishing…' : 'Publish'}
          tone="primary"
          size="lg"
          onPress={() => void handleSubmit()}
          disabled={busy || !draft.trim()}
        />

        {busy && (
          <View style={styles.busy}>
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// Reference template — one lesson per supported exercise type so authors
// can copy the JSON shape they need. Rename slug + title before publishing,
// or strip out the lessons you don't want. Themes used: greetings, basics,
// food, numbers, questions (full allowed set lives in the server's
// internal/community/pack.go `allowedThemes`).
const STARTER_TEMPLATE = `{
  "schemaVersion": 1,
  "slug": "rename-me-before-publishing",
  "sourceLang": "en",
  "targetLang": "tr",
  "title": "Exercise Types Demo",
  "description": "Reference pack showing every exercise variant Mochilang supports. Rename the slug and title before publishing.",
  "level": {
    "id": "demo",
    "name": "Exercise Showcase",
    "description": "One lesson per exercise type — copy the JSON shape you need into your own pack.",
    "topics": [
      {
        "id": "showcase",
        "title": "Exercise Types",
        "description": "Each lesson uses a different exercise variant",
        "theme": "basics",
        "lessons": [
          {
            "id": "multiple-choice",
            "title": "Multiple choice",
            "description": "Pick the right translation",
            "theme": "greetings",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "multiple_choice",
                "prompt": "What does 'Merhaba' mean?",
                "options": ["Hello", "Goodbye", "Thanks", "Sorry"],
                "answer": "Hello",
                "explanation": "Merhaba is the most common Turkish greeting."
              }
            ]
          },
          {
            "id": "fill-blank",
            "title": "Fill in the blank",
            "description": "Type the missing word",
            "theme": "basics",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "fill_blank",
                "prompt": "Type the Turkish word for 'cat': ___",
                "answer": "kedi",
                "acceptableAnswers": ["Kedi"]
              }
            ]
          },
          {
            "id": "match-pairs",
            "title": "Match pairs",
            "description": "Connect each English word with its Turkish translation",
            "theme": "food",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "match_pairs",
                "prompt": "Match each food word with its Turkish translation",
                "pairs": [
                  { "left": "bread", "right": "ekmek" },
                  { "left": "water", "right": "su" },
                  { "left": "apple", "right": "elma" }
                ]
              }
            ]
          },
          {
            "id": "listen-and-choose",
            "title": "Listen and choose",
            "description": "Tap the word you hear",
            "theme": "numbers",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "listen_and_choose",
                "prompt": "Which number did you hear?",
                "spokenText": "üç",
                "options": ["bir", "iki", "üç", "dört"],
                "answer": "üç",
                "explanation": "üç means three."
              }
            ]
          },
          {
            "id": "tap-words-in-order",
            "title": "Tap words in order",
            "description": "Build the sentence by tapping the words in the right order",
            "theme": "questions",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "tap_words_in_order",
                "prompt": "Translate: 'I am good'",
                "answer": "Ben iyiyim",
                "bank": ["Ben", "iyiyim", "kötüyüm", "sen"]
              }
            ]
          },
          {
            "id": "dialogue",
            "title": "Dialogue",
            "description": "A short scripted conversation with two interactive prompts",
            "theme": "greetings",
            "xp": 10,
            "exercises": [
              {
                "id": "ex1",
                "type": "dialogue",
                "prompt": "At the café",
                "speakers": [
                  { "id": "you", "name": "You" },
                  { "id": "barista", "name": "Barista" }
                ],
                "turns": [
                  { "kind": "line", "speaker": "barista", "text": "Merhaba! Ne istersiniz?" },
                  {
                    "kind": "choice",
                    "speaker": "you",
                    "prompt": "Order a coffee",
                    "options": ["Bir kahve, lütfen.", "Bir çay, lütfen.", "Hoşçakal."],
                    "answer": "Bir kahve, lütfen."
                  },
                  { "kind": "line", "speaker": "barista", "text": "Tabii ki, hemen geliyor." },
                  {
                    "kind": "fill",
                    "speaker": "you",
                    "prompt": "Ask the price",
                    "before": "Ne kadar ",
                    "after": "?",
                    "answer": "tutar"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
`

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLink: { color: colors.textMuted, fontWeight: '800', fontSize: fontSizes.sm },
  title: { fontSize: fontSizes.xl, fontWeight: '900', color: colors.text },
  tagline: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
  inlineLink: { color: colors.primary700, fontWeight: '900' },
  toolbar: { flexDirection: 'row', gap: space.sm },
  toolBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  toolBtnText: { fontWeight: '800', color: colors.text, fontSize: fontSizes.xs },
  editor: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 260,
    color: colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    textAlignVertical: 'top',
  },
  errorBox: {
    backgroundColor: colors.error100,
    borderRadius: radius.md,
    padding: space.md,
  },
  errorText: { color: colors.error700, fontWeight: '700', fontSize: fontSizes.sm },
  handleBox: {
    backgroundColor: colors.cream100,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  handleTitle: { fontSize: fontSizes.md, fontWeight: '900', color: colors.text },
  handleHint: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 18 },
  handleInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  busy: { alignItems: 'center', paddingTop: space.md },
})
