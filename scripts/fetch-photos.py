#!/usr/bin/env python3
"""One-time fetcher: pulls public-domain FSA/OWI photos from the Library of
Congress JSON API into scripts/staging/, recording provenance for CREDITS.md.

Usage: python3 scripts/fetch-photos.py [slug ...]   (no args = all)
"""
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

STAGING = pathlib.Path(__file__).parent / "staging"
STAGING.mkdir(exist_ok=True)

FSA = "farm security administration/office of war information black-and-white negatives"

# slug -> (query, partof collection or None)
WANTED: dict[str, tuple[str, str | None]] = {
    "klara-and-sarah-1933": ("mother holding child", FSA),
    "klara-portrait-1925": ("woman portrait", FSA),
    "kowalski-farmhouse-1928": ("farmhouse", FSA),
    "farm-harvest-1935": ("wheat harvest farm", FSA),
    "klara-garden-1948": ("hoeing garden", FSA),
    "county-fair-1937": ("county fair", FSA),
    "sarah-school-portrait-1940": ("school girl", FSA),
    "front-porch-1941": ("porch family", FSA),
    "sarah-and-friends-1944": ("three girls", FSA),
    "tom-army-portrait-1946": ("sergeant", FSA),
    "sunday-best-1947": ("husband and wife", FSA),
    "first-car-1949": ("automobile owner", FSA),
    "wedding-day-1950": ("wedding", FSA),
    "eleanor-baby-1953": ("mother and baby", FSA),
    "christmas-morning-1955": ("christmas tree", FSA),
    "susan-baby-1956": ("infant", FSA),
    "lake-house-summer-1958": ("summer cottage", FSA),
    "lake-swimmers-1960": ("bathing beach", FSA),
    "family-picnic-1962": ("picnic", FSA),
    "thanksgiving-1964": ("thanksgiving dinner family", FSA),
    "family-reunion-1968": ("family reunion", FSA),
    "tom-fishing-1972": ("fishing creek", FSA),
}

UA = {"User-Agent": "hopechest-demo-asset-fetch/1.0 (one-time, polite)"}


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def download(url: str, dest: pathlib.Path) -> bool:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=60) as r:
            dest.write_bytes(r.read())
        return True
    except Exception as e:  # noqa: BLE001
        print(f"    download failed: {e}")
        return False


def biggest_image(result: dict) -> str | None:
    urls = result.get("image_url") or []
    if not urls:
        return None
    url = urls[-1]
    if url.startswith("//"):
        url = "https:" + url
    return url


def main() -> None:
    only = set(sys.argv[1:])
    credits: dict[str, dict] = {}
    credits_path = STAGING / "credits.json"
    if credits_path.exists():
        credits = json.loads(credits_path.read_text())

    for slug, (query, collection) in WANTED.items():
        if only and slug not in only:
            continue
        dest = STAGING / f"{slug}.jpg"
        if dest.exists() and slug in credits:
            print(f"[skip] {slug}")
            continue
        params = {"q": query, "fo": "json", "c": "15"}
        if collection:
            params["fa"] = f"partof:{collection}"
        url = "https://www.loc.gov/photos/?" + urllib.parse.urlencode(params)
        print(f"[{slug}] {query!r}")
        data = None
        for attempt in range(3):
            try:
                data = fetch_json(url)
                break
            except Exception as e:  # noqa: BLE001
                print(f"    search failed (try {attempt + 1}): {e}")
                time.sleep(5)
        if data is None:
            continue
        results = (data.get("content") or {}).get("results") or data.get("results") or []
        for r in results:
            if r.get("access_restricted"):
                continue
            img = biggest_image(r)
            if not img:
                continue
            if not download(img, dest):
                continue
            try:
                with Image.open(dest) as im:
                    w, h = im.size
            except Exception:
                dest.unlink(missing_ok=True)
                continue
            if min(w, h) < 600:
                dest.unlink(missing_ok=True)
                continue
            credits[slug] = {
                "title": r.get("title"),
                "date": r.get("date"),
                "item_url": r.get("url") or r.get("id"),
                "image_url": img,
                "size": [w, h],
            }
            print(f"    ok: {w}x{h}  {(r.get('title') or '')[:60]}")
            break
        else:
            print("    NO MATCH FOUND")
        credits_path.write_text(json.dumps(credits, indent=2))
        time.sleep(1.0)

    missing = [s for s in WANTED if not (STAGING / f"{s}.jpg").exists()]
    print("\nmissing:", missing or "none")


if __name__ == "__main__":
    main()
