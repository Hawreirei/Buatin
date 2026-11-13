import { h, btn, speakSequence, stopSpeaking, listeningParts } from "../ui.js";
import { wordIdOfQuestion } from "../analytics.js";
import { LEVEL_LABEL } from "../deck.js";
import { SKILLS, availableLevels, buildSet, check, summarize } from "../practice.js";
import { questionBody, isListening, explanation, answerLabel } from "./question.js";

const fresh = () => ({ phase: "setup", cfg: { skill: "mixed", count: 10 }, set: [], i: 0, results: [], answered: null, textShown: false, pinyinShown: false, shownAt: 0, autoplayed: {} });
let state = fresh();

export function viewPractice(app) {
  if (!app.questions.length) return app.render(h("p", { class: "notice" }, "Bank soal belum termuat."));
  if (state.phase === "setup") return setup(app);
  if (state.phase === "done") return done(app);
  return question(app);
}

function begin(app, set) {
  state = { ...state, phase: "run", set, i: 0, results: [], answered: null, textShown: false, pinyinShown: false, shownAt: Date.now(), autoplayed: {} };
  viewPractice(app);
}
/** Start a run with a ready-made set (the weakness analysis). */
export const startPracticeWith = (app, set) => begin(app, set);
/** Open the setup screen with a skill preselected (the weakness recommendations). */
export function presetPractice(app, skill) {
  state = { ...fresh(), cfg: { ...state.cfg, skill } };
  viewPractice(app);
}

function setup(app) {
  const { render, store, questions } = app;
  const have = availableLevels(questions);
  const levels = store.settings.levels.filter((l) => have.includes(l));
  const skillOpt = (v, label) => h("label", {}, h("input", { type: "radio", name: "skill", value: v, checked: state.cfg.skill === v, onchange: () => (state.cfg.skill = v) }), " ", label);
  const count = h("select", { "aria-label": "Jumlah soal", onchange: (e) => (state.cfg.count = Number(e.target.value)) },
    ...[5, 10, 20].map((n) => h("option", { value: n, selected: state.cfg.count === n }, `${n} soal`)));
  const msg = levels.length
    ? h("p", { class: "hint" }, `Level: ${levels.map((l) => LEVEL_LABEL[l]).join(", ")} (ubah di Pengaturan). Soal tersedia untuk ${have.map((l) => LEVEL_LABEL[l]).join(", ")}.`)
    : h("p", { class: "notice" }, `Soal latihan baru tersedia untuk ${have.map((l) => LEVEL_LABEL[l]).join(", ")}. Aktifkan salah satunya di Pengaturan.`);
  const start = btn("Mulai", () => {
    const skills = state.cfg.skill === "mixed" ? Object.keys(SKILLS) : [state.cfg.skill];
    const set = buildSet(questions, { skills, levels, count: state.cfg.count });
    if (set.length) begin(app, set);
  }, "btn primary", { disabled: !levels.length, id: "start" });
  render(
    h("h2", {}, "Latihan Soal"),
    h("p", { class: "hint" }, "Format soal mengikuti struktur ujian HSK 3.0 resmi (dokumen CTI). Soal dibuat dari kalimat contoh dan bank soal buatan sendiri."),
    h("p", { class: "notice" }, "Belum direview guru. Jika menemukan soal yang janggal atau jawaban yang ambigu, catat nomornya (mis. c12) untuk dikoreksi."),
    h("div", { class: "row", style: "justify-content:flex-start" }, skillOpt("mixed", "Campuran"), skillOpt("reading", "Membaca"), skillOpt("writing", "Menulis"), skillOpt("listening", "Mendengar")),
    h("div", { class: "row", style: "justify-content:flex-start" }, count),
    msg, h("div", { class: "row", style: "justify-content:flex-start" }, start));
}

function finish(app, q, response) {
  if (state.answered) return;
  const res = check(q, response);
  state.answered = { ...res, response };
  state.results.push({ q, correct: res.correct, response });
  app.store.recordAnswer(q.skill, res.correct, { k: "practice", l: q.level, ty: q.type, id: q.id, w: wordIdOfQuestion(q), ms: Date.now() - (state.shownAt || Date.now()) });
  viewPractice(app);
}

function next(app) {
  stopSpeaking();
  if (state.i + 1 >= state.set.length) state.phase = "done";
  else { state.i += 1; state.answered = null; state.textShown = false; state.shownAt = Date.now(); }
  viewPractice(app);
}

function question(app) {
  const q = state.set[state.i];
  const a = state.answered;
  const play = (rate) => speakSequence(listeningParts(q), rate);
  const m = {
    kind: "practice", response: a?.response, reveal: !!a,
    onAnswer: (r) => finish(app, q, r),
    listening: { play, playsLeft: null, textShown: state.textShown || !!a, toggleText: () => { state.textShown = !state.textShown; viewPractice(app); } },
    pinyin: { shown: state.pinyinShown, toggle: () => { state.pinyinShown = !state.pinyinShown; viewPractice(app); } },
  };
  if (isListening(q) && !a && !state.autoplayed[q.id]) { state.autoplayed[q.id] = true; setTimeout(() => play(0.8), 150); }
  const last = state.i + 1 >= state.set.length;
  app.render(...[
    h("p", { class: "hint" }, `Soal ${state.i + 1}/${state.set.length} · ${SKILLS[q.skill]} · ${LEVEL_LABEL[q.level]} · #${q.id}`),
    ...questionBody(q, m),
    a ? h("p", { class: a.correct ? "ok" : "bad", role: "status" }, a.correct ? "✔ Benar" : `✘ Jawaban yang benar: ${answerLabel(q)}`) : null,
    a ? explanation(q) : null,
    a ? h("div", { class: "row" }, btn(last ? "Lihat hasil" : "Soal berikutnya", () => next(app), "btn primary", { id: "next" })) : null,
  ].filter(Boolean));
}

function done(app) {
  const s = summarize(state.results);
  const wrong = state.results.filter((r) => !r.correct);
  app.render(
    h("h2", {}, "Hasil latihan"),
    h("div", { class: "card" }, h("div", { class: "hanzi" }, `${s.correct}/${s.total}`), h("div", { class: "gloss" }, `${s.pct}%`)),
    h("table", {}, h("thead", {}, h("tr", {}, ...["Keterampilan", "Benar", "Total"].map((t) => h("th", {}, t)))),
      h("tbody", {}, ...Object.entries(s.by).map(([k, v]) => h("tr", {}, h("td", {}, SKILLS[k]), h("td", {}, v.correct), h("td", {}, v.total))))),
    wrong.length ? h("h2", {}, "Perlu diulang") : h("p", {}, "Semua benar. 太好了！"),
    ...wrong.map((r) => h("div", { class: "example" }, h("div", { class: "hint" }, `#${r.q.id} · ${SKILLS[r.q.skill]}`), explanation(r.q), h("div", { class: "hint" }, `Jawaban yang benar: ${answerLabel(r.q)}`))),
    h("div", { class: "row" }, btn("Latihan lagi", () => { state = { ...fresh(), cfg: state.cfg }; viewPractice(app); }, "btn primary", { id: "again" })));
}
