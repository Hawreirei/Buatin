# Berkontribusi / Contributing

Terima kasih! Kontribusi yang paling dibutuhkan saat ini adalah **koreksi konten oleh penutur asli/guru** (arti, kalimat, terjemahan, soal yang ambigu), lalu konten level 4–6 dan perbaikan aplikasi.

## Cara tercepat membantu: koreksi konten
Buka issue **“Koreksi konten”**. Sertakan nomor soal yang tampil di layar (mis. `#c190`) atau nomor kata (mis. id `391`) dan koreksi yang diusulkan. Tidak perlu bisa coding.

## Untuk guru / penutur asli: lembar review
`python3 scripts/build_review_sheet.py` membuat `review/Buatin-review-laoshi.xlsx`: seluruh konten (kosakata, soal mendengar/membaca, adegan gambar, soal isi kata) dengan kolom status dan usulan koreksi, petunjuk dalam bahasa Mandarin dan Indonesia. Kirim hasil koreksi lewat issue "Koreksi konten" atau PR.

## Menjalankan proyek
```bash
git clone https://github.com/Hawreirei/Buatin.git && cd Buatin
python3 -m http.server 8080            # buka http://localhost:8080/app/
pip install -r requirements.txt        # hanya untuk membangun data / tes Python
python3 -m unittest discover -s tests  # tes Python (±30 detik)
node --test tests/js/*.test.mjs        # tes JavaScript (Node 22, tanpa dependensi)
```

## Di mana mengedit apa
| Yang ingin diubah | Berkas sumber | Lalu jalankan |
|---|---|---|
| Arti / kalimat contoh / terjemahan kata | `content/id/level-N.psv` (`id\|kata\|arti\|kalimat\|terjemahan`) | `python3 -I scripts/build_id.py` lalu `python3 -I scripts/build_questions.py` |
| Tanya-jawab / dialog / teks bacaan | `content/id/qa-level-*.psv`, `dialog-level-3.psv`, `reading-level-*.psv` | `python3 -I scripts/build_questions.py` |
| Adegan & dialog bergambar | `content/pic/scenes.json`, `content/pic/dialogs.psv` | `python3 -I scripts/build_questions.py` |
| Struktur ujian | `blueprints/hsk3.0/*.yaml` | `python3 -I scripts/build_blueprints_json.py` |
| Tampilan / logika aplikasi | `app/` | tes JS + coba di browser |

**Berkas di `data/hsk3/` (`vocab_id.json`, `questions.json`, `blueprints.json`) adalah hasil build — edit sumbernya, bukan berkas ini**, lalu commit hasil build bersama sumbernya (tes memeriksa keduanya sinkron).

## Aturan konten
1. **Hanzi dalam kalimat/soal tidak boleh melebihi level.** Pemeriksa otomatis menolaknya; kata di atas level jangan dipakai.
2. **Jangan menyalin soal, teks, atau contoh dari ujian/buku resmi.** Tulis sendiri; sebutkan jika terinspirasi format.
3. Satu kalimat contoh per kata, wajar dan sederhana; hindari pengecoh yang juga benar (soal ambigu).
4. Terjemahan Indonesia wajar (bukan harfiah) dan arti sesuai pemakaian HSK, bukan makna kamus pertama.
5. Konten yang dibuat dengan bantuan AI **harus diperiksa manusia** dan diberi tahu di deskripsi PR.

## Pull request
- Satu topik per PR; jalankan kedua rangkaian tes (CI akan menjalankannya juga).
- Jelaskan *mengapa* koreksi benar (rujukan kamus/pengalaman penutur asli).
- Dengan mengirim PR, Anda setuju kode Anda berlisensi **MIT** dan konten Anda **CC BY-SA 4.0** (lihat `LICENSE`, `LICENSE-CONTENT.md`).

## Hal yang belum ada (ide untuk kontributor)
Konten HSK 4–6, foto/ilustrasi asli, soal `match_question_to_answer` / `audio_statement_question_mcq` / `choose_missing_character_component` / `write_sentence_from_picture_and_word`, speaking (HSKK), sinkronisasi antar perangkat, PWA offline. Lihat `README.md` dan `docs/PROPOSAL-HSK.md`.

Lihat juga `CODE_OF_CONDUCT.md` dan `NOTICE.md`.
