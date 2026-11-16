// ===== Tsunami: Sotuv → Mijozlar to'lovlari va Bo'lib to'lash (Google Drive bazasida) =====
// Asosiy sahifadan keyin yuklanadi; payActive, payBySale, PAY, BOL sahifaning o'zida e'lon qilingan.
const PY_SHEET = "'Mijoz to‘lovlari'", BL_SHEET = "'Bo‘lib to‘lash'";
const PY_RANGE = PY_SHEET + "!A1:N5000", BL_RANGE = BL_SHEET + "!A1:P2000";
const PY_PAY = ["Naqd", "Karta", "Terminal", "O'tkazma"];
PAY = { list:PAY ? PAY.list : [], state:"loading", busy:false, filter:"all", q:"", pendCancel:"", msg:"", msgT:null, mcp:null };
BOL = { list:BOL ? BOL.list : [], state:"loading", busy:false, filter:"active", q:"", open:"", pendCancel:"", msg:"", msgT:null, mcp:null };
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
function pyRound(n, cur) { return cur === "USD" ? Math.round(n * 100) / 100 : Math.round(n / 1000) * 1000; }
function addMonths(d, k) { const [y, m, dd] = String(d).split("-").map(Number); const t = new Date(Date.UTC(y, m - 1 + k, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(dd, last)); return t.toISOString().slice(0, 10); }
function todayStr() { return new Date().toLocaleDateString("en-CA"); }
function pyFmsg(m, bad) { const x = $("pyFmsg"); x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function blFmsg(m, bad) { const x = $("blFmsg"); x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function pySay(m) { PAY.msg = m; clearTimeout(PAY.msgT); PAY.msgT = setTimeout(() => { PAY.msg = ""; pyRender(); }, 6000); pyRender(); }
function blSay(m) { BOL.msg = m; clearTimeout(BOL.msgT); BOL.msgT = setTimeout(() => { BOL.msg = ""; blRender(); }, 6000); blRender(); }
function stLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
(function pyBuild() {
  const a = document.createElement("div");
  a.id = "payApp";
  a.innerHTML = `<div class="panel fpanel"><div class="thead"><h3>To'lov qabul qilish</h3><button type="button" class="closebtn" data-close="payApp">Yopish ✕</button></div>
    <form id="pyForm" class="kform">
      <div class="kgrid">
        <label>To'lov sanasi<input type="date" id="pyDate" required></label>
        <label>Mijoz<input id="pyClient" list="pyClients" maxlength="160" placeholder="Mijoz ismi"></label>
        <label>Valyuta<select id="pyCur"><option value="UZS">UZS (so'm)</option><option value="USD">USD ($)</option></select></label>
        <label>Summa<span class="inrow"><input type="number" id="pySum" min="0" step="any" placeholder="0"><button type="button" id="pyFull" class="mini">Butun qarz</button></span></label>
        <label>To'lov turi<select id="pyType">${PY_PAY.map(p => `<option>${p}</option>`).join("")}</select></label>
        <label>Qaysi qarzga<select id="pySale"></select></label>
      </div>
      <label class="full">Izoh<input id="pyNote" maxlength="300" placeholder="ixtiyoriy"></label>
      <div id="pyInfo" class="tmeta"></div>
      <div class="ktotal" id="pyPlan"></div>
      <div class="kbtns"><button type="button" class="pri" id="pySave">To'lovni saqlash</button></div>
      <div class="status" id="pyFmsg"></div>
    </form></div>
    <div class="panel"><div class="thead"><h3>Qarzdor mijozlar</h3></div><div id="pyDebtors"></div></div>
    <div class="panel"><div class="thead"><h3>Qabul qilingan to'lovlar</h3><div class="hbtns"><input class="search" id="pyQ" placeholder="Qidirish: mijoz, sotuv №"><div class="filters" id="pyFilters"></div><button type="button" class="openbtn" data-open="payApp">+ To'lov qabul qilish</button></div></div>
    <div class="status" id="pyStatus"></div><div id="pyList"></div></div>`;
  $("kirimApp").parentNode.insertBefore(a, $("kirimApp"));
  const b = document.createElement("div");
  b.id = "bolApp";
  b.innerHTML = `<div class="panel fpanel"><div class="thead"><h3>Yangi bo'lib to'lash shartnomasi</h3><button type="button" class="closebtn" data-close="bolApp">Yopish ✕</button></div>
    <form id="blForm" class="kform">
      <div class="kgrid">
        <label class="span2">Qarzga qilingan sotuv<select id="blSale"></select></label>
        <label>Shartnoma sanasi<input type="date" id="blDate" required></label>
        <label>Birinchi to'lov sanasi<input type="date" id="blFirst" required></label>
        <label>Necha oyga<select id="blMonths">${[2, 3, 4, 5, 6, 8, 9, 10, 12, 18, 24].map(n => `<option value="${n}"${n === 3 ? " selected" : ""}>${n} oy</option>`).join("")}</select></label>
      </div>
      <label class="full">Izoh<input id="blNote" maxlength="300" placeholder="ixtiyoriy"></label>
      <div id="blInfo" class="tmeta"></div>
      <div class="ktable"><table><thead><tr><th>#</th><th>To'lov sanasi</th><th>Summa</th></tr></thead><tbody id="blRows"></tbody></table></div>
      <div class="kbtns"><button type="button" class="pri" id="blSave">Shartnomani saqlash</button></div>
      <div class="status" id="blFmsg"></div>
    </form></div>
    <div class="panel"><div class="thead"><h3>Bo'lib to'lash shartnomalari</h3><div class="hbtns"><input class="search" id="blQ" placeholder="Qidirish: mijoz, sotuv №"><div class="filters" id="blFilters"></div><button type="button" class="openbtn" data-open="bolApp">+ Yangi shartnoma</button></div></div>
    <div class="status" id="blStatus"></div><div id="blList"></div></div>`;
  $("kirimApp").parentNode.insertBefore(b, $("kirimApp"));
  const dl = document.createElement("div"); dl.innerHTML = `<datalist id="pyClients"></datalist>`; document.body.appendChild(dl);
})();

// ---------- Ma'lumotni o'qish ----------
function pyParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    let alloc = []; try { alloc = JSON.parse(r[8] || "[]"); } catch (e) { alloc = []; }
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, cancelled:String(r[2] || "") === "Bekor qilingan", date:String(r[3] || ""), client:String(r[4] || ""), currency:String(r[5] || "UZS"), total:Number(r[6]) || 0, payType:String(r[7] || ""), alloc:Array.isArray(alloc) ? alloc : [], advance:Number(r[9]) || 0, note:String(r[10] || ""), createdAt:String(r[11] || ""), cancelledAt:String(r[12] || ""), contract:String(r[13] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function blParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    let plan = []; try { plan = JSON.parse(r[12] || "[]"); } catch (e) { plan = []; }
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, cancelled:String(r[2] || "") === "Bekor qilingan", date:String(r[3] || ""), client:String(r[4] || ""), saleId:String(r[5] || ""), saleNo:Number(r[6]) || 0, currency:String(r[7] || "UZS"), amount:Number(r[8]) || 0, months:Number(r[9]) || 0, first:String(r[10] || ""), monthly:Number(r[11]) || 0, plan:Array.isArray(plan) ? plan : [], note:String(r[13] || ""), createdAt:String(r[14] || ""), cancelledAt:String(r[15] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function pyAfter() { if (typeof slRender === "function") slRender(); if (PARTY.cliApp) PARTY.cliApp.render(); pyRender(); blRender(); if ($("payApp").classList.contains("fopen")) pyPlanDraw(); }
function pyApply(vals) { PAY.list = pyParse(vals); PAY.state = "ok"; pyAfter(); }
function blApply(vals) { BOL.list = blParse(vals); BOL.state = "ok"; blRender(); }
async function pyReload() { const r = await PAY.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:PY_RANGE }, { cache:false }); pyApply(krVals({ result:r })); }
async function blReload() { const r = await BOL.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:BL_RANGE }, { cache:false }); blApply(krVals({ result:r })); }

// ---------- Qarzlar ----------
function pyKey(n) { return String(n || "").trim().toLowerCase(); }
function pyDebtSales(client, cur) {
  const k = pyKey(client);
  return SL.list.filter(s => !s.cancelled && (!client || pyKey(s.client) === k) && (!cur || s.currency === cur) && qtDebtLeft(s) > 0.005)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.number - b.number);
}
function pyDebtors() {
  const m = {};
  pyDebtSales("", "").forEach(s => {
    const k = pyKey(s.client), o = m[k] || (m[k] = { name:s.client, cur:{}, n:0, oldest:s.date });
    o.cur[s.currency] = r2((o.cur[s.currency] || 0) + qtDebtLeft(s)); o.n++;
  });
  return Object.values(m).sort((a, b) => String(a.oldest).localeCompare(String(b.oldest)));
}
function pyAdvance(client, cur) { const k = pyKey(client); return r2(payActive().filter(p => pyKey(p.client) === k && p.currency === cur).reduce((a, p) => a + p.advance, 0)); }

// ---------- To'lov formasi ----------
function pyClientsFill() {
  const names = new Set(pyDebtors().map(d => d.name));
  (PARTY.cliApp ? PARTY.cliApp.list : []).forEach(c => names.add(c.name));
  $("pyClients").innerHTML = [...names].map(n => `<option value="${esc(n)}">`).join("");
}
function pyClientName() { const v = $("pyClient").value.trim(); const d = pyDebtors().find(x => pyKey(x.name) === pyKey(v)); const c = PARTY.cliApp ? PARTY.cliApp.list.find(x => pyKey(x.name) === pyKey(v)) : null; return d ? d.name : c ? c.name : v; }
function pySalesFill(keep) {
  const client = pyClientName(), cur = $("pyCur").value, prev = keep || $("pySale").value;
  const list = client ? pyDebtSales(client, cur) : [];
  $("pySale").innerHTML = `<option value="">Avtomatik: eng eski qarzdan boshlab</option>` + list.map(s => `<option value="${esc(s.id)}"${s.id === prev ? " selected" : ""}>№${s.number} · ${esc(s.date.slice(0, 10))} · qarz ${krMoney(qtDebtLeft(s), s.currency)}</option>`).join("");
}
function pyAllocate(client, cur, sum, saleId) {
  let left = r2(sum); const alloc = [];
  let list = pyDebtSales(client, cur);
  if (saleId) { const s = list.find(x => x.id === saleId); if (s) list = [s].concat(list.filter(x => x.id !== saleId)); }
  for (const s of list) { if (left <= 0.005) break; const d = qtDebtLeft(s), take = r2(Math.min(d, left)); if (take > 0) { alloc.push({ saleId:s.id, no:s.number, sum:take }); left = r2(left - take); } }
  return { alloc, advance:left > 0.005 ? left : 0 };
}
function pyPlanDraw() {
  const client = pyClientName(), cur = $("pyCur").value, sum = Number($("pySum").value) || 0;
  const debt = client ? r2(pyDebtSales(client, cur).reduce((a, s) => a + qtDebtLeft(s), 0)) : 0;
  const adv = client ? pyAdvance(client, cur) : 0;
  $("pyInfo").innerHTML = client ? `${esc(client)}: qarz <b class="${debt > 0.005 ? "balpos" : ""}">${krMoney(debt, cur)}</b>` + (adv > 0.005 ? ` · avvalgi avans ${krMoney(adv, cur)}` : "") : "";
  if (!client || !(sum > 0)) { $("pyPlan").textContent = ""; return; }
  const p = pyAllocate(client, cur, sum, $("pySale").value);
  $("pyPlan").innerHTML = (p.alloc.length ? p.alloc.map(a => `<div class="tmeta">Sotuv №${a.no} qarziga: ${krMoney(a.sum, cur)}</div>`).join("") : "")
    + (p.advance > 0 ? `<div class="tmeta">Qarzdan ortgani avans bo'lib yoziladi: <b>${krMoney(p.advance, cur)}</b></div>` : "")
    + `<div>Jami: <b>${krMoney(sum, cur)}</b>${debt - sum > 0.005 ? ` · qoladigan qarz ${krMoney(debt - sum, cur)}` : ""}</div>`;
}
function pyReset() {
  $("pyDate").value = todayStr();
  ["pyClient", "pySum", "pyNote"].forEach(id => { $(id).value = ""; });
  $("pyCur").value = "UZS"; $("pyType").value = PY_PAY[0]; PAY.contract = "";
  pyClientsFill(); pySalesFill(""); pyPlanDraw(); pyFmsg("");
}
function pyStartFor(saleId, contractId) {
  const s = SL.list.find(x => x.id === saleId); if (!s) return;
  const i = current.subs.findIndex(x => x.n === "Mijozlar to'lovlari"); if (i < 0) return;
  renderSub(i); pyReset(); openForm("payApp", true);
  $("pyClient").value = s.client; $("pyCur").value = s.currency; PAY.contract = contractId || "";
  pySalesFill(s.id); $("pySale").value = s.id;
  const c = contractId ? BOL.list.find(x => x.id === contractId) : null, nx = c ? blStatus(c).next : null;
  $("pySum").value = nx ? Math.min(nx.due, qtDebtLeft(s)) : qtDebtLeft(s);
  pyPlanDraw();
}
async function pySave() {
  if (PAY.busy) return;
  if (!PAY.mcp) return pyFmsg(krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const date = $("pyDate").value, cur = $("pyCur").value, sum = r2($("pySum").value), type = $("pyType").value, note = $("pyNote").value.trim(), saleId = $("pySale").value;
  const client = pyClientName();
  if (!date) return pyFmsg("To'lov sanasini kiriting.", true);
  if (!client) return pyFmsg("Mijozni tanlang.", true);
  if (pyKey(client) === pyKey(SL_WALKIN)) return pyFmsg(`«${SL_WALKIN}» uchun to'lov yozilmaydi: aniq mijozni tanlang.`, true);
  if (!(sum > 0)) return pyFmsg("To'lov summasini kiriting.", true);
  const known = (PARTY.cliApp ? PARTY.cliApp.list : []).some(c => pyKey(c.name) === pyKey(client)) || pyDebtors().some(d => pyKey(d.name) === pyKey(client));
  if (!known) return pyFmsg(`«${client}» mijozlar ro'yxatida yo'q: avval CRM → Mijozlar bo'limida yarating.`, true);
  PAY.busy = true; $("pySave").disabled = true;
  let step = "read";
  try {
    await slReload(); try { if (QT && QT.mcp) await qtReload(); } catch (e) {} await pyReload();
    const p = pyAllocate(client, cur, sum, saleId);
    const now = new Date().toISOString(), id = "P" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const number = PAY.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    const contract = PAY.contract && p.alloc.some(a => { const c = BOL.list.find(x => x.id === PAY.contract); return c && c.saleId === a.saleId; }) ? PAY.contract : "";
    const row = [krT(id), number, "Qabul qilingan", krT(date), krT(client), cur, sum, type, krT(JSON.stringify(p.alloc)), p.advance, krT(note), krT(now), "", krT(contract)];
    step = "write";
    await PAY.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:PY_SHEET + "!A1", values:[row] });
    pySay(`To'lov №${number} saqlandi: ${client} — ${krMoney(sum, cur)}${p.advance > 0 ? `, shundan avans ${krMoney(p.advance, cur)}` : ""}.`);
    pyReset(); openForm("payApp", false);
    try { await pyReload(); } catch (e) {}
  } catch (e) {
    if (e) { const m = krCodeMsg(e.code); pyFmsg(m || (step === "write" ? "Javob kelmadi: to'lov saqlangan bo'lishi ham mumkin. Ro'yxatni tekshiring." : "Bazaga ulanib bo'lmadi, qayta urinib ko'ring."), true); }
  }
  PAY.busy = false; $("pySave").disabled = false;
}
async function pyCancel(id) {
  if (PAY.busy || !PAY.mcp) return;
  PAY.busy = true;
  try {
    await pyReload();
    const p = PAY.list.find(x => x.id === id); if (!p || p.cancelled) throw null;
    await PAY.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`${PY_SHEET}!C${p.row}`, values:[["Bekor qilingan"]] });
    await PAY.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`${PY_SHEET}!M${p.row}`, values:[[krT(new Date().toISOString())]] });
    pySay(`To'lov №${p.number} bekor qilindi, qarz qayta tiklandi.`);
    try { await pyReload(); } catch (e) {}
  } catch (e) { if (e) pySay(krCodeMsg(e.code) || "Bekor qilib bo'lmadi, qayta urinib ko'ring."); }
  PAY.busy = false; PAY.pendCancel = "";
}
function pyRender() {
  if (!$("pyList")) return;
  const ds = pyDebtors();
  $("pyDebtors").innerHTML = SL.state !== "ok" ? `<div class="empty-box">${esc(stLine(SL, "Sotuvlar"))}</div>` : !ds.length ? `<div class="empty-box">Qarzdor mijoz yo'q</div>`
    : `<table><thead><tr><th>Mijoz</th><th>Qarz</th><th>Qarzli sotuvlar</th><th>Eng eski qarz</th><th></th></tr></thead><tbody>` + ds.map(d => `<tr><td><b>${esc(d.name)}</b></td><td class="num">${Object.entries(d.cur).map(([c, v]) => `<span class="balpos">${krMoney(v, c)}</span>`).join("<br>")}</td><td class="num">${d.n}</td><td>${esc(String(d.oldest).slice(0, 10))}</td><td class="krAct">${PAY.mcp ? `<button data-pyfor="${esc(d.name)}">To'lov qabul qilish</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
  const today = todayStr(), active = payActive();
  const counts = { all:PAY.list.length, today:active.filter(p => p.date.slice(0, 10) === today).length, cancelled:PAY.list.length - active.length };
  $("pyFilters").innerHTML = [["all", "Barchasi"], ["today", "Bugun"], ["cancelled", "Bekor qilingan"]].map(([k, l]) => `<button data-f="${k}" class="${PAY.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  const sumT = {}; active.filter(p => p.date.slice(0, 10) === today).forEach(p => { sumT[p.currency] = (sumT[p.currency] || 0) + p.total; });
  $("pyStatus").textContent = [stLine(PAY, "To'lovlar"), PAY.msg, Object.keys(sumT).length ? "Bugun qabul qilingan: " + Object.entries(sumT).map(([c, v]) => krMoney(v, c)).join(" + ") : ""].filter(Boolean).join(" · ");
  const q = PAY.q.trim().toLowerCase();
  const list = PAY.list.filter(p => (PAY.filter === "all" || (PAY.filter === "today" ? !p.cancelled && p.date.slice(0, 10) === today : p.cancelled))
    && (!q || p.client.toLowerCase().indexOf(q) >= 0 || p.alloc.some(a => String(a.no) === q.replace(/^№/, ""))));
  if (!list.length) { $("pyList").innerHTML = `<div class="empty-box">${PAY.state === "ok" ? (PAY.list.length ? "Hech narsa topilmadi" : "Hozircha to'lov yo'q") : ""}</div>`; return; }
  $("pyList").innerHTML = `<table><thead><tr><th>№</th><th>Sana</th><th>Mijoz</th><th>Summa</th><th>To'lov turi</th><th>Qaysi qarzga</th><th>Avans</th><th>Holat</th><th></th></tr></thead><tbody>`
    + list.slice(0, 300).map(p => `<tr class="${p.cancelled ? "slx" : ""}"><td>${esc(p.number)}</td><td>${esc(p.date.slice(0, 10))}</td><td>${esc(p.client)}</td><td class="num">${krMoney(p.total, p.currency)}</td><td>${esc(p.payType)}</td>`
      + `<td>${p.alloc.length ? p.alloc.map(a => `№${esc(a.no)}: ${krMoney(Number(a.sum) || 0, p.currency)}`).join("<br>") : "—"}${p.note ? `<div class="tmeta">${esc(p.note)}</div>` : ""}</td><td class="num">${p.advance > 0.005 ? krMoney(p.advance, p.currency) : "—"}</td>`
      + `<td>${p.cancelled ? `<span class="st st-draft">Bekor qilingan</span>` : `<span class="st st-done">Qabul qilingan</span>`}</td><td class="krAct">${!p.cancelled && PAY.mcp ? `<button data-pycancel="${esc(p.id)}">${PAY.pendCancel === p.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
}

// ---------- Bo'lib to'lash ----------
function blPaid(c) { let s = 0; payActive().forEach(p => { if (String(p.createdAt) >= String(c.createdAt)) p.alloc.forEach(a => { if (a.saleId === c.saleId) s += Number(a.sum) || 0; }); }); return r2(s); }
function blStatus(c) {
  const sale = SL.list.find(x => x.id === c.saleId);
  const paid = blPaid(c), left = r2(Math.max(0, Math.min(c.amount - paid, sale ? qtDebtLeft(sale) : c.amount - paid)));
  let cum = 0; const today = todayStr();
  const lines = c.plan.map(p => { const start = cum; cum = r2(cum + p.sum); const got = r2(Math.max(0, Math.min(p.sum, paid - start))); return { date:p.date, sum:p.sum, got, due:r2(p.sum - got), late:p.date < today && got < p.sum - 0.005 }; });
  const closed = c.cancelled ? false : left <= 0.005;
  const next = closed ? null : lines.find(l => l.due > 0.005) || null;
  const late = lines.filter(l => l.late);
  return { paid, left, lines, closed, next, lateSum:r2(late.reduce((a, l) => a + l.due, 0)), lateN:late.length };
}
function blSales() { const busy = new Set(BOL.list.filter(c => !c.cancelled && !blStatus(c).closed).map(c => c.saleId)); return pyDebtSales("", "").filter(s => !busy.has(s.id) && pyKey(s.client) !== pyKey(SL_WALKIN)); }
function blSalesFill(keep) {
  const list = blSales(), prev = keep || $("blSale").value;
  $("blSale").innerHTML = `<option value="">${list.length ? "— qarzli sotuvni tanlang —" : "Shartnoma tuziladigan qarzli sotuv yo'q"}</option>` + list.map(s => `<option value="${esc(s.id)}"${s.id === prev ? " selected" : ""}>№${s.number} · ${esc(s.date.slice(0, 10))} · ${esc(s.client)} · qarz ${krMoney(qtDebtLeft(s), s.currency)}</option>`).join("");
}
function blPlan() {
  const s = SL.list.find(x => x.id === $("blSale").value), n = Number($("blMonths").value) || 1, first = $("blFirst").value;
  if (!s || !first) return null;
  const amount = qtDebtLeft(s), each = pyRound(amount / n, s.currency) || r2(amount / n), plan = [];
  let rest = amount;
  for (let i = 0; i < n; i++) { const v = i === n - 1 ? r2(rest) : Math.min(each, r2(rest)); plan.push({ date:addMonths(first, i), sum:v }); rest = r2(rest - v); }
  return { s, amount, each, plan: plan.filter(p => p.sum > 0.005) };
}
function blDraw() {
  const p = blPlan();
  $("blInfo").innerHTML = p ? `Mijoz: <b>${esc(p.s.client)}</b> · Qolgan qarz: <b class="balpos">${krMoney(p.amount, p.s.currency)}</b> · Oylik to'lov: <b>${krMoney(p.each, p.s.currency)}</b>` : "";
  $("blRows").innerHTML = p ? p.plan.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.date)}</td><td class="num">${krMoney(x.sum, p.s.currency)}</td></tr>`).join("") : `<tr><td colspan="3" class="empty">Sotuvni va birinchi to'lov sanasini tanlang.</td></tr>`;
}
function blReset() {
  $("blDate").value = todayStr(); $("blFirst").value = addMonths(todayStr(), 1); $("blMonths").value = "3"; $("blNote").value = "";
  blSalesFill(""); blDraw(); blFmsg("");
}
async function blSave() {
  if (BOL.busy) return;
  if (!BOL.mcp) return blFmsg(krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const date = $("blDate").value, first = $("blFirst").value, n = Number($("blMonths").value), note = $("blNote").value.trim(), saleId = $("blSale").value;
  if (!saleId) return blFmsg("Qarzga qilingan sotuvni tanlang.", true);
  if (!date || !first) return blFmsg("Sanalarni kiriting.", true);
  if (first < date) return blFmsg("Birinchi to'lov sanasi shartnoma sanasidan oldin bo'lmasin.", true);
  BOL.busy = true; $("blSave").disabled = true;
  let step = "read";
  try {
    await slReload(); try { if (QT && QT.mcp) await qtReload(); } catch (e) {} await pyReload(); await blReload();
    if (!blSales().some(s => s.id === saleId)) { blFmsg("Bu sotuvning qarzi yopilgan yoki unga allaqachon shartnoma tuzilgan.", true); blSalesFill(""); throw null; }
    $("blSale").value = saleId;
    const p = blPlan();
    const now = new Date().toISOString(), id = "B" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const number = BOL.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    const row = [krT(id), number, "Faol", krT(date), krT(p.s.client), krT(p.s.id), p.s.number, p.s.currency, p.amount, n, krT(first), p.each, krT(JSON.stringify(p.plan)), krT(note), krT(now), ""];
    step = "write";
    await BOL.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:BL_SHEET + "!A1", values:[row] });
    blSay(`Shartnoma №${number} tuzildi: ${p.s.client}, ${krMoney(p.amount, p.s.currency)} — ${p.plan.length} oyga, oyiga ${krMoney(p.each, p.s.currency)}.`);
    blReset(); openForm("bolApp", false);
    try { await blReload(); } catch (e) {}
  } catch (e) {
    if (e) { const m = krCodeMsg(e.code); blFmsg(m || (step === "write" ? "Javob kelmadi: shartnoma saqlangan bo'lishi ham mumkin. Ro'yxatni tekshiring." : "Bazaga ulanib bo'lmadi, qayta urinib ko'ring."), true); }
  }
  BOL.busy = false; $("blSave").disabled = false;
}
async function blCancel(id) {
  if (BOL.busy || !BOL.mcp) return;
  BOL.busy = true;
  try {
    await blReload();
    const c = BOL.list.find(x => x.id === id); if (!c || c.cancelled) throw null;
    await BOL.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`${BL_SHEET}!C${c.row}`, values:[["Bekor qilingan"]] });
    await BOL.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`${BL_SHEET}!P${c.row}`, values:[[krT(new Date().toISOString())]] });
    blSay(`Shartnoma №${c.number} bekor qilindi. Sotuv qarzi o'z joyida qoladi.`);
    try { await blReload(); } catch (e) {}
  } catch (e) { if (e) blSay(krCodeMsg(e.code) || "Bekor qilib bo'lmadi, qayta urinib ko'ring."); }
  BOL.busy = false; BOL.pendCancel = "";
}
function blRender() {
  if (!$("blList")) return;
  const rows = BOL.list.map(c => ({ c, st:blStatus(c) }));
  const kind = x => x.c.cancelled ? "cancelled" : x.st.closed ? "closed" : x.st.lateN ? "late" : "active";
  const counts = { active:0, late:0, closed:0, cancelled:0 }; rows.forEach(x => { counts[kind(x)]++; });
  counts.active += counts.late;
  $("blFilters").innerHTML = [["active", "Faol"], ["late", "Muddati o'tgan"], ["closed", "Yopilgan"], ["cancelled", "Bekor qilingan"]].map(([k, l]) => `<button data-f="${k}" class="${BOL.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("blStatus").textContent = [stLine(BOL, "Bo'lib to'lash"), BOL.msg].filter(Boolean).join(" · ");
  const q = BOL.q.trim().toLowerCase();
  const list = rows.filter(x => (BOL.filter === "active" ? kind(x) === "active" || kind(x) === "late" : kind(x) === BOL.filter)
    && (!q || x.c.client.toLowerCase().indexOf(q) >= 0 || String(x.c.saleNo) === q.replace(/^№/, "")));
  if (!list.length) { $("blList").innerHTML = `<div class="empty-box">${BOL.state === "ok" ? (BOL.list.length ? "Bu ro'yxatda shartnoma yo'q" : "Hozircha shartnoma yo'q: qarzga sotilgan tovar uchun «Yangi shartnoma» tuzing") : ""}</div>`; return; }
  const can = !!BOL.mcp;
  $("blList").innerHTML = `<table><thead><tr><th>№</th><th>Mijoz</th><th>Sotuv</th><th>Summa</th><th>To'langan</th><th>Qoldiq</th><th>Keyingi to'lov</th><th>Holat</th><th></th></tr></thead><tbody>`
    + list.map(({ c, st }) => {
      const k = kind({ c, st }), cur = c.currency;
      const badge = k === "cancelled" ? `<span class="st st-draft">Bekor qilingan</span>` : k === "closed" ? `<span class="st st-done">Yopilgan</span>` : k === "late" ? `<span class="st st-late">Muddati o'tgan</span><div class="tmeta late">${st.lateN} ta to'lov, ${krMoney(st.lateSum, cur)}</div>` : `<span class="st st-jarayonda">Faol</span>`;
      let act = `<button data-blview="${esc(c.id)}">${BOL.open === c.id ? "Yopish" : "Jadval"}</button>`;
      if (can && k !== "cancelled" && k !== "closed") act += `<button data-blpay="${esc(c.id)}">To'lov qabul qilish</button><button data-blcancel="${esc(c.id)}">${BOL.pendCancel === c.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>`;
      let row = `<tr class="${c.cancelled ? "slx" : ""}"><td>${esc(c.number)}</td><td><b>${esc(c.client)}</b><div class="tmeta">${esc(c.date.slice(0, 10))} · ${c.months} oy</div></td><td>№${esc(c.saleNo)}</td><td class="num">${krMoney(c.amount, cur)}</td><td class="num">${krMoney(st.paid, cur)}</td><td class="num">${st.left > 0.005 && !c.cancelled ? `<span class="balpos">${krMoney(st.left, cur)}</span>` : "—"}</td>`
        + `<td>${st.next && !c.cancelled ? `${esc(st.next.date)}<div class="tmeta">${krMoney(st.next.due, cur)}</div>` : "—"}</td><td>${badge}</td><td class="krAct">${act}</td></tr>`;
      if (BOL.open === c.id) row += `<tr class="krDet"><td></td><td colspan="8"><table class="bltab"><thead><tr><th>#</th><th>Sana</th><th>Summa</th><th>To'langan</th><th>Holat</th></tr></thead><tbody>`
        + st.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.date)}</td><td class="num">${krMoney(l.sum, cur)}</td><td class="num">${krMoney(l.got, cur)}</td><td>${l.got >= l.sum - 0.005 ? `<span class="st st-done">To'langan</span>` : l.late ? `<span class="st st-late">Kechikkan</span>` : l.got > 0 ? `<span class="st st-jarayonda">Qisman</span>` : `<span class="st st-yangi">Kutilmoqda</span>`}</td></tr>`).join("")
        + `</tbody></table>${c.note ? `<div class="tmeta">Izoh: ${esc(c.note)}</div>` : ""}</td></tr>`;
      return row;
    }).join("") + `</tbody></table>`;
}

// ---------- Hodisalar ----------
$("pyForm").addEventListener("submit", e => e.preventDefault());
$("pySave").addEventListener("click", pySave);
$("pyClient").addEventListener("input", () => { pySalesFill(""); pyPlanDraw(); });
$("pyClient").addEventListener("change", () => { const ds = pyDebtors().find(d => pyKey(d.name) === pyKey($("pyClient").value)); if (ds && !ds.cur[$("pyCur").value]) { const c = Object.keys(ds.cur)[0]; if (c) $("pyCur").value = c; } pySalesFill(""); pyPlanDraw(); });
$("pyCur").addEventListener("change", () => { pySalesFill(""); pyPlanDraw(); });
$("pySale").addEventListener("change", pyPlanDraw);
$("pySum").addEventListener("input", pyPlanDraw);
$("pyFull").addEventListener("click", () => {
  const client = pyClientName(), cur = $("pyCur").value, sid = $("pySale").value;
  const list = client ? pyDebtSales(client, cur) : [], s = sid ? list.find(x => x.id === sid) : null;
  $("pySum").value = s ? qtDebtLeft(s) : r2(list.reduce((a, x) => a + qtDebtLeft(x), 0)) || ""; pyPlanDraw();
});
$("pyFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { PAY.filter = b.dataset.f; pyRender(); } });
$("pyQ").addEventListener("input", e => { PAY.q = e.target.value; pyRender(); });
$("pyList").addEventListener("click", e => { const b = e.target.closest("button[data-pycancel]"); if (!b) return; if (PAY.pendCancel === b.dataset.pycancel) pyCancel(b.dataset.pycancel); else { PAY.pendCancel = b.dataset.pycancel; pyRender(); } });
$("pyDebtors").addEventListener("click", e => {
  const b = e.target.closest("button[data-pyfor]"); if (!b) return;
  pyReset(); openForm("payApp", true); $("pyClient").value = b.dataset.pyfor;
  const ds = pyDebtors().find(d => d.name === b.dataset.pyfor); if (ds) $("pyCur").value = Object.keys(ds.cur)[0];
  pySalesFill(""); pyPlanDraw();
});
$("blForm").addEventListener("submit", e => e.preventDefault());
$("blSave").addEventListener("click", blSave);
["blSale", "blMonths", "blFirst"].forEach(id => $(id).addEventListener("change", blDraw));
$("blFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { BOL.filter = b.dataset.f; blRender(); } });
$("blQ").addEventListener("input", e => { BOL.q = e.target.value; blRender(); });
$("blList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.blview) { BOL.open = BOL.open === b.dataset.blview ? "" : b.dataset.blview; blRender(); }
  else if (b.dataset.blpay) { const c = BOL.list.find(x => x.id === b.dataset.blpay); if (c) pyStartFor(c.saleId, c.id); }
  else if (b.dataset.blcancel) { if (BOL.pendCancel === b.dataset.blcancel) blCancel(b.dataset.blcancel); else { BOL.pendCancel = b.dataset.blcancel; blRender(); } }
});
$("slList").addEventListener("click", e => { const b = e.target.closest("button[data-slpay]"); if (b) pyStartFor(b.dataset.slpay); });
// Sotuvlar yangilanganda qarzdorlar va shartnomalar ham yangilansin
const pyOrigSlApply = slApply;
slApply = function (vals) { pyOrigSlApply(vals); pyRender(); blRender(); if ($("bolApp").classList.contains("fopen")) { blSalesFill(); blDraw(); } };
document.addEventListener("click", e => {
  const o = e.target.closest("[data-open]"); if (!o) return;
  if (o.dataset.open === "payApp") pyReset(); else if (o.dataset.open === "bolApp") blReset();
});
pyReset(); blReset();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { PAY.state = BOL.state = "off"; pyRender(); blRender(); return; }
  PAY.mcp = BOL.mcp = mcp;
  const watch = (o, range, apply) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        const c = ev.error && ev.error.code;
        if (o.state !== "ok" || !o.list.length) o.state = c || "upstream_error";
        pyRender(); blRender();
      }, { refetchInterval:60000 });
    } catch (e) {}
  };
  watch(PAY, PY_RANGE, pyApply); watch(BOL, BL_RANGE, blApply);
})();
if (current && current.id === "sotuv") renderSub(currentSub);
