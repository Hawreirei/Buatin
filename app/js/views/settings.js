import { LEVEL_LABEL } from "../deck.js";
import { h, btn } from "../ui.js";
import { resetQuiz } from "./quiz.js";

export function viewSettings(app) {
  const { store } = app;
  const s = store.settings;
  const levelBoxes = Object.keys(LEVEL_LABEL).map(Number).map((l) =>
    h("label", {}, h("input", { type: "checkbox", checked: s.levels.includes(l), onchange: (e) => {
      const set = new Set(store.settings.levels);
      e.target.checked ? set.add(l) : set.delete(l);
      if (set.size === 0) { e.target.checked = true; return; }     // at least one level stays on
      store.setSettings({ levels: [...set].sort() });
      resetQuiz();
    } }), " ", LEVEL_LABEL[l]));
  const newPer = h("input", { type: "number", min: 1, max: 200, value: s.newPerDay, "aria-label": "Kata baru per hari", onchange: (e) => {
    const v = Math.min(200, Math.max(1, parseInt(e.target.value, 10) || 10));
    e.target.value = v;
    store.setSettings({ newPerDay: v });
  } });
  const speakBox = h("input", { type: "checkbox", checked: s.speak, onchange: (e) => store.setSettings({ speak: e.target.checked }) });
  const modeRadio = (val, label) => h("label", {}, h("input", { type: "radio", name: "writemode", value: val, checked: s.writeMode === val, onchange: () => store.setSettings({ writeMode: val }) }), " ", label);
  const fileIn = h("input", { type: "file", accept: "application/json", "aria-label": "Impor progres", onchange: async (e) => {
    try { store.import(await e.target.files[0].text()); alert("Progres berhasil diimpor."); viewSettings(app); } catch (err) { alert(err.message); }
  } });
  const exportFile = () => {
    const url = URL.createObjectURL(new Blob([store.export()], { type: "application/json" }));
    h("a", { href: url, download: "learning-chinese-progres.json" }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const panel = (title, ...kids) => h("div", { class: "panel" }, h("h2", {}, title), ...kids);
  app.render(h("div", { class: "pagehead" }, h("div", {}, h("h2", {}, "Pengaturan"), h("p", { class: "hint" }, "Disimpan di perangkat ini."))),
    h("div", { class: "grid-2" },
      panel("Level yang dipelajari", h("div", {}, ...levelBoxes)),
      panel("Kata baru per hari", newPer),
      panel("Soal menulis hanzi", h("div", {}, modeRadio("choice", "Pilihan ganda (4 hanzi, ketuk langsung)"), h("br"), modeRadio("tiles", "Bank hanzi (6 kepingan + kotak ketik, lalu Periksa)")),
        h("p", { class: "hint" }, "Tidak perlu keyboard Mandarin. Mode bank hanzi tetap bisa diketik jika kamu punya keyboard Mandarin.")),
      panel("Suara", h("label", {}, speakBox, " Ucapkan kata saat jawaban ditampilkan"),
        h("p", { class: "hint" }, "Memakai suara bawaan perangkat (zh-CN). Jika tidak ada suara Mandarin terpasang, tombol suara tidak akan berbunyi.")),
      panel("Data", h("div", { class: "row", style: "justify-content:flex-start" },
        btn("Ekspor progres", exportFile), fileIn,
        btn("Reset progres", () => { if (confirm("Hapus semua progres (hafalan, latihan, dan ujian)?")) { store.reset(); viewSettings(app); } })))),
    h("p", { class: "notice" }, "Terjemahan Indonesia dan kalimat contoh untuk HSK 1–3 ditulis dengan bantuan AI dan belum direview penutur asli; pinyin kalimat dibuat otomatis. Level lain memakai arti Inggris dari CC-CEDICT (CC BY-SA 4.0), ±8% kata belum punya arti."));
}
