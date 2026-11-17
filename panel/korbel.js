/* «Corbel» dizayni (1-video) uchun xatti-harakat: sarlavha menyusi, suzuvchi asboblar paneli, bosh sahifa (#bosh),
   qidiruv (Ctrl+K), bildirishnomalar, yorug'/tun almashtirish (aylana bo'lib), raqamlar sanab chiqishi.
   Panelning o'z kodiga tegmaydi: faqat SECTIONS, render, crGo va window.TSU (shim.js) dan foydalanadi. */
(function () {
  "use strict";
  if (window.__kb) return; window.__kb = 1;
  var H = document.documentElement, $ = function (id) { return document.getElementById(id); };
  var on = function () { return H.getAttribute("data-lay") === "corbel"; };
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var SEC = typeof SECTIONS !== "undefined" ? SECTIONS : [], ICO = typeof NAV_ICONS !== "undefined" ? NAV_ICONS : {};
  var svg = function (d, cls) { return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var I = {
    wave: '<path d="M2 15c2.2 0 2.8-2 5-2s2.8 2 5 2 2.8-2 5-2 2.8 2 5 2M4 11c1-4 4.5-6.5 8.5-6.5 2.5 0 4.5 1 5.5 2.5-2.5-.5-4.5.5-5 2.5"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    tasks: '<rect x="4" y="4" width="16" height="17" rx="3"/><path d="M9 3v3h6V3M8.5 12l2 2 4-4M8.5 17h7"/>', phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.6"/><path d="M11 5.4h2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', chart: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>', down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', chev: '<path d="M6 9l6 6 6-6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', cart: '<path d="M3 4h2l2.4 11h11.2L21 8H6.2"/><circle cx="9" cy="19" r="1.5"/><circle cx="18" cy="19" r="1.5"/>', box: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
    wallet: '<path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3"/><circle cx="16" cy="13.5" r="1.3"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };
  var PILLS = ["sotuv", "crm", "ombor", "moliya", "taminot", "hisobotlar"];
  var ME = { name: "", shop: "Tsunami", role: "" }, DASH = {}, P = "day", LIVE = null;

  // ---------- pul va raqamlar ----------
  function cur(c) { return c === "USD" ? "$" : "so'm"; }
  function fmt(v, c) { if (v == null || isNaN(v)) return "—"; var n = Math.round(Number(v) * (c === "USD" ? 100 : 1)) / (c === "USD" ? 100 : 1), s = Math.abs(n).toFixed(c === "USD" && n % 1 ? 2 : 0).replace(/\B(?=(\d{3})+(?!\d))/g, " "); return (n < 0 ? "−" : "") + s; }
  function short(v, c) { var a = Math.abs(v); if (c === "USD") return a >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, "") + "k" : String(Math.round(v)); return a >= 1e9 ? (v / 1e9).toFixed(1).replace(/\.0$/, "") + " mlrd" : a >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + " mln" : a >= 1e3 ? Math.round(v / 1e3) + " ming" : String(Math.round(v)); }
  function countUp(el, to, c, ms) {
    if (!el) return; if (to == null || isNaN(to)) { el.textContent = "—"; return; }
    var t0 = performance.now(), d = ms || 1100, from = 0;
    (function step(t) { var k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(from + (to - from) * e, c); if (k < 1 && el.isConnected) requestAnimationFrame(step); })(t0);
  }

  // ---------- navigatsiya ----------
  function hashId() { return location.hash.slice(1); }
  function curId() { var h = hashId(); if (h === "bosh") return "bosh"; return (typeof current !== "undefined" && current) ? current.id : h; }
  function goSec(id, sub) {
    closePop();
    if (id === "bosh") { if (hashId() !== "bosh") history.pushState(null, "", "#bosh"); showDash(); return; }
    hideDash(); history.pushState(null, "", "#" + id);
    if (sub && typeof crGo === "function") crGo(id, sub); else if (typeof render === "function") render(id);
    swap(); syncPills();
  }
  function swap() { var m = document.querySelector("main"); if (!m) return; m.classList.add("kb-swap"); void m.offsetWidth; m.classList.remove("kb-swap"); }

  // ---------- sarlavha ----------
  function buildHead() {
    if ($("kbHead")) return;
    var h = document.createElement("header"); h.id = "kbHead";
    var pills = '<a data-g="bosh">' + svg(I.home) + "Bosh sahifa</a>" + PILLS.map(function (id) { var s = SEC.filter(function (x) { return x.id === id; })[0]; return s ? '<a data-g="' + id + '">' + E(s.name) + (id === "sotuv" ? ' <b id="kbCnt" hidden></b>' : "") + "</a>" : ""; }).join("") + '<a data-g="@more" id="kbMore"><span>Yana</span>' + svg(I.chev) + "</a>";
    h.innerHTML = '<div class="in"><a class="brand" data-g="bosh" href="#bosh"><div class="lg">' + svg(I.wave) + '</div><span id="kbShop">' + E(ME.shop) + '</span></a><div class="pills"><div class="track" id="kbTrack"><i class="ind" id="kbInd"></i>' + pills + '</div></div><div class="side"><button class="kb-ib kb-mode" id="kbMode" title="Yorug\' / tun">' + svg(I.moon) + '</button><button class="kb-ib" id="kbBell" title="Bildirishnomalar">' + svg(I.bell) + '<i class="dot" id="kbDot" hidden></i></button><button class="kb-ib kb-av" id="kbAv" title="Profil">··</button></div></div>';
    document.body.insertBefore(h, document.body.firstChild);
    h.addEventListener("click", function (e) {
      var a = e.target.closest("[data-g]"); if (!a) return; e.preventDefault(); var g = a.getAttribute("data-g");
      if (g === "@more") return morePop(a); goSec(g);
    });
    $("kbMode").onclick = function (e) { flip(e); };
    $("kbBell").onclick = function () { bellPop(this); };
    $("kbAv").onclick = function () { avPop(this); };
    window.addEventListener("resize", function () { moveInd(true); });
  }
  function syncPills() {
    var id = curId(), inPills = id === "bosh" || PILLS.indexOf(id) >= 0, tr = $("kbTrack"); if (!tr) return;
    tr.querySelectorAll("a[data-g]").forEach(function (a) { var g = a.getAttribute("data-g"); a.classList.toggle("on", g === id || (g === "@more" && !inPills)); });
    var s = SEC.filter(function (x) { return x.id === id; })[0]; $("kbMore").querySelector("span").textContent = !inPills && s ? s.name : "Yana";
    moveInd();
  }
  function moveInd(now) {
    var tr = $("kbTrack"), a = tr && tr.querySelector("a.on"), ind = $("kbInd"); if (!a || !ind) return;
    if (now) ind.style.transition = "none";
    ind.style.width = a.offsetWidth + "px"; ind.style.transform = "translateX(" + (a.offsetLeft - 5 + 5) + "px)";
    if (now) { void ind.offsetWidth; ind.style.transition = ""; }
    if (a.offsetLeft < tr.scrollLeft || a.offsetLeft + a.offsetWidth > tr.scrollLeft + tr.clientWidth) tr.scrollTo({ left: a.offsetLeft - 20, behavior: "smooth" });
  }

  // ---------- chapdagi asboblar paneli ----------
  function buildDock() {
    if ($("kbDock")) return;
    var d = document.createElement("div"); d.id = "kbDock";
    d.innerHTML = '<button data-a="search" data-tip="Qidiruv (Ctrl+K)">' + svg(I.search) + '</button><button data-a="bosh" data-tip="Bosh sahifa">' + svg(I.home) + '</button><button data-a="vazifalar" data-tip="Vazifalar">' + svg(I.tasks) + '</button><button data-a="sozlamalar" data-tip="Sozlamalar">' + svg(I.gear) + '</button><div class="sep"></div><button data-a="app" data-tip="Tsunami ilovasi">' + svg(I.phone) + "</button>";
    document.body.appendChild(d);
    d.onclick = function (e) { var b = e.target.closest("[data-a]"); if (!b) return; var a = b.getAttribute("data-a"); if (a === "search") openSearch(); else if (a === "app") location.href = "../"; else goSec(a); };
  }
  function syncDock() { var d = $("kbDock"); if (!d) return; var id = curId(); d.querySelectorAll("[data-a]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-a") === id); }); }

  // ---------- ochiladigan oynalar ----------
  var POP = null;
  function closePop() { if (POP) { POP.remove(); POP = null; } }
  function pop(anchor, html, alignRight) {
    closePop(); var p = document.createElement("div"); p.className = "kb-pop"; p.innerHTML = html; document.body.appendChild(p);
    var r = anchor.getBoundingClientRect(), w = p.offsetWidth; p.style.top = (r.bottom + 10) + "px";
    p.style.left = Math.max(10, Math.min(innerWidth - w - 10, alignRight ? r.right - w : r.left + r.width / 2 - w / 2)) + "px";
    POP = p; setTimeout(function () { document.addEventListener("click", outside, true); }, 0); return p;
  }
  function outside(e) { if (POP && !POP.contains(e.target)) { closePop(); document.removeEventListener("click", outside, true); } }
  function morePop(a) {
    var rest = SEC.filter(function (s) { return PILLS.indexOf(s.id) < 0; });
    var p = pop(a, rest.map(function (s) { return '<a data-g="' + s.id + '">' + svg(ICO[s.id] || '<circle cx="12" cy="12" r="8"/>') + E(s.name) + "</a>"; }).join(""));
    p.onclick = function (e) { var x = e.target.closest("[data-g]"); if (x) { e.preventDefault(); goSec(x.getAttribute("data-g")); } };
  }
  function avPop(b) {
    var p = pop(b, '<div class="hd">' + E(ME.shop) + '</div><div class="nt"><span>' + E(ME.name || "—") + "</span><b>" + E(ME.role || "") + '</b></div><button class="it" data-x="app">' + svg(I.phone) + 'Tsunami ilovasi</button><button class="it" data-x="mode">' + svg(I.moon) + 'Yorug\' / tun</button><div class="hd">Til</div><button class="it notr" data-x="uz">' + (window.TSU_LANG !== "ru" ? "✓ " : "") + 'O\'zbekcha</button><button class="it notr" data-x="ru">' + (window.TSU_LANG === "ru" ? "✓ " : "") + 'Русский</button><button class="it" data-x="out">' + svg(I.out) + "Chiqish</button>", true);
    p.onclick = function (e) { var x = e.target.closest("[data-x]"); if (!x) return; var k = x.getAttribute("data-x"); closePop(); if (k === "uz" || k === "ru") { if (k !== (window.TSU_LANG || "uz") && window.tsuSetLang) tsuSetLang(k); return; } if (k === "app") location.href = "../"; else if (k === "mode") flip(e); else if (window.TSU) TSU.logout(); };
  }
  function bellPop(b) {
    var p = pop(b, '<div class="hd">Bildirishnomalar</div><div class="nt"><span>Yuklanmoqda…</span></div>', true);
    Promise.all([getDash("month").catch(function () { return null; }), window.TSU ? TSU.api({ fn: "get", what: "nasiya", arg: {} }).catch(function () { return null; }) : null]).then(function (r) {
      if (POP !== p) return; var d = r[0], n = r[1], rows = [];
      if (n && n.own) { var late = n.own.filter(function (x) { return x.lateN > 0 && !x.closed; }), ls = late.reduce(function (s, x) { return s + x.lateSum; }, 0); rows.push(["Kechikkan bo'lib to'lashlar", late.length ? late.length + " ta · " + fmt(ls, n.cur) + " " + cur(n.cur) : "yo'q"]); }
      if (n && n.debts) { var od = n.debts.filter(function (x) { return x.due && x.due < n.today; }); rows.push(["Muddati o'tgan qarzlar", od.length ? od.length + " ta" : "yo'q"]); }
      if (d) { rows.push(["Mijozlar qarzi", fmt(d.debit, d.cur) + " " + cur(d.cur)]); rows.push(["Yetkazib beruvchilarga qarz", fmt(d.credit, d.cur) + " " + cur(d.cur)]); }
      p.innerHTML = '<div class="hd">Bildirishnomalar</div>' + (rows.length ? rows.map(function (x) { return '<div class="nt"><span>' + E(x[0]) + "</span><b>" + E(x[1]) + "</b></div>"; }).join("") : '<div class="nt"><span>Ma\'lumot yo\'q</span></div>') + '<a data-g="crm">' + svg(I.arrow) + "Qarzdorlar ro'yxati</a>";
      p.onclick = function (e) { var x = e.target.closest("[data-g]"); if (x) { e.preventDefault(); goSec("crm", "Mijozlar"); } };
    });
  }

  // ---------- yorug'/tun: bosilgan nuqtadan aylana bo'lib ----------
  function flip(ev) {
    if (!window.TSU) return;
    var cur0 = H.getAttribute("data-th");
    if (!TSU.pair[cur0]) { closePop(); return toast("Bu tema uchun tun/yorug' varianti yo'q. Dizayn ilovadagi Sozlamalar → Dizayn bo'limida tanlanadi."); }
    var go = function () { TSU.toggleMode(); setModeIcon(); };
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches || !ev) return go();
    var x = ev.clientX || innerWidth - 60, y = ev.clientY || 30, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(go).ready.then(function () { H.animate({ clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + r + "px at " + x + "px " + y + "px)"] }, { duration: 650, easing: "cubic-bezier(.22,.8,.24,1)", pseudoElement: "::view-transition-new(root)" }); }, function () {});
  }
  function setModeIcon() { var b = $("kbMode"); if (b) b.innerHTML = svg(H.getAttribute("data-th") === "mono-tun" ? I.sun : I.moon); }
  function toast(t) { var d = document.createElement("div"); d.className = "kb-pop"; d.style.cssText = "left:50%;top:auto;bottom:100px;transform:translateX(-50%);max-width:420px;padding:14px 16px;font-size:14px"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3800); }

  // ---------- qidiruv (Ctrl+K) ----------
  function openSearch() {
    if ($("kbSearch")) return;
    var items = [{ s: "bosh", n: "Bosh sahifa", ic: I.home }];
    SEC.forEach(function (s) { items.push({ s: s.id, n: s.name, ic: ICO[s.id] }); (s.subs || []).forEach(function (u) { items.push({ s: s.id, u: u.n, n: u.n, p: s.name, ic: ICO[s.id] }); }); });
    var w = document.createElement("div"); w.id = "kbSearch";
    w.innerHTML = '<div class="bx"><div class="q">' + svg(I.search) + '<input id="kbQ" placeholder="Bo\'lim yoki sahifani qidiring…" autocomplete="off"><kbd>Esc</kbd></div><div class="ls" id="kbL"></div></div>';
    document.body.appendChild(w); var q = $("kbQ"), L = $("kbL"), sel = 0, res = [];
    var low = function (x) { return String(x).toLowerCase().replace(/[‘’ʻʼ`]/g, "'"); };
    var draw = function () {
      var t = low(q.value.trim()); res = items.filter(function (x) { return !t || low(x.n + " " + (x.p || "")).indexOf(t) >= 0; }).slice(0, 40); sel = Math.min(sel, Math.max(0, res.length - 1));
      L.innerHTML = res.length ? res.map(function (x, i) { return '<a data-i="' + i + '" class="' + (i === sel ? "sel" : "") + '">' + svg(x.ic || '<circle cx="12" cy="12" r="8"/>') + E(x.n) + (x.p ? "<span>" + E(x.p) + "</span>" : "") + "</a>"; }).join("") : '<div class="no">Topilmadi</div>';
    };
    var pick = function (i) { var x = res[i]; if (!x) return; close(); goSec(x.s, x.u); };
    var close = function () { w.remove(); };
    q.oninput = function () { sel = 0; draw(); };
    q.onkeydown = function (e) { if (e.key === "ArrowDown") { sel = Math.min(res.length - 1, sel + 1); draw(); e.preventDefault(); } else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); } else if (e.key === "Enter") pick(sel); else if (e.key === "Escape") close(); };
    L.onclick = function (e) { var a = e.target.closest("[data-i]"); if (a) pick(Number(a.getAttribute("data-i"))); };
    w.onclick = function (e) { if (e.target === w) close(); };
    draw(); q.focus();
  }
  document.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && on()) { e.preventDefault(); openSearch(); } });

  // ---------- sarlavha harflari bilan paydo bo'ladi ----------
  var tBusy = false;
  function animTitle() {
    var t = $("title"); if (!t || tBusy || !on()) return; var s = window.tsuT ? tsuT(t.textContent) : t.textContent; if (!s || t.querySelector("span")) return;
    tBusy = true; t.classList.add("kb-t"); t.innerHTML = s.split("").map(function (c, i) { return '<span style="animation-delay:' + (i * 0.022).toFixed(3) + 's">' + (c === " " ? "&nbsp;" : E(c)) + "</span>"; }).join(""); tBusy = false;
  }

  // ---------- jonli ko'rsatkich (bugungi sotuvlar) ----------
  function live() {
    getDash("day").then(function (d) {
      LIVE = d; var m = document.querySelector("main"); if (!m) return; var l = $("kbLive");
      if (!l) { l = document.createElement("div"); l.id = "kbLive"; m.insertBefore(l, m.firstChild); }
      l.innerHTML = "<i></i>Bugun " + d.cnt + " ta sotuv"; var c = $("kbCnt"); if (c) { c.textContent = d.cnt; c.hidden = !d.cnt; }
    }, function () {});
  }

  // ---------- bosh sahifa ----------
  function getDash(p) {
    var c = DASH[p]; if (c && Date.now() - c.t < 60000) return c.p;
    if (!window.TSU) return Promise.reject("API yo'q");
    var pr = TSU.api({ fn: "get", what: "dash", arg: { p: p } }); DASH[p] = { t: Date.now(), p: pr }; pr.then(null, function () { delete DASH[p]; }); return pr;
  }
  function showDash() {
    if (!on()) return; document.body.classList.add("kb-dash");
    var m = document.querySelector("main"), d = $("kbDash"); if (!m) return;
    if (!d) { d = document.createElement("section"); d.id = "kbDash"; m.appendChild(d); }
    syncPills(); syncDock(); swap(); drawDash();
  }
  function hideDash() { document.body.classList.remove("kb-dash"); }
  var PL = { day: "Bugun", week: "Hafta", month: "Oy" };
  function drawDash() {
    var d = $("kbDash"); if (!d) return;
    var mon = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"], now = new Date();
    var when = P === "day" ? now.getDate() + " " + mon[now.getMonth()] + ", bugun" : P === "week" ? "So'nggi 7 kun" : mon[now.getMonth()] + " " + now.getFullYear() + ", oy boshidan";
    d.innerHTML = '<h2 id="kbT" style="font-size:38px;font-weight:600;letter-spacing:-.035em;margin:14px 0 2px">Bosh sahifa</h2><div id="kbSub" style="color:var(--kb-mut);font-size:14px;margin-bottom:16px">' + E(ME.shop) + " — asosiy ko'rsatkichlar</div>"
      + '<div class="kbd-bar"><div class="kbd-seg" id="kbP">' + Object.keys(PL).map(function (k) { return '<button data-p="' + k + '" class="' + (k === P ? "on" : "") + '">' + PL[k] + "</button>"; }).join("") + '</div><div class="kbd-when">' + svg(I.clock) + E(when) + '</div><a class="kb-btn" data-go="hisobotlar">' + svg(I.chart) + 'To\'liq hisobot</a><button class="kb-btn dk" id="kbExp">' + svg(I.down) + "Eksport</button></div>"
      + '<div class="kbd-kpis">' + [0, 1, 2, 3].map(function () { return '<div class="kbd-sk" style="height:150px"></div>'; }).join("") + '</div><div class="kbd-row"><div class="kbd-sk" style="height:300px"></div><div class="kbd-sk" style="height:300px"></div></div>';
    var t = $("kbT"); t.innerHTML = (window.tsuT ? tsuT(t.textContent) : t.textContent).split("").map(function (c, i) { return '<span style="display:inline-block;animation:kbCh .55s cubic-bezier(.22,.8,.24,1) both ' + (i * 0.025).toFixed(3) + 's">' + (c === " " ? "&nbsp;" : c) + "</span>"; }).join("");
    $("kbP").onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b || b.getAttribute("data-p") === P) return; P = b.getAttribute("data-p"); drawDash(); };
    d.onclick = function (e) { var x = e.target.closest("[data-go]"); if (!x) return; e.preventDefault(); var g = x.getAttribute("data-go").split("|"); if (g[0] === "@app") location.href = "../"; else goSec(g[0], g[1]); };
    var ask = P;
    getDash(P).then(function (r) { if (ask === P && $("kbDash")) fillDash(r); }, function (e) {
      if (ask !== P) return; var k = d.querySelector(".kbd-kpis"); k.outerHTML = '<div class="kbd-err">Ko\'rsatkichlarni olib bo\'lmadi: ' + E(e && e.message || e) + "</div>"; var rw = d.querySelector(".kbd-row"); if (rw) rw.remove();
    });
  }
  function fillDash(r) {
    var d = $("kbDash"), c = r.cur, ser = r.series || [], mx = Math.max.apply(null, ser.concat([1])), margin = r.profit != null && r.sale > 0 ? Math.round(r.profit / r.sale * 100) : null;
    var retPct = r.sale > 0 ? Math.min(100, Math.round(r.ret / r.sale * 100)) : 0, last3 = ser.slice(-3), m3 = Math.max.apply(null, last3.concat([1]));
    var spark = (function () { var n = ser.length; if (n < 2) return ""; var W = 120, Hh = 40, pts = ser.map(function (v, i) { return [i * W / (n - 1), Hh - 4 - (v / mx) * (Hh - 8)]; }); var p = pts.map(function (q, i) { return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join(" "); return '<svg class="kbd-spark" width="' + W + '" height="' + Hh + '" viewBox="0 0 ' + W + " " + Hh + '"><path class="ar" d="' + p + " L" + W + " " + Hh + " L0 " + Hh + 'Z"/><path class="ln" d="' + p + '"/><circle cx="' + pts[n - 1][0] + '" cy="' + pts[n - 1][1] + '" r="3.5" fill="currentColor"/></svg>'; })();
    var ring = function (pct) { var R = 19, L = 2 * Math.PI * R; return '<svg class="kbd-ring" width="46" height="46" viewBox="0 0 50 50"><circle class="bg" cx="25" cy="25" r="' + R + '"/><circle class="fg" cx="25" cy="25" r="' + R + '" stroke-dasharray="' + L.toFixed(1) + '" stroke-dashoffset="' + L.toFixed(1) + '" data-to="' + (L * (1 - pct / 100)).toFixed(1) + '" transform="rotate(-90 25 25)"/><text x="25" y="28.5" text-anchor="middle">' + pct + "%</text></svg>"; };
    var cols = function (vals, hi) { var m = Math.max.apply(null, vals.concat([1])); return '<div class="kbd-cols">' + vals.map(function (v, i) { return '<i class="' + (i === hi ? "hi" : "") + '" style="height:' + Math.max(8, v / m * 44) + "px;animation-delay:" + (0.15 + i * 0.08) + 's"></i>'; }).join("") + "</div>"; };
    var K = '<div class="kbd-kpis">'
      + '<div class="kbd-k dk"><div class="lb">Savdo ' + svg(I.info) + '</div><div class="v"><span data-n="' + r.sale + '">0</span><small>' + cur(c) + '</small></div><div class="dl"><em>' + r.cnt + ' ta chek</em> o\'rtacha ' + short(r.avg, c) + '</div><div class="vis">' + cols(last3.length ? last3 : [0], last3.length - 1) + '</div><div class="ft" data-go="sotuv|Sotuvlar">Sotuvlarni ko\'rish <span>›</span></div></div>'
      + '<div class="kbd-k"><div class="lb">Yalpi foyda ' + svg(I.info) + '</div><div class="v">' + (r.profit == null ? "—" : '<span data-n="' + r.profit + '">0</span><small>' + cur(c) + "</small>") + '</div><div class="dl">' + (margin == null ? "Tannarxni ko'rishga ruxsat yo'q" : '<em class="' + (margin < 0 ? "dn" : "") + '">' + (margin < 0 ? "↓ " : "↑ ") + margin + "%</em> marja") + '</div><div class="vis">' + spark + '</div><div class="ft" data-go="hisobotlar">Hisobotlar <span>›</span></div></div>'
      + '<div class="kbd-k gy"><div class="lb">Qaytarishlar ' + svg(I.info) + '</div><div class="v"><span data-n="' + r.ret + '">0</span><small>' + cur(c) + '</small></div><div class="dl"><em class="' + (retPct > 5 ? "dn" : "") + '">' + retPct + "%</em> savdodan</div><div class=\"vis\">" + ring(retPct) + '</div><div class="ft" data-go="sotuv|Qaytarish">Qaytarishlar <span>›</span></div></div>'
      + '<div class="kbd-k gy"><div class="lb">Kassadagi pul ' + svg(I.info) + '</div><div class="v"><span data-n="' + r.cash + '">0</span><small>' + cur(c) + '</small></div><div class="dl"><em>+' + short(r.inn, c) + '</em><em class="dn">−' + short(r.out, c) + '</em></div><div class="vis">' + cols([r.inn, r.out, Math.max(0, r.inn - r.out)], 2) + '</div><div class="ft" data-go="moliya|Kassa">Kassa <span>›</span></div></div></div>';
    var gv = margin != null ? Math.max(0, Math.min(100, margin)) : (r.inn + r.out > 0 ? Math.round(r.inn / (r.inn + r.out) * 100) : 0), gl = margin != null ? "Foyda marjasi" : "Kirim ulushi";
    var gauge = (function () { var n = 34, s = "", cx = 150, cy = 150, R1 = 108, R2 = 128; for (var i = 0; i < n; i++) { var a = Math.PI + (i / (n - 1)) * Math.PI, onn = i / (n - 1) * 100 <= gv; s += '<line class="tk' + (onn ? " on" : "") + '" style="animation:kbFade .4s both ' + (0.3 + i * 0.025).toFixed(2) + 's" x1="' + (cx + R1 * Math.cos(a)).toFixed(1) + '" y1="' + (cy + R1 * Math.sin(a)).toFixed(1) + '" x2="' + (cx + R2 * Math.cos(a)).toFixed(1) + '" y2="' + (cy + R2 * Math.sin(a)).toFixed(1) + '"/>'; } return '<svg class="kbd-gauge" viewBox="0 0 300 165">' + s + '<text x="150" y="132" text-anchor="middle" font-size="54" font-weight="600" letter-spacing="-2" id="kbG">0</text><text x="150" y="158" text-anchor="middle" font-size="13" opacity=".6">' + gl + ", %</text></svg>"; })();
    var yl = [mx, mx * .66, mx * .33, 0].map(function (v) { return "<span>" + short(v, c) + "</span>"; }).join("");
    var step = Math.ceil(ser.length / 14), chart = '<div class="kbd-chart"><div class="yl">' + yl + "</div>" + [0, .33, .66].map(function (k) { return '<div class="gl" style="top:' + (k * (230 - 22)) + 'px"></div>'; }).join("") + ser.map(function (v, i) { return '<div class="kbd-bar2' + (i === ser.length - 1 || (P === "day" && v === mx && v > 0) ? " hi" : "") + '"><div class="tt">' + E(r.keys[i]) + " · " + fmt(v, c) + " " + cur(c) + '</div><i style="height:' + Math.max(3, v / mx * 190) + "px;animation-delay:" + (i * 0.03).toFixed(2) + 's"></i><span>' + (i % step === 0 ? E(r.keys[i]) : "&nbsp;") + "</span></div>"; }).join("") + "</div>";
    var tmax = Math.max.apply(null, (r.top || []).map(function (t) { return t.v; }).concat([1]));
    var top = (r.top || []).length ? r.top.map(function (t, i) { return '<div class="kbd-li"><div class="ix">' + (i + 1) + '</div><div class="n" title="' + E(t.n) + '">' + E(t.n) + '</div><div class="pb"><i style="width:' + Math.round(t.v / tmax * 100) + '%"></i></div><div class="r">' + short(t.v, c) + "</div></div>"; }).join("") : '<div style="color:var(--kb-mut);padding:14px 0">Bu davrda sotuv yo\'q</div>';
    var st = [["Mijozlar qarzi", r.debit], ["Yetkazib beruvchilarga qarz", r.credit], ["Ombordagi tovar (tannarx)", r.stock], ["Kirim / chiqim", null]].map(function (x) { return '<div class="kbd-st"><span>' + x[0] + "</span><b>" + (x[0] === "Kirim / chiqim" ? short(r.inn, c) + " / " + short(r.out, c) : x[1] == null ? "—" : fmt(x[1], c) + ' <small style="font-size:12px;opacity:.55">' + cur(c) + "</small>") + "</b></div>"; }).join("");
    var act = [["cart", "Sotuvlar", "sotuv|Sotuvlar"], ["box", "Tovar kirimi", "taminot|Tovar kirimi"], ["wallet", "Kassa", "moliya|Kassa"], ["user", "Mijozlar", "crm|Mijozlar"], ["tasks", "Vazifalar", "vazifalar"], ["phone", "Ilovada sotuv", "@app"]].map(function (x) { return '<button class="kb-btn" style="justify-content:flex-start" data-go="' + x[2] + '">' + svg(I[x[0]]) + x[1] + "</button>"; }).join("");
    d.querySelector(".kbd-kpis").outerHTML = K;
    var row = d.querySelector(".kbd-row"); row.innerHTML = '<div class="kbd-c dk"><h4>Samaradorlik <span>' + PL[P] + "</span></h4>" + gauge + '<div class="kbd-gl"><span>0%</span><span>100%</span></div></div><div class="kbd-c"><h4>Savdo dinamikasi <span>' + (P === "day" ? "soatlar bo'yicha" : "kunlar bo'yicha") + "</span></h4>" + chart + "</div>";
    var r2 = document.createElement("div"); r2.className = "kbd-row2"; r2.innerHTML = '<div class="kbd-c"><h4>Eng ko\'p sotilganlar <span>' + PL[P] + '</span></h4><div class="kbd-list">' + top + '</div></div><div class="kbd-c"><h4>Qarzlar va ombor</h4><div style="margin-top:6px">' + st + '</div></div><div class="kbd-c"><h4>Tezkor o\'tish</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">' + act + "</div></div>";
    row.after(r2);
    d.querySelectorAll("[data-n]").forEach(function (el, i) { setTimeout(function () { countUp(el, Number(el.getAttribute("data-n")), c, 1200); }, i * 70); });
    setTimeout(function () { d.querySelectorAll(".kbd-ring .fg").forEach(function (x) { x.style.strokeDashoffset = x.getAttribute("data-to"); }); var g = $("kbG"); if (g) { var t0 = performance.now(); (function s(t) { var k = Math.min(1, (t - t0) / 1300); g.textContent = Math.round(gv * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(s); })(t0); } }, 120);
    $("kbExp").onclick = function () { var rows = [["Davr", "Savdo"]].concat((r.keys || []).map(function (k, i) { return [k, ser[i]]; })), csv = "﻿" + rows.map(function (x) { return x.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(";"); }).join("\n"), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "tsunami-savdo-" + P + ".csv"; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500); };
  }

  // ---------- ishga tushirish ----------
  function init() {
    if (!on()) return;
    buildHead(); buildDock(); setModeIcon(); syncPills(); syncDock(); live();
    // shrift va uslublar yuklangach tabletka ko'rsatkichi qayta o'lchanadi
    [60, 300, 900, 2000].forEach(function (t) { setTimeout(function () { moveInd(true); }, t); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveInd(true); });
    var lk = document.querySelector('link[href^="korbel.css"]'); if (lk) lk.addEventListener("load", function () { moveInd(true); });
    if (!hashId() || hashId() === "bosh") { if (!hashId()) history.replaceState(null, "", "#bosh"); showDash(); }
  }
  var T = $("title"); if (T) new MutationObserver(function () { animTitle(); syncPills(); syncDock(); }).observe(T, { childList: true });
  window.addEventListener("hashchange", function () { if (!on()) return; if (hashId() === "bosh") showDash(); else { hideDash(); syncPills(); syncDock(); } });
  document.addEventListener("tsu:theme", function () { if (on()) { init(); setModeIcon(); } else hideDash(); });
  if (window.TSU) TSU.me.then(function (p) { if (!p) return; ME = p; var s = $("kbShop"); if (s) s.textContent = p.shop || "Tsunami"; var sb = $("kbSub"); if (sb) sb.textContent = (p.shop || "Tsunami") + " — asosiy ko'rsatkichlar"; var a = $("kbAv"); if (a) a.textContent = String(p.name || "?").split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); });
  init();
  setInterval(function () { if (on() && !document.hidden) { DASH.day = null; live(); } }, 120000);
})();
