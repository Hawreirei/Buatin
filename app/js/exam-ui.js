import { h, btn, speakSequence, stopSpeaking, listeningParts, hasChineseVoice } from "./ui.js";
import { LEVEL_LABEL } from "./deck.js";
import { check } from "./practice.js";
import { explain, answerLabel } from "./practice-ui.js";
import { NEW_TYPES, PICTURE_LISTENING, pictureGrid, listeningText, textCard, textQuestion, textOptions } from "./qui.js";
import { wordIdOfQuestion } from "./analytics.js";
import { availability, examAvailable, buildExam, formatClock, gradeSection, summarizeExam, SKILL_LABEL, MAX_AUDIO_PLAYS } from "./exam.js";

const BLANK = "（　）";
let S = { phase: "intro", level: 1 };
let timer = null;

export const examRunning = () => S.phase === "running" || S.phase === "between";
export function abortExam() { clearInterval(timer); timer = null; stopSpeaking(); S = { phase: "intro", level: S.level }; }

export function viewExam(ctx) {
  if (S.phase === "intro") return intro(ctx);
  if (S.phase === "between") return between(ctx);
  if (S.phase === "running") return running(ctx);
  return result(ctx);
}

/* ---------- intro ---------- */
function intro(ctx) {
  const { render, questions, blueprints, store } = ctx;
  const bp = blueprints[String(S.level)];
  const levels = [1, 2, 3, 4, 5, 6];
  const avail = availability(questions, bp);
  const ok = examAvailable(questions, bp);
  const picker = h("div", { class: "row", style: "justify-content:flex-start" }, ...levels.map((l) => {
    const can = blueprints[String(l)] && examAvailable(questions, blueprints[String(l)]);
    return h("label", { style: can ? "" : "opacity:.45" }, h("input", { type: "radio", name: "lvl", value: l, checked: S.level === l, disabled: !can, onchange: () => { S.level = l; viewExam(ctx); } }), ` ${LEVEL_LABEL[l]}`);
  }));
  const prev = store.exams.filter((x) => x.level === S.level).slice(-1)[0];
  render(
    h("h2", {}, "Simulasi Ujian"),
    h("p", { class: "hint" }, "Jumlah soal, pembagian bagian, dan waktu mengikuti tabel resmi CTI. Bagian yang jenis soalnya sudah kami punya (bergambar, teks, dialog, isi kata, tulis hanzi) memakai jenis resmi; sisanya memakai pengganti terdekat. Gambar dibuat dari emoji. Hasilnya perkiraan latihan, bukan skor resmi."),
    h("p", { class: "notice" }, "Waktu tidak bisa dijeda. Setiap bagian berakhir otomatis saat waktu habis dan tidak bisa dibuka lagi. Gunakan headphone bila ada soal mendengar. Audio bisa diputar maksimal 2 kali per soal (aturan resmi tidak disebutkan di dokumen CTI)."),
    picker,
    h("table", {}, h("thead", {}, h("tr", {}, ...["Bagian", "Soal", "Waktu", "Tersedia", "Jenis soal resmi"].map((t) => h("th", {}, t)))),
      h("tbody", {}, ...bp.sections.map((s, i) => h("tr", {}, h("td", {}, SKILL_LABEL[s.skill]), h("td", {}, s.count), h("td", {}, `${s.time_min} mnt`), h("td", {}, `${avail[i].have}${avail[i].ok ? " ✔" : " ✘"}`), h("td", {}, `${avail[i].officialParts}/${avail[i].totalParts} bagian`))))),
    h("p", { class: "hint" }, `Total ${bp.total_questions} soal. Waktu resmi total ±${bp.total_time_min} mnt (termasuk pengisian data diri dan lembar jawaban; di sini hanya waktu pengerjaan).`),
    prev ? h("p", { class: "hint" }, `Percobaan terakhir HSK ${S.level}: ${prev.pct}% (${new Date(prev.t).toLocaleDateString("id-ID")}).`) : null,
    ok ? null : h("p", { class: "notice" }, `Soal untuk ${LEVEL_LABEL[S.level]} belum cukup banyak.`),
    h("div", { class: "row", style: "justify-content:flex-start" }, btn("Mulai ujian", () => start(ctx), "btn primary", { id: "exam-start", disabled: !ok })));
}

function start(ctx) {
  const bp = ctx.blueprints[String(S.level)];
  const exam = buildExam(ctx.questions, bp);
  S = { phase: "between", level: S.level, exam, sec: 0, graded: [], durations: [], responses: exam.sections.map((s) => new Array(s.items.length)), plays: {}, assisted: false, startedAt: Date.now() };
  viewExam(ctx);
}

/* ---------- between sections ---------- */
function between(ctx) {
  const sec = S.exam.sections[S.sec];
  ctx.render(
    h("h2", {}, `HSK ${S.level} · Bagian ${S.sec + 1} dari ${S.exam.sections.length}: ${SKILL_LABEL[sec.skill]}`),
    h("div", { class: "card" }, h("div", { class: "hanzi" }, formatClock(sec.time_ms)), h("p", {}, `${sec.items.length} soal · waktu mulai berjalan saat Anda menekan tombol di bawah.`)),
    sec.skill === "listening" && hasChineseVoice() === false ? h("p", { class: "notice" }, "Perangkat ini tidak punya suara Mandarin. Anda masih bisa membuka teks soal, tetapi hasilnya ditandai 'dibantu teks'.") : null,
    h("div", { class: "row" }, btn("Mulai bagian ini", () => beginSection(ctx), "btn primary", { id: "begin" })),
    S.sec > 0 ? h("p", { class: "hint" }, "Bagian sebelumnya sudah dikunci.") : null);
}

function beginSection(ctx) {
  const sec = S.exam.sections[S.sec];
  S.phase = "running"; S.q = 0; S.sectionStart = Date.now(); S.deadline = S.sectionStart + sec.time_ms; S.textShown = {};
  clearInterval(timer);
  timer = setInterval(() => tick(ctx), 250);
  viewExam(ctx);
}

function tick(ctx) {
  const left = S.deadline - Date.now();
  const el = document.getElementById("clock");
  if (el) { el.textContent = formatClock(left); el.classList.toggle("bad", left < 60_000); }
  if (left <= 0) endSection(ctx, true);
}

function endSection(ctx, auto = false) {
  if (S.phase !== "running") return;
  clearInterval(timer); timer = null; stopSpeaking();
  const sec = S.exam.sections[S.sec];
  S.graded.push(gradeSection(sec, S.responses[S.sec], check));
  S.durations.push(Math.min(sec.time_ms, Date.now() - S.sectionStart));
  if (auto) S.lastAuto = true;
  if (S.sec + 1 >= S.exam.sections.length) return finishExam(ctx);
  S.sec += 1; S.phase = "between";
  viewExam(ctx);
}

/* ---------- running ---------- */
function running(ctx) {
  const sec = S.exam.sections[S.sec];
  const q = sec.items[S.q];
  const resp = S.responses[S.sec];
  const unanswered = resp.filter((r, i) => i < sec.items.length && (r === undefined || r === "")).length;
  const nav = h("div", { class: "navgrid", role: "navigation", "aria-label": "Nomor soal" }, ...sec.items.map((_, i) => {
    const done = resp[i] !== undefined && resp[i] !== "";
    return btn(String(i + 1), () => { S.q = i; viewExam(ctx); }, `btn navbtn${done ? " done" : ""}${i === S.q ? " cur" : ""}`, { "aria-label": `Soal ${i + 1}${done ? ", sudah dijawab" : ""}` });
  }));
  const top = h("div", { class: "examtop" },
    h("div", {}, h("strong", {}, `HSK ${S.level} · ${SKILL_LABEL[sec.skill]}`), h("div", { class: "hint" }, `Soal ${S.q + 1}/${sec.items.length} · belum dijawab ${unanswered}`)),
    h("div", { id: "clock", class: "clock", role: "timer", "aria-live": "off" }, formatClock(S.deadline - Date.now())));
  const endBtn = btn("Selesai bagian ini", () => {
    if (unanswered && !confirm(`Masih ada ${unanswered} soal belum dijawab. Akhiri bagian ini? Anda tidak bisa kembali.`)) return;
    endSection(ctx);
  }, "btn", { id: "end-section" });
  const prev = btn("← Sebelumnya", () => { S.q = Math.max(0, S.q - 1); viewExam(ctx); }, "btn", { disabled: S.q === 0 });
  const next = btn("Berikutnya →", () => { S.q = Math.min(sec.items.length - 1, S.q + 1); viewExam(ctx); }, "btn", { id: "next-q", disabled: S.q === sec.items.length - 1 });
  ctx.render(top, nav, questionBody(ctx, q, resp), h("div", { class: "row" }, prev, next), h("div", { class: "row" }, endBtn));
  const inp = document.getElementById("hanzi");
  if (inp) inp.focus();
}

function newBody(ctx, q, resp) {
  const set = (v) => { resp[S.q] = v; viewExam(ctx); };
  if (PICTURE_LISTENING.has(q.type)) {
    const used = S.plays[q.id] || 0;
    const left = MAX_AUDIO_PLAYS - used;
    const voice = hasChineseVoice();
    const show = !!S.textShown[q.id];
    return h("div", {}, h("p", { class: "hint" }, "Dengarkan, lalu pilih gambar."),
      h("div", { class: "card" },
        btn(`🔊 Putar (sisa ${Math.max(0, left)})`, () => { if (left <= 0) return; S.plays[q.id] = used + 1; speakSequence(listeningParts(q), 0.8); viewExam(ctx); }, "btn primary", { id: "play", disabled: left <= 0 }),
        voice === false ? h("p", { class: "notice" }, "Tidak ada suara Mandarin di perangkat ini.") : null,
        h("div", { class: "row" }, btn(show ? "Sembunyikan teks" : "Tampilkan teks (ditandai dibantu)", () => { S.textShown[q.id] = !show; if (!show) S.assisted = true; viewExam(ctx); }, "btn")),
        show ? listeningText(q) : null),
      pictureGrid(q, { picked: resp[S.q]?.key ?? null, answer: null }, set));
  }
  if (q.type === "sentence_match_picture") {
    return h("div", {}, h("p", { class: "hint" }, "Baca kalimat, lalu pilih gambar."), textCard(q, true), pictureGrid(q, { picked: resp[S.q]?.key ?? null, answer: null }, set));
  }
  S.pinyinShown ||= {};
  const showPinyin = q.level === 1 || !!S.pinyinShown[q.id];
  return h("div", {}, h("p", { class: "hint" }, "Baca, lalu pilih jawaban."), textCard(q, showPinyin),
    q.level > 1 ? h("div", { class: "row" }, btn(showPinyin ? "Sembunyikan pinyin" : "Tampilkan pinyin", () => { S.pinyinShown[q.id] = !showPinyin; viewExam(ctx); }, "btn")) : null,
    textQuestion(q), textOptions(q, { picked: resp[S.q]?.zh ?? null, answer: null }, set));
}

function questionBody(ctx, q, resp) {
  if (NEW_TYPES.has(q.type)) return newBody(ctx, q, resp);
  const set = (v) => { resp[S.q] = v; viewExam(ctx); };
  if (q.type === "cloze_wordbank") {
    return h("div", {}, h("p", { class: "hint" }, "Pilih kata yang tepat."), h("div", { class: "card" }, h("div", { class: "stem", lang: "zh-Hans" }, q.stem)),
      h("div", { class: "opts" }, ...q.options.map((o, k) => btn([h("span", { class: "zh", lang: "zh-Hans" }, `${"ABCD"[k]}  ${o.word}`), h("small", { class: "muted" }, `  ${o.pinyin}`)], () => set(o), `btn${resp[S.q]?.word === o.word ? " picked" : ""}`))));
  }
  if (q.type === "write_hanzi_from_pinyin") {
    const [before, after] = q.stem.split(BLANK);
    const input = h("input", { type: "text", lang: "zh-Hans", id: "hanzi", autocomplete: "off", "aria-label": "Hanzi yang hilang", style: "width:3.2em;font-size:28px;text-align:center", value: resp[S.q] ?? "" });
    input.addEventListener("input", () => { resp[S.q] = input.value.trim(); const b = document.querySelector(`.navbtn:nth-child(${S.q + 1})`); if (b) b.classList.toggle("done", !!resp[S.q]); });
    return h("div", {}, h("p", { class: "hint" }, "Tulis hanzi yang hilang."), h("div", { class: "card" }, h("div", { class: "stem", lang: "zh-Hans" }, before, h("span", { class: "blankbox" }, h("span", { class: "hint-py" }, q.hint_pinyin), input), after)));
  }
  const used = S.plays[q.id] || 0;
  const left = MAX_AUDIO_PLAYS - used;
  const voice = hasChineseVoice();
  const show = !!S.textShown[q.id];
  return h("div", {}, h("p", { class: "hint" }, "Dengarkan, lalu pilih jawaban."),
    h("div", { class: "card" },
      btn(`🔊 Putar (sisa ${Math.max(0, left)})`, () => { if (left <= 0) return; S.plays[q.id] = used + 1; speakSequence(listeningParts(q), 0.8); viewExam(ctx); }, "btn primary", { id: "play", disabled: left <= 0 }),
      voice === false ? h("p", { class: "notice" }, "Tidak ada suara Mandarin di perangkat ini.") : null,
      h("div", { class: "row" }, btn(show ? "Sembunyikan teks" : "Tampilkan teks (ditandai dibantu)", () => { S.textShown[q.id] = !show; if (!show) S.assisted = true; viewExam(ctx); }, "btn")),
      show ? h("div", {}, ...(q.turns ? q.turns.flatMap((t) => [h("div", { class: "stem", lang: "zh-Hans" }, t.who ? `${t.who}：${t.zh}` : t.zh), h("div", { class: "pinyin" }, t.pinyin)]).concat([h("div", { class: "stem", lang: "zh-Hans" }, `问：${q.question}`)]) : [h("div", { class: "stem", lang: "zh-Hans" }, q.audio), h("div", { class: "pinyin" }, q.audio_pinyin)])) : null),
    h("div", { class: "opts" }, ...q.options.map((o, k) => btn([h("span", { class: "zh", lang: "zh-Hans" }, `${"ABC"[k]}  ${o.zh}`), h("div", { class: "muted", style: "font-size:13px" }, o.pinyin)], () => { resp[S.q] = o; viewExam(ctx); }, `btn${resp[S.q]?.zh === o.zh ? " picked" : ""}`))));
}

/* ---------- result ---------- */
function finishExam(ctx) {
  const sum = summarizeExam(S.graded, S.durations);
  const { store } = ctx;
  const before = store.exams.filter((x) => x.level === S.level).slice(-1)[0];
  const rec = { t: Date.now(), level: S.level, pct: sum.pct, correct: sum.correct, total: sum.total, assisted: S.assisted, duration_ms: Date.now() - S.startedAt, sections: sum.sections };
  S.graded.forEach((g) => g.rows.forEach((r) => store.logPractice(r.q.skill, r.correct, { k: "exam", l: S.level, ty: r.q.type, id: r.q.id, w: wordIdOfQuestion(r.q), ms: 0, un: !r.answered })));
  store.logExam(rec);
  S = { ...S, phase: "result", sum, before };
  viewExam(ctx);
}

function result(ctx) {
  const { sum, before, graded } = S;
  const delta = before ? sum.pct - before.pct : null;
  const wrong = graded.flatMap((g) => g.rows.filter((r) => !r.correct));
  ctx.render(
    h("h2", {}, `Hasil Simulasi HSK ${S.level}`),
    h("div", { class: "card" }, h("div", { class: "hanzi" }, `${sum.correct}/${sum.total}`), h("div", { class: "gloss" }, `${sum.pct}%`),
      delta == null ? h("p", { class: "hint" }, "Ini percobaan pertama untuk level ini.") : h("p", { class: delta >= 0 ? "ok" : "bad" }, `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} poin dibanding percobaan sebelumnya (${before.pct}%)`),
      S.assisted ? h("p", { class: "hint" }, "Ditandai dibantu: teks audio dibuka pada sebagian soal.") : null),
    h("table", {}, h("thead", {}, h("tr", {}, ...["Bagian", "Benar", "Dijawab", "%", "Waktu"].map((t) => h("th", {}, t)))),
      h("tbody", {}, ...sum.sections.map((s) => h("tr", {}, h("td", {}, SKILL_LABEL[s.skill]), h("td", {}, `${s.correct}/${s.total}`), h("td", {}, s.answered), h("td", {}, `${s.pct}%`), h("td", {}, formatClock(s.ms)))))),
    h("p", { class: "hint" }, `${S.exam.official_items} dari ${S.exam.total} soal memakai jenis soal resmi; sisanya pengganti terdekat. Bukan skor resmi HSK: sistem penilaian resmi belum diketahui.`),
    wrong.length ? h("h2", {}, `Pembahasan (${wrong.length} soal salah atau kosong)`) : h("p", {}, "Semua benar. 太好了！"),
    ...wrong.map((r) => h("div", { class: "example" }, h("div", { class: "hint" }, `#${r.q.id} · ${SKILL_LABEL[r.q.skill]} · ${r.answered ? "salah" : "tidak dijawab"}`), explain(r.q), h("div", { class: "hint" }, `Jawaban yang benar: ${answerLabel(r.q)}`))),
    h("div", { class: "row" }, btn("Simulasi lagi", () => { S = { phase: "intro", level: S.level }; viewExam(ctx); }, "btn primary", { id: "exam-again" })));
}
