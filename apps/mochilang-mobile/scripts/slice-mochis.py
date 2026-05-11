"""Slice the Gemini-generated mochi sprite sheets into individual
transparent PNGs for use in the Village screen.

Source sheets live alongside this script under source-sheets/. They
*look* like they have a transparent background but are actually drawn
checkerboards (RGB(255,255,255) and (235,235,235) tiles painted onto
an opaque RGBA image), so the mask logic treats those two specific
tones as background: a pixel is a hedgehog iff its saturation is
non-trivial OR its value is below 0.85. That keeps every saturated
color, every dark outline pixel, and even faint cream highlights,
while killing both checker tones cleanly.

Connected-components on the resulting mask groups each hedgehog into
its own blob (instead of guessing a grid that the artwork doesn't
actually obey). Each sprite is saved cropped to its blob bbox + a few
pixels of padding, using the blob's pixel set as the alpha mask so
adjacent blobs in overlapping bboxes don't bleed in.

Run with:
    python3 apps/mochilang-mobile/scripts/slice-mochis.py
Then regenerate the static require() index:
    python3 apps/mochilang-mobile/scripts/gen-sprites-index.py
"""

import os
from collections import deque
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'assets' / 'mochis'
SOURCES = [
    HERE / 'source-sheets' / 'mochi-sheet-1.png',
    HERE / 'source-sheets' / 'mochi-sheet-2.png',
]
MIN_BLOB_AREA = 1500
ROW_TOLERANCE = 60


def is_subject(r, g, b):
    """True iff the pixel is part of a hedgehog — i.e. not the
    checkerboard background drawn in two tones of light gray."""
    mx = r if r >= g and r >= b else (g if g >= b else b)
    mn = r if r <= g and r <= b else (g if g <= b else b)
    if mx == 0:
        return True  # pure black, definitely subject
    s = (mx - mn) / mx
    v = mx / 255.0
    if s > 0.05:
        return True  # any color → subject
    if v < 0.85:
        return True  # dark unsaturated → outline / eye / shading
    return False  # unsaturated bright → checkerboard background


def label_components(mask, w, h):
    seen = bytearray(w * h)
    components = []
    for sy in range(h):
        row_base = sy * w
        for sx in range(w):
            if seen[row_base + sx] or not mask[row_base + sx]:
                continue
            x0 = x1 = sx
            y0 = y1 = sy
            pixels = []
            queue = deque()
            queue.append((sx, sy))
            seen[row_base + sx] = 1
            while queue:
                x, y = queue.popleft()
                pixels.append((x, y))
                if x < x0:
                    x0 = x
                if x > x1:
                    x1 = x
                if y < y0:
                    y0 = y
                if y > y1:
                    y1 = y
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        idx = ny * w + nx
                        if not seen[idx] and mask[idx]:
                            seen[idx] = 1
                            queue.append((nx, ny))
            components.append((pixels, x0, y0, x1, y1))
    return components


def process(src_path, base_index):
    img = Image.open(src_path).convert('RGBA')
    w, h = img.size
    px = img.load()

    mask = bytearray(w * h)
    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b, _ = px[x, y]
            if is_subject(r, g, b):
                mask[row + x] = 1

    components = label_components(mask, w, h)
    components = [c for c in components if len(c[0]) >= MIN_BLOB_AREA]

    def center(c):
        _, x0, y0, x1, y1 = c
        return ((x0 + x1) // 2, (y0 + y1) // 2)

    components.sort(key=lambda c: (center(c)[1], center(c)[0]))
    rowed = []
    for c in components:
        cy = center(c)[1]
        placed = False
        for row in rowed:
            row_cy = sum(center(rc)[1] for rc in row) / len(row)
            if abs(cy - row_cy) <= ROW_TOLERANCE:
                row.append(c)
                placed = True
                break
        if not placed:
            rowed.append([c])
    rowed.sort(key=lambda r: sum(center(c)[1] for c in r) / len(r))
    for row in rowed:
        row.sort(key=lambda c: center(c)[0])
    flat = [c for row in rowed for c in row]

    print(f'{src_path.name}: {len(flat)} components')

    for i, comp in enumerate(flat):
        pixels, x0, y0, x1, y1 = comp
        pad = 4
        cx0 = max(0, x0 - pad)
        cy0 = max(0, y0 - pad)
        cx1 = min(w, x1 + pad + 1)
        cy1 = min(h, y1 + pad + 1)
        sw = cx1 - cx0
        sh = cy1 - cy0
        sprite = Image.new('RGBA', (sw, sh), (0, 0, 0, 0))
        sp = sprite.load()
        for x, y in pixels:
            sp[x - cx0, y - cy0] = px[x, y]
        bbox = sprite.getbbox()
        if bbox:
            sprite = sprite.crop(bbox)
        sprite.save(str(OUT / f'mochi-{base_index + i + 1}.png'))

    return len(flat)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # Wipe stale sprites so a re-slice with fewer components doesn't
    # leave orphans referenced by the require() index.
    for fn in os.listdir(OUT):
        if fn.startswith('mochi-') and fn.endswith('.png'):
            (OUT / fn).unlink()

    total = 0
    for src in SOURCES:
        n = process(src, total)
        total += n

    print(f'done — {total} sprites in {OUT}')


if __name__ == '__main__':
    main()
