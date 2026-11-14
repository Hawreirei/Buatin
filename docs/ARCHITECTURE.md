# Arsitektur

Aplikasi web **statis** (tanpa server, tanpa akun, tanpa build untuk aplikasinya). Data dibangun oleh skrip Python dari sumber di `content/` dan `blueprints/`, hasilnya berupa JSON yang dibaca browser.

```
content/*.psv, content/pic/*      sumber tulisan sendiri (diedit manusia)
blueprints/hsk3.0/*.yaml          struktur ujian resmi (angka dari dokumen CTI)
data/hsk3/vocab.json, handwriting.json   daftar kata/hanzi tulis resmi (input)
        │  scripts/build_id.py  build_questions.py  build_blueprints_json.py
        ▼
data/hsk3/vocab_id.json  questions.json  blueprints.json       (hasil build, di-commit)
        │  scripts/build_site.py → _site/
        ▼
app/  (modul ES, fetch ../data/hsk3/*.json)  ──►  localStorage (progres)
```

## Aplikasi (`app/js/`)

Logika murni (tanpa DOM, diuji di `tests/js/`):

| Modul | Tugas |
|---|---|
| `srs.js` | penjadwal pengulangan berjarak (SM-2 + langkah belajar) |
| `deck.js` | filter kosakata, arti (Indonesia atau Inggris), pengecoh kuis yang aman dari sinonim |
| `session.js` | antrean belajar, menjawab kartu, statistik hafalan |
| `store.js` | penyimpanan lokal: kartu, pengaturan, log jawaban (5.000 terakhir), riwayat ujian; ekspor/impor |
| `practice.js` | menyusun set latihan, memeriksa jawaban, ringkasan |
| `exam.js` | membangun ujian dari blueprint resmi, penilaian per bagian |
| `order.js` | soal susun kalimat: acak kepingan (tidak pernah langsung benar), periksa urutan (`alt` = urutan lain yang sah) |
| `analytics.js` | tren, kelemahan, kata sulit, rekomendasi, set latihan kelemahan |

Tampilan (`app/js/views/`), semuanya menerima satu objek `app` dari `main.js` (`store`, `vocab`, `idData`, `questions`, `blueprints`, `render`, `go`):

| Modul | Tab |
|---|---|
| `study.js`, `quiz.js`, `browse.js`, `settings.js` | Hafalan, Kuis, Daftar, Pengaturan |
| `practice.js`, `exam.js` | Latihan, Ujian |
| `progress.js` | Kemajuan (analisis + ringkasan hafalan) |
| `question.js` | **satu-satunya tempat** yang menggambar soal; dipakai Latihan dan Ujian lewat "adaptor mode" (`kind`, `response`, `reveal`, `onAnswer`, …). Soal baru = ubah di sini saja |

`ui.js` berisi pembantu DOM (teks selalu lewat `textContent`, tidak pernah `innerHTML`) dan suara (Web Speech API, zh-CN; dialog 男/女 memakai nada berbeda).

## Data lokal (`localStorage`, kunci `learning-chinese.vocab.v1`; data lama di `buatin.vocab.v1` dipindahkan otomatis saat pertama dibuka)

```json
{ "version": 1,
  "cards":   { "<id kata>": { "state", "step", "ease", "interval", "due", "reps", "lapses" } },
  "settings": { "levels": [1], "newPerDay": 10, "speak": true },
  "daily":   { "date": "YYYY-MM-DD", "introduced": 0 },
  "log":     { "YYYY-MM-DD": <jumlah ulasan hafalan> },
  "practice": { "reading": {"n": 0, "ok": 0}, "...": "penghitung ringkas per keterampilan" },
  "events":  [ { "t", "k": "practice|exam", "s": skill, "l": level, "ty": tipe, "id": "c190", "w": id kata, "ok": 0|1, "ms", "un"? } ],
  "exams":   [ { "t", "level", "pct", "correct", "total", "assisted", "duration_ms", "sections": [...] } ] }
```

Penamaan di `Store`: `recordAnswer` (jawaban soal), `recordExam`, `recordReview` (ulasan kartu), `markIntroduced`.

## Jenis soal

Nama sama dengan `part.type` di `blueprints/hsk3.0/*.yaml`. Dibangun oleh `scripts/build_questions.py`.

| Keterampilan | Jenis | Jumlah | Sumber |
|---|---|---|---|
| Membaca | `cloze_wordbank` (isi kata, 4 pilihan) | 962 | kalimat contoh; pengecoh dari kelas kata lain dan level ≤ soal |
| Membaca | `sentence_match_picture` (6 gambar) | 53 | `content/pic/scenes.json` |
| Membaca | `short_text_mcq` (HSK 1–2) | 30 | `content/id/reading-level-1/2.psv` |
| Membaca | `passage_mcq` (paragraf 58–84 hanzi, HSK 3) | 28 | `content/id/reading-level-3.psv` |
| Menulis | `write_hanzi_from_pinyin` | 601 | kalimat contoh; hanya hanzi yang bacaannya unik di level itu |
| Menulis | `order_sentence` (susun kalimat; hanya Latihan, belum ada di blueprint resmi) | 828 | kalimat contoh dipecah per kata silabus (maximum matching) + tanda baca; dibuang bila ada kata yang bisa pindah tempat (waktu, 和, dst.), dua klausa penuh, atau deretan angka |
| Mendengar | `audio_phrase_pick_picture` (HSK 1) | 45 | dibangkitkan: 9 benda × jumlah 1–5 |
| Mendengar | `audio_sentence_pick_picture` (HSK 2) | 53 | `scenes.json` |
| Mendengar | `audio_dialog_match_picture` | 42 | `content/pic/dialogs.psv` |
| Mendengar | `audio_question_pick_answer` / `audio_dialog_question_mcq` / `audio_passage_question_mcq` | 68 / 24 / 12 | `content/id/qa-level-*.psv`, `dialog-level-3.psv` |

**Soal bergambar** memakai emoji sebagai gambar (buatan sendiri, bebas lisensi; tampilan mengikuti font perangkat). 76 adegan dalam 21 kelompok; semua pilihan gambar berasal dari **kelompok berbeda**, sehingga paling banyak satu gambar yang cocok dengan teks. Foto asli: isi `src` pada opsi gambar (UI sudah mendukung `<img>`).

Belum ada: `match_question_to_answer`, `audio_statement_question_mcq`, `choose_missing_character_component`, `write_sentence_from_picture_and_word`, soal level 4+, speaking. Bagian ujian dengan jenis seperti itu diisi pengganti terdekat dan ditandai (`part.official = false`).

## Aturan mutu yang dijaga otomatis

- Hanzi di kalimat/soal hanya yang muncul di kata silabus sampai level itu (pemeriksa di `build_id.py` dan `build_questions.py`).
- Pinyin kalimat dibuat dengan pypinyin lalu dikoreksi: bacaan kata silabus diambil dari silabus resmi, sandhi 不/一, erhua, kata ber-bacaan-ganda dilindungi.
- Pengecoh cloze: kelas kata berbeda; pengecoh gambar: kelompok berbeda; pengecoh kuis: tidak berbagi butir arti dengan jawaban.
- Ujian: kalimat yang sama tidak muncul dua kali dalam satu kertas; jumlah soal dan waktu sama dengan tabel resmi.
- CI menjalankan semua tes setiap push (`.github/workflows/ci-pages.yml`).

## Menambah level atau jenis soal

- **Level baru:** tulis `content/id/level-N.psv` (dan dialog/teks/adegan bila perlu), jalankan `npm run build`, perbarui tes jumlah di `tests/`.
- **Jenis soal baru:** tambahkan generator di `build_questions.py`, nama jenis di `blueprints`, cabang tampilan di `views/question.js` (`questionBody` dan `explanation`), lalu tes di `tests/test_questions.py` dan `tests/js/`.
