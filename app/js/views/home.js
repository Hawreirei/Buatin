// Beranda: landing view. Only describes features that exist; numbers come from the loaded data.
import { LEVEL_LABEL, meaning, posLabel, FEATURE_HOURS, featuredSlot, featuredWord, msToNextSlot } from "../deck.js";
import { buildQueue } from "../session.js";
import { accuracy, streak, activeDayKeys } from "../analytics.js";
import { examAvailable } from "../exam.js";
import { STEPS, doneCount, nextLesson, levelSummary } from "../lesson.js";
import { openLesson, openLessonList } from "./lessons.js";
import { h, btn, speak } from "../ui.js";

const nf = new Intl.NumberFormat("id-ID");

/** Words that have a hand-written Indonesian meaning, used for the hero card and the sample table. */
function sampleWords(app) {
  return app.vocab.filter((w) => w.level === 1 && app.idData[w.id]);
}

/** The featured word card. While it is on screen it swaps itself when the next time slot starts. */
let featuredTimer = null;
function featuredCard(app) {
  const pool = app.vocab.filter((w) => app.idData[w.id]);       // words with a hand-written Indonesian meaning
  const w = featuredWord(pool, featuredSlot());
  if (!w) return null;
  const card = h("div", { class: "card hero-card" },
    h("div", { class: "eyebrow" }, "Kata pilihan · ", LEVEL_LABEL[w.level]),
    h("div", { class: "hanzi", lang: "zh-Hans" }, w.word),
    h("div", { class: "pinyin" }, w.pinyin),
    h("div", { class: "gloss" }, meaning(w, app.idData, 2)),
    h("div", { class: "meta" }, h("span", { class: "badge" }, posLabel(w.pos) || "—"), h("span", { class: "badge hand" }, LEVEL_LABEL[w.level])),
    btn("🔊 Dengar", () => speak(w.word), "btn primary", { "aria-label": `Dengar ${w.word}` }),
    h("div", { class: "hint", style: "margin-top:12px" }, `Berganti setiap ${FEATURE_HOURS} jam`));
  clearTimeout(featuredTimer);
  featuredTimer = setTimeout(function tick() {
    if (!card.isConnected) return;                              // user left the home page: stop
    const next = featuredCard(app);
    if (next) card.replaceWith(next);
  }, msToNextSlot() + 500);
  return card;
}

function hero(app) {
  const due = buildQueue(app.vocab, app.store);
  const todo = due.due.length + due.fresh.length;
  const card = featuredCard(app);
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

/** Numbers from the loaded data and the learner's own history. */
function strip(app) {
  const q = buildQueue(app.vocab, app.store);
  const ev = app.store.events;
  const acc = accuracy(ev);
  const exams = Object.keys(app.blueprints).filter((l) => examAvailable(app.questions, app.blueprints[l])).length;
  const tiles = [
    ["Kosakata", nf.format(app.vocab.length)], ["Soal latihan", nf.format(app.questions.length)], ["Level simulasi ujian", exams],
    ["Kartu hari ini", q.due.length + q.fresh.length], ["Hari beruntun", streak(activeDayKeys(ev, app.store.data.log), Date.now())], ["Akurasi latihan", acc.pct == null ? "—" : `${acc.pct}%`],
  ];
  return h("section", { class: "stats-strip", "aria-label": "Ringkasan" }, ...tiles.map(([k, v]) => h("div", { class: "stat" }, h("div", { class: "num" }, String(v)), h("div", {}, k))));
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

/** Themed lessons: the one to continue (or start), and progress per level. */
function lessons(app) {
  if (!app.lessons?.length) return null;
  const next = nextLesson(app.lessons, app.store);
  const card = (l) => {
    const n = doneCount(app.store.lessonProgress(l.id));
    return h("button", { type: "button", class: "lesson-card next", onclick: () => openLesson(app, l.id) },
      h("span", { class: "badge" }, LEVEL_LABEL[l.level]), h("span", { class: "lzh", lang: "zh-Hans" }, l.zh), h("strong", {}, l.title),
      h("span", { class: "hint" }, l.summary),
      h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": STEPS.length, "aria-valuenow": n, "aria-label": "Langkah selesai" }, h("i", { style: `width:${(100 * n) / STEPS.length}%` })),
      h("span", { class: "hint" }, n ? `${n}/${STEPS.length} langkah · lanjutkan` : "Belum dimulai · mulai di sini"));
  };
  return h("section", {},
    h("div", { class: "eyebrow" }, "Pelajaran bertema"),
    h("h2", { class: "section" }, "Belajar lewat situasi nyata."),
    h("p", { class: "lead small" }, `${app.lessons.length} pelajaran dari HSK 1 sampai 6. Satu tema, lima langkah: mendengar, membaca, menulis, berbicara, dan kosakata.`),
    next ? h("div", { class: "lesson-grid" }, card(next)) : h("p", { class: "ok" }, "Semua pelajaran sudah selesai ✓"),
    h("div", { class: "chips", role: "group", "aria-label": "Pelajaran per level" },
      ...levelSummary(app.lessons, app.store).map((x) => h("button", { type: "button", class: "chip-btn", onclick: () => openLessonList(app, x.level) }, `${LEVEL_LABEL[x.level]} · ${x.complete}/${x.total}`))),
    h("div", { class: "row left" }, btn("Semua pelajaran", () => openLessonList(app, "all"), "btn")));
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
  app.render(h("div", { class: "home" }, hero(app), strip(app), how(app), lessons(app), path(app), sample(app), cta(app)));
}
