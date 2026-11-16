// ===== Tsunami: Hisobotlar (Tsunami bazasi bo'yicha) =====
// Umumiy ko'rsatkichlar, Sotuv, Foyda va zarar, Qaytarishlar, Ombor harakati, Ombor qiymati, Balanslar, Balans hisoboti, Yetkazib beruvchilar aylanmasi
const HBX = { from:"", to:"", cur:"UZS", rate:"", preset:"month", grp:"tovar", ret:"1", qgrp:"tovar", vgrp:"cat", bal:"cli", q:"", last:null, noRate:0 };
const HB_REPS = { "Umumiy ko'rsatkichlar":"hbSum", "Sotuv hisoboti":"hbSale", "Foyda va zarar":"hbPnl", "Qaytarishlar":"hbRet", "Ombor harakati":"hbMove", "Ombor qiymati":"hbVal", "Balanslar":"hbBal", "Balans hisoboti":"hbBs", "Yetkazib beruvchilar aylanmasi":"hbSup" };
const hbK = s => String(s || "").trim().toLowerCase();
const hbD = d => d.toLocaleDateString("en-CA");
function hbPreset(p) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth(), d = n.getDate();
  const r = { today:[n, n], yday:[new Date(y, m, d - 1), new Date(y, m, d - 1)], week:[new Date(y, m, d - ((n.getDay() + 6) % 7)), n], month:[new Date(y, m, 1), n], pmonth:[new Date(y, m - 1, 1), new Date(y, m, 0)], year:[new Date(y, 0, 1), n], all:[new Date(2000, 0, 1), n] }[p];
  if (r) { HBX.from = hbD(r[0]); HBX.to = hbD(r[1]); HBX.preset = p; }
}
hbPreset("month");
(function hbBuild() {
  const el = document.createElement("div");
  el.id = "hbApp";
  el.innerHTML = `<div class="panel hbbar"><div class="hbpre" id="hbPre"></div>
    <div class="vsrow"><label>Dan<input type="date" id="hbFrom"></label><label>Gacha<input type="date" id="hbTo"></label>
    <label>Hisobot valyutasi<select id="hbCur"><option value="UZS">so'm</option><option value="USD">$ (dollar)</option></select></label>
    <label>Kurs (1 $ = so'm)<input type="number" id="hbRate" min="0" step="1" placeholder="12000" style="width:110px!important;min-width:0"></label>
    <span id="hbExtra" class="vsrow" style="margin:0"></span><button type="button" class="sec" id="hbCsv">Excel (CSV)</button></div>
    <div class="tmeta" id="hbNote"></div></div>
    <div class="panel"><div class="thead"><h3 id="hbTitle"></h3></div><div id="hbBody"></div></div>`;
  $("kirimApp").parentNode.insertBefore(el, $("kirimApp"));
  const st = document.createElement("style");
  st.textContent = "#hbApp{display:none}.hbApp-on #hbApp{display:block}.hbApp-on .gen,.hbApp-on #kpis{display:none}"
    + ".hbpre{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.hbpre button{border:1px solid var(--line);background:#fff;border-radius:99px;padding:5px 12px;font-size:13px;cursor:pointer}.hbpre button.on{background:#0f172a;color:#fff;border-color:#0f172a}"
    + ".hbtiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-bottom:14px}.hbtile{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#fff}.hbtile .l{font-size:12px;color:#64748b}.hbtile .v{font-size:20px;font-weight:700;margin-top:4px}.hbtile .s{font-size:12px;color:#64748b;margin-top:2px}.hbtile.pos .v{color:#15803d}.hbtile.neg .v{color:#b91c1c}"
    + ".hbbars{display:flex;align-items:flex-end;gap:3px;height:140px;border-bottom:1px solid var(--line);padding-top:8px;overflow-x:auto}.hbbars div{flex:1 0 14px;background:#3b82f6;border-radius:3px 3px 0 0;position:relative;min-height:1px}.hbbars div:hover{background:#1d4ed8}.hbbl{display:flex;gap:3px;font-size:10px;color:#94a3b8;overflow:hidden}.hbbl span{flex:1 0 14px;text-align:center}"
    + "#hbBody table tr.tot td{font-weight:700;border-top:2px solid #0f172a;background:#f8fafc}.hbpnl td:first-child{padding-left:12px}.hbpnl tr.h td{font-weight:700;background:#f8fafc;padding-left:6px}.hbpnl tr.r td{font-weight:700;border-top:2px solid #0f172a}.hbneg{color:#b91c1c}.hbpos{color:#15803d}.hbh4{margin:16px 0 6px;font-size:15px}";
  document.head.appendChild(st);
})();

// ---------- yordamchilar ----------
function hbRate() { return Number(HBX.rate) || (typeof vsRate === "function" ? vsRate() : 0); }
// v ni from → HBX.cur ga o'tkazish (hujjat kursi bo'lsa — o'sha, aks holda umumiy kurs)
function hbC(v, from, docRate) {
  v = Number(v) || 0; if (!v) return 0;
  from = from === "USD" ? "USD" : "UZS"; if (from === HBX.cur) return v;
  const r = Number(docRate) || hbRate(); if (!r) { HBX.noRate++; return 0; }
  return from === "USD" ? v * r : v / r;
}
function hbCo(obj, docRate) { return Object.entries(obj || {}).reduce((a, [c, v]) => a + hbC(v, c, docRate), 0); }
const hbM = v => krMoney(v, HBX.cur);
const hbN = v => HBX.cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v);
const hbIn = d => { const x = String(d || "").slice(0, 10); return x >= HBX.from && x <= HBX.to; };
function hbPct(a, b) { return b ? Math.round(a / b * 1000) / 10 + "%" : "—"; }
function hbCat(name) { const t = TV.list.find(x => hbK(x.name) === hbK(name)); return t ? ((t.catId && typeof ktPath === "function" && ktPath(t.catId)) || t.cat || "Kategoriyasiz") : "Tovarlar ro'yxatida yo'q"; }
function hbL() { try { return omLedger(); } catch (e) { return { units:[], lots:[], neg:{}, scost:{}, rcost:{}, mcost:{} }; } }
function hbSales() { return SL.list.filter(s => !s.cancelled && hbIn(s.date)); }
function hbRets() { return (typeof QT !== "undefined" ? QT.list : []).filter(r => !r.cancelled && hbIn(r.date)); }
function hbTable(head, rows, tot, numFrom) {
  numFrom = numFrom == null ? 1 : numFrom;
  return `<table><thead><tr>${head.map((h, i) => `<th${i >= numFrom ? ' class="num"' : ""}>${esc(h)}</th>`).join("")}</tr></thead><tbody>` + rows.map(r => `<tr>${r.map((c, i) => `<td${i >= numFrom ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("") + (tot ? `<tr class="tot">${tot.map((c, i) => `<td${i >= numFrom ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>` : "") + `</tbody></table>`;
}
const hbTxt = h => String(h).replace(/<div class="tmeta">.*?<\/div>/g, " ").replace(/<[^>]+>/g, "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
// Sotuv qatorlari (tannarx bilan)
function hbSaleLines() {
  const L = hbL(), out = [];
  hbSales().forEach(s => s.items.forEach((it, i) => {
    const rev = hbC((Number(it.qty) || 0) * (Number(it.price) || 0), s.currency, s.rate), cost = hbCo(((L.scost[s.id] || [])[i]) || {}, s.rate);
    out.push({ s, it, qty:Number(it.qty) || 0, rev, cost });
  }));
  return out;
}
function hbRetLines() {
  const L = hbL(), out = [];
  hbRets().forEach(r => { const s = SL.list.find(x => x.id === r.saleId); (r.items || []).forEach((it, i) => out.push({ r, s, it, qty:Number(it.qty) || 0, rev:hbC((Number(it.qty) || 0) * (Number(it.price) || 0), r.currency, r.rate), cost:hbCo(((L.rcost[r.id] || [])[i]) || {}, r.rate) })); });
  return out;
}

// ---------- 1. Umumiy ko'rsatkichlar ----------
function hbSum() {
  const sl = hbSaleLines(), rl = hbRetLines(), sales = hbSales(), L = hbL();
  const rev = sl.reduce((a, x) => a + x.rev, 0), cost = sl.reduce((a, x) => a + x.cost, 0);
  const rrev = rl.reduce((a, x) => a + x.rev, 0), rcost = rl.reduce((a, x) => a + x.cost, 0);
  const net = rev - rrev, gp = (rev - cost) - (rrev - rcost);
  const pays = (typeof PAY !== "undefined" ? PAY.list : []).filter(p => !p.cancelled && hbIn(p.date)).reduce((a, p) => a + hbC(p.total, p.currency), 0);
  const newDebt = sales.reduce((a, s) => a + hbC(s.debt, s.currency, s.rate), 0);
  const stock = L.units.filter(u => u.st === "in").reduce((a, u) => a + hbC(u.cost, u.cur), 0) + L.lots.reduce((a, l) => a + hbC((Number(l.cost) || 0) * l.qty, l.cur), 0);
  let cash = 0; try { Object.values(mlBalances()).forEach(m => Object.entries(m).forEach(([c, v]) => { cash += hbC(v, c); })); } catch (e) {}
  const cli = hbBalSum("cliApp"), sup = hbBalSum("supApp");
  const tile = (l, v, s, cls) => `<div class="hbtile ${cls || ""}"><div class="l">${l}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
  // kunlik savdo
  const days = {}; sl.forEach(x => { const d = String(x.s.date).slice(0, 10); days[d] = (days[d] || 0) + x.rev; });
  const dl = []; for (let d = new Date(HBX.from); hbD(d) <= HBX.to && dl.length < 400; d.setDate(d.getDate() + 1)) dl.push(hbD(d));
  const mx = Math.max(1, ...dl.map(d => days[d] || 0));
  const top = {}; sl.forEach(x => { const k = x.it.name, o = top[k] || (top[k] = { qty:0, rev:0, gp:0 }); o.qty += x.qty; o.rev += x.rev; o.gp += x.rev - x.cost; });
  const topR = Object.entries(top).sort((a, b) => b[1].rev - a[1].rev).slice(0, 10);
  HBX.last = { head:["Ko'rsatkich", "Qiymat"], rows:[["Savdo", hbN(rev)], ["Qaytarishlar", hbN(rrev)], ["Sof savdo", hbN(net)], ["Yalpi foyda", hbN(gp)], ["Cheklar soni", sales.length], ["O'rtacha chek", hbN(sales.length ? rev / sales.length : 0)], ["Mijozlardan to'lovlar", hbN(pays)], ["Yangi qarzlar", hbN(newDebt)], ["Kassadagi pul", hbN(cash)], ["Ombordagi tovar (tannarx)", hbN(stock)], ["Mijozlar qarzi", hbN(cli.pos)], ["Yetkazib beruvchilarga qarz", hbN(sup.pos)]] };
  return `<div class="hbtiles">${tile("Sof savdo", hbM(net), `savdo ${hbM(rev)} − qaytarish ${hbM(rrev)}`)}${tile("Yalpi foyda", hbM(gp), `marja ${hbPct(gp, net)}`, gp >= 0 ? "pos" : "neg")}${tile("Cheklar", sales.length, `o'rtacha chek ${hbM(sales.length ? rev / sales.length : 0)}`)}${tile("Sotilgan dona", sl.reduce((a, x) => a + x.qty, 0))}${tile("Mijozlardan to'lovlar", hbM(pays), `davrdagi yangi qarz ${hbM(newDebt)}`)}${tile("Kassadagi pul (hozir)", hbM(cash))}${tile("Ombordagi tovar (hozir)", hbM(stock), "tannarx bo'yicha")}${tile("Mijozlar qarzi (hozir)", hbM(cli.pos), cli.neg ? `avanslar ${hbM(cli.neg)}` : "")}${tile("Yetkazib beruvchilarga qarz", hbM(sup.pos), sup.neg ? `ular qarzi (avans) ${hbM(sup.neg)}` : "", sup.pos ? "neg" : "")}</div>
    <h4 class="hbh4">Kunlik savdo</h4>${dl.length > 1 ? `<div class="hbbars">${dl.map(d => `<div style="height:${Math.round((days[d] || 0) / mx * 100)}%" title="${d}: ${esc(hbM(days[d] || 0))}"></div>`).join("")}</div><div class="hbbl">${dl.map((d, i) => `<span>${i % Math.ceil(dl.length / 15) === 0 ? d.slice(8, 10) + "." + d.slice(5, 7) : ""}</span>`).join("")}</div>` : `<div class="tmeta">Bir kunlik davr: ${hbM(days[HBX.from] || 0)}</div>`}
    <h4 class="hbh4">Eng ko'p sotilgan tovarlar</h4>${topR.length ? hbTable(["Tovar", "Soni", "Savdo", "Foyda"], topR.map(([n, o]) => [esc(n), o.qty, hbM(o.rev), hbM(o.gp)])) : `<div class="empty-box">Bu davrda sotuv yo'q</div>`}`;
}
function hbBalSum(app) {
  let pos = 0, neg = 0;
  (PARTY[app] ? PARTY[app].list : []).forEach(o => { let b = {}; try { b = ptBal(app, o); } catch (e) {} const v = Object.entries(b).reduce((a, [c, x]) => a + hbC(x, c), 0); if (v > 0) pos += v; else neg -= v; });
  return { pos, neg };
}

// ---------- 2. Sotuv hisoboti ----------
const HB_GRP = { tovar:"Tovar", cat:"Kategoriya", seller:"Sotuvchi", client:"Mijoz", pay:"To'lov turi", day:"Kun", month:"Oy", org:"Tashkilot" };
function hbKey(g, s, it) {
  if (!s) return "(sotuv topilmadi)";
  return g === "tovar" ? it.name : g === "cat" ? hbCat(it.name) : g === "seller" ? (s.seller || "(ko'rsatilmagan)") : g === "client" ? s.client : g === "pay" ? (s.payType || "—") : g === "day" ? String(s.date).slice(0, 10) : g === "month" ? String(s.date).slice(0, 7) : (s.org || "—");
}
function hbSale() {
  const g = HBX.grp, m = {};
  const row = k => m[k] || (m[k] = { k, ch:new Set(), qty:0, rev:0, cost:0 });
  hbSaleLines().forEach(x => { const o = row(hbKey(g, x.s, x.it)); o.ch.add(x.s.id); o.qty += x.qty; o.rev += x.rev; o.cost += x.cost; });
  if (HBX.ret) hbRetLines().forEach(x => { const o = row(hbKey(g, x.s, x.it)); o.qty -= x.qty; o.rev -= x.rev; o.cost -= x.cost; });
  const rows = Object.values(m).sort((a, b) => g === "day" || g === "month" ? a.k.localeCompare(b.k) : b.rev - a.rev);
  const T = rows.reduce((a, o) => ({ ch:a.ch + o.ch.size, qty:a.qty + o.qty, rev:a.rev + o.rev, cost:a.cost + o.cost }), { ch:0, qty:0, rev:0, cost:0 });
  const head = [HB_GRP[g], "Cheklar", "Soni", "Savdo", "Tannarx", "Foyda", "Marja"];
  HBX.last = { head, rows:rows.map(o => [o.k, o.ch.size, o.qty, hbN(o.rev), hbN(o.cost), hbN(o.rev - o.cost), hbPct(o.rev - o.cost, o.rev)]) };
  return rows.length ? hbTable(head, rows.map(o => [esc(o.k), o.ch.size, o.qty, hbM(o.rev), hbM(o.cost), `<span class="${o.rev - o.cost < 0 ? "hbneg" : ""}">${hbM(o.rev - o.cost)}</span>`, hbPct(o.rev - o.cost, o.rev)]), ["Jami", new Set(hbSales().map(s => s.id)).size, T.qty, hbM(T.rev), hbM(T.cost), hbM(T.rev - T.cost), hbPct(T.rev - T.cost, T.rev)]) : `<div class="empty-box">Bu davrda sotuv yo'q</div>`;
}

// ---------- 3. Foyda va zarar ----------
function hbPnl() {
  const sl = hbSaleLines(), rl = hbRetLines(), L = hbL();
  const rev = sl.reduce((a, x) => a + x.rev, 0), cost = sl.reduce((a, x) => a + x.cost, 0), rrev = rl.reduce((a, x) => a + x.rev, 0), rcost = rl.reduce((a, x) => a + x.cost, 0);
  let loss = 0, gain = 0; OMV.list.filter(mv => !mv.cancelled && hbIn(mv.date)).forEach(mv => { const c = L.mcost[mv.id]; if (c) { loss += hbCo(c.loss); gain += hbCo(c.gain); } });
  const exp = {};
  (typeof MOP !== "undefined" ? MOP.list : []).filter(o => !o.cancelled && hbIn(o.date)).forEach(o => { if (o.t === "out") exp[o.cat || "Boshqa xarajat"] = (exp[o.cat || "Boshqa xarajat"] || 0) + hbC(o.sum, o.cur); else if (o.t === "count" && o.sum < 0) exp["Kassa kamomadi (sanoq)"] = (exp["Kassa kamomadi (sanoq)"] || 0) - hbC(o.sum, o.cur); });
  (typeof SAL !== "undefined" ? SAL.list : []).filter(s => !s.cancelled && (s.t === "pay" || s.t === "adv") && hbIn(s.date)).forEach(s => { exp["Ish haqi va avanslar"] = (exp["Ish haqi va avanslar"] || 0) + hbC(s.sum, "UZS"); });
  let other = 0; (typeof MOP !== "undefined" ? MOP.list : []).filter(o => !o.cancelled && hbIn(o.date) && (o.t === "in" || (o.t === "count" && o.sum > 0))).forEach(o => { other += hbC(o.sum, o.cur); });
  const expT = Object.values(exp).reduce((a, v) => a + v, 0);
  const netRev = rev - rrev, cogs = cost - rcost, gp = netRev - cogs, stockRes = gain - loss, net = gp + stockRes - expT + other;
  const R = [], add = (cls, l, v) => R.push([cls, l, v]);
  add("h", "Daromad", null); add("", "Savdo", rev); add("", "Qaytarishlar", -rrev); add("r", "Sof savdo", netRev);
  add("", "Sotilgan tovar tannarxi", -cogs); add("r", "Yalpi foyda", gp);
  add("h", "Ombor natijasi", null); add("", "Spisaniya va inventarizatsiya kamomadi", loss ? -loss : 0); add("", "Inventarizatsiya ortiqchasi", gain);
  add("h", "Xarajatlar", null); Object.entries(exp).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => add("", k, v ? -v : 0)); if (!Object.keys(exp).length) add("", "Xarajat kiritilmagan", 0);
  if (other) { add("h", "Boshqa kirimlar", null); add("", "Kassaga boshqa kirimlar", other); }
  add("r", "Sof foyda", net);
  HBX.last = { head:["Modda", "Summa"], rows:R.filter(r => r[2] != null).map(r => [r[1], hbN(r[2])]) };
  return `<table class="hbpnl"><tbody>${R.map(([cls, l, v]) => `<tr class="${cls}"><td>${esc(l)}</td><td class="num">${v == null ? "" : `<span class="${cls === "r" ? (v < 0 ? "hbneg" : "hbpos") : ""}">${hbM(v)}</span>`}</td></tr>`).join("")}</tbody></table>
    <div class="tmeta" style="margin-top:8px">Marja: ${hbPct(gp, netRev)} yalpi, ${hbPct(net, netRev)} sof. Tannarx FIFO usulida (birinchi kelgan — birinchi sotiladi). Xarajatlar Moliya → Kassa'dagi «Xarajat» operatsiyalari va Kadrlar → Ish haqi'dan olinadi. Yetkazib beruvchiga to'lov xarajat emas (u tannarxda hisoblangan).</div>`;
}

// ---------- 4. Qaytarishlar ----------
function hbRet() {
  const g = HBX.qgrp, m = {};
  hbRetLines().forEach(x => { const k = g === "tovar" ? x.it.name : g === "reason" ? (x.r.reason || "(sababsiz)") : g === "client" ? x.r.client : g === "dest" ? (x.it.dest === "brak" ? "Brak" : "Omborga") : String(x.r.date).slice(0, 10); const o = m[k] || (m[k] = { k, n:new Set(), qty:0, rev:0, cost:0 }); o.n.add(x.r.id); o.qty += x.qty; o.rev += x.rev; o.cost += x.cost; });
  const rows = Object.values(m).sort((a, b) => b.rev - a.rev), T = rows.reduce((a, o) => ({ qty:a.qty + o.qty, rev:a.rev + o.rev, cost:a.cost + o.cost }), { qty:0, rev:0, cost:0 });
  const sold = hbSaleLines().reduce((a, x) => a + x.rev, 0);
  const head = [{ tovar:"Tovar", reason:"Sabab", client:"Mijoz", dest:"Qayerga", day:"Kun" }[g], "Qaytarishlar", "Soni", "Summa", "Tannarx"];
  HBX.last = { head, rows:rows.map(o => [o.k, o.n.size, o.qty, hbN(o.rev), hbN(o.cost)]) };
  return rows.length ? `<div class="tmeta" style="margin-bottom:8px">Qaytarishlar savdoning ${hbPct(T.rev, sold)} qismi.</div>` + hbTable(head, rows.map(o => [esc(o.k), o.n.size, o.qty, hbM(o.rev), hbM(o.cost)]), ["Jami", new Set(hbRets().map(r => r.id)).size, T.qty, hbM(T.rev), hbM(T.cost)]) : `<div class="empty-box">Bu davrda qaytarish yo'q</div>`;
}

// ---------- 5. Ombor harakati ----------
function hbMoveEvents() {
  const ev = [], push = (date, name, col, q) => { if (q) ev.push({ date:String(date || "").slice(0, 10), name, col, q }); };
  KR.list.filter(k => k.state === "done").forEach(k => (k.items || []).forEach(it => { const im = Array.isArray(it.imeis) ? it.imeis : (typeof krImeis === "function" ? krImeis(it.imei) : []); push(k.date, it.name, "kirim", im.length || Number(it.qty) || 0); }));
  SL.list.filter(s => !s.cancelled).forEach(s => s.items.forEach(it => push(s.date, it.name, "sotuv", -((it.imeis || []).length || Number(it.qty) || 0))));
  (typeof QT !== "undefined" ? QT.list : []).filter(r => !r.cancelled).forEach(r => (r.items || []).forEach(it => push(r.date, it.name, "qaytdi", (it.imeis || []).length || Number(it.qty) || 0)));
  (typeof YQ !== "undefined" ? YQ.list : []).filter(r => !r.cancelled).forEach(r => (r.items || []).forEach(it => push(r.date, it.name, "yq", -((it.imeis || []).length || Number(it.qty) || 0))));
  OMV.list.filter(m => !m.cancelled).forEach(m => m.items.forEach(it => {
    if (m.type === "spis") push(m.date, it.name, "spis", -((it.imeis || []).length || Number(it.qty) || 0));
    else if (m.type === "inv") push(m.date, it.name, "inv", (it.extra || []).length - (it.missing || []).length + (Number(it.diff) || 0));
  }));
  return ev;
}
function hbMove() {
  const L = hbL(), now = {}, q = hbK(HBX.q);
  L.units.filter(u => u.st === "in").forEach(u => { now[hbK(u.name)] = (now[hbK(u.name)] || 0) + 1; });
  L.lots.filter(l => l.wh !== (typeof OM_BRAK !== "undefined" ? OM_BRAK : "Brak")).forEach(l => { now[hbK(l.name)] = (now[hbK(l.name)] || 0) + l.qty; });
  const m = {}, names = {};
  const row = n => { const k = hbK(n); names[k] = names[k] || n; return m[k] || (m[k] = { kirim:0, sotuv:0, qaytdi:0, yq:0, spis:0, inv:0, after:0 }); };
  hbMoveEvents().forEach(e => { const o = row(e.name); if (e.date > HBX.to) o.after += e.q; else if (e.date >= HBX.from) o[e.col] += e.q; });
  Object.keys(now).forEach(k => { if (!m[k]) { row(L.units.concat(L.lots).find(x => hbK(x.name) === k).name); } });
  const rows = Object.entries(m).map(([k, o]) => { const net = o.kirim + o.sotuv + o.qaytdi + o.yq + o.spis + o.inv, end = (now[k] || 0) - o.after; return { n:names[k], o, beg:end - net, end, act:net !== 0 || o.kirim || o.sotuv }; })
    .filter(r => (!q || hbK(r.n).indexOf(q) >= 0) && (r.act || r.beg || r.end)).sort((a, b) => a.n.localeCompare(b.n));
  const head = ["Tovar", "Boshida", "Kirim", "Sotuv", "Mijoz qaytardi", "Yetk. beruvchiga qaytdi", "Spisaniya", "Inventarizatsiya", "Oxirida"];
  const f = v => v ? (v > 0 ? "+" + v : v) : "—";
  HBX.last = { head, rows:rows.map(r => [r.n, r.beg, r.o.kirim, r.o.sotuv, r.o.qaytdi, r.o.yq, r.o.spis, r.o.inv, r.end]) };
  const T = rows.reduce((a, r) => { a[0] += r.beg; a[1] += r.o.kirim; a[2] += r.o.sotuv; a[3] += r.o.qaytdi; a[4] += r.o.yq; a[5] += r.o.spis; a[6] += r.o.inv; a[7] += r.end; return a; }, [0, 0, 0, 0, 0, 0, 0, 0]);
  return rows.length ? `<div class="tmeta" style="margin-bottom:8px">Dona hisobida. Brak omboridagi tovarlar «Oxirida» ustuniga kirmaydi.</div>` + hbTable(head, rows.map(r => [esc(r.n), r.beg, f(r.o.kirim), f(r.o.sotuv), f(r.o.qaytdi), f(r.o.yq), f(r.o.spis), f(r.o.inv), `<b>${r.end}</b>`]), ["Jami", T[0], f(T[1]), f(T[2]), f(T[3]), f(T[4]), f(T[5]), f(T[6]), T[7]]) : `<div class="empty-box">Harakat yo'q</div>`;
}

// ---------- 6. Ombor qiymati ----------
function hbVal() {
  const L = hbL(), g = HBX.vgrp, m = {};
  const add = (name, org, wh, qty, cost, cur) => {
    const k = g === "cat" ? hbCat(name) : g === "wh" ? `${org} / ${wh}` : g === "org" ? org : name;
    const o = m[k] || (m[k] = { k, qty:0, cost:0, sale:0, noPrice:0 });
    o.qty += qty; o.cost += hbC(cost * qty, cur);
    const r = typeof nrRule === "function" ? nrRule(name) : null;
    if (r && r.price != null) o.sale += hbC(r.price * qty, r.cur); else o.noPrice += qty;
  };
  L.units.filter(u => u.st === "in").forEach(u => add(u.name, u.org, u.wh, 1, Number(u.cost) || 0, u.cur));
  L.lots.forEach(l => add(l.name, l.org, l.wh, l.qty, Number(l.cost) || 0, l.cur));
  const rows = Object.values(m).sort((a, b) => b.cost - a.cost), T = rows.reduce((a, o) => ({ qty:a.qty + o.qty, cost:a.cost + o.cost, sale:a.sale + o.sale, np:a.np + o.noPrice }), { qty:0, cost:0, sale:0, np:0 });
  const head = [{ cat:"Kategoriya", wh:"Ombor", org:"Tashkilot", tovar:"Tovar" }[g], "Soni", "Tannarx bo'yicha", "Sotuv narxi bo'yicha", "Kutilayotgan foyda", "Narxsiz (dona)"];
  HBX.last = { head, rows:rows.map(o => [o.k, o.qty, hbN(o.cost), hbN(o.sale), o.sale ? hbN(o.sale - o.cost) : "", o.noPrice]) };
  return rows.length ? `<div class="tmeta" style="margin-bottom:8px">Hozirgi holat (davr tanlovi ta'sir qilmaydi). Sotuv narxi Ma'lumotnoma → Narx o'rnatish'dan olinadi; narxi yo'q tovarlar kutilayotgan foydaga kirmaydi.</div>` + hbTable(head, rows.map(o => [esc(o.k), o.qty, hbM(o.cost), o.sale ? hbM(o.sale) : "—", o.sale ? hbM(o.sale - o.cost) : "—", o.noPrice || ""]), ["Jami", T.qty, hbM(T.cost), hbM(T.sale), "", T.np || ""]) : `<div class="empty-box">Omborda tovar yo'q</div>`;
}

// ---------- 7. Balanslar ----------
function hbBal() {
  const app = HBX.bal === "sup" ? "supApp" : "cliApp", q = hbK(HBX.q);
  const rows = (PARTY[app] ? PARTY[app].list : []).filter(o => !q || hbK(o.name).indexOf(q) >= 0).map(o => { let b = {}; try { b = ptBal(app, o); } catch (e) {} return { o, b, t:Object.entries(b).reduce((a, [c, v]) => a + hbC(v, c), 0) }; }).filter(r => Math.abs(r.t) > 0.005).sort((a, b) => b.t - a.t);
  const pos = rows.filter(r => r.t > 0).reduce((a, r) => a + r.t, 0), neg = rows.filter(r => r.t < 0).reduce((a, r) => a - r.t, 0);
  const lbl = app === "supApp" ? ["Biz qarzmiz", "Avans berilgan"] : ["Mijoz qarzi", "Avans olingan"];
  const head = [app === "supApp" ? "Yetkazib beruvchi" : "Mijoz", "Telefon", "Valyutalar bo'yicha", `Jami (${HBX.cur === "USD" ? "$" : "so'm"})`];
  HBX.last = { head, rows:rows.map(r => [r.o.name, r.o.phone, Object.entries(r.b).filter(([, v]) => Math.abs(v) > 0.005).map(([c, v]) => krMoney(v, c)).join(" + "), hbN(r.t)]) };
  return `<div class="hbtiles">${`<div class="hbtile ${pos ? "neg" : ""}"><div class="l">${lbl[0]}</div><div class="v">${hbM(pos)}</div><div class="s">${rows.filter(r => r.t > 0).length} ta</div></div><div class="hbtile"><div class="l">${lbl[1]}</div><div class="v">${hbM(neg)}</div><div class="s">${rows.filter(r => r.t < 0).length} ta</div></div>`}</div>`
    + (rows.length ? hbTable(head, rows.map(r => [esc(r.o.name), `<span class="mono">${esc(r.o.phone || "")}</span>`, Object.entries(r.b).filter(([, v]) => Math.abs(v) > 0.005).map(([c, v]) => krMoney(v, c)).join(" + "), `<b class="${r.t > 0 ? "hbneg" : "hbpos"}">${hbM(r.t)}</b>`]), null, 2) : `<div class="empty-box">Qarzdorlik yo'q</div>`);
}

// ---------- 8. Balans hisoboti ----------
function hbBs() {
  const L = hbL();
  const stock = L.units.filter(u => u.st === "in").reduce((a, u) => a + hbC(u.cost, u.cur), 0) + L.lots.reduce((a, l) => a + hbC((Number(l.cost) || 0) * l.qty, l.cur), 0);
  const cashRows = []; let cash = 0; try { Object.entries(mlBalances()).forEach(([acc, m]) => { const v = Object.entries(m).reduce((a, [c, x]) => a + hbC(x, c), 0); if (Math.abs(v) > 0.005) { cashRows.push([acc, v]); cash += v; } }); } catch (e) {}
  const cli = hbBalSum("cliApp"), sup = hbBalSum("supApp");
  const A = cash + stock + cli.pos + sup.neg, P = sup.pos + cli.neg, E = A - P;
  const R = [["h", "Aktivlar", null]].concat(cashRows.map(([a, v]) => ["", "Pul: " + a, v]), [["", "Ombordagi tovar (tannarx)", stock], ["", "Mijozlar qarzi", cli.pos], ["", "Yetkazib beruvchilarga berilgan avans", sup.neg], ["r", "Aktivlar jami", A], ["h", "Majburiyatlar", null], ["", "Yetkazib beruvchilarga qarz", sup.pos], ["", "Mijozlardan olingan avans", cli.neg], ["r", "Majburiyatlar jami", P], ["r", "Sof kapital (aktiv − majburiyat)", E]]);
  HBX.last = { head:["Modda", "Summa"], rows:R.filter(r => r[2] != null).map(r => [r[1], hbN(r[2])]) };
  return `<table class="hbpnl"><tbody>${R.map(([cls, l, v]) => `<tr class="${cls}"><td>${esc(l)}</td><td class="num">${v == null ? "" : hbM(v)}</td></tr>`).join("")}</tbody></table><div class="tmeta" style="margin-top:8px">Hozirgi holat. Asosiy vositalar (jihozlar, bino) va kreditlar Tsunami'da yuritilmaydi — ular bu hisobotga kirmaydi.</div>`;
}

// ---------- 9. Yetkazib beruvchilar aylanmasi ----------
function hbSup() {
  const m = {}, q = hbK(HBX.q);
  const row = n => { const k = hbK(n); return m[k] || (m[k] = { n, kirim:0, ret:0, pay:0, docs:0 }); };
  KR.list.filter(k => k.state === "done" && hbIn(k.date)).forEach(k => { const o = row(k.supplier || "(ko'rsatilmagan)"); o.kirim += hbC(k.total, k.currency, k.rate); o.docs++; });
  (typeof YQ !== "undefined" ? YQ.list : []).filter(r => !r.cancelled && hbIn(r.date)).forEach(r => { row(r.sup).ret += hbC(r.total, r.cur); });
  (typeof YT !== "undefined" ? YT.list : []).filter(p => !p.cancelled && hbIn(p.date)).forEach(p => { row(p.sup).pay += hbC(p.total, p.cur); });
  const rows = Object.values(m).filter(o => !q || hbK(o.n).indexOf(q) >= 0).map(o => { const s = PARTY.supApp ? PARTY.supApp.list.find(x => hbK(x.name) === hbK(o.n)) : null; let b = 0; if (s) try { b = Object.entries(ptBal("supApp", s)).reduce((a, [c, v]) => a + hbC(v, c), 0); } catch (e) {} return Object.assign(o, { bal:b }); }).sort((a, b) => b.kirim - a.kirim);
  const T = rows.reduce((a, o) => ({ kirim:a.kirim + o.kirim, ret:a.ret + o.ret, pay:a.pay + o.pay, bal:a.bal + o.bal, docs:a.docs + o.docs }), { kirim:0, ret:0, pay:0, bal:0, docs:0 });
  const head = ["Yetkazib beruvchi", "Kirimlar", "Kirim summasi", "Qaytarildi", "To'landi", "Hozirgi balans"];
  HBX.last = { head, rows:rows.map(o => [o.n, o.docs, hbN(o.kirim), hbN(o.ret), hbN(o.pay), hbN(o.bal)]) };
  return rows.length ? hbTable(head, rows.map(o => [esc(o.n), o.docs, hbM(o.kirim), hbM(o.ret), hbM(o.pay), `<span class="${o.bal > 0 ? "hbneg" : ""}">${hbM(o.bal)}</span><div class="tmeta">${o.bal > 0.005 ? "biz qarzmiz" : o.bal < -0.005 ? "avans berilgan" : ""}</div>`]), ["Jami", T.docs, hbM(T.kirim), hbM(T.ret), hbM(T.pay), hbM(T.bal)]) : `<div class="empty-box">Bu davrda harakat yo'q</div>`;
}

// ---------- ko'rinish ----------
const HB_EXTRA = {
  hbSale:() => `<label>Guruhlash<select data-hb="grp">${Object.entries(HB_GRP).map(([k, l]) => `<option value="${k}"${HBX.grp === k ? " selected" : ""}>${l} bo'yicha</option>`).join("")}</select></label><label>Qaytarishlar<select data-hb="ret"><option value="1"${HBX.ret ? " selected" : ""}>ayirilsin</option><option value=""${HBX.ret ? "" : " selected"}>hisobga olinmasin</option></select></label>`,
  hbRet:() => `<label>Guruhlash<select data-hb="qgrp">${[["tovar", "Tovar"], ["reason", "Sabab"], ["client", "Mijoz"], ["dest", "Qayerga (ombor / brak)"], ["day", "Kun"]].map(([k, l]) => `<option value="${k}"${HBX.qgrp === k ? " selected" : ""}>${l} bo'yicha</option>`).join("")}</select></label>`,
  hbMove:() => `<label>Qidirish<input data-hb="q" value="${esc(HBX.q)}" placeholder="tovar nomi"></label>`,
  hbVal:() => `<label>Guruhlash<select data-hb="vgrp">${[["cat", "Kategoriya"], ["wh", "Ombor"], ["org", "Tashkilot"], ["tovar", "Tovar"]].map(([k, l]) => `<option value="${k}"${HBX.vgrp === k ? " selected" : ""}>${l} bo'yicha</option>`).join("")}</select></label>`,
  hbBal:() => `<label>Kimlar<select data-hb="bal"><option value="cli"${HBX.bal === "cli" ? " selected" : ""}>Mijozlar</option><option value="sup"${HBX.bal === "sup" ? " selected" : ""}>Yetkazib beruvchilar</option></select></label><label>Qidirish<input data-hb="q" value="${esc(HBX.q)}" placeholder="nomi"></label>`,
  hbSup:() => `<label>Qidirish<input data-hb="q" value="${esc(HBX.q)}" placeholder="nomi"></label>`
};
const HB_NOPERIOD = new Set(["hbVal", "hbBal", "hbBs"]);
function hbCur() { const n = current && current.subs[currentSub] ? current.subs[currentSub].n : ""; return current && current.id === "hisobotlar" ? HB_REPS[n] : ""; }
function hbRender(keepExtra) {
  const fn = hbCur(); if (!fn) return;
  const n = current.subs[currentSub].n;
  $("hbPre").innerHTML = [["today", "Bugun"], ["yday", "Kecha"], ["week", "Shu hafta"], ["month", "Shu oy"], ["pmonth", "O'tgan oy"], ["year", "Shu yil"], ["all", "Hammasi"]].map(([k, l]) => `<button type="button" data-pre="${k}" class="${HBX.preset === k ? "on" : ""}">${l}</button>`).join("");
  $("hbPre").hidden = HB_NOPERIOD.has(fn); $("hbFrom").parentNode.hidden = HB_NOPERIOD.has(fn); $("hbTo").parentNode.hidden = HB_NOPERIOD.has(fn);
  if (document.activeElement !== $("hbFrom")) $("hbFrom").value = HBX.from; if (document.activeElement !== $("hbTo")) $("hbTo").value = HBX.to;
  $("hbCur").value = HBX.cur;
  if (!HBX.rate && typeof vsRate === "function" && vsRate()) HBX.rate = String(vsRate());
  if (document.activeElement !== $("hbRate")) $("hbRate").value = HBX.rate;
  if (!keepExtra) $("hbExtra").innerHTML = HB_EXTRA[fn] ? HB_EXTRA[fn]() : "";
  $("hbTitle").textContent = n + (HB_NOPERIOD.has(fn) ? " — hozirgi holat" : ` — ${HBX.from.split("-").reverse().join(".")} … ${HBX.to.split("-").reverse().join(".")}`);
  HBX.noRate = 0; HBX.last = null;
  let html; try { html = window[fn](); } catch (e) { html = `<div class="empty-box">Ma'lumotlar hali yuklanmoqda…</div>`; }
  $("hbBody").innerHTML = html;
  $("hbNote").textContent = HBX.noRate ? `Diqqat: ${HBX.noRate} ta summa boshqa valyutada va kurs kiritilmagan — ular hisobga kirmadi. Kursni yuqoriga yoki Sozlamalar → Asosiy sozlamalar'ga kiriting.` : "Turli valyutadagi summalar tanlangan valyutaga o'tkazilgan: sotuvda kurs yozilgan bo'lsa — o'sha kurs, aks holda yuqoridagi kurs.";
  $("hbNote").style.color = HBX.noRate ? "#b91c1c" : "";
}
$("hbApp").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.pre) { hbPreset(b.dataset.pre); hbRender(true); }
  else if (b.id === "hbCsv") hbExport();
});
$("hbApp").addEventListener("change", e => {
  const t = e.target;
  if (t.id === "hbFrom" || t.id === "hbTo") { HBX.from = $("hbFrom").value || HBX.from; HBX.to = $("hbTo").value || HBX.to; if (HBX.from > HBX.to) { const x = HBX.from; HBX.from = HBX.to; HBX.to = x; } HBX.preset = ""; hbRender(true); }
  else if (t.id === "hbCur") { HBX.cur = t.value; hbRender(true); }
  else if (t.id === "hbRate") { HBX.rate = t.value; hbRender(true); }
  else if (t.dataset.hb && t.tagName === "SELECT") { HBX[t.dataset.hb] = t.value; hbRender(true); }
});
$("hbApp").addEventListener("input", e => { const t = e.target; if (t.dataset.hb && t.tagName === "INPUT") { HBX[t.dataset.hb] = t.value; clearTimeout(HBX.t); HBX.t = setTimeout(() => hbRender(true), 300); } });
async function hbExport() {
  if (!HBX.last || !HBX.last.rows.length) return;
  const name = current.subs[currentSub].n.replace(/[^A-Za-z0-9]+/g, "_").toLowerCase();
  try { await vsSave(`${name}_${HB_NOPERIOD.has(hbCur()) ? vsToday() : HBX.from + "_" + HBX.to}.csv`, vsCsv(HBX.last.head, HBX.last.rows.map(r => r.map(v => typeof v === "number" ? String(v).replace(".", ",") : hbTxt(v)))), "text/csv"); }
  catch (e) { $("hbNote").textContent = vsErr(e); }
}
function hbRoute() { const on = !!hbCur(); document.body.classList.toggle("hbApp-on", on); if (on) hbRender(); }
const hbOrigRenderSub = renderSub;
renderSub = function (i) { hbOrigRenderSub(i); hbRoute(); };
// Ma'lumot yangilansa ochiq hisobot qayta chiziladi
setInterval(() => { if (hbCur() && document.visibilityState !== "hidden" && !(document.activeElement && document.activeElement.closest && document.activeElement.closest("#hbApp"))) hbRender(true); }, 30000);
hbRoute();
