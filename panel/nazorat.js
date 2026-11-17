// ===== Tsunami: nazorat jarayonlari =====
// 1) Mijoz qarz limiti va qarz muddati — qarzga sotishda tekshiriladi (CRM → Mijozlar formasida kiritiladi)
// 2) Minimal qoldiq — Ombor → Soni bo'yicha qoldiq; kam qolgan tovarlar ajratiladi
// 3) Akt-sverka — mijoz (CRM → Mijozlar) va yetkazib beruvchi (Ta'minot → Yetkazib beruvchilar) bilan hisob solishtirish
// 4) Hisobotlar: Top tovarlar, Qarzdor cheklar, Sotuv rejasi — Tsunami sotuvlari bo'yicha (Bito'dan mustaqil)
const NZ = { mcp:null };
const nzK = s => String(s || "").trim().toLowerCase();
const nzToday = () => new Date().toLocaleDateString("en-CA");
const nzDays = (a, b) => Math.floor((new Date(b + "T00:00:00") - new Date(String(a).slice(0, 10) + "T00:00:00")) / 864e5);
const nzRate = r => Number(r) || (typeof vsRate === "function" ? vsRate() : 0);
function nzId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ======================= 1. QARZ LIMITI VA MUDDATI =======================
const nzCli = name => (PARTY.cliApp ? PARTY.cliApp.list : []).find(c => nzK(c.name) === nzK(name));
const nzLimit = c => c && String(c.limit || "").trim() !== "" ? Number(c.limit) : null;
const nzTerm = c => c && Number(c.term) > 0 ? Number(c.term) : null;
// Bo'lib to'lash shartnomasiga o'tgan sotuvlar o'z jadvali bo'yicha yuradi — muddat tekshiruvidan chiqariladi
function nzInContract(s) { return (typeof BOL !== "undefined" && BOL ? BOL.list : []).some(b => !b.cancelled && b.saleId === s.id); }
// Muddati o'tgan qarzli sotuvlar
function nzOverdue(c) {
  const t = nzTerm(c); if (!t || typeof pyDebtSales !== "function") return [];
  const today = nzToday();
  return pyDebtSales(c.name, "").filter(s => !nzInContract(s) && nzDays(s.date, today) > t);
}
// Mijozning hozirgi qarzi so'mda (dollar qismi kurs bo'yicha); kurs yo'q bo'lsa null
function nzDebtUZS(c, rate) {
  const b = ptBal("cliApp", c), usd = b.USD || 0, uzs = b.UZS || 0;
  if (Math.abs(usd) > 0.005 && !(rate > 0)) return null;
  return uzs + usd * (rate || 0);
}
// Sotuv formasi chaqiradi: xato matni yoki "" qaytaradi
function nzCreditCheck(c, cur, rate, debt) {
  if (!c) return "";
  const od = nzOverdue(c);
  if (od.length) { const s = od[0]; return `«${c.name}»: №${s.number} sotuvdan qolgan qarz muddati o'tgan (${nzDays(s.date, nzToday())} kun, muddat ${nzTerm(c)} kun). Avval eski qarzni yoping yoki CRM → Mijozlar'da muddatni o'zgartiring.`; }
  const lim = nzLimit(c); if (lim == null) return "";
  const r = nzRate(rate), now = nzDebtUZS(c, r);
  const add = cur === "USD" ? (r > 0 ? debt * r : null) : debt;
  if (now == null || add == null) return `«${c.name}» uchun qarz limiti bor: dollarni so'mga o'tkazish uchun kursni kiriting.`;
  if (now + add > lim + 0.5) return `«${c.name}» qarz limiti ${krMoney(lim, "UZS")}. Hozirgi qarzi ${krMoney(Math.max(0, now), "UZS")}, bu sotuv bilan ${krMoney(now + add, "UZS")} bo'ladi. Ko'proq to'lov oling yoki limitni CRM → Mijozlar'da oshiring.`;
  return "";
}
// Sotuv formasida mijoz tanlanganda ogohlantirish (saqlashdan oldin ko'rinadi)
(function nzSaleHint() {
  const box = document.createElement("div"); box.id = "nzCliHint"; box.className = "tmeta"; box.style.margin = "4px 0";
  const f = $("slFmsg"); if (!f) return; f.parentNode.insertBefore(box, f);
  const draw = () => {
    const c = nzCli($("slClient").value); if (!c) { box.textContent = ""; return; }
    const parts = [], lim = nzLimit(c), od = nzOverdue(c), now = nzDebtUZS(c, nzRate($("slRate").value));
    if (lim != null) parts.push(`qarz limiti ${krMoney(lim, "UZS")}` + (now != null ? `, hozirgi qarzi ${krMoney(Math.max(0, now), "UZS")}, yana ${krMoney(Math.max(0, lim - Math.max(0, now)), "UZS")} gacha qarzga berish mumkin` : ""));
    if (nzTerm(c)) parts.push(`qarz muddati ${nzTerm(c)} kun`);
    if (od.length) parts.push(`muddati o'tgan qarz bor (№${od.map(s => s.number).join(", №")}) — qarzga sotilmaydi`);
    box.textContent = parts.length ? `${c.name}: ${parts.join("; ")}.` : "";
    box.style.color = od.length ? "#b91c1c" : "";
  };
  ["input", "change"].forEach(ev => { $("slClient").addEventListener(ev, draw); $("slRate").addEventListener(ev, draw); });
  document.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (o && o.dataset.open === "sotuvApp") setTimeout(draw, 0); });
})();
// Mijozlar ro'yxatida limit va muddati o'tgan qarz belgisi
function nzCliMarks() {
  const P = PARTY.cliApp; if (!P) return;
  document.querySelectorAll("#cliApp_list button[data-ptedit]").forEach(b => {
    const c = P.list.find(x => x.id === b.dataset.ptedit), td = b.closest("tr") && b.closest("tr").querySelector("td"); if (!c || !td || td.querySelector(".nzmark")) return;
    const lim = nzLimit(c), od = nzOverdue(c), bits = [];
    if (lim != null) bits.push(`limit ${krMoney(lim, "UZS")}`); if (nzTerm(c)) bits.push(`muddat ${nzTerm(c)} kun`);
    if (!bits.length && !od.length) return;
    const d = document.createElement("div"); d.className = "tmeta nzmark"; d.innerHTML = esc(bits.join(" · ")) + (od.length ? ` <span class="st st-late">Muddati o'tgan qarz</span>` : ""); td.appendChild(d);
  });
}

// ======================= 2. MINIMAL QOLDIQ =======================
const MQ_RANGE = "'Minimal qoldiq'!A1:D3000";
const MQ = { list:[], raw:0, state:"loading", busy:false, only:false, msg:"", msgT:null };
function mqApply(vals) { const v = Array.isArray(vals) ? vals : []; MQ.raw = v.length; MQ.list = []; v.forEach((r, i) => { if (i && Array.isArray(r) && r[0]) MQ.list.push({ row:i + 1, name:String(r[0]), min:String(r[1] == null ? "" : r[1]).trim() === "" ? null : Number(r[1]) }); }); MQ.state = "ok"; }
async function mqReload() { const r = await NZ.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:MQ_RANGE }, { cache:false }); mqApply(krVals({ result:r })); }
const mqMin = name => { const x = MQ.list.find(m => nzK(m.name) === nzK(name)); return x && x.min != null && x.min > 0 ? x.min : null; };
// Sotish mumkin bo'lgan qoldiq (brak omboridan tashqari), hamma omborlar bo'yicha
function mqStock() { const L = omLedger(), m = {}; L.units.filter(u => u.st === "in" && u.wh !== OM_BRAK).forEach(u => { m[nzK(u.name)] = (m[nzK(u.name)] || 0) + 1; }); L.lots.filter(l => l.wh !== OM_BRAK).forEach(l => { m[nzK(l.name)] = (m[nzK(l.name)] || 0) + l.qty; }); return m; }
function mqLow() { const st = mqStock(); return MQ.list.filter(x => x.min > 0 && (st[nzK(x.name)] || 0) < x.min).map(x => ({ name:x.name, min:x.min, qty:st[nzK(x.name)] || 0 })); }
async function mqSet(name, min) {
  if (!NZ.mcp || MQ.busy) return; MQ.busy = true;
  try {
    await mqReload();
    const ex = MQ.list.find(m => nzK(m.name) === nzK(name)), v = min == null ? "" : min, now = krT(new Date().toISOString());
    if (ex) await NZ.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Minimal qoldiq'!B${ex.row}:C${ex.row}`, values:[[v, now]] });
    else {
      if (!MQ.raw) await NZ.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Minimal qoldiq'!A1", values:[["Tovar", "Minimal qoldiq", "O'zgargan"]] });
      await NZ.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Minimal qoldiq'!A1", values:[[krT(name), v, now]] });
    }
    await mqReload(); MQ.msg = min == null ? `«${name}»: minimal qoldiq olib tashlandi.` : `«${name}»: minimal qoldiq ${min} dona.`;
  } catch (e) { MQ.msg = krCodeMsg(e && e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."; }
  MQ.busy = false; clearTimeout(MQ.msgT); MQ.msgT = setTimeout(() => { MQ.msg = ""; mqDecor(); }, 6000);
  if (document.body.classList.contains("omQtApp-on")) { qtqRender(); mqDecor(); }
}
(function mqBuild() {
  const fil = $("qtqQ"); if (!fil) return;
  const lab = document.createElement("label"); lab.className = "chip"; lab.innerHTML = `<input type="checkbox" id="mqOnly"> Faqat kam qolganlar`; fil.parentNode.appendChild(lab);
  const box = document.createElement("div"); box.id = "mqBox"; $("qtqTot").parentNode.insertBefore(box, $("qtqTot").nextSibling);
  $("mqOnly").addEventListener("change", e => { MQ.only = e.target.checked; qtqRender(); mqDecor(); });
  const st = document.createElement("style"); st.textContent = "#qtqList td.mqc input{width:70px}.mqlow td{background:#fffbeb}#mqBox .mqwarn{border:1px solid #fcd34d;background:#fffbeb;border-radius:10px;padding:8px 12px;margin:6px 0;font-size:13px}";
  document.head.appendChild(st);
})();
// Jadvalga «Minimal» ustuni qo'shiladi va kam qolganlar belgilanadi
function mqDecor() {
  const box = $("mqBox"); if (!box) return;
  const low = mqLow(), byWh = $("qtqBy") && $("qtqBy").value === "wh";
  box.innerHTML = (low.length ? `<div class="mqwarn"><b>Kam qolgan tovarlar: ${low.length} ta.</b> ${low.slice(0, 8).map(x => `${esc(x.name)} (${x.qty}/${x.min})`).join(", ")}${low.length > 8 ? " …" : ""} <button type="button" class="mini" data-mqzs="1">Zakup so'roviga o'tish</button></div>` : "")
    + `<div class="tmeta">«Minimal» ustuniga tovar uchun eng kam qoldiqni yozing (hamma omborlar bo'yicha jami). Bo'sh — nazorat qilinmaydi.${MQ.msg ? " · " + esc(MQ.msg) : ""}</div>`;
  const tbl = document.querySelector("#qtqList table"); if (!tbl) return;
  const hr = tbl.querySelector("thead tr"); if (hr && !hr.querySelector(".mqh")) { const th = document.createElement("th"); th.className = "mqh"; th.textContent = "Minimal"; hr.appendChild(th); }
  const st = mqStock(), lowSet = new Set(low.map(x => nzK(x.name)));
  tbl.querySelectorAll("tbody tr").forEach(tr => {
    const b = tr.querySelector("td b"); if (!b || tr.classList.contains("ombrak")) { if (b && !tr.querySelector(".mqc")) tr.insertAdjacentHTML("beforeend", `<td class="num mqc">—</td>`); return; } const name = b.textContent.trim(), k = nzK(name), mn = mqMin(name);
    if (MQ.only && !lowSet.has(k)) { tr.style.display = "none"; return; }
    if (!tr.querySelector(".mqc")) { const td = document.createElement("td"); td.className = "num mqc"; td.innerHTML = byWh ? (mn ? String(mn) : "—") : `<input type="number" min="0" step="1" data-mq="${esc(name)}" value="${mn || ""}" placeholder="—">`; tr.appendChild(td); }
    tr.classList.toggle("mqlow", lowSet.has(k));
  });
  // Minimal qo'yilgan, lekin omborda umuman qolmagan tovarlar jadvalda yo'q — pastiga qo'shiladi
  const shown = new Set([...tbl.querySelectorAll("tbody tr td b")].map(b => nzK(b.textContent)));
  if (byWh || $("qtqOrg").value || $("qtqWh").value) return;
  const tb = tbl.querySelector("tbody");
  low.filter(x => !shown.has(nzK(x.name)) && !(st[nzK(x.name)] > 0)).forEach(x => {
    const tr = document.createElement("tr"); tr.className = "mqlow";
    tr.innerHTML = `<td><b>${esc(x.name)}</b> <span class="st st-late">Tugagan</span></td><td class="tmeta">${esc(omCat(x.name)) || "—"}</td><td>${omMarked(x.name) ? "IMEI" : "—"}</td><td class="num"><b>0</b></td><td class="num">—</td><td class="num">—</td><td class="num mqc"><input type="number" min="0" step="1" data-mq="${esc(x.name)}" value="${x.min}"></td>`;
    tb.appendChild(tr);
  });
}
// «Soni bo'yicha qoldiq» jadvali har safar qayta chizilganda ustun qayta qo'shiladi
(function mqWatch() {
  const list = $("qtqList"); if (!list) return;
  const mo = new MutationObserver(() => { mo.disconnect(); try { mqDecor(); } catch (e) {} mo.observe(list, { childList:true }); });
  mo.observe(list, { childList:true });
})();
document.addEventListener("change", e => { const n = e.target.dataset && e.target.dataset.mq; if (n == null) return; const v = String(e.target.value).trim(); mqSet(n, v === "" || Number(v) <= 0 ? null : Math.floor(Number(v))); });
document.addEventListener("click", e => { if (e.target.closest("[data-mqzs]") && typeof tmGo === "function") tmGo("Zakup so'rovlari"); });

// ======================= 3. AKT-SVERKA =======================
const ASV = { app:"", id:"", from:"", to:"" };
// Hisobni o'zgartiradigan hujjatlar: + qarz oshadi (mijoz bizga / biz yetkazib beruvchiga), − kamayadi
function asvDocs(app, o) {
  const n = nzK(o.name), out = [];
  const push = (date, doc, cur, v, note) => { if (Math.abs(v) > 0.005) out.push({ date:String(date || "").slice(0, 10), doc, cur:cur === "UZS" ? "UZS" : "USD", v, note:note || "" }); };
  if (app === "supApp") {
    KR.list.filter(k => k.state === "done" && nzK(k.supplier) === n).forEach(k => push(k.date, `Tovar kirimi №${k.number}`, k.currency, Number(k.total) || 0));
    (typeof YT !== "undefined" ? YT.list : []).filter(p => !p.cancelled && nzK(p.sup) === n).forEach(p => push(p.date, `To'lov №${p.number}${p.type ? " (" + p.type + ")" : ""}`, p.cur, -p.total, p.note));
    (typeof yqActive === "function" ? yqActive() : []).filter(r => nzK(r.sup) === n).forEach(r => push(r.date, `Yetkazib beruvchiga qaytarish №${r.number}`, r.cur, -r.total, r.reason));
  } else {
    SL.list.filter(s => !s.cancelled && nzK(s.client) === n).forEach(s => push(s.date, `Sotuv №${s.number} (jami ${krMoney(s.total, s.currency)}, to'landi ${krMoney(s.paid, s.currency)})`, s.currency, s.debt));
    (typeof qtActive === "function" ? qtActive() : []).filter(r => nzK(r.client) === n && r.debtCut > 0).forEach(r => push(r.date, `Qaytarish №${r.number} (qarzdan ayirildi)`, r.currency, -r.debtCut, r.reason));
    (typeof payActive === "function" ? payActive() : []).filter(p => nzK(p.client) === n).forEach(p => push(p.date, `To'lov №${p.number} (${p.payType})`, p.currency, -p.total, p.note));
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function asvOpening(app, o) { const v = Number(o.opening) || 0; return v ? { cur:app === "supApp" ? (o.cur === "UZS" ? "UZS" : "USD") : "UZS", v } : null; }
function asvBuild(app, o) {
  const docs = asvDocs(app, o), op = asvOpening(app, o), from = ASV.from, to = ASV.to, byCur = {};
  const C = cur => byCur[cur] || (byCur[cur] = { start:0, rows:[], dt:0, kt:0 });
  if (op) C(op.cur).start += op.v;
  docs.forEach(d => { const c = C(d.cur); if (d.date < from) c.start += d.v; else if (d.date <= to) { c.rows.push(d); if (d.v > 0) c.dt += d.v; else c.kt -= d.v; } });
  return byCur;
}
function asvSide(app, v) { return Math.abs(v) < 0.005 ? "" : app === "supApp" ? (v > 0 ? "biz qarzmiz" : "ular qarz (avans)") : (v > 0 ? "mijoz qarzi" : "bizning qarzimiz (avans)"); }
function asvHtml(app, o, forPrint) {
  const by = asvBuild(app, o), curs = Object.keys(by);
  const who = app === "supApp" ? "Yetkazib beruvchi" : "Mijoz", plusL = app === "supApp" ? "Kirim (qarzimiz oshdi)" : "Sotuv (qarz oshdi)", minusL = app === "supApp" ? "To'lov / qaytarish" : "To'lov / qaytarish";
  const period = `${ASV.from.split("-").reverse().join(".")} — ${ASV.to.split("-").reverse().join(".")}`;
  let h = `<div class="akhead">${forPrint ? "<b>Akt-sverka</b> · " : ""}${who}: <b>${esc(o.name)}</b>${o.phone ? " · " + esc(o.phone) : ""} · Davr: ${period}</div>`;
  if (!curs.length) return h + `<div class="empty-box">Bu ${who.toLowerCase()} bilan hujjatlar yo'q</div>`;
  curs.forEach(cur => {
    const c = by[cur]; let run = c.start;
    h += `<table class="aktab"><thead><tr><th>Sana</th><th>Hujjat</th><th class="num">${esc(plusL)}</th><th class="num">${esc(minusL)}</th><th class="num">Qoldiq</th></tr></thead><tbody>`
      + `<tr class="h"><td></td><td><b>Davr boshiga qoldiq</b></td><td></td><td></td><td class="num"><b>${krMoney(Math.abs(c.start), cur)}</b><div class="tmeta">${asvSide(app, c.start)}</div></td></tr>`
      + c.rows.map(d => { run += d.v; return `<tr><td>${esc(d.date)}</td><td>${esc(d.doc)}${d.note ? `<div class="tmeta">${esc(d.note)}</div>` : ""}</td><td class="num">${d.v > 0 ? krMoney(d.v, cur) : ""}</td><td class="num">${d.v < 0 ? krMoney(-d.v, cur) : ""}</td><td class="num">${krMoney(Math.abs(run), cur)}</td></tr>`; }).join("")
      + `<tr class="tot"><td></td><td><b>Davr aylanmasi</b></td><td class="num"><b>${krMoney(c.dt, cur)}</b></td><td class="num"><b>${krMoney(c.kt, cur)}</b></td><td></td></tr>`
      + `<tr class="tot"><td></td><td><b>Davr oxiriga qoldiq</b></td><td></td><td></td><td class="num"><b>${krMoney(Math.abs(run), cur)}</b><div class="tmeta">${asvSide(app, run)}</div></td></tr></tbody></table>`;
  });
  if (forPrint) h += `<div class="aksign"><div>Tsunami: ____________________</div><div>${esc(o.name)}: ____________________</div></div>`;
  return h;
}
(function asvMount() {
  const st = document.createElement("style");
  st.textContent = ".akbox{display:none}.akbox.on{display:block}.akbox .aktab{margin-bottom:12px}.akbox .aktab tr.h td{background:#f8fafc}.akbox .aktab tr.tot td{font-weight:600;border-top:2px solid #0f172a}.akhead{margin:4px 0 10px}";
  document.head.appendChild(st);
  ["supApp", "cliApp"].forEach(app => {
    const host = $(app); if (!host) return;
    const box = document.createElement("div"); box.className = "panel akbox"; box.id = app + "_akt";
    box.innerHTML = `<div class="thead"><h3>Akt-sverka</h3><div class="hbtns"><label class="small">Dan <input type="date" data-akf="from"></label><label class="small">Gacha <input type="date" data-akf="to"></label><button type="button" class="sec" data-akcsv="1">Excel (CSV)</button><button type="button" class="sec" data-akprint="1">Chop etish</button><button type="button" class="closebtn" data-akclose="1">Yopish ✕</button></div></div><div class="akbody"></div>`;
    host.insertBefore(box, host.children[1] || null);
    box.addEventListener("change", e => { const f = e.target.dataset.akf; if (f) { ASV[f] = e.target.value; if (ASV.from > ASV.to) { const x = ASV.from; ASV.from = ASV.to; ASV.to = x; } asvDraw(); } });
    box.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.akclose) { ASV.id = ""; asvDraw(); } else if (b.dataset.akprint) asvPrint(); else if (b.dataset.akcsv) asvCsv(); });
    $(app + "_list").addEventListener("click", e => { const b = e.target.closest("[data-akt]"); if (!b) return; asvOpen(app, b.dataset.akt); });
  });
})();
function asvOpen(app, id) {
  ASV.app = app; ASV.id = id; const y = new Date().getFullYear();
  if (!ASV.from) ASV.from = `${y}-01-01`; if (!ASV.to) ASV.to = nzToday();
  asvDraw(); const box = $(app + "_akt"); if (box) box.scrollIntoView({ behavior:"smooth", block:"start" });
}
function asvDraw() {
  ["supApp", "cliApp"].forEach(app => {
    const box = $(app + "_akt"); if (!box) return;
    const o = ASV.app === app && ASV.id && PARTY[app] ? PARTY[app].list.find(x => x.id === ASV.id) : null;
    box.classList.toggle("on", !!o); if (!o) return;
    box.querySelector('[data-akf="from"]').value = ASV.from; box.querySelector('[data-akf="to"]').value = ASV.to;
    box.querySelector(".akbody").innerHTML = asvHtml(app, o);
  });
}
function asvCur() { return ASV.id && PARTY[ASV.app] ? PARTY[ASV.app].list.find(x => x.id === ASV.id) : null; }
function asvPrint() {
  const o = asvCur(); if (!o) return;
  const w = window.open("", "_blank"); if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Akt-sverka — ${esc(o.name)}</title><style>body{font:13px/1.4 Arial,sans-serif;margin:24px;color:#111}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}.num{text-align:right;white-space:nowrap}.tmeta{font-size:11px;color:#555}tr.tot td{font-weight:bold}.aksign{display:flex;justify-content:space-between;margin-top:40px}.empty-box{padding:20px;color:#666}</style></head><body>${asvHtml(ASV.app, o, true)}</body></html>`);
  w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 300);
}
async function asvCsv() {
  const o = asvCur(); if (!o || typeof vsCsv !== "function") return;
  const by = asvBuild(ASV.app, o), rows = [];
  Object.entries(by).forEach(([cur, c]) => { let run = c.start; rows.push(["", "Davr boshiga qoldiq", cur, "", "", String(Math.round(run * 100) / 100).replace(".", ",")]); c.rows.forEach(d => { run += d.v; rows.push([d.date, d.doc, cur, d.v > 0 ? String(d.v).replace(".", ",") : "", d.v < 0 ? String(-d.v).replace(".", ",") : "", String(Math.round(run * 100) / 100).replace(".", ",")]); }); rows.push(["", "Davr oxiriga qoldiq", cur, String(c.dt).replace(".", ","), String(c.kt).replace(".", ","), String(Math.round(run * 100) / 100).replace(".", ",")]); });
  try { await vsSave(`akt_sverka_${o.name.replace(/[^A-Za-z0-9]+/g, "_")}_${ASV.from}_${ASV.to}.csv`, vsCsv(["Sana", "Hujjat", "Valyuta", "Oshdi", "Kamaydi", "Qoldiq"], rows), "text/csv"); } catch (e) {}
}
// Ro'yxatdagi har bir qatorga «Akt-sverka» tugmasi
function asvButtons(app) { document.querySelectorAll(`#${app}_list button[data-ptedit]`).forEach(b => { if (b.parentNode.querySelector("[data-akt]")) return; const a = document.createElement("button"); a.dataset.akt = b.dataset.ptedit; a.textContent = "Akt-sverka"; b.parentNode.insertBefore(a, b); }); }
["supApp", "cliApp"].forEach(app => {
  const P = PARTY[app]; if (!P) return;
  const orig = P.render;
  P.render = function () { orig.apply(P, arguments); try { asvButtons(app); if (app === "cliApp") nzCliMarks(); if (ASV.app === app && ASV.id) asvDraw(); } catch (e) {} };
});

// ======================= 4. HISOBOTLAR (Tsunami sotuvlari bo'yicha) =======================
// --- Top tovarlar ---
HB_REPS["Top tovarlar"] = "hbTop";
HBX.tsort = "rev";
HB_EXTRA.hbTop = () => `<label>Saralash<select data-hb="tsort">${[["rev", "Savdo summasi"], ["qty", "Soni"], ["gp", "Foyda"]].map(([k, l]) => `<option value="${k}"${HBX.tsort === k ? " selected" : ""}>${l} bo'yicha</option>`).join("")}</select></label>`;
function hbTop() {
  const sl = hbSaleLines(), rl = hbRetLines(), m = {};
  const row = n => m[hbK(n)] || (m[hbK(n)] = { n, qty:0, rev:0, cost:0, rq:0, rrev:0, rcost:0, docs:new Set() });
  sl.forEach(x => { const o = row(x.it.name); o.qty += x.qty; o.rev += x.rev; o.cost += x.cost; o.docs.add(x.s.id); });
  rl.forEach(x => { const o = row(x.it.name); o.rq += x.qty; o.rrev += x.rev; o.rcost += x.cost; });
  const rows = Object.values(m).map(o => ({ n:o.n, cat:hbCat(o.n), qty:o.qty - o.rq, rev:o.rev - o.rrev, gp:(o.rev - o.cost) - (o.rrev - o.rcost), docs:o.docs.size })).filter(r => r.qty || r.rev);
  rows.sort((a, b) => b[HBX.tsort] - a[HBX.tsort]);
  const tot = rows.reduce((a, r) => a + r.rev, 0);
  HBX.last = { head:["#", "Tovar", "Kategoriya", "Soni", "Cheklar", "Savdo", "Ulushi", "Foyda", "Marja"], rows:rows.map((r, i) => [i + 1, r.n, r.cat, r.qty, r.docs, hbN(r.rev), hbPct(r.rev, tot), hbN(r.gp), hbPct(r.gp, r.rev)]) };
  return rows.length ? `<div class="tmeta" style="margin-bottom:8px">Qaytarilganlar ayirilgan. Foyda — FIFO tannarx bo'yicha.</div>` + hbTable(HBX.last.head, rows.slice(0, 200).map((r, i) => [i + 1, `<b>${esc(r.n)}</b>`, `<span class="tmeta">${esc(r.cat)}</span>`, r.qty, r.docs, hbM(r.rev), hbPct(r.rev, tot), `<span class="${r.gp < 0 ? "hbneg" : ""}">${hbM(r.gp)}</span>`, hbPct(r.gp, r.rev)]), null, 3)
    : `<div class="empty-box">Bu davrda Tsunami'da sotuv yo'q</div>`;
}
// --- Qarzdor cheklar ---
HB_REPS["Qarzdor cheklar"] = "hbQarz";
HB_NOPERIOD.add("hbQarz");
HBX.qonly = "";
HB_EXTRA.hbQarz = () => `<label>Ko'rsatish<select data-hb="qonly"><option value=""${HBX.qonly ? "" : " selected"}>Hamma qarzdor cheklar</option><option value="late"${HBX.qonly === "late" ? " selected" : ""}>Faqat muddati o'tganlar</option></select></label><label>Qidirish<input data-hb="q" value="${esc(HBX.q)}" placeholder="mijoz"></label>`;
function hbQarz() {
  if (typeof pyDebtSales !== "function") return `<div class="empty-box">Ma'lumotlar hali yuklanmoqda…</div>`;
  const today = nzToday(), q = hbK(HBX.q);
  const rows = pyDebtSales("", "").map(s => { const c = nzCli(s.client), t = nzTerm(c), days = nzDays(s.date, today), con = nzInContract(s); return { s, left:qtDebtLeft(s), days, t, late:!con && t != null && days > t, con }; })
    .filter(r => (!q || hbK(r.s.client).indexOf(q) >= 0) && (!HBX.qonly || r.late)).sort((a, b) => b.days - a.days);
  const tot = rows.reduce((a, r) => a + hbC(r.left, r.s.currency, r.s.rate), 0), late = rows.filter(r => r.late).reduce((a, r) => a + hbC(r.left, r.s.currency, r.s.rate), 0);
  HBX.last = { head:["Sana", "Chek", "Mijoz", "Sotuvchi", "Summa", "Qolgan qarz", "Valyuta", "Kun", "Muddat", "Holat"], rows:rows.map(r => [r.s.date.slice(0, 10), r.s.number, r.s.client, r.s.seller, r.s.total, r.left, r.s.currency, r.days, r.t == null ? "" : r.t, r.con ? "Bo'lib to'lash" : r.late ? "Muddati o'tgan" : ""]) };
  return rows.length ? `<div class="hbtiles"><div class="hbtile"><div class="l">Qarzdor cheklar</div><div class="v">${rows.length}</div></div><div class="hbtile"><div class="l">Jami qolgan qarz</div><div class="v">${hbM(tot)}</div></div><div class="hbtile neg"><div class="l">Shundan muddati o'tgan</div><div class="v">${hbM(late)}</div><div class="s">${rows.filter(r => r.late).length} ta chek</div></div></div>`
    + hbTable(["Sana", "Chek", "Mijoz", "Sotuvchi", "Summa", "Qolgan qarz", "Necha kun", "Holat"], rows.map(r => [esc(r.s.date.slice(0, 10)), "№" + r.s.number, `<b>${esc(r.s.client)}</b>`, esc(r.s.seller) || "—", krMoney(r.s.total, r.s.currency), `<b>${krMoney(r.left, r.s.currency)}</b>`, r.days + (r.t != null ? ` <span class="tmeta">/ ${r.t}</span>` : ""), r.con ? `<span class="st st-yangi">Bo'lib to'lash</span>` : r.late ? `<span class="st st-late">Muddati o'tgan</span>` : "—"]), null, 4)
    : `<div class="empty-box">Qarzdor chek yo'q</div>`;
}
// --- Sotuv rejasi (o'z rejasi: «Sotuv rejalari» varag'i) ---
const SR_RANGE = "'Sotuv rejalari'!A1:F3000";
const SR = { list:[], raw:0, state:"loading", busy:false, msg:"" };
function srApply(vals) { const v = Array.isArray(vals) ? vals : []; SR.raw = v.length; SR.list = []; v.forEach((r, i) => { if (i && Array.isArray(r) && r[0]) SR.list.push({ row:i + 1, id:String(r[0]), month:String(r[1] || ""), seller:String(r[2] || "").trim(), dept:String(r[3] || "").trim(), plan:Number(r[4]) || 0 }); }); SR.state = "ok"; }
async function srReload() { const r = await NZ.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:SR_RANGE }, { cache:false }); srApply(krVals({ result:r })); }
// Bito rejasi (eski) ustiga Tsunami rejasi qo'yiladi — KPI va sotuv formasi ham shundan foydalanadi
if (typeof planMap === "function") {
  const srOrigPlan = planMap;
  planMap = function (month) {
    const m = srOrigPlan(), mo = month || nzToday().slice(0, 7);
    SR.list.filter(r => r.month === mo && r.seller).forEach(r => { m[r.seller] = { dept:r.dept || (m[r.seller] ? m[r.seller].dept : ""), plan:r.plan }; });
    return m;
  };
}
HB_REPS["Sotuv rejasi"] = "hbReja";
HB_NOPERIOD.add("hbReja");
HBX.rmonth = "";
HB_EXTRA.hbReja = () => `<label>Oy<input type="month" id="srMonth" value="${esc(HBX.rmonth || nzToday().slice(0, 7))}"></label>`;
function srFact(month) {
  const f = {}, back = {};
  (typeof QT !== "undefined" ? QT.list : []).filter(r => !r.cancelled).forEach(r => { back[r.saleId] = (back[r.saleId] || 0) + (Number(r.total) || 0); });
  SL.list.filter(s => !s.cancelled && s.date.slice(0, 7) === month).forEach(s => {
    const k = s.seller || "(sotuvchi ko'rsatilmagan)", net = s.total - (back[s.id] || 0), r = nzRate(s.rate);
    const o = f[k] || (f[k] = { uzs:0, n:0, noRate:0 }); o.n++;
    if (s.currency === "USD") { if (r > 0) o.uzs += net * r; else o.noRate++; } else o.uzs += net;
  });
  return f;
}
function hbReja() {
  const mo = HBX.rmonth || nzToday().slice(0, 7), pm = planMap(mo), fact = srFact(mo), names = [...new Set(Object.keys(pm).concat(Object.keys(fact)))].filter(Boolean);
  const own = new Set(SR.list.filter(r => r.month === mo).map(r => r.seller));
  names.sort((a, b) => ((fact[b] || {}).uzs || 0) - ((fact[a] || {}).uzs || 0));
  let tp = 0, tf = 0;
  const rows = names.map(n => { const p = pm[n], f = fact[n] || { uzs:0, n:0 }, pct = p && p.plan ? Math.round(f.uzs / p.plan * 100) : null; tp += p ? p.plan : 0; tf += f.uzs; return { n, p, f, pct }; });
  HBX.last = { head:["Sotuvchi", "Bo'lim", "Oylik reja, so'm", "Fakt, so'm", "Cheklar", "Bajarildi"], rows:rows.map(r => [r.n, r.p ? r.p.dept : "", r.p ? r.p.plan : "", Math.round(r.f.uzs), r.f.n, r.pct == null ? "" : r.pct + "%"]) };
  const srcNote = `<div class="tmeta" style="margin-bottom:8px">Fakt — Tsunami sotuvlari (qaytarishlar ayirilgan, dollar sotuvlari kurs bo'yicha so'mga). Rejani shu yerning o'zida kiriting yoki o'zgartiring${SR.msg ? " · " + esc(SR.msg) : ""}.</div>`;
  const body = rows.map(r => `<tr><td><b>${esc(r.n)}</b>${r.p && !own.has(r.n) && r.p.plan ? `<div class="tmeta">reja Bito'dan</div>` : ""}</td><td><input data-srdept="${esc(r.n)}" value="${esc(r.p ? r.p.dept : "")}" placeholder="bo'lim" style="width:130px"></td><td class="num"><input type="number" min="0" step="100000" data-srplan="${esc(r.n)}" value="${r.p && r.p.plan ? r.p.plan : ""}" placeholder="—" style="width:130px"></td><td class="num">${krMoney(r.f.uzs, "UZS")}${r.f.noRate ? `<div class="tmeta hbneg">${r.f.noRate} ta $ sotuv kurssiz</div>` : ""}</td><td class="num">${r.f.n}</td><td class="num">${r.pct == null ? "—" : `<span class="pct ${r.pct >= 100 ? "ok" : r.pct >= 70 ? "mid" : "low"}">${r.pct}%</span>`}</td></tr>`).join("");
  return srcNote + `<table><thead><tr><th>Sotuvchi</th><th>Bo'lim</th><th class="num">Oylik reja, so'm</th><th class="num">Fakt</th><th class="num">Cheklar</th><th class="num">Bajarildi</th></tr></thead><tbody>${body}`
    + `<tr><td><input id="srNewName" list="slSellers" placeholder="+ sotuvchi qo'shish" style="width:170px"></td><td><input id="srNewDept" placeholder="bo'lim" style="width:130px"></td><td class="num"><input type="number" id="srNewPlan" min="0" step="100000" placeholder="reja" style="width:130px"></td><td colspan="3"><button type="button" class="mini" id="srAdd">Qo'shish</button></td></tr>`
    + (rows.length ? `<tr class="tot"><td>Jami</td><td></td><td class="num">${krMoney(tp, "UZS")}</td><td class="num">${krMoney(tf, "UZS")}</td><td></td><td class="num">${tp ? Math.round(tf / tp * 100) + "%" : "—"}</td></tr>` : "") + `</tbody></table>`;
}
async function srSet(seller, plan, dept) {
  seller = String(seller || "").trim(); if (!seller || !NZ.mcp || SR.busy) return;
  const mo = HBX.rmonth || nzToday().slice(0, 7); SR.busy = true;
  try {
    await srReload();
    const ex = SR.list.find(r => r.month === mo && nzK(r.seller) === nzK(seller)), base = planMap(mo)[seller] || {}, now = krT(new Date().toISOString());
    const p = plan == null ? (ex ? ex.plan : base.plan || 0) : plan, d = dept == null ? (ex ? ex.dept : base.dept || "") : dept;
    if (ex) await NZ.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Sotuv rejalari'!D${ex.row}:F${ex.row}`, values:[[krT(d), p, now]] });
    else {
      if (!SR.raw) await NZ.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Sotuv rejalari'!A1", values:[["ID", "Oy", "Sotuvchi", "Bo'lim", "Reja (so'm)", "O'zgargan"]] });
      await NZ.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Sotuv rejalari'!A1", values:[[krT(nzId("SR")), krT(mo), krT(seller), krT(d), p, now]] });
    }
    await srReload(); SR.msg = `${seller}: ${mo} rejasi saqlandi`;
  } catch (e) { SR.msg = krCodeMsg(e && e.code) || "Saqlab bo'lmadi"; }
  SR.busy = false; if (hbCur() === "hbReja") hbRender(true);
}
$("hbApp").addEventListener("change", e => {
  const t = e.target;
  if (t.id === "srMonth") { HBX.rmonth = t.value; hbRender(true); return; }
  if (t.dataset.srplan != null) srSet(t.dataset.srplan, Number(t.value) || 0, null);
  else if (t.dataset.srdept != null) srSet(t.dataset.srdept, null, t.value.trim());
});
$("hbApp").addEventListener("click", e => {
  if (e.target.id !== "srAdd") return;
  const n = $("srNewName").value.trim(); if (!n) return;
  srSet(n, Number($("srNewPlan").value) || 0, $("srNewDept").value.trim());
});

// ======================= yuklash =======================
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) return;
  NZ.mcp = mcp;
  try { mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:MQ_RANGE }, ev => { if (ev.type === "data" && !MQ.busy) { mqApply(krVals(ev)); if (document.body.classList.contains("omQtApp-on")) qtqRender(); } }, { refetchInterval:300000 }); } catch (e) {}
  try { mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:SR_RANGE }, ev => { if (ev.type === "data" && !SR.busy) { srApply(krVals(ev)); if (typeof hbCur === "function" && hbCur() === "hbReja") hbRender(true); } }, { refetchInterval:300000 }); } catch (e) {}
})();
// «hozirgi holat» hisobotlarida davr tugmalari yashirin turishi uchun
(function () { const st = document.createElement("style"); st.textContent = "#hbApp [hidden]{display:none!important}"; document.head.appendChild(st); })();
if (typeof hbRoute === "function") hbRoute();
