// ===== Tsunami: Ombor → Markirovkali qoldiq, Soni bo'yicha qoldiq, Inventarizatsiya, Spisaniyalar, Ichki/Tashkiliy ko'chirish, Skladlar =====
// Qoldiq hisoblagichi: kirimlar + mijoz qaytarishlari − sotuvlar − yetkazib beruvchiga qaytarish ± ombor harakatlari (FIFO tannarx bilan).
const OM = { mcp:null };
const omToday = () => new Date().toLocaleDateString("en-CA");
const omK = s => String(s || "").trim().toLowerCase();
const omR2 = n => Math.round((Number(n) || 0) * 100) / 100;
function omId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function omJson(v, d) { try { const x = JSON.parse(v || ""); return x == null ? d : x; } catch (e) { return d; } }
function omMsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function omSay(o, render, m) { o.msg = m; clearTimeout(o.msgT); o.msgT = setTimeout(() => { o.msg = ""; render(); }, 7000); render(); }
function omLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
function omPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
function omMoneyMap(m) { const p = Object.entries(m).filter(([, v]) => Math.abs(v) > 0.005); return p.length ? p.map(([c, v]) => krMoney(v, c)).join(" + ") : "—"; }
function omMarked(name) { const n = omK(name), t = TV.list.find(x => omK(x.name) === n); if (t) return t.marked; const p = KR.products.find(x => omK(x.name) === n); return !!(p && p.marked); }
function omCat(name) { const n = omK(name), t = TV.list.find(x => omK(x.name) === n); return t ? ((t.catId && typeof ktPath === "function" && ktPath(t.catId)) || t.cat || "") : ""; }
const OM_BRAK = "Brak";
(function omCss() {
  const st = document.createElement("style");
  st.textContent = "#omMkApp,#omQtApp,#omInvApp,#omMvApp,#omSkApp,#omsApp{display:none}.omMkApp-on #omMkApp,.omQtApp-on #omQtApp,.omInvApp-on #omInvApp,.omMvApp-on #omMvApp,.omSkApp-on #omSkApp,.omsApp-on #omsApp{display:block}"
    + ".omMkApp-on .gen,.omMkApp-on #kpis,.omQtApp-on .gen,.omQtApp-on #kpis,.omInvApp-on .gen,.omInvApp-on #kpis,.omMvApp-on .gen,.omMvApp-on #kpis,.omSkApp-on .gen,.omSkApp-on #kpis,.omsApp-on .gen,.omsApp-on #kpis{display:none}"
    + ".omtot{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}.omtot div{border:1px solid var(--line);border-radius:10px;padding:8px 12px}.omtot .l{font-size:12px;color:#6b7280}.omtot .v{font-weight:700}"
    + ".omfil{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0 10px}.omfil select,.omfil input{font:inherit;font-size:13px;padding:6px 10px;border:1px solid var(--line);border-radius:8px;background:#fff}"
    + ".ombrak td{background:#fef2f2}.omimeis{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;margin-top:4px}.omimeis label{display:inline-flex;gap:4px;align-items:center;font-family:monospace}.omneg{color:#b91c1c}";
  document.head.appendChild(st);
})();

// ======================= Ombor harakatlari (ma'lumot) =======================
const OMV_RANGE = "'Ombor harakatlari'!A1:L5000";
const OMV = { list:[], state:"loading", busy:false, msg:"", msgT:null };
const OM_TYPES = { spis:"Spisaniya", ichki:"Ichki ko'chirish", tash:"Tashkiliy ko'chirish", inv:"Inventarizatsiya" };
function omvParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const type = Object.keys(OM_TYPES).find(k => OM_TYPES[k] === String(r[2] || "")) || "spis";
    const from = String(r[5] || "").split("|"), to = String(r[6] || "").split("|");
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, type, cancelled:String(r[3] || "") === "Bekor qilingan", date:String(r[4] || ""), forg:from[0] || "", fwh:from[1] || "", torg:to[0] || "", twh:to[1] || "", items:omJson(r[7], []), reason:String(r[8] || ""), note:String(r[9] || ""), createdAt:String(r[10] || ""), cancelledAt:String(r[11] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function omvApply(vals) { OMV.list = omvParse(vals); OMV.state = "ok"; OMC.v++; omRenderAll(); }
async function omvReload() { const r = await OM.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:OMV_RANGE }, { cache:false }); omvApply(krVals({ result:r })); }

// ======================= QOLDIQ HISOBLAGICHI =======================
const OMC = { v:0, key:"", res:null };
function omLedger() {
  const key = [OMC.v, KR.list.length, SL.list.length, (typeof QT !== "undefined" ? QT.list.length : 0), (typeof YQ !== "undefined" ? YQ.list.length : 0), KR.list.map(k => k.state).join(""), SL.list.map(s => s.cancelled ? 1 : 0).join(""), (typeof YQ !== "undefined" ? YQ.list.map(r => r.cancelled ? 1 : 0).join("") : ""), (typeof QT !== "undefined" ? QT.list.map(r => r.cancelled ? 1 : 0).join("") : "")].join("/");
  if (OMC.key === key && OMC.res) return OMC.res;
  const units = {}, lots = [], neg = {}, ev = [];
  // Hisobotlar uchun: har bir sotuv / qaytarish / harakat qatorining FIFO tannarxi (valyuta bo'yicha)
  const scost = {}, rcost = {}, mcost = {};
  const addC = (o, cur, v) => { if (!v) return; cur = cur === "UZS" ? "UZS" : "USD"; o[cur] = (o[cur] || 0) + v; };
  const partsC = (o, parts) => { let q = 0; parts.forEach(p => { addC(o, p.cur, (Number(p.cost) || 0) * p.qty); q += p.qty; }); return q; };
  const firstWh = () => { const o = Object.keys(KR.orgs)[0] || ""; return [o, (KR.orgs[o] || [])[0] || ""]; };
  KR.list.filter(k => k.state === "done").forEach(k => ev.push({ ts:k.receivedAt || k.createdAt || k.date, t:"kirim", k }));
  SL.list.filter(s => !s.cancelled).forEach(s => ev.push({ ts:s.createdAt || s.date, t:"sale", s }));
  (typeof QT !== "undefined" ? QT.list : []).filter(r => !r.cancelled).forEach(r => ev.push({ ts:r.createdAt || r.date, t:"ret", r }));
  (typeof YQ !== "undefined" ? YQ.list : []).filter(r => !r.cancelled).forEach(r => ev.push({ ts:r.createdAt || r.date, t:"sret", r }));
  OMV.list.filter(m => !m.cancelled).forEach(m => ev.push({ ts:m.createdAt || m.date, t:"mv", m }));
  ev.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  const take = (name, qty, org, wh, kirimNo) => {
    const n = omK(name); let left = qty; const parts = [];
    lots.filter(l => l.qty > 0 && omK(l.name) === n && (!wh || (l.org === org && l.wh === wh)) && (!kirimNo || l.kirim === kirimNo)).sort((a, b) => String(a.kdate).localeCompare(String(b.kdate)))
      .forEach(l => { if (left <= 0) return; const q = Math.min(l.qty, left); l.qty -= q; left -= q; parts.push(Object.assign({}, l, { qty:q })); });
    if (left > 0) neg[name] = (neg[name] || 0) + left;
    return parts;
  };
  const lastCost = name => { const n = omK(name), l = lots.filter(x => omK(x.name) === n).pop(); if (l) return [l.cost, l.cur]; const u = Object.values(units).filter(x => omK(x.name) === n).pop(); return u ? [u.cost, u.cur] : [0, "USD"]; };
  const lastLoc = name => { const n = omK(name), l = lots.filter(x => omK(x.name) === n && x.wh !== OM_BRAK).pop(); return l ? [l.org, l.wh] : firstWh(); };
  ev.forEach(e => {
    if (e.t === "kirim") {
      const k = e.k;
      (k.items || []).forEach(it => {
        const base = { name:it.name, cost:Number(it.price) || 0, cur:k.currency, org:k.org, wh:k.warehouse, kirim:k.number, kdate:String(k.date || "").slice(0, 10), sup:k.supplier };
        const im = Array.isArray(it.imeis) ? it.imeis : (typeof krImeis === "function" ? krImeis(it.imei) : []);
        if (im.length) im.forEach(m => { units[m] = Object.assign({ imei:m, st:"in" }, base); });
        else lots.push(Object.assign({ qty:Number(it.qty) || 0, id:k.id + ":" + it.name }, base));
      });
    } else if (e.t === "sale") {
      const sc = scost[e.s.id] = [];
      e.s.items.forEach((it, i) => {
        const c = sc[i] = {};
        if (it.imeis && it.imeis.length) it.imeis.forEach(m => { if (units[m]) { units[m].st = "out"; addC(c, units[m].cur, Number(units[m].cost) || 0); } else { neg[it.name] = (neg[it.name] || 0) + 1; const lc = lastCost(it.name); addC(c, lc[1], lc[0]); } });
        else { const q = Number(it.qty) || 0, got = partsC(c, take(it.name, q)); if (got < q) { const lc = lastCost(it.name); addC(c, lc[1], lc[0] * (q - got)); } }
      });
    } else if (e.t === "ret") {
      const rc = rcost[e.r.id] = [];
      e.r.items.forEach((it, i) => {
        const brak = it.dest === "brak", cc = rc[i] = {};
        if (it.imeis && it.imeis.length) it.imeis.forEach(m => { if (units[m]) { units[m].st = brak ? "brak" : "in"; addC(cc, units[m].cur, Number(units[m].cost) || 0); } });
        else { const [c, cur] = lastCost(it.name), [o, w] = lastLoc(it.name); addC(cc, cur, c * (Number(it.qty) || 0)); lots.push({ name:it.name, qty:Number(it.qty) || 0, cost:c, cur, org:o, wh:brak ? OM_BRAK : w, kirim:0, kdate:String(e.r.date).slice(0, 10), sup:"(mijoz qaytardi)", id:"r:" + e.r.id + ":" + it.name }); }
      });
    } else if (e.t === "sret") {
      e.r.items.forEach(it => { if (it.imeis && it.imeis.length) it.imeis.forEach(m => { if (units[m]) units[m].st = "out"; }); else take(it.name, Number(it.qty) || 0, "", "", it.kirim); });
    } else if (e.t === "mv") {
      const m = e.m, mc = mcost[m.id] = { loss:{}, gain:{} };
      m.items.forEach(it => {
        const im = it.imeis || [];
        if (m.type === "spis") { im.forEach(x => { if (units[x]) { units[x].st = "out"; addC(mc.loss, units[x].cur, Number(units[x].cost) || 0); } }); if (!im.length && it.qty) partsC(mc.loss, take(it.name, Number(it.qty), m.forg, m.fwh)); }
        else if (m.type === "ichki" || m.type === "tash") {
          im.forEach(x => { if (units[x]) { units[x].org = m.torg; units[x].wh = m.twh; } });
          if (!im.length && it.qty) take(it.name, Number(it.qty), m.forg, m.fwh).forEach(p => lots.push(Object.assign(p, { org:m.torg, wh:m.twh, id:p.id + ">" + m.id })));
        } else if (m.type === "inv") {
          (it.missing || []).forEach(x => { if (units[x]) { units[x].st = "out"; addC(mc.loss, units[x].cur, Number(units[x].cost) || 0); } });
          (it.extra || []).forEach(x => { units[x] = { imei:x, st:"in", name:it.name, cost:Number(it.cost) || lastCost(it.name)[0], cur:it.cur || lastCost(it.name)[1], org:m.forg, wh:m.fwh, kirim:0, kdate:String(m.date).slice(0, 10), sup:"(inventarizatsiya)" }; addC(mc.gain, units[x].cur, Number(units[x].cost) || 0); });
          const d = Number(it.diff) || 0;
          if (d < 0) partsC(mc.loss, take(it.name, -d, m.forg, m.fwh));
          if (d > 0) { const lc = lastCost(it.name); addC(mc.gain, it.cur || lc[1], (it.cost !== undefined && it.cost !== "" ? Number(it.cost) : lc[0]) * d); lots.push({ name:it.name, qty:d, cost:it.cost !== undefined && it.cost !== "" ? Number(it.cost) : lc[0], cur:it.cur || lc[1], org:m.forg, wh:m.fwh, kirim:0, kdate:String(m.date).slice(0, 10), sup:"(inventarizatsiya)", id:"i:" + m.id + ":" + it.name }); }
        }
      });
    }
  });
  OMC.key = key;
  OMC.res = { units:Object.values(units).filter(u => u.st === "in" || u.st === "brak"), lots:lots.filter(l => l.qty > 0), neg, scost, rcost, mcost };
  return OMC.res;
}
// Ombordagi (sotish mumkin bo'lgan) qatorlar — yorliq, kutilayotgan tovarlar, qaytarish uchun yagona manba
ylSrcRows = function () {
  const L = omLedger();
  return L.units.filter(u => u.st === "in" && u.wh !== OM_BRAK).map(u => ({ key:"u:" + u.imei, name:u.name, imei:u.imei, cost:u.cost, cur:u.cur, date:u.kdate, kirim:u.kirim, org:u.org, wh:u.wh }))
    .concat(L.lots.filter(l => l.wh !== OM_BRAK).map(l => ({ key:l.id, name:l.name, imei:"", qty:l.qty, cost:l.cost, cur:l.cur, date:l.kdate, kirim:l.kirim, org:l.org, wh:l.wh })));
};
// Bir ombordagi qoldiq: nom → { qty, imeis[] }
function omAt(org, wh) {
  const L = omLedger(), m = {};
  L.units.filter(u => u.st === "in" && u.org === org && u.wh === wh).forEach(u => { const o = m[omK(u.name)] || (m[omK(u.name)] = { name:u.name, qty:0, imeis:[], cost:{} }); o.qty++; o.imeis.push(u.imei); o.cost[u.cur] = (o.cost[u.cur] || 0) + u.cost; });
  L.lots.filter(l => l.org === org && l.wh === wh).forEach(l => { const o = m[omK(l.name)] || (m[omK(l.name)] = { name:l.name, qty:0, imeis:[], cost:{} }); o.qty += l.qty; o.cost[l.cur] = (o.cost[l.cur] || 0) + l.cost * l.qty; });
  return m;
}
function omOrgOpts(sel) { return Object.keys(KR.orgs).sort().map(o => `<option${o === sel ? " selected" : ""}>${esc(o)}</option>`).join(""); }
function omWhOpts(org, sel, all) { return (all ? `<option value="">Barcha omborlar</option>` : "") + (KR.orgs[org] || []).slice().sort().map(w => `<option${w === sel ? " selected" : ""}>${esc(w)}</option>`).join(""); }
function omFilterOpts(orgSel, whSel) {
  const o = $(orgSel), w = $(whSel), ov = o.value, wv = w.value;
  o.innerHTML = `<option value="">Barcha tashkilotlar</option>` + omOrgOpts(ov);
  const whs = ov ? (KR.orgs[ov] || []) : [...new Set(Object.values(KR.orgs).flat())];
  w.innerHTML = `<option value="">Barcha omborlar</option>` + whs.slice().sort().map(x => `<option${x === wv ? " selected" : ""}>${esc(x)}</option>`).join("") + `<option value="${OM_BRAK}"${wv === OM_BRAK ? " selected" : ""}>Brak (qaytgan)</option>`;
}

// ======================= MARKIROVKALI QOLDIQ =======================
const MKQ = { q:"" };
omPanel("omMkApp", `<div class="panel"><div class="thead"><h3>Markirovkali qoldiq (IMEI bo'yicha)</h3></div>
  <div class="tmeta">Har bir IMEI alohida: qaysi omborda, qachon va kimdan kelgan, tannarxi. Brak bo'lib qaytganlar alohida belgilanadi.</div>
  <div class="omfil"><select id="mkqOrg"></select><select id="mkqWh"></select><input id="mkqQ" placeholder="Qidirish: tovar, IMEI, yetkazib beruvchi" style="min-width:260px"></div>
  <div class="omtot" id="mkqTot"></div><div class="status" id="mkqStatus"></div><div id="mkqList"></div></div>`);
function mkqRender() {
  if (!$("mkqList")) return;
  omFilterOpts("mkqOrg", "mkqWh");
  const org = $("mkqOrg").value, wh = $("mkqWh").value, q = omK(MKQ.q), today = new Date();
  const all = omLedger().units.map(u => Object.assign({}, u, { brak:u.st === "brak" || u.wh === OM_BRAK }));
  const list = all.filter(u => (!org || u.org === org) && (!wh || (wh === OM_BRAK ? u.brak : (u.wh === wh && !u.brak))) && (wh === OM_BRAK || !u.brak || !wh) && (!q || [u.name, u.imei, u.sup].some(x => omK(x).indexOf(q) >= 0)))
    .sort((a, b) => a.name.localeCompare(b.name) || String(a.kdate).localeCompare(String(b.kdate)));
  const cost = {}, good = list.filter(u => !u.brak); good.forEach(u => { cost[u.cur] = (cost[u.cur] || 0) + u.cost; });
  const models = new Set(good.map(u => omK(u.name))).size, brakN = list.length - good.length;
  $("mkqTot").innerHTML = `<div><div class="l">IMEI soni</div><div class="v">${good.length}</div></div><div><div class="l">Modellar</div><div class="v">${models}</div></div><div><div class="l">Jami tannarx</div><div class="v">${omMoneyMap(cost)}</div></div>${brakN ? `<div><div class="l">Brak</div><div class="v omneg">${brakN}</div></div>` : ""}`;
  $("mkqStatus").textContent = [omLine(KR, "Qoldiq"), SL.state !== "ok" ? omLine(SL, "Sotuvlar") : ""].filter(Boolean).join(" · ");
  if (!list.length) { $("mkqList").innerHTML = `<div class="empty-box">${KR.state === "ok" ? "Markirovkali (IMEI'li) qoldiq yo'q" : ""}</div>`; return; }
  $("mkqList").innerHTML = `<table><thead><tr><th>#</th><th>Tovar</th><th>IMEI</th><th>Tashkilot / ombor</th><th>Kirim</th><th>Kelgan</th><th>Yetkazib beruvchi</th><th>Tannarx</th><th>Yotibdi</th></tr></thead><tbody>` + list.slice(0, 1500).map((u, i) => {
    const days = u.kdate ? Math.max(0, Math.round((today - new Date(u.kdate + "T00:00:00")) / 864e5)) : "";
    return `<tr class="${u.brak ? "ombrak" : ""}"><td>${i + 1}</td><td><b>${esc(u.name)}</b>${u.brak ? ` <span class="st st-late">Brak</span>` : ""}</td><td class="mono">${esc(u.imei)}</td><td>${esc(u.org)}<div class="tmeta">${esc(u.wh)}</div></td><td>${u.kirim ? "№" + u.kirim : "—"}</td><td>${esc(u.kdate)}</td><td>${esc(u.sup)}</td><td class="num">${krMoney(u.cost, u.cur)}</td><td class="num ${days > 60 ? "late" : ""}">${days === "" ? "—" : days + " kun"}</td></tr>`;
  }).join("") + `</tbody></table>` + (list.length > 1500 ? `<div class="tmeta">Birinchi 1500 tasi ko'rsatildi — qidiruvdan foydalaning.</div>` : "");
}
["mkqOrg", "mkqWh"].forEach(id => $(id).addEventListener("change", () => { if (id === "mkqOrg") $("mkqWh").value = ""; mkqRender(); }));
$("mkqQ").addEventListener("input", e => { MKQ.q = e.target.value; mkqRender(); });

// ======================= SONI BO'YICHA QOLDIQ =======================
const QTQ = { q:"", by:"all" };
omPanel("omQtApp", `<div class="panel"><div class="thead"><h3>Soni bo'yicha qoldiq</h3></div>
  <div class="tmeta">Har bir tovar bo'yicha nechta qolgani va tannarxi (IMEI'li tovarlar ham soni bilan qo'shiladi). Tannarx FIFO: birinchi kelgan birinchi sotiladi.</div>
  <div class="omfil"><select id="qtqOrg"></select><select id="qtqWh"></select><select id="qtqBy"><option value="all">Omborlar bo'yicha bo'lmasin</option><option value="wh">Har bir ombor alohida</option></select><input id="qtqQ" placeholder="Qidirish: tovar, kategoriya" style="min-width:220px"></div>
  <div class="omtot" id="qtqTot"></div><div class="status" id="qtqStatus"></div><div id="qtqList"></div><div id="qtqNeg"></div></div>`);
function qtqRender() {
  if (!$("qtqList")) return;
  omFilterOpts("qtqOrg", "qtqWh");
  const org = $("qtqOrg").value, wh = $("qtqWh").value, by = $("qtqBy").value, q = omK(QTQ.q), L = omLedger(), m = {};
  const add = (name, o, w, qty, cost, cur, brak) => {
    if (org && o !== org) return; if (wh === OM_BRAK ? !brak : (wh ? (w !== wh || brak) : brak)) return;
    const k = omK(name) + (by === "wh" ? "|" + o + "|" + w : ""), x = m[k] || (m[k] = { name, org:o, wh:brak ? OM_BRAK : w, qty:0, cost:{} });
    x.qty += qty; x.cost[cur] = (x.cost[cur] || 0) + cost * qty;
  };
  L.units.forEach(u => add(u.name, u.org, u.wh, 1, u.cost, u.cur, u.st === "brak" || u.wh === OM_BRAK));
  L.lots.forEach(l => add(l.name, l.org, l.wh, l.qty, l.cost, l.cur, l.wh === OM_BRAK));
  const rows = Object.values(m).filter(x => x.qty > 0 && (!q || omK(x.name).indexOf(q) >= 0 || omK(omCat(x.name)).indexOf(q) >= 0)).sort((a, b) => a.name.localeCompare(b.name) || a.wh.localeCompare(b.wh));
  const tc = {}; let tq = 0; rows.forEach(x => { tq += x.qty; Object.entries(x.cost).forEach(([c, v]) => { tc[c] = (tc[c] || 0) + v; }); });
  $("qtqTot").innerHTML = `<div><div class="l">Jami soni</div><div class="v">${tq.toLocaleString("ru-RU")}</div></div><div><div class="l">Tovar turlari</div><div class="v">${new Set(rows.map(x => omK(x.name))).size}</div></div><div><div class="l">Jami tannarx</div><div class="v">${omMoneyMap(tc)}</div></div>`;
  $("qtqStatus").textContent = omLine(KR, "Qoldiq");
  $("qtqList").innerHTML = rows.length ? `<table><thead><tr><th>Tovar</th><th>Kategoriya</th>${by === "wh" ? "<th>Tashkilot / ombor</th>" : ""}<th>Markirovka</th><th>Soni</th><th>O'rtacha tannarx</th><th>Jami tannarx</th></tr></thead><tbody>` + rows.map(x => {
    const avg = Object.entries(x.cost).map(([c, v]) => krMoney(v / x.qty, c)).join(" / ");
    return `<tr class="${x.wh === OM_BRAK ? "ombrak" : ""}"><td><b>${esc(x.name)}</b>${x.wh === OM_BRAK ? ` <span class="st st-late">Brak</span>` : ""}</td><td class="tmeta">${esc(omCat(x.name)) || "—"}</td>${by === "wh" ? `<td>${esc(x.org)}<div class="tmeta">${esc(x.wh)}</div></td>` : ""}<td>${omMarked(x.name) ? "IMEI" : "—"}</td><td class="num"><b>${x.qty.toLocaleString("ru-RU")}</b></td><td class="num">${avg}</td><td class="num">${omMoneyMap(x.cost)}</td></tr>`;
  }).join("") + `</tbody></table>` : `<div class="empty-box">${KR.state === "ok" ? "Qoldiq yo'q" : ""}</div>`;
  const neg = Object.entries(L.neg);
  $("qtqNeg").innerHTML = neg.length ? `<div class="tmeta omneg" style="margin-top:10px">Diqqat: quyidagi tovarlar omborda bo'lmasa ham sotilgan yoki chiqarilgan (kirim qilinmagan bo'lishi mumkin): ${neg.map(([n, v]) => `${esc(n)} — ${v} dona`).join("; ")}. Inventarizatsiya qilib qoldiqni to'g'rilang.</div>` : "";
}
["qtqOrg", "qtqWh", "qtqBy"].forEach(id => $(id).addEventListener("change", () => { if (id === "qtqOrg") $("qtqWh").value = ""; qtqRender(); }));
$("qtqQ").addEventListener("input", e => { QTQ.q = e.target.value; qtqRender(); });

// ======================= HARAKATLAR: spisaniya, ichki va tashkiliy ko'chirish =======================
const MV = { mode:"spis", items:[], filter:"all", pendCancel:"", msg:"", msgT:null, open:"" };
const OMS_DEF = ["Shikastlangan", "Yo'qolgan", "O'zimiz uchun ishlatildi", "Namuna (vitrina)", "Boshqa"];
FORM_FOCUS.omMvApp = "mvProd";
omPanel("omMvApp", `<div class="panel fpanel"><div class="thead"><h3 id="mvTitle"></h3><button type="button" class="closebtn" data-close="omMvApp">Yopish ✕</button></div>
  <form id="mvForm" class="kform"><div class="kgrid">
    <label>Qayerdan: tashkilot<select id="mvForg"></select></label><label>Qayerdan: ombor<select id="mvFwh"></select></label>
    <label id="mvTorgL">Qayerga: tashkilot<select id="mvTorg"></select></label><label id="mvTwhL">Qayerga: ombor<select id="mvTwh"></select></label>
    <label id="mvReasonL">Sabab<select id="mvReason"></select></label><label>Sana<input type="date" id="mvDate"></label>
  </div>
  <div class="inrow" style="max-width:640px;margin:6px 0"><input id="mvProd" list="mvProds" placeholder="Shu ombordagi tovarni tanlang"><button type="button" class="mini" id="mvAdd">Qo'shish</button></div><datalist id="mvProds"></datalist>
  <div class="ktable"><table><thead><tr><th>Tovar</th><th>Omborda</th><th>Soni / IMEI</th><th>Tannarx</th><th></th></tr></thead><tbody id="mvRows"></tbody></table></div>
  <div class="ktotal" id="mvTotal"></div>
  <label class="full">Izoh<input id="mvNote" maxlength="300" placeholder="ixtiyoriy"></label>
  <div class="kbtns"><button type="button" class="pri" id="mvSave">Saqlash</button></div><div class="status" id="mvFmsg"></div></form></div>
  <div class="panel"><div class="thead"><h3 id="mvListTitle"></h3><div class="hbtns"><div class="filters" id="mvFilters"></div><button type="button" class="openbtn" data-open="omMvApp" id="mvOpenBtn"></button></div></div>
  <div class="status" id="mvStatus"></div><div id="mvList"></div></div>`);
function mvTitle() { return { spis:["Yangi spisaniya (hisobdan chiqarish)", "Spisaniyalar", "+ Yangi spisaniya"], ichki:["Ichki ko'chirish (bir tashkilot omborlari orasida)", "Ichki ko'chirishlar", "+ Yangi ko'chirish"], tash:["Tashkiliy ko'chirish (boshqa tashkilotga)", "Tashkiliy ko'chirishlar", "+ Yangi ko'chirish"] }[MV.mode]; }
function mvSelects() {
  const fo = $("mvForg").value || Object.keys(KR.orgs).sort()[0] || "";
  $("mvForg").innerHTML = omOrgOpts(fo); $("mvFwh").innerHTML = omWhOpts(fo, $("mvFwh").value);
  let to = $("mvTorg").value;
  if (MV.mode === "ichki") to = fo;
  if (MV.mode === "tash" && (!to || to === fo)) to = Object.keys(KR.orgs).sort().find(o => o !== fo) || "";
  $("mvTorg").innerHTML = MV.mode === "tash" ? Object.keys(KR.orgs).sort().filter(o => o !== fo).map(o => `<option${o === to ? " selected" : ""}>${esc(o)}</option>`).join("") : omOrgOpts(to);
  $("mvTorg").disabled = MV.mode === "ichki";
  const twhs = (KR.orgs[to] || []).filter(w => !(MV.mode === "ichki" && w === $("mvFwh").value)).sort(), tv = $("mvTwh").value;
  $("mvTwh").innerHTML = twhs.map(w => `<option${w === tv ? " selected" : ""}>${esc(w)}</option>`).join("");
  $("mvReason").innerHTML = omsNames().map(n => `<option>${esc(n)}</option>`).join("");
  const at = omAt($("mvForg").value, $("mvFwh").value);
  $("mvProds").innerHTML = Object.values(at).map(x => `<option value="${esc(x.name)}">${x.qty} dona</option>`).join("");
}
function mvRows() {
  const at = omAt($("mvForg").value, $("mvFwh").value);
  MV.items = MV.items.filter(it => at[omK(it.name)]);
  $("mvRows").innerHTML = MV.items.length ? MV.items.map((it, i) => {
    const a = at[omK(it.name)], unit = Object.entries(a.cost).map(([c, v]) => krMoney(v / a.qty, c)).join(" / ");
    const pick = a.imeis.length ? `<div class="omimeis">${a.imeis.map(m => `<label><input type="checkbox" data-i="${i}" data-imei="${esc(m)}"${it.imeis.indexOf(m) >= 0 ? " checked" : ""}> ${esc(m)}</label>`).join("")}</div>` : `<input type="number" class="sm" data-i="${i}" data-f="qty" min="1" max="${a.qty}" step="1" value="${esc(it.qty)}">`;
    return `<tr><td><b>${esc(it.name)}</b></td><td class="num">${a.qty}</td><td>${pick}</td><td class="num">${unit}</td><td><button type="button" data-rm="${i}">×</button></td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">Yuqoridan tovar qo'shing.</td></tr>`;
  const cost = {}; MV.items.forEach(it => { const a = at[omK(it.name)], q = a.imeis.length ? it.imeis.length : Number(it.qty) || 0; Object.entries(a.cost).forEach(([c, v]) => { cost[c] = (cost[c] || 0) + v / a.qty * q; }); });
  $("mvTotal").textContent = MV.items.length ? `Jami tannarx: ${omMoneyMap(cost)}` : "";
}
function mvReset() {
  $("mvTitle").textContent = mvTitle()[0]; $("mvDate").value = omToday(); $("mvNote").value = ""; $("mvProd").value = ""; MV.items = [];
  $("mvTorgL").hidden = MV.mode === "spis"; $("mvTwhL").hidden = MV.mode === "spis"; $("mvReasonL").hidden = MV.mode !== "spis";
  mvSelects(); mvRows(); omMsg("mvFmsg", "");
}
function mvAddProd() {
  const v = $("mvProd").value.trim(); if (!v) return;
  const at = omAt($("mvForg").value, $("mvFwh").value), a = at[omK(v)] || Object.values(at).find(x => x.imeis.indexOf(v) >= 0);
  if (!a) return omMsg("mvFmsg", `«${v}» bu omborda yo'q.`, true);
  let it = MV.items.find(x => omK(x.name) === omK(a.name)); if (!it) { it = { name:a.name, qty:1, imeis:[] }; MV.items.push(it); }
  if (a.imeis.indexOf(v) >= 0 && it.imeis.indexOf(v) < 0) it.imeis.push(v);
  $("mvProd").value = ""; omMsg("mvFmsg", ""); mvRows(); $("mvProd").focus();
}
async function mvSave() {
  if (OMV.busy) return; if (!OM.mcp) return omMsg("mvFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const forg = $("mvForg").value, fwh = $("mvFwh").value, torg = MV.mode === "spis" ? "" : $("mvTorg").value, twh = MV.mode === "spis" ? "" : $("mvTwh").value;
  if (!forg || !fwh) return omMsg("mvFmsg", "Qaysi ombordan ekanini tanlang.", true);
  if (MV.mode !== "spis" && (!torg || !twh)) return omMsg("mvFmsg", "Qaysi omborga ekanini tanlang.", true);
  if (MV.mode !== "spis" && torg === forg && twh === fwh) return omMsg("mvFmsg", "Qayerdan va qayerga bir xil bo'lmasin.", true);
  if (!MV.items.length) return omMsg("mvFmsg", "Kamida bitta tovar qo'shing.", true);
  const at = omAt(forg, fwh), items = [];
  for (const it of MV.items) {
    const a = at[omK(it.name)]; if (!a) return omMsg("mvFmsg", `«${it.name}» bu omborda qolmagan.`, true);
    if (a.imeis.length) { if (!it.imeis.length) return omMsg("mvFmsg", `«${it.name}»: IMEI'larni belgilang.`, true); const bad = it.imeis.find(m => a.imeis.indexOf(m) < 0); if (bad) return omMsg("mvFmsg", `IMEI ${bad} bu omborda yo'q.`, true); items.push({ name:it.name, qty:it.imeis.length, imeis:it.imeis.slice() }); }
    else { const q = Number(it.qty); if (!(q >= 1) || Math.floor(q) !== q || q > a.qty) return omMsg("mvFmsg", `«${it.name}»: soni 1 dan ${a.qty} gacha bo'lsin.`, true); items.push({ name:it.name, qty:q, imeis:[] }); }
  }
  OMV.busy = true; $("mvSave").disabled = true;
  try {
    await omvReload();
    const now = new Date().toISOString(), number = OMV.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    await OM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Ombor harakatlari'!A1", values:[[krT(omId("H")), number, OM_TYPES[MV.mode], "Yakunlangan", krT($("mvDate").value || omToday()), krT(forg + "|" + fwh), krT(torg ? torg + "|" + twh : ""), krT(JSON.stringify(items)), krT(MV.mode === "spis" ? $("mvReason").value : ""), krT($("mvNote").value.trim()), krT(now), ""]] });
    omSay(MV, mvRender, `${OM_TYPES[MV.mode]} №${number} saqlandi: ${items.reduce((a, x) => a + x.qty, 0)} dona.`); mvReset(); openForm("omMvApp", false); try { await omvReload(); } catch (e) {}
  } catch (e) { if (e) omMsg("mvFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  OMV.busy = false; $("mvSave").disabled = false;
}
async function omvCancel(id, render) {
  if (OMV.busy || !OM.mcp) return; OMV.busy = true;
  try { await omvReload(); const m = OMV.list.find(x => x.id === id); if (!m || m.cancelled) throw null; await OM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ombor harakatlari'!D${m.row}`, values:[["Bekor qilingan"]] }); await OM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ombor harakatlari'!L${m.row}`, values:[[krT(new Date().toISOString())]] }); omSay(MV, render, `${OM_TYPES[m.type]} №${m.number} bekor qilindi, qoldiq qayta hisoblandi.`); try { await omvReload(); } catch (e) {} }
  catch (e) { if (e) omSay(MV, render, krCodeMsg(e.code) || "Bekor qilib bo'lmadi."); }
  OMV.busy = false; MV.pendCancel = "";
}
function mvRender() {
  if (!$("mvList")) return;
  const t = mvTitle(); $("mvListTitle").textContent = t[1]; $("mvOpenBtn").textContent = t[2];
  const mine = OMV.list.filter(m => m.type === MV.mode), counts = { all:mine.filter(m => !m.cancelled).length, cancel:mine.filter(m => m.cancelled).length };
  $("mvFilters").innerHTML = [["all", "Yakunlangan"], ["cancel", "Bekor qilingan"]].map(([k, l]) => `<button data-f="${k}" class="${MV.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("mvStatus").textContent = [omLine(OMV, "Harakatlar"), MV.msg].filter(Boolean).join(" · ");
  const list = mine.filter(m => MV.filter === "cancel" ? m.cancelled : !m.cancelled), can = !!OM.mcp;
  $("mvList").innerHTML = list.length ? `<table><thead><tr><th>№</th><th>Sana</th><th>Qayerdan</th>${MV.mode === "spis" ? "<th>Sabab</th>" : "<th>Qayerga</th>"}<th>Tovarlar</th><th></th></tr></thead><tbody>` + list.map(m => `<tr class="${m.cancelled ? "slx" : ""}"><td>${m.number}</td><td>${esc(m.date.slice(0, 10))}</td><td>${esc(m.forg)}<div class="tmeta">${esc(m.fwh)}</div></td><td>${MV.mode === "spis" ? esc(m.reason) : `${esc(m.torg)}<div class="tmeta">${esc(m.twh)}</div>`}</td><td class="small">${m.items.map(it => `${esc(it.name)} × ${it.qty}${it.imeis && it.imeis.length ? `<div class="imeis">${it.imeis.map(esc).join(", ")}</div>` : ""}`).join("")}${m.note ? `<div class="tmeta">${esc(m.note)}</div>` : ""}</td><td class="krAct">${can && !m.cancelled ? `<button data-mvcancel="${esc(m.id)}">${MV.pendCancel === m.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>` : `<div class="empty-box">${OMV.state === "ok" ? "Hozircha yo'q" : ""}</div>`;
}
$("mvForm").addEventListener("submit", e => e.preventDefault());
$("mvSave").addEventListener("click", mvSave);
$("mvAdd").addEventListener("click", mvAddProd);
$("mvProd").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); mvAddProd(); } });
["mvForg", "mvFwh", "mvTorg"].forEach(id => $(id).addEventListener("change", () => { if (id === "mvForg") $("mvFwh").value = ""; mvSelects(); mvRows(); }));
$("mvRows").addEventListener("change", e => { const i = Number(e.target.dataset.i), it = MV.items[i]; if (!it) return; if (e.target.dataset.imei) { const m = e.target.dataset.imei; if (e.target.checked) { if (it.imeis.indexOf(m) < 0) it.imeis.push(m); } else it.imeis = it.imeis.filter(x => x !== m); } else if (e.target.dataset.f === "qty") it.qty = e.target.value; mvRows(); });
$("mvRows").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { MV.items.splice(Number(b.dataset.rm), 1); mvRows(); } });
$("mvFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { MV.filter = b.dataset.f; mvRender(); } });
$("mvList").addEventListener("click", e => { const b = e.target.closest("button[data-mvcancel]"); if (!b) return; if (MV.pendCancel === b.dataset.mvcancel) omvCancel(b.dataset.mvcancel, mvRender); else { MV.pendCancel = b.dataset.mvcancel; mvRender(); } });

// ======================= INVENTARIZATSIYA =======================
const INV = { rows:[], extra:[], open:"", pendCancel:"", msg:"", msgT:null, filter:"all" };
FORM_FOCUS.omInvApp = "invOrg";
omPanel("omInvApp", `<div class="panel fpanel"><div class="thead"><h3>Inventarizatsiya (sanoq)</h3><button type="button" class="closebtn" data-close="omInvApp">Yopish ✕</button></div>
  <form id="invForm" class="kform"><div class="kgrid">
    <label>Tashkilot<select id="invOrg"></select></label><label>Ombor<select id="invWh"></select></label><label>Sana<input type="date" id="invDate"></label>
  </div>
  <div class="tmeta">IMEI'li tovarlarda topilganlarini belgilang (topilmagani kamomad bo'ladi). Boshqa tovarlarda haqiqiy sanalgan sonni yozing. Ro'yxatda yo'q tovar topilsa — pastdan qo'shing (boshlang'ich qoldiq ham shu yo'l bilan kiritiladi).</div>
  <div class="ktable"><table><thead><tr><th>Tovar</th><th>Hisobda</th><th>Sanaldi</th><th>Farq</th></tr></thead><tbody id="invRows"></tbody></table></div>
  <h4 style="margin:12px 0 4px">Ro'yxatda yo'q, lekin topilgan tovarlar</h4>
  <div class="ktable"><table><thead><tr><th>Tovar</th><th>Soni</th><th>IMEI (har biri yangi qatorda)</th><th>Tannarx (1 dona)</th><th>Valyuta</th><th></th></tr></thead><tbody id="invExtra"></tbody></table></div>
  <button type="button" class="lnk" id="invAddX">+ Qator qo'shish</button>
  <div class="ktotal" id="invTotal"></div>
  <label class="full">Izoh<input id="invNote" maxlength="300" placeholder="Kim sanadi va h.k."></label>
  <div class="kbtns"><button type="button" class="pri" id="invSave">Natijani saqlash</button></div><div class="status" id="invFmsg"></div></form></div>
  <div class="panel"><div class="thead"><h3>Inventarizatsiyalar</h3><div class="hbtns"><div class="filters" id="invFilters"></div><button type="button" class="openbtn" data-open="omInvApp">+ Yangi inventarizatsiya</button></div></div>
  <div class="status" id="invStatus"></div><div id="invList"></div></div>`);
function invBuild() {
  const o = $("invOrg").value || Object.keys(KR.orgs).sort()[0] || ""; $("invOrg").innerHTML = omOrgOpts(o); $("invWh").innerHTML = omWhOpts(o, $("invWh").value);
  const at = omAt($("invOrg").value, $("invWh").value);
  INV.rows = Object.values(at).sort((a, b) => a.name.localeCompare(b.name)).map(a => ({ name:a.name, sys:a.qty, imeis:a.imeis.slice(), found:a.imeis.slice(), cnt:a.imeis.length ? a.qty : a.qty }));
  INV.extra = []; invDraw();
}
function invDraw() {
  $("invRows").innerHTML = INV.rows.length ? INV.rows.map((r, i) => {
    const got = r.imeis.length ? r.found.length : Number(r.cnt) || 0, d = got - r.sys;
    return `<tr><td><b>${esc(r.name)}</b>${r.imeis.length ? `<div class="omimeis">${r.imeis.map(m => `<label><input type="checkbox" data-i="${i}" data-imei="${esc(m)}"${r.found.indexOf(m) >= 0 ? " checked" : ""}> ${esc(m)}</label>`).join("")}</div>` : ""}</td><td class="num">${r.sys}</td><td>${r.imeis.length ? `<b>${got}</b>` : `<input type="number" class="sm" data-i="${i}" data-f="cnt" min="0" step="1" value="${esc(r.cnt)}">`}</td><td class="num ${d < 0 ? "omneg" : d > 0 ? "balneg" : ""}">${d > 0 ? "+" + d : d || "—"}</td></tr>`;
  }).join("") : `<tr><td colspan="4" class="empty">Bu omborda hisobda tovar yo'q.</td></tr>`;
  $("invExtra").innerHTML = INV.extra.map((x, i) => `<tr data-x="${i}"><td><input data-f="name" list="krProducts" value="${esc(x.name)}" placeholder="Tovar nomi"></td><td><input data-f="qty" class="sm" type="number" min="1" step="1" value="${esc(x.qty)}"></td><td><textarea data-f="imei" rows="1" placeholder="IMEI'li bo'lsa">${esc(x.imei)}</textarea></td><td><input data-f="cost" class="sm" type="number" min="0" step="any" value="${esc(x.cost)}" placeholder="0"></td><td><select data-f="cur"><option value="USD"${x.cur === "USD" ? " selected" : ""}>$</option><option value="UZS"${x.cur === "UZS" ? " selected" : ""}>so'm</option></select></td><td><button type="button" data-rmx="${i}">×</button></td></tr>`).join("");
  invTotals();
}
function invTotals() {
  let minus = 0, plus = 0; INV.rows.forEach(r => { const got = r.imeis.length ? r.found.length : Number(r.cnt) || 0, d = got - r.sys; if (d < 0) minus -= d; else plus += d; });
  INV.extra.forEach(x => { plus += krImeis(x.imei).length || Number(x.qty) || 0; });
  $("invTotal").innerHTML = `Kamomad: <b class="omneg">${minus}</b> dona · Ortiqcha / yangi: <b>${plus}</b> dona`;
}
function invReset() { $("invDate").value = omToday(); $("invNote").value = ""; invBuild(); omMsg("invFmsg", ""); }
async function invSave() {
  if (OMV.busy) return; if (!OM.mcp) return omMsg("invFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const org = $("invOrg").value, wh = $("invWh").value; if (!org || !wh) return omMsg("invFmsg", "Omborni tanlang.", true);
  const items = [];
  INV.rows.forEach(r => {
    if (r.imeis.length) { const missing = r.imeis.filter(m => r.found.indexOf(m) < 0); if (missing.length) items.push({ name:r.name, missing, diff:0 }); }
    else { const d = (Number(r.cnt) || 0) - r.sys; if (d) items.push({ name:r.name, diff:d }); }
  });
  for (const x of INV.extra.filter(x => String(x.name).trim())) {
    const im = krImeis(x.imei), q = im.length || Number(x.qty);
    if (!(q >= 1)) return omMsg("invFmsg", `«${x.name}»: sonini kiriting.`, true);
    if (String(x.cost).trim() === "" || !(Number(x.cost) >= 0)) return omMsg("invFmsg", `«${x.name}»: tannarxini kiriting.`, true);
    const name = (krProduct(x.name) || {}).name || String(x.name).trim();
    if (im.length) { const known = new Set(omLedger().units.filter(u => u.st === "in").map(u => u.imei)); const dup = im.find(m => known.has(m)); if (dup) return omMsg("invFmsg", `IMEI ${dup} allaqachon omborda hisobda bor.`, true); items.push({ name, extra:im, cost:Number(x.cost), cur:x.cur, diff:0 }); }
    else items.push({ name, diff:q, cost:Number(x.cost), cur:x.cur });
  }
  if (!items.length) return omMsg("invFmsg", "Farq yo'q: hisobdagi qoldiq sanoq bilan bir xil. Saqlash shart emas.", false);
  OMV.busy = true; $("invSave").disabled = true;
  try {
    await omvReload();
    const now = new Date().toISOString(), number = OMV.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    await OM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Ombor harakatlari'!A1", values:[[krT(omId("H")), number, OM_TYPES.inv, "Yakunlangan", krT($("invDate").value || omToday()), krT(org + "|" + wh), "", krT(JSON.stringify(items)), "", krT($("invNote").value.trim()), krT(now), ""]] });
    omSay(INV, invRender, `Inventarizatsiya №${number} saqlandi, qoldiq to'g'rilandi.`); openForm("omInvApp", false); try { await omvReload(); } catch (e) {}
  } catch (e) { if (e) omMsg("invFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  OMV.busy = false; $("invSave").disabled = false;
}
function invRender() {
  if (!$("invList")) return;
  const mine = OMV.list.filter(m => m.type === "inv"), counts = { all:mine.filter(m => !m.cancelled).length, cancel:mine.filter(m => m.cancelled).length };
  $("invFilters").innerHTML = [["all", "Yakunlangan"], ["cancel", "Bekor qilingan"]].map(([k, l]) => `<button data-f="${k}" class="${INV.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("invStatus").textContent = [omLine(OMV, "Inventarizatsiya"), INV.msg].filter(Boolean).join(" · ");
  const list = mine.filter(m => INV.filter === "cancel" ? m.cancelled : !m.cancelled), can = !!OM.mcp;
  $("invList").innerHTML = list.length ? `<table><thead><tr><th>№</th><th>Sana</th><th>Ombor</th><th>Kamomad</th><th>Ortiqcha / yangi</th><th>Tafsilot</th><th></th></tr></thead><tbody>` + list.map(m => {
    let minus = 0, plus = 0; m.items.forEach(it => { minus += (it.missing || []).length + (it.diff < 0 ? -it.diff : 0); plus += (it.extra || []).length + (it.diff > 0 ? it.diff : 0); });
    return `<tr class="${m.cancelled ? "slx" : ""}"><td>${m.number}</td><td>${esc(m.date.slice(0, 10))}</td><td>${esc(m.forg)}<div class="tmeta">${esc(m.fwh)}</div></td><td class="num omneg">${minus || "—"}</td><td class="num">${plus || "—"}</td><td class="small">${m.items.map(it => `${esc(it.name)}: ${it.missing && it.missing.length ? `topilmadi ${it.missing.map(esc).join(", ")}` : it.extra && it.extra.length ? `qo'shildi ${it.extra.map(esc).join(", ")}` : (it.diff > 0 ? "+" : "") + it.diff}`).join("<br>")}${m.note ? `<div class="tmeta">${esc(m.note)}</div>` : ""}</td><td class="krAct">${can && !m.cancelled ? `<button data-invcancel="${esc(m.id)}">${MV.pendCancel === m.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>` : ""}</td></tr>`;
  }).join("") + `</tbody></table>` : `<div class="empty-box">${OMV.state === "ok" ? "Hozircha inventarizatsiya yo'q" : ""}</div>`;
}
$("invForm").addEventListener("submit", e => e.preventDefault());
$("invSave").addEventListener("click", invSave);
["invOrg", "invWh"].forEach(id => $(id).addEventListener("change", () => { if (id === "invOrg") $("invWh").value = ""; invBuild(); }));
$("invRows").addEventListener("change", e => { const r = INV.rows[Number(e.target.dataset.i)]; if (!r) return; if (e.target.dataset.imei) { const m = e.target.dataset.imei; r.found = e.target.checked ? r.found.concat([m]) : r.found.filter(x => x !== m); } else r.cnt = e.target.value; invDraw(); });
$("invAddX").addEventListener("click", () => { INV.extra.push({ name:"", qty:1, imei:"", cost:"", cur:"USD" }); invDraw(); });
$("invExtra").addEventListener("input", e => { const tr = e.target.closest("tr[data-x]"); if (!tr) return; const x = INV.extra[Number(tr.dataset.x)]; if (x) { x[e.target.dataset.f] = e.target.value; invTotals(); } });
$("invExtra").addEventListener("change", e => { const tr = e.target.closest("tr[data-x]"); if (!tr) return; const x = INV.extra[Number(tr.dataset.x)]; if (x) x[e.target.dataset.f] = e.target.value; });
$("invExtra").addEventListener("click", e => { const b = e.target.closest("[data-rmx]"); if (b) { INV.extra.splice(Number(b.dataset.rmx), 1); invDraw(); } });
$("invFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { INV.filter = b.dataset.f; invRender(); } });
$("invList").addEventListener("click", e => { const b = e.target.closest("button[data-invcancel]"); if (!b) return; if (MV.pendCancel === b.dataset.invcancel) omvCancel(b.dataset.invcancel, invRender); else { MV.pendCancel = b.dataset.invcancel; invRender(); } });

// ======================= SKLADLAR =======================
const SK_RANGE = "Skladlar!A1:E200";
const SK = { list:[], state:"loading", busy:false, msg:"", msgT:null };
omPanel("omSkApp", `<div class="panel"><div class="thead"><h3>Tashkilotlar va omborlar</h3></div>
  <div class="tmeta">Kirim, ko'chirish va inventarizatsiyadagi ombor ro'yxati shu yerdan olinadi.</div>
  <form id="skForm" class="kform"><div class="inrow" style="max-width:640px"><input id="skOrg" list="skOrgs" maxlength="80" placeholder="Tashkilot (mavjudini tanlang yoki yangisini yozing)"><input id="skWh" maxlength="80" placeholder="Yangi ombor nomi"><button type="button" class="pri" id="skAdd">Qo'shish</button></div></form><datalist id="skOrgs"></datalist>
  <div class="status" id="skStatus"></div><div id="skList"></div></div>`);
function skParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[3] || "") !== "O'chirilgan" && String(r[1] || "").trim() && String(r[2] || "").trim()) out.push({ id:String(r[0]), row:i + 1, org:String(r[1]).trim(), wh:String(r[2]).trim() }); }); return out; }
function skMerge() { SK.list.forEach(s => { const a = KR.orgs[s.org] || (KR.orgs[s.org] = []); if (a.indexOf(s.wh) < 0) a.push(s.wh); }); if (typeof krFillOrgs === "function" && $("krOrg")) krFillOrgs(); }
function skApply(vals) { SK.list = skParse(vals); SK.state = "ok"; skMerge(); omRenderAll(); }
async function skReload() { const r = await OM.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:SK_RANGE }, { cache:false }); skApply(krVals({ result:r })); }
async function skAdd() {
  if (SK.busy) return; if (!OM.mcp) return omSay(SK, skRender, krDbLine() || "Tsunami bazasi ulanmagan.");
  const org = $("skOrg").value.trim(), wh = $("skWh").value.trim(); if (!org || !wh) return omSay(SK, skRender, "Tashkilot va ombor nomini yozing.");
  if ((KR.orgs[org] || []).some(w => omK(w) === omK(wh))) return omSay(SK, skRender, `«${org} / ${wh}» bor.`);
  SK.busy = true;
  try { await skReload(); await OM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Skladlar!A1", values:[[krT(omId("W")), krT(org), krT(wh), "Faol", krT(new Date().toISOString())]] }); $("skWh").value = ""; omSay(SK, skRender, `«${org} / ${wh}» qo'shildi.`); try { await skReload(); } catch (e) {} }
  catch (e) { omSay(SK, skRender, krCodeMsg(e && e.code) || "Saqlab bo'lmadi."); }
  SK.busy = false;
}
function skRender() {
  if (!$("skList")) return;
  $("skOrgs").innerHTML = Object.keys(KR.orgs).map(o => `<option value="${esc(o)}">`).join("");
  $("skStatus").textContent = [omLine(SK, "Skladlar"), SK.msg].filter(Boolean).join(" · ");
  const L = omLedger();
  $("skList").innerHTML = `<table><thead><tr><th>Tashkilot</th><th>Ombor</th><th>IMEI'li</th><th>Jami soni</th><th>Tannarx</th></tr></thead><tbody>` + Object.keys(KR.orgs).sort().map(o => (KR.orgs[o] || []).slice().sort().map(w => {
    const u = L.units.filter(x => x.st === "in" && x.org === o && x.wh === w), l = L.lots.filter(x => x.org === o && x.wh === w), cost = {};
    u.forEach(x => { cost[x.cur] = (cost[x.cur] || 0) + x.cost; }); l.forEach(x => { cost[x.cur] = (cost[x.cur] || 0) + x.cost * x.qty; });
    return `<tr><td>${esc(o)}</td><td><b>${esc(w)}</b>${SK.list.some(s => s.org === o && s.wh === w) ? ` <span class="tmeta">(qo'shilgan)</span>` : ""}</td><td class="num">${u.length}</td><td class="num">${(u.length + l.reduce((a, x) => a + x.qty, 0)).toLocaleString("ru-RU")}</td><td class="num">${omMoneyMap(cost)}</td></tr>`;
  }).join("")).join("") + `</tbody></table>`;
}
$("skForm").addEventListener("submit", e => { e.preventDefault(); skAdd(); });
$("skAdd").addEventListener("click", skAdd);

// ======================= Sozlamalar: spisaniya sabablari =======================
const OMS_RANGE = "'Ombor sozlamalari'!A1:E200";
const OMS = { list:[], state:"loading", busy:false, edit:"", pendDel:"", msg:"", msgT:null };
omPanel("omsApp", `<div class="panel"><div class="thead"><h3>Spisaniya sabablari</h3></div><div class="tmeta">Ombor → Spisaniyalar formasidagi «Sabab» ro'yxati shu yerdan olinadi.</div>
  <form id="omsForm" class="kform"><div class="inrow" style="max-width:520px"><input id="omsName" maxlength="80" placeholder="Yangi sabab"><button type="button" class="pri" id="omsAdd">Qo'shish</button></div></form>
  <div class="status" id="omsStatus"></div><div id="omsList"></div></div>`);
function omsParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[3] || "") !== "O'chirilgan" && String(r[2] || "").trim()) out.push({ id:String(r[0]), row:i + 1, name:String(r[2]).trim() }); }); return out; }
function omsNames() { return OMS.state === "ok" && OMS.list.length ? OMS.list.map(x => x.name) : OMS_DEF; }
function omsApply(vals) { OMS.list = omsParse(vals); OMS.state = "ok"; omsRender(); }
async function omsReload() { const r = await OM.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:OMS_RANGE }, { cache:false }); omsApply(krVals({ result:r })); }
async function omsDo(fn) { if (OMS.busy) return; if (!OM.mcp) return omSay(OMS, omsRender, krDbLine() || "Tsunami bazasi ulanmagan."); OMS.busy = true; try { await omsReload(); await fn(); try { await omsReload(); } catch (e) {} } catch (e) { if (e) omSay(OMS, omsRender, krCodeMsg(e.code) || "Saqlab bo'lmadi."); } OMS.busy = false; }
function omsAdd() { const name = $("omsName").value.trim(); if (!name) return; omsDo(async () => { if (OMS.list.some(x => omK(x.name) === omK(name))) { omSay(OMS, omsRender, `«${name}» bor.`); throw null; } const now = krT(new Date().toISOString()), rows = OMS.list.length ? [] : OMS_DEF.filter(n => omK(n) !== omK(name)).map(n => [krT(omId("S")), "spis", krT(n), "Faol", now]); rows.push([krT(omId("S")), "spis", krT(name), "Faol", now]); await OM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Ombor sozlamalari'!A1", values:rows }); $("omsName").value = ""; omSay(OMS, omsRender, `«${name}» qo'shildi.`); }); }
function omsRename(id, name) { name = String(name || "").trim(); if (!name) return; omsDo(async () => { const x = OMS.list.find(r => r.id === id); if (!x) throw null; await OM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ombor sozlamalari'!C${x.row}`, values:[[krT(name)]] }); OMS.edit = ""; omSay(OMS, omsRender, "Saqlandi."); }); }
function omsDelete(id) { omsDo(async () => { const x = OMS.list.find(r => r.id === id); if (!x) throw null; if (OMS.list.length <= 1) { omSay(OMS, omsRender, "Kamida bittasi qolishi kerak."); throw null; } await OM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ombor sozlamalari'!D${x.row}`, values:[["O'chirilgan"]] }); OMS.pendDel = ""; omSay(OMS, omsRender, `«${x.name}» o'chirildi.`); }); }
function omsRender() {
  if (!$("omsList")) return;
  $("omsStatus").textContent = [omLine(OMS, "Sozlama"), OMS.msg].filter(Boolean).join(" · ");
  const rows = OMS.state === "ok" && OMS.list.length ? OMS.list : OMS_DEF.map(n => ({ id:"", name:n })), can = !!OM.mcp;
  $("omsList").innerHTML = `<table><tbody>` + rows.map((x, i) => OMS.edit && OMS.edit === x.id ? `<tr><td>${i + 1}</td><td><input id="omsEditIn" value="${esc(x.name)}"></td><td class="krAct"><button data-omssave="${esc(x.id)}">Saqlash</button><button data-omscancel="1">Bekor</button></td></tr>` : `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td class="krAct">${can && x.id ? `<button data-omsedit="${esc(x.id)}">Tahrirlash</button><button data-omsdel="${esc(x.id)}">${OMS.pendDel === x.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
}
$("omsForm").addEventListener("submit", e => { e.preventDefault(); omsAdd(); });
$("omsAdd").addEventListener("click", omsAdd);
$("omsList").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.omsedit) { OMS.edit = b.dataset.omsedit; omsRender(); } else if (b.dataset.omscancel) { OMS.edit = ""; omsRender(); } else if (b.dataset.omssave) omsRename(b.dataset.omssave, $("omsEditIn").value); else if (b.dataset.omsdel) { if (OMS.pendDel === b.dataset.omsdel) omsDelete(b.dataset.omsdel); else { OMS.pendDel = b.dataset.omsdel; omsRender(); } } });

// ======================= Yo'naltirish va yuklash =======================
const OM_APPS = { ombor:{ "Markirovkali qoldiq":["omMkApp", mkqRender], "Soni bo'yicha qoldiq":["omQtApp", qtqRender], "Inventarizatsiya":["omInvApp", invRender], "Spisaniyalar":["omMvApp", () => { MV.mode = "spis"; MV.filter = "all"; mvReset(); mvRender(); }], "Ichki ko'chirish":["omMvApp", () => { MV.mode = "ichki"; MV.filter = "all"; mvReset(); mvRender(); }], "Tashkiliy ko'chirish":["omMvApp", () => { MV.mode = "tash"; MV.filter = "all"; mvReset(); mvRender(); }], "Skladlar":["omSkApp", skRender] },
  sozlamalar:{ "Spisaniya sabablari":["omsApp", omsRender] } };
function omRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "", on = {};
  Object.entries(OM_APPS).forEach(([s, apps]) => Object.entries(apps).forEach(([name, [app]]) => { on[app] = on[app] || (s === sec && name === n); }));
  Object.keys(on).forEach(app => { $(app).classList.remove("fopen"); document.body.classList.toggle(app + "-on", on[app]); });
  const hit = (OM_APPS[sec] || {})[n]; if (hit) hit[1]();
}
function omRenderAll() {
  const b = document.body.classList;
  if (b.contains("omMkApp-on")) mkqRender(); if (b.contains("omQtApp-on")) qtqRender(); if (b.contains("omSkApp-on")) skRender();
  if (b.contains("omInvApp-on")) invRender(); if (b.contains("omMvApp-on")) { mvRender(); if (!$("omMvApp").classList.contains("fopen")) mvSelects(); }
}
const omOrigRenderSub = renderSub;
renderSub = function (i) { omOrigRenderSub(i); omRoute(); };
document.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (!o) return; if (o.dataset.open === "omMvApp") mvReset(); else if (o.dataset.open === "omInvApp") invReset(); });
// Kirim yoki sotuv yangilanganda qoldiq ko'rinishlari ham yangilansin
const omOrigKrApply = krApplyList; krApplyList = function (vals) { omOrigKrApply(vals); omRenderAll(); };
const omOrigSlApply = slApply; slApply = function (vals) { omOrigSlApply(vals); omRenderAll(); };
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { OMV.state = SK.state = OMS.state = "off"; omRenderAll(); return; }
  OM.mcp = mcp;
  [[OMV, OMV_RANGE, omvApply, 120000], [SK, SK_RANGE, skApply, 300000], [OMS, OMS_RANGE, omsApply, 300000]].forEach(([o, range, apply, every]) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        if (o.state !== "ok" || !o.list.length) o.state = (ev.error && ev.error.code) || "upstream_error";
        omRenderAll();
      }, { refetchInterval:every });
    } catch (e) {}
  });
})();
omRoute();
