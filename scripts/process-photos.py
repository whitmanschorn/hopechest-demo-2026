#!/usr/bin/env python3
"""One-time processor: staging/*.jpg -> public/photos/*.jpg

- trims the black film borders LoC scans carry (capped so dark photos survive)
- resizes to max 1400px, JPEG q78, grayscale -> faint warm cast left to CSS
- builds the hero pair: clean "restored" + artificially aged "original"
- crops avatars
- writes public/photos/CREDITS.md and prints final dimensions as JSON
"""
import json
import pathlib

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = pathlib.Path(__file__).parent.parent
STAGING = ROOT / "scripts" / "staging"
OUT = ROOT / "public" / "photos"
OUT.mkdir(parents=True, exist_ok=True)

MAX_SIDE = 1400
QUALITY = 78


def trim_film_border(im: Image.Image, thresh: int = 48, cap: float = 0.14) -> Image.Image:
    """Trim near-black scan borders, at most `cap` of each dimension per side."""
    g = im.convert("L")
    w, h = g.size
    px = g.load()

    def row_mean(y: int) -> float:
        return sum(px[x, y] for x in range(0, w, 4)) / (w // 4 or 1)

    def col_mean(x: int) -> float:
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
    # small inset to clear ragged frame edges / sprocket marks
    inset_x, inset_y = int(w * 0.015), int(h * 0.015)
    box = (left + inset_x, top + inset_y, right - inset_x, bottom - inset_y)
    if box[2] - box[0] < w * 0.5 or box[3] - box[1] < h * 0.5:
        return im  # trimming went wrong; keep original
    return im.crop(box)


def normalize(im: Image.Image) -> Image.Image:
    im = ImageOps.exif_transpose(im)
    im = trim_film_border(im)
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return im.convert("L").convert("RGB")


def age(im: Image.Image) -> Image.Image:
    """Make the clean scan look like a faded 90-year-old print."""
    im = im.convert("L")
    im = ImageEnhance.Contrast(im).enhance(0.74)
    im = ImageEnhance.Brightness(im).enhance(1.06)
    # sepia cast
    sepia = ImageOps.colorize(im, black="#3b2a1a", white="#f3e3c2", mid="#a9805a")
    # grain
    import random

    rnd = random.Random(1933)
    w, h = sepia.size
    noise = Image.effect_noise((w, h), 26)
    sepia = Image.composite(sepia, Image.blend(sepia, noise.convert("RGB"), 0.16), Image.new("L", (w, h), 200))
    sepia = Image.blend(sepia, noise.convert("RGB"), 0.07)
    # vignette
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((-w * 0.25, -h * 0.25, w * 1.25, h * 1.25), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(min(w, h) * 0.18))
    dark = ImageEnhance.Brightness(sepia).enhance(0.62)
    sepia = Image.composite(sepia, dark, mask)
    # a few scratches
    d2 = ImageDraw.Draw(sepia)
    for _ in range(7):
        x = rnd.randint(0, w)
        d2.line(
            [(x, 0), (x + rnd.randint(-30, 30), h)],
            fill=(243, 227, 194),
            width=1,
        )
    sepia = sepia.filter(ImageFilter.GaussianBlur(0.6))
    return sepia


def save(im: Image.Image, name: str) -> tuple[int, int]:
    im.save(OUT / name, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return im.size


dims: dict[str, list[int]] = {}

for src in sorted(STAGING.glob("*.jpg")):
    slug = src.stem
    with Image.open(src) as raw:
        im = normalize(raw)
    if slug == "klara-and-sarah-1933":
        dims[slug + "-restored"] = list(save(im, f"{slug}-restored.jpg"))
        dims[slug] = list(save(age(im), f"{slug}.jpg"))
    else:
        dims[slug] = list(save(im, f"{slug}.jpg"))

# --- avatars (square crops around faces; fractions eyeballed from review) ---
def avatar(src_name: str, frac_box: tuple[float, float, float, float], out_name: str) -> None:
    with Image.open(OUT / src_name) as im:
        w, h = im.size
        l, t, r, b = (int(frac_box[0] * w), int(frac_box[1] * h), int(frac_box[2] * w), int(frac_box[3] * h))
        crop = im.crop((l, t, r, b)).resize((256, 256), Image.LANCZOS)
        crop.save(OUT / out_name, "JPEG", quality=80, optimize=True)


# Klara: woman's head in hero restored (center-left, middle-upper)
avatar("klara-and-sarah-1933-restored.jpg", (0.12, 0.06, 0.52, 0.36), "avatar-klara.jpg")
# Sarah: toddler's head in hero restored (center-right)
avatar("klara-and-sarah-1933-restored.jpg", (0.40, 0.22, 0.72, 0.46), "avatar-sarah.jpg")
# Tom: sergeant portrait head
avatar("tom-army-portrait-1946.jpg", (0.30, 0.05, 0.72, 0.38), "avatar-tom.jpg")

# --- CREDITS.md ---
credits = json.loads((STAGING / "credits.json").read_text())
lines = [
    "# Photo credits",
    "",
    "All photographs are public-domain images from the Library of Congress",
    "FSA/OWI black-and-white negatives collection, downloaded once and",
    "committed here. They depict no real members of the fictional demo family.",
    "",
]
for slug in sorted(credits):
    c = credits[slug]
    lines.append(f"- `{slug}.jpg` — {c.get('title')} ({c.get('date') or 'n.d.'}) — {c.get('item_url')}")
lines += [
    "",
    "`klara-and-sarah-1933.jpg` is an artificially aged derivative of",
    "`klara-and-sarah-1933-restored.jpg` (same source scan) used to demo",
    "photo restoration. Avatars are crops of the photos above.",
    "",
]
(OUT / "CREDITS.md").write_text("\n".join(lines))

print(json.dumps(dims, indent=0))
