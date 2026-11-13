#!/usr/bin/env python3
"""blueprints/hsk3.0/level-*.yaml -> data/hsk3/blueprints.json (what the browser app reads).

Usage: python3 -I scripts/build_blueprints_json.py
"""
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def main():
    out = {}
    for path in sorted((ROOT / "blueprints" / "hsk3.0").glob("level-*.yaml")):
        bp = yaml.safe_load(path.read_text(encoding="utf-8"))
        out[str(bp["level"])] = {
            "level": bp["level"],
            "total_questions": bp["total_questions"],
            "total_time_min": bp["total_time_min"],
            "sections": [
                {
                    "id": s["id"], "skill": s["skill"], "time_min": s["time_min"],
                    "count": sum(p["count"] for p in s["parts"]),
                    "parts": [{"id": p["id"], "type": p["type"], "count": p["count"]} for p in s["parts"]],
                }
                for s in bp["sections"]
            ],
        }
    with open(ROOT / "data" / "hsk3" / "blueprints.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("wrote", len(out), "blueprints")


if __name__ == "__main__":
    main()
