import test from "node:test";
import assert from "node:assert/strict";
import { newCard, review, RATING, isDue, formatDelay, previewIntervals } from "../../app/js/srs.js";

const T0 = 1_700_000_000_000;
const MIN = 60_000, DAY = 86_400_000;

test("new card: GOOD walks learning steps then graduates to 1 day", () => {
  let c = review(newCard(1), RATING.GOOD, T0);
  assert.equal(c.state, "learning");
  assert.equal(c.due, T0 + 10 * MIN);
  c = review(c, RATING.GOOD, T0 + 10 * MIN);
  assert.equal(c.state, "review");
  assert.equal(c.interval, 1);
  assert.equal(c.due, T0 + 10 * MIN + DAY);
});

test("new card: EASY graduates immediately to 4 days", () => {
  const c = review(newCard(1), RATING.EASY, T0);
  assert.equal(c.state, "review");
  assert.equal(c.interval, 4);
});

test("new card: AGAIN resets to first step", () => {
  const c = review(newCard(1), RATING.AGAIN, T0);
  assert.equal(c.state, "learning");
  assert.equal(c.due, T0 + MIN);
});

test("review card intervals grow with GOOD and ease is stable", () => {
  let c = { ...newCard(1), state: "review", interval: 10, ease: 2.5, due: T0 };
  c = review(c, RATING.GOOD, T0);
  assert.equal(c.interval, 25);
  assert.equal(c.ease, 2.5);
});

test("review card AGAIN: lapse, ease drop, back to learning, interval halved", () => {
  let c = { ...newCard(1), state: "review", interval: 20, ease: 2.5, due: T0 };
  c = review(c, RATING.AGAIN, T0);
  assert.equal(c.state, "learning");
  assert.equal(c.lapses, 1);
  assert.equal(c.ease, 2.3);
  assert.equal(c.interval, 10);
  // relearning: GOOD x2 graduates with reduced interval, not 1 day
  c = review(c, RATING.GOOD, T0);
  c = review(c, RATING.GOOD, T0);
  assert.equal(c.state, "review");
  assert.equal(c.interval, 10);
});

test("ease never drops below 1.3", () => {
  let c = { ...newCard(1), state: "review", interval: 5, ease: 1.35, due: T0 };
  for (let i = 0; i < 5; i++) c = review({ ...c, state: "review" }, RATING.AGAIN, T0);
  assert.ok(c.ease >= 1.3);
});

test("interval strictly increases for HARD/GOOD/EASY (no stalls at small intervals)", () => {
  const base = { ...newCard(1), state: "review", interval: 1, ease: 1.3, due: T0 };
  for (const r of [RATING.HARD, RATING.GOOD, RATING.EASY]) assert.ok(review(base, r, T0).interval > 1, `rating ${r}`);
});

test("review() does not mutate its input", () => {
  const c = newCard(1);
  const frozen = Object.freeze({ ...c });
  review(frozen, RATING.GOOD, T0);
  assert.deepEqual(c, newCard(1));
});

test("isDue and formatting", () => {
  assert.equal(isDue(newCard(1), T0), false);
  assert.equal(isDue({ ...newCard(1), state: "review", due: T0 }, T0), true);
  assert.equal(formatDelay(MIN), "1 mnt");
  assert.equal(formatDelay(3 * 60 * MIN), "3 jam");
  assert.equal(formatDelay(4 * DAY), "4 hr");
  assert.equal(previewIntervals(newCard(1), T0).length, 4);
});
