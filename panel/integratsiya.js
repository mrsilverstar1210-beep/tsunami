// ===== Tsunami: Integratsiya → Ulanishlar holati, Bito'dan ko'chirish, Xabar yuborish =====
const IG = { mcp:null };
const BITO_ID = "1fgsNMTOyX4_kyxFXcMT4YUSFH6SfZmh4HRS7u-ej-tE"; // Bito sinxroni jadvali
const BITO_USD = "6ac4e2e8c58ec89701f3905c", BITO_UZS = "6ac4e2e8c58ec89701f3906c";
const igK = s => String(s || "").trim().toLowerCase();
function igId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function igPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
function igVals(r) { return (krVals({ result:r }) || []); }
async function igGet(id, range) { return igVals(await IG.mcp.callTool(GS, "get_values", { spreadsheetId:id, range }, { cache:false })); }
(function igCss() {
  const st = document.createElement("style");
  st.textContent = "#igStApp,#igMgApp,#igMsgApp{display:none}.igStApp-on #igStApp,.igMgApp-on #igMgApp,.igMsgApp-on #igMsgApp{display:block}.igStApp-on .gen,.igStApp-on #kpis,.igMgApp-on .gen,.igMgApp-on #kpis,.igMsgApp-on .gen,.igMsgApp-on #kpis{display:none}"
    + ".igstep{border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0;background:#fff}.igstep h4{margin:0 0 6px}.igstep .kbtns{justify-content:flex-start}.igstep .kbtns button{padding:7px 14px;font-size:13px}.igok{color:#15803d;font-weight:600}.igbad{color:#b91c1c;font-weight:600}.igwarn{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:13px}"
    + ".igmsg textarea{width:100%;min-height:90px;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:10px;box-sizing:border-box}.igmsg a.wa{display:inline-block;padding:5px 10px;border-radius:8px;background:#16a34a;color:#fff;text-decoration:none;font-size:13px;font-weight:600}";
  document.head.appendChild(st);
})();

// ======================= ULANISHLAR HOLATI =======================
const IGS = { res:{}, busy:false };
igPanel("igStApp", `<div class="panel"><div class="thead"><h3>Ulanishlar</h3><button type="button" class="pri" id="igCheck">Hammasini tekshirish</button></div>
  <div class="tmeta">Tsunami ishlaydigan ma'lumot manbalari va ularning hozirgi holati.</div><div id="igStList"></div></div>`);
const IG_SRC = [
  { k:"base", name:"Tsunami bazasi (Google Drive)", what:"Barcha bo'limlar shu jadvalga yozadi va o'qiydi", id:() => BASE_ID, range:"Sotuvlar!A1:A2", info:async () => { const v = await igGet(BASE_ID, "Sotuvlar!A1:A5000"); return `${Math.max(0, v.length - 1)} ta sotuv yozuvi`; } },
  { k:"bito", name:"Bito sinxroni («5Tech — Bito hisobotlar»)", what:"Hisobotlar → Bito sotuvlari, Ta'minot'dagi Bito balansi, Bito'dan ko'chirish", id:() => BITO_ID, info:async () => { const v = await igGet(BITO_ID, "Holat!A1:B1"); const t = v[0] && v[0][1]; return t ? `Oxirgi sinxron: ${t}` : "Sinxron vaqti topilmadi"; } },
  { k:"bot", name:"Davomat bot («5Tech — Davomat (bot)»)", what:"Kadrlar → Davomat va ish haqi jarimalari", id:() => (typeof BOT_ID !== "undefined" ? BOT_ID : ""), info:async () => { const v = await igGet(BOT_ID, "Davomat!A1:B20000"); const l = v[v.length - 1]; return l && v.length > 1 ? `Oxirgi belgi: ${l[0]} ${l[1]} (${v.length - 1} ta yozuv)` : "Yozuv yo'q"; } },
  { k:"app", name:"Davomat ilovasi («Davomat»)", what:"Xodimlar importi va jarimalarda ism–telefon moslashuvi", id:() => (typeof APP_ID !== "undefined" ? APP_ID : ""), info:async () => { const v = await igGet(APP_ID, "Xodimlar!A1:B300"); return `${Math.max(0, v.length - 1)} ta xodim`; } }
];
async function igCheckAll() {
  if (IGS.busy || !IG.mcp) return; IGS.busy = true; $("igCheck").disabled = true;
  for (const s of IG_SRC) { IGS.res[s.k] = { st:"wait" }; igStRender(); try { IGS.res[s.k] = { st:"ok", info:await s.info(), at:new Date() }; } catch (e) { IGS.res[s.k] = { st:"bad", info:krCodeMsg(e && e.code) || "Jadvalni o'qib bo'lmadi: kirish huquqini tekshiring", at:new Date() }; } igStRender(); }
  IGS.busy = false; $("igCheck").disabled = false;
}
function igStRender() {
  if (!$("igStList")) return;
  $("igStList").innerHTML = (!IG.mcp ? `<div class="igwarn">Ulanishlarni tekshirish uchun sahifani claude.ai'da, tizimga kirgan holda oching.</div>` : "")
    + `<table><thead><tr><th>Manba</th><th>Nima uchun kerak</th><th>Holat</th><th>Ma'lumot</th></tr></thead><tbody>` + IG_SRC.map(s => { const r = IGS.res[s.k] || {}; return `<tr><td><b>${esc(s.name)}</b>${s.id() ? `<div class="tmeta"><a href="https://docs.google.com/spreadsheets/d/${esc(s.id())}/edit" target="_blank" rel="noopener">jadvalni ochish</a></div>` : ""}</td><td class="small">${esc(s.what)}</td><td>${r.st === "ok" ? `<span class="igok">✓ Ishlayapti</span>` : r.st === "bad" ? `<span class="igbad">✕ Xato</span>` : r.st === "wait" ? "Tekshirilmoqda…" : `<span class="tmeta">tekshirilmagan</span>`}</td><td class="small">${esc(r.info || "")}${r.at ? `<div class="tmeta">${esc(fmt(r.at))}</div>` : ""}</td></tr>`; }).join("")
    + `<tr><td><b>Telegram kanal post boti</b></td><td class="small">Ombordagi tovarlar narxini kanalga avtomatik joylaydi</td><td><span class="tmeta">alohida ishlaydi</span></td><td class="small">Bu bot Bito qoldig'idan foydalanadi; Tsunami'ga to'liq o'tilgach, uni Tsunami qoldig'iga ulash kerak bo'ladi.</td></tr></tbody></table>`;
}
$("igCheck").addEventListener("click", igCheckAll);

// ======================= BITO'DAN KO'CHIRISH =======================
const MG = { busy:false, prev:{}, done:{}, msg:{} };
igPanel("igMgApp", `<div class="panel"><div class="thead"><h3>Bito'dan Tsunami'ga ko'chirish</h3></div>
  <div class="igwarn"><b>Qachon qilinadi:</b> Bito'dan to'liq o'tadigan kuni, kun boshida (sotuv boshlanmasdan). Tartib bilan: 1 → 2 → 3 → 4. Har bir qadamda avval «Ko'rib chiqish» — nima qo'shilishini ko'rasiz, keyin «Ko'chirish». Takror bosilsa, bor narsa ikkinchi marta qo'shilmaydi.<br>Ko'chirilgandan keyin sotuv, kirim va to'lovlarni faqat Tsunami'da qiling — aks holda qoldiq va kassa mos kelmaydi.</div>
  <div class="igstep"><h4>1. Kategoriyalar</h4><div class="tmeta">Bito'dagi tovar kategoriyalari → Ombor → Kategoriyalar. Tsunami'da shu nomli kategoriya bo'lsa, o'tkazib yuboriladi. Keyin ularni Ombor → Kategoriyalar'da ichma-ich joylashtirishingiz mumkin (masalan, «iPhone 15 Generation»ni «Telefonlar / iPhone» ichiga) — tovarlar kategoriyasidan ajralmaydi.</div><div class="kbtns"><button type="button" class="sec" data-mgprev="cat">Ko'rib chiqish</button><button type="button" class="pri" data-mgrun="cat">Ko'chirish</button></div><div class="status" id="mgMsg_cat"></div><div id="mgPrev_cat"></div></div>
  <div class="igstep"><h4>2. Tovarlar ro'yxati</h4><div class="tmeta">Bito'dagi tovar kartochkalari (nomi, kategoriyasi, shtrix-kod, artikul, markirovka) → Ombor → Tovarlar. Tsunami'da shu nomli tovar bo'lsa, qayta qo'shilmaydi; faqat kategoriyasi bo'sh bo'lsa, Bito'dagi kategoriya qo'yiladi.</div><div class="kbtns"><button type="button" class="sec" data-mgprev="prod">Ko'rib chiqish</button><button type="button" class="pri" data-mgrun="prod">Ko'chirish</button></div><div class="status" id="mgMsg_prod"></div><div id="mgPrev_prod"></div></div>
  <div class="igstep"><h4>3. Yetkazib beruvchilar va ularning balansi</h4><div class="tmeta">Bito'dagi yetkazib beruvchilar → Ta'minot → Yetkazib beruvchilar. Bito'dagi balans «boshlang'ich balans» bo'lib yoziladi (qarzimiz shu yerdan davom etadi).</div><div class="kbtns"><button type="button" class="sec" data-mgprev="sup">Ko'rib chiqish</button><button type="button" class="pri" data-mgrun="sup">Ko'chirish</button></div><div class="status" id="mgMsg_sup"></div><div id="mgPrev_sup"></div></div>
  <div class="igstep"><h4>4. Ombor qoldig'i (IMEI va tannarx bilan)</h4><div class="tmeta">Bito'da hozir omborda turgan har bir tovar → Tsunami qoldig'i, har bir ombor uchun bitta «Inventarizatsiya (Bito'dan)» hujjati bilan. IMEI'li telefonlar IMEI bo'yicha, qolganlari soni va tannarxi bo'yicha. Xato bo'lsa — Ombor → Inventarizatsiya'da shu hujjatni bekor qilib, qayta ko'chirish mumkin.</div><div class="kbtns"><button type="button" class="sec" data-mgprev="stock">Ko'rib chiqish</button><button type="button" class="pri" data-mgrun="stock">Ko'chirish</button><button type="button" class="sec" id="mgRedo">Qayta ko'chirish (eskisini bekor qilib)</button></div><div class="status" id="mgMsg_stock"></div><div id="mgPrev_stock"></div></div>
  <div class="igstep"><h4>5. Kassadagi pul</h4><div class="tmeta">Bito'dan pul qoldig'i avtomatik olinmaydi: kassadagi haqiqiy pulni sanab, Moliya → Boshlang'ich qoldiq'ga kiriting.</div><div class="kbtns"><button type="button" class="sec" id="mgGoCash">Boshlang'ich qoldiqqa o'tish</button></div></div></div>`);
function mgMsg(k, m, bad) { const x = $("mgMsg_" + k); if (x) { x.textContent = m || ""; x.classList.toggle("err", !!bad); } }
async function mgBuild(k) {
  if (k === "cat") {
    const v = await igGet(BITO_ID, "Tovarlar!CF1:CF5000"), cnt = {}, have = new Set(KT.list.map(c => igK(c.name)));
    v.slice(1).forEach(r => { const n = String(r[0] || "").trim(); if (n) cnt[n] = (cnt[n] || 0) + 1; });
    const all = Object.keys(cnt).sort((a, b) => a.localeCompare(b)), add = all.filter(n => !have.has(igK(n)));
    return { add:add.map(n => ({ name:n, n:cnt[n] })), total:all.length, skip:all.length - add.length };
  }
  if (k === "prod") {
    const v = await igGet(BITO_ID, "Tovarlar!A1:CF5000"), byName = {}, seen = new Set(), add = [], fix = [], noCat = new Set();
    TV.list.forEach(t => { byName[igK(t.name)] = t; });
    const catOf = n => { const c = n ? KT.list.find(x => igK(x.name) === igK(n)) : null; if (n && !c) noCat.add(n); return c; };
    v.slice(1).forEach(r => {
      const name = String(r[5] || "").trim(); if (!name || seen.has(igK(name))) return; seen.add(igK(name));
      const cn = String(r[83] || "").trim(), c = catOf(cn), t = byName[igK(name)];
      if (t) { if (c && !t.catId && !t.cat) fix.push({ t, c }); return; }
      add.push({ name, sku:String(r[16] || ""), barcode:String(r[17] || ""), marked:String(r[24] || "").toUpperCase() === "TRUE", cat:c });
    });
    return { add, fix, noCat:[...noCat], total:seen.size, skip:seen.size - add.length };
  }
  if (k === "sup") {
    const v = await igGet(BITO_ID, "Postavshiklar!A1:V500"), have = new Set(PARTY.supApp.list.map(s => igK(s.name))), seen = new Set(), add = [];
    v.slice(1).forEach(r => { if (String(r[1]).toUpperCase() === "TRUE" || String(r[4]).toUpperCase() === "TRUE") return; const name = String(r[6] || "").trim(); if (!name || have.has(igK(name)) || seen.has(igK(name))) return; seen.add(igK(name)); add.push({ name, phone:String(r[7] || ""), type:String(r[5] || "") === "legal" ? "Yuridik shaxs" : "Jismoniy shaxs", bal:Number(r[14]) || 0, cur:String(r[16] || "") === BITO_UZS ? "UZS" : "USD" }); });
    return { add, total:v.length - 1, skip:v.length - 1 - add.length };
  }
  // Ombor qoldig'i: state = stock
  const v = await igGet(BITO_ID, "'Ombor qoldiq'!A1:BW20000"), groups = {}, units = new Set(omLedger().units.filter(u => u.st === "in").map(u => u.imei));
  let dupImei = 0;
  v.slice(1).forEach(r => {
    if (String(r[3]) !== "stock") return;
    const org = String(r[25] || "").trim(), wh = String(r[27] || "").trim(), name = String(r[14] || "").trim(); if (!name || !org || !wh) return;
    const qty = Number(r[4]) || 0, cost = Number(r[6]) || 0, cur = String(r[7] || "") === BITO_UZS ? "UZS" : "USD", mark = String(r[69] || "").trim();
    const g = groups[org + "|" + wh] || (groups[org + "|" + wh] = { org, wh, items:{}, units:0, qty:0, cost:{} });
    if (mark) { if (units.has(mark)) { dupImei++; return; } const k2 = name + "|" + cost + "|" + cur, it = g.items[k2] || (g.items[k2] = { name, extra:[], cost, cur, diff:0 }); if (it.extra.indexOf(mark) < 0) { it.extra.push(mark); g.units++; g.cost[cur] = (g.cost[cur] || 0) + cost; } }
    else if (qty > 0) { const k2 = name + "|" + cost + "|" + cur + "|q", it = g.items[k2] || (g.items[k2] = { name, diff:0, cost, cur }); it.diff += qty; g.qty += qty; g.cost[cur] = (g.cost[cur] || 0) + cost * qty; }
  });
  const already = OMV.list.filter(m => !m.cancelled && m.type === "inv" && /Bito'dan import/.test(m.note)).map(m => m.forg + "|" + m.fwh);
  return { groups:Object.values(groups), already, dupImei };
}
function mgShow(k, p) {
  const box = $("mgPrev_" + k); if (!box) return;
  if (k === "cat") box.innerHTML = `<div class="tmeta">Bito'da ${p.total} ta kategoriya · yangi qo'shiladi: <b>${p.add.length}</b> · Tsunami'da bor: ${p.skip}</div>` + (p.add.length ? `<table><thead><tr><th>Kategoriya</th><th>Tovarlar soni</th></tr></thead><tbody>${p.add.slice(0, 40).map(x => `<tr><td>${esc(x.name)}</td><td class="num">${x.n}</td></tr>`).join("")}</tbody></table>${p.add.length > 40 ? `<div class="tmeta">… va yana ${p.add.length - 40} ta</div>` : ""}` : "");
  else if (k === "prod") box.innerHTML = `<div class="tmeta">Bito'da ${p.total} ta tovar · yangi qo'shiladi: <b>${p.add.length}</b> · Tsunami'da bor: ${p.skip}${p.fix.length ? ` (shundan ${p.fix.length} tasiga kategoriya qo'yiladi)` : ""}</div>` + (p.noCat.length ? `<div class="igwarn">${p.noCat.length} ta Bito kategoriyasi Tsunami'da yo'q (${p.noCat.slice(0, 5).map(esc).join(", ")}${p.noCat.length > 5 ? "…" : ""}). Avval 1-qadamni bajaring, aks holda bu tovarlar kategoriyasiz qo'shiladi.</div>` : "") + (p.add.length ? `<table><thead><tr><th>Nomi</th><th>Kategoriya</th><th>Shtrix-kod</th><th>Artikul</th><th>Markirovka</th></tr></thead><tbody>${p.add.slice(0, 30).map(x => `<tr><td>${esc(x.name)}</td><td class="small">${x.cat ? esc(ktPath(x.cat.id)) : "—"}</td><td class="mono">${esc(x.barcode)}</td><td class="mono">${esc(x.sku)}</td><td>${x.marked ? "Ha" : "—"}</td></tr>`).join("")}</tbody></table>${p.add.length > 30 ? `<div class="tmeta">… va yana ${p.add.length - 30} ta</div>` : ""}` : "");
  else if (k === "sup") box.innerHTML = `<div class="tmeta">Bito'da ${p.total} ta · yangi qo'shiladi: <b>${p.add.length}</b> · Tsunami'da bor: ${p.skip}</div>` + (p.add.length ? `<table><thead><tr><th>Nomi</th><th>Telefon</th><th>Bito balansi</th></tr></thead><tbody>${p.add.map(x => `<tr><td>${esc(x.name)}</td><td class="mono">${esc(x.phone)}</td><td class="num">${x.bal ? krMoney(x.bal, x.cur) + `<div class="tmeta">${x.bal > 0 ? "biz qarzmiz" : "avans berilgan"}</div>` : "0"}</td></tr>`).join("")}</tbody></table>` : "");
  else box.innerHTML = (p.dupImei ? `<div class="tmeta">${p.dupImei} ta IMEI Tsunami qoldig'ida allaqachon bor — o'tkaziladi.</div>` : "") + `<table><thead><tr><th>Tashkilot / ombor</th><th>IMEI'li</th><th>Soni bo'yicha</th><th>Tannarx</th><th>Holat</th></tr></thead><tbody>${p.groups.map(g => `<tr><td>${esc(g.org)}<div class="tmeta">${esc(g.wh)}</div></td><td class="num">${g.units}</td><td class="num">${g.qty}</td><td class="num">${Object.entries(g.cost).map(([c, x]) => krMoney(x, c)).join(" + ") || "—"}</td><td>${p.already.indexOf(g.org + "|" + g.wh) >= 0 ? `<span class="tmeta">allaqachon ko'chirilgan</span>` : `<span class="igok">ko'chiriladi</span>`}</td></tr>`).join("")}</tbody></table>`;
}
async function mgPreview(k) {
  if (MG.busy || !IG.mcp) return mgMsg(k, krDbLine() || "Sahifani claude.ai'da oching.", true);
  MG.busy = true; mgMsg(k, "Bito jadvalidan o'qilmoqda…");
  try { const p = await mgBuild(k); MG.prev[k] = p; mgShow(k, p); mgMsg(k, ""); } catch (e) { mgMsg(k, krCodeMsg(e && e.code) || "Bito jadvalini o'qib bo'lmadi.", true); }
  MG.busy = false;
}
async function mgRun(k) {
  if (MG.busy || !IG.mcp) return mgMsg(k, krDbLine() || "Sahifani claude.ai'da oching.", true);
  MG.busy = true; mgMsg(k, "Ko'chirilmoqda…");
  try {
    // Yozishdan oldin ikkala tomon ham yangidan o'qiladi (takror qo'shilmasligi uchun)
    if (k === "cat") await ktReload(); else if (k === "prod") { await ktReload(); await tvReload(); } else if (k === "sup") await PARTY.supApp.reload(); else { await omvReload(); await krReload(); }
    const p = await mgBuild(k), now = new Date().toISOString(); MG.prev[k] = p; mgShow(k, p);
    if (k === "cat") {
      if (!p.add.length) { mgMsg(k, "Yangi kategoriya yo'q — hammasi Tsunami'da bor."); throw null; }
      await IG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Kategoriyalar!A1", values:p.add.map(x => [krT(igId("C")), krT(x.name), "", krT(x.name), "Faol", krT(now), krT(now)]) });
      mgMsg(k, `${p.add.length} ta kategoriya qo'shildi. Endi 2-qadam: tovarlar shu kategoriyalarga bog'lanadi.`); try { await ktReload(); } catch (e) {}
    } else if (k === "prod") {
      if (!p.add.length && !p.fix.length) { mgMsg(k, "Yangi tovar yo'q — hammasi Tsunami'da bor va kategoriyalari qo'yilgan."); throw null; }
      const orgs = Object.keys(KR.orgs).sort().join(", ");
      for (let i = 0; i < p.add.length; i += 300) await IG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Tovarlar!A1", values:p.add.slice(i, i + 300).map(x => [krT(igId("T")), krT(x.name), krT(x.cat ? ktPath(x.cat.id) : ""), krT(x.barcode), krT(x.sku), x.marked ? "Ha" : "Yo'q", krT(orgs), "Faol", krT(now), krT(now), x.cat ? krT(x.cat.id) : ""]) });
      if (p.fix.length) {
        // Mavjud tovarlarga kategoriya: C va K ustunlari bitta yozuvda (jadvaldagi xom qatorlar asosida — boshqa qatorlar o'zgarmaydi)
        const raw = await igGet(BASE_ID, "Tovarlar!A1:K5000"), fx = {};
        p.fix.forEach(f => { fx[f.t.id] = f.c; });
        const colC = [], colK = [];
        raw.slice(1).forEach(r => { const c = r && fx[String(r[0] || "")]; colC.push([krT(c && !String(r[2] || "") ? ktPath(c.id) : String((r && r[2]) || ""))]); colK.push([krT(c && !String(r[10] || "") ? c.id : String((r && r[10]) || ""))]); });
        if (colC.length) {
          await IG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Tovarlar!C2:C${colC.length + 1}`, values:colC });
          await IG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Tovarlar!K2:K${colK.length + 1}`, values:colK });
        }
      }
      mgMsg(k, `${p.add.length} ta tovar qo'shildi${p.fix.length ? `, ${p.fix.length} ta mavjud tovarga kategoriya qo'yildi` : ""}.${p.add.some(x => !x.cat) ? " Kategoriyasizlarini Ombor → Tovarlar'da belgilang." : ""}`); try { await tvReload(); } catch (e) {}
    } else if (k === "sup") {
      if (!p.add.length) { mgMsg(k, "Yangi yetkazib beruvchi yo'q."); throw null; }
      await IG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Yetkazib beruvchilar'!A1", values:p.add.map(x => { const row = Array(14).fill(""); row[0] = krT(igId("S")); row[1] = krT(x.type); row[2] = krT(x.name); row[3] = krT(typeof ptPhone === "function" ? ptPhone(x.phone) : x.phone); row[8] = x.cur; row[9] = krT("Bito'dan ko'chirildi"); row[10] = "Faol"; row[11] = krT(now); row[12] = krT(now); row[13] = x.bal || ""; return row; }) });
      mgMsg(k, `${p.add.length} ta yetkazib beruvchi balansi bilan qo'shildi.`); try { await PARTY.supApp.reload(); } catch (e) {}
    } else {
      const todo = p.groups.filter(g => p.already.indexOf(g.org + "|" + g.wh) < 0 && Object.keys(g.items).length);
      if (!todo.length) { mgMsg(k, "Ko'chiriladigan ombor yo'q (hammasi ko'chirilgan yoki bo'sh)."); throw null; }
      // Bito'dagi ombor Tsunami ro'yxatida bo'lmasa — Skladlar'ga qo'shiladi
      const newWh = todo.filter(g => !(KR.orgs[g.org] || []).some(w => w === g.wh));
      if (newWh.length) { await IG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Skladlar!A1", values:newWh.map(g => [krT(igId("W")), krT(g.org), krT(g.wh), "Faol", krT(now)]) }); newWh.forEach(g => { (KR.orgs[g.org] = KR.orgs[g.org] || []).push(g.wh); }); }
      let number = OMV.list.reduce((m, x) => Math.max(m, x.number), 0);
      for (const g of todo) {
        number++;
        await IG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Ombor harakatlari'!A1", values:[[krT(igId("H")), number, "Inventarizatsiya", "Yakunlangan", krT(new Date().toLocaleDateString("en-CA")), krT(g.org + "|" + g.wh), "", krT(JSON.stringify(Object.values(g.items))), "", krT("Bito'dan import (boshlang'ich qoldiq)"), krT(now), ""]] });
      }
      mgMsg(k, `${todo.length} ta ombor qoldig'i ko'chirildi: ${todo.reduce((a, g) => a + g.units, 0)} ta IMEI va ${todo.reduce((a, g) => a + g.qty, 0)} dona boshqa tovar. Ombor → Markirovkali / Soni bo'yicha qoldiq'da tekshiring.`);
      try { await omvReload(); if (typeof skReload === "function") await skReload(); } catch (e) {}
      MG.prev[k] = await mgBuild(k); mgShow(k, MG.prev[k]);
    }
  } catch (e) { if (e) mgMsg(k, krCodeMsg(e.code) || "Ko'chirib bo'lmadi. Ko'chirilgan qismi bo'lsa, «Ko'rib chiqish» bilan tekshiring va qayta bosing — takrorlanmaydi.", true); }
  MG.busy = false;
}
// Avvalgi Bito importini bekor qilib, qoldiqni Bito'dan yangidan olish (Tsunami'da hali sotuv / kirim bo'lmagan holat uchun)
async function mgRedo(btn) {
  if (MG.busy || !IG.mcp) return mgMsg("stock", krDbLine() || "Sahifani claude.ai'da oching.", true);
  const old = OMV.list.filter(m => !m.cancelled && m.type === "inv" && /Bito'dan import/.test(m.note));
  if (!old.length) return mgMsg("stock", "Bekor qilinadigan avvalgi import yo'q — oddiy «Ko'chirish»ni bosing.", true);
  const used = SL.list.some(s => !s.cancelled) || KR.list.some(k => k.state === "done") || OMV.list.some(m => !m.cancelled && !/Bito'dan import/.test(m.note));
  if (!MG.redoOk) { MG.redoOk = true; btn.textContent = "Ha, eskisini bekor qilib qayta ko'chirish"; return mgMsg("stock", `${old.length} ta avvalgi import hujjati bekor qilinadi va qoldiq Bito'dan yangidan olinadi.${used ? " Diqqat: Tsunami'da sotuv yoki kirim bor — ular saqlanadi, lekin qoldiq Bito'dagi hozirgi holatga o'rnatiladi." : ""} Tasdiqlash uchun yana bosing.`); }
  MG.redoOk = false; btn.textContent = "Qayta ko'chirish (eskisini bekor qilib)";
  MG.busy = true; mgMsg("stock", "Avvalgi import bekor qilinmoqda…");
  try {
    await omvReload();
    const now = new Date().toISOString();
    for (const m of OMV.list.filter(x => !x.cancelled && x.type === "inv" && /Bito'dan import/.test(x.note))) {
      await IG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ombor harakatlari'!D${m.row}`, values:[["Bekor qilingan"]] });
      await IG.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ombor harakatlari'!L${m.row}`, values:[[krT(now)]] });
    }
    await omvReload();
  } catch (e) { MG.busy = false; return mgMsg("stock", krCodeMsg(e && e.code) || "Bekor qilib bo'lmadi, qayta urinib ko'ring.", true); }
  MG.busy = false; MG.prev.stock = true;
  await mgRun("stock");
}
$("igMgApp").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.mgprev) mgPreview(b.dataset.mgprev);
  else if (b.dataset.mgrun) { if (MG.prev[b.dataset.mgrun]) mgRun(b.dataset.mgrun); else mgMsg(b.dataset.mgrun, "Avval «Ko'rib chiqish»ni bosing: nima qo'shilishini ko'ring.", true); }
  else if (b.id === "mgRedo") mgRedo(b);
  else if (b.id === "mgGoCash") { render("moliya"); const i = current.subs.findIndex(x => x.n === "Boshlang'ich qoldiq"); if (i >= 0) renderSub(i); }
});

// ======================= XABAR YUBORISH (WhatsApp havolasi orqali) =======================
const MS_RANGE = "Xabarlar!A1:H10000";
const MSG = { list:[], state:"loading", busy:false, tpl:"debt", text:"", done:new Set() };
const MSG_TPL = {
  debt:{ name:"Qarz eslatmasi", text:"Assalomu alaykum, {ism}! 5Tech do'konidan. Sizda {qarz} miqdorida to'lanmagan qarz bor. Iltimos, imkon qadar tezroq to'lang. Rahmat!" },
  bday:{ name:"Tug'ilgan kun tabrigi", text:"Assalomu alaykum, {ism}! 5Tech jamoasi sizni tug'ilgan kuningiz bilan chin qalbdan tabriklaydi! Sizni do'konimizda kutib qolamiz." },
  wait:{ name:"So'ragan tovaringiz keldi", text:"Assalomu alaykum, {ism}! Siz so'ragan {tovar} 5Tech do'koniga keldi. Kelib ko'rishingiz mumkin." },
  all:{ name:"Barcha mijozlarga e'lon", text:"Assalomu alaykum, {ism}! 5Tech do'konida yangi aksiya: " }
};
igPanel("igMsgApp", `<div class="panel igmsg"><div class="thead"><h3>Mijozlarga xabar yuborish</h3></div>
  <div class="tmeta">Xabar WhatsApp orqali yuboriladi: «Yuborish» tugmasi mijoz raqami va tayyor matn bilan WhatsApp'ni ochadi, siz faqat «Yuborish»ni bosasiz. Yuborilganlar ro'yxatda belgilanadi.</div>
  <div class="kform"><div class="kgrid"><label>Kimga<select id="msgTpl">${Object.entries(MSG_TPL).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join("")}</select></label><label id="msgCatL" hidden>Kategoriya<select id="msgCat"></select></label></div>
  <label class="full">Matn (o'zgartirish mumkin; {ism}, {qarz}, {tovar} o'zi qo'yiladi)<textarea id="msgText"></textarea></label></div>
  <div class="status" id="msgStatus"></div><div id="msgList"></div></div>`);
function msgParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0]) out.push({ date:String(r[1] || ""), client:String(r[2] || ""), phone:String(r[3] || ""), tpl:String(r[4] || "") }); }); return out; }
function msgApply(vals) { MSG.list = msgParse(vals); MSG.state = "ok"; msgRender(); }
function msgTargets() {
  const t = $("msgTpl").value, cl = PARTY.cliApp ? PARTY.cliApp.list : [], byName = n => cl.find(c => igK(c.name) === igK(n));
  if (t === "debt") return (typeof pyDebtors === "function" ? pyDebtors() : []).map(d => { const c = byName(d.name); return { name:d.name, phone:c ? c.phone : "", vars:{ qarz:Object.entries(d.cur).map(([cu, v]) => krMoney(v, cu)).join(" + ") } }; });
  if (t === "bday") { const today = new Date(); return cl.filter(c => { if (!/^\d{4}-\d{2}-\d{2}$/.test(c.birth || "")) return false; let d = new Date(today.getFullYear(), Number(c.birth.slice(5, 7)) - 1, Number(c.birth.slice(8, 10))); const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()); if (d < t0) d.setFullYear(d.getFullYear() + 1); return (d - t0) / 864e5 <= 7; }).map(c => ({ name:c.name, phone:c.phone, vars:{} })); }
  if (t === "wait") { const st = typeof mkInStock === "function" ? mkInStock() : {}; return (typeof KG !== "undefined" ? KG.list : []).filter(w => w.st === "wait" && st[igK(w.prod)]).map(w => ({ name:w.client, phone:w.phone, vars:{ tovar:w.prod } })); }
  const cat = $("msgCat").value; return cl.filter(c => !cat || igK(c.cat || "Oddiy") === igK(cat)).map(c => ({ name:c.name, phone:c.phone, vars:{} }));
}
function msgFill(tpl, x) { return tpl.replace(/\{ism\}/g, x.name).replace(/\{qarz\}/g, x.vars.qarz || "").replace(/\{tovar\}/g, x.vars.tovar || ""); }
function msgWa(phone, text) { const d = String(phone || "").replace(/\D/g, ""); const n = d.length === 9 ? "998" + d : d; return n.length >= 11 ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : ""; }
function msgRender() {
  if (!$("msgList")) return;
  const t = $("msgTpl").value; $("msgCatL").hidden = t !== "all";
  if (t === "all") { const v = $("msgCat").value, cats = typeof mkatNames === "function" ? mkatNames() : ["Oddiy"]; $("msgCat").innerHTML = `<option value="">Barcha mijozlar</option>` + cats.map(c => `<option${c === v ? " selected" : ""}>${esc(c)}</option>`).join(""); }
  if (MSG.tpl !== t || !$("msgText").value) { $("msgText").value = MSG_TPL[t].text; MSG.tpl = t; }
  const list = msgTargets(), today = new Date().toLocaleDateString("en-CA"), sent = new Set(MSG.list.filter(m => m.date === today && m.tpl === MSG_TPL[t].name).map(m => igK(m.client)));
  $("msgStatus").textContent = list.length ? `${list.length} ta mijoz · bugun yuborilgan: ${list.filter(x => sent.has(igK(x.name))).length}` : "";
  $("msgList").innerHTML = list.length ? `<table><thead><tr><th>Mijoz</th><th>Telefon</th><th>Xabar</th><th></th></tr></thead><tbody>` + list.map((x, i) => { const txt = msgFill($("msgText").value, x), wa = msgWa(x.phone, txt); return `<tr><td><b>${esc(x.name)}</b></td><td class="mono">${esc(x.phone) || "—"}</td><td class="small">${esc(txt)}</td><td class="krAct">${sent.has(igK(x.name)) ? `<span class="igok">✓ yuborildi</span>` : wa ? `<a class="wa" href="${esc(wa)}" target="_blank" rel="noopener" data-msgi="${i}">Yuborish</a>` : `<span class="tmeta">telefon yo'q</span>`}</td></tr>`; }).join("") + `</tbody></table>` : `<div class="empty-box">Bu guruhda hozir mijoz yo'q</div>`;
  MSG.cur = list;
}
$("msgTpl").addEventListener("change", () => { $("msgText").value = ""; msgRender(); });
$("msgCat").addEventListener("change", msgRender);
$("msgText").addEventListener("input", () => { clearTimeout(MSG.t); MSG.t = setTimeout(msgRender, 400); });
$("msgList").addEventListener("click", async e => {
  const a = e.target.closest("a[data-msgi]"); if (!a || !IG.mcp) return;
  const x = (MSG.cur || [])[Number(a.dataset.msgi)]; if (!x) return;
  try { await IG.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Xabarlar!A1", values:[[krT(igId("X")), krT(new Date().toLocaleDateString("en-CA")), krT(x.name), krT(x.phone), krT(MSG_TPL[$("msgTpl").value].name), krT(msgFill($("msgText").value, x)), "WhatsApp", krT(new Date().toISOString())]] }); MSG.list.push({ date:new Date().toLocaleDateString("en-CA"), client:x.name, phone:x.phone, tpl:MSG_TPL[$("msgTpl").value].name }); setTimeout(msgRender, 300); } catch (err) {}
});

// ======================= Yo'naltirish =======================
const IG_APPS = { "Ulanishlar":["igStApp", () => { igStRender(); if (!Object.keys(IGS.res).length) igCheckAll(); }], "Bito'dan ko'chirish":["igMgApp", () => {}], "Xabar yuborish":["igMsgApp", msgRender] };
function igRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "";
  Object.entries(IG_APPS).forEach(([name, [app, fn]]) => { const on = sec === "integratsiya" && name === n; document.body.classList.toggle(app + "-on", on); if (on) fn(); });
}
const igOrigRenderSub = renderSub;
renderSub = function (i) { igOrigRenderSub(i); igRoute(); };
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { MSG.state = "off"; return; }
  IG.mcp = mcp;
  try { mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:MS_RANGE }, ev => { if (ev.type === "data") msgApply(krVals(ev)); }, { refetchInterval:300000 }); } catch (e) {}
  igRoute();
})();
igRoute();
