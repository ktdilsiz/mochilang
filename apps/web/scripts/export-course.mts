// One-shot exporter: serializes the in-memory course content into JSON
// for the backend to embed. Run with:
//
//   node --experimental-strip-types apps/web/scripts/export-course.mts \
//     --course=zh-en --out=apps/api/internal/content/data/zh-en.json
//
// After the canonical JSON moves into the backend tree this script is
// retained mainly for one-off "regenerate the JSON from current TS"
// roundtrips during development. Once the JSON is the only source we can
// delete it.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { TOPICS_BY_COURSE } from '../src/data/lessons.ts'

interface Args {
  course: string
  out: string
}

function parseArgs(): Args {
  const out = { course: 'zh-en', out: '' }
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/)
    if (!m) continue
    if (m[1] === 'course') out.course = m[2]
    else if (m[1] === 'out') out.out = m[2]
  }
  if (!out.out) {
    console.error('--out=<path> required')
    process.exit(2)
  }
  return out as Args
}

const args = parseArgs()
const topics = TOPICS_BY_COURSE[args.course]
if (!topics) {
  console.error(`no course "${args.course}"`)
  process.exit(1)
}

const payload = { id: args.course, topics }
const dest = resolve(args.out)
mkdirSync(dirname(dest), { recursive: true })
writeFileSync(dest, JSON.stringify(payload, null, 2) + '\n')
console.log(`✓ wrote ${args.course} (${topics.length} topics) → ${dest}`)
