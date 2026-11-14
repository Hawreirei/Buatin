import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSet, check, summarize, availableLevels, questionKey, withTiles, setLookalikes } from "../../app/js/practice.js";
import { shuffledBank, checkOrder } from "../../app/js/order.js";
import { Store } from "../../app/js/store.js";

const Q = JSON.parse(readFileSync(new URL("../../data/hsk3/questions.json", import.meta.url), "utf-8"));
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test("question bank covers 3 skills and levels 1-3", () => {
  assert.deepEqual(availableLevels(Q), [1, 2, 3]);
  assert.deepEqual([...new Set(Q.map((q) => q.skill))].sort(), ["listening", "reading", "writing"]);
});

test("buildSet: mixed set has every skill, no repeated stems, respects level and count", () => {
  const set = buildSet(Q, { skills: ["reading", "writing", "listening"], levels: [1], count: 12 });
  assert.equal(set.length, 12);
  assert.ok(set.every((q) => q.level === 1));
  assert.equal(new Set(set.map(questionKey)).size, 12);
  assert.deepEqual([...new Set(set.map((q) => q.skill))].sort(), ["listening", "reading", "writing"]);
});

test("buildSet: single skill and level 2, options keep the answer", () => {
  const set = buildSet(Q, { skills: ["reading"], levels: [2], count: 10 });
  assert.equal(set.length, 10);
  for (const q of set) {
    assert.equal(q.skill, "reading");
    assert.ok(q.options.some((o) => (o.word ?? o.zh ?? o.key) === q.answer), q.id);
  }
});

test("buildSet: returns fewer when the pool is small, and nothing for empty levels", () => {
  const pool = Q.filter((q) => q.skill === "listening" && q.level === 2);
  const all = buildSet(Q, { skills: ["listening"], levels: [2], count: 5000 });
  assert.equal(all.length, new Set(pool.map(questionKey)).size);   // everything available, no repeats
  assert.equal(buildSet(Q, { skills: ["reading"], levels: [], count: 5 }).length, 0);
});

test("check: cloze, listening and writing (IME-style input)", () => {
  const c = Q.find((q) => q.type === "cloze_wordbank");
  assert.equal(check(c, c.options.find((o) => o.word === c.answer)).correct, true);
  assert.equal(check(c, c.options.find((o) => o.word !== c.answer)).correct, false);
  const l = Q.find((q) => q.type === "audio_question_pick_answer");
  assert.equal(check(l, l.options.find((o) => o.zh === l.answer)).correct, true);
  assert.equal(check(l, l.options.find((o) => o.zh !== l.answer)).correct, false);
  const w = Q.find((q) => q.type === "write_hanzi_from_pinyin");
  assert.equal(check(w, w.answer).correct, true);
  assert.equal(check(w, ` ${w.answer} `).correct, true);
  assert.equal(check(w, "").correct, false);
  assert.equal(check(w, "abc").correct, false);
  assert.equal(check(w, undefined).correct, false);
});

test("summarize and store.recordAnswer", () => {
  const r = [{ q: { skill: "reading" }, correct: true }, { q: { skill: "reading" }, correct: false }, { q: { skill: "writing" }, correct: true }];
  const s = summarize(r);
  assert.deepEqual([s.total, s.correct, s.pct], [3, 2, 67]);
  assert.deepEqual(s.by.reading, { total: 2, correct: 1 });
  const st = new Store(mem());
  st.recordAnswer("reading", true); st.recordAnswer("reading", false);
  assert.deepEqual(new Store(st.storage).data.practice.reading, { n: 2, ok: 1 });
});

test("store keeps an event log (capped), exam records, and survives export/import", async () => {
  const { Store, MAX_EVENTS } = await import("../../app/js/store.js");
  const st = new Store(mem());
  st.recordAnswer("reading", true, { l: 1, ty: "cloze_wordbank", id: "c5", w: 5, ms: 1200 });
  st.recordAnswer("reading", false, { l: 1, ty: "cloze_wordbank", id: "c6", w: 6, k: "exam", un: true });
  st.recordAnswer("writing", true);                       // no meta: counter only
  assert.equal(st.events.length, 2);
  assert.deepEqual([st.events[0].ok, st.events[0].w, st.events[0].ms], [1, 5, 1200]);
  assert.deepEqual([st.events[1].k, st.events[1].un], ["exam", 1]);
  st.recordExam({ t: 1, level: 1, pct: 50, sections: [] });
  const other = new Store(mem());
  other.import(st.export());
  assert.equal(other.events.length, 2);
  assert.equal(other.exams.length, 1);
  for (let i = 0; i < MAX_EVENTS + 50; i++) st.recordAnswer("reading", true, { id: "c1", w: 1 });
  assert.equal(st.events.length, MAX_EVENTS);
});

test("withTiles gives write items a tile bank containing the answer", () => {
  const w = Q.find((q) => q.type === "write_hanzi_from_pinyin");
  const t = withTiles(w, Q);
  assert.equal(t.tiles.length, 6);
  assert.equal(new Set(t.tiles).size, 6);
  assert.ok(t.tiles.includes(w.answer));
  assert.equal(t.choices.length, 4);
  assert.ok(t.choices.includes(w.answer) && t.choices.every((x) => t.tiles.includes(x)));
  const c = Q.find((q) => q.type === "cloze_wordbank");
  assert.equal(withTiles(c, Q), c);
});

test("withTiles prefers look-alike characters as distractors", () => {
  const w = Q.find((q) => q.type === "write_hanzi_from_pinyin");
  const sim = ["甲", "乙", "丙", "丁", "戊", "己"];
  setLookalikes({ [w.answer]: sim });
  const t = withTiles(w, Q);
  setLookalikes({});
  assert.equal(t.tiles.filter((x) => sim.includes(x)).length, 5);
  assert.equal(t.choices.filter((x) => sim.includes(x)).length, 3);
});

test("order_sentence: buildSet adds a shuffled bank that is never the answer; check needs the full sentence", () => {
  const set = buildSet(Q, { skills: ["writing"], levels: [1, 2, 3], count: 60 });
  const orders = set.filter((q) => q.type === "order_sentence");
  assert.ok(orders.length > 0);
  for (const q of orders) {
    assert.deepEqual([...q.bank].sort(), [...q.tokens].sort(), q.id);       // same pieces
    assert.notEqual(q.bank.join(""), q.answer, q.id);                       // already-correct order is never shown
    assert.equal(check(q, q.tokens).correct, true);
    assert.equal(check(q, q.tokens.slice(0, -1)).correct, false);           // incomplete
    assert.equal(check(q, [...q.tokens].reverse()).correct, false);
    assert.equal(check(q, []).correct, false);
    assert.equal(check(q, undefined).correct, false);
  }
});

test("order: shuffledBank keeps pieces, differs from the answer; alternatives are accepted", () => {
  const t = ["我", "想", "吃", "饭", "。"];
  for (let i = 0; i < 50; i++) { const b = shuffledBank(t); assert.deepEqual([...b].sort(), [...t].sort()); assert.notEqual(b.join(""), t.join("")); }
  assert.deepEqual(shuffledBank(["好", "好"]), ["好", "好"]);                 // identical pieces: nothing to differ
  const q = { answer: "我想吃饭。", alt: ["吃饭我想。"], tokens: t };
  assert.equal(checkOrder(q, ["吃饭", "我想", "。"]).correct, true);
  assert.equal(checkOrder(q, ["饭", "我", "想", "吃", "。"]).correct, false);
});
