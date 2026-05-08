import { useMemo, useState } from 'react'
import type { ProgressState } from '../state'
import type { ProfileState } from '../profile'
import type { Lesson, Level } from '@mochilang/shared'
import { AVATAR_OPTIONS, avatarById } from '../data/avatars'
import { tierAt } from '@mochilang/shared'
import { pickReviewSuggestions } from '@mochilang/shared'
import './ProfileScreen.css'

interface Props {
  progress: ProgressState
  profile: ProfileState
  setProfile: (patch: Partial<ProfileState>) => void
  offline: boolean
  /** Course content — used to resolve lesson ids back to lesson objects for review. */
  levels: Level[]
  onSwitchLanguage: () => void
  onOpenSettings: () => void
  onResetProgress: () => void
  onResetProfile: () => void
  onSignOut: () => void
  onSwitchToLogin: () => void
  onStartLesson: (lesson: Lesson) => void
}

export default function ProfileScreen({
  progress,
  profile,
  setProfile,
  offline,
  levels,
  onSwitchLanguage,
  onOpenSettings,
  onResetProgress,
  onResetProfile,
  onSignOut,
  onSwitchToLogin,
  onStartLesson,
}: Props) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const reviewSuggestions = useMemo(
    () => pickReviewSuggestions(levels, progress.results),
    [levels, progress.results]
  )
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name ?? '')
  const [avatarId, setAvatarId] = useState(profile.avatarId)

  const stats = useMemo(() => {
    const lessons = Object.values(progress.results)
    const perfect = lessons.filter((r) => r.bestMistakes === 0).length
    return {
      completed: lessons.length,
      perfect,
      totalXp: progress.totalXp,
      streak: progress.streak,
    }
  }, [progress])

  const tier = tierAt(profile.leagueTier)
  const avatar = avatarById(profile.avatarId)

  function save() {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    setProfile({ name: trimmed, avatarId })
    setEditing(false)
  }

  return (
    <div className="profile-shell">
      <header className="profile-head card">
        <img src={avatar.src} alt="" className="profile-avatar" />
        <div className="profile-identity">
          <div className="profile-name">{profile.name ?? 'Mochi friend'}</div>
          <div className="profile-tier">
            <span
              className="profile-tier-pill"
              style={{ background: tier.color, borderColor: tier.edge }}
            >
              {tier.emoji} {tier.name}
            </span>
            {offline && (
              <span className="profile-offline-pill" title="Local-only mode">
                Offline
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="ledge-button tone-neutral profile-edit"
          onClick={() => {
            setName(profile.name ?? '')
            setAvatarId(profile.avatarId)
            setEditing(true)
          }}
        >
          Edit
        </button>
      </header>

      <section className="profile-stats">
        <Stat label="Total XP" value={stats.totalXp.toLocaleString()} accent="xp" />
        <Stat label="Day streak" value={String(stats.streak)} accent="primary" />
        <Stat label="Lessons" value={String(stats.completed)} />
        <Stat label="Perfect runs" value={String(stats.perfect)} accent="success" />
      </section>

      <section className="profile-section">
        <h3>Practice</h3>
        <div className="profile-actions">
          <button
            type="button"
            className="ledge-button tone-primary profile-action"
            onClick={() => setReviewOpen(true)}
            disabled={reviewSuggestions.length === 0}
          >
            🔁 Review older lessons
            {reviewSuggestions.length > 0 && (
              <span className="profile-action-count">
                {reviewSuggestions.length}
              </span>
            )}
          </button>
        </div>
        {reviewSuggestions.length === 0 && (
          <p className="profile-action-hint">
            Lessons you finish will appear here a week later for spaced
            review.
          </p>
        )}
      </section>

      <section className="profile-section">
        <h3>Settings</h3>
        <div className="profile-actions">
          <button
            type="button"
            className="ledge-button tone-neutral profile-action"
            onClick={onOpenSettings}
          >
            ⚙️ App settings
          </button>
          <button
            type="button"
            className="ledge-button tone-neutral profile-action"
            onClick={onSwitchLanguage}
          >
            🌍 Switch course language
          </button>
          <button
            type="button"
            className="ledge-button tone-neutral profile-action"
            onClick={() => {
              if (
                confirm(
                  'Reset your XP, streak and lesson progress? This cannot be undone.'
                )
              ) {
                onResetProgress()
              }
            }}
          >
            ♻️ Reset progress
          </button>
          <button
            type="button"
            className="ledge-button tone-neutral profile-action"
            onClick={() => {
              if (
                confirm(
                  'Reset your name, avatar, and league tier? Your XP stays.'
                )
              ) {
                onResetProfile()
              }
            }}
          >
            🧹 Reset profile
          </button>
          {offline ? (
            <button
              type="button"
              className="ledge-button tone-primary profile-action"
              onClick={onSwitchToLogin}
            >
              🔑 Sign in with Google
            </button>
          ) : (
            <button
              type="button"
              className="ledge-button tone-neutral profile-action"
              onClick={() => {
                if (confirm('Sign out of Mochilang?')) onSignOut()
              }}
            >
              🚪 Sign out
            </button>
          )}
        </div>
      </section>

      <section className="profile-section">
        <h3>About</h3>
        <p className="profile-about">
          Mochilang is a side project — friends and competitors are simulated for
          now. Real social features land later.
        </p>
      </section>

      {editing && (
        <div
          className="profile-edit-overlay"
          onClick={() => setEditing(false)}
          role="dialog"
        >
          <div className="profile-edit-modal card" onClick={(e) => e.stopPropagation()}>
            <h3 className="profile-edit-title">Your profile</h3>
            <label className="profile-edit-label" htmlFor="profile-name-input">
              Display name
            </label>
            <input
              id="profile-name-input"
              type="text"
              className="profile-edit-input"
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="profile-edit-label">Pick a Mochi</div>
            <div className="profile-avatars">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  className={
                    'profile-avatar-pick ' +
                    (opt.id === avatarId ? 'is-active' : '')
                  }
                  onClick={() => setAvatarId(opt.id)}
                  aria-label={opt.label}
                >
                  <img src={opt.src} alt="" />
                </button>
              ))}
            </div>
            <div className="profile-edit-buttons">
              <button
                type="button"
                className="ledge-button tone-ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ledge-button tone-primary"
                disabled={name.trim().length === 0}
                onClick={save}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div
          className="profile-edit-overlay"
          onClick={() => setReviewOpen(false)}
          role="dialog"
        >
          <div
            className="profile-edit-modal card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="profile-edit-title">Brush up on these</h3>
            <p className="profile-action-hint" style={{ marginTop: -4 }}>
              Lessons you finished a while back. Tap one to replay it.
            </p>
            <ul className="profile-review-list">
              {reviewSuggestions.map((s) => (
                <li key={s.lesson.id}>
                  <button
                    type="button"
                    className="profile-review-row"
                    onClick={() => {
                      setReviewOpen(false)
                      onStartLesson(s.lesson)
                    }}
                  >
                    <span className="profile-review-meta">
                      <span className="profile-review-level">
                        {s.levelId.toUpperCase()}
                      </span>
                      <span className="profile-review-topic">{s.topicTitle}</span>
                    </span>
                    <span className="profile-review-title">{s.lesson.title}</span>
                    <span className="profile-review-age">
                      {s.daysAgo === 1 ? '1 day ago' : `${s.daysAgo} days ago`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="profile-edit-buttons">
              <button
                type="button"
                className="ledge-button tone-ghost"
                onClick={() => setReviewOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'xp' | 'primary' | 'success'
}) {
  return (
    <div className={'profile-stat ' + (accent ? `accent-${accent}` : '')}>
      <div className="profile-stat-value">{value}</div>
      <div className="profile-stat-label">{label}</div>
    </div>
  )
}
