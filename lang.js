/* Tsunami tillari: o'zbekcha (asosiy) va ruscha. Kodda matn o'zbekcha yoziladi; sahifa chizilgach shu fayl
   ko'rinadigan matnlarni (yozuvlar, tugmalar, maydon izohlari, xabarlar) tanlangan tilga o'giradi.
   Foydalanuvchi kiritgan ma'lumot (tovar nomlari, mijoz ismlari, izohlar) lug'atda yo'q — o'zgarmaydi.
   Lug'at lang-ru.js da: ru — ruscha tarjimalar (raqam o'rnida #), uz — o'zbekcha rejimdagi tuzatishlar
   (lotin harfida yozilgan ruscha so'zlar o'rniga o'zbekcha), inline — matn ichida ham almashtiriladigan so'zlar,
   nouns — «5 ta tovar» kabi sanoqlar uchun ruscha ko'plik shakllari. */
(function () {
  "use strict";
  var LS = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  var LANG = LS("tsu_lang") === "ru" ? "ru" : "uz";
  window.TSU_LANG = LANG;
  var Q = /[‘’ʻʼ`´]/g, NUM = /\d[\d \.,:]*\d|\d/g, SEP = /(\s+(?:·|—|→|\||–)\s+)/, EDGE = " .:;,«»\"()[]—-+•×!?…";
  var strip = function (s) { var a = 0, b = s.length; while (a < b && EDGE.indexOf(s.charAt(a)) >= 0) a++; while (b > a && EDGE.indexOf(s.charAt(b - 1)) >= 0) b--; return s.slice(a, b); };
  var norm = function (s) { return String(s).replace(Q, "'").replace(/\s+/g, " ").trim(); };
  var PAT = [], D = null, LOW = null, IRX = null, IMAP = null, NRX = null, NOUN = null;
  function build() {
    var W = window.TSU_DICT || {}; D = LANG === "ru" ? (W.ru || {}) : {}; LOW = {};
    Object.keys(D).forEach(function (k) { LOW[strip(norm(k)).toLowerCase()] = D[k]; });
    var inl = LANG === "ru" ? (W.inline || {}) : (W.uz || {}); IMAP = {};
    var ks = Object.keys(inl).sort(function (a, b) { return b.length - a.length; });
    ks.forEach(function (k) { var nk = norm(k); IMAP[LANG === "uz" ? nk : nk.toLowerCase()] = inl[k]; });
    var esc = function (s) { return norm(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['‘’ʻʼ`´]").replace(/ /g, "\\s+"); };
    IRX = ks.length ? new RegExp("(^|[^A-Za-z0-9А-яЁё'‘’ʻʼ])(" + ks.map(esc).join("|") + ")(?![A-Za-z0-9А-яЁё'‘’ʻʼ])", "g" + (LANG === "uz" ? "" : "i")) : null;
    PAT = LANG === "ru" ? (W.pat || []).map(function (p) { return [new RegExp(p[0].replace(/'/g, "['‘’ʻʼ`´]")), p[1]]; }) : [];
    NOUN = LANG === "ru" ? (W.nouns || {}) : {};
    var nk = Object.keys(NOUN).sort(function (a, b) { return b.length - a.length; });
    NRX = nk.length ? new RegExp("(\\d[\\d ]*)\\s+ta\\s+(" + nk.map(esc).join("|") + ")(?![A-Za-z'])", "gi") : null;
  }
  function plural(n, f) { n = Math.abs(parseInt(String(n).replace(/\s/g, ""), 10)) % 100; var d = n % 10; return n > 10 && n < 20 ? f[2] : d === 1 ? f[0] : d >= 2 && d <= 4 ? f[1] : f[2]; }
  function caseLike(src, out) { if (!out) return out; var a = src.charAt(0), b = out.charAt(0); if (a !== a.toLowerCase() && b === b.toLowerCase()) return b.toUpperCase() + out.slice(1); if (a === a.toLowerCase() && a !== a.toUpperCase() && b !== b.toLowerCase() && !/^[A-Z]{2}/.test(out)) return b.toLowerCase() + out.slice(1); return out; }
  // bitta bo'lak: aniq moslik → raqamli andoza
  function look(core) {
    if (D[core] != null) return D[core];
    var lc = core.toLowerCase(); if (LOW[lc] != null) return caseLike(core, LOW[lc]);
    var t = core.replace(NUM, "#"); if (t === core) return null;
    var v = D[t] != null ? D[t] : LOW[t.toLowerCase()]; if (v == null) return null;
    var nums = core.match(NUM) || [], i = 0; return v.replace(/#/g, function () { return nums[i++] || ""; });
  }
  function piece(p, lookOnly) {
    var a = 0, b = p.length; while (a < b && EDGE.indexOf(p.charAt(a)) >= 0) a++; while (b > a && EDGE.indexOf(p.charAt(b - 1)) >= 0) b--;
    var core = p.slice(a, b); if (!/[A-Za-z]{2}/.test(core)) return null;
    var v = LANG === "ru" ? look(core) : null; if (v != null) { var suf = p.slice(b); if (suf && /[.!?…]$/.test(v) && /^[.!?…]/.test(suf)) suf = suf.replace(/^[.!?…]+/, ""); return p.slice(0, a) + v + suf; }
    if (lookOnly) return null;
    var out = core, hit = false;
    for (var q = 0; q < PAT.length; q++) { if (PAT[q][0].test(core)) { out = core.replace(PAT[q][0], PAT[q][1]); hit = true; break; } }
    if (NRX) out = out.replace(NRX, function (all, n, w) { var f = NOUN[norm(w).toLowerCase()] || NOUN[norm(w)]; if (!f) return all; hit = true; return n.trim() + " " + plural(n, f); });
    if (LANG === "uz") { var o2 = IRX ? p.replace(IRX, function (all, pre, w) { var r = IMAP[norm(w)]; if (r == null) return all; hit = true; return pre + r; }) : p; return hit ? o2 : null; }
    if (IRX) out = out.replace(IRX, function (all, pre, w) { var r = IMAP[norm(w).toLowerCase()]; if (r == null) return all; hit = true; return pre + caseLike(w, r); });
    return hit ? p.slice(0, a) + out + p.slice(b) : null;
  }
  /** Matnni tanlangan tilga o'giradi (lug'atda bo'lmasa — o'zgarishsiz qaytadi). */
  function T(s) {
    if (s == null) return s; var str = String(s); if (!/[A-Za-z]{2}/.test(str)) return str;
    if (!D) build();
    var lead = str.match(/^\s*/)[0], tail = str.match(/\s*$/)[0], n = norm(str); if (!n) return str;
    var parts = n.split(SEP), w;
    if (LANG === "ru") { w = piece(n, true); if (w != null) return lead + w + tail; }
    if (parts.length < 2) { w = piece(n); if (w != null) return lead + w + tail; if (window.__I18N_MISS) window.__I18N_MISS.add(n); return str; }
    var hit = false; for (var i = 0; i < parts.length; i += 2) { var r = piece(parts[i]); if (r != null) { parts[i] = r; hit = true; } }
    if (!hit) { if (window.__I18N_MISS) window.__I18N_MISS.add(n); return str; }
    return lead + parts.join("") + tail;
  }
  window.tsuT = T;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };
  var ATTR = ["placeholder", "title", "aria-label", "data-tip", "alt", "label"];
  function okEl(el) { for (var e = el; e && e.nodeType === 1; e = e.parentNode) { if (SKIP[e.tagName] || e.isContentEditable || (e.classList && e.classList.contains("notr"))) return false; if (e.tagName === "BODY") break; } return true; }
  function doText(t) { var v = t.nodeValue; if (!v || t.__tr === v || !/[A-Za-z]{2}/.test(v)) return; if (!okEl(t.parentNode)) return; var r = T(v); t.__tr = r; if (r !== v) t.nodeValue = r; }
  function doAttrs(el) {
    for (var i = 0; i < ATTR.length; i++) { var a = el.getAttribute(ATTR[i]); if (a && /[A-Za-z]{2}/.test(a)) { var r = T(a); if (r !== a) el.setAttribute(ATTR[i], r); } }
    if (el.tagName === "INPUT" && (el.type === "button" || el.type === "submit") && el.value) { var v = T(el.value); if (v !== el.value) el.value = v; }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType === 1) { if (SKIP[root.tagName]) return; doAttrs(root); } else if (root.nodeType !== 9 && root.nodeType !== 11) return;
    var tw = document.createTreeWalker(root, 5, null), n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else if (!SKIP[n.tagName]) doAttrs(n); }
  }
  window.tsuTranslate = walk;
  var started = false;
  function start() {
    if (started) return; started = true; build();
    walk(document.body); if (document.title) document.title = T(document.title);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) { var m = ms[i];
        if (m.type === "characterData") doText(m.target);
        else if (m.type === "attributes") { if (okEl(m.target)) doAttrs(m.target); }
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
    ["alert", "confirm", "prompt"].forEach(function (f) { var o = window[f]; if (typeof o !== "function") return; window[f] = function (msg, def) { return o.call(window, T(msg), def); }; });
  }
  /** Tilni almashtirish (sahifa qayta yuklanadi). */
  window.tsuSetLang = function (l) { LS("tsu_lang", l === "ru" ? "ru" : "uz"); location.reload(); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
