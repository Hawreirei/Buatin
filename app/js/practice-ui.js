import { h, btn, speakSequence, stopSpeaking, listeningParts, hasChineseVoice } from "./ui.js";
import { wordIdOfQuestion } from "./analytics.js";
import { NEW_TYPES, PICTURE_LISTENING, pictureGrid, listeningText, textCard, textQuestion, textOptions, explainNew } from "./qui.js";
import { LEVEL_LABEL } from "./deck.js";
import { SKILLS, TYPE_HELP, availableLevels, buildSet, check, summarize } from "./practice.js";

const BLANK = "（　）";
let state = { phase: "setup", cfg: { skill: "mixed", count: 10 }, set: [], i: 0, results: [], answered: null, textShown: false };

export function viewPractice(ctx) {
  const { render, store, questions } = ctx;
  if (!questions.length) return render(h("p", { class: "notice" }, "Bank soal belum termuat."));
  if (state.phase === "setup") return setup(ctx);
  if (state.phase === "done") return done(ctx);
  return question(ctx);
}

export function resetPractice() { state = { ...state, phase: "setup", set: [], i: 0, results: [], answered: null, textShown: false }; }

function setup(ctx) {
  const { render, store, questions } = ctx;
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
    if (!set.length) return;
    state = { ...state, phase: "run", set, i: 0, results: [], answered: null, textShown: false, shownAt: Date.now(), autoplayed: {} };
    viewPractice(ctx);
  }, "btn primary", { disabled: !levels.length, id: "start" });
  render(
    h("h2", {}, "Latihan Soal"),
    h("p", { class: "hint" }, "Format soal mengikuti struktur ujian HSK 3.0 resmi (dokumen CTI). Soal dibuat otomatis dari kalimat contoh dan bank tanya-jawab buatan sendiri."),
    h("p", { class: "notice" }, "Belum direview guru. Jika menemukan soal yang janggal atau jawaban yang ambigu, catat nomornya (mis. c12) untuk dikoreksi."),
    h("div", { class: "row", style: "justify-content:flex-start" }, skillOpt("mixed", "Campuran"), skillOpt("reading", "Membaca"), skillOpt("writing", "Menulis"), skillOpt("listening", "Mendengar")),
    h("div", { class: "row", style: "justify-content:flex-start" }, count),
    msg, h("div", { class: "row", style: "justify-content:flex-start" }, start));
}

function header(q, ctx) {
  return h("p", { class: "hint" }, `Soal ${state.i + 1}/${state.set.length} · ${SKILLS[q.skill]} · ${LEVEL_LABEL[q.level]} · #${q.id}`);
}

export function explain(q) {
  if (NEW_TYPES.has(q.type)) return explainNew(q);
  const e = q.explain;
  if (q.turns) {
    return h("div", { class: "example" },
      ...q.turns.flatMap((t) => [h("div", { class: "zh", lang: "zh-Hans" }, t.who ? `${t.who}：${t.zh}` : t.zh), h("div", { class: "py" }, t.pinyin)]),
      h("div", { class: "tr" }, e.text_id),
      h("div", { class: "zh", lang: "zh-Hans", style: "margin-top:8px" }, `问：${q.question}`), h("div", { class: "py" }, q.question_pinyin), h("div", { class: "tr" }, e.question_id),
      h("div", { class: "zh", lang: "zh-Hans", style: "margin-top:8px" }, q.answer), h("div", { class: "tr" }, e.answer_id));
  }
  if (q.type === "audio_question_pick_answer") {
    return h("div", { class: "example" },
      h("div", { class: "zh", lang: "zh-Hans" }, q.audio), h("div", { class: "py" }, q.audio_pinyin), h("div", { class: "tr" }, e.question_id),
      h("div", { class: "zh", lang: "zh-Hans", style: "margin-top:8px" }, q.answer), h("div", { class: "tr" }, e.answer_id));
  }
  return h("div", { class: "example" },
    h("div", { class: "zh", lang: "zh-Hans" }, e.zh), h("div", { class: "py" }, e.pinyin), h("div", { class: "tr" }, e.id),
    h("div", { class: "hint" }, `Kata: ${e.word} (${e.word_pinyin}) — ${e.arti}`));
}

function finish(ctx, q, response) {
  if (state.answered) return;
  const res = check(q, response);
  state.answered = { ...res, response };
  state.results.push({ q, correct: res.correct, response });
  ctx.store.logPractice(q.skill, res.correct, { k: "practice", l: q.level, ty: q.type, id: q.id, w: wordIdOfQuestion(q), ms: Date.now() - (state.shownAt || Date.now()) });
  viewPractice(ctx);
}

function next(ctx) {
  stopSpeaking();
  if (state.i + 1 >= state.set.length) state.phase = "done";
  else { state.i += 1; state.answered = null; state.textShown = false; state.shownAt = Date.now(); }
  viewPractice(ctx);
}

function question(ctx) {
  const { render } = ctx;
  const q = state.set[state.i];
  const a = state.answered;
  const parts = [header(q, ctx), h("p", { class: "hint" }, TYPE_HELP[q.type])];
  let body;

  if (NEW_TYPES.has(q.type)) {
    body = newTypeBody(ctx, q, a);
  } else if (q.type === "cloze_wordbank") {
    body = [
      h("div", { class: "card" }, h("div", { class: "stem", lang: "zh-Hans" }, q.stem)),
      h("div", { class: "opts" }, ...q.options.map((o, k) => {
        const cls = !a ? "btn" : o.word === q.answer ? "btn right" : o.word === a.response?.word ? "btn wrong" : "btn";
        return btn([h("span", { class: "zh", lang: "zh-Hans" }, `${"ABCD"[k]}  ${o.word}`), h("small", { class: "muted" }, `  ${o.pinyin}`)], () => finish(ctx, q, o), cls, { disabled: !!a });
      })),
    ];
  } else if (q.type === "write_hanzi_from_pinyin") {
    const [before, after] = q.stem.split(BLANK);
    const input = h("input", { type: "text", lang: "zh-Hans", id: "hanzi", autocomplete: "off", "aria-label": "Hanzi yang hilang", style: "width:3.2em;font-size:28px;text-align:center", disabled: !!a, value: a?.response ?? "" });
    const submit = () => finish(ctx, q, input.value);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); submit(); } });
    body = [
      h("div", { class: "card" }, h("div", { class: "stem", lang: "zh-Hans" }, before,
        h("span", { class: "blankbox" }, h("span", { class: "hint-py" }, q.hint_pinyin), input), after)),
      a ? null : h("div", { class: "row" }, btn("Periksa", submit, "btn primary", { id: "check" }), btn("Tidak tahu", () => finish(ctx, q, ""), "btn", { id: "skip" })),
    ];
    if (!a) setTimeout(() => input.focus(), 0);
  } else {
    const voice = hasChineseVoice();
    const play = (rate) => speakSequence(listeningParts(q), rate);
    if (!a && !state.autoplayed?.[q.id]) { (state.autoplayed ||= {})[q.id] = true; setTimeout(() => play(0.8), 150); }
    const textBlock = () => (q.turns
      ? h("div", {}, ...q.turns.flatMap((t) => [h("div", { class: "stem", lang: "zh-Hans" }, t.who ? `${t.who}：${t.zh}` : t.zh), h("div", { class: "pinyin" }, t.pinyin)]),
          h("div", { class: "stem", lang: "zh-Hans", style: "margin-top:8px" }, `问：${q.question}`), h("div", { class: "pinyin" }, q.question_pinyin))
      : h("div", {}, h("div", { class: "stem", lang: "zh-Hans" }, q.audio), h("div", { class: "pinyin" }, q.audio_pinyin)));
    body = [
      h("div", { class: "card" },
        btn("🔊 Putar", () => play(0.8), "btn primary", { id: "play" }), " ", btn("🐢 Pelan", () => play(0.55), "btn"),
        voice === false ? h("p", { class: "notice" }, "Perangkat ini tidak punya suara Mandarin. Buka 'Tampilkan teks' untuk tetap bisa berlatih.") : null,
        h("div", { class: "row" }, btn(state.textShown || a ? "Sembunyikan teks" : "Tampilkan teks", () => { state.textShown = !state.textShown; viewPractice(ctx); }, "btn")),
        state.textShown || a ? textBlock() : null),
      h("div", { class: "opts" }, ...q.options.map((o, k) => {
        const cls = !a ? "btn" : o.zh === q.answer ? "btn right" : o.zh === a.response?.zh ? "btn wrong" : "btn";
        return btn([h("span", { class: "zh", lang: "zh-Hans" }, `${"ABC"[k]}  ${o.zh}`), h("div", { class: "muted", style: "font-size:13px" }, o.pinyin)], () => finish(ctx, q, o), cls, { disabled: !!a });
      })),
    ];
  }
  parts.push(...body);
  if (a) {
    parts.push(h("p", { class: a.correct ? "ok" : "bad", role: "status" }, a.correct ? "✔ Benar" : `✘ Jawaban yang benar: ${answerLabel(q)}`), explain(q),
      h("div", { class: "row" }, btn(state.i + 1 >= state.set.length ? "Lihat hasil" : "Soal berikutnya", () => next(ctx), "btn primary", { id: "next" })));
  }
  render(...parts.filter(Boolean));
}

function done(ctx) {
  const { render } = ctx;
  const s = summarize(state.results);
  const wrong = state.results.filter((r) => !r.correct);
  render(
    h("h2", {}, "Hasil latihan"),
    h("div", { class: "card" }, h("div", { class: "hanzi" }, `${s.correct}/${s.total}`), h("div", { class: "gloss" }, `${s.pct}%`)),
    h("table", {}, h("thead", {}, h("tr", {}, ...["Keterampilan", "Benar", "Total"].map((t) => h("th", {}, t)))),
      h("tbody", {}, ...Object.entries(s.by).map(([k, v]) => h("tr", {}, h("td", {}, SKILLS[k]), h("td", {}, v.correct), h("td", {}, v.total))))),
    wrong.length ? h("h2", {}, "Perlu diulang") : h("p", {}, "Semua benar. 太好了！"),
    ...wrong.map((r) => h("div", { class: "example" }, h("div", { class: "hint" }, `#${r.q.id} · ${SKILLS[r.q.skill]}`), explain(r.q), h("div", { class: "hint" }, `Jawaban yang benar: ${answerLabel(r.q)}`))),
    h("div", { class: "row" }, btn("Latihan lagi", () => { resetPractice(); viewPractice(ctx); }, "btn primary", { id: "again" })));
}

/** Start a practice run with a ready-made set (used by the weakness analysis). */
export function startPracticeWith(ctx, set) {
  state = { ...state, phase: "run", set, i: 0, results: [], answered: null, textShown: false, shownAt: Date.now(), autoplayed: {} };
  viewPractice(ctx);
}

/** Open the setup screen with a skill preselected (from the weakness recommendations). */
export function presetPractice(ctx, skill) {
  state = { ...state, phase: "setup", cfg: { ...state.cfg, skill }, set: [], i: 0, results: [], answered: null };
  viewPractice(ctx);
}

function newTypeBody(ctx, q, a) {
  const pick = (o) => finish(ctx, q, o);
  if (PICTURE_LISTENING.has(q.type)) {
    const voice = hasChineseVoice();
    const play = (rate) => speakSequence(listeningParts(q), rate);
    if (!a && !state.autoplayed?.[q.id]) { (state.autoplayed ||= {})[q.id] = true; setTimeout(() => play(0.8), 150); }
    return [
      h("div", { class: "card" },
        btn("🔊 Putar", () => play(0.8), "btn primary", { id: "play" }), " ", btn("🐢 Pelan", () => play(0.55), "btn"),
        voice === false ? h("p", { class: "notice" }, "Perangkat ini tidak punya suara Mandarin. Buka 'Tampilkan teks' untuk tetap bisa berlatih.") : null,
        h("div", { class: "row" }, btn(state.textShown || a ? "Sembunyikan teks" : "Tampilkan teks", () => { state.textShown = !state.textShown; viewPractice(ctx); }, "btn")),
        state.textShown || a ? listeningText(q) : null),
      pictureGrid(q, { picked: a?.response?.key ?? null, answer: a ? q.answer : null, disabled: !!a }, pick),
    ];
  }
  if (q.type === "sentence_match_picture") {
    return [textCard(q, true), pictureGrid(q, { picked: a?.response?.key ?? null, answer: a ? q.answer : null, disabled: !!a }, pick)];
  }
  const showPinyin = q.level === 1 || !!state.pinyinShown;
  return [
    textCard(q, showPinyin),
    q.level > 1 ? h("div", { class: "row" }, btn(showPinyin ? "Sembunyikan pinyin" : "Tampilkan pinyin", () => { state.pinyinShown = !state.pinyinShown; viewPractice(ctx); }, "btn")) : null,
    textQuestion(q),
    textOptions(q, { picked: a?.response?.zh ?? null, answer: a ? q.answer : null, disabled: !!a }, pick),
  ];
}

export function answerLabel(q) {
  const o = q.options?.find((x) => x.key === q.answer);
  return o ? `${o.emoji} ${o.alt}` : q.answer;
}
