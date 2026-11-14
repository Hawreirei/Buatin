#!/usr/bin/env python3
"""Build data/hsk3/lessons.json from content/lessons/*.json (themed lessons: listening, reading, writing,
speaking, vocab). Each lesson carries its own questions, already in the shapes views/question.js renders.

Quality rules (re-checked in tests/test_lessons.py):
  - every hanzi of the lesson body is in the syllabus up to the lesson's level (the title is a heading and exempt);
  - tokens of a key sentence join back to the sentence, and each is a syllabus word (<= level), a lesson extra or name, or one hanzi;
  - key words resolve to syllabus words that have a hand-written Indonesian meaning;
  - pinyin comes from the same pipeline as the rest of the app (per token, never typed by hand).

Usage: python3 -I scripts/build_lessons.py
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
PUNCT = "，。？！"
BLANK = "（　）"
SPEAKER = re.compile(r"^(男|女)：")


def build(lesson, vocab, ent, allowed, problems):
    from pypinyin import Style, lazy_pinyin
    py = lambda t: bid.pinyin_line(t, Style, lazy_pinyin)
    lid, level = lesson["id"], lesson["level"]
    loc = f"lesson {lid}"
    words = {w["word"] for w in vocab.values() if w["level"] <= level}

    def lint(text, where):
        bad = sorted({c for c in text if HAN.match(c) and c not in allowed[level]})
        if bad:
            problems.append(f"{loc}: chars above level {level} in {where}: {''.join(bad)}")

    extras = {k["zh"] for k in lesson["keyWords"] if isinstance(k, dict)} | set(lesson.get("names", []))   # names (小明) may be a piece without being a syllabus word

    # ---- key sentences
    sentences = []
    for n, s in enumerate(lesson["keySentences"], 1):
        where = f"keySentences[{n}]"
        lint(s["zh"], where)
        if "".join(s["tokens"]) != s["zh"]:
            problems.append(f"{loc}: {where} tokens do not join to the sentence")
            continue
        for t in s["tokens"]:
            if t not in PUNCT and len(t) > 1 and t not in words and t not in extras:
                problems.append(f"{loc}: {where} token {t!r} is not a syllabus word of level <= {level}")
        syl = py(s["zh"]).split(" ")
        han = [c for c in s["zh"] if HAN.match(c)]
        if len([x for x in syl if x not in PUNCT]) != len(han):
            problems.append(f"{loc}: {where} pinyin and hanzi differ in length (erhua?)")
            continue
        it = iter(x for x in syl if x not in PUNCT)
        tp = ["" if t in PUNCT else "".join(next(it) for _ in t) for t in s["tokens"]]
        alts = s.get("alt", [])                      # other orders that are just as correct (accepted by the ordering item)
        for a in alts:
            if sorted(a) != sorted(s["zh"]) or a == s["zh"]:
                problems.append(f"{loc}: {where} alt {a!r} must be a different order of the same characters")
        sentences.append({"zh": s["zh"], "id": s["id"], "pinyin": py(s["zh"]), "tokens": s["tokens"], "tokenPinyin": tp, "order": s.get("order", True), "alt": alts})
    by_zh = {s["zh"]: s for s in sentences}

    # ---- key words
    ids = {}
    for w in sorted(vocab.values(), key=lambda x: x["id"]):
        if w["level"] <= level and w["id"] in ent:
            ids.setdefault(w["word"], w["id"])
    key_words = []
    for k in lesson["keyWords"]:
        if isinstance(k, dict):
            lint(k["zh"], f"extra {k['zh']}")
            key_words.append({"word": k["zh"], "pinyin": k["pinyin"], "arti": k["id"], "extra": True})
        elif k in ids:
            w = vocab[ids[k]]
            key_words.append({"wid": w["id"], "word": w["word"], "pinyin": w["pinyin"], "level": w["level"], "arti": ent[w["id"]]["arti"]})
        else:
            problems.append(f"{loc}: key word {k!r} is not a syllabus word (<= level {level}) with an Indonesian meaning")

    steps = {"listening": [], "reading": [], "writing": []}

    def rid(step, n):
        return f"ls-{lid}-{step[0]}{n}"

    def opts(texts, seed):
        if len(set(texts)) != len(texts):
            problems.append(f"{loc}: options not distinct: {texts}")
        o = texts[:]
        random.Random(seed).shuffle(o)
        return o

    # ---- listening
    for n, it in enumerate(lesson["listening"], 1):
        where = f"listening[{n}]"
        o = opts([it["ok"]] + it["wrong"], lid + it["q"])
        for t in [it.get("text", "").replace("/", ""), it["q"]] + o:
            lint(t, where)
        if it["kind"] == "qa":
            steps["listening"].append({
                "id": rid("listening", n), "type": "audio_question_pick_answer", "skill": "listening", "level": level, "lesson": lid,
                "audio": it["q"], "audio_pinyin": py(it["q"]), "options": [{"zh": x, "pinyin": py(x)} for x in o], "answer": it["ok"],
                "explain": {"question_id": it["tq"], "answer_id": it["ta"]}})
        else:
            turns = []
            for part in it["text"].split("/"):
                m = SPEAKER.match(part)
                if not m:
                    problems.append(f"{loc}: {where} every turn needs 男：/女：")
                turns.append({"who": m.group(1) if m else "", "zh": SPEAKER.sub("", part), "pinyin": py(SPEAKER.sub("", part))})
            steps["listening"].append({
                "id": rid("listening", n), "type": "audio_dialog_question_mcq", "skill": "listening", "level": level, "lesson": lid,
                "turns": turns, "question": it["q"], "question_pinyin": py(it["q"]), "options": [{"zh": x, "pinyin": py(x)} for x in o], "answer": it["ok"],
                "explain": {"text_id": it["t_text"], "question_id": it["t_q"], "answer_id": it["t_ok"]}})

    # ---- reading
    for n, it in enumerate(lesson["reading"], 1):
        where = f"reading[{n}]"
        if it["kind"] == "cloze":
            if it["stem"].count(BLANK) != 1 or it["stem"].replace(BLANK, it["ok"]) != it["zh"]:
                problems.append(f"{loc}: {where} stem + answer must give the sentence")
            o = opts([it["ok"]] + it["wrong"], lid + it["stem"])
            for t in [it["zh"]] + o:
                lint(t, where)
            steps["reading"].append({
                "id": rid("reading", n), "type": "cloze_wordbank", "skill": "reading", "level": level, "lesson": lid,
                "stem": it["stem"], "options": [{"word": x, "pinyin": py(x)} for x in o], "answer": it["ok"],
                "explain": {"zh": it["zh"], "pinyin": py(it["zh"]), "id": it["id"]}})
        else:
            if not it["q"].startswith("★"):
                problems.append(f"{loc}: {where} question must start with ★")
            o = opts([it["ok"]] + it["wrong"], lid + it["text"] + it["q"])
            for t in [it["text"], it["q"].lstrip("★ ")] + o:
                lint(t, where)
            steps["reading"].append({
                "id": rid("reading", n), "type": "short_text_mcq", "skill": "reading", "level": level, "lesson": lid,
                "text": it["text"], "text_pinyin": py(it["text"]), "question": it["q"], "question_pinyin": py(it["q"].lstrip("★ ")),
                "options": [{"zh": x, "pinyin": py(x)} for x in o], "answer": it["ok"],
                "explain": {"text_id": it["t_text"], "question_id": it["t_q"], "answer_id": it["t_ok"]}})

    # ---- writing: one ordering item per key sentence that allows it
    for n, s in enumerate([s for s in sentences if s["order"]], 1):
        steps["writing"].append({
            "id": rid("writing", n), "type": "order_sentence", "skill": "writing", "level": level, "lesson": lid,
            "stem": s["id"], "tokens": s["tokens"], "answer": s["zh"], **({"alt": s["alt"]} if s["alt"] else {}),
            "explain": {"zh": s["zh"], "pinyin": s["pinyin"], "id": s["id"]}})

    # ---- speaking: sentences to say (scoring comes in a later stage)
    speaking = []
    for zh in lesson["speaking"]:
        if zh not in by_zh:
            problems.append(f"{loc}: speaking sentence {zh!r} is not a key sentence")
        else:
            speaking.append(by_zh[zh])

    return {"id": lid, "level": level, "zh": lesson["zh"], "title": lesson["title"], "summary": lesson["summary"],
            "keySentences": sentences, "keyWords": key_words, "steps": steps, "speaking": speaking}


def build_all():
    """(lessons, problems) built from content/lessons/*.json."""
    vocab = {w["id"]: w for w in bid.load("vocab.json")}
    ent = {int(k): v for k, v in bid.load("vocab_id.json").items()}
    allowed = bid.allowed_chars(vocab)
    problems, out, seen = [], [], set()
    for path in sorted((ROOT / "content" / "lessons").glob("*.json")):
        lesson = json.loads(path.read_text(encoding="utf-8"))
        if lesson["id"] in seen or lesson["id"] != path.stem:
            problems.append(f"{path.name}: id must be unique and equal to the file name")
        seen.add(lesson["id"])
        out.append(build(lesson, vocab, ent, allowed, problems))
    out.sort(key=lambda l: (l["level"], l["id"]))             # easiest first
    return out, problems


def dump(lessons):
    return json.dumps(lessons, ensure_ascii=False, separators=(",", ":"))


def main():
    out, problems = build_all()
    if problems:
        print("\n".join(problems))
        sys.exit(1)
    (ROOT / "data" / "hsk3" / "lessons.json").write_text(dump(out), encoding="utf-8")
    for l in out:
        print(l["id"], {k: len(v) for k, v in l["steps"].items()}, len(l["keyWords"]), "key words")


if __name__ == "__main__":
    main()
