import { glossText, meaning } from "../deck.js";
import { h } from "../ui.js";

const MAX_ROWS = 200;

export function viewBrowse(app) {
  const { store, vocab, idData } = app;
  const levels = store.settings.levels;
  const search = h("input", { type: "search", placeholder: "Cari hanzi / pinyin / arti", "aria-label": "Cari", style: "margin:0" });
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
  app.render(
    h("div", { class: "pagehead" }, h("div", {}, h("h2", {}, "Daftar kosakata"), h("p", { class: "hint" }, `Maksimal ${MAX_ROWS} baris ditampilkan. Level mengikuti Pengaturan.`)), h("div", { style: "flex:1 1 320px;max-width:480px" }, search)),
    h("div", { class: "panel", style: "padding:6px 14px" }, h("div", { class: "tablewrap" },
      h("table", {}, h("thead", {}, h("tr", {}, ...["Kata", "Pinyin", "Arti", "Status"].map((t) => h("th", {}, t)))), tbody))));
}
