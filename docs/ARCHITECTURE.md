# Arsitektur

Aplikasi web **statis** (tanpa server, tanpa akun, tanpa build untuk aplikasinya). Data dibangun oleh skrip Python dari sumber di `content/` dan `blueprints/`, hasilnya berupa JSON yang dibaca browser.

```
content/*.psv, content/pic/*      sumber tulisan sendiri (diedit manusia)
content/lessons/*.json            pelajaran bertema (kalimat kunci, kata kunci, soal per langkah)
blueprints/hsk3.0/*.yaml          struktur ujian resmi (angka dari dokumen CTI)
data/hsk3/vocab.json, handwriting.json   daftar kata/hanzi tulis resmi (input)
        │  scripts/build_id.py  build_questions.py  build_blueprints_json.py  build_lessons.py
        ▼
data/hsk3/vocab_id.json  questions.json  blueprints.json  lessons.json   (hasil build, di-commit)
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
| `speech.js` | latihan bicara: penilaian kemiripan (LCS per hanzi, angka → hanzi), pembungkus rekam (MediaRecorder) dan pengenalan ucapan (Web Speech API, zh-CN) |
| `tone.js` | kontur nada (eksperimental): pitch YIN → potong per suku kata (DP) → bentuk nada relatif rentang penutur → cocokkan dengan nada pinyin; murni, diuji dengan suara sintetis |
| `writing.js` | tab Tulis: indeks hanzi → kata, filter, aturan "dikuasai", catatan latihan, jalur coretan bebas; data goresan di `data/hsk3/strokes/<kode hex>.json` (dimuat per hanzi) |
| `lesson.js` | pelajaran bertema: lima langkah, progres, nomor soal, id kata kunci, ringkasan per pelajaran, pelajaran berikutnya untuk Beranda |
| `order.js` | soal susun kalimat: acak kepingan (tidak pernah langsung benar), periksa urutan (`alt` = urutan lain yang sah) |
| `analytics.js` | tren, kelemahan, kata sulit, rekomendasi, set latihan kelemahan |

Tampilan (`app/js/views/`), semuanya menerima satu objek `app` dari `main.js` (`store`, `vocab`, `idData`, `questions`, `blueprints`, `render`, `go`):

| Modul | Tab |
|---|---|
| `study.js`, `quiz.js`, `browse.js`, `settings.js` | Hafalan, Kuis, Daftar, Pengaturan |
| `practice.js`, `exam.js` | Latihan, Ujian |
| `write.js` | Tulis: animasi urutan goresan, tebalkan hanzi samar (bebas atau diperiksa per goresan), tulis dari ingatan; memakai Hanzi Writer di `js/vendor/` |
| `lessons.js` | Pelajaran: daftar, halaman pelajaran, stepper, langkah Listening/Reading/Writing/Speaking/Vocab |
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

## Pelajaran bertema

Satu berkas `content/lessons/<id>.json` per pelajaran; `build_lessons.py` memeriksa dan membangunnya ke `data/hsk3/lessons.json`. Soal pelajaran **disimpan di dalam pelajaran** (bukan di `questions.json`), memakai bentuk soal yang sama sehingga `views/question.js` menggambarnya tanpa perubahan.

- Pelajaran: HSK 1 `sapaan`, `perkenalan`, `angka-waktu`, `keluarga`, `makan-minum`, `cuaca`, `sekolah`; HSK 2 `belanja`, `tanya-arah`; HSK 3 `restoran`, `rumah-sakit` (rencana lengkap HSK 1–6: `docs/RENCANA-SKENARIO.md`). `"seq": N` di berkas menentukan urutan ajar di dalam satu level (bawaan 100, lalu id); daftar diurutkan dari level terendah. `"names": ["小明"]` mengizinkan nama diri sebagai kepingan walau bukan kata silabus.
- `npm run build` wajib dijalankan setelah mengubah `content/lessons/*.json`; tes `test_committed_data_is_current` gagal bila `lessons.json` tidak sesuai. `npm run review-sheet` menyertakan lembar "课文 Pelajaran" (kalimat kunci, kata kunci, soal dengar dan baca) untuk direview penutur asli.
- Pilihan jawaban soal pelajaran diacak ulang setiap langkah dimulai; berpindah tab menghentikan rekaman yang sedang berjalan dan melepas mikrofon.
- Beranda menampilkan kartu tiap pelajaran (yang sedang berjalan atau berikutnya diberi bingkai), dan Kemajuan punya panel "Pelajaran bertema" (langkah, persen per langkah, kalimat bicara yang lulus) dengan tombol buka pelajaran.
- Hanzi isi pelajaran dikunci ke silabus sampai `level` pelajaran; **judul** (`zh`) dikecualikan karena hanya penanda (mis. 餐厅 adalah kata HSK 4, judul "在餐厅" tetap dipakai).
- `keySentences[].tokens` harus tersambung menjadi kalimat; pinyin per kata diturunkan dari alur pinyin aplikasi (bukan diketik). `"order": false` mengeluarkan kalimat dari soal susun; `"alt": ["…"]` mendaftar urutan lain yang sama benarnya (harus susunan lain dari hanzi yang sama) dan ikut diterima. Kalimat kunci tidak boleh berisi 儿 (erhua, mis. 一点儿): jumlah suku kata pinyin tidak sama dengan jumlah hanzi dan pembangun menolaknya; kata itu boleh dipakai di soal dengar/baca.
- **Kata kunci**: teks biasa = kata silabus (≤ level) dengan arti Indonesia buatan tangan (HSK 1–3); bentuk `{"word": "面试", "arti": "wawancara kerja"}` = kata silabus (≤ level) dengan arti Indonesia yang ditulis di pelajaran (wajib dari HSK 4, karena `vocab_id.json` hanya memuat HSK 1–3); `{"zh", "pinyin", "id"}` = kata di luar silabus (tidak masuk Hafalan).
- **Kepingan susun kalimat**: kata silabus, satu hanzi, atau nama/kata tambahan. Kalimat bertanda `"phrases": true` (hanya HSK 4+) boleh memakai kepingan frasa; maksimal 8 kepingan per soal susun.
- **Bacaan khusus (`readings`)**: hanzi yang dibaca tidak seperti bacaan bakunya (行 háng, 长 zhǎng, 兴 xìng di 高兴, 便 pián di 便宜, 还 huán, 都 dū, 好 hào, ...) harus tercakup oleh `"readings": {"高兴": "gāo xìng"}` di berkas pelajaran. Pembangun gagal bila ada bacaan tidak biasa yang belum didaftarkan, atau entri yang tidak dipakai; daftar ini masuk lembar review ("拼音 bacaan khusus"). Neutral tone, sandhi 一/不, dan akhiran 儿 tidak dihitung tidak biasa.
- Tab Pelajaran mengelompokkan per level dengan chip filter (pilihan terakhir diingat di perangkat); Beranda menampilkan satu pelajaran untuk dilanjutkan plus ringkasan per level; Kemajuan memakai blok yang dapat dilipat per level.
- Progres di `store.data.lessons[id].steps[langkah] = {ok, n, t}`; kata yang ditambahkan dari langkah Vocab ada di `store.data.pinned` dan diambil lebih dulu oleh `buildQueue`, tanpa mengikuti pengaturan level atau batas harian.
- **Speaking** (tahap 3, tingkat 1 + 2): tombol Ucapkan merekam suara (tingkat 1: putar "Rekamanku" berdampingan dengan suara model) dan, bila browser mendukung, `SpeechRecognition` zh-CN menghasilkan transkrip yang dicocokkan dengan kalimat (tingkat 2). Skor = persentase hanzi yang terdengar (LCS, jadi satu salah tidak menggeser sisanya; hanzi yang belum terdengar ditandai merah per kata). **Nada tidak dinilai**: pengenal hanya tahu kata yang dipahami. Ambang lulus 70%. Tanpa pengenal ucapan (Firefox, dimatikan di Pengaturan, offline) langkah tetap bisa diselesaikan lewat rekam-bandingkan atau tanda manual.
- Hasil tiap kalimat yang dinilai masuk log sebagai kejadian `s: "speaking"`, `ty: "speak_sentence"`; langkah menyimpan `{ok, n}` = kalimat lulus / kalimat dinilai. Keterampilan `speaking` tidak dipakai untuk saran "keterampilan terlemah" karena Latihan belum punya soal bicara.
- Privasi: rekaman hanya ada di memori halaman (URL blob dicabut saat meninggalkan langkah), tidak disimpan dan tidak dikirim oleh aplikasi. Di Chrome/Edge pengenalan ucapan diproses penyedia browser lewat internet; opsi "Nilai ucapan dengan pengenalan ucapan browser" di Pengaturan mematikannya.
- **Kontur nada (tahap 4, eksperimental, mati secara bawaan)**: Pengaturan → "Penilaian nada". Rekaman diminta mentah (tanpa peredam bising/penguat otomatis), didekode dengan `decodeAudioData`, lalu `tone.js`: (1) YIN tiap 10 ms; (2) rentang bicara dari energi; (3) dipotong jadi N suku kata sebanyak pinyin target (DP: panjang mirip, potongan di titik energi rendah); (4) tiap suku kata → 5 titik pada skala 1–5 relatif terhadap rentang suara pembicara itu sendiri (P10–P90); (5) bentuk terdekat dari empat nada dibandingkan dengan nada yang diminta. Sandhi nada 3 (3 3 → 2 3) dan "setengah nada 3" sebelum suku kata lain diterapkan; nada netral tidak dinilai. Hasil: n/m suku kata sesuai, grafik putus-putus (diminta) vs tebal (terukur), dan daftar per suku kata. Analisis dilewati bila kata-katanya tidak lulus pengenalan ucapan (<70%), karena nada kata lain tidak bermakna. Tidak disimpan ke progres.
- Batas yang diketahui: tidak tahu apa yang diucapkan (mengandaikan kalimat target); butuh tempo wajar (≥100 ms per suku kata), ruang tenang, dan mikrofon yang tidak mengolah suara; potongan suku kata adalah dugaan dari energi sehingga ucapan tanpa jeda atau terpatah-patah bisa salah potong. Divalidasi pada suara sintetis (kalimat pelajaran × suara pria/wanita: ≈98% suku kata, nada sengaja salah: turun ke ≈50%); belum diukur pada penutur sungguhan.
