/* Gyaan Hub - study stats: daily goal, streak, XP and level. Saved on this device (localStorage).
   Every answered question (tests, Rapid Fire, Mistake Cards) calls logAnswer(). */
const KEY = "gyaan_stats_v1";
const dayKey = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const write = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };

export const XP_CORRECT = 5, XP_WRONG = 1, GOAL_OPTIONS = [10, 20, 30, 50, 100];

/* record answered questions: logAnswer(true) or logAnswer(correctCount, wrongCount) */
export function logAnswer(correct, wrong = 0) {
  const c = correct === true ? 1 : correct === false ? 0 : +correct || 0;
  const w = correct === false ? 1 : correct === true ? 0 : +wrong || 0;
  if (!c && !w) return;
  const d = read(), k = dayKey();
  d.days = d.days || {};
  const day = d.days[k] || (d.days[k] = { a: 0, c: 0 });
  day.a += c + w; day.c += c;
  d.xp = (d.xp || 0) + c * XP_CORRECT + w * XP_WRONG;
  // keep only the last 60 days
  const keys = Object.keys(d.days).sort();
  while (keys.length > 60) delete d.days[keys.shift()];
  write(d);
}
export const addXp = n => { const d = read(); d.xp = (d.xp || 0) + n; write(d); };

export const getGoal = () => { const g = +read().goal; return g > 0 ? g : 20; };
export const setGoal = g => { const d = read(); d.goal = g; write(d); };

export function today() {
  const day = (read().days || {})[dayKey()] || { a: 0, c: 0 };
  return { answered: day.a, correct: day.c, goal: getGoal() };
}
/* consecutive days with at least one answered question (today not required until the day ends) */
export function streak() {
  const days = read().days || {};
  const d = new Date();
  if (!(days[dayKey(d)] && days[dayKey(d)].a)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[dayKey(d)] && days[dayKey(d)].a) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function last7() {
  const days = read().days || {}, out = [], d = new Date();
  d.setDate(d.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    const v = days[dayKey(d)] || { a: 0, c: 0 };
    out.push({ label: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1), answered: v.a, correct: v.c, isToday: i === 6 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}
/* level n needs 50 * (n-1)^2 XP in total: 0, 50, 200, 450, 800 ... */
export function level() {
  const xp = read().xp || 0;
  let lv = 1; while (xp >= 50 * lv * lv) lv++;
  const from = 50 * (lv - 1) * (lv - 1), to = 50 * lv * lv;
  return { xp, level: lv, into: xp - from, need: to - from, pct: Math.round((xp - from) / (to - from) * 100) };
}
export const accuracy = () => {
  const days = read().days || {}; let a = 0, c = 0;
  Object.values(days).forEach(v => { a += v.a; c += v.c; });
  return a ? Math.round(c / a * 100) : null;
};

/* The "Today" card for the dashboard */
export function todayCardHtml() {
  const t = today(), s = streak(), lv = level(), w = last7(), acc = accuracy();
  const pct = Math.min(100, Math.round(t.answered / t.goal * 100)), done = t.answered >= t.goal;
  const R = 34, C = 2 * Math.PI * R, max = Math.max(1, ...w.map(x => x.answered));
  return `<section class="gs-card" aria-label="Today">
    <div class="gs-top">
      <div class="gs-ring" role="img" aria-label="${pct}% of daily goal">
        <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${R}" class="gs-bg"/><circle cx="40" cy="40" r="${R}" class="gs-fg ${done ? "done" : ""}" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg>
        <b>${done ? "✓" : pct + "%"}</b>
      </div>
      <div class="gs-main">
        <h3>${done ? "Daily goal complete!" : "Today's goal"}</h3>
        <p>${t.answered} / ${t.goal} questions${t.answered ? " · " + Math.round(t.correct / t.answered * 100) + "% correct" : ""}</p>
        <button type="button" class="gs-goal" id="gs-goal">Change goal</button>
      </div>
    </div>
    <div class="gs-chips">
      <span class="gs-chip"><i>🔥</i><b>${s}</b><small>day streak</small></span>
      <span class="gs-chip"><i>⭐</i><b>${lv.xp}</b><small>XP</small></span>
      <span class="gs-chip"><i>🎯</i><b>${acc == null ? "–" : acc + "%"}</b><small>accuracy</small></span>
    </div>
    <div class="gs-lv"><span>Level ${lv.level}</span><div class="gs-bar"><i style="width:${lv.pct}%"></i></div><small>${lv.into}/${lv.need} XP</small></div>
    <div class="gs-week" aria-label="Last 7 days">${w.map(x => `<span class="${x.isToday ? "now" : ""}" title="${x.answered} answered"><i style="height:${x.answered ? Math.max(8, Math.round(x.answered / max * 100)) : 4}%"></i><em>${esc(x.label)}</em></span>`).join("")}</div>
  </section>`;
}
export function mountTodayCard(host) {
  const draw = () => {
    host.innerHTML = todayCardHtml();
    host.querySelector("#gs-goal").onclick = () => {
      const cur = getGoal(), next = GOAL_OPTIONS[(GOAL_OPTIONS.indexOf(cur) + 1) % GOAL_OPTIONS.length] || 20;
      setGoal(next); draw();
    };
  };
  draw();
  return draw;
}
