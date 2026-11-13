import csv
import json
import unittest
from pathlib import Path

import jsonschema
import yaml

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data" / "hsk3"


def load(name):
    with open(D / name, encoding="utf-8") as f:
        return json.load(f)


# Official figures, HSK 考试大纲 (2025): words introduced per level and handwriting characters per level
# (chinesetest.cn/syllabus; the handwriting list for bands 1-2 is one shared list of 100).
WORDS = {1: 300, 2: 200, 3: 500, 4: 1000, 5: 1600, 6: 1800, 7: 5600}
HANDWRITING = {3: 150, 4: 150, 5: 150, 6: 150, 7: 500}
CUMULATIVE_WORDS = {1: 300, 2: 500, 3: 1000, 4: 2000, 5: 3600, 6: 5400, 7: 11000}


def count_by(rows, key="level"):
    out = {}
    for r in rows:
        out[r[key]] = out.get(r[key], 0) + 1
    return out


class SyllabusTests(unittest.TestCase):
    def test_vocab_counts_match_official(self):
        c = count_by(load("vocab.json"))
        for lvl, exp in WORDS.items():
            self.assertEqual(c[lvl], exp, f"words L{lvl}")
        self.assertEqual(sum(c.values()), 11000)

    def test_vocab_ids_contiguous_and_levels_monotonic(self):
        v = load("vocab.json")
        self.assertEqual([w["id"] for w in v], list(range(1, 11001)))
        self.assertEqual([w["level"] for w in v], sorted(w["level"] for w in v))

    def test_vocab_fields(self):
        for w in load("vocab.json"):
            self.assertTrue(w["word"] and w["pinyin"], w["id"])
            self.assertTrue(all(a > w["level"] for a in w["also_levels"]), w["id"])

    def test_cumulative_words(self):
        c = count_by(load("vocab.json"))
        total = 0
        for lvl in range(1, 8):
            total += c[lvl]
            self.assertEqual(total, CUMULATIVE_WORDS[lvl], f"cumulative L{lvl}")

    def test_handwriting_counts(self):
        h = count_by(load("handwriting.json"))
        self.assertEqual(h.get(1, 0) + h.get(2, 0), 100)   # bands 1-2 share one list of 100
        for lvl, exp in HANDWRITING.items():
            self.assertEqual(h.get(lvl, 0), exp, f"handwriting L{lvl}")
        self.assertEqual(sum(h.values()), 1200)

    def test_only_needed_syllabus_files_are_shipped(self):
        names = {p.name for p in D.glob("*.json")}
        self.assertEqual(names, {"vocab.json", "handwriting.json", "vocab_id.json", "questions.json", "blueprints.json", "SOURCE.json"})


class BlueprintTests(unittest.TestCase):
    # (listening q, reading q, writing q, total q, listening min, reading min, writing min, total min)
    OFFICIAL = {
        1: (20, 20, 0, 40, 12, 20, 0, 40),
        2: (25, 25, 10, 60, 17, 25, 10, 60),
        3: (30, 30, 10, 70, 23, 30, 20, 83),
        4: (32, 32, 6, 70, 20, 30, 25, 85),
        5: (35, 35, 2, 72, 25, 35, 40, 110),
        6: (40, 40, 2, 82, 30, 40, 45, 125),
    }

    def test_blueprints_match_official_structure(self):
        with open(ROOT / "blueprints/blueprint.schema.json") as f:
            schema = json.load(f)
        files = sorted((ROOT / "blueprints/hsk3.0").glob("level-*.yaml"))
        self.assertEqual(len(files), 6)
        for path in files:
            with open(path, encoding="utf-8") as f:
                bp = yaml.safe_load(f)
            jsonschema.validate(bp, schema)
            lvl = bp["level"]
            q = {s["skill"]: sum(p["count"] for p in s["parts"]) for s in bp["sections"]}
            t = {s["skill"]: s["time_min"] for s in bp["sections"]}
            exp = self.OFFICIAL[lvl]
            self.assertEqual((q.get("listening", 0), q.get("reading", 0), q.get("writing", 0)), exp[:3], path.name)
            self.assertEqual(bp["total_questions"], exp[3], path.name)
            self.assertEqual(sum(q.values()), exp[3], path.name)
            self.assertEqual((t.get("listening", 0), t.get("reading", 0), t.get("writing", 0)), exp[4:7], path.name)
            self.assertEqual(bp["total_time_min"], exp[7], path.name)
            self.assertEqual(bp["vocab_cumulative"], CUMULATIVE_WORDS[lvl], path.name)
            self.assertEqual(bp["syllabus"], "3.0")
            ids = [p["id"] for s in bp["sections"] for p in s["parts"]]
            self.assertEqual(len(ids), len(set(ids)), path.name)


if __name__ == "__main__":
    unittest.main()
