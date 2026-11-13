import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { wordsForLevels, glossText, posLabel, distractors, shuffle } from "../../app/js/deck.js";
import { Store, todayKey } from "../../app/js/store.js";
import { buildQueue, nextItem, answer, stats } from "../../app/js/session.js";
import { RATING } from "../../app/js/srs.js";

const vocab = JSON.parse(readFileSync(new URL("../../data/hsk3/vocab.json", import.meta.url), "utf-8"));
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const T0 = new Date(2026, 11, 13, 9, 0, 0).getTime();

test("wordsForLevels filters by level", () => {
  assert.equal(wordsForLevels(vocab, [1]).length, 300);
  assert.equal(wordsForLevels(vocab, [1, 2]).length, 500);
});

test("posLabel handles secondary uses with commas", () => {
  assert.equal(posLabel("动"), "kata kerja");
  assert.equal(posLabel("形、介、（动、量）"), "kata sifat, preposisi, (kata kerja, kata bantu bilangan)");
  assert.equal(posLabel(""), "");
});

test("distractors: n unique glosses, never the answer, same level", () => {
  const target = vocab[0];
  const d = distractors(vocab, target, 3, () => 0.3);
  assert.equal(d.length, 3);
  const glosses = new Set(d.map((w) => glossText(w, 2)));
  assert.equal(glosses.size, 3);
  assert.ok(!glosses.has(glossText(target, 2)));
  assert.ok(d.every((w) => w.level === target.level && w.id !== target.id));
});

test("shuffle keeps elements", () => {
  const a = [1, 2, 3, 4, 5];
  assert.deepEqual(shuffle(a).sort(), a);
});

test("queue: respects daily new-card limit and curriculum order", () => {
  const s = new Store(mem());
  s.setSettings({ levels: [1], newPerDay: 5 });
  const q = buildQueue(vocab, s, T0);
  assert.equal(q.fresh.length, 5);
  assert.deepEqual(q.fresh.map((x) => x.w.id), [1, 2, 3, 4, 5]);
  assert.equal(nextItem(q).w.id, 1);
});

test("answering new cards consumes the daily quota and schedules reviews", () => {
  const s = new Store(mem());
  s.setSettings({ levels: [1], newPerDay: 2 });
  let q = buildQueue(vocab, s, T0);
  answer(s, nextItem(q), RATING.EASY, T0);
  answer(s, q.fresh[1], RATING.GOOD, T0);
  q = buildQueue(vocab, s, T0 + 1000);
  assert.equal(q.fresh.length, 0);           // quota used
  assert.equal(q.due.length, 0);             // EASY -> 4d, GOOD -> 10 min
  q = buildQueue(vocab, s, T0 + 11 * 60_000);
  assert.equal(q.due.length, 1);             // the GOOD card is due again after 10 min
  const next = buildQueue(vocab, s, T0 + 24 * 3600_000);
  assert.equal(next.fresh.length, 2);        // new day -> new quota (cards 3,4)
  assert.deepEqual(next.fresh.map((x) => x.w.id), [3, 4]);
});

test("stats counts per level", () => {
  const s = new Store(mem());
  s.setSettings({ levels: [1], newPerDay: 3 });
  const q = buildQueue(vocab, s, T0);
  answer(s, q.fresh[0], RATING.EASY, T0);
  const st = stats(vocab, s, T0 + 5 * 86_400_000);
  assert.equal(st[1].total, 300);
  assert.equal(st[1].seen, 1);
  assert.equal(st[1].review, 1);
  assert.equal(st[1].due, 1);
});

test("store persists, exports and rejects bad imports", () => {
  const storage = mem();
  const s = new Store(storage);
  s.setSettings({ newPerDay: 7 });
  s.putCard({ id: 9, state: "review", step: 0, ease: 2.5, interval: 3, due: 1, reps: 1, lapses: 0 });
  const s2 = new Store(storage);
  assert.equal(s2.settings.newPerDay, 7);
  assert.equal(s2.card(9).interval, 3);
  const dump = s2.export();
  const s3 = new Store(mem());
  s3.import(dump);
  assert.equal(s3.card(9).interval, 3);
  assert.throws(() => s3.import('{"version":2}'));
  assert.throws(() => s3.import("not json"));
  assert.equal(todayKey(T0), "2026-12-13");
});

test("meaning prefers Indonesian, falls back to English gloss", async () => {
  const { meaning } = await import("../../app/js/deck.js");
  const w = vocab[0];
  assert.equal(meaning(w, { [w.id]: { arti: "mencintai" } }), "mencintai");
  assert.equal(meaning(w, {}), glossText(w, 2));
  assert.equal(meaning(w, undefined), glossText(w, 2));
});

test("distractors can use a custom label function", () => {
  const idData = JSON.parse(readFileSync(new URL("../../data/hsk3/vocab_id.json", import.meta.url), "utf-8"));
  const label = (w) => idData[w.id]?.arti ?? null;
  const target = vocab[0];
  const d = distractors(vocab, target, 3, () => 0.5, label);
  assert.equal(d.length, 3);
  assert.ok(d.every((w) => label(w) && label(w) !== label(target)));
});

test("distractors never share a meaning item with the target (synonym safety)", () => {
  const idData = JSON.parse(readFileSync(new URL("../../data/hsk3/vocab_id.json", import.meta.url), "utf-8"));
  const label = (w) => idData[w.id]?.arti ?? null;
  const items = (w) => new Set(label(w).split(";").map((x) => x.trim().toLowerCase()));
  let checked = 0;
  for (const target of vocab.filter((w) => w.level <= 2)) {
    for (let r = 0; r < 3; r++) {
      const d = distractors(vocab, target, 3, Math.random, label);
      assert.equal(d.length, 3, target.word);
      for (const w of d) {
        assert.ok(![...items(w)].some((x) => items(target).has(x)), `${target.word} vs ${w.word}`);
        checked++;
      }
    }
  }
  assert.ok(checked > 3000);
});

test("Store migrates progress saved under the legacy key", () => {
  const m = new Map([["buatin.vocab.v1", JSON.stringify({ version: 1, cards: { 1: { state: "review" } }, settings: { levels: [2] }, daily: { date: "", introduced: 0 }, log: {} })]]);
  const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
  const s = new Store(storage);
  assert.deepEqual(s.settings.levels, [2]);
  assert.equal(s.card(1).state, "review");
  assert.ok(m.has("learning-chinese.vocab.v1"));
  assert.ok(!m.has("buatin.vocab.v1"));
});

import { featuredSlot, msToNextSlot, featuredWord } from "../../app/js/deck.js";
test("featured word changes each slot and visits every word before repeating", () => {
  const words = Array.from({ length: 300 }, (_, i) => ({ id: i }));
  const seen = new Set();
  for (let slot = 1000; slot < 1300; slot++) seen.add(featuredWord(words, slot).id);
  assert.equal(seen.size, 300);
  assert.notEqual(featuredWord(words, 5).id, featuredWord(words, 6).id);
  assert.equal(featuredWord([], 3), null);
  assert.equal(featuredWord(words, 5), featuredWord(words, 5));
});
test("featured slots follow local 3-hour boundaries", () => {
  const tz = -420;                                                  // UTC+7
  const at = (h, m, s) => Date.UTC(2026, 10, 13, h - 7, m, s);      // local clock time
  assert.equal(featuredSlot(at(12, 0, 0), 3, tz), featuredSlot(at(14, 59, 59), 3, tz));
  assert.equal(featuredSlot(at(15, 0, 0), 3, tz), featuredSlot(at(14, 59, 59), 3, tz) + 1);
  assert.equal(msToNextSlot(at(12, 59, 59), 3, tz), 2 * 3_600_000 + 1000);
  assert.equal(msToNextSlot(at(15, 0, 0), 3, tz), 3 * 3_600_000);
});
