// Beranda: landing view. Only describes features that exist; numbers come from the loaded data.
import { LEVEL_LABEL, meaning, posLabel } from "../deck.js";
import { buildQueue } from "../session.js";
import { examAvailable } from "../exam.js";
import { h, btn, speak } from "../ui.js";

const nf = new Intl.NumberFormat("id-ID");
const dayIndex = () => Math.floor(Date.now() / 86_400_000);

/** Words that have a hand-written Indonesian meaning, used for the hero card and the sample table. */
function sampleWords(app) {
  return app.vocab.filter((w) => w.level === 1 && app.idData[w.id]);
}

function hero(app) {
  const samples = sampleWords(app);
  const w = samples[dayIndex() % Math.max(1, samples.length)];
  const due = buildQueue(app.vocab, app.store);
  const todo = due.due.length + due.fresh.length;
  const card = w ? h("div", { class: "card hero-card" },
    h("div", { class: "eyebrow" }, "Kata hari ini · ", LEVEL_LABEL[w.level]),
    h("div", { class: "hanzi", lang: "zh-Hans" }, w.word),
    h("div", { class: "pinyin" }, w.pinyin),
    h("div", { class: "gloss" }, meaning(w, app.idData, 2)),
    h("div", { class: "meta" }, h("span", { class: "badge" }, posLabel(w.pos) || "—"), h("span", { class: "badge hand" }, LEVEL_LABEL[w.level])),
    btn("🔊 Dengar", () => speak(w.word), "btn primary", { "aria-label": `Dengar ${w.word}` })) : null;
  return h("section", { class: "home-hero" },
    h("div", {},
      h("div", { class: "eyebrow" }, "HSK 3.0 · Silabus 2025"),
      h("h2", { class: "display" }, "Hafal kosakata HSK, satu langkah demi satu."),
      h("p", { class: "lead" }, "Flashcard berjarak, latihan soal, dan simulasi ujian dalam Bahasa Indonesia. Berjalan di browser, tanpa akun."),
      h("div", { class: "row left" },
        btn("Mulai menghafal →", () => app.go("study"), "btn primary"),
        btn("Coba kuis", () => app.go("quiz"))),
      h("p", { class: "hint" }, todo ? `Hari ini ada ${todo} kartu menunggu (jatuh tempo ${due.due.length}, baru ${due.fresh.length}).` : "Tidak ada kartu yang perlu dipelajari sekarang.")),
    card);
}

const FEATURES = [
  { tab: "study", zh: "记", tone: "blush", title: "Hafalan berjarak", text: "Kartu muncul kembali tepat sebelum Anda lupa (SM-2). Ada arti Indonesia, kalimat contoh, pinyin, dan suara." },
  { tab: "practice", zh: "练", tone: "sage", title: "Latihan soal", text: "Isi kata, tulis hanzi, mendengar, soal bergambar, dan bacaan, dengan umpan balik dan penjelasan langsung." },
  { tab: "exam", zh: "考", tone: "sage wide", title: "Simulasi ujian bertimer", text: "Jumlah soal, bagian, dan waktu mengikuti tabel resmi CTI. Bagian terkunci setelah selesai, seperti ujian sungguhan." },
  { tab: "progress", zh: "进", tone: "blush wide", title: "Pantau kemajuan", text: "Tren akurasi, riwayat simulasi, dan kelemahan per keterampilan, jenis soal, dan level." },
];

function how(app) {
  return h("section", {},
    h("div", { class: "eyebrow" }, "Cara kerja"),
    h("h2", { class: "section" }, "Empat kebiasaan yang membangun kemampuan."),
    h("div", { class: "feat-grid" }, ...FEATURES.map((f) =>
      h("button", { type: "button", class: `feat ${f.tone}`, onclick: () => app.go(f.tab) },
        h("span", { class: "feat-zh", "aria-hidden": "true", lang: "zh-Hans" }, f.zh),
        h("strong", {}, f.title), h("span", {}, f.text)))));
}

const STRIPE = ["#d9501f", "#e3a898", "#c9cbc4", "#6f9f80", "#2a5846", "#d9501f"];

function path(app) {
  const wordCount = {}, qCount = {};
  for (const w of app.vocab) wordCount[w.level] = (wordCount[w.level] || 0) + 1;
  for (const q of app.questions) qCount[q.level] = (qCount[q.level] || 0) + 1;
  const cards = [1, 2, 3, 4, 5, 6].map((l) => {
    const bp = app.blueprints[String(l)];
    const tags = [`${nf.format(wordCount[l] || 0)} kata`];
    if (qCount[l]) tags.push(`${nf.format(qCount[l])} soal`);
    if (bp && examAvailable(app.questions, bp)) tags.push("simulasi ujian");
    return h("div", { class: "level", style: `--stripe:${STRIPE[l - 1]}` },
      h("div", { class: "eyebrow" }, LEVEL_LABEL[l]),
      h("strong", {}, tags[0]),
      h("span", {}, tags.slice(1).join(" · ") || "kosakata saja"));
  });
  return h("section", {},
    h("div", { class: "eyebrow" }, "Jalur belajar"),
    h("h2", { class: "section" }, "Dari kata pertama hingga membaca dengan percaya diri."),
    h("p", { class: "lead small" }, "Soal dan simulasi ujian tersedia untuk HSK 1–3; level lain saat ini berupa kosakata. Pilih level yang dipelajari di Pengaturan."),
    h("div", { class: "level-grid" }, ...cards));
}

function sample(app) {
  const rows = sampleWords(app).slice(0, 5);
  return h("section", { class: "sample" },
    h("div", {},
      h("div", { class: "eyebrow" }, "Contoh kartu"),
      h("h2", { class: "section" }, "Setiap kata, tiga lapisan."),
      h("p", { class: "lead small" }, "Hanzi, pinyin, dan arti tampil berdampingan agar mata dan telinga belajar bersamaan."),
      btn("Buka Hafalan", () => app.go("study"), "btn primary")),
    h("div", { class: "sample-list" }, ...rows.map((w, i) =>
      h("div", { class: `sample-row${i === 1 ? " hi" : ""}` },
        h("span", { class: "zh", lang: "zh-Hans" }, w.word), h("span", { class: "py" }, w.pinyin), h("span", { class: "tr" }, meaning(w, app.idData, 1))))));
}

function cta(app) {
  return h("section", { class: "cta" },
    h("div", {}, h("div", { class: "cta-zh", lang: "zh-Hans" }, "开始"), h("h2", {}, "Mulai hari ini. Kartu pertama menunggu Anda.")),
    btn("Mulai menghafal", () => app.go("study"), "btn light"));
}

export function viewHome(app) {
  app.render(h("div", { class: "home" }, hero(app), how(app), path(app), sample(app), cta(app)));
}
