// Progress & weakness analytics over the local event log. Pure functions, no DOM.
import { todayKey } from "./store.js";
import { shuffle } from "./deck.js";
import { withTiles } from "./practice.js";

const DAY = 86_400_000;

export function wordIdOfQuestion(q) {
  const m = /^[cwo](\d+)$/.exec(q.id ?? "");
  return m ? Number(m[1]) : null;
}

export function accuracy(events) {
  const n = events.length;
  const ok = events.reduce((a, e) => a + (e.ok ? 1 : 0), 0);
  return { n, ok, pct: n ? Math.round((100 * ok) / n) : null };
}

export function groupAccuracy(events, keyFn) {
  const g = {};
  for (const e of events) {
    const k = keyFn(e);
    if (k == null) continue;
    (g[k] ||= []).push(e);
  }
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, accuracy(v)]));
}

/** Last `days` calendar days (oldest first) with answered count and accuracy. */
export function dailySeries(events, days = 14, now = Date.now()) {
  const byDay = {};
  for (const e of events) (byDay[todayKey(e.t)] ||= []).push(e);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = todayKey(now - i * DAY);
    const a = accuracy(byDay[key] || []);
    out.push({ date: key, n: a.n, ok: a.ok, pct: a.pct });
  }
  return out;
}

/** Consecutive active days ending today (or yesterday if today has no activity yet). */
export function streak(activeDays, now = Date.now()) {
  const set = new Set(activeDays);
  let day = set.has(todayKey(now)) ? now : now - DAY;
  let n = 0;
  while (set.has(todayKey(day))) { n++; day -= DAY; }
  return n;
}

export function activeDayKeys(events, reviewLog = {}) {
  return [...new Set([...events.map((e) => todayKey(e.t)), ...Object.keys(reviewLog).filter((k) => reviewLog[k] > 0)])];
}

/** Skills that Latihan has questions for (speaking is practised only inside lessons). */
const practiceable = (events) => events.filter((e) => e.s !== "speaking");

/** Types/skills ordered weakest first, only with enough answers to mean something. */
export function weakest(events, keyFn, minN = 5) {
  return Object.entries(groupAccuracy(events, keyFn))
    .filter(([, a]) => a.n >= minN)
    .map(([key, a]) => ({ key, ...a }))
    .sort((a, b) => a.pct - b.pct || b.n - a.n);
}

/** Words answered wrong, worst first. `recovered` = the latest answer for that word was right. */
export function weakWords(events) {
  const w = {};
  for (const e of events) {
    if (e.w == null || e.un) continue; // unanswered (time ran out) says nothing about the word
    const r = (w[e.w] ||= { id: e.w, n: 0, wrong: 0, last: 0, lastOk: true });
    r.n++;
    if (!e.ok) r.wrong++;
    if (e.t >= r.last) { r.last = e.t; r.lastOk = !!e.ok; }
  }
  return Object.values(w)
    .filter((r) => r.wrong > 0)
    .map((r) => ({ ...r, rate: Math.round((100 * r.wrong) / r.n), recovered: r.lastOk }))
    .sort((a, b) => Number(a.recovered) - Number(b.recovered) || b.wrong - a.wrong || b.rate - a.rate || a.id - b.id);
}

const POS_LABEL = { 名: "Kata benda", 动: "Kata kerja", 形: "Kata sifat", 副: "Kata keterangan", 数: "Bilangan", 量: "Penggolong", 代: "Kata ganti", 介: "Preposisi", 连: "Konjungsi", 助: "Partikel" };
export function mainPos(pos) {
  const tok = (String(pos || "").match(/（[^）]*）|[^、（）]+/g) || []).find((t) => !t.startsWith("（"));
  return tok ? (POS_LABEL[tok] ?? tok) : null;
}

export function posAccuracy(events, vocabById) {
  return groupAccuracy(events, (e) => (e.w != null && vocabById[e.w] ? mainPos(vocabById[e.w].pos) : null));
}

/** Per level: attempts oldest first with the change versus the previous attempt of that level. */
export function examTrend(exams) {
  const byLevel = {};
  for (const x of [...exams].sort((a, b) => a.t - b.t)) {
    const list = (byLevel[x.level] ||= []);
    const prev = list[list.length - 1];
    list.push({ ...x, delta: prev ? x.pct - prev.pct : null });
  }
  return byLevel;
}

/** Cards the learner keeps forgetting (many lapses, or low ease after several reviews). */
export function leeches(cards, vocabById, { minLapses = 2, limit = 20 } = {}) {
  return Object.values(cards)
    .filter((c) => c.lapses >= minLapses || (c.reps >= 4 && c.ease < 1.8))
    .map((c) => ({ id: c.id, lapses: c.lapses, ease: Math.round(c.ease * 100) / 100, word: vocabById[c.id] }))
    .filter((c) => c.word)
    .sort((a, b) => b.lapses - a.lapses || a.ease - b.ease)
    .slice(0, limit);
}

/** Practice set aimed at weaknesses: questions on weak words first, then the weakest skill. */
export function buildWeakSet(questions, events, { count = 10, levels = null } = {}, rand = Math.random) {
  const ok = (q) => !levels || levels.includes(q.level);
  const weak = weakWords(events).filter((w) => !w.recovered).map((w) => w.id);
  const weakSet = new Set(weak);
  const rank = new Map(weak.map((id, i) => [id, i]));
  const onWeakWords = questions.filter((q) => ok(q) && weakSet.has(wordIdOfQuestion(q)));
  onWeakWords.sort((a, b) => rank.get(wordIdOfQuestion(a)) - rank.get(wordIdOfQuestion(b)));
  const picked = [];
  const seen = new Set();
  const take = (q) => {
    const key = q.stem ?? q.id;
    if (seen.has(key) || picked.length >= count) return;
    seen.add(key);
    picked.push(q);
  };
  const perWord = new Set();
  for (const q of onWeakWords) { const w = wordIdOfQuestion(q); if (!perWord.has(w)) { perWord.add(w); take(q); } }
  if (picked.length < count) {
    const skills = weakest(practiceable(events), (e) => e.s, 3);
    const skill = skills[0]?.key;
    for (const q of shuffle(questions.filter((q) => ok(q) && (!skill || q.skill === skill)), rand)) take(q);
  }
  if (picked.length < count) for (const q of shuffle(questions.filter(ok), rand)) take(q);
  return picked.map((q) => withTiles(q.options ? { ...q, options: shuffle(q.options, rand) } : q, questions, rand));   // tiles/pieces for write and order items
}

/** Plain-language findings with an optional action the UI can turn into a button. */
export function recommendations({ events, exams, cards, vocabById }) {
  const recs = [];
  if (events.length < 10) {
    recs.push({ kind: "start", text: "Data belum cukup. Kerjakan beberapa latihan soal (minimal 10 soal) agar kelemahan bisa dianalisis." });
    return recs;
  }
  const skills = weakest(practiceable(events), (e) => e.s, 5);
  const label = { reading: "Membaca", writing: "Menulis", listening: "Mendengar" };
  if (skills.length) {
    const w = skills[0];
    if (w.pct < 80) recs.push({ kind: "skill", skill: w.key, text: `${label[w.key]} adalah keterampilan terlemah (${w.pct}% dari ${w.n} soal). Perbanyak latihan ${label[w.key]}.` });
    else recs.push({ kind: "ok", text: `Semua keterampilan di atas 80%. Terus pertahankan, atau coba level yang lebih tinggi.` });
  }
  const words = weakWords(events).filter((w) => !w.recovered && vocabById[w.id]).slice(0, 5);
  if (words.length) recs.push({ kind: "words", text: `Kata yang sering salah: ${words.map((w) => vocabById[w.id].word).join("、")}.`, action: "weak-set" });
  const l = leeches(cards || {}, vocabById);
  if (l.length) recs.push({ kind: "leech", text: `${l.length} kata di hafalan berkali-kali terlupa (mis. ${l.slice(0, 3).map((x) => x.word.word).join("、")}). Ulangi dengan kalimat contoh.` });
  const trend = examTrend(exams || {});
  for (const [lvl, list] of Object.entries(trend)) {
    if (list.length >= 2) {
      const d = list[list.length - 1].pct - list[0].pct;
      recs.push({ kind: "exam", text: `Simulasi ujian HSK ${lvl}: ${d >= 0 ? "naik" : "turun"} ${Math.abs(d)} poin (${list[0].pct}% → ${list[list.length - 1].pct}%) dalam ${list.length} percobaan.` });
    }
  }
  return recs;
}
