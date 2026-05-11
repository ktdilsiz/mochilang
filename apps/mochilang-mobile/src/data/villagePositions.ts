/**
 * Hand-curated mochi placement on the village panorama.
 *
 * Coordinates are normalized 0..1 of the panorama bbox. The screen
 * multiplies by (panoramaWidth, viewportHeight) at render time. The
 * sprite anchors at its feet (center-bottom), so (x, y) is where the
 * feet plant.
 *
 * Zones cluster around the painted landmarks — plaza shops, the
 * vegetable garden, the campfire, both ponds, the bridge, the path
 * network, etc. Within each zone, mochies are arranged in a small
 * grid with sin-hash jitter so they look gathered rather than
 * pixel-perfect. Total capacity = MOCHI_ROSTER_SIZE so every slot
 * has a defined home.
 */

interface Zone {
  /** Top-left x of zone bbox, normalized. */
  x: number
  y: number
  w: number
  h: number
  /** How many mochies live in this zone. */
  cap: number
  /** Debug label for what landmark this zone covers. */
  label: string
}

const VILLAGE_ZONES: Zone[] = [
  // ── Left third (forest, bridge, stream, distance huts) ─────────────
  { x: 0.02, y: 0.18, w: 0.08, h: 0.10, cap: 3, label: 'distant huts top-left' },
  { x: 0.04, y: 0.30, w: 0.12, h: 0.10, cap: 4, label: 'mountain road left' },
  { x: 0.01, y: 0.40, w: 0.06, h: 0.10, cap: 3, label: 'far left mountain path' },
  { x: 0.05, y: 0.55, w: 0.10, h: 0.15, cap: 4, label: 'forest path' },
  { x: 0.10, y: 0.75, w: 0.05, h: 0.05, cap: 3, label: 'bridge approach' },
  { x: 0.14, y: 0.70, w: 0.06, h: 0.10, cap: 3, label: 'bridge' },
  { x: 0.15, y: 0.75, w: 0.05, h: 0.10, cap: 3, label: 'stream right bank' },
  { x: 0.20, y: 0.55, w: 0.06, h: 0.10, cap: 3, label: 'left cottage' },
  { x: 0.22, y: 0.65, w: 0.04, h: 0.10, cap: 2, label: 'clearing sign' },
  { x: 0.02, y: 0.85, w: 0.06, h: 0.08, cap: 3, label: 'far left flowers' },
  { x: 0.10, y: 0.85, w: 0.15, h: 0.08, cap: 5, label: 'meadow foreground' },

  // ── Center third (plaza, hotel, shops, garden, campfire, lily pond) ─
  { x: 0.27, y: 0.45, w: 0.03, h: 0.05, cap: 2, label: 'tree edge mid-left' },
  { x: 0.27, y: 0.55, w: 0.05, h: 0.08, cap: 3, label: 'plaza stairs entrance' },
  { x: 0.30, y: 0.85, w: 0.10, h: 0.06, cap: 4, label: 'center path lower' },
  { x: 0.32, y: 0.50, w: 0.04, h: 0.08, cap: 3, label: 'bakery front' },
  { x: 0.33, y: 0.42, w: 0.04, h: 0.06, cap: 2, label: 'rooftop strollers' },
  { x: 0.36, y: 0.60, w: 0.06, h: 0.08, cap: 4, label: 'plaza center gathering' },
  { x: 0.40, y: 0.62, w: 0.04, h: 0.06, cap: 2, label: 'plaza side bench' },
  { x: 0.42, y: 0.48, w: 0.05, h: 0.08, cap: 3, label: 'hotel front' },
  { x: 0.42, y: 0.78, w: 0.08, h: 0.08, cap: 5, label: 'vegetable garden' },
  { x: 0.46, y: 0.55, w: 0.04, h: 0.08, cap: 3, label: 'cookie shop' },
  { x: 0.48, y: 0.78, w: 0.04, h: 0.06, cap: 3, label: 'campfire' },
  { x: 0.50, y: 0.55, w: 0.04, h: 0.08, cap: 3, label: 'library front' },
  { x: 0.50, y: 0.88, w: 0.10, h: 0.06, cap: 4, label: 'center-right path' },
  { x: 0.55, y: 0.75, w: 0.04, h: 0.08, cap: 3, label: 'moss hut' },
  { x: 0.58, y: 0.72, w: 0.05, h: 0.07, cap: 4, label: 'lily pond' },

  // ── Right third (right village, blue pond, warehouse, mountains) ───
  { x: 0.66, y: 0.55, w: 0.05, h: 0.08, cap: 3, label: 'right village left house' },
  { x: 0.65, y: 0.80, w: 0.10, h: 0.08, cap: 5, label: 'right foreground path' },
  { x: 0.72, y: 0.55, w: 0.05, h: 0.08, cap: 3, label: 'right village center' },
  { x: 0.78, y: 0.55, w: 0.05, h: 0.08, cap: 3, label: 'right village right' },
  { x: 0.78, y: 0.72, w: 0.04, h: 0.07, cap: 3, label: 'blue pond left' },
  { x: 0.79, y: 0.82, w: 0.06, h: 0.06, cap: 3, label: 'blue pond foreground' },
  { x: 0.82, y: 0.72, w: 0.04, h: 0.07, cap: 3, label: 'blue pond right' },
  { x: 0.85, y: 0.45, w: 0.04, h: 0.08, cap: 2, label: 'right tree edge' },
  { x: 0.87, y: 0.55, w: 0.04, h: 0.10, cap: 3, label: 'right warehouse' },
  { x: 0.90, y: 0.65, w: 0.08, h: 0.10, cap: 4, label: 'right cottage cluster' },
  { x: 0.93, y: 0.35, w: 0.05, h: 0.10, cap: 3, label: 'right mountain road' },
]

/**
 * Expand zones into one position per mochi. Mochies are distributed
 * across zones in declaration order (zone 0 takes mochi 1..cap, zone
 * 1 takes the next cap, etc.) so editing this list moves mochies in
 * predictable batches rather than reshuffling everyone.
 *
 * Within a zone, positions form a small column-major grid (≤3 cols)
 * with a small sin-based jitter so the cluster doesn't look gridded.
 */
function expandZones(zones: Zone[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  for (const zone of zones) {
    const cols = Math.min(zone.cap, 3)
    const rows = Math.ceil(zone.cap / cols)
    let placed = 0
    for (let r = 0; r < rows && placed < zone.cap; r++) {
      for (let c = 0; c < cols && placed < zone.cap; c++) {
        const baseX = zone.x + zone.w * ((c + 0.5) / cols)
        const baseY = zone.y + zone.h * ((r + 0.5) / rows)
        const idx = out.length
        // Tiny per-index jitter scaled to the cell size so mochies
        // wobble inside their grid slot rather than touching.
        const jx = Math.sin(idx * 1.7) * (zone.w / cols) * 0.18
        const jy = Math.cos(idx * 2.3) * (zone.h / rows) * 0.18
        out.push({ x: baseX + jx, y: baseY + jy })
        placed++
      }
    }
  }
  return out
}

export const VILLAGE_POSITIONS = expandZones(VILLAGE_ZONES)
