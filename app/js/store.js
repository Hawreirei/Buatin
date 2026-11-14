// Progress persistence. Storage is injectable (tests / private-mode fallback).
import { newCard } from "./srs.js";

const KEY = "learning-chinese.vocab.v1";
const LEGACY_KEY = "buatin.vocab.v1";   // name used before the rename; read once so saved progress survives
export const MAX_EVENTS = 5000;
export const DEFAULT_SETTINGS = { levels: [1], newPerDay: 10, speak: true, writeMode: "choice", scoreSpeech: true, toneContour: false };

export function todayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
}

export function pickStorage() {
  try {
    const s = globalThis.localStorage;
    s.setItem("__t", "1"); s.removeItem("__t");
    return s;
  } catch {
    return memoryStorage();
  }
}

export class Store {
  constructor(storage = pickStorage()) {
    this.storage = storage;
    this.data = this.#load();
  }

  #load() {
    try {
      let raw = JSON.parse(this.storage.getItem(KEY));
      if (!raw) {
        raw = JSON.parse(this.storage.getItem(LEGACY_KEY));
        if (raw && raw.version === 1) {            // migrate: copy to the new key, then drop the old one
          this.storage.setItem(KEY, JSON.stringify(raw));
          this.storage.removeItem(LEGACY_KEY);
        }
      }
      if (raw && raw.version === 1) return { ...raw, settings: { ...DEFAULT_SETTINGS, ...raw.settings } };
    } catch { /* fall through */ }
    return { version: 1, cards: {}, settings: { ...DEFAULT_SETTINGS }, daily: { date: "", introduced: 0 }, log: {} };
  }

  save() {
    try { this.storage.setItem(KEY, JSON.stringify(this.data)); } catch { /* quota/private mode: keep in memory */ }
  }

  get settings() { return this.data.settings; }
  setSettings(patch) { Object.assign(this.data.settings, patch); this.save(); }

  card(id) { return this.data.cards[id] || null; }
  putCard(card) { this.data.cards[card.id] = card; this.save(); }
  ensureCard(id) { return this.data.cards[id] || newCard(id); }

  introducedToday(now = Date.now()) {
    const k = todayKey(now);
    return this.data.daily.date === k ? this.data.daily.introduced : 0;
  }
  markIntroduced(now = Date.now()) {
    const k = todayKey(now);
    if (this.data.daily.date !== k) this.data.daily = { date: k, introduced: 0 };
    this.data.daily.introduced += 1;
    this.save();
  }

  /** Aggregate counter per skill; when `meta` is given the answer is also kept in the event log. */
  recordAnswer(skill, correct, meta = null) {
    const p = (this.data.practice ||= {});
    const s = (p[skill] ||= { n: 0, ok: 0 });
    s.n += 1;
    if (correct) s.ok += 1;
    if (meta) this.#pushEvent({ t: meta.t ?? Date.now(), k: meta.k ?? "practice", s: skill, l: meta.l, ty: meta.ty, id: meta.id, w: meta.w ?? null, ok: correct ? 1 : 0, ms: meta.ms ?? 0, ...(meta.un ? { un: 1 } : {}) });
    this.save();
  }

  #pushEvent(e) {
    const list = (this.data.events ||= []);
    list.push(e);
    if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
  }

  get events() { return this.data.events || []; }
  get exams() { return this.data.exams || []; }

  recordExam(rec) {
    (this.data.exams ||= []).push(rec);
    if (this.data.exams.length > 200) this.data.exams.shift();
    this.save();
  }

  /** Lesson progress: { steps: { <step>: { ok, n, t } }, t } (speaking/vocab have ok = n = 0). */
  lessonProgress(id) { return this.data.lessons?.[id] ?? null; }
  saveLessonStep(id, step, { ok = 0, n = 0 } = {}, now = Date.now()) {
    const l = ((this.data.lessons ||= {})[id] ||= { steps: {}, t: now });
    l.steps[step] = { ok, n, t: now };
    l.t = now;
    this.save();
  }
  resetLesson(id) { if (this.data.lessons) delete this.data.lessons[id]; this.save(); }

  /** Words the learner asked to study next ("Tambah ke hafalan" in a lesson); the study queue takes them first. */
  get pinned() { return this.data.pinned ?? []; }
  pin(ids) {
    const have = new Set(this.pinned);
    const add = ids.filter((id) => !have.has(id));
    if (add.length) (this.data.pinned = [...this.pinned, ...add]);
    this.save();
    return add.length;
  }

  recordReview(now = Date.now()) {
    const k = todayKey(now);
    this.data.log[k] = (this.data.log[k] || 0) + 1;
    this.save();
  }

  export() { return JSON.stringify(this.data); }
  import(json) {
    const d = JSON.parse(json);
    if (!d || d.version !== 1 || typeof d.cards !== "object") throw new Error("Berkas progres tidak valid");
    this.data = { ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings } };
    this.save();
  }
  reset() { this.data = { version: 1, cards: {}, settings: { ...DEFAULT_SETTINGS }, daily: { date: "", introduced: 0 }, log: {} }; this.save(); }
}
