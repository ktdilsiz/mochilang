# Mochiread

Chinese and Japanese reading app: choose a language, paste text, see pinyin
or kana readings, tap a word for English definitions, and review flashcards.
Chinese also supports character decomposition and writing practice.

Japanese uses the full English JMdict dictionary, compressed in the bundle and
loaded on first Japanese lookup. Statistical word boundaries are reconciled
with dictionary compounds, grammar and inflections. Particle senses lead their
homographs; other entries/readings can be selected separately in the popup. Names and
context-dependent readings may still be missing or ambiguous. Passage
translation requires the network; dictionary lookup and readings do not.
Japanese furigana sits over kanji runs; kana/okurigana stay unannotated. Half-width
kana is normalized for lookup while original text is retained. Audio defaults
to Read along: one spoken word and one highlight at a time, including Japanese
particle pronunciations. Choose Natural sentences in Audio for continuous
speech; it highlights the sentence unless the voice reports word boundaries.
Vocabulary saves dictionary forms
with the original sentence; old conjugated cards merge without losing review
counts. Saved texts and vocabulary remember their language; legacy data defaults
to Chinese. Voice choices are saved separately for Chinese and Japanese.

Rebuild the pinned Japanese dataset from the repository root:

```bash
pnpm --filter @mochilang/dict build:japanese
pnpm --filter @mochilang/dict test
pnpm --filter mochiread test:web
```

See [JMDICT-NOTICE.md](./JMDICT-NOTICE.md) for source and licence details.
The browser regression command exports the app to a temporary directory and
uses headless Chrome. Set `MOCHIREAD_BROWSER_CHANNEL` for another Playwright
browser channel, or `MOCHIREAD_WEB_DIR` to test an existing web export.
Set `MOCHIREAD_LIVE_TRANSLATION=1` to additionally check real Japanese and
Chinese translation services. Translation rejects echoed CJK source text,
uses request deadlines and cancellation, and falls back to MyMemory. Long
passages split at UTF-8-safe boundaries within the provider's 500-byte limit.
The translation sheet identifies the service that actually returned the result.

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
  from scriptin/jmdict-simplified's full English edition.
- **Japanese segmentation:** TinySegmenter · BSD.
