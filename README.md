# Palette

The real, coded version of the Palette design (built from the Claude Design
mockup: `Palette.dc.html`). Next.js 16 (App Router) + TypeScript + Tailwind
v4, bilingual EN/FR, six real routes, and an artist-signup form wired to a
Supabase database.

## 1. Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the site works immediately with the built-in
mock artists/artworks (`lib/data.ts`). The **Join as an artist** form will
show a clear error until you connect a database (next step) — it never
pretends to save an application it didn't.

## 2. Connect a real database (free) — for the artist signup form

1. Create a free account at [supabase.com](https://supabase.com) and click **New project**.
2. Once it's ready, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   the `artist_applications` and `newsletter_subscribers` tables with Row
   Level Security so the public key can only *submit*, never read anyone
   else's data.
3. Open **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key.
4. Copy `.env.local.example` to `.env.local` and paste those two values in.
5. Restart `npm run dev`. Submissions now land in Supabase — view them any
   time in **Table Editor → artist_applications** (that's your own login,
   not the public key, so RLS doesn't hide anything from you).

## 3. Deploy it tonight (free)

1. Push this project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), **New Project**, import the repo.
   Vercel auto-detects Next.js — no config needed.
3. Before the first deploy, add the same two environment variables from
   step 2 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) under
   **Environment Variables**.
4. Deploy. You'll get a free `*.vercel.app` URL with HTTPS immediately. A
   custom domain can be attached later from the Vercel dashboard.

## What's real vs. still mock

- **Real:** routing (`/artwork/[slug]`, `/artist/[slug]`, `/artists`,
  `/join`, `/about`), bilingual EN/FR copy, the whole "Gallery Grid" visual
  system (glass nav, cursor ring, scroll reveals, bento grids), and the
  artist application + newsletter forms (once Supabase is connected).
- **Still mock, on purpose (for tonight's launch):** the 6 artists and 12
  artworks live in `lib/data.ts`, not a database. Swap that file for real
  queries later — every page reads through the small helper functions at
  the bottom of that file (`artworkBySlug`, `worksByArtist`, etc.), so a
  future data-layer swap touches one file, not every page.
- **"Order this print"** is a placeholder button (sets local state, no real
  checkout). That's the intended hook point for Shopify: wire it to the
  Shopify Storefront API or a Buy Button when you're ready to sell, keeping
  this custom design instead of moving to a Shopify theme.

## Project structure

```
app/                route pages (home, artwork/[slug], artist/[slug], artists, join, about)
components/         Navbar, Footer, CursorRing, Reveal, ArtworkTile, JoinForm, LangProvider
lib/data.ts         artists + artworks (swap for a real DB later)
lib/copy.ts         all EN/FR text in one place
lib/actions.ts      server actions: submitApplication, subscribeNewsletter
lib/supabase.ts     Supabase client
supabase/schema.sql run once in Supabase's SQL editor
```
