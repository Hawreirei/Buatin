# Lisensi konten / Content license

Konten orisinal proyek ini dilisensikan di bawah **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**: <https://creativecommons.org/licenses/by-sa/4.0/legalcode>

Original content of this project is licensed under CC BY-SA 4.0. You may share and adapt it, even commercially, if you give appropriate credit, indicate changes, and distribute your contributions under the same license.

## Yang tercakup / Covered

| Berkas | Isi |
|---|---|
| `content/` | arti Indonesia, kalimat contoh, terjemahan, tanya-jawab, dialog, teks bacaan, adegan gambar |
| `data/hsk3/vocab_id.json` | hasil olahan `content/id/level-*.psv` + pinyin kalimat otomatis |
| `data/hsk3/questions.json` | bank soal yang dibangkitkan dari konten di atas |
| `docs/` | dokumentasi dan catatan audit |
| `blueprints/` | ringkasan struktur ujian (jumlah soal, bagian, waktu) |

`data/hsk3/vocab.json` memuat glos bahasa Inggris dari **CC-CEDICT** (CC BY-SA 4.0, © MDBG); karena itu berkas tersebut juga berlisensi CC BY-SA 4.0 atas bagian glosnya.

## Yang TIDAK tercakup / Not covered

Daftar resmi silabus HSK yang disertakan (kata dan hanzi tulis; `data/hsk3/vocab.json` bagian data resminya dan `handwriting.json`) adalah milik **CLEC/CTI** dan disertakan hanya sebagai rujukan pendidikan melalui salinan terbuka (lihat `NOTICE.md`). Lisensi di sini tidak memberi hak apa pun atas materi itu.

Kode (`app/`, `scripts/`, `tests/`, `db/`, `.github/`) berlisensi **MIT**, lihat `LICENSE`.
