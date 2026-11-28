/* Mistake Cards: wrong test questions come back after 1, 3 and 7 days. Saved on this device (localStorage). */
import { imgHtml, hydrate } from "./media.js?v=30";
import { logAnswer } from "./stats.js?v=30";
const KEY = "gyaan_galti_v1", MKEY = "gyaan_galti_mastered", GAPS = [1, 3, 7], DAY = 864e5, EVERY = 10;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
const idOf = q => JSON.stringify([q.q, q.opts, q.img || "", q.optImgs || []]);
export const mastered = () => { try { return +localStorage.getItem(MKEY) || 0; } catch (e) { return 0; } };
export const removeCard = id => { const d = load(); delete d[id]; save(d); };
export const dueCards = () => Object.values(load()).filter(c => c.due <= Date.now()).sort((a, b) => a.due - b.due);

export function addWrong(questions, answers) {
  const d = load();
  questions.forEach((q, i) => {
    if (answers[i] === q.ans) return;
    const id = idOf(q);
    d[id] = { id, q: { q: q.q, opts: q.opts, ans: q.ans, img: q.img, optImgs: q.optImgs }, stage: 0, due: Date.now() + GAPS[0] * DAY };
  });
  save(d);
}
function grade(card, ok) {
  const d = load(), c = d[card.id];
  if (!c) return;
  if (!ok) { c.stage = 0; c.due = Date.now() + GAPS[0] * DAY; }
  else if (c.due <= Date.now()) {           // early practice does not move the card forward
    c.stage++;
    if (c.stage >= GAPS.length) { delete d[card.id]; try { localStorage.setItem(MKEY, String(mastered() + 1)); } catch (e) {} } else c.due = Date.now() + GAPS[c.stage] * DAY;
  }
  save(d);
  logAnswer(ok);
}
export function showCard(box, card, done) {
  const q = card.q;
  box.innerHTML = `<div class="panel"><div class="qtext">${esc(q.q)}</div>${imgHtml(q.img, "zoomable", "Question image")}
    ${q.opts.map((o, j) => `<button class="opt" data-j="${j}"><b>${"ABCD"[j]}.</b> <span class="opt-text">${esc(o)}</span>${imgHtml((q.optImgs || [])[j], "", "Option")}</button>`).join("")}
    <p class="g-res"></p></div>`;
  hydrate(box);
  let answered = false;
  box.querySelectorAll(".opt").forEach(b => b.onclick = () => {
    if (answered) return; answered = true;
    const j = +b.dataset.j, ok = j === q.ans;
    box.querySelectorAll(".opt")[q.ans].classList.add("good");
    if (!ok) b.classList.add("bad");
    grade(card, ok);
    box.querySelector(".g-res").innerHTML = `${ok ? "✅ Correct!" : "❌ Wrong. The right answer is in green."} <button class="btn btn-gold btn-block g-next">Next</button>`;
    box.querySelector(".g-next").onclick = done;
  });
}
/* reel lock: after every 10 different reels, solve one due card (no due card = no lock) */
const seen = new Set(); let count = 0, locked = null;
export function onReel(id) {
  if (!seen.has(id)) { seen.add(id); count++; }
  if (locked || count <= EVERY) return;
  const card = dueCards()[0];
  if (!card) return;
  locked = document.createElement("div");
  locked.style.cssText = "position:fixed;inset:0;z-index:9999;background:var(--bg,#111);overflow:auto;padding:24px 16px";
  locked.innerHTML = `<h2>🔒 Solve one Mistake Card first</h2><div></div><p><a href="index.html">Go to Home</a></p>`;
  document.body.appendChild(locked);
  const stop = e => e.target.pause && e.target.pause();
  document.querySelectorAll("video").forEach(v => v.pause());
  document.addEventListener("play", stop, true);
  showCard(locked.children[1], card, () => {
    document.removeEventListener("play", stop, true);
    locked.remove(); locked = null; count = 1;
    const v = [...document.querySelectorAll(".rv-item video")].find(v => Math.abs(v.getBoundingClientRect().top) < innerHeight / 2);
    if (v) v.play().catch(() => {});
  });
}
