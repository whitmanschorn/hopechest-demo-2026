#!/usr/bin/env python3
"""Process scripts/staging/arch-*.jpg -> public/photos/arch-*.jpg.

- trims the black film borders LoC scans carry (capped so dark photos survive)
- resizes to max 1400px, JPEG q78, grayscale -> faint warm cast left to CSS
- writes scripts/staging/manifest.json (the seeder's image source)
- appends an archive section to public/photos/CREDITS.md (keeps the v1 block)
"""
import json
import pathlib

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).parent.parent
STAGING = ROOT / "scripts" / "staging"
OUT = ROOT / "public" / "photos"
OUT.mkdir(parents=True, exist_ok=True)

MAX_SIDE = 1400
QUALITY = 78


def trim_film_border(im: Image.Image, thresh: int = 48, cap: float = 0.14) -> Image.Image:
    g = im.convert("L")
    w, h = g.size
    px = g.load()

    def row_mean(y):
        return sum(px[x, y] for x in range(0, w, 4)) / (w // 4 or 1)

    def col_mean(x):
        return sum(px[x, y] for y in range(0, h, 4)) / (h // 4 or 1)

    top = 0
    while top < h * cap and row_mean(top) < thresh:
        top += 1
    bottom = h - 1
    while bottom > h * (1 - cap) and row_mean(bottom) < thresh:
        bottom -= 1
    left = 0
    while left < w * cap and col_mean(left) < thresh:
        left += 1
    right = w - 1
    while right > w * (1 - cap) and col_mean(right) < thresh:
        right -= 1
    inset_x, inset_y = int(w * 0.015), int(h * 0.015)
    box = (left + inset_x, top + inset_y, right - inset_x, bottom - inset_y)
    if box[2] - box[0] < w * 0.5 or box[3] - box[1] < h * 0.5:
        return im
    return im.crop(box)


def normalize(im: Image.Image) -> Image.Image:
    im = ImageOps.exif_transpose(im)
    im = trim_film_border(im)
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return im.convert("L").convert("RGB")


def main():
    credits = json.loads((STAGING / "credits.json").read_text())
    manifest = []
    for slug in sorted(credits):
        src = STAGING / f"{slug}.jpg"
        if not src.exists():
            continue
        try:
            with Image.open(src) as raw:
                im = normalize(raw)
        except Exception as e:  # noqa: BLE001
            print(f"  skip {slug}: {e}")
            continue
        im.save(OUT / f"{slug}.jpg", "JPEG", quality=QUALITY, optimize=True, progressive=True)
        w, h = im.size
        c = credits[slug]
        manifest.append({
            "slug": slug,
            "src": f"/photos/{slug}.jpg",
            "width": w,
            "height": h,
            "title": c.get("title"),
            "date": c.get("date"),
            "url": c.get("item_url"),
            "query": c.get("query"),
        })
        print(f"  {slug}  {w}x{h}")

    (STAGING / "manifest.json").write_text(json.dumps(manifest, indent=2))

    # Append an archive section to CREDITS.md (preserve the existing v1 block).
    credits_md = OUT / "CREDITS.md"
    existing = credits_md.read_text() if credits_md.exists() else "# Photo credits\n"
    marker = "## Additional archive images (v1.1 seed)"
    head = existing.split(marker)[0].rstrip()
    lines = [head, "", marker, "",
             "Public-domain Library of Congress FSA/OWI images, fetched once for",
             "the expanded demo dataset. They depict no real members of the",
             "fictional family.", ""]
    for m in manifest:
        lines.append(f"- `{m['slug']}.jpg` — {m['title']} ({m['date'] or 'n.d.'}) — {m['url']}")
    lines.append("")
    credits_md.write_text("\n".join(lines))

    print(f"\nDONE: {len(manifest)} processed -> {OUT}")


if __name__ == "__main__":
    main()
