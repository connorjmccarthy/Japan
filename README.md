# Japan 2027

A personal trip planner for a February 2027 Japan ski trip. It works like a lightweight Wanderlog: a day‑by‑day plan, flights and Qantas Points maths, hotel shortlist, food list, live budget, checklists, a map and a place for decisions still to be made.

It is a plain static website (HTML, CSS, JavaScript, no build step), so it runs on GitHub Pages for free and works on a phone as an installable app.

## Open it

- On the web: `https://connorjmccarthy.github.io/Japan/` (after GitHub Pages is switched on, see below).
- On a phone: open that link in Safari or Chrome, tap Share, then **Add to Home Screen**. It opens full-screen and works offline.
- On a computer: same link. Bookmark it.
- In Japan: use the **Go** tab. One full-screen card per stop, swipe sideways to move through the day, swipe up when a stop is done, and a Directions button that opens Google Maps from where you are. It works offline once the app has loaded.

## How the data works, in plain English

There is one file that holds the entire plan: `data/trip.json`. The app reads it when it loads.

When you edit something in the app, the change is saved instantly in your browser on that device. If you also paste a GitHub token into **Settings**, every change is written back to `data/trip.json` in this repo a second later, as a normal commit. Your other device picks it up next time the app opens. GitHub is the shared notebook between phone and laptop, and every save has a history you can look back at.

The technical version: the app is static files on GitHub Pages; the data layer is `localStorage` plus the GitHub Contents API, with a `sha` check so two devices can never silently overwrite each other. If both devices edited since the last sync, the app shows a conflict and lets you pick which version to keep.

### What is never written to the repo

This repo is **public**. Booking references, ticket numbers, passport details and anything else sensitive live only in the **Private vault** page and in the "Private note" field on items, and those are never written to `data/trip.json`.

To have the vault on a second device, either use Export on the vault page and Import on the other device, or switch on **Private vault sync** in Settings: the vault is then encrypted on your device with a passphrase (AES-256-GCM, PBKDF2 key) and saved as `data/vault.enc`. That file is public but unreadable without the passphrase, which is stored only in each device's browser.

## First-time setup

1. **Turn on GitHub Pages** (once): repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflow in `.github/workflows/pages.yml` deploys on every push to `main`. The first deploy may also happen automatically when the workflow runs.
2. **Sync between devices** (optional, 5 minutes): GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Only select repositories: `Japan`. Repository permissions: **Contents: Read and write**. Expiry: after the trip. Paste the token into the app's Settings page on each device and press **Save & test**.

Without a token everything still works; edits just stay on whichever device you made them.

## Editing the plan outside the app

`data/trip.json` is human-readable. You can edit it directly on GitHub and the app will pick up the new version on next load (as long as that device has no unsynced edits of its own).

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
data/trip.json         the plan
sw.js                  offline cache
vendor/leaflet         map library (BSD-2, vendored so it works offline)
tests/                 Playwright tests
```
