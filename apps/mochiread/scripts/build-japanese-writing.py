"""Build Japanese stroke exercises from a pinned AnimCJK source archive.

Usage: python3 scripts/build-japanese-writing.py [path-to-source.tar.gz]
Only the derived stroke data is under the Arphic Public License; see the
generated notices. No Chinese glyphs are substituted for missing Japanese ones.
"""
import hashlib
from datetime import date
import io
import json
from pathlib import Path
import re
import sys
import tarfile
import urllib.request

REVISION = 'dd65f4fde402b504c99005479e6217ce21e5d54e'
SHA256 = '0d8c331595c4602184b2e7722409610ea06b41689a1f24033694103d6e01d13f'
URL = f'https://codeload.github.com/parsimonhi/animCJK/tar.gz/{REVISION}'
root = Path(__file__).resolve().parents[1]
archive = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else urllib.request.urlopen(URL, timeout=120).read()
assert hashlib.sha256(archive).hexdigest() == SHA256, 'Source checksum mismatch'
prefix = f'animCJK-{REVISION}/'
shards = {}
characters = []

with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as source:
    def read(name):
        return source.extractfile(prefix + name).read().decode('utf-8-sig')

    for dataset, folder in [('graphicsJa.txt', 'svgsJa'), ('graphicsJaKana.txt', 'svgsJaKana')]:
        for line in read(dataset).splitlines():
            entry = json.loads(line)
            char = entry['character']
            # Only kanji and kana; exclude component drawings and basic strokes.
            cp = ord(char)
            if not (0x3041 <= cp <= 0x30FF or 0x3400 <= cp <= 0x9FFF or 0xF900 <= cp <= 0xFAFF or 0x20000 <= cp <= 0x323AF):
                continue
            svg = read(f'{folder}/{cp}.svg')
            ids = re.findall(r'<path\s+id="z\d+d(\d+)[a-z]*"', svg)
            assert len(ids) == len(entry['strokes']) == len(entry['medians']), char
            # AnimCJK may split one pen stroke into several fill shapes (e.g.
            # あ's looping third stroke). Rejoin by SVG stroke ID so learners
            # draw it once, rather than learning an incorrect extra stroke.
            groups = {}
            for stroke_id, outline, median in zip(ids, entry['strokes'], entry['medians']):
                group = groups.setdefault(int(stroke_id), {'outlines': [], 'median': median})
                group['outlines'].append(outline)
            assert sorted(groups) == list(range(1, len(groups) + 1)), char
            data = {
                'strokes': [' '.join(g['outlines']) for g in groups.values()],
                'medians': [g['median'] for g in groups.values()],
            }
            assert all(len(m) >= 2 for m in data['medians']), char
            shard = f'{cp >> 8:x}'
            shards.setdefault(shard, {})[char] = data
            characters.append(char)

    output = root / 'public/writing/ja'
    output.mkdir(parents=True, exist_ok=True)
    for old in output.glob('*.json'):
        old.unlink()
    for name, data in shards.items():
        notice = f'MochiRead Japanese stroke data. AnimCJK copyright 2016-2026 FM&SH; Arphic Public License. Modified {date.today().isoformat()}: grouped split outlines by SVG stroke ID and partitioned into Unicode blocks. Source revision {REVISION}. See NOTICE.txt and ARPHICPL.txt. No warranty.'
        (output / f'{name}.json').write_text(json.dumps({'_notice': notice, **data}, ensure_ascii=False, separators=(',', ':')) + '\n')
    (output / 'COPYING.txt').write_text(read('licenses/COPYING.txt'))
    (output / 'ARPHICPL.txt').write_text(read('licenses/APL/english/ARPHICPL.TXT'))
    (output / 'NOTICE.txt').write_text(notice + '\n\nYou may copy, modify, and redistribute this derived stroke data under the Arphic Public License.\nLicence: ARPHICPL.txt\nOriginal notices: COPYING.txt\nSource: https://github.com/parsimonhi/animCJK/tree/' + REVISION + '\nConversion script: https://github.com/ktdilsiz/mochilang/blob/main/apps/mochiread/scripts/build-japanese-writing.py\n')

index = root / 'src/data/japanese-writing-index.json'
index.write_text(json.dumps(''.join(sorted(set(characters))), ensure_ascii=False) + '\n')
for char, count in [('あ', 3), ('ア', 2), ('学', 8), ('校', 10)]:
    assert len(shards[f'{ord(char) >> 8:x}'][char]['strokes']) == count, char
print(f'Generated {len(set(characters))} Japanese characters in {len(shards)} on-demand shards')
