#!/usr/bin/env node
/**
 * Build the bundled character-decomposition table from Make Me a Hanzi.
 *
 * Usage:
 *   node scripts/build-decomp.mjs               # downloads from GitHub
 *   node scripts/build-decomp.mjs --from FILE   # reads a local dictionary.txt
 *
 * Source: https://github.com/skishore/makemeahanzi (LGPL / Arphic Public License)
 *
 * Output: src/data/decomp.json keyed by character →
 *   { pinyin: string, definition: string, components: string[], raw?: string }
 */
import { writeFileSync, statSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const URL =
  'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt';
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'decomp.json'
);

function downloadViaCurl() {
  const tmp = path.join(os.tmpdir(), `mmah-${Date.now()}.txt`);
  execSync(`curl -fsSL -o ${JSON.stringify(tmp)} ${JSON.stringify(URL)}`, {
    stdio: 'inherit',
  });
  return readFileSync(tmp, 'utf-8');
}

function isIDC(ch) {
  const cp = ch.codePointAt(0);
  return cp !== undefined && cp >= 0x2ff0 && cp <= 0x2fff;
}

async function main() {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf('--from');
  let text;
  if (fromIdx !== -1 && args[fromIdx + 1]) {
    const local = args[fromIdx + 1];
    if (!existsSync(local)) throw new Error(`File not found: ${local}`);
    process.stdout.write(`Reading ${local}… `);
    text = readFileSync(local, 'utf-8');
    console.log(`${(text.length / 1024).toFixed(0)} KB`);
  } else {
    process.stdout.write(`Downloading dictionary.txt… `);
    text = downloadViaCurl();
    console.log(`${(text.length / 1024).toFixed(0)} KB`);
  }

  const out = Object.create(null);
  let kept = 0;
  for (const line of text.split('\n')) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const char = entry.character;
    if (!char) continue;

    const raw = entry.decomposition || char;
    const components = [];
    for (const ch of raw) {
      if (isIDC(ch)) continue;
      if (ch === '?' || ch === '？') continue;
      if (ch === char) continue;
      components.push(ch);
    }

    out[char] = {
      pinyin: Array.isArray(entry.pinyin)
        ? entry.pinyin.join(' / ')
        : entry.pinyin || '',
      definition: entry.definition || '',
      components,
      raw,
    };
    kept++;
  }

  writeFileSync(OUT, JSON.stringify(out));
  const size = statSync(OUT).size;
  console.log(
    `Parsed ${kept.toLocaleString()} entries → ${(size / 1024 / 1024).toFixed(2)} MB at ${OUT}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
