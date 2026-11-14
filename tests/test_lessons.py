import importlib.util
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("bl", ROOT / "scripts" / "build_lessons.py")
bl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bl)

HAN = re.compile(r"[一-鿿]")
L = json.loads((ROOT / "data/hsk3/lessons.json").read_text(encoding="utf-8"))
VOCAB = {w["id"]: w for w in json.loads((ROOT / "data/hsk3/vocab.json").read_text(encoding="utf-8"))}
ID = json.loads((ROOT / "data/hsk3/vocab_id.json").read_text(encoding="utf-8"))
ALLOWED = bl.bid.allowed_chars(VOCAB)


def texts(q):
    """All Chinese strings a learner sees or hears in a question."""
    out = [q.get("stem", ""), q.get("audio", ""), q.get("text", ""), q.get("question", "").lstrip("★ "), q["answer"]]
    out += [t["zh"] for t in q.get("turns", [])]
    out += [o.get("zh") or o.get("word") for o in q.get("options", [])]
    return out


class LessonTests(unittest.TestCase):
    def test_restoran_present_and_complete(self):
        lesson = next(l for l in L if l["id"] == "restoran")
        self.assertEqual(lesson["level"], 3)
        self.assertEqual({k: len(v) for k, v in lesson["steps"].items()}, {"listening": 3, "reading": 3, "writing": 5})
        self.assertGreaterEqual(len(lesson["keyWords"]), 8)
        self.assertGreaterEqual(len(lesson["speaking"]), 1)

    def test_perkenalan_present_and_complete(self):
        lesson = next(l for l in L if l["id"] == "perkenalan")
        self.assertEqual(lesson["level"], 1)
        self.assertEqual({k: len(v) for k, v in lesson["steps"].items()}, {"listening": 3, "reading": 3, "writing": 5})
        self.assertGreaterEqual(len(lesson["keyWords"]), 8)
        # a name is allowed as a piece even though it is not a syllabus word
        self.assertIn("小明", next(s for s in lesson["keySentences"] if s["zh"].startswith("你好"))["tokens"])

    def test_belanja_present_and_complete(self):
        lesson = next(l for l in L if l["id"] == "belanja")
        self.assertEqual(lesson["level"], 2)
        self.assertEqual({k: len(v) for k, v in lesson["steps"].items()}, {"listening": 3, "reading": 3, "writing": 5})
        self.assertGreaterEqual(len(lesson["keyWords"]), 8)
        # sentences with 一点儿-style erhua are not used as key sentences (pinyin and hanzi would not line up)
        self.assertFalse(any("儿" in s["zh"] for s in lesson["keySentences"]))

    def test_lessons_sorted_easiest_first(self):
        keys = [(l["level"], l["id"]) for l in L]
        self.assertEqual(keys, sorted(keys))

    def test_ids_unique_and_files_match(self):
        self.assertEqual(len({l["id"] for l in L}), len(L))
        self.assertEqual({p.stem for p in (ROOT / "content/lessons").glob("*.json")}, {l["id"] for l in L})
        ids = [q["id"] for l in L for s in l["steps"].values() for q in s]
        self.assertEqual(len(ids), len(set(ids)))

    def test_level_lock(self):
        for l in L:
            body = [s["zh"] for s in l["keySentences"]] + [k["word"] for k in l["keyWords"]]
            for s in l["steps"].values():
                for q in s:
                    body += texts(q)
            for t in body:
                for ch in t:
                    if HAN.match(ch):
                        self.assertIn(ch, ALLOWED[l["level"]], (l["id"], ch, t))

    def test_tokens_and_pinyin(self):
        for l in L:
            for s in l["keySentences"]:
                self.assertEqual("".join(s["tokens"]), s["zh"])
                self.assertEqual(len(s["tokens"]), len(s["tokenPinyin"]))
                for t, p in zip(s["tokens"], s["tokenPinyin"]):
                    self.assertEqual(bool(p), t not in bl.PUNCT, (s["zh"], t))
                joined = " ".join(p for p in s["tokenPinyin"] if p)
                self.assertEqual(joined.replace(" ", ""), "".join(x for x in s["pinyin"].split(" ") if x not in bl.PUNCT))

    def test_question_shapes(self):
        for l in L:
            for step, qs in l["steps"].items():
                for q in qs:
                    self.assertEqual(q["skill"], step)
                    self.assertEqual(q["lesson"], l["id"])
                    if q["type"] == "order_sentence":
                        self.assertEqual("".join(q["tokens"]), q["answer"])
                        continue
                    words = [o.get("zh") or o.get("word") for o in q["options"]]
                    self.assertEqual(len(set(words)), len(words), q["id"])
                    self.assertEqual(words.count(q["answer"]), 1, q["id"])
                    if q["type"] == "cloze_wordbank":
                        self.assertEqual(q["stem"].replace(bl.BLANK, q["answer"]), q["explain"]["zh"], q["id"])
                    if q["type"] == "audio_dialog_question_mcq":
                        self.assertTrue(all(t["who"] in ("男", "女") for t in q["turns"]), q["id"])

    def test_key_words_resolve(self):
        for l in L:
            for k in l["keyWords"]:
                if k.get("extra"):
                    self.assertTrue(k["pinyin"] and k["arti"])
                else:
                    w = VOCAB[k["wid"]]
                    self.assertEqual(w["word"], k["word"])
                    self.assertLessEqual(w["level"], l["level"])
                    self.assertIn(str(k["wid"]), ID)

    def test_speaking_sentences_are_key_sentences(self):
        for l in L:
            zh = {s["zh"] for s in l["keySentences"]}
            for s in l["speaking"]:
                self.assertIn(s["zh"], zh)


if __name__ == "__main__":
    unittest.main()
