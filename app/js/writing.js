// Menulis: pure helpers for the handwriting tab (no DOM). The character list is the official handwriting list.

/** File of a character's stroke data (named by hex code point so URLs stay ASCII). */
export const strokeFile = (ch) => `${ch.codePointAt(0).toString(16)}.json`;

/** char -> { single: word whose form is exactly this char | null, words: up to 3 words that contain it (shortest, lowest level first) }. */
export function buildCharIndex(handwriting, vocab) {
  const want = new Set(handwriting.map((x) => x.char));
  const idx = new Map([...want].map((c) => [c, { single: null, words: [] }]));
  for (const w of vocab) {
    for (const c of new Set([...w.word])) {
      const e = idx.get(c);
      if (!e) continue;
      if (w.word === c) e.single ??= w;
      else e.words.push(w);
    }
  }
  for (const e of idx.values()) {
    e.words.sort((a, b) => a.word.length - b.word.length || a.level - b.level || a.id - b.id);
    e.words = e.words.slice(0, 3);
  }
  return idx;
}

/** Pinyin shown for a character: the single-character word if there is one, else "" (some chars only occur in compounds). */
export const charPinyin = (e) => e?.single?.pinyin ?? "";

const stripTone = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filter the handwriting list. `levels` empty = all; `query` matches the hanzi, the pinyin (tones optional) or an Indonesian/English meaning. */
export function filterChars(list, index, { levels = [], query = "", mastery = null, meaningOf = () => "" } = {}) {
  const q = stripTone(query.trim());
  const lv = new Set(levels);
  return list.filter((x) => {
    if (lv.size && !lv.has(x.level)) return false;
    if (mastery && !mastery(x.char)) return false;
    if (!q) return true;
    if (x.char.includes(query.trim())) return true;
    const e = index.get(x.char);
    const hay = [e?.single?.pinyin, e?.single && meaningOf(e.single), ...(e?.words ?? []).map((w) => w.pinyin)].filter(Boolean).map(stripTone);
    return hay.some((s) => s.includes(q));
  });
}

/** A run counts as mastered when mistakes stay within a third of the stroke count (at least one allowed). */
export const isMastered = (strokes, mistakes) => mistakes <= Math.max(1, Math.floor(strokes / 3));

/** Record of one character in store.data.writing: { n: finished runs, best: fewest mistakes | null, ok: 0|1, t }. */
export function nextRecord(prev, { strokes = 0, mistakes = null } = {}, now = Date.now()) {
  const r = { n: (prev?.n ?? 0) + 1, best: prev?.best ?? null, ok: prev?.ok ?? 0, t: now };
  if (mistakes != null) {
    r.best = r.best == null ? mistakes : Math.min(r.best, mistakes);
    if (isMastered(strokes, mistakes)) r.ok = 1;
  }
  return r;
}

export const progressOf = (store, list) => {
  let ok = 0, tried = 0;
  for (const x of list) { const r = store.writingRecord(x.char); if (r?.ok) ok++; if (r) tried++; }
  return { ok, tried, total: list.length };
};

/** Distance between two points / simplified polyline (used for the point-drawing overlay: skip points closer than `min`). */
export const farEnough = (a, b, min = 1.5) => Math.hypot(a[0] - b[0], a[1] - b[1]) >= min;

/** SVG path for a freehand stroke (quadratic smoothing through midpoints); a single tap becomes a dot. */
export function strokePath(pts) {
  if (!pts.length) return "";
  const f = (n) => Math.round(n * 10) / 10;
  if (pts.length === 1) { const [x, y] = pts[0]; return `M ${f(x)} ${f(y)} l 0.01 0`; }
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[i + 1];
    d += ` Q ${f(x)} ${f(y)} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L ${f(lx)} ${f(ly)}`;
}
