// Synthetic Mandarin-like speech for testing the tone code: harmonic voice, one pitch contour per syllable,
// raised-cosine loudness per syllable with short dips between syllables, a little noise. Deterministic.
export const SHAPES = {
  1: [4.7, 4.7, 4.7, 4.7, 4.7],
  2: [3.0, 3.3, 3.9, 4.5, 5.0],
  3: [2.2, 1.3, 1.0, 1.8, 3.2],
  "3h": [2.2, 1.5, 1.1, 1.1, 1.1],
  4: [5.0, 4.5, 3.3, 2.2, 1.2],
  5: [3.0, 2.9, 2.8, 2.7, 2.6],
};

function rngFrom(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** `spoken`: [{ tone, half? }] what the "speaker" says. base = pitch (Hz) at Chao level 3. */
export function synthSpeech(spoken, { base = 120, sr = 16000, semitonePerLevel = 2.2, seed = 7, gapMs = 35, noise = 0.004, jitter = 0.25, lead = 0.3 } = {}) {
  const rand = rngFrom(seed);
  const out = [];
  const pushSilence = (sec) => { for (let i = 0; i < Math.round(sec * sr); i++) out.push((rand() - 0.5) * 2 * noise); };
  pushSilence(lead);
  let phase = 0;
  spoken.forEach((s, idx) => {
    const key = s.tone === 3 && s.half ? "3h" : s.tone;
    const shape = SHAPES[key].map((c) => c + (rand() - 0.5) * 2 * jitter - 0.12 * idx);   // slight declination
    const dur = Math.round((0.2 + rand() * 0.1) * sr);
    for (let i = 0; i < dur; i++) {
      const p = (i / (dur - 1)) * 4, k = Math.min(3, Math.floor(p)), f = p - k;
      const chao = shape[k] * (1 - f) + shape[k + 1] * f;
      const f0 = base * 2 ** (((chao - 3) * semitonePerLevel) / 12);
      phase += (2 * Math.PI * f0) / sr;
      let v = 0;
      for (let h = 1; h <= 10; h++) v += Math.sin(h * phase) / h;
      const fade = Math.min(1, i / (0.03 * sr), (dur - 1 - i) / (0.03 * sr));
      const amp = 0.3 * Math.sin((Math.PI / 2) * Math.max(0, fade)) ** 2;
      out.push(v * amp * 0.5 + (rand() - 0.5) * 2 * noise);
    }
    pushSilence(gapMs / 1000);
  });
  pushSilence(lead);
  return Float32Array.from(out);
}

/** Linear-interpolated upsampling, to test the resampling path (e.g. 16 kHz -> 48 kHz). */
export function upsample(x, from, to) {
  const n = Math.floor((x.length * to) / from);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = (i * from) / to, a = Math.floor(p); y[i] = x[a] * (1 - (p - a)) + (x[Math.min(a + 1, x.length - 1)] ?? 0) * (p - a); }
  return y;
}
