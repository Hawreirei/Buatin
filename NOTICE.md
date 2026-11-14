# Pemberitahuan, atribusi, dan pernyataan / Notices, attributions, disclaimers

## Bukan produk resmi / Not official
Proyek ini **tidak berafiliasi dengan, tidak disetujui, dan tidak disponsori oleh** Center for Language Education and Cooperation (CLEC), Chinese Testing International (CTI), atau penyelenggara HSK mana pun. "HSK" adalah nama/merek pihak tersebut dan dipakai di sini hanya untuk menyebut ujian yang dilatih. Soal di sini **bukan soal resmi**; skor simulasi hanyalah perkiraan latihan.

This project is not affiliated with or endorsed by CLEC, CTI, or any HSK exam provider. Questions are original practice material, not official questions.

## Sumber pihak ketiga / Third-party sources

| Sumber | Dipakai untuk | Lisensi / status |
|---|---|---|
| 《HSK 考试大纲》 (CLEC/CTI, 2025-11) — <https://www.chinesetest.cn/syllabus> | hanya daftar kata dan daftar hanzi tulis (`data/hsk3/vocab.json`, `handwriting.json`); bagian teks silabus (tata bahasa, tugas, topik) tidak disertakan | hak cipta CLEC/CTI; disertakan untuk rujukan pendidikan lewat salinan di bawah. **Pemilik hak yang keberatan dapat menghubungi pengelola repositori (buka issue) dan berkas terkait akan dihapus.** |
| [ofou/hsk](https://github.com/ofou/hsk) | salinan CSV silabus resmi yang dipakai sebagai input `scripts/build_hsk3.py` | MIT (oleh pembuatnya; tidak mengubah hak CLEC/CTI atas isinya) |
| 《新版HSK（1-6级）考试结构与样题示例》 (CTI, 2025-12) | hanya **angka struktur** (jumlah soal, bagian, waktu) di `blueprints/`; tidak ada soal contoh yang disalin | hak cipta CTI |
| [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) | glos Inggris (`gloss_en`) | MIT (repo); definisinya dari CC-CEDICT |
| [CC-CEDICT](https://cc-cedict.org/) © MDBG | glos bahasa Inggris | CC BY-SA 4.0 |
| [pypinyin](https://github.com/mozillazg/python-pinyin) | pembuatan pinyin saat build (tidak dikirim ke pengguna) | MIT |
| Emoji (Unicode) | "gambar" pada soal bergambar | karakter Unicode; tampilan mengikuti font perangkat (mis. Noto Color Emoji, OFL) |

## Konten buatan AI / AI-generated content
Arti Indonesia, kalimat contoh, terjemahan, tanya-jawab, dialog, teks bacaan, dan adegan gambar ditulis oleh asisten AI (Claude) bersama pengelola proyek, lalu diperiksa dengan pemeriksaan otomatis (lihat `docs/AUDIT-id.md`). **Belum seluruhnya direview penutur asli/guru.** Koreksi sangat diharapkan — lihat `CONTRIBUTING.md`.

## Tanpa jaminan / No warranty
Disediakan "apa adanya". Jangan menganggap hasil latihan sebagai prediksi skor ujian resmi.

## Data goresan hanzi dan pustaka Hanzi Writer

| Sumber | Dipakai untuk | Lisensi |
|---|---|---|
| **hanzi-writer-data** 2.0.1 (<https://github.com/chanind/hanzi-writer-data>), berasal dari **Make Me a Hanzi** (<https://github.com/skishore/makemeahanzi>) dan font Arphic | `data/hsk3/strokes/*.json`: bentuk dan urutan goresan 1.200 hanzi tulis, dibangun lewat `scripts/build_strokes.py` | **Arphic Public License**; salinan lisensi ada di `data/hsk3/strokes/ARPHICPL.TXT` dan harus tetap menyertai data ini |
| **Hanzi Writer** 3.7.3 (<https://github.com/chanind/hanzi-writer>) | `app/js/vendor/hanzi-writer.min.js`: animasi goresan dan pemeriksaan goresan di tab Tulis | MIT (`app/js/vendor/hanzi-writer.LICENSE`) |
