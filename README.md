# Brandon Stays — hourly apartment rental manager

An installable PWA for running short-stay, **hourly** apartment rentals: units and
photos, a day/week schedule, booking log, rule-based pricing, income tracking and a
WhatsApp inbox. Airbnb-style interface, IDR amounts, English labels.

Owner/manager only — there is no public guest-facing booking page.

---

## Stack

| Piece | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4, custom Airbnb-flavoured token set |
| Database | Local PostgreSQL 18 via `pg` (no ORM, plain SQL) |
| Images | Uploaded to `data/uploads/`, served through `/api/uploads/<file>` |
| PWA | Hand-written `public/sw.js` + `manifest.webmanifest`, generated icons |
| Charts | Inline HTML/CSS bars, validated colourblind-safe palette |

No native modules, no image libraries, no cloud accounts.

---

## Setup

```bash
npm install          # already done
npm run assets       # PWA icons + placeholder unit photos (already generated)
```

`.env.local` already points at the Neon database (`neondb`, ap-southeast-1) and it
has been seeded — nothing else to configure.

```bash
npm run dev          # http://localhost:3009
```

To point at a different Postgres instead, set `DATABASE_URL` in `.env.local` and
re-run `npm run db:reset`. If that database does not exist yet, also set
`ADMIN_DATABASE_URL` (a connection to the `postgres` maintenance DB) — it is used
**only** to `CREATE DATABASE`, and is skipped entirely when `DATABASE_URL` already
connects, which is the case for hosted providers like Neon.

`npm run db:reset` is destructive and idempotent — it drops every table and reseeds
4 units, ~140 bookings across the last 45 days and next 12, payments, expenses,
7 pricing rules and 6 WhatsApp threads. `npm run db:setup` (no `--reset`) is the
safe version that refuses to touch an existing schema.

---

## What each screen does

| Route | Purpose |
|---|---|
| `/` | Today: revenue, occupancy, next 7 days, unread messages, today's timeline, next bookings |
| `/units` `/units/[id]` | Unit cards with photo carousels; detail page with gallery, amenities, photo manager, stats, applicable pricing rules |
| `/schedule` | Day timeline (units × 24h) with a live "now" line, week strip, per-unit filter, week heat table |
| `/bookings` `/bookings/[id]` | Filterable log; detail with price breakdown, status switcher, payments ledger |
| `/bookings/new` | Booking form with a **live quote** that re-prices on every change, plus overlap detection |
| `/income` | Month report: revenue/expenses/net/collected, daily chart, per-unit table, category and payment-method breakdowns, expense logging |
| `/pricing` | Rule list with on/off toggles, rule builder, and a price simulator running the real engine |
| `/inbox` | WhatsApp-style threads, quick-reply templates, guest booking history, one-tap "Book" |
| `/settings` | Business profile, WhatsApp connection guide, data counts, install prompt |

---

## Two deliberate design decisions

**No receivables.** Guests settle on arrival, so nothing in the app tracks a
balance owed — no "amount due" badges, no outstanding-balance totals. Payments are
still recorded per booking, but as a log of what was taken rather than a debt to
chase. `Payment recorded` / `Payment not recorded` is the only distinction drawn.

**Mobile is the primary target**, since this gets used standing in a lobby. Money
figures use `clamp()` so a `Rp 13.784.000` total stays whole at 320px instead of
overflowing a half-width tile; form controls jump to 16px under `sm` so iOS Safari
does not zoom the page on focus; hover-only controls (carousel arrows, photo
delete) are revealed permanently under `@media (hover: none)`; the photo gallery
becomes a swipeable carousel below `sm`; and the inbox is sized in `dvh` so a
retracting URL bar cannot push the composer under the tab bar. Wide content —
the schedule grid, the income tables — scrolls inside its own container, never
the page body.

---

## Pricing engine

`src/lib/pricing.ts` is pure and isomorphic — the booking form calls it in the
browser for the live quote, and `POST /api/bookings` runs the **same function** on
the server so a tampered client cannot set its own price.

Order of operations:

1. Hours are rounded up to whole hours, then raised to the unit's minimum.
2. Each hour is walked individually. `day_of_week`, `time_of_day` (wraps past
   midnight) and `date_range` rules multiply that hour's rate in priority order,
   and each rule's contribution is attributed so the guest sees *why* the price moved.
3. The single most generous qualifying `duration` rule discounts the subtotal.
4. Cleaning fee, extra-guest fee and any `fee` rules are added.

Seeded rules: weekend +20%, night (22:00–06:00) +15%, 6h+ −10%, 10h+ −20%,
year-end peak +35%, plus two unit-specific ones.

**Double-booking is impossible**, not merely discouraged — the `bookings` table
carries a GiST exclusion constraint on `(unit_id, tstzrange(starts_at, ends_at))`
that Postgres enforces, with cancelled and no-show rows exempt. The booking form
warns about overlaps before you submit; the database refuses them if you do.

---

## WhatsApp

Ships in **demo mode**: the inbox, send endpoint and Meta Cloud API webhook are all
built and wired, but outbound messages are recorded locally and never leave the
machine. The "Simulate reply" button pushes an inbound message through the exact
same code path the real webhook uses.

To go live, set in `.env.local`:

```ini
WHATSAPP_MODE=live
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=any-string-you-choose
```

then point the Meta webhook at `https://<your-host>/api/whatsapp/webhook` and
subscribe to the `messages` field. Nothing else changes.

---

## PWA

`npm run assets` generates the icons from scratch — `scripts/gen-assets.mjs`
contains a small PNG encoder (zlib + hand-rolled CRC32) and a rasteriser, so there
is no dependency on Sharp or any image library. The same script draws the
placeholder unit photos.

The service worker is deliberately conservative: **API responses are never cached**
(availability and money must be live), navigations are network-first with a cached
fallback, and static assets are cache-first with background refresh. Install from
the prompt on the Today screen, or Share → Add to Home Screen on iOS.

---

## Deploying to Vercel

1. Import the repo. The build command is already `node scripts/gen-assets.mjs &&
   next build` — icons and placeholder photos are generated at build time, which is
   why `public/icons/` and `public/seed/` stay out of git.
2. Set `DATABASE_URL` to the same Neon string you use locally. Keep the `-pooler`
   host: every concurrent function opens its own pool, and the pooler is what makes
   that safe. `src/lib/db.ts` drops the per-instance cap to 3 when `VERCEL` is set.
3. Attach a **Vercel Blob** store to the project. That injects
   `BLOB_READ_WRITE_TOKEN`, which is what flips photo uploads from the local
   `data/uploads/` folder to Blob — see `src/lib/storage.ts`. Without it, uploads
   fail on Vercel, because serverless filesystems are read-only outside `/tmp` and
   `/tmp` does not survive between invocations.
4. Optional: `WHATSAPP_*` if you're going live, and point the Meta webhook at the
   deployed `/api/whatsapp/webhook`.

The database itself is already seeded — `npm run db:reset` is a local operation
against `DATABASE_URL` and is not part of the deploy.

> **There is no authentication.** Anyone with the deployment URL can read revenue
> and create or delete bookings. `public/robots.txt` keeps it out of search
> results, but that is obscurity, not access control. Before this holds real guest
> data, put a password gate in front of it or enable Vercel's deployment
> protection.

---

## Layout

```
db/schema.sql            tables, indexes, the overlap exclusion constraint
scripts/gen-assets.mjs   PNG encoder + icon/photo rasteriser
scripts/setup-db.mjs     create database, apply schema, seed demo data
src/lib/                 db pool, types, IDR/date formatting, pricing engine, queries
src/components/          UI — shell, timeline, forms, chart, inbox
src/app/                 pages (server components) and /api routes
data/uploads/            uploaded photos (gitignored)
```
