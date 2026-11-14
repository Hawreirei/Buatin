import test from "node:test";
import assert from "node:assert/strict";
import { numberToHanzi, cleanZh, alignChars, scoreAttempt, verdict, PASS_PCT, errorMessage, recognitionSupported } from "../../app/js/speech.js";

const S = { zh: "服务员，请给我菜单。", tokens: ["服务员", "，", "请", "给", "我", "菜单", "。"] };

test("numberToHanzi", () => {
  const c = { 0: "零", 1: "一", 10: "十", 11: "十一", 20: "二十", 45: "四十五", 100: "一百", 105: "一百零五", 110: "一百一十", 2024: "二千零二十四" };
  for (const [n, z] of Object.entries(c)) assert.equal(numberToHanzi(Number(n)), z, n);
});

test("cleanZh keeps hanzi, drops punctuation/latin, writes small numbers in hanzi", () => {
  assert.equal(cleanZh("服务员，请给我菜单。"), "服务员请给我菜单");
  assert.equal(cleanZh("我要1碗米饭 ok"), "我要一碗米饭");
  assert.equal(cleanZh("一共45块"), "一共四十五块");
  assert.equal(cleanZh(null), "");
});

test("alignChars marks heard characters without shifting after a gap", () => {
  assert.deepEqual(alignChars("请给我菜单", "请给我菜单"), [true, true, true, true, true]);
  assert.deepEqual(alignChars("请给我菜单", "请我菜单"), [true, false, true, true, true]);
  assert.deepEqual(alignChars("请给我菜单", "请给我菜"), [true, true, true, true, false]);
  assert.deepEqual(alignChars("请给我菜单", ""), [false, false, false, false, false]);
});

test("scoreAttempt: perfect, partial, nothing, best alternative wins", () => {
  const perfect = scoreAttempt(S, ["服务员请给我菜单"]);
  assert.equal(perfect.pct, 100);
  assert.equal(perfect.key, "great");
  assert.deepEqual(perfect.tokens.map((t) => t.ok), [true, null, true, true, true, true, null]);

  const part = scoreAttempt(S, ["服务员请我菜单"]);                          // 给 missing
  assert.equal(part.pct, 88);
  assert.deepEqual(part.tokens.filter((t) => t.ok === false).map((t) => t.t), ["给"]);
  assert.equal(part.key, "ok");

  assert.equal(scoreAttempt(S, []).pct, 0);
  assert.equal(scoreAttempt(S, ["你好"]).key, "retry");

  const best = scoreAttempt(S, ["你好", "服务员请给我菜单"]);
  assert.equal(best.pct, 100);
  assert.equal(best.heard, "服务员请给我菜单");
});

test("scoreAttempt: a multi-character word is wrong when any of its characters is missed; extras cost a little", () => {
  const r = scoreAttempt(S, ["服务请给我菜单"]);                              // 员 missing
  assert.equal(r.tokens[0].ok, false);
  assert.equal(r.tokens[2].ok, true);
  const padded = scoreAttempt(S, ["服务员请给我菜单谢谢你们大家"]);
  assert.ok(padded.pct < 100 && padded.pct >= PASS_PCT - 30);
});

test("verdict bands and messages", () => {
  assert.equal(verdict(95).key, "great");
  assert.equal(verdict(PASS_PCT).key, "ok");
  assert.equal(verdict(PASS_PCT - 1).key, "retry");
  assert.match(errorMessage("not-allowed"), /mikrofon/);
  assert.match(errorMessage("something-new"), /Coba lagi/);
});

test("without a browser, recognition is reported unsupported instead of throwing", () => {
  assert.equal(recognitionSupported(), false);
});

import { recommendations, buildWeakSet } from "../../app/js/analytics.js";

test("speaking attempts never become 'weakest skill' advice (Latihan has no speaking questions)", () => {
  const ev = (s, ok, i) => ({ t: 1700000000000 + i, k: "practice", s, l: 3, ty: "x", id: `q${i}`, w: null, ok, ms: 1000 });
  const events = [
    ...Array.from({ length: 6 }, (_, i) => ev("speaking", 0, i)),
    ...Array.from({ length: 6 }, (_, i) => ev("reading", i < 4 ? 1 : 0, 10 + i)),
  ];
  const recs = recommendations({ events, exams: [], cards: {}, vocabById: {} });
  const skillRec = recs.find((r) => r.kind === "skill");
  assert.equal(skillRec?.skill, "reading");
  assert.ok(!recs.some((r) => /undefined/.test(r.text)));
  const q = [{ id: "a", skill: "reading", level: 3, stem: "x" }, { id: "b", skill: "listening", level: 3, stem: "y" }];
  assert.equal(buildWeakSet(q, events, { count: 1 }, () => 0.5)[0].skill, "reading");
});
