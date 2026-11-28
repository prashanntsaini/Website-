/* Gyaan Hub - Instagram-style background uploads.
   Send a photo, video, APK or file in Messages (or post a photo / reel from Profile) and it is "sent" at once:
   it appears in the chat right away with a small "Sending..." line while it uploads. You can leave the chat, open other
   chats or other pages. The file is saved safely on the device (IndexedDB), so if the page changes the upload simply
   continues on the next page. If it fails (no internet), it shows "Not delivered - tap to retry" and retries by itself
   when the internet is back.

   enqueue({ type: "chat", data: { cid, other, text }, file })      -> message with a file
   enqueue({ type: "post", data: { kind, caption }, file })         -> post / reel
   resume(uid)  -> called on every page (layout.js): continues uploads that were left behind */
const MAX_PARALLEL = 2, DB = "gyaan_uploads", ST = "jobs", HB = "gyaan_up_hb_";
const jobs = [], subs = new Set();
let tray = null, wake = null, db = null, uid0 = "", timer = null;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ic = n => (window.ic ? window.ic(n) : "");
const rid = () => "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const canceled = () => ({ code: "storage/canceled" });

export const refresh = () => paintTray();
export const hideFilter = { fn: null };            // e.g. hide jobs of the chat that is open (the chat shows them itself)
export const list = () => jobs.slice();
export const forChat = cid => jobs.filter(j => j.meta.cid === cid && j.state !== "done");
export const active = () => jobs.some(j => j.state === "queued" || j.state === "uploading");
export const onChange = fn => { subs.add(fn); return () => subs.delete(fn); };
const emit = (type, job) => { subs.forEach(f => { try { f(type, job); } catch (e) {} }); if (type !== "progress") paintTray(); };
const fire = (type, job) => { try { window.dispatchEvent(new CustomEvent("gyaan-upload", { detail: { type, job } })); } catch (e) {} };

/* ---------- saved queue (IndexedDB) ---------- */
function openDb() {
  if (db) return db;
  db = new Promise(res => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: "id" });
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
  return db;
}
async function idb(mode, fn) {
  const d = await openDb(); if (!d) return null;
  return new Promise(res => {
    try { const tx = d.transaction(ST, mode), rq = fn(tx.objectStore(ST)); tx.oncomplete = () => res(rq && "result" in rq ? rq.result : true); tx.onerror = tx.onabort = () => res(null); }
    catch (e) { res(null); }
  });
}
const saveRec = rec => idb("readwrite", s => s.put(rec));
const delRec = id => idb("readwrite", s => s.delete(id));
const allRecs = async () => (await idb("readonly", s => s.getAll())) || [];

/* only one open page runs a job: the running page refreshes a heartbeat every 2 s, a closed page releases it */
const beat = id => { try { localStorage.setItem(HB + id, String(Date.now())); } catch (e) {} };
const unbeat = id => { try { localStorage.removeItem(HB + id); } catch (e) {} };
const owned = id => { try { return Date.now() - (+localStorage.getItem(HB + id) || 0) < 6500; } catch (e) { return false; } };
function startBeat() {
  if (timer) return;
  timer = setInterval(() => { jobs.forEach(j => { if (j.state === "queued" || j.state === "uploading") beat(j.id); }); if (!active()) { clearInterval(timer); timer = null; } }, 2000);
}
window.addEventListener("pagehide", () => { jobs.forEach(j => unbeat(j.id)); });

async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); }
    else if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && active()) keepAwake(true); });
// only warn when the file could NOT be saved on the device (then leaving the page would lose it)
window.addEventListener("beforeunload", e => { if (jobs.some(j => !j.persisted && (j.state === "queued" || j.state === "uploading"))) { e.preventDefault(); e.returnValue = "A file is still uploading."; return e.returnValue; } });
window.addEventListener("online", () => { jobs.filter(j => j.state === "failed" && j.offline).forEach(j => j.retry()); });

/* ---------- what each kind of job does ---------- */
const libs = () => Promise.all([import("./community.js?v=29"), import("./files.js?v=29")]);
async function runJob(job, onP, signal) {
  const rec = job.rec, [C, F] = await libs();
  const file = job.file;
  if (rec.type === "chat") {
    const scope = { type: "chat", cid: rec.data.cid };
    await C.ensureChat(rec.uid, rec.data.other);
    let att = rec.att;
    if (!att) {
      att = await F.uploadFile(file, scope, onP, signal);
      if (signal.aborted) { F.deleteFile(att, scope); throw canceled(); }
      rec.att = att; await saveRec(rec);                        // if the page changes now, the file is not uploaded twice
    }
    try { await C.sendMessage(rec.uid, rec.data.other, rec.data.text, att, { id: rec.id, ts: rec.created }); }
    catch (e) { if (e && e.code === "permission-denied") { F.deleteFile(att, scope); rec.att = null; await saveRec(rec); } throw e; }
  } else if (rec.type === "post") {
    const scope = { type: "post", uid: rec.uid };
    let media = rec.att;
    if (!media && file) {
      media = await F.uploadFile(file, scope, onP, signal);
      if (signal.aborted) { F.deleteFile(media, scope); throw canceled(); }
      rec.att = media; await saveRec(rec);
    }
    await C.createPost({ uid: rec.uid }, { kind: rec.data.kind, caption: rec.data.caption, media }, null, null, { id: rec.id, ts: rec.created });
  }
}
async function notify(kind, job, err) {
  try {
    const C = await import("./community.js?v=29"), post = job.rec.type === "post", reel = post && job.rec.data.kind === "reel";
    if (kind === "done") { if (post) C.toast(reel ? "Reel uploaded" : "Post uploaded", 2200); }
    else C.toast(err && err.code === "permission-denied" ? "This could not be sent. The student may not accept messages from you, or the updated Firestore/Storage rules are not published yet." : (err && err.code ? C.errText(err) : ((err && err.message) || "Upload failed")), 6500);
  } catch (e) {}
}

/* ---------- queue ---------- */
function pump() {
  let free = MAX_PARALLEL - jobs.filter(j => j.state === "uploading").length;
  for (const j of jobs) { if (free <= 0) break; if (j.state === "queued") { start(j); free--; } }
  keepAwake(active());
}
async function start(job) {
  job.state = "uploading"; job.progress = 0; job.error = ""; job.ctl = new AbortController();
  beat(job.id); startBeat();
  emit("state", job);
  try {
    await runJob(job, p => { job.progress = Math.max(0, Math.min(1, p)); emit("progress", job); }, job.ctl.signal);
    if (job.ctl.signal.aborted) throw canceled();
    job.state = "done"; job.progress = 1;
    await delRec(job.id); unbeat(job.id);
    emit("state", job); fire("done", job); notify("done", job);
    setTimeout(() => drop(job), 1800);
  } catch (e) {
    if (job.ctl.signal.aborted || (e && e.code === "storage/canceled")) { job.state = "canceled"; await delRec(job.id); unbeat(job.id); drop(job); fire("cancel", job); }
    else {
      job.state = "failed"; job.error = (e && (e.message || e.code)) || "Upload failed"; job.offline = !navigator.onLine;
      job.rec.failed = true; await saveRec(job.rec); unbeat(job.id);
      emit("state", job); fire("fail", job); notify("fail", job, e);
    }
  }
  pump();
}
function drop(job) { const i = jobs.indexOf(job); if (i < 0) return; jobs.splice(i, 1); emit("remove", job); keepAwake(active()); }

const kindOf = f => { const t = (f.type || "").toLowerCase(), n = (f.name || "").toLowerCase();
  return t.startsWith("image/") && !/svg/.test(t) ? "image" : (t.startsWith("video/") || /\.(mp4|webm|mov|m4v|3gp|mkv)$/.test(n)) ? "video" : (t.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|opus)$/.test(n)) ? "audio" : "file"; };
async function currentUid() { try { const a = await import("./auth.js?v=29"); const u = a.currentUser(); return u ? u.uid : ""; } catch (e) { return ""; } }

function addJob(rec, file, state) {
  const job = {
    id: rec.id, rec, file, label: rec.name, kind: rec.kind, size: rec.size, meta: { ...rec.data, type: rec.type, post: rec.type === "post", file },
    state, progress: 0, error: "", offline: false, ctl: null, persisted: !!rec.saved,
    cancel() {
      if (this.state === "uploading" && this.ctl) this.ctl.abort();
      else if (this.state !== "done") { this.state = "canceled"; delRec(this.id); unbeat(this.id); drop(this); fire("cancel", this); }
    },
    retry() { if (this.state === "failed") { this.state = "queued"; this.error = ""; this.rec.failed = false; saveRec(this.rec); emit("state", this); pump(); } }
  };
  jobs.push(job);
  return job;
}

export async function enqueue({ type, data, file }) {
  const u = uid0 || (await currentUid());
  const rec = { id: rid(), type, data, uid: u, name: file.name || "file", mime: file.type || "", size: file.size, kind: kindOf(file), created: Date.now(), blob: file, failed: false, att: null, saved: false };
  rec.saved = !!(await saveRec(rec));                 // keep a copy on the device so a page change cannot lose it
  const job = addJob(rec, file, "queued");
  emit("add", job); pump();
  return job;
}

/* pick up uploads that were left behind by a page that was closed or changed (called from layout.js on every page) */
export async function resume(uid) {
  uid0 = uid;
  const scan = async () => {
    const recs = await allRecs();
    let added = false;
    for (const rec of recs) {
      if (rec.uid !== uid || jobs.some(j => j.id === rec.id)) continue;
      if (owned(rec.id)) continue;                                     // another open page is uploading it
      const file = rec.blob instanceof File ? rec.blob : new File([rec.blob], rec.name, { type: rec.mime });
      rec.saved = true;
      const job = addJob(rec, file, rec.failed ? "failed" : "queued");
      if (rec.failed) job.error = "Not delivered";
      emit("add", job); added = true;
    }
    if (added) pump();
  };
  await scan();
  if (!resume.t) resume.t = setInterval(() => { if (!document.hidden) scan(); }, 5000);
}

/* ---------- tray (progress panel at the top of the page, like Instagram's "Posting...") ---------- */
function ensureTray() {
  if (tray && tray.isConnected) return tray;
  tray = document.createElement("div");
  tray.className = "up-tray"; tray.setAttribute("aria-live", "polite");
  tray.addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const j = jobs.find(x => x.id === b.dataset.id); if (!j) return;
    if (b.dataset.act === "retry") j.retry(); else j.cancel();
  });
  document.body.appendChild(tray);
  return tray;
}
const kindIc = k => ic(k === "image" ? "image" : k === "video" ? "film" : "file");
const thumbs = {};
function thumbOf(j) {
  if (j.kind !== "image") return `<span class="up-ic">${kindIc(j.kind)}</span>`;
  if (!thumbs[j.id]) { try { thumbs[j.id] = URL.createObjectURL(j.file); } catch (e) { return `<span class="up-ic">${kindIc(j.kind)}</span>`; } }
  return `<span class="up-ic up-th"><img src="${thumbs[j.id]}" alt=""></span>`;
}
function paintTray() {
  if (!document.body) return;
  const shown = jobs.filter(j => !(hideFilter.fn && hideFilter.fn(j)));
  if (!shown.length) { if (tray) { tray.innerHTML = ""; tray.hidden = true; } return; }
  const t = ensureTray(); t.hidden = false;
  const post = j => j.rec.type === "post";
  t.innerHTML = shown.map(j => {
    const pct = Math.round(j.progress * 100);
    const status = j.state === "failed" ? (j.offline ? "Waiting for internet…" : "Not delivered")
      : j.state === "done" ? "✓ " + (post(j) ? (j.rec.data.kind === "reel" ? "Reel shared" : "Shared") : "Sent") : (post(j) ? "Posting…" : "Sending…");
    return `<div class="up-row ${j.state}">${thumbOf(j)}<span class="up-t"><b data-keep>${post(j) ? (j.rec.data.kind === "reel" ? "Your reel" : "Your post") : esc(j.label)}</b><small>${status}</small>${j.state === "uploading" || j.state === "queued" ? `<span class="up-bar"><i style="width:${pct}%"></i></span>` : ""}</span>
      ${j.state === "failed" ? `<button type="button" class="up-btn" data-act="retry" data-id="${j.id}">Retry</button><button type="button" class="up-x" data-act="cancel" data-id="${j.id}" aria-label="Discard">✕</button>` : ""}</div>`;
  }).join("");
}
onChange((type, job) => {
  if (type === "remove" && thumbs[job.id]) { URL.revokeObjectURL(thumbs[job.id]); delete thumbs[job.id]; }
  if (type !== "progress" || !tray) return;
  const i = jobs.filter(j => !(hideFilter.fn && hideFilter.fn(j))).indexOf(job); if (i < 0) return;
  const bar = tray.children[i] && tray.children[i].querySelector(".up-bar i");
  if (bar) bar.style.width = Math.round(job.progress * 100) + "%";
});
