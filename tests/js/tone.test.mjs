import test from "node:test";
import assert from "node:assert/strict";
import { syllableTones, expectedTones, analyzeTones, trackPitch, classifyTone, TEMPLATES, resample, TONE_ERRORS } from "../../app/js/tone.js";
import { synthSpeech, upsample, SHAPES } from "./synth.mjs";

const target = (py) => expectedTones(syllableTones(py));
const spokenAs = (sylls) => sylls.map((s) => ({ tone: s.expected, half: s.half }));
const speak = (py, opts) => { const t = target(py); return { t, x: synthSpeech(spokenAs(t), opts) }; };

test("syllableTones reads tone marks, neutral tones and pauses", () => {
  const s = syllableTones("fú wù yuán ， qǐng gěi wǒ cài dān 。");
  assert.deepEqual(s.map((x) => x.tone), [2, 4, 2, 3, 3, 3, 4, 1]);
  assert.equal(s[2].pauseAfter, true);
  assert.equal(s[7].pauseAfter, true);
  assert.deepEqual(syllableTones("nǐ hǎo ma").map((x) => x.tone), [3, 3, 5]);
  assert.deepEqual(syllableTones("lǜ lü").map((x) => x.tone), [4, 5]);
});

test("expectedTones: third-tone sandhi and half-third", () => {
  const e = target("fú wù yuán ， qǐng gěi wǒ cài dān 。");
  assert.deepEqual(e.map((x) => x.expected), [2, 4, 2, 2, 2, 3, 4, 1]);      // 3 3 3 -> 2 2 3
  assert.equal(e[5].half, true);                                              // 我 is followed by 菜: low
  const hao = target("nǐ hǎo 。");
  assert.deepEqual(hao.map((x) => x.expected), [2, 3]);
  assert.equal(hao[1].half, false);                                           // phrase-final 3rd tone keeps the full shape
});

test("trackPitch finds the pitch of a steady voice (male, female) within 2%", () => {
  for (const base of [100, 120, 210, 260]) {
    const x = synthSpeech([{ tone: 1 }, { tone: 1 }, { tone: 1 }], { base, jitter: 0, noise: 0.001 });
    const hz = base * 2 ** (((4.7 - 3) * 2.2) / 12);
    const f = trackPitch(x).filter((fr) => fr.f0 && fr.rms > 0.05).map((fr) => fr.f0);
    assert.ok(f.length > 30, `base ${base}`);
    const med = f.sort((a, b) => a - b)[Math.floor(f.length / 2)];
    assert.ok(Math.abs(med - hz) / hz < 0.02, `base ${base}: ${med} vs ${hz}`);
  }
});

test("classifyTone returns each template's own tone", () => {
  for (const [tone, tpls] of Object.entries(TEMPLATES)) for (const t of tpls) assert.equal(classifyTone(t).tone, Number(tone));
  for (const [k, shape] of Object.entries(SHAPES)) {
    if (k === "5") continue;
    const c = Array.from({ length: 5 }, (_, i) => Math.max(1, Math.min(5, shape[i])));
    assert.equal(classifyTone(c).tone, Number(k[0]), k);
  }
});

test("correctly toned speech scores high for many phrases and speakers", () => {
  const phrases = [
    "fú wù yuán ， qǐng gěi wǒ cài dān 。",
    "nǐ jiào shén me míng zi ？",
    "wǒ yào yì wǎn mǐ fàn 。",
    "zhè ge cài hěn hǎo chī 。",
    "yí gòng duō shao qián ？",
    "hěn gāo xìng rèn shi nǐ 。",
    "wǒ xǐ huan kàn diàn yǐng 。",
  ];
  let total = 0, right = 0, runs = 0;
  for (const py of phrases) for (const [base, seed] of [[110, 3], [130, 11], [215, 5], [190, 17]]) {
    const { t, x } = speak(py, { base, seed });
    const r = analyzeTones(x, 16000, t);
    assert.equal(r.ok, true, `${py} @${base}: ${r.reason}`);
    total += r.scored; right += r.right; runs++;
  }
  const rate = right / total;
  assert.ok(rate >= 0.85, `syllable agreement ${Math.round(rate * 100)}% over ${runs} runs`);
});

test("wrong tones score clearly lower than right tones", () => {
  const py = "nǐ jiào shén me míng zi ？";
  const t = target(py);
  const wrong = t.map((s) => ({ tone: s.expected === 4 ? 1 : s.expected === 1 ? 4 : s.expected === 2 ? 4 : 1 }));
  let good = 0, bad = 0, n = 0;
  for (const [base, seed] of [[115, 1], [125, 2], [205, 3], [225, 4]]) {
    good += analyzeTones(synthSpeech(spokenAs(t), { base, seed }), 16000, t).pct;
    bad += analyzeTones(synthSpeech(wrong, { base, seed }), 16000, t).pct;
    n++;
  }
  assert.ok(good / n >= 80, `right tones ${good / n}`);
  assert.ok(bad / n <= 50, `wrong tones ${bad / n}`);
});

test("works from a 48 kHz recording and with background noise", () => {
  const { t, x } = speak("wǒ yào yì wǎn mǐ fàn 。", { base: 125, seed: 9 });
  assert.ok(analyzeTones(upsample(x, 16000, 48000), 48000, t).pct >= 75);
  const noisy = synthSpeech(spokenAs(t), { base: 125, seed: 9, noise: 0.02 });
  const r = analyzeTones(noisy, 16000, t);
  assert.equal(r.ok, true);
  assert.ok(r.pct >= 60, `noisy ${r.pct}`);
  assert.deepEqual(resample(new Float32Array(48000), 48000).length, 16000);
});

test("failures are reported, not guessed", () => {
  const t = target("nǐ hǎo 。");
  assert.deepEqual(analyzeTones(new Float32Array(32000), 16000, t), { ok: false, reason: "too-quiet" });
  assert.equal(analyzeTones(new Float32Array(500), 16000, t).ok, false);
  assert.equal(analyzeTones(synthSpeech([{ tone: 1 }]), 16000, target("nǐ hǎo ma ， shì ma 。")).reason, "too-short");   // one syllable of speech for five targets
  let seed = 12345;
  const noiseOnly = Float32Array.from({ length: 48000 }, () => (((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) - 0.5) * 0.4);   // loud white noise, no pitch
  assert.equal(analyzeTones(noiseOnly, 16000, t).ok, false);
  assert.equal(analyzeTones(synthSpeech([{ tone: 1 }]), 16000, []).reason, "no-target");
  for (const k of ["too-short", "too-quiet", "no-voice", "decode"]) assert.ok(TONE_ERRORS[k]);
});
