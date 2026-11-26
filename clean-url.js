/* Gyaan Hub - clean URLs: shows /messages instead of /messages.html (and / instead of /index.html).
   Load as a plain <script src="clean-url.js?v=18"></script> at the top of <head> on every page.
   Needs a host that serves /messages for messages.html (GitHub Pages, Netlify, Vercel, Firebase Hosting do). */
(function () {
  var EXT = /\.html?$/i;
  function cleanPath(p) {
    if (/(^|\/)index\.html?$/i.test(p)) return p.replace(/index\.html?$/i, "") || "/";
    return p.replace(EXT, "");
  }
  // 1) address bar of the page being opened
  try {
    var p = location.pathname;
    if (EXT.test(p)) history.replaceState(history.state, "", cleanPath(p) + location.search + location.hash);
  } catch (e) {}

  // 2) pages that call history.replaceState / pushState with "profile.html" etc.
  function cleanArg(u) {
    if (typeof u !== "string" && !(u && u.href)) return u;
    try {
      var url = new URL(String(u), location.href);
      if (url.origin === location.origin && EXT.test(url.pathname)) { url.pathname = cleanPath(url.pathname); return url.href; }
    } catch (e) {}
    return u;
  }
  ["replaceState", "pushState"].forEach(function (m) {
    var orig = history[m];
    history[m] = function (s, t, u) { return orig.call(history, s, t, u == null ? u : cleanArg(u)); };
  });

  // 3) links: <a href="messages.html?x=1"> -> <a href="messages?x=1"> (also links added later by scripts)
  var LINK = /^(?![a-z][a-z0-9+.-]*:|\/\/|#)([^?#]*?)\.html?([?#].*)?$/i;
  function fix(a) {
    var h = a.getAttribute && a.getAttribute("href");
    if (!h) return;
    var m = h.match(LINK);
    if (!m) return;
    var base = m[1];
    a.setAttribute("href", /(^|\/)index$/.test(base) ? base.replace(/index$/, "") || "./" : base + (m[2] || ""));
    if (/(^|\/)index$/.test(base) && m[2]) a.setAttribute("href", (base.replace(/index$/, "") || "./") + m[2]);
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.tagName === "A") fix(root);
    var list = root.querySelectorAll ? root.querySelectorAll("a[href]") : [];
    for (var i = 0; i < list.length; i++) fix(list[i]);
  }
  function start() {
    scan(document.documentElement);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === "attributes") fix(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
