# MochiLang

MochiLang is a language-learning suite built around short, interactive lessons,
offline course bundles, and a small hedgehog with strong opinions about XP.

## Apps and packages

- `apps/web` — React + Vite web app.
- `apps/mochilang-mobile` — Expo mobile app for iOS and Android.
- `apps/mochiread` — Expo reading companion.
- `apps/api` — Go + SQLite API for accounts, progress, social features, and course delivery.
- `packages/shared` — types and learning rules shared by web and mobile.
- `packages/dict`, `packages/translate`, `packages/srs` — language data and learning utilities.

## Getting started

Install the pinned workspace dependencies from the repository root:

```bash
pnpm install --frozen-lockfile
```

Run the web app:

```bash
pnpm --filter web dev
```

Run the API (defaults to `http://localhost:8181`):

```bash
cd apps/api && go run .
```

Run MochiLang Mobile:

```bash
pnpm --filter mochilang-mobile start
```

For a phone to reach a locally running API, set the mobile app's `apiUrl` in
`apps/mochilang-mobile/app.json` to your computer's LAN address.

## Verification

Run the repository checks before opening a pull request:

```bash
pnpm check
```

This runs the web lint/build, TypeScript checks for both Expo apps, and the API
test suite. GitHub Actions runs the same command for pushes and pull requests.

## Content and offline data

Course and dictionary data are checked in so the clients can work without a
network round trip. The API also serves course metadata and content. When
changing API seed data, refresh the web fallbacks with:

```bash
make api-gen-fallbacks
```

See each app's README for app-specific setup and release details.
