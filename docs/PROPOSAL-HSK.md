# Proposal Pengembangan: Buatin — Aplikasi Latihan HSK 1–6

> Status: draf riset v1 · Tanggal: 2026-11-12
> Catatan keandalan: angka bertanda **[VERIFIKASI]** berasal dari sumber sekunder yang saling bertentangan atau dari pengetahuan umum penulis, dan **harus dicocokkan dengan silabus & sample paper resmi (CTI / chinesetest.cn / hsk.org.cn)** sebelum dijadikan spesifikasi final.

> **Revisi 2026-11-12 (Fase 0):** Target proyek diubah ke **HSK 3.0 saja**. Angka HSK 2.0 di bagian 2.1–2.3 dan 3.1 di bawah hanya riset awal dan **tidak lagi berlaku**; gunakan [docs/sources.md](sources.md) dan `blueprints/hsk3.0/` (dari dokumen resmi CTI) untuk struktur ujian dan `data/hsk3/` (silabus resmi 2025) untuk kosakata. Beberapa asumsi proposal ini sudah dikoreksi oleh dokumen resmi: jumlah soal lebih sedikit (40/60/70/70/72/82), writing sudah ada di level 2, dan speaking tidak termasuk di struktur level 1–6.

---

## 1. Ringkasan Eksekutif

- HSK sedang berada di masa transisi **HSK 2.0 (6 level)** → **HSK 3.0 (9 level)**. Sumber yang ditemukan menyebut silabus 3.0 diterbitkan November 2025, tetapi tanggal ujian resmi 3.0 berbeda antar sumber (Juli 2026 vs 13 Des 2026) **[VERIFIKASI]**. Sumber lain menyebut jadwal reguler masih memakai format 2.0.
- **Rekomendasi:** bangun aplikasi *data-driven* dengan field `syllabus_version` ("2.0" / "3.0"). MVP mengikuti **HSK 2.0** (format stabil, daftar kata 5.000 tersedia luas), lalu tambahkan profil 3.0 tanpa mengubah kode inti.
- Aspek ujian: **Listening (听力), Reading (阅读), Writing (书写)** untuk HSK 3–6 (HSK 1–2 hanya listening + reading). **Speaking tidak ada di HSK 1–6; itu ujian terpisah bernama HSKK** (Pemula / Menengah / Tinggi). Untuk HSK 3.0 level 7–9, speaking menjadi bagian dari satu ujian gabungan.
- Strategi pembuatan soal: **generator berbasis template + LLM + validasi otomatis (cek kosakata level) + TTS untuk audio + review manusia**. Soal asli resmi **tidak disalin**; soal dibuat orisinal mengikuti *format, tingkat kesulitan, dan batas kosakata* tiap level.

---

## 2. Aspek Ujian HSK

### 2.1 HSK 2.0 (Level 1–6) — format yang dipakai MVP

| Level | Kosakata kumulatif | Listening | Reading | Writing | Total soal | Durasi (±) | Skor | Lulus |
|---|---|---|---|---|---|---|---|---|
| HSK 1 | 150 | 20 | 20 | – | 40 | ~40 mnt | 200 | 120 |
| HSK 2 | 300 | 35 | 25 | – | 60 | ~55 mnt | 200 | 120 |
| HSK 3 | 600 | 40 | 30 | 10 | 80 | ~90 mnt | 300 | 180 |
| HSK 4 | 1.200 | 45 | 40 | 15 | 100 | ~105 mnt | 300 | 180 |
| HSK 5 | 2.500 | 45 | 45 | 10 | 100 | ~125 mnt | 300 | 180 |
| HSK 6 | 5.000 | 50 | 50 | 1 (rangkuman) | 101 | ~135–140 mnt | 300 | 180 |

Sumber sekunder berbeda soal durasi HSK 1 (35 vs 40 mnt) dan HSK 6 (135 vs 140 mnt) **[VERIFIKASI]**. Skor: tiap seksi bernilai 100 poin; ada sumber yang menyebut ambang minimum per seksi — **[VERIFIKASI]**.

### 2.2 Tipe soal per bagian (HSK 2.0) **[VERIFIKASI jumlah per bagian]**

**Listening (听力)**
| Level | Bagian & tipe soal |
|---|---|
| 1 | P1 dengar kalimat → benar/salah terhadap gambar · P2 dengar dialog → cocokkan gambar · P3 dengar kalimat → pilih gambar · P4 dengar pertanyaan → pilih jawaban (A/B/C) |
| 2 | P1 benar/salah vs gambar · P2 dialog pendek → pilih gambar · P3 dialog → pilih jawaban teks · P4 dialog → pilih jawaban |
| 3 | P1 dialog → cocokkan gambar · P2 benar/salah (kalimat dibacakan) · P3 dialog pendek → pilih · P4 dialog panjang → pilih |
| 4 | P1 benar/salah (kalimat/paragraf pendek) · P2 dialog pendek (2 baris) → pilih · P3 dialog/teks panjang → pilih (tiap audio diputar 1×) |
| 5 | P1 dialog pendek → pilih · P2 dialog/monolog panjang → pilih |
| 6 | P1 benar/salah/pilih terhadap paragraf · P2 teks naratif → pilih · P3 wawancara/pidato panjang → pilih |

**Reading (阅读)**
| Level | Bagian & tipe soal |
|---|---|
| 1 | P1 kata/kalimat vs gambar (benar/salah) · P2 cocokkan kalimat–gambar · P3 cocokkan pertanyaan–jawaban · P4 isi kata rumpang |
| 2 | P1 cocokkan gambar · P2 isi kata rumpang (daftar pilihan) · P3 cocokkan pasangan kalimat · P4 isi kata rumpang |
| 3 | P1 cocokkan pasangan kalimat · P2 isi kata rumpang · P3 teks pendek → pilihan ganda |
| 4 | P1 isi rumpang (选词填空) · P2 susun urutan kalimat (排序) · P3 teks → pilihan ganda |
| 5 | P1 cloze teks panjang · P2 teks → pilihan ganda · P3 teks panjang/artikel → pilihan ganda |
| 6 | P1 pilih kalimat yang salah · P2 isi rumpang dengan kata/frasa · P3 isi kalimat ke dalam teks · P4 teks panjang → pilihan ganda |

**Writing (书写)**
| Level | Tipe |
|---|---|
| 1–2 | Tidak ada seksi menulis |
| 3 | P1 susun kata menjadi kalimat · P2 tulis hanzi yang hilang (diberi pinyin) |
| 4 | P1 susun kata menjadi kalimat · P2 tulis kalimat dari gambar + kata yang diberikan |
| 5 | P1 susun kata menjadi kalimat (±8) · P2 karangan ±80 hanzi (dari kata kunci / gambar) |
| 6 | Baca teks ±1.000 hanzi (10 mnt) → tulis **rangkuman ±400 hanzi** (35 mnt), tanpa menyalin kalimat asli |

### 2.3 Speaking — HSKK (ujian terpisah)

| Level HSKK | Setara HSK | Jumlah soal | Durasi | Struktur |
|---|---|---|---|---|
| Pemula (初级) | 1–2 | 27 | ~17 mnt (7 mnt persiapan) | P1 dengar & ulang · P2 dengar & jawab · P3 jawab pertanyaan (urutan/jumlah per bagian **[VERIFIKASI]**) |
| Menengah (中级) | 3–4 | 14 | ~21 mnt (10 mnt persiapan) | P1 dengar & ulang · P2 deskripsi gambar · P3 jawab pertanyaan |
| Tinggi (高级) | 5–6 | 6 | ~24 mnt (10 mnt persiapan) | P1 dengar & ulang-ringkas · P2 baca nyaring · P3 jawab pertanyaan |

Pemetaan HSKK↔HSK berbeda antar sumber (ada yang memetakan 1–2 / 3–4 / 5–6) — pakai ini sebagai default.

### 2.4 HSK 3.0 (rencana adopsi fase 2) **[VERIFIKASI semua angka]**

- 9 level dalam 3 band: Dasar (1–3), Menengah (4–6), Tinggi (7–9). Level 7–9 memakai satu ujian gabungan (±98 soal, ±210 mnt, termasuk terjemahan dan speaking).
- Level 1–2: listening + reading; level 3 menambah writing; level 4–6: listening, reading, writing (+ terjemahan pada versi tertentu).
- Kosakata kumulatif: ada dua rangkaian angka beredar —
  - Daftar draf awal: 500 / 1.272 / 2.245 / 3.245 / 4.316 / 5.456 / 11.092 (L1–L7-9).
  - Rangkaian lain di sumber sekunder: 300 / 500 / 1.000 / 2.000 / 3.600 / 5.400 / 11.000.
  - Kemungkinan keduanya merepresentasikan versi silabus berbeda. **Ambil dari PDF silabus resmi final.**
- Tata bahasa: 210 poin (L1–3), 424 (L1–6), 572 (L1–9). Ada juga standar 900 hanzi pada band 3.
- Ada komponen baru yang tidak ada di 2.0: daftar *karakter* (汉字) dan *tata bahasa* per level secara eksplisit, serta bobot penilaian lintas keterampilan.

---

## 3. Kosakata yang Perlu Dihafal

### 3.1 Jumlah per level (HSK 2.0, stabil)

| Level | Kata baru | Kumulatif |
|---|---|---|
| HSK 1 | 150 | 150 |
| HSK 2 | 150 | 300 |
| HSK 3 | 300 | 600 |
| HSK 4 | 600 | 1.200 |
| HSK 5 | 1.300 | 2.500 |
| HSK 6 | 2.500 | 5.000 |

### 3.2 Contoh kata kerja (动词) HSK 1–2 (daftar penuh diimpor dari dataset, bukan diketik manual)

- **HSK 1:** 爱, 吃, 打电话, 读, 工作, 喝, 回, 叫, 看, 看见, 开, 来, 买, 去, 认识, 睡觉, 说, 听, 坐, 做, 写, 学习, 住, 喜欢, 想, 在, 有, 是, 会, 能, 请, 谢谢
- **HSK 2 (tambahan):** 帮助, 带, 等, 告诉, 给, 过, 进, 觉得, 离开, 玩, 起床, 洗, 跑步, 睡, 踢, 问, 休息, 要, 知道, 找, 准备, 唱歌, 跳舞, 比
- **HSK 3 ke atas:** pola penambahan = kata kerja berpasangan/kompleks (e.g. 担心, 发现, 决定, 参加, 迟到, 担心, 关心), kata kerja + pelengkap hasil/arah (e.g. 看见, 拿出来), dan kata kerja idiomatis. Dari HSK 5–6 mulai banyak verba formal/tulis (e.g. 贡献, 衬托, 抵制, 缓解).

### 3.3 Aspek yang dihafal per kata

Setiap entri harus menyimpan: hanzi (sederhana), pinyin + nada, kelas kata (POS), arti (EN/ID), contoh kalimat, tingkat HSK (2.0 & 3.0), frekuensi, audio, stroke order, dan **tata bahasa/pola** terkait (e.g. 把-sentence, 比-comparison, 了/过/着).

### 3.4 Sumber data & lisensi

- **drkameleon/complete-hsk-vocabulary** — JSON, HSK 2.0 + 3.0 (MIT di repo; **lisensi data turunan perlu dicek**).
- **ivankra/hsk30** — HSK 3.0 bersih dengan pinyin, POS, variasi (kode MIT, data diturunkan dari repo MIT lain).
- **elkmovie/hsk30**, **clem109/hsk-vocabulary** — sumber hulu.
- Daftar resmi dari penerbit ujian berhak cipta penerbit; MIT pada repo tidak otomatis menjamin hak redistribusi daftar aslinya. Untuk aplikasi publik/komersial, sebaiknya konsultasi ulang.
- Kamus/definisi: **CC-CEDICT** (CC BY-SA), audio: TTS buatan sendiri (bukan rekaman ujian resmi).

---

## 4. Rancangan Sistem

### 4.1 Prinsip

1. **Jangan menyalin soal resmi.** Tiru *spesifikasi* (format, jumlah, kesulitan, batas kosakata), bukan teks soal.
2. **Level-lock:** semua kata dalam soal harus ≤ level target (kecuali kata target yang diuji, dan istilah yang diberi anotasi). Kosakata ≤ level adalah *hard constraint* yang divalidasi otomatis.
3. **Data-driven exam blueprint** — satu file konfigurasi menjelaskan setiap ujian (bagian, tipe, jumlah, waktu, bobot).

### 4.2 Blueprint (contoh YAML)

```yaml
exam: hsk
syllabus: "2.0"
level: 4
sections:
  - id: listening
    time_min: 30
    parts:
      - {id: L1, type: audio_true_false, count: 10}
      - {id: L2, type: audio_dialog_mcq, count: 15}
      - {id: L3, type: audio_passage_mcq, count: 20}
  - id: reading
    time_min: 40
    parts:
      - {id: R1, type: cloze_wordbank, count: 10}
      - {id: R2, type: sentence_ordering, count: 10}
      - {id: R3, type: passage_mcq, count: 20}
  - id: writing
    time_min: 25
    parts:
      - {id: W1, type: word_reorder, count: 10}
      - {id: W2, type: write_from_prompt, count: 5}
scoring: {total: 300, pass: 180}
```

### 4.3 Pipeline pembuatan soal

```
Blueprint ─► Pemilih target (kata/tata bahasa/topik, adaptif)
          ─► Generator (template + LLM, prompt dibatasi kosakata level)
          ─► Validator otomatis
                 · cek semua hanzi/kata ≤ level (segmentasi: jieba/pkuseg + daftar HSK)
                 · cek panjang, jumlah opsi, 1 jawaban benar, distraktor masuk akal
                 · cek duplikasi dengan bank soal
                 · cek LLM kedua ("solver") – jika solver salah/ambigu → ditolak
          ─► Pembuatan aset (TTS audio, gambar, pinyin)
          ─► Antrian review manusia (guru/penutur asli)
          ─► Bank soal (tag: level, tipe, skill, kesulitan IRT, status)
```

**Kunci kualitas:**
- *Solver check:* model lain menjawab soal; jika jawabannya ≠ kunci → buang. Menangkap soal ambigu.
- *Kalibrasi kesulitan:* mulai dari tag heuristik (panjang kalimat, frekuensi kata), lalu dikalibrasi dari data jawaban pengguna (rasio benar, model Rasch/1PL → 2PL).
- *Watermark & sumber:* setiap soal menyimpan `generator_version`, `prompt_hash`, `reviewer_id`.

### 4.4 Pembuatan per keterampilan

| Skill | Pendekatan generasi | Penilaian |
|---|---|---|
| Listening | LLM tulis skrip dialog/monolog sesuai level → TTS (suara netral, kecepatan disesuaikan level, variasi laki/perempuan, diputar 1× atau 2× sesuai level) → soal pilihan ganda | Otomatis (pilihan ganda/benar-salah) |
| Reading | LLM tulis teks terbatas kosakata level; template untuk cloze, susun kalimat, cocokkan pasangan; distraktor dihasilkan dari kata mirip (kategori/pinyin/hanzi) | Otomatis |
| Writing | Susun kata: acak potongan kalimat valid; isi hanzi: hapus kata target; karangan/rangkuman: prompt + rubrik | Susun/isi: otomatis (bandingkan beberapa susunan yang diterima). Karangan/rangkuman: **LLM-as-grader + rubrik** (kesesuaian, tata bahasa, hanzi, panjang) |
| Speaking (HSKK) | Teks untuk diulang/dibaca nyaring dari bank kalimat; pertanyaan dari bank topik; gambar dari aset berlisensi | **ASR + pronunciation assessment** (cek nada, kelancaran, kelengkapan) + LLM untuk isi jawaban |

### 4.5 Komponen teknis (usulan)

- **Frontend:** web PWA (Next.js/React) — timer ujian, pemutar audio satu-kali, input hanzi (IME pinyin) dan kanvas tulisan tangan opsional; mode *Latihan* (per bagian, umpan balik instan) dan *Simulasi ujian* (waktu & aturan sebenarnya).
- **Backend:** Postgres (Supabase) untuk bank soal, pengguna, riwayat jawaban; penyimpanan objek untuk audio/gambar.
- **Mesin SRS:** Spaced repetition (FSRS/SM-2) untuk kosakata & tata bahasa.
- **NLP Tionghoa:** jieba/pkuseg untuk segmentasi, pypinyin untuk pinyin, hanziwriter (stroke order).
- **TTS:** layanan yang mendukung zh-CN dengan SSML (kontrol kecepatan, jeda). Pilih berdasarkan kualitas nada & biaya.
- **Speech assessment:** layanan penilaian pengucapan Mandarin (mendukung skor per nada/suku kata).
- **LLM:** pembuat soal, solver, penilai karangan, penjelasan jawaban dalam Bahasa Indonesia.
- **Analitik belajar:** kelemahan per tipe soal/tata bahasa → rekomendasi latihan.

### 4.6 Model data inti (ringkas)

- `vocab(id, hanzi, pinyin, pos, meaning_en, meaning_id, hsk2_level, hsk3_level, freq, audio_url)`
- `grammar_point(id, name, pattern, hsk3_level, example)`
- `exam_blueprint(id, syllabus, level, json)`
- `question(id, blueprint_part, type, level, skill, payload_json, answer_key, difficulty, status, source_meta)`
- `question_vocab(question_id, vocab_id, role)` — mencatat kata yang dipakai (alat validasi level)
- `attempt(user_id, question_id, response, correct, time_ms, ts)`
- `review_state(user_id, vocab_id, due, stability, difficulty)` — SRS

---

## 5. Peta Jalan

| Fase | Isi | Hasil |
|---|---|---|
| 0 — Fondasi (1–2 mgu) | Impor dataset kosakata 2.0, verifikasi dengan sumber resmi, skema DB, blueprint HSK 1–2 | Basis data kata + blueprint tervalidasi |
| 1 — MVP HSK 1–2 (3–4 mgu) | Flashcard + SRS, generator & validator reading/listening, TTS, mode latihan & simulasi | Aplikasi bisa dipakai untuk HSK 1–2 |
| 2 — HSK 3–4 (4 mgu) | Seksi writing (susun/isi), soal audio panjang, analitik kelemahan | Cakupan HSK 1–4 |
| 3 — HSK 5–6 (4–6 mgu) | Teks panjang, penilai karangan/rangkuman, kalibrasi kesulitan | Cakupan HSK 1–6 |
| 4 — Speaking/HSKK (4 mgu) | ASR, pronunciation scoring, soal HSKK pemula–tinggi | Latihan speaking |
| 5 — HSK 3.0 | Profil silabus 3.0 (kosakata, tata bahasa, hanzi, format baru), toggle versi | Dukungan 3.0 |

---

## 6. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Hak cipta soal/daftar kata resmi | Hanya soal orisinal; cek lisensi dataset; hindari mengklaim sebagai "soal resmi" |
| Soal LLM salah/ambigu/tidak natural | Validator otomatis + solver + review penutur asli; label status soal |
| Kosakata bocor melewati level | Segmentasi + daftar level sebagai hard-constraint; sampel manual |
| Kualitas TTS (nada, ritme) buruk | Uji beberapa vendor; review audio sampel; kecepatan/jeda sesuai level |
| Penilaian pengucapan/karangan kurang akurat | Tampilkan sebagai *estimasi*, bukan skor resmi; kalibrasi dengan sampel berlabel |
| Perubahan silabus 3.0 | `syllabus_version` + blueprint & kosakata di data, bukan di kode |
| Data bertentangan antar sumber | Pegang satu sumber kebenaran (PDF resmi), catat di `docs/sources.md` |

---

## 7. Keputusan yang Dibutuhkan

1. **Target silabus MVP:** 2.0 (rekomendasi) atau 3.0?
2. **Platform:** web (PWA) dulu, atau mobile native?
3. **Bahasa antarmuka & penjelasan:** Indonesia, Inggris, atau keduanya?
4. **Model bisnis:** gratis/lisensi/subscription — memengaruhi pemilihan vendor TTS/ASR/LLM dan lisensi data.
5. **Review manusia:** apakah tersedia penutur asli/guru untuk review?

---

## 8. Sumber

- [HSK 3.0 vs HSK 2.0 — echineselearning](https://www.echineselearning.com/blog/hsk-3-vs-hsk-2-changes-explained)
- [HSK 3.0: Levels, Word Counts — Chill Chinese](https://chill-chinese.com/blog/new-hsk/)
- [HSK 3.0 Guide — chineselearner](https://chineselearner.com/hsk)
- [The New HSK 3.0 Exam Format — The Pure Language](https://www.thepurelanguage.com/Articles/Hsk3NewExamFormat)
- [HSK Passing Scores — HSKLord](https://hsklord.com/blog/hsk-passing-scores)
- [HSK Test Format — HSKLord](https://hsklord.com/hsk-test-format)
- [HSKK Levels — Confucius Institute UK](https://www.confuciusinstitute.ac.uk/hsk/hskk-levels/)
- [What Is the HSKK — PrepEdu](https://prepedu.com/en/blog/what-is-hskk)
- [HSK Level 5 (PDF) — Confucius Institute UK](https://www.confuciusinstitute.ac.uk/wp-content/uploads/2020/12/HSK-level-5.pdf)
- [HSK Level 6 (PDF) — Confucius Institute UK](https://www.confuciusinstitute.ac.uk/wp-content/uploads/2020/12/HSK-level-6.pdf)
- [New HSK 3.0 Band 3 — chinaeducenter](https://www.chinaeducenter.com/en/hsk/newhskband3.php)
- [ivankra/hsk30](https://github.com/ivankra/hsk30)
- [drkameleon/complete-hsk-vocabulary](https://github.com/topics/hsk-vocabulary)
