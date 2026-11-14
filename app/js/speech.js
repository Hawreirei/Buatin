// Speaking practice. Two tiers:
//   1. record yourself and play it next to the model voice (MediaRecorder, nothing is stored or uploaded by the app);
//   2. speech recognition (Web Speech API, zh-CN): what the browser heard is compared with the target sentence.
// The scoring is pure (no DOM, tested in tests/js/speech.test.mjs); the browser wrappers are feature-detected.
// Tone contours are NOT judged here: recognition only tells whether the right words were understood.

const HAN = /[一-鿿]/;
const DIGIT = "零一二三四五六七八九";
export const PASS_PCT = 70;

/** Integer 0-9999 in hanzi (45 -> 四十五, 105 -> 一百零五, 10 -> 十). */
export function numberToHanzi(n) {
  if (n < 10) return DIGIT[n];
  const parts = [];
  const unit = [[1000, "千"], [100, "百"], [10, "十"]];
  let rest = n, zero = false;
  for (const [v, u] of unit) {
    const d = Math.floor(rest / v);
    rest %= v;
    if (d) {
      if (zero) { parts.push("零"); zero = false; }
      if (!(v === 10 && d === 1 && parts.length === 0)) parts.push(DIGIT[d]);
      parts.push(u);
    } else if (parts.length && rest) zero = true;
  }
  if (rest) { if (zero) parts.push("零"); parts.push(DIGIT[rest]); }
  return parts.join("");
}

/** Only the hanzi of a text, with Arabic numbers written as hanzi (recognizers often answer "我要1碗米饭"). */
export function cleanZh(text) {
  const spelled = String(text ?? "").normalize("NFC").replace(/\d+/g, (m) => (m.length <= 4 ? numberToHanzi(Number(m)) : m));
  return [...spelled].filter((c) => HAN.test(c)).join("");
}

/** Which characters of `target` were heard, by longest common subsequence (so one wrong or missing character
 *  does not shift the rest). Returns one boolean per target character. */
export function alignChars(target, heard) {
  const a = [...target], b = [...heard];
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(a.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { hit[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return hit;
}

export function verdict(pct) {
  if (pct >= 90) return { key: "great", label: "Bagus sekali!" };
  if (pct >= PASS_PCT) return { key: "ok", label: "Cukup baik" };
  return { key: "retry", label: "Coba lagi" };
}

/** Score what the recognizer heard against a key sentence ({zh, tokens}). `alternatives` is the recognizer's
 *  list of guesses; the best one counts. Per token: ok only when all its characters were heard. */
export function scoreAttempt(sentence, alternatives) {
  const target = cleanZh(sentence.zh);
  let best = null;
  for (const alt of alternatives ?? []) {
    const heard = cleanZh(alt);
    const hit = alignChars(target, heard);
    const matched = hit.filter(Boolean).length;
    // extra words cost a little: "heard" longer than the target by k characters lowers the score
    const extra = Math.max(0, [...heard].length - [...target].length);
    const pct = target ? Math.max(0, Math.round((100 * (matched - extra * 0.5)) / [...target].length)) : 0;
    if (!best || pct > best.pct) best = { pct, hit, heard: alt, matched };
  }
  if (!best) return { pct: 0, tokens: sentence.tokens.map((t) => ({ t, ok: false })), heard: "", ...verdict(0) };
  let k = 0;
  const tokens = sentence.tokens.map((t) => {
    const chars = [...t].filter((c) => HAN.test(c)).length;
    if (!chars) return { t, ok: null };               // punctuation
    const ok = best.hit.slice(k, k + chars).every(Boolean);
    k += chars;
    return { t, ok };
  });
  return { pct: Math.min(100, best.pct), tokens, heard: best.heard, ...verdict(Math.min(100, best.pct)) };
}

/* ---------- browser side ---------- */
const RecognitionCtor = () => (typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);
export const recognitionSupported = () => !!RecognitionCtor();
export const recorderSupported = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

/** Human message for a failed attempt (error codes are ours or the recognizer's). */
export function errorMessage(code) {
  return ({
    denied: "Akses mikrofon ditolak. Izinkan mikrofon di pengaturan browser, atau tandai sendiri bahwa Anda sudah mengucapkannya.",
    "not-allowed": "Akses mikrofon ditolak. Izinkan mikrofon di pengaturan browser, atau tandai sendiri bahwa Anda sudah mengucapkannya.",
    "no-speech": "Tidak ada suara yang terdengar. Coba lagi lebih dekat ke mikrofon.",
    network: "Pengenalan ucapan butuh internet dan tidak tersambung. Rekaman tetap bisa dibandingkan sendiri.",
    unsupported: "Perangkat ini tidak bisa merekam suara.",
    "audio-capture": "Mikrofon tidak ditemukan.",
  })[code] ?? "Ucapan tidak bisa diproses. Coba lagi.";
}

/** Start listening. Returns { stop(), result: Promise<{ alternatives, audioUrl, error }> }.
 *  `recognize` and `record` choose the tiers; with both off nothing is started. `raw` asks the browser for unprocessed audio
 *  (no echo cancellation / noise suppression / auto gain), which pitch tracking prefers. Result: { alternatives, audioUrl, audioBlob, error }.
 *  The promise never rejects. */
export function startAttempt({ recognize = true, record = true, raw = false, lang = "zh-CN", maxMs = 15000 } = {}) {
  const Rec = recognize ? RecognitionCtor() : null;
  const wantRecord = record && recorderSupported();
  let stopFns = [];
  const stop = () => { const f = stopFns; stopFns = []; f.forEach((fn) => { try { fn(); } catch { /* already stopped */ } }); };

  const result = new Promise((resolve) => {
    let alternatives = [], error = null, audioUrl = null, audioBlob = null, pending = 0, finished = false;
    const finish = () => { if (!finished && pending === 0) { finished = true; clearTimeout(timer); resolve({ alternatives, audioUrl, audioBlob, error }); } };
    const timer = setTimeout(stop, maxMs);
    const track = (setup) => { pending++; setup(() => { pending--; finish(); }); };

    (async () => {
      let stream = null;
      if (wantRecord) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: raw ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false } : true }); }
        catch (e) { if (/NotAllowed|Security/.test(e?.name)) { error = "denied"; return finish(); } }   // other errors: carry on without a recording
      }
      if (stream) {
        track((done) => {
          const chunks = [];
          const rec = new MediaRecorder(stream);
          rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
          rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); if (chunks.length) { audioBlob = new Blob(chunks, { type: rec.mimeType || "audio/webm" }); audioUrl = URL.createObjectURL(audioBlob); } done(); };
          rec.onerror = () => { stream.getTracks().forEach((t) => t.stop()); done(); };
          rec.start();
          stopFns.push(() => rec.state !== "inactive" && rec.stop());
        });
      }
      if (Rec) {
        track((done) => {
          const r = new Rec();
          r.lang = lang; r.interimResults = false; r.continuous = false; r.maxAlternatives = 5;
          r.onresult = (e) => { alternatives = [...(e.results[0] ?? [])].map((a) => a.transcript); };
          r.onerror = (e) => { if (!alternatives.length) error = error ?? e.error ?? "failed"; };
          r.onend = () => { stop(); done(); };            // a pause in speech ends recognition: end the recording too
          try { r.start(); stopFns.push(() => r.stop()); } catch { error = error ?? "failed"; done(); }
        });
      }
      if (!pending) { error = error ?? "unsupported"; finish(); }
    })();
  });
  return { stop, result };
}
