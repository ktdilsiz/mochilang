# mochilang-mobile

React Native + Expo port of the mochilang web app, currently in **Phase 1**.

## What's working in Phase 1

- Theme system mirroring the web's CSS palette (cream/coral, themed banners, ledge buttons)
- Bottom-tab navigation (Learn / League / Friends / Profile) + native-stack for the Lesson modal
- LoginScreen — offline-mode-only ("Continue without an account")
- HomeScreen — vertical lesson list grouped by level + topic, with progress and XP/streak counters
- LessonScreen — `multiple_choice` exercises end-to-end, with check/feedback/continue and a progress bar
- Other 4 exercise types fall through to a "Phase 2" stub (with TTS-friendly play button for `listen_and_choose`)
- Profile / League / Friends tabs are stubs that explain what's coming

## What's not yet (Phase 2)

- Google sign-in via `expo-auth-session` (web uses GIS; RN flow is different)
- The other 4 exercise types: `fill_blank`, `match_pairs`, `listen_and_choose`, `tap_words_in_order`
- The fancy winding lesson path on Home (we ship a vertical list for now)
- Topic guides (`TopicGuideScreen`)
- League leaderboard, Friends roster, Profile editor + spaced-review modal
- Bundled course JSON for offline-without-API; today the course loads from `/api/content/courses/zh-en` only
- Push notifications, haptics on lesson complete, App Store icons + screenshots

## Run it

```bash
# 1. Make sure the API is running and reachable from your phone
cd apps/api && go run .                # runs on :8181
# Phase 1 defaults to offline mode so this is optional, but you'll see
# empty content (no course JSON bundled yet) without it.

# 2. Edit app.json's extra.apiUrl to your laptop's LAN IP if you want
#    real API calls from a phone. e.g.
#    "apiUrl": "http://192.168.86.34:8181"

# 3. Boot Expo
cd apps/mochilang-mobile
pnpm install         # first time only
pnpm start
```

Scan the QR code with Expo Go (iOS/Android) on the same WiFi as your laptop.

## Layout

```
App.tsx                          # entrypoint + navigation
app.json                         # Expo config + extra.apiUrl
src/
├── lib/theme.ts                 # color/space/font tokens, per-theme tints
├── components/LedgeButton.tsx   # the chunky bottom-shadow primitive
├── state/
│   ├── useProgress.ts           # AsyncStorage-backed progress hook
│   └── useCourse.ts             # API-only course loader (Phase 1)
└── screens/
    ├── LoginScreen.tsx
    ├── HomeScreen.tsx
    ├── LessonScreen.tsx
    └── StubScreen.tsx           # generic placeholder for un-ported tabs
```

## Shared with web

Everything in `packages/shared/` — types, API client, league math, date helpers, review-suggestion picker, store-state types. Web's `apps/web/` and this RN app both import the same code paths from `@mochilang/shared`.

## Constraints worth knowing

- App Store rejects thin WebView wrappers — that's why we ditched the previous wrapper for a real RN port even though the web app works fine
- Cookie-based Google Sign-In needs HTTPS in production — Phase 2 will use `expo-auth-session` which handles the OAuth flow natively
- The course JSON isn't bundled into the RN app yet, so first launch needs a network round-trip to render content. Phase 2 will copy the bundle in via `metro.config.js` and add a true offline fallback
