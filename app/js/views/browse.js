import { glossText, meaning } from "../deck.js";
import { h } from "../ui.js";

const MAX_ROWS = 200;

export function viewBrowse(app) {
  const { store, vocab, idData } = app;
  const levels = store.settings.levels;
  const search = h("input", { type: "search", placeholder: "Cari hanzi / pinyin / arti", "aria-label": "Cari", style: "width:100%;padding:8px;margin:8px 0" });
  const tbody = h("tbody");
  const matches = (w, q) => !q || w.word.includes(q) || w.pinyin.toLowerCase().includes(q)
    || (meaning(w, idData, 6) || "").toLowerCase().includes(q) || (glossText(w, 6) || "").toLowerCase().includes(q);
  const fill = () => {
    const q = search.value.trim().toLowerCase();
    const rows = vocab.filter((w) => levels.includes(w.level) && matches(w, q)).slice(0, MAX_ROWS);
    tbody.replaceChildren(...rows.map((w) => {
      const c = store.card(w.id);
      return h("tr", {}, h("td", { class: "zh" }, w.word), h("td", {}, w.pinyin), h("td", {}, meaning(w, idData, 3) ?? "—"), h("td", { class: "muted" }, c ? c.state : "baru"));
    }));
  };
  search.addEventListener("input", fill);
  fill();
  app.render(search, h("p", { class: "hint" }, `Maksimal ${MAX_ROWS} baris ditampilkan.`),
    h("table", {}, h("thead", {}, h("tr", {}, ...["Kata", "Pinyin", "Arti", "Status"].map((t) => h("th", {}, t)))), tbody));
}
