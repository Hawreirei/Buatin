import { previewIntervals } from "../srs.js";
import { LEVEL_LABEL, glossText, posLabel } from "../deck.js";
import { buildQueue, nextItem, answer, stats } from "../session.js";
import { todayKey } from "../store.js";
import { h, btn, speak } from "../ui.js";

const state = { revealed: false };
export const resetStudy = () => { state.revealed = false; };

function levelBadges(app, w) {
  return h("span", {},
    h("span", { class: "badge" }, LEVEL_LABEL[w.level]),
    ...w.also_levels.map((l) => h("span", { class: "badge", title: "Muncul lagi dengan arti lain" }, `+${LEVEL_LABEL[l]}`)),
    [...w.word].every((c) => app.handwriting.has(c)) ? h("span", { class: "badge hand", title: "Semua hanzi masuk daftar hanzi tulis" }, "✍ tulis") : null);
}

function answerBlock(app, w) {
  const d = app.idData[w.id];
  const en = glossText(w, 5);
  const main = d ? d.arti : (en ?? h("span", { class: "muted" }, "(arti belum tersedia di data)"));
  return h("div", {},
    h("div", { class: "pinyin" }, w.pinyin),
    h("div", { class: "gloss" }, main),
    d ? null : (en ? h("div", { class: "hint" }, "Arti Inggris (CC-CEDICT); terjemahan Indonesia untuk level ini belum tersedia.") : null),
    h("div", { class: "meta" }, posLabel(w.pos) || "—", " · ", levelBadges(app, w)),
    d ? h("div", { class: "example" },
      h("div", { class: "zh", lang: "zh-Hans" }, d.contoh.zh, " ", btn("🔊", () => speak(d.contoh.zh), "btn", { "aria-label": "Dengar kalimat contoh" })),
      h("div", { class: "py" }, d.contoh.pinyin),
      h("div", { class: "tr" }, d.contoh.id)) : null);
}

function aside(app, queue, c) {
  const { store, vocab } = app;
  const st = stats(vocab, store);
  const levels = store.settings.levels;
  const seen = levels.reduce((n, l) => n + (st[l]?.seen || 0), 0), total = levels.reduce((n, l) => n + (st[l]?.total || 0), 0);
  const pct = total ? Math.round((100 * seen) / total) : 0;
  return h("aside", { class: "sticky-aside", style: "display:grid;gap:18px" },
    h("div", { class: "panel" }, h("h2", {}, "Sesi hari ini"),
      h("div", { class: "mini" }, h("div", {}, h("b", {}, queue.due.length), "Jatuh tempo"), h("div", {}, h("b", {}, queue.fresh.length), "Kata baru"),
        h("div", {}, h("b", {}, store.data.log[todayKey()] || 0), "Sudah diulas")),
      h("ul", { class: "kv" }, h("li", {}, h("span", { class: "muted" }, "Level"), h("span", {}, levels.map((l) => LEVEL_LABEL[l]).join(", "))),
        h("li", {}, h("span", { class: "muted" }, "Kartu ini"), h("span", {}, c ? (c.state === "new" ? "Baru" : c.state === "learning" ? "Belajar" : "Ulasan") : "—")))),
    h("div", { class: "panel" }, h("h2", {}, "Hafalan level terpilih"),
      h("div", { class: "barrow", style: "grid-template-columns:1fr auto" }, h("div", { class: "bar", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 }, h("i", { style: `width:${pct}%` })), h("span", { class: "val" }, `${seen}/${total}`)),
      h("p", { class: "hint" }, "Persentase kata yang sudah pernah dilihat.")),
    h("div", { class: "panel" }, h("h2", {}, "Pintasan keyboard"),
      h("ul", { class: "kv" }, h("li", {}, h("span", {}, "Tampilkan jawaban"), h("kbd", {}, "Spasi")), h("li", {}, h("span", {}, "Lagi · Sulit · Bagus · Mudah"), h("span", {}, h("kbd", {}, "1"), " ", h("kbd", {}, "2"), " ", h("kbd", {}, "3"), " ", h("kbd", {}, "4"))))));
}

export function viewStudy(app) {
  const { store, vocab, render } = app;
  const queue = buildQueue(vocab, store);
  const item = nextItem(queue);
  if (!item) {
    return render(h("div", { class: "split" },
      h("div", { class: "card" }, h("p", { class: "hanzi" }, "完"),
        h("p", {}, "Tidak ada kartu yang perlu dipelajari sekarang."),
        h("p", { class: "hint" }, "Naikkan batas kata baru per hari atau tambah level di Pengaturan."),
        h("div", { class: "row" }, btn("Buka Pengaturan", () => app.go("settings"), "btn primary"))),
      aside(app, queue, null)));
  }
  const { w, c } = item;
  const card = h("div", { class: "card", "data-testid": "card" },
    h("div", { class: "hanzi", lang: "zh-Hans" }, w.word),
    btn("🔊 Dengar", () => speak(w.word), "btn", { "aria-label": `Dengar ${w.word}` }),
    state.revealed ? answerBlock(app, w) : null);
  const controls = state.revealed
    ? h("div", { class: "row rate" }, ...["Lagi", "Sulit", "Bagus", "Mudah"].map((label, r) =>
        btn([label, h("small", {}, previewIntervals(c)[r])], () => rate(app, item, r), "btn", { "data-rating": r })))
    : h("div", { class: "row" }, btn("Tampilkan jawaban (Spasi)", () => reveal(app), "btn primary", { id: "reveal" }));
  render(h("div", { class: "split" }, h("div", {}, card, controls), aside(app, queue, c)));
}

function reveal(app) {
  state.revealed = true;
  const item = nextItem(buildQueue(app.vocab, app.store));
  if (item && app.store.settings.speak) speak(item.w.word);
  viewStudy(app);
}

function rate(app, item, r) {
  answer(app.store, item, r);
  state.revealed = false;
  viewStudy(app);
}

/** Keyboard shortcuts: Space/Enter reveals, 1-4 rates. */
export function studyKey(e, app) {
  if (!state.revealed && (e.key === " " || e.key === "Enter")) {
    e.preventDefault();
    if (nextItem(buildQueue(app.vocab, app.store))) reveal(app);
  } else if (state.revealed && ["1", "2", "3", "4"].includes(e.key)) {
    const item = nextItem(buildQueue(app.vocab, app.store));
    if (item) rate(app, item, Number(e.key) - 1);
  }
}
