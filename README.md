# Palette
HEAD
=======

Palette is a platform connecting independent visual artists with collectors
worldwide through fine-art poster printing. Artists keep authorship of their
work; Palette handles printing, framing, and worldwide freight. Membership
for artists is free and reviewed by a person rather than an algorithm.

The site presents artwork by medium and by artist, gives every piece its own
page linking back to its creator, and lets artists apply to join directly
through the site.

## Features

- Catalogue of artworks browsable by medium, with individual pages per piece
- Artist profiles listing each artist's available prints
- Free, human-reviewed artist application flow
- Newsletter signup
- Bilingual interface (English / French)
- Fully responsive layout

## Tech stack

- [Next.js](https://nextjs.org) (App Router) with TypeScript
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Supabase](https://supabase.com) (Postgres) for application and
  subscriber data
- [Vercel](https://vercel.com) for hosting and deployment

## Project structure

```
app/          route pages — home, artwork/[slug], artist/[slug], artists, join, about
components/   shared UI: navigation, footer, forms, cards, motion primitives
lib/          data models, copy/translations, server actions, Supabase client
supabase/     database schema
```

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Environment variables are documented in `.env.local.example`; the database
schema is in `supabase/schema.sql`.
