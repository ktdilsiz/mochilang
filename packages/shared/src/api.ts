/**
 * Typed client for the mochilang API.
 *
 * Auth is cookie-based: every fetch includes credentials so the
 * `mochilang_session` HttpOnly cookie rides along once the user has
 * signed in via Google. There is no client-side token handling — the
 * cookie is opaque to JS by design.
 *
 * Network and non-2xx errors throw `ApiError`. Callers decide whether
 * to fall back to bundled JSON / cached state.
 */

/**
 * The base URL is configured per-app at startup since web (Vite env)
 * and React Native (Expo Constants) read environment differently.
 * Defaults to localhost so unit tests + a casual `import` work.
 */
let BASE: string = 'http://localhost:8181'

export function configureApiBaseUrl(url: string): void {
  BASE = url
}

export function getApiBaseUrl(): string {
  return BASE
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

/**
 * Offline mode short-circuits every request so the existing per-hook
 * fallbacks (localStorage cache, bundled JSON) kick in without a
 * round-trip and the network panel stays clean.
 *
 * Set by App.tsx when (a) `api.me()` errors with a network failure or
 * (b) the user clicks "Continue without account" on LoginScreen. Cleared
 * when they log back in. The flag is a module-level boolean rather than
 * React state so the api client itself can branch on it without prop
 * drilling.
 */
let offlineMode = false

export function setOfflineMode(v: boolean): void {
  offlineMode = v
}

export function isOfflineMode(): boolean {
  return offlineMode
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  if (offlineMode) {
    // Status 0 is the conventional "no response from network" code in
    // browsers; using ApiError keeps the catch sites uniform.
    throw new ApiError(0, `${path} → offline mode`)
  }
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    credentials: 'include',
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, `${path} → ${res.status} ${detail}`)
  }
  if (res.status === 204) return {} as T
  return (await res.json()) as T
}

// ---------- Auth shapes ----------

export interface MeUser {
  id: string
  email: string
  name: string | null
  picture: string | null
  avatarId: string
}

export interface MeResponse {
  authenticated: boolean
  user?: MeUser
}

// ---------- Existing response shapes ----------

export interface ProfileResponse {
  name: string | null
  avatarId: string
  leagueTier: number
  leagueWeekStart: string | null
  lastWeekRank: number | null
  lastWeekChange: 'promoted' | 'demoted' | 'held' | null
}

export interface LessonResultResponse {
  bestMistakes: number
  completions: number
  lastAt: number
}

export interface ProgressResponse {
  totalXp: number
  streak: number
  lastActiveDate: string | null
  weeklyXp: number
  weekStart: string | null
  results: Record<string, LessonResultResponse>
}

export interface CompletionResultResponse {
  xpEarned: number
  totalXp: number
  streak: number
  weeklyXp: number
  weekStart: string
  lastActiveDate: string
  result: LessonResultResponse
  results: Record<string, LessonResultResponse>
}

export interface FriendResponse {
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

export interface FriendsListResponse {
  weekStart: string
  daysIntoWeek: number
  friends: FriendResponse[]
  asOf: string
}

/**
 * Wire-shape tier — the subset the server returns. The richer
 * client-side LeagueTier (with palette colors) lives in `./league`.
 */
export interface LeagueTierResponse {
  id: string
  name: string
  emoji: string
}

export interface LeagueRow {
  id: string
  name: string
  avatar: string
  flag?: string
  weeklyXp: number
  isUser: boolean
}

export interface LeagueResponse {
  weekStart: string
  daysIntoWeek: number
  userRank: number
  userTier: number
  tier: LeagueTierResponse
  nextTier: LeagueTierResponse | null
  promoteRank: number
  demoteRank: number
  lastWeekRank: number | null
  lastWeekChange: 'promoted' | 'demoted' | 'held' | null
  rows: LeagueRow[]
}

// ---------- Endpoints ----------

export const api = {
  health: () => request<{ status: string }>('/health'),

  // Auth
  me: (signal?: AbortSignal) => request<MeResponse>('/api/auth/me', { signal }),
  loginWithGoogle: (idToken: string) =>
    request<MeResponse>('/api/auth/google', {
      method: 'POST',
      body: { idToken },
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  // Profile / progress / friends / league
  getProfile: (signal?: AbortSignal) =>
    request<ProfileResponse>('/api/profile', { signal }),
  updateProfile: (patch: { name?: string; avatarId?: string }) =>
    request<ProfileResponse>('/api/profile', { method: 'PUT', body: patch }),
  resetProfile: () =>
    request<ProfileResponse>('/api/profile/reset', { method: 'POST' }),
  dismissBanner: () =>
    request<ProfileResponse>('/api/profile/dismiss-banner', { method: 'POST' }),

  getProgress: (signal?: AbortSignal) =>
    request<ProgressResponse>('/api/progress', { signal }),
  recordCompletion: (input: {
    lessonId: string
    mistakes: number
    baseXp: number
  }) =>
    request<CompletionResultResponse>('/api/progress/lessons', {
      method: 'POST',
      body: input,
    }),
  resetProgress: () =>
    request<ProgressResponse>('/api/progress/reset', { method: 'POST' }),

  listFriends: (signal?: AbortSignal) =>
    request<FriendsListResponse>('/api/friends', { signal }),
  getLeague: (signal?: AbortSignal) =>
    request<LeagueResponse>('/api/league', { signal }),

  // Course content (public — no auth required server-side)
  getCourse: <T = unknown>(courseId: string, signal?: AbortSignal) =>
    request<T>(`/api/content/courses/${encodeURIComponent(courseId)}`, { signal }),
}
