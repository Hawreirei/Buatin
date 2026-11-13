#!/usr/bin/env python3
"""Merge hand-written Indonesian content (content/id/level-*.psv) into data/hsk3/vocab_id.json.

Each line: id|kata|arti Indonesia|kalimat contoh|terjemahan Indonesia
Checks (hard errors): id exists and `kata` matches the official word; the example contains the word;
every Chinese character in the example appears in an official vocabulary word of the target level or below
(example sentences must not use characters above the target level).
Sentence pinyin is generated automatically with pypinyin (may mis-read heteronyms).

Usage: python3 -I scripts/build_id.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HAN = re.compile(r"[一-鿿]")
PUNCT_OK = set("，。？！、：；“”‘’（）…—· 0123456789")


def load(name):
    with open(ROOT / "data" / "hsk3" / name, encoding="utf-8") as f:
        return json.load(f)


def parse(path):
    for n, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) != 5:
            yield n, None, f"expected 5 fields, got {len(parts)}"
            continue
        yield n, parts, None


def allowed_chars(vocab=None):
    """level -> set of hanzi a text of that level may use: every character of the official vocabulary
    words of that level and below (cumulative). Needs nothing beyond the official word list."""
    if vocab is None:
        vocab = {w["id"]: w for w in load("vocab.json")}
    chars = {}
    for w in vocab.values():
        chars.setdefault(w["level"], set()).update(c for c in w["word"] if HAN.match(c))
    return {lvl: set().union(*(chars.get(l, set()) for l in range(1, lvl + 1))) for lvl in range(1, 8)}


def lint(files):
    vocab = {w["id"]: w for w in load("vocab.json")}
    allowed = allowed_chars(vocab)
    entries, problems, seen = {}, [], set()
    for path in files:
        for n, parts, err in parse(path):
            loc = f"{Path(path).name}:{n}"
            if err:
                problems.append(f"{loc}: {err}")
                continue
            sid, word, arti, zh, tr = (p.strip() for p in parts)
            if not sid.isdigit() or int(sid) not in vocab:
                problems.append(f"{loc}: unknown id {sid}")
                continue
            sid = int(sid)
            w = vocab[sid]
            label = w["word"] + (str(w["homograph"]) if w["homograph"] else "")
            if word != label:
                problems.append(f"{loc}: id {sid} is {label!r}, file says {word!r}")
            if sid in seen:
                problems.append(f"{loc}: duplicate id {sid}")
            seen.add(sid)
            if not arti or not zh or not tr:
                problems.append(f"{loc}: empty field")
            if w["word"] not in zh:
                problems.append(f"{loc}: example does not contain {w['word']!r}")
            bad = sorted({c for c in zh if (HAN.match(c) and c not in allowed[w["level"]]) or (not HAN.match(c) and c not in PUNCT_OK)})
            if bad:
                problems.append(f"{loc}: {w['word']} (L{w['level']}) example uses chars above level/unknown: {''.join(bad)}")
            entries[sid] = {"arti": arti, "zh": zh, "id": tr}
    return entries, problems


# Context fixes for pypinyin's default readings (found by manual review; see tests/test_i18n.py).
PHRASES = {
    "很长": [["hěn"], ["cháng"]],
    "高兴地": [["gāo"], ["xìng"], ["de"]],
    "说得": [["shuō"], ["de"]],
    "唱得": [["chàng"], ["de"]],
    "走得": [["zǒu"], ["de"]],
    "跑得": [["pǎo"], ["de"]],
    "笑得": [["xiào"], ["de"]],
    "写得": [["xiě"], ["de"]],
    "教我们": [["jiāo"], ["wǒ"], ["men"]],
    "去过": [["qù"], ["guo"]],
    "吃过": [["chī"], ["guo"]],
    "米长": [["mǐ"], ["cháng"]],
    "得走": [["děi"], ["zǒu"]],
    "地方": [["dì"], ["fang"]],
    "还你": [["huán"], ["nǐ"]],
}

_MARK = {c: b for b, cs in {"a": "āáǎà", "e": "ēéěè", "i": "īíǐì", "o": "ōóǒò", "u": "ūúǔù", "v": "ǖǘǚǜü"}.items() for c in cs}
_OFFICIAL = None


def _base(s):
    return "".join(_MARK.get(c, c) for c in s.lower() if c not in " '’-")


def _official_words():
    """word -> official pinyin string, only for words with exactly one unambiguous entry."""
    global _OFFICIAL
    if _OFFICIAL is None:
        seen, ok, ambiguous = {}, {}, set()
        for w in load("vocab.json"):
            seen.setdefault(w["word"], []).append(w["pinyin"])
        for word, pys in seen.items():
            if len(pys) == 1 and "/" not in pys[0]:
                ok[word] = pys[0]
            else:
                ambiguous.add(word)
        _OFFICIAL = (ok, ambiguous)
    return _OFFICIAL


def _split_official(official, n_syl, auto_syl):
    """Cut the official pinyin string (no separators) into n_syl syllables guided by the auto syllables'
    toneless spelling; returns None if the spellings disagree (then the auto reading is kept)."""
    lens = [len(_base(x)) for x in auto_syl]
    if len(lens) != n_syl or _base("".join(auto_syl)) != _base(official):
        return None
    out, cur, k = [], "", 0
    for ch in official:
        if ch in " '’-":
            continue
        cur += ch
        if len(_base(cur)) == lens[len(out)]:
            out.append(cur)
            cur = ""
    return out if len(out) == n_syl and not cur else None


def _apply_official(zh, marks):
    """Replace auto readings by the official syllabus reading for every vocabulary word found in the
    sentence (longest match), so neutral tones (爸爸 bàba, 朋友 péngyou) match the syllabus."""
    words, ambiguous = _official_words()
    maxlen = max(len(w) for w in list(words) + list(ambiguous))
    i = 0
    while i < len(zh):
        hit = None
        for n in range(min(maxlen, len(zh) - i), 0, -1):
            w = zh[i : i + n]
            if w in words or w in ambiguous:
                hit = w
                break
        if not hit:
            i += 1
            continue
        if hit in ambiguous:  # several readings: keep the auto reading and protect the whole span
            i += len(hit)
            continue
        official, n = words[hit], len(hit)
        erhua = hit.endswith("儿") and n > 1 and official.endswith("r") and not official.endswith(("ér", "er"))
        stem_n = n - 1 if erhua else n
        stem_off = official[:-1] if erhua else official
        parts = _split_official(stem_off, stem_n, marks[i : i + stem_n])
        if parts:
            marks[i : i + stem_n] = [x.lower().replace("-", "") for x in parts]
            if erhua:
                marks[i + stem_n] = "r"  # merged into previous syllable later
        i += n
NUMERAL_BEFORE_YI = set("第十二三四五六七八九零百千万")


def pinyin_line(zh, Style, lazy_pinyin):
    """Textbook-style pinyin: syllables separated by spaces, 不/一 tone sandhi applied,
    erhua 儿 merged into the previous syllable (女儿 keeps its own). Third-tone sandhi is NOT applied
    (textbooks write the base tone)."""
    from pypinyin import load_phrases_dict, load_single_dict
    load_phrases_dict(PHRASES)
    load_single_dict({ord("谁"): "shéi,shuí"})  # one consistent reading (the syllabus lists shéi/shuí)
    marks = lazy_pinyin(zh, style=Style.TONE, errors=lambda s: list(s))
    nums = lazy_pinyin(zh, style=Style.TONE3, errors=lambda s: list(s))
    assert len(marks) == len(zh) == len(nums)
    _apply_official(zh, marks)

    def tone_of(i):
        m = re.search(r"\d", nums[i]) if i < len(nums) else None
        return int(m.group()) if m else 0

    for i, ch in enumerate(zh):
        if i + 1 >= len(zh) or not HAN.match(zh[i + 1]):
            continue
        nxt = tone_of(i + 1)
        if ch == "不" and nxt == 4:
            marks[i] = "bú"
        elif ch == "一" and not (i > 0 and zh[i - 1] in NUMERAL_BEFORE_YI):
            marks[i] = "yí" if nxt == 4 else "yì"
    for i, ch in enumerate(zh):  # structural 得 (verb + 得 + degree/result) is read "de"
        if ch == "得" and i > 0 and HAN.match(zh[i - 1]) and zh[i + 1 : i + 2] in set("很太真不特好非更"):
            marks[i] = "de"
    out = []
    for i, (ch, p) in enumerate(zip(zh, marks)):
        if p == "r":
            out[-1] += "r"
        elif ch == "儿" and i > 0 and HAN.match(zh[i - 1]) and zh[i - 1] != "女" and zh[i + 1 : i + 2] != "子":
            out[-1] += "r"
        else:
            out.append(p)
    return " ".join(out)


def main():
    files = sorted((ROOT / "content" / "id").glob("level-*.psv"))
    entries, problems = lint(files)
    if problems:
        print("\n".join(problems))
        print(f"\n{len(problems)} problem(s)")
        sys.exit(1)
    from pypinyin import Style, lazy_pinyin
    out = {}
    for sid, e in sorted(entries.items()):
        py = pinyin_line(e["zh"], Style, lazy_pinyin)
        out[str(sid)] = {"arti": e["arti"], "contoh": {"zh": e["zh"], "pinyin": py, "id": e["id"]}}
    with open(ROOT / "data" / "hsk3" / "vocab_id.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {len(out)} entries")


if __name__ == "__main__":
    main()
