// Vocabulary deck helpers over data/hsk3/vocab.json. Pure functions, no DOM.
export const LEVEL_LABEL = { 1: "HSK 1", 2: "HSK 2", 3: "HSK 3", 4: "HSK 4", 5: "HSK 5", 6: "HSK 6", 7: "HSK 7–9" };

export function wordsForLevels(vocab, levels) {
  const set = new Set(levels);
  return vocab.filter((w) => set.has(w.level));
}

export function glossText(w, max = 4) {
  if (!w.gloss_en || w.gloss_en.length === 0) return null;
  return w.gloss_en.slice(0, max).join("; ");
}

const POS_MAP = {
  名: "kata benda", 动: "kata kerja", 形: "kata sifat", 副: "kata keterangan", 数: "bilangan",
  量: "kata bantu bilangan", 代: "kata ganti", 介: "preposisi", 连: "konjungsi", 助: "partikel",
  叹: "kata seru", 拟声: "onomatope", 数量: "bilangan+kuantor", 前缀: "awalan", 后缀: "akhiran",
};

/** '动、（名）' -> 'kata kerja, (kata benda)'. Parenthesised entries are secondary uses. */
export function posLabel(pos) {
  if (!pos) return "";
  const names = (s) => s.split("、").filter(Boolean).map((k) => POS_MAP[k] || k).join(", ");
  const out = [];
  for (const tok of pos.match(/（[^）]*）|[^、（）]+/g) || []) {
    out.push(tok.startsWith("（") ? `(${names(tok.slice(1, -1))})` : names(tok));
  }
  return out.join(", ");
}

/** Indonesian meaning if available (hand-written, HSK-sense), else the English CC-CEDICT gloss. */
export function meaning(w, idData, max = 2) {
  return idData?.[w.id]?.arti ?? glossText(w, max);
}

const itemsOf = (text) => new Set(String(text ?? "").split(";").map((x) => x.trim().toLowerCase()).filter(Boolean));

/** Pick `n` distractor meanings from the same level (prefer same POS). A candidate is rejected when it
 *  shares any meaning item with the target (e.g. 想/要 both "ingin"), so only one option can be right. */
export function distractors(vocab, target, n = 3, rand = Math.random, label = (w) => glossText(w, 2)) {
  const answer = itemsOf(label(target));
  const clashes = (w) => [...itemsOf(label(w))].some((x) => answer.has(x));
  const pool = vocab.filter((w) => w.id !== target.id && w.level === target.level && label(w) && !clashes(w));
  const samePos = pool.filter((w) => w.pos === target.pos);
  const pick = [];
  const take = (src) => {
    const copy = src.slice();
    while (copy.length && pick.length < n) {
      const i = Math.floor(rand() * copy.length);
      const [w] = copy.splice(i, 1);
      if (!pick.some((p) => label(p) === label(w))) pick.push(w);
    }
  };
  take(samePos);
  if (pick.length < n) take(pool.filter((w) => !pick.includes(w)));
  return pick;
}

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
