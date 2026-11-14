// Pelajaran: themed lessons with a five-step flow (Listening, Reading, Writing, Speaking, Vocab).
// List -> lesson page -> one step at a time. Questions are drawn by views/question.js, same as Latihan.
import { h, btn, speak, speakSequence, stopSpeaking, listeningParts } from "../ui.js";
import { LEVEL_LABEL } from "../deck.js";
import { withTiles, check } from "../practice.js";
import { STEPS, QUESTION_STEPS, stepQuestions, isStepDone, doneCount, isComplete, nextStep, questionPosition, stepPercent, lessonWordIds } from "../lesson.js";
import { questionBody, isListening, explanation, answerLabel } from "./question.js";

const fresh = () => ({ screen: "list", id: null, step: null, items: [], i: 0, results: [], answered: null, textShown: false, pinyinShown: false, shownAt: 0, autoplayed: {}, said: new Set(), added: null });
let state = fresh();

export function viewLessons(app) {
  const lesson = app.lessons?.find((l) => l.id === state.id);
  if (!app.lessons?.length) return app.render(h("p", { class: "notice" }, "Pelajaran belum termuat."));
  if (!lesson || state.screen === "list") return list(app);
  if (state.screen === "lesson") return page(app, lesson);
  if (state.screen === "question") return question(app, lesson);
  if (state.screen === "stepdone") return stepDone(app, lesson);
  if (state.screen === "speaking") return speaking(app, lesson);
  return vocab(app, lesson);
}

const open = (app, patch) => { stopSpeaking(); state = { ...state, ...patch }; viewLessons(app); };
const backToList = (app) => open(app, { screen: "list", id: null });
const toLesson = (app, id = state.id) => open(app, { screen: "lesson", id, step: null });

/* ---------- pieces ---------- */
/** A sentence with the pinyin of each word above it. */
function ruby(s, cls = "rubyline") {
  return h("div", { class: cls, lang: "zh-Hans" }, ...s.tokens.map((t, i) => s.tokenPinyin[i]
    ? h("ruby", {}, t, h("rt", {}, s.tokenPinyin[i]))
    : h("span", { class: "punct" }, t)));
}

function progressBar(progress) {
  const n = doneCount(progress);
  return h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": STEPS.length, "aria-valuenow": n, "aria-label": "Langkah selesai" }, h("i", { style: `width:${(100 * n) / STEPS.length}%` }));
}

/** The five steps. A done step has a check, the current one an outline; every step can be opened at any time. */
function stepper(app, lesson, current) {
  const progress = app.store.lessonProgress(lesson.id);
  return h("nav", { class: "stepper", "aria-label": "Langkah pelajaran" }, ...STEPS.map((s) => {
    const done = isStepDone(progress, s.key);
    const cls = `step${done ? " done" : ""}${s.key === current ? " cur" : ""}`;
    return h("button", { type: "button", class: cls, onclick: () => startStep(app, lesson, s.key), "aria-current": s.key === current ? "step" : null, "aria-label": `${s.label}${done ? ", selesai" : ""}` },
      h("span", { class: "dot", "aria-hidden": "true" }, done ? "✓" : s.zh),
      h("span", { class: "slabel" }, h("span", { lang: "zh-Hans" }, s.zh), ` ${s.label}`),
      h("i", { class: "sbar" }));
  }));
}

function wordCard(w) {
  return h("button", { type: "button", class: "wordcard", onclick: () => speak(w.word), "aria-label": `Dengar ${w.word}, ${w.arti}` },
    h("span", { class: "spk", "aria-hidden": "true" }, "🔊"),
    h("span", {}, h("strong", { lang: "zh-Hans" }, w.word), " ", h("span", { class: "py" }, w.pinyin), h("small", {}, w.arti)));
}

/* ---------- list ---------- */
function list(app) {
  app.render(
    h("div", { class: "pagehead" }, h("div", {}, h("h2", {}, "Pelajaran"), h("p", { class: "hint" }, "Satu tema, lima langkah: mendengar, membaca, menulis, berbicara, dan kosakata."))),
    h("div", { class: "lesson-grid" }, ...app.lessons.map((l) => {
      const p = app.store.lessonProgress(l.id);
      return h("button", { type: "button", class: "lesson-card", onclick: () => toLesson(app, l.id) },
        h("span", { class: "badge" }, LEVEL_LABEL[l.level]),
        h("span", { class: "lzh", lang: "zh-Hans" }, l.zh), h("strong", {}, l.title), h("span", { class: "hint" }, l.summary),
        progressBar(p), h("span", { class: "hint" }, `${doneCount(p)}/${STEPS.length} langkah`));
    })));
}

/* ---------- lesson page ---------- */
function page(app, lesson) {
  const p = app.store.lessonProgress(lesson.id);
  const next = nextStep(p);
  const main = lesson.keySentences[0];
  app.render(
    h("div", { class: "lesson-head" },
      h("button", { type: "button", class: "back", onclick: () => backToList(app) }, "← Semua pelajaran"),
      h("div", { class: "lesson-title" }, h("h2", {}, h("span", { lang: "zh-Hans" }, lesson.zh), " ", h("small", {}, lesson.title)), h("span", { class: "badge" }, LEVEL_LABEL[lesson.level])),
      progressBar(p)),
    stepper(app, lesson, next),
    h("div", { class: "card keycard" }, ruby(main, "rubyline big"), h("p", { class: "hint" }, main.id),
      h("div", { class: "row" }, btn("🔊 Dengar", () => speak(main.zh), "btn"), btn("🐢 Pelan", () => speak(main.zh, 0.55), "btn"))),
    h("h3", {}, "Kalimat kunci"),
    h("ul", { class: "keysent" }, ...lesson.keySentences.map((s) => h("li", {}, ruby(s), h("span", { class: "hint" }, s.id), btn("🔊", () => speak(s.zh), "btn mini", { "aria-label": `Dengar ${s.zh}` })))),
    h("h3", {}, "Kata kunci"),
    h("div", { class: "wordgrid" }, ...lesson.keyWords.map(wordCard)),
    h("div", { class: "row" },
      btn(isComplete(p) ? "Ulangi dari awal" : next && doneCount(p) ? "Lanjutkan →" : "Mulai →", () => startStep(app, lesson, next ?? "listening"), "btn primary", { id: "start-lesson" }),
      doneCount(p) ? btn("Atur ulang progres", () => { if (confirm("Hapus progres pelajaran ini?")) { app.store.resetLesson(lesson.id); toLesson(app); } }, "btn") : null));
}

/* ---------- steps ---------- */
function startStep(app, lesson, step) {
  if (QUESTION_STEPS.includes(step)) {
    const all = stepQuestions(lesson, step).map((q) => withTiles(q, [], Math.random));
    return open(app, { screen: "question", id: lesson.id, step, items: all, i: 0, results: [], answered: null, textShown: false, pinyinShown: false, shownAt: Date.now(), autoplayed: {} });
  }
  open(app, { screen: step, id: lesson.id, step, said: new Set(), added: null });
}

function finish(app, lesson, q, response) {
  if (state.answered) return;
  const res = check(q, response);
  state.answered = { ...res, response };
  state.results.push({ q, correct: res.correct });
  app.store.recordAnswer(q.skill, res.correct, { k: "practice", l: q.level, ty: q.type, id: q.id, ms: Date.now() - (state.shownAt || Date.now()) });
  viewLessons(app);
}

function next(app, lesson) {
  stopSpeaking();
  if (state.i + 1 >= state.items.length) {
    const ok = state.results.filter((r) => r.correct).length;
    app.store.saveLessonStep(lesson.id, state.step, { ok, n: state.results.length });
    return open(app, { screen: "stepdone" });
  }
  open(app, { i: state.i + 1, answered: null, textShown: false, shownAt: Date.now() });
}

function question(app, lesson) {
  const q = state.items[state.i];
  const a = state.answered;
  const play = (rate) => speakSequence(listeningParts(q), rate);
  const m = {
    kind: "practice", response: a?.response, reveal: !!a, writeMode: "choice",
    onAnswer: (r) => finish(app, lesson, q, r),
    listening: { play, playsLeft: null, textShown: state.textShown || !!a, toggleText: () => { state.textShown = !state.textShown; viewLessons(app); } },
    pinyin: { shown: state.pinyinShown, toggle: () => { state.pinyinShown = !state.pinyinShown; viewLessons(app); } },
  };
  if (isListening(q) && !a && !state.autoplayed[q.id]) { state.autoplayed[q.id] = true; setTimeout(() => play(0.8), 150); }
  const pos = questionPosition(lesson, state.step, state.i);
  const last = state.i + 1 >= state.items.length;
  app.render(
    stepper(app, lesson, state.step),
    h("div", { class: "qhead" }, h("strong", {}, `${lesson.zh} · ${STEPS.find((s) => s.key === state.step).label}`), h("span", { class: "hint" }, `Soal ${pos.n} / ${pos.total}`)),
    ...questionBody(q, m),
    a ? h("p", { class: a.correct ? "ok" : "bad", role: "status" }, a.correct ? "✔ Benar" : `✘ Jawaban yang benar: ${answerLabel(q)}`) : null,
    a ? explanation(q) : null,
    a ? h("div", { class: "row" }, btn(last ? "Selesaikan langkah" : "Soal berikutnya", () => next(app, lesson), "btn primary", { id: "next" })) : null);
}

function stepDone(app, lesson) {
  const p = app.store.lessonProgress(lesson.id);
  const pct = stepPercent(p, state.step);
  const wrong = state.results.filter((r) => !r.correct);
  const nxt = nextStep(p);
  app.render(
    stepper(app, lesson, nxt),
    h("div", { class: "card" }, h("div", { class: "eyebrow" }, `${STEPS.find((s) => s.key === state.step).label} selesai`), h("div", { class: "hanzi" }, `${state.results.length - wrong.length}/${state.results.length}`), h("div", { class: "gloss" }, `${pct}%`)),
    wrong.length ? h("h3", {}, "Perlu diulang") : h("p", {}, "Semua benar. 太好了！"),
    ...wrong.map((r) => h("div", { class: "example" }, explanation(r.q), h("div", { class: "hint" }, `Jawaban yang benar: ${answerLabel(r.q)}`))),
    h("div", { class: "row" },
      nxt ? btn("Langkah berikutnya →", () => startStep(app, lesson, nxt), "btn primary", { id: "next-step" }) : btn("Lihat ringkasan", () => toLesson(app), "btn primary", { id: "summary" }),
      btn("Ulangi langkah ini", () => startStep(app, lesson, state.step), "btn")));
}

/* ---------- speaking (listen and repeat; scoring arrives in a later stage) ---------- */
function speaking(app, lesson) {
  const all = state.said.size >= lesson.speaking.length;
  const done = isStepDone(app.store.lessonProgress(lesson.id), "speaking");
  app.render(
    stepper(app, lesson, "speaking"),
    h("div", { class: "qhead" }, h("strong", {}, `${lesson.zh} · Speaking`), h("span", { class: "hint" }, `${state.said.size} / ${lesson.speaking.length}`)),
    h("p", { class: "hint" }, "Dengarkan, lalu ucapkan keras-keras. Penilaian pengucapan dan nada belum tersedia; tandai sendiri bila sudah."),
    ...lesson.speaking.map((s) => h("div", { class: `card speakcard${state.said.has(s.zh) ? " said" : ""}` },
      ruby(s, "rubyline big"), h("p", { class: "hint" }, s.id),
      h("div", { class: "row" }, btn("🔊 Dengar", () => speak(s.zh), "btn"), btn("🐢 Pelan", () => speak(s.zh, 0.55), "btn"),
        btn(state.said.has(s.zh) ? "✓ Sudah diucapkan" : "Sudah saya ucapkan", () => { state.said.has(s.zh) ? state.said.delete(s.zh) : state.said.add(s.zh); viewLessons(app); }, "btn primary", { "aria-pressed": String(state.said.has(s.zh)) })))),
    h("div", { class: "row" }, btn(done ? "Lanjut ke kosakata →" : "Selesaikan langkah →", () => { app.store.saveLessonStep(lesson.id, "speaking"); startStep(app, lesson, "vocab"); }, "btn primary", { disabled: !all && !done, id: "finish-speaking" })));
}

/* ---------- vocab ---------- */
function vocab(app, lesson) {
  const ids = lessonWordIds(lesson);
  const pending = ids.filter((id) => !app.store.card(id) && !app.store.pinned.includes(id));
  const done = isStepDone(app.store.lessonProgress(lesson.id), "vocab");
  const finishStep = () => { app.store.saveLessonStep(lesson.id, "vocab"); toLesson(app); };
  const primary = done || state.added != null || !pending.length
    ? btn(done || state.added != null ? "Kembali ke pelajaran" : "Selesai", done || state.added != null ? () => toLesson(app) : finishStep, "btn primary", { id: "finish-vocab" })
    : btn(`Tambah ${pending.length} kata ke Hafalan`, () => { state.added = app.store.pin(pending); app.store.saveLessonStep(lesson.id, "vocab"); viewLessons(app); }, "btn primary", { id: "add-vocab" });
  app.render(
    stepper(app, lesson, "vocab"),
    h("div", { class: "qhead" }, h("strong", {}, `${lesson.zh} · Vocab`), h("span", { class: "hint" }, `${lesson.keyWords.length} kata`)),
    h("p", { class: "hint" }, "Ketuk kata untuk mendengarnya. Kata yang ditambahkan muncul lebih dulu di Hafalan."),
    h("div", { class: "wordgrid" }, ...lesson.keyWords.map(wordCard)),
    state.added != null ? h("p", { class: "ok", role: "status" }, `${state.added} kata ditambahkan ke Hafalan.`) : null,
    lesson.keyWords.some((k) => k.wid == null) ? h("p", { class: "hint" }, "Kata di luar silabus (mis. 服务员) hanya untuk dikenal di pelajaran ini dan tidak masuk Hafalan.") : null,
    h("div", { class: "row" }, primary, !done && state.added == null && pending.length ? btn("Selesai tanpa menambah", finishStep, "btn") : null));
}
