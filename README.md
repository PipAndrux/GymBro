# Fit Tracker

A personal fitness PWA combining a **workout tracker** and **calorie / food tracker**. Works offline, installs to your home screen on both Android and iOS. No accounts, no cloud — all data lives in your browser.

## Running locally

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build
npm run preview    # preview production build locally
```

## Installing on your phone

**Android (Chrome):** tap the "Install" banner or use the browser menu → *Add to Home Screen*.

**iOS (Safari):** tap the Share icon → *Add to Home Screen*. iOS does not show an install banner — this manual step is required.

Once installed the app launches full-screen with no browser UI.

## Data backup & transfer

All data is stored locally in IndexedDB (Dexie.js). To back up or move to a new device:

1. Open **Settings → Export JSON backup** — this downloads a `fittracker-backup.json` file.
2. On the new device, open the app and go to **Settings → Import from backup** — select the file to restore.

The export includes custom exercises, foods, routines, workouts, sets, food entries, daily goals, and settings. Built-in exercises (the ~150 seeded exercises) are not exported — they are re-seeded automatically on first launch.

## Known iOS limitations

- **Rest-timer alerts** (sound + vibration) only fire reliably while the app is **open and on screen**. When the screen locks or the user switches apps, iOS throttles background timers — the alert may not fire. Keep the screen on during rest periods for reliable alerts.
- **Vibration** (`navigator.vibrate`) is not supported on iOS; it works on Android.
- Install requires the manual *Share → Add to Home Screen* step in Safari (no automatic install prompt on iOS).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Local DB | Dexie.js (IndexedDB) |
| PWA | vite-plugin-pwa |
| Routing | React Router v6 |
| State | Zustand |
| Animations | Framer Motion (minimal) |
| Icons | lucide-react |
| Hosting | Vercel |
