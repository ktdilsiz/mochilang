import { useEffect, useMemo, useState } from 'react'
import { FRIENDS, friendDailyXp, friendWeeklyXp } from '../data/friends'
import { mondayOf, daysSinceMonday } from '../lib/dates'
import { api, ApiError, type FriendResponse } from '../lib/api'
import './FriendsScreen.css'

/**
 * `FriendView` is the shape both online and offline modes converge on so
 * the render path doesn't have to branch — only the source of the data.
 */
interface FriendView {
  id: string
  name: string
  handle: string
  avatar: string
  flag: string
  totalXp: number
  streak: number
  languages: string[]
  weekly: number
  thisWeek: number
  daily: number[]
}

function fromAPI(r: FriendResponse): FriendView {
  return r
}

function fromFallback(weekStart: string, dayIdx: number): FriendView[] {
  return FRIENDS.map((f) => {
    const daily: number[] = new Array(7).fill(0)
    let thisWeek = 0
    for (let d = 0; d <= dayIdx && d < 7; d++) {
      daily[d] = friendDailyXp(f, weekStart, d)
      thisWeek += daily[d]
    }
    // friendWeeklyXp gives the same number — kept here as a sanity check.
    void friendWeeklyXp
    return {
      id: f.id,
      name: f.name,
      handle: f.handle,
      avatar: f.avatar,
      flag: f.flag,
      totalXp: f.totalXp,
      streak: f.streak,
      languages: f.languages,
      weekly: f.weekly,
      thisWeek,
      daily,
    }
  })
}

export default function FriendsScreen() {
  const weekStart = mondayOf()
  const dayIdx = daysSinceMonday()
  const [friends, setFriends] = useState<FriendView[]>(() =>
    fromFallback(weekStart, dayIdx)
  )
  const [offline, setOffline] = useState(false)
  const [selected, setSelected] = useState<FriendView | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await api.listFriends(ctrl.signal)
        setFriends(r.friends.map(fromAPI))
        setOffline(false)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!(err instanceof ApiError)) {
          // Network error — keep the fallback set we initialized with.
          setOffline(true)
          console.warn('FriendsScreen: API offline; using bundled JSON', err)
        } else {
          console.error('FriendsScreen: API error', err)
        }
      }
    })()
    return () => ctrl.abort()
  }, [weekStart, dayIdx])

  const ranked = useMemo(
    () => [...friends].sort((a, b) => b.thisWeek - a.thisWeek),
    [friends]
  )

  return (
    <div className="friends-shell">
      <header className="friends-header">
        <h2 className="friends-title">Friends</h2>
        <p className="friends-sub">
          {friends.length} friends · this week's leaders shown first
          {offline && <span className="friends-offline-tag"> · offline</span>}
        </p>
      </header>

      <div className="friends-actions">
        <button type="button" className="ledge-button tone-neutral friends-action">
          🔗 Add by username
        </button>
        <button type="button" className="ledge-button tone-neutral friends-action">
          📇 Sync contacts
        </button>
      </div>

      <ul className="friends-list">
        {ranked.map((friend) => (
          <li key={friend.id}>
            <button
              type="button"
              className="friends-row"
              onClick={() => setSelected(friend)}
            >
              <span className="friends-avatar">{friend.avatar}</span>
              <span className="friends-info">
                <span className="friends-name">
                  {friend.name} <span className="friends-flag">{friend.flag}</span>
                </span>
                <span className="friends-meta">
                  <span className="friends-streak" title="Streak">
                    🔥 {friend.streak}
                  </span>
                  <span className="friends-totalxp" title="Total XP">
                    ⚡ {friend.totalXp.toLocaleString()}
                  </span>
                </span>
              </span>
              <span className="friends-week">
                <span className="friends-week-xp">{friend.thisWeek.toLocaleString()}</span>
                <span className="friends-week-label">this week</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <FriendModal
          friend={selected}
          dayIdx={dayIdx}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

interface FriendModalProps {
  friend: FriendView
  dayIdx: number
  onClose: () => void
}

function FriendModal({ friend, dayIdx, onClose }: FriendModalProps) {
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const max = Math.max(1, ...friend.daily)

  return (
    <div className="friend-modal-overlay" onClick={onClose}>
      <div
        className="friend-modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <button
          type="button"
          className="friend-modal-x"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <div className="friend-modal-head">
          <span className="friend-modal-avatar">{friend.avatar}</span>
          <div>
            <div className="friend-modal-name">
              {friend.name} <span className="friends-flag">{friend.flag}</span>
            </div>
            <div className="friend-modal-handle">{friend.handle}</div>
          </div>
        </div>

        <div className="friend-modal-stats">
          <Stat label="Streak" value={`🔥 ${friend.streak}`} />
          <Stat label="Total XP" value={friend.totalXp.toLocaleString()} />
          <Stat
            label="Studying"
            value={friend.languages.map((l) => l.toUpperCase()).join(' · ')}
          />
        </div>

        <div className="friend-modal-bars">
          <div className="friend-modal-bars-label">This week</div>
          <div className="friend-modal-bars-grid">
            {days.map((label, d) => {
              const isFuture = d > dayIdx
              const xp = friend.daily[d] ?? 0
              const h = isFuture ? 0 : Math.max(8, (xp / max) * 80)
              return (
                <div key={label} className="friend-bar">
                  <div
                    className={'friend-bar-fill ' + (isFuture ? 'is-future' : '')}
                    style={{ height: `${h}px` }}
                  />
                  <div className="friend-bar-label">{label}</div>
                </div>
              )
            })}
          </div>
        </div>

        <button type="button" className="ledge-button tone-primary size-lg friend-modal-cta">
          Send a nudge
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="friend-modal-stat">
      <div className="friend-modal-stat-value">{value}</div>
      <div className="friend-modal-stat-label">{label}</div>
    </div>
  )
}
