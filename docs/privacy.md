---
title: Mochilang — Privacy Policy
permalink: /privacy/
---

# Mochilang Privacy Policy

**Effective: 2026-05-16**

Mochilang ("we", "the app") is a language-learning mobile app published by **kdilsiz**. This privacy policy describes what information the app handles, what we do not collect, and how to reach us with questions.

## Quick summary

**Mochilang does not collect, store, or transmit any personal data.** The current release of the app runs entirely on your device. Your lesson progress, streak, XP, league standings, friends list, community packs, and power-up state are saved in your device's local storage and never leave your device.

There is no account, no login, no analytics SDK, no advertising, no third-party tracking.

## What the app stores on your device

Mochilang uses your phone's local app storage to remember the following between sessions:

- Your display name and avatar (whatever you typed into Profile)
- Lesson and exam progress (which lessons you completed, with how many mistakes, when)
- XP totals (daily, weekly, all-time) and current streak
- Offline league standings (the cohort of simulated competitors and their weekly XP)
- Community-pack downloads and your ratings on them
- Power-up state (Double XP window, streak-freeze bank)
- Village placements (if you've used that feature) and visitor schedule
- App settings (UI language preference, audio + voice settings, developer-mode toggle)

This data lives in your device's encrypted app sandbox. It is removed when you uninstall the app or use the "Reset progress" / "Reset profile" buttons in the Settings menu.

## What we do not do

- We do not collect personal data (name, email, contacts, location, photos).
- We do not transmit usage data to any server.
- We do not show advertisements.
- We do not use third-party analytics SDKs (no Google Analytics, no Firebase Analytics, no AppsFlyer, no Mixpanel, etc.).
- We do not sell, share, or rent any data — there is no data leaving your device to sell.

## Permissions

The app requests the following Android permissions:

- **Internet access** — used only for: (a) downloading over-the-air updates published by the developer via Expo's update service, and (b) optional dictionary lookups when you tap a word in a lesson (via the public Lingva translation service, which receives the word you tapped but no identifying information about you).

The app explicitly blocks these permissions even though some bundled libraries advertise them: precise/coarse location, camera, microphone, contacts, calendar.

## Children's privacy

Mochilang is rated for ages 13 and up. We do not knowingly collect any data from children under 13 — in fact, we don't collect data from anyone. If you are a parent or guardian and have questions, please email the address below.

## Third-party services

The current release of Mochilang uses two third-party services, both anonymous:

- **Expo Updates** (Expo, Inc.) — receives a request when the app checks for over-the-air bundle updates. The request contains your device's runtime version (e.g. `exposdk:54.0.0`) and the update channel (`main`). No personal identifier is sent. [Expo's privacy policy](https://expo.dev/privacy).
- **Lingva** ([lingva.ml](https://lingva.ml)) — optional. When you tap a word inside a lesson and Mochilang doesn't have a pre-baked translation for it, the word is sent to the public Lingva instance to fetch a translation. The request contains the single word you tapped, the source and target language codes, and your device's IP address (necessary for any internet request). No user identifier is sent.

You can disable Lingva by leaving offline mode active and not tapping individual words during a lesson.

## Future versions

A future version of Mochilang may add an optional Google Sign-In so progress can sync across devices and a real (not simulated) social leaderboard becomes available. **If we add that, this policy will be updated to describe what data is collected before the feature ships.** Until then, no account is created and nothing is sent to any server.

## Contact

For questions about this policy or your data, email **[kdilsiz@gmail.com](mailto:kdilsiz@gmail.com)**.

## Changes

We may update this policy. The "Effective" date at the top reflects the latest version. Old versions are available in the repository's git history at [github.com/ktdilsiz/mochilang/commits/main/docs/privacy.md](https://github.com/ktdilsiz/mochilang/commits/main/docs/privacy.md).
