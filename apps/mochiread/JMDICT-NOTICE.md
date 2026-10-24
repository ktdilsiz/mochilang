# JMdict attribution

Japanese readings and English definitions derive from the **JMdict** dictionary
project, copyright the **Electronic Dictionary Research and Development Group**
(EDRDG), distributed under **Creative Commons Attribution-ShareAlike 4.0**.

- Project: https://www.edrdg.org/jmdict/j_jmdict.html
- Licence: https://www.edrdg.org/edrdg/licence.html
- CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
- JSON conversion: https://github.com/scriptin/jmdict-simplified
- Pinned common-English release: `3.6.2+20261019180022`

`packages/dict/scripts/build-japanese.mjs` converts the common-English dataset
to spelling, kana reading, English gloss and part-of-speech tuples, respecting
spelling/reading restrictions. The derived dictionary is distributed under
CC BY-SA 4.0. Rebuild with `node packages/dict/scripts/build-japanese.mjs`.

Common-word coverage is intentional. Names, rare vocabulary and contextual
pronunciation disambiguation are not included. The tokenizer uses dictionary
TinySegmenter's statistical word boundaries and common inflection rules.

TinySegmenter's source, copyright Taku Kudo (2008), declares the new BSD
licence. Its npm wrapper includes an MIT licence, copyright 绝云 (2016).
Source: https://github.com/leungwensen/tiny-segmenter
The local pnpm patch replaces the legacy `RegExp.compile` call with the
standard `RegExp` constructor for Hermes compatibility.
