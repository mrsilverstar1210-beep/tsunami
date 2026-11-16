// ===== Tsunami: Marketing → Aksiyalar, Kutilayotgan tovarlar, Telegram postlar (Google Drive bazasida) =====
// Asosiy sahifa va chegirma.js dan keyin yuklanadi.
const MK = { mcp:null };
const mkToday = () => new Date().toLocaleDateString("en-CA");
function mkLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
function mkId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function mkJson(v, d) { try { const x = JSON.parse(v || ""); return x == null ? d : x; } catch (e) { return d; } }
function mkMsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function mkSay(o, render, m) { o.msg = m; clearTimeout(o.msgT); o.msgT = setTimeout(() => { o.msg = ""; render(); }, 6000); render(); }
function mkPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); }
function mkInStock() {
  // Omborda (sotilmagan) tovarlar: nomi bo'yicha soni va tannarxi
  const m = {};
  (typeof ylSrcRows === "function" ? ylSrcRows() : []).forEach(r => { const k = r.name.toLowerCase(), o = m[k] || (m[k] = { name:r.name, n:0, cost:r.cost, cur:r.cur }); o.n += r.imei ? 1 : (Number(r.qty) || 1); });
  return m;
}
(function mkCss() {
  const st = document.createElement("style");
  st.textContent = "#akApp,#ktgApp,#tgApp{display:none}.akApp-on #akApp,.ktgApp-on #ktgApp,.tgApp-on #tgApp{display:block}.akApp-on .gen,.akApp-on #kpis,.ktgApp-on .gen,.ktgApp-on #kpis,.tgApp-on .gen,.tgApp-on #kpis{display:none}"
    + "#akBox{margin:4px 0 8px}#akBox .akrow{font-size:13px;color:#15803d;margin:3px 0}#akBox .akrow.on{color:#6b7280}#akBox button{font:inherit;font-size:12px;margin-left:6px;border:1px solid #86efac;background:#f0fdf4;color:#15803d;border-radius:6px;padding:1px 8px;cursor:pointer}"
    + ".instock{color:#15803d;font-weight:600}#tgText{width:100%;min-height:220px;font:inherit;font-size:14px;padding:10px;border:1px solid var(--line);border-radius:10px;box-sizing:border-box}#tgPick td input{width:110px}.tgprev{white-space:pre-wrap;font-size:13px;max-width:520px}";
  document.head.appendChild(st);
})();

// ======================= AKSIYALAR =======================
const AK_RANGE = "Aksiyalar!A1:L1000";
const AK = { list:[], state:"loading", busy:false, editId:"", filter:"now", pendDel:"", msg:"", msgT:null, type:"sum" };
FORM_FOCUS.akApp = "akName";
mkPanel("akApp", `<div class="panel fpanel"><div class="thead"><h3 id="akTitle">Yangi aksiya</h3><button type="button" class="closebtn" data-close="akApp">Yopish ✕</button></div>
  <form id="akForm" class="kform">
    <div class="kgrid">
      <label class="span2">Aksiya nomi<input id="akName" maxlength="100" placeholder="Masalan: 10 mln dan oshsa 5% chegirma"></label>
      <label>Turi<select id="akType"><option value="sum">Chek summasidan chegirma</option><option value="gift">Xaridga sovg'a</option></select></label>
      <label>Boshlanish<input type="date" id="akFrom"></label>
      <label>Tugash<input type="date" id="akTo"><span class="tmeta">bo'sh — muddatsiz</span></label>
    </div>
    <div id="akSumBox" class="kgrid">
      <label>Chek summasi kamida<span class="inrow"><input type="number" id="akMin" min="0" step="any" placeholder="10000000"><select id="akMinCur"><option value="UZS">so'm</option><option value="USD">$</option></select></span></label>
      <label>Chegirma turi<select id="akRType"><option value="pct">Foiz (%)</option><option value="sum">Summa (chek valyutasida)</option></select></label>
      <label>Chegirma qiymati<input type="number" id="akRVal" min="0" step="any" placeholder="5"></label>
    </div>
    <div id="akGiftBox" class="kgrid" hidden>
      <label>Shart: qaysi tovar olinsa<select id="akScope"><option value="prod">Aniq tovar</option><option value="cat">Kategoriyadagi istalgan tovar</option><option value="all">Istalgan tovar</option></select></label>
      <label id="akProdL">Tovar<input id="akProd" list="krProducts" placeholder="Tovar nomi"></label>
      <label id="akCatL" hidden>Kategoriya<select id="akCat"></select></label>
      <label>Kamida necha dona<input type="number" id="akMinQty" min="1" step="1" value="1"></label>
      <label>Sovg'a tovar<input id="akGift" list="krProducts" placeholder="Masalan: Himoya oynasi"></label>
      <label>Sovg'a soni<input type="number" id="akGiftQty" min="1" step="1" value="1"></label>
    </div>
    <label class="full">Izoh<input id="akNote" maxlength="300" placeholder="ixtiyoriy"></label>
    <div class="kbtns"><button type="button" class="pri" id="akSave">Saqlash</button></div>
    <div class="status" id="akFmsg"></div>
  </form></div>
  <div class="panel"><div class="thead"><h3>Aksiyalar</h3><div class="hbtns"><div class="filters" id="akFilters"></div><button type="button" class="openbtn" data-open="akApp">+ Yangi aksiya</button></div></div>
  <div class="tmeta">Amaldagi aksiyalar Sotuv formasida o'zi taklif qilinadi: shart bajarilsa «Qo'llash» tugmasi chiqadi.</div>
  <div class="status" id="akStatus"></div><div id="akList"></div></div>`);
function akParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0] || String(r[2] || "") === "O'chirilgan") return;
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, paused:String(r[2] || "") === "To'xtatilgan", name:String(r[3] || ""), type:String(r[4] || "") === "gift" ? "gift" : "sum", cond:mkJson(r[5], {}), res:mkJson(r[6], {}), from:String(r[7] || ""), to:String(r[8] || ""), note:String(r[9] || ""), createdAt:String(r[10] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function akPhase(a) { const t = mkToday(); return a.paused ? "paused" : a.from && a.from > t ? "soon" : a.to && a.to < t ? "ended" : "now"; }
function akCondTxt(a) {
  if (a.type === "sum") return `Chek ${krMoney(Number(a.cond.min) || 0, a.cond.cur || "UZS")} dan oshsa`;
  const what = a.cond.scope === "all" ? "istalgan tovar" : a.cond.scope === "cat" ? `«${(typeof ktPath === "function" && ktPath(a.cond.target)) || "kategoriya"}» dan tovar` : `«${a.cond.target}»`;
  return `${what} ${Number(a.cond.minQty) > 1 ? a.cond.minQty + " dona " : ""}olinsa`;
}
function akResTxt(a) { return a.type === "sum" ? (a.res.type === "pct" ? `−${a.res.value}%` : `−${Number(a.res.value).toLocaleString("ru-RU")}`) : `sovg'a: ${a.res.gift}${Number(a.res.qty) > 1 ? " × " + a.res.qty : ""}`; }
function akTypeDraw() { const g = $("akType").value === "gift"; $("akSumBox").hidden = g; $("akGiftBox").hidden = !g; const sc = $("akScope").value; $("akProdL").hidden = sc !== "prod"; $("akCatL").hidden = sc !== "cat"; }
function akReset() {
  AK.editId = ""; ["akName", "akTo", "akMin", "akRVal", "akProd", "akGift", "akNote"].forEach(id => { $(id).value = ""; });
  $("akFrom").value = mkToday(); $("akType").value = "sum"; $("akMinCur").value = "UZS"; $("akRType").value = "pct"; $("akScope").value = "prod"; $("akMinQty").value = 1; $("akGiftQty").value = 1;
  $("akCat").innerHTML = typeof ktOptions === "function" ? ktOptions("", "", "— kategoriyani tanlang —") : "";
  $("akTitle").textContent = "Yangi aksiya"; akTypeDraw(); mkMsg("akFmsg", "");
}
function akLoad(id) {
  const a = AK.list.find(x => x.id === id); if (!a) return;
  akReset(); AK.editId = id; $("akTitle").textContent = `Tahrirlash: ${a.name}`;
  $("akName").value = a.name; $("akType").value = a.type; $("akFrom").value = a.from; $("akTo").value = a.to; $("akNote").value = a.note;
  if (a.type === "sum") { $("akMin").value = a.cond.min || ""; $("akMinCur").value = a.cond.cur || "UZS"; $("akRType").value = a.res.type || "pct"; $("akRVal").value = a.res.value || ""; }
  else { $("akScope").value = a.cond.scope || "prod"; if (a.cond.scope === "prod") $("akProd").value = a.cond.target || ""; if (a.cond.scope === "cat") $("akCat").innerHTML = ktOptions(a.cond.target, "", "— kategoriyani tanlang —"); $("akMinQty").value = a.cond.minQty || 1; $("akGift").value = a.res.gift || ""; $("akGiftQty").value = a.res.qty || 1; }
  akTypeDraw(); openForm("akApp", true);
}
function akProdName(v) { v = String(v || "").trim(); const p = krProduct(v) || KR.products.find(x => v && (x.sku === v || x.barcode === v)); return p ? p.name : v; }
async function akReload() { const r = await MK.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:AK_RANGE }, { cache:false }); akApply(krVals({ result:r })); }
function akApply(vals) { AK.list = akParse(vals); AK.state = "ok"; akRender(); akDraw(); }
async function akSave() {
  if (AK.busy) return;
  if (!MK.mcp) return mkMsg("akFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const name = $("akName").value.trim(), type = $("akType").value, from = $("akFrom").value, to = $("akTo").value, note = $("akNote").value.trim();
  if (!name) return mkMsg("akFmsg", "Aksiya nomini yozing.", true);
  if (!from) return mkMsg("akFmsg", "Boshlanish sanasini kiriting.", true);
  if (to && to < from) return mkMsg("akFmsg", "Tugash sanasi boshlanishdan oldin bo'lmasin.", true);
  let cond, res;
  if (type === "sum") {
    const min = Number($("akMin").value), val = Number($("akRVal").value), rt = $("akRType").value;
    if (!(min > 0)) return mkMsg("akFmsg", "Chek summasi chegarasini kiriting.", true);
    if (!(val > 0) || (rt === "pct" && val >= 100)) return mkMsg("akFmsg", "Chegirma qiymatini to'g'ri kiriting.", true);
    cond = { min, cur:$("akMinCur").value }; res = { type:rt, value:val };
  } else {
    const scope = $("akScope").value, target = scope === "prod" ? akProdName($("akProd").value) : scope === "cat" ? $("akCat").value : "";
    const minQty = Number($("akMinQty").value), gift = akProdName($("akGift").value), qty = Number($("akGiftQty").value);
    if (scope !== "all" && !target) return mkMsg("akFmsg", scope === "prod" ? "Shartdagi tovarni kiriting." : "Kategoriyani tanlang.", true);
    if (!(minQty >= 1) || Math.floor(minQty) !== minQty) return mkMsg("akFmsg", "Kamida necha dona — butun son bo'lsin.", true);
    if (!gift) return mkMsg("akFmsg", "Sovg'a tovarni kiriting.", true);
    if (!(qty >= 1) || Math.floor(qty) !== qty) return mkMsg("akFmsg", "Sovg'a soni butun son bo'lsin.", true);
    cond = { scope, target, minQty }; res = { gift, qty };
  }
  AK.busy = true; $("akSave").disabled = true; let step = "read";
  try {
    await akReload();
    const ex = AK.editId ? AK.list.find(x => x.id === AK.editId) : null;
    if (AK.editId && !ex) { mkMsg("akFmsg", "Bu aksiya boshqa joyda o'chirilgan.", true); throw null; }
    const now = new Date().toISOString(), id = ex ? ex.id : mkId("A"), number = ex ? ex.number : AK.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    const row = [krT(id), number, ex && ex.paused ? "To'xtatilgan" : "Faol", krT(name), type, krT(JSON.stringify(cond)), krT(JSON.stringify(res)), krT(from), krT(to), krT(note), krT(ex ? ex.createdAt : now), krT(now)];
    step = "write";
    if (ex) await MK.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Aksiyalar!A${ex.row}:L${ex.row}`, values:[row] });
    else await MK.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Aksiyalar!A1", values:[row] });
    mkSay(AK, akRender, ex ? `«${name}» saqlandi.` : `«${name}» aksiyasi yaratildi.`);
    akReset(); openForm("akApp", false); try { await akReload(); } catch (e) {}
  } catch (e) { if (e) mkMsg("akFmsg", krCodeMsg(e.code) || (step === "write" ? "Javob kelmadi: saqlangan bo'lishi ham mumkin. Ro'yxatni tekshiring." : "Bazaga ulanib bo'lmadi, qayta urinib ko'ring."), true); }
  AK.busy = false; $("akSave").disabled = false;
}
async function akSetState(id, state) {
  if (AK.busy || !MK.mcp) return; AK.busy = true;
  try {
    await akReload(); const a = AK.list.find(x => x.id === id); if (!a) throw null;
    await MK.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Aksiyalar!C${a.row}`, values:[[state]] });
    mkSay(AK, akRender, state === "O'chirilgan" ? `«${a.name}» o'chirildi.` : state === "To'xtatilgan" ? `«${a.name}» to'xtatildi.` : `«${a.name}» qayta yoqildi.`);
    try { await akReload(); } catch (e) {}
  } catch (e) { if (e) mkSay(AK, akRender, krCodeMsg(e.code) || "O'zgartirib bo'lmadi."); }
  AK.busy = false; AK.pendDel = "";
}
function akRender() {
  if (!$("akList")) return;
  const P = { now:"Amalda", soon:"Rejada", ended:"Tugagan", paused:"To'xtatilgan" }, counts = { now:0, soon:0, ended:0, paused:0 };
  AK.list.forEach(a => { counts[akPhase(a)]++; });
  $("akFilters").innerHTML = Object.entries(P).map(([k, l]) => `<button data-f="${k}" class="${AK.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("akStatus").textContent = [mkLine(AK, "Aksiyalar"), AK.msg].filter(Boolean).join(" · ");
  const list = AK.list.filter(a => akPhase(a) === AK.filter);
  if (!list.length) { $("akList").innerHTML = `<div class="empty-box">${AK.state === "ok" ? (AK.list.length ? "Bu ro'yxatda aksiya yo'q" : "Hozircha aksiya yo'q: «Yangi aksiya» tugmasini bosing") : ""}</div>`; return; }
  const can = !!MK.mcp;
  $("akList").innerHTML = `<table><thead><tr><th>№</th><th>Nomi</th><th>Shart</th><th>Natija</th><th>Muddat</th><th></th></tr></thead><tbody>` + list.map(a => {
    const ph = akPhase(a), act = can ? `<button data-akedit="${esc(a.id)}">Tahrirlash</button>` + (a.paused ? `<button data-akon="${esc(a.id)}">Yoqish</button>` : ph !== "ended" ? `<button data-akoff="${esc(a.id)}">To'xtatish</button>` : "") + `<button data-akdel="${esc(a.id)}">${AK.pendDel === a.id ? "Ha, o'chirish" : "O'chirish"}</button>` : "";
    return `<tr><td>${esc(a.number)}</td><td><b>${esc(a.name)}</b>${a.note ? `<div class="tmeta">${esc(a.note)}</div>` : ""}</td><td>${esc(akCondTxt(a))}</td><td><b>${esc(akResTxt(a))}</b></td><td>${esc(a.from)}${a.to ? " — " + esc(a.to) : " dan, muddatsiz"}</td><td class="krAct">${act}</td></tr>`;
  }).join("") + `</tbody></table>`;
}
// --- Sotuv formasida aksiya ---
function akItemHit(it, a) {
  const n = String(it.name || "").trim().toLowerCase(); if (!n) return false;
  if (a.cond.scope === "all") return true;
  if (a.cond.scope === "prod") return n === String(a.cond.target || "").toLowerCase();
  const tv = TV.list.find(t => t.name.toLowerCase() === n); return !!(tv && tv.catId && a.cond.target && ktSubtree(a.cond.target).has(tv.catId));
}
function akOffers() {
  const cur = $("slCur").value, out = [];
  const base = SL.items.filter(it => String(it.name).trim() && !(it.disc && it.disc.gift));
  AK.list.filter(a => akPhase(a) === "now").forEach(a => {
    const applied = SL.items.some(it => it.disc && it.disc.promo && it.disc.id === a.id);
    if (a.type === "sum") {
      if ((a.cond.cur || "UZS") !== cur) return;
      const tot = base.filter(it => !(it.disc && it.disc.promo)).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);
      const totAll = base.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.disc && it.disc.promo && it.disc.id === a.id ? it.disc.base : it.price) || 0), 0);
      if (applied || tot >= Number(a.cond.min)) out.push({ a, applied, ok:applied || tot >= Number(a.cond.min), tot:applied ? totAll : tot });
    } else {
      const q = base.filter(it => akItemHit(it, a)).reduce((s, it) => s + (Number(it.qty) || 0), 0);
      if (applied || q >= Number(a.cond.minQty || 1)) out.push({ a, applied, ok:true });
    }
  });
  return out;
}
function akDraw() {
  if (!$("slTotal")) return;
  let box = $("akBox");
  if (!box) { box = document.createElement("div"); box.id = "akBox"; $("slTotal").parentNode.insertBefore(box, $("slTotal").nextSibling); }
  const offers = akOffers(), cur = $("slCur").value;
  box.innerHTML = offers.map(o => {
    const a = o.a;
    if (o.applied) return `<div class="akrow on">Aksiya qo'llandi: «${esc(a.name)}» — ${esc(akResTxt(a))}<button type="button" data-akundo="${esc(a.id)}">Bekor</button></div>`;
    const off = a.type === "sum" ? (a.res.type === "pct" ? o.tot * a.res.value / 100 : Number(a.res.value)) : 0;
    return `<div class="akrow">Aksiya: «${esc(a.name)}» — ${esc(akCondTxt(a))}, ${esc(akResTxt(a))}${a.type === "sum" ? ` (${krMoney(off, cur)})` : ""}<button type="button" data-akapply="${esc(a.id)}">${a.type === "gift" ? "Sovg'ani qo'shish" : "Qo'llash"}</button></div>`;
  }).join("");
}
function akApplyOffer(id) {
  const a = AK.list.find(x => x.id === id); if (!a) return;
  const cur = $("slCur").value;
  if (a.type === "gift") {
    SL.items = SL.items.filter(it => String(it.name).trim() || it.price !== "");
    SL.items.push({ name:a.res.gift, qty:Number(a.res.qty) || 1, price:0, imei:"", disc:{ promo:true, gift:true, id:a.id, name:a.name, txt:"sovg'a", base:0, off:0 } });
    slRows(); return;
  }
  const rows = SL.items.filter(it => String(it.name).trim() && !(it.disc && it.disc.gift) && !(it.disc && it.disc.promo));
  const tot = rows.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0); if (!(tot > 0)) return;
  const off = Math.min(tot, a.res.type === "pct" ? tot * a.res.value / 100 : Number(a.res.value)), k = 1 - off / tot;
  rows.forEach(it => {
    const base = Number(it.price) || 0, np = cur === "USD" ? Math.round(base * k * 100) / 100 : Math.round(base * k);
    it.disc = { promo:true, id:a.id, name:a.name, txt:akResTxt(a), base, off:Math.round((base - np) * 100) / 100, prev:it.disc || null };
    it.price = np;
  });
  slRows();
}
function akUndo(id) {
  SL.items = SL.items.filter(it => !(it.disc && it.disc.gift && it.disc.id === id));
  SL.items.forEach(it => { if (it.disc && it.disc.promo && it.disc.id === id) { const prev = it.disc.prev; it.price = it.disc.base; if (prev) it.disc = prev; else delete it.disc; } });
  slRows();
}
const akOrigTotals = slTotals;
slTotals = function () { akOrigTotals(); akDraw(); };
$("slCur").addEventListener("change", akDraw);
$("slForm").addEventListener("click", e => {
  const a = e.target.closest("[data-akapply]"); if (a) { akApplyOffer(a.dataset.akapply); return; }
  const u = e.target.closest("[data-akundo]"); if (u) akUndo(u.dataset.akundo);
});
$("akForm").addEventListener("submit", e => e.preventDefault());
$("akSave").addEventListener("click", akSave);
["akType", "akScope"].forEach(id => $(id).addEventListener("change", akTypeDraw));
$("akFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { AK.filter = b.dataset.f; akRender(); } });
$("akList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.akedit) akLoad(b.dataset.akedit);
  else if (b.dataset.akoff) akSetState(b.dataset.akoff, "To'xtatilgan");
  else if (b.dataset.akon) akSetState(b.dataset.akon, "Faol");
  else if (b.dataset.akdel) { if (AK.pendDel === b.dataset.akdel) akSetState(b.dataset.akdel, "O'chirilgan"); else { AK.pendDel = b.dataset.akdel; akRender(); } }
});

// ======================= KUTILAYOTGAN TOVARLAR =======================
const KG_RANGE = "'Kutilayotgan tovarlar'!A1:K3000";
const KG = { list:[], state:"loading", busy:false, filter:"wait", q:"", pendCancel:"", msg:"", msgT:null };
const KG_ST = { wait:"Kutilmoqda", told:"Xabar berildi", sold:"Sotildi", cancel:"Bekor qilingan" };
FORM_FOCUS.ktgApp = "kgClient";
mkPanel("ktgApp", `<div class="panel fpanel"><div class="thead"><h3>Mijoz so'ragan tovar</h3><button type="button" class="closebtn" data-close="ktgApp">Yopish ✕</button></div>
  <form id="kgForm" class="kform">
    <div class="kgrid">
      <label>Sana<input type="date" id="kgDate"></label>
      <label>Mijoz<input id="kgClient" list="pyClients" maxlength="120" placeholder="Mijoz ismi"></label>
      <label>Telefon<input id="kgPhone" maxlength="30" inputmode="tel" placeholder="+998 90 123 45 67"></label>
      <label class="span2">Tovar<input id="kgProd" list="krProducts" maxlength="160" placeholder="Masalan: iPhone 15 Pro 256GB Natural"></label>
      <label>Soni<input type="number" id="kgQty" min="1" step="1" value="1"></label>
    </div>
    <label class="full">Izoh<input id="kgNote" maxlength="300" placeholder="Rangi, xotirasi, taxminiy narxi va h.k."></label>
    <div class="kbtns"><button type="button" class="pri" id="kgSave">Saqlash</button></div>
    <div class="status" id="kgFmsg"></div>
  </form></div>
  <div class="panel"><div class="thead"><h3>Kutilayotgan tovarlar</h3><div class="hbtns"><input class="search" id="kgQ" placeholder="Qidirish: mijoz, telefon, tovar"><div class="filters" id="kgFilters"></div><button type="button" class="openbtn" data-open="ktgApp">+ Yangi so'rov</button></div></div>
  <div class="tmeta">Tovar omborga kelsa (kirim qilinsa), ro'yxatda «Omborda bor» deb chiqadi — mijozga qo'ng'iroq qilib, «Xabar berildi» deb belgilang.</div>
  <div class="status" id="kgStatus"></div><div id="kgList"></div></div>`);
function kgParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const st = Object.keys(KG_ST).find(k => KG_ST[k] === String(r[2] || "")) || "wait";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, st, date:String(r[3] || ""), client:String(r[4] || ""), phone:String(r[5] || ""), prod:String(r[6] || ""), qty:Number(r[7]) || 1, note:String(r[8] || ""), createdAt:String(r[9] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
async function kgReload() { const r = await MK.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:KG_RANGE }, { cache:false }); kgApply(krVals({ result:r })); }
function kgApply(vals) { KG.list = kgParse(vals); KG.state = "ok"; kgRender(); }
function kgReset() { $("kgDate").value = mkToday(); ["kgClient", "kgPhone", "kgProd", "kgNote"].forEach(id => { $(id).value = ""; }); $("kgQty").value = 1; mkMsg("kgFmsg", ""); if (typeof pyClientsFill === "function") pyClientsFill(); }
async function kgSave() {
  if (KG.busy) return;
  if (!MK.mcp) return mkMsg("kgFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const date = $("kgDate").value, client = $("kgClient").value.trim(), phone = $("kgPhone").value.trim(), prod = akProdName($("kgProd").value), qty = Number($("kgQty").value), note = $("kgNote").value.trim();
  if (!client) return mkMsg("kgFmsg", "Mijoz ismini yozing.", true);
  const known = PARTY.cliApp ? PARTY.cliApp.list.find(c => c.name.toLowerCase() === client.toLowerCase()) : null;
  const tel = phone || (known ? known.phone : "");
  if (!tel) return mkMsg("kgFmsg", "Telefon raqamini yozing: tovar kelganda qo'ng'iroq qilish uchun kerak.", true);
  if (!prod) return mkMsg("kgFmsg", "Qaysi tovar kerakligini yozing.", true);
  if (!(qty >= 1) || Math.floor(qty) !== qty) return mkMsg("kgFmsg", "Sonini butun son qilib yozing.", true);
  KG.busy = true; $("kgSave").disabled = true; let step = "read";
  try {
    await kgReload();
    const now = new Date().toISOString(), number = KG.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    step = "write";
    await MK.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Kutilayotgan tovarlar'!A1", values:[[krT(mkId("W")), number, KG_ST.wait, krT(date || mkToday()), krT(known ? known.name : client), krT(tel), krT(prod), qty, krT(note), krT(now), krT(now)]] });
    mkSay(KG, kgRender, `So'rov №${number} saqlandi: ${client} — ${prod}.`);
    kgReset(); openForm("ktgApp", false); try { await kgReload(); } catch (e) {}
  } catch (e) { if (e) mkMsg("kgFmsg", krCodeMsg(e.code) || (step === "write" ? "Javob kelmadi: saqlangan bo'lishi ham mumkin. Ro'yxatni tekshiring." : "Bazaga ulanib bo'lmadi, qayta urinib ko'ring."), true); }
  KG.busy = false; $("kgSave").disabled = false;
}
async function kgSet(id, st) {
  if (KG.busy || !MK.mcp) return; KG.busy = true;
  try {
    await kgReload(); const w = KG.list.find(x => x.id === id); if (!w) throw null;
    await MK.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Kutilayotgan tovarlar'!C${w.row}`, values:[[KG_ST[st]]] });
    await MK.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Kutilayotgan tovarlar'!K${w.row}`, values:[[krT(new Date().toISOString())]] });
    mkSay(KG, kgRender, `№${w.number}: ${KG_ST[st]}.`);
    try { await kgReload(); } catch (e) {}
  } catch (e) { if (e) mkSay(KG, kgRender, krCodeMsg(e.code) || "O'zgartirib bo'lmadi."); }
  KG.busy = false; KG.pendCancel = "";
}
function kgRender() {
  if (!$("kgList")) return;
  const stock = mkInStock(), have = w => stock[w.prod.toLowerCase()];
  const kind = w => w.st === "wait" ? (have(w) ? "arrived" : "wait") : w.st === "told" ? "told" : "closed";
  const F = { wait:"Kutilmoqda", arrived:"Omborda bor", told:"Xabar berildi", closed:"Yopilgan" }, counts = { wait:0, arrived:0, told:0, closed:0 };
  KG.list.forEach(w => { counts[kind(w)]++; });
  $("kgFilters").innerHTML = Object.entries(F).map(([k, l]) => `<button data-f="${k}" class="${KG.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("kgStatus").textContent = [mkLine(KG, "Kutilayotgan tovarlar"), KG.msg].filter(Boolean).join(" · ");
  const q = KG.q.trim().toLowerCase();
  const list = KG.list.filter(w => kind(w) === KG.filter && (!q || [w.client, w.phone, w.prod].some(x => x.toLowerCase().indexOf(q) >= 0)));
  if (!list.length) { $("kgList").innerHTML = `<div class="empty-box">${KG.state === "ok" ? (KG.list.length ? "Bu ro'yxatda so'rov yo'q" : "Hozircha so'rov yo'q: mijoz omborda yo'q tovarni so'rasa, shu yerga yozing") : ""}</div>`; return; }
  const can = !!MK.mcp;
  $("kgList").innerHTML = `<table><thead><tr><th>№</th><th>Sana</th><th>Mijoz</th><th>Telefon</th><th>Tovar</th><th>Soni</th><th>Holat</th><th></th></tr></thead><tbody>` + list.map(w => {
    const h = have(w), k = kind(w);
    const badge = k === "arrived" ? `<span class="instock">Omborda bor (${h.n} dona)</span>` : k === "wait" ? `<span class="st st-yangi">Kutilmoqda</span>` : k === "told" ? `<span class="st st-jarayonda">Xabar berildi</span>${h ? `<div class="tmeta instock">omborda ${h.n} dona</div>` : ""}` : `<span class="st ${w.st === "sold" ? "st-done" : "st-draft"}">${KG_ST[w.st]}</span>`;
    let act = "";
    if (can && (w.st === "wait" || w.st === "told")) act = (w.st === "wait" ? `<button data-kgtold="${esc(w.id)}">Xabar berildi</button>` : "") + `<button data-kgsold="${esc(w.id)}">Sotildi</button><button data-kgcancel="${esc(w.id)}">${KG.pendCancel === w.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>`;
    return `<tr><td>${esc(w.number)}</td><td>${esc(w.date.slice(0, 10))}</td><td><b>${esc(w.client)}</b></td><td class="mono">${esc(w.phone)}</td><td>${esc(w.prod)}${w.note ? `<div class="tmeta">${esc(w.note)}</div>` : ""}</td><td class="num">${esc(w.qty)}</td><td>${badge}</td><td class="krAct">${act}</td></tr>`;
  }).join("") + `</tbody></table>`;
}
$("kgForm").addEventListener("submit", e => e.preventDefault());
$("kgSave").addEventListener("click", kgSave);
$("kgClient").addEventListener("change", () => { const c = PARTY.cliApp ? PARTY.cliApp.list.find(x => x.name.toLowerCase() === $("kgClient").value.trim().toLowerCase()) : null; if (c && c.phone && !$("kgPhone").value) $("kgPhone").value = c.phone; });
$("kgFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { KG.filter = b.dataset.f; kgRender(); } });
$("kgQ").addEventListener("input", e => { KG.q = e.target.value; kgRender(); });
$("kgList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.kgtold) kgSet(b.dataset.kgtold, "told");
  else if (b.dataset.kgsold) kgSet(b.dataset.kgsold, "sold");
  else if (b.dataset.kgcancel) { if (KG.pendCancel === b.dataset.kgcancel) kgSet(b.dataset.kgcancel, "cancel"); else { KG.pendCancel = b.dataset.kgcancel; kgRender(); } }
});

// ======================= TELEGRAM POSTLAR =======================
const TG_RANGE = "'Telegram postlar'!A1:I2000";
const TG = { list:[], state:"loading", busy:false, filter:"draft", pick:{}, pendDel:"", msg:"", msgT:null, editId:"" };
const TG_TPL = { new:"🔥 Yangi tovarlar keldi!", price:"📉 Narxlar tushdi!", bu:"♻️ B/U telefonlar — kafolat bilan", promo:"🎁 Aksiya!" };
FORM_FOCUS.tgApp = "tgSearch";
mkPanel("tgApp", `<div class="panel fpanel"><div class="thead"><h3 id="tgTitle">Yangi post</h3><button type="button" class="closebtn" data-close="tgApp">Yopish ✕</button></div>
  <form id="tgForm" class="kform">
    <div class="kgrid">
      <label>Sarlavha<select id="tgTpl">${Object.entries(TG_TPL).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
      <label>Valyuta<select id="tgCur"><option value="USD">$</option><option value="UZS">so'm</option></select></label>
      <label class="span2">Pastki qism (manzil, aloqa)<input id="tgFoot" maxlength="300" placeholder="Masalan: 📍 5Tech, manzil · ☎️ telefon · kanal havolasi"></label>
    </div>
    <div class="inrow" style="max-width:520px"><input id="tgSearch" class="search" placeholder="Ombordagi tovardan qidirish"></div>
    <div class="ktable"><table id="tgPick"><thead><tr><th></th><th>Tovar</th><th>Omborda</th><th>Tannarx</th><th>Postdagi narx</th></tr></thead><tbody id="tgRows"></tbody></table></div>
    <label class="full">Post matni (o'zgartirish mumkin)<textarea id="tgText"></textarea></label>
    <div class="kbtns"><button type="button" class="sec" id="tgCopy">Nusxa olish</button><button type="button" class="sec" id="tgDraft">Qoralama saqlash</button><button type="button" class="pri" id="tgSent">Kanalga yuborildi deb saqlash</button></div>
    <div class="status" id="tgFmsg"></div>
    <div class="tmeta">Panel Telegram'ga o'zi yubora olmaydi: matnni nusxalab kanalga joylang, keyin «yuborildi» deb saqlang. Avtomatik post boti avvalgidek ishlayveradi.</div>
  </form></div>
  <div class="panel"><div class="thead"><h3>Telegram postlar</h3><div class="hbtns"><div class="filters" id="tgFilters"></div><button type="button" class="openbtn" data-open="tgApp">+ Yangi post</button></div></div>
  <div class="status" id="tgStatus"></div><div id="tgList"></div></div>`);
function tgParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0] || String(r[2] || "") === "O'chirilgan") return;
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, sent:String(r[2] || "") === "Yuborildi", date:String(r[3] || ""), text:String(r[4] || ""), items:mkJson(r[5], []), link:String(r[6] || ""), createdAt:String(r[7] || ""), updatedAt:String(r[8] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
async function tgReload() { const r = await MK.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:TG_RANGE }, { cache:false }); tgApply(krVals({ result:r })); }
function tgApply(vals) { TG.list = tgParse(vals); TG.state = "ok"; tgRender(); }
function tgFootDefault() { try { return localStorage.getItem("tsunami_tg_foot") || ""; } catch (e) { return ""; } }
function tgRowsDraw() {
  const st = mkInStock(), q = $("tgSearch").value.trim().toLowerCase();
  const all = Object.values(st).sort((a, b) => a.name.localeCompare(b.name));
  const list = all.filter(x => TG.pick[x.name] || !q || x.name.toLowerCase().indexOf(q) >= 0).slice(0, 80);
  $("tgRows").innerHTML = list.length ? list.map(x => { const p = TG.pick[x.name]; return `<tr data-n="${esc(x.name)}"><td><input type="checkbox" data-f="on"${p ? " checked" : ""}></td><td>${esc(x.name)}</td><td class="num">${x.n}</td><td class="num">${krMoney(x.cost, x.cur)}</td><td><input type="number" data-f="price" min="0" step="any" value="${p ? esc(p.price) : ""}" placeholder="narx"></td></tr>`; }).join("")
    : `<tr><td colspan="5" class="empty">${all.length ? "Topilmadi" : "Omborda tovar yo'q (yoki kirimlar hali yuklanmagan)"}</td></tr>`;
}
function tgCompose() {
  const cur = $("tgCur").value, picked = Object.entries(TG.pick);
  const lines = picked.map(([n, p]) => `▫️ ${n}${String(p.price).trim() !== "" ? " — " + (cur === "USD" ? `${Number(p.price).toLocaleString("ru-RU")} $` : `${Number(p.price).toLocaleString("ru-RU")} so'm`) : ""}`);
  let promo = "";
  if ($("tgTpl").value === "promo") {
    const ds = (typeof CH !== "undefined" ? CH.list : []).filter(d => !d.client && chPhase(d) === "now").map(d => `🏷 ${d.name}: ${chValTxt(d)}${d.to ? ` (${d.to} gacha)` : ""}`);
    const as = AK.list.filter(a => akPhase(a) === "now").map(a => `🎁 ${a.name}: ${akCondTxt(a)} — ${akResTxt(a)}`);
    promo = ds.concat(as).join("\n");
  }
  const foot = $("tgFoot").value.trim();
  $("tgText").value = [TG_TPL[$("tgTpl").value], promo, lines.join("\n"), foot].filter(Boolean).join("\n\n");
}
function tgReset() {
  TG.editId = ""; TG.pick = {}; $("tgTpl").value = "new"; $("tgCur").value = "USD"; $("tgSearch").value = ""; $("tgFoot").value = tgFootDefault();
  $("tgTitle").textContent = "Yangi post"; tgRowsDraw(); tgCompose(); mkMsg("tgFmsg", "");
}
async function tgSave(sent) {
  if (TG.busy) return;
  if (!MK.mcp) return mkMsg("tgFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const text = $("tgText").value.trim(); if (!text) return mkMsg("tgFmsg", "Post matni bo'sh.", true);
  try { localStorage.setItem("tsunami_tg_foot", $("tgFoot").value.trim()); } catch (e) {}
  const items = Object.entries(TG.pick).map(([name, p]) => ({ name, price:p.price, cur:$("tgCur").value }));
  TG.busy = true; let step = "read";
  try {
    await tgReload();
    const ex = TG.editId ? TG.list.find(x => x.id === TG.editId) : null;
    const now = new Date().toISOString(), id = ex ? ex.id : mkId("T"), number = ex ? ex.number : TG.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    const row = [krT(id), number, sent ? "Yuborildi" : "Qoralama", krT(mkToday()), krT(text), krT(JSON.stringify(items)), ex ? krT(ex.link) : "", krT(ex ? ex.createdAt : now), krT(now)];
    step = "write";
    if (ex) await MK.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Telegram postlar'!A${ex.row}:I${ex.row}`, values:[row] });
    else await MK.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Telegram postlar'!A1", values:[row] });
    mkSay(TG, tgRender, sent ? `Post №${number} yuborilganlar ro'yxatiga yozildi.` : `Post №${number} qoralama sifatida saqlandi.`);
    tgReset(); openForm("tgApp", false); try { await tgReload(); } catch (e) {}
  } catch (e) { if (e) mkMsg("tgFmsg", krCodeMsg(e.code) || (step === "write" ? "Javob kelmadi: saqlangan bo'lishi ham mumkin. Ro'yxatni tekshiring." : "Bazaga ulanib bo'lmadi, qayta urinib ko'ring."), true); }
  TG.busy = false;
}
async function tgSet(id, state) {
  if (TG.busy || !MK.mcp) return; TG.busy = true;
  try {
    await tgReload(); const t = TG.list.find(x => x.id === id); if (!t) throw null;
    await MK.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Telegram postlar'!C${t.row}`, values:[[state]] });
    mkSay(TG, tgRender, state === "O'chirilgan" ? `Post №${t.number} o'chirildi.` : `Post №${t.number} yuborildi deb belgilandi.`);
    try { await tgReload(); } catch (e) {}
  } catch (e) { if (e) mkSay(TG, tgRender, krCodeMsg(e.code) || "O'zgartirib bo'lmadi."); }
  TG.busy = false; TG.pendDel = "";
}
async function tgCopyText(text, msgId) {
  try { await navigator.clipboard.writeText(text); if (msgId) mkMsg(msgId, "Matn nusxalandi: Telegram kanalga joylang."); else mkSay(TG, tgRender, "Matn nusxalandi."); }
  catch (e) { if (msgId) mkMsg(msgId, "Nusxalab bo'lmadi: matnni belgilab, qo'lda nusxa oling.", true); else mkSay(TG, tgRender, "Nusxalab bo'lmadi: «Ochish» orqali matnni qo'lda nusxa oling."); }
}
function tgRender() {
  if (!$("tgList")) return;
  const counts = { draft:TG.list.filter(t => !t.sent).length, sent:TG.list.filter(t => t.sent).length };
  $("tgFilters").innerHTML = [["draft", "Qoralamalar"], ["sent", "Yuborilgan"]].map(([k, l]) => `<button data-f="${k}" class="${TG.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("tgStatus").textContent = [mkLine(TG, "Telegram postlar"), TG.msg].filter(Boolean).join(" · ");
  const list = TG.list.filter(t => TG.filter === "sent" ? t.sent : !t.sent);
  if (!list.length) { $("tgList").innerHTML = `<div class="empty-box">${TG.state === "ok" ? (TG.filter === "sent" ? "Hali yuborilgan post yo'q" : "Qoralama yo'q: «Yangi post» tugmasini bosing") : ""}</div>`; return; }
  const can = !!MK.mcp;
  $("tgList").innerHTML = `<table><thead><tr><th>№</th><th>Sana</th><th>Matn</th><th></th></tr></thead><tbody>` + list.map(t =>
    `<tr><td>${esc(t.number)}</td><td>${esc(t.date)}</td><td><div class="tgprev">${esc(t.text)}</div></td><td class="krAct"><button data-tgcopy="${esc(t.id)}">Nusxa olish</button>${can ? (t.sent ? "" : `<button data-tgedit="${esc(t.id)}">Ochish</button><button data-tgsent="${esc(t.id)}">Yuborildi</button>`) + `<button data-tgdel="${esc(t.id)}">${TG.pendDel === t.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
}
$("tgForm").addEventListener("submit", e => e.preventDefault());
$("tgSearch").addEventListener("input", tgRowsDraw);
["tgTpl", "tgCur"].forEach(id => $(id).addEventListener("change", tgCompose));
$("tgFoot").addEventListener("input", tgCompose);
$("tgRows").addEventListener("input", e => {
  const tr = e.target.closest("tr[data-n]"); if (!tr) return; const n = tr.dataset.n;
  if (e.target.dataset.f === "on") { if (e.target.checked) TG.pick[n] = { price:tr.querySelector('[data-f="price"]').value }; else delete TG.pick[n]; }
  else if (e.target.dataset.f === "price") { TG.pick[n] = { price:e.target.value }; tr.querySelector('[data-f="on"]').checked = true; }
  tgCompose();
});
$("tgCopy").addEventListener("click", () => tgCopyText($("tgText").value, "tgFmsg"));
$("tgDraft").addEventListener("click", () => tgSave(false));
$("tgSent").addEventListener("click", () => tgSave(true));
$("tgFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { TG.filter = b.dataset.f; tgRender(); } });
$("tgList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const t = TG.list.find(x => x.id === (b.dataset.tgcopy || b.dataset.tgedit || b.dataset.tgsent || b.dataset.tgdel));
  if (b.dataset.tgcopy && t) tgCopyText(t.text);
  else if (b.dataset.tgedit && t) { tgReset(); TG.editId = t.id; $("tgTitle").textContent = `Post №${t.number}`; (t.items || []).forEach(x => { TG.pick[x.name] = { price:x.price }; if (x.cur) $("tgCur").value = x.cur; }); tgRowsDraw(); $("tgText").value = t.text; openForm("tgApp", true); }
  else if (b.dataset.tgsent) tgSet(b.dataset.tgsent, "Yuborildi");
  else if (b.dataset.tgdel) { if (TG.pendDel === b.dataset.tgdel) tgSet(b.dataset.tgdel, "O'chirilgan"); else { TG.pendDel = b.dataset.tgdel; tgRender(); } }
});

// ======================= Yo'naltirish va yuklash =======================
const MK_APPS = { "Aksiyalar":["akApp", akRender], "Kutilayotgan tovarlar":["ktgApp", kgRender], "Telegram postlar":["tgApp", tgRender] };
function mkRoute() {
  const n = current && current.id === "marketing" && current.subs[currentSub] ? current.subs[currentSub].n : "";
  Object.entries(MK_APPS).forEach(([name, [app, render]]) => { $(app).classList.remove("fopen"); document.body.classList.toggle(app + "-on", name === n); if (name === n) render(); });
}
const mkOrigRenderSub = renderSub;
renderSub = function (i) { mkOrigRenderSub(i); mkRoute(); };
document.addEventListener("click", e => {
  const o = e.target.closest("[data-open]"); if (!o) return;
  if (o.dataset.open === "akApp") akReset(); else if (o.dataset.open === "ktgApp") kgReset(); else if (o.dataset.open === "tgApp") tgReset();
});
// Ombor (kirim) va sotuvlar o'zgarsa — kutilayotgan tovarlar holati yangilanadi
setInterval(() => { if (document.body.classList.contains("ktgApp-on")) kgRender(); }, 30000);
akReset(); kgReset(); tgReset();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { AK.state = KG.state = TG.state = "off"; akRender(); kgRender(); tgRender(); return; }
  MK.mcp = mcp;
  [[AK, AK_RANGE, akApply, akRender], [KG, KG_RANGE, kgApply, kgRender], [TG, TG_RANGE, tgApply, tgRender]].forEach(([o, range, apply, render]) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        if (o.state !== "ok" || !o.list.length) o.state = (ev.error && ev.error.code) || "upstream_error";
        render();
      }, { refetchInterval:120000 });
    } catch (e) {}
  });
})();
mkRoute();
