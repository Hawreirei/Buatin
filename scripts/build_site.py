#!/usr/bin/env python3
"""Assemble the static site for GitHub Pages (or any static host).

Layout (relative paths keep working under a sub-path such as /Buatin/):
  _site/index.html            redirect to app/
  _site/app/...               the web app
  _site/data/hsk3/*.json      only the data files the app fetches
  _site/*.md, LICENSE         licences and notices (attribution must stay reachable)

Usage: python3 scripts/build_site.py [--out _site]
"""
import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_DATA = ["vocab.json", "handwriting.json", "vocab_id.json", "questions.json", "blueprints.json"]
DOCS = ["LICENSE", "LICENSE-CONTENT.md", "NOTICE.md"]
INDEX = """<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buatin — Latihan HSK 3.0</title>
<meta http-equiv="refresh" content="0; url=app/"><link rel="canonical" href="app/">
</head><body><p><a href="app/">Buka aplikasi Buatin</a></p></body></html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="_site")
    out = ROOT / ap.parse_args().out
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "app", out / "app")
    (out / "data" / "hsk3").mkdir(parents=True)
    for name in APP_DATA:
        shutil.copy2(ROOT / "data" / "hsk3" / name, out / "data" / "hsk3" / name)
    for name in DOCS:
        shutil.copy2(ROOT / name, out / name)
    (out / "index.html").write_text(INDEX, encoding="utf-8")
    (out / ".nojekyll").write_text("", encoding="utf-8")
    size = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"site -> {out} ({size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
