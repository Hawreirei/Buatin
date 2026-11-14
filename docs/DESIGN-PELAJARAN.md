# Rancangan: Pelajaran Bertema (Skenario 5 Langkah)

Status: tahap 1 (susun kalimat), 2 (pelajaran restoran) dan 3 (speaking tingkat 1+2) sudah dikerjakan; tingkat 3 (kontur nada) belum. Dibuat dari dua tangkapan layar referensi dan pembacaan kode saat ini.

## 1. Yang terbaca dari referensi

**Layar 1: halaman pelajaran "在餐厅 Di restoran" (HSK 2)**
- Judul skenario (hanzi + Indonesia), lencana level, bilah progres.
- Kartu **kalimat kunci** dengan pinyin per kata di atas hanzi, lalu terjemahan.
- Grid **kata kunci** (hanzi, pinyin, arti, tombol suara).

**Layar 2: alur belajar 5 langkah** (stepper): 听 Listening → 读 Reading → 写 Writing → 说 Speaking → 词 Vocab. Langkah selesai = centang, aktif = lingkaran bergaris, belum = abu-abu.
- Langkah Writing berisi soal **"Susun kalimat"** (soal 7/10): terjemahan ditampilkan, pelajar mengurutkan kepingan hanzi **termasuk tanda baca** (服务员 ， 请给 我 菜单 。) ke area susun.
- Panel "**Berikutnya: ucapkan 请给我菜单**" dengan label **"nada dinilai"** (penilaian nada/pengucapan).

Jadi fitur baru adalah: (A) pelajaran bertema, (B) soal susun kalimat, (C) latihan bicara bernilai, (D) kartu kalimat berpinyin per kata dan kata kunci per skenario.

## 2. Yang sudah ada dan dipakai ulang

| Kebutuhan | Sudah ada | Catatan |
|---|---|---|
| Kerangka soal | `views/question.js` (satu tempat menggambar soal, adaptor mode) | Tambah jenis `order_sentence` di sini |
| Penyusun set & pemeriksa | `practice.js` (`buildSet`, `check`, `summarize`) | Pelajaran memakai logika yang sama |
| Soal mendengar/membaca/menulis per level | `questions.json` (1.918 soal) | Bisa dirujuk per skenario lewat tag |
| Kosakata + SRS | `deck.js`, `srs.js`, `session.js` | Langkah "Vocab" cukup menambah kata ke antrean SRS |
| Suara | `ui.js` `speak`, `speakSequence`, `listeningParts` | TTS dialog 男/女 sudah jalan |
| Penyimpanan | `store.js` (`localStorage`, versi 1) | Tambah kunci `lessons` tanpa menaikkan versi |
| Batasan hanzi per level | pemeriksa di `build_id.py`/`build_questions.py` | Dipakai juga untuk konten pelajaran |

Belum ada sama sekali: speaking, pemisahan kalimat per kata (segmentasi), konsep "skenario/tema", soal susun kalimat. Blueprint resmi juga mencatat "speaking" dan beberapa jenis soal sebagai belum ada (`docs/ARCHITECTURE.md`).

## 3. Rancangan fitur

### A. Pelajaran bertema
- Tab baru **Pelajaran** (setelah Beranda). Daftar skenario per level: 在餐厅, 打招呼, 买东西, 问路, dst. Kartu menunjukkan progres 0–5 langkah.
- Halaman pelajaran = layar 1: judul, kalimat kunci berpinyin, kata kunci, tombol **Mulai** / **Lanjutkan**.
- Alur 5 langkah, urutan tetap tetapi boleh dilompati lewat stepper:
  1. **Listening**: 3–4 soal mendengar dari skenario (dialog/kalimat → pilih gambar/jawaban).
  2. **Reading**: 3–4 soal membaca (isi kata, teks pendek).
  3. **Writing**: soal susun kalimat + tulis hanzi.
  4. **Speaking**: ucapkan 2–3 kalimat kunci (lihat C).
  5. **Vocab**: kata kunci skenario, ketuk "Tambah ke hafalan" (satu tombol untuk semua) → masuk SRS.
- Selesai satu langkah = stepper tercentang; semua selesai = ringkasan (akurasi per langkah, kata yang salah, tombol "Ulangi yang lemah").
- Jawaban soal tetap dicatat lewat `store.recordAnswer` (kind `practice`, tambah `lesson: <id>`), sehingga halaman **Kemajuan** otomatis ikut menghitung.

### B. Soal "Susun kalimat" (`order_sentence`)
- Tampilan: terjemahan Indonesia, area susun (garis putus-putus), bank kepingan acak. Ketuk kepingan = pindah ke area; ketuk lagi = kembalikan. Tanpa drag-and-drop agar ramah layar sentuh dan keyboard.
- Kepingan = hasil segmentasi per kata silabus + tanda baca sebagai kepingan sendiri (seperti referensi).
- Jawaban benar bila urutan sama dengan kalimat sumber; **boleh juga lolos bila urutan alternatif yang valid** (daftar `alt` di data, mis. 我想 … 吗), supaya tidak menghukum jawaban sah.
- Aksesibilitas: area susun `role="list"`, tombol Hapus/Reset, tombol "Periksa".
- Tes: pemeriksa murni di `practice.js`, tes di `tests/js/practice.test.mjs`.

### C. Latihan bicara ("nada dinilai")
Ini bagian paling berisiko. Penilaian nada yang akurat di browser tidak bisa dijamin, jadi dibuat bertingkat dan **jujur diberi label "perkiraan"**:

| Tingkat | Cara | Dukungan | Dikirim ke server? |
|---|---|---|---|
| 1. Dengar-banding | Rekam (MediaRecorder), putar ulang berdampingan dengan TTS; pelajar menilai sendiri | semua browser modern | tidak, audio hanya di memori |
| 2. Pengenalan ucapan | Web Speech API `SpeechRecognition` `zh-CN`; bandingkan transkrip dengan kalimat target (kemiripan per kata/pinyin) | Chrome/Edge/Safari; Firefox tidak; di Chrome audio diproses penyedia browser (perlu internet) | oleh browser, bukan aplikasi |
| 3. Kontur nada (eksperimental) | `getUserMedia` + `AudioContext`, deteksi F0 (autokorelasi), normalisasi per penutur, bandingkan bentuk dengan nada 1–4 per suku kata dari pinyin | perlu tes banyak perangkat; akurasi rendah pada suara berisik/anak/kata pendek | tidak, lokal |

Rekomendasi: kirim **tingkat 1 + 2** lebih dulu (skor "Pengucapan" dari transkrip), tingkat 3 sebagai fase terpisah di balik pengaturan "Penilaian nada (eksperimental)". Chip "nada dinilai" baru ditampilkan bila tingkat 3 aktif; selain itu tampil "pengucapan dinilai" atau "dengar-banding". Bila mikrofon ditolak/tidak ada, langkah Speaking bisa dilewati tanpa menghalangi pelajaran selesai.

Catatan privasi: audio tidak disimpan dan tidak dikirim oleh aplikasi; tulis di Pengaturan dan di `NOTICE.md`.

### D. Kartu kalimat berpinyin per kata & kata kunci
- Komponen `ruby`-style: tiap kata silabus = `<ruby>` dengan `<rt>` pinyin; pinyin bisa disembunyikan (pengaturan sudah ada untuk teks bacaan).
- Grid kata kunci memakai data `vocab.json` + `vocab_id.json`; ketuk = suara.

## 4. Model data

Sumber tulisan baru: `content/lessons/<level>-<slug>.json` (diedit manusia, CC BY-SA).

```json
{ "id": "hsk2-restoran", "level": 2, "zh": "在餐厅", "id_title": "Di restoran",
  "keySentences": [
    { "zh": "服务员，请给我菜单。", "id": "Pelayan, tolong berikan saya menu.",
      "tokens": ["服务员", "，", "请给", "我", "菜单", "。"], "alt": [] } ],
  "keyWords": [301, 455, 812],
  "dialogs": ["dlg-restoran-1"],
  "questionTags": ["restoran"],
  "speaking": ["服务员，请给我菜单。"] }
```

Aturan yang dijaga otomatis (skrip `scripts/build_lessons.py`, mengikuti pola `build_id.py`):
- hanzi hanya dari kosakata sampai level pelajaran;
- `tokens` bila digabung harus sama dengan `zh`; setiap token kata ada di silabus atau tanda baca;
- `keyWords` valid dan punya arti Indonesia;
- pinyin per token diturunkan dari `vocab.json` (bukan diketik manual) agar konsisten.

Hasil build: `data/hsk3/lessons.json` (di-commit, dimuat `main.js` bersama file lain, `getJson("lessons.json", [])` agar opsional).

Soal per skenario: tambahkan kolom `topic` pada soal baru yang dibuat untuk pelajaran; soal lama bisa ditandai belakangan lewat `questionTags` (tanpa mengubah soal ujian).

Penyimpanan (`store.js`, tetap `version: 1`, diberi nilai bawaan saat dibaca):

```json
"lessons": { "hsk2-restoran": { "steps": {"listening": 1, "reading": 1, "writing": 0, "speaking": 0, "vocab": 0},
                                "best": {"listening": 100}, "t": 1731500000000 } }
```
Ekspor/impor ikut otomatis karena seluruh `data` diserialisasi.

`db/schema.sql`: tabel `lesson` dan `lesson_question` hanya ditambahkan bila fase server dikerjakan; tidak dibutuhkan sekarang.

## 5. Modul baru

| Berkas | Tugas | Diuji |
|---|---|---|
| `app/js/lesson.js` | logika murni: bangun 5 langkah dari satu pelajaran, progres, ringkasan | `tests/js/lesson.test.mjs` |
| `app/js/order.js` | acak kepingan, periksa urutan (dengan `alt`) | `tests/js/order.test.mjs` |
| `app/js/speech.js` | rekam, pengenalan ucapan, skor kemiripan; (fase 3) deteksi F0 dan skor kontur | skor kemiripan & kontur diuji dengan data sintetis |
| `app/js/views/lessons.js` | daftar skenario + halaman pelajaran + stepper | manual + uji logika |
| `app/js/views/question.js` | cabang `order_sentence` (`questionBody`, `explanation`) | `tests/test_questions.py` bila ada soal terbangun |
| `scripts/build_lessons.py` | validasi + bangun `lessons.json` | `tests/test_lessons.py` |
| `app/css/style.css` | stepper, kepingan susun, panel bicara | tangkapan layar lebar 360 px |

## 6. Sketsa layar (mobile)

```
┌──────────────────────────────┐
│ 在餐厅  Di restoran    [HSK 2]│
│ ▓▓▓▓▓▓▓▓▓░░░░░░  2/5 langkah │
│ ┌──────────────────────────┐ │
│ │ fúwùyuán qǐng gěi wǒ ... │ │
│ │ 服务员，请给我菜单。      │ │
│ │ Pelayan, tolong berikan..│ │
│ └──────────────────────────┘ │
│ 🔊 菜单 càidān   🔊 服务员   │
│ 🔊 米饭 mǐfàn    🔊 好吃     │
│        [ Lanjutkan → ]       │
└──────────────────────────────┘
 听✓  读✓  写●  说○  词○   ← stepper
```

## 7. Tahapan pengerjaan (usulan urutan)

1. **Soal "Susun kalimat"** (B): berdiri sendiri, langsung bisa dipakai di Latihan, risiko rendah.
2. **Skema + build + 3–5 skenario HSK 1–2** (data A/D), tab Pelajaran, stepper, langkah Listening/Reading/Writing/Vocab.
3. **Speaking tingkat 1 + 2** (C), langkah kelima aktif.
4. **Speaking tingkat 3** (kontur nada), eksperimental, di balik pengaturan.
5. Perluas skenario ke HSK 3, tautkan ke Kemajuan (ringkasan per skenario), kartu di Beranda.

Tiap tahap diakhiri `npm run test` hijau, pembaruan `README.md` dan `docs/ARCHITECTURE.md`.

## 8. Risiko

- **Penilaian nada**: akurasi tidak terjamin; ditangani dengan label "perkiraan", skor tidak masuk statistik ujian, tidak menghalangi kemajuan.
- **Dukungan browser**: `SpeechRecognition` tidak ada di Firefox; mikrofon butuh HTTPS (GitHub Pages sudah HTTPS) dan izin pengguna.
- **Konten**: skenario dan kalimat baru ikut belum direview penutur asli (sama seperti konten saat ini); tandai di README.
- **Beban konten**: tiap skenario butuh kalimat kunci, dialog, soal bertag; perlu templat dan pemeriksa agar penulisan cepat.

## 9. Pertanyaan terbuka

1. Daftar skenario awal dan levelnya (usul: restoran, perkenalan, belanja, tanya arah, di rumah sakit)?
2. Untuk "nada dinilai": cukup tingkat 1+2 dulu, atau kontur nada (tingkat 3) wajib sejak awal?
3. Fitur lain selain yang terlihat di dua tangkapan layar yang ingin ditambahkan?
