// ===== Tsunami: Sotuv → Qaytarish (sotilgan tovarni mijozdan qaytarib olish, Google Drive bazasida) =====
// Asosiy sahifadan keyin yuklanadi; yordamchi funksiyalar (qtActive, qtBack, qtImeiMap, qtDebtLeft, qtSaleBadge) sahifaning o'zida.
const QT_RANGE = "Qaytarishlar!A1:R5000";
const QT_REASONS = ["Nuqsonli (brak)", "Mijoz fikridan qaytdi", "Mos kelmadi", "Noto'g'ri tovar berilgan", "Boshqa"];
const QT_PAY = ["Naqd", "Karta", "Terminal", "O'tkazma"];
const QT_DEST = { ombor:"Omborga qaytdi", brak:"Brak (sotuvga chiqmaydi)" };
QT = { list:[], state:"loading", busy:false, filter:"all", q:"", open:"", pendCancel:"", msg:"", msgT:null, mcp:null, saleId:"", units:[] };
function qtFmsg(m, bad) { const x = $("qtFmsg"); x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function qtSay(m) { QT.msg = m; clearTimeout(QT.msgT); QT.msgT = setTimeout(() => { QT.msg = ""; qtRender(); }, 6000); qtRender(); }
(function qtBuild() {
  const el = document.createElement("div");
  el.id = "qaytApp";
  el.innerHTML = `<div class="panel fpanel"><div class="thead"><h3>Yangi qaytarish</h3><button type="button" class="closebtn" data-close="qaytApp">Yopish ✕</button></div>
    <form id="qtForm" class="kform">
      <div class="kgrid">
        <label>Qaytarish kuni<input type="date" id="qtDate" required></label>
        <label class="span2">Qaysi sotuvdan<span class="inrow"><input id="qtSaleQ" class="search" placeholder="Qidirish: sotuv №, mijoz, tovar yoki IMEI"><select id="qtSale"></select></span></label>
      </div>
      <div id="qtSaleInfo" class="tmeta"></div>
      <div class="ktable"><table><thead><tr><th></th><th>Tovar</th><th>IMEI</th><th>Narx</th><th>Qaytariladi</th><th>Qayerga</th></tr></thead><tbody id="qtRows"></tbody></table></div>
      <div class="kgrid">
        <label>Sabab<select id="qtReason">${QT_REASONS.map(r => `<option>${r}</option>`).join("")}</select></label>
        <label>Pul qaytarish turi<select id="qtPay">${QT_PAY.map(p => `<option>${p}</option>`).join("")}</select></label>
      </div>
      <label class="full">Izoh<input id="qtNote" maxlength="300" placeholder="ixtiyoriy"></label>
      <div class="ktotal" id="qtTotal"></div>
      <div class="kbtns"><button type="button" class="pri" id="qtSave">Qaytarishni saqlash</button></div>
      <div class="status" id="qtFmsg"></div>
    </form></div>
    <div class="panel"><div class="thead"><h3>Qaytarishlar</h3><div class="hbtns"><input class="search" id="qtQ" placeholder="Qidirish: mijoz, tovar, IMEI"><div class="filters" id="qtFilters"></div><button type="button" class="openbtn" data-open="qaytApp">+ Yangi qaytarish</button></div></div>
    <div class="status" id="qtStatus"></div><div id="qtList"></div></div>`;
  $("kirimApp").parentNode.insertBefore(el, $("kirimApp"));
})();
function qtParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    let items = []; try { items = JSON.parse(r[15] || "[]"); } catch (e) { items = []; }
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, cancelled:String(r[2] || "") === "Bekor qilingan", date:String(r[3] || ""), saleId:String(r[4] || ""), saleNo:Number(r[5]) || 0, client:String(r[6] || ""), currency:String(r[7] || "UZS"), rate:Number(r[8]) || 0, total:Number(r[9]) || 0, debtCut:Number(r[10]) || 0, cash:Number(r[11]) || 0, payType:String(r[12] || ""), reason:String(r[13] || ""), note:String(r[14] || ""), items:Array.isArray(items) ? items : [], createdAt:String(r[16] || ""), cancelledAt:String(r[17] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function qtApply(vals) {
  QT.list = qtParse(vals); QT.state = "ok"; qtRender();
  if (typeof slRender === "function") slRender();
  if (PARTY.cliApp) PARTY.cliApp.render();
  if (QT.saleId && document.body.classList.contains("qaytApp-on")) qtUnits();
  qtReasonsSub();
}
async function qtReload() { const r = await QT.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:QT_RANGE }, { cache:false }); qtApply(krVals({ result:r })); }
function qtSaleLabel(s) { return `№${s.number} · ${s.date.slice(0, 10)} · ${s.client} · ${krMoney(s.total, s.currency)}`; }
function qtSales() {
  const q = $("qtSaleQ").value.trim().toLowerCase();
  return SL.list.filter(s => !s.cancelled && (!q || String(s.number) === q.replace(/^№/, "") || s.client.toLowerCase().indexOf(q) >= 0
    || s.items.some(it => it.name.toLowerCase().indexOf(q) >= 0 || (it.imeis || []).some(m => m.indexOf(q) >= 0)))).slice(0, 200);
}
function qtSalesFill() {
  const list = qtSales();
  if (QT.saleId && !list.some(s => s.id === QT.saleId)) { const s = SL.list.find(x => x.id === QT.saleId); if (s) list.unshift(s); }
  $("qtSale").innerHTML = `<option value="">${list.length ? "— sotuvni tanlang —" : "Mos sotuv topilmadi"}</option>` + list.map(s => `<option value="${esc(s.id)}"${s.id === QT.saleId ? " selected" : ""}>${esc(qtSaleLabel(s))}</option>`).join("");
}
// Tanlangan sotuvning qaytarish mumkin bo'lgan birliklari: IMEI'li tovar har bir IMEI alohida, qolganlari soni bilan
function qtUnits() {
  const s = SL.list.find(x => x.id === QT.saleId);
  const prev = {}; QT.units.forEach(u => { prev[u.key] = u; });
  QT.units = [];
  if (s) {
    const back = qtBack(s.id);
    s.items.forEach((it, i) => {
      const price = Number(it.price) || 0;
      if (it.imeis && it.imeis.length) it.imeis.forEach(m => {
        const key = "m:" + m, done = (back.imei[m] || 0) > 0, p = prev[key];
        QT.units.push({ key, idx:i, name:it.name, sku:it.sku || "", imei:m, price, max:done ? 0 : 1, on:!done && p ? p.on : false, qty:1, dest:p ? p.dest : "ombor", done });
      });
      else {
        const left = Math.max(0, (Number(it.qty) || 0) - (back.idx[i] || 0)), key = "i:" + i, p = prev[key];
        QT.units.push({ key, idx:i, name:it.name, sku:it.sku || "", imei:"", price, max:left, on:left > 0 && p ? p.on : false, qty:p ? Math.min(p.qty, left) || 1 : 1, dest:p ? p.dest : "ombor", done:left <= 0 });
      }
    });
  }
  qtRowsDraw();
}
function qtRowsDraw() {
  const s = SL.list.find(x => x.id === QT.saleId);
  $("qtSaleInfo").innerHTML = s ? `Mijoz: <b>${esc(s.client)}</b> · Sotuv kuni: ${esc(s.date.slice(0, 10))} · Jami: ${krMoney(s.total, s.currency)} · To'langan: ${krMoney(s.paid, s.currency)}`
    + (qtDebtLeft(s) > 0.005 ? ` · <span class="balpos">Qolgan qarz: ${krMoney(qtDebtLeft(s), s.currency)}</span>` : "") : "";
  if (!s) { $("qtRows").innerHTML = `<tr><td colspan="6" class="empty">Avval sotuvni tanlang. IMEI yozsangiz, sotuv o'zi topiladi.</td></tr>`; qtTotals(); return; }
  $("qtRows").innerHTML = QT.units.map((u, i) => `<tr data-u="${i}" class="${u.done ? "qtdone" : ""}"><td><input type="checkbox" data-f="on"${u.on ? " checked" : ""}${u.done ? " disabled" : ""}></td><td>${esc(u.name)}</td><td class="mono">${u.imei ? esc(u.imei) : "—"}</td><td class="num">${krMoney(u.price, s.currency)}</td>`
    + `<td>${u.done ? `<span class="tmeta">qaytarilgan</span>` : u.imei ? "1 dona" : `<input type="number" class="sm" data-f="qty" min="1" max="${u.max}" step="1" value="${esc(u.qty)}"> <span class="tmeta">/ ${u.max}</span>`}</td>`
    + `<td>${u.done ? "" : `<select data-f="dest">${Object.entries(QT_DEST).map(([k, l]) => `<option value="${k}"${u.dest === k ? " selected" : ""}>${l}</option>`).join("")}</select>`}</td></tr>`).join("");
  qtTotals();
}
function qtCalc() {
  const s = SL.list.find(x => x.id === QT.saleId);
  const sel = QT.units.filter(u => u.on && !u.done);
  const total = Math.round(sel.reduce((a, u) => a + u.price * (u.imei ? 1 : Number(u.qty) || 0), 0) * 100) / 100;
  const debtCut = s ? Math.min(total, qtDebtLeft(s)) : 0;
  return { s, sel, total, debtCut, cash:Math.round((total - debtCut) * 100) / 100 };
}
function qtTotals() {
  const c = qtCalc();
  if (!c.s || !c.sel.length) { $("qtTotal").textContent = c.s ? "Qaytariladigan tovarlarni belgilang." : ""; return; }
  const cur = c.s.currency, qty = c.sel.reduce((a, u) => a + (u.imei ? 1 : Number(u.qty) || 0), 0);
  $("qtTotal").innerHTML = `Qaytariladi: ${qty} dona · <b>${krMoney(c.total, cur)}</b>`
    + (c.debtCut > 0.005 ? `<div class="tmeta">Mijoz qarzidan ayiriladi: ${krMoney(c.debtCut, cur)}</div>` : "")
    + `<div class="tmeta">Mijozga pul qaytariladi: <b>${krMoney(c.cash, cur)}</b></div>`;
  $("qtPay").disabled = c.cash <= 0.005;
}
function qtReset() {
  $("qtDate").value = new Date().toLocaleDateString("en-CA");
  ["qtSaleQ", "qtNote"].forEach(id => { $(id).value = ""; });
  qrFillSelect(); $("qtReason").value = qtReasons()[0]; $("qtPay").value = QT_PAY[0]; $("qtPay").disabled = false;
  QT.saleId = ""; QT.units = []; qtSalesFill(); qtRowsDraw(); qtFmsg("");
}
function qtPick(id, imei) {
  QT.saleId = id; QT.units = []; qtSalesFill(); qtUnits();
  if (imei) { const u = QT.units.find(x => x.imei === imei && !x.done); if (u) { u.on = true; qtRowsDraw(); } }
}
async function qtSave() {
  if (QT.busy) return;
  if (!QT.mcp) return qtFmsg(krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const date = $("qtDate").value, reason = $("qtReason").value, note = $("qtNote").value.trim();
  if (!date) return qtFmsg("Qaytarish kunini kiriting.", true);
  if (!QT.saleId) return qtFmsg("Qaysi sotuvdan qaytayotganini tanlang.", true);
  const pick = QT.units.filter(u => u.on && !u.done);
  if (!pick.length) return qtFmsg("Kamida bitta tovarni belgilang.", true);
  for (const u of pick) if (!u.imei) { const q = Number(u.qty); if (!(q > 0) || Math.floor(q) !== q || q > u.max) return qtFmsg(`«${u.name}»: qaytariladigan son 1 dan ${u.max} gacha bo'lsin.`, true); }
  QT.busy = true; $("qtSave").disabled = true;
  let step = "read";
  try {
    await slReload(); await qtReload(); try { if (PAY && PAY.mcp) await pyReload(); } catch (e) {}
    const s = SL.list.find(x => x.id === QT.saleId);
    if (!s || s.cancelled) { qtFmsg("Bu sotuv bekor qilingan yoki topilmadi.", true); throw null; }
    const back = qtBack(s.id);
    for (const u of pick) {
      if (u.imei && (back.imei[u.imei] || 0) > 0) { qtFmsg(`IMEI ${u.imei} allaqachon qaytarilgan.`, true); qtUnits(); throw null; }
      if (!u.imei) { const it = s.items[u.idx], left = (Number(it && it.qty) || 0) - (back.idx[u.idx] || 0); if (Number(u.qty) > left) { qtFmsg(`«${u.name}»: faqat ${left} dona qaytarish mumkin.`, true); qtUnits(); throw null; } }
    }
    // Bir xil tovar qatori va joyi bo'yicha guruhlash
    const groups = {};
    pick.forEach(u => { const k = u.idx + "|" + u.dest; const g = groups[k] || (groups[k] = { idx:u.idx, name:u.name, sku:u.sku, price:u.price, dest:u.dest, qty:0, imeis:[] }); if (u.imei) { g.imeis.push(u.imei); g.qty++; } else g.qty += Number(u.qty); });
    const items = Object.values(groups);
    const total = Math.round(items.reduce((a, it) => a + it.qty * it.price, 0) * 100) / 100;
    const debtCut = Math.min(total, qtDebtLeft(s));
    const cash = Math.round((total - debtCut) * 100) / 100;
    const now = new Date().toISOString(), id = "Q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const number = QT.list.reduce((m, r) => Math.max(m, r.number), 0) + 1;
    const row = [krT(id), number, "Yakunlangan", krT(date), krT(s.id), s.number, krT(s.client), s.currency, s.rate || "", total, debtCut, cash, cash > 0.005 ? $("qtPay").value : "", krT(reason), krT(note), krT(JSON.stringify(items)), krT(now), ""];
    step = "write";
    await QT.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Qaytarishlar!A1", values:[row] });
    step = "items";
    const irows = [];
    items.forEach(it => {
      const base = [krT(id), number, krT(date), s.number, krT(s.client), krT(it.name), krT(it.sku)];
      if (it.imeis.length) it.imeis.forEach(m => irows.push(base.concat([1, it.price, s.currency, it.price, krT(m), QT_DEST[it.dest]])));
      else irows.push(base.concat([it.qty, it.price, s.currency, it.qty * it.price, "", QT_DEST[it.dest]]));
    });
    await QT.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Qaytarish tovarlari'!A1", values:irows });
    qtSay(`Qaytarish №${number} saqlandi: ${krMoney(total, s.currency)}${debtCut > 0.005 ? `, qarzdan ayirildi ${krMoney(debtCut, s.currency)}` : ""}${cash > 0.005 ? `, mijozga qaytariladi ${krMoney(cash, s.currency)}` : ""}.`);
    qtReset(); openForm("qaytApp", false);
    try { await qtReload(); } catch (e) {}
  } catch (e) {
    if (e && step === "items") qtFmsg("Qaytarish saqlandi, lekin tovar qatorlari «Qaytarish tovarlari» varag'iga yozilmadi. " + krCodeMsg(e.code), true);
    else if (e) { const m = krCodeMsg(e.code); qtFmsg(m || (step === "write" ? "Javob kelmadi: qaytarish saqlangan bo'lishi ham mumkin. Ro'yxatni tekshiring." : "Bazaga ulanib bo'lmadi, qayta urinib ko'ring."), true); }
  }
  QT.busy = false; $("qtSave").disabled = false;
}
async function qtCancel(id) {
  if (QT.busy || !QT.mcp) return;
  QT.busy = true;
  try {
    await qtReload(); await slReload();
    const r = QT.list.find(x => x.id === id); if (!r || r.cancelled) throw null;
    // Qaytgan IMEI keyin boshqa mijozga sotilgan bo'lsa, qaytarishni bekor qilib bo'lmaydi
    const later = SL.list.filter(s => !s.cancelled && s.id !== r.saleId && String(s.createdAt) > String(r.createdAt));
    for (const it of r.items) for (const m of it.imeis || []) { const s = later.find(x => x.items.some(y => (y.imeis || []).indexOf(m) >= 0)); if (s) { qtSay(`Bekor qilib bo'lmaydi: IMEI ${m} qaytgandan keyin №${s.number} sotuvda qayta sotilgan.`); throw null; } }
    await QT.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Qaytarishlar!C${r.row}`, values:[["Bekor qilingan"]] });
    await QT.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Qaytarishlar!R${r.row}`, values:[[krT(new Date().toISOString())]] });
    qtSay(`Qaytarish №${r.number} bekor qilindi.`);
    try { await qtReload(); } catch (e) {}
  } catch (e) { if (e) qtSay(krCodeMsg(e.code) || "Bekor qilib bo'lmadi, qayta urinib ko'ring."); }
  QT.busy = false; QT.pendCancel = "";
}
function qtRender() {
  if (!$("qtList")) return;
  const line = QT.state === "ok" ? "" : QT.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : QT.state === "off" ? "Qaytarishlar bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching." : (krCodeMsg(QT.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi.");
  const today = new Date().toLocaleDateString("en-CA");
  const active = qtActive();
  const counts = { all:QT.list.length, today:active.filter(r => r.date.slice(0, 10) === today).length, cancelled:QT.list.length - active.length };
  $("qtFilters").innerHTML = [["all", "Barchasi"], ["today", "Bugun"], ["cancelled", "Bekor qilingan"]].map(([k, l]) => `<button data-f="${k}" class="${QT.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("qtStatus").textContent = [line, QT.msg].filter(Boolean).join(" · ");
  const q = QT.q.trim().toLowerCase();
  const list = QT.list.filter(r => (QT.filter === "all" || (QT.filter === "today" ? !r.cancelled && r.date.slice(0, 10) === today : r.cancelled))
    && (!q || r.client.toLowerCase().indexOf(q) >= 0 || String(r.saleNo) === q.replace(/^№/, "") || r.items.some(it => it.name.toLowerCase().indexOf(q) >= 0 || (it.imeis || []).some(m => m.indexOf(q) >= 0))));
  if (!list.length) { $("qtList").innerHTML = `<div class="empty-box">${QT.state === "ok" ? (QT.list.length ? "Hech narsa topilmadi" : "Hozircha qaytarish yo'q: «Yangi qaytarish» tugmasini bosing") : ""}</div>`; return; }
  const can = !!QT.mcp;
  $("qtList").innerHTML = `<table><thead><tr><th>№</th><th>Sana</th><th>Sotuv</th><th>Mijoz</th><th>Tovar</th><th>Summa</th><th>Qarzdan</th><th>Pul qaytarildi</th><th>Sabab</th><th>Holat</th><th></th></tr></thead><tbody>`
    + list.slice(0, 300).map(r => {
      const qty = r.items.reduce((a, it) => a + (Number(it.qty) || 0), 0);
      let act = `<button data-qtview="${esc(r.id)}">${QT.open === r.id ? "Yopish" : "Ko'rish"}</button>`;
      if (!r.cancelled && can) act += `<button data-qtcancel="${esc(r.id)}">${QT.pendCancel === r.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>`;
      let row = `<tr class="${r.cancelled ? "slx" : ""}"><td>${esc(r.number)}</td><td>${esc(r.date.slice(0, 10))}</td><td>№${esc(r.saleNo)}</td><td>${esc(r.client)}</td><td class="num">${qty} dona</td><td class="num">${krMoney(r.total, r.currency)}</td>`
        + `<td class="num">${r.debtCut > 0.005 ? krMoney(r.debtCut, r.currency) : "—"}</td><td class="num">${r.cash > 0.005 ? krMoney(r.cash, r.currency) + `<div class="tmeta">${esc(r.payType)}</div>` : "—"}</td><td>${esc(r.reason)}</td>`
        + `<td>${r.cancelled ? `<span class="st st-draft">Bekor qilingan</span>` : `<span class="st st-done">Yakunlangan</span>`}</td><td class="krAct">${act}</td></tr>`;
      if (QT.open === r.id) row += `<tr class="krDet"><td></td><td colspan="10">` + r.items.map(it => `<div><b>${esc(it.name)}</b> — ${esc(it.qty)} × ${krMoney(Number(it.price) || 0, r.currency)} · ${esc(QT_DEST[it.dest] || "")}${it.imeis && it.imeis.length ? `<div class="imeis">IMEI: ${it.imeis.map(esc).join(", ")}</div>` : ""}</div>`).join("")
        + (r.note ? `<div class="tmeta">Izoh: ${esc(r.note)}</div>` : "") + `</td></tr>`;
      return row;
    }).join("") + `</tbody></table>`;
}
// ===== Sozlamalar → Qaytarish sabablari: qaytarish formasidagi «Sabab» ro'yxati shu yerdan olinadi =====
const QR_RANGE = "'Qaytarish sabablari'!A1:D500";
const QR = { list:[], state:"loading", busy:false, edit:"", pendDel:"", msg:"", msgT:null };
(function qrBuild() {
  const el = document.createElement("div");
  el.id = "qrApp";
  el.innerHTML = `<div class="panel"><div class="thead"><h3>Qaytarish sabablari</h3></div>
    <div class="tmeta">Sotuv → Qaytarish formasidagi «Sabab» ro'yxati shu yerdan olinadi.</div>
    <form id="qrForm" class="kform"><div class="inrow"><input id="qrName" maxlength="80" placeholder="Yangi sabab, masalan: Batareya muammosi"><button type="button" class="pri" id="qrAdd">Qo'shish</button></div></form>
    <div class="status" id="qrStatus"></div><div id="qrList"></div></div>`;
  $("kirimApp").parentNode.insertBefore(el, $("kirimApp"));
  const st = document.createElement("style");
  st.textContent = "#qrApp{display:none}.qrApp-on #qrApp{display:block}.qrApp-on .gen,.qrApp-on #kpis{display:none}#qrForm .inrow{max-width:520px}#qrList input{font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:8px;width:100%;max-width:320px}";
  document.head.appendChild(st);
})();
function qrParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[2] || "") !== "O'chirilgan") out.push({ id:String(r[0]), row:i + 1, name:String(r[1] || "").trim() }); });
  return out.filter(x => x.name);
}
function qtReasons() { return QR.state === "ok" && QR.list.length ? QR.list.map(x => x.name) : QT_REASONS; }
function qrFillSelect() {
  const sel = $("qtReason"), cur = sel.value, names = qtReasons();
  sel.innerHTML = names.map(n => `<option>${esc(n)}</option>`).join("");
  if (names.indexOf(cur) >= 0) sel.value = cur;
}
function qrApply(vals) { QR.list = qrParse(vals); QR.state = "ok"; qrFillSelect(); qrRender(); }
async function qrReload() { const r = await QT.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:QR_RANGE }, { cache:false }); qrApply(krVals({ result:r })); }
function qrSay(m) { QR.msg = m; clearTimeout(QR.msgT); QR.msgT = setTimeout(() => { QR.msg = ""; qrRender(); }, 5000); qrRender(); }
async function qrDo(fn) {
  if (QR.busy) return; if (!QT.mcp) return qrSay(krDbLine() || "Tsunami bazasi ulanmagan.");
  QR.busy = true;
  try { await qrReload(); await fn(); try { await qrReload(); } catch (e) {} }
  catch (e) { if (e) qrSay(krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."); }
  QR.busy = false;
}
function qrDup(name, skipId) { return QR.list.some(x => x.id !== skipId && x.name.toLowerCase() === name.toLowerCase()); }
function qrAdd() {
  const name = $("qrName").value.trim(); if (!name) return qrSay("Sabab nomini yozing.");
  qrDo(async () => {
    if (qrDup(name)) { qrSay(`«${name}» ro'yxatda bor.`); throw null; }
    const id = "R" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    await QT.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Qaytarish sabablari'!A1", values:[[krT(id), krT(name), "Faol", krT(new Date().toISOString())]] });
    $("qrName").value = ""; qrSay(`«${name}» qo'shildi.`);
  });
}
function qrRename(id, name) {
  name = String(name || "").trim(); if (!name) return qrSay("Nom bo'sh bo'lmasin.");
  qrDo(async () => {
    const x = QR.list.find(r => r.id === id); if (!x) throw null;
    if (qrDup(name, id)) { qrSay(`«${name}» ro'yxatda bor.`); throw null; }
    await QT.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Qaytarish sabablari'!B${x.row}`, values:[[krT(name)]] });
    QR.edit = ""; qrSay("Saqlandi.");
  });
}
function qrDelete(id) {
  qrDo(async () => {
    const x = QR.list.find(r => r.id === id); if (!x) throw null;
    if (QR.list.length <= 1) { qrSay("Kamida bitta sabab qolishi kerak."); throw null; }
    await QT.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Qaytarish sabablari'!C${x.row}`, values:[["O'chirilgan"]] });
    QR.pendDel = ""; qrSay(`«${x.name}» o'chirildi. Avvalgi qaytarishlarda u yozilganicha qoladi.`);
  });
}
function qrRender() {
  if (!$("qrList")) return;
  $("qrStatus").textContent = [stQr(), QR.msg].filter(Boolean).join(" · ");
  const can = !!QT.mcp, names = QR.state === "ok" ? QR.list : [];
  if (!names.length) { $("qrList").innerHTML = `<div class="empty-box">${QR.state === "ok" ? "Ro'yxat bo'sh: formada standart sabablar ishlatiladi" : ""}</div>`; return; }
  $("qrList").innerHTML = `<table><thead><tr><th>#</th><th>Sabab</th><th></th></tr></thead><tbody>` + names.map((x, i) => QR.edit === x.id
    ? `<tr><td>${i + 1}</td><td><input id="qrEditIn" value="${esc(x.name)}" maxlength="80"></td><td class="krAct"><button data-qrsave="${esc(x.id)}">Saqlash</button><button data-qrcancel="1">Bekor</button></td></tr>`
    : `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td class="krAct">${can ? `<button data-qredit="${esc(x.id)}">Tahrirlash</button><button data-qrdel="${esc(x.id)}">${QR.pendDel === x.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
}
function stQr() { return QR.state === "ok" ? "" : QR.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : QR.state === "off" ? "Bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching." : (krCodeMsg(QR.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi."); }
function qtReasonsSub() {
  const on = !!current && current.id === "sozlamalar" && current.subs[currentSub].n === "Qaytarish sabablari";
  document.body.classList.toggle("qrApp-on", on);
  if (on) qrRender();
}
$("qrForm").addEventListener("submit", e => { e.preventDefault(); qrAdd(); });
$("qrAdd").addEventListener("click", qrAdd);
$("qrList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.qredit) { QR.edit = b.dataset.qredit; QR.pendDel = ""; qrRender(); const i = $("qrEditIn"); if (i) i.focus(); }
  else if (b.dataset.qrcancel) { QR.edit = ""; qrRender(); }
  else if (b.dataset.qrsave) qrRename(b.dataset.qrsave, $("qrEditIn").value);
  else if (b.dataset.qrdel) { if (QR.pendDel === b.dataset.qrdel) qrDelete(b.dataset.qrdel); else { QR.pendDel = b.dataset.qrdel; QR.edit = ""; qrRender(); } }
});
$("qrList").addEventListener("keydown", e => { if (e.target.id === "qrEditIn" && e.key === "Enter") { e.preventDefault(); qrRename(QR.edit, e.target.value); } });
// Sotuvlar ro'yxatidagi «Qaytarish» tugmasi: Qaytarish bo'limini shu sotuv bilan ochadi
function qtStartFor(saleId) {
  const i = current.subs.findIndex(x => x.n === "Qaytarish"); if (i < 0) return;
  renderSub(i); qtReset(); openForm("qaytApp", true); qtPick(saleId);
}
$("qtForm").addEventListener("submit", e => e.preventDefault());
$("qtSave").addEventListener("click", qtSave);
$("qtSaleQ").addEventListener("input", () => {
  const v = $("qtSaleQ").value.trim();
  if (/^\d{6,}$/.test(v)) { const s = SL.list.find(x => !x.cancelled && x.items.some(it => (it.imeis || []).indexOf(v) >= 0)); if (s) { qtPick(s.id, v); return; } }
  qtSalesFill();
});
$("qtSale").addEventListener("change", e => qtPick(e.target.value));
$("qtRows").addEventListener("input", e => {
  const el = e.target, tr = el.closest("tr[data-u]"); if (!tr || !el.dataset.f) return;
  const u = QT.units[Number(tr.dataset.u)]; if (!u) return;
  if (el.dataset.f === "on") u.on = el.checked;
  else if (el.dataset.f === "qty") { u.qty = el.value; if (Number(el.value) > 0) { u.on = true; tr.querySelector('[data-f="on"]').checked = true; } }
  else if (el.dataset.f === "dest") u.dest = el.value;
  qtTotals();
});
$("qtRows").addEventListener("change", e => { if (e.target.dataset.f === "dest") { const u = QT.units[Number(e.target.closest("tr[data-u]").dataset.u)]; if (u) u.dest = e.target.value; } });
$("qtFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { QT.filter = b.dataset.f; qtRender(); } });
$("qtQ").addEventListener("input", e => { QT.q = e.target.value; qtRender(); });
$("qtList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.qtview) { QT.open = QT.open === b.dataset.qtview ? "" : b.dataset.qtview; qtRender(); }
  else if (b.dataset.qtcancel) { if (QT.pendCancel === b.dataset.qtcancel) qtCancel(b.dataset.qtcancel); else { QT.pendCancel = b.dataset.qtcancel; qtRender(); } }
});
$("slList").addEventListener("click", e => { const b = e.target.closest("button[data-slret]"); if (b) qtStartFor(b.dataset.slret); });
qtReset();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { QT.state = "off"; QR.state = "off"; qtRender(); qrRender(); return; }
  QT.mcp = mcp;
  try {
    mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:QT_RANGE }, ev => {
      if (ev.type === "data") { if (!QT.busy) qtApply(krVals(ev)); return; }
      const c = ev.error && ev.error.code;
      if (QT.state !== "ok" || !QT.list.length) QT.state = c || "upstream_error";
      qtRender();
    }, { refetchInterval:60000 });
    mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:QR_RANGE }, ev => {
      if (ev.type === "data") { if (!QR.busy) qrApply(krVals(ev)); return; }
      if (QR.state !== "ok") { QR.state = (ev.error && ev.error.code) || "upstream_error"; qrRender(); }
    }, { refetchInterval:300000 });
  } catch (e) {}
})();

if (current && (current.id === "sotuv" || current.id === "sozlamalar")) renderSub(currentSub);
