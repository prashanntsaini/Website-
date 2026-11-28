// Gyaan Hub - account switcher sheet (several accounts on one device, like Instagram / Facebook)
import { getAccounts, accountSlot, switchAccount, startAddAccount, logout, maxAccounts, currentUser } from "./auth.js?v=30";
import { t } from "./i18n.js?v=30";

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const label = a => a.name || (a.email ? a.email.split("@")[0] : "Account");
function avatar(a, cls = "") {
  let img = ""; try { img = localStorage.getItem("gyaan_avatar_" + a.uid) || ""; } catch (e) {}
  return img ? `<img class="avatar ${cls}" src="${esc(img)}" alt="">` : `<span class="avatar ${cls}">${esc((label(a)[0] || "?").toUpperCase())}</span>`;
}
const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4M19 12H9"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>'
};

export function currentAccountName() {
  const me = getAccounts().find(a => a.slot === accountSlot());
  const u = currentUser();
  return (u && (u.displayName || (u.email || "").split("@")[0])) || (me && label(me)) || "";
}

// Small stacked-avatars strip used on the drawer's "Switch account" button
export function stackHtml(max = 3) {
  const list = getAccounts(), cur = accountSlot();
  const ordered = [...list.filter(a => a.slot === cur), ...list.filter(a => a.slot !== cur)].slice(0, max);
  return `<span class="acc-stack" aria-hidden="true">${ordered.map(a => avatar(a)).join("")}</span>`;
}

export function openAccountSheet() {
  if (document.getElementById("acc-ov")) return;
  const list = getAccounts(), cur = accountSlot(), full = list.length >= maxAccounts();
  const ordered = [...list.filter(a => a.slot === cur), ...list.filter(a => a.slot !== cur)];
  const ov = document.createElement("div");
  ov.id = "acc-ov"; ov.className = "acc-ov";
  ov.innerHTML = `<div class="acc-card" role="dialog" aria-modal="true" aria-label="${esc(t("acc.title"))}">
    <div class="acc-glow" aria-hidden="true"></div>
    <div class="acc-grab"></div>
    <div class="acc-top">
      <div><h3>${esc(t("acc.title"))}</h3><p class="acc-sub">${list.length} / ${maxAccounts()} on this device</p></div>
      <button type="button" class="acc-x" aria-label="${esc(t("acc.close"))}">${ICON.x}</button>
    </div>
    <div class="acc-list">${ordered.map((a, i) => `
      <button type="button" class="acc-row ${a.slot === cur ? "on" : ""}" data-slot="${a.slot}" style="animation-delay:${i * 45}ms">
        <span class="acc-ring">${avatar(a)}${a.slot === cur ? `<em class="acc-tick">${ICON.check}</em>` : ""}</span>
        <span class="acc-t"><b>${esc(label(a))}</b><small>${esc(a.email)}</small></span>
        ${a.slot === cur ? `<span class="acc-pill">Active</span>` : `<span class="acc-go" aria-hidden="true">›</span>`}
      </button>`).join("")}
      <button type="button" class="acc-row acc-add" ${full ? "disabled" : ""} style="animation-delay:${ordered.length * 45}ms">
        <span class="acc-plus">${ICON.plus}</span>
        <span class="acc-t"><b>${esc(t("acc.add"))}</b><small>${full ? esc(t("acc.max")) : "Sign in or create another account"}</small></span>
      </button>
    </div>
    <button type="button" class="acc-out">${ICON.out}<span>${esc(t("acc.logoutThis"))}</span></button>
    <p class="acc-safe">${ICON.shield}<span>Your accounts stay private on this device.</span></p>
  </div>`;
  document.body.appendChild(ov);
  document.body.classList.add("noscroll");
  const close = () => {
    const c = ov.querySelector(".acc-card");
    ov.classList.add("closing"); if (c) c.classList.add("closing");
    document.removeEventListener("keydown", onKey);
    setTimeout(() => { ov.remove(); document.body.classList.remove("noscroll"); }, 180);
  };
  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  ov.addEventListener("click", e => { if (e.target === ov) close(); });
  ov.querySelector(".acc-x").addEventListener("click", close);
  ov.querySelectorAll(".acc-row[data-slot]").forEach(b => b.addEventListener("click", () => {
    const s = +b.dataset.slot;
    if (s === cur) return close();
    b.classList.add("switching");
    if (navigator.vibrate) navigator.vibrate(10);
    setTimeout(() => switchAccount(s), 120);
  }));
  const add = ov.querySelector(".acc-add");
  add.addEventListener("click", () => { if (!full) startAddAccount(); });
  ov.querySelector(".acc-out").addEventListener("click", () => logout());
}
