# Mochiread

Chinese and Japanese reading app: choose a language, paste text, see pinyin
or kana readings, tap a word for English definitions, and review flashcards.
Chinese also supports character decomposition and writing practice.

Japanese uses an offline common-word JMdict dictionary and TinySegmenter word
boundaries, with lookup for common verb/adjective inflections. Names, rare
words, and context-dependent readings may be missing or ambiguous. Passage
translation requires the network; dictionary lookup and readings do not.
Saved texts and vocabulary remember their language; existing data migrates as
Chinese. Voice choices are saved separately for Chinese and Japanese.

Rebuild the pinned Japanese dataset from the repository root:

```bash
pnpm --filter @mochilang/dict build:japanese
pnpm --filter @mochilang/dict test
```

See [JMDICT-NOTICE.md](./JMDICT-NOTICE.md) for source and licence details.

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
- **Japanese definitions/readings:** JMdict · EDRDG · CC BY-SA 4.0, converted
  from scriptin/jmdict-simplified's common-English edition.
- **Japanese segmentation:** TinySegmenter · BSD.
