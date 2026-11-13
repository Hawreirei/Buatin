import { RATING, previewIntervals } from "./srs.js";
import { LEVEL_LABEL, glossText, meaning, posLabel, distractors, shuffle } from "./deck.js";
import { Store, todayKey } from "./store.js";
import { buildQueue, nextItem, answer, stats } from "./session.js";
import { h, btn, speak } from "./ui.js";
import { viewPractice, startPracticeWith, presetPractice } from "./practice-ui.js";
import { viewExam, examRunning, abortExam } from "./exam-ui.js";
import { progressNodes } from "./progress-ui.js";

const view = document.getElementById("view");
const store = new Store();
let vocab = [];
let handwriting = new Set();
let blueprints = {};
let questions = [];         // practice questions (data/hsk3/questions.json)
let idData = {};            // id -> {arti, contoh:{zh,pinyin,id}} (Indonesian, hand-written; HSK 1-2 so far)
let tab = "study";
let studyState = { revealed: false };
let quizState = null;

const render = (...nodes) => view.replaceChildren(...nodes);

/* ---------- shared card pieces ---------- */
function levelBadges(w) {
  return h("span", {},
    h("span", { class: "badge" }, LEVEL_LABEL[w.level]),
    ...w.also_levels.map((l) => h("span", { class: "badge", title: "Muncul lagi dengan arti lain" }, `+${LEVEL_LABEL[l]}`)),
    [...w.word].every((c) => handwriting.has(c)) ? h("span", { class: "badge hand", title: "Semua hanzi masuk daftar hanzi tulis" }, "✍ tulis") : null);
}
function answerBlock(w) {
  const d = idData[w.id];
  const en = glossText(w, 5);
  const main = d ? d.arti : (en ?? h("span", { class: "muted" }, "(arti belum tersedia di data)"));
  return h("div", {},
    h("div", { class: "pinyin" }, w.pinyin),
    h("div", { class: "gloss" }, main),
    d ? null : (en ? h("div", { class: "hint" }, "Arti Inggris (CC-CEDICT); terjemahan Indonesia untuk level ini belum tersedia.") : null),
    h("div", { class: "meta" }, posLabel(w.pos) || "—", " · ", levelBadges(w)),
    d ? h("div", { class: "example" },
      h("div", { class: "zh", lang: "zh-Hans" }, d.contoh.zh, " ", btn("🔊", () => speak(d.contoh.zh), "btn", { "aria-label": "Dengar kalimat contoh" })),
      h("div", { class: "py" }, d.contoh.pinyin),
      h("div", { class: "tr" }, d.contoh.id)) : null);
}

/* ---------- Study ---------- */
function viewStudy() {
  const queue = buildQueue(vocab, store);
  const item = nextItem(queue);
  const head = h("p", { class: "hint" },
    `Level: ${store.settings.levels.map((l) => LEVEL_LABEL[l]).join(", ")} · Jatuh tempo: ${queue.due.length} · Kata baru hari ini: ${queue.fresh.length}`);
  if (!item) {
    const done = h("div", { class: "card" }, h("p", { class: "hanzi" }, "完"),
      h("p", {}, "Tidak ada kartu yang perlu dipelajari sekarang."),
      h("p", { class: "hint" }, "Naikkan batas kata baru per hari atau tambah level di Pengaturan."));
    return render(head, done);
  }
  const { w, c } = item;
  const card = h("div", { class: "card", "data-testid": "card" },
    h("div", { class: "hanzi", lang: "zh-Hans" }, w.word),
    btn("🔊 Dengar", () => speak(w.word), "btn", { "aria-label": `Dengar ${w.word}` }),
    studyState.revealed ? answerBlock(w) : null);
  const controls = studyState.revealed
    ? h("div", { class: "row rate" }, ...["Lagi", "Sulit", "Bagus", "Mudah"].map((label, r) =>
        btn([label, h("small", {}, previewIntervals(c)[r])], () => rate(item, r), "btn", { "data-rating": r })))
    : h("div", { class: "row" }, btn("Tampilkan jawaban (Spasi)", reveal, "btn primary", { id: "reveal" }));
  const kind = c.state === "new" ? "Baru" : c.state === "learning" ? "Belajar" : "Ulasan";
  render(head, h("p", { class: "hint" }, `Kartu: ${kind}`), card, controls);
}
function reveal() {
  studyState.revealed = true;
  const item = nextItem(buildQueue(vocab, store));
  if (item && store.settings.speak) speak(item.w.word);
  viewStudy();
}
function rate(item, r) {
  answer(store, item, r);
  studyState.revealed = false;
  viewStudy();
}

/* ---------- Quiz ---------- */
function newQuestion() {
  const pool = vocab.filter((w) => store.settings.levels.includes(w.level) && meaning(w, idData));
  const target = pool[Math.floor(Math.random() * pool.length)];
  const options = shuffle([target, ...distractors(pool, target, 3, Math.random, (w) => meaning(w, idData))]);
  return { target, options, picked: null };
}
function viewQuiz() {
  quizState ||= { q: newQuestion(), correct: 0, total: 0 };
  const { q } = quizState;
  const opts = h("div", { class: "opts" }, ...q.options.map((o) => {
    const cls = q.picked == null ? "btn" : o.id === q.target.id ? "btn right" : o.id === q.picked ? "btn wrong" : "btn";
    return btn(meaning(o, idData), () => pick(o), cls, { disabled: q.picked != null });
  }));
  render(
    h("p", { class: "hint" }, `Skor: ${quizState.correct}/${quizState.total} · Pilih arti yang benar (level terpilih di Pengaturan)`),
    h("div", { class: "card" }, h("div", { class: "hanzi", lang: "zh-Hans" }, q.target.word),
      q.picked != null ? h("div", { class: "pinyin" }, q.target.pinyin) : null,
      btn("🔊 Dengar", () => speak(q.target.word))),
    opts,
    q.picked != null ? h("div", { class: "row" }, btn("Soal berikutnya", () => { quizState.q = newQuestion(); viewQuiz(); }, "btn primary", { id: "next" })) : null);
}
function pick(o) {
  const q = quizState.q;
  if (q.picked != null) return;
  q.picked = o.id;
  quizState.total++;
  if (o.id === q.target.id) quizState.correct++;
  viewQuiz();
}

/* ---------- Browse ---------- */
function viewBrowse() {
  const levels = store.settings.levels;
  const search = h("input", { type: "search", placeholder: "Cari hanzi / pinyin / arti", "aria-label": "Cari", style: "width:100%;padding:8px;margin:8px 0" });
  const tbody = h("tbody");
  const fill = () => {
    const q = search.value.trim().toLowerCase();
    const rows = vocab.filter((w) => levels.includes(w.level) && (!q || w.word.includes(q) || w.pinyin.toLowerCase().includes(q) || (meaning(w, idData, 6) || "").toLowerCase().includes(q) || (glossText(w, 6) || "").toLowerCase().includes(q))).slice(0, 200);
    tbody.replaceChildren(...rows.map((w) => {
      const c = store.card(w.id);
      return h("tr", {}, h("td", { class: "zh" }, w.word), h("td", {}, w.pinyin), h("td", {}, meaning(w, idData, 3) ?? "—"), h("td", { class: "muted" }, c ? c.state : "baru"));
    }));
  };
  search.addEventListener("input", fill); fill();
  render(search, h("p", { class: "hint" }, "Maksimal 200 baris ditampilkan."),
    h("table", {}, h("thead", {}, h("tr", {}, ...["Kata", "Pinyin", "Arti", "Status"].map((t) => h("th", {}, t)))), tbody));
}

/* ---------- Stats ---------- */
function statsNodes() {
  const st = stats(vocab, store);
  const rows = Object.keys(LEVEL_LABEL).map(Number).map((l) => {
    const s = st[l] || { total: 0, seen: 0, learning: 0, review: 0, mature: 0, due: 0 };
    const pct = s.total ? Math.round((s.review / s.total) * 100) : 0;
    return h("tr", {}, h("td", {}, LEVEL_LABEL[l]), h("td", {}, `${s.seen}/${s.total}`), h("td", {}, s.learning), h("td", {}, s.review), h("td", {}, s.mature), h("td", {}, s.due),
      h("td", { style: "min-width:90px" }, h("div", { class: "bar", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 }, h("i", { style: `width:${pct}%` }))));
  });
  const today = store.data.log[todayKey()] || 0;
  return [h("h2", {}, "Hafalan per level"),
    h("table", {}, h("thead", {}, h("tr", {}, ...["Level", "Dilihat", "Belajar", "Ulasan", "Matang (≥21 hr)", "Jatuh tempo", ""].map((t) => h("th", {}, t)))), h("tbody", {}, rows)),
    h("p", { class: "hint" }, `Ulasan hari ini: ${today}. Kolom bar = persentase kata yang sudah lulus tahap belajar.`),
    h("h2", {}, "Latihan soal"),
    h("table", {}, h("thead", {}, h("tr", {}, ...["Keterampilan", "Dijawab", "Benar", "%"].map((t) => h("th", {}, t)))),
      h("tbody", {}, ...Object.entries({ reading: "Membaca", writing: "Menulis", listening: "Mendengar" }).map(([k, label]) => {
        const p = store.data.practice?.[k] || { n: 0, ok: 0 };
        return h("tr", {}, h("td", {}, label), h("td", {}, p.n), h("td", {}, p.ok), h("td", {}, p.n ? Math.round((100 * p.ok) / p.n) : "—"));
      })))];
}

/* ---------- Settings ---------- */
function viewSettings() {
  const s = store.settings;
  const levelBoxes = Object.keys(LEVEL_LABEL).map(Number).map((l) =>
    h("label", {}, h("input", { type: "checkbox", checked: s.levels.includes(l), onchange: (e) => {
      const set = new Set(store.settings.levels);
      e.target.checked ? set.add(l) : set.delete(l);
      if (set.size === 0) { e.target.checked = true; return; }
      store.setSettings({ levels: [...set].sort() }); quizState = null;
    } }), " ", LEVEL_LABEL[l]));
  const newPer = h("input", { type: "number", min: 1, max: 200, value: s.newPerDay, "aria-label": "Kata baru per hari", onchange: (e) => {
    const v = Math.min(200, Math.max(1, parseInt(e.target.value, 10) || 10)); e.target.value = v; store.setSettings({ newPerDay: v });
  } });
  const speakBox = h("input", { type: "checkbox", checked: s.speak, onchange: (e) => store.setSettings({ speak: e.target.checked }) });
  const fileIn = h("input", { type: "file", accept: "application/json", onchange: async (e) => {
    try { store.import(await e.target.files[0].text()); alert("Progres berhasil diimpor."); viewSettings(); } catch (err) { alert(err.message); }
  } });
  render(h("h2", {}, "Level yang dipelajari"), h("div", {}, ...levelBoxes),
    h("h2", {}, "Kata baru per hari"), newPer,
    h("h2", {}, "Suara"), h("label", {}, speakBox, " Ucapkan kata saat jawaban ditampilkan"),
    h("p", { class: "hint" }, "Memakai suara bawaan perangkat (zh-CN). Jika tidak ada suara Mandarin terpasang, tombol suara tidak akan berbunyi."),
    h("h2", {}, "Data"),
    h("div", { class: "row", style: "justify-content:flex-start" },
      btn("Ekspor progres", () => {
        const a = h("a", { href: URL.createObjectURL(new Blob([store.export()], { type: "application/json" })), download: "buatin-progres.json" });
        a.click();
      }), fileIn,
      btn("Reset progres", () => { if (confirm("Hapus semua progres hafalan?")) { store.reset(); viewSettings(); } })),
    h("p", { class: "notice" }, "Terjemahan Indonesia dan kalimat contoh untuk HSK 1–2 ditulis tangan oleh asisten AI dan belum direview penutur asli; pinyin kalimat dibuat otomatis. Level lain memakai arti Inggris dari CC-CEDICT (CC BY-SA 4.0), ±8% kata belum punya arti."));
}

/* ---------- Router + keyboard ---------- */
const pctx = () => ({ render, store, questions, blueprints });
function viewProgress() {
  const ctx = { store, vocab, idData, questions, rerender: viewProgress,
    startWeak: (set) => { if (set.length) { go("practice"); startPracticeWith(pctx(), set); } },
    startSkill: (skill) => { go("practice"); presetPractice(pctx(), skill); } };
  render(...progressNodes(ctx), ...statsNodes());
}
const views = { study: viewStudy, practice: () => viewPractice(pctx()), exam: () => viewExam(pctx()), quiz: viewQuiz, browse: viewBrowse, progress: viewProgress, settings: viewSettings };
function go(t) {
  if (examRunning() && t !== "exam") {
    if (!confirm("Ujian sedang berlangsung. Keluar sekarang akan membatalkan ujian (tidak disimpan). Keluar?")) return;
    abortExam();
  }
  tab = t;
  for (const b of document.querySelectorAll("#tabs button")) b.setAttribute("aria-selected", String(b.dataset.tab === t));
  if (t === "study") studyState.revealed = false;
  views[t]();
}
document.getElementById("tabs").addEventListener("click", (e) => { const t = e.target.closest("button")?.dataset.tab; if (t) go(t); });
document.addEventListener("keydown", (e) => {
  if (tab !== "study" || e.target.matches("input,select,textarea")) return;
  if (!studyState.revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); if (nextItem(buildQueue(vocab, store))) reveal(); }
  else if (studyState.revealed && ["1", "2", "3", "4"].includes(e.key)) {
    const item = nextItem(buildQueue(vocab, store)); if (item) rate(item, Number(e.key) - 1);
  }
});

async function boot() {
  try {
    const [v, hw, idd, qs, bps] = await Promise.all([
      fetch("../data/hsk3/vocab.json").then((r) => { if (!r.ok) throw new Error(`vocab.json ${r.status}`); return r.json(); }),
      fetch("../data/hsk3/handwriting.json").then((r) => r.json()),
      fetch("../data/hsk3/vocab_id.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch("../data/hsk3/questions.json").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("../data/hsk3/blueprints.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]);
    questions = qs;
    blueprints = bps;
    idData = idd;
    vocab = v; handwriting = new Set(hw.map((x) => x.char));
    go("study");
  } catch (err) {
    render(h("p", { class: "notice" }, `Gagal memuat data: ${err.message}. Jalankan server dari akar repo: python3 -m http.server 8080, lalu buka /app/.`));
  }
}
boot();
