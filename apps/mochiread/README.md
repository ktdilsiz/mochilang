# Mochiread

Chinese-reading app: paste text, see pinyin, tap a word for definitions, swipe
flashcards, decompose characters into their components.

Built with Expo + React Native, runs on iOS, Android, and the web.

## First-time setup (fresh clone)

From the repo root:

```bash
pnpm install
```

That's it for the JS side. The bundled CC-CEDICT (`src/data/dict.json`) and
Make Me a Hanzi decomposition (`src/data/decomp.json`) are committed to the
repo, so the app works without re-running any data scripts.

## Run it

```bash
# Web (preview in browser)
pnpm -C apps/mochiread web

# iOS / Android via Expo Go (scan QR with the camera)
pnpm -C apps/mochiread start         # local network
pnpm -C apps/mochiread start:tunnel  # works from anywhere
```

## Publish an OTA update via EAS

The project is already linked to the EAS project — you just need to
authenticate once and then publishing is a one-liner.

```bash
# 1. Log in to your Expo account (interactive, only needed once per machine)
pnpm -C apps/mochiread eas:login

# 2. Publish whatever's in your working tree to the production branch.
#    The commit subject is used as the update message.
pnpm -C apps/mochiread publish
```

Anyone signed into the same Expo account in **Expo Go** will see the new
bundle the next time they open Mochiread.

## Refresh dictionary data (optional)

```bash
# Pull the latest CC-CEDICT and rebuild src/data/dict.json
pnpm -C apps/mochiread build:dict

# Pull the latest Make Me a Hanzi data and rebuild src/data/decomp.json
pnpm -C apps/mochiread build:decomp

# Both at once
pnpm -C apps/mochiread build:data
```

Commit the regenerated JSON if you want others to pick it up.

## Brand-new EAS project (only if you fork this and want your own)

```bash
pnpm -C apps/mochiread eas:login
pnpm -C apps/mochiread eas:setup    # eas init + eas update:configure
pnpm -C apps/mochiread publish
```

This rewrites `app.json` with a fresh project ID under your Expo account.

## Attribution

- **Definitions:** [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)
  · CC BY-SA 4.0
- **Character decomposition:** [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)
  · LGPL / Arphic Public License
- **Pinyin & segmentation:** [pinyin-pro](https://github.com/zh-lx/pinyin-pro) · MIT
- **Speech:** the OS Mandarin voice via `expo-speech`. No audio leaves the device.
