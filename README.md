# Buatin — Latihan HSK 3.0

[![CI](https://github.com/Hawreirei/Buatin/actions/workflows/ci-pages.yml/badge.svg)](https://github.com/Hawreirei/Buatin/actions/workflows/ci-pages.yml)
[![Kode: MIT](https://img.shields.io/badge/kode-MIT-green.svg)](LICENSE)
[![Konten: CC BY-SA 4.0](https://img.shields.io/badge/konten-CC%20BY--SA%204.0-blue.svg)](LICENSE-CONTENT.md)

**Demo:** <https://hawreirei.github.io/Buatin/> (aktif setelah GitHub Pages dinyalakan, lihat [Menerbitkan](#menerbitkan-di-github-pages))

Aplikasi web gratis dan sumber terbuka untuk berlatih **HSK 3.0 (silabus 2025)** dalam Bahasa Indonesia: hafalan kosakata dengan pengulangan berjarak, latihan soal (membaca, menulis, mendengar; termasuk soal bergambar dan paragraf bacaan), **simulasi ujian bertimer** (HSK 1–3), serta analisis kemajuan dan kelemahan. Berjalan sepenuhnya di browser, tanpa akun; progres tersimpan lokal.

*English:* a free, open-source, Indonesian-language practice app for the new HSK 3.0 — spaced-repetition flashcards for the official 2025 vocabulary, practice questions (reading, writing, listening, picture and long-text items), timed exam simulations for HSK 1–3 following CTI's official section sizes and timings, and progress/weakness analytics. Static site, runs in the browser, no accounts, data stays on your device. Not affiliated with CLEC/CTI; questions are original practice material, **not yet reviewed by native speakers** — corrections welcome.

> **Status:** konten HSK 1–3 tersedia; HSK 4–6, foto asli, dan speaking belum. Seluruh konten buatan sendiri **belum direview penutur asli** — bantu koreksi lewat [issue "Koreksi konten"](../../issues/new/choose) atau [CONTRIBUTING.md](CONTRIBUTING.md).

## Isi repositori

- `app/` — aplikasi web statis (tanpa build, tanpa dependensi)
- `content/` — konten tulisan sendiri (arti, kalimat, soal, dialog, teks, adegan gambar)
- `data/hsk3/` — daftar kata resmi (`vocab.json`) dan hanzi tulis (`handwriting.json`) + hasil build (`vocab_id.json`, `questions.json`, `blueprints.json`)
- `blueprints/hsk3.0/` — struktur ujian resmi per level (jumlah soal, bagian, waktu)
- `scripts/` — pembangun data, soal, dan situs; `tests/` — tes Python dan JavaScript
- `docs/` — proposal, sumber & lisensi, catatan audit; `db/schema.sql` — skema untuk rencana backend

## Modul hafalan kosakata (`app/`)

Aplikasi web statis tanpa dependensi/build. Dari akar repo:

```bash
python3 -m http.server 8080   # lalu buka http://localhost:8080/app/
```

- **Hafalan:** flashcard dengan spaced repetition (SM-2 + langkah belajar 1 mnt/10 mnt), tombol Lagi/Sulit/Bagus/Mudah dengan pratinjau interval, pintasan Spasi dan 1–4. Kata baru mengikuti urutan silabus resmi, dibatasi per hari.
- **Kuis:** pilih arti yang benar (pengecoh dari level & jenis kata yang sama).
- **Daftar:** cari hanzi/pinyin/arti. **Statistik:** progres per level.
- **Pengaturan:** pilih level (HSK 1–6, 7–9), kata baru per hari, suara, ekspor/impor/reset progres.
- Penanda ✍ = semua hanzi kata itu ada di daftar hanzi tulis resmi.
- Progres disimpan di `localStorage` perangkat (belum ada akun/sinkronisasi). Suara memakai Web Speech API (zh-CN) bawaan perangkat.
- **Terjemahan Indonesia + kalimat contoh** tersedia untuk **HSK 1–3 (1.000 kata)**; level lain sementara memakai arti Inggris (CC-CEDICT, ±8% kata kosong). Lihat bagian "Konten Indonesia" di bawah.

## Ujian bertimer (tab "Ujian"), Kemajuan, dan Kelemahan

- **Simulasi ujian HSK 1–3.** Jumlah soal dan waktu tiap bagian = tabel resmi CTI (`blueprints/hsk3.0`): HSK 1 = 20 mendengar (12 mnt) + 20 membaca (20 mnt); HSK 2 = 25/25/10 (17/25/10 mnt); HSK 3 = 30/30/10 (23/30/20 mnt). Timer per bagian tidak bisa dijeda, bagian berakhir otomatis saat waktu habis dan terkunci, audio maks. 2× per soal. **Tiap bagian memakai jenis soal resmi bila kami punya (bergambar, dialog, teks pendek/paragraf, isi kata, tulis hanzi, tanya-jawab); jenis yang belum ada (`match_question_to_answer`, `audio_statement_question_mcq`, `choose_missing_character_component`, `write_sentence_from_picture_and_word`) diganti pengganti terdekat dan ditandai di layar. Hasilnya skor perkiraan, bukan skor resmi (sistem skor resmi belum diketahui). Level 4–6 belum tersedia.
- **Kemajuan** (tab "Kemajuan"): akurasi harian 14/30 hari, hari beruntun, riwayat setiap simulasi dengan perubahan antar percobaan, dan **analisis kelemahan** per keterampilan, jenis soal, level, jenis kata, kata yang sering salah, serta kata sulit di hafalan; ada tombol *Latihan kelemahan* yang menyusun 10 soal dari kata yang masih salah. Soal yang tidak dijawab karena waktu habis tidak dihitung sebagai kata lemah.
- Semua data tersimpan lokal di browser (`localStorage`): 5.000 jawaban terakhir + riwayat ujian; ikut diekspor/diimpor di Pengaturan.

## Latihan soal (tab "Latihan")

Fase 1 (HSK 1–3): 1.918 soal, dibangun oleh `scripts/build_questions.py` → `data/hsk3/questions.json`.

| Keterampilan | Tipe (nama sama dengan `blueprints/hsk3.0`) | Jumlah | Asal |
|---|---|---|---|
| Membaca | `cloze_wordbank` — isi kata (4 pilihan) | 962 | kalimat contoh yang sudah diaudit; pengecoh dari kelas kata lain, level ≤ soal |
| Membaca | `sentence_match_picture` — baca kalimat, pilih gambar (6 pilihan) | 53 | `content/pic/scenes.json` |
| Membaca | `short_text_mcq` — teks pendek + ★ pertanyaan (HSK 1–2) | 30 | `content/id/reading-level-1/2.psv` |
| Membaca | `passage_mcq` — **paragraf 58–84 hanzi** + 2 pertanyaan (HSK 3) | 28 (14 paragraf) | `content/id/reading-level-3.psv` |
| Menulis | `write_hanzi_from_pinyin` — tulis hanzi yang hilang (pinyin di atas kotak) | 601 | kalimat contoh; hanya hanzi yang bacaannya unik di level itu |
| Mendengar | `audio_phrase_pick_picture` — dengar "三个苹果", pilih gambar (HSK 1) | 45 | dibangkitkan: 9 benda × jumlah 1–5 |
| Mendengar | `audio_sentence_pick_picture` — dengar kalimat, pilih 1 dari 3 gambar (HSK 2) | 53 | `scenes.json` |
| Mendengar | `audio_dialog_match_picture` — dengar dialog, pilih 1 dari 6 gambar | 42 | `content/pic/dialogs.psv` |
| Mendengar | `audio_question_pick_answer` (68), `audio_dialog_question_mcq` (24), `audio_passage_question_mcq` (12) | 104 | `content/id/qa-level-*.psv`, `dialog-level-3.psv`; dialog 男/女 memakai nada berbeda |

**Soal bergambar** memakai emoji sebagai gambar (buatan sendiri, bebas lisensi; tampilannya bergantung font perangkat). 76 adegan dalam 21 kelompok (makanan, olahraga, transportasi, cuaca, …) di `content/pic/scenes.json`. Pilihan gambar selalu diambil dari **kelompok yang berbeda** dari jawabannya, jadi paling banyak satu gambar yang cocok dengan teks. Untuk memakai foto asli, isi field `src` pada opsi gambar (UI sudah mendukung `<img>`); tidak perlu ubah kode lain.

Umpan balik langsung + penjelasan (kalimat, pinyin, terjemahan, arti kata); ringkasan hasil per keterampilan; statistik latihan di tab Statistik. Nomor soal (mis. `#c190`) tampil di layar supaya guru bisa menunjuk soal yang perlu dikoreksi.

Belum ada: soal level 4+, `match_question_to_answer`, `audio_statement_question_mcq`, `choose_missing_character_component`, `write_sentence_from_picture_and_word` (menulis kalimat bebas), foto asli, dan speaking. Soal dibuat otomatis/ditulis sendiri dan **belum direview guru**.

## Konten Indonesia (`content/id/`)

Arti Indonesia dan kalimat contoh ditulis tangan (oleh asisten AI) per level di `content/id/level-N.psv`, format `id|kata|arti|kalimat|terjemahan`. `scripts/build_id.py` memeriksa dan menggabungkannya menjadi `data/hsk3/vocab_id.json`:

```bash
pip install -r requirements.txt
python3 -I scripts/build_id.py
python3 -I scripts/build_questions.py
python3 -I scripts/build_blueprints_json.py
```

Pemeriksaan otomatis (gagal jika dilanggar): id/kata cocok dengan silabus resmi, kalimat memuat kata targetnya, dan **setiap hanzi dalam kalimat harus muncul di kata-kata silabus resmi sampai level kata itu**. Pinyin kalimat dibuat otomatis (pypinyin) lalu dikoreksi: bacaan kata silabus diambil dari silabus resmi, sandhi 不/一 diterapkan, sandhi nada 3 tidak. Hasil audit: [docs/AUDIT-id.md](docs/AUDIT-id.md).

**Belum direview penutur asli/guru.** Arti dipilih sesuai pemakaian HSK, bukan makna pertama kamus (mis. 百 = "seratus", bukan "marga Bai" seperti di CC-CEDICT). Untuk menambah level: tambahkan `content/id/level-4.psv`, jalankan skrip di atas, lalu `build_questions.py` dan `build_blueprints_json.py`.

## Menjalankan tes

```bash
npm run test:js                              # logika SRS, deck, sesi, penyimpanan (Node 22)
python3 -m unittest discover -s tests -v     # data resmi, blueprint, konten Indonesia, bank soal (±30 dtk)
```


```bash
pip install -r requirements.txt
python3 -m unittest discover -s tests -v
```

## Menerbitkan di GitHub Pages

Workflow [`.github/workflows/ci-pages.yml`](.github/workflows/ci-pages.yml) menjalankan semua tes lalu membangun situs (`scripts/build_site.py`) dan menerbitkannya **dari branch default** repositori. Langkah sekali saja di GitHub:

1. Pastikan repositori **Public** (Settings → General → Danger Zone → Change visibility).
2. Settings → **Pages** → *Build and deployment* → Source: **GitHub Actions**.
3. Pastikan kode sudah ada di branch default (merge branch kerja ke `main`), atau jalankan workflow secara manual: Actions → *CI dan GitHub Pages* → Run workflow (di branch default).

Situs akan ada di `https://<pengguna>.github.io/<repositori>/`. Jalur relatif membuat aplikasi tetap berfungsi di sub-path seperti ini. Untuk mencoba hasil build secara lokal: `python3 scripts/build_site.py && cd _site && python3 -m http.server 8080`.

## Lisensi

- **Kode** (`app/`, `scripts/`, `tests/`, `.github/`, `db/`): [MIT](LICENSE).
- **Konten orisinal** (`content/`, `data/hsk3/vocab_id.json`, `questions.json`, `docs/`): [CC BY-SA 4.0](LICENSE-CONTENT.md).
- **Daftar kata dan hanzi tulis resmi HSK** (`vocab.json`, `handwriting.json`) adalah milik CLEC/CTI dan tidak tercakup lisensi di atas (bagian teks silabus seperti tata bahasa dan tugas sengaja tidak disertakan); **glos Inggris** berasal dari CC-CEDICT (CC BY-SA 4.0). Rincian dan atribusi: [NOTICE.md](NOTICE.md).
- Bukan produk resmi HSK; lihat pernyataan di [NOTICE.md](NOTICE.md). Kontribusi: [CONTRIBUTING.md](CONTRIBUTING.md), [kode etik](CODE_OF_CONDUCT.md).
