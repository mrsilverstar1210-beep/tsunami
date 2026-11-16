// ===== Tsunami: Ma'lumotnoma → Narx o'rnatish (sotuv narxi, min / max chegara) va Narx tarixi =====
// Narx nazorati administrator tomonidan yoqilganda sotuv formasida narx belgilangan oraliqdan chiqib bo'lmaydi.
const NR_RANGE = "Narxlar!A1:J30000", NS_RANGE = "'Narx sozlamalari'!A1:E2000";
const NR = { log:[], cur:{}, state:"loading", busy:false, admin:false, adminKnown:false, mcp:null, q:"", cat:"", flt:"all", edit:"", show:100, msg:"", msgT:null, histQ:"" };
NR.bk = { mk:"", mkT:"USD", min:"", max:"", cur:"", rate:(() => { try { return localStorage.getItem("tsunami_rate") || ""; } catch (e) { return ""; } })(), rnd:"1000" };
const NS = { list:[], on:false, strict:false, onAt:"", state:"loading" };
const nrK = s => String(s || "").trim().toLowerCase();
const nrR = (v, cur) => cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v);
function nrId() { return "N" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
(function nrBuild() {
  const el = document.createElement("div");
  el.id = "nrApp";
  el.innerHTML = `<div class="panel" id="nrCtl"></div>
    <div class="panel"><div class="thead"><h3>Tovar narxlari</h3><div class="hbtns"><input class="search" id="nrQ" placeholder="Qidirish: nomi, shtrix-kod, artikul"><select id="nrCat"></select><div class="filters" id="nrFlt"></div></div></div>
      <div id="nrBulk"></div><div class="status" id="nrStatus"></div><div id="nrList"></div></div>`;
  $("kirimApp").parentNode.insertBefore(el, $("kirimApp"));
  const h = document.createElement("div");
  h.id = "nrHist";
  h.innerHTML = `<div class="panel"><div class="thead"><h3>Narx tarixi</h3><input class="search" id="nrHQ" placeholder="Qidirish: tovar nomi"></div><div class="tmeta">Har bir narx o'zgarishi shu yerda saqlanadi: kim, qachon, qanday narx qo'ydi.</div><div id="nrHList"></div></div>`;
  $("kirimApp").parentNode.insertBefore(h, $("kirimApp"));
  const st = document.createElement("style");
  st.textContent = "#nrApp,#nrHist{display:none}.nrApp-on #nrApp,.nrHist-on #nrHist{display:block}.nrApp-on .gen,.nrApp-on #kpis,.nrHist-on .gen,.nrHist-on #kpis{display:none}"
    + ".nrctl{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}.nrsw{display:flex;gap:12px;align-items:flex-start;flex:1 1 320px;border:1px solid var(--line);border-radius:12px;padding:12px 14px}.nrsw b{display:block;margin-bottom:2px}.nrsw.on{border-color:#16a34a;background:#f0fdf4}.nrsw .switch input:disabled+span{cursor:not-allowed;opacity:.6}"
    + "#nrList input.sm{width:92px!important;display:inline-block}#nrList select.sm{width:100px!important;display:inline-block}#nrList td{white-space:nowrap}#nrList td:first-child{white-space:normal;min-width:170px}#nrList td{vertical-align:middle}.nrbad{color:#b91c1c;font-weight:600}.nrwarn{color:#b45309}.nrrange{font-size:12px;color:#475569;white-space:nowrap}"
    + ".nrbulk{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#f8fafc;border:1px dashed var(--line);border-radius:10px;padding:10px 12px;margin:0 0 10px;font-size:13px}.nrbulk input{width:70px!important;flex:none}.nrbulk select{width:auto!important;flex:none}"
    + "#slRows input.nrout{border-color:#dc2626!important;background:#fef2f2}#slRows .nrhint{display:block;font-size:11px;color:#64748b;margin-top:2px;white-space:nowrap}#slRows .nrhint.bad{color:#b91c1c;font-weight:600}";
  document.head.appendChild(st);
})();

// ---------- ma'lumot ----------
function nrParse(vals) {
  const log = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0] || !String(r[2] || "").trim()) return;
    const num = x => String(x == null ? "" : x).trim() === "" ? null : Number(String(x).replace(/\s/g, "").replace(",", "."));
    log.push({ id:String(r[0]), at:String(r[1] || ""), name:String(r[2]).trim(), cur:String(r[3] || "UZS") === "USD" ? "USD" : "UZS", price:num(r[4]), min:num(r[5]), max:num(r[6]), off:String(r[7] || "") === "O'chirilgan", by:String(r[8] || ""), note:String(r[9] || "") });
  });
  return log;
}
function nrApply(vals) {
  NR.log = nrParse(vals); NR.cur = {};
  NR.log.slice().sort((a, b) => String(a.at).localeCompare(String(b.at))).forEach(x => { if (x.off) delete NR.cur[nrK(x.name)]; else NR.cur[nrK(x.name)] = x; });
  NR.state = "ok"; nrRenderAll();
}
function nsApply(vals) {
  NS.list = (Array.isArray(vals) ? vals : []).filter((r, i) => i && Array.isArray(r) && r[0]).map(r => ({ key:String(r[0]), val:String(r[1] || ""), at:String(r[2] || ""), by:String(r[3] || "") })).sort((a, b) => a.at.localeCompare(b.at));
  const last = k => NS.list.filter(x => x.key === k).pop();
  const a = last("nazorat"), b = last("narxsiz");
  NS.on = !!a && a.val === "Yoqilgan"; NS.onAt = a ? a.at : "";
  NS.strict = !!b && b.val === "Taqiqlangan";
  NS.state = "ok"; nrRenderAll(); nrSaleHints();
}
async function nrReload() { const r = await NR.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:NR_RANGE }, { cache:false }); nrApply(krVals({ result:r })); }
async function nsReload() { const r = await NR.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:NS_RANGE }, { cache:false }); nsApply(krVals({ result:r })); }
function nrRule(name) { return NR.cur[nrK(name)] || null; }
// Ombordagi qoldiq va o'rtacha tannarx (tovar nomi bo'yicha)
function nrStock() {
  const m = {};
  if (typeof omLedger !== "function") return m;
  let L; try { L = omLedger(); } catch (e) { return m; }
  const add = (name, qty, cost, cur) => { const k = nrK(name), o = m[k] || (m[k] = { qty:0, by:{} }); o.qty += qty; const c = o.by[cur] || (o.by[cur] = { q:0, s:0 }); c.q += qty; c.s += qty * (Number(cost) || 0); };
  L.units.filter(u => u.st === "in").forEach(u => add(u.name, 1, u.cost, u.cur || "USD"));
  L.lots.forEach(l => add(l.name, Number(l.qty) || 0, l.cost, l.cur || "USD"));
  Object.values(m).forEach(o => { const best = Object.entries(o.by).sort((a, b) => b[1].q - a[1].q)[0]; o.cost = best && best[1].q ? best[1].s / best[1].q : 0; o.cur = best ? best[0] : "USD"; });
  return m;
}
function nrWho(id) { return id ? (NR.names && NR.names[id]) || "administrator" : ""; }

// ---------- boshqaruv kartasi (faqat administrator yoqadi / o'chiradi) ----------
function nrCtlRender() {
  if (!$("nrCtl")) return;
  const dis = NR.admin ? "" : " disabled";
  $("nrCtl").innerHTML = `<div class="thead"><h3>Narx nazorati</h3>${NR.admin ? `<span class="tmeta">Siz administratorsiz</span>` : ""}</div>
    <div class="nrctl">
      <div class="nrsw${NS.on ? " on" : ""}"><label class="switch"><input type="checkbox" id="nrOn"${NS.on ? " checked" : ""}${dis}><span></span></label><div><b>${NS.on ? "Yoqilgan" : "O'chirilgan"}: narx chegarasi</b><div class="tmeta">Yoqilganda sotuvchi tovarni belgilangan min dan arzon yoki max dan qimmat sota olmaydi. Ma'muriy chegirma (Marketing → Chegirma) qo'llangan narxga ruxsat beriladi.${NS.onAt ? `<br>Oxirgi o'zgarish: ${esc(fmt(NS.onAt))}` : ""}</div></div></div>
      <div class="nrsw${NS.strict ? " on" : ""}"><label class="switch"><input type="checkbox" id="nrStrict"${NS.strict ? " checked" : ""}${dis}${NS.on ? "" : " disabled"}><span></span></label><div><b>Narxi belgilanmagan tovarni sotish</b><div class="tmeta">${NS.strict ? "Taqiqlangan: narxi o'rnatilmagan tovarni sotib bo'lmaydi." : "Ruxsat: narxi o'rnatilmagan tovarni istalgan narxda sotish mumkin."} Faqat nazorat yoqilganda ishlaydi.</div></div></div>
    </div>${NR.admin ? "" : `<div class="tmeta" style="margin-top:8px">Narxlarni o'zgartirish va nazoratni yoqish faqat administrator (Tsunami egasi yoki tahrirlash huquqi bor foydalanuvchi) uchun.</div>`}`;
}
async function nsSet(key, val) {
  if (!NR.admin || NR.busy || !NR.mcp) return;
  NR.busy = true;
  try { await NR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Narx sozlamalari'!A1", values:[[key, krT(val), krT(new Date().toISOString()), krT(NR.me || ""), ""]] }); await nsReload(); nrSay(key === "nazorat" ? `Narx nazorati ${val === "Yoqilgan" ? "yoqildi" : "o'chirildi"}.` : `Narxi belgilanmagan tovarni sotish: ${val === "Taqiqlangan" ? "taqiqlandi" : "ruxsat berildi"}.`); }
  catch (e) { nrSay(krCodeMsg(e && e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."); }
  NR.busy = false; nrCtlRender();
}

// ---------- tovarlar ro'yxati ----------
function nrSay(m) { NR.msg = m; clearTimeout(NR.msgT); NR.msgT = setTimeout(() => { NR.msg = ""; nrListRender(); }, 7000); nrListRender(); }
function nrRows() {
  const q = nrK(NR.q), sub = NR.cat && typeof ktSubtree === "function" ? ktSubtree(NR.cat) : null;
  return TV.list.filter(t => {
    if (sub && !sub.has(t.catId)) return false;
    if (q && !(nrK(t.name).indexOf(q) >= 0 || nrK(t.barcode).indexOf(q) >= 0 || nrK(t.sku).indexOf(q) >= 0)) return false;
    const r = nrRule(t.name);
    if (NR.flt === "set") return !!r; if (NR.flt === "none") return !r; if (NR.flt === "stock") return !!(NR.stock[nrK(t.name)] && NR.stock[nrK(t.name)].qty > 0);
    return true;
  });
}
function nrFill() {
  if ($("nrCat") && typeof ktOptions === "function") { const v = NR.cat; $("nrCat").innerHTML = `<option value="">Barcha kategoriyalar</option>` + ktTree().map(({ c, d }) => `<option value="${esc(c.id)}"${c.id === v ? " selected" : ""}>${"— ".repeat(d)}${esc(c.name)}</option>`).join(""); }
}
function nrListRender() {
  if (!$("nrList")) return;
  NR.stock = nrStock();
  const all = TV.list.length, set = TV.list.filter(t => nrRule(t.name)).length;
  $("nrFlt").innerHTML = [["all", `Barchasi (${all})`], ["set", `Narxi bor (${set})`], ["none", `Narxsiz (${all - set})`], ["stock", "Omborda bor"]].map(([k, l]) => `<button data-nrf="${k}" class="${NR.flt === k ? "on" : ""}">${l}</button>`).join("");
  const rows = nrRows();
  $("nrStatus").textContent = [NR.state === "loading" ? "Yuklanmoqda…" : NR.state === "off" ? "Narxlar bazasiga ulanib bo'lmadi: sahifani claude.ai'da oching." : "", NR.msg].filter(Boolean).join(" ");
  $("nrBulk").innerHTML = NR.admin && rows.length ? `<div class="nrbulk"><b>Ro'yxatdagi ${rows.length} ta tovarga birdan:</b>
      <span>Narx = tannarx +</span><input type="number" id="nbMk" min="0" step="any" placeholder="15" value="${esc(NR.bk.mk)}"><select id="nbMkT">${[["USD", "$"], ["UZS", "so'm"], ["pct", "%"]].map(([v, l]) => `<option value="${v}"${NR.bk.mkT === v ? " selected" : ""}>${l}</option>`).join("")}</select>
      <span>· Min = narx −</span><input type="number" id="nbMin" min="0" step="any" placeholder="5" value="${esc(NR.bk.min)}"><span>%</span><span>· Max = narx +</span><input type="number" id="nbMax" min="0" step="any" placeholder="10" value="${esc(NR.bk.max)}"><span>%</span>
      <span>· Narx valyutasi</span><select id="nbCur">${[["", "tannarx valyutasida"], ["UZS", "so'm"], ["USD", "$"]].map(([v, l]) => `<option value="${v}"${NR.bk.cur === v ? " selected" : ""}>${l}</option>`).join("")}</select>
      <span>· Kurs 1 $ =</span><input type="number" id="nbRate" min="0" step="1" style="width:90px" placeholder="so'm" value="${esc(NR.bk.rate)}"><span>· So'mni yaxlitlash</span><select id="nbRnd">${[["1", "yo'q"], ["1000", "1 000"], ["10000", "10 000"], ["50000", "50 000"]].map(([v, l]) => `<option value="${v}"${NR.bk.rnd === v ? " selected" : ""}>${l}</option>`).join("")}</select>
      <button type="button" class="mini" id="nbGo">Qo'llash</button><span class="tmeta">Bo'sh qoldirilgan maydon o'zgarmaydi. Tannarx yoki ustama boshqa valyutada bo'lsa, kurs bo'yicha o'tkaziladi. Faqat valyuta tanlansa — mavjud narxlar kurs bo'yicha shu valyutaga o'tkaziladi. Tannarxi yo'q tovarga narx qo'yilmaydi.</span></div>` : "";
  if (!rows.length) { $("nrList").innerHTML = `<div class="empty-box">${TV.state === "ok" ? "Tovar topilmadi" : ""}</div>`; return; }
  const show = rows.slice(0, NR.show);
  $("nrList").innerHTML = `<table><thead><tr><th>Tovar</th><th class="num">Qoldiq</th><th class="num">Tannarx</th><th class="num">Sotuv narxi</th><th>Chegara (min – max)</th><th class="num">Ustama</th><th>Valyuta</th><th></th></tr></thead><tbody>` + show.map(t => {
    const k = nrK(t.name), r = nrRule(t.name), s = NR.stock[k];
    const cat = (t.catId && typeof ktPath === "function" && ktPath(t.catId)) || t.cat || "";
    if (NR.edit === k && NR.admin) {
      const cur = r ? r.cur : (s ? s.cur : "UZS");
      return `<tr data-nr="${esc(k)}"><td><b>${esc(t.name)}</b><div class="tmeta">${esc(cat)}</div></td><td class="num">${s ? s.qty : 0}</td><td class="num">${s && s.cost ? krMoney(s.cost, s.cur) : "—"}</td>
        <td class="num"><input class="sm" type="number" min="0" step="any" id="neP" value="${r && r.price != null ? r.price : ""}" placeholder="narx"> <select class="sm" id="neC"><option value="UZS"${cur === "UZS" ? " selected" : ""}>so'm</option><option value="USD"${cur === "USD" ? " selected" : ""}>$ (dollar)</option></select></td>
        <td><input class="sm" type="number" min="0" step="any" id="neMin" value="${r && r.min != null ? r.min : ""}" placeholder="min"> – <input class="sm" type="number" min="0" step="any" id="neMax" value="${r && r.max != null ? r.max : ""}" placeholder="max"></td>
        <td></td><td colspan="2" class="krAct"><button type="button" class="pri mini" data-nrsave="${esc(k)}">Saqlash</button> <button type="button" class="mini" data-nrx>Bekor</button>${r ? ` <button type="button" class="mini" data-nrdel="${esc(k)}">${NR.pendDel === k ? "Ha, olib tashlash" : "Narxni olib tashlash"}</button>` : ""}<div class="status" id="neMsg"></div></td></tr>`;
    }
    const rt = Number(NR.bk.rate) || 0, costIn = r && s && s.cost ? (s.cur === r.cur ? s.cost : rt ? (s.cur === "USD" ? s.cost * rt : s.cost / rt) : null) : null;
    const mk = r && r.price != null && costIn ? Math.round((r.price - costIn) / costIn * 1000) / 10 : null;
    const low = r && r.min != null && costIn && r.min < costIn;
    return `<tr><td><b>${esc(t.name)}</b><div class="tmeta">${esc(cat)}</div></td><td class="num">${s ? s.qty : 0}</td><td class="num">${s && s.cost ? krMoney(s.cost, s.cur) : "—"}</td>
      <td class="num">${r && r.price != null ? `<b>${krMoney(r.price, r.cur)}</b>` : `<span class="tmeta">belgilanmagan</span>`}</td>
      <td class="nrrange">${r && (r.min != null || r.max != null) ? `${r.min != null ? krMoney(r.min, r.cur) : "…"} – ${r.max != null ? krMoney(r.max, r.cur) : "…"}${low ? `<div class="nrbad">min tannarxdan past!</div>` : ""}` : "—"}</td>
      <td class="num">${mk == null ? "—" : `<span class="${mk < 0 ? "nrbad" : ""}">${mk > 0 ? "+" : ""}${mk}%</span>`}</td>
      <td>${r ? (r.cur === "USD" ? "$ (dollar)" : "so'm") : "—"}</td><td class="krAct">${NR.admin ? `<button type="button" data-nredit="${esc(k)}">${r ? "Tahrirlash" : "Narx qo'yish"}</button>` : ""}</td></tr>`;
  }).join("") + `</tbody></table>` + (rows.length > NR.show ? `<div class="kbtns"><button type="button" class="sec" id="nrMore">Yana ko'rsatish (${rows.length - NR.show} ta qoldi)</button></div>` : "");
}
function nrRenderAll() { nrCtlRender(); nrFill(); nrListRender(); nrHistRender(); }
function nrMsgE(m) { const x = $("neMsg"); if (x) { x.textContent = m; x.classList.add("err"); } }
function nrRowOf(name, cur, price, min, max, off, note) { return [krT(nrId()), krT(new Date().toISOString()), krT(name), cur, price == null ? "" : price, min == null ? "" : min, max == null ? "" : max, off ? "O'chirilgan" : "Faol", krT(NR.me || ""), krT(note || "")]; }
async function nrSaveOne(k) {
  if (!NR.admin || NR.busy || !NR.mcp) return;
  const t = TV.list.find(x => nrK(x.name) === k); if (!t) return;
  const v = id => { const s = String($(id).value).trim(); return s === "" ? null : Number(s); };
  const cur = $("neC").value, price = v("neP"), min = v("neMin"), max = v("neMax");
  for (const [n, x] of [["Narx", price], ["Min", min], ["Max", max]]) if (x != null && !(x >= 0)) return nrMsgE(`${n}ni to'g'ri kiriting.`);
  if (price == null && min == null && max == null) return nrMsgE("Kamida narx yoki chegarani kiriting.");
  if (min != null && max != null && min > max) return nrMsgE("Min max dan katta bo'lmasin.");
  if (price != null && min != null && price < min) return nrMsgE("Sotuv narxi min dan past bo'lmasin.");
  if (price != null && max != null && price > max) return nrMsgE("Sotuv narxi max dan yuqori bo'lmasin.");
  NR.busy = true;
  try { await NR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Narxlar!A1", values:[nrRowOf(t.name, cur, price, min, max, false, "")] }); NR.edit = ""; await nrReload(); nrSay(`«${t.name}» narxi saqlandi.`); }
  catch (e) { nrMsgE(krCodeMsg(e && e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."); }
  NR.busy = false;
}
async function nrDelOne(k) {
  if (!NR.admin || NR.busy || !NR.mcp) return;
  if (NR.pendDel !== k) { NR.pendDel = k; return nrListRender(); }
  const r = nrRule(k); if (!r) return;
  NR.busy = true;
  try { await NR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Narxlar!A1", values:[nrRowOf(r.name, r.cur, null, null, null, true, "Narx olib tashlandi")] }); NR.edit = ""; NR.pendDel = ""; await nrReload(); nrSay(`«${r.name}» narxi olib tashlandi.`); }
  catch (e) { nrMsgE(krCodeMsg(e && e.code) || "Saqlab bo'lmadi."); }
  NR.busy = false;
}
function nrBkRead() { ["mk", "mkT", "min", "max", "cur", "rate", "rnd"].forEach(k => { const el = $("nb" + k.charAt(0).toUpperCase() + k.slice(1)); if (el) NR.bk[k] = el.value; }); }
async function nrBulk() {
  if (!NR.admin || NR.busy || !NR.mcp) return;
  nrBkRead();
  const g = v => String(v).trim() === "" ? null : Number(v);
  const mk = g(NR.bk.mk), mkT = NR.bk.mkT, pMin = g(NR.bk.min), pMax = g(NR.bk.max), tCur = NR.bk.cur, rate = g(NR.bk.rate), rnd = Number(NR.bk.rnd) || 1;
  if (mk == null && pMin == null && pMax == null && !tCur) return nrSay("Ommaviy o'zgartirish uchun kamida bitta maydonni to'ldiring.");
  if ([mk, pMin, pMax].some(x => x != null && !(x >= 0)) || (rate != null && !(rate > 0))) return nrSay("Raqamlarni to'g'ri kiriting.");
  if (pMin != null && pMin >= 100) return nrSay("Min foizi 100 dan kichik bo'lsin.");
  if (rate) { try { localStorage.setItem("tsunami_rate", String(rate)); } catch (e) {} }
  const conv = (v, from, to) => v == null ? null : from === to ? v : rate ? (from === "USD" ? v * rate : v / rate) : undefined;
  const fin = (v, cur) => v == null ? null : cur === "UZS" ? Math.round(v / rnd) * rnd : Math.round(v * 100) / 100;
  const out = [];
  let skipped = 0, needRate = 0;
  nrRows().forEach(t => {
    const k = nrK(t.name), r = nrRule(t.name), s = NR.stock[k];
    let cur, price, min = null, max = null;
    if (mk != null) {
      if (!s || !s.cost) { skipped++; return; }
      cur = tCur || s.cur;
      const base = conv(s.cost, s.cur, cur), add = mkT === "pct" ? (base == null ? null : base * mk / 100) : conv(mk, mkT, cur);
      if (base === undefined || add === undefined) { needRate++; return; }
      price = base + add;
    } else {
      if (!r || r.price == null) { skipped++; return; }
      cur = tCur || r.cur; price = conv(r.price, r.cur, cur);
      min = conv(r.min, r.cur, cur); max = conv(r.max, r.cur, cur);
      if (price === undefined || min === undefined || max === undefined) { needRate++; return; }
    }
    if (mk != null && r && r.cur === cur) { min = r.min; max = r.max; }
    if (pMin != null) min = price * (1 - pMin / 100);
    if (pMax != null) max = price * (1 + pMax / 100);
    price = fin(price, cur); min = fin(min, cur); max = fin(max, cur);
    if (min != null && min > price) min = price; if (max != null && max < price) max = price;
    out.push(nrRowOf(t.name, cur, price, min, max, false, "Ommaviy o'zgartirish"));
  });
  if (needRate && !out.length) return nrSay(`Valyutalar har xil: «Kurs 1 $ =» maydoniga kursni kiriting.`);
  if (!out.length) return nrSay(`O'zgartiriladigan tovar yo'q (${skipped} tasida narx yoki tannarx yo'q).`);
  NR.busy = true; nrSay(`${out.length} ta tovar saqlanmoqda…`);
  try { for (let i = 0; i < out.length; i += 300) await NR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Narxlar!A1", values:out.slice(i, i + 300) }); await nrReload(); nrSay(`${out.length} ta tovar narxi yangilandi${skipped ? `, ${skipped} tasi o'tkazib yuborildi (narx yoki tannarx yo'q)` : ""}${needRate ? `, ${needRate} tasi kurs kiritilmagani uchun o'tkazildi` : ""}.`); }
  catch (e) { nrSay(krCodeMsg(e && e.code) || "Saqlab bo'lmadi. Bir qismi saqlangan bo'lishi mumkin — ro'yxatni tekshiring."); try { await nrReload(); } catch (x) {} }
  NR.busy = false;
}
$("nrApp").addEventListener("click", e => {
  const b = e.target.closest("button,input[type=checkbox]"); if (!b) return;
  if (b.id === "nrOn") { e.preventDefault(); nsSet("nazorat", NS.on ? "O'chirilgan" : "Yoqilgan"); return; }
  if (b.id === "nrStrict") { e.preventDefault(); nsSet("narxsiz", NS.strict ? "Ruxsat" : "Taqiqlangan"); return; }
  if (b.dataset.nrf) { NR.flt = b.dataset.nrf; NR.show = 100; nrListRender(); }
  else if (b.dataset.nredit) { NR.edit = b.dataset.nredit; NR.pendDel = ""; nrListRender(); const f = $("neP"); if (f) f.focus(); }
  else if (b.dataset.nrx !== undefined) { NR.edit = ""; NR.pendDel = ""; nrListRender(); }
  else if (b.dataset.nrsave) nrSaveOne(b.dataset.nrsave);
  else if (b.dataset.nrdel) nrDelOne(b.dataset.nrdel);
  else if (b.id === "nrMore") { NR.show += 200; nrListRender(); }
  else if (b.id === "nbGo") nrBulk();
});
$("nrApp").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.closest("tr[data-nr]")) { e.preventDefault(); nrSaveOne(e.target.closest("tr[data-nr]").dataset.nr); } });
$("nrApp").addEventListener("input", e => { if (e.target.id && e.target.id.indexOf("nb") === 0) nrBkRead(); });
$("nrApp").addEventListener("change", e => { if (e.target.id && e.target.id.indexOf("nb") === 0) nrBkRead(); });
$("nrQ").addEventListener("input", () => { NR.q = $("nrQ").value; NR.show = 100; clearTimeout(NR.qt); NR.qt = setTimeout(nrListRender, 250); });
$("nrCat").addEventListener("change", () => { NR.cat = $("nrCat").value; NR.show = 100; nrListRender(); });

// ---------- narx tarixi ----------
function nrHistRender() {
  if (!$("nrHList")) return;
  const q = nrK(NR.histQ), list = NR.log.filter(x => !q || nrK(x.name).indexOf(q) >= 0).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 300);
  const m = (v, c) => v == null ? "—" : krMoney(v, c);
  $("nrHList").innerHTML = list.length ? `<table><thead><tr><th>Vaqt</th><th>Tovar</th><th class="num">Sotuv narxi</th><th>Min – max</th><th>Izoh</th></tr></thead><tbody>` + list.map(x => `<tr class="${x.off ? "slx" : ""}"><td>${esc(fmt(x.at))}</td><td>${esc(x.name)}</td><td class="num">${x.off ? "olib tashlandi" : m(x.price, x.cur)}</td><td class="nrrange">${x.off ? "" : `${m(x.min, x.cur)} – ${m(x.max, x.cur)}`}</td><td class="small">${esc(x.note)}</td></tr>`).join("") + `</tbody></table>` : `<div class="empty-box">${NR.state === "ok" ? "Hozircha narx o'rnatilmagan" : ""}</div>`;
}
$("nrHQ").addEventListener("input", () => { NR.histQ = $("nrHQ").value; nrHistRender(); });

// ---------- sotuv formasida nazorat ----------
// Narxni sotuv valyutasiga o'tkazish (kurs kerak bo'lsa — sotuv formasidagi kurs)
function nrConv(v, from, to, rate) { if (v == null) return null; if (from === to) return v; if (!(rate > 0)) return undefined; return from === "USD" ? v * rate : v / rate; }
function nrCheckItem(it, cur, rate) {
  const name = String(it.name || "").trim(); if (!name) return null;
  const r = nrRule(name), price = Number(it.disc ? it.disc.base : it.price);
  if (!r) return NS.strict ? { bad:true, msg:`«${name}» narxi belgilanmagan — administrator Ma'lumotnoma → Narx o'rnatish'da narx qo'ysin.` } : null;
  if (r.min == null && r.max == null) return null;
  const min = nrConv(r.min, r.cur, cur, rate), max = nrConv(r.max, r.cur, cur, rate);
  if (min === undefined || max === undefined) return { bad:true, msg:`«${name}» narxi ${r.cur === "USD" ? "dollarda" : "so'mda"} belgilangan: tekshirish uchun kursni (1 $ = so'm) kiriting.`, range:"kurs kerak" };
  const range = `${min != null ? krMoney(min, cur) : "…"} – ${max != null ? krMoney(max, cur) : "…"}`;
  if (String(it.price).trim() === "" || !(price >= 0)) return { bad:false, range };
  const eps = cur === "USD" ? 0.005 : 0.5;
  if (min != null && price < min - eps) return { bad:true, range, msg:`«${name}»: ${krMoney(price, cur)} — ruxsat etilgan eng past narx ${krMoney(min, cur)}.` };
  if (max != null && price > max + eps) return { bad:true, range, msg:`«${name}»: ${krMoney(price, cur)} — ruxsat etilgan eng yuqori narx ${krMoney(max, cur)}.` };
  return { bad:false, range };
}
function nrSaleHints() {
  if (!$("slRows")) return;
  const cur = $("slCur").value, rate = Number($("slRate").value) || 0;
  document.querySelectorAll("#slRows tr[data-i]").forEach(tr => {
    const it = SL.items[Number(tr.dataset.i)], inp = tr.querySelector('[data-f="price"]'); if (!it || !inp) return;
    let h = tr.querySelector(".nrhint");
    const c = NS.on ? nrCheckItem(it, cur, rate) : null;
    inp.classList.toggle("nrout", !!(c && c.bad));
    if (!c || (!c.range && !c.bad)) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement("span"); h.className = "nrhint"; inp.parentNode.appendChild(h); }
    h.textContent = c.range ? `oraliq: ${c.range}` : "narx belgilanmagan"; h.classList.toggle("bad", !!c.bad);
  });
}
// Tovar tanlanganda narx bo'sh bo'lsa — belgilangan sotuv narxi o'zi qo'yiladi
function nrAutoPrice(i) {
  const it = SL.items[i]; if (!it || String(it.price).trim() !== "") return;
  const r = nrRule(it.name); if (!r || r.price == null) return;
  const v = nrConv(r.price, r.cur, $("slCur").value, Number($("slRate").value) || 0); if (v == null || v === undefined) return;
  it.price = nrR(v, $("slCur").value);
  const tr = document.querySelector(`#slRows tr[data-i="${i}"]`); if (tr) tr.querySelector('[data-f="price"]').value = it.price;
  slTotals();
}
if ($("slRows")) {
  $("slRows").addEventListener("change", e => { const tr = e.target.closest("tr[data-i]"); if (tr && e.target.dataset.f === "name") nrAutoPrice(Number(tr.dataset.i)); setTimeout(nrSaleHints, 0); });
  $("slRows").addEventListener("input", () => setTimeout(nrSaleHints, 0));
  ["slCur", "slRate"].forEach(id => $(id) && $(id).addEventListener("input", () => setTimeout(nrSaleHints, 0)));
  ["slCur"].forEach(id => $(id) && $(id).addEventListener("change", () => setTimeout(nrSaleHints, 0)));
  const nrOrigRows = slRows;
  slRows = function () { nrOrigRows.apply(this, arguments); nrSaleHints(); };
  // Saqlashdan oldin tekshiruv: «Sotuvni saqlash» tugmasining o'z ishlovchisidan oldin ishlaydi
  document.addEventListener("click", e => {
    if (!e.target.closest || !e.target.closest("#slSave") || !NS.on) return;
    if (NS.state !== "ok" || NR.state !== "ok") { e.stopImmediatePropagation(); e.preventDefault(); slFmsg("Narx qoidalari hali yuklanmadi — bir necha soniyadan keyin qayta bosing.", true); return; }
    const cur = $("slCur").value, rate = Number($("slRate").value) || 0;
    for (const it of SL.items) { const c = nrCheckItem(it, cur, rate); if (c && c.bad) { e.stopImmediatePropagation(); e.preventDefault(); slFmsg(c.msg, true); nrSaleHints(); return; } }
  }, true);
}

// ---------- yo'naltirish ----------
const NR_APPS = { "Narx o'rnatish":["nrApp", nrRenderAll], "Narx tarixi":["nrHist", nrHistRender] };
function nrRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "";
  Object.entries(NR_APPS).forEach(([name, [app, fn]]) => { const on = sec === "malumotnoma" && name === n; document.body.classList.toggle(app + "-on", on); if (on) fn(); });
}
const nrOrigRenderSub = renderSub;
renderSub = function (i) { nrOrigRenderSub(i); nrRoute(); };
(async () => {
  try {
    const u = window.claude && window.claude.use ? await window.claude.use("user") : null;
    if (u) {
      NR.admin = !!(await Promise.resolve(typeof u.canEdit === "function" ? u.canEdit() : false));
      try { NR.me = typeof u.id === "function" ? String(await Promise.resolve(u.id()) || "") : ""; } catch (e) { NR.me = ""; }
    }
  } catch (e) { NR.admin = false; }
  NR.adminKnown = true; nrRenderAll();
})();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { NR.state = "off"; nrRenderAll(); return; }
  NR.mcp = mcp;
  try { mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:NR_RANGE }, ev => { if (ev.type === "data" && !NR.busy) nrApply(krVals(ev)); }, { refetchInterval:120000 }); } catch (e) {}
  try { mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:NS_RANGE }, ev => { if (ev.type === "data" && !NR.busy) nsApply(krVals(ev)); }, { refetchInterval:60000 }); } catch (e) {}
  nrRoute();
})();
nrRoute();
