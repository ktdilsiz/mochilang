import {
  type AppSettings,
  type SpeechRate,
  type ThemeMode,
  type VoiceGender,
  SPEECH_RATE_LABELS,
  THEME_LABELS,
  VOICE_LABELS,
} from '@mochilang/shared'
import { useSettings } from '../settings'
import './SettingsScreen.css'

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
    <div className="settings-shell">
      <header className="settings-header">
        <button type="button" className="settings-back" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1 className="settings-title">Settings</h1>
      </header>

      <section className="settings-section">
        <h2>Audio</h2>
        <SegmentedControl
          label="Voice"
          description="Voice used to read prompts in listening exercises."
          options={VOICE_OPTIONS}
          getLabel={(v) => VOICE_LABELS[v]}
          value={state.voice}
          onChange={(v) => update('voice', v)}
        />
        <SegmentedControl
          label="Speech rate"
          description="Slow down for new languages or speed up to challenge yourself."
          options={SPEECH_RATE_OPTIONS}
          getLabel={(v) => SPEECH_RATE_LABELS[v]}
          value={state.speechRate}
          onChange={(v) => update('speechRate', v)}
        />
        <ToggleRow
          label="Sound effects"
          description="Short cues on correct / incorrect answers."
          value={state.soundEffects}
          onChange={(v) => update('soundEffects', v)}
        />
        <ToggleRow
          label="Auto-play audio"
          description="Play the audio clip automatically when a listening exercise opens."
          value={state.autoPlayAudio}
          onChange={(v) => update('autoPlayAudio', v)}
        />
      </section>

      <section className="settings-section">
        <h2>Learning</h2>
        <SegmentedControl
          label="Daily XP goal"
          description="Target XP for a complete day. Drives the streak banner."
          options={XP_GOAL_OPTIONS}
          getLabel={(v) => `${v} XP`}
          value={state.dailyXpGoal}
          onChange={(v) => update('dailyXpGoal', v)}
        />
        <ToggleRow
          label="Show pinyin"
          description="Display pinyin under Chinese prompts in lessons and guides."
          value={state.showPinyin}
          onChange={(v) => update('showPinyin', v)}
        />
      </section>

      <section className="settings-section">
        <h2>Feel</h2>
        <SegmentedControl
          label="Theme"
          description="Light, dark, or follow your device."
          options={THEME_OPTIONS}
          getLabel={(v) => THEME_LABELS[v]}
          value={state.theme}
          onChange={(v) => update('theme', v)}
        />
        <ToggleRow
          label="Animations"
          description="Pulse rings, bounces, and other path animations."
          value={state.animations}
          onChange={(v) => update('animations', v)}
        />
        <ToggleRow
          label="Haptics"
          description="Vibration on correct / incorrect answers (mobile only)."
          value={state.haptics}
          onChange={(v) => update('haptics', v)}
        />
      </section>

      <section className="settings-section">
        <h2>Developer</h2>
        <ToggleRow
          label="Developer mode (Unlock all)"
          description="Bypass locked topics and lessons so all content is immediately reachable."
          value={state.developerMode}
          onChange={(v) => update('developerMode', v)}
        />
      </section>

      <button
        type="button"
        className="ledge-button tone-neutral settings-reset"
        onClick={() => {
          if (confirm('Reset all app settings to defaults?')) reset()
        }}
      >
        Reset to defaults
      </button>
    </div>
  )
}

interface ToggleRowProps {
  label: string
  description?: string
  value: boolean
  onChange: (next: boolean) => void
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <label className="settings-row">
      <span className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {description && <span className="settings-row-desc">{description}</span>}
      </span>
      <span
        className={'settings-toggle ' + (value ? 'settings-toggle-on' : '')}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <span className="settings-toggle-knob" />
      </span>
    </label>
  )
}

interface SegmentedControlProps<T extends string | number> {
  label: string
  description?: string
  options: readonly T[]
  getLabel: (value: T) => string
  value: T
  onChange: (next: T) => void
}

function SegmentedControl<T extends string | number>({
  label,
  description,
  options,
  getLabel,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="settings-row">
      <span className="settings-row-text">
        <span className="settings-row-label">{label}</span>
        {description && <span className="settings-row-desc">{description}</span>}
      </span>
      <div className="settings-segments">
        {options.map((opt) => (
          <button
            key={String(opt)}
            type="button"
            className={
              'settings-segment ' + (opt === value ? 'settings-segment-active' : '')
            }
            onClick={() => onChange(opt)}
          >
            {getLabel(opt)}
          </button>
        ))}
      </div>
    </div>
  )
}
