# Sumber Data & Lisensi — HSK 3.0

Target proyek: **HSK 3.0 (silabus 2025)**. HSK 2.0 tidak dipakai lagi.

## Sumber resmi (paling relevan)

| Data | Sumber | Dipakai untuk |
|---|---|---|
| Struktur ujian & contoh soal level 1–6 | **《新版HSK（1-6级）考试结构与样题示例》**, 汉考国际 (CTI), terbit 2025-12, berlaku 2026-07. PDF 44 halaman, diunduh dari mirror [Konfuzius-Institut Heidelberg](https://s3.eu-central-1.amazonaws.com/konfuzius-institut-heidelberg.de/wp-content/uploads/2026/02/19110129/%E6%96%B0%E7%89%88HSK%EF%BC%881-6%E7%BA%A7%EF%BC%89%E8%80%83%E8%AF%95%E7%BB%93%E6%9E%84%E4%B8%8E%E6%A0%B7%E9%A2%98%E7%A4%BA%E4%BE%8B.pdf) | `blueprints/hsk3.0/` (jumlah soal, jumlah bagian, durasi, tipe soal) |
| Silabus: **hanya** daftar kata (11.000, dengan level, pinyin, jenis kata) dan daftar 1.200 hanzi tulis | **《HSK 考试大纲》** (CLEC/CTI), terbit 2025-11, berlaku 2026-07. Query resmi: [chinesetest.cn/syllabus](https://www.chinesetest.cn/syllabus) | `data/hsk3/vocab.json`, `handwriting.json` |
| Salinan CSV silabus resmi | [ofou/hsk](https://github.com/ofou/hsk) (MIT) — mirror otomatis API chinesetest.cn; angka per level dicek terhadap PDF silabus 406 halaman | Sumber input `scripts/build_hsk3.py` (commit tercatat di `data/hsk3/SOURCE.json`) |
| Arti Indonesia & kalimat contoh HSK 1–2 | Ditulis tangan oleh asisten AI (`content/id/`), belum direview penutur asli | `data/hsk3/vocab_id.json` |
| Glos bahasa Inggris | [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) → CC-CEDICT | Field `gloss_en` (opsional; ±92% kata terisi) |

Domain `chinesetest.cn` dan host PDF silabus (`hsk.cn-bj.ufileos.com`) tidak bisa diakses dari lingkungan pengembangan ini (diblokir proxy). Karena itu silabus diambil lewat mirror `ofou/hsk`, dan struktur ujian lewat mirror PDF resmi di atas.

## Angka resmi yang divalidasi tes (`tests/test_data.py`)

| Level | Kata baru | Kata kumulatif | Hanzi tulis |
|---|---|---|---|
| 1 | 300 | 300 | 0 |
| 2 | 200 | 500 | 100 (daftar bersama level 1–2) |
| 3 | 500 | 1.000 | 150 |
| 4 | 1.000 | 2.000 | 150 |
| 5 | 1.600 | 3.600 | 150 |
| 6 | 1.800 | 5.400 | 150 |
| 7–9 | 5.600 | 11.000 | 500 |

**Sengaja tidak disertakan** (bukan kebutuhan aplikasi, dan hak ciptanya milik CLEC/CTI): daftar hanzi baca, tata bahasa (593 poin), tugas, topik, dan nama diri dari silabus. Pemeriksa "hanzi dalam kalimat tidak boleh melebihi level" memakai hanzi dari kata-kata silabus sampai level itu, sehingga tidak butuh daftar hanzi baca. Siapa pun yang membutuhkannya dapat mengambilnya sendiri dari sumber resmi atau salinan terbukanya.

## Struktur ujian level 1–6 (dari dokumen CTI)

| Level | Listening | Reading | Writing | Total soal | Total waktu |
|---|---|---|---|---|---|
| 1 | 20 soal, ~12 mnt | 20 soal, 20 mnt | – | 40 | 40 mnt |
| 2 | 25 soal, ~17 mnt | 25 soal, 25 mnt | 10 soal, 10 mnt | 60 | 60 mnt |
| 3 | 30 soal, ~23 mnt | 30 soal, 30 mnt | 10 soal, 20 mnt | 70 | ~83 mnt |
| 4 | 32 soal, ~20 mnt | 32 soal, 30 mnt | 6 soal, 25 mnt | 70 | ~85 mnt |
| 5 | 35 soal, ~25 mnt | 35 soal, 35 mnt | 2 soal, 40 mnt | 72 | ~110 mnt |
| 6 | 40 soal, ~30 mnt | 40 soal, 40 mnt | 2 soal, 45 mnt | 82 | ~125 mnt |

Total waktu sudah termasuk pengisian data diri dan lembar jawaban. **Perbedaan penting dari HSK 2.0**: jumlah soal lebih sedikit, writing sudah ada sejak level 2, dan level 5–6 hanya punya 2 soal writing (esai).

Dokumen ini **tidak memuat speaking** untuk level 1–6, dan **tidak memuat sistem skor/nilai lulus**.

## Catatan hukum untuk publikasi sumber terbuka

Silabus 《HSK 考试大纲》 dan dokumen struktur ujian adalah karya CLEC/CTI. Repositori ini hanya menyertakan: (a) **daftar kata** (kata, level, pinyin, jenis kata) dan **daftar hanzi tulis** dari salinan terbuka [ofou/hsk](https://github.com/ofou/hsk) (MIT atas salinannya, tetapi **bukan** pernyataan bahwa CLEC/CTI melepas haknya), dan (b) **hanya angka** dari dokumen struktur ujian (tanpa soal contohnya). Bagian silabus yang berupa teks (tata bahasa dengan contoh kalimat, deskripsi tugas, topik) **dihapus** dari repositori sebelum dipublikasikan. Daftar kata adalah fakta yang diperlukan aplikasi, tetapi jika pemilik hak keberatan, buka issue dan berkas terkait akan dihapus. Ini bukan nasihat hukum.

## Yang belum diketahui (perlu dokumen resmi tambahan)

1. **Sistem skor & nilai lulus** HSK 3.0 — tidak ada di dokumen struktur. `scoring` di blueprint sengaja dihilangkan.
2. **Speaking untuk HSK 3.0 level 1–6** — sumber sekunder bertentangan (ada yang menyebut HSKK terpisah, ada yang menyebut speaking wajib mulai level 3). Dokumen resmi struktur ujian level 1–6 tidak memuatnya. Tidak ditebak.
3. **Rincian per-bagian level 4–6** — jumlah soal per bagian dari tabel resmi; tipe soal per bagian diturunkan dari contoh soal (label tipe adalah label kami). Pembagian internal Reading bagian 3 level 4 (7 soal) belum sepenuhnya terkonfirmasi.
4. **Jumlah putaran audio** — tidak disebut di dokumen.
5. **Hak cipta/lisensi:** `ofou/hsk` berlisensi MIT, tetapi isi silabus adalah milik CLEC/CTI. Definisi bahasa Inggris dari CC-CEDICT berlisensi CC BY-SA 4.0. Tinjau sebelum rilis publik/komersial.
6. **Kata "returning" (kata kembali di level lebih tinggi dengan arti lain):** disimpan di `also_levels`; level utama = band pertama (sesuai upstream).

## Pembangunan ulang data

```bash
git clone --depth 1 https://github.com/ofou/hsk /tmp/ofou-hsk
git clone --depth 1 https://github.com/drkameleon/complete-hsk-vocabulary /tmp/chv   # opsional (glos)
python3 -I scripts/build_hsk3.py /tmp/ofou-hsk /tmp/chv/complete.json
```
