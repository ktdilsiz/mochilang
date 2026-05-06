import { useState } from 'react'
import { AVATAR_OPTIONS } from '../data/avatars'
import '../screens/ProfileScreen.css'

interface Props {
  onSubmit: (name: string, avatarId: string) => void
}

/**
 * First-launch onboarding modal: pick a display name + Mochi avatar.
 * Reuses the same .profile-edit-* styles as the in-app edit modal.
 */
export default function ProfileSetup({ onSubmit }: Props) {
  const [name, setName] = useState('')
  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0].id)
  const trimmed = name.trim()

  return (
    <div className="profile-edit-overlay" role="dialog">
      <div className="profile-edit-modal card" onClick={(e) => e.stopPropagation()}>
        <h3 className="profile-edit-title">Welcome to Mochilang!</h3>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Pick a name and a Mochi to compete in the league.
        </p>
        <label className="profile-edit-label" htmlFor="profile-setup-name">
          Display name
        </label>
        <input
          id="profile-setup-name"
          type="text"
          className="profile-edit-input"
          value={name}
          maxLength={30}
          autoFocus
          placeholder="e.g. Mochi fan"
          onChange={(e) => setName(e.target.value)}
        />
        <div className="profile-edit-label">Pick a Mochi</div>
        <div className="profile-avatars">
          {AVATAR_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.id}
              className={
                'profile-avatar-pick ' + (opt.id === avatarId ? 'is-active' : '')
              }
              onClick={() => setAvatarId(opt.id)}
              aria-label={opt.label}
            >
              <img src={opt.src} alt="" />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ledge-button tone-primary size-lg"
          disabled={trimmed.length === 0}
          onClick={() => onSubmit(trimmed, avatarId)}
          style={{ width: '100%', marginTop: 8 }}
        >
          Let's go
        </button>
      </div>
    </div>
  )
}
