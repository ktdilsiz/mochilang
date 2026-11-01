# Japanese stroke data

Source: [AnimCJK](https://github.com/parsimonhi/animCJK), copyright 2016–2026
FM&SH, revision `dd65f4fde402b504c99005479e6217ce21e5d54e`.

The Japanese graphics are derived in part from Arphic PL KaitiM GB/Big5 fonts
and Make Me a Hanzi. The derived stroke data in `public/writing/ja/*.json` is
distributed under the **Arphic Public License**, with no warranty. Original
notices and the complete license accompany the dataset in `COPYING.txt` and
`ARPHICPL.txt`. The dataset and modifications are freely available in this
repository and on the public website.

`scripts/build-japanese-writing.py` checks the pinned archive's SHA-256,
selects Japanese kanji and kana, joins split outlines belonging to the same
SVG stroke ID, preserves Japanese stroke order and median coordinates, and
partitions the data into Unicode blocks for loading on demand. Each derived
file records these modifications and its generation date. The small character
index contains only supported Unicode characters, not stroke geometry.

No Chinese glyphs or stroke order are substituted for missing Japanese data.
