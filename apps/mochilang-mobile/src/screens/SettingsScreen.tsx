import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  type AppSettings,
  type SpeechRate,
  type ThemeMode,
  type VoiceGender,
  SPEECH_RATE_LABELS,
  THEME_LABELS,
  VOICE_LABELS,
} from '@mochilang/shared'
import { useSettings } from '../state/useSettings'
import LedgeButton from '../components/LedgeButton'
import { colors, fontSizes, radius, space } from '../lib/theme'

interface Props {
  onBack: () => void
}

const VOICE_OPTIONS: VoiceGender[] = ['auto', 'female', 'male']
const SPEECH_RATE_OPTIONS: SpeechRate[] = [0.7, 0.85, 1.0, 1.15, 1.3]
const THEME_OPTIONS: ThemeMode[] = ['system', 'light', 'dark']
const XP_GOAL_OPTIONS: AppSettings['dailyXpGoal'][] = [10, 20, 30, 50]

export default function SettingsScreen({ onBack }: Props) {
  const { state, update, reset } = useSettings()

  return (
    <ScrollView style={styles.shell} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={16}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Section title="Audio">
        <Segmented
          label="Voice"
          description="Voice used to read prompts in listening exercises."
          options={VOICE_OPTIONS}
          getLabel={(v) => VOICE_LABELS[v]}
          value={state.voice}
          onChange={(v) => update('voice', v)}
        />
        <Segmented
          label="Speech rate"
          description="Slow down for new languages or speed up to challenge yourself."
          options={SPEECH_RATE_OPTIONS}
          getLabel={(v) => SPEECH_RATE_LABELS[v]}
          value={state.speechRate}
          onChange={(v) => update('speechRate', v)}
        />
        <Toggle
          label="Sound effects"
          description="Short cues on correct / incorrect answers."
          value={state.soundEffects}
          onChange={(v) => update('soundEffects', v)}
        />
        <Toggle
          label="Auto-play audio"
          description="Play the audio clip automatically when a listening exercise opens."
          value={state.autoPlayAudio}
          onChange={(v) => update('autoPlayAudio', v)}
        />
      </Section>

      <Section title="Learning">
        <Segmented
          label="Daily XP goal"
          description="Target XP for a complete day. Drives the streak banner."
          options={XP_GOAL_OPTIONS}
          getLabel={(v) => `${v} XP`}
          value={state.dailyXpGoal}
          onChange={(v) => update('dailyXpGoal', v)}
        />
        <Toggle
          label="Show pinyin"
          description="Display pinyin under Chinese prompts in lessons and guides."
          value={state.showPinyin}
          onChange={(v) => update('showPinyin', v)}
        />
      </Section>

      <Section title="Feel">
        <Segmented
          label="Theme"
          description="Light, dark, or follow your device."
          options={THEME_OPTIONS}
          getLabel={(v) => THEME_LABELS[v]}
          value={state.theme}
          onChange={(v) => update('theme', v)}
        />
        <Toggle
          label="Animations"
          description="Pulse rings, bounces, and other path animations."
          value={state.animations}
          onChange={(v) => update('animations', v)}
        />
        <Toggle
          label="Haptics"
          description="Vibration on correct / incorrect answers."
          value={state.haptics}
          onChange={(v) => update('haptics', v)}
        />
      </Section>

      <View style={{ alignItems: 'center', marginTop: space.lg }}>
        <LedgeButton
          label="Reset to defaults"
          tone="neutral"
          onPress={() => {
            Alert.alert('Reset settings?', 'Restore all settings to their defaults.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => reset() },
            ])
          }}
        />
      </View>
    </ScrollView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: space.lg }}>{children}</View>
    </View>
  )
}

interface ToggleProps {
  label: string
  description?: string
  value: boolean
  onChange: (next: boolean) => void
}

function Toggle({ label, description, value, onChange }: ToggleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary500, false: colors.border }}
        thumbColor={colors.surface}
      />
    </View>
  )
}

interface SegmentedProps<T extends string | number> {
  label: string
  description?: string
  options: readonly T[]
  getLabel: (value: T) => string
  value: T
  onChange: (next: T) => void
}

function Segmented<T extends string | number>({
  label,
  description,
  options,
  getLabel,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      <View style={styles.segments}>
        {options.map((opt) => {
          const active = opt === value
          return (
            <TouchableOpacity
              key={String(opt)}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {getLabel(opt)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 80, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, color: colors.text },
  title: { fontSize: fontSizes.xxl, fontWeight: '900', color: colors.text },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    color: colors.textSubtle,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: fontSizes.md, fontWeight: '800', color: colors.text },
  rowDesc: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 16 },
  segments: {
    flexDirection: 'row',
    backgroundColor: colors.cream100,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 2,
    borderColor: colors.border,
    flexWrap: 'wrap',
    gap: 2,
  },
  segment: {
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: fontSizes.sm,
    fontWeight: '800',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
})
