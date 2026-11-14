import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildCharIndex, filterChars, isMastered, nextRecord, progressOf, strokeFile, strokePath, farEnough } from "../../app/js/writing.js";
import { Store } from "../../app/js/store.js";

const load = (n) => JSON.parse(readFileSync(new URL(`../../data/hsk3/${n}`, import.meta.url), "utf-8"));
const hw = load("handwriting.json"), vocab = load("vocab.json");
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test("stroke files are named by hex code point and exist for every handwriting character", () => {
  assert.equal(strokeFile("爱"), "7231.json");
  for (const x of hw) assert.ok(existsSync(new URL(`../../data/hsk3/strokes/${strokeFile(x.char)}`, import.meta.url)), x.char);
});

test("char index: single-char word first, up to 3 example words, shortest first", () => {
  const idx = buildCharIndex(hw, vocab);
  assert.equal(idx.size, 1200);
  const ai = idx.get("爱");
  assert.equal(ai.single?.word, "爱");
  assert.ok(ai.words.length <= 3 && ai.words.every((w) => w.word.includes("爱") && w.word !== "爱"));
  for (let i = 1; i < ai.words.length; i++) assert.ok(ai.words[i - 1].word.length <= ai.words[i].word.length);
});

test("filter by level, hanzi, pinyin without tones, and meaning", () => {
  const idx = buildCharIndex(hw, vocab);
  const l3 = filterChars(hw, idx, { levels: [3] });
  assert.ok(l3.length > 0 && l3.every((x) => x.level === 3));
  assert.deepEqual(filterChars(hw, idx, { query: "爱" }).map((x) => x.char).includes("爱"), true);
  assert.ok(filterChars(hw, idx, { query: "ai" }).some((x) => x.char === "爱"));
  assert.ok(filterChars(hw, idx, { query: "zzzz" }).length === 0);
  assert.ok(filterChars(hw, idx, { query: "cinta", meaningOf: (w) => (w.word === "爱" ? "mencintai; cinta" : "") }).some((x) => x.char === "爱"));
  assert.equal(filterChars(hw, idx, { mastery: () => false }).length, 0);
});

test("mastery: mistakes within a third of the strokes (at least one allowed)", () => {
  assert.equal(isMastered(10, 3), true);
  assert.equal(isMastered(10, 4), false);
  assert.equal(isMastered(2, 1), true);
  assert.equal(isMastered(2, 2), false);
});

test("record keeps best run and only sets ok through a checked run", () => {
  let r = nextRecord(null, { strokes: 10 }, 1);                    // free practice: counts, never masters
  assert.deepEqual(r, { n: 1, best: null, ok: 0, t: 1 });
  r = nextRecord(r, { strokes: 10, mistakes: 6 }, 2);
  assert.deepEqual([r.n, r.best, r.ok], [2, 6, 0]);
  r = nextRecord(r, { strokes: 10, mistakes: 1 }, 3);
  assert.deepEqual([r.n, r.best, r.ok], [3, 1, 1]);
  r = nextRecord(r, { strokes: 10, mistakes: 8 }, 4);               // a later bad run does not undo mastery
  assert.deepEqual([r.best, r.ok], [1, 1]);
});

test("store keeps handwriting records and survives export/import", () => {
  const s = new Store(mem());
  assert.equal(s.writingRecord("爱"), null);
  s.saveWriting("爱", nextRecord(null, { strokes: 10, mistakes: 0 }, 5));
  assert.equal(s.writingRecord("爱").ok, 1);
  assert.deepEqual(progressOf(s, hw.slice(0, 3)), { ok: 1, tried: 1, total: 3 });
  const t = new Store(mem()); t.import(s.export());
  assert.equal(t.writingRecord("爱").n, 1);
});

test("freehand path: dot for a tap, smoothed line otherwise; tiny moves are skipped", () => {
  assert.equal(strokePath([]), "");
  assert.match(strokePath([[5, 5]]), /^M 5 5 l 0\.01 0$/);
  assert.match(strokePath([[0, 0], [10, 10], [20, 0]]), /^M 0 0 Q 10 10 15 5 L 20 0$/);
  assert.equal(farEnough([0, 0], [1, 1]), false);
  assert.equal(farEnough([0, 0], [3, 0]), true);
});
