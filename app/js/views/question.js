// One place that renders every question type, for both practice and the timed exam.
// The caller passes a "mode" adapter, so the two screens only differ in how answers are stored:
//
//   m = {
//     kind: "practice" | "exam",
//     response,            // the learner's current response (option object, or string for writing)
//     reveal,              // true when the answer is shown (practice, after answering): marks right/wrong, locks input
//     onAnswer(resp),      // a choice was made (practice: also the "Periksa" button of writing items)
//     onWrite(value),      // exam: live save of typed hanzi
//     rerender(),
//     listening: { play(rate), playsLeft (number | null = unlimited), textShown, toggleText() },
//     pinyin:    { shown, toggle() },        // reading texts above HSK 1
//   }
import { h, btn, hasChineseVoice } from "../ui.js";
import { TYPE_HELP } from "../practice.js";
import { shuffledBank, checkOrder } from "../order.js";

const BLANK = "（　）";
const LETTERS = "ABCDEF";

export const PICTURE_LISTENING = new Set(["audio_phrase_pick_picture", "audio_sentence_pick_picture", "audio_dialog_match_picture"]);
export const TEXT_READING = new Set(["short_text_mcq", "passage_mcq"]);
const AUDIO_TYPES = new Set(["audio_question_pick_answer", "audio_dialog_question_mcq", "audio_passage_question_mcq", ...PICTURE_LISTENING]);

export const isListening = (q) => AUDIO_TYPES.has(q.type);
/** The identity of an option, whatever its kind (cloze word, listening/text answer, picture key). */
export const optionKey = (o) => o?.word ?? o?.zh ?? o?.key ?? null;

/* ---------- pieces ---------- */
function choiceState(q, m) {
  return { picked: optionKey(m.response), answer: m.reveal ? q.answer : null, disabled: !!m.reveal };
}
function choiceClass(o, st, base = "btn") {
  const key = typeof o === "string" ? o : optionKey(o);
  if (st.answer != null) return key === st.answer ? `${base} right` : key === st.picked ? `${base} wrong` : base;
  return st.picked === key ? `${base} picked` : base;
}

function pictureGrid(q, m) {
  const st = choiceState(q, m);
  const cols = q.options.length > 3 ? 3 : q.options.length;
  return h("div", { class: "picgrid", style: `grid-template-columns: repeat(${cols}, 1fr)`, role: "group", "aria-label": "Pilihan gambar" },
    ...q.options.map((o, i) => {
      const content = o.src ? h("img", { src: o.src, alt: "", class: "picimg" }) : h("span", { class: "emoji", "aria-hidden": "true" }, o.emoji);
      return btn([h("span", { class: "letter" }, LETTERS[i]), content], () => m.onAnswer(o), choiceClass(o, st, "btn pic"), { "aria-label": `${LETTERS[i]}. ${o.alt}`, disabled: st.disabled });
    }));
}

function wordOptions(q, m) {
  const st = choiceState(q, m);
  return h("div", { class: "opts" }, ...q.options.map((o, k) =>
    btn([h("span", { class: "zh", lang: "zh-Hans" }, `${LETTERS[k]}  ${o.word}`), h("small", { class: "muted" }, `  ${o.pinyin}`)], () => m.onAnswer(o), choiceClass(o, st), { disabled: st.disabled })));
}

function textOptions(q, m) {
  const st = choiceState(q, m);
  return h("div", { class: "opts" }, ...q.options.map((o, k) =>
    btn([h("span", { class: "zh", lang: "zh-Hans" }, `${LETTERS[k]}  ${o.zh}`), h("div", { class: "muted", style: "font-size:13px" }, o.pinyin)], () => m.onAnswer(o), choiceClass(o, st), { disabled: st.disabled })));
}

/** Dialog / sentence text with pinyin (the "show text" toggle and the explanations). */
export function listeningText(q) {
  if (q.turns) {
    return h("div", {}, ...q.turns.flatMap((t) => [h("div", { class: "stem", lang: "zh-Hans" }, t.who ? `${t.who}：${t.zh}` : t.zh), h("div", { class: "pinyin" }, t.pinyin)]),
      q.question ? [h("div", { class: "stem", lang: "zh-Hans", style: "margin-top:8px" }, `问：${q.question}`), h("div", { class: "pinyin" }, q.question_pinyin)] : null);
  }
  return h("div", {}, h("div", { class: "stem", lang: "zh-Hans" }, q.audio), h("div", { class: "pinyin" }, q.audio_pinyin));
}

function listeningCard(q, m) {
  const L = m.listening;
  const limited = L.playsLeft != null;
  const buttons = limited
    ? [btn(`🔊 Putar (sisa ${Math.max(0, L.playsLeft)})`, () => L.playsLeft > 0 && L.play(0.8), "btn primary", { id: "play", disabled: L.playsLeft <= 0 })]
    : [btn("🔊 Putar", () => L.play(0.8), "btn primary", { id: "play" }), " ", btn("🐢 Pelan", () => L.play(0.55), "btn")];
  const label = L.textShown ? "Sembunyikan teks" : m.kind === "exam" ? "Tampilkan teks (ditandai dibantu)" : "Tampilkan teks";
  return h("div", { class: "card" }, ...buttons,
    hasChineseVoice() === false ? h("p", { class: "notice" }, m.kind === "exam" ? "Tidak ada suara Mandarin di perangkat ini." : "Perangkat ini tidak punya suara Mandarin. Buka 'Tampilkan teks' untuk tetap bisa berlatih.") : null,
    h("div", { class: "row" }, btn(label, L.toggleText, "btn")),
    L.textShown ? listeningText(q) : null);
}

function textCard(q, showPinyin) {
  const sentence = q.type === "sentence_match_picture";
  return h("div", { class: `card${q.type === "passage_mcq" ? " passage" : ""}` },
    h("div", { class: sentence ? "stem" : "passage-text", lang: "zh-Hans" }, sentence ? q.sentence : q.text),
    showPinyin ? h("div", { class: "pinyin" }, sentence ? q.sentence_pinyin : q.text_pinyin) : null);
}

function writeBlock(q, m) {
  const [before, after] = q.stem.split(BLANK);
  const choice = m.writeMode !== "tiles" && q.choices?.length;
  if (choice) {   // multiple choice: 4 hanzi, tap one (practice answers at once; exam saves the pick)
    const shown = q.choices;
    const st = { picked: m.response ?? null, answer: m.reveal ? q.answer : null, disabled: !!m.reveal };
    const blank = h("span", { class: "blankbox" }, h("span", { class: "hint-py" }, q.hint_pinyin), h("span", { class: "blankfill", lang: "zh-Hans" }, m.response || "＿"));
    return [h("div", { class: "card" }, h("div", { class: "stem", lang: "zh-Hans" }, before, blank, after)),
      h("div", { class: "opts tiles", role: "group", "aria-label": "Pilihan hanzi" },
        ...shown.map((t, k) => btn([h("span", { class: "zh", lang: "zh-Hans" }, t)], () => m.onAnswer(t), choiceClass(t, st, "btn tile"), { disabled: st.disabled, "aria-label": `${LETTERS[k]}. ${t}` }))), null];
  }
  const input = h("input", { type: "text", lang: "zh-Hans", id: "hanzi", autocomplete: "off", "aria-label": "Hanzi yang hilang", style: "width:3.2em;font-size:28px;text-align:center", disabled: !!m.reveal, value: m.response ?? "" });
  const card = h("div", { class: "card" }, h("div", { class: "stem", lang: "zh-Hans" }, before, h("span", { class: "blankbox" }, h("span", { class: "hint-py" }, q.hint_pinyin), input), after));
  if (m.kind === "exam") {
    input.addEventListener("input", () => m.onWrite(input.value.trim()));
  } else {
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); m.onAnswer(input.value); } });
  }
  // Tile bank: tap a hanzi to fill the blank (no Chinese keyboard needed); typing still works.
  const tileBtns = [];
  const tiles = q.tiles?.length ? h("div", { class: "opts tiles", role: "group", "aria-label": "Pilihan hanzi" },
    ...q.tiles.map((t) => {
      const b = btn(h("span", { class: "zh", lang: "zh-Hans" }, t), () => {
        input.value = t;
        tileBtns.forEach((x) => x.classList.toggle("picked", x === b));
        if (m.kind === "exam") m.onWrite(t);
      }, `btn tile${(m.response ?? "").trim() === t ? " picked" : ""}`, { disabled: !!m.reveal });
      tileBtns.push(b);
      return b;
    })) : null;
  if (!m.reveal && !tiles) setTimeout(() => input.focus(), 0);
  const buttons = m.kind === "practice" && !m.reveal
    ? h("div", { class: "row" }, btn("Periksa", () => m.onAnswer(input.value), "btn primary", { id: "check" }), btn("Tidak tahu", () => m.onAnswer(""), "btn", { id: "skip" }))
    : null;
  return [card, tiles, buttons];
}

/** "Susun kalimat": tap pieces to build the sentence, tap a placed piece to take it back. No drag and drop, so it
 *  works on touch screens and with a keyboard. Practice answers with the full arrangement (array of pieces). */
function orderBlock(q, m) {
  const bank = q.bank?.length ? q.bank : shuffledBank(q.tokens);
  const locked = !!m.reveal;
  const placed = [];                                              // indices into `bank`, in the learner's order
  const used = new Set();
  for (const t of Array.isArray(m.response) ? m.response : []) {
    const i = bank.findIndex((b, k) => b === t && !used.has(k));
    if (i >= 0) { used.add(i); placed.push(i); }
  }
  const allRight = locked && checkOrder(q, placed.map((i) => bank[i])).correct;
  const area = h("div", { class: "orderarea", role: "group", "aria-label": "Susunan kalimat" });
  const pool = h("div", { class: "orderbank", role: "group", "aria-label": "Kepingan yang tersedia" });
  let checkBtn = null;
  const piece = (t, cls, onclick, extra) => btn(h("span", { class: "zh", lang: "zh-Hans" }, t), onclick, `btn piece${cls}`, extra);
  const draw = (focus) => {
    area.replaceChildren(...(placed.length ? placed.map((bi, pos) =>
      piece(bank[bi], locked ? (allRight || bank[bi] === q.tokens[pos] ? " right" : " wrong") : "", () => { placed.splice(pos, 1); draw({ bank: bi }); }, { disabled: locked, "aria-label": `Lepas ${bank[bi]}` }))
      : [h("span", { class: "hint" }, "Ketuk kepingan di bawah untuk menyusun kalimat.")]));
    pool.replaceChildren(...bank.map((t, bi) => piece(t, placed.includes(bi) ? " used" : "", () => { placed.push(bi); draw({ area: placed.length - 1 }); }, { disabled: locked || placed.includes(bi), "data-bi": bi })));
    if (checkBtn) checkBtn.disabled = placed.length !== bank.length;
    if (m.kind === "exam" && !locked && m.onWrite) m.onWrite(placed.map((i) => bank[i]));
    if (focus) (focus.area != null ? area.children[focus.area] : pool.querySelector(`[data-bi="${focus.bank}"]`))?.focus();   // the tapped button was replaced: keep keyboard focus
  };
  const buttons = m.kind === "practice" && !locked
    ? h("div", { class: "row" },
      (checkBtn = btn("Periksa", () => m.onAnswer(placed.map((i) => bank[i])), "btn primary", { id: "check" })),
      btn("Ulangi", () => { placed.length = 0; draw(); }, "btn", { id: "clear" }),
      btn("Tidak tahu", () => m.onAnswer([]), "btn", { id: "skip" }))
    : null;
  draw();
  return [h("div", { class: "card" }, h("div", { class: "stem order-stem", lang: "id" }, q.stem), area), pool, buttons];
}

/* ---------- the question body ---------- */
/** Nodes for one question (instruction line included). */
export function questionBody(q, m) {
  const help = h("p", { class: "hint" }, TYPE_HELP[q.type]);
  if (q.type === "cloze_wordbank") return [help, h("div", { class: "card" }, h("div", { class: "stem", lang: "zh-Hans" }, q.stem)), wordOptions(q, m)];
  if (q.type === "write_hanzi_from_pinyin") return [help, ...writeBlock(q, m)];
  if (q.type === "order_sentence") return [help, ...orderBlock(q, m)];
  if (PICTURE_LISTENING.has(q.type)) return [help, listeningCard(q, m), pictureGrid(q, m)];
  if (isListening(q)) return [help, listeningCard(q, m), textOptions(q, m)];
  if (q.type === "sentence_match_picture") return [help, textCard(q, true), pictureGrid(q, m)];
  // short_text_mcq / passage_mcq
  const showPinyin = q.level === 1 || !!m.pinyin.shown;
  return [help, textCard(q, showPinyin),
    q.level > 1 ? h("div", { class: "row" }, btn(showPinyin ? "Sembunyikan pinyin" : "Tampilkan pinyin", m.pinyin.toggle, "btn")) : null,
    h("div", { class: "stem", lang: "zh-Hans", style: "font-size:clamp(20px,5vw,26px)" }, q.question),
    textOptions(q, m)];
}

/* ---------- explanations ---------- */
export function answerLabel(q) {
  const o = q.options?.find((x) => x.key === q.answer);
  return o ? `${o.emoji} ${o.alt}` : q.answer;
}

/** The explanation shown after answering and in result reviews. */
export function explanation(q) {
  const e = q.explain;
  const zh = (t, style) => h("div", { class: "zh", lang: "zh-Hans", style }, t);
  const pictureAnswer = q.options?.[0]?.emoji ? q.options.find((o) => o.key === q.answer) : null;
  const pic = pictureAnswer ? h("div", { class: "picanswer" }, h("span", { class: "emoji big" }, pictureAnswer.emoji), h("span", { class: "hint" }, ` ${pictureAnswer.alt}`)) : null;

  if (PICTURE_LISTENING.has(q.type)) return h("div", { class: "example" }, pic, listeningText(q), h("div", { class: "tr" }, e.audio_id ?? e.text_id));
  if (q.type === "sentence_match_picture") return h("div", { class: "example" }, pic, zh(q.sentence), h("div", { class: "py" }, q.sentence_pinyin), h("div", { class: "tr" }, e.sentence_id));
  if (TEXT_READING.has(q.type)) {
    return h("div", { class: "example" }, zh(q.text, "font-size:18px"), h("div", { class: "tr" }, e.text_id),
      zh(q.question, "margin-top:8px"), h("div", { class: "tr" }, e.question_id), zh(q.answer, "margin-top:8px"), h("div", { class: "tr" }, e.answer_id));
  }
  if (q.turns) {   // dialog / passage with a question
    return h("div", { class: "example" },
      ...q.turns.flatMap((t) => [zh(t.who ? `${t.who}：${t.zh}` : t.zh), h("div", { class: "py" }, t.pinyin)]), h("div", { class: "tr" }, e.text_id),
      zh(`问：${q.question}`, "margin-top:8px"), h("div", { class: "py" }, q.question_pinyin), h("div", { class: "tr" }, e.question_id),
      zh(q.answer, "margin-top:8px"), h("div", { class: "tr" }, e.answer_id));
  }
  if (q.type === "audio_question_pick_answer") {
    return h("div", { class: "example" }, zh(q.audio), h("div", { class: "py" }, q.audio_pinyin), h("div", { class: "tr" }, e.question_id), zh(q.answer, "margin-top:8px"), h("div", { class: "tr" }, e.answer_id));
  }
  return h("div", { class: "example" }, zh(e.zh), h("div", { class: "py" }, e.pinyin), h("div", { class: "tr" }, e.id), e.word ? h("div", { class: "hint" }, `Kata: ${e.word} (${e.word_pinyin}) — ${e.arti}`) : null);
}
