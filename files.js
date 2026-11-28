// Gyaan Hub - file uploads for chats, posts and reels (photos, videos, PDFs, APK, any document)
//
// Two storage modes, chosen automatically:
//  1) Firebase Storage  (best: up to MAX_STORAGE_MB per file, fast video). Needs Storage to be enabled in the Firebase
//     console + storage.rules published (see README).
//  2) Firestore chunks  (automatic fallback if Storage is not available): the file is cut into ~600 KB pieces and saved
//     as database documents. Works on the free plan, but only for files up to MAX_FALLBACK_MB.
// The same Firebase project / keys as the rest of the site are used. Nothing new to configure in the code.
import { getFbApp, fsSetPath, fsGetPath, fsDeletePath, currentUser } from "./auth.js?v=30";
import { compressImage } from "./media.js?v=30";

export const MAX_STORAGE_MB = 50;      // per file, when Firebase Storage works
export const MAX_FALLBACK_MB = 10;     // per file, when files are saved in the database
export const MAX_REEL_SECONDS = 90;
const CHUNK = 800000;                  // base64 characters per database document (< 1 MB limit)
const STORAGE_SDK = "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
const DEAD_KEY = "gyaan_storage_dead";
// Windows program / script files are not allowed (APK, PDF, ZIP, Office files etc. are allowed). Edit this list if you like.
const BLOCKED = /\.(exe|msi|bat|cmd|scr|vbs|ps1|com|pif)$/i;

export const fmtSize = n => n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
export function kindOf(file) {
  const t = (file.type || "").toLowerCase(), n = (file.name || "").toLowerCase();
  if (t.startsWith("image/") && !/svg/.test(t)) return "image";
  if (t.startsWith("video/") || /\.(mp4|webm|mov|m4v|3gp|mkv)$/.test(n)) return "video";
  if (t.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|opus)$/.test(n)) return "audio";
  return "file";
}
const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("")).replace(/-/g, "").slice(0, 20);
const safeName = n => String(n || "file").replace(/[^\w.\- ()]+/g, "_").slice(0, 80);
const storageDead = () => { try { return sessionStorage.getItem(DEAD_KEY) === "1"; } catch (e) { return false; } };
const markDead = () => { try { sessionStorage.setItem(DEAD_KEY, "1"); } catch (e) {} };

/* scope = { type: "chat", cid } or { type: "post", uid } */
const chunkPath = (scope, fid, i) => scope.type === "chat" ? ["chats", scope.cid, "files", fid + "_" + i] : ["postFiles", fid + "_" + i];
const storagePath = (scope, fid, name) => scope.type === "chat" ? `chat/${scope.cid}/${fid}_${safeName(name)}` : `posts/${scope.uid}/${fid}_${safeName(name)}`;

export function videoDuration(file) {
  return new Promise(res => {
    const v = document.createElement("video"), u = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(u); res(v.duration || 0); };
    v.onerror = () => { URL.revokeObjectURL(u); res(0); };
    v.src = u;
  });
}

// A small cover picture (JPEG data URL, under ~45 KB) taken from the first moments of a video. Used when a reel is shared in a chat.
export function videoCover(file, max = 360) {
  return new Promise(res => {
    const v = document.createElement("video"), u = URL.createObjectURL(file);
    let fin = false;
    const end = d => { if (fin) return; fin = true; clearTimeout(tm); try { URL.revokeObjectURL(u); } catch (e) {} res(d || ""); };
    const tm = setTimeout(() => end(""), 9000);
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
    v.onerror = () => end("");
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.6, (v.duration || 1) / 4); } catch (e) { end(""); } };
    v.onseeked = () => {
      try {
        const w = v.videoWidth, h = v.videoHeight; if (!w || !h) return end("");
        const sc = Math.min(1, max / Math.max(w, h)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
        c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
        let q = .72, d = c.toDataURL("image/jpeg", q);
        while (d.length > 45000 && q > .35) { q -= .1; d = c.toDataURL("image/jpeg", q); }
        end(d.length <= 60000 ? d : "");
      } catch (e) { end(""); }
    };
  });
}

async function prepare(file) {
  if (BLOCKED.test(file.name || "")) throw new Error("This file type is not allowed (" + (file.name.match(/\.\w+$/) || [""])[0] + ").");
  if (kindOf(file) === "image" && !/gif/.test(file.type)) {            // photos are resized on the device first
    const data = await compressImage(file, { max: 1600, quality: 0.86, maxBytes: 900000 });
    const blob = await (await fetch(data)).blob();
    return { blob, name: (file.name || "photo").replace(/\.\w+$/, "") + ".jpg", mime: "image/jpeg", kind: "image" };
  }
  return { blob: file, name: file.name || "file", mime: file.type || "application/octet-stream", kind: kindOf(file) };
}

async function toStorage(p, scope, onProgress, signal) {
  const u = currentUser();
  const m = await import(STORAGE_SDK);
  const st = m.getStorage(getFbApp());
  st.maxUploadRetryTime = 20000; st.maxOperationRetryTime = 20000;
  const fid = rid(), path = storagePath(scope, fid, p.name), r = m.ref(st, path);
  const task = m.uploadBytesResumable(r, p.blob, { contentType: p.mime, customMetadata: { by: u ? u.uid : "" } });
  if (signal) { if (signal.aborted) task.cancel(); else signal.addEventListener("abort", () => { try { task.cancel(); } catch (e) {} }, { once: true }); }
  await new Promise((res, rej) => {
    let last = -1, stall;
    const arm = () => { clearTimeout(stall); stall = setTimeout(() => { try { task.cancel(); } catch (e) {} rej({ code: "storage/stalled" }); }, 25000); };
    arm();
    task.on("state_changed", s => { if (s.bytesTransferred !== last) { last = s.bytesTransferred; arm(); } if (onProgress) onProgress(s.bytesTransferred / Math.max(1, s.totalBytes)); },
      e => { clearTimeout(stall); rej(e); }, () => { clearTimeout(stall); res(); });
  });
  const url = await m.getDownloadURL(r);
  return { store: "st", path, url };
}

const readB64 = blob => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(String(fr.result).split(",")[1] || "");
  fr.onerror = () => rej(new Error("Could not read the file."));
  fr.readAsDataURL(blob);
});
async function toChunks(p, scope, onProgress, signal) {
  const u = currentUser(), b64 = await readB64(p.blob), fid = rid(), n = Math.max(1, Math.ceil(b64.length / CHUNK));
  let done = 0;
  const jobs = Array.from({ length: n }, (_, i) => i);
  const worker = async () => {
    while (jobs.length) {
      if (signal && signal.aborted) throw { code: "storage/canceled" };
      const i = jobs.shift();
      await fsSetPath(chunkPath(scope, fid, i), { d: b64.slice(i * CHUNK, (i + 1) * CHUNK), n: i, by: u.uid }, false);
      done++; if (onProgress) onProgress(done / n);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { store: "fs", fid, chunks: n };
}

// Uploads one file and returns the "attachment" object that is saved inside the message / post.
export async function uploadFile(file, scope, onProgress, signal) {
  if (!currentUser()) throw new Error("Please sign in again.");
  const p = await prepare(file), mb = p.blob.size / 1048576;
  if (!p.blob.size) throw new Error("This file is empty.");
  const base = { kind: p.kind, name: p.name, size: p.blob.size, mime: p.mime };
  if (!storageDead() && mb <= MAX_STORAGE_MB) {
    try { return { ...base, ...(await toStorage(p, scope, onProgress, signal)) }; }
    catch (e) { if (e && e.code === "storage/canceled") throw e; markDead(); }   // Storage not enabled / blocked -> use the database instead
  }
  if (mb > MAX_FALLBACK_MB) throw new Error(`This file is ${fmtSize(p.blob.size)}. Files above ${MAX_FALLBACK_MB} MB need Firebase Storage to be enabled (README > "Photos, videos and files"). Please send a smaller file.`);
  return { ...base, ...(await toChunks(p, scope, onProgress, signal)) };
}

// Returns a URL you can put in <img>, <video> or <a href>.
const blobMem = {};
export async function fileUrl(att, scope) {
  if (!att) return "";
  if (att.store === "st") return att.url || "";
  if (!att.fid) return "";
  if (blobMem[att.fid]) return blobMem[att.fid];
  blobMem[att.fid] = (async () => {
    const parts = await Promise.all(Array.from({ length: att.chunks || 1 }, (_, i) => fsGetPath(chunkPath(scope, att.fid, i))));
    if (parts.some(x => !x)) throw new Error("File is no longer available.");
    const bytes = parts.map(x => { const bin = atob(x.d), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; });
    return URL.createObjectURL(new Blob(bytes, { type: att.mime || "application/octet-stream" }));
  })();
  try { return await blobMem[att.fid]; } catch (e) { delete blobMem[att.fid]; throw e; }
}

// Removes the stored file (used by "unsend" and "delete post"). Never throws.
export async function deleteFile(att, scope) {
  if (!att) return;
  try {
    if (att.store === "st" && att.path) {
      const m = await import(STORAGE_SDK);
      await m.deleteObject(m.ref(m.getStorage(getFbApp()), att.path));
    } else if (att.store === "fs" && att.fid) {
      await Promise.all(Array.from({ length: att.chunks || 1 }, (_, i) => fsDeletePath(chunkPath(scope, att.fid, i)).catch(() => {})));
      delete blobMem[att.fid];
    }
  } catch (e) {}
}

export const attLabel = a => !a ? "" : a.kind === "image" ? "Photo" : a.kind === "video" ? "Video" : a.kind === "audio" ? "Audio" : "File: " + a.name;
