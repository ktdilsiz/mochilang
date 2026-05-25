# Mochilang — Google Play Store listing

Drafts and checklists for the Play Console submission. Update this file when listing copy changes so the next release can copy-paste.

## Identity

- **App name:** Mochilang
- **Package:** com.mochilang.mobile
- **Default language:** English (US)
- **Category:** Education
- **Tags:** language learning, vocabulary, Turkish, Chinese, flashcards
- **Contact email:** kdilsiz@snapchat.com
- **Privacy policy URL:** *Set this once PRIVACY.md is hosted. Suggested: GitHub Pages from this repo, e.g. https://ktdilsiz.github.io/mochilang/privacy*

## Short description (≤80 chars)

```
Bite-sized language lessons with cute mochi pets. Offline-first. No sign-in.
```

(78 chars — adjust freely.)

## Full description (≤4000 chars)

```
Mochilang is a calm, ad-free way to learn a new language a few minutes at a
time. Tap through bite-sized lessons, build a streak, and watch a village of
119 mochi friends move in as you level up.

WHY MOCHILANG

• Truly offline. The full A1-to-C2 curriculum ships inside the app — no
  account, no login, nothing to set up. Open it on a plane and it works.
• No ads, no in-app purchases, no nagging. You learn, full stop.
• Tap any word in a lesson to see its translation. Common words are bundled;
  rarer ones fetch from a public translation service once and stay cached.

WHAT YOU GET

• Two starter courses: Chinese → English and English → Turkish, each spanning
  six CEFR levels with hand-written lessons.
• Five exercise types: multiple choice, fill the blank, match pairs, listen
  and choose, tap words in order, plus authored dialogues.
• Daily review of the words you got wrong, scoped per lesson, topic, or level.
• Topic and level exams that gate progression so you actually retain what you
  learned.
• A Mochi Village — collect and place 119 adorable mochi characters who visit
  on their own daily schedules. Invite a friend to drop by when you want.
• Friends and Leagues run fully offline against bot competitors so the
  social pressure works without a network.

PRIVACY

Mochilang does not have an account system. We do not collect your name,
email, location, or any analytics. Every bit of progress lives on your
device and gets wiped when you uninstall. See the Privacy Policy link on
this listing for the full disclosure.

Happy learning! 🍡
```

(About 1,500 chars — room to grow.)

## Graphics required by Play Console

| Asset | Spec | Status |
|---|---|---|
| App icon (Play listing) | 512×512 PNG, no alpha | Auto-derived from `assets/icon.png` (1024×1024) |
| Feature graphic | 1024×500 PNG | **TODO** — design pass needed |
| Phone screenshots | ≥2 PNGs, 16:9 to 9:16 ratio, 320–3840 px on each side | **TODO** — capture 4–6 from device |
| 7-inch tablet screenshots | Up to 8 PNGs, same ratio rules | **TODO** (we have `supportsTablet: true`) |
| 10-inch tablet screenshots | Up to 8 PNGs | **TODO** |
| Promo video URL | YouTube link, optional | Skip for first release |

## Screenshot capture plan

The screens worth highlighting, in roughly this order:

1. Home path with a few topics unlocked, a lesson tile pulsing as "next up".
2. Mid-lesson — a multiple-choice exercise with the colorful answer card.
3. Lesson review modal — XP earned, mistakes captured.
4. Mochi Village panorama with a handful of mochies visiting.
5. Atlas list — visit schedule for each mochi.
6. League leaderboard — user near the top of an offline bot cohort.

Capture at 1080 × 2400 (current-gen Pixel). Don't include the status bar — Play crops anyway, and a clean top edge looks better in the listing.

## Content rating questionnaire

Expected answers (Everyone / IARC):

- Violence: None
- Sexual content: None
- Profanity: None
- Drugs/alcohol/tobacco: None
- Gambling: None
- User-generated content sharing: No (community pack submission is local only — *verify before submitting*)
- User-to-user communication: No
- Shares user location: No
- Allows digital purchases: No

## Data safety form

Mirror the Privacy Policy:

- **Personal info collected:** None
- **Financial info:** None
- **Health & fitness:** None
- **Messages:** None
- **Photos & videos:** None
- **Audio:** None
- **Files & docs:** None
- **Calendar:** None
- **Contacts:** None
- **App activity:** None (we don't ship analytics)
- **Web browsing:** None
- **App info & performance:** None (no crash reporting)
- **Device or other IDs:** None
- **Data encrypted in transit:** Yes (HTTPS for the Lingva and Expo Updates calls)
- **Users can request data deletion:** Yes (by uninstalling — no server data exists)

## Pre-launch checklist

- [ ] Bump `expo.version` in app.json from `0.1.0` to `1.0.0` (optional but conventional for first public release)
- [ ] Publish `PRIVACY.md` to a public URL and paste into Play Console
- [ ] Create Google Cloud service account, grant Play access, save JSON key locally (do not commit)
- [ ] `eas build --platform android --profile production` — produces the AAB
- [ ] `eas submit --platform android --latest` — uploads to internal testing as draft
- [ ] Fill in store listing, screenshots, content rating, data safety, target audience in Play Console
- [ ] Promote internal → closed/open testing → production
