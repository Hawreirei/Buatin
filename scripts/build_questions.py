#!/usr/bin/env python3
"""Generate practice questions (data/hsk3/questions.json) for HSK 1-2.

Types (names follow blueprints/hsk3.0):
  cloze_wordbank              reading   fill the blank in an example sentence (4 options, 1 correct)
  write_hanzi_from_pinyin     writing   type the missing hanzi given its pinyin
  order_sentence              writing   put shuffled word/punctuation pieces of an example sentence in order
  audio_question_pick_answer  listening hear a question (TTS), pick the answer (3 options)

Sources are the hand-written, level-linted sentences (content/id/level-*.psv -> vocab_id.json) and the
hand-written Q&A pairs (content/id/qa-level-*.psv). Everything is deterministic (seeded by word id).
Quality rules are enforced here and re-checked in tests/test_questions.py.

Usage: python3 -I scripts/build_questions.py
"""
import importlib.util
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build_id", ROOT / "scripts" / "build_id.py")
bid = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bid)

HAN = re.compile(r"[一-鿿]")
BLANK = "（　）"
# Coarse grammatical classes: a cloze distractor must come from a class the answer does NOT belong to,
# so only the answer fits the slot. Predicates (verbs/adjectives) are one group.
CLASS = {"名": "N", "代": "N", "数": "N", "量": "N", "数量": "N", "动": "P", "形": "P", "副": "D",
         "助": "F", "介": "F", "连": "F", "叹": "F", "前缀": "F", "后缀": "F", "拟声": "F"}
NO_BLANK_CHARS = set("的了们吗吧呢子儿")
# Words that can often fill a slot that "looks" wrong (sentence-final particles; adverbs such as 只/就/也/都
# are valid in many predicate slots), so they are never used as distractors for non-adverb/non-particle answers.
SLOT_FLEXIBLE = set("吗吧呢啊")


def classes(pos):
    """Classes of the non-parenthesised POS tags, e.g. '动、（名）' -> {'P'}; None if unknown."""
    toks = [t for t in re.findall(r"（[^）]*）|[^、（）]+", pos or "") if not t.startswith("（")]
    cl = {CLASS[t] for t in toks if t in CLASS}
    return cl or None


def load_all():
    vocab = {w["id"]: w for w in bid.load("vocab.json")}
    ent = {int(k): v for k, v in bid.load("vocab_id.json").items()}
    return vocab, ent


def label(w):
    return w["word"]


def word_classes(vocab):
    """word -> union of classes over ALL entries with that spelling (homographs like 花1 动 / 花2 名)."""
    wc = {}
    for w in vocab.values():
        wc.setdefault(w["word"], set()).update(classes(w["pos"]) or set())
    return wc


def make_cloze(vocab, ent):
    wc = word_classes(vocab)
    out = []
    for wid, e in sorted(ent.items()):
        w = vocab[wid]
        zh = e["contoh"]["zh"]
        cl = classes(w["pos"])
        if not cl or zh.count(w["word"]) != 1 or len(HAN.findall(zh)) < 4:
            continue
        rng = random.Random(wid)
        pool = [x for x in vocab.values()
                if x["level"] <= w["level"] and x["id"] != wid and x["word"] not in zh
                and x["word"] != w["word"] and classes(x["pos"]) and not (wc[x["word"]] & wc[w["word"]])
                and "、" not in x["word"] and len(x["word"]) <= 3
                and (x["word"] not in SLOT_FLEXIBLE or "F" in cl)
                and ("D" not in wc[x["word"]] or "D" in cl)]
        same_len = [x for x in pool if len(x["word"]) == len(w["word"])]
        src = same_len if len(same_len) >= 3 else pool
        picks, seen = [], {w["word"]}
        for x in rng.sample(src, len(src)):
            if x["word"] not in seen:
                picks.append(x)
                seen.add(x["word"])
            if len(picks) == 3:
                break
        if len(picks) < 3:
            continue
        opts = [w] + picks
        rng.shuffle(opts)
        out.append({
            "id": f"c{wid}", "type": "cloze_wordbank", "skill": "reading", "level": w["level"],
            "stem": zh.replace(w["word"], BLANK, 1),
            "options": [{"word": o["word"], "pinyin": o["pinyin"]} for o in opts],
            "answer": w["word"],
            "explain": {"zh": zh, "pinyin": e["contoh"]["pinyin"], "id": e["contoh"]["id"],
                        "word": w["word"], "word_pinyin": w["pinyin"], "arti": e["arti"]},
        })
    return out


def make_write(vocab, ent):
    """Blank one hanzi of the target word; keep only chars whose syllable is unique among the chars
    allowed at that level (no homophone could fill the slot)."""
    from pypinyin import Style, pinyin
    allowed = bid.allowed_chars(vocab)
    readings = {}

    def reads(ch):
        if ch not in readings:
            readings[ch] = {r[0] if isinstance(r, list) else r for r in pinyin(ch, style=Style.TONE, heteronym=True)[0]}
        return readings[ch]

    out = []
    for wid, e in sorted(ent.items()):
        w = vocab[wid]
        zh = e["contoh"]["zh"]
        word = w["word"]
        if "/" in w["pinyin"] or word.endswith("儿"):
            continue
        sylls = bid._split_official(w["pinyin"], len(word), [p[0] for p in pinyin(word, style=Style.TONE)])
        if not sylls:
            continue
        cands = []
        for i, ch in enumerate(word):
            syl = sylls[i]
            if not HAN.match(ch) or ch in NO_BLANK_CHARS or zh.count(ch) != 1:
                continue
            base = bid._base(syl)
            if syl.lower() == base:  # neutral tone: ambiguous
                continue
            others = [c for c in allowed[w["level"]] if c != ch and syl.lower() in {r.lower() for r in reads(c)}]
            if not others:
                cands.append((i, ch, syl.lower()))
        if not cands:
            continue
        i, ch, syl = cands[0]
        out.append({
            "id": f"w{wid}", "type": "write_hanzi_from_pinyin", "skill": "writing", "level": w["level"],
            "stem": zh.replace(ch, BLANK, 1), "hint_pinyin": syl, "answer": ch,
            "explain": {"zh": zh, "pinyin": e["contoh"]["pinyin"], "id": e["contoh"]["id"],
                        "word": word, "word_pinyin": w["pinyin"], "arti": e["arti"]},
        })
    return out


# Words that can move around in a Chinese sentence (time words) or join lists, so more than one order would be
# correct. Sentences containing them are never used for ordering items.
ORDER_AMBIGUOUS = {"今天", "明天", "昨天", "现在", "早上", "上午", "中午", "下午", "晚上", "每天", "以前", "以后",
                   "和", "或者", "还是", "一起", "已经", "刚才", "后天", "前天", "今年", "明年", "去年"}
PUNCT = "，。？！"
NUMBER_PIECES = set("一二三四五六七八九十百千万零两块毛元分个")


def segment(zh, words):
    """Forward maximum matching over `words` (a set of pure-hanzi syllabus words); punctuation is its own piece,
    an unknown hanzi becomes a one-character piece."""
    longest = max(map(len, words))
    out, i = [], 0
    while i < len(zh):
        if not HAN.match(zh[i]):
            out.append(zh[i])
            i += 1
            continue
        for n in range(min(longest, len(zh) - i), 0, -1):
            piece = zh[i:i + n]
            if n == 1 or (piece in words and all(HAN.match(c) for c in piece)):
                out.append(piece)
                i += n
                break
    return out


def make_order(vocab, ent):
    """One ordering item per example sentence with 3-7 word pieces and (practically) one valid order.
    Pieces are words of the syllabus up to the sentence's level; the answer is the audited sentence itself."""
    out, seen, by_level = [], set(), {}
    for wid, e in sorted(ent.items()):
        w = vocab[wid]
        zh = e["contoh"]["zh"]
        if zh in seen:
            continue
        words = by_level.get(w["level"])
        if words is None:
            words = by_level[w["level"]] = {x["word"] for x in vocab.values() if x["level"] <= w["level"] and all(HAN.match(c) for c in x["word"])}
        pieces = segment(zh, words)
        body = [t for t in pieces if t not in PUNCT]
        if "".join(pieces) != zh or not 3 <= len(body) <= 7 or not set(zh) - set(PUNCT):
            continue
        if sum(1 for t in body if t in NUMBER_PIECES) >= 3:
            continue                      # price/number strings (三块五毛): the pieces read as noise
        if any(t in ORDER_AMBIGUOUS for t in pieces) or any(not HAN.match(c) and c not in PUNCT for c in zh):
            continue
        clauses, cur = [], 0               # word pieces per comma-separated clause
        for t in pieces:
            if t == "，":
                clauses.append(cur)
                cur = 0
            elif t not in PUNCT:
                cur += 1
        clauses.append(cur)
        if sum(1 for n in clauses if n >= 2) > 1:
            continue                      # two full clauses could swap places
        seen.add(zh)
        out.append({
            "id": f"o{wid}", "type": "order_sentence", "skill": "writing", "level": w["level"],
            "stem": e["contoh"]["id"], "tokens": pieces, "answer": zh,
            "explain": {"zh": zh, "pinyin": e["contoh"]["pinyin"], "id": e["contoh"]["id"],
                        "word": w["word"], "word_pinyin": w["pinyin"], "arti": e["arti"]},
        })
    return out


def parse_qa(path, allowed, problems):
    items = []
    for n, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        f = [x.strip() for x in line.split("|")]
        loc = f"{Path(path).name}:{n}"
        if len(f) != 7:
            problems.append(f"{loc}: expected 7 fields")
            continue
        level, q, ok, w1, w2, tq, ta = f
        level = int(level)
        opts = [ok, w1, w2]
        if len(set(opts)) != 3:
            problems.append(f"{loc}: options not distinct")
        for t in [q] + opts:
            bad = sorted({c for c in t if HAN.match(c) and c not in allowed[level]})
            if bad:
                problems.append(f"{loc}: chars above level {level}: {''.join(bad)} in {t!r}")
        items.append({"level": level, "q": q, "ok": ok, "wrong": [w1, w2], "tq": tq, "ta": ta})
    return items


def make_listen(allowed, problems):
    from pypinyin import Style, lazy_pinyin
    out, seen = [], set()
    for path in sorted((ROOT / "content" / "id").glob("qa-level-*.psv")):
        for it in parse_qa(path, allowed, problems):
            if it["q"] in seen:
                problems.append(f"duplicate question {it['q']!r}")
            seen.add(it["q"])
            rng = random.Random(it["q"])
            opts = [it["ok"]] + it["wrong"]
            rng.shuffle(opts)
            out.append({
                "id": f"l{len(out) + 1}", "type": "audio_question_pick_answer", "skill": "listening",
                "level": it["level"], "audio": it["q"],
                "audio_pinyin": bid.pinyin_line(it["q"], Style, lazy_pinyin),
                "options": [{"zh": o, "pinyin": bid.pinyin_line(o, Style, lazy_pinyin)} for o in opts],
                "answer": it["ok"],
                "explain": {"question_id": it["tq"], "answer_id": it["ta"]},
            })
    return out


SPEAKER = re.compile(r"^(男|女)：")

# ----------------------------------------------------------------------------------------------
# Picture questions (emoji "pictures": own-made, licence-free; swap in real images later via `src`)
# and reading-text questions (short texts for HSK 1-2, paragraphs for HSK 3).
# ----------------------------------------------------------------------------------------------
OBJECTS = [  # (noun, measure, emoji, Indonesian name)
    ("苹果", "个", "🍎", "apel"), ("猫", "只", "🐱", "kucing"), ("狗", "只", "🐶", "anjing"), ("书", "本", "📖", "buku"),
    ("鸡蛋", "个", "🥚", "telur"), ("饺子", "个", "🥟", "pangsit"), ("茶", "杯", "🍵", "cangkir teh"),
    ("面包", "个", "🍞", "roti"), ("牛奶", "杯", "🥛", "gelas susu"),
]
NUMS = {1: "一", 2: "两", 3: "三", 4: "四", 5: "五"}


def load_scenes(problems):
    path = ROOT / "content" / "pic" / "scenes.json"
    scenes = json.loads(path.read_text(encoding="utf-8"))
    allowed = bid.allowed_chars()
    ids = set()
    for sc in scenes:
        if sc["id"] in ids:
            problems.append(f"scenes.json: duplicate id {sc['id']}")
        ids.add(sc["id"])
        for st in sc["sentences"]:
            bad = sorted({c for c in st["zh"] if HAN.match(c) and c not in allowed[st["lvl"]]})
            if bad:
                problems.append(f"scenes.json: {sc['id']} sentence {st['zh']!r} uses chars above level {st['lvl']}: {''.join(bad)}")
            if sc["emoji"] == "" or not st["id"]:
                problems.append(f"scenes.json: {sc['id']} missing emoji/translation")
    if len({sc["group"] for sc in scenes}) < 8:
        problems.append("scenes.json: need at least 8 groups")
    return {sc["id"]: sc for sc in scenes}


def pic_option(sc):
    return {"key": sc["id"], "emoji": sc["emoji"], "alt": sc["alt"]}


def other_scenes(scenes, answer_id, k, rng):
    """k scenes from k DIFFERENT groups, none in the answer's group: at most one picture can fit the text."""
    groups = {}
    for sc in scenes.values():
        if sc["group"] != scenes[answer_id]["group"]:
            groups.setdefault(sc["group"], []).append(sc)
    chosen = rng.sample(sorted(groups), k)
    return [rng.choice(groups[g]) for g in chosen]


def make_pictures(problems):
    from pypinyin import Style, lazy_pinyin
    py = lambda t: bid.pinyin_line(t, Style, lazy_pinyin)
    allowed = bid.allowed_chars()
    scenes = load_scenes(problems)
    out = []
    nid = [0]

    def add(item):
        nid[0] += 1
        item["id"] = f"p{nid[0]}"
        out.append(item)

    # 1) hear a counted phrase, pick the picture (HSK 1)
    for noun, mw, emoji, alt in OBJECTS:
        for n in range(1, 6):
            phrase = f"{NUMS[n]}{mw}{noun}"
            for t in [phrase]:
                bad = sorted({c for c in t if HAN.match(c) and c not in allowed[1]})
                if bad:
                    problems.append(f"phrase {t!r} chars above level 1: {''.join(bad)}")
            rng = random.Random(phrase)
            wrong_n = rng.choice([x for x in range(1, 6) if x != n])
            other = rng.choice([o for o in OBJECTS if o[0] != noun])
            opts = [
                {"key": f"{noun}|{n}", "emoji": emoji * n, "alt": f"{n} {alt}"},
                {"key": f"{noun}|{wrong_n}", "emoji": emoji * wrong_n, "alt": f"{wrong_n} {alt}"},
                {"key": f"{other[0]}|{n}", "emoji": other[2] * n, "alt": f"{n} {other[3]}"},
            ]
            rng.shuffle(opts)
            add({"type": "audio_phrase_pick_picture", "skill": "listening", "level": 1, "audio": phrase, "audio_pinyin": py(phrase),
                 "dedupe": phrase, "options": opts, "answer": f"{noun}|{n}", "explain": {"audio_id": f"{n} {alt}"}})

    # 2) read a sentence, match the picture (reading) and 3) hear a sentence, pick the picture (listening)
    for sc in scenes.values():
        for st in sc["sentences"]:
            lvl = st["lvl"]
            if lvl > 2:
                continue
            rng = random.Random("r" + sc["id"] + st["zh"])
            opts = [pic_option(sc)] + [pic_option(o) for o in other_scenes(scenes, sc["id"], 5, rng)]
            rng.shuffle(opts)
            add({"type": "sentence_match_picture", "skill": "reading", "level": lvl, "sentence": st["zh"], "sentence_pinyin": py(st["zh"]),
                 "dedupe": "r:" + st["zh"], "options": opts, "answer": sc["id"], "explain": {"sentence_id": st["id"]}})
            rng = random.Random("a" + sc["id"] + st["zh"])
            opts = [pic_option(sc)] + [pic_option(o) for o in other_scenes(scenes, sc["id"], 2, rng)]
            rng.shuffle(opts)
            add({"type": "audio_sentence_pick_picture", "skill": "listening", "level": 2, "audio": st["zh"], "audio_pinyin": py(st["zh"]),
                 "dedupe": "a:" + st["zh"], "options": opts, "answer": sc["id"], "explain": {"audio_id": st["id"]}})

    # 4) hear a short dialog, match the picture (6 options)
    path = ROOT / "content" / "pic" / "dialogs.psv"
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        f = [x.strip() for x in line.split("|")]
        loc = f"dialogs.psv:{n}"
        if len(f) != 4 or f[1] not in scenes:
            problems.append(f"{loc}: bad line or unknown scene")
            continue
        lvl, sid, text, tr = int(f[0]), f[1], f[2], f[3]
        bad = sorted({c for c in text.replace("/", "") if HAN.match(c) and c not in allowed[lvl]})
        if bad:
            problems.append(f"{loc}: chars above level {lvl}: {''.join(bad)}")
        turns = []
        for part in text.split("/"):
            m = SPEAKER.match(part)
            if not m:
                problems.append(f"{loc}: every turn needs 男：/女：")
                continue
            turns.append({"who": m.group(1), "zh": SPEAKER.sub("", part), "pinyin": py(SPEAKER.sub("", part))})
        rng = random.Random("d" + text)
        opts = [pic_option(scenes[sid])] + [pic_option(o) for o in other_scenes(scenes, sid, 5, rng)]
        rng.shuffle(opts)
        add({"type": "audio_dialog_match_picture", "skill": "listening", "level": lvl, "turns": turns, "dedupe": "d:" + text,
             "options": opts, "answer": sid, "explain": {"text_id": tr}})
    return out


def make_texts(allowed, problems):
    from pypinyin import Style, lazy_pinyin
    py = lambda t: bid.pinyin_line(t, Style, lazy_pinyin)
    out = []
    for lvl in (1, 2, 3):
        path = ROOT / "content" / "id" / f"reading-level-{lvl}.psv"
        if not path.exists():
            continue
        for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip() or line.startswith("#"):
                continue
            f = [x.strip() for x in line.split("|")]
            loc = f"{path.name}:{n}"
            if len(f) != 9:
                problems.append(f"{loc}: expected 9 fields, got {len(f)}")
                continue
            level, text, q, ok, w1, w2, t_text, t_q, t_ok = f
            level = int(level)
            opts = [ok, w1, w2]
            if len(set(opts)) != 3:
                problems.append(f"{loc}: options not distinct")
            if not q.startswith("★"):
                problems.append(f"{loc}: question must start with ★")
            for t in [text, q.lstrip("★ ")] + opts:
                bad = sorted({c for c in t if HAN.match(c) and c not in allowed[level]})
                if bad:
                    problems.append(f"{loc}: chars above level {level}: {''.join(bad)}")
            rng = random.Random(text + q)
            shuffled = opts[:]
            rng.shuffle(shuffled)
            out.append({
                "id": f"t{len(out) + 1}", "type": "short_text_mcq" if level < 3 else "passage_mcq", "skill": "reading", "level": level,
                "text": text, "text_pinyin": py(text), "question": q, "question_pinyin": py(q.lstrip("★ ")),
                "dedupe": "t:" + text + q, "options": [{"zh": o, "pinyin": py(o)} for o in shuffled], "answer": ok,
                "explain": {"text_id": t_text, "question_id": t_q, "answer_id": t_ok},
            })
    return out



def make_dialogs(allowed, problems, start_id):
    """HSK 3 listening: dialogs (audio_dialog_question_mcq) and short passages (audio_passage_question_mcq)."""
    from pypinyin import Style, lazy_pinyin
    py = lambda t: bid.pinyin_line(t, Style, lazy_pinyin)
    out = []
    path = ROOT / "content" / "id" / "dialog-level-3.psv"
    if not path.exists():
        return out
    seen = set()
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        f = [x.strip() for x in line.split("|")]
        loc = f"{path.name}:{n}"
        if len(f) != 9:
            problems.append(f"{loc}: expected 9 fields, got {len(f)}")
            continue
        level, text, q, ok, w1, w2, t_text, t_q, t_ok = f
        level = int(level)
        opts = [ok, w1, w2]
        if len(set(opts)) != 3:
            problems.append(f"{loc}: options not distinct")
        if text in seen:
            problems.append(f"{loc}: duplicate text")
        seen.add(text)
        for t in [text.replace("/", ""), q] + opts:
            bad = sorted({c for c in t if HAN.match(c) and c not in allowed[level]})
            if bad:
                problems.append(f"{loc}: chars above level {level}: {''.join(bad)}")
        turns = []
        for part in text.split("/"):
            m = SPEAKER.match(part)
            turns.append({"who": m.group(1) if m else "", "zh": SPEAKER.sub("", part), "pinyin": py(SPEAKER.sub("", part))})
        dialog = len(turns) > 1 and all(t["who"] for t in turns)
        rng = random.Random(text)
        shuffled = opts[:]
        rng.shuffle(shuffled)
        out.append({
            "id": f"d{start_id + len(out)}",
            "type": "audio_dialog_question_mcq" if dialog else "audio_passage_question_mcq",
            "skill": "listening", "level": level, "turns": turns, "question": q, "question_pinyin": py(q),
            "options": [{"zh": o, "pinyin": py(o)} for o in shuffled], "answer": ok,
            "explain": {"text_id": t_text, "question_id": t_q, "answer_id": t_ok},
        })
    return out


def main():
    vocab, ent = load_all()
    problems = []
    allowed = bid.allowed_chars(vocab)
    items = make_cloze(vocab, ent) + make_write(vocab, ent) + make_order(vocab, ent) + make_listen(allowed, problems)
    items += make_dialogs(allowed, problems, 1)
    items += make_pictures(problems)
    items += make_texts(allowed, problems)
    if problems:
        print("\n".join(problems))
        sys.exit(1)
    path = ROOT / "data" / "hsk3" / "questions.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    print(len(items), "questions", dict(Counter((i["type"], i["level"]) for i in items)))


if __name__ == "__main__":
    main()
