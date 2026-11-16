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
  // ko'rinish: Tsunami yashil uslubi + ilovaga qaytish tugmasi
  document.addEventListener("DOMContentLoaded", function () {
    var st = document.createElement("style");
    st.textContent = ":root{--accent:#2f7d4f !important}nav{background:#07140d !important}#tsuBack{display:block;margin:10px 14px 4px;padding:9px 12px;border-radius:10px;background:#12301f;color:#b4d99a;text-decoration:none;font-weight:600;font-size:13.5px}#tsuBack:hover{background:#18402a}";
    document.head.appendChild(st); document.title = "Tsunami — boshqaruv paneli";
    var nav = document.querySelector("nav"); if (nav) { var a = document.createElement("a"); a.id = "tsuBack"; a.href = "../"; a.textContent = "← Tsunami ilovasiga qaytish"; nav.insertBefore(a, nav.firstChild); }
  });
})();
