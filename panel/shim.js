// Tsunami paneli: claude.ai ulanishi o'rniga Tsunami serveri (API) bilan ishlaydi. Server ko'chirilsa, faqat TSUNAMI_API o'zgaradi.
(function () {
  // temalar ro'yxati ilova bilan umumiy fayldan olinadi (../themes.js)
  if (!window.TSU_THEMES) document.write('<script src="' + (window.TSUNAMI_THEMES || "../themes.js") + '"><\/script>');
  var API = window.TSUNAMI_API || "https://script.google.com/macros/s/AKfycbzifst9f9g72g4Qp5D2N4CbW6unsSL1LtX33O1mdDbdEFmkpfLsuofVz20YoqKlInTCQg/exec";
  var ls = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var tok = ls("tsu_tok"), ten = ls("tsu_ten");
  if (!tok && !window.__TSU_TEST) { location.replace("../"); return; }
  var auth = { tok: tok }; if (ten) auth.ten = ten;
  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function api(body) {
    body.auth = auth;
    return fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body), redirect: "follow" })
      .then(function (r) { return r.json(); }, function () { throw err("network", "Aloqa uzildi"); })
      .then(function (x) {
        if (x && x.ok) return x.r;
        var m = String((x && x.e) || "Xatolik");
        if (/^AUTH/.test(m)) { try { localStorage.removeItem("tsu_tok"); } catch (e) {} location.replace("../"); throw err("needs_reauth", m); }
        throw err(/ruxsat/i.test(m) ? "blocked_by_policy" : "tool_error", m);
      });
  }
  // ---- tezlik: (1) bir vaqtda kelgan o'qishlar bitta so'rovga yig'iladi; (2) o'qilgan jadval 45 soniya xotirada turadi; (3) doimiy kuzatiladigan jadvallar oxirgi holati bilan darhol ko'rsatiladi
  // ---- Bito jadvali faqat «Integratsiya» bo'limida, foydalanuvchi o'zi so'raganda o'qiladi
  var BITO = "1fgsNMTOyX4_kyxFXcMT4YUSFH6SfZmh4HRS7u-ej-tE", TTL = 45000, cache = {}, queue = [], qt = null, EMPTY = { payload: { values: [] } };
  function inInteg() { var a = document.querySelector("nav a.active"); return !!a && /integratsiya/i.test(a.textContent); }
  function sheetOf(r) { return String(r).split("!")[0].replace(/^'|'$/g, ""); }
  function flush() {
    var q = queue; queue = []; qt = null; if (!q.length) return;
    if (q.length === 1) return api({ fn: "sheet", what: "get_values", arg: q[0].a }).then(q[0].ok, q[0].no);
    api({ fn: "sheet", what: "batch_get", arg: { ranges: q.map(function (x) { return x.a; }) } }).then(function (r) {
      var L = (r.payload && r.payload.list) || []; q.forEach(function (x, i) { var o = L[i] || {}; if (o.error) x.no(err("tool_error", o.error)); else x.ok({ payload: { range: x.a.range, values: o.values || [] } }); });
    }, function (e) { q.forEach(function (x) { x.no(e); }); });
  }
  function read(a, fresh) {
    if (a.spreadsheetId === BITO && !inInteg()) return Promise.resolve(EMPTY);
    var k = (a.spreadsheetId === BITO ? "B|" : "") + a.range, c = cache[k];
    if (!fresh && c && Date.now() - c.t < TTL) return c.p;
    var p = new Promise(function (ok, no) { queue.push({ a: { spreadsheetId: a.spreadsheetId, range: a.range }, ok: ok, no: no }); if (!qt) qt = setTimeout(flush, 25); });
    cache[k] = { t: Date.now(), p: p }; p.then(null, function () { if (cache[k] && cache[k].p === p) delete cache[k]; });
    return p;
  }
  function callTool(server, tool, args) {
    if (tool === "get_values") return read(args);
    var sn = sheetOf(args.range); Object.keys(cache).forEach(function (k) { if (sheetOf(k.replace(/^B\|/, "")) === sn) delete cache[k]; });
    return api({ fn: "sheet", what: tool, arg: { spreadsheetId: args.spreadsheetId, range: args.range, values: args.values } });
  }
  function watchTool(server, tool, args, handler, opts) {
    var stop = false, lk = "tsu_w|" + (ten || "") + "|" + args.range, bito = args.spreadsheetId === BITO, last = null;
    var give = function (r, save) { if (stop) return; var j = JSON.stringify(r.payload.values || []); if (j === last) return; last = j; handler({ type: "data", result: r }); if (save && !bito) { try { if (j.length < 900000) localStorage.setItem(lk, j); } catch (e) {} } };
    if (!bito) { try { var old = localStorage.getItem(lk); if (old) { last = old; handler({ type: "data", result: { payload: { values: JSON.parse(old) } } }); } } catch (e) {} }
    var run = function (fresh) { if (bito && !inInteg()) { if (last === null) give(EMPTY); return; } read(args, fresh).then(function (r) { give(r, true); }, function (e) { if (!stop && last === null) handler({ type: "error", error: e, code: e && e.code }); }); };
    run(false); var t = setInterval(function () { if (!document.hidden) run(true); }, Math.max(120000, (opts && opts.refetchInterval) || 300000));
    return function () { stop = true; clearInterval(t); };
  }
  // Vazifalar: «Vazifalar» varag'ida saqlanadi (ID, JSON, o'chirilgan)
  var TK = { rows: [], subs: [] }, TR = "Vazifalar!A1:C5000";
  function tkLoad() {
    return callTool("", "get_values", { range: TR }).then(function (r) {
      TK.rows = []; ((r.payload && r.payload.values) || []).forEach(function (v, i) { if (String(v[1] || "")[0] !== "{" || v[2]) return; try { TK.rows.push({ id: String(v[0]), row: i + 1, data: JSON.parse(v[1]) }); } catch (e) {} });
      TK.rows.sort(function (x, y) { return String(y.data.createdAt || "").localeCompare(String(x.data.createdAt || "")); });
      var snap = { metadata: { fromCache: false }, docs: TK.rows.map(function (t) { return { id: t.id, data: function () { return t.data; } }; }) }; TK.subs.forEach(function (f) { try { f(snap); } catch (e) {} });
    });
  }
  function tkRow(id) { return tkLoad().then(function () { var t = TK.rows.filter(function (x) { return x.id === id; })[0]; if (!t) throw err("tool_error", "Vazifa topilmadi"); return t; }); }
  var col = { orderBy: function () { return col; },
    onSnapshot: function (f, bad) { TK.subs.push(f); tkLoad().then(null, function (e) { if (bad) bad(e); }); var t = setInterval(function () { tkLoad().then(null, function () {}); }, 90000); return function () { clearInterval(t); TK.subs = TK.subs.filter(function (x) { return x !== f; }); }; },
    add: function (d) { var id = "V" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); return callTool("", "append_values", { range: "Vazifalar!A1", values: [[id, JSON.stringify(d), ""]] }).then(tkLoad).then(function () { return { id: id }; }); },
    doc: function (id) { return {
      update: function (u) { return tkRow(id).then(function (t) { var d = {}, k; for (k in t.data) d[k] = t.data[k]; for (k in u) d[k] = u[k]; return callTool("", "update_values", { range: "Vazifalar!B" + t.row, values: [[JSON.stringify(d)]] }); }).then(tkLoad); },
      "delete": function () { return tkRow(id).then(function (t) { return callTool("", "update_values", { range: "Vazifalar!C" + t.row, values: [["x"]] }); }).then(tkLoad); } }; } };
  var db = { collection: function () { return col; } };
  var me = api({ fn: "get", what: "profile", arg: {} }).then(null, function () { return null; });
  window.claude = { use: function (kind) {
    if (kind === "mcp") return Promise.resolve({ callTool: callTool, watchTool: watchTool });
    if (kind === "user") return me.then(function (p) { return { canEdit: function () { return true; }, can: function () { return true; }, id: function () { return p ? p.phone : ""; }, name: function () { return p ? p.name : ""; } }; });
    if (kind === "downloads") return Promise.resolve({ save: function (o) { var b = o.data instanceof Blob ? o.data : new Blob([o.data]), u = URL.createObjectURL(b), l = document.createElement("a"); l.href = u; l.download = o.filename || "fayl"; document.body.appendChild(l); l.click(); setTimeout(function () { URL.revokeObjectURL(u); l.remove(); }, 2000); return Promise.resolve(); } });
    if (kind === "db") return Promise.resolve(db);
    return Promise.resolve(null);
  } };
  // modullar o'zi qo'shadigan uslublardagi ranglar ham tanlangan ko'rinishga moslanadi
  var BGM = {"#fff": "--card", "#ffffff": "--card", "#f5f6f8": "--bg", "#f3f4f6": "--soft", "#f9fafb": "--soft", "#fafafa": "--soft", "#f8fafc": "--soft", "#e5e7eb": "--line", "#d1d5db": "--line2", "#111827": "--nav", "#1f2937": "--navsoft", "#374151": "--navsoft", "#2563eb": "--accent", "#1e40af": "--accent", "#dbeafe": "--accsoft", "#dcfce7": "--oksoft", "#f0fdf4": "--oksoft", "#fef3c7": "--warnsoft", "#fffbeb": "--warnsoft", "#fee2e2": "--badsoft", "#fef2f2": "--badsoft", "#16a34a": "--ok", "#dc2626": "--bad", "#f59e0b": "--warn", "#9ca3af": "--muted", "#6b7280": "--muted", "#f1f5f9": "--soft", "#eef2ff": "--accsoft", "#3b82f6": "--accent", "#1d4ed8": "--accent", "#0f172a": "--ink", "#86efac": "--ok", "#fde68a": "--warn"}, FGM = {"#fff": "--onacc", "#ffffff": "--onacc", "#e5e7eb": "--navink", "#d1d5db": "--navink", "#9ca3af": "--muted", "#6b7280": "--muted", "#64748b": "--muted", "#94a3b8": "--muted", "#475569": "--muted", "#111827": "--ink", "#1f2937": "--ink", "#374151": "--ink", "#1d2129": "--ink", "#111": "--ink", "#0f172a": "--ink", "#2563eb": "--accent", "#1e40af": "--accink", "#166534": "--okink", "#15803d": "--okink", "#16a34a": "--okink", "#92400e": "--warnink", "#b45309": "--warnink", "#991b1b": "--badink", "#b91c1c": "--badink", "#dc2626": "--badink", "#f59e0b": "--warnink"};
  function remap(css) { return css.replace(/([a-zA-Z-]+)\s*:\s*([^;{}]+)/g, function (m, prop, val) { if (val.indexOf("#") < 0 || prop.indexOf("--") === 0) return m; var M = /^(color|fill|stroke)$/i.test(prop) ? FGM : BGM; return prop + ":" + val.replace(/#[0-9a-fA-F]{3,6}\b/g, function (h) { var v = M[h.toLowerCase()]; return v ? "var(" + v + ")" : h; }); }); }
  function fixStyles() { var st = document.querySelectorAll("style:not([data-tsu])"); for (var i = 0; i < st.length; i++) { var s = st[i]; s.setAttribute("data-tsu", "1"); var t = s.textContent, r = remap(t).replace(/:root\s*\{[^}]*\}/g, ""); if (r !== t) s.textContent = r; } }
  function fixInline(root) { var el = root.querySelectorAll ? root.querySelectorAll('[style*="#"]') : []; for (var i = 0; i < el.length; i++) { var a = el[i].getAttribute("style"), r = remap(a); if (r !== a) el[i].setAttribute("style", r); } }
  new MutationObserver(function (ms) { var st = false; for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) { var n = ms[i].addedNodes[j]; if (n.nodeType !== 1) continue; if (n.tagName === "STYLE") st = true; else { if (n.getAttribute && (n.getAttribute("style") || "").indexOf("#") >= 0) { var a = n.getAttribute("style"), r = remap(a); if (r !== a) n.setAttribute("style", r); } fixInline(n); } } if (st) fixStyles(); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", function () { fixStyles(); fixInline(document); });
  // ko'rinish: do'kon tanlagan tema (Sozlamalar → Dizayn). Avval oxirgi eslab qolingani, keyin serverdagisi qo'llanadi.
  // Bir dizaynning yorug' va tun variantlari: foydalanuvchi o'zi almashtiradi (o'z brauzerida), do'kon temasi o'zgarmaydi
  var PAIR = { "mono": "mono-tun", "mono-tun": "mono" }, shopTh = ls("tsu_shopth") || ls("tsu_theme") || "botqoq";
  function pick(t) { var m = ls("tsu_mode"); if (PAIR[t] && m) { var dark = t === "mono-tun"; if ((m === "dark") !== dark) return PAIR[t]; } return t; }
  function setTh(t) { if (!window.tsuTheme) return; var id = window.tsuTheme(pick(t), document.documentElement).id; try { localStorage.setItem("tsu_theme", id); } catch (e) {} document.dispatchEvent(new CustomEvent("tsu:theme", { detail: id })); }
  me.then(function (p) { if (!p) return; shopTh = p.theme || "botqoq"; try { localStorage.setItem("tsu_shopth", shopTh); } catch (e) {} if (pick(shopTh) !== document.documentElement.getAttribute("data-th")) setTh(shopTh); });
  window.TSU = { api: api, me: me, setTh: setTh, pair: PAIR,
    toggleMode: function () { var cur = document.documentElement.getAttribute("data-th"); if (!PAIR[cur]) return; var nx = PAIR[cur]; try { localStorage.setItem("tsu_mode", nx === "mono-tun" ? "dark" : "light"); } catch (e) {} setTh(shopTh); },
    logout: function () { api({ fn: "logout" }).then(null, function () {}); ["tsu_tok", "tsu_ten", "tsu_d"].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} }); location.replace("../"); } };
  document.addEventListener("DOMContentLoaded", function () {
    setTh(shopTh);
    document.title = "Tsunami — boshqaruv paneli";
    var nav = document.querySelector("nav");
    if (nav) { var a = document.createElement("a"); a.id = "tsuBack"; a.href = "../"; a.textContent = "← Tsunami ilovasiga qaytish"; nav.insertBefore(a, nav.firstChild); }
    // «Corbel» (1-video) dizayni: sarlavha, suzuvchi asboblar paneli, bosh sahifa
    var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "korbel.css?v=1"; document.head.appendChild(l);
    var s = document.createElement("script"); s.src = "korbel.js?v=1"; document.body.appendChild(s);
  });
})();
