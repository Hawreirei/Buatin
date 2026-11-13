// Practice-question logic (pure, no DOM). Questions come from data/hsk3/questions.json.
import { shuffle } from "./deck.js";

export const SKILLS = { reading: "Membaca", writing: "Menulis", listening: "Mendengar" };
export const TYPE_HELP = {
  cloze_wordbank: "Pilih kata yang tepat untuk mengisi bagian kosong.",
  write_hanzi_from_pinyin: "Pilih hanzi yang hilang (pinyin di atas kotak), lalu tekan Periksa. Bisa juga diketik.",
  audio_question_pick_answer: "Dengarkan pertanyaan, lalu pilih jawaban yang tepat.",
  audio_dialog_question_mcq: "Dengarkan dialog dan pertanyaan, lalu pilih jawaban yang tepat.",
  audio_passage_question_mcq: "Dengarkan teks dan pertanyaan, lalu pilih jawaban yang tepat.",
  audio_phrase_pick_picture: "Dengarkan, lalu pilih gambar yang sesuai.",
  audio_sentence_pick_picture: "Dengarkan kalimat, lalu pilih gambar yang sesuai.",
  audio_dialog_match_picture: "Dengarkan dialog, lalu pilih gambar yang sesuai.",
  sentence_match_picture: "Baca kalimat, lalu pilih gambar yang sesuai.",
  short_text_mcq: "Baca teks, lalu pilih jawaban yang tepat.",
  passage_mcq: "Baca paragraf, lalu pilih jawaban yang tepat.",
};

/** Key that makes two questions "the same question" (so a set never repeats one; a cloze and a write item
 *  built from the same example sentence also count as the same). */
export const questionKey = (q) => q.dedupe ?? q.explain?.zh ?? q.stem ?? q.audio ?? q.id;
const HAN = /[一-鿿]/;

export function availableLevels(questions) {
  return [...new Set(questions.map((q) => q.level))].sort();
}

/** Pick `count` questions for the chosen skills/levels. Mixed skills are drawn round-robin so each skill
 *  is represented; identical stems are never repeated within a set. */
export function buildSet(questions, { skills, levels, count }, rand = Math.random) {
  const lv = new Set(levels);
  const byKind = skills.map((s) => shuffle(questions.filter((q) => q.skill === s && lv.has(q.level)), rand));
  const out = [];
  const seen = new Set();
  let progressed = true;
  while (out.length < count && progressed) {
    progressed = false;
    for (const list of byKind) {
      while (list.length) {
        const q = list.pop();
        const key = questionKey(q);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(q);
        progressed = true;
        break;
      }
      if (out.length >= count) break;
    }
  }
  return out.map((q) => withTiles(q.options ? { ...q, options: shuffle(q.options, rand) } : q, questions, rand));
}

/** For write-hanzi items: the tile bank shown under the sentence (the answer plus 5 distractors, same level
 *  first), so nobody needs a Chinese keyboard. Other question types are returned unchanged. */
export function withTiles(q, questions, rand = Math.random, size = 6) {
  if (q.type !== "write_hanzi_from_pinyin") return q;
  const writes = questions.filter((x) => x.type === q.type && x.answer !== q.answer);
  const near = shuffle(writes.filter((x) => x.level === q.level), rand);
  const rest = shuffle(writes.filter((x) => x.level !== q.level), rand);
  const tiles = new Set([q.answer]);
  for (const x of [...near, ...rest]) { if (tiles.size >= size) break; tiles.add(x.answer); }
  return { ...q, tiles: shuffle([...tiles], rand) };
}

export function check(q, response) {
  if (q.type === "write_hanzi_from_pinyin") {
    const ch = [...String(response ?? "").normalize("NFC")].find((c) => HAN.test(c));
    return { correct: ch === q.answer, expected: q.answer };
  }
  const given = typeof response === "object" && response ? (response.word ?? response.zh ?? response.key) : response;
  return { correct: given === q.answer, expected: q.answer };
}

export function summarize(results) {
  const by = {};
  let correct = 0;
  for (const r of results) {
    const s = (by[r.q.skill] ||= { total: 0, correct: 0 });
    s.total++;
    if (r.correct) { s.correct++; correct++; }
  }
  return { total: results.length, correct, pct: results.length ? Math.round((100 * correct) / results.length) : 0, by };
}
