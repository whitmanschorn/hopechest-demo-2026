# Hopechest

Your family's living archive — photos, documents, and stories, kept safe and
rediscoverable. This is the **v1 clickable demo**: fully static, mock data, no
backend. Share the link, walk the demo script, done.

Live: https://hopechest-demo-2026.vercel.app

## The demo script

1. Open the link → **Welcome** → Sign in (no real auth).
2. **Home feed** → tap **Ask the archive**.
3. Tap the first suggested question — *"Is there a photo of Great Grandmother
   K. with Grandma S. as a toddler?"*
4. The answer surfaces **the** photo → open it.
5. Photo View shows the original/copies provenance (two relatives' phone pics
   of the same print), face tags, and the before/after **restoration slider**.

Also worth showing: smart albums, the upload wizard (`/upload`), documents,
family roles, and the auto-drafted newsletter.

## Stack

- Next.js (App Router, TypeScript, Tailwind v4) — zero extra runtime deps
- All routes statically prerendered; mock data lives in `src/data/`
- Photos are public-domain Library of Congress FSA/OWI images
  (`public/photos/CREDITS.md`); the fictional family is assembled from them

## Development

Requires Node.js 20.9+ (Node 24 LTS recommended).

```bash
npm install
npm run dev
```

`scripts/fetch-photos.py` and `scripts/process-photos.py` were the one-time
asset pipeline (LoC download → trim/resize → aged-print derivative for the
restoration demo). They are not needed to run the app.

## Deploy

Vercel project `hopechest-demo-2026`. `vercel.json` pins the framework preset.

```bash
npx vercel deploy --prod
```
