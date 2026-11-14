// Pelajaran: themed lessons with a five-step flow (Listening, Reading, Writing, Speaking, Vocab).
// List -> lesson page -> one step at a time. Questions are drawn by views/question.js, same as Latihan.
import { h, btn, speak, speakSequence, stopSpeaking, listeningParts } from "../ui.js";
import { LEVEL_LABEL } from "../deck.js";
import { withTiles, check } from "../practice.js";
import { STEPS, QUESTION_STEPS, stepQuestions, isStepDone, doneCount, isComplete, nextStep, questionPosition, stepPercent, lessonWordIds } from "../lesson.js";
import { recognitionSupported, recorderSupported, startAttempt, scoreAttempt, errorMessage, cleanZh, PASS_PCT } from "../speech.js";
import { questionBody, isListening, explanation, answerLabel } from "./question.js";

const fresh = () => ({ screen: "list", id: null, step: null, items: [], i: 0, results: [], answered: null, textShown: false, pinyinShown: false, shownAt: 0, autoplayed: {}, attempts: new Map(), live: null, added: null });
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

let playing = null;
const releaseAudio = () => { playing?.pause(); playing = null; for (const a of state.attempts.values()) if (a.audioUrl) URL.revokeObjectURL(a.audioUrl); state.attempts = new Map(); };
const open = (app, patch) => {
  stopSpeaking();
  if (state.screen === "speaking" && (patch.screen !== "speaking" || patch.attempts)) { state.live?.ctl.stop(); state.live = null; releaseAudio(); }   // leaving: free the microphone and the recordings
  state = { ...state, ...patch };
  viewLessons(app);
};
/** Open one lesson from elsewhere (home, progress). */
export function openLesson(app, id) {
  state.live?.ctl.stop();
  releaseAudio();
  state = { ...fresh(), screen: "lesson", id };
  app.go("lessons");
}
const backToList = (app) => open(app, { screen: "list", id: null });
const toLesson = (app, id = state.id) => open(app, { screen: "lesson", id, step: null });

/* ---------- pieces ---------- */
/** A sentence with the pinyin of each word above it. */
function ruby(s, cls = "rubyline", marks = null) {
  return h("div", { class: cls, lang: "zh-Hans" }, ...s.tokens.map((t, i) => s.tokenPinyin[i]
    ? h("ruby", { class: marks?.[i]?.ok === true ? "heard" : marks?.[i]?.ok === false ? "missed" : "" }, t, h("rt", {}, s.tokenPinyin[i]))
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
  open(app, { screen: step, id: lesson.id, step, attempts: new Map(), live: null, added: null });
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

/* ---------- speaking: record yourself (tier 1) and have the browser's recognizer score it (tier 2) ---------- */
const scoring = (app) => recognitionSupported() && app.store.settings.scoreSpeech;
/** Done = scored, ticked by hand, or (when nothing is scoring) recorded: a recording alone proves nothing while scoring is on. */
const attemptDone = (app, a) => !!a && (a.best != null || a.manual || (!scoring(app) && !!a.audioUrl));

async function begin(app, lesson, s, idx) {
  if (state.live) return;
  const useScore = scoring(app);
  const ctl = startAttempt({ recognize: useScore, record: true });
  state.live = { zh: s.zh, ctl };
  const t0 = Date.now();
  viewLessons(app);
  const r = await ctl.result;
  state.live = null;
  if (state.screen !== "speaking" || state.id !== lesson.id) { if (r.audioUrl) URL.revokeObjectURL(r.audioUrl); return; }   // left the step meanwhile
  const prev = state.attempts.get(s.zh);
  if (prev?.audioUrl) URL.revokeObjectURL(prev.audioUrl);
  const score = useScore && r.alternatives.length ? scoreAttempt(s, r.alternatives) : null;
  const heardNothing = useScore && !r.alternatives.length && !r.error ? "no-speech" : null;
  state.attempts.set(s.zh, {
    score, audioUrl: r.audioUrl, manual: !!prev?.manual,
    best: score ? Math.max(prev?.best ?? 0, score.pct) : prev?.best ?? null,
    error: score || (r.audioUrl && !useScore) ? null : (r.error ?? heardNothing),
  });
  if (score) app.store.recordAnswer("speaking", score.pct >= PASS_PCT, { k: "practice", l: lesson.level, ty: "speak_sentence", id: `ls-${lesson.id}-s${idx + 1}`, ms: Date.now() - t0 });
  viewLessons(app);
}

function playRecording(url) {
  playing?.pause();
  playing = new Audio(url);
  playing.play().catch(() => {});
}

function speakCard(app, lesson, s, idx) {
  const a = state.attempts.get(s.zh);
  const live = state.live?.zh === s.zh;
  const canTry = scoring(app) || recorderSupported();
  const sc = a?.score;
  return h("div", { class: `card speakcard${attemptDone(app, a) ? " said" : ""}` },
    ruby(s, "rubyline big", sc?.tokens), h("p", { class: "hint" }, s.id),
    live ? h("p", { class: "listening", role: "status" }, "🎙 Mendengarkan… ucapkan kalimatnya, lalu diam sebentar atau ketuk Selesai.") : null,
    sc ? h("div", { class: `verdict ${sc.key}`, role: "status" }, h("strong", {}, `${sc.label} · ${sc.pct}%`),
      sc.pct < 100 ? h("span", { class: "hint" }, ` Terdengar: ${cleanZh(sc.heard) || "—"}. Kata merah belum terdengar.`) : null) : null,
    !live && a?.error ? h("p", { class: "notice", role: "status" }, errorMessage(a.error)) : null,
    a?.audioUrl && !live ? h("p", { class: "hint" }, "Bandingkan rekamanmu dengan suara model: ", btn("▶ Rekamanku", () => playRecording(a.audioUrl), "btn mini-text")) : null,
    h("div", { class: "row" },
      btn("🔊 Model", () => speak(s.zh), "btn"), btn("🐢 Pelan", () => speak(s.zh, 0.55), "btn"),
      canTry ? (live ? btn("⏹ Selesai", () => state.live.ctl.stop(), "btn primary", { id: `stop-${idx}` })
        : btn(a?.score || a?.audioUrl ? "🎤 Ulangi" : "🎤 Ucapkan", () => begin(app, lesson, s, idx), "btn primary", { id: `rec-${idx}`, disabled: !!state.live })) : null,
      !attemptDone(app, a) && !live ? btn("Tandai sudah diucapkan", () => { state.attempts.set(s.zh, { ...(a ?? {}), manual: true }); viewLessons(app); }, "btn", { id: `mark-${idx}` }) : null));
}

function speaking(app, lesson) {
  const all = lesson.speaking.every((s) => attemptDone(app, state.attempts.get(s.zh)));
  const done = isStepDone(app.store.lessonProgress(lesson.id), "speaking");
  const finishStep = () => {
    const scored = [...state.attempts.values()].filter((a) => a.best != null);
    app.store.saveLessonStep(lesson.id, "speaking", { ok: scored.filter((a) => a.best >= PASS_PCT).length, n: scored.length });
    startStep(app, lesson, "vocab");
  };
  const mode = scoring(app) ? h("span", { class: "chip" }, "pengucapan dinilai")
    : recorderSupported() ? h("span", { class: "chip off" }, "rekam & bandingkan") : h("span", { class: "chip off" }, "tanda manual");
  app.render(
    stepper(app, lesson, "speaking"),
    h("div", { class: "qhead" }, h("strong", {}, `${lesson.zh} · Speaking `, mode), h("span", { class: "hint" }, `${lesson.speaking.filter((s) => attemptDone(app, state.attempts.get(s.zh))).length} / ${lesson.speaking.length}`)),
    h("p", { class: "hint" }, scoring(app)
      ? "Dengarkan model, tekan Ucapkan, lalu ucapkan kalimatnya. Browser mencocokkan kata yang terdengar dengan kalimat; nada belum dinilai. Rekaman tidak disimpan."
      : recorderSupported()
        ? "Dengarkan model, rekam suaramu, lalu bandingkan. Penilaian otomatis tidak tersedia (browser belum mendukung atau dimatikan di Pengaturan)."
        : "Perangkat ini tidak bisa merekam. Dengarkan model, ucapkan keras-keras, lalu tandai sendiri."),
    ...lesson.speaking.map((s, i) => speakCard(app, lesson, s, i)),
    h("div", { class: "row" }, btn(done ? "Lanjut ke kosakata →" : "Selesaikan langkah →", finishStep, "btn primary", { disabled: !all && !done || !!state.live, id: "finish-speaking" })));
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
