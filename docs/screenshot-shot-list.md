# Screenshot capture plan — Mochilang v0.1.0 Play Store

Capture 6–8 screenshots from your phone via the production build (or the Expo Go preview during build wait). Play Console wants minimum 2; 6–8 is the sweet spot for store-page browsing.

## Specs

- **Aspect ratio**: 16:9 portrait (most modern phones) — Play Console accepts 16:9 to 9:16, any size 320–3840 px on the long edge
- **File format**: PNG or JPEG
- **No status bar mock** required — Play accepts whatever the device captured

## Shots (in this order)

### 1. LanguageSelectScreen — the hook
The first thing a new user sees. Captures the "5 course pairs out of the box" promise.

**Setup**: Launch app → tap "Start learning" → wait for LanguageSelectScreen. Should show two columns: "I speak" (with multiple language options) and "I want to learn".
**Capture**: Full screen.

### 2. HomeScreen — winding lesson path
Shows the bite-sized lesson scaffolding + topic theming. Visually distinctive.

**Setup**: Pick the **en-zh** course pair → tap "Start learning". HomeScreen renders the winding lesson path inside the first topic.
**Capture**: Scroll so a topic banner + 3–4 lesson nodes are visible.

### 3. LessonScreen — multiple-choice exercise
The bread and butter of the app. Captures the "Chinese-L1 distractors" pitch.

**Setup**: Tap any lesson node → LessonScreen opens. Wait for a `multiple_choice` exercise.
**Capture**: Show the Chinese prompt + 3–4 English options (some distractors should be visible Chinese-L1 errors like "I have apple" or "she go").

### 4. LessonScreen — dialogue exercise (chat scene)
Visually the most distinctive exercise type. Sells the "back-and-forth dialogue" line in the description.

**Setup**: Within any A1 topic, find the dialogue lesson (last lesson in each topic). Open it and play 2–3 turns so multiple speech bubbles are visible.
**Capture**: Multi-bubble chat scene with at least one user bubble (right-aligned, cream) and one bot bubble (left, cool tone).

### 5. LeagueScreen — offline competitive league
Demonstrates the social feel. Captures personality-driven competitors.

**Setup**: Tap the Social tab → make sure the **League** segment is active.
**Capture**: Top 8–10 rows visible, including: tier badge at top, deadline pill, your row (cream-highlighted), and a mix of bot rows with streak/lifetime XP/active-label metadata visible.

### 6. PowerupsScreen — consumables
Shows the gamification depth.

**Setup**: Profile tab → tap "View power-ups". If you can, activate Double XP first so the countdown is visible (gives the screenshot energy).
**Capture**: Both cards visible (Double XP with active countdown OR "Available", Streak Freeze with bank count).

### 7. ProfileScreen — stats hub
A natural "this is your dashboard" shot. Optional but rounds out the set.

**Setup**: Profile tab → scroll to top so the header card + 2x2 stats grid + Power-ups summary are visible.
**Capture**: Full screen.

### 8. CommunityListScreen — community packs (optional, only if your en-zh test has packs visible)
Shows the user-contributed angle.

**Setup**: LanguageSelectScreen → 🌍 Community Lessons.
**Capture**: A few pack cards + the filter chips at top. If the list is empty (which it will be for a fresh install with no server), skip this shot.

## Capture tips

- **Brightness up** so the cream palette pops in thumbnails.
- **Don't have any notifications visible** on the status bar.
- **Scroll mid-page** for #2 and #5 so the screenshot isn't a topbar-heavy header.
- **Take 2 of each** and pick the better one.

## Where to put them

Save as `docs/screenshots/01-language-select.png`, `02-home.png`, etc. I'll commit them to the repo + upload to Play Console.

## Re-capture if anything changes

When the app gets a meaningful redesign (new home path, new exercise type), re-shoot. Play Console lets you update screenshots without resubmitting the AAB.
