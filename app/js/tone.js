// Tone-contour estimate (EXPERIMENTAL). Pure signal code, no DOM: tested on synthetic speech in tests/js/tone.test.mjs.
//
// Pipeline: samples -> 16 kHz -> YIN pitch per 10 ms frame -> speech span (energy) -> cut into N syllables
// (dynamic programming: equal-ish lengths, cuts at energy dips) -> per-syllable pitch contour on a speaker-relative
// 1-5 scale (like Chao tone letters) -> nearest of the four tone shapes -> compared with the tone the pinyin asks for.
//
// This is an estimate. It depends on microphone, room, and how the learner speaks, and it cannot tell WHAT was said:
// it assumes the learner said the target sentence (the speech recognizer, when on, checks that separately).

export const TARGET_SR = 16000;
const HOP = 160;                  // 10 ms
const WIN = 480;                  // 30 ms integration window
const TAU_MIN = 40, TAU_MAX = 230; // 400 Hz .. ~70 Hz at 16 kHz
const MIN_VOICED = 4;             // frames (40 ms) of pitch a syllable needs to be judged

/* ---------- pinyin -> expected tones ---------- */
const MARKS = { ā: 1, á: 2, ǎ: 3, à: 4, ē: 1, é: 2, ě: 3, è: 4, ī: 1, í: 2, ǐ: 3, ì: 4, ō: 1, ó: 2, ǒ: 3, ò: 4, ū: 1, ú: 2, ǔ: 3, ù: 4, ǖ: 1, ǘ: 2, ǚ: 3, ǜ: 4 };
const PAUSE = /^[，。？！、；：,.?!;:…]+$/;

/** From a spaced pinyin line ("fú wù yuán ， qǐng …") to syllables: { syl, tone (written, 5 = neutral), pauseAfter }. */
export function syllableTones(pinyinLine) {
  const out = [];
  for (const part of String(pinyinLine).trim().split(/\s+/)) {
    if (!part) continue;
    if (PAUSE.test(part)) { if (out.length) out[out.length - 1].pauseAfter = true; continue; }
    const tone = [...part.toLowerCase()].map((c) => MARKS[c]).find(Boolean) ?? 5;
    out.push({ syl: part, tone, pauseAfter: false });
  }
  if (out.length) out[out.length - 1].pauseAfter = true;
  return out;
}

/** Spoken tones: third-tone sandhi (all but the last of a run of 3s become 2) and `half` for a 3rd tone that is
 *  followed by another syllable in the same phrase (spoken as a low "21", not the full dip). 不/一 sandhi is already
 *  in the pinyin (bú, yí). */
export function expectedTones(sylls) {
  const out = sylls.map((s) => ({ ...s, expected: s.tone, half: false }));
  for (let i = 0; i < out.length; i++) {
    if (out[i].tone !== 3) continue;
    let j = i;
    while (j + 1 < out.length && out[j].tone === 3 && !out[j].pauseAfter && out[j + 1].tone === 3) j++;
    for (let k = i; k < j; k++) out[k].expected = 2;            // 3 3 -> 2 3
    const last = out[j];
    last.half = !last.pauseAfter;                               // followed by a non-3 tone: low
    i = j;
  }
  return out;
}

/* ---------- tone shapes on the 1 (low) .. 5 (high) scale, 5 points each ---------- */
export const TEMPLATES = {
  1: [[4.6, 4.6, 4.6, 4.6, 4.6]],
  2: [[3.0, 3.2, 3.7, 4.3, 4.8]],
  3: [[2.2, 1.4, 1.1, 1.5, 2.4], [2.2, 1.5, 1.2, 1.1, 1.1]],    // full dip / half (low)
  4: [[4.9, 4.3, 3.3, 2.3, 1.3]],
};

export function resample(samples, sr, target = TARGET_SR) {
  if (sr === target) return Float32Array.from(samples);
  const ratio = sr / target;
  const n = Math.floor(samples.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {                                 // average over the source window: a cheap low-pass
    const a = Math.floor(i * ratio), b = Math.max(a + 1, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let k = a; k < b && k < samples.length; k++) s += samples[k];
    out[i] = s / (b - a);
  }
  return out;
}

/** YIN pitch (de Cheveigné & Kawahara 2002), one value per 10 ms: { t, f0 | null, rms }. */
export function trackPitch(x, sr = TARGET_SR) {
  const frames = [];
  const d = new Float32Array(TAU_MAX + 2), cm = new Float32Array(TAU_MAX + 2);
  for (let start = 0; start + WIN + TAU_MAX + 1 <= x.length; start += HOP) {
    let e = 0;
    for (let j = 0; j < WIN; j++) e += x[start + j] * x[start + j];
    const rms = Math.sqrt(e / WIN);
    let f0 = null;
    if (rms > 1e-4) {
      for (let tau = 1; tau <= TAU_MAX + 1; tau++) {
        let s = 0;
        for (let j = 0; j < WIN; j++) { const v = x[start + j] - x[start + j + tau]; s += v * v; }
        d[tau] = s;
      }
      let run = 0;
      cm[0] = 1;
      for (let tau = 1; tau <= TAU_MAX + 1; tau++) { run += d[tau]; cm[tau] = run ? (d[tau] * tau) / run : 1; }
      let best = -1;
      for (let tau = TAU_MIN; tau <= TAU_MAX; tau++) {
        if (cm[tau] < 0.15) { while (tau + 1 <= TAU_MAX && cm[tau + 1] < cm[tau]) tau++; best = tau; break; }
      }
      if (best < 0) {                                           // no clear dip: take the global minimum if it is still convincing
        let m = TAU_MIN;
        for (let tau = TAU_MIN; tau <= TAU_MAX; tau++) if (cm[tau] < cm[m]) m = tau;
        if (cm[m] < 0.3) best = m;
      }
      if (best > 0) {
        const a = cm[best - 1], b = cm[best], c = cm[best + 1];
        const den = a - 2 * b + c;
        const tau = den !== 0 ? best + (a - c) / (2 * den) : best;   // parabolic interpolation
        f0 = sr / tau;
      }
    }
    frames.push({ t: (start + WIN / 2) / sr, f0, rms });
  }
  return frames;
}

const median = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const percentile = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.round((p / 100) * (s.length - 1)))] : 0; };

/** Cut frames [a, b) into n syllables: equal-ish lengths, cut where the energy is lowest. Returns n+1 boundaries. */
export function segment(env, a, b, n) {
  const F = b - a;
  const L = F / n;
  const minLen = Math.max(3, Math.floor(L * 0.35)), maxLen = Math.ceil(L * 2.2);
  const hi = Math.max(...env.slice(a, b), 1e-9);
  const dip = (i) => (env[a + i - 1] + env[a + i] + (env[a + i + 1] ?? env[a + i])) / (3 * hi);   // 0 = silent, 1 = loud
  const INF = 1e9;
  const best = Array.from({ length: n + 1 }, () => new Float64Array(F + 1).fill(INF));
  const from = Array.from({ length: n + 1 }, () => new Int32Array(F + 1).fill(-1));
  best[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let i = k * minLen; i <= F; i++) {
      for (let j = Math.max((k - 1) * minLen, i - maxLen); j <= i - minLen; j++) {
        if (best[k - 1][j] >= INF) continue;
        const len = i - j;
        const c = best[k - 1][j] + ((len - L) / L) ** 2 + (k > 1 ? 2.5 * dip(j) : 0);
        if (c < best[k][i]) { best[k][i] = c; from[k][i] = j; }
      }
    }
  }
  if (best[n][F] >= INF) return Array.from({ length: n + 1 }, (_, k) => a + Math.round((k * F) / n));   // too short for the constraints: equal parts
  const cuts = [b];
  for (let k = n, i = F; k >= 1; k--) { i = from[k][i]; cuts.push(a + i); }
  return cuts.reverse();
}

function shapeDistance(c, tpl) {
  let s = 0;
  for (let i = 0; i < 5; i++) s += (c[i] - tpl[i]) ** 2;
  return Math.sqrt(s / 5);
}
export function classifyTone(contour) {
  let bestTone = 0, bestD = Infinity;
  const dist = {};
  for (const [tone, tpls] of Object.entries(TEMPLATES)) {
    const d = Math.min(...tpls.map((t) => shapeDistance(contour, t)));
    dist[tone] = d;
    if (d < bestD) { bestD = d; bestTone = Number(tone); }
  }
  return { tone: bestTone, dist };
}

function resample5(v) {
  if (v.length === 1) return Array(5).fill(v[0]);
  return Array.from({ length: 5 }, (_, k) => {
    const p = (k * (v.length - 1)) / 4, i = Math.floor(p), f = p - i;
    return v[i] * (1 - f) + (v[Math.min(i + 1, v.length - 1)] ?? v[i]) * f;
  });
}

/** Analyse speech against the target syllables (from expectedTones). Returns
 *  { ok: false, reason } or { ok: true, pct, scored, syllables: [{ syl, expected, heard, ok, contour }] }. */
export function analyzeTones(samples, sampleRate, sylls) {
  const n = sylls.length;
  if (!n) return { ok: false, reason: "no-target" };
  const x = resample(samples, sampleRate);
  const frames = trackPitch(x);
  if (frames.length < n * 5) return { ok: false, reason: "too-short" };

  const env = frames.map((f, i) => (frames[i - 1]?.rms ?? f.rms) * 0.25 + f.rms * 0.5 + (frames[i + 1]?.rms ?? f.rms) * 0.25);
  const peak = Math.max(...env);
  if (peak < 0.003) return { ok: false, reason: "too-quiet" };
  const thr = peak * 0.12;
  const a = env.findIndex((v) => v > thr);
  let b = env.length - 1;
  while (b > a && env[b] <= thr) b--;
  b += 1;
  if (a < 0 || b - a < n * 10) return { ok: false, reason: "too-short" };

  // pitch of voiced frames in the speech span, in semitones, with octave jumps repaired
  const voiced = [];
  for (let i = a; i < b; i++) if (frames[i].f0 && env[i] > thr) voiced.push(i);
  if (voiced.length < n * MIN_VOICED) return { ok: false, reason: "no-voice" };
  const refHz = median(voiced.map((i) => frames[i].f0));
  const st = new Map();
  const recent = [];
  let prev = -99;
  for (const i of voiced) {
    let v = 12 * Math.log2(frames[i].f0 / refHz);
    if (i - prev > 3) recent.length = 0;                       // after a gap (new syllable) a big jump is real: nothing to compare with
    if (recent.length >= 2) {
      const local = median(recent), diff = v - local;
      if (Math.abs(diff) > 9) {                                 // an octave error is a jump of about 12 semitones; real jumps are smaller
        const fixed = v - Math.sign(diff) * 12;
        if (Math.abs(fixed - local) <= 4) v = fixed;
      }
    }
    st.set(i, v);
    recent.push(v);
    if (recent.length > 5) recent.shift();
    prev = i;
  }
  const all = [...st.values()];
  const lo = percentile(all, 10), hi = percentile(all, 90);
  const span = Math.max(hi - lo, 5), centre = (hi + lo) / 2;
  const chao = (v) => Math.min(6, Math.max(0, 3 + (4 * (v - centre)) / span));

  const cuts = segment(env, a, b, n);
  const out = sylls.map((s, k) => {
    const inSeg = voiced.filter((i) => i >= cuts[k] && i < cuts[k + 1]);
    const loud = Math.max(0, ...inSeg.map((i) => env[i]));
    const idx = inSeg.filter((i) => env[i] >= 0.4 * loud);                 // the quiet edges belong to neighbours (or are coarticulation)
    const row = { syl: s.syl, tone: s.tone, expected: s.expected, half: s.half, heard: null, ok: null, contour: null };
    if (s.expected === 5 || idx.length < MIN_VOICED) return row;            // neutral tone or too little pitch: not judged
    const vals = idx.map((i) => chao(st.get(i)));
    const smooth = vals.map((v, i) => median([vals[i - 1] ?? v, v, vals[i + 1] ?? v]));
    const contour = resample5(smooth);
    const { tone } = classifyTone(contour);
    return { ...row, contour, heard: tone, ok: tone === s.expected };
  });
  const judged = out.filter((s) => s.ok !== null);
  if (judged.length < 2) return { ok: false, reason: "no-voice" };
  const right = judged.filter((s) => s.ok).length;
  return { ok: true, pct: Math.round((100 * right) / judged.length), scored: judged.length, right, syllables: out };
}

/** Decode a recording (Blob from MediaRecorder) to mono samples. Browser only. */
export async function decodeBlob(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error("no-audio-context");
  const ctx = new Ctx();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    return { samples: Float32Array.from(buf.getChannelData(0)), sampleRate: buf.sampleRate };
  } finally { ctx.close?.(); }
}

export const TONE_ERRORS = {
  "too-short": "Rekaman terlalu pendek untuk dianalisis. Ucapkan seluruh kalimat dengan tempo wajar.",
  "too-quiet": "Suara terlalu pelan. Ucapkan lebih keras dan dekatkan mikrofon.",
  "no-voice": "Tinggi suara tidak terdeteksi cukup jelas (bising, berbisik, atau terlalu singkat). Coba lagi di tempat yang lebih tenang.",
  "no-target": "Tidak ada suku kata target.",
  decode: "Rekaman tidak bisa dibaca untuk analisis nada di browser ini.",
};
