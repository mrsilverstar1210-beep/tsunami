// ===== Tsunami: Logistika → Yetkazib berishlar, Kuryerlar, Tariflar; kuryer mobil ko'rinishi (#kuryer); Hisobotlar → Yetkazib berish hisoboti =====
const LG = { mcp:null };
const lgToday = () => new Date().toLocaleDateString("en-CA");
const lgK = s => String(s || "").trim().toLowerCase();
function lgId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function lgMsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function lgSay(o, render, m) { o.msg = m; clearTimeout(o.msgT); o.msgT = setTimeout(() => { o.msg = ""; render(); }, 6000); render(); }
function lgLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
function lgPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
function lgClient(n) { return (PARTY.cliApp ? PARTY.cliApp.list : []).find(c => lgK(c.name) === lgK(n)) || null; }
(function lgCss() {
  const st = document.createElement("style");
  st.textContent = "#dlApp,#kuApp,#tfApp,#dlrApp,#kuryerView{display:none}.dlApp-on #dlApp,.kuApp-on #kuApp,.tfApp-on #tfApp,.dlrApp-on #dlrApp{display:block}"
    + ".dlApp-on .gen,.dlApp-on #kpis,.kuApp-on .gen,.kuApp-on #kpis,.tfApp-on .gen,.tfApp-on #kpis,.dlrApp-on .gen,.dlrApp-on #kpis,.dlrApp-on .salesbar{display:none}"
    + "body.kuryerv{display:block}body.kuryerv nav,body.kuryerv main,body.kuryerv #mobile,body.kuryerv #agentView{display:none!important}body.kuryerv #kuryerView{display:block}#kuryerView{max-width:560px;margin:0 auto;padding:12px}#kuryerView .mhead{font-size:18px;font-weight:700;margin:6px 0 12px}"
    + "#kuryerView .mlabel{display:block;font-size:13px;color:#6b7280;margin-bottom:10px}#kuryerView .mlabel input{display:block;width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;margin-top:4px;border:1px solid var(--line);border-radius:10px;background:#fff}#kuryerView .mback{display:block;text-align:center;margin:18px 0;color:#6b7280}"
    + ".dlcard{border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0;background:#fff}.dlcard .t{display:flex;justify-content:space-between;gap:8px}.dlcard .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.dlcard .acts button,.dlcard .acts select,.dlcard .acts input{font:inherit;font-size:13px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:#fff}.dlcard .acts button.go{background:#16a34a;color:#fff;border-color:#16a34a}.cod{font-weight:700;color:#b91c1c}";
  document.head.appendChild(st);
})();

// ======================= KURYERLAR =======================
const KU_RANGE = "Kuryerlar!A1:G500";
const KU = { list:[], state:"loading", busy:false, editId:"", pendDel:"", msg:"", msgT:null };
const KU_TR = ["Piyoda", "Velosiped", "Moto", "Avtomobil"];
FORM_FOCUS.kuApp = "kuName";
lgPanel("kuApp", `<div class="panel fpanel"><div class="thead"><h3 id="kuTitle">Yangi kuryer</h3><button type="button" class="closebtn" data-close="kuApp">Yopish ✕</button></div>
  <form id="kuForm" class="kform"><div class="kgrid">
    <label>Ism<input id="kuName" maxlength="80" placeholder="Masalan: Bobur"></label>
    <label>Telefon<input id="kuPhone" maxlength="30" inputmode="tel" placeholder="+998 90 123 45 67"></label>
    <label>Transport<select id="kuTr">${KU_TR.map(t => `<option>${t}</option>`).join("")}</select></label>
    <label>Holat<select id="kuSt"><option>Faol</option><option>Dam olishda</option></select></label>
    <label class="span2">Izoh<input id="kuNote" maxlength="200" placeholder="ixtiyoriy"></label>
  </div><div class="kbtns"><button type="button" class="pri" id="kuSave">Saqlash</button></div><div class="status" id="kuFmsg"></div></form></div>
  <div class="panel"><div class="thead"><h3>Kuryerlar</h3><button type="button" class="openbtn" data-open="kuApp">+ Yangi kuryer</button></div>
  <div class="tmeta">Kuryerlar telefondan <a href="#kuryer">kuryer ko'rinishi</a>da o'z yetkazmalarini belgilaydi: sahifa havolasi oxiriga <b>#kuryer</b> qo'shib yuboring. Jonli xarita joylashuvi bu sahifada ishlamaydi — oxirgi yetkazilgan manzil ko'rsatiladi.</div>
  <div class="status" id="kuStatus"></div><div id="kuList"></div></div>`);
function kuParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[4] || "") !== "O'chirilgan" && String(r[1] || "").trim()) out.push({ id:String(r[0]), row:i + 1, name:String(r[1]).trim(), phone:String(r[2] || ""), tr:String(r[3] || ""), st:String(r[4] || "Faol"), note:String(r[5] || ""), createdAt:String(r[6] || "") }); }); return out.sort((a, b) => a.name.localeCompare(b.name)); }
function kuApply(vals) { KU.list = kuParse(vals); KU.state = "ok"; lgRenderAll(); }
async function kuReload() { const r = await LG.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:KU_RANGE }, { cache:false }); kuApply(krVals({ result:r })); }
function kuReset() { KU.editId = ""; ["kuName", "kuPhone", "kuNote"].forEach(id => { $(id).value = ""; }); $("kuTr").value = KU_TR[2]; $("kuSt").value = "Faol"; $("kuTitle").textContent = "Yangi kuryer"; lgMsg("kuFmsg", ""); }
function kuLoad(id) { const k = KU.list.find(x => x.id === id); if (!k) return; kuReset(); KU.editId = id; $("kuTitle").textContent = `Tahrirlash: ${k.name}`; $("kuName").value = k.name; $("kuPhone").value = k.phone; $("kuTr").value = KU_TR.indexOf(k.tr) >= 0 ? k.tr : KU_TR[0]; $("kuSt").value = k.st === "Dam olishda" ? "Dam olishda" : "Faol"; $("kuNote").value = k.note; openForm("kuApp", true); }
async function kuSave() {
  if (KU.busy) return; if (!LG.mcp) return lgMsg("kuFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const name = $("kuName").value.trim(), phone = typeof ptPhone === "function" ? ptPhone($("kuPhone").value) : $("kuPhone").value.trim();
  if (!name) return lgMsg("kuFmsg", "Ismini yozing.", true);
  if (!phone) return lgMsg("kuFmsg", "Telefon raqamini yozing.", true);
  KU.busy = true; $("kuSave").disabled = true;
  try {
    await kuReload();
    if (KU.list.some(k => k.id !== KU.editId && lgK(k.name) === lgK(name))) { lgMsg("kuFmsg", `«${name}» ismli kuryer bor.`, true); throw null; }
    const ex = KU.editId ? KU.list.find(x => x.id === KU.editId) : null, now = new Date().toISOString();
    const row = [krT(ex ? ex.id : lgId("K")), krT(name), krT(phone), krT($("kuTr").value), krT($("kuSt").value), krT($("kuNote").value.trim()), krT(ex ? ex.createdAt : now)];
    if (ex) await LG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Kuryerlar!A${ex.row}:G${ex.row}`, values:[row] });
    else await LG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Kuryerlar!A1", values:[row] });
    lgSay(KU, kuRender, ex ? `${name} saqlandi.` : `${name} qo'shildi.`); kuReset(); openForm("kuApp", false); try { await kuReload(); } catch (e) {}
  } catch (e) { if (e) lgMsg("kuFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  KU.busy = false; $("kuSave").disabled = false;
}
async function kuDelete(id) {
  if (KU.busy || !LG.mcp) return; KU.busy = true;
  try {
    await kuReload(); const k = KU.list.find(x => x.id === id); if (!k) throw null;
    if (DL.list.some(d => lgK(d.courier) === lgK(k.name) && (d.st === "given" || d.st === "way"))) { lgSay(KU, kuRender, `${k.name}da yetkazilmagan buyurtmalar bor: avval ularni yakunlang yoki boshqa kuryerga bering.`); throw null; }
    await LG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Kuryerlar!E${k.row}`, values:[["O'chirilgan"]] });
    lgSay(KU, kuRender, `${k.name} o'chirildi.`); try { await kuReload(); } catch (e) {}
  } catch (e) { if (e) lgSay(KU, kuRender, krCodeMsg(e.code) || "O'chirib bo'lmadi."); }
  KU.busy = false; KU.pendDel = "";
}
function kuRender() {
  if (!$("kuList")) return;
  $("kuStatus").textContent = [lgLine(KU, "Kuryerlar"), KU.msg].filter(Boolean).join(" · ");
  if (!KU.list.length) { $("kuList").innerHTML = `<div class="empty-box">${KU.state === "ok" ? "Hozircha kuryer yo'q: «Yangi kuryer» tugmasini bosing" : ""}</div>`; return; }
  const today = lgToday(), can = !!LG.mcp;
  $("kuList").innerHTML = `<table><thead><tr><th>Kuryer</th><th>Telefon</th><th>Transport</th><th>Holat</th><th>Qo'lida</th><th>Bugun yetkazdi</th><th>Oxirgi manzil</th><th></th></tr></thead><tbody>` + KU.list.map(k => {
    const mine = DL.list.filter(d => lgK(d.courier) === lgK(k.name)), hand = mine.filter(d => d.st === "given" || d.st === "way"), todayDone = mine.filter(d => d.st === "done" && d.doneAt.slice(0, 10) === today);
    const last = mine.filter(d => d.st === "done").sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)))[0];
    return `<tr><td><b>${esc(k.name)}</b>${k.note ? `<div class="tmeta">${esc(k.note)}</div>` : ""}</td><td class="mono">${esc(k.phone)}</td><td>${esc(k.tr)}</td><td>${k.st === "Faol" ? `<span class="st st-done">Faol</span>` : `<span class="st st-draft">${esc(k.st)}</span>`}</td><td class="num">${hand.length}</td><td class="num">${todayDone.length}</td><td>${last ? `${esc(last.addr)}<div class="tmeta">${esc(fmt(last.doneAt))}</div>` : "—"}</td><td class="krAct">${can ? `<button data-kuedit="${esc(k.id)}">Tahrirlash</button><button data-kudel="${esc(k.id)}">${KU.pendDel === k.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`;
  }).join("") + `</tbody></table>`;
}
$("kuForm").addEventListener("submit", e => e.preventDefault());
$("kuSave").addEventListener("click", kuSave);
$("kuForm").addEventListener("focusout", e => { if (e.target.id === "kuPhone" && e.target.value.trim() && typeof ptPhone === "function") e.target.value = ptPhone(e.target.value); });
$("kuList").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.kuedit) kuLoad(b.dataset.kuedit); else if (b.dataset.kudel) { if (KU.pendDel === b.dataset.kudel) kuDelete(b.dataset.kudel); else { KU.pendDel = b.dataset.kudel; kuRender(); } } });

// ======================= TARIFLAR =======================
const TF_RANGE = "'Yetkazish tariflari'!A1:G200";
const TF = { list:[], state:"loading", busy:false, editId:"", pendDel:"", msg:"", msgT:null };
FORM_FOCUS.tfApp = "tfName";
lgPanel("tfApp", `<div class="panel fpanel"><div class="thead"><h3 id="tfTitle">Yangi tarif</h3><button type="button" class="closebtn" data-close="tfApp">Yopish ✕</button></div>
  <form id="tfForm" class="kform"><div class="kgrid">
    <label class="span2">Hudud / tarif nomi<input id="tfName" maxlength="80" placeholder="Masalan: Urganch shahri ichida"></label>
    <label>Narx<input type="number" id="tfPrice" min="0" step="any" placeholder="20000"></label>
    <label>Valyuta<select id="tfCur"><option value="UZS">so'm</option><option value="USD">$</option></select></label>
    <label>Yetkazish muddati, soat<input type="number" id="tfHours" min="0" step="1" placeholder="3"></label>
    <label class="span2">Izoh<input id="tfNote" maxlength="200" placeholder="Masalan: 10 mln dan oshsa bepul"></label>
  </div><div class="kbtns"><button type="button" class="pri" id="tfSave">Saqlash</button></div><div class="status" id="tfFmsg"></div></form></div>
  <div class="panel"><div class="thead"><h3>Yetkazish tariflari</h3><button type="button" class="openbtn" data-open="tfApp">+ Yangi tarif</button></div>
  <div class="tmeta">Yetkazib berish yaratishda tarif tanlansa, narx va muddat o'zi qo'yiladi.</div>
  <div class="status" id="tfStatus"></div><div id="tfList"></div></div>`);
function tfParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[6] || "") !== "O'chirilgan" && String(r[1] || "").trim()) out.push({ id:String(r[0]), row:i + 1, name:String(r[1]).trim(), price:Number(r[2]) || 0, cur:String(r[3] || "UZS"), hours:Number(r[4]) || 0, note:String(r[5] || "") }); }); return out; }
function tfApply(vals) { TF.list = tfParse(vals); TF.state = "ok"; lgRenderAll(); }
async function tfReload() { const r = await LG.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:TF_RANGE }, { cache:false }); tfApply(krVals({ result:r })); }
function tfReset() { TF.editId = ""; ["tfName", "tfPrice", "tfHours", "tfNote"].forEach(id => { $(id).value = ""; }); $("tfCur").value = "UZS"; $("tfTitle").textContent = "Yangi tarif"; lgMsg("tfFmsg", ""); }
function tfLoad(id) { const t = TF.list.find(x => x.id === id); if (!t) return; tfReset(); TF.editId = id; $("tfTitle").textContent = `Tahrirlash: ${t.name}`; $("tfName").value = t.name; $("tfPrice").value = t.price; $("tfCur").value = t.cur; $("tfHours").value = t.hours || ""; $("tfNote").value = t.note; openForm("tfApp", true); }
async function tfSave() {
  if (TF.busy) return; if (!LG.mcp) return lgMsg("tfFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const name = $("tfName").value.trim(), price = Number($("tfPrice").value);
  if (!name) return lgMsg("tfFmsg", "Tarif nomini yozing.", true);
  if (!(price >= 0) || $("tfPrice").value.trim() === "") return lgMsg("tfFmsg", "Narxini kiriting (bepul bo'lsa 0).", true);
  TF.busy = true; $("tfSave").disabled = true;
  try {
    await tfReload();
    if (TF.list.some(t => t.id !== TF.editId && lgK(t.name) === lgK(name))) { lgMsg("tfFmsg", `«${name}» tarifi bor.`, true); throw null; }
    const ex = TF.editId ? TF.list.find(x => x.id === TF.editId) : null;
    const row = [krT(ex ? ex.id : lgId("F")), krT(name), price, $("tfCur").value, Number($("tfHours").value) || "", krT($("tfNote").value.trim()), "Faol"];
    if (ex) await LG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Yetkazish tariflari'!A${ex.row}:G${ex.row}`, values:[row] });
    else await LG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Yetkazish tariflari'!A1", values:[row] });
    lgSay(TF, tfRender, ex ? `«${name}» saqlandi.` : `«${name}» tarifi qo'shildi.`); tfReset(); openForm("tfApp", false); try { await tfReload(); } catch (e) {}
  } catch (e) { if (e) lgMsg("tfFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi.", true); }
  TF.busy = false; $("tfSave").disabled = false;
}
async function tfDelete(id) {
  if (TF.busy || !LG.mcp) return; TF.busy = true;
  try { await tfReload(); const t = TF.list.find(x => x.id === id); if (!t) throw null; await LG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Yetkazish tariflari'!G${t.row}`, values:[["O'chirilgan"]] }); lgSay(TF, tfRender, `«${t.name}» o'chirildi.`); try { await tfReload(); } catch (e) {} }
  catch (e) { if (e) lgSay(TF, tfRender, krCodeMsg(e.code) || "O'chirib bo'lmadi."); }
  TF.busy = false; TF.pendDel = "";
}
function tfRender() {
  if (!$("tfList")) return;
  $("tfStatus").textContent = [lgLine(TF, "Tariflar"), TF.msg].filter(Boolean).join(" · ");
  if (!TF.list.length) { $("tfList").innerHTML = `<div class="empty-box">${TF.state === "ok" ? "Hozircha tarif yo'q: masalan «Shahar ichida — 20 000 so'm» qo'shing" : ""}</div>`; return; }
  const can = !!LG.mcp;
  $("tfList").innerHTML = `<table><thead><tr><th>Tarif</th><th>Narx</th><th>Muddat</th><th>Izoh</th><th></th></tr></thead><tbody>` + TF.list.map(t => `<tr><td><b>${esc(t.name)}</b></td><td class="num">${t.price ? krMoney(t.price, t.cur) : "Bepul"}</td><td>${t.hours ? t.hours + " soat" : "—"}</td><td class="tmeta">${esc(t.note)}</td><td class="krAct">${can ? `<button data-tfedit="${esc(t.id)}">Tahrirlash</button><button data-tfdel="${esc(t.id)}">${TF.pendDel === t.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
}
$("tfForm").addEventListener("submit", e => e.preventDefault());
$("tfSave").addEventListener("click", tfSave);
$("tfList").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.tfedit) tfLoad(b.dataset.tfedit); else if (b.dataset.tfdel) { if (TF.pendDel === b.dataset.tfdel) tfDelete(b.dataset.tfdel); else { TF.pendDel = b.dataset.tfdel; tfRender(); } } });

// ======================= YETKAZIB BERISHLAR =======================
const DL_RANGE = "'Yetkazib berishlar'!A1:V5000";
const DL = { list:[], state:"loading", busy:false, filter:"new", q:"", act:"", pendCancel:"", msg:"", msgT:null, saleId:"" };
const DL_ST = { new:"Yangi", given:"Kuryerga berildi", way:"Yo'lda", done:"Yetkazildi", back:"Qaytarildi", cancel:"Bekor qilingan" };
FORM_FOCUS.dlApp = "dlClient";
lgPanel("dlApp", `<div class="panel fpanel"><div class="thead"><h3>Yangi yetkazib berish</h3><button type="button" class="closebtn" data-close="dlApp">Yopish ✕</button></div>
  <form id="dlForm" class="kform">
    <div class="kgrid">
      <label class="span2">Sotuvdan (ixtiyoriy)<select id="dlSale"></select></label>
      <label>Mijoz<input id="dlClient" list="pyClients" maxlength="160" placeholder="Qabul qiluvchi"></label>
      <label>Telefon<input id="dlPhone" maxlength="30" inputmode="tel" placeholder="+998 90 123 45 67"></label>
      <label class="span2">Manzil<input id="dlAddr" maxlength="200" placeholder="Shahar, ko'cha, uy, mo'ljal"></label>
      <label>Tarif<select id="dlTariff"></select></label>
      <label>Yetkazish narxi<span class="inrow"><input type="number" id="dlFee" min="0" step="any" placeholder="0"><select id="dlFeeCur"><option value="UZS">so'm</option><option value="USD">$</option></select></span></label>
      <label>Kuryer olib keladigan pul<span class="inrow"><input type="number" id="dlCod" min="0" step="any" placeholder="0"><select id="dlCodCur"><option value="UZS">so'm</option><option value="USD">$</option></select></span></label>
      <label>Qachongacha<input type="datetime-local" id="dlDue"></label>
      <label>Kuryer<select id="dlCourier"></select></label>
    </div>
    <label class="full">Tovarlar<input id="dlItems" maxlength="300" placeholder="Masalan: iPhone 15 128GB Black × 1"></label>
    <label class="full">Izoh<input id="dlNote" maxlength="300" placeholder="Masalan: 18:00 dan keyin qo'ng'iroq qilsin"></label>
    <div class="kbtns"><button type="button" class="pri" id="dlSave">Saqlash</button></div>
    <div class="status" id="dlFmsg"></div>
  </form></div>
  <div class="panel"><div class="thead"><h3>Yetkazib berishlar</h3><div class="hbtns"><input class="search" id="dlQ" placeholder="Qidirish: mijoz, telefon, manzil"><div class="filters" id="dlFilters"></div><button type="button" class="openbtn" data-open="dlApp">+ Yangi yetkazib berish</button></div></div>
  <div class="tmeta">Sotuvlar ro'yxatidagi «Yetkazish» tugmasi ham shu formani sotuv ma'lumotlari bilan ochadi. Kuryer pul olib kelsa, mijoz qarzi o'zi yopiladi.</div>
  <div class="status" id="dlStatus"></div><div id="dlList"></div></div>`);
function dlParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const st = Object.keys(DL_ST).find(k => DL_ST[k] === String(r[2] || "")) || "new";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, st, date:String(r[3] || ""), client:String(r[4] || ""), phone:String(r[5] || ""), addr:String(r[6] || ""), saleId:String(r[7] || ""), saleNo:Number(r[8]) || 0, items:String(r[9] || ""), tariff:String(r[10] || ""), fee:Number(r[11]) || 0, feeCur:String(r[12] || "UZS"), cod:Number(r[13]) || 0, codCur:String(r[14] || "UZS"), courier:String(r[15] || ""), due:String(r[16] || ""), note:String(r[17] || ""), createdAt:String(r[18] || ""), updatedAt:String(r[19] || ""), doneAt:String(r[20] || ""), result:String(r[21] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function dlApply(vals) { DL.list = dlParse(vals); DL.state = "ok"; lgRenderAll(); }
async function dlReload() { const r = await LG.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:DL_RANGE }, { cache:false }); dlApply(krVals({ result:r })); }
function dlSelects() {
  const s = $("dlSale"), sv = DL.saleId || s.value, used = new Set(DL.list.filter(d => d.st !== "cancel" && d.st !== "back").map(d => d.saleId).filter(Boolean));
  const sales = SL.list.filter(x => !x.cancelled && (!used.has(x.id) || x.id === sv)).slice(0, 150);
  s.innerHTML = `<option value="">— sotuvsiz —</option>` + sales.map(x => `<option value="${esc(x.id)}"${x.id === sv ? " selected" : ""}>№${x.number} · ${esc(x.date.slice(0, 10))} · ${esc(x.client)} · ${krMoney(x.total, x.currency)}</option>`).join("");
  const t = $("dlTariff"), tv = t.value; t.innerHTML = `<option value="">— tarifsiz —</option>` + TF.list.map(x => `<option value="${esc(x.id)}">${esc(x.name)} · ${x.price ? krMoney(x.price, x.cur) : "bepul"}</option>`).join(""); if (tv) t.value = tv;
  const k = $("dlCourier"), kv = k.value; k.innerHTML = `<option value="">— keyin tanlanadi —</option>` + KU.list.filter(x => x.st === "Faol").map(x => `<option>${esc(x.name)}</option>`).join(""); if (kv) k.value = kv;
}
function dlFromSale(id) {
  const s = SL.list.find(x => x.id === id); DL.saleId = id || ""; if (!s) return;
  const c = lgClient(s.client);
  $("dlClient").value = s.client === SL_WALKIN ? "" : s.client; $("dlPhone").value = c ? c.phone : ""; $("dlAddr").value = c ? c.addr : "";
  $("dlItems").value = s.items.map(it => it.name + (Number(it.qty) > 1 ? ` × ${it.qty}` : "")).join(", ").slice(0, 300);
  const left = typeof qtDebtLeft === "function" ? qtDebtLeft(s) : s.debt; $("dlCod").value = left > 0.005 ? left : ""; $("dlCodCur").value = s.currency;
}
function dlReset() {
  DL.saleId = ""; ["dlClient", "dlPhone", "dlAddr", "dlFee", "dlCod", "dlDue", "dlItems", "dlNote"].forEach(id => { $(id).value = ""; });
  $("dlFeeCur").value = "UZS"; $("dlCodCur").value = "UZS"; dlSelects(); $("dlSale").value = ""; $("dlTariff").value = ""; $("dlCourier").value = ""; lgMsg("dlFmsg", "");
  if (typeof pyClientsFill === "function") pyClientsFill();
}
function dlStartFor(saleId) { render("logistika"); const j = current.subs.findIndex(x => x.n === "Yetkazib berishlar"); if (j >= 0) renderSub(j); dlReset(); openForm("dlApp", true); DL.saleId = saleId; dlSelects(); $("dlSale").value = saleId; dlFromSale(saleId); }
async function dlSave() {
  if (DL.busy) return; if (!LG.mcp) return lgMsg("dlFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const client = $("dlClient").value.trim(), phone = typeof ptPhone === "function" ? ptPhone($("dlPhone").value) : $("dlPhone").value.trim(), addr = $("dlAddr").value.trim();
  if (!client) return lgMsg("dlFmsg", "Qabul qiluvchi ismini yozing.", true);
  if (!phone) return lgMsg("dlFmsg", "Telefon raqamini yozing.", true);
  if (!addr) return lgMsg("dlFmsg", "Manzilni yozing.", true);
  const fee = Number($("dlFee").value) || 0, cod = Number($("dlCod").value) || 0, sale = SL.list.find(x => x.id === $("dlSale").value), tf = TF.list.find(x => x.id === $("dlTariff").value), courier = $("dlCourier").value;
  if (fee < 0 || cod < 0) return lgMsg("dlFmsg", "Summalar manfiy bo'lmasin.", true);
  DL.busy = true; $("dlSave").disabled = true;
  try {
    await dlReload();
    if (sale && DL.list.some(d => d.saleId === sale.id && d.st !== "cancel" && d.st !== "back")) { lgMsg("dlFmsg", `Sotuv №${sale.number} uchun yetkazib berish allaqachon bor.`, true); throw null; }
    const now = new Date().toISOString(), number = DL.list.reduce((m, x) => Math.max(m, x.number), 0) + 1, st = courier ? "given" : "new";
    await LG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Yetkazib berishlar'!A1", values:[[krT(lgId("D")), number, DL_ST[st], krT(lgToday()), krT(client), krT(phone), krT(addr), sale ? krT(sale.id) : "", sale ? sale.number : "", krT($("dlItems").value.trim()), tf ? krT(tf.name) : "", fee || "", $("dlFeeCur").value, cod || "", $("dlCodCur").value, krT(courier), krT($("dlDue").value.replace("T", " ")), krT($("dlNote").value.trim()), krT(now), krT(now), "", ""]] });
    lgSay(DL, dlRender, `Yetkazib berish №${number} yaratildi${courier ? `, kuryer: ${courier}` : ""}.`); dlReset(); openForm("dlApp", false); DL.filter = st === "new" ? "new" : "way"; try { await dlReload(); } catch (e) {}
  } catch (e) { if (e) lgMsg("dlFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  DL.busy = false; $("dlSave").disabled = false;
}
// Holatni o'zgartirish; «Yetkazildi»da olingan pul mijoz to'lovi sifatida yoziladi
async function dlSet(id, st, extra) {
  if (DL.busy || !LG.mcp) return lgSay(DL, lgRenderAll, krDbLine() || "Tsunami bazasi ulanmagan.");
  DL.busy = true; let payMsg = "";
  try {
    await dlReload(); const d = DL.list.find(x => x.id === id); if (!d) throw null;
    const now = new Date().toISOString();
    if (st === "given" && !extra.courier) { lgSay(DL, lgRenderAll, "Kuryerni tanlang."); throw null; }
    await LG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Yetkazib berishlar'!C${d.row}`, values:[[DL_ST[st]]] });
    if (extra.courier) await LG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Yetkazib berishlar'!P${d.row}`, values:[[krT(extra.courier)]] });
    await LG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Yetkazib berishlar'!T${d.row}:V${d.row}`, values:[[krT(now), st === "done" || st === "back" ? krT(now) : krT(d.doneAt), krT(extra.result != null ? extra.result : d.result)]] });
    if (st === "done" && extra.got > 0 && d.saleId && typeof pyAllocate === "function" && PAY && PAY.mcp) {
      try {
        const s = SL.list.find(x => x.id === d.saleId);
        if (s && s.client !== SL_WALKIN) {
          await pyReload();
          const p = pyAllocate(s.client, d.codCur, extra.got, s.id), number = PAY.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
          await PAY.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:PY_SHEET + "!A1", values:[[krT("P" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), number, "Qabul qilingan", krT(lgToday()), krT(s.client), d.codCur, extra.got, "Naqd (kuryer)", krT(JSON.stringify(p.alloc)), p.advance, krT(`Yetkazib berish №${d.number}, kuryer ${d.courier}`), krT(now), "", ""]] });
          payMsg = `, ${krMoney(extra.got, d.codCur)} mijoz to'lovi sifatida yozildi`; try { await pyReload(); } catch (e) {}
        }
      } catch (e) { payMsg = ", lekin to'lovni yozib bo'lmadi — Sotuv → Mijozlar to'lovlari bo'limida qo'lda kiriting"; }
    }
    DL.act = ""; lgSay(DL, lgRenderAll, `№${d.number}: ${DL_ST[st].toLowerCase()}${payMsg}.`); try { await dlReload(); } catch (e) {}
  } catch (e) { if (e) lgSay(DL, lgRenderAll, krCodeMsg(e.code) || "O'zgartirib bo'lmadi, qayta urinib ko'ring."); }
  DL.busy = false; DL.pendCancel = "";
}
function dlCard(d, mob) {
  const can = !!LG.mcp, a = DL.act;
  const badge = { new:"st-yangi", given:"st-jarayonda", way:"st-jarayonda", done:"st-done", back:"st-late", cancel:"st-draft" }[d.st];
  const late = (d.st === "new" || d.st === "given" || d.st === "way") && d.due && new Date(d.due.replace(" ", "T")) < new Date();
  let acts = "";
  if (can) {
    if (a === d.id + "|give") acts = `<select data-dlk>${KU.list.filter(k => k.st === "Faol").map(k => `<option${k.name === d.courier ? " selected" : ""}>${esc(k.name)}</option>`).join("")}</select><button class="go" data-dlgive2="${esc(d.id)}">Berish</button><button data-dlx="1">Orqaga</button>`;
    else if (a === d.id + "|done") acts = `<input data-dlgot type="number" min="0" step="any" value="${d.cod || ""}" placeholder="Olingan pul" style="width:140px"><span class="tmeta">${d.codCur === "USD" ? "$" : "so'm"}</span><input data-dlres placeholder="Izoh (ixtiyoriy)" style="flex:1;min-width:120px"><button class="go" data-dldone2="${esc(d.id)}">Saqlash</button><button data-dlx="1">Orqaga</button>`;
    else if (a === d.id + "|back") acts = `<input data-dlres placeholder="Nega qaytdi: mijoz olmadi, manzil topilmadi…" style="flex:1;min-width:180px"><button data-dlback2="${esc(d.id)}">Saqlash</button><button data-dlx="1">Orqaga</button>`;
    else if (d.st === "new") acts = `<button class="go" data-dlgive="${esc(d.id)}">Kuryerga berish</button>` + (mob ? "" : `<button data-dlcancel="${esc(d.id)}">${DL.pendCancel === d.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>`);
    else if (d.st === "given") acts = `<button class="go" data-dlway="${esc(d.id)}">Yo'lga chiqdi</button><button data-dldone="${esc(d.id)}">Yetkazildi</button><button data-dlback="${esc(d.id)}">Qaytarildi</button>` + (mob ? "" : `<button data-dlgive="${esc(d.id)}">Kuryerni almashtirish</button>`);
    else if (d.st === "way") acts = `<button class="go" data-dldone="${esc(d.id)}">Yetkazildi</button><button data-dlback="${esc(d.id)}">Qaytarildi</button>`;
  }
  return `<div class="dlcard"><div class="t"><div><b>№${d.number} · ${esc(d.client)}</b>${d.saleNo ? ` <span class="tmeta">(sotuv №${d.saleNo})</span>` : ""}<div class="tmeta">📍 ${esc(d.addr)}</div><div class="tmeta mono">☎ ${esc(d.phone)}</div>${d.items ? `<div class="tmeta">📦 ${esc(d.items)}</div>` : ""}${d.note ? `<div class="tmeta">💬 ${esc(d.note)}</div>` : ""}</div>`
    + `<div style="text-align:right"><span class="st ${badge}">${DL_ST[d.st]}</span>${d.courier ? `<div class="tmeta">kuryer: ${esc(d.courier)}</div>` : ""}${d.due ? `<div class="tmeta ${late ? "late" : ""}">${late ? "kechikdi · " : ""}${esc(d.due)} gacha</div>` : ""}${d.cod ? `<div class="cod">Olinadi: ${krMoney(d.cod, d.codCur)}</div>` : ""}${d.fee ? `<div class="tmeta">yetkazish: ${krMoney(d.fee, d.feeCur)}</div>` : ""}</div></div>`
    + (d.result ? `<div class="tmeta">Natija: ${esc(d.result)}</div>` : "") + (acts ? `<div class="acts">${acts}</div>` : "") + `</div>`;
}
function dlClick(e, rerender) {
  const b = e.target.closest("button"); if (!b) return; const box = b.closest(".dlcard");
  if (b.dataset.dlgive) { DL.act = b.dataset.dlgive + "|give"; rerender(); }
  else if (b.dataset.dldone) { DL.act = b.dataset.dldone + "|done"; rerender(); }
  else if (b.dataset.dlback) { DL.act = b.dataset.dlback + "|back"; rerender(); }
  else if (b.dataset.dlx) { DL.act = ""; rerender(); }
  else if (b.dataset.dlgive2) dlSet(b.dataset.dlgive2, "given", { courier:(box.querySelector("[data-dlk]") || {}).value || "" });
  else if (b.dataset.dlway) dlSet(b.dataset.dlway, "way", {});
  else if (b.dataset.dldone2) dlSet(b.dataset.dldone2, "done", { got:Number(box.querySelector("[data-dlgot]").value) || 0, result:box.querySelector("[data-dlres]").value.trim() });
  else if (b.dataset.dlback2) dlSet(b.dataset.dlback2, "back", { result:box.querySelector("[data-dlres]").value.trim() || "Qaytarildi" });
  else if (b.dataset.dlcancel) { if (DL.pendCancel === b.dataset.dlcancel) dlSet(b.dataset.dlcancel, "cancel", {}); else { DL.pendCancel = b.dataset.dlcancel; rerender(); } }
}
function dlRender() {
  if (!$("dlList")) return;
  const F = { new:"Yangi", way:"Yo'lda", done:"Yetkazilgan", back:"Qaytarilgan", cancel:"Bekor qilingan" }, kind = d => d.st === "given" ? "way" : d.st, counts = { new:0, way:0, done:0, back:0, cancel:0 };
  DL.list.forEach(d => { counts[kind(d)]++; });
  $("dlFilters").innerHTML = Object.entries(F).map(([k, l]) => `<button data-f="${k}" class="${DL.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("dlStatus").textContent = [lgLine(DL, "Yetkazib berishlar"), DL.msg].filter(Boolean).join(" · ");
  const q = lgK(DL.q), list = DL.list.filter(d => kind(d) === DL.filter && (!q || [d.client, d.phone, d.addr, d.courier].some(x => lgK(x).indexOf(q) >= 0)));
  $("dlList").innerHTML = list.length ? list.slice(0, 200).map(d => dlCard(d, false)).join("") : `<div class="empty-box">${DL.state === "ok" ? "Bu ro'yxatda yetkazib berish yo'q" : ""}</div>`;
}
$("dlForm").addEventListener("submit", e => e.preventDefault());
$("dlSave").addEventListener("click", dlSave);
$("dlSale").addEventListener("change", e => dlFromSale(e.target.value));
$("dlTariff").addEventListener("change", e => { const t = TF.list.find(x => x.id === e.target.value); if (!t) return; $("dlFee").value = t.price || ""; $("dlFeeCur").value = t.cur; if (t.hours) { const d = new Date(Date.now() + t.hours * 3600e3); $("dlDue").value = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); } });
$("dlClient").addEventListener("change", () => { const c = lgClient($("dlClient").value); if (c) { if (!$("dlPhone").value) $("dlPhone").value = c.phone; if (!$("dlAddr").value) $("dlAddr").value = c.addr; } });
$("dlFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { DL.filter = b.dataset.f; dlRender(); } });
$("dlQ").addEventListener("input", e => { DL.q = e.target.value; dlRender(); });
$("dlList").addEventListener("click", e => dlClick(e, dlRender));
// Sotuvlar ro'yxatiga «Yetkazish» tugmasi
const lgOrigSlRender = slRender;
slRender = function () {
  lgOrigSlRender();
  const busy = new Set(DL.list.filter(d => d.st !== "cancel" && d.st !== "back").map(d => d.saleId));
  document.querySelectorAll("#slList button[data-slret]").forEach(b => { if (busy.has(b.dataset.slret) || b.parentNode.querySelector("[data-sldl]")) return; const x = document.createElement("button"); x.type = "button"; x.dataset.sldl = b.dataset.slret; x.textContent = "Yetkazish"; b.parentNode.insertBefore(x, b); });
};
$("slList").addEventListener("click", e => { const b = e.target.closest("button[data-sldl]"); if (b) dlStartFor(b.dataset.sldl); });

// ======================= HISOBOTLAR → YETKAZIB BERISH HISOBOTI =======================
lgPanel("dlrApp", `<div class="panel"><div class="thead"><h3>Yetkazib berish hisoboti</h3><div class="hbtns"><input type="date" id="dlrFrom"><input type="date" id="dlrTo"></div></div>
  <div class="tmeta">Kuryerlar bo'yicha: yetkazilgan va qaytarilgan buyurtmalar, o'z vaqtida yetkazish foizi, yetkazish haqi va kuryer olib kelgan pul.</div>
  <div class="status" id="dlrStatus"></div><div id="dlrList"></div></div>`);
function dlrRender() {
  if (!$("dlrList")) return;
  if (!$("dlrFrom").value) { const d = new Date(); $("dlrFrom").value = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA"); $("dlrTo").value = lgToday(); }
  const from = $("dlrFrom").value, to = $("dlrTo").value, m = {};
  DL.list.filter(d => (d.st === "done" || d.st === "back") && d.doneAt.slice(0, 10) >= from && d.doneAt.slice(0, 10) <= to).forEach(d => {
    const o = m[d.courier || "(kuryersiz)"] || (m[d.courier || "(kuryersiz)"] = { done:0, back:0, ontime:0, timed:0, fee:{}, cod:{} });
    if (d.st === "back") { o.back++; return; }
    o.done++; if (d.fee) o.fee[d.feeCur] = (o.fee[d.feeCur] || 0) + d.fee;
    const got = (typeof PAY !== "undefined" ? PAY.list : []).filter(p => !p.cancelled && String(p.note).indexOf(`Yetkazib berish №${d.number},`) === 0).reduce((a, p) => a + p.total, 0); if (got) o.cod[d.codCur] = (o.cod[d.codCur] || 0) + got;
    if (d.due) { o.timed++; if (d.doneAt.slice(0, 16) <= new Date(d.due.replace(" ", "T")).toISOString().slice(0, 16)) o.ontime++; }
  });
  const rows = Object.entries(m).sort((a, b) => b[1].done - a[1].done), mm = x => Object.keys(x).length ? Object.entries(x).map(([c, v]) => krMoney(v, c)).join(" + ") : "—";
  $("dlrStatus").textContent = lgLine(DL, "Hisobot");
  $("dlrList").innerHTML = rows.length ? `<table><thead><tr><th>Kuryer</th><th>Yetkazildi</th><th>Qaytarildi</th><th>O'z vaqtida</th><th>Yetkazish haqi</th><th>Olib kelgan pul</th></tr></thead><tbody>` + rows.map(([k, o]) => `<tr><td><b>${esc(k)}</b></td><td class="num">${o.done}</td><td class="num">${o.back}</td><td class="num">${o.timed ? Math.round(o.ontime / o.timed * 100) + "%" : "—"}</td><td class="num">${mm(o.fee)}</td><td class="num">${mm(o.cod)}</td></tr>`).join("") + `</tbody></table>` : `<div class="empty-box">${DL.state === "ok" ? "Tanlangan davrda yakunlangan yetkazib berish yo'q" : ""}</div>`;
}
["dlrFrom", "dlrTo"].forEach(id => $(id).addEventListener("change", dlrRender));

// ======================= KURYER MOBIL KO'RINISHI (#kuryer) =======================
const lgKv = document.createElement("div");
lgKv.id = "kuryerView";
lgKv.innerHTML = `<div class="mhead">Tsunami — Yetkazmalarim</div>
  <label class="mlabel">Ismingiz<input id="kvName" list="kvNames" placeholder="Ismingizni yozing" maxlength="80"></label><datalist id="kvNames"></datalist>
  <div class="status" id="kvStatus"></div><div id="kvList"></div><a class="mback" href="#logistika">Boshqaruv paneliga</a>`;
document.body.appendChild(lgKv);
function kvRender() {
  if (!document.body.classList.contains("kuryerv")) return;
  $("kvNames").innerHTML = KU.list.map(k => `<option value="${esc(k.name)}">`).join("");
  const name = lgK($("kvName").value);
  $("kvStatus").textContent = [lgLine(DL, "Yetkazmalar"), DL.msg].filter(Boolean).join(" · ");
  if (!name) { $("kvList").innerHTML = `<div class="empty-box">Yetkazmalaringizni ko'rish uchun ismingizni yozing.</div>`; return; }
  const today = lgToday(), mine = DL.list.filter(d => lgK(d.courier) === name);
  const open = mine.filter(d => d.st === "given" || d.st === "way"), done = mine.filter(d => (d.st === "done" || d.st === "back") && d.doneAt.slice(0, 10) === today);
  $("kvList").innerHTML = (open.length ? open.map(d => dlCard(d, true)).join("") : `<div class="empty-box">${DL.state === "ok" ? "Hozir sizda yetkaziladigan buyurtma yo'q." : ""}</div>`)
    + (done.length ? `<h4 style="margin:16px 0 4px">Bugun yakunlangan: ${done.length}</h4>` + done.map(d => dlCard(d, true)).join("") : "");
}
$("kvName").addEventListener("input", () => { try { localStorage.setItem("tsunami_kuryer", $("kvName").value.trim()); } catch (e) {} kvRender(); });
$("kvList").addEventListener("click", e => dlClick(e, kvRender));
const lgOrigRender = render;
render = function (id) {
  const on = id === "kuryer"; document.body.classList.toggle("kuryerv", on);
  if (on) { document.body.classList.remove("agentv"); document.title = "Yetkazmalarim — Tsunami"; try { if (!$("kvName").value) $("kvName").value = localStorage.getItem("tsunami_kuryer") || ""; } catch (e) {} kvRender(); return; }
  lgOrigRender(id);
};

// ======================= Yo'naltirish va yuklash =======================
const LG_APPS = { logistika:{ "Yetkazib berishlar":["dlApp", () => { dlSelects(); dlRender(); }], "Kuryerlar":["kuApp", kuRender], "Tariflar":["tfApp", tfRender] }, hisobotlar:{ "Yetkazib berish hisoboti":["dlrApp", dlrRender] } };
function lgRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "";
  Object.entries(LG_APPS).forEach(([s, apps]) => Object.entries(apps).forEach(([name, [app, fn]]) => { $(app).classList.remove("fopen"); const on = s === sec && name === n; document.body.classList.toggle(app + "-on", on); if (on) { DL.act = ""; fn(); } }));
}
function lgRenderAll() { const b = document.body.classList; if (b.contains("dlApp-on")) { if (!$("dlApp").classList.contains("fopen")) dlSelects(); dlRender(); } if (b.contains("kuApp-on")) kuRender(); if (b.contains("tfApp-on")) tfRender(); if (b.contains("dlrApp-on")) dlrRender(); kvRender(); if (typeof slRender === "function" && b.contains("sotuvApp-on")) slRender(); }
const lgOrigRenderSub = renderSub;
renderSub = function (i) { lgOrigRenderSub(i); lgRoute(); };
document.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (!o) return; if (o.dataset.open === "dlApp") dlReset(); else if (o.dataset.open === "kuApp") kuReset(); else if (o.dataset.open === "tfApp") tfReset(); });
setInterval(() => { const b = document.body.classList; if (b.contains("dlApp-on") || b.contains("kuryerv")) lgRenderAll(); }, 60000);
kuReset(); tfReset(); dlReset();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { KU.state = TF.state = DL.state = "off"; lgRenderAll(); return; }
  LG.mcp = mcp;
  [[KU, KU_RANGE, kuApply, 300000], [TF, TF_RANGE, tfApply, 300000], [DL, DL_RANGE, dlApply, 60000]].forEach(([o, range, apply, every]) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        if (o.state !== "ok" || !o.list.length) o.state = (ev.error && ev.error.code) || "upstream_error";
        lgRenderAll();
      }, { refetchInterval:every });
    } catch (e) {}
  });
})();
if (location.hash === "#kuryer") render("kuryer"); else lgRoute();
