#!/usr/bin/env python3
"""Build an Excel review sheet for a teacher / native speaker (laoshi).

Every piece of original content (meanings, example sentences, translations, listening/reading
questions, picture scenes, cloze/write items, themed lessons) with empty reviewer columns and a status dropdown.

Usage: python3 scripts/build_review_sheet.py [--out review/Learning-Chinese-review-laoshi.xlsx]
"""
import argparse
import json
import subprocess
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data" / "hsk3"
STATUS = ["✔ 正确 Benar", "✎ 需修改 Perlu diubah", "? 不确定 Ragu"]
HEAD_FILL = PatternFill("solid", fgColor="1F3A5F")
REV_FILL = PatternFill("solid", fgColor="FFF4CC")
REV_HEAD = PatternFill("solid", fgColor="B8860B")


def load(name):
    with open(D / name, encoding="utf-8") as f:
        return json.load(f)


def sheet(wb, title, cols, rows, widths, reviewer):
    """cols: header labels; reviewer: labels of the empty columns appended (first one is the status dropdown)."""
    ws = wb.create_sheet(title)
    headers = cols + reviewer
    ws.append(headers)
    for r in rows:
        ws.append(list(r) + [None] * len(reviewer))
    for i, h in enumerate(headers, 1):
        c = ws.cell(row=1, column=i)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = REV_HEAD if i > len(cols) else HEAD_FILL
        c.alignment = Alignment(wrap_text=True, vertical="center")
        ws.column_dimensions[get_column_letter(i)].width = (widths + [28] * len(reviewer))[i - 1]
    for row in ws.iter_rows(min_row=2):
        for i, c in enumerate(row, 1):
            c.alignment = Alignment(wrap_text=True, vertical="top")
            if i > len(cols):
                c.fill = REV_FILL
    ws.freeze_panes = ws.cell(row=2, column=3)
    ws.auto_filter.ref = ws.dimensions
    ws.row_dimensions[1].height = 34
    if rows:
        dv = DataValidation(type="list", formula1='"' + ",".join(STATUS) + '"', allow_blank=True)
        ws.add_data_validation(dv)
        col = get_column_letter(len(cols) + 1)
        dv.add(f"{col}2:{col}{len(rows) + 1}")
    return ws


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="review/Learning-Chinese-review-laoshi.xlsx")
    out = ROOT / ap.parse_args().out
    out.parent.mkdir(parents=True, exist_ok=True)

    vocab = {w["id"]: w for w in load("vocab.json")}
    vid = {int(k): v for k, v in load("vocab_id.json").items()}
    qs = load("questions.json")
    scenes = json.loads((ROOT / "content" / "pic" / "scenes.json").read_text(encoding="utf-8"))
    sha = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()

    wb = Workbook()
    ws = wb.active
    ws.title = "说明 Petunjuk"
    lines = [
        ("Lembar review konten Learning Chinese (aplikasi latihan HSK 3.0, bahasa pengantar Indonesia)", True),
        (f"Versi data: {sha}. Cakupan: HSK 1–3 (kosakata 1.000 kata, soal membaca/mendengar/menulis, soal bergambar).", False),
        ("", False),
        ("感谢您帮忙审阅！Terima kasih sudah membantu mengoreksi.", True),
        ("", False),
        ("Cara mengisi / 填写方法", True),
        ("1. Buka lembar yang ingin diperiksa (词汇 Kosakata, 听力 Mendengar, 阅读 Membaca, 图片 Gambar, 填空 Isi kata).", False),
        ("2. Pada kolom kuning di kanan, pilih status di dropdown: ✔ 正确 (benar) / ✎ 需修改 (perlu diubah) / ? 不确定 (ragu).", False),
        ("3. Jika perlu diubah, tulis koreksi di kolom 建议 (usulan) dan alasan singkat di kolom 备注 (catatan). Boleh dalam bahasa Mandarin atau Indonesia.", False),
        ("4. Baris yang benar boleh dikosongkan; Anda tidak harus mengisi semua baris. Lembar 词汇 dan 听力/阅读 paling penting.", False),
        ("", False),
        ("Yang mohon diperhatikan / 请特别注意", True),
        ("• 词汇: apakah arti Indonesia sesuai dengan makna kata dalam HSK (bukan makna kamus pertama)? Apakah kalimat contoh alami, sederhana, dan sesuai level? Apakah terjemahan Indonesianya wajar?", False),
        ("• 听力/阅读: apakah jawaban benar tepat satu? Adakah pilihan salah yang sebenarnya juga benar (soal ambigu)? Apakah dialog terdengar alami?", False),
        ("• 图片: apakah gambar (emoji) sesuai dengan kalimat, dan tidak ada gambar lain yang juga cocok?", False),
        ("• 填空: soal isi kata dibuat otomatis dari kalimat contoh; tandai jika ada pilihan salah yang juga bisa dipakai (ambigu) atau kalimat tidak wajar.", False),
        ("• Pinyin kalimat dibuat otomatis (nada 3 tidak diubah) dan mungkin ada yang kurang tepat; mohon tandai jika terlihat salah.", False),
        ("", False),
        ("Konten ini dibuat dengan bantuan AI dan BELUM direview penutur asli. Koreksi Anda akan dimasukkan ke proyek sumber terbuka Learning Chinese (konten CC BY-SA 4.0).", True),
        ("Kolom ID (mis. 391, c190, p63, t41) sama dengan nomor yang tampil di aplikasi.", False),
    ]
    for text, bold in lines:
        ws.append([text])
        ws.cell(row=ws.max_row, column=1).font = Font(bold=bold)
        ws.cell(row=ws.max_row, column=1).alignment = Alignment(wrap_text=True, vertical="top")
    ws.column_dimensions["A"].width = 130

    # 1. vocabulary
    rows = []
    for wid, e in sorted(vid.items()):
        w = vocab[wid]
        label = w["word"] + (str(w["homograph"]) if w["homograph"] else "")
        rows.append([wid, w["level"], label, w["pinyin"], w["pos"], e["arti"], e["contoh"]["zh"], e["contoh"]["pinyin"], e["contoh"]["id"]])
    sheet(wb, "词汇 Kosakata", ["ID", "Level", "汉字 Hanzi", "拼音 Pinyin (resmi)", "词性 Jenis kata", "释义 Arti Indonesia", "例句 Kalimat contoh", "例句拼音 Pinyin kalimat", "翻译 Terjemahan Indonesia"],
          rows, [7, 7, 12, 16, 10, 34, 30, 34, 40], ["状态 Status", "建议：释义 Usulan arti", "建议：例句/翻译 Usulan kalimat/terjemahan", "备注 Catatan"])

    # 2. listening (Q&A, dialogs, passages)
    rows = []
    for q in qs:
        if q["skill"] != "listening" or q["type"].endswith("picture"):
            continue
        wrong = [o["zh"] for o in q["options"] if o["zh"] != q["answer"]]
        if q["type"] == "audio_question_pick_answer":
            rows.append([q["id"], q["level"], "tanya-jawab 问答", q["audio"], "", q["answer"], wrong[0], wrong[1], f'{q["explain"]["question_id"]} → {q["explain"]["answer_id"]}'])
        else:
            text = "\n".join((f'{t["who"]}：' if t["who"] else "") + t["zh"] for t in q["turns"])
            kind = "dialog 对话" if q["type"] == "audio_dialog_question_mcq" else "teks 短文"
            rows.append([q["id"], q["level"], kind, text, q["question"], q["answer"], wrong[0], wrong[1], f'{q["explain"]["text_id"]}\n问：{q["explain"]["question_id"]}\n答：{q["explain"]["answer_id"]}'])
    sheet(wb, "听力 Mendengar", ["ID", "Level", "Jenis", "音频文本 Teks audio", "问题 Pertanyaan", "正确答案 Jawaban benar", "错误选项 1 Pilihan salah 1", "错误选项 2 Pilihan salah 2", "翻译 Terjemahan"],
          rows, [7, 7, 14, 40, 26, 22, 22, 22, 48], ["状态 Status", "建议 Usulan koreksi", "备注 Catatan"])

    # 3. reading texts
    rows = []
    for q in qs:
        if q["type"] not in ("short_text_mcq", "passage_mcq"):
            continue
        wrong = [o["zh"] for o in q["options"] if o["zh"] != q["answer"]]
        rows.append([q["id"], q["level"], "短文 teks pendek" if q["type"] == "short_text_mcq" else "段落 paragraf", q["text"], q["question"], q["answer"], wrong[0], wrong[1],
                     f'{q["explain"]["text_id"]}\n{q["explain"]["question_id"]} → {q["explain"]["answer_id"]}'])
    sheet(wb, "阅读 Membaca", ["ID", "Level", "Jenis", "文章 Teks", "问题 Pertanyaan", "正确答案 Jawaban benar", "错误选项 1", "错误选项 2", "翻译 Terjemahan"],
          rows, [7, 7, 14, 60, 26, 20, 20, 20, 60], ["状态 Status", "建议 Usulan koreksi", "备注 Catatan"])

    # 4. pictures: scene sentences, then picture dialogs
    rows = []
    for sc in scenes:
        for st in sc["sentences"]:
            rows.append([f'scene:{sc["id"]}', st["lvl"], "kalimat→gambar 句子配图", sc["emoji"] + "  " + sc["alt"], st["zh"], st["id"]])
    for q in qs:
        if q["type"] == "audio_dialog_match_picture":
            ans = next(o for o in q["options"] if o["key"] == q["answer"])
            text = "\n".join(f'{t["who"]}：{t["zh"]}' for t in q["turns"])
            rows.append([q["id"], q["level"], "dialog→gambar 对话配图", ans["emoji"] + "  " + ans["alt"], text, q["explain"]["text_id"]])
    sheet(wb, "图片 Gambar", ["ID", "Level", "Jenis", "图片 Gambar jawaban (emoji)", "句子/对话 Kalimat atau dialog", "翻译 Terjemahan"],
          rows, [16, 7, 22, 30, 50, 50], ["状态 Status (gambar cocok?)", "建议 Usulan", "备注 Catatan"])

    # 5. cloze + write (generated from the example sentences)
    rows = []
    for q in qs:
        if q["type"] == "cloze_wordbank":
            rows.append([q["id"], q["level"], "选词填空 isi kata", q["stem"], " / ".join(o["word"] for o in q["options"]), q["answer"], q["explain"]["zh"], q["explain"]["id"]])
        elif q["type"] == "write_hanzi_from_pinyin":
            rows.append([q["id"], q["level"], "写汉字 tulis hanzi", q["stem"], f'pinyin: {q["hint_pinyin"]}', q["answer"], q["explain"]["zh"], q["explain"]["id"]])
    sheet(wb, "填空 Isi kata", ["ID", "Level", "Jenis", "题目 Soal", "选项/提示 Pilihan/petunjuk", "答案 Jawaban", "完整句子 Kalimat lengkap", "翻译 Terjemahan"],
          rows, [8, 7, 18, 32, 34, 10, 34, 40], ["状态 Status (ambigu?)", "建议 Usulan", "备注 Catatan"])

    # 6. themed lessons (key sentences, key words, listening and reading questions; ordering items come from the key sentences)
    rows = []
    for l in load("lessons.json"):
        name = f'{l["id"]} {l["zh"]}'
        for sen in l["keySentences"]:
            rows.append([name, l["level"], "关键句 kalimat kunci", sen["zh"], sen["pinyin"], "", "", sen["id"]])
        for k in l["keyWords"]:
            rows.append([name, l["level"], "关键词 kata kunci" + ("（非大纲 di luar silabus）" if k.get("extra") else ""), k["word"], k["pinyin"], "", "", k["arti"]])
        for phrase, pin in l.get("readings", {}).items():             # readings written on purpose (non-default pinyin): please check
            rows.append([name, l["level"], "拼音 bacaan khusus (cek pinyin)", phrase, pin, "", "", ""])
        for step in ("listening", "reading"):
            for q in l["steps"][step]:
                wrong = " / ".join(o.get("zh") or o.get("word") for o in q["options"] if (o.get("zh") or o.get("word")) != q["answer"])
                e = q["explain"]
                if q["type"] == "cloze_wordbank":
                    rows.append([name, l["level"], "选词填空 isi kata", q["stem"], "", q["answer"], wrong, f'{e["zh"]}\n{e["id"]}'])
                elif q["type"] == "audio_question_pick_answer":
                    rows.append([name, l["level"], "听力 tanya-jawab", q["audio"], "", q["answer"], wrong, f'{e["question_id"]} → {e["answer_id"]}'])
                elif q["type"] == "audio_dialog_question_mcq":
                    text = "\n".join(f'{t["who"]}：{t["zh"]}' for t in q["turns"])
                    rows.append([name, l["level"], "听力 dialog", text, q["question"], q["answer"], wrong, f'{e["text_id"]}\n问：{e["question_id"]}\n答：{e["answer_id"]}'])
                else:
                    rows.append([name, l["level"], "阅读 teks pendek", q["text"], q["question"], q["answer"], wrong, f'{e["text_id"]}\n问：{e["question_id"]}\n答：{e["answer_id"]}'])
    sheet(wb, "课文 Pelajaran", ["Pelajaran", "Level", "Jenis", "汉语 Teks", "拼音 / 问题 Pinyin / pertanyaan", "正确答案 Jawaban benar", "错误选项 Pilihan salah", "翻译 Terjemahan"],
          rows, [20, 7, 24, 40, 40, 20, 28, 50], ["状态 Status", "建议 Usulan", "备注 Catatan"])

    wb.save(out)
    for s in wb.sheetnames[1:]:
        print(f"{s}: {wb[s].max_row - 1} baris")
    print("->", out)


if __name__ == "__main__":
    main()
