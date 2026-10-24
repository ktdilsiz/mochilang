# JMdict attribution

Japanese readings and English definitions derive from the **JMdict** dictionary
project, copyright the **Electronic Dictionary Research and Development Group**
(EDRDG), distributed under **Creative Commons Attribution-ShareAlike 4.0**.

- Project: https://www.edrdg.org/jmdict/j_jmdict.html
- Licence: https://www.edrdg.org/edrdg/licence.html
- CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
- JSON conversion: https://github.com/scriptin/jmdict-simplified
- Pinned full-English release: `3.6.2+20261019180022`

`packages/dict/scripts/build-japanese.mjs` converts the full-English dataset
to entries with spellings, permitted readings, and separate restricted senses,
including English glosses and parts of speech. It stores the result as gzipped
base64, decoded lazily by fflate on first use. The derived dictionary is distributed under
CC BY-SA 4.0. Rebuild with `node packages/dict/scripts/build-japanese.mjs`.

JMnedict names and a contextual pronunciation model are not included. The
tokenizer reconciles TinySegmenter's statistical word boundaries with
dictionary compounds and bounded, part-of-speech-checked inflection paradigms.

TinySegmenter's source, copyright Taku Kudo (2008), declares the new BSD
licence. Its npm wrapper includes an MIT licence, copyright 绝云 (2016).
Source: https://github.com/leungwensen/tiny-segmenter
The local pnpm patch replaces the legacy `RegExp.compile` call with the
standard `RegExp` constructor for Hermes compatibility.
