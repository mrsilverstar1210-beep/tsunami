// ===== Tsunami: Ta'minot → Zakup so'rovlari, Zakup buyurtmalari, Yetkazib beruvchiga qaytarish, Yetkazib beruvchilarga to'lovlar =====
// Sozlamalar → Zakup sabablari / Qaytarish (yetkazib beruvchiga) sabablari. Ma'lumot: Google Drive bazasi.
const TM = { mcp:null };
const tmToday = () => new Date().toLocaleDateString("en-CA");
const tmK = s => String(s || "").trim().toLowerCase();
const tmR2 = n => Math.round((Number(n) || 0) * 100) / 100;
function tmId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function tmJson(v, d) { try { const x = JSON.parse(v || ""); return x == null ? d : x; } catch (e) { return d; } }
function tmMsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function tmSay(o, render, m) { o.msg = m; clearTimeout(o.msgT); o.msgT = setTimeout(() => { o.msg = ""; render(); }, 6000); render(); }
function tmLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
function tmPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
function tmSuppliers() { return (PARTY.supApp ? PARTY.supApp.list : []); }
function tmSup(n) { return tmSuppliers().find(s => tmK(s.name) === tmK(n)) || null; }
function tmProdName(v) { v = String(v || "").trim(); const p = krProduct(v) || KR.products.find(x => v && (x.sku === v || x.barcode === v)); return p ? p.name : v; }
(function tmCss() {
  const st = document.createElement("style");
  st.textContent = "#zsApp,#zbApp,#yqApp,#ytApp,#tmsApp{display:none}.zsApp-on #zsApp,.zbApp-on #zbApp,.yqApp-on #yqApp,.ytApp-on #ytApp,.tmsApp-on #tmsApp{display:block}"
    + ".zsApp-on .gen,.zsApp-on #kpis,.zbApp-on .gen,.zbApp-on #kpis,.yqApp-on .gen,.yqApp-on #kpis,.ytApp-on .gen,.ytApp-on #kpis,.tmsApp-on .gen,.tmsApp-on #kpis{display:none}"
    + ".zprog{font-size:12px;color:#6b7280}.tmauto td{background:#fffbeb}";
  document.head.appendChild(st);
})();

// ======================= Sozlamalar: sabablar =======================
const TMS_RANGE = "'Taminot sozlamalari'!A1:E300";
const TMS_DEF = { zreason:["Omborda tugadi", "Mijoz buyurtmasi", "Mavsumiy talab", "Yangi model", "Boshqa"], rreason:["Nuqsonli (brak)", "Noto'g'ri tovar keldi", "Ortiqcha keldi", "Muddati/holati yaroqsiz", "Boshqa"] };
const TMS = { list:[], state:"loading", busy:false, edit:"", pendDel:"", msg:"", msgT:null, kind:"zreason" };
tmPanel("tmsApp", `<div class="panel"><div class="thead"><h3 id="tmsTitle"></h3></div><div class="tmeta" id="tmsHint"></div>
  <form id="tmsForm" class="kform"><div class="inrow" style="max-width:520px"><input id="tmsName" maxlength="80" placeholder="Yangi sabab"><button type="button" class="pri" id="tmsAdd">Qo'shish</button></div></form>
  <div class="status" id="tmsStatus"></div><div id="tmsList"></div></div>`);
function tmsParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[3] || "") !== "O'chirilgan" && String(r[2] || "").trim()) out.push({ id:String(r[0]), row:i + 1, kind:String(r[1] || "") === "rreason" ? "rreason" : "zreason", name:String(r[2]).trim() }); }); return out; }
function tmsNames(kind) { const l = TMS.list.filter(x => x.kind === kind); return TMS.state === "ok" && l.length ? l.map(x => x.name) : TMS_DEF[kind]; }
function tmsApply(vals) { TMS.list = tmsParse(vals); TMS.state = "ok"; tmsRender(); tmSelects(); }
async function tmsReload() { const r = await TM.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:TMS_RANGE }, { cache:false }); tmsApply(krVals({ result:r })); }
async function tmsDo(fn) { if (TMS.busy) return; if (!TM.mcp) return tmSay(TMS, tmsRender, krDbLine() || "Tsunami bazasi ulanmagan."); TMS.busy = true; try { await tmsReload(); await fn(); try { await tmsReload(); } catch (e) {} } catch (e) { if (e) tmSay(TMS, tmsRender, krCodeMsg(e.code) || "Saqlab bo'lmadi."); } TMS.busy = false; }
function tmsAdd() {
  const name = $("tmsName").value.trim(), kind = TMS.kind; if (!name) return tmSay(TMS, tmsRender, "Nomini yozing.");
  tmsDo(async () => {
    const mine = TMS.list.filter(x => x.kind === kind);
    if (mine.some(x => tmK(x.name) === tmK(name))) { tmSay(TMS, tmsRender, `«${name}» ro'yxatda bor.`); throw null; }
    const now = krT(new Date().toISOString()), rows = mine.length ? [] : TMS_DEF[kind].filter(n => tmK(n) !== tmK(name)).map(n => [krT(tmId("Z")), kind, krT(n), "Faol", now]);
    rows.push([krT(tmId("Z")), kind, krT(name), "Faol", now]);
    await TM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Taminot sozlamalari'!A1", values:rows });
    $("tmsName").value = ""; tmSay(TMS, tmsRender, `«${name}» qo'shildi.`);
  });
}
function tmsRename(id, name) { name = String(name || "").trim(); if (!name) return; tmsDo(async () => { const x = TMS.list.find(r => r.id === id); if (!x) throw null; await TM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Taminot sozlamalari'!C${x.row}`, values:[[krT(name)]] }); TMS.edit = ""; tmSay(TMS, tmsRender, "Saqlandi."); }); }
function tmsDelete(id) { tmsDo(async () => { const x = TMS.list.find(r => r.id === id); if (!x) throw null; if (TMS.list.filter(r => r.kind === x.kind).length <= 1) { tmSay(TMS, tmsRender, "Kamida bittasi qolishi kerak."); throw null; } await TM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Taminot sozlamalari'!D${x.row}`, values:[["O'chirilgan"]] }); TMS.pendDel = ""; tmSay(TMS, tmsRender, `«${x.name}» o'chirildi.`); }); }
function tmsRender() {
  if (!$("tmsList")) return;
  $("tmsTitle").textContent = TMS.kind === "zreason" ? "Zakup sabablari" : "Yetkazib beruvchiga qaytarish sabablari";
  $("tmsHint").textContent = TMS.kind === "zreason" ? "Ta'minot → Zakup so'rovlaridagi «Sabab» ro'yxati shu yerdan olinadi." : "Ta'minot → Yetkazib beruvchiga qaytarishdagi «Sabab» ro'yxati shu yerdan olinadi.";
  $("tmsStatus").textContent = [tmLine(TMS, "Sozlama"), TMS.msg].filter(Boolean).join(" · ");
  const mine = TMS.list.filter(x => x.kind === TMS.kind), rows = TMS.state === "ok" && mine.length ? mine : TMS_DEF[TMS.kind].map(n => ({ id:"", name:n })), can = !!TM.mcp;
  $("tmsList").innerHTML = `<table><tbody>` + rows.map((x, i) => TMS.edit && TMS.edit === x.id
    ? `<tr><td>${i + 1}</td><td><input id="tmsEditIn" value="${esc(x.name)}" maxlength="80"></td><td class="krAct"><button data-tmssave="${esc(x.id)}">Saqlash</button><button data-tmscancel="1">Bekor</button></td></tr>`
    : `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td class="krAct">${can && x.id ? `<button data-tmsedit="${esc(x.id)}">Tahrirlash</button><button data-tmsdel="${esc(x.id)}">${TMS.pendDel === x.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`
    + (TMS.state === "ok" && !mine.length ? `<div class="tmeta">Hozir standart ro'yxat. Birinchi yangi sabab qo'shilganda standartlari ham bazaga yoziladi va tahrirlanadigan bo'ladi.</div>` : "");
}
$("tmsForm").addEventListener("submit", e => { e.preventDefault(); tmsAdd(); });
$("tmsAdd").addEventListener("click", tmsAdd);
$("tmsList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.tmsedit) { TMS.edit = b.dataset.tmsedit; tmsRender(); } else if (b.dataset.tmscancel) { TMS.edit = ""; tmsRender(); }
  else if (b.dataset.tmssave) tmsRename(b.dataset.tmssave, $("tmsEditIn").value);
  else if (b.dataset.tmsdel) { if (TMS.pendDel === b.dataset.tmsdel) tmsDelete(b.dataset.tmsdel); else { TMS.pendDel = b.dataset.tmsdel; tmsRender(); } }
});
function tmSelects() {
  const z = $("zsReason"); if (z) { const v = z.value; z.innerHTML = tmsNames("zreason").map(n => `<option>${esc(n)}</option>`).join(""); if (v) z.value = v; }
  const r = $("yqReason"); if (r) { const v = r.value; r.innerHTML = tmsNames("rreason").map(n => `<option>${esc(n)}</option>`).join(""); if (v) r.value = v; }
  const dl = $("tmSups"); if (dl) dl.innerHTML = tmSuppliers().map(s => `<option value="${esc(s.name)}">`).join("");
}
(function () { const d = document.createElement("div"); d.innerHTML = `<datalist id="tmSups"></datalist>`; document.body.appendChild(d); })();

// ======================= ZAKUP SO'ROVLARI =======================
const ZS_RANGE = "'Zakup sorovlari'!A1:M3000";
const ZS = { list:[], state:"loading", busy:false, filter:"new", pendRej:"", msg:"", msgT:null, pick:new Set() };
const ZS_ST = { new:"Yangi", ok:"Tasdiqlandi", ordered:"Buyurtma qilindi", rej:"Rad etildi" };
FORM_FOCUS.zsApp = "zsProd";
tmPanel("zsApp", `<div class="panel fpanel"><div class="thead"><h3>Yangi zakup so'rovi</h3><button type="button" class="closebtn" data-close="zsApp">Yopish ✕</button></div>
  <form id="zsForm" class="kform"><div class="kgrid">
    <label class="span2">Tovar<input id="zsProd" list="krProducts" maxlength="160" placeholder="Tovar nomi, SKU yoki shtrix-kod"></label>
    <label>Soni<input type="number" id="zsQty" min="1" step="1" value="1"></label>
    <label>Sabab<select id="zsReason"></select></label>
    <label>Kim so'radi<input id="zsWho" list="slSellers" maxlength="80" placeholder="Xodim ismi"></label>
    <label>Qachongacha kerak<input type="date" id="zsNeed"></label>
    <label class="span2">Izoh<input id="zsNote" maxlength="300" placeholder="Rangi, xotirasi, mijoz va h.k."></label>
  </div><div class="kbtns"><button type="button" class="pri" id="zsSave">Saqlash</button></div><div class="status" id="zsFmsg"></div></form></div>
  <div class="panel" id="zsAutoBox"><div class="thead"><h3>Tavsiya: mijozlar so'ragan, omborda yo'q tovarlar</h3></div><div id="zsAuto"></div></div>
  <div class="panel"><div class="thead"><h3>Zakup so'rovlari</h3><div class="hbtns"><div class="filters" id="zsFilters"></div><button type="button" class="openbtn" data-open="zsApp">+ Yangi so'rov</button></div></div>
  <div class="tmeta">Tasdiqlangan so'rovlarni belgilab, «Zakup buyurtmasini tuzish» tugmasi bilan yetkazib beruvchiga buyurtma qiling.</div>
  <div class="status" id="zsStatus"></div><div id="zsList"></div></div>`);
function zsParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const st = Object.keys(ZS_ST).find(k => ZS_ST[k] === String(r[2] || "")) || "new";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, st, date:String(r[3] || ""), prod:String(r[4] || ""), qty:Number(r[5]) || 1, reason:String(r[6] || ""), who:String(r[7] || ""), need:String(r[8] || ""), note:String(r[9] || ""), po:String(r[10] || ""), key:String(r[11] || ""), createdAt:String(r[12] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function zsApply(vals) { ZS.list = zsParse(vals); ZS.state = "ok"; tmRenderAll(); }
async function zsReload() { const r = await TM.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:ZS_RANGE }, { cache:false }); zsApply(krVals({ result:r })); }
function zsReset(prod, qty, note, key) { $("zsProd").value = prod || ""; $("zsQty").value = qty || 1; $("zsWho").value = ""; $("zsNeed").value = ""; $("zsNote").value = note || ""; ZS.key = key || ""; tmSelects(); tmMsg("zsFmsg", ""); }
async function zsAdd(rec) {
  const number = ZS.list.reduce((m, x) => Math.max(m, x.number), 0) + 1, now = new Date().toISOString();
  await TM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Zakup sorovlari'!A1", values:[[krT(tmId("Q")), number, ZS_ST.new, krT(tmToday()), krT(rec.prod), rec.qty, krT(rec.reason), krT(rec.who || ""), krT(rec.need || ""), krT(rec.note || ""), "", krT(rec.key || ""), krT(now)]] });
  return number;
}
async function zsSave() {
  if (ZS.busy) return; if (!TM.mcp) return tmMsg("zsFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const prod = tmProdName($("zsProd").value), qty = Number($("zsQty").value);
  if (!prod) return tmMsg("zsFmsg", "Tovarni yozing.", true);
  if (!(qty >= 1) || Math.floor(qty) !== qty) return tmMsg("zsFmsg", "Sonini butun son qilib yozing.", true);
  ZS.busy = true; $("zsSave").disabled = true;
  try { await zsReload(); const n = await zsAdd({ prod, qty, reason:$("zsReason").value, who:$("zsWho").value.trim(), need:$("zsNeed").value, note:$("zsNote").value.trim(), key:ZS.key }); tmSay(ZS, zsRender, `So'rov №${n} saqlandi.`); zsReset(); openForm("zsApp", false); try { await zsReload(); } catch (e) {} }
  catch (e) { if (e) tmMsg("zsFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  ZS.busy = false; $("zsSave").disabled = false;
}
async function zsSet(ids, st, po) {
  if (ZS.busy || !TM.mcp) return; ZS.busy = true;
  try {
    await zsReload();
    for (const id of ids) { const z = ZS.list.find(x => x.id === id); if (!z) continue; await TM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Zakup sorovlari'!C${z.row}`, values:[[ZS_ST[st]]] }); if (po) await TM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Zakup sorovlari'!K${z.row}`, values:[[krT(po)]] }); }
    if (!po) tmSay(ZS, zsRender, `${ids.length} ta so'rov: ${ZS_ST[st].toLowerCase()}.`); ZS.pick.clear(); try { await zsReload(); } catch (e) {}
  } catch (e) { if (e) tmSay(ZS, zsRender, krCodeMsg(e.code) || "O'zgartirib bo'lmadi."); }
  ZS.busy = false; ZS.pendRej = "";
}
function zsAuto() {
  if (typeof KG === "undefined" || typeof mkInStock !== "function") return [];
  const stock = mkInStock(), have = new Set(ZS.list.filter(z => z.st !== "rej").map(z => z.key).filter(Boolean)), m = {};
  KG.list.filter(w => w.st === "wait" && !stock[tmK(w.prod)]).forEach(w => { const k = tmK(w.prod), o = m[k] || (m[k] = { prod:w.prod, qty:0, who:[], ids:[] }); o.qty += w.qty; o.who.push(w.client); o.ids.push(w.id); });
  return Object.values(m).map(o => ({ ...o, key:"kg:" + o.ids.sort().join(",") })).filter(o => !have.has(o.key));
}
function zsRender() {
  if (!$("zsList")) return;
  const auto = zsAuto(), can = !!TM.mcp; ZS.auto = auto;
  $("zsAutoBox").hidden = !auto.length;
  $("zsAuto").innerHTML = auto.length ? `<table><tbody>` + auto.map((a, i) => `<tr class="tmauto"><td><b>${esc(a.prod)}</b></td><td class="num">${a.qty} dona</td><td class="tmeta">So'raganlar: ${a.who.map(esc).join(", ")}</td><td class="krAct">${can ? `<button data-zsauto="${i}">So'rov qilish</button>` : ""}</td></tr>`).join("") + `</tbody></table>` : "";
  const counts = { new:0, ok:0, ordered:0, rej:0 }; ZS.list.forEach(z => { counts[z.st]++; });
  $("zsFilters").innerHTML = Object.entries(ZS_ST).map(([k, l]) => `<button data-f="${k}" class="${ZS.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("zsStatus").textContent = [tmLine(ZS, "Zakup so'rovlari"), ZS.msg].filter(Boolean).join(" · ");
  const list = ZS.list.filter(z => z.st === ZS.filter), today = tmToday();
  if (!list.length) { $("zsList").innerHTML = `<div class="empty-box">${ZS.state === "ok" ? "Bu ro'yxatda so'rov yo'q" : ""}</div>`; return; }
  const sel = ZS.filter === "ok" && can;
  $("zsList").innerHTML = (sel ? `<div class="kbtns" style="justify-content:flex-start;margin:0 0 8px"><button type="button" class="pri" id="zsToPo"${ZS.pick.size ? "" : " disabled"}>Zakup buyurtmasini tuzish (${ZS.pick.size})</button></div>` : "")
    + `<table><thead><tr>${sel ? "<th></th>" : ""}<th>№</th><th>Sana</th><th>Tovar</th><th>Soni</th><th>Sabab</th><th>Kim</th><th>Kerak</th><th></th></tr></thead><tbody>` + list.map(z => {
      let act = "";
      if (can && z.st === "new") act = `<button data-zsok="${esc(z.id)}">Tasdiqlash</button><button data-zsrej="${esc(z.id)}">${ZS.pendRej === z.id ? "Ha, rad etish" : "Rad etish"}</button>`;
      else if (can && z.st === "ok") act = `<button data-zsrej="${esc(z.id)}">${ZS.pendRej === z.id ? "Ha, rad etish" : "Rad etish"}</button>`;
      return `<tr>${sel ? `<td><input type="checkbox" data-zspick="${esc(z.id)}"${ZS.pick.has(z.id) ? " checked" : ""}></td>` : ""}<td>${z.number}</td><td>${esc(z.date.slice(0, 10))}</td><td><b>${esc(z.prod)}</b>${z.note ? `<div class="tmeta">${esc(z.note)}</div>` : ""}${z.po ? `<div class="tmeta">zakup №${esc(z.po)}</div>` : ""}</td><td class="num">${z.qty}</td><td>${esc(z.reason)}</td><td>${esc(z.who) || "—"}</td><td>${z.need ? `<span class="${z.need < today && (z.st === "new" || z.st === "ok") ? "late" : ""}">${esc(z.need)}</span>` : "—"}</td><td class="krAct">${act}</td></tr>`;
    }).join("") + `</tbody></table>`;
}
$("zsForm").addEventListener("submit", e => e.preventDefault());
$("zsSave").addEventListener("click", zsSave);
$("zsFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { ZS.filter = b.dataset.f; ZS.pick.clear(); zsRender(); } });
$("zsAuto").addEventListener("click", async e => {
  const b = e.target.closest("[data-zsauto]"); if (!b || ZS.busy || !TM.mcp) return;
  const a = (ZS.auto || [])[Number(b.dataset.zsauto)]; if (!a) return;
  ZS.busy = true; b.disabled = true;
  try { await zsReload(); const n = await zsAdd({ prod:a.prod, qty:a.qty, reason:tmsNames("zreason").find(x => /mijoz/i.test(x)) || tmsNames("zreason")[0], note:"Mijozlar so'ragan: " + a.who.join(", "), key:a.key }); tmSay(ZS, zsRender, `So'rov №${n} qo'shildi.`); try { await zsReload(); } catch (e2) {} }
  catch (err) { tmSay(ZS, zsRender, krCodeMsg(err && err.code) || "Saqlab bo'lmadi."); }
  ZS.busy = false;
});
$("zsList").addEventListener("change", e => { const c = e.target.closest("[data-zspick]"); if (!c) return; if (c.checked) ZS.pick.add(c.dataset.zspick); else ZS.pick.delete(c.dataset.zspick); const b = $("zsToPo"); if (b) { b.disabled = !ZS.pick.size; b.textContent = `Zakup buyurtmasini tuzish (${ZS.pick.size})`; } });
$("zsList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.zsok) zsSet([b.dataset.zsok], "ok");
  else if (b.dataset.zsrej) { if (ZS.pendRej === b.dataset.zsrej) zsSet([b.dataset.zsrej], "rej"); else { ZS.pendRej = b.dataset.zsrej; zsRender(); } }
  else if (b.id === "zsToPo") { const reqs = ZS.list.filter(z => ZS.pick.has(z.id)); tmGo("Zakup buyurtmalari"); zbReset(); ZB.fromReq = reqs.map(z => z.id); ZB.items = reqs.map(z => ({ name:z.prod, qty:z.qty, price:"" })); zbRows(); openForm("zbApp", true); tmMsg("zbFmsg", `${reqs.length} ta so'rov qo'shildi: yetkazib beruvchi va narxlarni kiriting.`); }
});

// ======================= ZAKUP BUYURTMALARI =======================
const ZB_RANGE = "'Zakup buyurtmalari'!A1:O3000";
const ZB = { list:[], state:"loading", busy:false, filter:"open", open:"", pendCancel:"", msg:"", msgT:null, items:[], fromReq:[], editId:"" };
const ZB_ST = { draft:"Qoralama", sent:"Yuborildi", cancel:"Bekor qilingan" };
FORM_FOCUS.zbApp = "zbSup";
tmPanel("zbApp", `<div class="panel fpanel"><div class="thead"><h3 id="zbTitle">Yangi zakup buyurtmasi</h3><button type="button" class="closebtn" data-close="zbApp">Yopish ✕</button></div>
  <form id="zbForm" class="kform"><div class="kgrid">
    <label>Yetkazib beruvchi<input id="zbSup" list="tmSups" maxlength="120" placeholder="Ta'minot → Yetkazib beruvchilar ro'yxatidan"></label>
    <label>Buyurtma sanasi<input type="date" id="zbDate"></label>
    <label>Kutilayotgan sana<input type="date" id="zbExp"></label>
    <label>Valyuta<select id="zbCur"><option value="USD">USD ($)</option><option value="UZS">UZS (so'm)</option></select></label>
  </div>
  <div class="ktable"><table><thead><tr><th>#</th><th>Tovar</th><th>Soni</th><th>Narx (1 dona)</th><th>Summa</th><th></th></tr></thead><tbody id="zbRows"></tbody></table></div>
  <button type="button" id="zbAdd" class="lnk">+ Qator qo'shish</button><div class="ktotal" id="zbTotal"></div>
  <label class="full">Izoh<input id="zbNote" maxlength="300" placeholder="ixtiyoriy"></label>
  <div class="kbtns"><button type="button" class="sec" data-zbsave="draft">Qoralama</button><button type="button" class="pri" data-zbsave="sent">Yetkazib beruvchiga yuborildi</button></div>
  <div class="status" id="zbFmsg"></div></form></div>
  <div class="panel"><div class="thead"><h3>Zakup buyurtmalari</h3><div class="hbtns"><div class="filters" id="zbFilters"></div><button type="button" class="openbtn" data-open="zbApp">+ Yangi buyurtma</button></div></div>
  <div class="tmeta">Tovar kelganda «Kirim qilish» tugmasi Tovar kirimi formasini shu buyurtma bilan to'ldirib ochadi; kelgan miqdor o'zi hisoblanadi.</div>
  <div class="status" id="zbStatus"></div><div id="zbList"></div></div>`);
function zbParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const st = Object.keys(ZB_ST).find(k => ZB_ST[k] === String(r[2] || "")) || "draft";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, st, date:String(r[3] || ""), sup:String(r[4] || ""), exp:String(r[5] || ""), cur:String(r[6] || "USD"), items:tmJson(r[7], []), total:Number(r[8]) || 0, note:String(r[9] || ""), reqs:tmJson(r[10], []), createdAt:String(r[11] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
// Shu buyurtma bo'yicha qilingan kirimlar (izohida «Zakup №N»), omborga qabul qilinganlari
function zbKirims(z) { const tag = `Zakup №${z.number}`; return KR.list.filter(k => k.state === "done" && String(k.note || "").indexOf(tag) >= 0); }
function zbProgress(z) {
  const got = {}; zbKirims(z).forEach(k => (k.items || []).forEach(it => { const n = tmK(it.name); got[n] = (got[n] || 0) + (Number(it.qty) || 0); }));
  const lines = z.items.map(it => ({ name:it.name, qty:Number(it.qty) || 0, got:Math.min(Number(it.qty) || 0, got[tmK(it.name)] || 0) }));
  const ord = lines.reduce((a, l) => a + l.qty, 0), rec = lines.reduce((a, l) => a + l.got, 0);
  return { lines, ord, rec, full:ord > 0 && rec >= ord, part:rec > 0 && rec < ord };
}
function zbKind(z) { if (z.st === "cancel") return "cancel"; const p = zbProgress(z); return p.full ? "done" : "open"; }
function zbApply(vals) { ZB.list = zbParse(vals); ZB.state = "ok"; tmRenderAll(); }
async function zbReload() { const r = await TM.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:ZB_RANGE }, { cache:false }); zbApply(krVals({ result:r })); }
function zbRows() {
  if (!ZB.items.length) ZB.items = [{ name:"", qty:1, price:"" }];
  $("zbRows").innerHTML = ZB.items.map((it, i) => `<tr data-i="${i}"><td>${i + 1}</td><td><input data-f="name" list="krProducts" value="${esc(it.name)}" maxlength="160"></td><td><input data-f="qty" class="sm" type="number" min="1" step="1" value="${esc(it.qty)}"></td><td><input data-f="price" class="sm" type="number" min="0" step="any" value="${esc(it.price)}" placeholder="0"></td><td class="num" data-sum></td><td><button type="button" data-rm="${i}">×</button></td></tr>`).join("");
  zbTotals();
}
function zbTotals() { const cur = $("zbCur").value; let t = 0; ZB.items.forEach((it, i) => { const s = (Number(it.qty) || 0) * (Number(it.price) || 0); t += s; const c = document.querySelector(`#zbRows tr[data-i="${i}"] [data-sum]`); if (c) c.textContent = krMoney(s, cur); }); $("zbTotal").textContent = t ? `Jami: ${krMoney(t, cur)}` : ""; }
function zbReset() { ZB.editId = ""; ZB.fromReq = []; ["zbSup", "zbExp", "zbNote"].forEach(id => { $(id).value = ""; }); $("zbDate").value = tmToday(); $("zbCur").value = "USD"; ZB.items = []; zbRows(); $("zbTitle").textContent = "Yangi zakup buyurtmasi"; tmSelects(); tmMsg("zbFmsg", ""); }
function zbLoad(id) { const z = ZB.list.find(x => x.id === id); if (!z) return; zbReset(); ZB.editId = id; ZB.fromReq = z.reqs.slice(); $("zbTitle").textContent = `Zakup №${z.number}`; $("zbSup").value = z.sup; $("zbDate").value = z.date; $("zbExp").value = z.exp; $("zbCur").value = z.cur; $("zbNote").value = z.note; ZB.items = z.items.map(it => ({ name:it.name, qty:it.qty, price:it.price })); zbRows(); openForm("zbApp", true); }
async function zbSave(st) {
  if (ZB.busy) return; if (!TM.mcp) return tmMsg("zbFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const s = tmSup($("zbSup").value); if (!s) return tmMsg("zbFmsg", $("zbSup").value.trim() ? `«${$("zbSup").value.trim()}» Ta'minot → Yetkazib beruvchilar ro'yxatida yo'q: avval o'sha yerda yarating.` : "Yetkazib beruvchini tanlang.", true);
  const items = [];
  for (const it of ZB.items.filter(x => String(x.name).trim())) {
    const qty = Number(it.qty); if (!(qty >= 1) || Math.floor(qty) !== qty) return tmMsg("zbFmsg", `«${it.name}»: sonini to'g'ri kiriting.`, true);
    const price = String(it.price).trim() === "" ? 0 : Number(it.price); if (!(price >= 0)) return tmMsg("zbFmsg", `«${it.name}»: narxni to'g'ri kiriting.`, true);
    items.push({ name:tmProdName(it.name), qty, price });
  }
  if (!items.length) return tmMsg("zbFmsg", "Kamida bitta tovar kiriting.", true);
  const total = tmR2(items.reduce((a, it) => a + it.qty * it.price, 0));
  ZB.busy = true; document.querySelectorAll("[data-zbsave]").forEach(b => { b.disabled = true; });
  try {
    await zbReload();
    const ex = ZB.editId ? ZB.list.find(x => x.id === ZB.editId) : null, now = new Date().toISOString(), number = ex ? ex.number : ZB.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    const row = [krT(ex ? ex.id : tmId("Z")), number, ZB_ST[st], krT($("zbDate").value || tmToday()), krT(s.name), krT($("zbExp").value), $("zbCur").value, krT(JSON.stringify(items)), total, krT($("zbNote").value.trim()), krT(JSON.stringify(ZB.fromReq)), krT(ex ? ex.createdAt : now)];
    if (ex) await TM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Zakup buyurtmalari'!A${ex.row}:L${ex.row}`, values:[row] });
    else await TM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Zakup buyurtmalari'!A1", values:[row] });
    if (ZB.fromReq.length) { ZB.busy = false; await zsSet(ZB.fromReq, "ordered", String(number)); ZB.busy = true; }
    tmSay(ZB, zbRender, `Zakup №${number} ${st === "sent" ? "yuborildi deb saqlandi" : "qoralama sifatida saqlandi"}: ${s.name}, ${krMoney(total, $("zbCur").value)}.`);
    zbReset(); openForm("zbApp", false); try { await zbReload(); } catch (e) {}
  } catch (e) { if (e) tmMsg("zbFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  ZB.busy = false; document.querySelectorAll("[data-zbsave]").forEach(b => { b.disabled = false; });
}
async function zbSet(id, st) {
  if (ZB.busy || !TM.mcp) return; ZB.busy = true;
  try { await zbReload(); const z = ZB.list.find(x => x.id === id); if (!z) throw null; await TM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Zakup buyurtmalari'!C${z.row}`, values:[[ZB_ST[st]]] }); tmSay(ZB, zbRender, `Zakup №${z.number}: ${ZB_ST[st].toLowerCase()}.`); try { await zbReload(); } catch (e) {} }
  catch (e) { if (e) tmSay(ZB, zbRender, krCodeMsg(e.code) || "O'zgartirib bo'lmadi."); }
  ZB.busy = false; ZB.pendCancel = "";
}
function zbToKirim(id) {
  const z = ZB.list.find(x => x.id === id); if (!z) return;
  const p = zbProgress(z), left = p.lines.map((l, i) => ({ name:l.name, qty:l.qty - l.got, price:z.items[i].price })).filter(l => l.qty > 0);
  tmGo("Tovar kirimi"); krResetForm(); krFormMsg("");
  $("krSupplier").value = z.sup; $("krCur").value = z.cur; $("krNote").value = `Zakup №${z.number}`;
  krItems = left.map(l => ({ name:l.name, qty:l.qty, price:l.price || "", imei:"" })); krRenderRows(); openForm("kirimApp", true);
  krFormMsg(`Zakup №${z.number} dagi kelmagan tovarlar qo'yildi. Kelgan sonini tekshiring, IMEI'larni kiriting va saqlang.`);
}
function zbRender() {
  if (!$("zbList")) return;
  const F = { open:"Ochiq", done:"To'liq kelgan", cancel:"Bekor qilingan" }, counts = { open:0, done:0, cancel:0 };
  ZB.list.forEach(z => { counts[zbKind(z)]++; });
  $("zbFilters").innerHTML = Object.entries(F).map(([k, l]) => `<button data-f="${k}" class="${ZB.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("zbStatus").textContent = [tmLine(ZB, "Zakup buyurtmalari"), ZB.msg].filter(Boolean).join(" · ");
  const list = ZB.list.filter(z => zbKind(z) === ZB.filter), today = tmToday(), can = !!TM.mcp;
  if (!list.length) { $("zbList").innerHTML = `<div class="empty-box">${ZB.state === "ok" ? "Bu ro'yxatda buyurtma yo'q" : ""}</div>`; return; }
  $("zbList").innerHTML = `<table><thead><tr><th>№</th><th>Sana</th><th>Yetkazib beruvchi</th><th>Tovarlar</th><th>Summa</th><th>Kutilmoqda</th><th>Keldi</th><th>Holat</th><th></th></tr></thead><tbody>` + list.map(z => {
    const p = zbProgress(z), k = zbKind(z), late = k === "open" && z.exp && z.exp < today;
    const badge = k === "done" ? `<span class="st st-done">To'liq keldi</span>` : k === "cancel" ? `<span class="st st-draft">Bekor qilingan</span>` : p.part ? `<span class="st st-jarayonda">Qisman keldi</span>` : z.st === "sent" ? `<span class="st st-jarayonda">Yuborildi</span>` : `<span class="st st-yangi">Qoralama</span>`;
    let act = `<button data-zbview="${esc(z.id)}">${ZB.open === z.id ? "Yopish" : "Ko'rish"}</button>`;
    if (can && k === "open") act += (z.st === "draft" ? `<button data-zbedit="${esc(z.id)}">Tahrirlash</button><button data-zbsent="${esc(z.id)}">Yuborildi</button>` : "") + `<button data-zbkirim="${esc(z.id)}">Kirim qilish</button>` + (p.rec ? "" : `<button data-zbcancel="${esc(z.id)}">${ZB.pendCancel === z.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>`);
    let row = `<tr class="${k === "cancel" ? "slx" : ""}"><td>${z.number}</td><td>${esc(z.date.slice(0, 10))}</td><td><b>${esc(z.sup)}</b></td><td class="small">${z.items.map(it => esc(it.name) + ` × ${it.qty}`).join("<br>")}</td><td class="num">${krMoney(z.total, z.cur)}</td><td>${z.exp ? `<span class="${late ? "late" : ""}">${esc(z.exp)}</span>` : "—"}</td><td class="num">${p.rec} / ${p.ord}</td><td>${badge}</td><td class="krAct">${act}</td></tr>`;
    if (ZB.open === z.id) row += `<tr class="krDet"><td></td><td colspan="8">` + p.lines.map((l, i) => `<div><b>${esc(l.name)}</b> — buyurtma ${l.qty}, keldi ${l.got} × ${krMoney(Number(z.items[i].price) || 0, z.cur)}</div>`).join("") + (zbKirims(z).length ? `<div class="tmeta">Kirimlar: ${zbKirims(z).map(k2 => "№" + k2.number + " (" + String(k2.date).slice(0, 10) + ")").join(", ")}</div>` : "") + (z.note ? `<div class="tmeta">Izoh: ${esc(z.note)}</div>` : "") + `</td></tr>`;
    return row;
  }).join("") + `</tbody></table>`;
}
$("zbForm").addEventListener("submit", e => e.preventDefault());
$("zbForm").addEventListener("click", e => { const b = e.target.closest("[data-zbsave]"); if (b) zbSave(b.dataset.zbsave); });
$("zbAdd").addEventListener("click", () => { ZB.items.push({ name:"", qty:1, price:"" }); zbRows(); });
$("zbRows").addEventListener("input", e => { const tr = e.target.closest("tr[data-i]"); if (!tr || !e.target.dataset.f) return; const it = ZB.items[Number(tr.dataset.i)]; if (it) { it[e.target.dataset.f] = e.target.value; zbTotals(); } });
$("zbRows").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { ZB.items.splice(Number(b.dataset.rm), 1); zbRows(); } });
$("zbCur").addEventListener("change", zbTotals);
$("zbSup").addEventListener("change", () => { const s = tmSup($("zbSup").value); if (s && s.cur) $("zbCur").value = s.cur === "UZS" ? "UZS" : "USD"; zbTotals(); });
$("zbFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { ZB.filter = b.dataset.f; zbRender(); } });
$("zbList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.zbview) { ZB.open = ZB.open === b.dataset.zbview ? "" : b.dataset.zbview; zbRender(); }
  else if (b.dataset.zbedit) zbLoad(b.dataset.zbedit);
  else if (b.dataset.zbsent) zbSet(b.dataset.zbsent, "sent");
  else if (b.dataset.zbkirim) zbToKirim(b.dataset.zbkirim);
  else if (b.dataset.zbcancel) { if (ZB.pendCancel === b.dataset.zbcancel) zbSet(b.dataset.zbcancel, "cancel"); else { ZB.pendCancel = b.dataset.zbcancel; zbRender(); } }
});

// ======================= YETKAZIB BERUVCHIGA QAYTARISH =======================
const YQ_RANGE = "'Yetkazib beruvchiga qaytarish'!A1:N3000";
const YQ = { list:[], state:"loading", busy:false, filter:"all", pendCancel:"", msg:"", msgT:null, items:[] };
FORM_FOCUS.yqApp = "yqSup";
tmPanel("yqApp", `<div class="panel fpanel"><div class="thead"><h3>Yetkazib beruvchiga qaytarish</h3><button type="button" class="closebtn" data-close="yqApp">Yopish ✕</button></div>
  <form id="yqForm" class="kform"><div class="kgrid">
    <label>Yetkazib beruvchi<input id="yqSup" list="tmSups" maxlength="120"></label>
    <label>Sana<input type="date" id="yqDate"></label>
    <label>Sabab<select id="yqReason"></select></label>
  </div>
  <div class="tmeta">Shu yetkazib beruvchidan kelgan va hali sotilmagan tovarlar:</div>
  <div class="ktable"><table><thead><tr><th></th><th>Tovar</th><th>IMEI</th><th>Kirim</th><th>Tannarx</th><th>Soni</th></tr></thead><tbody id="yqRows"></tbody></table></div>
  <div class="ktotal" id="yqTotal"></div>
  <label class="full">Izoh<input id="yqNote" maxlength="300" placeholder="ixtiyoriy"></label>
  <div class="kbtns"><button type="button" class="pri" id="yqSave">Qaytarishni saqlash</button></div>
  <div class="status" id="yqFmsg"></div></form></div>
  <div class="panel"><div class="thead"><h3>Yetkazib beruvchiga qaytarishlar</h3><div class="hbtns"><div class="filters" id="yqFilters"></div><button type="button" class="openbtn" data-open="yqApp">+ Yangi qaytarish</button></div></div>
  <div class="tmeta">Qaytarilgan summa yetkazib beruvchi oldidagi qarzimizdan ayiriladi, IMEI'li tovar ombordan (yorliq ro'yxatidan) chiqadi.</div>
  <div class="status" id="yqStatus"></div><div id="yqList"></div></div>`);
function yqParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, cancelled:String(r[2] || "") === "Bekor qilingan", date:String(r[3] || ""), sup:String(r[4] || ""), cur:String(r[5] || "USD"), total:Number(r[6]) || 0, items:tmJson(r[7], []), reason:String(r[8] || ""), note:String(r[9] || ""), createdAt:String(r[10] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function yqActive() { return YQ.list.filter(r => !r.cancelled); }
function yqImeis() { const s = new Set(); yqActive().forEach(r => r.items.forEach(it => (it.imeis || []).forEach(m => s.add(m)))); return s; }
function yqApply(vals) { YQ.list = yqParse(vals); YQ.state = "ok"; tmRenderAll(); if (PARTY.supApp) PARTY.supApp.render(); }
async function yqReload() { const r = await TM.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:YQ_RANGE }, { cache:false }); yqApply(krVals({ result:r })); }
function yqStock(sup) {
  const k = tmK(sup); if (!k) return [];
  const prev = {}; YQ.items.forEach(u => { prev[u.key] = u; });
  return (typeof ylSrcRows === "function" ? ylSrcRows() : []).filter(r => { const kr = KR.list.find(x => x.number === r.kirim); return kr && tmK(kr.supplier) === k; })
    .map(r => { const key = r.key, p = prev[key]; return { key, name:r.name, imei:r.imei, kirim:r.kirim, cost:r.cur === undefined ? 0 : r.cost, cur:r.cur, max:r.imei ? 1 : (Number(r.qty) || 1), qty:p ? p.qty : 1, on:p ? p.on : false }; });
}
function yqRowsDraw() {
  YQ.items = yqStock($("yqSup").value);
  $("yqRows").innerHTML = !tmSup($("yqSup").value) ? `<tr><td colspan="6" class="empty">Yetkazib beruvchini tanlang.</td></tr>` : YQ.items.length ? YQ.items.map((u, i) => `<tr data-u="${i}"><td><input type="checkbox" data-f="on"${u.on ? " checked" : ""}></td><td>${esc(u.name)}</td><td class="mono">${u.imei ? esc(u.imei) : "—"}</td><td>№${u.kirim}</td><td class="num">${krMoney(u.cost, u.cur)}</td><td>${u.imei ? "1" : `<input type="number" class="sm" data-f="qty" min="1" max="${u.max}" step="1" value="${esc(u.qty)}"> / ${u.max}`}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">Bu yetkazib beruvchidan omborda (sotilmagan) tovar yo'q.</td></tr>`;
  yqTotals();
}
function yqTotals() { const sel = YQ.items.filter(u => u.on), m = {}; sel.forEach(u => { m[u.cur] = (m[u.cur] || 0) + u.cost * (u.imei ? 1 : Number(u.qty) || 0); }); $("yqTotal").textContent = sel.length ? "Qaytariladi: " + Object.entries(m).map(([c, v]) => krMoney(v, c)).join(" + ") : ""; }
function yqReset() { $("yqSup").value = ""; $("yqDate").value = tmToday(); $("yqNote").value = ""; YQ.items = []; tmSelects(); yqRowsDraw(); tmMsg("yqFmsg", ""); }
async function yqSave() {
  if (YQ.busy) return; if (!TM.mcp) return tmMsg("yqFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const s = tmSup($("yqSup").value); if (!s) return tmMsg("yqFmsg", "Yetkazib beruvchini tanlang.", true);
  const sel = YQ.items.filter(u => u.on); if (!sel.length) return tmMsg("yqFmsg", "Qaytariladigan tovarni belgilang.", true);
  const curs = [...new Set(sel.map(u => u.cur))]; if (curs.length > 1) return tmMsg("yqFmsg", "Bitta qaytarishda bitta valyutadagi tovarlar bo'lsin.", true);
  for (const u of sel) if (!u.imei) { const q = Number(u.qty); if (!(q >= 1) || Math.floor(q) !== q || q > u.max) return tmMsg("yqFmsg", `«${u.name}»: soni 1 dan ${u.max} gacha bo'lsin.`, true); }
  YQ.busy = true; $("yqSave").disabled = true;
  try {
    await yqReload(); const used = yqImeis();
    for (const u of sel) if (u.imei && used.has(u.imei)) { tmMsg("yqFmsg", `IMEI ${u.imei} allaqachon qaytarilgan.`, true); yqRowsDraw(); throw null; }
    const g = {}; sel.forEach(u => { const k = tmK(u.name) + "|" + u.kirim, o = g[k] || (g[k] = { name:u.name, kirim:u.kirim, price:u.cost, qty:0, imeis:[] }); if (u.imei) { o.imeis.push(u.imei); o.qty++; } else o.qty += Number(u.qty); });
    const items = Object.values(g), total = tmR2(items.reduce((a, it) => a + it.qty * it.price, 0)), now = new Date().toISOString(), number = YQ.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    await TM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Yetkazib beruvchiga qaytarish'!A1", values:[[krT(tmId("Y")), number, "Yakunlangan", krT($("yqDate").value || tmToday()), krT(s.name), curs[0], total, krT(JSON.stringify(items)), krT($("yqReason").value), krT($("yqNote").value.trim()), krT(now)]] });
    tmSay(YQ, yqRender, `Qaytarish №${number}: ${s.name}ga ${krMoney(total, curs[0])} lik tovar qaytarildi, qarzimizdan ayirildi.`); yqReset(); openForm("yqApp", false); try { await yqReload(); } catch (e) {}
  } catch (e) { if (e) tmMsg("yqFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  YQ.busy = false; $("yqSave").disabled = false;
}
async function yqCancel(id) {
  if (YQ.busy || !TM.mcp) return; YQ.busy = true;
  try { await yqReload(); const r = YQ.list.find(x => x.id === id); if (!r || r.cancelled) throw null; await TM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Yetkazib beruvchiga qaytarish'!C${r.row}`, values:[["Bekor qilingan"]] }); tmSay(YQ, yqRender, `Qaytarish №${r.number} bekor qilindi: tovar omborga, summa qarzga qaytdi.`); try { await yqReload(); } catch (e) {} }
  catch (e) { if (e) tmSay(YQ, yqRender, krCodeMsg(e.code) || "Bekor qilib bo'lmadi."); }
  YQ.busy = false; YQ.pendCancel = "";
}
function yqRender() {
  if (!$("yqList")) return;
  const counts = { all:YQ.list.filter(r => !r.cancelled).length, cancel:YQ.list.filter(r => r.cancelled).length };
  $("yqFilters").innerHTML = [["all", "Qaytarishlar"], ["cancel", "Bekor qilingan"]].map(([k, l]) => `<button data-f="${k}" class="${YQ.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("yqStatus").textContent = [tmLine(YQ, "Qaytarishlar"), YQ.msg].filter(Boolean).join(" · ");
  const list = YQ.list.filter(r => YQ.filter === "cancel" ? r.cancelled : !r.cancelled), can = !!TM.mcp;
  if (!list.length) { $("yqList").innerHTML = `<div class="empty-box">${YQ.state === "ok" ? "Hozircha qaytarish yo'q" : ""}</div>`; return; }
  $("yqList").innerHTML = `<table><thead><tr><th>№</th><th>Sana</th><th>Yetkazib beruvchi</th><th>Tovarlar</th><th>Summa</th><th>Sabab</th><th></th></tr></thead><tbody>` + list.map(r => `<tr class="${r.cancelled ? "slx" : ""}"><td>${r.number}</td><td>${esc(r.date.slice(0, 10))}</td><td><b>${esc(r.sup)}</b></td><td class="small">${r.items.map(it => `${esc(it.name)} × ${it.qty}${it.imeis && it.imeis.length ? `<div class="imeis">${it.imeis.map(esc).join(", ")}</div>` : ""}`).join("")}</td><td class="num">${krMoney(r.total, r.cur)}</td><td>${esc(r.reason)}${r.note ? `<div class="tmeta">${esc(r.note)}</div>` : ""}</td><td class="krAct">${can && !r.cancelled ? `<button data-yqcancel="${esc(r.id)}">${YQ.pendCancel === r.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
}
$("yqForm").addEventListener("submit", e => e.preventDefault());
$("yqSave").addEventListener("click", yqSave);
$("yqSup").addEventListener("change", yqRowsDraw);
$("yqRows").addEventListener("input", e => { const tr = e.target.closest("tr[data-u]"); if (!tr) return; const u = YQ.items[Number(tr.dataset.u)]; if (!u) return; if (e.target.dataset.f === "on") u.on = e.target.checked; else if (e.target.dataset.f === "qty") { u.qty = e.target.value; u.on = true; tr.querySelector('[data-f="on"]').checked = true; } yqTotals(); });
$("yqFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { YQ.filter = b.dataset.f; yqRender(); } });
$("yqList").addEventListener("click", e => { const b = e.target.closest("button[data-yqcancel]"); if (!b) return; if (YQ.pendCancel === b.dataset.yqcancel) yqCancel(b.dataset.yqcancel); else { YQ.pendCancel = b.dataset.yqcancel; yqRender(); } });
// Qaytarilgan IMEI ombordan (yorliq va qaytarish ro'yxatlaridan) chiqadi
const tmOrigYlSrc = ylSrcRows;
ylSrcRows = function () { const out = tmOrigYlSrc(), gone = yqImeis(); return gone.size ? out.filter(r => !r.imei || !gone.has(r.imei)) : out; };

// ======================= YETKAZIB BERUVCHILARGA TO'LOVLAR =======================
const YT_RANGE = "'Yetkazib beruvchilarga tolovlar'!A1:K3000";
const YT = { list:[], state:"loading", busy:false, filter:"all", pendCancel:"", msg:"", msgT:null };
FORM_FOCUS.ytApp = "ytSup";
tmPanel("ytApp", `<div class="panel fpanel"><div class="thead"><h3>Yetkazib beruvchiga to'lov</h3><button type="button" class="closebtn" data-close="ytApp">Yopish ✕</button></div>
  <form id="ytForm" class="kform"><div class="kgrid">
    <label>Yetkazib beruvchi<input id="ytSup" list="tmSups" maxlength="120"></label>
    <label>Sana<input type="date" id="ytDate"></label>
    <label>Valyuta<select id="ytCur"><option value="USD">USD ($)</option><option value="UZS">UZS (so'm)</option></select></label>
    <label>Summa<span class="inrow"><input type="number" id="ytSum" min="0" step="any" placeholder="0"><button type="button" class="mini" id="ytFull">Butun qarz</button></span></label>
    <label>To'lov turi<select id="ytType"><option>Naqd</option><option>O'tkazma</option><option>Karta</option></select></label>
  </div><div id="ytInfo" class="tmeta"></div>
  <label class="full">Izoh<input id="ytNote" maxlength="300" placeholder="Masalan: kirim №12 uchun"></label>
  <div class="kbtns"><button type="button" class="pri" id="ytSave">To'lovni saqlash</button></div><div class="status" id="ytFmsg"></div></form></div>
  <div class="panel"><div class="thead"><h3>Qarzimiz bor yetkazib beruvchilar</h3></div><div id="ytDebts"></div></div>
  <div class="panel"><div class="thead"><h3>Yetkazib beruvchilarga to'lovlar</h3><div class="hbtns"><div class="filters" id="ytFilters"></div><button type="button" class="openbtn" data-open="ytApp">+ To'lov</button></div></div>
  <div class="status" id="ytStatus"></div><div id="ytList"></div></div>`);
function ytParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0]) out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, cancelled:String(r[2] || "") === "Bekor qilingan", date:String(r[3] || ""), sup:String(r[4] || ""), cur:String(r[5] || "USD"), total:Number(r[6]) || 0, type:String(r[7] || ""), note:String(r[8] || ""), createdAt:String(r[9] || "") }); }); return out.sort((a, b) => b.number - a.number); }
function ytApply(vals) { YT.list = ytParse(vals); YT.state = "ok"; tmRenderAll(); if (PARTY.supApp) PARTY.supApp.render(); }
async function ytReload() { const r = await TM.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:YT_RANGE }, { cache:false }); ytApply(krVals({ result:r })); }
function ytBal(s) { return ptBal("supApp", s); }
function ytInfo() { const s = tmSup($("ytSup").value); if (!s) { $("ytInfo").textContent = ""; return; } const b = ytBal(s); $("ytInfo").innerHTML = `${esc(s.name)}: ${ptBalFmt(b, "supApp")}`; }
function ytReset() { ["ytSup", "ytSum", "ytNote"].forEach(id => { $(id).value = ""; }); $("ytDate").value = tmToday(); $("ytCur").value = "USD"; $("ytType").value = "Naqd"; tmSelects(); ytInfo(); tmMsg("ytFmsg", ""); }
async function ytSave() {
  if (YT.busy) return; if (!TM.mcp) return tmMsg("ytFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const s = tmSup($("ytSup").value), sum = tmR2($("ytSum").value);
  if (!s) return tmMsg("ytFmsg", "Yetkazib beruvchini tanlang.", true);
  if (!(sum > 0)) return tmMsg("ytFmsg", "Summani kiriting.", true);
  YT.busy = true; $("ytSave").disabled = true;
  try {
    await ytReload(); const now = new Date().toISOString(), number = YT.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    await TM.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Yetkazib beruvchilarga tolovlar'!A1", values:[[krT(tmId("T")), number, "To'langan", krT($("ytDate").value || tmToday()), krT(s.name), $("ytCur").value, sum, krT($("ytType").value), krT($("ytNote").value.trim()), krT(now)]] });
    tmSay(YT, ytRender, `To'lov №${number}: ${s.name}ga ${krMoney(sum, $("ytCur").value)} to'landi.`); ytReset(); openForm("ytApp", false); try { await ytReload(); } catch (e) {}
  } catch (e) { if (e) tmMsg("ytFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  YT.busy = false; $("ytSave").disabled = false;
}
async function ytCancel(id) {
  if (YT.busy || !TM.mcp) return; YT.busy = true;
  try { await ytReload(); const p = YT.list.find(x => x.id === id); if (!p || p.cancelled) throw null; await TM.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Yetkazib beruvchilarga tolovlar'!C${p.row}`, values:[["Bekor qilingan"]] }); tmSay(YT, ytRender, `To'lov №${p.number} bekor qilindi.`); try { await ytReload(); } catch (e) {} }
  catch (e) { if (e) tmSay(YT, ytRender, krCodeMsg(e.code) || "Bekor qilib bo'lmadi."); }
  YT.busy = false; YT.pendCancel = "";
}
function ytRender() {
  if (!$("ytList")) return;
  const debts = tmSuppliers().map(s => ({ s, b:ytBal(s) })).filter(x => Object.values(x.b).some(v => v > 0.005)), can = !!TM.mcp;
  $("ytDebts").innerHTML = debts.length ? `<table><thead><tr><th>Yetkazib beruvchi</th><th>Qarzimiz</th><th></th></tr></thead><tbody>` + debts.map(x => `<tr><td><b>${esc(x.s.name)}</b></td><td class="num">${Object.entries(x.b).filter(([, v]) => v > 0.005).map(([c, v]) => `<span class="balpos">${krMoney(v, c)}</span>`).join("<br>")}</td><td class="krAct">${can ? `<button data-ytfor="${esc(x.s.name)}">To'lash</button>` : ""}</td></tr>`).join("") + `</tbody></table>` : `<div class="empty-box">Qarzimiz yo'q</div>`;
  const counts = { all:YT.list.filter(p => !p.cancelled).length, cancel:YT.list.filter(p => p.cancelled).length };
  $("ytFilters").innerHTML = [["all", "To'lovlar"], ["cancel", "Bekor qilingan"]].map(([k, l]) => `<button data-f="${k}" class="${YT.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("ytStatus").textContent = [tmLine(YT, "To'lovlar"), YT.msg].filter(Boolean).join(" · ");
  const list = YT.list.filter(p => YT.filter === "cancel" ? p.cancelled : !p.cancelled);
  $("ytList").innerHTML = list.length ? `<table><thead><tr><th>№</th><th>Sana</th><th>Yetkazib beruvchi</th><th>Summa</th><th>Turi</th><th>Izoh</th><th></th></tr></thead><tbody>` + list.map(p => `<tr class="${p.cancelled ? "slx" : ""}"><td>${p.number}</td><td>${esc(p.date.slice(0, 10))}</td><td><b>${esc(p.sup)}</b></td><td class="num">${krMoney(p.total, p.cur)}</td><td>${esc(p.type)}</td><td class="tmeta">${esc(p.note)}</td><td class="krAct">${can && !p.cancelled ? `<button data-ytcancel="${esc(p.id)}">${YT.pendCancel === p.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>` : `<div class="empty-box">${YT.state === "ok" ? "Hozircha to'lov yo'q" : ""}</div>`;
}
$("ytForm").addEventListener("submit", e => e.preventDefault());
$("ytSave").addEventListener("click", ytSave);
$("ytSup").addEventListener("change", () => { const s = tmSup($("ytSup").value); if (s) { const b = ytBal(s), c = Object.keys(b).find(k => b[k] > 0.005); if (c) $("ytCur").value = c; } ytInfo(); });
$("ytFull").addEventListener("click", () => { const s = tmSup($("ytSup").value); if (!s) return; const v = ytBal(s)[$("ytCur").value] || 0; $("ytSum").value = v > 0 ? tmR2(v) : ""; });
$("ytDebts").addEventListener("click", e => { const b = e.target.closest("[data-ytfor]"); if (!b) return; ytReset(); openForm("ytApp", true); $("ytSup").value = b.dataset.ytfor; $("ytSup").dispatchEvent(new Event("change")); $("ytFull").click(); });
$("ytFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { YT.filter = b.dataset.f; ytRender(); } });
$("ytList").addEventListener("click", e => { const b = e.target.closest("button[data-ytcancel]"); if (!b) return; if (YT.pendCancel === b.dataset.ytcancel) ytCancel(b.dataset.ytcancel); else { YT.pendCancel = b.dataset.ytcancel; ytRender(); } });
// Yetkazib beruvchi balansi: to'lovlar va qaytarishlar qarzimizni kamaytiradi
const tmOrigPtBal = ptBal;
ptBal = function (app, o) {
  const m = tmOrigPtBal(app, o); if (app !== "supApp") return m;
  const n = tmK(o.name), add = (cur, v) => { cur = cur === "UZS" ? "UZS" : "USD"; m[cur] = (m[cur] || 0) + v; };
  YT.list.forEach(p => { if (!p.cancelled && tmK(p.sup) === n) add(p.cur, -p.total); });
  yqActive().forEach(r => { if (tmK(r.sup) === n) add(r.cur, -r.total); });
  return m;
};

// ======================= Yo'naltirish va yuklash =======================
function tmGo(sub) { if (!current || current.id !== "taminot") render("taminot"); const i = current.subs.findIndex(x => x.n === sub); if (i >= 0) renderSub(i); window.scrollTo(0, 0); }
const TM_APPS = { taminot:{ "Zakup so'rovlari":["zsApp", zsRender], "Zakup buyurtmalari":["zbApp", zbRender], "Yetkazib beruvchiga qaytarish":["yqApp", yqRender], "Yetkazib beruvchilarga to'lovlar":["ytApp", ytRender] },
  sozlamalar:{ "Zakup sabablari":["tmsApp", () => { TMS.kind = "zreason"; tmsRender(); }], "Yetkazib beruvchiga qaytarish sabablari":["tmsApp", () => { TMS.kind = "rreason"; tmsRender(); }] } };
function tmRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "", on = {};
  Object.entries(TM_APPS).forEach(([s, apps]) => Object.entries(apps).forEach(([name, [app]]) => { on[app] = on[app] || (s === sec && name === n); }));
  Object.keys(on).forEach(app => { $(app).classList.remove("fopen"); document.body.classList.toggle(app + "-on", on[app]); });
  const hit = (TM_APPS[sec] || {})[n]; if (hit) { tmSelects(); hit[1](); }
}
function tmRenderAll() { tmSelects(); const b = document.body.classList; if (b.contains("zsApp-on")) zsRender(); if (b.contains("zbApp-on")) zbRender(); if (b.contains("yqApp-on")) { yqRender(); if (!$("yqApp").classList.contains("fopen")) yqRowsDraw(); } if (b.contains("ytApp-on")) { ytRender(); ytInfo(); } }
const tmOrigRenderSub = renderSub;
renderSub = function (i) { tmOrigRenderSub(i); tmRoute(); };
document.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (!o) return; if (o.dataset.open === "zsApp") zsReset(); else if (o.dataset.open === "zbApp") zbReset(); else if (o.dataset.open === "yqApp") yqReset(); else if (o.dataset.open === "ytApp") ytReset(); });
const tmOrigKrApply = krApplyList;
krApplyList = function (vals) { tmOrigKrApply(vals); if (document.body.classList.contains("zbApp-on")) zbRender(); };
zsReset(); zbReset(); yqReset(); ytReset();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { TMS.state = ZS.state = ZB.state = YQ.state = YT.state = "off"; tmRenderAll(); tmsRender(); return; }
  TM.mcp = mcp;
  [[TMS, TMS_RANGE, tmsApply, 300000], [ZS, ZS_RANGE, zsApply, 120000], [ZB, ZB_RANGE, zbApply, 120000], [YQ, YQ_RANGE, yqApply, 120000], [YT, YT_RANGE, ytApply, 120000]].forEach(([o, range, apply, every]) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        if (o.state !== "ok" || !o.list.length) o.state = (ev.error && ev.error.code) || "upstream_error";
        tmRenderAll(); if (o === TMS) tmsRender();
      }, { refetchInterval:every });
    } catch (e) {}
  });
})();
tmRoute();
