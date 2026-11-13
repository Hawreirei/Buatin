import { meaning, distractors, shuffle } from "../deck.js";
import { h, btn, speak } from "../ui.js";

let quiz = null;
export const resetQuiz = () => { quiz = null; };

function newQuestion(app) {
  const pool = app.vocab.filter((w) => app.store.settings.levels.includes(w.level) && meaning(w, app.idData));
  const target = pool[Math.floor(Math.random() * pool.length)];
  const options = shuffle([target, ...distractors(pool, target, 3, Math.random, (w) => meaning(w, app.idData))]);
  return { target, options, picked: null };
}

export function viewQuiz(app) {
  quiz ||= { q: newQuestion(app), correct: 0, total: 0 };
  const { q } = quiz;
  const opts = h("div", { class: "opts big" }, ...q.options.map((o) => {
    const cls = q.picked == null ? "btn" : o.id === q.target.id ? "btn right" : o.id === q.picked ? "btn wrong" : "btn";
    return btn(meaning(o, app.idData), () => pick(app, o), cls, { disabled: q.picked != null });
  }));
  const acc = quiz.total ? Math.round((100 * quiz.correct) / quiz.total) : null;
  app.render(
    h("div", { class: "pagehead" }, h("div", {}, h("h2", {}, "Kuis arti kata"), h("p", { class: "hint" }, "Pilih arti yang benar. Level mengikuti Pengaturan.")),
      h("div", { class: "stats-strip", style: "grid-template-columns:repeat(2,minmax(110px,1fr))" },
        h("div", { class: "stat" }, h("div", { class: "num" }, `${quiz.correct}/${quiz.total}`), h("div", {}, "Skor")),
        h("div", { class: "stat" }, h("div", { class: "num" }, acc == null ? "—" : `${acc}%`), h("div", {}, "Akurasi")))),
    h("div", { class: "split even" },
      h("div", { class: "card", style: "margin:0" }, h("div", { class: "hanzi", lang: "zh-Hans" }, q.target.word),
        q.picked != null ? h("div", { class: "pinyin" }, q.target.pinyin) : h("div", { class: "pinyin", "aria-hidden": "true" }, "\u00a0"),
        btn("🔊 Dengar", () => speak(q.target.word))),
      h("div", {}, opts,
        h("div", { class: "row", style: "justify-content:flex-start" }, q.picked != null ? btn("Soal berikutnya", () => { quiz.q = newQuestion(app); viewQuiz(app); }, "btn primary", { id: "next" }) : h("span", { class: "hint" }, "Pilih salah satu jawaban.")))));
}

function pick(app, o) {
  const q = quiz.q;
  if (q.picked != null) return;
  q.picked = o.id;
  quiz.total++;
  if (o.id === q.target.id) quiz.correct++;
  viewQuiz(app);
}
