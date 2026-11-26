/* Gyaan Hub - subscriptions + blue tick.
   Data (Firestore):
     subs/{uid}         { plan: "basic"|"plus"|"premium", until: <ms>, gift: true|false }   (written ONLY by admins)
     subRequests/{uid}  { uid, name, plan, note, status: "pending", ts }                    (written by the student)
   The tick shows while until > now, so a 3-day gift / an expired plan removes itself - no timer needed. */
import * as A from "./auth.js?v=19";

export const DAY = 86400000;
export const PLANS = {
  basic:   { id: "basic",   name: "Basic",   price: 19, perks: ["Blue tick on your profile, chats and posts", "No ads"] },
  plus:    { id: "plus",    name: "Plus",    price: 29, perks: ["Everything in Basic", "Send big files in chat (APK, ZIP, PDF)", "Longer reels", "Extra profile themes"] },
  premium: { id: "premium", name: "Premium", price: 49, perks: ["Everything in Plus", "Premium notes, papers and tests", "Detailed test analysis", "Direct chat support with the owner", "Early access to new features"] }
};
export const PLAN_DAYS = 30;
export const planName = id => (PLANS[id] ? PLANS[id].name : "Free");
export const isActive = r => !!r && Number(r.until) > Date.now();

const TICK_SVG = `<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="#1d9bf0" d="M12 1.6l2.5 1.9 3.1-.2 1 2.9 2.6 1.8-.9 3 .9 3-2.6 1.8-1 2.9-3.1-.2-2.5 1.9-2.5-1.9-3.1.2-1-2.9-2.6-1.8.9-3-.9-3 2.6-1.8 1-2.9 3.1.2z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M7.6 12.2l3 3 5.8-6"/></svg>`;
export const tickSvg = () => TICK_SVG;

/* ---------- cache of all active subscribers (small list; refreshed every 3 minutes) ---------- */
const KEY = "gyaan_subs_v1";
let map = new Map(), loaded = false, loading = null;

function fromCache() {
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (c && Date.now() - c.at < 180000) return c.rows;
  } catch (e) {}
  return null;
}
export function loadSubs(force) {
  if (loading && !force) return loading;
  loading = (async () => {
    let rows = force ? null : fromCache();
    if (!rows) {
      try { rows = await A.fsListPath(["subs"]); } catch (e) { rows = []; }
      try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), rows })); } catch (e) {}
    }
    map = new Map(rows.map(r => [r.id, r]));
    loaded = true;
    paint();
    return map;
  })();
  return loading;
}
export const subOf = uid => map.get(uid) || null;
export const hasTick = uid => isActive(map.get(uid));
export function resetCache() { try { sessionStorage.removeItem(KEY); } catch (e) {} loading = null; }

/* ---------- tick placeholders ----------
   Put  ${tk(uid)}  next to a name. It is filled automatically once the subscriber list is loaded. */
export const tk = uid => `<span class="vtk" data-tk="${String(uid || "").replace(/[^\w-]/g, "")}"></span>`;
export function paint(root = document) {
  if (!loaded) return;
  root.querySelectorAll(".vtk[data-tk]").forEach(el => {
    const r = map.get(el.dataset.tk);
    const on = isActive(r);
    if (on && !el.firstChild) {
      el.innerHTML = TICK_SVG;
      el.title = "Verified subscriber";
      el.setAttribute("role", "img"); el.setAttribute("aria-label", "Verified subscriber");
    } else if (!on && el.firstChild) { el.innerHTML = ""; el.removeAttribute("title"); }
  });
}
let obs = null, queued = false;
export function watchTicks() {
  if (obs) return;
  const run = () => { queued = false; paint(); };
  obs = new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } });
  obs.observe(document.body, { childList: true, subtree: true });
  loadSubs();
}

/* ---------- student side ---------- */
export async function mySub(uid) { try { return await A.fsGetPath(["subs", uid]); } catch (e) { return null; } }
export async function myRequest(uid) { try { return await A.fsGetPath(["subRequests", uid]); } catch (e) { return null; } }
export async function requestPlan(user, plan, note) {
  if (!PLANS[plan]) throw new Error("Unknown plan");
  await A.fsSetPath(["subRequests", user.uid], {
    uid: user.uid, name: user.displayName || (user.email || "").split("@")[0] || "Student", email: user.email || "",
    plan, note: String(note || "").slice(0, 120), status: "pending", ts: Date.now()
  }, false);
}
export const cancelRequest = uid => A.fsDeletePath(["subRequests", uid]);

/* ---------- admin side (Firestore rules allow these only for admins) ---------- */
export async function grant(uid, plan, days, gift) {
  const cur = await A.fsGetPath(["subs", uid]).catch(() => null);
  // a running PAID plan is never shortened or turned into a gift by a later gift
  if (gift && cur && isActive(cur) && !cur.gift) return cur;
  const base = cur && isActive(cur) && !gift ? Number(cur.until) : Date.now();
  const rec = { plan: PLANS[plan] ? plan : "basic", until: base + days * DAY, gift: !!gift, grantedAt: Date.now() };
  await A.fsSetPath(["subs", uid], rec, false);
  resetCache();
  return { id: uid, ...rec };
}
export async function revoke(uid) { await A.fsDeletePath(["subs", uid]); resetCache(); }
export const listRequests = () => A.fsListPath(["subRequests"]);
export const dropRequest = uid => A.fsDeletePath(["subRequests", uid]);
export const listAll = () => A.fsListPath(["subs"]);

export const fmtDate = ms => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const daysLeft = r => Math.max(0, Math.ceil((Number(r.until) - Date.now()) / DAY));
