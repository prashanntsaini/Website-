/* Gyaan Hub - ads (300x250 banner + popunder)
   - Ads load ONLY after the visitor has accepted the consent popup (layout.js).
   - Banner: each one runs inside its own iframe, so the tag never clashes with another banner.
   - Popunder: loaded only on the test result screen, at most once every 30 minutes.
   - Turn everything off: set adsEnabled:false in site-config.js. */
(function () {
  var C = window.SITE_CONFIG || {};
  var ON = C.adsEnabled !== false;
  var BANNER_KEY = "732b21a1ff7d53a91fca68bbaa0f09ef";
  var BANNER_SRC = "https://bauval.org/22/" + BANNER_KEY;
  var POP_SRC = "https://abscloud.org/1/f6fbfcadc31da5429e197074a9e12caf";
  var POP_GAP = 30 * 60 * 1000;

  function consented() {
    try { var c = JSON.parse(localStorage.getItem("gyaan_consent") || "null"); return !!(c && c.policies); } catch (e) { return false; }
  }
  function whenConsent(fn) {
    if (consented()) return fn();
    var h = function () { if (consented()) { window.removeEventListener("consent-changed", h); fn(); } };
    window.addEventListener("consent-changed", h);
  }

  function frameDoc() {
    var s = "scr" + "ipt";
    return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>" +
      "<body style=\"margin:0;background:transparent;overflow:hidden\">" +
      "<" + s + ">atOptions={'key':'" + BANNER_KEY + "','format':'iframe','height':250,'width':300,'params':{}};</" + s + ">" +
      "<" + s + " data-cfasync=\"false\" src=\"" + BANNER_SRC + "\"></" + s + ">" +
      "</body></html>";
  }

  function build(box) {
    box.innerHTML = "";
    var lab = document.createElement("small");
    lab.className = "ad-label"; lab.textContent = "Advertisement";
    var fr = document.createElement("iframe");
    fr.width = 300; fr.height = 250; fr.setAttribute("scrolling", "no");
    fr.setAttribute("frameborder", "0"); fr.title = "Advertisement"; fr.className = "ad-frame";
    box.append(lab, fr);
    box.classList.add("ad-slot");
    var go = function () { fr.srcdoc = frameDoc(); };
    if ("IntersectionObserver" in window) {      // load only when the ad is about to be seen
      var io = new IntersectionObserver(function (e) {
        if (e.some(function (x) { return x.isIntersecting; })) { io.disconnect(); go(); }
      }, { rootMargin: "200px" });
      io.observe(box);
    } else go();
  }

  var GA = {
    // builds the banner once per box (safe to call again, e.g. when a list re-renders)
    banner: function (box) {
      if (!ON || !box || box.dataset.adReady) return;
      box.dataset.adReady = "1";
      whenConsent(function () { build(box); });
    },
    // rebuilds the banner with a fresh ad (used on every new test result)
    fresh: function (box) {
      if (!ON || !box) return;
      box.dataset.adReady = "1";
      whenConsent(function () { build(box); });
    },
    // popunder: once per 30 minutes per device, only after consent
    popunder: function () {
      if (!ON) return;
      whenConsent(function () {
        try {
          var last = +localStorage.getItem("gyaan_pop_ts") || 0;
          if (Date.now() - last < POP_GAP) return;
          localStorage.setItem("gyaan_pop_ts", String(Date.now()));
        } catch (e) { if (window.__gyaanPop) return; }
        if (window.__gyaanPop) return;
        window.__gyaanPop = true;
        var s = document.createElement("script");
        s.setAttribute("data-cfasync", "false"); s.async = true; s.src = POP_SRC;
        document.head.appendChild(s);
      });
    }
  };
  window.GyaanAds = GA;
})();
