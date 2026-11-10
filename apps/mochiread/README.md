# Mochiread

Chinese and Japanese reading app: choose a language on the startup page, paste text, see pinyin
or kana readings, tap a word for English definitions, and review flashcards.
Chinese also supports character decomposition. Both languages support writing
practice: Watch, Trace, and Test. Japanese uses its own kanji, hiragana, and
katakana stroke data, not Chinese stroke forms.

Each language has its own library view, vocabulary, flashcards, display/audio
preferences, reading position, and activity stats. Use **Switch language** in
the menu to return to the selection page. Your selection is remembered on the next launch. Existing saved texts and vocabulary are retained; legacy entries
without a language remain Chinese. Existing mixed activity totals are retained
under Chinese because older records did not identify a language.

In **Display**, drag the font-size slider (18–48 px) to resize the live sample
and its readings immediately. Sizes are saved separately for each language.
Existing S/M/L/XL preferences and backups remain supported.

## Faster website startup

The web app loads the language picker without downloading dictionaries. After
you choose a language it downloads only that language's compressed dictionary;
Chinese also includes character decomposition. A loading message and retryable
error cover slow or failed downloads. Once loaded, lookups stay on the device.
The other Mochilang apps and native builds keep their existing bundled data.

`pnpm -C apps/mochiread build:web` generates content-hashed dictionary assets and
exports the website. `web`, `test:web`, and `test:backup` also refresh these
assets; GitHub Pages regenerates them before deployment. Generated assets are
excluded from Git to avoid duplicating the source dictionaries. Use `build:web`
for fresh exports, or generate assets before a direct Expo export command:

```bash
pnpm -C apps/mochiread build:web-data
```

## Backup and restore

Open **Backup & restore** from the menu and choose **Download backup**. Move
the JSON file to another device, then choose it from the same screen. Backups
include both languages' texts, vocabulary, flashcard schedules, preferences,
reading positions, and activity. No account or backend is required.

Importing first shows a preview. **Restore this backup** replaces this browser's
MochiRead data for both languages; **Cancel restore** makes no changes. A pasted
JSON backup is also supported. Invalid files are rejected before writing.
Failed restores roll back, and a browser closed mid-restore recovers its previous
data the next time a language is selected. Dictionaries are not part of backups.

Run the backup checks with `pnpm -C apps/mochiread test:backup`.

Japanese writing data is loaded on demand from this website, so opening an
uncached character needs a network connection. The pinned AnimCJK dataset
covers 7,457 kanji and kana; unsupported characters are omitted from the writing
deck. Half-width kana is normalized for writing practice. See
[JAPANESE-WRITING-NOTICE.md](./JAPANESE-WRITING-NOTICE.md).

Rebuild the Japanese writing dataset:

```bash
python3 apps/mochiread/scripts/build-japanese-writing.py
```

Japanese uses the full English JMdict dictionary, downloaded when Japanese is
selected on the website and bundled for native builds. Statistical word boundaries are reconciled
with dictionary compounds, grammar and inflections. Particle senses lead their
homographs; other entries/readings can be selected separately in the popup. Names and
context-dependent readings may still be missing or ambiguous. Passage
translation requires the network; after the selected dictionary has loaded,
dictionary lookup and readings run locally.

In Display, choose Kana, Romaji, or Both (the Japanese default). Kana keeps
aligned furigana; Romaji and Both show the full word's pronunciation, including
kana-only words. For example, 小さな shows ちいさな / chiisana. Long vowels use
plain spellings such as gakkou and koohii. Readings are derived for display;
Japanese speech and saved cards retain their original kana readings.
Half-width kana is normalized for lookup while original text is retained. Audio defaults
to Natural sentences for continuous speech; it highlights the sentence unless the
voice reports word boundaries. Read along in Audio speaks and highlights one word
at a time, including Japanese particle pronunciations. Existing playback choices
are preserved. Automatic voice selection prefers the requested locale and voices
advertised as Natural, Neural, Premium, or Enhanced, followed by Google voices.
These names are heuristics; actual quality depends on the browser and device.
Choose a specific voice and use Preview in Audio to compare. Online browser
voices may send text to their speech provider.
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

That's it for the JS side. The bundled CC-CEDICT (`packages/dict/src/data/dict-*.json`) and
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

## Website on GitHub Pages

MochiRead is published at https://ktdilsiz.github.io/mochilang/.
The `Deploy MochiRead` workflow exports only this app and its shared packages,
then deploys the static output to GitHub Pages. Pushes to `main` affecting
MochiRead or shared dependencies deploy automatically; the workflow can also
be run manually. Repository Settings → Pages must use GitHub Actions.

To reproduce the production export locally:

```bash
MOCHIREAD_BASE_URL=/mochilang pnpm -C apps/mochiread build:web
```

The base URL applies only when supplied, so local development stays at `/`.
Texts, vocabulary, and preferences are stored in each browser. Translation
and Chinese stroke data use external services.

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
- **Speech:** browser or device Chinese/Japanese voices via `expo-speech`.
  Online browser voices may send text to their speech provider.
- **Japanese definitions/readings:** JMdict · EDRDG · CC BY-SA 4.0, converted
  from scriptin/jmdict-simplified's full English edition.
- **Japanese segmentation:** TinySegmenter · BSD.
- **Romaji:** WanaKana · MIT.

## Code organization and checks

- `src/app`: startup, navigation and provider composition.
- `src/features`: reading, library, vocabulary, writing, settings, backup, activity and help.
- `src/components`: shared UI controls.
- `src/platform`: dictionary loading, decomposition data and speech adapters.
- `src/storage`: schemas, defaults, persisted keys, migrations, repositories and backups.

Preferences, library, vocabulary and activity expose separate providers/hooks.
Storage retains the existing keys and backup version 1. Failed hydration does
not write default values over the failed domain's saved data. The remembered
language remains a device preference outside the transferable backup.

Run `pnpm --filter mochiread test:unit` for pure app checks and
`pnpm --filter mochiread test:e2e` for the reading/writing and backup browser
suites. CI builds one export and supplies `MOCHIREAD_WEB_DIR` to both suites.
The app TypeScript check covers runtime source and unit tests; Node unit tests
run with `tsx`.
