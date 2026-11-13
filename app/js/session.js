// Builds the study queue and applies ratings. Pure logic over Store + vocab; no DOM.
import { review, isDue, newCard } from "./srs.js";
import { wordsForLevels } from "./deck.js";

export function buildQueue(vocab, store, now = Date.now()) {
  const { levels, newPerDay } = store.settings;
  const words = wordsForLevels(vocab, levels);
  const dueCards = [];
  const unseen = [];
  for (const w of words) {
    const c = store.card(w.id);
    if (!c) unseen.push(w);
    else if (isDue(c, now)) dueCards.push({ w, c });
  }
  dueCards.sort((a, b) => a.c.due - b.c.due);
  const slots = Math.max(0, newPerDay - store.introducedToday(now));
  const fresh = unseen.slice(0, slots).map((w) => ({ w, c: newCard(w.id) }));
  return { due: dueCards, fresh, total: dueCards.length + fresh.length };
}

/** Next item to study: due cards first, then new ones. */
export function nextItem(queue) {
  return queue.due[0] || queue.fresh[0] || null;
}

export function answer(store, item, rating, now = Date.now()) {
  const wasNew = item.c.state === "new";
  const updated = review(item.c, rating, now);
  store.putCard(updated);
  store.logReview(now);
  if (wasNew) store.markIntroduced(now);
  return updated;
}

export function stats(vocab, store, now = Date.now()) {
  const byLevel = {};
  for (const w of vocab) {
    const l = (byLevel[w.level] ||= { total: 0, seen: 0, learning: 0, review: 0, mature: 0, due: 0 });
    l.total++;
    const c = store.card(w.id);
    if (!c) continue;
    l.seen++;
    if (c.state === "learning") l.learning++;
    else if (c.state === "review") { l.review++; if (c.interval >= 21) l.mature++; }
    if (isDue(c, now)) l.due++;
  }
  return byLevel;
}
