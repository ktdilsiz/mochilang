#!/usr/bin/env node
/**
 * Build the bundled CC-CEDICT dictionary used by Mochiread.
 *
 * Usage:
 *   node scripts/build-dict.mjs                # downloads CC-CEDICT from mdbg.net
 *   node scripts/build-dict.mjs --from FILE    # parses a local cedict txt or .gz file
 *
 * The output is written to src/data/dict.json keyed by simplified word →
 * deduplicated array of English meanings.
 */
import { writeFileSync, statSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';

const URL =
  'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'dict.json'
);

const LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/\s*$/;

function readLocal(file) {
  const buf = readFileSync(file);
  if (file.endsWith('.gz')) return zlib.gunzipSync(buf).toString('utf-8');
  return buf.toString('utf-8');
}

function downloadViaCurl() {
  const tmp = path.join(os.tmpdir(), `cedict-${Date.now()}.txt.gz`);
  execSync(`curl -fsSL -o ${JSON.stringify(tmp)} ${JSON.stringify(URL)}`, {
    stdio: 'inherit',
  });
  const text = zlib.gunzipSync(readFileSync(tmp)).toString('utf-8');
  return text;
}

async function main() {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf('--from');
  let text;
  if (fromIdx !== -1 && args[fromIdx + 1]) {
    const local = args[fromIdx + 1];
    if (!existsSync(local)) throw new Error(`File not found: ${local}`);
    process.stdout.write(`Reading ${local}… `);
    text = readLocal(local);
    console.log(`${(text.length / 1024).toFixed(0)} KB`);
  } else {
    process.stdout.write(`Downloading CC-CEDICT… `);
    text = downloadViaCurl();
    console.log(`${(text.length / 1024).toFixed(0)} KB raw`);
  }

  const dict = Object.create(null);
  let lineCount = 0;
  let entryCount = 0;
  for (const line of text.split('\n')) {
    lineCount++;
    if (!line || line.startsWith('#')) continue;
    const m = line.match(LINE_RE);
    if (!m) continue;
    const simplified = m[2];
    const meanings = m[4]
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!meanings.length) continue;
    const existing = dict[simplified];
    if (existing) {
      const seen = new Set(existing);
      for (const meaning of meanings) {
        if (!seen.has(meaning)) existing.push(meaning);
      }
    } else {
      dict[simplified] = meanings;
    }
    entryCount++;
  }

  writeFileSync(OUT, JSON.stringify(dict));
  const size = statSync(OUT).size;
  console.log(
    `Parsed ${entryCount.toLocaleString()} entries from ${lineCount.toLocaleString()} lines → ${Object.keys(dict).length.toLocaleString()} unique simplified words`
  );
  console.log(`Wrote ${OUT} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
