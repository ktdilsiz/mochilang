# Mochilang API

Local-first Go service backing the mochilang web/mobile clients.
SQLite-backed, no external services required.

## Run it

```bash
cd apps/api
go run .
```

Defaults:

| Env | Default | Notes |
| --- | --- | --- |
| `MOCHILANG_API_ADDR` | `:8181` | Listen address (8080/8090 are taken on the dev machine) |
| `MOCHILANG_API_DB` | `./mochilang.db` | SQLite file (created if missing) |
| `MOCHILANG_API_CORS` | `http://localhost:5173..5177` | CSV of allowed Vite origins (5173–5177 by default to cover concurrent dev sessions) |
| `MOCHILANG_GOOGLE_CLIENT_ID` | _(unset)_ | OAuth Client ID from Google Cloud. Without it `/api/auth/google` returns 503. |
| `MOCHILANG_SECURE_COOKIES` | `true` | Set `false` only when testing a non-localhost dev origin over plain HTTP. |

Migrations are embedded and applied at boot. Seeds (bots + friends) are
upserted every startup, so changing `internal/seed/seed.go` lands on the
next run.

## Auth

Auth is **Sign in with Google** + a server-side session cookie. We never
see the user's password and we don't run an email infrastructure — Google
issues an ID token (a JWT signed by Google), the API verifies it against
Google's public JWKS, and on success creates a row in the `sessions`
table and sets `mochilang_session` (HttpOnly, SameSite=None, Secure).

### One-time Google Cloud Console setup

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** of type **Web application**
3. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://localhost:5174`
   - `http://localhost:5175`
4. Save and copy the Client ID
5. Set the env vars (same value on both halves):

```bash
# apps/api — backend verifies the audience
export MOCHILANG_GOOGLE_CLIENT_ID="123-abc.apps.googleusercontent.com"

# apps/web — frontend GIS widget uses it as client_id
echo 'VITE_GOOGLE_CLIENT_ID=123-abc.apps.googleusercontent.com' > apps/web/.env.local
```

That's it. No client secret needed for the ID-token flow.

### Endpoints

- `POST /api/auth/google` — body `{ idToken }`; returns `{ authenticated: true, user: {...} }` and sets the session cookie.
- `POST /api/auth/logout` — clears server session + cookie.
- `GET /api/auth/me` — `{ authenticated: false }` for logged-out, never 401. The frontend uses this as the gate to show LoginScreen.

All other `/api/*` routes go through `requireSession` which reads the cookie, looks up the hashed token in `sessions`, and 401s on miss.

## Endpoints

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/health` | – | `{"status":"ok"}` |
| POST | `/api/auth/google` | `{ idToken }` | Verifies, upserts user, sets cookie |
| POST | `/api/auth/logout` | – | Clears server session + cookie |
| GET | `/api/auth/me` | – | `{ authenticated, user? }` |
| GET | `/api/profile` | – | Returns `ProfileResponse` (name nullable) |
| PUT | `/api/profile` | `{ name?, avatarId? }` | Partial update |
| POST | `/api/profile/reset` | – | Clears name/avatar/tier; keeps XP |
| POST | `/api/profile/dismiss-banner` | – | Acknowledges promote/demote toast |
| GET | `/api/progress` | – | XP, streak, weekly XP, lesson results map |
| POST | `/api/progress/lessons` | `{ lessonId, mistakes, baseXp }` | Records completion + returns new state |
| POST | `/api/progress/reset` | – | Wipes XP and lesson results |
| GET | `/api/friends` | – | Hardcoded roster + this-week sparklines |
| GET | `/api/league` | – | Leaderboard + auto-resolves week rollover |

Lesson/topic/guide content stays in the frontend for now (`apps/web/src/data/lessons.ts`).
A future `/api/content` endpoint can serve that when content needs to ship without
a client release.

## Quick test

```bash
ID="$(uuidgen)"
curl -sH "X-User-Id: $ID" http://localhost:8181/api/profile | jq
curl -sX PUT -H "X-User-Id: $ID" -H 'Content-Type: application/json' \
  -d '{"name":"Mochi","avatarId":"mochi-thinking"}' \
  http://localhost:8181/api/profile | jq
curl -sX POST -H "X-User-Id: $ID" -H 'Content-Type: application/json' \
  -d '{"lessonId":"zh-en-greetings-1","mistakes":0,"baseXp":10}' \
  http://localhost:8181/api/progress/lessons | jq
curl -sH "X-User-Id: $ID" http://localhost:8181/api/league | jq '.userRank, .tier'
```

## Fallback bundles

The frontend is API-first with offline fallbacks. Static rosters
(competitors + friends) and league metadata are generated as JSON files
that get bundled into the web app:

```bash
make api-gen-fallbacks
# → writes apps/web/src/data/generated/{friends,competitors,league_meta}.json
#   plus an index.ts that re-exports them.
```

The frontend tries `/api/league` and `/api/friends` first; on any network
or non-2xx error it switches to the bundled JSON (and shows a small
"offline" tag in the corner). User-state hooks (`useProfile`, `useProgress`)
do the same — API first, localStorage cache when the API isn't reachable.

Re-run `make api-gen-fallbacks` whenever you change competitors or friends
in `internal/seed/seed.go`. Treat the generated files as build artifacts —
they're checked in so the frontend can ship without the API, but every
PR that touches the seed should also include a refreshed bundle.

## Layout

```
apps/api/
├── main.go              # entrypoint, graceful shutdown
├── internal/
│   ├── config/          # env-driven config
│   ├── store/           # SQLite + repos
│   │   ├── db.go        # open + embedded migrations
│   │   ├── migrations/  # 0001_init.sql onward
│   │   ├── users.go     # profile + progress columns
│   │   ├── progress.go  # lesson_results + RecordCompletion txn
│   │   ├── friends.go
│   │   └── competitors.go
│   ├── server/          # gin engine, middleware, handlers
│   ├── league/          # xmur3 RNG, daily XP, ranking, tier change
│   ├── seed/            # competitors + friends seed data
│   └── timeutil/        # mondayOf, daysSinceMonday
└── README.md            # this file
```

## Why these choices

- **SQLite (modernc.org/sqlite)** — pure Go (no CGo), single file, real SQL.
  When this needs to scale, switching to Postgres is mostly a driver swap
  plus tweaks to `ON CONFLICT` and `unixepoch()`.
- **gin** — already in `go.mod` from earlier scaffolding; small enough to
  keep, fast enough not to matter.
- **Embedded migrations** — no separate `goose`/`migrate` binary; we want
  `go run .` to be the only command anyone needs to remember.
- **Per-week deterministic bot XP** — same xmur3 algorithm as the frontend
  in `apps/web/src/lib/dates.ts` so client and server agree on the
  leaderboard until the client stops generating its own.
