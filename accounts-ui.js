// Gyaan Hub - account switcher sheet (several accounts on one device, like Instagram)
import { getAccounts, accountSlot, switchAccount, startAddAccount, logout, maxAccounts, currentUser } from "./auth.js?v=20";
import { t } from "./i18n.js?v=20";

const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const label = a => a.name || (a.email ? a.email.split("@")[0] : "Account");
function avatar(a) {
  let img = ""; try { img = localStorage.getItem("gyaan_avatar_" + a.uid) || ""; } catch (e) {}
  return img ? `<img class="avatar" src="${esc(img)}" alt="">` : `<span class="avatar">${esc((label(a)[0] || "?").toUpperCase())}</span>`;
}

export function currentAccountName() {
  const me = getAccounts().find(a => a.slot === accountSlot());
  const u = currentUser();
  return (u && (u.displayName || (u.email || "").split("@")[0])) || (me && label(me)) || "";
}

export function openAccountSheet() {
  if (document.getElementById("acc-ov")) return;
  const list = getAccounts(), cur = accountSlot(), full = list.length >= maxAccounts();
  const ov = document.createElement("div");
  ov.id = "acc-ov"; ov.className = "acc-ov";
  ov.innerHTML = `<div class="acc-card" role="dialog" aria-modal="true" aria-label="${esc(t("acc.title"))}">
    <div class="acc-grab"></div>
    <h3>${esc(t("acc.title"))}</h3>
    <div class="acc-list">${list.map(a => `
      <button type="button" class="acc-row ${a.slot === cur ? "on" : ""}" data-slot="${a.slot}">
        ${avatar(a)}
        <span class="acc-t"><b>${esc(label(a))}</b><small>${esc(a.email)}</small></span>
        <span class="acc-radio" aria-hidden="true"></span>
      </button>`).join("")}</div>
    <button type="button" class="btn btn-ghost btn-block acc-add" ${full ? "disabled" : ""}>＋ ${esc(t("acc.add"))}</button>
    ${full ? `<p class="acc-note">${esc(t("acc.max"))}</p>` : ""}
    <button type="button" class="btn btn-ghost btn-block acc-out">${esc(t("acc.logoutThis"))}</button>
    <button type="button" class="acc-close">${esc(t("acc.close"))}</button>
  </div>`;
  document.body.appendChild(ov);
  document.body.classList.add("noscroll");
  const close = () => { ov.remove(); document.body.classList.remove("noscroll"); document.removeEventListener("keydown", onKey); };
  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  ov.addEventListener("click", e => { if (e.target === ov) close(); });
  ov.querySelector(".acc-close").addEventListener("click", close);
  ov.querySelectorAll(".acc-row").forEach(b => b.addEventListener("click", () => {
    const s = +b.dataset.slot;
    if (s === cur) return close();
    switchAccount(s);
  }));
  ov.querySelector(".acc-add").addEventListener("click", () => startAddAccount());
  ov.querySelector(".acc-out").addEventListener("click", () => logout());
}
