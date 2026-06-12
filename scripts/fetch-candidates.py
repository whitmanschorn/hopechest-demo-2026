#!/usr/bin/env python3
"""Fetch several candidate images per slug into scripts/staging/cand/ for
visual selection. Reuses the LoC photos API."""
import json
import pathlib
import time
import urllib.parse
import urllib.request

from PIL import Image

CAND = pathlib.Path(__file__).parent / "staging" / "cand"
CAND.mkdir(parents=True, exist_ok=True)

FSA = "farm security administration/office of war information black-and-white negatives"

# slug -> list of queries to try (each query contributes candidates)
WANTED: dict[str, list[str]] = {
    "lake-house-summer-1958": ["tourist cabins", "summer camp lake swimming", "vacation lake"],
}

UA = {"User-Agent": "hopechest-demo-asset-fetch/1.0 (one-time, polite)"}
MAX_PER_SLUG = 5

meta: dict[str, dict] = {}
meta_path = CAND / "meta.json"
if meta_path.exists():
    meta = json.loads(meta_path.read_text())

for slug, queries in WANTED.items():
    n = 0
    for query in queries:
        if n >= MAX_PER_SLUG:
            break
        params = {"q": query, "fo": "json", "c": "12", "fa": f"partof:{FSA}"}
        url = "https://www.loc.gov/photos/?" + urllib.parse.urlencode(params)
        print(f"[{slug}] {query!r}")
        data = None
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers=UA)
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = json.load(r)
                break
            except Exception as e:  # noqa: BLE001
                print(f"    search failed (try {attempt + 1}): {e}")
                time.sleep(4)
        if data is None:
            continue
        results = (data.get("content") or {}).get("results") or []
        for r in results:
            if n >= MAX_PER_SLUG:
                break
            if r.get("access_restricted"):
                continue
            urls = r.get("image_url") or []
            if not urls:
                continue
            img = urls[-1]
            if img.startswith("//"):
                img = "https:" + img
            key = f"{slug}-{n}"
            dest = CAND / f"{key}.jpg"
            if any(m.get("image_url") == img for m in meta.values()):
                continue  # already have this exact image as some candidate
            try:
                req = urllib.request.Request(img, headers=UA)
                with urllib.request.urlopen(req, timeout=60) as resp:
                    dest.write_bytes(resp.read())
                with Image.open(dest) as im:
                    w, h = im.size
            except Exception as e:  # noqa: BLE001
                print(f"    dl failed: {e}")
                dest.unlink(missing_ok=True)
                continue
            if min(w, h) < 600:
                dest.unlink(missing_ok=True)
                continue
            meta[key] = {
                "title": r.get("title"),
                "date": r.get("date"),
                "item_url": r.get("url") or r.get("id"),
                "image_url": img,
                "size": [w, h],
            }
            print(f"    cand {n}: {w}x{h}  {(r.get('title') or '')[:60]}")
            n += 1
        meta_path.write_text(json.dumps(meta, indent=2))
        time.sleep(1.0)

print("\ndone")
