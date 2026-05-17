# Mochilang — Google Play Listing

Reference document for the v0.1.0 Play Store submission. Edit before pasting into Play Console.

## App name (max 30 chars)

```
Mochilang
```

(9 chars, leaves room.)

## Short description (max 80 chars)

Pick one (or remix):

> Bite-sized language lessons. Offline. Cute mascot. Friendly competition.
> 75 chars ✅

> Learn English, Turkish, or Chinese in 5-minute lessons. Fully offline.
> 70 chars ✅

> Daily English lessons designed for Chinese, Turkish & Spanish speakers.
> 71 chars ✅

## Full description (max 4000 chars)

```
Mochilang is a bite-sized language-learning app for English, Turkish, Chinese, and Spanish learners. Every lesson is 5 minutes, every exercise has friendly feedback, and every cohort is a small offline league of competitors who progress alongside you so the leaderboard never feels empty.

==== What's inside ====

• Five course pairs ready out of the box
  - English for Chinese speakers (A1–C2)
  - English for Turkish speakers (A1–C2)
  - English for Spanish speakers (A1–C2)
  - Chinese for English speakers (A1–C2)
  - Spanish for English speakers (A1–C2)
• Six exercise types: multiple choice, fill in the blank, listen and choose, match pairs, tap words in order, and back-and-forth dialogue scenes
• Over 400 lessons and 3,800 exercises per English-target course
• Pronunciation help with built-in text-to-speech
• Tap any word in a lesson to see its translation
• 13 themed topics per level — greetings, family, food, travel, business, philosophy, idioms, and more

==== Designed for the way you actually learn ====

Mochilang's exercises target the specific mistakes a Chinese, Turkish, or Spanish speaker makes when learning English — not generic distractors. If you're a Chinese speaker, the wrong options in multiple-choice exercises are the exact patterns you're most likely to say by mistake (missing articles, dropped -s endings, Chinese word order). The same goes for Turkish and Spanish speakers learning English. You're drilling the gap that matters.

==== Friendly competition that respects your schedule ====

• Weekly leagues with 30 simulated competitors — each one has a personality (hardcore studier, weekend warrior, casual learner, comeback streaker), so the leaderboard moves even on your rest days
• Tier promotions: finish in the top 3 of your league each week to climb from Bronze through Silver, Gold, Sapphire, Ruby, to Diamond
• Streak tracking with optional Streak Freeze power-ups that save your streak when a day slips by
• Double XP for 30 minutes — once a day, you choose when

==== Community lessons ====

Beyond the built-in courses, you can browse, rate, and submit lesson packs created by other users. A simple JSON format means anyone can author a pack — full authoring tools are on the roadmap.

==== Fully offline ====

Mochilang works without an internet connection. There's no account, no login, no analytics. Your progress is saved on your device. The only outbound network requests are optional — looking up a word translation when you tap it, and over-the-air updates when the developer publishes a new lesson pack.

==== Free, no ads ====

Mochilang is a side project. No advertisements, no subscriptions, no in-app purchases.

==== Languages of the app interface ====

English, Turkish, Simplified Chinese.

----

Made with care. Feedback welcome at kdilsiz@gmail.com. Source: github.com/ktdilsiz/mochilang.
```

Character count: ~2,800. Plenty of headroom.

## App category

```
Education
```

## Content rating

Target answers for the Play Console questionnaire (all "No" unless noted):

- Violence: No
- Sexual content: No
- Profanity: No
- Drugs/alcohol/tobacco: No
- Gambling: No
- User-generated content: **Yes** — users can submit community lesson packs, but they're moderated (auto-hidden after 5 reports) and don't contain user-targeted comments outside the pack scope.
- Location sharing: No
- Personal info sharing: No
- Web browsing: No (TTS + Lingva translation requests are not user-controllable browsing)
- Digital purchases: No

Expected rating: **Everyone** (PEGI 3 / ESRB E).

## Target audience age range

```
13+
```

(Avoids COPPA's under-13 data requirements. The app handles no personal data anyway, but going 13+ keeps the policy simple.)

## Data safety form

For the **pure-offline v0.1.0 release**:

- "Does your app collect or share any of the required user data types?" → **No**
- "Is all of the user data collected by your app encrypted in transit?" → **N/A** (no data collected)
- "Do you provide a way for users to request that their data is deleted?" → **N/A** (no data collected); the in-app "Reset progress" / "Reset profile" / uninstall flows already wipe local state.

## Tags / keywords (for the description)

The description above naturally surfaces these search terms:
- language learning
- English
- Turkish
- Chinese
- Spanish
- offline
- vocabulary
- pronunciation
- bite-sized lessons
- CEFR
- daily streak

## Visual assets

### Icon (512×512 PNG, no transparency, no rounded corners)

Source: `apps/mochilang-mobile/assets/icon.png` (1024×1024). Downscale to 512×512 for the Play Console listing — Play Console accepts up to 1024 but the spec mentions 512 as the canonical size.

### Feature graphic (1024×500 PNG, no text recommended)

To author: simple cream/coral palette gradient with the mochi character centered. Spec doc / Figma file TBD.

### Phone screenshots (minimum 2, recommended 4–8)

Plan — captured via Android emulator with the production build:

1. LanguageSelectScreen with the 5 course pairs visible
2. HomeScreen — winding lesson path inside a topic
3. LessonScreen — multiple-choice exercise mid-play
4. LessonScreen — dialogue exercise chat bubbles
5. LeagueScreen — offline cohort with archetypes
6. PowerupsScreen — Double XP active countdown + Streak Freeze bank
7. ProfileScreen — stats card + power-ups summary
8. CommunityListScreen — browse community packs

## Release notes (max 500 chars per language)

For v0.1.0 first release:

```
Welcome to Mochilang. Bite-sized language lessons for English, Turkish, Chinese, and Spanish learners. Five course pairs out of the box, offline league with personality-driven competitors, Double XP and Streak Freeze power-ups, community-authored lesson packs, and a friendly mascot. No account required. No ads. Made by an independent developer.
```

## Privacy policy URL

```
https://ktdilsiz.github.io/mochilang/privacy/
```

Hosted via GitHub Pages from `docs/privacy.md` in the repo. **Action required: enable Pages on the repo** (Settings → Pages → Source: Deploy from a branch → Branch: `main` /docs).

## Account deletion / data request URL

The app stores no remote data, so this can simply be:

```
https://ktdilsiz.github.io/mochilang/privacy/
```

(The privacy policy describes the in-app reset flows.)

## Developer contact email (public on the listing)

```
kdilsiz@gmail.com
```

(Change to a non-personal one before public release if you prefer.)
