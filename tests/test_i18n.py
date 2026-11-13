import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build_id", ROOT / "scripts" / "build_id.py")
build_id = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_id)


class IndonesianContentTests(unittest.TestCase):
    files = sorted((ROOT / "content" / "id").glob("level-*.psv"))

    def test_lint_clean(self):
        _, problems = build_id.lint(self.files)
        self.assertEqual(problems, [])

    def test_covers_all_hsk1_to_hsk3_words(self):
        entries, _ = build_id.lint(self.files)
        with open(ROOT / "data/hsk3/vocab.json", encoding="utf-8") as f:
            ids = {w["id"] for w in json.load(f) if w["level"] <= 3}
        self.assertEqual(set(entries), ids)

    def test_built_json_in_sync_with_content(self):
        entries, _ = build_id.lint(self.files)
        with open(ROOT / "data/hsk3/vocab_id.json", encoding="utf-8") as f:
            built = json.load(f)
        self.assertEqual({int(k) for k in built}, set(entries))
        for k, e in entries.items():
            self.assertEqual(built[str(k)]["arti"], e["arti"])
            self.assertEqual(built[str(k)]["contoh"]["zh"], e["zh"])
            self.assertEqual(built[str(k)]["contoh"]["id"], e["id"])
            self.assertTrue(built[str(k)]["contoh"]["pinyin"])

    def test_no_duplicate_example_sentences(self):
        entries, _ = build_id.lint(self.files)
        seen = {}
        for i, e in entries.items():
            seen.setdefault(e["zh"], []).append(i)
        self.assertEqual({z: v for z, v in seen.items() if len(v) > 1}, {})

    def test_target_word_pinyin_matches_syllabus(self):
        """The sentence pinyin must contain the syllabus reading of the target word
        (ignoring spaces, case and 不/一 tone sandhi)."""
        import re
        norm = lambda s: re.sub(r"[ '’-]", "", s.lower()).replace("bú", "bù").replace("yí", "yī").replace("yì", "yī")
        with open(ROOT / "data/hsk3/vocab.json", encoding="utf-8") as f:
            vocab = {w["id"]: w for w in json.load(f)}
        with open(ROOT / "data/hsk3/vocab_id.json", encoding="utf-8") as f:
            built = json.load(f)
        bad = []
        for k, e in built.items():
            alts = [norm(a) for a in vocab[int(k)]["pinyin"].split("/")]
            line = norm(e["contoh"]["pinyin"])
            if not any(a in line for a in alts):
                bad.append((k, vocab[int(k)]["word"], vocab[int(k)]["pinyin"], e["contoh"]["pinyin"]))
        self.assertEqual(bad, [])

    def test_translations_not_chinese_and_nonempty_arti(self):
        import re
        with open(ROOT / "data/hsk3/vocab_id.json", encoding="utf-8") as f:
            built = json.load(f)
        for k, e in built.items():
            self.assertFalse(re.search(r"[\u4e00-\u9fff]", e["contoh"]["id"]), k)
            self.assertGreater(len(e["arti"]), 1, k)

    def test_lint_catches_out_of_level_chars(self):
        tmp = ROOT / "tests" / "_tmp_bad.psv"
        try:
            tmp.write_text("1|爱|mencintai|我爱雪。|x\n13|不|tidak|我不难。|x\n", encoding="utf-8")
            _, problems = build_id.lint([tmp])
            self.assertTrue(any("难" in p for p in problems), problems)
        finally:
            tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
