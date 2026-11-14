import importlib.util
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("bq", ROOT / "scripts" / "build_questions.py")
bq = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bq)

HAN = re.compile(r"[一-鿿]")
with open(ROOT / "data/hsk3/questions.json", encoding="utf-8") as f:
    Q = json.load(f)
with open(ROOT / "data/hsk3/vocab.json", encoding="utf-8") as f:
    VOCAB = {w["id"]: w for w in json.load(f)}
ALLOWED = bq.bid.allowed_chars(VOCAB)


def by(t):
    return [q for q in Q if q["type"] == t]


class QuestionBankTests(unittest.TestCase):
    def test_ids_unique_and_counts(self):
        self.assertEqual(len({q["id"] for q in Q}), len(Q))
        self.assertGreaterEqual(len(by("cloze_wordbank")), 400)
        self.assertGreaterEqual(len(by("write_hanzi_from_pinyin")), 300)
        self.assertEqual(len(by("audio_question_pick_answer")), 68)
        self.assertEqual(len(by("audio_dialog_question_mcq")) + len(by("audio_passage_question_mcq")), 36)

    def test_types_match_blueprints(self):
        import yaml
        types = set()
        for p in (ROOT / "blueprints/hsk3.0").glob("level-[123].yaml"):
            bp = yaml.safe_load(p.read_text(encoding="utf-8"))
            types |= {part["type"] for s in bp["sections"] for part in s["parts"]}
        practice_only = {"order_sentence"}      # not an official section type yet; used in Latihan only
        for t in {q["type"] for q in Q} - practice_only:
            self.assertIn(t, types)

    def test_cloze_rules(self):
        for q in by("cloze_wordbank"):
            words = [o["word"] for o in q["options"]]
            self.assertEqual(len(words), 4, q["id"])
            self.assertEqual(len(set(words)), 4, q["id"])
            self.assertIn(q["answer"], words, q["id"])
            self.assertEqual(q["stem"].count(bq.BLANK), 1, q["id"])
            # filling the answer back must restore the audited example sentence
            self.assertEqual(q["stem"].replace(bq.BLANK, q["answer"]), q["explain"]["zh"], q["id"])
            # no distractor already appears in the sentence (it would give the answer away or be ambiguous)
            for w in words:
                if w != q["answer"]:
                    self.assertNotIn(w, q["explain"]["zh"], (q["id"], w))
            # distractors come from another grammatical class than the answer
            wc = bq.word_classes(VOCAB)
            for o in q["options"]:
                if o["word"] != q["answer"]:
                    self.assertFalse(wc[o["word"]] & wc[q["answer"]], (q["id"], o["word"]))
                    self.assertTrue(any(v["word"] == o["word"] and v["level"] <= q["level"] for v in VOCAB.values()), (q["id"], o["word"]))

    def test_cloze_level_lock(self):
        for q in by("cloze_wordbank"):
            for ch in q["explain"]["zh"]:
                if HAN.match(ch):
                    self.assertIn(ch, ALLOWED[q["level"]], (q["id"], ch))

    def test_write_rules(self):
        for q in by("write_hanzi_from_pinyin"):
            self.assertEqual(q["stem"].count(bq.BLANK), 1, q["id"])
            self.assertEqual(len(q["answer"]), 1)
            self.assertTrue(HAN.match(q["answer"]))
            self.assertEqual(q["stem"].replace(bq.BLANK, q["answer"]), q["explain"]["zh"], q["id"])
            self.assertRegex(q["hint_pinyin"], r"^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$")
            # the hint must be a real reading of the answer char
            from pypinyin import Style, pinyin
            reads = {r.lower() for r in pinyin(q["answer"], style=Style.TONE, heteronym=True)[0]}
            self.assertIn(q["hint_pinyin"], reads, q["id"])
            # no other char allowed at this level shares the reading (unique answer)
            for c in ALLOWED[q["level"]]:
                if c != q["answer"]:
                    self.assertNotIn(q["hint_pinyin"], {r.lower() for r in pinyin(c, style=Style.TONE, heteronym=True)[0]}, (q["id"], c))

    def test_order_rules(self):
        items = by("order_sentence")
        self.assertGreaterEqual(len(items), 500)
        for q in items:
            self.assertEqual("".join(q["tokens"]), q["answer"], q["id"])
            self.assertEqual(q["answer"], q["explain"]["zh"], q["id"])
            body = [t for t in q["tokens"] if t not in bq.PUNCT]
            self.assertTrue(3 <= len(body) <= 7, q["id"])
            self.assertEqual(q["tokens"][-1] in bq.PUNCT, True, q["id"])        # sentences end with punctuation
            self.assertFalse(set(q["tokens"]) & bq.ORDER_AMBIGUOUS, q["id"])    # no movable time words / lists
            self.assertTrue(q["stem"] and q["stem"] == q["explain"]["id"], q["id"])
            for ch in q["answer"]:
                if HAN.match(ch):
                    self.assertIn(ch, ALLOWED[q["level"]], (q["id"], ch))

    def test_listening_rules(self):
        for q in by("audio_question_pick_answer"):
            zh = [o["zh"] for o in q["options"]]
            self.assertEqual(len(set(zh)), 3, q["id"])
            self.assertIn(q["answer"], zh)
            for t in [q["audio"]] + zh:
                for ch in t:
                    if HAN.match(ch):
                        self.assertIn(ch, ALLOWED[q["level"]], (q["id"], ch))
            self.assertTrue(q["audio_pinyin"] and all(o["pinyin"] for o in q["options"]))
            # a wrong option must not also be the answer to another question's "correct" slot of this exact question
            self.assertEqual(sum(1 for o in zh if o == q["answer"]), 1)

    def test_dialog_rules(self):
        items = by("audio_dialog_question_mcq") + by("audio_passage_question_mcq")
        for q in items:
            zh = [o["zh"] for o in q["options"]]
            self.assertEqual(len(set(zh)), 3, q["id"])
            self.assertEqual(zh.count(q["answer"]), 1, q["id"])
            texts = [t["zh"] for t in q["turns"]] + [q["question"]] + zh
            for t in texts:
                for ch in t:
                    if HAN.match(ch):
                        self.assertIn(ch, ALLOWED[q["level"]], (q["id"], ch))
            if q["type"] == "audio_dialog_question_mcq":
                self.assertGreaterEqual(len(q["turns"]), 2)
                self.assertTrue(all(t["who"] in ("男", "女") for t in q["turns"]), q["id"])
            else:
                self.assertEqual(len(q["turns"]), 1)
            self.assertTrue(all(t["pinyin"] for t in q["turns"]) and q["question_pinyin"])

    def test_picture_questions(self):
        import json as _j
        scenes = {x["id"]: x for x in _j.loads((ROOT / "content/pic/scenes.json").read_text(encoding="utf-8"))}
        pics = [q for q in Q if q["type"] in ("audio_phrase_pick_picture", "audio_sentence_pick_picture", "audio_dialog_match_picture", "sentence_match_picture")]
        self.assertGreaterEqual(len(pics), 150)
        for q in pics:
            keys = [o["key"] for o in q["options"]]
            self.assertEqual(len(set(keys)), len(keys), q["id"])
            self.assertEqual(keys.count(q["answer"]), 1, q["id"])
            self.assertTrue(all(o["emoji"] and o["alt"] for o in q["options"]), q["id"])
            want = {"audio_phrase_pick_picture": 3, "audio_sentence_pick_picture": 3, "audio_dialog_match_picture": 6, "sentence_match_picture": 6}[q["type"]]
            self.assertEqual(len(keys), want, q["id"])
            if q["type"] != "audio_phrase_pick_picture":
                # at most one picture may fit the text: every option comes from a different group
                groups = [scenes[k]["group"] for k in keys]
                self.assertEqual(len(set(groups)), len(groups), (q["id"], groups))
            else:
                n = int(q["answer"].split("|")[1])
                self.assertEqual(q["audio"][0], bq.NUMS[n], q["id"])
                noun = q["answer"].split("|")[0]
                self.assertTrue(q["audio"].endswith(noun), q["id"])
                ans = next(o for o in q["options"] if o["key"] == q["answer"])
                unit = next(o[2] for o in bq.OBJECTS if o[0] == noun)
                self.assertEqual(ans["emoji"], unit * n, q["id"])   # n pictures of the right object
                self.assertEqual(len({o["emoji"] for o in q["options"]}), 3, q["id"])
        # every sentence of every scene that is level <= 2 became a reading and a listening item
        for sc in scenes.values():
            for st in sc["sentences"]:
                if st["lvl"] <= 2:
                    self.assertTrue(any(q["type"] == "sentence_match_picture" and q["sentence"] == st["zh"] and q["answer"] == sc["id"] for q in Q), st["zh"])

    def test_reading_text_questions(self):
        texts = by("short_text_mcq") + by("passage_mcq")
        self.assertEqual((len(by("short_text_mcq")), len(by("passage_mcq"))), (30, 28))
        for q in texts:
            zh = [o["zh"] for o in q["options"]]
            self.assertEqual(len(set(zh)), 3, q["id"])
            self.assertEqual(zh.count(q["answer"]), 1, q["id"])
            self.assertTrue(q["question"].startswith("★"), q["id"])
            self.assertTrue(q["text_pinyin"] and q["question_pinyin"] and all(o["pinyin"] for o in q["options"]))
            for t in [q["text"], q["question"].lstrip("★ ")] + zh:
                for ch in t:
                    if HAN.match(ch):
                        self.assertIn(ch, ALLOWED[q["level"]], (q["id"], ch))
            n = len(HAN.findall(q["text"]))
            if q["type"] == "passage_mcq":
                self.assertGreaterEqual(n, 60, q["id"])
            else:
                self.assertLessEqual(n, 40, q["id"])
        # every HSK 3 paragraph carries two questions
        from collections import Counter
        c = Counter(q["text"] for q in by("passage_mcq"))
        self.assertTrue(all(v == 2 for v in c.values()), c)

    def test_blueprints_json_in_sync(self):
        import yaml
        with open(ROOT / "data/hsk3/blueprints.json", encoding="utf-8") as f:
            bj = json.load(f)
        for p in (ROOT / "blueprints/hsk3.0").glob("level-*.yaml"):
            bp = yaml.safe_load(p.read_text(encoding="utf-8"))
            got = bj[str(bp["level"])]
            self.assertEqual(got["total_questions"], bp["total_questions"])
            self.assertEqual([s["count"] for s in got["sections"]], [sum(x["count"] for x in s["parts"]) for s in bp["sections"]])
            self.assertEqual([s["time_min"] for s in got["sections"]], [s["time_min"] for s in bp["sections"]])

    def test_qa_files_in_sync(self):
        problems = []
        allowed = bq.bid.allowed_chars(VOCAB)
        items = bq.make_listen(allowed, problems)
        self.assertEqual(problems, [])
        self.assertEqual([i["audio"] for i in items], [q["audio"] for q in by("audio_question_pick_answer")])


if __name__ == "__main__":
    unittest.main()
