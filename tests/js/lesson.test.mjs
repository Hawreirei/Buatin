import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lessonSummary, nextLesson, STEPS, stepQuestions, isStepDone, doneCount, isComplete, nextStep, questionPosition, stepPercent, lessonWordIds } from "../../app/js/lesson.js";
import { Store } from "../../app/js/store.js";
import { buildQueue } from "../../app/js/session.js";
import { withTiles, check } from "../../app/js/practice.js";

const lessons = JSON.parse(readFileSync(new URL("../../data/hsk3/lessons.json", import.meta.url), "utf-8"));
const vocab = JSON.parse(readFileSync(new URL("../../data/hsk3/vocab.json", import.meta.url), "utf-8"));
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const restoran = lessons.find((l) => l.id === "restoran");

test("five steps in order; progress tracks done steps and the next one", () => {
  assert.deepEqual(STEPS.map((s) => s.key), ["listening", "reading", "writing", "speaking", "vocab"]);
  const s = new Store(mem());
  assert.equal(s.lessonProgress("restoran"), null);
  assert.equal(nextStep(null), "listening");
  s.saveLessonStep("restoran", "listening", { ok: 2, n: 3 });
  s.saveLessonStep("restoran", "reading", { ok: 3, n: 3 });
  const p = s.lessonProgress("restoran");
  assert.equal(doneCount(p), 2);
  assert.equal(isStepDone(p, "listening"), true);
  assert.equal(isStepDone(p, "writing"), false);
  assert.equal(nextStep(p), "writing");
  assert.equal(stepPercent(p, "listening"), 67);
  assert.equal(stepPercent(p, "speaking"), null);
  for (const k of ["writing", "speaking", "vocab"]) s.saveLessonStep("restoran", k);
  assert.equal(isComplete(s.lessonProgress("restoran")), true);
  assert.equal(nextStep(s.lessonProgress("restoran")), null);
  s.resetLesson("restoran");
  assert.equal(s.lessonProgress("restoran"), null);
});

test("progress survives export/import", () => {
  const a = new Store(mem());
  a.saveLessonStep("restoran", "listening", { ok: 3, n: 3 });
  const b = new Store(mem());
  b.import(a.export());
  assert.equal(stepPercent(b.lessonProgress("restoran"), "listening"), 100);
});

test("overall question numbering runs across listening, reading and writing", () => {
  const n = (k) => stepQuestions(restoran, k).length;
  assert.deepEqual(questionPosition(restoran, "listening", 0), { n: 1, total: n("listening") + n("reading") + n("writing") });
  assert.equal(questionPosition(restoran, "reading", 1).n, n("listening") + 2);
  const last = questionPosition(restoran, "writing", n("writing") - 1);
  assert.equal(last.n, last.total);
});

test("every lesson question can be answered correctly and wrongly", () => {
  for (const k of ["listening", "reading", "writing"]) {
    for (const raw of stepQuestions(restoran, k)) {
      const q = withTiles(raw, [], () => 0.3);
      if (q.type === "order_sentence") {
        assert.notEqual(q.bank.join(""), q.answer);
        assert.equal(check(q, q.tokens).correct, true, q.id);
        assert.equal(check(q, [...q.tokens].reverse()).correct, false, q.id);
      } else {
        const right = q.options.find((o) => (o.word ?? o.zh) === q.answer);
        const wrong = q.options.find((o) => (o.word ?? o.zh) !== q.answer);
        assert.equal(check(q, right).correct, true, q.id);
        assert.equal(check(q, wrong).correct, false, q.id);
      }
    }
  }
});

test("key words: syllabus words carry an id; extras (服务员) do not and are not pinned", () => {
  const ids = lessonWordIds(restoran);
  assert.ok(ids.length >= 8);
  assert.ok(restoran.keyWords.some((k) => k.word === "服务员" && k.wid == null));
  assert.ok(ids.every((id) => vocab.some((w) => w.id === id)));
});

test("pinned words jump the study queue, even outside the chosen levels and the daily limit", () => {
  const s = new Store(mem());
  s.setSettings({ levels: [1], newPerDay: 2 });
  const ids = lessonWordIds(restoran);
  const level3 = ids.filter((id) => vocab.find((w) => w.id === id).level === 3);
  assert.ok(level3.length > 0);                                  // 菜单, 碗, 鱼 are HSK 3 words, level 1 is selected
  assert.equal(s.pin(ids), ids.length);
  assert.equal(s.pin(ids), 0);                                   // pinning twice adds nothing
  const q = buildQueue(vocab, s);
  const fresh = q.fresh.map((x) => x.w.id);
  assert.ok(ids.every((id) => fresh.includes(id)));
  assert.deepEqual(fresh.slice(0, ids.length).sort((a, b) => a - b), [...ids].sort((a, b) => a - b));
  assert.equal(fresh.length, ids.length + 2);                    // pinned + the normal daily allowance, no duplicates
  assert.equal(new Set(fresh).size, fresh.length);
});

test("a pinned word that already has a card is not offered again", () => {
  const s = new Store(mem());
  const [id] = lessonWordIds(restoran);
  s.pin([id]);
  s.putCard({ ...s.ensureCard(id), state: "review", due: Date.now() + 86400000 });
  assert.ok(!buildQueue(vocab, s).fresh.some((x) => x.w.id === id));
});

test("lessons are ordered easiest first and each can be summarised", () => {
  assert.deepEqual(lessons.map((l) => [l.id, l.level]), [["perkenalan", 1], ["belanja", 2], ["tanya-arah", 2], ["restoran", 3]]);
  const s = new Store(mem());
  const empty = lessonSummary(lessons[0], s.lessonProgress("perkenalan"));
  assert.deepEqual({ done: empty.done, started: empty.started, speaking: empty.speaking }, { done: 0, started: false, speaking: null });
  s.saveLessonStep("perkenalan", "listening", { ok: 2, n: 3 });
  s.saveLessonStep("perkenalan", "speaking", { ok: 1, n: 2 });
  const x = lessonSummary(lessons[0], s.lessonProgress("perkenalan"));
  assert.deepEqual({ done: x.done, total: x.total, started: x.started, complete: x.complete }, { done: 2, total: 5, started: true, complete: false });
  assert.deepEqual(x.pct, { listening: 67, reading: null, writing: null });
  assert.deepEqual(x.speaking, { ok: 1, n: 2 });
});

test("nextLesson: continue the started unfinished one, else the first not started, else none", () => {
  const s = new Store(mem());
  assert.equal(nextLesson(lessons, s).id, "perkenalan");
  s.saveLessonStep("restoran", "listening", { ok: 1, n: 3 });          // restoran started: continue it, not the first untouched one
  assert.equal(nextLesson(lessons, s).id, "restoran");
  for (const l of lessons) for (const st of STEPS) s.saveLessonStep(l.id, st.key);
  assert.equal(nextLesson(lessons, s), null);
});

test("every lesson question can be answered correctly (all lessons)", () => {
  for (const l of lessons) for (const k of ["listening", "reading", "writing"]) for (const raw of stepQuestions(l, k)) {
    const q = withTiles(raw, [], () => 0.3);
    const right = q.type === "order_sentence" ? q.tokens : q.options.find((o) => (o.word ?? o.zh) === q.answer);
    assert.equal(check(q, right).correct, true, q.id);
  }
});

import { syllableTones, expectedTones } from "../../app/js/tone.js";
test("every key sentence of every lesson yields one tone per hanzi (so tone scoring has a target)", () => {
  for (const l of lessons) for (const s of l.keySentences) {
    const hanzi = [...s.zh].filter((c) => /[一-鿿]/.test(c)).length;
    const sy = expectedTones(syllableTones(s.pinyin));
    assert.equal(sy.length, hanzi, `${l.id}: ${s.zh}`);
    assert.ok(sy.every((x) => x.expected >= 1 && x.expected <= 5));
  }
});
