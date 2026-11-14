#!/usr/bin/env python3
"""Build data/hsk3/strokes/<codepoint>.json (stroke outlines + medians) for every handwriting character.

Source: the npm package `hanzi-writer-data` (Make Me a Hanzi, Arphic Public License; see NOTICE.md).
  npm pack hanzi-writer-data@2.0.1 && mkdir src && tar xzf hanzi-writer-data-2.0.1.tgz -C src
  python3 scripts/build_strokes.py --src src/package

Files are named by lowercase hex code point (e.g. 7231.json for 爱) so URLs stay ASCII.
Only the fields Hanzi Writer needs are kept (strokes, medians, radStrokes); output is compact JSON.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "hsk3" / "strokes"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="directory holding <char>.json files of hanzi-writer-data")
    src = Path(ap.parse_args().src)
    chars = sorted({x["char"] for x in json.loads((ROOT / "data" / "hsk3" / "handwriting.json").read_text("utf-8"))})
    OUT.mkdir(parents=True, exist_ok=True)
    keep = ("strokes", "medians", "radStrokes")
    for ch in chars:
        d = json.loads((src / f"{ch}.json").read_text("utf-8"))
        slim = {k: d[k] for k in keep if k in d}
        assert len(slim["strokes"]) == len(slim["medians"]), ch
        (OUT / f"{ord(ch):x}.json").write_text(json.dumps(slim, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(chars)} characters -> {OUT}")


if __name__ == "__main__":
    main()
