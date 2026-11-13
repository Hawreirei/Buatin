import { h, btn } from "../ui.js";
import { LEVEL_LABEL, meaning } from "../deck.js";
import { todayKey } from "../store.js";
import { stats } from "../session.js";
import { accuracy, groupAccuracy, dailySeries, streak, activeDayKeys, weakWords, posAccuracy, examTrend, leeches, buildWeakSet, recommendations } from "../analytics.js";
import { SKILL_LABEL } from "../exam.js";
import { startPracticeWith, presetPractice } from "./practice.js";

const NS = "http://www.w3.org/2000/svg";
const TYPE_LABEL = {
  cloze_wordbank: "Isi kata (membaca)", write_hanzi_from_pinyin: "Tulis hanzi (menulis)", audio_question_pick_answer: "Dengar tanya-jawab",
  audio_dialog_question_mcq: "Dengar dialog", audio_passage_question_mcq: "Dengar teks",
};
const RANGES = [["14", "14 hari"], ["30", "30 hari"], ["all", "Semua"]];
let range = "all";

function svg(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const kid of kids) if (kid) el.append(kid);
  return el;
}

/** Bars = answers per day, line = accuracy %. */
export function trendChart(series) {
  const W = 320, H = 130, padL = 26, padB = 20, padT = 8, plotW = W - padL - 6, plotH = H - padB - padT;
  const maxN = Math.max(1, ...series.map((d) => d.n));
  const bw = plotW / series.length;
  const x = (i) => padL + i * bw + bw / 2;
  const yPct = (p) => padT + plotH * (1 - p / 100);
  const pts = series.map((d, i) => (d.pct == null ? null : [x(i), yPct(d.pct)]));
  const segs = [];
  let cur = [];
  for (const p of pts) { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } }
  if (cur.length) segs.push(cur);
  const label = (i) => series[i].date.slice(5);
  const summary = `Akurasi harian: ${series.filter((d) => d.pct != null).map((d) => `${label(series.indexOf(d))} ${d.pct}%`).join(", ") || "belum ada data"}`;
  return svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": summary },
    ...[0, 50, 100].map((p) => svg("g", {}, svg("line", { x1: padL, x2: W - 6, y1: yPct(p), y2: yPct(p), class: "grid" }), (() => { const t = svg("text", { x: padL - 4, y: yPct(p) + 3, class: "axis", "text-anchor": "end" }); t.textContent = `${p}`; return t; })())),
    ...series.filter((d) => d.n > 0).map((d) => [d, series.indexOf(d)]).map(([d, i]) => svg("rect", { x: x(i) - bw * 0.3, width: bw * 0.6, y: padT + plotH - (plotH * d.n) / maxN * 0.6, height: (plotH * d.n) / maxN * 0.6, class: "bar" })),
    ...segs.map((s) => svg("polyline", { points: s.map((p) => p.join(",")).join(" "), class: "line" })),
    ...pts.filter(Boolean).map(([cx, cy]) => svg("circle", { cx, cy, r: 3, class: "dot" })),
    (() => { const t = svg("text", { x: padL, y: H - 5, class: "axis" }); t.textContent = label(0); return t; })(),
    (() => { const t = svg("text", { x: W - 6, y: H - 5, class: "axis", "text-anchor": "end" }); t.textContent = label(series.length - 1); return t; })());
}

export function sparkline(values) {
  const W = 120, H = 32;
  if (!values.length) return svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "spark" });
  const step = values.length > 1 ? (W - 8) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [4 + i * step, H - 4 - ((H - 8) * v) / 100]);
  return svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "spark", role: "img", "aria-label": `Riwayat: ${values.join("%, ")}%` },
    svg("polyline", { points: pts.map((p) => p.join(",")).join(" "), class: "line" }), ...pts.map(([cx, cy]) => svg("circle", { cx, cy, r: 2.5, class: "dot" })));
}

const bar = (pct) => h("div", { class: "bar", role: "progressbar", "aria-valuenow": pct ?? 0, "aria-valuemin": 0, "aria-valuemax": 100, style: "min-width:80px" }, h("i", { style: `width:${pct ?? 0}%` }));
const pctCell = (a) => (a && a.pct != null ? `${a.pct}% (${a.ok}/${a.n})` : "—");

function table(head, rows) {
  return h("table", {}, h("thead", {}, h("tr", {}, ...head.map((t) => h("th", {}, t)))), h("tbody", {}, ...rows));
}

function progressNodes(app) {
  const { store, vocab, idData, questions } = app;
  const startWeak = (set) => { if (set.length) { app.go("practice"); startPracticeWith(app, set); } };
  const startSkill = (skill) => { app.go("practice"); presetPractice(app, skill); };
  const now = Date.now();
  const all = store.events;
  const cutoff = range === "all" ? 0 : now - Number(range) * 86_400_000;
  const ev = all.filter((e) => e.t >= cutoff);
  const vocabById = Object.fromEntries(vocab.map((w) => [w.id, w]));
  const total = accuracy(ev);
  const active = activeDayKeys(all, store.data.log);
  const exams = store.exams;

  const rangeBar = h("div", { class: "row", style: "justify-content:flex-start" }, h("span", { class: "hint" }, "Rentang analisis:"), ...RANGES.map(([v, label]) =>
    h("label", {}, h("input", { type: "radio", name: "range", value: v, checked: range === v, onchange: () => { range = v; viewProgress(app); } }), ` ${label}`)));

  const cards = h("div", { class: "cards" },
    ...[["Soal dijawab", total.n], ["Akurasi", total.pct == null ? "—" : `${total.pct}%`], ["Hari beruntun", streak(active, now)], ["Simulasi ujian", exams.length]].map(([k, v]) =>
      h("div", { class: "stat" }, h("div", { class: "num" }, String(v)), h("div", { class: "hint" }, k))));

  const days = range === "14" ? 14 : 30;
  const series = dailySeries(all, days, now);
  const trend = h("div", {}, h("h2", {}, `Tren akurasi ${days} hari`), series.some((d) => d.n) ? trendChart(series) : h("p", { class: "hint" }, "Belum ada data. Kerjakan latihan soal untuk mulai melihat tren."), h("p", { class: "hint" }, "Garis = akurasi harian; batang = jumlah soal."));

  const trendExam = examTrend(exams);
  const examBlock = Object.keys(trendExam).length
    ? h("div", {}, h("h2", {}, "Riwayat simulasi ujian"), ...Object.entries(trendExam).map(([lvl, list]) => {
        const last = list[list.length - 1];
        return h("div", { class: "examhist" }, h("strong", {}, LEVEL_LABEL[lvl]), " ", sparkline(list.map((x) => x.pct)),
          h("span", { class: "hint" }, ` ${list.length}× · terakhir ${last.pct}%${last.delta == null ? "" : ` (${last.delta >= 0 ? "+" : ""}${last.delta})`}`),
          table(["Tanggal", "Skor", "Perubahan", "Mendengar", "Membaca", "Menulis"], list.slice().reverse().slice(0, 5).map((x) => h("tr", {},
            h("td", {}, new Date(x.t).toLocaleDateString("id-ID")), h("td", {}, `${x.pct}%${x.assisted ? " *" : ""}`), h("td", {}, x.delta == null ? "—" : `${x.delta >= 0 ? "+" : ""}${x.delta}`),
            ...["listening", "reading", "writing"].map((k) => h("td", {}, x.sections.find((s) => s.skill === k) ? `${x.sections.find((s) => s.skill === k).pct}%` : "—"))))));
      }), h("p", { class: "hint" }, "* dibantu teks audio. Skor perkiraan latihan, bukan skor resmi."))
    : h("div", {}, h("h2", {}, "Riwayat simulasi ujian"), h("p", { class: "hint" }, "Belum ada. Coba tab Ujian untuk simulasi bertimer."));

  // weaknesses
  const recs = recommendations({ events: ev, exams, cards: store.data.cards, vocabById });
  const recList = h("ul", { class: "recs" }, ...recs.map((r) => h("li", {}, r.text, " ",
    r.skill ? btn(`Latih ${SKILL_LABEL[r.skill]}`, () => startSkill(r.skill), "btn", { "data-act": "skill" }) : null,
    r.action === "weak-set" ? btn("Latihan kelemahan", () => startWeak(buildWeakSet(questions, ev, { count: 10, levels: (() => { const lv = store.settings.levels.filter((l) => [1, 2, 3].includes(l)); return lv.length ? lv : null; })() })), "btn primary", { "data-act": "weak" }) : null)));

  const bySkill = groupAccuracy(ev, (e) => e.s);
  const byType = groupAccuracy(ev, (e) => e.ty);
  const byLevel = groupAccuracy(ev, (e) => e.l);
  const byPos = posAccuracy(ev, vocabById);
  const ranked = (g) => Object.entries(g).sort((a, b) => (a[1].pct ?? 101) - (b[1].pct ?? 101));
  const weakW = weakWords(ev).slice(0, 15);
  const leech = leeches(store.data.cards, vocabById);

  const weak = h("div", {}, h("h2", {}, "Kelemahan"), recList,
    ev.length ? h("div", {},
      h("h2", {}, "Per keterampilan"), table(["Keterampilan", "Akurasi", ""], ranked(bySkill).map(([k, a]) => h("tr", {}, h("td", {}, SKILL_LABEL[k] ?? k), h("td", {}, pctCell(a)), h("td", {}, bar(a.pct))))),
      h("h2", {}, "Per jenis soal"), table(["Jenis", "Akurasi", ""], ranked(byType).map(([k, a]) => h("tr", {}, h("td", {}, TYPE_LABEL[k] ?? k), h("td", {}, pctCell(a)), h("td", {}, bar(a.pct))))),
      h("h2", {}, "Per level"), table(["Level", "Akurasi", ""], ranked(byLevel).map(([k, a]) => h("tr", {}, h("td", {}, LEVEL_LABEL[k] ?? k), h("td", {}, pctCell(a)), h("td", {}, bar(a.pct))))),
      Object.keys(byPos).length ? h("div", {}, h("h2", {}, "Per jenis kata"), table(["Jenis kata", "Akurasi", ""], ranked(byPos).map(([k, a]) => h("tr", {}, h("td", {}, k), h("td", {}, pctCell(a)), h("td", {}, bar(a.pct)))))) : null,
      weakW.length ? h("div", {}, h("h2", {}, "Kata yang sering salah"), table(["Kata", "Pinyin", "Arti", "Salah", "Status"], weakW.filter((w) => vocabById[w.id]).map((w) => {
        const v = vocabById[w.id];
        return h("tr", {}, h("td", { class: "zh" }, v.word), h("td", {}, v.pinyin), h("td", {}, meaning(v, idData, 2) ?? "—"), h("td", {}, `${w.wrong}/${w.n}`), h("td", { class: w.recovered ? "ok" : "bad" }, w.recovered ? "sudah pulih" : "belum"));
      }))) : null) : null,
    leech.length ? h("div", {}, h("h2", {}, "Kata sulit di hafalan"), table(["Kata", "Pinyin", "Arti", "Lupa", "Ease"], leech.map((c) => h("tr", {}, h("td", { class: "zh" }, c.word.word), h("td", {}, c.word.pinyin), h("td", {}, meaning(c.word, idData, 2) ?? "—"), h("td", {}, c.lapses), h("td", {}, c.ease))))) : null);

  return [h("h2", {}, "Kemajuan"), rangeBar, cards, trend, examBlock, weak];
}

/** Vocabulary progress per level and the answer counters of the practice questions. */
function statsNodes(app) {
  const { store, vocab } = app;
  const st = stats(vocab, store);
  const rows = Object.keys(LEVEL_LABEL).map(Number).map((l) => {
    const s = st[l] || { total: 0, seen: 0, learning: 0, review: 0, mature: 0, due: 0 };
    const pct = s.total ? Math.round((s.review / s.total) * 100) : 0;
    return h("tr", {}, h("td", {}, LEVEL_LABEL[l]), h("td", {}, `${s.seen}/${s.total}`), h("td", {}, s.learning), h("td", {}, s.review), h("td", {}, s.mature), h("td", {}, s.due), h("td", { style: "min-width:90px" }, bar(pct)));
  });
  const today = store.data.log[todayKey()] || 0;
  return [h("h2", {}, "Hafalan per level"),
    table(["Level", "Dilihat", "Belajar", "Ulasan", "Matang (≥21 hr)", "Jatuh tempo", ""], rows),
    h("p", { class: "hint" }, `Ulasan hari ini: ${today}. Kolom bar = persentase kata yang sudah lulus tahap belajar.`),
    h("h2", {}, "Latihan soal"),
    table(["Keterampilan", "Dijawab", "Benar", "%"], Object.entries(SKILL_LABEL).map(([k, label]) => {
      const p = store.data.practice?.[k] || { n: 0, ok: 0 };
      return h("tr", {}, h("td", {}, label), h("td", {}, p.n), h("td", {}, p.ok), h("td", {}, p.n ? Math.round((100 * p.ok) / p.n) : "—"));
    }))];
}

export function viewProgress(app) {
  app.render(...progressNodes(app), ...statsNodes(app));
}
