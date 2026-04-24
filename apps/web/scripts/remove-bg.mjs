import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'

const here = new URL('.', import.meta.url)
const webRoot = path.resolve(fileURLToPath(here), '..')
const inputPath = path.join(webRoot, 'src/assets/mochi-main.png')
const outputPath = path.join(webRoot, 'src/assets/mochi-main-transparent.png')

// Treat near-white pixels as background.
const threshold = 245
const softRange = 20 // feather edge

const buf = fs.readFileSync(inputPath)

// The mascot files are currently JPEGs with a .png extension.
// Decode JPEG -> RGBA buffer, then write a true PNG after background removal.
const decoded = jpeg.decode(buf, { useTArray: true })
if (!decoded?.data || !decoded?.width || !decoded?.height) {
  throw new Error('Failed to decode image')
}

const png = new PNG({ width: decoded.width, height: decoded.height })
png.data = Buffer.from(decoded.data)

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2
    const r = png.data[idx]
    const g = png.data[idx + 1]
    const b = png.data[idx + 2]

    const min = Math.min(r, g, b)
    const max = Math.max(r, g, b)

    // Background is basically white and low-saturation (rgb channels close to each other)
    const nearWhite = min >= threshold
    const lowSat = max - min <= 18

    if (nearWhite && lowSat) {
      png.data[idx + 3] = 0
      continue
    }

    // Feather: if close to white, reduce alpha a bit (helps anti-aliased edges)
    const whiteness = (r + g + b) / 3
    const dist = 255 - whiteness
    if (dist >= 0 && dist < softRange && lowSat) {
      const a = png.data[idx + 3]
      const keep = Math.max(0, Math.min(1, dist / softRange))
      png.data[idx + 3] = Math.round(a * keep)
    }
  }
}

fs.writeFileSync(outputPath, PNG.sync.write(png))
console.log(`Wrote ${outputPath}`)

