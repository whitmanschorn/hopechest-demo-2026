#!/usr/bin/env node
/**
 * Uploads every image in public/photos to Vercel Blob (public access) and
 * rewrites the dataset's image URLs to the returned blob URLs:
 *   - scripts/image-manifest.json  (committed; the seeder's image source)
 *   - src/data/seed/photos.json    (anchor photo `src` + restoration.restoredSrc)
 *   - src/data/seed/people.json    (anchor `avatarSrc`)
 *   - src/data/seed/documents.json (anchor `scanSrc`, when the file exists)
 *
 * After this, `npm run seed` regenerates src/data/json with blob URLs.
 *
 *   set -a; . ./.env.local; set +a   # exposes BLOB_READ_WRITE_TOKEN
 *   node scripts/upload-blob.mjs
 *
 * Idempotent: stable pathnames (no random suffix), overwrite allowed, and a
 * resumable blob-map cache in scripts/staging/blob-map.json.
 */
import { put } from "@vercel/blob";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PHOTOS = path.join(ROOT, "public", "photos");
const STAGING = path.join(ROOT, "scripts", "staging");
const MAP_PATH = path.join(STAGING, "blob-map.json");

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Run:  set -a; . ./.env.local; set +a");
  process.exit(1);
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n");

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++;
        await fn(items[idx], idx);
      }
    }),
  );
}

async function main() {
  const files = readdirSync(PHOTOS).filter((f) => f.toLowerCase().endsWith(".jpg"));
  const map = existsSync(MAP_PATH) ? readJson(MAP_PATH) : {};
  let done = 0;

  await pool(files, 8, async (file) => {
    const key = `/photos/${file}`;
    if (!map[key]) {
      const data = readFileSync(path.join(PHOTOS, file));
      const { url } = await put(`photos/${file}`, data, {
        access: "public",
        token,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "image/jpeg",
      });
      map[key] = url;
      if (++done % 25 === 0) {
        writeJson(MAP_PATH, map);
        console.log(`  uploaded ${done}/${files.length}…`);
      }
    }
  });
  writeJson(MAP_PATH, map);
  console.log(`Uploaded ${files.length} images to Vercel Blob.`);

  const sub = (s) => (s && map[s]) || s;

  // 1) image manifest -> committed scripts/image-manifest.json
  const manifestSrc = existsSync(path.join(STAGING, "manifest.json")) ? path.join(STAGING, "manifest.json") : path.join(ROOT, "scripts", "image-manifest.json");
  const manifest = readJson(manifestSrc).map((m) => ({ ...m, src: sub(m.src) }));
  writeJson(path.join(ROOT, "scripts", "image-manifest.json"), manifest);

  // 2) anchor photos
  const photos = readJson(path.join(ROOT, "src", "data", "seed", "photos.json")).map((p) => ({
    ...p,
    src: sub(p.src),
    ...(p.restoration ? { restoration: { ...p.restoration, restoredSrc: sub(p.restoration.restoredSrc) } } : {}),
  }));
  writeJson(path.join(ROOT, "src", "data", "seed", "photos.json"), photos);

  // 3) anchor people avatars
  const people = readJson(path.join(ROOT, "src", "data", "seed", "people.json")).map((p) => (p.avatarSrc ? { ...p, avatarSrc: sub(p.avatarSrc) } : p));
  writeJson(path.join(ROOT, "src", "data", "seed", "people.json"), people);

  // 4) anchor documents scans (only those whose file exists in blob)
  const docsPath = path.join(ROOT, "src", "data", "seed", "documents.json");
  const docs = readJson(docsPath).map((d) => (d.scanSrc && map[d.scanSrc] ? { ...d, scanSrc: map[d.scanSrc] } : d));
  writeJson(docsPath, docs);

  console.log("Rewrote image URLs in image-manifest.json + seed anchors. Now run: npm run seed");
}

main().catch((e) => { console.error(e); process.exit(1); });
