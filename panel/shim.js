// Tsunami paneli: claude.ai ulanishi o'rniga Tsunami serveri (API) bilan ishlaydi. Server ko'chirilsa, faqat TSUNAMI_API o'zgaradi.
(function () {
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
  // bir vaqtda kelgan bir xil o'qish so'rovlari bitta so'rovga birlashtiriladi
  var inflight = {};
  function callTool(server, tool, args) {
    var a = { spreadsheetId: args.spreadsheetId, range: args.range, values: args.values };
    if (tool !== "get_values") { inflight = {}; return api({ fn: "sheet", what: tool, arg: a }); }
    var k = a.spreadsheetId + "|" + a.range; if (inflight[k]) return inflight[k];
    var p = api({ fn: "sheet", what: tool, arg: a }); inflight[k] = p; var clr = function () { if (inflight[k] === p) delete inflight[k]; }; p.then(clr, clr); return p;
  }
  function watchTool(server, tool, args, handler, opts) {
    var stop = false, run = function () { callTool(server, tool, args).then(function (r) { if (!stop) handler({ type: "data", result: r }); }, function (e) { if (!stop) handler({ type: "error", error: e, code: e && e.code }); }); };
    run(); var t = setInterval(run, Math.max(120000, (opts && opts.refetchInterval) || 300000));
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
  // ko'rinish: 6 ta rang varianti (tanlov brauzerda saqlanadi)
  var TH = [["botqoq", "#7fb56a"], ["oltin", "#d6a84e"], ["yashil", "#2f7d4f"], ["grafit", "#5b9dff"], ["oq", "#e4e4e8"], ["okean", "#2fc4b2"]];
  function setTh(t) { document.documentElement.setAttribute("data-th", t); try { localStorage.setItem("tsu_pth", t); } catch (e) {} var b = document.querySelectorAll("#tsuTh button"); for (var i = 0; i < b.length; i++) b[i].className = b[i].getAttribute("data-t") === t ? "on" : ""; }
  setTh(ls("tsu_pth") || window.__TSU_TH || "botqoq");
  document.addEventListener("DOMContentLoaded", function () {
    document.title = "Tsunami — boshqaruv paneli";
    var nav = document.querySelector("nav"); if (!nav) return;
    var a = document.createElement("a"); a.id = "tsuBack"; a.href = "../"; a.textContent = "← Tsunami ilovasiga qaytish"; nav.insertBefore(a, nav.firstChild);
    var d = document.createElement("div"); d.id = "tsuTh"; d.innerHTML = TH.map(function (x) { return '<button data-t="' + x[0] + '" title="' + x[0] + '" style="background:' + x[1] + '"></button>'; }).join(""); nav.appendChild(d);
    d.onclick = function (e) { var t = e.target.getAttribute("data-t"); if (t) setTh(t); }; setTh(document.documentElement.getAttribute("data-th"));
  });
})();
