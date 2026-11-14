# Rencana Skenario Tambahan HSK 1–6

Status: **gelombang 0 (persiapan: arti Indonesia per kata kunci, kepingan frasa HSK 4+, pemeriksa bacaan khusus, pengelompokan UI per level, lembar review) sudah dikerjakan; gelombang 1 (HSK 1) sedang dikerjakan.** Sisanya masih rencana.

Permintaan: tambah skenario pelajaran untuk HSK 1–6, **minimal 5 per level** (jangan hanya 1 atau sedikit di HSK 1), dengan memperhatikan kosakata tiap level. Dokumen ini berisi daftar skenario, kosakata kandidat, perubahan teknis yang dibutuhkan, urutan kerja, dan hal yang perlu Anda putuskan.

Cara dokumen ini dibuat: setiap kata, level, dan pinyin di bawah **dicek otomatis terhadap `data/hsk3/vocab.json`** (silabus HSK 3.0, 2025), dan setiap kalimat contoh dicek terhadap aturan kunci-hanzi aplikasi (hanzi hanya yang muncul di kata silabus sampai level itu). Kata yang sengaja dibuang karena level-nya lebih tinggi dicantumkan per skenario.

## 1. Ringkasan

| Level | Sekarang | Ditambah | Total | Skenario yang sudah ada |
|---|---|---|---|---|
| HSK 1 | 1 | **+6** | 7 | perkenalan 自我介绍 |
| HSK 2 | 2 | **+4** | 6 | belanja 买东西, tanya-arah 问路 |
| HSK 3 | 2 | **+4** | 6 | restoran 在餐厅, rumah-sakit 看病 |
| HSK 4 | 0 | **+5** | 5 | — |
| HSK 5 | 0 | **+5** | 5 | — |
| HSK 6 | 0 | **+5** | 5 | — |
| **Jumlah** | 5 | **+29** | **34** | |

Setiap level menjadi **minimal 5**. HSK 1 diberi 7 (paling banyak) karena pemula butuh paling banyak situasi dasar; HSK 4–6 masing-masing 5. Level 7–9 tidak termasuk dalam permintaan ini.

## 2. Temuan dari data silabus (mengubah rencana)

Daftar kata dalam repo mengikuti **HSK 3.0 (2025)**, jadi level beberapa kata berbeda dari buku HSK 2.0 yang mungkin Anda kenal. Saat mengecek kandidat saya menemukan:

- **Banyak kata yang "wajar" untuk sebuah situasi ternyata ada di level lebih tinggi.** Contoh: 订 (pesan/booking) HSK 4, 租 (sewa) HSK 4, 退 (mengembalikan) HSK 5, 隐私 (privasi) HSK 6, 通货膨胀 (inflasi) HSK 7–9, 判决 (putusan) HSK 7–9. Kata seperti ini **tidak dipakai** di skenario level di bawahnya; daftarnya ada di tiap skenario ("sengaja dihindari").
- **Hanzi dikunci per level, bukan kata.** Kalimat boleh memakai hanzi yang muncul di *kata mana pun* sampai level itu (mis. 租 boleh muncul di HSK 3 lewat 出租车), tetapi kata utuhnya tidak dijadikan kata kunci.
- **Arti Indonesia buatan tangan hanya ada untuk HSK 1–3** (1.000 kata, `vocab_id.json`). HSK 4–6 baru punya arti Inggris dari CC-CEDICT (±8% kosong). Karena itu kata kunci HSK 4–6 butuh arti Indonesia yang ditulis di berkas pelajaran (lihat bagian 5, perubahan teknis nomor 1).
- **Kalimat kunci tidak boleh memuat 儿 (erhua)**, karena jumlah suku kata pinyin jadi tidak sama dengan jumlah hanzi dan pembangun menolaknya; karena itu contoh memakai 哪里 (bukan 哪儿) dan 一些 (bukan 一点儿). Kata itu masih boleh muncul di soal dengar dan baca.
- **Kata yang kita ajarkan harus ada di silabus agar bisa masuk Hafalan.** Kata di luar silabus (mis. 服务员) hanya bisa jadi "kata tambahan" dan tidak masuk Hafalan; di rencana ini saya menghindarinya kecuali nama diri.

## 3. Prinsip pemilihan tema per level

| Level | Fokus | Gaya bahasa | Contoh teks |
|---|---|---|---|
| HSK 1 | Bertahan hidup dan diri sendiri: sapaan, angka, keluarga, makan, cuaca, sekolah | kalimat 3–7 hanzi, pola dasar (是, 有, 想, 吗) | kalimat tunggal, dialog 2 giliran |
| HSK 2 | Kehidupan sehari-hari: telepon, transportasi, olahraga, sekolah, belanja, arah | 5–9 hanzi, perbandingan 比, 一起, 可以 | dialog 2–3 giliran, teks 2–3 kalimat |
| HSK 3 | Layanan dan pekerjaan: hotel, kantor, sewa rumah, belajar, restoran, rumah sakit | 6–11 hanzi, 把/让/又……又……, keluhan dan saran | dialog, paragraf 50–80 hanzi |
| HSK 4 | Situasi terstruktur dan pendapat: wawancara, perjalanan, kesehatan, belanja online, lingkungan | 9–15 hanzi, 越来越, 应该, 比……更 | paragraf 80–120 hanzi |
| HSK 5 | Topik publik/abstrak: rapat, berita, teknologi, pendidikan, budaya | 12–20 hanzi, klausa majemuk, 引起/体现/获得 | teks 120–180 hanzi |
| HSK 6 | Formal dan akademis: debat, ekonomi, tradisi, sains, hukum | 14–25 hanzi, ungkapan tulis, penghubung logis | teks 150–250 hanzi |

Tanda 🎤 di daftar kalimat berarti kalimat itu **≤ 12 hanzi** dan cocok untuk langkah Speaking (analisis nada dan pengenalan ucapan lebih andal pada ucapan pendek). Kalimat lebih panjang tetap jadi bahan baca, dengar, dan susun.

## 4. Rencana per level

Format tiap skenario: tema, alur situasi, pola tata bahasa, 3–4 kalimat kunci contoh, dan **kosakata kandidat** (hanzi, pinyin, arti, level; ⭐ = kata baru di level itu). Saat dibuat, dipilih **±10–12 kata kunci** dari kandidat; sisanya muncul di soal. Arti untuk HSK 1–3 diambil dari arti Indonesia yang sudah ada; untuk HSK 4–6 yang tampil adalah arti Inggris CC-CEDICT dan arti Indonesia ditulis saat pelajaran dibuat.

### HSK 1

Sudah ada: perkenalan 自我介绍.

#### H1-1 `sapaan` · 问候 · Sapaan dan sopan santun

Menyapa, menanyakan kabar, berterima kasih, minta maaf, berpamitan.

- **Alur situasi:** Bertemu guru/teman di pagi hari → tanya kabar → berterima kasih → minta maaf → berpamitan.
- **Pola dan ungkapan:** 你好吗？/ 我很好 · 对不起，没关系 · 明天见
- **Kalimat kunci contoh:**
  - 你好吗？ 🎤 — Apa kabar?
  - 我很好，谢谢。 🎤 — Aku baik, terima kasih.
  - 对不起，没关系。 🎤 — Maaf, tidak apa-apa.
  - 明天见！ 🎤 — Sampai besok!
- **Kosakata kandidat (19 kata, 19 baru di HSK 1):** 你好⭐ *nǐ hǎo* (halo); 您⭐ *nín* (Anda (sopan)); 早上⭐ *zǎoshang* (pagi hari); 晚上⭐ *wǎnshang* (malam hari); 好⭐ *hǎo* (baik); 谢谢⭐ *xièxie* (terima kasih); 不客气⭐ *bú kèqi* (sama-sama); 对不起⭐ *duìbuqǐ* (maaf); 没关系⭐ *méi guānxi* (tidak apa-apa); 再见⭐ *zàijiàn* (sampai jumpa); 请⭐ *qǐng* (silakan); 明天⭐ *míngtiān* (besok); 老师⭐ *lǎoshī* (guru); 同学⭐ *tóngxué* (teman sekelas); 你们⭐ *nǐmen* (kalian); 吗⭐ *ma* (partikel tanya (ya/tidak)); 很⭐ *hěn* (sangat); 也⭐ *yě* (juga); 见⭐ *jiàn* (bertemu)

#### H1-2 `angka-waktu` · 数字和时间 · Angka, tanggal, dan jam

Menyebut angka, bertanya dan menjawab jam, tanggal, serta hari.

- **Alur situasi:** Menanyakan jam → menanyakan tanggal dan hari → menyebut jadwal sederhana.
- **Pola dan ungkapan:** 现在几点？ · 今天几月几号？ · 今天星期几？
- **Kalimat kunci contoh:**
  - 现在几点？ 🎤 — Sekarang jam berapa?
  - 现在八点。 🎤 — Sekarang jam delapan.
  - 今天几月几号？ 🎤 — Hari ini tanggal berapa?
  - 今天星期三。 🎤 — Hari ini hari Rabu.
- **Kosakata kandidat (17 kata, 17 baru di HSK 1):** 几⭐ *jǐ* (berapa (jumlah kecil)); 点⭐ *diǎn* (pukul (jam)); 分钟⭐ *fēnzhōng* (menit); 月⭐ *yuè* (bulan); 号⭐ *hào* (tanggal); 星期⭐ *xīngqī* (minggu); 年⭐ *nián* (tahun); 今天⭐ *jīntiān* (hari ini); 明天⭐ *míngtiān* (besok); 昨天⭐ *zuótiān* (kemarin); 现在⭐ *xiànzài* (sekarang); 百⭐ *bǎi* (seratus); 零⭐ *líng* (nol); 两⭐ *liǎng* (dua (sebelum kata penggolong)); 半⭐ *bàn* (setengah); 三⭐ *sān* (tiga); 十⭐ *shí* (sepuluh)

#### H1-3 `keluarga` · 我的家人 · Keluarga saya

Menyebut anggota keluarga, jumlah anggota, dan pekerjaan mereka.

- **Alur situasi:** Menanyakan jumlah anggota keluarga → menyebut anggota → menyebut pekerjaan orang tua.
- **Pola dan ungkapan:** 你家有几口人？ · 我有…… · 我爸爸是……
- **Kalimat kunci contoh:**
  - 你家有几口人？ 🎤 — Keluargamu ada berapa orang?
  - 我有一个哥哥和一个妹妹。 🎤 — Aku punya satu kakak laki-laki dan satu adik perempuan.
  - 我爸爸是医生。 🎤 — Ayahku seorang dokter.
  - 我妈妈在家。 🎤 — Ibuku di rumah.
- **Kosakata kandidat (18 kata, 18 baru di HSK 1):** 爸爸⭐ *bàba* (ayah); 妈妈⭐ *māma* (ibu); 哥哥⭐ *gēge* (kakak laki-laki); 姐姐⭐ *jiějie* (kakak perempuan); 弟弟⭐ *dìdi* (adik laki-laki); 妹妹⭐ *mèimei* (adik perempuan); 儿子⭐ *érzi* (anak laki-laki); 女儿⭐ *nǚ’ér* (anak perempuan); 家⭐ *jiā* (rumah); 口⭐ *kǒu* (mulut); 人⭐ *rén* (orang); 孩子⭐ *háizi* (anak (kecil)); 有⭐ *yǒu* (ada); 没有⭐ *méiyǒu* (tidak ada); 几⭐ *jǐ* (berapa (jumlah kecil)); 医生⭐ *yīshēng* (dokter); 老师⭐ *lǎoshī* (guru); 工作⭐ *gōngzuò* (bekerja)

#### H1-4 `cuaca` · 天气 · Cuaca hari ini

Bertanya dan menjelaskan cuaca serta perasaan terhadap cuaca.

- **Alur situasi:** Menanyakan cuaca → menjawab → menyatakan suka/tidak suka cuaca tertentu.
- **Pola dan ungkapan:** 今天天气怎么样？ · 太……了 · 明天会下雨吗？
- **Kalimat kunci contoh:**
  - 今天天气怎么样？ 🎤 — Bagaimana cuaca hari ini?
  - 今天很热。 🎤 — Hari ini panas.
  - 明天会下雨吗？ 🎤 — Apakah besok akan hujan?
  - 我不喜欢下雨。 🎤 — Aku tidak suka hujan.
- **Kosakata kandidat (17 kata, 17 baru di HSK 1):** 天气⭐ *tiānqì* (cuaca); 热⭐ *rè* (panas); 冷⭐ *lěng* (dingin); 下雨⭐ *xià yǔ* (hujan turun); 雨⭐ *yǔ* (hujan); 太⭐ *tài* (terlalu); 很⭐ *hěn* (sangat); 怎么样⭐ *zěnmeyàng* (bagaimana (kabar/keadaan)); 今天⭐ *jīntiān* (hari ini); 明天⭐ *míngtiān* (besok); 昨天⭐ *zuótiān* (kemarin); 现在⭐ *xiànzài* (sekarang); 好⭐ *hǎo* (baik); 不⭐ *bù* (tidak); 天⭐ *tiān* (hari); 会⭐ *huì* (bisa (punya keahlian)); 喜欢⭐ *xǐhuan* (suka)

#### H1-5 `makan-minum` · 吃什么，喝什么 · Makanan dan minuman sehari-hari

Menyebut makanan dan minuman, menyatakan keinginan dan selera.

- **Alur situasi:** Menawarkan minum → menyebut makanan favorit → menyatakan enak/tidak.
- **Pola dan ungkapan:** 你喝茶吗？ · 我想吃…… · ……很好吃
- **Kalimat kunci contoh:**
  - 你喝茶吗？ 🎤 — Kamu mau minum teh?
  - 我要一杯牛奶。 🎤 — Aku mau segelas susu.
  - 苹果很好吃。 🎤 — Apelnya enak sekali.
  - 我想吃面包和鸡蛋。 🎤 — Aku ingin makan roti dan telur.
- **Kosakata kandidat (18 kata, 18 baru di HSK 1):** 吃⭐ *chī* (makan); 喝⭐ *hē* (minum); 米饭⭐ *mǐfàn* (nasi); 面条儿⭐ *miàntiáor* (mi); 水⭐ *shuǐ* (air); 茶⭐ *chá* (teh); 牛奶⭐ *niúnǎi* (susu sapi); 苹果⭐ *píngguǒ* (apel); 菜⭐ *cài* (sayur); 想⭐ *xiǎng* (ingin); 要⭐ *yào* (ingin); 好吃⭐ *hǎochī* (enak (dimakan)); 杯子⭐ *bēizi* (cangkir); 水果⭐ *shuǐguǒ* (buah-buahan); 鸡蛋⭐ *jīdàn* (telur ayam); 面包⭐ *miànbāo* (roti); 请⭐ *qǐng* (silakan); 给⭐ *gěi* (memberi)

#### H1-6 `sekolah` · 在学校 · Di sekolah

Menyebut hal-hal di sekolah dan kegiatan belajar bahasa Mandarin.

- **Alur situasi:** Menyebut sekolah dan guru → kegiatan belajar (membaca, menulis) → teman sekelas.
- **Pola dan ungkapan:** 我在……学习汉语 · 请读书 · 他是我的同学
- **Kalimat kunci contoh:**
  - 我在学校学习汉语。 🎤 — Aku belajar bahasa Mandarin di sekolah.
  - 老师说，请读书。 🎤 — Guru berkata, silakan baca buku.
  - 他是我的同学。 🎤 — Dia teman sekelasku.
  - 我会写这个字。 🎤 — Aku bisa menulis huruf ini.
- **Kosakata kandidat (16 kata, 16 baru di HSK 1):** 学校⭐ *xuéxiào* (sekolah); 老师⭐ *lǎoshī* (guru); 学生⭐ *xuéshēng* (pelajar); 学习⭐ *xuéxí* (belajar); 汉语⭐ *Hànyǔ* (bahasa Mandarin); 书⭐ *shū* (buku); 读⭐ *dú* (membaca (dengan suara)); 写⭐ *xiě* (menulis); 字⭐ *zì* (huruf); 说⭐ *shuō* (berkata); 听⭐ *tīng* (mendengar); 同学⭐ *tóngxué* (teman sekelas); 上课⭐ *shàngkè* (mengikuti pelajaran); 下课⭐ *xiàkè* (kelas selesai); 汉字⭐ *Hànzì* (aksara Han); 问⭐ *wèn* (bertanya)

### HSK 2

Sudah ada: belanja 买东西, tanya-arah 问路.

#### H2-1 `telepon` · 打电话 · Menelepon dan janjian

Menelepon teman, mengajak, menentukan waktu dan tempat bertemu.

- **Alur situasi:** Menelepon (喂) → mengajak menonton film → menyepakati jam dan tempat.
- **Pola dan ungkapan:** 喂，你在哪儿？ · 我们一起去……，好吗？ · 我在……等你
- **Kalimat kunci contoh:**
  - 喂，你在哪里？ 🎤 — Halo, kamu di mana?
  - 明天我们一起去看电影，好吗？ 🎤 — Besok kita nonton film bersama, bagaimana?
  - 你的电话是多少？ 🎤 — Nomor teleponmu berapa?
  - 我七点在门口等你。 🎤 — Aku menunggumu di pintu jam tujuh.
- **Kosakata kandidat (16 kata, 4 baru di HSK 2):** 喂 *wèi* (halo (di telepon), HSK 1); 手机 *shǒujī* (ponsel, HSK 1); 电话 *diànhuà* (telepon, HSK 1); 明天 *míngtiān* (besok, HSK 1); 一起⭐ *yìqǐ* (bersama-sama); 去 *qù* (pergi, HSK 1); 哪儿 *nǎr* (di mana, HSK 1); 可以 *kěyǐ* (boleh, HSK 1); 问 *wèn* (bertanya, HSK 1); 告诉⭐ *gàosu* (memberi tahu); 门口⭐ *ménkǒu* (depan pintu); 等⭐ *děng* (menunggu); 时间 *shíjiān* (waktu, HSK 1); 再 *zài* (lagi, HSK 1); 看 *kàn* (melihat, HSK 1); 号 *hào* (tanggal, HSK 1)
- **Sengaja dihindari:** 号码 (HSK 3), 见面 (HSK 3)

#### H2-2 `transportasi` · 坐车出行 · Naik transportasi umum

Memilih kendaraan, menanyakan rute dan tiket, memperkirakan waktu tempuh.

- **Alur situasi:** Memilih kendaraan → menanyakan stasiun/halte → membeli tiket → memperkirakan waktu.
- **Pola dan ungkapan:** 坐……去 · 到……要多长时间 · 买一张票
- **Kalimat kunci contoh:**
  - 我每天坐地铁上班。 🎤 — Setiap hari aku naik kereta bawah tanah ke kantor.
  - 去机场坐什么车？ 🎤 — Naik apa untuk pergi ke bandara?
  - 坐出租车很快。 🎤 — Naik taksi cepat.
  - 火车站离这里不远。 🎤 — Stasiun kereta tidak jauh dari sini.
- **Kosakata kandidat (16 kata, 9 baru di HSK 2):** 公交车⭐ *gōngjiāochē* (bus kota); 地铁⭐ *dìtiě* (kereta bawah tanah); 出租车 *chūzūchē* (taksi, HSK 1); 火车 *huǒchē* (kereta api, HSK 1); 票⭐ *piào* (tiket); 机场⭐ *jīchǎng* (bandara); 坐 *zuò* (duduk, HSK 1); 快⭐ *kuài* (cepat); 慢⭐ *màn* (lambat); 到 *dào* (tiba, HSK 1); 站⭐ *zhàn* (berdiri); 车 *chē* (kendaraan, HSK 1); 开 *kāi* (membuka, HSK 1); 车站⭐ *chēzhàn* (stasiun); 走路⭐ *zǒulù* (berjalan kaki); 分钟 *fēnzhōng* (menit, HSK 1)
- **Sengaja dihindari:** 比较 (HSK 3), 辆 (HSK 3), 张 (HSK 3), 先 (HSK 3)

#### H2-3 `olahraga` · 运动和爱好 · Olahraga dan hobi

Menyebut olahraga yang disukai, membandingkan, dan mengajak berolahraga.

- **Alur situasi:** Menanyakan hobi → menyebut kebiasaan olahraga → membandingkan kemampuan.
- **Pola dan ungkapan:** 我喜欢…… · 他比我…… · 运动对身体好
- **Kalimat kunci contoh:**
  - 我喜欢游泳。 🎤 — Aku suka berenang.
  - 你每天跑步吗？ 🎤 — Apakah kamu berlari setiap hari?
  - 他比我跑得快。 🎤 — Dia berlari lebih cepat dariku.
  - 运动对身体好。 🎤 — Olahraga baik untuk tubuh.
- **Kosakata kandidat (15 kata, 10 baru di HSK 2):** 运动⭐ *yùndòng* (olahraga); 跑步⭐ *pǎobù* (berlari (olahraga)); 游泳⭐ *yóuyǒng* (berenang); 跳舞⭐ *tiàowǔ* (menari); 喜欢 *xǐhuan* (suka, HSK 1); 比⭐ *bǐ* (dibandingkan); 觉得 *juéde* (merasa, HSK 1); 身体⭐ *shēntǐ* (tubuh); 一起⭐ *yìqǐ* (bersama-sama); 好 *hǎo* (baik, HSK 1); 快⭐ *kuài* (cepat); 慢⭐ *màn* (lambat); 球⭐ *qiú* (bola); 唱 *chàng* (menyanyi, HSK 1); 歌 *gē* (lagu, HSK 1)

#### H2-4 `sekolah-2` · 学校生活 · Kehidupan sekolah

Pelajaran, ujian, bertanya kepada guru, istirahat.

- **Alur situasi:** Masuk kelas → bertanya kepada guru → menyebut ujian → istirahat.
- **Pola dan ungkapan:** 我可以问一个问题吗？ · 这个题我不懂 · 明天有考试
- **Kalimat kunci contoh:**
  - 现在是上课时间。 🎤 — Sekarang waktunya pelajaran.
  - 这个题我不懂。 🎤 — Soal ini aku tidak mengerti.
  - 老师，我可以问一个问题吗？ 🎤 — Pak/Bu guru, boleh saya bertanya?
  - 明天有考试。 🎤 — Besok ada ujian.
- **Kosakata kandidat (13 kata, 4 baru di HSK 2):** 教室⭐ *jiàoshì* (ruang kelas); 考试⭐ *kǎoshì* (ujian); 题⭐ *tí* (soal); 上课 *shàngkè* (mengikuti pelajaran, HSK 1); 下课 *xiàkè* (kelas selesai, HSK 1); 同学 *tóngxué* (teman sekelas, HSK 1); 老师 *lǎoshī* (guru, HSK 1); 问 *wèn* (bertanya, HSK 1); 休息 *xiūxi* (beristirahat, HSK 1); 懂⭐ *dǒng* (mengerti); 问题 *wèntí* (pertanyaan, HSK 1); 时间 *shíjiān* (waktu, HSK 1); 明天 *míngtiān* (besok, HSK 1)

### HSK 3

Sudah ada: restoran 在餐厅, rumah-sakit 看病.

#### H3-1 `hotel` · 订酒店 · Memesan dan check-in hotel

Memesan kamar, menanyakan fasilitas dan harga, check-in.

- **Alur situasi:** Menelepon hotel → memesan kamar → menanyakan sarapan → check-in.
- **Pola dan ungkapan:** 请问，有空房间吗？ · 我想订…… · ……几点开始？
- **Kalimat kunci contoh:**
  - 请问，有空房间吗？ 🎤 — Permisi, ada kamar kosong?
  - 我想住两个晚上。 🎤 — Aku ingin menginap dua malam.
  - 房间在三楼。 🎤 — Kamarnya di lantai tiga.
  - 早饭几点开始？ 🎤 — Sarapan mulai jam berapa?
- **Kosakata kandidat (12 kata, 3 baru di HSK 3):** 酒店 *jiǔdiàn* (hotel, HSK 2); 宾馆⭐ *bīnguǎn* (penginapan); 房间 *fángjiān* (kamar, HSK 1); 住 *zhù* (tinggal, HSK 1); 楼 *lóu* (gedung bertingkat, HSK 2); 早饭 *zǎofàn* (sarapan, HSK 1); 欢迎⭐ *huānyíng* (menyambut); 贵 *guì* (mahal, HSK 1); 便宜 *piányi* (murah, HSK 1); 请问 *qǐngwèn* (permisi, boleh tanya, HSK 1); 晚上 *wǎnshang* (malam hari, HSK 1); 马上⭐ *mǎshàng* (segera)
- **Sengaja dihindari:** 订 (HSK 4), 空 (HSK 4), 早餐 (HSK 4), 护照 (HSK 3)

#### H3-2 `kantor` · 在办公室 · Di kantor

Pekerjaan sehari-hari, rapat singkat, meminta bantuan rekan.

- **Alur situasi:** Menyapa rekan → meminta bantuan → menyampaikan jadwal rapat → melapor ke atasan.
- **Pola dan ungkapan:** 你能帮我一下吗？ · ……在开会 · 我今天很忙
- **Kalimat kunci contoh:**
  - 经理在办公室开会。 🎤 — Manajer sedang rapat di kantor.
  - 你能帮我一下吗？ 🎤 — Bisa tolong bantu aku sebentar?
  - 我今天工作很忙。 🎤 — Hari ini pekerjaanku sangat sibuk.
  - 请给我发一个邮件。 🎤 — Tolong kirimi aku email.
- **Kosakata kandidat (14 kata, 8 baru di HSK 3):** 公司 *gōngsī* (perusahaan, HSK 1); 经理⭐ *jīnglǐ* (manajer); 同事⭐ *tóngshì* (rekan kerja); 工作 *gōngzuò* (bekerja, HSK 1); 办公室⭐ *bàngōngshì* (kantor); 开会⭐ *kāihuì* (mengadakan rapat); 忙 *máng* (sibuk, HSK 1); 邮件⭐ *yóujiàn* (surel); 帮助⭐ *bāngzhù* (membantu); 一下 *yíxià* (sebentar, HSK 1); 能 *néng* (bisa, HSK 1); 请 *qǐng* (silakan, HSK 1); 马上⭐ *mǎshàng* (segera); 需要⭐ *xūyào* (perlu)

#### H3-3 `sewa-rumah` · 租房子 · Mencari dan menyewa rumah

Menanyakan kondisi rumah, lokasi, dan harga sewa.

- **Alur situasi:** Melihat rumah → menanyakan kondisi → menanyakan lokasi dan transportasi → menawar.
- **Pola dan ungkapan:** 这个房子离……很近 · 又……又…… · 我想租……
- **Kalimat kunci contoh:**
  - 这个房子离地铁站很近。 🎤 — Rumah ini dekat dengan stasiun kereta bawah tanah.
  - 房间很大，也很干净。 🎤 — Kamarnya besar dan juga bersih.
  - 附近很安静。 🎤 — Sekitarnya sangat tenang.
  - 我想租一个便宜的房子。 🎤 — Aku ingin menyewa rumah yang murah.
- **Kosakata kandidat (16 kata, 6 baru di HSK 3):** 房子⭐ *fángzi* (rumah); 搬⭐ *bān* (memindahkan); 干净⭐ *gānjìng* (bersih); 安静⭐ *ānjìng* (tenang); 附近⭐ *fùjìn* (sekitar); 方便⭐ *fāngbiàn* (praktis); 房间 *fángjiān* (kamar, HSK 1); 楼 *lóu* (gedung bertingkat, HSK 2); 地铁 *dìtiě* (kereta bawah tanah, HSK 2); 离 *lí* (berjarak dari, HSK 2); 近 *jìn* (dekat, HSK 2); 远 *yuǎn* (jauh, HSK 2); 大 *dà* (besar, HSK 1); 小 *xiǎo* (kecil, HSK 1); 便宜 *piányi* (murah, HSK 1); 贵 *guì* (mahal, HSK 1)
- **Sengaja dihindari:** 租 (HSK 4), 厨房 (HSK 4), 客厅 (HSK 4)

#### H3-4 `belajar-mandarin` · 学汉语 · Belajar bahasa Mandarin

Cara belajar, latihan, ujian, dan kemajuan.

- **Alur situasi:** Menceritakan kebiasaan belajar → ujian → hasil → memotivasi diri.
- **Pola dan ungkapan:** 我每天练习…… · ……有点儿难 · 他学习很认真
- **Kalimat kunci contoh:**
  - 我每天练习写汉字。 🎤 — Setiap hari aku berlatih menulis hanzi.
  - 他学习很认真。 🎤 — Dia belajar dengan sungguh-sungguh.
  - 这次考试我的成绩很好。 🎤 — Dalam ujian kali ini nilaiku bagus.
  - 复习以后我就不怕了。 🎤 — Setelah mengulang aku tidak takut lagi.
- **Kosakata kandidat (15 kata, 8 baru di HSK 3):** 成绩⭐ *chéngjì* (nilai); 认真⭐ *rènzhēn* (sungguh-sungguh); 练习⭐ *liànxí* (berlatih); 作业⭐ *zuòyè* (pekerjaan rumah); 汉字 *Hànzì* (aksara Han, HSK 1); 努力⭐ *nǔlì* (berusaha keras); 复习⭐ *fùxí* (mengulang pelajaran); 考试 *kǎoshì* (ujian, HSK 2); 汉语 *Hànyǔ* (bahasa Mandarin, HSK 1); 学习 *xuéxí* (belajar, HSK 1); 难⭐ *nán* (sulit); 容易⭐ *róngyì* (mudah); 每 *měi* (setiap, HSK 2); 天 *tiān* (hari, HSK 1); 老师 *lǎoshī* (guru, HSK 1)
- **Sengaja dihindari:** 语法 (HSK 4), 进步 (HSK 5)

### HSK 4

#### H4-1 `wawancara` · 面试 · Wawancara kerja

Memperkenalkan diri, menceritakan pengalaman, bertanya soal gaji dan peluang.

- **Alur situasi:** Perkenalan diri → pengalaman kerja → alasan melamar → pertanyaan tentang gaji.
- **Pola dan ungkapan:** 我对……很感兴趣 · 在……方面有经验 · 希望有机会……
- **Kalimat kunci contoh:**
  - 请你先介绍一下自己。 🎤 — Silakan perkenalkan diri Anda dulu.
  - 我对这个工作很感兴趣。 🎤 — Aku sangat tertarik pada pekerjaan ini.
  - 我在这方面有三年的经验。 🎤 — Dalam bidang ini aku punya pengalaman tiga tahun.
  - 我希望能有机会证明自己。 🎤 — Aku berharap punya kesempatan membuktikan diri.
- **Kosakata kandidat (18 kata, 16 baru di HSK 4):** 面试⭐ *miànshì* (to be interviewed); 应聘⭐ *yìngpìn* (to accept a job offer); 经验⭐ *jīngyàn* (experience); 经历⭐ *jīnglì* (experience); 工资⭐ *gōngzī* (wages; pay); 专业⭐ *zhuānyè* (specialty); 毕业⭐ *bìyè* (graduation); 竞争⭐ *jìngzhēng* (to compete); 招聘⭐ *zhāopìn* (to invite applications for a job); 优点⭐ *yōudiǎn* (merit); 缺点⭐ *quēdiǎn* (weak point); 紧张⭐ *jǐnzhāng* (nervous); 自信⭐ *zìxìn* (to have confidence in oneself); 态度⭐ *tàidù* (manner); 加班⭐ *jiābān* (to work overtime); 部门⭐ *bùmén* (department); 机会 *jīhuì* (kesempatan, HSK 3); 感兴趣 *gǎn xìngqù* (tertarik, HSK 3)
- **Sengaja dihindari:** 简历 (HSK 5), 辞职 (HSK 5), 录取 (HSK 5)

#### H4-2 `perjalanan` · 旅行和机场 · Perjalanan dan bandara

Check-in, bagasi, paspor, jadwal penerbangan.

- **Alur situasi:** Tiba di bandara → check-in dan bagasi → pemeriksaan paspor → mendengar pengumuman.
- **Pola dan ungkapan:** 请出示…… · ……是不是超重了 · 请提前……到机场
- **Kalimat kunci contoh:**
  - 请出示您的护照。 🎤 — Silakan tunjukkan paspor Anda.
  - 我的行李超重了吗？ 🎤 — Apakah bagasiku kelebihan berat?
  - 飞机什么时候起飞？ 🎤 — Pesawat berangkat jam berapa?
  - 请您提前两个小时到机场。 🎤 — Mohon tiba di bandara dua jam lebih awal.
- **Kosakata kandidat (16 kata, 12 baru di HSK 4):** 行李 *xíngli* (bagasi, HSK 3); 护照 *hùzhào* (paspor, HSK 3); 签证⭐ *qiānzhèng* (visa); 航班⭐ *hángbān* ((scheduled) flight; (scheduled) sailing); 登机⭐ *dēngjī* (to board a plane); 降落⭐ *jiàngluò* (to descend); 提前⭐ *tíqián* (to shift to an earlier date); 办理⭐ *bànlǐ* (to handle; to transact; to conduct); 座位⭐ *zuòwèi* (seat); 取消⭐ *qǔxiāo* (to cancel); 乘客⭐ *chéngkè* (passenger); 度假⭐ *dùjià* (to go on holidays); 出发 *chūfā* (berangkat, HSK 3); 起飞 *qǐfēi* (lepas landas, HSK 3); 准时⭐ *zhǔnshí* (on time); 旅行⭐ *lǚxíng* (to travel)
- **Sengaja dihindari:** 托运 (HSK 6), 到达 (HSK 5), 耽误 (HSK 6), 延误 (HSK 7–9)

#### H4-3 `kesehatan` · 健康生活 · Hidup sehat

Kebiasaan sehat, olahraga, pola makan, stres dan tidur.

- **Alur situasi:** Mengeluh stres/kurang tidur → saran berolahraga → saran pola makan → kebiasaan baik.
- **Pola dan ungkapan:** 你应该…… · ……对健康有好处 · 养成……的习惯
- **Kalimat kunci contoh:**
  - 我最近压力很大，睡得不好。 🎤 — Akhir-akhir ini stresku besar dan tidurku kurang nyenyak.
  - 每天锻炼半个小时对健康很有好处。 — Berolahraga setengah jam sehari sangat baik untuk kesehatan.
  - 我想少吃一些，多运动。 🎤 — Aku ingin makan lebih sedikit dan lebih banyak berolahraga.
  - 你应该养成早睡早起的习惯。 🎤 — Sebaiknya kamu membiasakan tidur dan bangun lebih awal.
- **Kosakata kandidat (18 kata, 11 baru di HSK 4):** 锻炼 *duànliàn* (berolahraga, HSK 3); 健康 *jiànkāng* (sehat, HSK 3); 习惯 *xíguàn* (terbiasa, HSK 3); 压力⭐ *yālì* (pressure); 好处⭐ *hǎochù* (easy to get along with); 放松⭐ *fàngsōng* (to relax; to slacken; to loosen); 减少⭐ *jiǎnshǎo* (to lessen; to decrease; to reduce; to lower); 增加⭐ *zēngjiā* (to raise); 积极⭐ *jījí* (active); 受伤⭐ *shòushāng* (to sustain injuries); 感觉⭐ *gǎnjué* (feeling; impression; sensation); 提醒⭐ *tíxǐng* (to remind); 建议⭐ *jiànyì* (to propose; to suggest; to recommend); 改变⭐ *gǎibiàn* (to change); 坚持 *jiānchí* (bertahan, HSK 3); 应该 *yīnggāi* (seharusnya, HSK 3); 注意 *zhùyì* (memperhatikan, HSK 3); 容易 *róngyì* (mudah, HSK 3)
- **Sengaja dihindari:** 减肥 (HSK 5), 睡眠 (HSK 5), 饮食 (HSK 5), 营养 (HSK 5), 熬夜 (HSK 5)

#### H4-4 `belanja-online` · 网上购物 · Belanja online dan retur

Membandingkan harga, memeriksa kualitas, mengajukan pengembalian barang.

- **Alur situasi:** Mencari barang di situs → membandingkan harga → menerima barang → mengajukan retur.
- **Pola dan ungkapan:** 比……更…… · 对……不满意 · 现在打……折
- **Kalimat kunci contoh:**
  - 这个网站的价格比商店便宜。 🎤 — Harga di situs ini lebih murah daripada di toko.
  - 我对质量不太满意，想换一件。 🎤 — Aku kurang puas dengan kualitasnya, ingin menukar yang lain.
  - 现在打八折，很划算。 🎤 — Sekarang diskon 20%, sangat menguntungkan.
  - 请问几天能收到东西？ 🎤 — Permisi, berapa hari barangnya sampai?
- **Kosakata kandidat (20 kata, 15 baru di HSK 4):** 网站 *wǎngzhàn* (situs web, HSK 3); 价格⭐ *jiàgé* (price); 质量⭐ *zhìliàng* (quality); 打折⭐ *dǎzhé* (to give a discount); 保证⭐ *bǎozhèng* (guarantee); 付⭐ *fù* (surname Fu); 寄⭐ *jì* (to send); 地址⭐ *dìzhǐ* (address); 联系⭐ *liánxì* (variant of 联系); 商品⭐ *shāngpǐn* (commodity); 免费⭐ *miǎnfèi* (free); 实在⭐ *shízài* (really); 值得⭐ *zhídé* (to be worth); 取消⭐ *qǔxiāo* (to cancel); 支付⭐ *zhīfù* (to pay); 现金⭐ *xiànjīn* (cash); 满意 *mǎnyì* (puas, HSK 3); 比较 *bǐjiào* (relatif, HSK 3); 发现 *fāxiàn* (menemukan, HSK 3); 换 *huàn* (menukar, HSK 3)
- **Sengaja dihindari:** 退货 (bukan kata silabus), 退款 (bukan kata silabus), 优惠 (HSK 5), 包装 (HSK 5), 发票 (HSK 6)

#### H4-5 `lingkungan` · 保护环境 · Menjaga lingkungan

Polusi, sampah, hemat energi, kebiasaan ramah lingkungan.

- **Alur situasi:** Membicarakan polusi udara → memilah sampah → berhemat → memilih transportasi hijau.
- **Pola dan ungkapan:** 越来越…… · 我们应该…… · ……比……更环保
- **Kalimat kunci contoh:**
  - 空气污染越来越严重了。 🎤 — Polusi udara semakin parah.
  - 我们应该保护环境，节约用水。 🎤 — Kita harus menjaga lingkungan dan menghemat air.
  - 垃圾要分开扔。 🎤 — Sampah harus dibuang terpisah.
  - 骑自行车比开车更环保。 🎤 — Bersepeda lebih ramah lingkungan daripada menyetir.
- **Kosakata kandidat (19 kata, 19 baru di HSK 4):** 污染⭐ *wūrǎn* (to pollute; to contaminate); 垃圾⭐ *lājī* (trash); 保护⭐ *bǎohù* (to protect); 节约⭐ *jiéyuē* (to economize); 空气⭐ *kōngqì* (air); 严重⭐ *yánzhòng* (grave); 自然⭐ *zìrán* (nature); 浪费⭐ *làngfèi* (to waste); 减少⭐ *jiǎnshǎo* (to lessen; to decrease; to reduce; to lower); 塑料⭐ *sùliào* (plastics); 森林⭐ *sēnlín* (forest); 植物⭐ *zhíwù* (plant); 气候⭐ *qìhòu* ((meteorology) climate); 温度⭐ *wēndù* (temperature); 地球⭐ *dìqiú* (the earth); 危险⭐ *wēixiǎn* (danger); 环保⭐ *huánbǎo* (environmental protection); 公共⭐ *gōnggòng* (public; common; communal); 责任⭐ *zérèn* (responsibility)
- **Sengaja dihindari:** 分类 (HSK 5), 资源 (HSK 5), 能源 (HSK 6), 回收 (HSK 5)

### HSK 5

#### H5-1 `rapat` · 商务会议 · Rapat dan negosiasi

Memimpin diskusi, menyatakan setuju/tidak setuju, menegosiasikan kontrak.

- **Alur situasi:** Membuka rapat → membahas rencana → perbedaan pendapat → menyepakati kontrak.
- **Pola dan ungkapan:** 我同意……，但是…… · 需要重新…… · 安排在……
- **Kalimat kunci contoh:**
  - 我们先讨论一下这个方案。 🎤 — Mari kita bahas dulu rencana ini.
  - 我同意你的看法，但是有一点要补充。 — Aku setuju dengan pendapatmu, tetapi ada satu hal yang perlu ditambahkan.
  - 这份合同的条件需要重新谈判。 — Syarat kontrak ini perlu dinegosiasikan ulang.
  - 会议安排在下周三上午。 🎤 — Rapat dijadwalkan Rabu pagi minggu depan.
- **Kosakata kandidat (16 kata, 11 baru di HSK 5):** 讨论 *tǎolùn* (to discuss; to talk over, HSK 4); 方案⭐ *fāng’àn* (plan); 合作⭐ *hézuò* (to cooperate); 合同⭐ *hétóng* ((business) contract); 补充⭐ *bǔchōng* (to replenish); 协议⭐ *xiéyì* (agreement); 项目⭐ *xiàngmù* (item); 条件 *tiáojiàn* (condition; circumstance; term; factor, HSK 4); 安排 *ānpái* (to arrange, HSK 4); 总结 *zǒngjié* (to sum up, HSK 4); 成本⭐ *chéngběn* ((manufacturing, production etc) costs); 客户⭐ *kèhù* (client); 达成⭐ *dáchéng* (to reach); 风险⭐ *fēngxiǎn* (risk; hazard); 签字⭐ *qiānzì* (to sign); 意见 *yìjiàn* (idea, HSK 4)
- **Sengaja dihindari:** 谈判 (HSK 6), 汇报 (HSK 6), 预算 (HSK 7–9), 分歧 (HSK 7–9)

#### H5-2 `berita` · 新闻和社会 · Berita dan isu sosial

Memahami dan mendiskusikan berita serta fenomena sosial.

- **Alur situasi:** Membaca judul berita → menilai keandalan → mendiskusikan fenomena → menyampaikan sikap.
- **Pola dan ungkapan:** 引起……关注 · 不一定…… · 应该理性看待……
- **Kalimat kunci contoh:**
  - 这条新闻引起了社会的广泛关注。 — Berita ini menarik perhatian luas masyarakat.
  - 记者报道了事件的真实情况。 🎤 — Wartawan melaporkan keadaan sebenarnya dari peristiwa itu.
  - 网上的消息不一定都可靠。 🎤 — Kabar di internet belum tentu semuanya dapat dipercaya.
  - 我们应该理性看待这种现象。 🎤 — Kita harus menyikapi fenomena ini secara rasional.
- **Kosakata kandidat (17 kata, 11 baru di HSK 5):** 新闻 *xīnwén* (berita, HSK 3); 报道⭐ *bàodào* (to report); 社会 *shèhuì* (society, HSK 4); 现象⭐ *xiànxiàng* (phenomenon); 事件⭐ *shìjiàn* (event); 记者 *jìzhě* (reporter; journalist, HSK 4); 关注 *guānzhù* (memperhatikan, HSK 3); 可靠⭐ *kěkào* (reliable); 真实⭐ *zhēnshí* (true; real); 媒体⭐ *méitǐ* (media, esp. news media); 网友 *wǎngyǒu* (online friend, HSK 4); 传播⭐ *chuánbō* (to disseminate; to propagate; to spread); 事实⭐ *shìshí* (fact); 证据⭐ *zhèngjù* (evidence); 调查 *diàochá* (investigation, HSK 4); 话题⭐ *huàtí* (subject); 发布⭐ *fābù* (to release)
- **Sengaja dihindari:** 舆论 (HSK 7–9), 虚假 (HSK 7–9), 公众 (HSK 6), 评论 (HSK 6)

#### H5-3 `teknologi` · 科技和网络 · Teknologi dan kehidupan digital

Dampak teknologi, privasi, aplikasi, dan kecerdasan buatan.

- **Alur situasi:** Membicarakan aplikasi → privasi data → AI → dampak bagi pekerjaan.
- **Pola dan ungkapan:** ……正在改变…… · 要注意…… · 给……带来了……
- **Kalimat kunci contoh:**
  - 人工智能正在改变我们的生活。 — Kecerdasan buatan sedang mengubah hidup kita.
  - 使用软件时要注意保护个人信息。 — Saat memakai perangkat lunak, perhatikan perlindungan informasi pribadi.
  - 这项技术还处于研究阶段。 🎤 — Teknologi ini masih dalam tahap penelitian.
  - 网络给人们带来了很多方便。 🎤 — Internet membawa banyak kemudahan bagi orang.
- **Kosakata kandidat (17 kata, 12 baru di HSK 5):** 科技 *kējì* (science and technology, HSK 4); 网络⭐ *wǎngluò* (Internet); 软件⭐ *ruǎnjiàn* ((computer) software); 技术 *jìshù* (technology; technique; skill, HSK 4); 信息 *xìnxī* (information, HSK 4); 保护 *bǎohù* (to protect, HSK 4); 应用⭐ *yìngyòng* (to put to use); 数据⭐ *shùjù* (data); 密码 *mìmǎ* (cipher; secret code, HSK 4); 下载⭐ *xiàzài* (to download); 系统⭐ *xìtǒng* (system); 功能⭐ *gōngnéng* (function; capability); 设备⭐ *shèbèi* (equipment; facilities; installations); 智能⭐ *zhìnéng* (intelligent); 自动⭐ *zìdòng* (automatic); 更新⭐ *gēngxīn* (to replace the old with new); 用户⭐ *yònghù* (user)
- **Sengaja dihindari:** 隐私 (HSK 6), 人工智能 (HSK 6), 依赖 (HSK 6)

#### H5-4 `pendidikan` · 教育和留学 · Pendidikan dan studi di luar negeri

Mendaftar kuliah, beasiswa, bimbingan dosen, tujuan pendidikan.

- **Alur situasi:** Memutuskan kuliah di luar negeri → mendaftar dan beasiswa → bertemu dosen → refleksi tentang pendidikan.
- **Pola dan ungkapan:** 打算…… · 获得了…… · ……应该培养……
- **Kalimat kunci contoh:**
  - 我打算申请去国外留学。 🎤 — Aku berencana mendaftar kuliah di luar negeri.
  - 他获得了奖学金。 🎤 — Dia mendapat beasiswa.
  - 教授对我的论文提了很多建议。 — Dosen memberi banyak saran untuk skripsiku.
  - 教育应该培养学生的独立思考能力。 — Pendidikan seharusnya melatih kemampuan berpikir mandiri siswa.
- **Kosakata kandidat (18 kata, 7 baru di HSK 5):** 留学 *liúxué* (belajar di luar negeri, HSK 3); 教育 *jiàoyù* (to educate, HSK 4); 教授 *jiàoshòu* (professor, HSK 4); 论文⭐ *lùnwén* (paper); 申请 *shēnqǐng* (to apply for sth, HSK 4); 奖学金 *jiǎngxuéjīn* (scholarship, HSK 4); 培养⭐ *péiyǎng* (to cultivate); 能力 *nénglì* (capability, HSK 4); 获得 *huòdé* (to obtain; to receive; to get, HSK 4); 专业 *zhuānyè* (specialty, HSK 4); 独立⭐ *dúlì* (independent); 思考⭐ *sīkǎo* (to reflect on); 建议 *jiànyì* (to propose; to suggest; to recommend, HSK 4); 研究生 *yánjiūshēng* (graduate student, HSK 4); 课程 *kèchéng* (course, HSK 4); 学术⭐ *xuéshù* (learning); 未来⭐ *wèilái* (future); 资格⭐ *zīgé* (qualifications)
- **Sengaja dihindari:** 学位 (HSK 6), 导师 (HSK 6)

#### H5-5 `budaya` · 艺术和文化 · Seni dan budaya

Museum, pameran, tradisi, karya seni.

- **Alur situasi:** Mengunjungi museum → menilai karya → membahas tradisi → rencana pameran.
- **Pola dan ungkapan:** 体现了…… · ……需要传承 · 将持续到……
- **Kalimat kunci contoh:**
  - 这个博物馆展出了很多珍贵的文物。 — Museum ini memamerkan banyak peninggalan berharga.
  - 传统文化需要一代一代传承下去。 — Budaya tradisional perlu diwariskan dari generasi ke generasi.
  - 这幅作品体现了作者的艺术风格。 — Lukisan ini mencerminkan gaya seni penciptanya.
  - 展览将持续到月底。 🎤 — Pameran akan berlangsung hingga akhir bulan.
- **Kosakata kandidat (18 kata, 15 baru di HSK 5):** 艺术 *yìshù* (art, HSK 4); 博物馆⭐ *bówùguǎn* (museum); 展览⭐ *zhǎnlǎn* (to put on display); 传统⭐ *chuántǒng* (tradition); 作品 *zuòpǐn* (work, HSK 4); 风格⭐ *fēnggé* (style); 欣赏⭐ *xīnshǎng* (to appreciate; to enjoy; to admire); 珍贵⭐ *zhēnguì* (precious); 体现⭐ *tǐxiàn* (to embody); 古代⭐ *gǔdài* (ancient times); 戏剧⭐ *xìjù* (a drama; a play; theater); 书法⭐ *shūfǎ* (calligraphy); 创作⭐ *chuàngzuò* (to create); 精神⭐ *jīngshen* (vigor); 价值⭐ *jiàzhí* (value); 特色⭐ *tèsè* (characteristic); 魅力⭐ *mèilì* (charm); 参观 *cānguān* (to look around, HSK 4)
- **Sengaja dihindari:** 文物 (HSK 6), 传承 (HSK 6), 文明 (HSK 6), 遗产 (HSK 6), 雕塑 (HSK 7–9)

### HSK 6

#### H6-1 `debat` · 辩论和观点 · Debat dan menyampaikan pendapat

Menyatakan sikap, memberi argumen, membantah, menyimpulkan.

- **Alur situasi:** Menyampaikan pendirian → memberi dasar → membantah → menarik kesimpulan.
- **Pola dan ungkapan:** 对……持……态度 · 从……角度 · 综上所述
- **Kalimat kunci contoh:**
  - 我对这个观点持保留态度。 🎤 — Aku bersikap menahan diri terhadap pendapat ini.
  - 你的依据不够充分。 🎤 — Dasar pendapatmu kurang kuat.
  - 他从另一个角度提出了不同的看法。 — Dia mengemukakan pandangan lain dari sudut pandang berbeda.
  - 综上所述，我们可以得出以下结论。 — Singkatnya, kita dapat menarik kesimpulan berikut.
- **Kosakata kandidat (20 kata, 6 baru di HSK 6):** 立场⭐ *lìchǎng* (position); 结论 *jiélùn* (conclusion, HSK 5); 角度 *jiǎodù* (angle, HSK 5); 保留 *bǎoliú* (to keep, HSK 5); 充分 *chōngfèn* (ample, HSK 5); 争议⭐ *zhēngyì* (controversy); 质疑⭐ *zhìyí* (to call into question); 说服 *shuōfú* (to persuade, HSK 5); 依据 *yījù* (according to, HSK 5); 逻辑 *luójí* (logic, HSK 5); 理由 *lǐyóu* (reason, HSK 5); 倾向⭐ *qīngxiàng* (trend); 主张⭐ *zhǔzhāng* (to advocate); 强调 *qiángdiào* (to emphasize, HSK 5); 承认 *chéngrèn* (to admit, HSK 5); 否认 *fǒurèn* (to declare to be untrue, HSK 5); 客观 *kèguān* (objective, HSK 5); 片面⭐ *piànmiàn* (unilateral); 全面 *quánmiàn* (all-around, HSK 5); 反映 *fǎnyìng* (to mirror, HSK 5)
- **Sengaja dihindari:** 论证 (HSK 7–9), 反驳 (HSK 7–9), 辩论 (HSK 7–9), 偏见 (HSK 7–9), 推理 (HSK 7–9)

#### H6-2 `ekonomi` · 经济和市场 · Ekonomi dan pasar

Pertumbuhan, inflasi, konsumsi, investasi, kebijakan.

- **Alur situasi:** Membaca laporan ekonomi → membahas inflasi dan konsumsi → pasar dan investasi → kebijakan.
- **Pola dan ungkapan:** ……使……持续…… · 对……保持谨慎 · 出台……
- **Kalimat kunci contoh:**
  - 经济增长放缓影响了消费信心。 — Melambatnya pertumbuhan ekonomi memengaruhi kepercayaan konsumen.
  - 物价持续上涨，消费信心不足。 🎤 — Harga terus naik dan kepercayaan konsumen lemah.
  - 投资者对市场前景保持谨慎。 🎤 — Para investor bersikap hati-hati terhadap prospek pasar.
  - 政府出台政策刺激内需。 🎤 — Pemerintah mengeluarkan kebijakan untuk merangsang permintaan dalam negeri.
- **Kosakata kandidat (24 kata, 7 baru di HSK 6):** 经济 *jīngjì* (economy, HSK 4); 增长 *zēngzhǎng* (to grow, HSK 4); 消费 *xiāofèi* (to consume, HSK 5); 市场 *shìchǎng* (marketplace, HSK 4); 物价 *wùjià* ((commodity) prices, HSK 5); 政策⭐ *zhèngcè* (policy); 信心 *xìnxīn* (confidence, HSK 4); 刺激 *cìjī* (to provoke; to irritate; to upset; to stimulate; to excite, HSK 5); 谨慎 *jǐnshèn* (cautious, HSK 5); 前景⭐ *qiánjǐng* (foreground); 贸易⭐ *màoyì* ((commercial) trade); 出口 *chūkǒu* (an exit, HSK 4); 金融⭐ *jīnróng* (banking); 货币⭐ *huòbì* (currency); 股票⭐ *gǔpiào* (share certificate); 企业 *qǐyè* (company; firm; enterprise; corporation, HSK 5); 产业 *chǎnyè* (industry, HSK 5); 失业 *shīyè* (unemployment, HSK 5); 就业 *jiùyè* (to get a job, HSK 5); 收入 *shōurù* (to take in, HSK 4); 差距 *chājù* (disparity, HSK 5); 需求 *xūqiú* (requirement, HSK 5); 危机⭐ *wēijī* (crisis); 预测 *yùcè* (to forecast, HSK 5)
- **Sengaja dihindari:** 通货膨胀 (HSK 7–9), 衰退 (HSK 7–9), 财政 (HSK 7–9), 利率 (HSK 7–9), 宏观 (HSK 7–9), 投资 (HSK 6)

#### H6-3 `tradisi` · 传统节日 · Festival dan adat tradisional

Tahun Baru Imlek, tradisi keluarga, adat dan perayaan.

- **Alur situasi:** Menceritakan persiapan Imlek → malam tahun baru → adat angpao → perbedaan antardaerah.
- **Pola dan ungkapan:** 按照……，…… · 各地……不尽相同 · 是……最重要的……
- **Kalimat kunci contoh:**
  - 春节是中国最重要的传统节日。 — Imlek adalah festival tradisional terpenting di Tiongkok.
  - 除夕夜全家人团圆吃年夜饭。 🎤 — Pada malam tahun baru seluruh keluarga berkumpul makan malam.
  - 按照习俗，长辈要给孩子压岁钱。 — Menurut adat, orang yang lebih tua memberi anak-anak angpao.
  - 各地的庆祝方式不尽相同。 🎤 — Cara merayakannya berbeda-beda di tiap daerah.
- **Kosakata kandidat (25 kata, 11 baru di HSK 6):** 传统 *chuántǒng* (tradition, HSK 5); 习俗⭐ *xísú* (custom); 庆祝 *qìngzhù* (to celebrate, HSK 4); 团圆⭐ *tuányuán* (to have a reunion); 除夕 *chúxī* (lunar New Year's Eve, HSK 5); 压岁钱 *yāsuìqián* (money given to children as a gift on Chinese New Year's Eve, HSK 5); 节日 *jiérì* (hari raya, HSK 3); 按照 *ànzhào* (according to, HSK 4); 长辈⭐ *zhǎngbèi* (one's elders); 风俗 *fēngsú* (social custom, HSK 5); 灯笼⭐ *dēnglong* (lantern); 年夜饭 *niányèfàn* (New Year's Eve family dinner, HSK 5); 元宵⭐ *yuánxiāo* (); 月饼 *yuèbing* (mooncake, HSK 4); 粽子⭐ *zòngzi* (glutinous rice and choice of filling wrapped in leaves and steamed or boiled); 拜年⭐ *bàinián* (to pay a New Year call); 红包 *hóngbāo* (money wrapped in red as a gift, HSK 4); 象征 *xiàngzhēng* (emblem, HSK 5); 祝福⭐ *zhùfú* (blessings); 热闹 *rènao* (bustling with noise and excitement, HSK 4); 迎接 *yíngjiē* (to welcome; to greet, HSK 5); 仪式⭐ *yíshì* (ceremony); 民间⭐ *mínjiān* (among the people); 地区 *dìqū* (local, HSK 5); 差异⭐ *chāyì* (difference; discrepancy)
- **Sengaja dihindari:** 祭祀 (HSK 7–9), 鞭炮 (HSK 7–9), 吉利 (HSK 7–9)

#### H6-4 `sains` · 科学和创新 · Sains dan inovasi

Penelitian, eksperimen, penemuan, hasil dan penerapannya.

- **Alur situasi:** Menyampaikan hipotesis → eksperimen → hasil → dampak inovasi.
- **Pola dan ungkapan:** 通过……验证了…… · ……是推动……的动力 · 大大提高了……
- **Kalimat kunci contoh:**
  - 科学家通过实验验证了这一假设。 — Para ilmuwan memverifikasi hipotesis ini lewat eksperimen.
  - 创新是推动科技进步的动力。 🎤 — Inovasi adalah penggerak kemajuan teknologi.
  - 这项发明大大提高了生产效率。 — Penemuan ini sangat meningkatkan efisiensi produksi.
  - 研究成果已经发表在国际期刊上。 — Hasil penelitian sudah diterbitkan di jurnal internasional.
- **Kosakata kandidat (25 kata, 6 baru di HSK 6):** 实验 *shíyàn* (experiment, HSK 5); 创新 *chuàngxīn* (to bring forth new ideas; to blaze new trails, HSK 5); 发明 *fāmíng* (to invent, HSK 5); 研究 *yánjiū* (research, HSK 4); 假设⭐ *jiǎshè* (to suppose); 成果 *chéngguǒ* (result, HSK 5); 效率 *xiàolǜ* (efficiency, HSK 5); 验证⭐ *yànzhèng* (to inspect and verify); 推动 *tuīdòng* (to push, HSK 5); 发表 *fābiǎo* (to issue, HSK 5); 科技 *kējì* (science and technology, HSK 4); 科学 *kēxué* (science, HSK 4); 探索⭐ *tànsuǒ* (to explore; to probe); 原理⭐ *yuánlǐ* (principle); 理论 *lǐlùn* (theory, HSK 5); 数据 *shùjù* (data, HSK 5); 分析 *fēnxī* (to analyze, HSK 5); 突破⭐ *tūpò* (to break through); 领域 *lǐngyù* (domain, HSK 5); 能源⭐ *néngyuán* (energy); 医学 *yīxué* (medicine, HSK 5); 工程 *gōngchéng* (engineering, HSK 5); 专家 *zhuānjiā* (expert; specialist, HSK 5); 实践 *shíjiàn* (practice, HSK 5); 贡献 *gòngxiàn* (to contribute, HSK 5)
- **Sengaja dihindari:** 严谨 (HSK 7–9), 宇宙 (HSK 7–9)

#### H6-5 `hukum` · 法律和权益 · Hukum dan hak

Hak dan kewajiban, kontrak, tanggung jawab hukum, jalur hukum.

- **Alur situasi:** Membicarakan hak warga → kontrak dilanggar → konsultasi pengacara → putusan.
- **Pola dan ungkapan:** 依法…… · ……要承担…… · 维护……的合法权益
- **Kalimat kunci contoh:**
  - 公民依法享有各项权利，也要履行义务。 — Warga negara menikmati berbagai hak menurut hukum dan juga harus menjalankan kewajiban.
  - 违反合同要承担法律责任。 🎤 — Melanggar kontrak harus menanggung tanggung jawab hukum.
  - 他委托律师维护自己的合法权益。 — Dia menunjuk pengacara untuk menjaga hak-haknya yang sah.
  - 法院依法作出了判决。 🎤 — Pengadilan menjatuhkan putusan sesuai hukum.
- **Kosakata kandidat (25 kata, 9 baru di HSK 6):** 法律 *fǎlǜ* (law, HSK 4); 权利 *quánlì* (right, HSK 5); 义务 *yìwù* (duty, HSK 5); 违反 *wéifǎn* (to violate, HSK 5); 责任 *zérèn* (responsibility, HSK 4); 律师 *lǜshī* (lawyer, HSK 4); 法院 *fǎyuàn* (court of law, HSK 5); 合法 *héfǎ* (lawful, HSK 5); 维护⭐ *wéihù* (to defend); 法规⭐ *fǎguī* (legislation); 规定 *guīdìng* (to stipulate; to specify; to prescribe; to fix, HSK 4); 违法 *wéifǎ* (illegal, HSK 5); 处罚⭐ *chǔfá* (to penalize); 赔偿⭐ *péicháng* (to compensate); 保障⭐ *bǎozhàng* (to ensure); 尊重 *zūnzhòng* (to esteem, HSK 4); 平等⭐ *píngděng* (equal); 公平 *gōngpíng* (fair, HSK 5); 正义⭐ *zhèngyì* (justice); 制度 *zhìdù* (system, HSK 5); 执行 *zhíxíng* (to implement, HSK 5); 监督⭐ *jiāndū* (to control); 证据 *zhèngjù* (evidence, HSK 5); 纠纷⭐ *jiūfēn* (dispute); 自由 *zìyóu* (freedom; liberty, HSK 5)
- **Sengaja dihindari:** 判决 (HSK 7–9), 权益 (HSK 7–9), 依法 (HSK 7–9), 起诉 (HSK 7–9), 诉讼 (HSK 7–9), 犯罪 (HSK 7–9)
## 5. Perubahan teknis yang dibutuhkan (hasil pembacaan kode saat ini)

Skenario HSK 1–3 bisa langsung dibuat dengan mekanisme yang ada (satu berkas `content/lessons/<id>.json`, lalu `npm run build`). Untuk HSK 4–6 dan untuk 34 pelajaran sekaligus, ada hal yang perlu disiapkan **sebelum** menulis konten:

| # | Masalah | Bukti di kode | Usulan |
|---|---|---|---|
| 1 | **Kata kunci HSK 4–6 tidak punya arti Indonesia.** Pembangun menolak kata kunci yang tidak ada di `vocab_id.json` (hanya 1.000 kata HSK 1–3). | `scripts/build_lessons.py`: kata kunci hanya diterima bila `w["id"] in ent` | Izinkan bentuk `{"word": "面试", "arti": "wawancara kerja"}`: kata harus ada di silabus ≤ level (pinyin dan id diambil dari `vocab.json`), arti Indonesia ditulis di berkas pelajaran. Kata tetap bisa ditambahkan ke Hafalan. Tambah tes. |
| 2 | **Kepingan susun kalimat harus kata silabus atau satu hanzi.** Kalimat HSK 5–6 (14–25 hanzi) jadi 10–15 kepingan dan terlalu sulit. | aturan `tokens` di `build_lessons.py` | Untuk level ≥ 4 izinkan kepingan berupa **frasa** (setiap hanzi tetap dikunci per level), maksimum 8 kepingan per kalimat. Kalimat yang tak bisa dipecah rapi diberi `"order": false`. |
| 3 | **Pinyin otomatis rawan salah pada hanzi berbunyi ganda** yang jauh lebih sering di teks lanjutan (行 xíng/háng, 长, 得, 重, 还, 都, 为, 数, 乐, 调, 觉, 空, 好). | `build_id.pinyin_line` memakai pypinyin + koreksi untuk kata silabus | Tambah pemeriksa yang **menandai hanzi berbunyi ganda** di kalimat kunci dan soal, dan wajibkan `"pinyin"` manual (override) untuk kalimat yang ditandai. Tes memastikan tidak ada yang tertinggal. |
| 4 | **Daftar pelajaran akan 34 kartu dalam satu grid.** | `views/lessons.js` `list()`, `views/home.js` `lessons()`, `views/progress.js` `lessonsPanel()` | Pelajaran: kelompok per level dengan chip filter HSK 1–6 (ingat pilihan terakhir). Beranda: hanya "Lanjutkan pelajaran" + ringkasan per level (mis. "HSK 1: 3/7 selesai"). Kemajuan: tabel dikelompokkan per level, dapat dilipat. |
| 5 | **Speaking untuk kalimat panjang.** Analisis nada mengandaikan ucapan wajar dan dipotong per suku kata; di atas ±12 suku kata hasilnya kurang andal. | `app/js/tone.js` (batas ≥ 100 ms per suku kata, DP segmentasi) | Kalimat Speaking di HSK 4–6 dibatasi ≤ 12 hanzi (ditandai 🎤 di bagian 4). Tidak ada perubahan kode; hanya aturan konten dan satu tes di `build_lessons.py`. |
| 6 | **Bacaan lebih panjang di HSK 4–6.** | `question.js` mendukung `short_text_mcq`; teks 120–250 hanzi belum diuji tampilannya | Pakai tipe `passage_mcq` untuk teks > 80 hanzi (sudah ada gaya `.passage`); cek tampilan di 360 px. |
| 7 | **Ukuran data.** `lessons.json` kini ±50 KB untuk 5 pelajaran (±10 KB/pelajaran), jadi ±350 KB untuk 34. Dimuat di awal oleh `main.js`. | `app/js/main.js` `getJson("lessons.json")` | Terima untuk sekarang (GitHub Pages mengompresi gzip, ±70 KB). Bila perlu, pisah per level dan muat saat tab Pelajaran dibuka. |
| 8 | **Aturan judul.** Judul pelajaran (mis. 在餐厅) dikecualikan dari kunci hanzi. | `build_lessons.py` | Tetap; tiap judul baru dicatat di lembar review. |
| 9 | **Konten lanjutan butuh review penutur asli lebih ketat.** | — | Sheet "课文 Pelajaran" di `npm run review-sheet` sudah ada; tambah kolom level dan "register (formal/netral)" untuk HSK 5–6. |

Tidak berubah: format soal (listening, cloze, teks, susun kalimat), langkah Speaking, penilaian ucapan dan nada, penyimpanan progres (`store.data.lessons`), serta tes-tes yang ada. Tes yang mengunci daftar pelajaran (`tests/js/lesson.test.mjs` urutan pelajaran) akan diperbarui per gelombang.

## 6. Urutan kerja yang diusulkan

Setiap gelombang = satu cabang, tes hijau, satu PR, dan lembar review diperbarui. Anda bisa berhenti atau mengubah arah di antara gelombang.

| Gelombang | Isi | Catatan |
|---|---|---|
| 0. Persiapan | Perubahan teknis nomor 1–4 dan 9, tanpa konten baru | wajib sebelum HSK 4–6; nomor 4 juga mengurangi kekacauan UI sejak awal |
| 1. HSK 1 | 6 skenario baru → total 7 | prioritas Anda; mulai dari `sapaan`, `angka-waktu`, `keluarga` |
| 2. HSK 2 | 4 skenario baru → total 6 | |
| 3. HSK 3 | 4 skenario baru → total 6 | `sewa-rumah` tanpa kata 租 |
| 4. HSK 4 | 5 skenario | pertama yang memakai arti Indonesia tulisan sendiri |
| 5. HSK 5 | 5 skenario | |
| 6. HSK 6 | 5 skenario | paling berisiko soal kewajaran bahasa; tinjauan penutur asli sangat disarankan sebelum dipublikasikan |

Bila Anda ingin hasil cepat di HSK 1–3 saja: gelombang 1–3 **tidak** membutuhkan gelombang 0 (hanya UI-nya akan memanjang); gelombang 0 baru wajib sebelum gelombang 4.

## 7. Perkiraan volume

Per skenario: ±8 kalimat kunci, 10–12 kata kunci, 3 soal dengar, 3 soal baca, 5 soal susun (otomatis dari kalimat kunci), 3 kalimat Speaking. Itu ±30 butir tulisan per skenario yang perlu diperiksa (kalimat, terjemahan, soal, distraktor).

| | Sekarang | Setelah rencana |
|---|---|---|
| Jumlah pelajaran | 5 | 34 |
| Butir untuk review penutur asli (kalimat, kata, soal) | ±150 | ±1.000 |
| `lessons.json` | ±50 KB | ±350 KB |
| Soal pelajaran (3 langkah × 3/3/5) | 55 | 374 |

## 8. Risiko

- **Kewajaran bahasa HSK 5–6** adalah risiko terbesar: ungkapan tulis, kolokasi, dan register sulit dinilai tanpa penutur asli. Mitigasi: kalimat dibuat konservatif (pola yang lazim di buku teks), tiap kalimat dicek terhadap batas hanzi, dan seluruhnya masuk lembar review sebelum Anda menganggapnya final.
- **Konten sensitif.** `hukum`, `kesehatan`, `ekonomi`, dan `berita` ditulis netral: tidak menyebut undang-undang, negara, tokoh, atau angka nyata; bukan saran hukum, medis, atau keuangan (sama seperti peringatan di `rumah-sakit`). Contoh berita dan debat memakai topik netral (lingkungan, teknologi, pendidikan).
- **Terjemahan Indonesia** ditulis dengan bantuan AI dan perlu diperiksa penutur Indonesia; pinyin kalimat dibuat otomatis (lihat perubahan teknis nomor 3).
- **Level HSK 3.0 ≠ buku HSK 2.0.** Beberapa kata yang di buku lama ada di HSK 2 (mis. 订 untuk memesan) di sini baru HSK 4; pengguna yang membawa buku lama bisa melihat perbedaan.
- **Beban pemeliharaan**: 34 berkas konten. Tes yang sudah ada (batas hanzi, token, pinyin sejajar, data terbaru) menangkap sebagian besar kesalahan mekanis; kesalahan kewajaran tidak.

## 9. Yang perlu Anda putuskan

1. **Jumlah dan pembagian** (HSK 1 = 7, HSK 2 = 6, HSK 3 = 6, HSK 4–6 = 5 masing-masing). Setuju, atau ada level yang ingin diperbanyak?
2. **Tema:** adakah yang ingin diganti atau ditambah (mis. hobi/musik di HSK 1, kendaraan pribadi di HSK 2, olahraga/kebugaran di HSK 4)? Daftar di bagian 4 mudah diubah sebelum menulis.
3. **Arti Indonesia HSK 4–6:** saya tulis sendiri (ditandai belum direview), atau Anda/penutur asli menyediakan glosarium dulu?
4. **Urutan:** gelombang 1–6 seperti di atas, atau mulai dari level tertentu / jalankan HSK 1–3 dulu tanpa gelombang 0?
5. **Frasa sebagai kepingan di HSK 4–6** (perubahan teknis nomor 2): setuju, atau tetap per kata dan lebih banyak kalimat diberi `"order": false`?
6. **Review penutur asli:** apakah ada guru/penutur yang bisa memeriksa lembar review per gelombang? Ini menentukan seberapa cepat gelombang 4–6 layak dipublikasikan.

## Lampiran: daftar lengkap 34 pelajaran

| Level | Id | Judul | Status |
|---|---|---|---|
| HSK 1 | `perkenalan` | 自我介绍 · Perkenalan diri | sudah ada |
| HSK 1 | `sapaan` | 问候 · Sapaan dan sopan santun | **rencana** |
| HSK 1 | `angka-waktu` | 数字和时间 · Angka, tanggal, dan jam | **rencana** |
| HSK 1 | `keluarga` | 我的家人 · Keluarga saya | **rencana** |
| HSK 1 | `cuaca` | 天气 · Cuaca hari ini | **rencana** |
| HSK 1 | `makan-minum` | 吃什么，喝什么 · Makanan dan minuman sehari-hari | **rencana** |
| HSK 1 | `sekolah` | 在学校 · Di sekolah | **rencana** |
| HSK 2 | `belanja` | 买东西 · Belanja | sudah ada |
| HSK 2 | `tanya-arah` | 问路 · Bertanya arah | sudah ada |
| HSK 2 | `telepon` | 打电话 · Menelepon dan janjian | **rencana** |
| HSK 2 | `transportasi` | 坐车出行 · Naik transportasi umum | **rencana** |
| HSK 2 | `olahraga` | 运动和爱好 · Olahraga dan hobi | **rencana** |
| HSK 2 | `sekolah-2` | 学校生活 · Kehidupan sekolah | **rencana** |
| HSK 3 | `restoran` | 在餐厅 · Di restoran | sudah ada |
| HSK 3 | `rumah-sakit` | 看病 · Di rumah sakit | sudah ada |
| HSK 3 | `hotel` | 订酒店 · Memesan dan check-in hotel | **rencana** |
| HSK 3 | `kantor` | 在办公室 · Di kantor | **rencana** |
| HSK 3 | `sewa-rumah` | 租房子 · Mencari dan menyewa rumah | **rencana** |
| HSK 3 | `belajar-mandarin` | 学汉语 · Belajar bahasa Mandarin | **rencana** |
| HSK 4 | `wawancara` | 面试 · Wawancara kerja | **rencana** |
| HSK 4 | `perjalanan` | 旅行和机场 · Perjalanan dan bandara | **rencana** |
| HSK 4 | `kesehatan` | 健康生活 · Hidup sehat | **rencana** |
| HSK 4 | `belanja-online` | 网上购物 · Belanja online dan retur | **rencana** |
| HSK 4 | `lingkungan` | 保护环境 · Menjaga lingkungan | **rencana** |
| HSK 5 | `rapat` | 商务会议 · Rapat dan negosiasi | **rencana** |
| HSK 5 | `berita` | 新闻和社会 · Berita dan isu sosial | **rencana** |
| HSK 5 | `teknologi` | 科技和网络 · Teknologi dan kehidupan digital | **rencana** |
| HSK 5 | `pendidikan` | 教育和留学 · Pendidikan dan studi di luar negeri | **rencana** |
| HSK 5 | `budaya` | 艺术和文化 · Seni dan budaya | **rencana** |
| HSK 6 | `debat` | 辩论和观点 · Debat dan menyampaikan pendapat | **rencana** |
| HSK 6 | `ekonomi` | 经济和市场 · Ekonomi dan pasar | **rencana** |
| HSK 6 | `tradisi` | 传统节日 · Festival dan adat tradisional | **rencana** |
| HSK 6 | `sains` | 科学和创新 · Sains dan inovasi | **rencana** |
| HSK 6 | `hukum` | 法律和权益 · Hukum dan hak | **rencana** |
