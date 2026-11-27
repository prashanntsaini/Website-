// Gyaan Hub - Student Community (profiles, follow, rank, messages, block / report)
// Uses the SAME Firebase project and helpers as the rest of the site (auth.js). No new keys, no new services.
import * as A from "./auth.js?v=24";
import { squareAvatar } from "./media.js?v=24";
import * as F from "./files.js?v=24";
import * as S from "./sub.js?v=24";

export { A, squareAvatar, F, S };
export const tk = S.tk;                 // blue tick placeholder: ${C.tk(uid)} next to a name
if (typeof document !== "undefined") { if (document.body) S.watchTicks(); else addEventListener("DOMContentLoaded", S.watchTicks); }
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Vector avatars (id -> icon + gradient). Stored in the profile as "preset:<id>".
export const AVATARS = {
  rocket: ["rocket", "#6d7cff", "#a06bff"], star: ["star", "#f6b93b", "#e55039"], brain: ["brain", "#ff7eb3", "#a06bff"],
  atom: ["atom", "#17c3b2", "#227c9d"], flask: ["flask", "#38ef7d", "#11998e"], book: ["book", "#4facfe", "#00c6fb"],
  trophy: ["trophy", "#f6d365", "#fda085"], flame: ["flame", "#ff9966", "#ff5e62"], bolt: ["bolt", "#fbd72b", "#f9484a"],
  target: ["target", "#ee0979", "#ff6a00"], laptop: ["laptop", "#654ea3", "#eaafc8"], cap: ["cap", "#0f9b8e", "#6d7cff"]
};
export const PRESETS = Object.keys(AVATARS);
export const COURSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "NEET", "JEE", "UPSC", "Other"];
const SAFE_IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/* ---------- small UI helpers ---------- */
export function avatarHtml(p, cls = "") {
  const a = (p && p.avatar) || "";
  if (SAFE_IMG.test(a)) return `<img class="avatar ${cls}" src="${a}" alt="">`;
  if (a.startsWith("preset:")) {
    const v = AVATARS[a.slice(7)];
    if (v) return `<span class="avatar vec ${cls}" style="background:linear-gradient(135deg,${v[1]},${v[2]})">${window.ic ? window.ic(v[0]) : ""}</span>`;
    return `<span class="avatar emoji ${cls}">${esc(a.slice(7))}</span>`;
  }
  const n = ((p && p.name) || "?").trim();
  return `<span class="avatar ${cls}">${esc((n[0] || "?").toUpperCase())}</span>`;
}
export function toast(msg, ms = 5000) {
  const d = document.createElement("div");
  d.className = "cm-toast"; d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.classList.add("show"), 20);
  setTimeout(() => { d.classList.remove("show"); setTimeout(() => d.remove(), 300); }, ms);
}
export const errText = e => (e && e.code === "permission-denied")
  ? "Not allowed. Make sure the latest Firestore rules from the README are published, or the other student's settings do not allow this."
  : A.friendly(e || {});

function shrink(dataUrl, size = 120) {
  return new Promise(res => {
    const i = new Image();
    i.onload = () => { const c = document.createElement("canvas"); c.width = c.height = size; c.getContext("2d").drawImage(i, 0, 0, size, size); res(c.toDataURL("image/jpeg", 0.8)); };
    i.onerror = () => res("");
    i.src = dataUrl;
  });
}
export async function photoFromFile(file) { return shrink(await squareAvatar(file, 256), 120); }


/* ---------- hash function: Username ----------
   SHA-256 of the account id -> first 40 bits -> 8 characters (Crockford base32), shown as a username: @k7f3m9q2.
   Nobody can guess another student's username from their name, and it cannot be faked: a profile found by username is
   accepted only if sha256(its owner id) gives the same code (checked in findByCode).
   The value is still stored in profiles/{uid}.code (upper case), so old profiles and old links keep working. */
export function sha256(msg) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const bytes = Array.from(new TextEncoder().encode(msg)), len = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bits = len * 8;
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bits >>> (i * 8)) & 0xff);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bytes.length; o += 64) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, "0")).join("");
}
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function studentCode(uid) {
  const hex = sha256("gyaan-hub:" + uid);
  let n = 0n;
  for (let i = 0; i < 10; i += 2) n = (n << 8n) | BigInt(parseInt(hex.slice(i, i + 2), 16));   // first 5 bytes = 40 bits
  let out = "";
  for (let i = 0; i < 8; i++) { out = B32[Number(n & 31n)] + out; n >>= 5n; }
  return out;
}
export const fmtCode = c => "@" + String(c || "").toLowerCase();      // 7K3M9Q2X -> @7k3m9q2x
export const userName = uid => fmtCode(studentCode(uid));
export function normCode(q) {
  let c = String(q || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (c.length === 10 && c.startsWith("GH")) c = c.slice(2);
  return c;
}
export const looksLikeCode = q => /^[0-9A-Za-z]{4}[-\s]?[0-9A-Za-z]{4}$/.test(String(q).trim().replace(/^@/, "").replace(/^gh[-\s]?/i, ""));
export const profileLink = code => new URL("profile?c=" + code, location.href).href;
export async function findByCode(q) {
  const raw = String(q || "").trim().replace(/^@/, "").toLowerCase();
  const out = new Map();
  if (UNAME_RE.test(raw)) {                                  // custom username (exact match)
    try { (await A.fsWhere("profiles", [["username", "==", raw]])).forEach(r => out.set(r.id, r)); } catch (e) {}
  }
  const code = normCode(q);
  if (code.length === 8) {                                   // original hashed username (old links keep working)
    const rows = await A.fsWhere("profiles", [["code", "==", code]]);
    rows.filter(r => studentCode(r.id) === code).forEach(r => out.set(r.id, r));
  }
  return [...out.values()];
}

/* ---------- editable username: max 5 changes in any 14 days ---------- */
export const UNAME_RE = /^[a-z0-9_.]{3,20}$/;
export const UNAME_MAX = 5, UNAME_DAYS = 14;
const DAY_MS = 86400000;
export const handleOf = p => "@" + String((p && p.username) || (p && p.code) || "").toLowerCase();
export const unameLeft = p => {                              // { left, nextAt } from the change log in my profile
  const now = Date.now(), log = ((p && p.unameLog) || []).map(Number).filter(t => now - t < UNAME_DAYS * DAY_MS).sort((a, b) => a - b);
  return { left: Math.max(0, UNAME_MAX - log.length), log, nextAt: log.length >= UNAME_MAX ? log[0] + UNAME_DAYS * DAY_MS : 0 };
};
export async function changeUsername(user, wanted) {
  const name = String(wanted || "").trim().replace(/^@/, "").toLowerCase();
  if (!UNAME_RE.test(name)) throw new Error("Username must be 3-20 characters: letters, numbers, dot or underscore.");
  if (looksLikeCode(name) && name !== String((await getProfile(user.uid, true) || {}).username || "")) throw new Error("This username is reserved. Please choose another one.");
  const p = await getProfile(user.uid, true);
  if (!p) throw new Error("Profile not found.");
  if (p.username === name) throw new Error("This is already your username.");
  const { left, nextAt, log } = unameLeft(p);
  if (!left) throw new Error("You can change your username only " + UNAME_MAX + " times in " + UNAME_DAYS + " days. Try again on " + new Date(nextAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + ".");
  const taken = await A.fsGetPath(["usernames", name]).catch(() => null);
  if (taken && taken.uid !== user.uid) throw new Error("@" + name + " is already taken.");
  try { await A.fsSetPath(["usernames", name], { uid: user.uid }, false); }          // create-only: the rules reject it if someone claimed it first
  catch (e) { if (e && e.code === "permission-denied") throw new Error("@" + name + " is already taken."); throw e; }
  const unameLog = [...log, Date.now()].slice(-UNAME_MAX);
  try { await A.fsSetPath(["profiles", user.uid], { username: name, unameLog }); }
  catch (e) { try { await A.fsDeletePath(["usernames", name]); } catch (e2) {} throw e; }
  if (p.username) { try { await A.fsDeletePath(["usernames", p.username]); } catch (e) {} }   // free the old name
  PC[user.uid] = { ...p, username: name, unameLog };
  return PC[user.uid];
}

/* ---------- profiles ---------- */
// profiles/{uid}      : PUBLIC card (name, avatar, isPrivate, hideRank, dm)
// profileStats/{uid}  : bio, course, tests, points, streak ... (hidden from strangers when the profile is private)
const PC = {};
export async function getProfile(uid, fresh = false) {
  if (!fresh && PC[uid]) return PC[uid];
  const p = await A.fsGetPath(["profiles", uid]);
  if (p) PC[uid] = p;
  return p;
}
export async function getStats(uid) { try { return await A.fsGetPath(["profileStats", uid]); } catch (e) { return null; } }

export async function ensureMyProfile(user) {
  let p = null;
  try { p = await getProfile(user.uid, true); } catch (e) { throw e; }
  if (p) {
    if (p.code !== studentCode(user.uid)) { p.code = studentCode(user.uid); try { await A.fsSetPath(["profiles", user.uid], { code: p.code }); } catch (e) {} }   // older profiles get a username
    return { profile: p, created: false };
  }
  const ud = (await A.getUserDoc(user.uid)) || {};
  const name = String(user.displayName || ud.name || (user.email || "student").split("@")[0]).trim().slice(0, 40) || "Student";
  let avatar = "";
  if (ud.avatar && SAFE_IMG.test(ud.avatar)) avatar = await shrink(ud.avatar, 120);   // reuse the photo from Settings
  const prof = { name, nameLc: name.toLowerCase(), avatar, isPrivate: false, hideRank: false, dm: "followers", code: studentCode(user.uid) };
  await A.fsSetPath(["profiles", user.uid], prof, false);
  PC[user.uid] = { id: user.uid, ...prof };
  await syncMyStats(user, PC[user.uid], { bio: "", course: "" });
  return { profile: PC[user.uid], created: true };
}

const dayKey = d => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
// Recomputes my numbers from my own test results and publishes them (called on community pages and after each test)
export async function syncMyStats(user, prof, extra = {}) {
  if (A.isDemo()) return null;
  const p = prof || await getProfile(user.uid, true);
  if (!p) return null;
  const [scores, results] = await Promise.all([A.fsQuery("scores", "uid", user.uid).catch(() => []), A.fsQuery("results", "uid", user.uid).catch(() => [])]);
  const tests = scores.length;
  const points = Math.round(scores.reduce((s, x) => s + (+x.percent || 0), 0));
  const avgPercent = tests ? Math.round(points / tests) : 0;
  const bestPercent = Math.round(scores.reduce((m, x) => Math.max(m, +x.percent || 0), 0));
  const days = new Set(results.map(r => A.toMs(r.createdAt)).filter(Boolean).map(ms => dayKey(new Date(ms))));
  let streak = 0; const d = new Date(); d.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  const stats = {
    uid: user.uid, name: p.name, avatar: p.avatar || "", tests, points, avgPercent, bestPercent, streak,
    shown: !p.isPrivate,                       // profile details visible to everyone
    visible: !p.isPrivate && !p.hideRank,      // appears on the public leaderboard
    ...extra
  };
  if (extra.bio !== undefined) stats.bio = String(extra.bio).slice(0, 160);
  await A.fsSetPath(["profileStats", user.uid], stats);
  return { ...stats };
}

export async function saveMyProfile(user, d) {
  const prev = await getProfile(user.uid, true);
  const prof = { name: d.name, nameLc: d.name.toLowerCase(), avatar: d.avatar || "", isPrivate: !!d.isPrivate, hideRank: !!d.hideRank, dm: d.dm || "followers", code: studentCode(user.uid) };
  await A.fsSetPath(["profiles", user.uid], prof);
  PC[user.uid] = { id: user.uid, ...prev, ...prof };
  try { await A.setDisplayName(d.name); await A.saveUserDoc({ name: d.name }); localStorage.setItem("gyaan_name_" + user.uid, d.name); } catch (e) {}
  const stats = await syncMyStats(user, PC[user.uid], { bio: d.bio || "", course: d.course || "" });
  if (!prev || !!prev.isPrivate !== prof.isPrivate) await syncFollowPrivacy(user.uid, prof.isPrivate);
  return stats;
}
async function syncFollowPrivacy(uid, priv) {
  try {
    for (const f of await A.fsQuery("follows", "follower", uid)) if (f.followerPrivate !== priv) await A.fsSetPath(["follows", f.id], { followerPrivate: priv });
    for (const f of await A.fsQuery("follows", "target", uid)) if (f.targetPrivate !== priv) await A.fsSetPath(["follows", f.id], { targetPrivate: priv });
  } catch (e) {}
}
// Search by name (public profiles only) or by exact username (finds private profiles too, so a request can be sent).
export async function searchStudents(q) {
  q = String(q || "").trim();
  if (q.length < 2) return [];
  const out = new Map();
  const tasks = [];
  if (looksLikeCode(q) || UNAME_RE.test(q.replace(/^@/, "").toLowerCase())) tasks.push(findByCode(q).then(r => r.forEach(p => out.set(p.id, { ...p, byId: true }))).catch(() => {}));
  const lc = q.toLowerCase();
  const ulc = lc.replace(/^@/, "");
  if (UNAME_RE.test(ulc)) tasks.push(A.fsWhere("profiles", [["username", ">=", ulc], ["username", "<=", ulc + "\uf8ff"]]).then(r => r.forEach(p => { out.set(p.id, { ...p, byId: true }); })).catch(() => {}));
  tasks.push(A.fsWhere("profiles", [["nameLc", ">=", lc], ["nameLc", "<=", lc + "\uf8ff"]]).then(r => r.forEach(p => { if (!out.has(p.id)) out.set(p.id, p); })));
  await Promise.all(tasks);
  return [...out.values()];
}
export async function recentTests(uid, n = 12) {
  const rows = await A.fsQuery("results", "uid", uid);
  return rows.sort((a, b) => A.toMs(b.createdAt) - A.toMs(a.createdAt)).slice(0, n);
}

/* ---------- rank / leaderboard ---------- */
const better = (a, b) => a.points !== b.points ? a.points > b.points : (a.avgPercent || 0) > (b.avgPercent || 0);
export async function getLeaderboard() {
  const rows = await A.fsWhere("profileStats", [["visible", "==", true], ["shown", "==", true]]);
  return rows.filter(r => r.tests > 0).sort((a, b) => b.points - a.points || (b.avgPercent || 0) - (a.avgPercent || 0) || String(a.name).localeCompare(String(b.name)));
}
export const sameCourse = (a, b) => !!a && !!b && String(a).toLowerCase() === String(b).toLowerCase();
export function rankFor(rows, stats, course) {
  if (!stats || !stats.tests) return null;
  const list = course ? rows.filter(r => sameCourse(r.course, course)) : rows;
  return 1 + list.filter(r => r.uid !== stats.uid && better(r, stats)).length;
}
export function celebrateRank(uid, rank) {
  if (!rank) return;
  const k = "gyaan_lastrank_" + uid;
  let prev = null; try { prev = +localStorage.getItem(k) || null; localStorage.setItem(k, String(rank)); } catch (e) {}
  if (prev && rank < prev) toast("🎉 Congratulations! Your rank improved from #" + prev + " to #" + rank + ".");
}
export function badgesFor(s, rank) {
  const b = [];
  if (!s) return b;
  if (s.tests >= 1) b.push("🧪 First test done");
  if (s.tests >= 5) b.push("📚 5+ tests");
  if (s.bestPercent >= 90) b.push("🎯 90%+ score");
  if (s.streak >= 3) b.push("🔥 " + s.streak + "-day streak");
  if (rank && rank <= 10) b.push("🏅 Top 10");
  return b;
}

/* ---------- follow ---------- */
export const followId = (a, b) => a + "_" + b;
export async function getRelation(me, other) { try { return await A.fsGetPath(["follows", followId(me, other)]); } catch (e) { return null; } }
export async function follow(me, myProf, other, otherProf) {
  const priv = !!otherProf.isPrivate;
  await A.fsSetPath(["follows", followId(me, other)], { follower: me, target: other, status: priv ? "pending" : "accepted", targetPrivate: priv, followerPrivate: !!myProf.isPrivate }, false);
  return priv ? "pending" : "accepted";
}
export const unfollow = (me, other) => A.fsDeletePath(["follows", followId(me, other)]);
export const acceptRequest = (me, follower) => A.fsSetPath(["follows", followId(follower, me)], { status: "accepted" });
export const declineRequest = (me, follower) => A.fsDeletePath(["follows", followId(follower, me)]);

// Lists. Private students are listed too (name, photo, lock) so people can find them; their posts and details stay hidden until the follow is accepted.
export async function listFollowers(uid, isMe, prof, viewerAccepted) {
  if (isMe) return A.fsWhere("follows", [["target", "==", uid]]);
  if (prof.isPrivate) return viewerAccepted ? A.fsWhere("follows", [["target", "==", uid], ["status", "==", "accepted"]]) : null;
  return A.fsWhere("follows", [["target", "==", uid], ["status", "==", "accepted"], ["targetPrivate", "==", false]]);
}
export async function listFollowing(uid, isMe, prof, viewerAccepted) {
  if (isMe) return A.fsWhere("follows", [["follower", "==", uid]]);
  if (prof.isPrivate && !viewerAccepted) return null;
  const c = [["follower", "==", uid], ["status", "==", "accepted"], ["targetPrivate", "==", false]];
  if (!prof.isPrivate) c.push(["followerPrivate", "==", false]);
  return A.fsWhere("follows", c);
}
export async function profilesOf(uids, max = 100) {
  const out = await Promise.all(uids.slice(0, max).map(u => getProfile(u).catch(() => null)));
  return out.map((p, i) => p || { id: uids[i], name: "Student" });
}

/* ---------- block / report ---------- */
export async function isBlocked(me, other) { try { return !!(await A.fsGetPath(["blocks", followId(me, other)])); } catch (e) { return false; } }
export async function blockUser(me, other) {
  await A.fsSetPath(["blocks", followId(me, other)], { blocker: me, blocked: other }, false);
  try { await A.fsDeletePath(["follows", followId(other, me)]); } catch (e) {}   // they stop following me
}
export const unblockUser = (me, other) => A.fsDeletePath(["blocks", followId(me, other)]);
export async function reportUser(me, myName, other, otherName, reason, details, evidence) {
  await A.fsSave("communityReports", null, { reporter: me, reporterName: myName || "", reported: other, reportedName: otherName || "", reason, details: String(details || "").slice(0, 500), evidence: evidence || [], status: "open" });
}

/* ---------- messages ---------- */
export const chatId = (a, b) => (a < b ? a + "_" + b : b + "_" + a);
export async function canMessage(me, them, theirProf, theirFollowRow) {
  const dm = (theirProf && theirProf.dm) || "followers";
  if (dm === "all") return { ok: true };
  if (dm === "none") return { ok: false, why: "This student does not accept messages." };
  const f = theirFollowRow !== undefined ? theirFollowRow : await getRelation(them, me);   // does THEY follow ME? (row can be passed in when already loaded)
  return f && f.status === "accepted" ? { ok: true } : { ok: false, why: "This student only accepts messages from people they follow." };
}
export async function listChats(me) {
  const rows = await A.fsWhere("chats", [["participants", "array-contains", me]]);
  return rows.filter(c => c.lastTs > 0).sort((a, b) => b.lastTs - a.lastTs);
}
export const otherOf = (chat, me) => chat.participants.find(u => u !== me);
export const isUnread = (chat, me) => chat.lastFrom && chat.lastFrom !== me && chat.lastTs > (chat["seen_" + me] || 0);
export async function unreadCount(me) { try { return (await listChats(me)).filter(c => isUnread(c, me)).length; } catch (e) { return 0; } }
export async function chatExists(cid) { try { return !!(await A.fsGetPath(["chats", cid])); } catch (e) { return false; } }
export const markSeen = (cid, me) => A.fsSetPath(["chats", cid], { ["seen_" + me]: Date.now() }).catch(() => {});
export async function ensureChat(me, other) {
  const cid = chatId(me, other), parts = [me, other].sort();
  if (!(await chatExists(cid))) await A.fsSetPath(["chats", cid], { participants: parts, lastTs: 0 }, false);
  return cid;
}
// text and/or one attachment (att comes from F.uploadFile)
export async function sendMessage(me, other, text, att) {
  const cid = chatId(me, other);
  text = String(text || "").trim().slice(0, 1000);
  if (!text && !att) return cid;
  await ensureChat(me, other);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8), now = Date.now();
  const msg = { from: me, to: other, text, ts: now };
  if (att) msg.att = att;
  await A.fsSetPath(["chats", cid, "messages", id], msg, false);
  await A.fsSetPath(["chats", cid], { lastText: (text || F.attLabel(att)).slice(0, 80), lastFrom: me, lastTs: now, ["seen_" + me]: now });
  return cid;
}
// Edit my own message (text / caption only)
export async function editMessage(cid, m, newText, isLast) {
  newText = String(newText || "").trim().slice(0, 1000);
  if (!newText && !m.att) throw new Error("A message cannot be empty.");
  await A.fsSetPath(["chats", cid, "messages", m.id], { text: newText, edited: true, editedAt: Date.now() });
  if (isLast) await A.fsSetPath(["chats", cid], { lastText: (newText || F.attLabel(m.att)).slice(0, 80) }).catch(() => {});
  return newText;
}
// Unsend my own message: the text and the attached file are removed for both people
export async function unsendMessage(cid, m, isLast) {
  await A.fsSetPath(["chats", cid, "messages", m.id], { deleted: true, text: "", att: null, edited: false });
  if (m.att) F.deleteFile(m.att, { type: "chat", cid });
  if (isLast) await A.fsSetPath(["chats", cid], { lastText: "Message unsent" }).catch(() => {});
}

/* ---------- posts & reels ---------- */
// posts/{id}: { uid, kind: "post" | "reel", caption, media: attachment | null, ts, edited? }   likes: posts/{id}/likes/{uid}
export async function createPost(me, { kind, caption, file }, onProgress) {
  caption = String(caption || "").trim().slice(0, 500);
  if (!file && !caption) throw new Error("Add a photo, a video or some text.");
  const media = file ? await F.uploadFile(file, { type: "post", uid: me.uid }, onProgress) : null;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await A.fsSetPath(["posts", id], { uid: me.uid, kind, caption, media, ts: Date.now() }, false);
  return id;
}
export async function listPosts(uid, kind) {
  const rows = await A.fsWhere("posts", [["uid", "==", uid]]);
  return rows.filter(p => !kind || p.kind === kind).sort((a, b) => (b.ts || 0) - (a.ts || 0));
}
export async function feedPosts(uids, perUser = 6, max = 30) {
  const lists = await Promise.all(uids.slice(0, 15).map(u => listPosts(u).then(r => r.slice(0, perUser)).catch(() => [])));
  return lists.flat().sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, max);
}
export const editPost = (id, caption) => A.fsSetPath(["posts", id], { caption: String(caption || "").trim().slice(0, 500), edited: true, editedAt: Date.now() });
export async function deletePost(p) {
  await A.fsDeletePath(["posts", p.id]);
  if (p.repostOf) { try { await A.fsDeletePath(["posts", p.repostOf, "reposts", p.uid]); } catch (e) {} return; }   // a repost shares the original file: never delete it
  if (p.media) F.deleteFile(p.media, { type: "post" });
}
export async function likesOf(id) { try { return (await A.fsListPath(["posts", id, "likes"])).map(x => x.id); } catch (e) { return []; } }
export const likePost = (id, me) => A.fsSetPath(["posts", id, "likes", me], { uid: me });
export const unlikePost = (id, me) => A.fsDeletePath(["posts", id, "likes", me]);


/* ---------- comments, reposts, saved (reel viewer) ---------- */
// posts/{id}/comments/{cid}: { uid, text, ts }    posts/{id}/reposts/{uid}    users/{me}/saved/{postId}
// A repost is a copy of the post document under my account (id rp_<originalId>_<myUid>) with repostOf set; it shares the original media.
export async function commentsOf(id) { try { return (await A.fsListPath(["posts", id, "comments"])).sort((a, b) => (a.ts || 0) - (b.ts || 0)); } catch (e) { return []; } }
export async function addComment(id, me, text) {
  text = String(text || "").trim().slice(0, 300);
  if (!text) throw new Error("Write a comment first.");
  const cid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6), c = { uid: me, text, ts: Date.now() };
  await A.fsSetPath(["posts", id, "comments", cid], c, false);
  return { id: cid, ...c };
}
export const deleteComment = (id, cid) => A.fsDeletePath(["posts", id, "comments", cid]);
export async function repostsOf(id) { try { return (await A.fsListPath(["posts", id, "reposts"])).map(x => x.id); } catch (e) { return []; } }
export const repostId = (p, me) => "rp_" + (p.repostOf || p.id) + "_" + me;
export async function repost(me, p) {
  const oid = p.repostOf || p.id;
  await A.fsSetPath(["posts", oid, "reposts", me], { uid: me });
  try { await A.fsSetPath(["posts", repostId(p, me)], { uid: me, kind: p.kind, caption: p.caption || "", media: p.media || null, repostOf: oid, ts: Date.now() }, false); }
  catch (e) { if (!(e && e.code === "permission-denied")) throw e; }      // already reposted
}
export async function unrepost(me, p) {
  const oid = p.repostOf || p.id;
  await A.fsDeletePath(["posts", repostId(p, me)]).catch(() => {});
  await A.fsDeletePath(["posts", oid, "reposts", me]);
}
export async function savedIds(me) { try { return new Set((await A.fsListPath(["users", me, "saved"])).map(x => x.id)); } catch (e) { return new Set(); } }
export const savePost = (me, id) => A.fsSetPath(["users", me, "saved", id], { ts: Date.now() });
export const unsavePost = (me, id) => A.fsDeletePath(["users", me, "saved", id]);

/* ---------- long press, profile picture viewer, share profile ---------- */
// Calls fn(element, event) when the finger stays on an element matching sel for ~0.45 s. The tap that follows is swallowed.
export function onLongPress(root, sel, fn, ms = 450) {
  let t = null, sx = 0, sy = 0, fired = false;
  const clear = () => { if (t) { clearTimeout(t); t = null; } };
  root.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const h = e.target.closest && e.target.closest(sel); if (!h) return;
    fired = false; sx = e.clientX; sy = e.clientY; clear();
    t = setTimeout(() => { t = null; fired = true; try { navigator.vibrate && navigator.vibrate(12); } catch (x) {} fn(h, e); }, ms);
  });
  root.addEventListener("pointermove", e => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) clear(); });
  ["pointerup", "pointercancel"].forEach(ev => root.addEventListener(ev, clear));
  root.addEventListener("scroll", clear, true);
  root.addEventListener("contextmenu", e => { if (e.target.closest && e.target.closest(sel)) e.preventDefault(); });
  root.addEventListener("click", e => { if (fired && e.target.closest && e.target.closest(sel)) { e.preventDefault(); e.stopPropagation(); } fired = false; }, true);
}
// Full-screen view of someone's profile picture (tap anywhere or press Esc to close)
export function viewPhoto(p) {
  if (!p) return;
  document.querySelectorAll(".pv-ov").forEach(x => x.remove());
  const o = document.createElement("div");
  o.className = "pv-ov";
  o.innerHTML = `<button class="pv-x" type="button" aria-label="Close">✕</button>${avatarHtml(p, "pv")}<div class="pv-name">${esc(p.name || "")}</div>`;
  const close = () => { o.remove(); document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); };
  o.addEventListener("click", close);
  document.addEventListener("keydown", key);
  document.body.appendChild(o);
}
/* ---------- Share sheet (Instagram style): people to send to + apps ----------
   shareSheet({ heading, link, text, title }) opens a bottom sheet with
   - search + your chats / people you follow (tap one or more, then Send: the link goes into their chat)
   - an app row: Copy link, WhatsApp, Facebook Messenger, Instagram message, Telegram message, X, LinkedIn, Snapchat, Email, SMS, More */
const LOGO = {
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.9 9.9 0 1 0 12.04 2zm0 1.8a8.1 8.1 0 1 1-4.3 15l-.3-.2-3.1.8.83-3-.2-.32A8.1 8.1 0 0 1 12.04 3.8zm-3.2 3.9c-.2 0-.5.07-.75.35-.25.28-.97.95-.97 2.3s1 2.7 1.1 2.88c.14.18 1.93 3.07 4.77 4.18 2.36.93 2.84.75 3.35.7.5-.05 1.65-.67 1.88-1.33.23-.65.23-1.2.16-1.33-.07-.12-.25-.2-.53-.34-.28-.14-1.65-.82-1.9-.9-.26-.1-.45-.14-.63.14-.19.28-.72.9-.88 1.1-.16.18-.32.2-.6.07-.28-.14-1.18-.43-2.25-1.38-.83-.74-1.4-1.66-1.56-1.94-.16-.28-.02-.43.12-.57.13-.12.28-.32.42-.48.14-.17.19-.28.28-.47.1-.19.05-.35-.02-.49-.07-.14-.62-1.5-.86-2.05-.22-.54-.45-.46-.63-.47h-.54z"/></svg>',
  fb: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.2 2 11.4c0 2.95 1.45 5.57 3.72 7.3V22l3.4-1.87c.9.25 1.86.39 2.88.39 5.52 0 10-4.2 10-9.4S17.52 2 12 2zm1.03 12.6-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.92-2.72-5.48 5.82z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 22v-8.3h2.8l.5-3.4h-3.3V8.1c0-1 .4-1.7 1.8-1.7H17V3.4C16.7 3.3 15.7 3.2 14.6 3.2c-2.5 0-4.2 1.5-4.2 4.3v2.8H7.5v3.4h2.9V22z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>',
  tg: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M21.6 3.4 2.9 10.6c-.9.35-.88 1.6.03 1.9l4.7 1.5 1.8 5.6c.2.7 1.1.9 1.6.35l2.6-2.6 4.8 3.5c.6.45 1.5.1 1.7-.65L23 4.7c.2-.9-.65-1.6-1.4-1.3zM9.2 13.4l8.6-5.4c.3-.2.5.15.3.35l-7 6.5-.3 3-1.6-4.45z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78zm-1.08 16.16h1.7L7.4 4.75H5.58z"/></svg>',
  in: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M5.4 8.6a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2zM3.6 10.2h3.6V21H3.6zM9.4 10.2h3.45v1.5h.05c.5-.9 1.65-1.85 3.4-1.85 3.6 0 4.3 2.37 4.3 5.45V21h-3.6v-5c0-1.2 0-2.7-1.65-2.7s-1.9 1.3-1.9 2.62V21H9.4z"/></svg>',
  sc: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.02 2.5c2.7 0 4.72 1.9 4.72 4.65 0 .75-.07 1.5-.12 2.2.33.17.7.28 1.1.18.5-.12.95.38.72.84-.3.6-1 .95-1.7 1.1.1.5.9 2.3 2.75 3.05.45.2.45.7.1.95-.55.4-1.3.55-1.85.7-.15.3-.1.75-.5.85-.5.1-1.1-.2-1.85-.1-.85.12-1.55 1.35-3.38 1.35s-2.53-1.23-3.38-1.35c-.75-.1-1.35.2-1.85.1-.4-.1-.35-.55-.5-.85-.55-.15-1.3-.3-1.85-.7-.35-.25-.35-.75.1-.95 1.85-.75 2.65-2.55 2.75-3.05-.7-.15-1.4-.5-1.7-1.1-.23-.46.22-.96.72-.84.4.1.77-.01 1.1-.18-.05-.7-.12-1.45-.12-2.2 0-2.75 2.02-4.65 4.72-4.65z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>',
  sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="18.5" cy="12" r="1.8" fill="currentColor"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5L3 9.5z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};
const isMobile = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent || "");
// open an app link; on phones try the app's own address first and fall back to the web page
function openApp(appUrl, webUrl) {
  if (isMobile() && appUrl) {
    const t = Date.now();
    location.href = appUrl;
    setTimeout(() => { if (!document.hidden && Date.now() - t < 2500) window.open(webUrl, "_blank", "noopener"); }, 1200);
  } else window.open(webUrl, "_blank", "noopener");
}
export async function shareSheet(o) {
  const link = o.link, heading = o.heading || "Share";
  const title = o.title || "Gyaan Hub", text = o.text || "";
  const u = encodeURIComponent(link), t = encodeURIComponent(text), both = encodeURIComponent((text ? text + " " : "") + link);
  const meUser = o.people && A.currentUser && A.currentUser();
  const copy = async msg => { try { await navigator.clipboard.writeText(link); toast(msg, 3500); } catch (e) { window.prompt("Copy this link:", link); } };
  const apps = [
    { n: "Copy link", c: "#4f6bff", l: LOGO.link, run: () => copy("Link copied") },
    { n: "WhatsApp", c: "#25d366", l: LOGO.wa, run: () => window.open("https://wa.me/?text=" + both, "_blank", "noopener") },
    { n: "Facebook", c: "#1877f2", l: LOGO.facebook, run: () => openApp("fb://facewebmodal/f?href=" + encodeURIComponent("https://www.facebook.com/sharer/sharer.php?u=" + u), "https://www.facebook.com/sharer/sharer.php?u=" + u) },
    { n: "Messenger", c: "linear-gradient(135deg,#00b2ff,#006aff 55%,#a334fa)", l: LOGO.fb, run: () => { copy("Link copied - paste it in Messenger if it does not appear"); openApp("fb-messenger://share/?link=" + u, "https://www.messenger.com/"); } },
    { n: "Instagram", c: "linear-gradient(45deg,#f9a03f,#e1306c 50%,#833ab4)", l: LOGO.ig, run: () => { copy("Link copied - paste it in your Instagram message"); openApp("instagram://direct-inbox", "https://www.instagram.com/direct/inbox/"); } },
    { n: "Telegram", c: "#229ed9", l: LOGO.tg, run: () => openApp("tg://msg_url?url=" + u + "&text=" + t, "https://t.me/share/url?url=" + u + "&text=" + t) },
    { n: "X", c: "#000", l: LOGO.x, run: () => window.open("https://twitter.com/intent/tweet?url=" + u + "&text=" + t, "_blank", "noopener") },
    { n: "LinkedIn", c: "#0a66c2", l: LOGO.in, run: () => window.open("https://www.linkedin.com/sharing/share-offsite/?url=" + u, "_blank", "noopener") },
    { n: "Snapchat", c: "#f7c600", l: LOGO.sc, dark: true, run: () => { copy("Link copied - paste it in Snapchat"); openApp("snapchat://", "https://www.snapchat.com/"); } },
    { n: "Email", c: "#6b7280", l: LOGO.mail, run: () => { location.href = "mailto:?subject=" + encodeURIComponent(title) + "&body=" + both; } },
    { n: "SMS", c: "#16a34a", l: LOGO.sms, run: () => { location.href = "sms:?&body=" + both; } }
  ];
  if (navigator.share) apps.push({ n: "More", c: "#374151", l: LOGO.more, run: async () => { try { await navigator.share({ title, text, url: link }); } catch (x) {} } });

  document.querySelectorAll(".sh-ov").forEach(x => x.remove());
  const md = document.createElement("div");
  md.className = "cm-modal sheet sh-ov";
  md.innerHTML = `<div class="cm-card sh-card ${o.people ? "with-people" : ""}">
    <span class="sh-grab"></span>
    <h2 class="sh-h">${esc(heading)}<button class="cm-x" type="button" aria-label="Close">✕</button></h2>
    ${meUser ? `<div class="sh-search">${window.ic ? window.ic("search") : ""}<input type="text" placeholder="Search" autocomplete="off" aria-label="Search people"></div>
    <div class="sh-people" id="sh-people"><div class="sh-note">Loading...</div></div>
    <div class="sh-sendbar" hidden><input type="text" maxlength="200" placeholder="Write a message..." aria-label="Message"><button type="button" class="sh-go">${LOGO.send}<span>Send</span></button></div>` : ""}
    ${o.preview ? `<div class="sh-prev">${o.preview.avatar || ""}<span class="sh-pt"><b>${esc(o.preview.name || "")}</b><small>${esc(link.replace(/^https?:\/\//, ""))}</small></span></div>` : ""}
    <div class="sh-apps">${apps.map((a, i) => `<button type="button" data-app="${i}"><i style="background:${a.c};${a.dark ? "color:#000" : ""}">${a.l}</i><span>${a.n}</span></button>`).join("")}</div>
  </div>`;
  const close = () => { md.remove(); document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key);
  const picked = new Map();   // uid -> profile
  let people = [];
  const bar = () => md.querySelector(".sh-sendbar");
  const draw = q => {
    const box = md.querySelector("#sh-people"); if (!box) return;
    q = (q || "").trim().toLowerCase();
    const rows = people.filter(p => !q || String(p.name || "").toLowerCase().includes(q));
    box.innerHTML = rows.length ? rows.map(p => `<button type="button" class="sh-p ${picked.has(p.uid) ? "on" : ""}" data-u="${esc(p.uid)}"><span class="sh-av">${avatarHtml(p, "")}<em>${LOGO.check}</em></span><span class="sh-nm">${esc(p.name || "Student")}</span></button>`).join("")
      : `<div class="sh-note">${people.length ? "No one found" : "Follow students or start a chat to send them this directly."}</div>`;
    const b = bar(); if (b) { b.hidden = !picked.size; b.querySelector(".sh-go span").textContent = picked.size > 1 ? "Send (" + picked.size + ")" : "Send"; }
  };
  md.addEventListener("click", async e => {
    if (e.target === md || e.target.closest(".cm-x")) return close();
    const pp = e.target.closest(".sh-p");
    if (pp) { const uid = pp.dataset.u; if (picked.has(uid)) picked.delete(uid); else picked.set(uid, people.find(x => x.uid === uid)); draw(md.querySelector(".sh-search input").value); return; }
    const go = e.target.closest(".sh-go");
    if (go) {
      go.disabled = true;
      const note = md.querySelector(".sh-sendbar input").value.trim(), msg = (note ? note + "\n" : "") + (text ? text + " " : "") + link;
      let ok = 0, fail = "";
      for (const [uid, p] of picked) {
        try {
          const c = await canMessage(meUser.uid, uid, p);
          if (!c.ok) { fail = c.why; continue; }
          await sendMessage(meUser.uid, uid, msg.slice(0, 1000), null); ok++;
        } catch (x) { fail = errText(x); }
      }
      if (ok) toast("Sent to " + ok + (ok > 1 ? " people" : " person"), 3000);
      if (fail) toast(fail, 5000);
      if (ok) close(); else go.disabled = false;
      return;
    }
    const b = e.target.closest("[data-app]"); if (!b) return;
    const a = apps[+b.dataset.app]; await a.run();
    if (a.n !== "Copy link") setTimeout(close, 50); else setTimeout(close, 400);
  });
  md.addEventListener("input", e => { if (e.target.closest(".sh-search")) draw(e.target.value); });
  document.body.appendChild(md);

  if (meUser) {
    try {
      const [chats, fol] = await Promise.all([listChats(meUser.uid).catch(() => []), A.fsWhere("follows", [["follower", "==", meUser.uid]]).catch(() => [])]);
      const ids = [];
      chats.forEach(c => { const o = otherOf(c, meUser.uid); if (o && !ids.includes(o)) ids.push(o); });
      fol.filter(f => f.status === "accepted").forEach(f => { if (f.target && !ids.includes(f.target)) ids.push(f.target); });
      const profs = await profilesOf(ids, 30);
      people = profs.map((p, i) => ({ ...p, uid: ids[i] }));
    } catch (e) { people = []; }
    if (md.isConnected) draw("");
  }
}
// Share the profile link
export async function shareProfile(p, uid) {
  const link = profileLink(p.username || p.code || studentCode(uid));
  return shareSheet({ heading: "Share profile", people: false, preview: { name: p.name || "Student", avatar: avatarHtml(p, "") }, link, title: (p.name || "Student") + " on Gyaan Hub", text: "Follow " + (p.name || "this student") + " on Gyaan Hub" });
}
