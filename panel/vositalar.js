// ===== Tsunami: Vositalar (narxlar ro'yxati, eksport, zaxira nusxa, tekshiruvlar) va Sozlamalar (asosiy sozlamalar, modullar) =====
const VS = { mcp:null, admin:false, me:"", busy:false };
const GSET_RANGE = "'Umumiy sozlamalar'!A1:E2000";
const GSET = { list:[], v:{}, state:"loading" };
const GSET_KEYS = [
  { k:"shop", label:"Do'kon nomi", ph:"Masalan: 5Tech", def:"5Tech" },
  { k:"phone", label:"Do'kon telefoni", ph:"+998 …" },
  { k:"addr", label:"Manzil", ph:"Masalan: Urganch, …", wide:true },
  { k:"tg", label:"Telegram kanal", ph:"t.me/…" },
  { k:"rate", label:"Dollar kursi (1 $ = so'm)", ph:"12000", num:true, hint:"Sotuv, kirim va narx o'rnatishda kurs maydoni bo'sh bo'lsa, shu kurs qo'yiladi." },
  { k:"cur", label:"Sotuvda asosiy valyuta", sel:[["UZS", "so'm"], ["USD", "$ (dollar)"]], def:"UZS" }
];
// O'chirib bo'lmaydigan bo'limlar: Hisobotlar, Sozlamalar
const VS_MODS = [["sotuv", "Sotuv"], ["marketing", "Marketing"], ["crm", "CRM"], ["vazifalar", "Vazifalar"], ["tarqatish", "Tarqatish"], ["logistika", "Logistika"], ["taminot", "Ta'minot"], ["ombor", "Ombor"], ["moliya", "Moliya"], ["kadrlar", "Kadrlar"], ["ishchilar", "Ishchilar"], ["integratsiya", "Integratsiya"], ["ishlab-chiqarish", "Ishlab chiqarish"], ["malumotnoma", "Ma'lumotnoma"], ["vositalar", "Vositalar"]];
const vsK = s => String(s || "").trim().toLowerCase();
function vsToday() { return new Date().toLocaleDateString("en-CA"); }
function vsPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
(function vsCss() {
  const ids = ["vsPrApp", "vsExApp", "vsBkApp", "vsChkApp", "gsMainApp", "gsModApp"];
  const st = document.createElement("style");
  st.textContent = ids.map(i => `#${i}{display:none}.${i}-on #${i}{display:block}.${i}-on .gen,.${i}-on #kpis{display:none}`).join("")
    + ".vsrow{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:0 0 12px}.vsrow label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#475569}.vsrow select,.vsrow input{width:auto!important;min-width:150px}"
    + ".vschk{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:10px 0}.vschk h4{margin:0;display:flex;gap:8px;align-items:center;font-size:15px}.vschk .lv{font-size:12px;padding:2px 8px;border-radius:99px;font-weight:600}.lv.ok{background:#dcfce7;color:#15803d}.lv.warn{background:#fef3c7;color:#92400e}.lv.bad{background:#fee2e2;color:#b91c1c}.vschk ul{margin:8px 0 0;padding-left:18px;font-size:13px;max-height:220px;overflow:auto}.vschk .fix{font-size:12px;color:#64748b;margin-top:6px}"
    + ".vsmods{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}.vsmod{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:10px 12px}.vsmod.off{background:#f8fafc;color:#94a3b8}"
    + "@media print{nav,.subs,#vsPrApp .vsrow,#vsPrApp .kbtns,#vsPrApp .status,h2,.desc{display:none!important}main{padding:0!important}#vsPrApp .panel{border:0;box-shadow:none}}";
  document.head.appendChild(st);
})();
async function vsSave(name, text, mime) {
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) { dl = null; }
  if (!dl) throw { code:"nodl" };
  await dl.save({ filename:name, data:new Blob([text], { type:mime }) });
}
function vsErr(e) { const c = e && e.code; return c === "nodl" ? "Bu ko'rinishda fayl yuklab bo'lmaydi: sahifani claude.ai'da oching." : c === "declined" ? "Yuklab olish bekor qilindi." : c === "rate_limited" ? "Oldingi so'rov hali ochiq, birozdan keyin qayta bosing." : krCodeMsg(c) || "Faylni tayyorlab bo'lmadi, qayta urinib ko'ring."; }
// Excel (ru/uz) uchun: «;» ajratgich, UTF-8 BOM
function vsCsv(head, rows) { const q = v => { const s = v == null ? "" : String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; return "﻿" + [head].concat(rows).map(r => r.map(q).join(";")).join("\r\n"); }
const vsNum = (v, cur) => v == null || v === "" ? "" : String(cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v)).replace(".", ",");
function vsMsg(id, m, bad) { const x = $(id); if (x) { x.textContent = m || ""; x.classList.toggle("err", !!bad); } }
function vsRate() { return Number(GSET.v.rate) || 0; }

// ======================= NARXLAR RO'YXATI =======================
const PRL = { cat:"", stock:"1", cur:"set", q:"" };
vsPanel("vsPrApp", `<div class="panel"><div class="thead"><h3>Narxlar ro'yxati</h3></div>
  <div class="vsrow"><label>Kategoriya<select id="prCat"></select></label><label>Qaysi tovarlar<select id="prStock"><option value="1">Faqat omborda borlari</option><option value="">Hammasi</option></select></label>
  <label>Narxni ko'rsatish<select id="prCur"><option value="set">Belgilangan valyutada</option><option value="UZS">Hammasini so'mda</option><option value="USD">Hammasini dollarda</option></select></label><label>Qidirish<input id="prQ" placeholder="nomi"></label></div>
  <div class="kbtns" style="justify-content:flex-start"><button type="button" class="pri" id="prCsv">Excel (CSV) yuklab olish</button><button type="button" class="sec" id="prPrint">Chop etish</button></div>
  <div class="status" id="prMsg"></div><div id="prList"></div></div>`);
function prRows() {
  const st = typeof nrStock === "function" ? nrStock() : {}, sub = PRL.cat && typeof ktSubtree === "function" ? ktSubtree(PRL.cat) : null, q = vsK(PRL.q), rate = vsRate();
  return TV.list.filter(t => (!sub || sub.has(t.catId)) && (!q || vsK(t.name).indexOf(q) >= 0)).map(t => {
    const r = typeof nrRule === "function" ? nrRule(t.name) : null, s = st[vsK(t.name)];
    if (!r || r.price == null) return null;
    if (PRL.stock && !(s && s.qty > 0)) return null;
    let price = r.price, cur = r.cur;
    if (PRL.cur !== "set" && PRL.cur !== cur) { if (!rate) return { t, s, price:null, cur:PRL.cur, norate:true }; price = cur === "USD" ? price * rate : price / rate; cur = PRL.cur; }
    return { t, s, price, cur, cat:(t.catId && typeof ktPath === "function" && ktPath(t.catId)) || t.cat || "" };
  }).filter(Boolean).sort((a, b) => (a.cat || "").localeCompare(b.cat || "") || a.t.name.localeCompare(b.t.name));
}
function prRender() {
  if (!$("prList")) return;
  if (typeof ktTree === "function") { const v = PRL.cat; $("prCat").innerHTML = `<option value="">Hammasi</option>` + ktTree().map(({ c, d }) => `<option value="${esc(c.id)}"${c.id === v ? " selected" : ""}>${"— ".repeat(d)}${esc(c.name)}</option>`).join(""); }
  const rows = prRows(), nr = rows.some(x => x.norate);
  vsMsg("prMsg", nr ? "Valyutani o'tkazish uchun Sozlamalar → Asosiy sozlamalar'da dollar kursini kiriting." : rows.length ? `${rows.length} ta tovar · ${GSET.v.shop || "5Tech"} · ${vsToday()}` : "", nr);
  let lastCat = null;
  $("prList").innerHTML = rows.length ? `<table><thead><tr><th>Tovar</th><th class="num">Omborda</th><th class="num">Narx</th></tr></thead><tbody>` + rows.map(x => {
    const h = x.cat !== lastCat ? `<tr><td colspan="3" style="background:#f1f5f9;font-weight:600">${esc(x.cat || "Kategoriyasiz")}</td></tr>` : ""; lastCat = x.cat;
    return h + `<tr><td>${esc(x.t.name)}</td><td class="num">${x.s ? x.s.qty : 0}</td><td class="num"><b>${x.price == null ? "—" : krMoney(x.price, x.cur)}</b></td></tr>`;
  }).join("") + `</tbody></table>` : `<div class="empty-box">Narxi belgilangan tovar topilmadi. Narxlar Ma'lumotnoma → Narx o'rnatish'da qo'yiladi.</div>`;
}
["prCat", "prStock", "prCur"].forEach(id => $(id).addEventListener("change", () => { PRL.cat = $("prCat").value; PRL.stock = $("prStock").value; PRL.cur = $("prCur").value; prRender(); }));
$("prQ").addEventListener("input", () => { PRL.q = $("prQ").value; clearTimeout(PRL.t); PRL.t = setTimeout(prRender, 250); });
$("prPrint").addEventListener("click", () => { try { window.print(); } catch (e) {} });
$("prCsv").addEventListener("click", async () => {
  const rows = prRows(); if (!rows.length) return vsMsg("prMsg", "Ro'yxat bo'sh.", true);
  try { await vsSave(`narxlar_${vsToday()}.csv`, vsCsv(["Kategoriya", "Tovar", "Shtrix-kod", "Omborda", "Narx", "Valyuta"], rows.map(x => [x.cat, x.t.name, x.t.barcode, x.s ? x.s.qty : 0, vsNum(x.price, x.cur), x.cur === "USD" ? "$" : "so'm"])), "text/csv"); vsMsg("prMsg", "Fayl tayyor."); }
  catch (e) { vsMsg("prMsg", vsErr(e), true); }
});

// ======================= EKSPORT =======================
const EX_SETS = {
  sales:{ n:"Sotuvlar (har bir tovar alohida qatorda)", dated:true, build:(f, t) => {
    const out = []; SL.list.filter(s => !s.cancelled && (!f || s.date >= f) && (!t || s.date <= t)).forEach(s => s.items.forEach(it => out.push([s.number, s.date, s.client, s.seller, it.name, it.qty, vsNum(it.price, s.currency), vsNum(it.qty * it.price, s.currency), s.currency, (it.imeis || []).join(" "), s.payType, vsNum(s.total, s.currency), vsNum(s.paid, s.currency), vsNum(s.debt, s.currency)])));
    return [["Sotuv №", "Sana", "Mijoz", "Sotuvchi", "Tovar", "Soni", "Narx", "Summa", "Valyuta", "IMEI", "To'lov turi", "Chek jami", "To'langan", "Qarz"], out]; } },
  stockImei:{ n:"Markirovkali qoldiq (IMEI bo'yicha)", build:() => { const L = omLedger(); return [["Tovar", "IMEI", "Holat", "Tashkilot", "Ombor", "Tannarx", "Valyuta", "Kirim sanasi", "Yetkazib beruvchi"], L.units.map(u => [u.name, u.imei, u.st === "brak" ? "Brak" : "Omborda", u.org, u.wh, vsNum(u.cost, u.cur), u.cur, u.kdate, u.sup])]; } },
  stockQty:{ n:"Soni bo'yicha qoldiq (partiyalar)", build:() => { const L = omLedger(); return [["Tovar", "Soni", "Tannarx (1 dona)", "Jami tannarx", "Valyuta", "Tashkilot", "Ombor", "Kirim sanasi", "Yetkazib beruvchi"], L.lots.map(l => [l.name, l.qty, vsNum(l.cost, l.cur), vsNum(l.cost * l.qty, l.cur), l.cur, l.org, l.wh, l.kdate, l.sup])]; } },
  products:{ n:"Tovarlar ro'yxati", build:() => [["Tovar", "Kategoriya", "Shtrix-kod", "Artikul", "Markirovka", "Sotuv narxi", "Min", "Max", "Valyuta"], TV.list.map(t => { const r = typeof nrRule === "function" ? nrRule(t.name) : null; return [t.name, (t.catId && typeof ktPath === "function" && ktPath(t.catId)) || t.cat, t.barcode, t.sku, t.marked ? "Ha" : "Yo'q", r ? vsNum(r.price, r.cur) : "", r ? vsNum(r.min, r.cur) : "", r ? vsNum(r.max, r.cur) : "", r ? r.cur : ""]; })] },
  clients:{ n:"Mijozlar", build:() => [["Nomi", "Turi", "Telefon", "Qo'shimcha telefon", "Kategoriya", "Tug'ilgan sana", "Manzil", "Izoh"], (PARTY.cliApp ? PARTY.cliApp.list : []).map(c => [c.name, c.type, c.phone, c.phone2, c.cat, c.birth, c.addr, c.note])] },
  sups:{ n:"Yetkazib beruvchilar", build:() => [["Nomi", "Turi", "Telefon", "Mas'ul shaxs", "Valyuta", "Manzil", "Izoh"], (PARTY.supApp ? PARTY.supApp.list : []).map(c => [c.name, c.type, c.phone, c.contact, c.cur, c.addr, c.note])] },
  cash:{ n:"Kassa harakatlari", dated:true, build:(f, t) => [["Sana", "Kassa", "Turi", "Kim", "Summa", "Valyuta", "Hujjat"], (typeof mlLedger === "function" ? mlLedger().rows : []).filter(r => (!f || r.date >= f) && (!t || r.date <= t)).sort((a, b) => String(a.ts).localeCompare(String(b.ts))).map(r => [r.date, r.acc, r.kind, r.who, vsNum(r.amt, r.cur), r.cur, r.src || r.note || ""])] }
};
vsPanel("vsExApp", `<div class="panel"><div class="thead"><h3>Eksport (Excel uchun)</h3></div><div class="tmeta">Tanlangan ma'lumot CSV faylga yuklanadi — Excel yoki Google Sheets'da to'g'ridan-to'g'ri ochiladi.</div>
  <div class="vsrow" style="margin-top:12px"><label>Nimani<select id="exSet">${Object.entries(EX_SETS).map(([k, x]) => `<option value="${k}">${x.n}</option>`).join("")}</select></label><label id="exFL">Dan<input type="date" id="exFrom"></label><label id="exTL">Gacha<input type="date" id="exTo"></label></div>
  <div class="kbtns" style="justify-content:flex-start"><button type="button" class="pri" id="exGo">Yuklab olish</button></div><div class="status" id="exMsg"></div></div>`);
function exSync() { const d = EX_SETS[$("exSet").value].dated; $("exFL").hidden = !d; $("exTL").hidden = !d; }
$("exSet").addEventListener("change", exSync);
$("exGo").addEventListener("click", async () => {
  const k = $("exSet").value, x = EX_SETS[k];
  let data; try { data = x.build($("exFrom").value, $("exTo").value); } catch (e) { return vsMsg("exMsg", "Ma'lumot hali yuklanmagan, birozdan keyin qayta bosing.", true); }
  if (!data[1].length) return vsMsg("exMsg", "Tanlangan davrda ma'lumot yo'q.", true);
  try { await vsSave(`${k}_${vsToday()}.csv`, vsCsv(data[0], data[1]), "text/csv"); vsMsg("exMsg", `${data[1].length} qator yuklab olindi.`); } catch (e) { vsMsg("exMsg", vsErr(e), true); }
});

// ======================= ZAXIRA NUSXA =======================
const BK_SHEETS = ["Sotuvlar", "Sotuv tovarlari", "Qaytarishlar", "Qaytarish tovarlari", "Mijoz to‘lovlari", "Bo‘lib to‘lash", "Chegirmalar", "Aksiyalar", "Kutilayotgan tovarlar", "Telegram postlar", "Mijozlar", "Mijoz kategoriyalari", "Buyurtmalar", "Eslatmalar", "Tashrif rejalari", "Tashriflar", "Tarqatish sozlamalari", "Kuryerlar", "Yetkazish tariflari", "Yetkazib berishlar", "Zakup sorovlari", "Zakup buyurtmalari", "Kirimlar", "Kirim tovarlari", "Yetkazib beruvchilar", "Yetkazib beruvchiga qaytarish", "Yetkazib beruvchilarga tolovlar", "Taminot sozlamalari", "Tovarlar", "Kategoriyalar", "Ombor harakatlari", "Skladlar", "Ombor sozlamalari", "Kassa operatsiyalari", "Kassa sozlamalari", "Xodimlar", "Ish haqi", "Kadrlar sozlamalari", "Qaytarish sabablari", "Narxlar", "Narx sozlamalari", "Xabarlar", "Umumiy sozlamalar"];
vsPanel("vsBkApp", `<div class="panel"><div class="thead"><h3>Zaxira nusxa</h3></div>
  <div class="tmeta">Tsunami bazasidagi barcha jadvallar bitta faylga yuklab olinadi (tovar rasmlarisiz). Haftada bir marta olib, kompyuterda saqlab qo'yish tavsiya etiladi. Bazaning o'zi Google Drive'da — u yerda ham «Fayl → Versiyalar tarixi» orqali eski holatni tiklash mumkin.</div>
  <div class="kbtns" style="justify-content:flex-start;margin-top:12px"><button type="button" class="pri" id="bkGo">Zaxira nusxani yuklab olish</button></div><div class="status" id="bkMsg"></div></div>`);
$("bkGo").addEventListener("click", async () => {
  if (VS.busy) return; if (!VS.mcp) return vsMsg("bkMsg", krDbLine() || "Sahifani claude.ai'da oching.", true);
  VS.busy = true; $("bkGo").disabled = true;
  const data = { app:"Tsunami", base:BASE_ID, at:new Date().toISOString(), sheets:{} }, miss = [];
  try {
    for (let i = 0; i < BK_SHEETS.length; i++) {
      const n = BK_SHEETS[i]; vsMsg("bkMsg", `O'qilmoqda: ${n} (${i + 1}/${BK_SHEETS.length})…`);
      try { const r = await VS.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:`'${n}'!A1:Z30000` }, { cache:false }); data.sheets[n] = krVals({ result:r }) || []; } catch (e) { miss.push(n); }
    }
    const rows = Object.values(data.sheets).reduce((a, v) => a + Math.max(0, v.length - 1), 0);
    await vsSave(`tsunami_zaxira_${vsToday()}.json`, JSON.stringify(data), "application/json");
    vsMsg("bkMsg", `Zaxira nusxa tayyor: ${Object.keys(data.sheets).length} ta jadval, ${rows} ta yozuv.${miss.length ? ` O'qilmadi: ${miss.join(", ")}.` : ""}`);
  } catch (e) { vsMsg("bkMsg", vsErr(e), true); }
  VS.busy = false; $("bkGo").disabled = false;
});

// ======================= TEKSHIRUVLAR =======================
vsPanel("vsChkApp", `<div class="panel"><div class="thead"><h3>Ma'lumotlarni tekshirish</h3><button type="button" class="pri" id="chkGo">Qayta tekshirish</button></div>
  <div class="tmeta">Qoldiq, kassa, narx va ro'yxatlardagi xatolarni topadi. Har bir topilmada qayerda tuzatilishi yozilgan.</div><div id="chkList"></div></div>`);
function vsChecks() {
  const out = [], add = (title, level, items, fix) => out.push({ title, level:items.length ? level : "ok", items, fix });
  const tvNames = new Set(TV.list.map(t => vsK(t.name)));
  let L = null; try { L = omLedger(); } catch (e) {}
  if (L) add("Manfiy qoldiq (omborda yo'q tovar sotilgan)", "bad", Object.entries(L.neg || {}).map(([n, q]) => `${n}: ${q} dona yetishmaydi`), "Kirim yoki inventarizatsiyani tekshiring (Ta'minot → Tovar kirimi, Ombor → Inventarizatsiya).");
  const seen = {}; SL.list.filter(s => !s.cancelled).forEach(s => s.items.forEach(it => (it.imeis || []).forEach(m => { (seen[m] = seen[m] || []).push(s.number); })));
  const qtBackSet = new Set(); (typeof QT !== "undefined" ? QT.list : []).filter(r => !r.cancelled).forEach(r => (r.items || []).forEach(it => (it.imeis || []).forEach(m => qtBackSet.add(m))));
  add("Bitta IMEI ikki marta sotilgan", "bad", Object.entries(seen).filter(([m, a]) => a.length > 1 && !qtBackSet.has(m)).map(([m, a]) => `${m} — sotuvlar №${a.join(", №")}`), "Sotuv → Sotuvlar'da noto'g'ri sotuvni bekor qiling.");
  const unk = new Set(); SL.list.filter(s => !s.cancelled).forEach(s => s.items.forEach(it => { if (!tvNames.has(vsK(it.name))) unk.add(it.name); }));
  if (L) L.units.concat(L.lots).forEach(x => { if (!tvNames.has(vsK(x.name))) unk.add(x.name); });
  add("Tovarlar ro'yxatida yo'q tovar nomlari", "warn", [...unk].sort(), "Ombor → Tovarlar'da shu nom bilan tovar yarating (hisobotlar va narx nazorati uchun kerak).");
  const byName = {}, byBc = {}; TV.list.forEach(t => { (byName[vsK(t.name)] = byName[vsK(t.name)] || []).push(t.name); if (String(t.barcode || "").trim()) (byBc[t.barcode.trim()] = byBc[t.barcode.trim()] || []).push(t.name); });
  add("Takroriy tovar nomlari", "warn", Object.values(byName).filter(a => a.length > 1).map(a => `${a[0]} — ${a.length} marta`), "Ombor → Tovarlar'da ortiqchasini o'chiring.");
  add("Bir xil shtrix-kod bir nechta tovarda", "warn", Object.entries(byBc).filter(([, a]) => a.length > 1).map(([b, a]) => `${b}: ${a.join(", ")}`), "Ombor → Tovarlar'da shtrix-kodni to'g'rilang — aks holda skanerda noto'g'ri tovar chiqadi.");
  add("Kategoriyasiz tovarlar", "warn", TV.list.filter(t => !t.catId && !t.cat).map(t => t.name), "Ombor → Tovarlar'da kategoriya belgilang (yoki Integratsiya → Bito'dan ko'chirish, 2-qadam).");
  if (typeof nrRule === "function") {
    const st = typeof nrStock === "function" ? nrStock() : {}, rate = vsRate();
    add("Omborda bor, lekin narxi belgilanmagan", NS && NS.on && NS.strict ? "bad" : "warn", TV.list.filter(t => st[vsK(t.name)] && st[vsK(t.name)].qty > 0 && !nrRule(t.name)).map(t => t.name), "Ma'lumotnoma → Narx o'rnatish → «Narxsiz» filtri.");
    add("Eng past narx (min) tannarxdan past", "bad", TV.list.map(t => { const r = nrRule(t.name), s = st[vsK(t.name)]; if (!r || r.min == null || !s || !s.cost) return null; const c = s.cur === r.cur ? s.cost : rate ? (s.cur === "USD" ? s.cost * rate : s.cost / rate) : null; return c && r.min < c ? `${t.name}: min ${krMoney(r.min, r.cur)} < tannarx ${krMoney(c, r.cur)}` : null; }).filter(Boolean), "Ma'lumotnoma → Narx o'rnatish'da min ni oshiring.");
  }
  if (typeof mlBalances === "function") { let b = {}; try { b = mlBalances(); } catch (e) {} add("Manfiy kassa qoldig'i", "bad", Object.entries(b).flatMap(([a, m]) => Object.entries(m).filter(([, v]) => v < -0.005).map(([c, v]) => `${a}: ${krMoney(v, c)}`)), "Moliya → Boshlang'ich qoldiq yoki Tranzaksiyalar'ni tekshiring.");
    if (typeof mlLedger === "function") { let un = []; try { un = [...(mlLedger().unmapped || [])]; } catch (e) {} add("Kassaga bog'lanmagan to'lov turlari", "warn", un, "Sozlamalar → Kassalar'da shu to'lov turini kassaga biriktiring."); } }
  const ph = {}; (PARTY.cliApp ? PARTY.cliApp.list : []).forEach(c => { const d = String(c.phone || "").replace(/\D/g, "").slice(-9); if (d.length === 9) (ph[d] = ph[d] || []).push(c.name); });
  add("Bir telefon raqami bir nechta mijozda", "warn", Object.entries(ph).filter(([, a]) => a.length > 1).map(([d, a]) => `${d}: ${a.join(", ")}`), "CRM → Mijozlar'da takroriy mijozni birlashtiring yoki o'chiring.");
  if (typeof qtDebtLeft === "function") { const lim = new Date(Date.now() - 30 * 864e5).toLocaleDateString("en-CA"); add("30 kundan oshgan qarzlar", "warn", SL.list.filter(s => !s.cancelled && s.date < lim && qtDebtLeft(s) > 0.005).map(s => `№${s.number} ${s.date} — ${s.client}: ${krMoney(qtDebtLeft(s), s.currency)}`), "Sotuv → Mijozlar to'lovlari yoki Integratsiya → Xabar yuborish (qarz eslatmasi)."); }
  return out;
}
function chkRender() {
  if (!$("chkList")) return;
  const res = vsChecks(), lv = { ok:"Hammasi joyida", warn:"E'tibor bering", bad:"Xato" };
  res.sort((a, b) => ({ bad:0, warn:1, ok:2 })[a.level] - ({ bad:0, warn:1, ok:2 })[b.level]);
  $("chkList").innerHTML = res.map(c => `<div class="vschk"><h4><span class="lv ${c.level}">${lv[c.level]}</span>${esc(c.title)}${c.items.length ? ` · ${c.items.length} ta` : ""}</h4>${c.items.length ? `<ul>${c.items.slice(0, 100).map(x => `<li>${esc(x)}</li>`).join("")}${c.items.length > 100 ? `<li>… va yana ${c.items.length - 100} ta</li>` : ""}</ul><div class="fix">Qayerda tuzatiladi: ${esc(c.fix)}</div>` : ""}</div>`).join("");
}
$("chkGo").addEventListener("click", chkRender);

// ======================= SOZLAMALAR → ASOSIY SOZLAMALAR =======================
vsPanel("gsMainApp", `<div class="panel"><div class="thead"><h3>Asosiy sozlamalar</h3><span class="tmeta" id="gsWho"></span></div>
  <form class="kform" id="gsForm" onsubmit="return false"><div class="kgrid">${GSET_KEYS.map(f => `<label${f.wide ? ' class="span2"' : ""}>${f.label}${f.sel ? `<select id="gs_${f.k}">${f.sel.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>` : `<input id="gs_${f.k}" ${f.num ? 'type="number" min="0" step="any"' : 'maxlength="200"'} placeholder="${esc(f.ph || "")}">`}${f.hint ? `<span class="tmeta">${f.hint}</span>` : ""}</label>`).join("")}</div>
  <div class="kbtns"><button type="button" class="pri" id="gsSave">Saqlash</button></div><div class="status" id="gsMsg"></div></form></div>`);
function gsApply(vals) {
  GSET.list = (Array.isArray(vals) ? vals : []).filter((r, i) => i && Array.isArray(r) && r[0]).map(r => ({ key:String(r[0]), val:String(r[1] == null ? "" : r[1]), at:String(r[2] || "") })).sort((a, b) => a.at.localeCompare(b.at));
  const v = {}; GSET_KEYS.forEach(f => { if (f.def) v[f.k] = f.def; }); v.mods_off = "";
  GSET.list.forEach(x => { v[x.key] = x.val; });
  GSET.v = v; GSET.state = "ok"; gsFill(); vsModsApply(); gsDefaults();
}
function gsFill() {
  if (!$("gsForm") || document.activeElement && document.activeElement.closest && document.activeElement.closest("#gsForm")) return;
  GSET_KEYS.forEach(f => { const el = $("gs_" + f.k); if (el) { el.value = GSET.v[f.k] || ""; el.disabled = !VS.admin; } });
  $("gsSave").hidden = !VS.admin;
  $("gsWho").textContent = VS.admin ? "" : "Faqat administrator o'zgartira oladi";
}
async function gsWrite(pairs, msgId, okMsg) {
  if (!VS.admin) return vsMsg(msgId, "Faqat administrator o'zgartira oladi.", true);
  if (VS.busy || !VS.mcp) return vsMsg(msgId, krDbLine() || "Sahifani claude.ai'da oching.", true);
  VS.busy = true;
  try { const now = new Date().toISOString(); await VS.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Umumiy sozlamalar'!A1", values:pairs.map(([k, v]) => [k, krT(v), krT(now), krT(VS.me), ""]) }); const r = await VS.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:GSET_RANGE }, { cache:false }); VS.busy = false; gsApply(krVals({ result:r })); vsMsg(msgId, okMsg); }
  catch (e) { VS.busy = false; vsMsg(msgId, krCodeMsg(e && e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
}
$("gsSave").addEventListener("click", () => {
  const pairs = [];
  for (const f of GSET_KEYS) { const v = String($("gs_" + f.k).value).trim(); if (f.num && v !== "" && !(Number(v) > 0)) return vsMsg("gsMsg", `«${f.label}»ni to'g'ri kiriting.`, true); if (v !== String(GSET.v[f.k] || "")) pairs.push([f.k, v]); }
  if (!pairs.length) return vsMsg("gsMsg", "O'zgarish yo'q.");
  if (document.activeElement) document.activeElement.blur();
  gsWrite(pairs, "gsMsg", "Saqlandi.");
});
// Kurs va valyutani yangi hujjatlarga avtomatik qo'yish
function gsDefaults() {
  const rate = vsRate();
  if (rate) { ["slRate", "krRate", "nbRate"].forEach(id => { const el = $(id); if (el && !el.value && document.activeElement !== el) el.value = rate; }); if (typeof NR !== "undefined" && NR.bk && !NR.bk.rate) NR.bk.rate = String(rate); }
}
if (typeof slReset === "function") { const o = slReset; slReset = function () { o.apply(this, arguments); if (GSET.v.cur && $("slCur")) $("slCur").value = GSET.v.cur; gsDefaults(); }; }
if (typeof krResetForm === "function") { const o = krResetForm; krResetForm = function () { o.apply(this, arguments); gsDefaults(); }; }
document.addEventListener("click", e => { if (e.target.closest && e.target.closest("[data-open]")) setTimeout(gsDefaults, 0); });

// ======================= SOZLAMALAR → MODULLAR =======================
vsPanel("gsModApp", `<div class="panel"><div class="thead"><h3>Modullar</h3></div><div class="tmeta">Ishlatilmaydigan bo'limni o'chirsangiz, u chap menyudan yo'qoladi (ma'lumotlari o'chmaydi, qayta yoqsangiz joyida turadi). Hisobotlar va Sozlamalar doim yoqiq.</div>
  <div class="vsmods" id="gsMods" style="margin-top:12px"></div><div class="status" id="gsModMsg"></div></div>`);
function vsModsOff() { return String(GSET.v.mods_off || "").split(",").map(x => x.trim()).filter(Boolean); }
function vsModsApply() {
  const off = vsModsOff();
  let st = $("vsModCss"); if (!st) { st = document.createElement("style"); st.id = "vsModCss"; document.head.appendChild(st); }
  st.textContent = off.map(id => `nav a[data-id="${id}"]{display:none!important}`).join("");
  if ($("gsMods")) $("gsMods").innerHTML = VS_MODS.map(([id, n]) => `<div class="vsmod${off.indexOf(id) >= 0 ? " off" : ""}"><label class="switch"><input type="checkbox" data-mod="${id}"${off.indexOf(id) >= 0 ? "" : " checked"}${VS.admin ? "" : " disabled"}><span></span></label><b>${esc(n)}</b></div>`).join("");
}
$("gsMods").addEventListener("change", e => {
  const id = e.target.dataset.mod; if (!id) return;
  const off = vsModsOff().filter(x => x !== id); if (!e.target.checked) off.push(id);
  gsWrite([["mods_off", off.join(",")]], "gsModMsg", `«${(VS_MODS.find(x => x[0] === id) || [])[1]}» ${e.target.checked ? "yoqildi" : "o'chirildi"}.`);
});

// ======================= Yo'naltirish =======================
const VS_APPS = { vositalar:{ "Narxlar ro'yxati":["vsPrApp", prRender], "Eksport":["vsExApp", exSync], "Zaxira nusxa":["vsBkApp", () => {}], "Tekshiruvlar":["vsChkApp", chkRender] }, sozlamalar:{ "Asosiy sozlamalar":["gsMainApp", gsFill], "Modullar":["gsModApp", vsModsApply] } };
function vsRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "";
  Object.entries(VS_APPS).forEach(([s, m]) => Object.entries(m).forEach(([name, [app, fn]]) => { const on = sec === s && name === n; document.body.classList.toggle(app + "-on", on); if (on) fn(); }));
}
const vsOrigRenderSub = renderSub;
renderSub = function (i) { vsOrigRenderSub(i); vsRoute(); };
(async () => {
  try { const u = window.claude && window.claude.use ? await window.claude.use("user") : null; if (u) { VS.admin = !!(await Promise.resolve(typeof u.canEdit === "function" ? u.canEdit() : false)); try { VS.me = typeof u.id === "function" ? String(await Promise.resolve(u.id()) || "") : ""; } catch (e) {} } } catch (e) {}
  gsFill(); vsModsApply();
})();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) return;
  VS.mcp = mcp;
  try { mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:GSET_RANGE }, ev => { if (ev.type === "data" && !VS.busy) gsApply(krVals(ev)); }, { refetchInterval:300000 }); } catch (e) {}
  vsRoute();
})();
vsRoute();
