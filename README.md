# Learning Chinese — Latihan HSK 3.0

[![CI](https://github.com/Hawreirei/LearnChinese/actions/workflows/ci-pages.yml/badge.svg)](https://github.com/Hawreirei/LearnChinese/actions/workflows/ci-pages.yml)
[![Kode: MIT](https://img.shields.io/badge/kode-MIT-green.svg)](LICENSE)
[![Konten: CC BY-SA 4.0](https://img.shields.io/badge/konten-CC%20BY--SA%204.0-blue.svg)](LICENSE-CONTENT.md)

**Demo:** <https://hawreirei.github.io/LearnChinese/> (aktif setelah GitHub Pages dinyalakan, lihat [Menerbitkan](#menerbitkan-di-github-pages))

Aplikasi web gratis dan sumber terbuka untuk berlatih **HSK 3.0 (silabus 2025)** dalam Bahasa Indonesia. Berjalan sepenuhnya di browser, tanpa akun; progres tersimpan di perangkat Anda.

*English:* a free, open-source, Indonesian-language practice app for the new HSK 3.0: spaced-repetition flashcards for the official 2025 word list, practice questions (reading, writing, listening, including picture and long-text items), timed exam simulations for HSK 1–3 that follow CTI's official section sizes and timings, and progress/weakness analytics. Static site, no accounts. Not affiliated with CLEC/CTI. Questions are original practice material and **not yet reviewed by native speakers**; corrections are welcome.

> **Status:** konten HSK 1–3 tersedia. HSK 4–6, foto asli, dan speaking belum ada. Seluruh konten buatan sendiri **belum direview penutur asli**; bantu koreksi lewat [issue "Koreksi konten"](../../issues/new/choose) atau lihat [CONTRIBUTING.md](CONTRIBUTING.md).

## Fitur

| Tab | Fungsi |
|---|---|
| **Pelajaran** | Skenario bertema dengan lima langkah (dengar, baca, tulis, bicara, kosakata): kalimat kunci berpinyin per kata, soal per langkah, kata kunci bisa ditambahkan ke Hafalan. Saat ini: "自我介绍 Perkenalan diri" (HSK 1) dan "在餐厅 Di restoran" (HSK 3). Langkah bicara: rekam suara dan bandingkan dengan model, plus penilaian kata yang terdengar lewat pengenalan ucapan browser (Chrome/Edge/Safari), plus opsi eksperimental penilaian kontur nada per suku kata yang dihitung di perangkat |
| **Hafalan** | Flashcard dengan pengulangan berjarak (SM-2 + langkah belajar), arti Indonesia, kalimat contoh + pinyin + terjemahan, suara; pintasan Spasi dan 1–4 |
| **Latihan** | 2.746 soal: isi kata, tulis hanzi, susun kalimat, tanya-jawab, dialog dan teks mendengar, soal bergambar, teks pendek dan paragraf bacaan; umpan balik dan penjelasan langsung |
| **Ujian** | Simulasi bertimer HSK 1–3: jumlah soal, bagian, dan waktu mengikuti tabel resmi CTI; bagian terkunci setelah selesai |
| **Kuis**, **Daftar** | Kuis arti kata; pencarian kosakata |
| **Kemajuan** | Tren akurasi, riwayat simulasi, ringkasan tiap pelajaran, kelemahan per keterampilan/jenis soal/level/jenis kata, kata yang sering salah, kata sulit di hafalan, tombol "Latihan kelemahan" |
| **Pengaturan** | Level, kata baru per hari, suara, ekspor/impor/reset progres |

Soal yang jenis resminya belum ada diganti pengganti terdekat dan ditandai di layar; skor simulasi adalah perkiraan, bukan skor resmi (sistem skor resmi HSK 3.0 belum diketahui). Detail teknis dan daftar jenis soal: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Mulai cepat

```bash
git clone https://github.com/Hawreirei/LearnChinese.git && cd LearnChinese
python3 -m http.server 8080        # buka http://localhost:8080/app/
```

Tidak perlu instal apa pun selain Python (hanya sebagai server file statis).

```bash
pip install -r requirements.txt    # untuk membangun data dan tes Python
npm run test                       # tes Python (±30 dtk) + tes JavaScript (Node 22)
npm run build                      # bangun ulang data dari content/ dan blueprints/
```

## Isi repositori

| Folder | Isi |
|---|---|
| `app/` | aplikasi web statis, tanpa build dan tanpa dependensi |
| `content/` | konten tulisan sendiri: arti, kalimat, soal, dialog, teks, adegan gambar |
| `data/hsk3/` | daftar kata resmi (`vocab.json`), hanzi tulis (`handwriting.json`), dan hasil build (`vocab_id.json`, `questions.json`, `blueprints.json`) |
| `blueprints/` | struktur ujian resmi per level (jumlah soal, bagian, waktu) |
| `scripts/` | pembangun data, soal, lembar review, dan situs |
| `tests/` | tes Python (data, konten, soal) dan JavaScript (logika aplikasi) |
| `docs/` | arsitektur, sumber dan lisensi, catatan audit, riset awal |

## Menerbitkan di GitHub Pages

Workflow [`ci-pages.yml`](.github/workflows/ci-pages.yml) menjalankan semua tes, membangun situs (`scripts/build_site.py`), dan menerbitkannya **dari branch default**. Langkah sekali saja di GitHub:

1. Repositori **Public** (Settings → General → Danger Zone → Change visibility).
2. Settings → **Pages** → *Build and deployment* → Source: **GitHub Actions**.
3. Pastikan `main` adalah branch default (Settings → Branches), lalu jalankan workflow: Actions → *CI dan GitHub Pages* → Run workflow.

Situs ada di `https://<pengguna>.github.io/<repositori>/`; jalur relatif membuatnya tetap berfungsi di sub-path. Coba hasil build lokal: `npm run site && cd _site && python3 -m http.server 8080`.

## Lisensi

- **Kode** (`app/`, `scripts/`, `tests/`, `.github/`, `db/`): [MIT](LICENSE).
- **Konten orisinal** (`content/`, `vocab_id.json`, `questions.json`, `docs/`): [CC BY-SA 4.0](LICENSE-CONTENT.md).
- **Daftar kata dan hanzi tulis resmi** (`vocab.json`, `handwriting.json`) milik CLEC/CTI dan tidak tercakup lisensi di atas (bagian teks silabus seperti tata bahasa dan tugas sengaja tidak disertakan); **glos Inggris** dari CC-CEDICT (CC BY-SA 4.0). Rincian dan atribusi: [NOTICE.md](NOTICE.md).
- Bukan produk resmi HSK. Kontribusi: [CONTRIBUTING.md](CONTRIBUTING.md), [kode etik](CODE_OF_CONDUCT.md).
