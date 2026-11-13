// Rendering of the picture and reading-text question types (shared by practice and exam views).
import { h, btn } from "./ui.js";

export const PICTURE_LISTENING = new Set(["audio_phrase_pick_picture", "audio_sentence_pick_picture", "audio_dialog_match_picture"]);
export const TEXT_READING = new Set(["short_text_mcq", "passage_mcq"]);
export const NEW_TYPES = new Set([...PICTURE_LISTENING, "sentence_match_picture", ...TEXT_READING]);

const LETTERS = "ABCDEF";

/** A grid of picture options. `state`: {picked key|null, answer key|null (reveal), disabled}. */
export function pictureGrid(q, state, onPick) {
  const cols = q.options.length > 3 ? 3 : q.options.length;
  return h("div", { class: "picgrid", style: `grid-template-columns: repeat(${cols}, 1fr)`, role: "group", "aria-label": "Pilihan gambar" },
    ...q.options.map((o, i) => {
      let cls = "btn pic";
      if (state.answer != null) cls += o.key === state.answer ? " right" : o.key === state.picked ? " wrong" : "";
      else if (state.picked === o.key) cls += " picked";
      const content = o.src
        ? h("img", { src: o.src, alt: "", class: "picimg" })
        : h("span", { class: "emoji", "aria-hidden": "true" }, o.emoji);
      return btn([h("span", { class: "letter" }, LETTERS[i]), content], () => onPick(o), cls, { "aria-label": `${LETTERS[i]}. ${o.alt}`, disabled: !!state.disabled });
    }));
}

export function pictureOf(q, key) {
  return q.options.find((o) => o.key === key);
}

/** Dialog / sentence text with pinyin, for the "show text" toggle and the explanations. */
export function listeningText(q) {
  if (q.turns) {
    return h("div", {}, ...q.turns.flatMap((t) => [h("div", { class: "stem", lang: "zh-Hans" }, t.who ? `${t.who}：${t.zh}` : t.zh), h("div", { class: "pinyin" }, t.pinyin)]),
      q.question ? [h("div", { class: "stem", lang: "zh-Hans", style: "margin-top:8px" }, `问：${q.question}`), h("div", { class: "pinyin" }, q.question_pinyin)] : null);
  }
  return h("div", {}, h("div", { class: "stem", lang: "zh-Hans" }, q.audio), h("div", { class: "pinyin" }, q.audio_pinyin));
}

/** Reading card for a sentence or a text. Pinyin is shown for HSK 1 (as on the official paper) or on request. */
export function textCard(q, showPinyin) {
  const isSentence = q.type === "sentence_match_picture";
  const zh = isSentence ? q.sentence : q.text;
  const py = isSentence ? q.sentence_pinyin : q.text_pinyin;
  return h("div", { class: `card${q.type === "passage_mcq" ? " passage" : ""}` },
    h("div", { class: isSentence ? "stem" : "passage-text", lang: "zh-Hans" }, zh),
    showPinyin ? h("div", { class: "pinyin" }, py) : null);
}

export function textQuestion(q) {
  return h("div", { class: "stem", lang: "zh-Hans", style: "font-size:clamp(20px,5vw,26px)" }, q.question);
}

export function textOptions(q, state, onPick) {
  return h("div", { class: "opts" }, ...q.options.map((o, k) => {
    let cls = "btn";
    if (state.answer != null) cls += o.zh === state.answer ? " right" : o.zh === state.picked ? " wrong" : "";
    else if (state.picked === o.zh) cls += " picked";
    return btn([h("span", { class: "zh", lang: "zh-Hans" }, `${"ABC"[k]}  ${o.zh}`), h("div", { class: "muted", style: "font-size:13px" }, o.pinyin)], () => onPick(o), cls, { disabled: !!state.disabled });
  }));
}

/** Explanation shown after answering (practice) or in the exam review. */
export function explainNew(q) {
  const e = q.explain;
  const correct = PICTURE_LISTENING.has(q.type) || q.type === "sentence_match_picture" ? pictureOf(q, q.answer) : null;
  const pic = correct ? h("div", { class: "picanswer" }, h("span", { class: "emoji big" }, correct.emoji), h("span", { class: "hint" }, ` ${correct.alt}`)) : null;
  if (PICTURE_LISTENING.has(q.type)) return h("div", { class: "example" }, pic, listeningText(q), h("div", { class: "tr" }, e.audio_id ?? e.text_id));
  if (q.type === "sentence_match_picture") return h("div", { class: "example" }, pic, h("div", { class: "zh", lang: "zh-Hans" }, q.sentence), h("div", { class: "py" }, q.sentence_pinyin), h("div", { class: "tr" }, e.sentence_id));
  return h("div", { class: "example" },
    h("div", { class: "zh", lang: "zh-Hans", style: "font-size:18px" }, q.text), h("div", { class: "tr" }, e.text_id),
    h("div", { class: "zh", lang: "zh-Hans", style: "margin-top:8px" }, q.question), h("div", { class: "tr" }, e.question_id),
    h("div", { class: "zh", lang: "zh-Hans", style: "margin-top:8px" }, q.answer), h("div", { class: "tr" }, e.answer_id));
}
