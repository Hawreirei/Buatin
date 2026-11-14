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

    def test_tanya_arah_present_and_complete(self):
        lesson = next(l for l in L if l["id"] == "tanya-arah")
        self.assertEqual(lesson["level"], 2)
        self.assertEqual({k: len(v) for k, v in lesson["steps"].items()}, {"listening": 3, "reading": 3, "writing": 5})
        self.assertFalse(any("儿" in s["zh"] for s in lesson["keySentences"]))     # 哪儿 -> 哪里: erhua would break the pinyin alignment

    def test_rumah_sakit_present_and_complete(self):
        lesson = next(l for l in L if l["id"] == "rumah-sakit")
        self.assertEqual(lesson["level"], 3)
        self.assertEqual({k: len(v) for k, v in lesson["steps"].items()}, {"listening": 3, "reading": 3, "writing": 5})
        self.assertFalse(any("儿" in s["zh"] for s in lesson["keySentences"]))
        # HSK 3 characters 咳嗽痛肚嗓挂 are not in the syllabus yet: they must not appear anywhere (the level lock test covers the text)
        self.assertTrue(all(k.get("extra") or k["level"] <= 3 for k in lesson["keyWords"]))

    def test_lessons_sorted_easiest_first(self):
        keys = [(l["level"], l["id"]) for l in L]
        self.assertEqual(keys, sorted(keys))

    def test_committed_data_is_current(self):
        """lessons.json must be what the content files build to (run `npm run build` after editing content/lessons)."""
        built, problems = bl.build_all()
        self.assertEqual(problems, [])
        self.assertEqual((ROOT / "data/hsk3/lessons.json").read_text(encoding="utf-8"), bl.dump(built))

    def test_accepted_alternative_orders(self):
        n = 0
        for l in L:
            for q in l["steps"]["writing"]:
                for a in q.get("alt", []):
                    n += 1
                    self.assertEqual(sorted(a), sorted(q["answer"]))
                    self.assertNotEqual(a, q["answer"])
        self.assertGreaterEqual(n, 2)                    # 请给我菜单，服务员。 and 我叫小明，你好。

    # ---- authoring rules (checked on small in-memory lessons)
    @staticmethod
    def _problems(level, sentences, key_words=(), readings=None, extra=None):
        vocab = {w["id"]: w for w in bl.bid.load("vocab.json")}
        ent = {int(k): v for k, v in bl.bid.load("vocab_id.json").items()}
        lesson = {"id": "t", "level": level, "zh": "测", "title": "T", "summary": "s", "keySentences": sentences,
                  "keyWords": list(key_words), "listening": [], "reading": [], "speaking": [], **({"readings": readings} if readings else {}), **(extra or {})}
        problems = []
        out = bl.build(lesson, vocab, ent, bl.bid.allowed_chars(vocab), problems)
        return out, problems

    def test_key_word_with_own_meaning(self):
        s = [{"zh": "我去面试。", "id": "x", "tokens": ["我", "去", "面试", "。"]}]
        out, p = self._problems(4, s, [{"word": "面试", "arti": "wawancara kerja"}])
        self.assertEqual(p, [])
        kw = out["keyWords"][0]
        self.assertEqual((kw["word"], kw["arti"], kw["level"]), ("面试", "wawancara kerja", 4))
        self.assertIn("wid", kw)                                          # a syllabus word: it can be added to Hafalan
        _, p = self._problems(4, s, ["面试"])                              # bare string: HSK 4+ words have no hand-written meaning
        self.assertTrue(any("Indonesian meaning" in x for x in p))
        _, p = self._problems(3, s, [{"word": "面试", "arti": "x"}])        # above the lesson's level
        self.assertTrue(any("must be a syllabus word" in x for x in p))

    def test_phrase_pieces_only_from_hsk4_and_at_most_eight(self):
        zh = "我对这个工作很满意。"
        ph = [{"zh": zh, "id": "x", "tokens": ["我", "对这个工作", "很", "满意", "。"], "phrases": True}]
        self.assertEqual(self._problems(4, ph)[1], [])
        self.assertTrue(any("HSK 4+" in x for x in self._problems(3, ph)[1]))
        no_flag = [{"zh": zh, "id": "x", "tokens": ["我", "对这个工作", "很", "满意", "。"]}]
        self.assertTrue(any("not a syllabus word" in x for x in self._problems(4, no_flag)[1]))
        nine = [{"zh": "我们在这里很好吃饭。", "id": "x", "tokens": list("我们在这里很好吃饭") + ["。"], "phrases": True}]
        self.assertTrue(any("more than 8 pieces" in x for x in self._problems(4, nine)[1]))
        self.assertEqual(self._problems(4, [{**nine[0], "order": False}])[1], [])

    def test_unusual_readings_must_be_listed(self):
        s = [{"zh": "银行在前面。", "id": "x", "tokens": ["银行", "在", "前面", "。"]}]
        _, p = self._problems(3, s)
        self.assertTrue(any("行 is read háng" in x for x in p), p)
        out, p = self._problems(3, s, readings={"银行": "yín háng"})
        self.assertEqual(p, [])
        self.assertTrue(out["keySentences"][0]["pinyin"].startswith("yín háng"))
        _, p = self._problems(3, s, readings={"银行": "yín háng", "长大": "zhǎng dà"})
        self.assertTrue(any("does not occur" in x for x in p))             # a listed reading that is never used is a typo
        _, p = self._problems(3, s, readings={"银行": "yín"})
        self.assertTrue(any("one pinyin syllable per hanzi" in x for x in p))

    def test_erhua_does_not_hide_unusual_readings(self):
        self.assertEqual(bl.unusual_readings("喝一点儿茶", lambda t: "hē yì diǎnr chá"), [])
        self.assertEqual(bl.unusual_readings("银行", lambda t: "yín háng"), [(1, "行", "háng")])
        self.assertEqual(bl.unusual_readings("便宜一点儿", lambda t: "pián yi yì diǎnr")[0][1], "便")

    def test_readings_are_in_the_data(self):
        by_id = {l["id"]: l for l in L}
        self.assertEqual(by_id["perkenalan"]["readings"], {"高兴": "gāo xìng"})
        self.assertEqual(by_id["belanja"]["readings"], {"便宜": "pián yi"})

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
