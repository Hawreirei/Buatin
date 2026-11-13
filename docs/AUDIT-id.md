# Audit konten Indonesia (HSK 1–2, 500 kata)

Dilakukan 2026-11-13 oleh asisten AI. **Bukan pengganti review penutur asli/guru.** Pemeriksaan yang bisa diotomasi dijadikan tes (`tests/test_i18n.py`, `tests/js/`).

## Putaran 1 — otomatis
| Pemeriksaan | Hasil |
|---|---|
| id & kata cocok dengan silabus resmi; kalimat memuat kata target | lulus |
| Semua hanzi kalimat muncul di kata silabus ≤ level kata | 35 pelanggaran awal diperbaiki → 0 |
| Kalimat contoh ganda antar kata | 23 kelompok → 0 (tes permanen) |
| Bacaan kata target di pinyin kalimat = bacaan silabus | lihat temuan di bawah → 0 selisih (tes permanen) |

Temuan pinyin otomatis (pypinyin) yang diperbaiki: 长 terbaca *zhǎng* (3 kalimat), 地/得 terbaca *dì/dé* (±8), 教 *jiào* (menjadi *jiāo*), 过 partikel (*guo*), sandhi 不/一 (*bú*, *yí/yì*) belum diterapkan, nada netral kata silabus (爸爸 *bàba*, 朋友 *péngyou*, …) hilang, 儿子 salah digabung sebagai erhua (*gèr zi*), 谁 tidak konsisten (*shéi/shuí*). Kini bacaan semua kata yang ada di silabus diambil dari silabus resmi; sandhi nada 3 tidak diterapkan (sesuai penulisan buku teks).

## Putaran 2 — baca ulang manual 500 baris
70 baris ditulis ulang. Contoh: "这个衣服" → "这件衣服" (penggolong yang benar); "书在桌子里" (janggal) → "我的书在家里"; "我的电话是一三零" (nomor telepon dibaca *yāo*) → "我的房间是三零五"; terjemahan 女士 dan 喂 yang menyimpang dari kalimat Mandarin diperbaiki; arti 边, 点1, 多, 日, 女士 dipertajam; kalimat yang memakai tata bahasa di atas level (mis. 起得很早) diganti.

## Putaran 3 — silang
- **Angka:** 90 kalimat berangka dicek satu per satu terhadap terjemahannya — semua cocok.
- **Ejaan Indonesia:** hunspell `id_ID` pada seluruh arti dan terjemahan — hanya kata turunan sah (mengemudi, sarapan, sekelas, …) dan nama/serapan (yuan, jiaozi, Gao) yang ditandai.
- **Kuis:** 36 pasangan kata punya arti yang sama persis (mis. 想/要 "ingin", 店/商店 "toko"). Pengecoh kini menolak kata yang berbagi butir arti dengan jawaban, jadi tidak ada dua pilihan yang sama-sama benar (tes: >3.000 pengecoh diperiksa).

## Yang belum bisa dijamin
- Kewajaran bahasa, nuansa, dan pilihan arti sesuai pemakaian HSK **belum dinilai penutur asli**.
- Pinyin kalimat tetap buatan mesin untuk kata di luar silabus; kata dengan banyak bacaan di luar daftar bisa keliru.
- Arti dipilih sesuai pemakaian HSK; di data Inggris sebelumnya banyak kata yang maknanya keliru (mis. 百 "marga Bai").

## Tambahan: HSK 3 (500 kata, id 501–1000), 2026-11-13

Pemeriksaan yang sama dijalankan: hanzi ≤ level 3, kata target ada di kalimat, kalimat unik, bacaan kata target = silabus, ejaan, angka. Temuan pinyin otomatis tambahan yang diperbaiki: 得 (*dé / děi / de*), 长 (*cháng / zhǎng*), 还 *huán*, 地方 *dìfang*, kata dengan tanda hubung (红绿灯), dan kata ber-bacaan-ganda di silabus kini dilindungi dari penimpaan huruf tunggal. Pinyin 500 kalimat baru dibaca ulang satu per satu. 36 dialog/teks mendengar HSK 3 ditulis sendiri dan lolos pemeriksaan hanzi ≤ level 3 serta tiga pilihan yang berbeda. **Belum direview penutur asli.**

## Tambahan: soal bergambar dan teks panjang, 2026-11-13

- **Adegan gambar (76):** kalimat tiap adegan lolos pemeriksaan hanzi ≤ level (HSK 1–3) dan punya terjemahan. Aturan pengecoh diuji: semua pilihan gambar berasal dari kelompok berbeda (`tests/test_questions.py::test_picture_questions`), jadi tidak ada dua gambar yang sama-sama cocok. Contoh kasus yang sengaja dihindari: dialog tentang hujan tidak menyebut "payung" (karena ada adegan lain yang bisa cocok), dan jam hanya satu per set pilihan.
- **Soal hitung (45):** "三个苹果" → 3 emoji apel; pengecoh = jumlah lain dari benda yang sama dan benda lain dengan jumlah sama.
- **Dialog bergambar (42), teks pendek (30), paragraf HSK 3 (14 paragraf × 2 soal):** ditulis sendiri; hanzi ≤ level, tiga pilihan berbeda, jawaban tepat satu, panjang paragraf ≥ 60 hanzi (diuji).
- **Keterbatasan:** gambar emoji kecil kemungkinan tampil sedikit berbeda antar perangkat; jam analog (emoji) sulit dibedakan pada layar kecil; paragraf HSK 3 resmi bisa lebih panjang. Belum dinilai penutur asli.
