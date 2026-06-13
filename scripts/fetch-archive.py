#!/usr/bin/env python3
"""Bulk one-time fetcher: pulls 200+ public-domain FSA/OWI photos from the
Library of Congress JSON API into scripts/staging/, recording provenance for
CREDITS.md. Polite (UA, retries, throttle), incremental, resumable.

Usage: python3 scripts/fetch-archive.py
"""
import json
import pathlib
import time
import urllib.parse
import urllib.request

from PIL import Image

STAGING = pathlib.Path(__file__).parent / "staging"
STAGING.mkdir(parents=True, exist_ok=True)

FSA = "farm security administration/office of war information black-and-white negatives"
UA = {"User-Agent": "hopechest-demo-asset-fetch/1.0 (one-time, polite)"}

TARGET = 215        # collect at least this many
MIN_SIDE = 600      # skip anything smaller
PER_QUERY = 8       # how many to keep per theme

QUERIES = [
    "mother and child", "family on porch", "farm family", "wheat harvest",
    "cornfield farmer", "country wedding", "soldier portrait", "school children",
    "children playing", "family picnic", "country church", "main street town",
    "fishing river", "christmas tree", "vegetable garden", "farm kitchen",
    "woman portrait", "man portrait", "newborn baby", "general store",
    "old automobile", "train depot", "barn livestock", "county fair",
    "parade street", "baseball game", "swimming hole", "winter snow farm",
    "cotton picking", "tobacco field", "migrant family", "front porch evening",
    "grandmother", "young couple", "dance hall", "church congregation",
    "schoolhouse", "blacksmith", "sunday dinner", "girl with doll",
    "boy with dog", "hay wagon", "tractor field", "lumber mill", "river boat",
    "farmer wife", "country store interior", "kitchen table family",
]


def search(query):
    params = {"q": query, "fo": "json", "c": "30", "fa": f"partof:{FSA}"}
    url = "https://www.loc.gov/photos/?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            print(f"    search retry {attempt + 1}: {e}")
            time.sleep(5)
    return None


def main():
    credits_path = STAGING / "credits.json"
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}
    seen = {c["image_url"] for c in credits.values()}
    n = len(credits)

    for query in QUERIES:
        if n >= TARGET:
            break
        data = search(query)
        if not data:
            continue
        results = (data.get("content") or {}).get("results") or data.get("results") or []
        got = 0
        for r in results:
            if n >= TARGET or got >= PER_QUERY:
                break
            if r.get("access_restricted"):
                continue
            urls = r.get("image_url") or []
            if not urls:
                continue
            img = urls[-1]
            if img.startswith("//"):
                img = "https:" + img
            if img in seen:
                continue
            slug = f"arch-{n + 1:03d}"
            dest = STAGING / f"{slug}.jpg"
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
            if min(w, h) < MIN_SIDE:
                dest.unlink(missing_ok=True)
                continue
            seen.add(img)
            credits[slug] = {
                "title": r.get("title"),
                "date": r.get("date"),
                "item_url": r.get("url") or r.get("id"),
                "image_url": img,
                "size": [w, h],
                "query": query,
            }
            n += 1
            got += 1
            credits_path.write_text(json.dumps(credits, indent=2))
            print(f"  [{n:3d}] {slug}  {w}x{h}  {(r.get('title') or '')[:48]}")
        print(f"{query!r}: +{got}  (total {n})")
        time.sleep(1.0)

    print(f"\nDONE: {n} images staged in {STAGING}")


if __name__ == "__main__":
    main()
