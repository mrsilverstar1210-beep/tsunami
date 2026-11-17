// ===== Tsunami: Ishlab chiqarish (komplekt yig'ish) =====
// Tarkib → qaysi qismlardan yig'iladi; Ishlab chiqarish hujjati tugatilganda qismlar ombordan yechiladi,
// tayyor tovar shu omborga qismlar tannarxi bilan kiradi («Ombor harakatlari»da «Ishlab chiqarish» turi).
// Bosqichlar, Texnologik karta, Vazifalar, Reja, Guruhlar va hisobotlar shu yerda.
const IC = { mcp:null, me:"", msg:{}, msgT:{} };
const icK = s => String(s || "").trim().toLowerCase();
const icToday = () => new Date().toLocaleDateString("en-CA");
const icR2 = n => Math.round((Number(n) || 0) * 100) / 100;
function icId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function icJson(v, d) { try { const x = JSON.parse(v || ""); return x == null ? d : x; } catch (e) { return d; } }
function icFmsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }

// ---------- kichik ombor: bitta varaq = bitta ro'yxat ----------
function icStore(sheet, last, header, parse) {
  const S = { sheet, range:`'${sheet}'!A1:${last}3000`, header, list:[], raw:0, state:"loading", busy:false };
  S.apply = vals => { const v = Array.isArray(vals) ? vals : []; S.raw = v.length; S.list = []; v.forEach((r, i) => { if (!i || !Array.isArray(r) || !r[0]) return; const o = parse(r, i + 1); if (o) S.list.push(o); }); S.state = "ok"; };
  S.reload = async () => { const r = await IC.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:S.range }, { cache:false }); S.apply(krVals({ result:r })); };
  S.append = async row => {
    if (!S.raw) await IC.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:`'${sheet}'!A1`, values:[header] });
    await IC.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:`'${sheet}'!A1`, values:[row] }); S.raw = Math.max(S.raw, 1) + 1;
  };
  S.update = (row, col, values) => IC.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'${sheet}'!${col}${row}`, values:[values] });
  S.next = () => S.list.reduce((m, x) => Math.max(m, x.number || 0), 0) + 1;
  return S;
}
const ICT = icStore("IC tarkiblar", "J", ["ID", "№", "Holat", "Tayyor tovar", "Chiqadigan soni", "Qismlar (JSON)", "Guruh", "Izoh", "Yaratilgan", "O'zgargan"],
  (r, row) => String(r[2] || "") === "O'chirilgan" ? null : { id:String(r[0]), row, number:Number(r[1]) || 0, product:String(r[3] || ""), out:Number(r[4]) || 1, items:icJson(r[5], []), group:String(r[6] || ""), note:String(r[7] || ""), createdAt:String(r[8] || "") });
const ICB = icStore("IC bosqichlar", "H", ["ID", "№", "Holat", "Bosqich", "Tartib", "Mas'ul", "Izoh", "Yaratilgan"],
  (r, row) => String(r[2] || "") === "O'chirilgan" ? null : { id:String(r[0]), row, number:Number(r[1]) || 0, name:String(r[3] || ""), order:Number(r[4]) || 0, resp:String(r[5] || ""), note:String(r[6] || ""), createdAt:String(r[7] || "") });
const ICK = icStore("IC kartalar", "J", ["ID", "№", "Holat", "Karta nomi", "Tayyor tovar", "Bosqichlar (JSON)", "Guruh", "Izoh", "Yaratilgan", "O'zgargan"],
  (r, row) => String(r[2] || "") === "O'chirilgan" ? null : { id:String(r[0]), row, number:Number(r[1]) || 0, name:String(r[3] || ""), product:String(r[4] || ""), stages:icJson(r[5], []), group:String(r[6] || ""), note:String(r[7] || ""), createdAt:String(r[8] || "") });
const ICG = icStore("IC guruhlar", "E", ["ID", "Holat", "Guruh", "Turi", "Yaratilgan"],
  (r, row) => String(r[1] || "") === "O'chirilgan" ? null : { id:String(r[0]), row, name:String(r[2] || ""), type:String(r[3] || "tarkib") === "karta" ? "karta" : "tarkib", createdAt:String(r[4] || "") });
const ICR = icStore("IC rejalar", "F", ["ID", "Oy", "Tovar", "Reja (dona)", "Holat", "O'zgargan"],
  (r, row) => String(r[4] || "") === "O'chirilgan" ? null : { id:String(r[0]), row, month:String(r[1] || ""), product:String(r[2] || ""), plan:Number(r[3]) || 0 });
const IC_ST = ["Rejada", "Jarayonda", "Tugatilgan", "Bekor qilingan"];
const ICO = icStore("Ishlab chiqarish", "Q", ["ID", "№", "Holat", "Sana", "Tayyor tovar", "Soni", "Tarkib ID", "Karta ID", "Tashkilot|Ombor", "Muddat", "Mas'ul", "Bosqichlar (JSON)", "Ombor harakati ID", "Izoh", "Yaratilgan", "O'zgargan", "Tannarx (JSON)"],
  (r, row) => { const loc = String(r[8] || "").split("|"); return { id:String(r[0]), row, number:Number(r[1]) || 0, status:IC_ST.indexOf(String(r[2] || "")) >= 0 ? String(r[2]) : "Rejada", date:String(r[3] || ""), product:String(r[4] || ""), qty:Number(r[5]) || 0, tarkibId:String(r[6] || ""), cardId:String(r[7] || ""), org:loc[0] || "", wh:loc[1] || "", due:String(r[9] || ""), resp:String(r[10] || ""), steps:icJson(r[11], []), mvId:String(r[12] || ""), note:String(r[13] || ""), createdAt:String(r[14] || ""), cost:icJson(r[16], null) }; });
const IC_STORES = [ICT, ICB, ICK, ICG, ICR, ICO];

// ---------- panellar ----------
const IC_SUBS = { "Tarkib":"icTkApp", "Ishlab chiqarish":"icOrApp", "Bosqichlar":"icBsApp", "Texnologik karta":"icKrApp", "Vazifalar":"icVzApp", "Holat bo'yicha hisobot":"icHlApp", "Reja":"icRjApp", "Guruhlar":"icGrApp", "Xodimlar bo'yicha hisobot":"icXdApp" };
function icPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
(function icCss() {
  const ids = Object.values(IC_SUBS), st = document.createElement("style");
  st.textContent = ids.map(i => `#${i}{display:none}.${i}-on #${i}{display:block}.${i}-on .gen,.${i}-on #kpis{display:none}`).join("")
    + ".icrows td input,.icrows td select{width:100%}.icneed{font-size:12px}.icneed .bad{color:#b91c1c;font-weight:600}.icsteps{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.icsteps span{font-size:11px;border-radius:999px;padding:1px 8px;background:#f3f4f6}.icsteps span.ok{background:#dcfce7;color:#166534}.icplan{width:110px}.icconf{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:8px 0}";
  document.head.appendChild(st);
})();
const icHead = (title, extra) => `<div class="thead"><h3>${title}</h3><div class="hbtns">${extra || ""}</div></div>`;
const icGroupSel = (id, type) => `<label>Guruh<select id="${id}" data-icgrp="${type}"></select></label>`;
FORM_FOCUS.icTkApp = "icTkProd"; FORM_FOCUS.icOrApp = "icOrProd"; FORM_FOCUS.icBsApp = "icBsName"; FORM_FOCUS.icKrApp = "icKrName";

icPanel("icTkApp", `<div class="panel fpanel"><div class="thead"><h3 id="icTkTitle">Yangi tarkib</h3><button type="button" class="closebtn" data-close="icTkApp">Yopish ✕</button></div>
  <form class="kform" id="icTkForm"><div class="kgrid">
    <label class="span2">Tayyor tovar<input id="icTkProd" list="krProducts" maxlength="160" placeholder="Masalan: Gaming PC komplekt"></label>
    <label>Bir yig'ishda chiqadi (dona)<input type="number" id="icTkOut" min="1" step="1" value="1"></label>
    ${icGroupSel("icTkGrp", "tarkib")}
  </div>
  <div class="tvrow"><span class="lbl">Qismlar</span></div>
  <table class="icrows"><thead><tr><th>Qism (tovar)</th><th style="width:120px">Soni</th><th style="width:40px"></th></tr></thead><tbody id="icTkRows"></tbody></table>
  <div class="inrow" style="max-width:560px;margin:8px 0"><input id="icTkAddIn" list="krProducts" placeholder="Qism nomi, SKU yoki shtrix-kod"><button type="button" class="mini" id="icTkAdd">Qo'shish</button></div>
  <label class="full">Izoh<input id="icTkNote" maxlength="300" placeholder="ixtiyoriy"></label>
  <div class="kbtns"><button type="button" class="pri" id="icTkSave">Saqlash</button></div><div class="status" id="icTkFmsg"></div></form></div>
  <div class="panel">${icHead("Tarkiblar", `<input class="search" id="icTkQ" placeholder="Qidirish: tovar, qism"><button type="button" class="openbtn" data-open="icTkApp">+ Yangi tarkib</button>`)}
  <div class="tmeta">Tarkib — tayyor tovar qaysi qismlardan yig'ilishi. Ishlab chiqarish tugatilganda shu qismlar ombordan yechiladi.</div><div class="status" id="icTkStatus"></div><div id="icTkList"></div></div>`);

icPanel("icOrApp", `<div class="panel fpanel"><div class="thead"><h3>Yangi ishlab chiqarish</h3><button type="button" class="closebtn" data-close="icOrApp">Yopish ✕</button></div>
  <form class="kform" id="icOrForm"><div class="kgrid">
    <label>Sana<input type="date" id="icOrDate"></label>
    <label class="span2">Tayyor tovar (tarkibi bor)<select id="icOrProd"></select></label>
    <label>Soni<input type="number" id="icOrQty" min="1" step="1" value="1"></label>
    <label>Tashkilot<select id="icOrOrg"></select></label>
    <label>Ombor<select id="icOrWh"></select></label>
    <label>Texnologik karta<select id="icOrCard"></select></label>
    <label>Muddat<input type="date" id="icOrDue"></label>
    <label>Mas'ul<input id="icOrResp" list="icPeople" maxlength="80" placeholder="ixtiyoriy"></label>
  </div>
  <div id="icOrNeed" class="icneed"></div>
  <label class="full">Izoh<input id="icOrNote" maxlength="300" placeholder="ixtiyoriy"></label>
  <div class="kbtns"><button type="button" class="pri" id="icOrSave">Saqlash</button></div><div class="status" id="icOrFmsg"></div></form></div>
  <div class="panel">${icHead("Ishlab chiqarish hujjatlari", `<input class="search" id="icOrQ" placeholder="Qidirish: tovar, mas'ul"><div class="filters" id="icOrFilters"></div><button type="button" class="openbtn" data-open="icOrApp">+ Yangi hujjat</button>`)}
  <div class="status" id="icOrStatus"></div><div id="icOrConf"></div><div id="icOrList"></div></div>
  <datalist id="icPeople"></datalist>`);

icPanel("icBsApp", `<div class="panel fpanel"><div class="thead"><h3 id="icBsTitle">Yangi bosqich</h3><button type="button" class="closebtn" data-close="icBsApp">Yopish ✕</button></div>
  <form class="kform" id="icBsForm"><div class="kgrid">
    <label class="span2">Bosqich nomi<input id="icBsName" maxlength="80" placeholder="Masalan: Yig'ish, Sinov, Qadoqlash"></label>
    <label>Tartib raqami<input type="number" id="icBsOrder" min="1" step="1"></label>
    <label>Mas'ul (odatiy)<input id="icBsResp" list="icPeople" maxlength="80" placeholder="ixtiyoriy"></label>
  </div><label class="full">Izoh<input id="icBsNote" maxlength="300" placeholder="ixtiyoriy"></label>
  <div class="kbtns"><button type="button" class="pri" id="icBsSave">Saqlash</button></div><div class="status" id="icBsFmsg"></div></form></div>
  <div class="panel">${icHead("Bosqichlar", `<button type="button" class="openbtn" data-open="icBsApp">+ Yangi bosqich</button>`)}<div class="status" id="icBsStatus"></div><div id="icBsList"></div></div>`);

icPanel("icKrApp", `<div class="panel fpanel"><div class="thead"><h3 id="icKrTitle">Yangi texnologik karta</h3><button type="button" class="closebtn" data-close="icKrApp">Yopish ✕</button></div>
  <form class="kform" id="icKrForm"><div class="kgrid">
    <label class="span2">Karta nomi<input id="icKrName" maxlength="100" placeholder="Masalan: PC yig'ish jarayoni"></label>
    <label class="span2">Tayyor tovar<input id="icKrProd" list="krProducts" maxlength="160" placeholder="bo'sh qolsa — har qanday tovar uchun"></label>
    ${icGroupSel("icKrGrp", "karta")}
  </div>
  <div class="tvrow"><span class="lbl">Bosqichlar ketma-ketligi</span></div>
  <div class="inrow" style="max-width:560px"><select id="icKrStageSel"></select><button type="button" class="mini" id="icKrStageAdd">Qo'shish</button></div><div class="chips" id="icKrStages"></div>
  <label class="full">Izoh<input id="icKrNote" maxlength="300" placeholder="ixtiyoriy"></label>
  <div class="kbtns"><button type="button" class="pri" id="icKrSave">Saqlash</button></div><div class="status" id="icKrFmsg"></div></form></div>
  <div class="panel">${icHead("Texnologik kartalar", `<button type="button" class="openbtn" data-open="icKrApp">+ Yangi karta</button>`)}<div class="status" id="icKrStatus"></div><div id="icKrList"></div></div>`);

icPanel("icVzApp", `<div class="panel">${icHead("Ishlab chiqarish vazifalari", `<input class="search" id="icVzQ" placeholder="Qidirish: mas'ul, tovar"><div class="filters" id="icVzFilters"></div>`)}
  <div class="tmeta">Jarayondagi hujjatlarning bajarilmagan bosqichlari. Bosqich bajarilganda kim bajargani yoziladi — «Xodimlar bo'yicha hisobot» shundan tuziladi.</div>
  <div class="status" id="icVzStatus"></div><div id="icVzList"></div></div>`);
icPanel("icHlApp", `<div class="panel">${icHead("Holat bo'yicha hisobot")}<div class="status" id="icHlStatus"></div><div id="icHlList"></div></div>`);
icPanel("icRjApp", `<div class="panel">${icHead("Ishlab chiqarish rejasi", `<input type="month" id="icRjMonth">`)}
  <div class="tmeta">Oylik reja (dona). Fakt — shu oyda tugatilgan hujjatlar.</div>
  <div class="inrow" style="max-width:560px;margin:8px 0"><input id="icRjProd" list="krProducts" placeholder="Tovar"><input type="number" id="icRjPlan" min="0" step="1" placeholder="Reja" style="max-width:110px"><button type="button" class="mini" id="icRjAdd">Qo'shish</button></div>
  <div class="status" id="icRjStatus"></div><div id="icRjList"></div></div>`);
icPanel("icGrApp", `<div class="panel">${icHead("Guruhlar")}
  <div class="inrow" style="max-width:640px;margin:8px 0"><input id="icGrName" maxlength="80" placeholder="Guruh nomi"><select id="icGrType"><option value="tarkib">Tarkib guruhi</option><option value="karta">Texnologik karta guruhi</option></select><button type="button" class="mini" id="icGrAdd">Qo'shish</button></div>
  <div class="status" id="icGrStatus"></div><div id="icGrList"></div></div>`);
icPanel("icXdApp", `<div class="panel">${icHead("Xodimlar bo'yicha hisobot", `<input type="month" id="icXdMonth">`)}
  <div class="tmeta">Kim qaysi tovar bo'yicha nechta bosqichni bajargani (bosqich bajarilgan kun bo'yicha).</div><div class="status" id="icXdStatus"></div><div id="icXdList"></div></div>`);

function icSay(key, m) { IC.msg[key] = m; clearTimeout(IC.msgT[key]); IC.msgT[key] = setTimeout(() => { IC.msg[key] = ""; icRenderAll(); }, 7000); icRenderAll(); }
function icLine(stores, key) {
  const bad = stores.find(s => s.state !== "ok");
  const line = !bad ? "" : bad.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : bad.state === "off" ? "Bu bo'lim tizimga kirgan holda ishlaydi." : (krCodeMsg(bad.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi.");
  return [line, IC.msg[key]].filter(Boolean).join(" · ");
}
async function icDo(stores, key, fn) {
  if (!IC.mcp) { icSay(key, krDbLine() || "Tsunami bazasi ulanmagan."); return false; }
  if (stores.some(s => s.busy)) return false;
  stores.forEach(s => { s.busy = true; });
  let ok = true;
  try { for (const s of stores) await s.reload(); await fn(); } catch (e) { ok = false; if (e) icSay(key, krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."); }
  stores.forEach(s => { s.busy = false; });
  for (const s of stores) { try { await s.reload(); } catch (e) {} }
  icRenderAll();
  return ok;
}
function icGroups(type) { return ICG.list.filter(g => g.type === type).map(g => g.name).sort(); }
function icFillGroups() { document.querySelectorAll("select[data-icgrp]").forEach(s => { const v = s.value; s.innerHTML = `<option value="">— guruhsiz —</option>` + icGroups(s.dataset.icgrp).map(n => `<option${n === v ? " selected" : ""}>${esc(n)}</option>`).join(""); }); }
function icPeople() {
  const set = new Set();
  try { (typeof HX !== "undefined" && HX.list ? HX.list : []).forEach(x => { if (x && x.name && x.st !== "gone") set.add(x.name); }); } catch (e) {}
  ICB.list.forEach(b => { if (b.resp) set.add(b.resp); }); ICO.list.forEach(o => { if (o.resp) set.add(o.resp); });
  if (IC.me) set.add(IC.me);
  $("icPeople").innerHTML = [...set].sort().map(n => `<option value="${esc(n)}">`).join("");
}
const icProdName = v => { const p = krProduct(v) || KR.products.find(x => x.sku === v || x.barcode === v); return p ? p.name : String(v || "").trim(); };

// ======================= TARKIB =======================
const TK = { items:[], editId:"", q:"", pendDel:"" };
function icTkRows() {
  $("icTkRows").innerHTML = TK.items.length ? TK.items.map((it, i) => `<tr><td><b>${esc(it.name)}</b>${omMarked(it.name) ? ` <span class="tmeta">IMEI</span>` : ""}</td><td><input type="number" min="0.001" step="any" data-tkq="${i}" value="${esc(it.qty)}"></td><td><button type="button" class="mini" data-tkrm="${i}">×</button></td></tr>`).join("") : `<tr><td colspan="3" class="empty">Qism qo'shilmagan</td></tr>`;
}
function icTkReset() { TK.editId = ""; TK.items = []; ["icTkProd", "icTkNote", "icTkAddIn"].forEach(i => { $(i).value = ""; }); $("icTkOut").value = 1; icFillGroups(); $("icTkGrp").value = ""; $("icTkTitle").textContent = "Yangi tarkib"; icTkRows(); icFmsg("icTkFmsg", ""); }
function icTkLoad(id) { const t = ICT.list.find(x => x.id === id); if (!t) return; icTkReset(); TK.editId = id; $("icTkProd").value = t.product; $("icTkOut").value = t.out; $("icTkGrp").value = t.group; $("icTkNote").value = t.note; TK.items = t.items.map(x => ({ name:x.name, qty:x.qty })); $("icTkTitle").textContent = `Tahrirlash: ${t.product}`; icTkRows(); openForm("icTkApp", true); }
function icTkAdd() { const v = $("icTkAddIn").value.trim(); if (!v) return; const n = icProdName(v); const ex = TK.items.find(x => icK(x.name) === icK(n)); if (ex) ex.qty = Number(ex.qty || 0) + 1; else TK.items.push({ name:n, qty:1 }); $("icTkAddIn").value = ""; icTkRows(); $("icTkAddIn").focus(); }
async function icTkSave() {
  const product = icProdName($("icTkProd").value), out = Number($("icTkOut").value), group = $("icTkGrp").value, note = $("icTkNote").value.trim();
  if (!product) return icFmsg("icTkFmsg", "Tayyor tovar nomini kiriting.", true);
  if (!(out >= 1) || Math.floor(out) !== out) return icFmsg("icTkFmsg", "Chiqadigan sonini butun son bilan kiriting.", true);
  if (!TK.items.length) return icFmsg("icTkFmsg", "Kamida bitta qism qo'shing.", true);
  for (const it of TK.items) { if (!(Number(it.qty) > 0)) return icFmsg("icTkFmsg", `«${it.name}»: sonini kiriting.`, true); if (icK(it.name) === icK(product)) return icFmsg("icTkFmsg", "Tayyor tovar o'zining qismi bo'lmasin.", true); }
  const items = TK.items.map(x => ({ name:x.name, qty:Number(x.qty) }));
  const editId = TK.editId;
  const ok = await icDo([ICT], "tk", async () => {
    const ex = editId ? ICT.list.find(x => x.id === editId) : null;
    if (editId && !ex) { icFmsg("icTkFmsg", "Bu tarkib boshqa joyda o'chirilgan.", true); throw null; }
    const dup = ICT.list.find(x => x.id !== editId && icK(x.product) === icK(product));
    if (dup) { icFmsg("icTkFmsg", `«${product}» uchun tarkib bor (№${dup.number}): o'shani tahrirlang.`, true); throw null; }
    const now = new Date().toISOString(), row = [krT(ex ? ex.id : icId("T")), ex ? ex.number : ICT.next(), "Faol", krT(product), out, krT(JSON.stringify(items)), krT(group), krT(note), krT(ex ? ex.createdAt : now), krT(now)];
    if (ex) await ICT.update(ex.row, "A", row); else await ICT.append(row);
    icSay("tk", `«${product}» tarkibi saqlandi.`);
  });
  if (ok) { icTkReset(); openForm("icTkApp", false); }
}
function icTkRender() {
  $("icTkStatus").textContent = icLine([ICT], "tk");
  const q = icK(TK.q), list = ICT.list.filter(t => !q || icK(t.product).indexOf(q) >= 0 || t.items.some(x => icK(x.name).indexOf(q) >= 0)).sort((a, b) => a.product.localeCompare(b.product));
  $("icTkList").innerHTML = list.length ? `<table><thead><tr><th>№</th><th>Tayyor tovar</th><th>Qismlar</th><th>Guruh</th><th></th></tr></thead><tbody>` + list.map(t => `<tr><td>${t.number}</td><td><b>${esc(t.product)}</b><div class="tmeta">bir yig'ishda ${t.out} dona</div>${t.note ? `<div class="tmeta">${esc(t.note)}</div>` : ""}</td><td class="small">${t.items.map(x => `${esc(x.name)} × ${esc(x.qty)}`).join("<br>")}</td><td>${esc(t.group) || "—"}</td><td class="krAct"><button data-tkedit="${esc(t.id)}">Tahrirlash</button><button data-tkdel="${esc(t.id)}">${TK.pendDel === t.id ? "Ha, o'chirish" : "O'chirish"}</button></td></tr>`).join("") + `</tbody></table>`
    : `<div class="empty-box">${ICT.state === "ok" ? "Hozircha tarkib yo'q: «Yangi tarkib» tugmasini bosing" : ""}</div>`;
}
async function icTkDel(id) {
  await icDo([ICT, ICO], "tk", async () => {
    const t = ICT.list.find(x => x.id === id); if (!t) throw null;
    if (ICO.list.some(o => o.tarkibId === id && (o.status === "Rejada" || o.status === "Jarayonda"))) { icSay("tk", `«${t.product}» tarkibi ochiq ishlab chiqarish hujjatida ishlatilmoqda.`); throw null; }
    await ICT.update(t.row, "C", ["O'chirilgan"]); icSay("tk", `«${t.product}» tarkibi o'chirildi.`);
  });
  TK.pendDel = "";
}

// ======================= BOSQICHLAR =======================
const BS = { editId:"", pendDel:"" };
function icBsReset() { BS.editId = ""; ["icBsName", "icBsResp", "icBsNote"].forEach(i => { $(i).value = ""; }); $("icBsOrder").value = ICB.list.reduce((m, b) => Math.max(m, b.order), 0) + 1; $("icBsTitle").textContent = "Yangi bosqich"; icFmsg("icBsFmsg", ""); }
function icBsLoad(id) { const b = ICB.list.find(x => x.id === id); if (!b) return; icBsReset(); BS.editId = id; $("icBsName").value = b.name; $("icBsOrder").value = b.order; $("icBsResp").value = b.resp; $("icBsNote").value = b.note; $("icBsTitle").textContent = `Tahrirlash: ${b.name}`; openForm("icBsApp", true); }
async function icBsSave() {
  const name = $("icBsName").value.trim(), order = Number($("icBsOrder").value) || 0, resp = $("icBsResp").value.trim(), note = $("icBsNote").value.trim(), editId = BS.editId;
  if (!name) return icFmsg("icBsFmsg", "Bosqich nomini kiriting.", true);
  const ok = await icDo([ICB], "bs", async () => {
    const ex = editId ? ICB.list.find(x => x.id === editId) : null;
    if (ICB.list.some(x => x.id !== editId && icK(x.name) === icK(name))) { icFmsg("icBsFmsg", `«${name}» bosqichi bor.`, true); throw null; }
    const row = [krT(ex ? ex.id : icId("B")), ex ? ex.number : ICB.next(), "Faol", krT(name), order, krT(resp), krT(note), krT(ex ? ex.createdAt : new Date().toISOString())];
    if (ex) await ICB.update(ex.row, "A", row); else await ICB.append(row);
    icSay("bs", `«${name}» bosqichi saqlandi.`);
  });
  if (ok) { icBsReset(); openForm("icBsApp", false); }
}
function icBsRender() {
  $("icBsStatus").textContent = icLine([ICB], "bs");
  const list = ICB.list.slice().sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  $("icBsList").innerHTML = list.length ? `<table><thead><tr><th>Tartib</th><th>Bosqich</th><th>Mas'ul</th><th>Izoh</th><th></th></tr></thead><tbody>` + list.map(b => `<tr><td>${b.order}</td><td><b>${esc(b.name)}</b></td><td>${esc(b.resp) || "—"}</td><td class="tmeta">${esc(b.note)}</td><td class="krAct"><button data-bsedit="${esc(b.id)}">Tahrirlash</button><button data-bsdel="${esc(b.id)}">${BS.pendDel === b.id ? "Ha, o'chirish" : "O'chirish"}</button></td></tr>`).join("") + `</tbody></table>`
    : `<div class="empty-box">${ICB.state === "ok" ? "Hozircha bosqich yo'q: masalan «Yig'ish», «Sinov», «Qadoqlash»" : ""}</div>`;
}

// ======================= TEXNOLOGIK KARTA =======================
const KK = { editId:"", stages:[], pendDel:"" };
function icKrStagesDraw() {
  const sv = $("icKrStageSel").value;
  $("icKrStageSel").innerHTML = `<option value="">— bosqichni tanlang —</option>` + ICB.list.slice().sort((a, b) => a.order - b.order).map(b => `<option value="${esc(b.name)}"${b.name === sv ? " selected" : ""}>${esc(b.name)}</option>`).join("");
  $("icKrStages").innerHTML = KK.stages.length ? KK.stages.map((s, i) => `<span class="xchip">${i + 1}. ${esc(s)}<button type="button" data-krrm="${i}">×</button></span>`).join("") : `<span class="tmeta">Bosqich qo'shilmagan (avval «Bosqichlar» menyusida yarating)</span>`;
}
function icKrReset() { KK.editId = ""; KK.stages = []; ["icKrName", "icKrProd", "icKrNote"].forEach(i => { $(i).value = ""; }); icFillGroups(); $("icKrGrp").value = ""; $("icKrTitle").textContent = "Yangi texnologik karta"; icKrStagesDraw(); icFmsg("icKrFmsg", ""); }
function icKrLoad(id) { const k = ICK.list.find(x => x.id === id); if (!k) return; icKrReset(); KK.editId = id; $("icKrName").value = k.name; $("icKrProd").value = k.product; $("icKrGrp").value = k.group; $("icKrNote").value = k.note; KK.stages = k.stages.slice(); $("icKrTitle").textContent = `Tahrirlash: ${k.name}`; icKrStagesDraw(); openForm("icKrApp", true); }
async function icKrSave() {
  const name = $("icKrName").value.trim(), product = $("icKrProd").value.trim() ? icProdName($("icKrProd").value) : "", group = $("icKrGrp").value, note = $("icKrNote").value.trim(), stages = KK.stages.slice(), editId = KK.editId;
  if (!name) return icFmsg("icKrFmsg", "Karta nomini kiriting.", true);
  if (!stages.length) return icFmsg("icKrFmsg", "Kamida bitta bosqich qo'shing.", true);
  const ok = await icDo([ICK], "kr", async () => {
    const ex = editId ? ICK.list.find(x => x.id === editId) : null;
    if (ICK.list.some(x => x.id !== editId && icK(x.name) === icK(name))) { icFmsg("icKrFmsg", `«${name}» kartasi bor.`, true); throw null; }
    const now = new Date().toISOString(), row = [krT(ex ? ex.id : icId("K")), ex ? ex.number : ICK.next(), "Faol", krT(name), krT(product), krT(JSON.stringify(stages)), krT(group), krT(note), krT(ex ? ex.createdAt : now), krT(now)];
    if (ex) await ICK.update(ex.row, "A", row); else await ICK.append(row);
    icSay("kr", `«${name}» kartasi saqlandi.`);
  });
  if (ok) { icKrReset(); openForm("icKrApp", false); }
}
function icKrRender() {
  $("icKrStatus").textContent = icLine([ICK, ICB], "kr");
  const list = ICK.list.slice().sort((a, b) => a.name.localeCompare(b.name));
  $("icKrList").innerHTML = list.length ? `<table><thead><tr><th>№</th><th>Karta</th><th>Tayyor tovar</th><th>Bosqichlar</th><th>Guruh</th><th></th></tr></thead><tbody>` + list.map(k => `<tr><td>${k.number}</td><td><b>${esc(k.name)}</b>${k.note ? `<div class="tmeta">${esc(k.note)}</div>` : ""}</td><td>${esc(k.product) || "<i>har qanday</i>"}</td><td class="small">${k.stages.map((s, i) => `${i + 1}. ${esc(s)}`).join("<br>")}</td><td>${esc(k.group) || "—"}</td><td class="krAct"><button data-kredit="${esc(k.id)}">Tahrirlash</button><button data-krdel="${esc(k.id)}">${KK.pendDel === k.id ? "Ha, o'chirish" : "O'chirish"}</button></td></tr>`).join("") + `</tbody></table>`
    : `<div class="empty-box">${ICK.state === "ok" ? "Hozircha karta yo'q" : ""}</div>`;
}

// ======================= ISHLAB CHIQARISH HUJJATLARI =======================
const ORD = { filter:"Rejada", q:"", conf:"", pend:"", busyConf:false };
const icTarkibFor = product => ICT.list.find(t => icK(t.product) === icK(product));
// Kerakli qismlar: tarkib × (soni / chiqadigan soni)
function icNeed(t, qty) { const f = (Number(qty) || 0) / (t.out || 1); return t.items.map(x => ({ name:x.name, qty:Math.round(Number(x.qty) * f * 1000) / 1000 })); }
// Ombordagi FIFO bo'yicha qaysi qismlar yechilishi va ularning tannarxi
function icPlan(o) {
  const t = ICT.list.find(x => x.id === o.tarkibId) || icTarkibFor(o.product); if (!t) return { err:`«${o.product}» uchun tarkib topilmadi.` };
  const L = omLedger(), need = icNeed(t, o.qty), use = [], cost = {}, short = [];
  need.forEach(n => {
    const units = L.units.filter(u => u.st === "in" && icK(u.name) === icK(n.name) && u.org === o.org && u.wh === o.wh).sort((a, b) => String(a.kdate).localeCompare(String(b.kdate)));
    if (units.length || omMarked(n.name)) {
      const q = Math.ceil(n.qty), got = units.slice(0, q);
      if (got.length < q) short.push(`${n.name}: kerak ${q}, bor ${units.length}`);
      got.forEach(u => { cost[u.cur] = (cost[u.cur] || 0) + (Number(u.cost) || 0); });
      use.push({ name:n.name, qty:got.length, imeis:got.map(u => u.imei), role:"use" });
      return;
    }
    const lots = L.lots.filter(l => icK(l.name) === icK(n.name) && l.org === o.org && l.wh === o.wh).sort((a, b) => String(a.kdate).localeCompare(String(b.kdate)));
    const have = lots.reduce((a, l) => a + l.qty, 0);
    if (have + 1e-9 < n.qty) short.push(`${n.name}: kerak ${n.qty}, bor ${icR2(have)}`);
    let left = n.qty; lots.forEach(l => { if (left <= 0) return; const q = Math.min(l.qty, left); left -= q; cost[l.cur] = (cost[l.cur] || 0) + (Number(l.cost) || 0) * q; });
    use.push({ name:n.name, qty:n.qty, imeis:[], role:"use" });
  });
  return { t, need, use, cost, short };
}
// Tayyor tovar tannarxi bitta valyutada: hammasi so'mda bo'lsa so'm, aks holda $ (so'm qismlar kurs bo'yicha)
function icUnitCost(cost, qty, rate) {
  const usd = Number(cost.USD) || 0, uzs = Number(cost.UZS) || 0;
  if (!usd && uzs) return { cur:"UZS", unit:Math.round(uzs / qty) };
  if (uzs && !(rate > 0)) return { err:"Qismlarning bir qismi so'mda: dollarga o'tkazish uchun Sozlamalar → Asosiy sozlamalar'da kursni kiriting." };
  return { cur:"USD", unit:icR2((usd + (uzs ? uzs / rate : 0)) / qty) };
}
function icOrFill() {
  const pv = $("icOrProd").value;
  $("icOrProd").innerHTML = ICT.list.length ? ICT.list.slice().sort((a, b) => a.product.localeCompare(b.product)).map(t => `<option value="${esc(t.id)}"${t.id === pv ? " selected" : ""}>${esc(t.product)}</option>`).join("") : `<option value="">— avval «Tarkib» yarating —</option>`;
  const ov = $("icOrOrg").value; $("icOrOrg").innerHTML = omOrgOpts(ov); const org = $("icOrOrg").value, wv = $("icOrWh").value; $("icOrWh").innerHTML = omWhOpts(org, wv);
  const t = ICT.list.find(x => x.id === $("icOrProd").value), cv = $("icOrCard").value;
  $("icOrCard").innerHTML = `<option value="">— bosqichsiz —</option>` + ICK.list.filter(k => !k.product || (t && icK(k.product) === icK(t.product))).map(k => `<option value="${esc(k.id)}"${k.id === cv ? " selected" : ""}>${esc(k.name)} (${k.stages.length} bosqich)</option>`).join("");
  icOrNeedDraw();
}
function icOrNeedDraw() {
  const t = ICT.list.find(x => x.id === $("icOrProd").value), qty = Number($("icOrQty").value) || 0;
  if (!t || !(qty > 0)) { $("icOrNeed").innerHTML = ""; return; }
  const at = omAt($("icOrOrg").value, $("icOrWh").value);
  $("icOrNeed").innerHTML = `<div class="tmeta" style="margin:6px 0 2px">Kerak bo'ladigan qismlar (tanlangan omborda):</div>` + icNeed(t, qty).map(n => { const have = (at[icK(n.name)] || {}).qty || 0; return `<div>${esc(n.name)} — ${n.qty} dona · omborda <span class="${have + 1e-9 < n.qty ? "bad" : ""}">${icR2(have)}</span></div>`; }).join("");
}
function icOrReset() { ["icOrNote", "icOrResp", "icOrDue"].forEach(i => { $(i).value = ""; }); $("icOrDate").value = icToday(); $("icOrQty").value = 1; icOrFill(); icFmsg("icOrFmsg", ""); }
async function icOrSave() {
  const t = ICT.list.find(x => x.id === $("icOrProd").value), qty = Number($("icOrQty").value), org = $("icOrOrg").value, wh = $("icOrWh").value, date = $("icOrDate").value || icToday(), due = $("icOrDue").value, resp = $("icOrResp").value.trim(), note = $("icOrNote").value.trim(), card = ICK.list.find(x => x.id === $("icOrCard").value);
  if (!t) return icFmsg("icOrFmsg", "Tayyor tovarni tanlang (tarkibi bo'lishi kerak).", true);
  if (!(qty >= 1) || Math.floor(qty) !== qty) return icFmsg("icOrFmsg", "Sonini butun son bilan kiriting.", true);
  if (!org || !wh) return icFmsg("icOrFmsg", "Tashkilot va omborni tanlang.", true);
  if (due && due < date) return icFmsg("icOrFmsg", "Muddat sanadan oldin bo'lmasin.", true);
  const steps = card ? card.stages.map(name => { const b = ICB.list.find(x => icK(x.name) === icK(name)); return { name, resp:(b && b.resp) || resp, done:false, by:"", at:"" }; }) : [];
  const ok = await icDo([ICO], "or", async () => {
    const now = new Date().toISOString(), number = ICO.next();
    await ICO.append([krT(icId("P")), number, "Rejada", krT(date), krT(t.product), qty, krT(t.id), krT(card ? card.id : ""), krT(org + "|" + wh), krT(due), krT(resp), krT(JSON.stringify(steps)), "", krT(note), krT(now), krT(now), ""]);
    icSay("or", `Ishlab chiqarish №${number} yaratildi: ${t.product} × ${qty}.`);
  });
  if (ok) { ORD.filter = "Rejada"; icOrReset(); openForm("icOrApp", false); }
}
const icLate = o => (o.status === "Rejada" || o.status === "Jarayonda") && o.due && o.due < icToday();
function icOrRender() {
  const counts = {}; IC_ST.forEach(s => { counts[s] = ICO.list.filter(o => o.status === s).length; });
  $("icOrFilters").innerHTML = IC_ST.map(s => `<button data-f="${s}" class="${ORD.filter === s ? "on" : ""}">${s} (${counts[s]})</button>`).join("");
  $("icOrStatus").textContent = icLine([ICO, ICT], "or");
  const q = icK(ORD.q), list = ICO.list.filter(o => o.status === ORD.filter && (!q || icK(o.product).indexOf(q) >= 0 || icK(o.resp).indexOf(q) >= 0)).sort((a, b) => b.number - a.number);
  const badge = o => o.status === "Tugatilgan" ? `<span class="st st-done">Tugatilgan</span>` : o.status === "Jarayonda" ? `<span class="st st-jarayonda">Jarayonda</span>` : o.status === "Rejada" ? `<span class="st st-yangi">Rejada</span>` : `<span class="st st-draft">Bekor qilingan</span>`;
  $("icOrList").innerHTML = list.length ? `<table><thead><tr><th>№</th><th>Sana</th><th>Tayyor tovar</th><th>Soni</th><th>Ombor</th><th>Muddat / mas'ul</th><th>Holat</th><th></th></tr></thead><tbody>` + list.map(o => {
    const done = o.steps.filter(s => s.done).length;
    const steps = o.steps.length ? `<div class="icsteps">${o.steps.map(s => `<span class="${s.done ? "ok" : ""}" title="${esc(s.done ? `${s.by} · ${String(s.at).slice(0, 10)}` : s.resp)}">${s.done ? "✓ " : ""}${esc(s.name)}</span>`).join("")}</div>` : "";
    const cost = o.cost && o.cost.unit != null ? `<div class="tmeta">tannarx: ${krMoney(o.cost.unit, o.cost.cur)} / dona</div>` : "";
    const act = o.status === "Rejada" ? `<button data-orstart="${esc(o.id)}">Boshlash</button><button data-orfin="${esc(o.id)}">Tugatish</button><button data-orcan="${esc(o.id)}">${ORD.pend === o.id ? "Ha, bekor" : "Bekor qilish"}</button>`
      : o.status === "Jarayonda" ? `<button data-orfin="${esc(o.id)}">Tugatish</button><button data-orcan="${esc(o.id)}">${ORD.pend === o.id ? "Ha, bekor" : "Bekor qilish"}</button>`
      : o.status === "Tugatilgan" ? `<button data-orundo="${esc(o.id)}">${ORD.pend === o.id ? "Ha, qaytarish" : "Bekor qilish"}</button>` : "";
    return `<tr class="${o.status === "Bekor qilingan" ? "slx" : ""}"><td>${o.number}</td><td>${esc(o.date.slice(0, 10))}</td><td><b>${esc(o.product)}</b>${steps}${o.note ? `<div class="tmeta">${esc(o.note)}</div>` : ""}${cost}</td><td class="num">${o.qty}</td><td>${esc(o.org)}<div class="tmeta">${esc(o.wh)}</div></td><td>${o.due ? `<span class="${icLate(o) ? "late" : ""}">${esc(o.due)}</span>` : "—"}<div class="tmeta">${esc(o.resp)}${o.steps.length ? ` · ${done}/${o.steps.length} bosqich` : ""}</div></td><td>${badge(o)}${icLate(o) ? ` <span class="st st-late">Kechikdi</span>` : ""}</td><td class="krAct">${act}</td></tr>`;
  }).join("") + `</tbody></table>` : `<div class="empty-box">${ICO.state === "ok" ? (ICO.list.length ? "Bu ro'yxatda hujjat yo'q" : "Hozircha hujjat yo'q: «Yangi hujjat» tugmasini bosing") : ""}</div>`;
  icOrConfDraw();
}
// Tugatish oldidan tasdiq: qaysi qismlar yechiladi, tannarx qancha
function icOrConfDraw() {
  const o = ICO.list.find(x => x.id === ORD.conf);
  if (!o || (o.status !== "Rejada" && o.status !== "Jarayonda")) { $("icOrConf").innerHTML = ""; return; }
  const p = icPlan(o);
  if (p.err) { $("icOrConf").innerHTML = `<div class="icconf"><b>№${o.number} ni tugatib bo'lmaydi:</b> ${esc(p.err)} <button type="button" class="mini" data-orx="1">Yopish</button></div>`; return; }
  const left = o.steps.filter(s => !s.done).length, uc = icUnitCost(p.cost, o.qty, typeof vsRate === "function" ? vsRate() : 0);
  $("icOrConf").innerHTML = `<div class="icconf"><b>№${o.number} — ${esc(o.product)} × ${o.qty} tugatilsinmi?</b>
    <div class="tmeta" style="margin:4px 0">${esc(o.org)} · ${esc(o.wh)} omboridan yechiladi:</div>
    ${p.use.map(u => `<div style="font-size:13px">${esc(u.name)} — ${u.qty} dona${u.imeis.length ? ` <span class="tmeta mono">(${u.imeis.map(esc).join(", ")})</span>` : ""}</div>`).join("")}
    ${p.short.length ? `<div class="status err" style="margin-top:6px">Omborda yetmaydi: ${p.short.map(esc).join("; ")}. Avval kirim qiling yoki boshqa omborni tanlang.</div>` : uc.err ? `<div class="status err">${esc(uc.err)}</div>` : `<div class="tmeta" style="margin-top:6px">Tayyor tovar tannarxi: <b>${krMoney(uc.unit, uc.cur)}</b> / dona (qismlar FIFO tannarxi bo'yicha).</div>`}
    ${left ? `<div class="tmeta" style="color:#92400e">Diqqat: ${left} ta bosqich hali bajarilmagan.</div>` : ""}
    <div class="kbtns" style="justify-content:flex-start;margin-top:8px">${p.short.length || uc.err ? "" : `<button type="button" class="pri" data-orok="${esc(o.id)}">Tasdiqlash</button>`}<button type="button" class="sec" data-orx="1">Yopish</button></div></div>`;
}
async function icOrStatus(id, status) {
  await icDo([ICO], "or", async () => {
    const o = ICO.list.find(x => x.id === id); if (!o) throw null;
    await ICO.update(o.row, "C", [status]); await ICO.update(o.row, "P", [krT(new Date().toISOString())]);
    icSay("or", `№${o.number}: ${status.toLowerCase()}.`);
  });
  ORD.pend = "";
}
async function icOrFinish(id) {
  if (ORD.busyConf) return; ORD.busyConf = true;
  await icDo([ICO, ICT], "or", async () => {
    try { await omvReload(); } catch (e) {}
    const o = ICO.list.find(x => x.id === id); if (!o || (o.status !== "Rejada" && o.status !== "Jarayonda")) { icSay("or", "Hujjat holati o'zgargan, ro'yxatni tekshiring."); throw null; }
    const p = icPlan(o); if (p.err) { icSay("or", p.err); throw null; }
    if (p.short.length) { icSay("or", "Omborda qism yetmaydi: " + p.short.join("; ")); throw null; }
    const uc = icUnitCost(p.cost, o.qty, typeof vsRate === "function" ? vsRate() : 0); if (uc.err) { icSay("or", uc.err); throw null; }
    const now = new Date().toISOString(), mvId = omId("H"), number = OMV.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    const items = p.use.concat([{ name:o.product, qty:o.qty, imeis:[], role:"out", cost:uc.unit, cur:uc.cur }]);
    await IC.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Ombor harakatlari'!A1", values:[[krT(mvId), number, OM_TYPES.prod, "Yakunlangan", krT(icToday()), krT(o.org + "|" + o.wh), krT(o.org + "|" + o.wh), krT(JSON.stringify(items)), "", krT(`Ishlab chiqarish №${o.number}`), krT(now), ""]] });
    const steps = o.steps.map(s => s.done ? s : Object.assign({}, s, { done:true, by:s.resp || IC.me || "", at:now, auto:true }));
    await ICO.update(o.row, "C", ["Tugatilgan"]);
    await ICO.update(o.row, "L", [krT(JSON.stringify(steps)), krT(mvId)]);
    await ICO.update(o.row, "P", [krT(now), krT(JSON.stringify(Object.assign({ at:now }, uc, { total:p.cost })))]);
    icSay("or", `№${o.number} tugatildi: ${o.product} × ${o.qty} omborga kirdi, qismlar yechildi.`);
    ORD.conf = ""; ORD.filter = "Tugatilgan";
  });
  try { await omvReload(); } catch (e) {}
  ORD.busyConf = false; icRenderAll();
}
// Tugatilgan hujjatni bekor qilish: ombor harakati bekor qilinadi (tayyor tovar hali sotilmagan bo'lishi kerak)
async function icOrUndo(id) {
  await icDo([ICO], "or", async () => {
    try { await omvReload(); } catch (e) {}
    const o = ICO.list.find(x => x.id === id); if (!o || o.status !== "Tugatilgan") throw null;
    const have = (omAt(o.org, o.wh)[icK(o.product)] || {}).qty || 0;
    if (have < o.qty) { icSay("or", `№${o.number}: «${o.product}» dan omborda ${have} dona qolgan (${o.qty} kerak) — sotilgan qismini avval qaytaring.`); throw null; }
    const m = OMV.list.find(x => x.id === o.mvId);
    if (m && !m.cancelled) { await IC.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ombor harakatlari'!D${m.row}`, values:[["Bekor qilingan"]] }); await IC.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ombor harakatlari'!L${m.row}`, values:[[krT(new Date().toISOString())]] }); }
    await ICO.update(o.row, "C", ["Bekor qilingan"]); await ICO.update(o.row, "P", [krT(new Date().toISOString())]);
    icSay("or", `№${o.number} bekor qilindi: qismlar omborga qaytdi, tayyor tovar yechildi.`);
  });
  try { await omvReload(); } catch (e) {}
  ORD.pend = ""; icRenderAll();
}

// ======================= VAZIFALAR =======================
const VZ = { filter:"open", q:"" };
function icTasks() {
  const out = [];
  ICO.list.filter(o => o.status === "Jarayonda" || o.status === "Rejada").forEach(o => o.steps.forEach((s, i) => { if (!s.done) out.push({ o, s, i, first:o.steps.findIndex(x => !x.done) === i }); }));
  return out;
}
function icVzRender() {
  const all = icTasks(), q = icK(VZ.q);
  const counts = { open:all.length, mine:all.filter(t => IC.me && icK(t.s.resp) === icK(IC.me)).length, late:all.filter(t => icLate(t.o)).length };
  $("icVzFilters").innerHTML = [["open", "Hammasi"], ["mine", "Menga"], ["late", "Muddati o'tgan"]].map(([k, l]) => `<button data-f="${k}" class="${VZ.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("icVzStatus").textContent = icLine([ICO], "vz");
  const list = all.filter(t => (VZ.filter === "open" || (VZ.filter === "mine" ? IC.me && icK(t.s.resp) === icK(IC.me) : icLate(t.o))) && (!q || icK(t.s.resp).indexOf(q) >= 0 || icK(t.o.product).indexOf(q) >= 0));
  $("icVzList").innerHTML = list.length ? `<table><thead><tr><th>Hujjat</th><th>Tayyor tovar</th><th>Bosqich</th><th>Mas'ul</th><th>Muddat</th><th></th></tr></thead><tbody>` + list.map(t => `<tr><td>№${t.o.number}<div class="tmeta">${esc(t.o.status)}</div></td><td><b>${esc(t.o.product)}</b> × ${t.o.qty}</td><td>${t.i + 1}. ${esc(t.s.name)}${t.first ? "" : ` <span class="tmeta">(oldingi bosqich kutilmoqda)</span>`}</td><td>${esc(t.s.resp) || "—"}</td><td>${t.o.due ? `<span class="${icLate(t.o) ? "late" : ""}">${esc(t.o.due)}</span>` : "—"}</td><td class="krAct"><input class="icwho" data-vzwho="${esc(t.o.id)}:${t.i}" list="icPeople" placeholder="Kim bajardi" value="${esc(t.s.resp || IC.me)}" style="width:130px"><button data-vzdone="${esc(t.o.id)}:${t.i}">Bajarildi</button></td></tr>`).join("") + `</tbody></table>`
    : `<div class="empty-box">${ICO.state === "ok" ? "Bajarilmagan bosqich yo'q" : ""}</div>`;
}
async function icVzDone(key, who) {
  const [id, i] = key.split(":");
  await icDo([ICO], "vz", async () => {
    const o = ICO.list.find(x => x.id === id), s = o && o.steps[Number(i)]; if (!s || s.done) throw null;
    const steps = o.steps.map((x, j) => j === Number(i) ? Object.assign({}, x, { done:true, by:who || x.resp || IC.me, at:new Date().toISOString() }) : x);
    await ICO.update(o.row, "L", [krT(JSON.stringify(steps))]);
    if (o.status === "Rejada") await ICO.update(o.row, "C", ["Jarayonda"]);
    await ICO.update(o.row, "P", [krT(new Date().toISOString())]);
    icSay("vz", steps.every(x => x.done) ? `№${o.number}: hamma bosqichlar bajarildi — «Ishlab chiqarish» menyusida hujjatni tugating.` : `№${o.number}: «${s.name}» bajarildi.`);
  });
}

// ======================= HISOBOTLAR =======================
function icHlRender() {
  $("icHlStatus").textContent = icLine([ICO], "hl");
  const rows = IC_ST.map(s => { const l = ICO.list.filter(o => o.status === s); return [s, l.length, l.reduce((a, o) => a + o.qty, 0)]; });
  const late = ICO.list.filter(icLate), m = icToday().slice(0, 7), doneM = ICO.list.filter(o => o.status === "Tugatilgan" && o.cost && String(o.cost.at || "").slice(0, 7) === m);
  const byP = {}; ICO.list.filter(o => o.status === "Rejada" || o.status === "Jarayonda").forEach(o => { byP[o.product] = (byP[o.product] || 0) + o.qty; });
  $("icHlList").innerHTML = `<div class="hbtiles">${[["Ochiq hujjatlar", rows[0][1] + rows[1][1]], ["Jarayonda", rows[1][1]], ["Shu oy tugatildi", `${doneM.length} ta · ${doneM.reduce((a, o) => a + o.qty, 0)} dona`], ["Kechikkan", late.length]].map(([l, v]) => `<div class="hbtile"><div class="l">${l}</div><div class="v">${v}</div></div>`).join("")}</div>`
    + `<table><thead><tr><th>Holat</th><th class="num">Hujjatlar</th><th class="num">Dona</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td></tr>`).join("")}</tbody></table>`
    + (Object.keys(byP).length ? `<h4 class="hbh4">Ochiq hujjatlar — tovar bo'yicha</h4><table><thead><tr><th>Tovar</th><th class="num">Dona</th></tr></thead><tbody>${Object.entries(byP).sort((a, b) => b[1] - a[1]).map(([n, q]) => `<tr><td>${esc(n)}</td><td class="num">${q}</td></tr>`).join("")}</tbody></table>` : "")
    + (late.length ? `<h4 class="hbh4">Kechikkanlar</h4><table><thead><tr><th>№</th><th>Tovar</th><th>Muddat</th><th>Mas'ul</th></tr></thead><tbody>${late.map(o => `<tr><td>${o.number}</td><td>${esc(o.product)} × ${o.qty}</td><td class="late">${esc(o.due)}</td><td>${esc(o.resp)}</td></tr>`).join("")}</tbody></table>` : "");
}
function icFact(month) { const f = {}; ICO.list.filter(o => o.status === "Tugatilgan" && String((o.cost && o.cost.at) || o.date).slice(0, 7) === month).forEach(o => { const k = icK(o.product); f[k] = (f[k] || 0) + o.qty; }); return f; }
function icRjRender() {
  if (!$("icRjMonth").value) $("icRjMonth").value = icToday().slice(0, 7);
  const m = $("icRjMonth").value, fact = icFact(m), plans = ICR.list.filter(r => r.month === m), names = {};
  plans.forEach(r => { names[icK(r.product)] = r.product; });
  ICO.list.filter(o => o.status === "Tugatilgan" && fact[icK(o.product)]).forEach(o => { names[icK(o.product)] = names[icK(o.product)] || o.product; });
  $("icRjStatus").textContent = icLine([ICR, ICO], "rj");
  const rows = Object.entries(names).sort((a, b) => a[1].localeCompare(b[1]));
  $("icRjList").innerHTML = rows.length ? `<table><thead><tr><th>Tovar</th><th class="num">Reja</th><th class="num">Fakt</th><th class="num">Bajarildi</th></tr></thead><tbody>` + rows.map(([k, n]) => { const p = plans.find(r => icK(r.product) === k), f = fact[k] || 0, pct = p && p.plan ? Math.round(f / p.plan * 100) : null; return `<tr><td><b>${esc(n)}</b></td><td class="num"><input type="number" class="icplan" min="0" step="1" data-rjp="${esc(n)}" value="${p ? p.plan : ""}" placeholder="—"></td><td class="num">${f}</td><td class="num">${pct == null ? "—" : `<span class="pct ${pct >= 100 ? "ok" : pct >= 70 ? "mid" : "low"}">${pct}%</span>`}</td></tr>`; }).join("") + `</tbody></table>`
    : `<div class="empty-box">${ICR.state === "ok" ? "Bu oyga reja yo'q: yuqorida tovar va rejani kiriting" : ""}</div>`;
}
async function icRjSet(product, plan) {
  const m = $("icRjMonth").value || icToday().slice(0, 7); product = icProdName(product);
  if (!product) return icSay("rj", "Tovarni kiriting.");
  if (!(plan >= 0)) return icSay("rj", "Rejani raqam bilan kiriting.");
  await icDo([ICR], "rj", async () => {
    const ex = ICR.list.find(r => r.month === m && icK(r.product) === icK(product)), now = new Date().toISOString();
    if (ex) await ICR.update(ex.row, "D", [plan, "Faol", krT(now)]); else await ICR.append([krT(icId("R")), krT(m), krT(product), plan, "Faol", krT(now)]);
    icSay("rj", `«${product}»: ${m} oyi rejasi ${plan} dona.`);
  });
}
function icGrRender() {
  $("icGrStatus").textContent = icLine([ICG], "gr");
  const used = n => ICT.list.filter(t => t.group === n).length + ICK.list.filter(k => k.group === n).length;
  const list = ICG.list.slice().sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  $("icGrList").innerHTML = list.length ? `<table><thead><tr><th>Guruh</th><th>Turi</th><th class="num">Ishlatilgan</th><th></th></tr></thead><tbody>` + list.map(g => `<tr><td><b>${esc(g.name)}</b></td><td>${g.type === "karta" ? "Texnologik karta guruhi" : "Tarkib guruhi"}</td><td class="num">${used(g.name)}</td><td class="krAct"><button data-grdel="${esc(g.id)}">${GR.pendDel === g.id ? "Ha, o'chirish" : "O'chirish"}</button></td></tr>`).join("") + `</tbody></table>`
    : `<div class="empty-box">${ICG.state === "ok" ? "Hozircha guruh yo'q" : ""}</div>`;
}
const GR = { pendDel:"" };
async function icGrAdd() {
  const name = $("icGrName").value.trim(), type = $("icGrType").value; if (!name) return icSay("gr", "Guruh nomini kiriting.");
  const ok = await icDo([ICG], "gr", async () => {
    if (ICG.list.some(g => g.type === type && icK(g.name) === icK(name))) { icSay("gr", `«${name}» guruhi bor.`); throw null; }
    await ICG.append([krT(icId("G")), "Faol", krT(name), type, krT(new Date().toISOString())]); icSay("gr", `«${name}» guruhi qo'shildi.`);
  });
  if (ok) $("icGrName").value = "";
}
function icXdRender() {
  if (!$("icXdMonth").value) $("icXdMonth").value = icToday().slice(0, 7);
  const m = $("icXdMonth").value, agg = {};
  ICO.list.filter(o => o.status !== "Bekor qilingan").forEach(o => o.steps.forEach(s => {
    if (!s.done || String(s.at).slice(0, 7) !== m) return;
    const who = s.by || "(ko'rsatilmagan)", a = agg[who] || (agg[who] = { steps:0, prod:{} });
    a.steps++; const p = a.prod[o.product] || (a.prod[o.product] = { steps:0, qty:0, docs:new Set() }); p.steps++; if (!p.docs.has(o.id)) { p.docs.add(o.id); p.qty += o.qty; }
  }));
  $("icXdStatus").textContent = icLine([ICO], "xd");
  const rows = Object.entries(agg).sort((a, b) => b[1].steps - a[1].steps);
  $("icXdList").innerHTML = rows.length ? `<table><thead><tr><th>Xodim</th><th>Tovar</th><th class="num">Bosqichlar</th><th class="num">Dona</th></tr></thead><tbody>` + rows.map(([who, a]) => Object.entries(a.prod).map(([p, x], i) => `<tr><td>${i ? "" : `<b>${esc(who)}</b><div class="tmeta">jami ${a.steps} bosqich</div>`}</td><td>${esc(p)}</td><td class="num">${x.steps}</td><td class="num">${x.qty}</td></tr>`).join("")).join("") + `</tbody></table>`
    : `<div class="empty-box">${ICO.state === "ok" ? "Bu oyda bajarilgan bosqich yo'q" : ""}</div>`;
}

// ======================= Yo'naltirish va hodisalar =======================
const IC_RENDER = { icTkApp:icTkRender, icOrApp:() => { icOrFill(); icOrRender(); }, icBsApp:icBsRender, icKrApp:() => { icKrStagesDraw(); icKrRender(); }, icVzApp:icVzRender, icHlApp:icHlRender, icRjApp:icRjRender, icGrApp:icGrRender, icXdApp:icXdRender };
function icOn() { const n = current && current.id === "ishlab-chiqarish" && current.subs[currentSub] ? current.subs[currentSub].n : ""; return IC_SUBS[n] || ""; }
function icRenderAll() { const a = icOn(); if (!a) return; icFillGroups(); icPeople(); IC_RENDER[a](); }
function icRoute() {
  const a = icOn();
  Object.values(IC_SUBS).forEach(id => { $(id).classList.remove("fopen"); document.body.classList.toggle(id + "-on", id === a); });
  if (a) { if (a === "icTkApp") icTkReset(); if (a === "icOrApp") icOrReset(); if (a === "icBsApp") icBsReset(); if (a === "icKrApp") icKrReset(); icRenderAll(); }
}
const icOrigRenderSub = renderSub;
renderSub = function (i) { icOrigRenderSub(i); icRoute(); };
document.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (!o) return; ({ icTkApp:icTkReset, icOrApp:icOrReset, icBsApp:icBsReset, icKrApp:icKrReset }[o.dataset.open] || (() => {}))(); });
["icTkForm", "icOrForm", "icBsForm", "icKrForm"].forEach(f => $(f).addEventListener("submit", e => e.preventDefault()));
$("icTkSave").addEventListener("click", icTkSave); $("icTkAdd").addEventListener("click", icTkAdd);
$("icTkAddIn").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); icTkAdd(); } });
$("icTkRows").addEventListener("input", e => { const i = e.target.dataset.tkq; if (i != null && TK.items[i]) TK.items[i].qty = e.target.value; });
$("icTkRows").addEventListener("click", e => { const b = e.target.closest("[data-tkrm]"); if (b) { TK.items.splice(Number(b.dataset.tkrm), 1); icTkRows(); } });
$("icTkQ").addEventListener("input", e => { TK.q = e.target.value; icTkRender(); });
$("icTkList").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.tkedit) icTkLoad(b.dataset.tkedit); else if (b.dataset.tkdel) { if (TK.pendDel === b.dataset.tkdel) icTkDel(b.dataset.tkdel); else { TK.pendDel = b.dataset.tkdel; icTkRender(); } } });
$("icBsSave").addEventListener("click", icBsSave);
$("icBsList").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.bsedit) icBsLoad(b.dataset.bsedit); else if (b.dataset.bsdel) { if (BS.pendDel === b.dataset.bsdel) { icDo([ICB], "bs", async () => { const x = ICB.list.find(y => y.id === b.dataset.bsdel); if (!x) throw null; await ICB.update(x.row, "C", ["O'chirilgan"]); icSay("bs", `«${x.name}» o'chirildi.`); }); BS.pendDel = ""; } else { BS.pendDel = b.dataset.bsdel; icBsRender(); } } });
$("icKrSave").addEventListener("click", icKrSave);
$("icKrStageAdd").addEventListener("click", () => { const v = $("icKrStageSel").value; if (v) { KK.stages.push(v); icKrStagesDraw(); } });
$("icKrStages").addEventListener("click", e => { const b = e.target.closest("[data-krrm]"); if (b) { KK.stages.splice(Number(b.dataset.krrm), 1); icKrStagesDraw(); } });
$("icKrList").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.kredit) icKrLoad(b.dataset.kredit); else if (b.dataset.krdel) { if (KK.pendDel === b.dataset.krdel) { icDo([ICK], "kr", async () => { const x = ICK.list.find(y => y.id === b.dataset.krdel); if (!x) throw null; await ICK.update(x.row, "C", ["O'chirilgan"]); icSay("kr", `«${x.name}» o'chirildi.`); }); KK.pendDel = ""; } else { KK.pendDel = b.dataset.krdel; icKrRender(); } } });
$("icOrSave").addEventListener("click", icOrSave);
["icOrProd", "icOrOrg", "icOrWh"].forEach(id => $(id).addEventListener("change", () => { if (id === "icOrOrg") $("icOrWh").value = ""; icOrFill(); }));
$("icOrQty").addEventListener("input", icOrNeedDraw);
$("icOrFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { ORD.filter = b.dataset.f; ORD.pend = ""; icOrRender(); } });
$("icOrQ").addEventListener("input", e => { ORD.q = e.target.value; icOrRender(); });
$("icOrApp").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.orstart) icOrStatus(b.dataset.orstart, "Jarayonda");
  else if (b.dataset.orfin) { ORD.conf = b.dataset.orfin; icOrConfDraw(); $("icOrConf").scrollIntoView({ behavior:"smooth", block:"nearest" }); }
  else if (b.dataset.orok) icOrFinish(b.dataset.orok);
  else if (b.dataset.orx) { ORD.conf = ""; icOrConfDraw(); }
  else if (b.dataset.orcan) { if (ORD.pend === b.dataset.orcan) icOrStatus(b.dataset.orcan, "Bekor qilingan"); else { ORD.pend = b.dataset.orcan; icOrRender(); } }
  else if (b.dataset.orundo) { if (ORD.pend === b.dataset.orundo) icOrUndo(b.dataset.orundo); else { ORD.pend = b.dataset.orundo; icOrRender(); } }
});
$("icVzFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { VZ.filter = b.dataset.f; icVzRender(); } });
$("icVzQ").addEventListener("input", e => { VZ.q = e.target.value; icVzRender(); });
$("icVzList").addEventListener("click", e => { const b = e.target.closest("[data-vzdone]"); if (!b) return; const w = document.querySelector(`[data-vzwho="${CSS.escape(b.dataset.vzdone)}"]`); icVzDone(b.dataset.vzdone, w ? w.value.trim() : ""); });
$("icRjMonth").addEventListener("change", icRjRender);
$("icRjAdd").addEventListener("click", () => { icRjSet($("icRjProd").value, Number($("icRjPlan").value)); $("icRjProd").value = ""; $("icRjPlan").value = ""; });
$("icRjList").addEventListener("change", e => { const p = e.target.dataset.rjp; if (p != null) icRjSet(p, Number(e.target.value) || 0); });
$("icGrAdd").addEventListener("click", icGrAdd);
$("icGrName").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); icGrAdd(); } });
$("icGrList").addEventListener("click", e => {
  const b = e.target.closest("[data-grdel]"); if (!b) return;
  if (GR.pendDel !== b.dataset.grdel) { GR.pendDel = b.dataset.grdel; icGrRender(); return; }
  GR.pendDel = ""; icDo([ICG], "gr", async () => { const g = ICG.list.find(x => x.id === b.dataset.grdel); if (!g) throw null; await ICG.update(g.row, "B", ["O'chirilgan"]); icSay("gr", `«${g.name}» o'chirildi.`); });
});
$("icXdMonth").addEventListener("change", icXdRender);
// «Guruhlar» menyusidagi namuna qatorlari endi kerak emas
SECTIONS.forEach(s => { if (s.id === "ishlab-chiqarish") s.subs.forEach(x => { if (x.n === "Guruhlar") delete x.rows; }); });
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { IC_STORES.forEach(s => { s.state = "off"; }); icRenderAll(); return; }
  IC.mcp = mcp;
  try { const u = await window.claude.use("user"); IC.me = u && u.name ? String(await Promise.resolve(u.name()) || "") : ""; } catch (e) {}
  IC_STORES.forEach(S => {
    try { mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:S.range }, ev => {
      if (ev.type === "data") { if (!S.busy) { S.apply(krVals(ev)); icRenderAll(); } return; }
      if (S.state !== "ok") { S.state = (ev.error && ev.error.code) || "upstream_error"; icRenderAll(); }
    }, { refetchInterval:120000 }); } catch (e) {}
  });
})();
icRoute();
