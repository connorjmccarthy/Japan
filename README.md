# Trips

A personal trip planner. It works like a lightweight Wanderlog: a day‑by‑day plan, flights, stays, food list, live budget, checklists, a map and a place for decisions still to be made.

It currently holds two trips, and the **Trip** switcher at the top of the menu moves between them:

| Trip | Dates | Who | Data file | Built by |
|---|---|---|---|---|
| **Bali 2026** | 4 to 15 Nov 2026 | five of you, Canggu then Ubud | `data/bali.json` | `scripts/build-bali.py` |
| **Japan 2027** | 8 to 17 Feb 2027 | solo | `data/trip.json` | `scripts/build-seed.py` |

Each trip keeps its own copy in your browser, its own file in this repo and its own encrypted vault, so editing one can never touch the other. Your GitHub token, theme and sync settings are shared across both. `data/trips.json` is the list of trips and which one a new device opens first.

It is a plain static website (HTML, CSS, JavaScript, no build step), so it runs on GitHub Pages for free and works on a phone as an installable app.

## Open it

- On the web: `https://connorjmccarthy.github.io/Trips/` (after GitHub Pages is switched on, see below).
- On a phone: open that link in Safari or Chrome, tap Share, then **Add to Home Screen**. It opens full-screen and works offline.
- On a computer: same link. Bookmark it.
- In Japan: use the **Go** tab. One full-screen card per stop, swipe sideways to move through the day, swipe up when a stop is done, and a Directions button that opens Google Maps from where you are. It works offline once the app has loaded.

## How the data works, in plain English

Each trip is one file: `data/trip.json` for Japan, `data/bali.json` for Bali. The app reads the file for whichever trip is showing.

When you edit something in the app, the change is saved instantly in your browser on that device. If you also paste a GitHub token into **Settings**, every change is written back to that trip's file in this repo a second later, as a normal commit. Your other device picks it up next time the app opens. GitHub is the shared notebook between phone and laptop, and every save has a history you can look back at.

The technical version: the app is static files on GitHub Pages; the data layer is `localStorage` plus the GitHub Contents API, with a `sha` check so two devices can never silently overwrite each other. If both devices edited since the last sync, the app shows a conflict and lets you pick which version to keep.

### What is never written to the repo

This repo is **public**. Booking references, ticket numbers, passport details and anything else sensitive live only in the **Private vault** page and in the "Private note" field on items, and those are never written to the plan files.

To have the vault on a second device, either use Export on the vault page and Import on the other device, or switch on **Private vault sync** in Settings: the vault is then encrypted on your device with a passphrase (AES-256-GCM, PBKDF2 key) and saved as `data/vault.enc`. That file is public but unreadable without the passphrase, which is stored only in each device's browser.

## First-time setup

1. **Turn on GitHub Pages** (once): repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow in `.github/workflows/pages.yml` deploys on every push to `main`. The first deploy may also happen automatically when the workflow runs.
2. **Sync between devices** (optional, 5 minutes): GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Only select repositories: `Trips`. Repository permissions: **Contents: Read and write**. Expiry: after the trip. Paste the token into the app's Settings page on each device and press **Save & test**.

Without a token everything still works; edits just stay on whichever device you made them.

## Sharing the link

The link can go to anyone. What they see is controlled by two switches under **Settings → Sharing this link**, both **off** by default and both stored in that person's browser only:

- **Show money.** Off, so there is no Budget page, no totals on the Overview and no prices on items or stays. Turn it on to get your own budget back.
- **Show my private trips.** Off, so only trips marked `"shared": true` in `data/trips.json` appear in the switcher. Bali is shared; Japan is not.

Because these are per-device, turning one on for yourself does nothing to anyone else holding the link.

This hides, it does not lock. The repo is public, so `data/bali.json` and `data/trip.json` can still be read directly on GitHub by anyone who goes looking. Anything that must stay private belongs in the **Private vault**, which is never written to the plan files.

## Editing the plan outside the app

The plan files are human-readable JSON and you can edit them directly on GitHub; the app picks the new version up on next load, as long as that device has no unsynced edits of its own.

For bigger rewrites the Python builders are the source of truth. Edit `scripts/build-seed.py` (Japan) or `scripts/build-bali.py` (Bali) and re-run it; each one regenerates its JSON file from scratch. Never hand-edit the JSON if you are going to run the builder again, because it will be overwritten.

```
python3 scripts/build-bali.py     # rewrites data/bali.json
python3 scripts/build-seed.py     # rewrites data/trip.json
```

## Development

```
npm install          # test runner only; the app itself has no dependencies
npm start            # serves the folder at http://localhost:8123
npm test             # Playwright tests, desktop and phone viewports
npm run check        # syntax-check every module
```

Layout:

```
index.html             app shell
styles/app.css         design tokens, layout, components (light and dark)
src/main.js            router, navigation, sync pill, service worker registration
src/store.js           state, localStorage, GitHub sync, private vault
src/github.js          GitHub Contents API client
src/ui.js              sheet/modal, forms, toasts
src/views/*.js         one module per page (go.js is the on-the-move card deck)
data/trips.json        the list of trips and which one opens by default
data/trip.json         the Japan plan
data/bali.json         the Bali plan
scripts/build-*.py     the source of truth for each plan; re-run to regenerate the JSON
sw.js                  offline cache
vendor/leaflet         map library (BSD-2, vendored so it works offline)
tests/                 Playwright tests
```
