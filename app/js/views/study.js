import { previewIntervals } from "../srs.js";
import { LEVEL_LABEL, glossText, posLabel } from "../deck.js";
import { buildQueue, nextItem, answer } from "../session.js";
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

export function viewStudy(app) {
  const { store, vocab, render } = app;
  const queue = buildQueue(vocab, store);
  const item = nextItem(queue);
  const head = h("p", { class: "hint" }, `Level: ${store.settings.levels.map((l) => LEVEL_LABEL[l]).join(", ")} · Jatuh tempo: ${queue.due.length} · Kata baru hari ini: ${queue.fresh.length}`);
  if (!item) {
    return render(head, h("div", { class: "card" }, h("p", { class: "hanzi" }, "完"),
      h("p", {}, "Tidak ada kartu yang perlu dipelajari sekarang."),
      h("p", { class: "hint" }, "Naikkan batas kata baru per hari atau tambah level di Pengaturan.")));
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
  const kind = c.state === "new" ? "Baru" : c.state === "learning" ? "Belajar" : "Ulasan";
  render(head, h("p", { class: "hint" }, `Kartu: ${kind}`), card, controls);
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
