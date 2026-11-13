"""Build data/hsk3/lookalikes.json: for every hanzi that is a write-question answer, the characters that
look most like it (used as distractors in the multiple-choice writing items).

Similarity = pixel overlap of the glyphs rendered with a CJK font, so it needs Pillow and a CJK font
(default: WenQuanYi Zen Hei; override with FONT=/path/to/font.ttc). Run: python3 scripts/build_lookalikes.py
"""
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "hsk3"
FONT = os.environ.get("FONT", "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc")
SIZE, TOP = 64, 8


def glyph(font, ch):
    im = Image.new("L", (SIZE, SIZE), 0)
    d = ImageDraw.Draw(im)
    box = d.textbbox((0, 0), ch, font=font)
    d.text(((SIZE - (box[2] - box[0])) / 2 - box[0], (SIZE - (box[3] - box[1])) / 2 - box[1]), ch, fill=255, font=font)
    a = np.asarray(im.resize((32, 32), Image.BILINEAR), dtype=np.float32) / 255
    return a.ravel()


def main():
    font = ImageFont.truetype(FONT, SIZE - 12)
    vocab = json.loads((DATA / "vocab.json").read_text("utf-8"))
    questions = json.loads((DATA / "questions.json").read_text("utf-8"))
    answers = sorted({q["answer"] for q in questions if q["type"] == "write_hanzi_from_pinyin"})
    pool = sorted({c for w in vocab for c in w["word"] if "一" <= c <= "鿿"} | set(answers))
    vec = np.stack([glyph(font, c) for c in pool])
    norm = vec / (np.linalg.norm(vec, axis=1, keepdims=True) + 1e-9)
    idx = {c: i for i, c in enumerate(pool)}
    out = {}
    for a in answers:
        sim = norm @ norm[idx[a]]
        order = [pool[i] for i in np.argsort(-sim) if pool[i] != a]
        out[a] = order[:TOP]
    (DATA / "lookalikes.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), "utf-8")
    for a in "写晚爱人国请":
        print(a, "".join(out.get(a, [])))


main()
