#!/usr/bin/env python3
"""Convert Kaikki's English Wiktionary Spanish JSONL.gz to compact lookup rows.
Usage: python3 packages/dict/scripts/build-spanish.py /path/to/source.jsonl.gz
See apps/mochiread/SPANISH-DICTIONARY-NOTICE.md for source and license.
"""
import gzip, json, hashlib, sys, unicodedata
from pathlib import Path
source = Path(sys.argv[1])
entries = {}
generated = {}
def normalize(word): return unicodedata.normalize('NFC', word).lower()
with gzip.open(source, 'rt', encoding='utf8') as stream:
    for line in stream:
        entry = json.loads(line)
        if entry.get('lang_code') != 'es' or not entry.get('word'): continue
        word = normalize(entry['word'])
        value = entries.setdefault(word, [[], []])
        for sense in entry.get('senses', []):
            for gloss in sense.get('glosses', []):
                if gloss not in value[0]: value[0].append(gloss)
            for relation in sense.get('form_of', []) + sense.get('alt_of', []):
                lemma = normalize(relation.get('word', ''))
                if lemma and lemma != word and lemma not in value[1]: value[1].append(lemma)
        # Include forms listed on lemma pages, even without their own entry.
        for form in entry.get('forms', []):
            surface = normalize(form.get('form', ''))
            if surface and surface != word and not surface.startswith('-') and ' ' not in surface:
                related = generated.setdefault(surface, [[], []])
                if word not in related[1]: related[1].append(word)
# Explicit entries have more precise relationships than paradigm expansions.
for word, value in generated.items():
    if word not in entries: entries[word] = value
rows = [[word, *value] for word, value in sorted(entries.items()) if any(value)]
payload = json.dumps(rows, ensure_ascii=False, separators=(',', ':')).encode()
compressed = gzip.compress(payload, compresslevel=9, mtime=0)
# A compressed JSON envelope follows the existing native Japanese data pattern.
import base64
out = Path(__file__).resolve().parents[1] / 'src/data/spanish.json'
out.write_text(json.dumps({'compressed': base64.b64encode(compressed).decode(), 'entries': len(rows), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()},separators=(',', ':'))+'\n')
print(f'{len(rows):,} word forms; {len(compressed)/1024/1024:.2f} MiB compressed; {out}')
