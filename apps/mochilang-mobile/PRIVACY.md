# Mochilang Privacy Policy

**Effective date:** 2026-05-12
**App:** Mochilang for Android
**Developer contact:** kdilsiz@snapchat.com

## Summary

Mochilang is an offline-first language learning app. We do not collect, store, or share personal information on our servers. Every piece of progress data, profile setting, and answer history stays on your device.

This policy explains what little does happen over the network, and what stays purely on your phone.

## Information we do not collect

We do not collect:

- Your name, email address, phone number, or any account credentials. The app does not have a sign-in or registration flow.
- Your location, contacts, calendar, photos, microphone, or camera. These permissions are explicitly blocked in the app manifest.
- Crash logs, analytics, advertising identifiers, device fingerprints, or behavioral data.
- Anything you type or tap inside the app.

## Information stored on your device

Mochilang stores the following data locally, using Android's app-private storage:

- Your learning progress: lessons completed, mistakes recorded for practice, XP and streak.
- Your profile: display name and avatar you chose during first launch.
- Settings: selected interface language, course selection, theme preferences, village mochi placements, and similar preferences.
- A small cache of word translations fetched in earlier sessions (see next section).

This data never leaves your device. Uninstalling Mochilang deletes all of it.

## Network requests we make

The app contacts a small set of third-party services to make features work. None of these requests carry a user identifier.

- **Lingva Translate** (translate.plausibility.cloud and mirrors). When you tap a word in a lesson that isn't already in our bundled dictionary, the app fetches its translation from the Lingva public translation API. Only the word and source/target language codes are sent. Results are cached on-device so the same word is fetched at most once.
- **Expo Updates** (u.expo.dev). The app may check for over-the-air bundle updates at launch. Only the app's runtime version and your device's OS/locale are sent — no user identifier.
- **Google Fonts** (fonts.gstatic.com). The Nunito font family is loaded at first launch and cached. No user identifier is sent.

No account is created on any of these services on your behalf.

## Children's privacy

Mochilang does not knowingly collect any data about children. The app does not allow account creation, does not include behavioral advertising, and does not let users communicate with one another. Anyone of any age can use it.

## Data deletion

Because we never receive your data, there is nothing for us to delete. To remove all data Mochilang has stored about you, uninstall the app on your device — Android will wipe its private storage.

## Security

All on-device storage uses Android's standard app-private sandbox. The only network calls leave your device over HTTPS.

## Changes to this policy

If we ever change what data we collect or which services we contact, we will update this document and bump the effective date above. The same file will ship with the next app release.

## Contact

Questions about this policy: **kdilsiz@snapchat.com**.
