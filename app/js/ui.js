// Tiny DOM helpers shared by the views (text always via textContent, never innerHTML).
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
export const btn = (label, onclick, cls = "btn", extra = {}) => h("button", { class: cls, type: "button", onclick, ...extra }, label);

// Mobile browsers (Android Chrome, iOS Safari) are fragile here: an utterance with no live reference can be
// garbage-collected mid-speech, and speak() right after cancel() may be dropped or replay the previous text.
// So: keep references, give cancel() a moment to settle, resume() a stuck queue, and pick a zh voice explicitly.
const live = new Set();
let speakTimer = 0;
function zhVoice() {
  const v = speechSynthesis.getVoices();
  return v.find((x) => /^zh[-_]CN/i.test(x.lang)) || v.find((x) => /^zh/i.test(x.lang)) || null;
}
function say(text, { rate = 0.85, pitch = 1, onend, onerror } = {}) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN"; u.rate = rate; u.pitch = pitch;
  const voice = zhVoice();
  if (voice) u.voice = voice;
  live.add(u);
  const done = (cb) => () => { live.delete(u); cb?.(); };
  u.onend = done(onend); u.onerror = done(onerror);
  if (speechSynthesis.paused) speechSynthesis.resume();
  speechSynthesis.speak(u);
}
function cancelThen(fn) {
  clearTimeout(speakTimer);
  speechSynthesis.cancel();
  live.clear();
  speakTimer = setTimeout(fn, 80);
}

export function speak(text, rate = 0.85) {
  if (!("speechSynthesis" in window)) return false;
  try { cancelThen(() => say(text, { rate })); return true; } catch { return false; }
}

/** True when the device exposes a Mandarin voice (voices may load late; null = unknown yet). */
export function hasChineseVoice() {
  if (!("speechSynthesis" in window)) return false;
  const v = speechSynthesis.getVoices();
  if (!v.length) return null;
  return v.some((x) => /^zh/i.test(x.lang));
}

let seqToken = 0;
/** Speak parts one after another: [{text, pitch?}]. A new call (or stopSpeaking) cancels the previous one. */
export function speakSequence(parts, rate = 0.85) {
  if (!("speechSynthesis" in window)) return false;
  const token = ++seqToken;
  try {
    const next = (i) => {
      if (token !== seqToken || i >= parts.length) return;
      const go = () => setTimeout(() => next(i + 1), parts[i].pause ?? 350);
      say(parts[i].text, { rate, pitch: parts[i].pitch ?? 1, onend: go, onerror: () => next(i + 1) });
    };
    cancelThen(() => next(0));
    return true;
  } catch { return false; }
}
export function stopSpeaking() { seqToken++; clearTimeout(speakTimer); live.clear(); try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch { /* ignore */ } }

/** Audio script of a listening question: dialog turns (女 higher pitch, 男 lower) then the question. */
export function listeningParts(q) {
  if (!q.turns) return [{ text: q.audio }];                       // question / phrase / sentence
  const pitch = { 女: 1.25, 男: 0.8 };
  const parts = q.turns.map((t) => ({ text: t.zh, pitch: pitch[t.who] ?? 1, pause: 500 }));
  if (q.question) parts.push({ text: `问：${q.question}`, pitch: 1 });  // dialog+question MCQ; picture dialogs have no question
  return parts;
}
