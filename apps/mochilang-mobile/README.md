# mochilang-mobile

React Native + Expo client for MochiLang.

## Included features

- Offline course bundles, progress storage, settings, and profile setup.
- Lessons and topic/level exams, including multiple choice, fill-in-the-blank,
  translation, matching, listening, word ordering, and dialogue exercises.
- Learn, league, social, community, village, power-up, and mistake-practice flows.
- Native text-to-speech, sound effects, and shared learning/progression rules.

## Still to plan before a production release

- Native Google sign-in via `expo-auth-session`.
- Push notifications, haptics, store metadata, screenshots, and release QA.
- Device coverage and automated mobile end-to-end testing.

## Run it

```bash
# 1. Optionally run the API and make it reachable from your phone
cd apps/api && go run .                # runs on :8181
# Course bundles and local progress work without it.

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
│   └── useCourse.ts             # API-first loader with bundled fallback
└── screens/
    ├── LoginScreen.tsx
    ├── HomeScreen.tsx
    ├── LessonScreen.tsx
    └── ...                      # exams, community, village, and social flows
```

## Shared with web

Everything in `packages/shared/` — types, API client, league math, date helpers, review-suggestion picker, store-state types. Web's `apps/web/` and this RN app both import the same code paths from `@mochilang/shared`.

## Constraints worth knowing

- App Store rejects thin WebView wrappers — that's why we ditched the previous wrapper for a real RN port even though the web app works fine
- Cookie-based Google Sign-In needs HTTPS in production — Phase 2 will use `expo-auth-session` which handles the OAuth flow natively
- Course bundles make core learning available offline; network-backed account and
  social features still need a reachable API.
