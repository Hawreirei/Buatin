// Themed lessons (Pelajaran): pure logic, no DOM. A lesson comes from data/hsk3/lessons.json
// (built by scripts/build_lessons.py) and walks through five steps; progress lives in store.data.lessons.
export const STEPS = [
  { key: "listening", zh: "听", label: "Listening" },
  { key: "reading", zh: "读", label: "Reading" },
  { key: "writing", zh: "写", label: "Writing" },
  { key: "speaking", zh: "说", label: "Speaking" },
  { key: "vocab", zh: "词", label: "Vocab" },
];
export const QUESTION_STEPS = ["listening", "reading", "writing"];   // steps made of questions

export const stepQuestions = (lesson, step) => lesson.steps?.[step] ?? [];
const stepOf = (progress, step) => progress?.steps?.[step] ?? null;
export const isStepDone = (progress, step) => !!stepOf(progress, step);
export const doneCount = (progress) => STEPS.filter((s) => isStepDone(progress, s.key)).length;
export const isComplete = (progress) => doneCount(progress) === STEPS.length;

/** The first step not finished yet (null when all are done). */
export function nextStep(progress) {
  return STEPS.find((s) => !isStepDone(progress, s.key))?.key ?? null;
}

/** Overall question number across the question steps: { n: 1-based position, total } (reading q2 after 3 listening q = 5). */
export function questionPosition(lesson, step, i) {
  let before = 0;
  for (const k of QUESTION_STEPS) {
    if (k === step) break;
    before += stepQuestions(lesson, k).length;
  }
  const total = QUESTION_STEPS.reduce((a, k) => a + stepQuestions(lesson, k).length, 0);
  return { n: before + i + 1, total };
}

/** Percentage right in a question step (null while not done or for steps without questions). */
export function stepPercent(progress, step) {
  const s = stepOf(progress, step);
  return s && s.n ? Math.round((100 * s.ok) / s.n) : null;
}

/** Syllabus word ids of the lesson's key words (extras such as 服务员 are not in the syllabus, so they have none). */
export const lessonWordIds = (lesson) => lesson.keyWords.filter((k) => k.wid != null).map((k) => k.wid);

/** Per-lesson numbers for the progress page: steps done, % per question step, speaking as passed/scored. */
export function lessonSummary(lesson, progress) {
  const pct = Object.fromEntries(QUESTION_STEPS.map((k) => [k, stepPercent(progress, k)]));
  const sp = progress?.steps?.speaking ?? null;
  return { id: lesson.id, done: doneCount(progress), total: STEPS.length, complete: isComplete(progress), pct, speaking: sp && sp.n ? { ok: sp.ok, n: sp.n } : null, started: !!progress };
}

/** The lesson to continue from the home page: a started, unfinished one first, else the first not started, else null. */
export function nextLesson(lessons, store) {
  const state = (l) => store.lessonProgress(l.id);
  return lessons.find((l) => state(l) && !isComplete(state(l))) ?? lessons.find((l) => !state(l)) ?? null;
}
