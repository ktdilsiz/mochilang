# mochilang-mobile

Single-screen Expo wrapper around the mochilang web app. Lets you launch
mochilang on a phone via Expo Go (QR code workflow) without rewriting
any of the existing screens in React Native.

It's a `react-native-webview` pointing at a configurable URL. Authentication
cookies and inline media playback are enabled so Google Sign-In and TTS
work normally.

## Run it on your phone

**1. Start the web app**, listening on all interfaces so the phone can reach it:

```bash
cd apps/web
pnpm run dev -- --host
# vite picks a port (5173, 5174, or 5175 typically)
```

**2. Find your laptop's LAN IP** (macOS):

```bash
ipconfig getifaddr en0    # → e.g. 192.168.86.34
```

**3. Update `app.json`** with that IP + the vite port:

```jsonc
"extra": {
  "webUrl": "http://192.168.86.34:5175"
}
```

**4. Start Expo**:

```bash
cd apps/mochilang-mobile
pnpm install      # first time only
pnpm start
```

Scan the QR code with **Expo Go** (App Store / Play Store) on a phone
on the same WiFi. The mochilang home screen should load.

## Want to test from a phone NOT on the same WiFi?

Use Expo's tunnel:

```bash
pnpm start:tunnel
```

That gives Expo Go connectivity to your laptop over the public internet
(via a relay), but the *web app* is still only reachable on your LAN —
so the WebView will still fail unless the web app itself is reachable
publicly. Two options:

- Run the web app behind a temporary tunnel (`cloudflared`, `ngrok`,
  Tailscale Funnel) and put that URL in `app.json`'s `webUrl`
- Or deploy the web app + API (Render / Fly / Railway / etc.) and put
  the production URL in `webUrl`

## Backend reachability

The web app tries `MOCHILANG_API_BASE_URL` first (defaults to
`http://localhost:8181`). If you want auth + sync to work from the
phone, your API also needs to be reachable from the phone — same LAN
trick or hosted box.

If the API can't be reached, the web app drops into offline mode and
everything still works (with localStorage-only progress). So you don't
strictly need the backend at all to play with the wrapper.

## Constraints worth knowing

- Apple's App Store rejects "thin WebView wrappers" for non-trivial
  apps. This wrapper is fine for personal/development use; for a real
  release we'd port the screens to React Native.
- Cookie-based Google Sign-In needs HTTPS in production. The local
  HTTP setup works thanks to `localhost`/loopback exemptions in iOS
  WKWebView, but a real deploy must be HTTPS end-to-end.
- TTS quality varies by platform: iOS Safari has decent zh-CN voices,
  Android Chrome's are weaker. A future React Native port could swap
  to `expo-speech` for better cross-platform consistency.

## Files

- `App.tsx` — the WebView + loading/error states
- `app.json` — Expo config (icon, splash, `extra.webUrl`)
- `index.ts` — Expo's `registerRootComponent` entrypoint
- `assets/` — icons + splash (currently borrowed from mochiread; swap for distinct branding when you ship)
