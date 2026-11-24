/* Gyaan Hub - bulk question import (used by admin.html -> Tests -> Bulk import)
   parseQuestions(text, filename?) accepts JSON, CSV, HTML or plain text and returns
   { questions: [{ q, opts:[4], ans:0-3, img?, optImgs? }], errors: [string], meta: {title?, subject?, minutes?, active?} } */

const L = "ABCD";
const clean = s => String(s ?? "").replace(/\s+\n/g, "\n").trim();

/* ---------- helpers ---------- */
function htmlToText(h) {
  let s = String(h);
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<h[1-3]\b[^>]*>[\s\S]*?<\/h[1-3]>/gi, "");                       // page / section titles are not questions
  // mark options / questions that the HTML already flags as correct
  s = s.replace(/<(li|p|div|span|label|td|option)\b([^>]*?(?:class\s*=\s*["'][^"']*\bcorrect\b[^"']*["']|data-correct|data-answer\s*=\s*["']?(?:true|1))[^>]*)>/gi, "<$1$2>\u2713 ");
  // a list with exactly 4 items and no nested list = the options of one question -> letter them A-D
  s = s.replace(/<(ul|ol)\b[^>]*>((?:(?!<\/?(?:ul|ol)\b)[\s\S])*?)<\/\1>/gi, (m, tag, inner) => {
    const items = inner.match(/<li\b[^>]*>/gi) || [];
    if (items.length !== 4) return m;
    let k = 0;
    return "<br><br>" + inner.replace(/(<li\b[^>]*>)/gi, (_, t) => t + "\n" + "ABCD"[k++] + ") ");
  });
  s = s.replace(/<option\b[^>]*>/gi, m => m + "\n");
  s = s.replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|ul|ol|table|section|article|label|option|dd|dt|pre|blockquote)>|<(p|div|li|tr|h[1-6]|ul|ol|section|article)\b[^>]*>/gi, "\n");
  s = s.replace(/<\/t[dh]>/gi, "  ");
  s = s.replace(/<[^>]+>/g, "");
  const ent = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ldquo: '"', rdquo: '"', lsquo: "'", rsquo: "'", hellip: "...", ndash: "-", mdash: "-" };
  s = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n ? String.fromCodePoint(n) : m; }
    return ent[e.toLowerCase()] ?? m;
  });
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function toAnswerIndex(v, opts) {
  if (v === undefined || v === null || v === "") return -1;
  if (typeof v === "number") return v >= 0 && v <= 3 ? Math.floor(v) : -1;       // numbers are 0-based (A=0)
  const s = String(v).trim();
  if (/^[A-Da-d]$/.test(s)) return L.indexOf(s.toUpperCase());
  const m = s.match(/^\(?([A-Da-d])\)?[.):]?$/);
  if (m) return L.indexOf(m[1].toUpperCase());
  if (/^[0-3]$/.test(s)) return +s;
  const hit = opts.findIndex(o => o.trim().toLowerCase() === s.toLowerCase());
  return hit;
}

/* ---------- JSON ---------- */
function parseJson(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return { questions: [], errors: ["Invalid JSON: " + e.message], meta: {} }; }
  const meta = {};
  let arr = data;
  if (!Array.isArray(data)) {
    for (const k of ["title", "subject"]) if (typeof data[k] === "string") meta[k] = data[k];
    if (Number.isFinite(+data.minutes)) meta.minutes = +data.minutes;
    if (typeof data.active === "boolean") meta.active = data.active;
    arr = data.questions || data.items || data.data;
  }
  if (!Array.isArray(arr)) return { questions: [], errors: ["JSON must be a list of questions, or an object with a \"questions\" list."], meta };
  const questions = [], errors = [];
  arr.forEach((it, i) => {
    const n = i + 1;
    if (!it || typeof it !== "object") return errors.push("Question " + n + ": not an object.");
    const q = clean(it.q ?? it.question ?? it.text ?? it.title ?? "");
    let opts = it.opts ?? it.options ?? it.choices ?? it.answers;
    if (!Array.isArray(opts)) {
      const pick = ["a", "b", "c", "d"].map((k, j) => it[k] ?? it[k.toUpperCase()] ?? it["option" + (j + 1)] ?? it["option" + k.toUpperCase()] ?? it["opt" + (j + 1)]);
      opts = pick.some(v => v !== undefined) ? pick : null;
    }
    if (!opts) return errors.push("Question " + n + ": options are missing.");
    opts = opts.map(o => clean(o && typeof o === "object" ? (o.text ?? o.t ?? o.label ?? "") : o));
    const optImgs = [0, 1, 2, 3].map(k => String(it.optImgs?.[k] ?? it.optionImages?.[k] ?? "").trim());
    if (opts.length !== 4) return errors.push("Question " + n + ": needs exactly 4 options (found " + opts.length + ").");
    let ans = toAnswerIndex(it.ans ?? it.answer ?? it.correct ?? it.correctAnswer ?? it.correct_answer ?? it.right, opts);
    if (ans < 0) {
      const flag = (Array.isArray(it.options) ? it.options : []).findIndex(o => o && typeof o === "object" && (o.correct === true || o.isCorrect === true));
      ans = flag;
    }
    if (ans < 0) return errors.push("Question " + n + ": correct answer is missing or not understood.");
    const img = String(it.img ?? it.image ?? "").trim();
    if (!q && !img) return errors.push("Question " + n + ": question text is empty.");
    if (opts.some((o, j) => !o && !optImgs[j])) return errors.push("Question " + n + ": an option is empty.");
    questions.push({ q, opts, ans, ...(img ? { img } : {}), ...(optImgs.some(Boolean) ? { optImgs } : {}) });
  });
  return { questions, errors, meta };
}

/* ---------- CSV ---------- */
function csvRows(text) {
  const rows = []; let row = [], cell = "", q = false;
  const sep = (text.split("\n")[0].match(/\t/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? "\t" : ",";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
function parseCsv(text) {
  let rows = csvRows(text);
  if (rows.length && /^(q|question|que)/i.test(rows[0][0].trim()) && /ans|correct/i.test(rows[0].join(" "))) rows = rows.slice(1);
  const questions = [], errors = [];
  rows.forEach((r, i) => {
    const n = i + 1, c = r.map(x => clean(x));
    if (c.length < 6) return errors.push("Row " + n + ": needs question, 4 options and the answer (found " + c.length + " columns).");
    const opts = c.slice(1, 5), ans = toAnswerIndex(c[5], opts);
    if (!c[0]) return errors.push("Row " + n + ": question is empty.");
    if (opts.some(o => !o)) return errors.push("Row " + n + ": an option is empty.");
    if (ans < 0) return errors.push("Row " + n + ": answer must be A, B, C or D.");
    const img = c[6] || "";
    questions.push({ q: c[0], opts, ans, ...(img ? { img } : {}) });
  });
  return { questions, errors, meta: {} };
}

/* ---------- plain text (also used for HTML after conversion) ---------- */
function parseText(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const qStart = /^\s*(?:(?:Q(?:uestion)?\.?\s*)?(\d{1,4})\s*[.):\-]|Q(?:uestion)?\s*[:.])\s*(.*)$/i;
  const optRe = /^\s*\(?([A-Da-d])\s*[.):]\s*(.*)$/;
  const ansRe = /^\s*(?:correct\s+)?(?:ans(?:wer)?|correct(?:\s+(?:answer|option))?|right\s+answer)\s*[:=\-]?\s*\(?([A-Da-d1-4])(?![A-Za-z0-9])/i;
  const skipRe = /^\s*(explanation|solution|sol|hint|reason|note)\s*[:.\-]/i;
  const mark = /(?:\s*\*+\s*$|^\s*[\u2713\u2714\u2705]\s*|\s*[\u2713\u2714\u2705]\s*$|\s*\(\s*correct\s*\)\s*$)/i;
  const out = [], errors = [];
  let cur = null, skipping = false, blank = false;
  const begin = (q) => { cur = { q, opts: [], ans: -1, line: 0 }; skipping = false; };
  const finish = () => {
    if (!cur) return;
    const n = out.length + errors.length + 1, c = cur;
    c.q = clean(c.q);
    if (!c.q && c.opts.length === 0) { cur = null; return; }
    if (!c.q) errors.push("Question " + n + ": question text is empty.");
    else if (c.opts.length !== 4) errors.push("Question " + n + " (\"" + c.q.slice(0, 40) + "\"): needs exactly 4 options A-D (found " + c.opts.length + ").");
    else if (c.opts.some(o => !o)) errors.push("Question " + n + ": an option is empty.");
    else if (c.ans < 0) errors.push("Question " + n + " (\"" + c.q.slice(0, 40) + "\"): no correct answer. Add a line like \"Answer: B\".");
    else out.push({ q: c.q, opts: c.opts.map(clean), ans: c.ans });
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { blank = true; continue; }
    const wasBlank = blank; blank = false;
    const am = line.match(ansRe);
    if (am && cur && cur.opts.length) { const v = am[1].toUpperCase(); cur.ans = /\d/.test(v) ? +v - 1 : L.indexOf(v); skipping = true; continue; }
    if (skipRe.test(line) && cur) { skipping = true; continue; }
    const om = cur && !skipping ? line.match(optRe) : (cur && cur.opts.length < 4 ? line.match(optRe) : null);
    if (om && cur && (cur.q || cur.opts.length)) {
      let t = om[2];
      if (mark.test(t)) { t = t.replace(mark, ""); cur.ans = cur.opts.length; }
      if (cur.opts.length >= 4) { cur.opts.push(t); continue; }       // 5th option -> error at finish
      cur.opts.push(t); skipping = false; continue;
    }
    const qm = line.match(qStart);
    if (qm) { finish(); begin(qm[2] || ""); continue; }
    if (!cur) { begin(line); continue; }
    if (skipping) {
      if (wasBlank && cur.opts.length >= 2) { finish(); begin(line); }
      continue;                                                    // lines of an explanation
    }
    if (cur.opts.length === 0) { cur.q += "\n" + line; continue; }
    if (wasBlank && cur.opts.length >= 2) { finish(); begin(line); continue; }   // unnumbered next question
    cur.opts[cur.opts.length - 1] += " " + line;                   // wrapped option text
  }
  finish();
  return { questions: out, errors, meta: {} };
}

/* ---------- entry point ---------- */
export function parseQuestions(input, filename = "") {
  let text = String(input ?? "").replace(/^\uFEFF/, "").trim();
  if (!text) return { questions: [], errors: ["Nothing to import. Paste your questions or choose a file."], meta: {} };
  const ext = (filename.split(".").pop() || "").toLowerCase();
  let res;
  if (/^[\[{]/.test(text) || ext === "json") res = parseJson(text);
  else if (ext === "csv" || ext === "tsv") res = parseCsv(text);
  else if (/<\s*(html|body|div|p|ul|ol|li|table|br|h[1-6]|span)\b/i.test(text) || ext === "html" || ext === "htm") res = parseText(htmlToText(text));
  else {
    res = parseText(text);
    if (!res.questions.length && text.split("\n")[0].includes(",") && csvRows(text).every(r => r.length >= 6)) res = parseCsv(text);
  }
  if (!res.questions.length && !res.errors.length) res.errors.push("No questions were found. Check the format shown above the box.");
  return res;
}
