// "Susun kalimat" (order_sentence): pure logic, no DOM. A question carries `tokens` (the pieces in the correct
// order, punctuation included), `answer` (the sentence) and optionally `alt` (other accepted sentences).
import { shuffle } from "./deck.js";

/** The pieces in a random order that is never the correct one (unless every piece is identical). */
export function shuffledBank(tokens, rand = Math.random) {
  const answer = tokens.join("");
  const distinct = new Set(tokens).size > 1;
  let bank = shuffle(tokens, rand);
  for (let guard = 0; distinct && bank.join("") === answer && guard < 20; guard++) bank = shuffle(tokens, rand);
  if (distinct && bank.join("") === answer) bank = [...tokens.slice(1), tokens[0]];   // a rotation always differs when pieces differ
  return bank;
}

/** `response` is the learner's pieces in their order (array of strings). Right when it forms the sentence
 *  (or an accepted alternative); an incomplete arrangement is wrong. */
export function checkOrder(q, response) {
  const given = Array.isArray(response) ? response.join("") : "";
  return { correct: given === q.answer || (q.alt ?? []).includes(given), expected: q.answer };
}
