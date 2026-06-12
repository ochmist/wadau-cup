# Wadau Cup

A World Cup 2026 prediction pool app where players draft one team per tier (A–F) and earn points as their picks advance through the tournament. Built with Next.js, Firebase, and Tailwind CSS.

**Live at:** [wadaucup.com](https://wadaucup.com)

## How It Works

Each player drafts six national teams — one from each tier (A through F). Lower tiers carry more risk but score higher points. As the World Cup progresses from the group stage through the final, players earn points for every win, draw, or advancement their picked teams achieve. A live leaderboard tracks standings, and the top three finishers split the prize pool.

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Backend/Auth/DB:** Firebase (Auth, Firestore, App Hosting)
- **Styling:** Tailwind CSS 3
- **Match Data:** football-data.org API (primary), API-Football (optional live layer), OpenFootball (fixture seed/fallback)
- **Runtime:** Node.js 20

## Local Development Setup

### Prerequisites

- Node.js 18+ (20 LTS recommended)
- npm
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

### 1. Clone and install

```sh
git clone https://github.com/ochmist/wadau-cup.git
cd wadau-cup
npm install
```

### 2. Configure environment

```sh
cp .env.local.example .env.local
```

Open `.env.local` and make the following changes:

```
NEXT_PUBLIC_FIREBASE_API_KEY=dummy-key-for-emulator
NEXT_PUBLIC_USE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

The rest of the example defaults can stay as-is. No real Firebase credentials are needed for local development.

### 3. Start the Firebase emulators

```sh
npm run emulator
```

This starts Auth on port 9099, Firestore on 8080, and the Emulator UI on port 4000.

### 4. Seed test data

In a separate terminal:

```sh
npm run seed
```

This creates a pool, 14 sample players with draft picks, two sample match results, and an admin account. The seed script prints all test credentials to the terminal — save them if you need to log in as a specific player.

### 5. Start the dev server

In another terminal:

```sh
npm run dev
```

The app is now running at [http://localhost:3000](http://localhost:3000).

### Test Accounts

The seed script creates the following admin account:

| Field    | Value              |
|----------|--------------------|
| Phone    | +254 700 000 000   |
| Password | admin123           |

The admin account skips the password-reset and draft gates. Player accounts and their temporary passwords are printed in the terminal when you run `npm run seed`.

After logging in as admin, go to `/admin` and click **Recompute standings** to generate initial rankings.

### Emulator UI

Visit [http://localhost:4000](http://localhost:4000) to browse Auth users and Firestore data directly.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── admin/            # Admin dashboard and result entry
│   ├── api/              # Server-side API routes (auth, admin, fixtures)
│   ├── draft/            # Team drafting screen
│   ├── fixtures/         # Match schedule
│   ├── login/            # Phone-based login
│   ├── my-picks/         # Player's own picks view
│   ├── player/[name]/    # Individual player profile
│   └── rules/            # Scoring rules and tier breakdown
├── components/           # React components organized by feature
├── hooks/                # Custom React hooks (standings, fixtures, sync)
└── lib/                  # Shared logic
    ├── firebase.ts       # Client SDK init
    ├── firebase-admin.ts # Admin SDK init (server-only)
    ├── data.ts           # Team dictionary and tier definitions
    ├── auth.tsx          # Auth context provider and emulator wiring
    └── server/           # Server-only modules (match adapter, standings)
scripts/
├── seed.mjs              # Seed emulator or production with pool data
├── prod-bootstrap.mjs    # Production bootstrap script
└── setup-prod-cron.mjs   # Cloud Scheduler setup for result sync
docs/
└── hosting-domain-setup.md  # DNS and Firebase App Hosting config
```

## Available Scripts

| Command               | Description                                              |
|-----------------------|----------------------------------------------------------|
| `npm run dev`         | Start Next.js dev server                                 |
| `npm run build`       | Production build                                         |
| `npm run start`       | Start production server                                  |
| `npm run lint`        | Run ESLint                                               |
| `npm run emulator`    | Start Firebase Auth and Firestore emulators              |
| `npm run seed`        | Seed emulator with test pool, players, and results       |
| `npm run seed:prod`   | Bootstrap production Firestore (requires service account) |
| `npm run cron:prod`   | Set up Cloud Scheduler for automated result sync         |

## Production

Production deployment uses Firebase App Hosting. See `apphosting.yaml` for the runtime config and `docs/hosting-domain-setup.md` for domain and DNS setup details.

Server-side features (admin API routes, result sync) require `FIREBASE_SERVICE_ACCOUNT_JSON` or Application Default Credentials from the App Hosting runtime. The match data APIs (`FOOTBALL_DATA_API_KEY` and optionally `API_FOOTBALL_API_KEY`) are needed for live scoring.
