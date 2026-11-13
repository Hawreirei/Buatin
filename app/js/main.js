// Boot, data loading, tab router. Each tab is a view in ./views/ that receives the shared `app` object.
import { h } from "./ui.js";
import { Store } from "./store.js";
import { viewStudy, resetStudy, studyKey } from "./views/study.js";
import { viewPractice } from "./views/practice.js";
import { viewExam, examRunning, abortExam } from "./views/exam.js";
import { viewQuiz } from "./views/quiz.js";
import { viewBrowse } from "./views/browse.js";
import { viewProgress } from "./views/progress.js";
import { viewSettings } from "./views/settings.js";

const view = document.getElementById("view");

/** Shared state and helpers passed to every view. */
const app = {
  store: new Store(),
  vocab: [],                // data/hsk3/vocab.json
  handwriting: new Set(),   // characters of the official handwriting list
  idData: {},               // vocab_id.json: id -> {arti, contoh:{zh,pinyin,id}}
  questions: [],            // questions.json
  blueprints: {},           // blueprints.json (official exam structure per level)
  render: (...nodes) => view.replaceChildren(...nodes),
  go,
};

const views = { study: viewStudy, practice: viewPractice, exam: viewExam, quiz: viewQuiz, browse: viewBrowse, progress: viewProgress, settings: viewSettings };
let tab = "study";

function go(t) {
  if (examRunning() && t !== "exam") {
    if (!confirm("Ujian sedang berlangsung. Keluar sekarang akan membatalkan ujian (tidak disimpan). Keluar?")) return;
    abortExam();
  }
  tab = t;
  for (const b of document.querySelectorAll("#tabs button")) b.setAttribute("aria-selected", String(b.dataset.tab === t));
  if (t === "study") resetStudy();
  views[t](app);
}

document.getElementById("tabs").addEventListener("click", (e) => {
  const t = e.target.closest("button")?.dataset.tab;
  if (t) go(t);
});
document.addEventListener("keydown", (e) => {
  if (tab === "study" && !e.target.matches("input,select,textarea")) studyKey(e, app);
});

const getJson = async (name, fallback) => {
  try {
    const r = await fetch(`../data/hsk3/${name}`);
    if (!r.ok) throw new Error(`${name} ${r.status}`);
    return await r.json();
  } catch (err) {
    if (fallback !== undefined) return fallback;     // optional file: the app still works without it
    throw err;
  }
};

async function boot() {
  try {
    const [vocab, handwriting, idData, questions, blueprints] = await Promise.all([
      getJson("vocab.json"), getJson("handwriting.json"),
      getJson("vocab_id.json", {}), getJson("questions.json", []), getJson("blueprints.json", {}),
    ]);
    Object.assign(app, { vocab, handwriting: new Set(handwriting.map((x) => x.char)), idData, questions, blueprints });
    go("study");
  } catch (err) {
    app.render(h("p", { class: "notice" }, `Gagal memuat data: ${err.message}. Jalankan server dari akar repo: python3 -m http.server 8080, lalu buka /app/.`));
  }
}
boot();
