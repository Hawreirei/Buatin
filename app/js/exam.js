// Timed exam simulation. Pure logic (no DOM). Section sizes and times come from the official CTI
// exam-structure tables (data/hsk3/blueprints.json); the *kinds* of questions are the closest ones
// available in our bank (see SUBSTITUTE), which the UI states openly. Parts whose official type exists in
// the bank (pictures, short texts, passages, dialogs, cloze, write-hanzi) use it.
import { shuffle } from "./deck.js";
import { questionKey, withTiles } from "./practice.js";

export const SKILL_ORDER = ["listening", "reading", "writing"];
export const SKILL_LABEL = { listening: "Mendengar", reading: "Membaca", writing: "Menulis" };
export const MAX_AUDIO_PLAYS = 2; // assumption: the official audio-play rule is not stated in the CTI document

/** Which of our question types stands in for an official section. */
export const SUBSTITUTE = {
  listening: ["audio_question_pick_answer", "audio_dialog_question_mcq", "audio_passage_question_mcq"],
  reading: ["cloze_wordbank", "short_text_mcq"],
  writing: ["write_hanzi_from_pinyin"],
};

/** Fallback pool for a part whose exact type we do not have yet: same skill, same level only. */
function fallbackPool(questions, skill, level) {
  return questions.filter((q) => q.skill === skill && q.level === level && SUBSTITUTE[skill].includes(q.type));
}

/** Exact-type pool for a part: this level and below (a HSK 3 paper also uses HSK 1-2 material), own level first. */
function exactPool(questions, type, level, rand) {
  const own = shuffle(questions.filter((q) => q.type === type && q.level === level), rand);
  const lower = shuffle(questions.filter((q) => q.type === type && q.level < level), rand);
  return [...own, ...lower];
}

/** Per section: can we fill it, and how many of its official parts use the official question type? */
export function availability(questions, blueprint) {
  return blueprint.sections.map((s) => {
    const parts = s.parts.map((p) => ({ ...p, exact: exactPool(questions, p.type, blueprint.level, () => 0.5).length }));
    const used = new Set();
    let filled = 0;
    for (const p of parts) {
      const take = exactPool(questions, p.type, blueprint.level, () => 0.5).filter((q) => !used.has(q.id)).slice(0, p.count);
      take.forEach((q) => used.add(q.id));
      filled += take.length;
    }
    const spare = fallbackPool(questions, s.skill, blueprint.level).filter((q) => !used.has(q.id)).length;
    return { skill: s.skill, need: s.count, have: Math.min(s.count, filled + spare), ok: filled + spare >= s.count, officialParts: parts.filter((p) => p.exact >= p.count).length, totalParts: parts.length };
  });
}

export const examAvailable = (questions, blueprint) => !!blueprint && availability(questions, blueprint).every((a) => a.ok);

export function buildExam(questions, blueprint, rand = Math.random) {
  const sections = [];
  const keys = new Set();            // across the whole paper: the same sentence never shows up twice
  for (const s of blueprint.sections) {
    const used = new Set();
    const picked = [];
    const fallback = shuffle(fallbackPool(questions, s.skill, blueprint.level), rand);
    const put = (q, part, official) => {
      if (used.has(q.id) || keys.has(questionKey(q))) return false;
      used.add(q.id); keys.add(questionKey(q));
      picked.push({ ...withTiles(q.options ? { ...q, options: shuffle(q.options, rand) } : q, questions, rand), part: { id: part.id, type: part.type, official } });
      return true;
    };
    for (const part of s.parts) {
      let n = 0;
      for (const q of exactPool(questions, part.type, blueprint.level, rand)) { if (n >= part.count) break; if (put(q, part, true)) n++; }
      for (const q of fallback) { if (n >= part.count) break; if (put(q, part, false)) n++; }
      if (n < part.count) throw new Error(`Soal ${s.skill} untuk HSK ${blueprint.level} belum cukup (bagian ${part.id}: ${n}/${part.count})`);
    }
    sections.push({ skill: s.skill, time_ms: s.time_min * 60_000, official_count: s.count, items: picked, official_items: picked.filter((q) => q.part.official).length });
  }
  return { level: blueprint.level, sections, total: sections.reduce((a, s) => a + s.items.length, 0), official_items: sections.reduce((a, s) => a + s.official_items, 0) };
}

export function formatClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** `responses`: array aligned with section.items (undefined = unanswered). Returns graded results. */
export function gradeSection(section, responses, check) {
  const rows = section.items.map((q, i) => {
    const r = responses[i];
    const answered = r !== undefined && r !== null && r !== "";
    const res = answered ? check(q, r) : { correct: false, expected: q.answer };
    return { q, response: r, answered, correct: !!res.correct };
  });
  return {
    skill: section.skill, total: rows.length, answered: rows.filter((r) => r.answered).length,
    correct: rows.filter((r) => r.correct).length, rows,
  };
}

export function summarizeExam(graded, durations) {
  const total = graded.reduce((a, g) => a + g.total, 0);
  const correct = graded.reduce((a, g) => a + g.correct, 0);
  return {
    total, correct, pct: total ? Math.round((100 * correct) / total) : 0,
    sections: graded.map((g, i) => ({ skill: g.skill, total: g.total, correct: g.correct, answered: g.answered, pct: g.total ? Math.round((100 * g.correct) / g.total) : 0, ms: durations[i] ?? 0 })),
  };
}
