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
  const opts = h("div", { class: "opts" }, ...q.options.map((o) => {
    const cls = q.picked == null ? "btn" : o.id === q.target.id ? "btn right" : o.id === q.picked ? "btn wrong" : "btn";
    return btn(meaning(o, app.idData), () => pick(app, o), cls, { disabled: q.picked != null });
  }));
  app.render(
    h("p", { class: "hint" }, `Skor: ${quiz.correct}/${quiz.total} · Pilih arti yang benar (level terpilih di Pengaturan)`),
    h("div", { class: "card" }, h("div", { class: "hanzi", lang: "zh-Hans" }, q.target.word),
      q.picked != null ? h("div", { class: "pinyin" }, q.target.pinyin) : null,
      btn("🔊 Dengar", () => speak(q.target.word))),
    opts,
    q.picked != null ? h("div", { class: "row" }, btn("Soal berikutnya", () => { quiz.q = newQuestion(app); viewQuiz(app); }, "btn primary", { id: "next" })) : null);
}

function pick(app, o) {
  const q = quiz.q;
  if (q.picked != null) return;
  q.picked = o.id;
  quiz.total++;
  if (o.id === q.target.id) quiz.correct++;
  viewQuiz(app);
}
