// Spaced-repetition scheduler (SM-2 variant with learning steps). Pure functions, no DOM.
export const RATING = Object.freeze({ AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 });
export const LEARN_STEPS_MIN = [1, 10];
export const MIN_EASE = 1.3;
export const START_EASE = 2.5;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

export function newCard(id) {
  return { id, state: "new", step: 0, ease: START_EASE, interval: 0, due: 0, reps: 0, lapses: 0 };
}

/** Returns a NEW card object; never mutates the input. */
export function review(card, rating, now = Date.now()) {
  const c = { ...card, reps: card.reps + 1 };
  const learning = c.state === "new" || c.state === "learning";

  if (learning) {
    if (rating === RATING.AGAIN) {
      c.state = "learning"; c.step = 0; c.due = now + LEARN_STEPS_MIN[0] * MIN;
    } else if (rating === RATING.HARD) {
      c.state = "learning"; c.due = now + LEARN_STEPS_MIN[Math.min(c.step, LEARN_STEPS_MIN.length - 1)] * MIN;
    } else if (rating === RATING.GOOD) {
      if (c.step + 1 < LEARN_STEPS_MIN.length) {
        c.state = "learning"; c.step += 1; c.due = now + LEARN_STEPS_MIN[c.step] * MIN;
      } else graduate(c, c.interval > 0 ? c.interval : 1, now); // relearning keeps its reduced interval
    } else {
      graduate(c, c.interval > 0 ? Math.max(c.interval, 4) : 4, now);
    }
    return c;
  }

  // review state
  if (rating === RATING.AGAIN) {
    c.lapses += 1;
    c.ease = Math.max(MIN_EASE, c.ease - 0.2);
    c.interval = Math.max(1, Math.round(c.interval * 0.5)); // interval after relearning
    c.state = "learning"; c.step = 0; c.due = now + LEARN_STEPS_MIN[0] * MIN;
  } else if (rating === RATING.HARD) {
    c.ease = Math.max(MIN_EASE, c.ease - 0.15);
    graduate(c, Math.max(card.interval + 1, Math.round(card.interval * 1.2)), now);
  } else if (rating === RATING.GOOD) {
    graduate(c, Math.max(card.interval + 1, Math.round(card.interval * c.ease)), now);
  } else {
    c.ease += 0.15;
    graduate(c, Math.max(card.interval + 2, Math.round(card.interval * c.ease * 1.3)), now);
  }
  return c;
}

function graduate(c, intervalDays, now) {
  c.state = "review"; c.step = 0; c.interval = intervalDays; c.due = now + intervalDays * DAY;
}

/** Human-readable preview of the next due time for each rating (for button labels). */
export function previewIntervals(card, now = Date.now()) {
  return Object.values(RATING).map((r) => formatDelay(review(card, r, now).due - now));
}

export function formatDelay(ms) {
  if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))} mnt`;
  if (ms < DAY) return `${Math.round(ms / (60 * MIN))} jam`;
  const d = Math.round(ms / DAY);
  return d < 30 ? `${d} hr` : d < 365 ? `${Math.round(d / 30)} bln` : `${(d / 365).toFixed(1)} thn`;
}

export function isDue(card, now = Date.now()) {
  return card.state !== "new" && card.due <= now;
}
