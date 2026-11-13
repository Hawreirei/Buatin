#!/usr/bin/env python3
"""Build data/hsk3/vocab.json and handwriting.json from the official HSK 3.0 syllabus (2025 edition).

Only the word list and the handwriting-character list are kept: that is all the app needs. The rest of the
syllabus (grammar, tasks, topics, proper nouns, recognition characters) is deliberately NOT redistributed.

Usage:
  python3 -I scripts/build_hsk3.py <ofou-hsk-dir> [<complete.json>]

<ofou-hsk-dir>  checkout of https://github.com/ofou/hsk -- a mirror of the official
                query system https://www.chinesetest.cn/syllabus (CLEC/CTI, syllabus
                released 2025-11, in force 2026-07).
<complete.json> optional: drkameleon/complete-hsk-vocabulary, used only to attach
                English glosses (CC-CEDICT, CC BY-SA 4.0) -- the official syllabus
                itself has no English meanings.
"""
import csv
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "hsk3"
LEVELS = {"一级": 1, "二级": 2, "三级": 3, "四级": 4, "五级": 5, "六级": 6, "七-九级": 7}
HOMOGRAPH = re.compile(r"^(.+?)(\d)$")


def rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def parse_levels(raw):
    """'一级（二级）（四级）' -> (1, [2, 4]); the first band is the one the entry counts against."""
    bands = [LEVELS[b] for b in re.findall(r"(?:[一二三四五六]级|七-九级)", raw)]
    if not bands:
        raise ValueError(f"unparseable level: {raw!r}")
    return bands[0], bands[1:]


def norm_pinyin(s):
    return unicodedata.normalize("NFC", s).replace(" ", "").replace("'", "").lower()


def load_glosses(path):
    with open(path, encoding="utf-8") as f:
        return {w["simplified"]: w["forms"] for w in json.load(f)}


def gloss_for(idx, word, pinyin):
    forms = idx.get(word)
    if not forms:
        return None
    for f in forms:
        if norm_pinyin(f["transcriptions"]["pinyin"]) == norm_pinyin(pinyin):
            return f["meanings"]
    return forms[0]["meanings"]


def dump(name, data):
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{name}: {len(data)}")


def main(src, gloss_path=None):
    src = Path(src)
    gl = load_glosses(gloss_path) if gloss_path else {}

    vocab = []
    for r in rows(src / "词汇.csv"):
        level, also = parse_levels(r["级别"])
        word, homograph = r["词语"], None
        m = HOMOGRAPH.match(word)
        if m:
            word, homograph = m.group(1), int(m.group(2))
        vocab.append({
            "id": int(r["No."]), "level": level, "also_levels": also,
            "word": word, "homograph": homograph, "pinyin": r["拼音"], "pos": r["词性"],
            "gloss_en": gloss_for(gl, word, r["拼音"]) if gl else None,
        })
    dump("vocab.json", vocab)

    dump("handwriting.json", [{"id": int(r["No."]), "level": LEVELS[r["级别"]], "char": r["汉字"]} for r in rows(src / "手写汉字.csv")])

    sha = subprocess.run(["git", "-C", str(src), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    with open(OUT / "SOURCE.json", "w", encoding="utf-8") as f:
        json.dump({
            "upstream": "https://github.com/ofou/hsk", "upstream_commit": sha,
            "official_source": "https://www.chinesetest.cn/syllabus",
            "syllabus": "HSK 考试大纲 (CLEC/CTI), released 2025-11, in force 2026-07",
            "glosses": "drkameleon/complete-hsk-vocabulary (CC-CEDICT, CC BY-SA 4.0)" if gl else None,
        }, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    main(*sys.argv[1:])
