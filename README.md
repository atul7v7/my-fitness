# My Fitness Tracker — PWA

A personal workout progressive-overload tracker built as a Next.js PWA. Two roles: **athlete** (full CRUD) and **instructor** (read-only). Log weight/reps per exercise, view strength trends, get progressive-overload suggestions, and store demo videos per exercise.

## Tech Stack

- **Framework:** Next.js 14 (App Router), single deployable app
- **Database:** MongoDB Atlas (via Mongoose, server-side only)
- **Auth:** NextAuth.js with Credentials provider (email + password), bcrypt hashing
- **File storage:** Cloudinary (signed client-side upload, server-generated signature)
- **PWA:** manifest.json + service worker, offline write queue via IndexedDB (Dexie)
- **Charts:** Recharts
- **Styling:** Tailwind CSS, mobile-first, safe-area-aware (iPhone 16)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

- `MONGODB_URI` — your MongoDB Atlas connection string
- `NEXTAUTH_SECRET` — a long random string (`openssl rand -base64 32`)
- `NEXTAUTH_URL` — `http://localhost:3000` (dev) or your production URL
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — from your Cloudinary dashboard
- `SEED_ADMIN_*` — credentials for the initial athlete account

### 3. Seed the database

This creates the required indexes, seeds default body parts, and creates the initial athlete account:

```bash
npm run seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 and log in with the seeded athlete credentials.

## Roles & Security

- **Athlete:** full CRUD — create/edit/delete exercises, log entries, upload/delete videos, create new accounts.
- **Instructor:** read-only — can view exercises, videos, and history, and upload/replace videos, but cannot delete videos or perform any other mutating action.

Role enforcement is **server-side** via a reusable `requireRole('athlete')` helper applied to every mutating API route. The instructor's JWT is rejected by the API itself on write endpoints, regardless of what the client sends.

## Features

- **Exercise logging:** sets of weight + reps + optional RPE, editable date, notes
- **Body parts:** seeded defaults + custom tags, many-to-many with exercises
- **Trends:** per-exercise and per-body-part line charts (max weight, total volume), then-vs-now comparison, PR callouts (heaviest set, best volume, estimated 1RM via Epley formula)
- **Progressive-overload suggestions:** rule-based, from last 1-3 sessions (bump weight by 2.5kg/5lb or +1 rep based on RPE)
- **Video:** Cloudinary signed upload, stored as `secure_url` + `public_id` in MongoDB; `public_id` used for deletion
- **Offline:** service worker caches app shell; log entries made offline are queued in IndexedDB and auto-sync when back online
- **Data export:** CSV or JSON download of all log entries

## Data Model & Indexes

Indexes are created explicitly via the seed script (`npm run seed`) and Mongoose schema `index()` calls:

- `users` — `{ email: 1 }` unique
- `exercises` — `{ bodyParts: 1 }`, `{ name: 1 }`
- `logEntries` — `{ userId: 1, exerciseId: 1, date: -1 }`, `{ userId: 1, date: -1 }`
- `bodyMetrics` — `{ userId: 1, date: -1 }`

## Deployment

Single Next.js app — deploy to Vercel or any Node host. Set the same env vars in your hosting provider. Run `npm run seed` once after deploying to a fresh database.
