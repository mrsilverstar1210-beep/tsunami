// ===== Tsunami: CRM → Mijoz kartasi, Buyurtmalar, Eslatmalar, Kategoriyalar; Hisobotlar → Mijozlar ABC/XYZ =====
// Asosiy sahifa, qaytarish.js, tolov.js, chegirma.js va marketing.js dan keyin yuklanadi.
const CR = { mcp:null, card:"" };
const crToday = () => new Date().toLocaleDateString("en-CA");
const crK = s => String(s || "").trim().toLowerCase();
function crId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function crJson(v, d) { try { const x = JSON.parse(v || ""); return x == null ? d : x; } catch (e) { return d; } }
function crMsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function crSay(o, render, m) { o.msg = m; clearTimeout(o.msgT); o.msgT = setTimeout(() => { o.msg = ""; render(); }, 6000); render(); }
function crLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
function crPanel(id, html, before) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; const ref = $(before || "kirimApp"); ref.parentNode.insertBefore(el, ref); return el; }
function crClients() { return PARTY.cliApp ? PARTY.cliApp.list : []; }
function crClient(name) { return crClients().find(c => crK(c.name) === crK(name)) || null; }
function crMoneyMap(m) { const p = Object.entries(m).filter(([, v]) => Math.abs(v) > 0.005); return p.length ? p.map(([c, v]) => krMoney(v, c)).join(" + ") : "—"; }
// Bo'limga o'tish (manzil satrini o'zgartirmasdan)
function crGo(sec, sub) { render(sec); const i = current.subs.findIndex(x => x.n === sub); if (i >= 0) renderSub(i); window.scrollTo(0, 0); }
(function crCss() {
  const st = document.createElement("style");
  st.textContent = "#orApp,#elApp,#mkatApp,#abcApp,#crdApp{display:none}.orApp-on #orApp,.elApp-on #elApp,.mkatApp-on #mkatApp,.abcApp-on #abcApp{display:block}.cliApp-on.crd-on #crdApp{display:block}"
    + ".orApp-on .gen,.orApp-on #kpis,.elApp-on .gen,.elApp-on #kpis,.mkatApp-on .gen,.mkatApp-on #kpis,.abcApp-on .gen,.abcApp-on #kpis,.abcApp-on .salesbar{display:none}"
    + ".crdhead{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}.crdhead h3{margin:0}.crdgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0}.crdbox{border:1px solid var(--line);border-radius:10px;padding:10px 12px}.crdbox .l{font-size:12px;color:#6b7280}.crdbox .v{font-weight:700;margin-top:3px}"
    + ".crdsec{margin-top:14px}.crdsec h4{margin:0 0 6px;font-size:14px}.crdacts{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}.crdacts button{font:inherit;font-size:13px;padding:6px 12px;border-radius:8px;border:1px solid var(--line);background:#fff;cursor:pointer}.crdacts button.pri{background:#16a34a;color:#fff;border-color:#16a34a}"
    + ".abc-A{color:#15803d;font-weight:700}.abc-B{color:#b45309;font-weight:700}.abc-C{color:#6b7280;font-weight:700}.elauto td{background:#fffbeb}";
  document.head.appendChild(st);
})();

// ======================= KATEGORIYALAR (mijoz kategoriyalari) =======================
const MK_DEF = ["Oddiy", "Doimiy", "VIP", "Ulgurji"];
const MKAT_RANGE = "'Mijoz kategoriyalari'!A1:E300";
const MKAT = { list:[], state:"loading", busy:false, edit:"", pendDel:"", msg:"", msgT:null };
crPanel("mkatApp", `<div class="panel"><div class="thead"><h3>Mijoz kategoriyalari</h3></div>
  <div class="tmeta">Mijoz yaratishdagi «Kategoriya» ro'yxati shu yerdan olinadi.</div>
  <form id="mkatForm" class="kform"><div class="inrow" style="max-width:640px"><input id="mkatName" maxlength="60" placeholder="Yangi kategoriya, masalan: Korporativ"><input id="mkatNote" maxlength="200" placeholder="Izoh (ixtiyoriy)"><button type="button" class="pri" id="mkatAdd">Qo'shish</button></div></form>
  <div class="status" id="mkatStatus"></div><div id="mkatList"></div></div>`);
function mkatParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[3] || "") !== "O'chirilgan" && String(r[1] || "").trim()) out.push({ id:String(r[0]), row:i + 1, name:String(r[1]).trim(), note:String(r[2] || "") }); }); return out; }
function mkatNames() { return MKAT.state === "ok" && MKAT.list.length ? MKAT.list.map(x => x.name) : MK_DEF; }
function mkatSync() {
  // Mijoz formasidagi «Kategoriya» tanlovini yangilash (mavjud mijozdagi eski qiymat ham yo'qolmasin)
  const f = PARTY_CFG.cliApp.fields.find(x => x.k === "cat"); if (!f) return;
  const extra = crClients().map(c => c.cat).filter(c => c && mkatNames().indexOf(c) < 0);
  f.options.splice(0, f.options.length, ...mkatNames(), ...[...new Set(extra)]);
  const sel = $("cliApp_cat"); if (!sel) return; const v = sel.value;
  sel.innerHTML = f.options.map(o => `<option>${esc(o)}</option>`).join(""); if (f.options.indexOf(v) >= 0) sel.value = v;
}
function mkatApply(vals) { MKAT.list = mkatParse(vals); MKAT.state = "ok"; mkatSync(); mkatRender(); }
async function mkatReload() { const r = await CR.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:MKAT_RANGE }, { cache:false }); mkatApply(krVals({ result:r })); }
async function mkatDo(fn) {
  if (MKAT.busy) return; if (!CR.mcp) return crSay(MKAT, mkatRender, krDbLine() || "Tsunami bazasi ulanmagan.");
  MKAT.busy = true;
  try { await mkatReload(); await fn(); try { await mkatReload(); } catch (e) {} } catch (e) { if (e) crSay(MKAT, mkatRender, krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."); }
  MKAT.busy = false;
}
function mkatAdd() {
  const name = $("mkatName").value.trim(), note = $("mkatNote").value.trim(); if (!name) return crSay(MKAT, mkatRender, "Kategoriya nomini yozing.");
  mkatDo(async () => {
    if (MKAT.list.some(x => crK(x.name) === crK(name))) { crSay(MKAT, mkatRender, `«${name}» ro'yxatda bor.`); throw null; }
    // Varaq bo'sh bo'lsa, avval standart kategoriyalar yoziladi (mavjud mijozlar kategoriyasi yo'qolmasin)
    const rows = MKAT.list.length ? [] : MK_DEF.map(n => [krT(crId("K")), krT(n), "", "Faol", krT(new Date().toISOString())]);
    rows.push([krT(crId("K")), krT(name), krT(note), "Faol", krT(new Date().toISOString())]);
    await CR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Mijoz kategoriyalari'!A1", values:rows });
    $("mkatName").value = ""; $("mkatNote").value = ""; crSay(MKAT, mkatRender, `«${name}» qo'shildi.`);
  });
}
function mkatRename(id, name) {
  name = String(name || "").trim(); if (!name) return crSay(MKAT, mkatRender, "Nom bo'sh bo'lmasin.");
  mkatDo(async () => {
    const x = MKAT.list.find(r => r.id === id); if (!x) throw null;
    if (MKAT.list.some(r => r.id !== id && crK(r.name) === crK(name))) { crSay(MKAT, mkatRender, `«${name}» ro'yxatda bor.`); throw null; }
    await CR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Mijoz kategoriyalari'!B${x.row}`, values:[[krT(name)]] });
    MKAT.edit = ""; crSay(MKAT, mkatRender, "Saqlandi. Eski nom bilan yozilgan mijozlarni tahrirlab, yangi kategoriyani tanlang.");
  });
}
function mkatDelete(id) {
  mkatDo(async () => {
    const x = MKAT.list.find(r => r.id === id); if (!x) throw null;
    const n = crClients().filter(c => crK(c.cat) === crK(x.name)).length;
    if (n) { crSay(MKAT, mkatRender, `«${x.name}» da ${n} ta mijoz bor: avval ularning kategoriyasini o'zgartiring.`); throw null; }
    if (MKAT.list.length <= 1) { crSay(MKAT, mkatRender, "Kamida bitta kategoriya qolishi kerak."); throw null; }
    await CR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Mijoz kategoriyalari'!D${x.row}`, values:[["O'chirilgan"]] });
    MKAT.pendDel = ""; crSay(MKAT, mkatRender, `«${x.name}» o'chirildi.`);
  });
}
function mkatRender() {
  if (!$("mkatList")) return;
  $("mkatStatus").textContent = [crLine(MKAT, "Kategoriyalar"), MKAT.msg].filter(Boolean).join(" · ");
  const rows = MKAT.state === "ok" && MKAT.list.length ? MKAT.list : MK_DEF.map(n => ({ id:"", name:n, note:"standart" }));
  const cnt = n => crClients().filter(c => crK(c.cat || "Oddiy") === crK(n)).length, can = !!CR.mcp;
  $("mkatList").innerHTML = `<table><thead><tr><th>Kategoriya</th><th>Izoh</th><th>Mijozlar</th><th></th></tr></thead><tbody>` + rows.map(x => MKAT.edit && MKAT.edit === x.id
    ? `<tr><td><input id="mkatEditIn" value="${esc(x.name)}" maxlength="60"></td><td>${esc(x.note)}</td><td class="num">${cnt(x.name)}</td><td class="krAct"><button data-mksave="${esc(x.id)}">Saqlash</button><button data-mkcancel="1">Bekor</button></td></tr>`
    : `<tr><td><b>${esc(x.name)}</b></td><td class="tmeta">${esc(x.note)}</td><td class="num">${cnt(x.name)}</td><td class="krAct">${can && x.id ? `<button data-mkedit="${esc(x.id)}">Tahrirlash</button><button data-mkdel="${esc(x.id)}">${MKAT.pendDel === x.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`
    + (MKAT.state === "ok" && !MKAT.list.length ? `<div class="tmeta">Hozir standart ro'yxat ishlatilmoqda. Birinchi yangi kategoriya qo'shilganda standartlari ham bazaga yoziladi va ularni tahrirlash mumkin bo'ladi.</div>` : "");
}
$("mkatForm").addEventListener("submit", e => { e.preventDefault(); mkatAdd(); });
$("mkatAdd").addEventListener("click", mkatAdd);
$("mkatList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.mkedit) { MKAT.edit = b.dataset.mkedit; MKAT.pendDel = ""; mkatRender(); const i = $("mkatEditIn"); if (i) i.focus(); }
  else if (b.dataset.mkcancel) { MKAT.edit = ""; mkatRender(); }
  else if (b.dataset.mksave) mkatRename(b.dataset.mksave, $("mkatEditIn").value);
  else if (b.dataset.mkdel) { if (MKAT.pendDel === b.dataset.mkdel) mkatDelete(b.dataset.mkdel); else { MKAT.pendDel = b.dataset.mkdel; MKAT.edit = ""; mkatRender(); } }
});

// ======================= BUYURTMALAR =======================
const OR_RANGE = "Buyurtmalar!A1:O3000";
const OR = { list:[], state:"loading", busy:false, filter:"open", q:"", open:"", pendCancel:"", msg:"", msgT:null, items:[] };
const OR_ST = { new:"Yangi", prep:"Tayyorlanmoqda", ready:"Tayyor", done:"Berildi", cancel:"Bekor qilingan" };
FORM_FOCUS.orApp = "orClient";
crPanel("orApp", `<div class="panel fpanel"><div class="thead"><h3>Yangi buyurtma</h3><button type="button" class="closebtn" data-close="orApp">Yopish ✕</button></div>
  <form id="orForm" class="kform">
    <div class="kgrid">
      <label>Buyurtma sanasi<input type="date" id="orDate"></label>
      <label>Mijoz<input id="orClient" list="pyClients" maxlength="160" placeholder="Mijoz ismi"></label>
      <label>Telefon<input id="orPhone" maxlength="30" inputmode="tel" placeholder="+998 90 123 45 67"></label>
      <label>Valyuta<select id="orCur"><option value="UZS">UZS (so'm)</option><option value="USD">USD ($)</option></select></label>
      <label>Berish muddati<input type="date" id="orDue"></label>
      <label>Oldindan to'lov (avans)<input type="number" id="orPrepay" min="0" step="any" placeholder="0"></label>
    </div>
    <div class="ktable"><table><thead><tr><th>#</th><th>Tovar</th><th>Soni</th><th>Narx (1 dona)</th><th>Summa</th><th></th></tr></thead><tbody id="orRows"></tbody></table></div>
    <button type="button" id="orAdd" class="lnk">+ Qator qo'shish</button>
    <div class="ktotal" id="orTotal"></div>
    <label class="full">Izoh<input id="orNote" maxlength="300" placeholder="Rangi, xotirasi, yetkazib berish va h.k."></label>
    <div class="kbtns"><button type="button" class="pri" id="orSave">Buyurtmani saqlash</button></div>
    <div class="status" id="orFmsg"></div>
  </form></div>
  <div class="panel"><div class="thead"><h3>Buyurtmalar</h3><div class="hbtns"><input class="search" id="orQ" placeholder="Qidirish: mijoz, telefon, tovar"><div class="filters" id="orFilters"></div><button type="button" class="openbtn" data-open="orApp">+ Yangi buyurtma</button></div></div>
  <div class="tmeta">Buyurtma tayyor bo'lgach «Sotuvga aylantirish» tugmasi sotuv formasini to'ldirib ochadi; sotuv saqlanganda buyurtma o'zi «Berildi» bo'ladi.</div>
  <div class="status" id="orStatus"></div><div id="orList"></div></div>`);
function orParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const st = Object.keys(OR_ST).find(k => OR_ST[k] === String(r[2] || "")) || "new";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, st, date:String(r[3] || ""), client:String(r[4] || ""), phone:String(r[5] || ""), items:crJson(r[6], []), total:Number(r[7]) || 0, cur:String(r[8] || "UZS"), prepay:Number(r[9]) || 0, due:String(r[10] || ""), note:String(r[11] || ""), createdAt:String(r[13] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
// Buyurtmadan qilingan sotuv: izohida «Buyurtma №N» bo'lgan, shu mijozning bekor qilinmagan sotuvi
function orSale(o) { const tag = `Buyurtma №${o.number}`; return SL.list.find(s => !s.cancelled && crK(s.client) === crK(o.client) && String(s.note || "").indexOf(tag) >= 0) || null; }
function orKind(o) { if (o.st === "cancel") return "cancel"; if (o.st === "done" || orSale(o)) return "done"; return "open"; }
function orApply(vals) { OR.list = orParse(vals); OR.state = "ok"; orRender(); crCardRender(); }
async function orReload() { const r = await CR.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:OR_RANGE }, { cache:false }); orApply(krVals({ result:r })); }
function orRows() {
  if (!OR.items.length) OR.items = [{ name:"", qty:1, price:"" }];
  $("orRows").innerHTML = OR.items.map((it, i) => `<tr data-i="${i}"><td>${i + 1}</td><td><input data-f="name" list="krProducts" value="${esc(it.name)}" maxlength="160" placeholder="Tovar nomi"></td><td><input data-f="qty" class="sm" type="number" min="1" step="1" value="${esc(it.qty)}"></td><td><input data-f="price" class="sm" type="number" min="0" step="any" value="${esc(it.price)}" placeholder="0"></td><td class="num" data-sum></td><td><button type="button" data-rm="${i}">×</button></td></tr>`).join("");
  orTotals();
}
function orTotal() { return OR.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0); }
function orTotals() {
  const cur = $("orCur").value;
  OR.items.forEach((it, i) => { const c = document.querySelector(`#orRows tr[data-i="${i}"] [data-sum]`); if (c) c.textContent = krMoney((Number(it.qty) || 0) * (Number(it.price) || 0), cur); });
  const t = orTotal(), pre = Number($("orPrepay").value) || 0;
  $("orTotal").innerHTML = t ? `Jami: <b>${krMoney(t, cur)}</b>${pre ? ` · avans ${krMoney(pre, cur)} · qoladi ${krMoney(Math.max(0, t - pre), cur)}` : ""}` : "";
}
function orReset() {
  $("orDate").value = crToday(); ["orClient", "orPhone", "orDue", "orPrepay", "orNote"].forEach(id => { $(id).value = ""; }); $("orCur").value = "UZS";
  OR.items = []; orRows(); crMsg("orFmsg", ""); if (typeof pyClientsFill === "function") pyClientsFill();
}
async function orSave() {
  if (OR.busy) return;
  if (!CR.mcp) return crMsg("orFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const date = $("orDate").value || crToday(), client = $("orClient").value.trim(), cur = $("orCur").value, due = $("orDue").value, prepay = Number($("orPrepay").value) || 0, note = $("orNote").value.trim();
  if (!client) return crMsg("orFmsg", "Mijoz ismini yozing.", true);
  const known = crClient(client), phone = $("orPhone").value.trim() || (known ? known.phone : "");
  if (!phone) return crMsg("orFmsg", "Telefon raqamini yozing.", true);
  const items = [];
  for (const it of OR.items.filter(x => String(x.name).trim())) {
    const p = krProduct(it.name) || KR.products.find(x => x.sku === String(it.name).trim() || x.barcode === String(it.name).trim());
    const qty = Number(it.qty), price = Number(it.price);
    if (!(qty >= 1) || Math.floor(qty) !== qty) return crMsg("orFmsg", `«${it.name}»: sonini to'g'ri kiriting.`, true);
    if (String(it.price).trim() === "" || !(price >= 0)) return crMsg("orFmsg", `«${it.name}»: narxini kiriting.`, true);
    items.push({ name:p ? p.name : String(it.name).trim(), qty, price });
  }
  if (!items.length) return crMsg("orFmsg", "Kamida bitta tovar kiriting.", true);
  const total = Math.round(items.reduce((s, it) => s + it.qty * it.price, 0) * 100) / 100;
  if (prepay < 0 || prepay - total > 0.005) return crMsg("orFmsg", "Avans jami summadan ko'p bo'lmasin.", true);
  if (due && due < date) return crMsg("orFmsg", "Berish muddati buyurtma sanasidan oldin bo'lmasin.", true);
  OR.busy = true; $("orSave").disabled = true; let step = "read";
  try {
    await orReload();
    const now = new Date().toISOString(), number = OR.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    step = "write";
    await CR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Buyurtmalar!A1", values:[[krT(crId("O")), number, OR_ST.new, krT(date), krT(known ? known.name : client), krT(phone), krT(JSON.stringify(items)), total, cur, prepay || "", krT(due), krT(note), "", krT(now), krT(now)]] });
    crSay(OR, orRender, `Buyurtma №${number} saqlandi: ${client} — ${krMoney(total, cur)}.`);
    orReset(); openForm("orApp", false); try { await orReload(); } catch (e) {}
  } catch (e) { if (e) crMsg("orFmsg", krCodeMsg(e.code) || (step === "write" ? "Javob kelmadi: saqlangan bo'lishi ham mumkin. Ro'yxatni tekshiring." : "Bazaga ulanib bo'lmadi, qayta urinib ko'ring."), true); }
  OR.busy = false; $("orSave").disabled = false;
}
async function orSet(id, st) {
  if (OR.busy || !CR.mcp) return; OR.busy = true;
  try {
    await orReload(); const o = OR.list.find(x => x.id === id); if (!o) throw null;
    await CR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Buyurtmalar!C${o.row}`, values:[[OR_ST[st]]] });
    await CR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Buyurtmalar!O${o.row}`, values:[[krT(new Date().toISOString())]] });
    crSay(OR, orRender, `Buyurtma №${o.number}: ${OR_ST[st]}.`); try { await orReload(); } catch (e) {}
  } catch (e) { if (e) crSay(OR, orRender, krCodeMsg(e.code) || "O'zgartirib bo'lmadi."); }
  OR.busy = false; OR.pendCancel = "";
}
function orToSale(id) {
  const o = OR.list.find(x => x.id === id); if (!o) return;
  crGo("sotuv", "Sotuvlar"); slReset(); slClientsFill(); openForm("sotuvApp", true);
  $("slClient").value = o.client; $("slCur").value = o.cur; $("slNote").value = `Buyurtma №${o.number}${o.note ? " · " + o.note : ""}`.slice(0, 300);
  SL.items = o.items.map(it => ({ name:it.name, qty:it.qty, price:it.price, imei:"" })); slRows();
  if (o.prepay) $("slPaid").value = o.prepay; slTotals();
  slFmsg(`Buyurtma №${o.number} ma'lumotlari qo'yildi${o.prepay ? `, avans ${krMoney(o.prepay, o.cur)} to'langan summaga yozildi` : ""}. IMEI'larni kiriting va saqlang.`);
}
function orRender() {
  if (!$("orList")) return;
  const F = { open:"Ochiq", done:"Berilgan", cancel:"Bekor qilingan" }, counts = { open:0, done:0, cancel:0 };
  OR.list.forEach(o => { counts[orKind(o)]++; });
  $("orFilters").innerHTML = Object.entries(F).map(([k, l]) => `<button data-f="${k}" class="${OR.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("orStatus").textContent = [crLine(OR, "Buyurtmalar"), OR.msg].filter(Boolean).join(" · ");
  const q = crK(OR.q), today = crToday();
  const list = OR.list.filter(o => orKind(o) === OR.filter && (!q || [o.client, o.phone].some(x => crK(x).indexOf(q) >= 0) || o.items.some(it => crK(it.name).indexOf(q) >= 0)));
  if (!list.length) { $("orList").innerHTML = `<div class="empty-box">${OR.state === "ok" ? (OR.list.length ? "Bu ro'yxatda buyurtma yo'q" : "Hozircha buyurtma yo'q: «Yangi buyurtma» tugmasini bosing") : ""}</div>`; return; }
  const can = !!CR.mcp;
  $("orList").innerHTML = `<table><thead><tr><th>№</th><th>Sana</th><th>Mijoz</th><th>Tovarlar</th><th>Summa</th><th>Avans</th><th>Muddat</th><th>Holat</th><th></th></tr></thead><tbody>` + list.map(o => {
    const s = orSale(o), k = orKind(o), late = k === "open" && o.due && o.due < today;
    const badge = k === "done" ? `<span class="st st-done">Berildi</span>${s ? `<div class="tmeta">sotuv №${s.number}</div>` : ""}` : k === "cancel" ? `<span class="st st-draft">Bekor qilingan</span>` : `<span class="st ${o.st === "ready" ? "st-done" : o.st === "prep" ? "st-jarayonda" : "st-yangi"}">${OR_ST[o.st]}</span>`;
    let act = `<button data-orview="${esc(o.id)}">${OR.open === o.id ? "Yopish" : "Ko'rish"}</button>`;
    if (can && k === "open") act += (o.st === "new" ? `<button data-orst="${esc(o.id)}" data-v="prep">Tayyorlanmoqda</button>` : "") + (o.st !== "ready" ? `<button data-orst="${esc(o.id)}" data-v="ready">Tayyor</button>` : "") + `<button data-orsale="${esc(o.id)}">Sotuvga aylantirish</button><button data-orcancel="${esc(o.id)}">${OR.pendCancel === o.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>`;
    let row = `<tr class="${k === "cancel" ? "slx" : ""}"><td>${esc(o.number)}</td><td>${esc(o.date.slice(0, 10))}</td><td><b>${esc(o.client)}</b><div class="tmeta mono">${esc(o.phone)}</div></td><td class="small">${o.items.map(it => esc(it.name) + (it.qty > 1 ? ` × ${it.qty}` : "")).join("<br>")}</td><td class="num">${krMoney(o.total, o.cur)}</td><td class="num">${o.prepay ? krMoney(o.prepay, o.cur) : "—"}</td><td>${o.due ? `<span class="${late ? "late" : ""}">${esc(o.due)}</span>` : "—"}</td><td>${badge}</td><td class="krAct">${act}</td></tr>`;
    if (OR.open === o.id) row += `<tr class="krDet"><td></td><td colspan="8">` + o.items.map(it => `<div><b>${esc(it.name)}</b> — ${it.qty} × ${krMoney(it.price, o.cur)}</div>`).join("") + (o.note ? `<div class="tmeta">Izoh: ${esc(o.note)}</div>` : "") + `</td></tr>`;
    return row;
  }).join("") + `</tbody></table>`;
}
$("orForm").addEventListener("submit", e => e.preventDefault());
$("orSave").addEventListener("click", orSave);
$("orAdd").addEventListener("click", () => { OR.items.push({ name:"", qty:1, price:"" }); orRows(); });
$("orRows").addEventListener("input", e => { const tr = e.target.closest("tr[data-i]"); if (!tr || !e.target.dataset.f) return; const it = OR.items[Number(tr.dataset.i)]; if (it) { it[e.target.dataset.f] = e.target.value; orTotals(); } });
$("orRows").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { OR.items.splice(Number(b.dataset.rm), 1); orRows(); } });
["orCur", "orPrepay"].forEach(id => $(id).addEventListener("input", orTotals));
$("orClient").addEventListener("change", () => { const c = crClient($("orClient").value); if (c && c.phone && !$("orPhone").value) $("orPhone").value = c.phone; });
$("orFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { OR.filter = b.dataset.f; orRender(); } });
$("orQ").addEventListener("input", e => { OR.q = e.target.value; orRender(); });
$("orList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.orview) { OR.open = OR.open === b.dataset.orview ? "" : b.dataset.orview; orRender(); }
  else if (b.dataset.orst) orSet(b.dataset.orst, b.dataset.v);
  else if (b.dataset.orsale) orToSale(b.dataset.orsale);
  else if (b.dataset.orcancel) { if (OR.pendCancel === b.dataset.orcancel) orSet(b.dataset.orcancel, "cancel"); else { OR.pendCancel = b.dataset.orcancel; orRender(); } }
});

// ======================= ESLATMALAR =======================
const EL_RANGE = "Eslatmalar!A1:L3000";
const EL = { list:[], state:"loading", busy:false, filter:"today", q:"", pendCancel:"", msg:"", msgT:null, doneId:"" };
const EL_TYPES = ["Qo'ng'iroq", "Qarz eslatmasi", "Uchrashuv", "Tug'ilgan kun tabrigi", "Tovar haqida xabar", "Boshqa"];
const EL_ST = { plan:"Rejada", done:"Bajarildi", cancel:"Bekor qilingan" };
FORM_FOCUS.elApp = "elClient";
crPanel("elApp", `<div class="panel fpanel"><div class="thead"><h3>Yangi eslatma</h3><button type="button" class="closebtn" data-close="elApp">Yopish ✕</button></div>
  <form id="elForm" class="kform">
    <div class="kgrid">
      <label>Mijoz<input id="elClient" list="pyClients" maxlength="160" placeholder="Mijoz ismi"></label>
      <label>Turi<select id="elType">${EL_TYPES.map(t => `<option>${t}</option>`).join("")}</select></label>
      <label>Qachon<input type="date" id="elDate"></label>
      <label>Soat<input type="time" id="elTime"></label>
      <label>Mas'ul xodim<input id="elWho" list="slSellers" maxlength="80" placeholder="ixtiyoriy"></label>
    </div>
    <label class="full">Nima qilish kerak<input id="elText" maxlength="300" placeholder="Masalan: qarzini eslatish, yangi iPhone kelganini aytish"></label>
    <div class="kbtns"><button type="button" class="pri" id="elSave">Saqlash</button></div>
    <div class="status" id="elFmsg"></div>
  </form></div>
  <div class="panel"><div class="thead"><h3>Tavsiya etilgan eslatmalar</h3></div><div class="tmeta">Tug'ilgan kunlar (7 kun ichida), muddati o'tgan bo'lib to'lashlar va omborga kelgan kutilayotgan tovarlar — bir bosishda eslatma qilinadi.</div><div id="elAuto"></div></div>
  <div class="panel"><div class="thead"><h3>Eslatmalar</h3><div class="hbtns"><input class="search" id="elQ" placeholder="Qidirish: mijoz, matn"><div class="filters" id="elFilters"></div><button type="button" class="openbtn" data-open="elApp">+ Yangi eslatma</button></div></div>
  <div class="status" id="elStatus"></div><div id="elList"></div></div>`);
function elParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const st = Object.keys(EL_ST).find(k => EL_ST[k] === String(r[2] || "")) || "plan";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, st, date:String(r[3] || ""), time:String(r[4] || ""), client:String(r[5] || ""), type:String(r[6] || ""), text:String(r[7] || ""), who:String(r[8] || ""), result:String(r[9] || ""), key:String(r[10] || ""), createdAt:String(r[11] || "") });
  });
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
function elApply(vals) { EL.list = elParse(vals); EL.state = "ok"; elRender(); crCardRender(); }
async function elReload() { const r = await CR.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:EL_RANGE }, { cache:false }); elApply(krVals({ result:r })); }
function elReset(client, type, text, key) {
  $("elClient").value = client || ""; $("elType").value = type || EL_TYPES[0]; $("elDate").value = crToday(); $("elTime").value = ""; $("elWho").value = ""; $("elText").value = text || "";
  EL.key = key || ""; crMsg("elFmsg", ""); if (typeof pyClientsFill === "function") pyClientsFill();
}
async function elAdd(rec) {
  const now = new Date().toISOString(), number = EL.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
  await CR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Eslatmalar!A1", values:[[krT(crId("E")), number, EL_ST.plan, krT(rec.date), krT(rec.time || ""), krT(rec.client), krT(rec.type), krT(rec.text), krT(rec.who || ""), "", krT(rec.key || ""), krT(now)]] });
  return number;
}
async function elSave() {
  if (EL.busy) return;
  if (!CR.mcp) return crMsg("elFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const client = $("elClient").value.trim(), date = $("elDate").value, text = $("elText").value.trim();
  if (!client) return crMsg("elFmsg", "Mijozni tanlang.", true);
  if (!date) return crMsg("elFmsg", "Sanani kiriting.", true);
  if (!text) return crMsg("elFmsg", "Nima qilish kerakligini yozing.", true);
  const k = crClient(client);
  EL.busy = true; $("elSave").disabled = true;
  try {
    await elReload();
    const n = await elAdd({ client:k ? k.name : client, date, time:$("elTime").value, type:$("elType").value, text, who:$("elWho").value.trim(), key:EL.key });
    crSay(EL, elRender, `Eslatma №${n} saqlandi.`); elReset(); openForm("elApp", false); try { await elReload(); } catch (e) {}
  } catch (e) { if (e) crMsg("elFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  EL.busy = false; $("elSave").disabled = false;
}
async function elSet(id, st, result) {
  if (EL.busy || !CR.mcp) return; EL.busy = true;
  try {
    await elReload(); const x = EL.list.find(r => r.id === id); if (!x) throw null;
    await CR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Eslatmalar!C${x.row}`, values:[[EL_ST[st]]] });
    if (result != null) await CR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Eslatmalar!J${x.row}`, values:[[krT(result)]] });
    EL.doneId = ""; crSay(EL, elRender, `Eslatma №${x.number}: ${EL_ST[st]}.`); try { await elReload(); } catch (e) {}
  } catch (e) { if (e) crSay(EL, elRender, krCodeMsg(e.code) || "O'zgartirib bo'lmadi."); }
  EL.busy = false; EL.pendCancel = "";
}
function elAuto() {
  const out = [], have = new Set(EL.list.filter(x => x.st !== "cancel").map(x => x.key).filter(Boolean)), t = new Date(), year = t.getFullYear();
  crClients().forEach(c => {
    const b = String(c.birth || ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) return;
    let d = new Date(year, Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10))); const t0 = new Date(year, t.getMonth(), t.getDate());
    if (d < t0) d = new Date(year + 1, d.getMonth(), d.getDate());
    const days = Math.round((d - t0) / 864e5); if (days > 7) return;
    const ds = d.toLocaleDateString("en-CA"), key = `bd:${c.id}:${d.getFullYear()}`;
    if (!have.has(key)) out.push({ key, client:c.name, type:"Tug'ilgan kun tabrigi", date:ds, text:`${c.name} — tug'ilgan kuni ${days ? days + " kundan keyin" : "bugun"} (${ds}). Tabriklash${c.phone ? ", tel: " + c.phone : ""}` });
  });
  if (typeof BOL !== "undefined" && typeof blStatus === "function") BOL.list.filter(c => !c.cancelled).forEach(c => {
    const st = blStatus(c); if (st.closed || !st.lateN) return;
    const key = `bl:${c.id}:${st.lateN}`;
    if (!have.has(key)) out.push({ key, client:c.client, type:"Qarz eslatmasi", date:crToday(), text:`Bo'lib to'lash №${c.number}: ${st.lateN} ta to'lov kechikkan, ${krMoney(st.lateSum, c.currency)}` });
  });
  if (typeof KG !== "undefined" && typeof mkInStock === "function") { const stock = mkInStock(); KG.list.filter(w => w.st === "wait" && stock[crK(w.prod)]).forEach(w => {
    const key = `kg:${w.id}`;
    if (!have.has(key)) out.push({ key, client:w.client, type:"Tovar haqida xabar", date:crToday(), text:`${w.prod} omborga keldi — ${w.client}ga xabar berish (tel: ${w.phone})` });
  }); }
  return out;
}
function elRender() {
  if (!$("elList")) return;
  const auto = elAuto(), can = !!CR.mcp;
  $("elAuto").innerHTML = !auto.length ? `<div class="empty-box">Hozircha tavsiya yo'q</div>` : `<table><tbody>` + auto.map((a, i) => `<tr class="elauto"><td>${esc(a.type)}</td><td><b>${esc(a.client)}</b></td><td>${esc(a.text)}</td><td class="krAct">${can ? `<button data-elauto="${i}">Eslatma qilish</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
  EL.auto = auto;
  const today = crToday(), kind = x => x.st !== "plan" ? (x.st === "done" ? "done" : "cancel") : x.date < today ? "late" : x.date === today ? "today" : "soon";
  const F = { late:"Muddati o'tgan", today:"Bugun", soon:"Keyingi", done:"Bajarilgan", cancel:"Bekor qilingan" }, counts = { late:0, today:0, soon:0, done:0, cancel:0 };
  EL.list.forEach(x => { counts[kind(x)]++; });
  $("elFilters").innerHTML = Object.entries(F).map(([k, l]) => `<button data-f="${k}" class="${EL.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("elStatus").textContent = [crLine(EL, "Eslatmalar"), EL.msg].filter(Boolean).join(" · ");
  const q = crK(EL.q);
  let list = EL.list.filter(x => kind(x) === EL.filter && (!q || crK(x.client).indexOf(q) >= 0 || crK(x.text).indexOf(q) >= 0));
  if (EL.filter === "done" || EL.filter === "cancel") list = list.slice().reverse();
  if (!list.length) { $("elList").innerHTML = `<div class="empty-box">${EL.state === "ok" ? "Bu ro'yxatda eslatma yo'q" : ""}</div>`; return; }
  $("elList").innerHTML = `<table><thead><tr><th>Qachon</th><th>Mijoz</th><th>Turi</th><th>Nima qilish kerak</th><th>Mas'ul</th><th></th></tr></thead><tbody>` + list.map(x => {
    const c = crClient(x.client);
    let act = "";
    if (can && x.st === "plan") act = EL.doneId === x.id ? `<input id="elRes" placeholder="Natija (ixtiyoriy)" style="width:160px"><button data-eldone2="${esc(x.id)}">Saqlash</button>` : `<button data-eldone="${esc(x.id)}">Bajarildi</button><button data-elcancel="${esc(x.id)}">${EL.pendCancel === x.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>`;
    return `<tr><td>${esc(x.date)}${x.time ? " " + esc(x.time) : ""}</td><td><b>${esc(x.client)}</b>${c && c.phone ? `<div class="tmeta mono">${esc(c.phone)}</div>` : ""}</td><td>${esc(x.type)}</td><td>${esc(x.text)}${x.result ? `<div class="tmeta">Natija: ${esc(x.result)}</div>` : ""}</td><td>${esc(x.who) || "—"}</td><td class="krAct">${act}</td></tr>`;
  }).join("") + `</tbody></table>`;
}
$("elForm").addEventListener("submit", e => e.preventDefault());
$("elSave").addEventListener("click", elSave);
$("elFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { EL.filter = b.dataset.f; elRender(); } });
$("elQ").addEventListener("input", e => { EL.q = e.target.value; elRender(); });
$("elAuto").addEventListener("click", async e => {
  const b = e.target.closest("[data-elauto]"); if (!b || EL.busy || !CR.mcp) return;
  const a = (EL.auto || [])[Number(b.dataset.elauto)]; if (!a) return;
  EL.busy = true; b.disabled = true;
  try { await elReload(); if (!EL.list.some(x => x.key === a.key && x.st !== "cancel")) { const n = await elAdd(a); crSay(EL, elRender, `Eslatma №${n} qo'shildi.`); } try { await elReload(); } catch (e2) {} }
  catch (err) { crSay(EL, elRender, krCodeMsg(err && err.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."); }
  EL.busy = false;
});
$("elList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.eldone) { EL.doneId = b.dataset.eldone; elRender(); const i = $("elRes"); if (i) i.focus(); }
  else if (b.dataset.eldone2) elSet(b.dataset.eldone2, "done", ($("elRes") || {}).value || "");
  else if (b.dataset.elcancel) { if (EL.pendCancel === b.dataset.elcancel) elSet(b.dataset.elcancel, "cancel"); else { EL.pendCancel = b.dataset.elcancel; elRender(); } }
});

// ======================= MIJOZ KARTASI =======================
crPanel("crdApp", `<div class="panel" id="crdBody"></div>`, "cliApp");
function crCardOpen(id) { CR.card = id; document.body.classList.add("crd-on"); crCardRender(); window.scrollTo(0, 0); }
function crCardClose() { CR.card = ""; document.body.classList.remove("crd-on"); }
function crCardRender() {
  if (!CR.card) return;
  const c = crClients().find(x => x.id === CR.card); if (!c) { crCardClose(); return; }
  const k = crK(c.name);
  const sales = SL.list.filter(s => crK(s.client) === k), act = sales.filter(s => !s.cancelled);
  const bought = {}; act.forEach(s => { bought[s.currency] = (bought[s.currency] || 0) + s.total; });
  const bal = ptBal("cliApp", c), last = act.map(s => s.date).sort().pop() || "";
  const debts = act.filter(s => qtDebtLeft(s) > 0.005);
  const rets = (typeof QT !== "undefined" ? QT.list : []).filter(r => !r.cancelled && crK(r.client) === k);
  const pays = (typeof PAY !== "undefined" ? PAY.list : []).filter(p => !p.cancelled && crK(p.client) === k);
  const cons = (typeof BOL !== "undefined" ? BOL.list : []).filter(b => !b.cancelled && crK(b.client) === k);
  const discs = (typeof CH !== "undefined" ? CH.list : []).filter(d => crK(d.client) === k && chPhase(d) === "now");
  const waits = (typeof KG !== "undefined" ? KG.list : []).filter(w => crK(w.client) === k && (w.st === "wait" || w.st === "told"));
  const ords = OR.list.filter(o => crK(o.client) === k && orKind(o) === "open");
  const rems = EL.list.filter(x => crK(x.client) === k && x.st === "plan");
  const sec = (title, inner) => inner ? `<div class="crdsec"><h4>${title}</h4>${inner}</div>` : "";
  const tbl = (head, rows) => rows.length ? `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>` : "";
  $("crdBody").innerHTML = `<div class="crdhead"><div><h3>${esc(c.name)}</h3><div class="tmeta">${esc(c.type || "")} · ${esc(c.cat || "Oddiy")}${c.phone ? ` · <span class="mono">${esc(c.phone)}</span>` : ""}${c.phone2 ? `, <span class="mono">${esc(c.phone2)}</span>` : ""}${c.birth ? ` · tug'ilgan: ${esc(c.birth)}` : ""}${c.addr ? ` · ${esc(c.addr)}` : ""}</div>${c.note ? `<div class="tmeta">Izoh: ${esc(c.note)}</div>` : ""}</div>`
    + `<div class="crdacts"><button class="pri" data-cra="sale">Yangi sotuv</button>${debts.length ? `<button data-cra="pay">To'lov qabul qilish</button>` : ""}<button data-cra="order">Buyurtma</button><button data-cra="rem">Eslatma</button><button data-cra="edit">Tahrirlash</button><button data-cra="close">Yopish ✕</button></div></div>`
    + `<div class="crdgrid"><div class="crdbox"><div class="l">Balans</div><div class="v">${ptBalFmt(bal, "cliApp")}</div></div><div class="crdbox"><div class="l">Jami xaridlar</div><div class="v">${crMoneyMap(bought)}</div></div><div class="crdbox"><div class="l">Xaridlar soni</div><div class="v">${act.length}</div></div><div class="crdbox"><div class="l">Oxirgi xarid</div><div class="v">${esc(last.slice(0, 10)) || "—"}</div></div></div>`
    + sec("Ochiq qarzlar", tbl(["Sotuv", "Sana", "Summa", "Qolgan qarz"], debts.map(s => `<tr><td>№${s.number}</td><td>${esc(s.date.slice(0, 10))}</td><td class="num">${krMoney(s.total, s.currency)}</td><td class="num balpos">${krMoney(qtDebtLeft(s), s.currency)}</td></tr>`)))
    + sec("Bo'lib to'lash", tbl(["Shartnoma", "Summa", "Qoldiq", "Keyingi to'lov", "Holat"], cons.map(b => { const st = blStatus(b); return `<tr><td>№${b.number} (sotuv №${b.saleNo})</td><td class="num">${krMoney(b.amount, b.currency)}</td><td class="num">${krMoney(st.left, b.currency)}</td><td>${st.next ? `${esc(st.next.date)} · ${krMoney(st.next.due, b.currency)}` : "—"}</td><td>${st.closed ? "Yopilgan" : st.lateN ? `<span class="late">Kechikkan: ${krMoney(st.lateSum, b.currency)}</span>` : "Faol"}</td></tr>`; })))
    + sec("Ochiq buyurtmalar", tbl(["№", "Tovarlar", "Summa", "Muddat"], ords.map(o => `<tr><td>${o.number}</td><td>${o.items.map(it => esc(it.name)).join(", ")}</td><td class="num">${krMoney(o.total, o.cur)}</td><td>${esc(o.due) || "—"}</td></tr>`)))
    + sec("Rejadagi eslatmalar", tbl(["Qachon", "Turi", "Nima qilish kerak"], rems.map(x => `<tr><td>${esc(x.date)} ${esc(x.time)}</td><td>${esc(x.type)}</td><td>${esc(x.text)}</td></tr>`)))
    + sec("Kutayotgan tovarlari", tbl(["Tovar", "Sana", "Holat"], waits.map(w => `<tr><td>${esc(w.prod)}</td><td>${esc(w.date.slice(0, 10))}</td><td>${w.st === "told" ? "Xabar berildi" : "Kutilmoqda"}</td></tr>`)))
    + sec("Shaxsiy chegirmalari", discs.length ? discs.map(d => `<div>${esc(d.name)} — <b>${chValTxt(d)}</b>${d.to ? ` (${esc(d.to)} gacha)` : ""}</div>`).join("") : "")
    + sec("Xaridlar tarixi", tbl(["Sotuv", "Sana", "Tovarlar", "Summa", "Holat"], sales.slice(0, 50).map(s => `<tr class="${s.cancelled ? "slx" : ""}"><td>№${s.number}</td><td>${esc(s.date.slice(0, 10))}</td><td class="small">${s.items.map(it => esc(it.name) + (it.qty > 1 ? ` × ${it.qty}` : "")).join("<br>")}</td><td class="num">${krMoney(s.total, s.currency)}</td><td>${s.cancelled ? "Bekor qilingan" : "Yakunlangan"}</td></tr>`)) || `<div class="empty-box">Hali xarid yo'q</div>`)
    + sec("To'lovlari", tbl(["Sana", "Summa", "Turi"], pays.slice(0, 30).map(p => `<tr><td>${esc(p.date.slice(0, 10))}</td><td class="num">${krMoney(p.total, p.currency)}</td><td>${esc(p.payType)}</td></tr>`)))
    + sec("Qaytarishlari", tbl(["Sana", "Sotuv", "Summa", "Sabab"], rets.map(r => `<tr><td>${esc(r.date.slice(0, 10))}</td><td>№${r.saleNo}</td><td class="num">${krMoney(r.total, r.currency)}</td><td>${esc(r.reason)}</td></tr>`)));
}
$("crdBody").addEventListener("click", e => {
  const b = e.target.closest("[data-cra]"); if (!b) return;
  const c = crClients().find(x => x.id === CR.card); if (!c) return;
  const a = b.dataset.cra;
  if (a === "close") crCardClose();
  else if (a === "edit") { crCardClose(); PARTY.cliApp.load(c.id); }
  else if (a === "sale") { crGo("sotuv", "Sotuvlar"); slReset(); slClientsFill(); openForm("sotuvApp", true); $("slClient").value = c.name; $("slClient").dispatchEvent(new Event("input")); }
  else if (a === "pay") { crGo("sotuv", "Mijozlar to'lovlari"); pyReset(); openForm("payApp", true); $("pyClient").value = c.name; $("pyClient").dispatchEvent(new Event("change")); }
  else if (a === "order") { crGo("crm", "Buyurtmalar"); orReset(); openForm("orApp", true); $("orClient").value = c.name; $("orPhone").value = c.phone || ""; }
  else if (a === "rem") { crGo("crm", "Eslatmalar"); elReset(c.name); openForm("elApp", true); }
});
// Mijozlar ro'yxatiga «Karta» tugmasi
(function crHookList() {
  const P = PARTY.cliApp; if (!P) return;
  const orig = P.render;
  P.render = function () { orig(); document.querySelectorAll("#cliApp_list button[data-ptedit]").forEach(b => { if (!b.previousElementSibling || !b.previousElementSibling.dataset.crcard) { const x = document.createElement("button"); x.type = "button"; x.dataset.crcard = b.dataset.ptedit; x.textContent = "Karta"; b.parentNode.insertBefore(x, b); } }); mkatSync(); crCardRender(); };
  $("cliApp_list").addEventListener("click", e => { const b = e.target.closest("button[data-crcard]"); if (b) crCardOpen(b.dataset.crcard); });
  P.render();
})();

// ======================= HISOBOTLAR → MIJOZLAR ABC/XYZ =======================
crPanel("abcApp", `<div class="panel"><div class="thead"><h3>Mijozlar tahlili (ABC / XYZ)</h3><div class="hbtns"><div class="filters" id="abcPer"></div><select id="abcCur"><option value="UZS">so'm</option><option value="USD">$</option></select></div></div>
  <div class="tmeta">Tsunami sotuvlari bo'yicha (qaytarishlar ayirilgan). <b>A</b> — tushumning 80% ini beruvchi mijozlar, <b>B</b> — keyingi 15%, <b>C</b> — qolgan 5%. <b>X</b> — har oy barqaror xarid qiladi, <b>Y</b> — o'zgaruvchan, <b>Z</b> — kamdan-kam.</div>
  <div class="status" id="abcStatus"></div><div id="abcList"></div></div>`);
const ABC = { months:6 };
function abcRender() {
  if (!$("abcList")) return;
  $("abcPer").innerHTML = [[3, "3 oy"], [6, "6 oy"], [12, "12 oy"]].map(([m, l]) => `<button data-m="${m}" class="${ABC.months === m ? "on" : ""}">${l}</button>`).join("");
  const cur = $("abcCur").value, now = new Date(), from = new Date(now.getFullYear(), now.getMonth() - ABC.months + 1, 1).toLocaleDateString("en-CA");
  const months = []; for (let i = ABC.months - 1; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString("en-CA").slice(0, 7));
  const m = {};
  SL.list.filter(s => !s.cancelled && s.currency === cur && s.date.slice(0, 10) >= from && crK(s.client) !== crK(SL_WALKIN)).forEach(s => {
    const k = crK(s.client), o = m[k] || (m[k] = { name:s.client, sum:0, n:0, per:{}, last:"" });
    const back = (typeof QT !== "undefined" ? QT.list : []).filter(r => !r.cancelled && r.saleId === s.id).reduce((a, r) => a + r.total, 0);
    const v = s.total - back; o.sum += v; o.n++; o.per[s.date.slice(0, 7)] = (o.per[s.date.slice(0, 7)] || 0) + v; if (s.date > o.last) o.last = s.date;
  });
  const rows = Object.values(m).filter(o => o.sum > 0).sort((a, b) => b.sum - a.sum), total = rows.reduce((a, o) => a + o.sum, 0);
  let acc = 0;
  rows.forEach(o => {
    acc += o.sum; const share = total ? acc / total : 1; o.abc = share <= 0.8 || o === rows[0] ? "A" : share <= 0.95 ? "B" : "C";
    const vals = months.map(x => o.per[x] || 0), mean = vals.reduce((a, v) => a + v, 0) / vals.length, sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) * (v - mean), 0) / vals.length), cv = mean ? sd / mean : 9;
    o.xyz = cv <= 0.5 ? "X" : cv <= 1 ? "Y" : "Z"; o.active = vals.filter(v => v > 0).length;
  });
  const cnt = g => rows.filter(o => o.abc === g).length;
  $("abcStatus").textContent = SL.state !== "ok" ? crLine(SL, "Sotuvlar") : rows.length ? `${rows.length} ta mijoz · tushum ${krMoney(total, cur)} · A: ${cnt("A")}, B: ${cnt("B")}, C: ${cnt("C")}` : "";
  if (!rows.length) { $("abcList").innerHTML = `<div class="empty-box">${SL.state === "ok" ? "Tanlangan davrda bu valyutada mijozlarga (umumiy mijozdan tashqari) sotuv yo'q" : ""}</div>`; return; }
  $("abcList").innerHTML = `<table><thead><tr><th>#</th><th>Mijoz</th><th>Tushum</th><th>Ulush</th><th>Xaridlar</th><th>Faol oylar</th><th>Oxirgi xarid</th><th>Guruh</th></tr></thead><tbody>` + rows.map((o, i) => `<tr><td>${i + 1}</td><td><b>${esc(o.name)}</b></td><td class="num">${krMoney(o.sum, cur)}</td><td class="num">${total ? Math.round(o.sum / total * 1000) / 10 : 0}%</td><td class="num">${o.n}</td><td class="num">${o.active} / ${months.length}</td><td>${esc(o.last.slice(0, 10))}</td><td><span class="abc-${o.abc}">${o.abc}</span>${o.xyz}</td></tr>`).join("") + `</tbody></table>`;
}
$("abcPer").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (b) { ABC.months = Number(b.dataset.m); abcRender(); } });
$("abcCur").addEventListener("change", abcRender);

// ======================= Yo'naltirish va yuklash =======================
const CR_APPS = { crm:{ "Buyurtmalar":["orApp", orRender], "Eslatmalar":["elApp", elRender], "Kategoriyalar":["mkatApp", mkatRender] }, hisobotlar:{ "Mijozlar tahlili (ABC XYZ)":["abcApp", abcRender] } };
function crRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "";
  Object.entries(CR_APPS).forEach(([s, apps]) => Object.entries(apps).forEach(([name, [app, render]]) => { $(app).classList.remove("fopen"); const on = s === sec && name === n; document.body.classList.toggle(app + "-on", on); if (on) render(); }));
  if (!(sec === "crm" && n === "Mijozlar")) crCardClose();
}
const crOrigRenderSub = renderSub;
renderSub = function (i) { crOrigRenderSub(i); crRoute(); };
document.addEventListener("click", e => {
  const o = e.target.closest("[data-open]"); if (!o) return;
  if (o.dataset.open === "orApp") orReset(); else if (o.dataset.open === "elApp") elReset(); else if (o.dataset.open === "cliApp") crCardClose();
});
const crOrigSlApply = slApply;
slApply = function (vals) { crOrigSlApply(vals); if (document.body.classList.contains("orApp-on")) orRender(); if (document.body.classList.contains("abcApp-on")) abcRender(); crCardRender(); };
setInterval(() => { if (document.body.classList.contains("elApp-on")) elRender(); crCardRender(); }, 60000);
orReset(); elReset();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { MKAT.state = OR.state = EL.state = "off"; mkatRender(); orRender(); elRender(); return; }
  CR.mcp = mcp;
  [[MKAT, MKAT_RANGE, mkatApply, mkatRender, 300000], [OR, OR_RANGE, orApply, orRender, 60000], [EL, EL_RANGE, elApply, elRender, 60000]].forEach(([o, range, apply, render, every]) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        if (o.state !== "ok" || !o.list.length) o.state = (ev.error && ev.error.code) || "upstream_error";
        render();
      }, { refetchInterval:every });
    } catch (e) {}
  });
})();
crRoute();
