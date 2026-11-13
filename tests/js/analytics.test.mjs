import test from "node:test";
import assert from "node:assert/strict";
import { accuracy, dailySeries, streak, activeDayKeys, weakest, weakWords, posAccuracy, examTrend, leeches, buildWeakSet, recommendations, wordIdOfQuestion, mainPos } from "../../app/js/analytics.js";
import { todayKey } from "../../app/js/store.js";

const NOW = new Date(2026, 10, 13, 12, 0, 0).getTime();
const D = 86_400_000;
const ev = (daysAgo, s, ok, extra = {}) => ({ t: NOW - daysAgo * D, k: "practice", s, l: 1, ty: s === "reading" ? "cloze_wordbank" : "audio_question_pick_answer", id: "x", w: null, ok: ok ? 1 : 0, ms: 5000, ...extra });

test("accuracy and dailySeries", () => {
  assert.deepEqual(accuracy([]), { n: 0, ok: 0, pct: null });
  assert.deepEqual(accuracy([ev(0, "reading", 1), ev(0, "reading", 0), ev(0, "reading", 1)]), { n: 3, ok: 2, pct: 67 });
  const s = dailySeries([ev(0, "reading", 1), ev(0, "reading", 0), ev(2, "reading", 1)], 5, NOW);
  assert.equal(s.length, 5);
  assert.equal(s[4].date, todayKey(NOW));
  assert.deepEqual([s[4].n, s[4].pct], [2, 50]);
  assert.deepEqual([s[2].n, s[2].pct], [1, 100]);
  assert.equal(s[3].pct, null);
});

test("streak counts consecutive days, tolerating an empty today", () => {
  const keys = [0, 1, 2, 4].map((d) => todayKey(NOW - d * D));
  assert.equal(streak(keys, NOW), 3);
  assert.equal(streak([1, 2].map((d) => todayKey(NOW - d * D)), NOW), 2);
  assert.equal(streak([3].map((d) => todayKey(NOW - d * D)), NOW), 0);
  assert.deepEqual(new Set(activeDayKeys([ev(0, "reading", 1)], { [todayKey(NOW - D)]: 5, [todayKey(NOW - 2 * D)]: 0 })), new Set([todayKey(NOW), todayKey(NOW - D)]));
});

test("weakest needs minimum evidence and sorts by accuracy", () => {
  const events = [
    ...Array.from({ length: 6 }, (_, i) => ev(0, "listening", i < 2)),   // 33%
    ...Array.from({ length: 6 }, (_, i) => ev(0, "reading", i < 5)),     // 83%
    ...Array.from({ length: 3 }, () => ev(0, "writing", 0)),             // too few
  ];
  const w = weakest(events, (e) => e.s, 5);
  assert.deepEqual(w.map((x) => x.key), ["listening", "reading"]);
  assert.equal(w[0].pct, 33);
});

test("weakWords ranks unrecovered words first", () => {
  const events = [
    ev(5, "reading", 0, { w: 10 }), ev(1, "reading", 0, { w: 10 }),      // wrong twice, still wrong
    ev(4, "reading", 0, { w: 20 }), ev(1, "reading", 1, { w: 20 }),      // wrong then recovered
    ev(2, "reading", 1, { w: 30 }),                                      // never wrong
  ];
  const w = weakWords(events);
  assert.deepEqual(w.map((x) => [x.id, x.wrong, x.recovered]), [[10, 2, false], [20, 1, true]]);
});

test("posAccuracy, mainPos and wordIdOfQuestion", () => {
  assert.equal(mainPos("动、（名）"), "Kata kerja");
  assert.equal(mainPos(""), null);
  assert.equal(wordIdOfQuestion({ id: "c391" }), 391);
  assert.equal(wordIdOfQuestion({ id: "l7" }), null);
  const v = { 1: { pos: "动" }, 2: { pos: "名" } };
  const a = posAccuracy([ev(0, "reading", 1, { w: 1 }), ev(0, "reading", 0, { w: 1 }), ev(0, "reading", 1, { w: 2 }), ev(0, "reading", 1)], v);
  assert.deepEqual(a["Kata kerja"], { n: 2, ok: 1, pct: 50 });
  assert.deepEqual(a["Kata benda"], { n: 1, ok: 1, pct: 100 });
});

test("examTrend computes deltas per level", () => {
  const t = examTrend([{ t: 3, level: 1, pct: 70 }, { t: 1, level: 1, pct: 50 }, { t: 2, level: 2, pct: 40 }]);
  assert.deepEqual(t[1].map((x) => [x.pct, x.delta]), [[50, null], [70, 20]]);
  assert.deepEqual(t[2].map((x) => x.delta), [null]);
});

test("leeches pick forgotten cards", () => {
  const cards = { 1: { id: 1, lapses: 3, ease: 2.1, reps: 9 }, 2: { id: 2, lapses: 0, ease: 1.5, reps: 6 }, 3: { id: 3, lapses: 1, ease: 2.5, reps: 2 } };
  const l = leeches(cards, { 1: { word: "A" }, 2: { word: "B" }, 3: { word: "C" } });
  assert.deepEqual(l.map((x) => x.id), [1, 2]);
});

test("buildWeakSet prefers questions of weak words, no duplicate stems, honours count/levels", () => {
  const qs = [
    { id: "c10", skill: "reading", level: 1, stem: "a", options: [{ word: "x" }, { word: "y" }] },
    { id: "w10", skill: "writing", level: 1, stem: "b" },
    { id: "c11", skill: "reading", level: 1, stem: "c", options: [] },
    { id: "c12", skill: "reading", level: 2, stem: "d", options: [] },
    { id: "l1", skill: "listening", level: 1, audio: "z", options: [{ zh: "1" }] },
  ];
  const events = [ev(1, "reading", 0, { w: 10 }), ev(1, "reading", 0, { w: 10 })];
  const set = buildWeakSet(qs, events, { count: 2, levels: [1] }, () => 0.1);
  assert.equal(set.length, 2);
  assert.equal(wordIdOfQuestion(set[0]), 10);
  const all = buildWeakSet(qs, events, { count: 10, levels: [1] });
  assert.ok(all.every((q) => q.level === 1));
  assert.equal(new Set(all.map((q) => q.stem ?? q.id)).size, all.length);
});

test("recommendations: not enough data, weakest skill, weak words, exam trend", () => {
  assert.equal(recommendations({ events: [], exams: [], cards: {}, vocabById: {} })[0].kind, "start");
  const events = [
    ...Array.from({ length: 8 }, (_, i) => ev(1, "listening", i < 3)),
    ...Array.from({ length: 6 }, (_, i) => ev(1, "reading", i < 6, { w: i })),
    ev(0, "reading", 0, { w: 99 }),
  ];
  const recs = recommendations({ events, exams: [{ t: 1, level: 1, pct: 50 }, { t: 2, level: 1, pct: 65 }], cards: {}, vocabById: { 99: { word: "爱" } } });
  assert.equal(recs.find((r) => r.kind === "skill").skill, "listening");
  assert.match(recs.find((r) => r.kind === "words").text, /爱/);
  assert.match(recs.find((r) => r.kind === "exam").text, /naik 15 poin/);
});

test("unanswered exam items do not mark a word as weak", () => {
  const events = [ev(1, "reading", 0, { w: 7, un: 1 }), ev(1, "reading", 0, { w: 8 })];
  assert.deepEqual(weakWords(events).map((x) => x.id), [8]);
});
