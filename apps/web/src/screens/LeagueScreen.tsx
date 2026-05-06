import { useEffect, useMemo, useState } from 'react'
import { COMPETITORS, botWeeklyXp } from '../data/competitors'
import {
  LEAGUE_TIERS,
  PROMOTE_RANK,
  DEMOTE_RANK,
  tierAt,
} from '../lib/league'
import { mondayOf, daysSinceMonday, daysUntilMonday } from '../lib/dates'
import { api, ApiError, type LeagueResponse, type LeagueRow } from '../lib/api'
import type { ProgressState } from '../state'
import type { ProfileState } from '../profile'
import { avatarById } from '../data/avatars'
import './LeagueScreen.css'

interface Props {
  progress: ProgressState
  profile: ProfileState
  setProfile: (patch: Partial<ProfileState>) => void
}

/**
 * The screen renders a single shape regardless of source. The server
 * already returns this shape for `/api/league`; the offline path builds an
 * equivalent payload from the bundled JSON + local state.
 */
interface ViewModel {
  weekStart: string
  daysIntoWeek: number
  rows: LeagueRow[]
  userRank: number
  userTier: number
  lastWeekRank: number | null
  lastWeekChange: 'promoted' | 'demoted' | 'held' | null
}

function viewFromAPI(r: LeagueResponse): ViewModel {
  return {
    weekStart: r.weekStart,
    daysIntoWeek: r.daysIntoWeek,
    rows: r.rows,
    userRank: r.userRank,
    userTier: r.userTier,
    lastWeekRank: r.lastWeekRank,
    lastWeekChange: r.lastWeekChange,
  }
}

/**
 * buildOfflineView produces the same VM the API would, using bundled
 * competitors + local user state. We *do not* mutate the user's tier in
 * offline mode — the server is authoritative on promote/demote, and will
 * reconcile on the next successful API call.
 */
function buildOfflineView(
  progress: ProgressState,
  profile: ProfileState
): ViewModel {
  const weekStart = mondayOf()
  const dayIdx = daysSinceMonday()
  const userId = 'me' // sentinel only used inside this view
  const userWeeklyXp = progress.weekStart === weekStart ? progress.weeklyXp : 0

  const rows: LeagueRow[] = COMPETITORS.map((b) => ({
    id: b.id,
    name: b.name,
    avatar: b.avatar,
    flag: b.flag,
    weeklyXp: botWeeklyXp(b, weekStart, dayIdx),
    isUser: false,
  }))
  rows.push({
    id: userId,
    name: profile.name ?? 'You',
    avatar: 'user',
    weeklyXp: userWeeklyXp,
    isUser: true,
  })
  rows.sort((a, b) => b.weeklyXp - a.weeklyXp || a.id.localeCompare(b.id))
  const userRank = rows.findIndex((r) => r.isUser) + 1

  return {
    weekStart,
    daysIntoWeek: dayIdx,
    rows,
    userRank,
    userTier: profile.leagueTier,
    lastWeekRank: profile.lastWeekRank,
    lastWeekChange: profile.lastWeekChange,
  }
}

export default function LeagueScreen({ progress, profile, setProfile }: Props) {
  const [vm, setVM] = useState<ViewModel>(() => buildOfflineView(progress, profile))
  const [offline, setOffline] = useState(false)

  // Fetch on mount only. The LeagueScreen unmounts when the user navigates
  // away (other tab / lesson screen), so completing a lesson and coming
  // back gets a fresh fetch automatically. setProfile is stable so the
  // closed-over reference stays valid.
  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      try {
        const r = await api.getLeague(ctrl.signal)
        setVM(viewFromAPI(r))
        setOffline(false)
        // Mirror server-resolved state into the profile cache so the
        // promote/demote banner shows up on next render.
        setProfile({
          leagueTier: r.userTier,
          lastWeekRank: r.lastWeekRank,
          lastWeekChange: r.lastWeekChange,
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!(err instanceof ApiError)) {
          setOffline(true)
          setVM(buildOfflineView(progress, profile))
          console.warn('LeagueScreen: API offline; using bundled JSON', err)
        } else {
          console.error('LeagueScreen: API error', err)
        }
      }
    })()
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const daysLeft = daysUntilMonday()
  const tier = tierAt(vm.userTier)
  const nextTier =
    vm.userTier < LEAGUE_TIERS.length - 1 ? LEAGUE_TIERS[vm.userTier + 1] : null

  const userAvatarSrc = avatarById(profile.avatarId).src

  // The banner shows when the *server* (or last-known-good profile) reports
  // a non-held outcome. Dismiss clears via setProfile → API.
  const banner = useMemo(() => {
    if (!vm.lastWeekChange || vm.lastWeekChange === 'held') return null
    return vm.lastWeekChange
  }, [vm.lastWeekChange])

  return (
    <div className="league-shell">
      {banner && (
        <div
          className={
            'league-banner ' +
            (banner === 'promoted' ? 'league-banner-up' : 'league-banner-down')
          }
        >
          <span className="league-banner-emoji">
            {banner === 'promoted' ? '🎉' : '📉'}
          </span>
          <div>
            <div className="league-banner-title">
              {banner === 'promoted'
                ? `You promoted to ${tier.name}!`
                : `Demoted to ${tier.name}`}
            </div>
            <div className="league-banner-body">
              Last week's finish: rank {vm.lastWeekRank}
            </div>
          </div>
          <button
            type="button"
            className="league-banner-x"
            aria-label="Dismiss"
            onClick={() => setProfile({ lastWeekChange: null })}
          >
            ×
          </button>
        </div>
      )}

      <header className="league-header">
        <div
          className="league-tier-badge"
          style={{ background: tier.color, borderColor: tier.edge }}
        >
          <span className="league-tier-emoji">{tier.emoji}</span>
        </div>
        <h2 className="league-tier-name">{tier.name} League</h2>
        <p className="league-tier-sub">
          {nextTier
            ? `Top ${PROMOTE_RANK} promote to ${nextTier.name}`
            : 'Top of the ladder — defend your spot!'}
          {offline && <span className="league-offline-tag"> · offline</span>}
        </p>
        <div className="league-deadline">
          {daysLeft === 0
            ? 'Last day of the week'
            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
        </div>
      </header>

      <ol className="league-board">
        {vm.rows.map((r, idx) => {
          const rank = idx + 1
          const zoneClass =
            rank <= PROMOTE_RANK
              ? 'zone-promote'
              : rank >= DEMOTE_RANK
                ? 'zone-demote'
                : ''
          return (
            <li
              key={r.id}
              className={
                'league-row ' +
                zoneClass +
                (r.isUser ? ' league-row-user' : '')
              }
            >
              <span className="league-rank">{rank}</span>
              <span className="league-avatar">
                {r.isUser ? (
                  <img src={userAvatarSrc} alt="" />
                ) : (
                  <span className="league-avatar-emoji">{r.avatar}</span>
                )}
              </span>
              <span className="league-name">
                {r.name}
                {r.flag && <span className="league-flag">{r.flag}</span>}
              </span>
              <span className="league-xp">
                {r.weeklyXp.toLocaleString()} XP
              </span>
            </li>
          )
        })}
      </ol>

      <footer className="league-footer">
        Your rank this week:{' '}
        <strong>
          {vm.userRank} / {vm.rows.length}
        </strong>
      </footer>
    </div>
  )
}
