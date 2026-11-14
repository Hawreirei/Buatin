// Tulis: stroke-order animation, trace-over-faint-character, free writing. Uses the vendored Hanzi Writer (window.HanziWriter)
// with stroke data from data/hsk3/strokes/. Logic that needs no DOM lives in ../writing.js.
import { LEVEL_LABEL, meaning } from "../deck.js";
import { buildCharIndex, charPinyin, filterChars, nextRecord, progressOf, strokeFile, strokePath, farEnough } from "../writing.js";
import { h, btn, speak } from "../ui.js";

const NS = "http://www.w3.org/2000/svg";
const sv = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const PAD = 12;
const MODES = [["lihat", "Lihat"], ["tebal", "Tebalkan"], ["bebas", "Tulis bebas"]];
const levelLabel = (l) => (l === 2 ? "HSK 1–2" : LEVEL_LABEL[l]);   // bands 1 and 2 share one handwriting list

// UI state survives leaving and re-entering the tab within one visit.
const st = { ch: null, mode: "lihat", speed: 1, opacity: 0.2, check: false, numbers: true, query: "", levels: new Set(), todo: false };
let live = null;                       // { writer, pad, onResize } of the character on screen
const dataCache = new Map();
let indexCache = null;

/** Stroke data of one character (cached); rejects when the file is missing. */
function getData(ch) {
  if (!dataCache.has(ch)) {
    const p = fetch(`../data/hsk3/strokes/${strokeFile(ch)}`).then((r) => { if (!r.ok) throw new Error(`${ch}: ${r.status}`); return r.json(); });
    p.catch(() => dataCache.delete(ch));
    dataCache.set(ch, p);
  }
  return dataCache.get(ch);
}

const inkRgb = () => (getComputedStyle(document.body).color.match(/\d+/g) || [37, 48, 43]).slice(0, 3);
const rgba = (a) => `rgba(${inkRgb().join(",")},${a})`;
const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Freehand pad: an SVG laid over the guide; pointer events cover mouse, finger and stylus. */
function makePad(svg, size, onChange) {
  const strokes = [];
  let cur = null, pts = null;
  const at = (e) => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) * (size / r.width), (e.clientY - r.top) * (size / r.height)]; };
  const down = (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    svg.setPointerCapture?.(e.pointerId);
    pts = [at(e)];
    cur = sv("path", { class: "ink", d: strokePath(pts) });
    svg.append(cur);
  };
  const move = (e) => {
    if (!cur) return;
    e.preventDefault();
    for (const ev of e.getCoalescedEvents?.() ?? [e]) {
      const p = at(ev);
      if (farEnough(pts[pts.length - 1], p)) pts.push(p);
    }
    cur.setAttribute("d", strokePath(pts));
  };
  const up = () => {
    if (!cur) return;
    strokes.push(cur); cur = null; pts = null;
    onChange?.(strokes.length);
  };
  svg.addEventListener("pointerdown", down);
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);
  return {
    get count() { return strokes.length; },
    undo() { strokes.pop()?.remove(); onChange?.(strokes.length); },
    clear() { while (strokes.length) strokes.pop().remove(); onChange?.(0); },
  };
}

/** Stroke-number badges at the start of each stroke (Hanzi Writer space: 1024 wide, y up, baseline 900). */
function numberBadges(data, size, upTo = Infinity) {
  const k = (size - 2 * PAD) / 1024;
  const g = sv("g", { class: "nums" });
  data.medians.slice(0, upTo).forEach((m, i) => {
    const [x, y] = m[0];
    const cx = PAD + x * k, cy = PAD + (900 - y) * k;
    g.append(sv("circle", { cx, cy, r: 8 }), Object.assign(sv("text", { x: cx, y: cy + 0.5 }), { textContent: String(i + 1) }));
  });
  return g;
}

function guide(size) {
  const s = sv("svg", { class: "wguide", width: size, height: size, viewBox: "0 0 100 100", "aria-hidden": "true" });
  for (const d of ["M0 0H100V100H0Z", "M50 0V100", "M0 50H100", "M0 0L100 100", "M100 0L0 100"]) s.append(sv("path", { d, class: d.startsWith("M0 0H") ? "frame" : "ln" }));
  return s;
}

/** Jump to the Tulis tab on one character (used by the Hafalan card); filters are cleared so it is always visible. */
export function openWrite(app, ch) {
  Object.assign(st, { ch, query: "", todo: false });
  st.levels.clear();
  app.go("write");
  window.scrollTo(0, 0);          // on small screens the card sits below the fold; show the writing box
}

function stop() {
  if (!live) return;
  window.removeEventListener("resize", live.onResize);
  try { live.writer?.cancelQuiz(); live.writer?.pauseAnimation(); } catch { /* writer may not have loaded yet */ }
  live = null;
}
export function leaveWrite() { stop(); }

export function viewWrite(app) {
  const { store } = app;
  if (!window.HanziWriter) { app.render(h("p", { class: "notice" }, "Pustaka tulisan (Hanzi Writer) tidak termuat. Muat ulang halaman.")); return; }
  stop();
  const list = app.handwritingList;
  const index = (indexCache ??= buildCharIndex(list, app.vocab));
  const meaningOf = (w) => meaning(w, app.idData, 3) ?? "";
  const levels = [...new Set(list.map((x) => x.level))].sort((a, b) => a - b);
  if (!st.ch || !index.has(st.ch)) st.ch = (list.find((x) => !store.writingRecord(x.char)?.ok) ?? list[0]).char;

  // ---------- picker ----------
  const search = h("input", { type: "search", placeholder: "Cari hanzi, pinyin, atau arti", "aria-label": "Cari hanzi", value: st.query, style: "margin:0" });
  const chips = h("div", { class: "chips", role: "group", "aria-label": "Filter level" });
  const grid = h("div", { class: "hzgrid", role: "list" });
  const prog = h("p", { class: "hint" });
  const todoBox = h("input", { type: "checkbox", checked: st.todo, onchange: (e) => { st.todo = e.target.checked; fillGrid(); } });
  const filtered = () => filterChars(list, index, { levels: [...st.levels], query: st.query, meaningOf, mastery: st.todo ? (c) => !store.writingRecord(c)?.ok : null });
  function fillGrid() {
    const rows = filtered();
    const p = progressOf(store, list);
    prog.textContent = `${rows.length.toLocaleString("id-ID")} hanzi ditampilkan · ${p.ok} dikuasai, ${p.tried} pernah dilatih dari ${p.total.toLocaleString("id-ID")}`;
    grid.replaceChildren(...rows.map((x) => {
      const r = store.writingRecord(x.char);
      return h("button", { type: "button", role: "listitem", class: `hz${x.char === st.ch ? " on" : ""}${r?.ok ? " done" : r ? " tried" : ""}`, lang: "zh-Hans", "data-ch": x.char,
        "aria-label": `${x.char}${r?.ok ? ", dikuasai" : ""}`, "aria-current": x.char === st.ch ? "true" : null, onclick: () => choose(x.char) }, x.char);
    }));
    if (!rows.length) grid.append(h("p", { class: "empty" }, "Tidak ada hanzi yang cocok."));
  }
  const fillChips = () => chips.replaceChildren(...levels.map((l) =>
    h("button", { type: "button", class: "chip-btn", "aria-pressed": String(st.levels.has(l)), onclick: () => { st.levels.has(l) ? st.levels.delete(l) : st.levels.add(l); fillChips(); fillGrid(); } }, levelLabel(l))));
  search.addEventListener("input", () => { st.query = search.value; fillGrid(); });

  // ---------- practice area ----------
  const status = h("p", { class: "hint wstatus", "aria-live": "polite" });
  const wrap = h("div", { class: "wpad" });
  const info = h("div", { class: "winfo" });
  const controls = h("div", { class: "wctl" });
  const body = h("div", { class: "wmain" });

  function choose(ch) {
    st.ch = ch;
    for (const b of grid.querySelectorAll(".hz.on")) { b.classList.remove("on"); b.removeAttribute("aria-current"); }
    const b = grid.querySelector(`[data-ch="${ch}"]`);
    b?.classList.add("on"); b?.setAttribute("aria-current", "true");
    b?.scrollIntoView?.({ block: "nearest" });
    setup();
  }
  function step(dir) {
    const rows = filtered();
    if (!rows.length) return;
    const i = rows.findIndex((x) => x.char === st.ch);
    choose(rows[(i + dir + rows.length) % rows.length].char);
  }
  function finish(rec) {
    store.saveWriting(st.ch, nextRecord(store.writingRecord(st.ch), rec));
    refreshBadge();
    const b = grid.querySelector(`[data-ch="${st.ch}"]`);
    if (b) b.className = `hz on${store.writingRecord(st.ch).ok ? " done" : " tried"}`;
    prog.textContent = prog.textContent.replace(/·.*dari/, `· ${progressOf(store, list).ok} dikuasai, ${progressOf(store, list).tried} pernah dilatih dari`);
  }

  const badge = h("span", { class: "hint" });
  function refreshBadge() {
    const r = store.writingRecord(st.ch);
    badge.textContent = r ? `${r.ok ? "Dikuasai ✓ · " : ""}dilatih ${r.n}×${r.best != null ? ` · terbaik: ${r.best} salah` : ""}` : "Belum pernah dilatih";
  }
  function fillInfo(data) {
    const e = index.get(st.ch);
    const mean = e.single ? meaning(e.single, app.idData, 3) : null;
    info.replaceChildren(
      h("div", { class: "winfo-head" },
        h("div", {}, h("span", { class: "wbig", lang: "zh-Hans" }, st.ch), " ", h("strong", {}, charPinyin(e) || "—")),
        btn("🔊", () => speak(st.ch), "btn", { "aria-label": `Dengar ${st.ch}` })),
      mean ? h("p", { class: "gloss" }, mean) : null,
      h("p", { class: "hint" }, data ? `${data.strokes.length} goresan` : "", e.words.length ? ` · dipakai dalam: ${e.words.map((w) => `${w.word} (${w.pinyin})`).join(", ")}` : ""),
      badge);
    refreshBadge();
  }

  // ---------- (re)build the writer for the current character and mode ----------
  async function setup() {
    stop();
    wrap.replaceChildren();
    controls.replaceChildren();
    status.textContent = "";
    const size = Math.max(200, Math.min(360, Math.floor(body.clientWidth || 340)));
    wrap.style.width = wrap.style.height = `${size}px`;
    const ch = st.ch;
    let data;
    try { data = await getData(ch); } catch {
      status.textContent = "Data goresan hanzi ini tidak bisa dimuat. Periksa koneksi lalu coba lagi.";
      fillInfo(null);
      return;
    }
    if (ch !== st.ch) return;                                     // user moved on while loading
    fillInfo(data);
    const layer = h("div", { class: "wlayer" });
    const over = sv("svg", { class: "wover", width: size, height: size, viewBox: `0 0 ${size} ${size}` });
    wrap.append(guide(size), layer, over);
    const mode = st.mode;
    const quiz = mode === "tebal" && st.check;
    const writer = window.HanziWriter.create(layer, ch, {
      width: size, height: size, padding: PAD,
      charDataLoader: (_c, ok, fail) => getData(ch).then(ok, fail),
      showCharacter: mode === "tebal" && !quiz, showOutline: mode === "lihat" || quiz,
      strokeColor: mode === "tebal" ? rgba(st.opacity) : mode === "bebas" ? rgba(0.4) : rgba(1),
      outlineColor: mode === "lihat" ? rgba(0.14) : rgba(st.opacity),
      highlightColor: cssVar("--accent", "#d9501f"), drawingColor: cssVar("--brand", "#2a5846"), drawingWidth: 5,
      strokeAnimationSpeed: st.speed, delayBetweenStrokes: 350 / st.speed, strokeFadeDuration: 250,
    });
    live = { writer, onResize: () => { if (Math.abs((body.clientWidth || size) - size) > 24 && size < 360) setup(); } };
    window.addEventListener("resize", live.onResize);
    const num = (upTo) => { over.querySelector(".nums")?.remove(); if (st.numbers && upTo > 0) over.append(numberBadges(data, size, upTo)); };

    if (mode === "lihat") {
      over.classList.add("passive");
      let paused = false, stepIdx = 0;
      const pauseBtn = btn("⏸ Jeda", () => { paused ? writer.resumeAnimation() : writer.pauseAnimation(); paused = !paused; pauseBtn.textContent = paused ? "▶ Lanjut" : "⏸ Jeda"; });
      const play = () => {
        paused = false; pauseBtn.textContent = "⏸ Jeda"; stepIdx = 0; num(0);
        status.textContent = "Menggambar…";
        writer.hideCharacter({ duration: 0 });
        writer.animateCharacter({ onComplete: () => { status.textContent = `${data.strokes.length} goresan, urutan seperti di atas.`; num(data.strokes.length); } });
      };
      const stepOne = () => {
        if (stepIdx === 0 || stepIdx >= data.strokes.length) { writer.hideCharacter({ duration: 0 }); stepIdx = 0; num(0); }
        const i = stepIdx++;
        writer.animateStroke(i, { onComplete: () => { num(i + 1); status.textContent = `Goresan ${i + 1} dari ${data.strokes.length}`; } });
      };
      controls.append(btn("↻ Putar ulang", play, "btn primary"), pauseBtn, btn("Goresan berikutnya ➜", stepOne),
        h("div", { class: "seg", role: "group", "aria-label": "Kecepatan" }, ...[0.5, 1, 2].map((v) => h("label", {}, h("input", { type: "radio", name: "wspeed", checked: st.speed === v, onchange: () => { st.speed = v; setup(); } }), h("span", {}, `${v}×`)))),
        h("label", { class: "inline" }, h("input", { type: "checkbox", checked: st.numbers, onchange: (e) => { st.numbers = e.target.checked; num(over.querySelector(".nums") ? data.strokes.length : 0); } }), " Nomor goresan"));
      play();
      return;
    }

    if (quiz) {                                                    // per-stroke checking by Hanzi Writer
      over.classList.add("passive");
      let hits = 0;
      const total = data.strokes.length;
      const say = (extra = "") => { status.textContent = `Goresan ${Math.min(hits + 1, total)} dari ${total}${extra}`; };
      const run = () => {
        hits = 0; say();
        writer.quiz({
          leniency: 1.2, showHintAfterMisses: 3, highlightOnComplete: true,
          onCorrectStroke: () => { hits++; hits < total ? say() : null; },
          onMistake: (s) => say(` · salah ${s.totalMistakes}×`),
          onComplete: (s) => {
            status.textContent = s.totalMistakes <= Math.max(1, Math.floor(total / 3)) ? `Bagus! Selesai dengan ${s.totalMistakes} kesalahan ✓` : `Selesai dengan ${s.totalMistakes} kesalahan. Coba lagi untuk menguasainya.`;
            finish({ strokes: total, mistakes: s.totalMistakes });
          },
        });
      };
      controls.append(btn("↻ Ulangi", () => { writer.cancelQuiz(); run(); }));
      run();
    } else {                                                       // free drawing over the faint (or no) character
      const finishBtn = btn(mode === "bebas" ? "✓ Cek" : "✓ Selesai", () => {
        if (!pad.count) { status.textContent = "Tulis dulu sesuatu di kotak."; return; }
        if (mode === "bebas") {
          writer.showCharacter({ duration: 300 });
          layer.classList.add("reveal");
          status.textContent = "Bandingkan tulisanmu (tinta) dengan hanzi yang benar (bayangan). Urutan goresan: tekan ▶ Animasi.";
        } else status.textContent = "Mantap! Latihan dicatat. Coba lagi atau lanjut ke hanzi berikutnya.";
        finish({ strokes: data.strokes.length });
      }, "btn primary");
      const pad = makePad(over, size, (n) => { status.textContent = n ? `${n} goresan` : ""; finishBtn.disabled = n === 0; });
      finishBtn.disabled = true;
      controls.append(btn("↶ Urungkan", () => pad.undo()), btn("🗑 Hapus", () => { pad.clear(); layer.classList.remove("reveal"); if (mode === "bebas") writer.hideCharacter({ duration: 0 }); }), finishBtn);
      if (mode === "bebas") controls.append(btn("▶ Animasi", () => { layer.classList.add("reveal"); writer.hideCharacter({ duration: 0 }); writer.animateCharacter(); }));
      status.textContent = mode === "bebas" ? "Tulis hanzi dari ingatan di kotak, lalu tekan Cek." : "Tebalkan hanzi samar di kotak dengan jari atau mouse.";
    }
    if (mode === "tebal") {
      const slider = h("input", { type: "range", min: 5, max: 60, value: Math.round(st.opacity * 100), "aria-label": "Ketebalan hanzi samar", oninput: (e) => {
        st.opacity = e.target.value / 100;
        writer.updateColor(quiz ? "outlineColor" : "strokeColor", rgba(st.opacity), { duration: 0 });
      } });
      controls.append(h("label", { class: "inline" }, "Samar ", slider, " Jelas"));
    }
  }

  // ---------- layout ----------
  const modeSeg = h("div", { class: "seg", role: "group", "aria-label": "Mode" }, ...MODES.map(([v, label]) =>
    h("label", {}, h("input", { type: "radio", name: "wmode", checked: st.mode === v, onchange: () => { st.mode = v; syncCheck(); setup(); } }), h("span", {}, label))));
  const checkBox = h("input", { type: "checkbox", checked: st.check, onchange: (e) => { st.check = e.target.checked; setup(); } });
  const checkLbl = h("label", { class: "inline" }, checkBox, " Periksa tiap goresan");
  const syncCheck = () => { checkLbl.hidden = st.mode !== "tebal"; };
  syncCheck();

  body.append(
    h("div", { class: "wtop" }, modeSeg, checkLbl),
    wrap,
    h("div", { class: "wctl" }, btn("‹ Sebelumnya", () => step(-1)), btn("Berikutnya ›", () => step(1))),
    controls, status, info);

  app.render(
    h("div", { class: "pagehead" }, h("div", {}, h("h2", {}, "Belajar menulis hanzi"), h("p", { class: "hint" }, "1.200 hanzi tulis resmi HSK 3.0: lihat urutan goresan, tebalkan hanzi samar, lalu tulis dari ingatan."))),
    h("div", { class: "split write" },
      h("div", { class: "panel" }, body),
      h("div", { class: "panel wpick" }, search, chips, h("label", { class: "inline" }, todoBox, " Belum dikuasai saja"), prog, grid)));
  fillChips(); fillGrid();
  requestAnimationFrame(() => { setup(); });
}
