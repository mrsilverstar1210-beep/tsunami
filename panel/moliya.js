// ===== Tsunami: Moliya → Kassa, Tranzaksiyalar, Kassa sanog'i, Boshlang'ich qoldiq; Sozlamalar → Kassalar, Kirim/xarajat turlari; Hisobotlar → Pul oqimi =====
// Pul daftari ikki qismdan iborat va har safar qaytadan hisoblanadi (shuning uchun hech qachon «eskirib» qolmaydi):
//  1) avtomatik yozuvlar — boshqa bo'limlardagi hujjatlardan: sotuvda to'langan pul, mijoz to'lovlari, buyurtma avansi,
//     mijozga pul qaytarish, yetkazib beruvchiga to'lov. Hujjat bekor qilinsa, uning puli ham daftardan chiqadi.
//  2) qo'lda yozuvlar — «Kassa operatsiyalari» varag'ida: boshqa kirim, xarajat, kassalar o'rtasida o'tkazma,
//     valyuta ayirboshlash, boshlang'ich qoldiq, kassa sanog'i farqi.
const ML = { mcp:null };
const mlToday = () => new Date().toLocaleDateString("en-CA");
const mlK = s => String(s || "").trim().toLowerCase();
const mlR2 = n => Math.round((Number(n) || 0) * 100) / 100;
function mlId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function mlMsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function mlSay(o, render, m) { o.msg = m; clearTimeout(o.msgT); o.msgT = setTimeout(() => { o.msg = ""; render(); }, 7000); render(); }
function mlLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
function mlPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
function mlMoney(n, cur) { const v = mlR2(n); return (v < 0 ? "−" : "") + krMoney(Math.abs(v), cur); }
(function mlCss() {
  const st = document.createElement("style");
  st.textContent = "#mkApp2,#mtApp,#msApp,#mbApp,#mkassaApp,#mcatApp,#mflowApp{display:none}.mkApp2-on #mkApp2,.mtApp-on #mtApp,.msApp-on #msApp,.mbApp-on #mbApp,.mkassaApp-on #mkassaApp,.mcatApp-on #mcatApp,.mflowApp-on #mflowApp{display:block}"
    + ".mkApp2-on .gen,.mkApp2-on #kpis,.mtApp-on .gen,.mtApp-on #kpis,.msApp-on .gen,.msApp-on #kpis,.mbApp-on .gen,.mbApp-on #kpis,.mkassaApp-on .gen,.mkassaApp-on #kpis,.mcatApp-on .gen,.mcatApp-on #kpis,.mflowApp-on .gen,.mflowApp-on #kpis,.mflowApp-on .salesbar{display:none}"
    + ".mlcards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:10px 0}.mlcard{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#fff}.mlcard h4{margin:0 0 6px;font-size:14px}.mlcard .b{font-size:20px;font-weight:700}.mlcard .s{font-size:12px;color:#6b7280;margin-top:4px}"
    + ".mlacts{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px}.mlacts button{font:inherit;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;border:1px solid var(--line);background:#fff;cursor:pointer}.mlacts button.in{background:#16a34a;color:#fff;border-color:#16a34a}.mlacts button.out{background:#dc2626;color:#fff;border-color:#dc2626}"
    + ".kform .inrow{display:flex;gap:6px;align-items:stretch}.kform .inrow>input{flex:1 1 auto;min-width:90px;width:auto}.kform .inrow>select{flex:0 0 92px;width:92px}.kform .inrow>.mini,.kform .inrow>button{flex:0 0 auto;width:auto;white-space:nowrap}"
    + "#mkApp2 .kform,#msApp .kform,#mbApp .kform{margin-top:6px}#mkApp2 .kgrid,#msApp .kgrid,#mbApp .kgrid{margin:8px 0}#msApp .tmeta,#mbApp .tmeta{margin-bottom:10px}#msRows input{width:200px!important;font-size:15px;padding:8px 10px}#ksForm{border-top:1px solid var(--line);padding-top:12px;margin-top:4px}#ksSum,#ksSum2,#mbSum{font-size:16px;font-weight:600}"
    + ".mlin{color:#15803d;font-weight:600}.mlout{color:#b91c1c;font-weight:600}.mlauto{font-size:11px;color:#6b7280;background:#f3f4f6;border-radius:6px;padding:1px 6px;margin-left:4px}.mlneg{color:#b91c1c}";
  document.head.appendChild(st);
})();

// ======================= Sozlamalar: kassalar va turlar =======================
const MKS_RANGE = "'Kassa sozlamalari'!A1:F300";
const MK_KASSA_DEF = [{ name:"Naqd kassa", pays:["Naqd", "Naqd (kuryer)"] }, { name:"Terminal (karta)", pays:["Karta", "Terminal"] }, { name:"Bank hisobi", pays:["O'tkazma"] }, { name:"Nasiya kompaniyasi", pays:["Nasiya"] }];
const MK_CAT_DEF = { out:["Ijara", "Ish haqi", "Kommunal to'lovlar", "Soliq", "Reklama", "Transport", "Xo'jalik xarajatlari", "Bank xizmati", "Tasischiga berildi", "Boshqa xarajat"], in:["Tasischi qo'shdi", "Qarz olindi", "Boshqa kirim"] };
const MKS = { list:[], state:"loading", busy:false, msg:"", msgT:null, edit:"", pendDel:"" };
function mksParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[4] || "") !== "O'chirilgan" && String(r[2] || "").trim()) out.push({ id:String(r[0]), row:i + 1, kind:String(r[1] || ""), name:String(r[2]).trim(), extra:String(r[3] || "") }); }); return out; }
function mlKassas() { const l = MKS.list.filter(x => x.kind === "kassa"); return MKS.state === "ok" && l.length ? l.map(x => ({ name:x.name, pays:x.extra.split(",").map(s => s.trim()).filter(Boolean), id:x.id, row:x.row })) : MK_KASSA_DEF.map(x => ({ name:x.name, pays:x.pays.slice() })); }
function mlCats(dir) { const l = MKS.list.filter(x => x.kind === "cat" + dir); return MKS.state === "ok" && l.length ? l.map(x => x.name) : MK_CAT_DEF[dir]; }
// To'lov turi → kassa (topilmasa birinchi kassa — ogohlantirish bilan)
function mlAccOf(payType) { const t = mlK(payType), ks = mlKassas(); const k = ks.find(x => x.pays.some(p => mlK(p) === t)); return k ? k.name : (ks[0] ? ks[0].name : "Naqd kassa"); }
function mlUnmapped(payType) { const t = mlK(payType); return !!t && !mlKassas().some(x => x.pays.some(p => mlK(p) === t)); }
function mksApply(vals) { MKS.list = mksParse(vals); MKS.state = "ok"; MLC.v++; mlRenderAll(); }
async function mksReload() { const r = await ML.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:MKS_RANGE }, { cache:false }); mksApply(krVals({ result:r })); }
async function mksDo(fn, render) { if (MKS.busy) return; if (!ML.mcp) return mlSay(MKS, render, krDbLine() || "Tsunami bazasi ulanmagan."); MKS.busy = true; try { await mksReload(); await fn(); try { await mksReload(); } catch (e) {} } catch (e) { if (e) mlSay(MKS, render, krCodeMsg(e.code) || "Saqlab bo'lmadi."); } MKS.busy = false; }
// Birinchi o'zgartirishda standart ro'yxat bazaga yoziladi (mavjud yozuvlar nomi yo'qolmasin)
function mksSeedRows(kind) {
  const now = krT(new Date().toISOString());
  if (kind === "kassa") return MKS.list.some(x => x.kind === "kassa") ? [] : MK_KASSA_DEF.map(k => [krT(mlId("A")), "kassa", krT(k.name), krT(k.pays.join(", ")), "Faol", now]);
  const dir = kind.slice(3); return MKS.list.some(x => x.kind === kind) ? [] : MK_CAT_DEF[dir].map(n => [krT(mlId("C")), kind, krT(n), "", "Faol", now]);
}
mlPanel("mkassaApp", `<div class="panel"><div class="thead"><h3>Kassalar</h3></div>
  <div class="tmeta">Har bir to'lov turi qaysi kassaga tushishi shu yerda belgilanadi (masalan, «Naqd» → Naqd kassa, «Terminal» → Terminal). Sotuv, mijoz to'lovi, qaytarish va yetkazib beruvchiga to'lov shu bo'yicha kassaga yoziladi.</div>
  <form id="mkasForm" class="kform"><div class="inrow" style="max-width:720px"><input id="mkasName" maxlength="60" placeholder="Yangi kassa nomi, masalan: Click hisobi"><input id="mkasPays" maxlength="200" placeholder="To'lov turlari (vergul bilan), masalan: Click"><button type="button" class="pri" id="mkasAdd">Qo'shish</button></div></form>
  <div class="status" id="mkasStatus"></div><div id="mkasList"></div></div>`);
mlPanel("mcatApp", `<div class="panel"><div class="thead"><h3>Kirim va xarajat turlari</h3></div>
  <div class="tmeta">Kassa → «Chiqim» va «Kirim» formalaridagi tur ro'yxati shu yerdan olinadi.</div>
  <form id="mcatForm" class="kform"><div class="inrow" style="max-width:600px"><select id="mcatDir"><option value="out">Xarajat turi</option><option value="in">Kirim turi</option></select><input id="mcatName" maxlength="60" placeholder="Yangi tur"><button type="button" class="pri" id="mcatAdd">Qo'shish</button></div></form>
  <div class="status" id="mcatStatus"></div><div id="mcatList"></div></div>`);
function mkasRender() {
  if (!$("mkasList")) return;
  $("mkasStatus").textContent = [mlLine(MKS, "Kassalar"), MKS.msg].filter(Boolean).join(" · ");
  const bal = mlBalances(), can = !!ML.mcp, seeded = MKS.state === "ok" && MKS.list.some(x => x.kind === "kassa");
  $("mkasList").innerHTML = `<table><thead><tr><th>Kassa</th><th>To'lov turlari</th><th>Qoldiq</th><th></th></tr></thead><tbody>` + mlKassas().map(k => MKS.edit && MKS.edit === k.id
    ? `<tr><td><b>${esc(k.name)}</b></td><td><input id="mkasEditIn" value="${esc(k.pays.join(", "))}" style="width:100%"></td><td></td><td class="krAct"><button data-mkassave="${esc(k.id)}">Saqlash</button><button data-mkascancel="1">Bekor</button></td></tr>`
    : `<tr><td><b>${esc(k.name)}</b></td><td>${k.pays.map(esc).join(", ") || "—"}</td><td class="num">${mlBalTxt(bal[k.name])}</td><td class="krAct">${can ? `<button data-mkasedit="${esc(k.name)}">To'lov turlari</button>${seeded ? `<button data-mkasdel="${esc(k.id)}">${MKS.pendDel === k.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}` : ""}</td></tr>`).join("") + `</tbody></table>`
    + (mlLedger().unmapped.length ? `<div class="tmeta mlneg" style="margin-top:8px">Diqqat: bu to'lov turlari hech bir kassaga biriktirilmagan, hozircha «${esc(mlKassas()[0].name)}»ga yozilmoqda: ${mlLedger().unmapped.map(esc).join(", ")}.</div>` : "");
}
$("mkasForm").addEventListener("submit", e => e.preventDefault());
$("mkasAdd").addEventListener("click", () => {
  const name = $("mkasName").value.trim(), pays = $("mkasPays").value.split(",").map(s => s.trim()).filter(Boolean);
  if (!name) return mlSay(MKS, mkasRender, "Kassa nomini yozing.");
  mksDo(async () => {
    if (mlKassas().some(k => mlK(k.name) === mlK(name))) { mlSay(MKS, mkasRender, `«${name}» bor.`); throw null; }
    const busy = pays.find(p => mlKassas().some(k => k.pays.some(x => mlK(x) === mlK(p)))); if (busy) { mlSay(MKS, mkasRender, `«${busy}» to'lov turi boshqa kassaga biriktirilgan.`); throw null; }
    const rows = mksSeedRows("kassa"); rows.push([krT(mlId("A")), "kassa", krT(name), krT(pays.join(", ")), "Faol", krT(new Date().toISOString())]);
    await ML.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Kassa sozlamalari'!A1", values:rows });
    $("mkasName").value = ""; $("mkasPays").value = ""; mlSay(MKS, mkasRender, `«${name}» kassasi qo'shildi.`);
  }, mkasRender);
});
$("mkasList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.mkasedit) {
    const name = b.dataset.mkasedit;
    if (!MKS.list.some(x => x.kind === "kassa")) {
      // Standart ro'yxat bazaga yozilib, keyin tahrirlanadi
      mksDo(async () => { await ML.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Kassa sozlamalari'!A1", values:mksSeedRows("kassa") }); }, mkasRender).then(() => { const k = mlKassas().find(x => x.name === name); if (k && k.id) { MKS.edit = k.id; mkasRender(); } });
    } else { const k = mlKassas().find(x => x.name === name); if (k) { MKS.edit = k.id; mkasRender(); } }
  }
  else if (b.dataset.mkascancel) { MKS.edit = ""; mkasRender(); }
  else if (b.dataset.mkassave) {
    const id = b.dataset.mkassave, pays = $("mkasEditIn").value.split(",").map(s => s.trim()).filter(Boolean);
    mksDo(async () => {
      const k = MKS.list.find(x => x.id === id); if (!k) throw null;
      const busy = pays.find(p => mlKassas().some(o => o.id !== id && o.pays.some(x => mlK(x) === mlK(p)))); if (busy) { mlSay(MKS, mkasRender, `«${busy}» boshqa kassaga biriktirilgan.`); throw null; }
      await ML.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Kassa sozlamalari'!D${k.row}`, values:[[krT(pays.join(", "))]] }); MKS.edit = ""; mlSay(MKS, mkasRender, "Saqlandi. Avvalgi yozuvlar ham yangi biriktirish bo'yicha qayta hisoblandi.");
    }, mkasRender);
  }
  else if (b.dataset.mkasdel) {
    const id = b.dataset.mkasdel; if (MKS.pendDel !== id) { MKS.pendDel = id; return mkasRender(); }
    mksDo(async () => {
      const k = MKS.list.find(x => x.id === id); if (!k) throw null;
      const bal = mlBalances()[k.name] || {}; if (Object.values(bal).some(v => Math.abs(v) > 0.005)) { mlSay(MKS, mkasRender, `«${k.name}» da pul bor: avval boshqa kassaga o'tkazing.`); throw null; }
      if (mlLedger().rows.some(r => r.acc === k.name)) { mlSay(MKS, mkasRender, `«${k.name}» bo'yicha yozuvlar bor — tarix buzilmasligi uchun o'chirib bo'lmaydi. To'lov turlarini olib tashlang.`); throw null; }
      await ML.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Kassa sozlamalari'!E${k.row}`, values:[["O'chirilgan"]] }); MKS.pendDel = ""; mlSay(MKS, mkasRender, `«${k.name}» o'chirildi.`);
    }, mkasRender);
  }
});
function mcatRender() {
  if (!$("mcatList")) return;
  $("mcatStatus").textContent = [mlLine(MKS, "Turlar"), MKS.msg].filter(Boolean).join(" · ");
  const can = !!ML.mcp, block = dir => { const rows = MKS.state === "ok" && MKS.list.some(x => x.kind === "cat" + dir) ? MKS.list.filter(x => x.kind === "cat" + dir) : MK_CAT_DEF[dir].map(n => ({ id:"", name:n })); return `<h4 style="margin:12px 0 4px">${dir === "out" ? "Xarajat turlari" : "Kirim turlari"}</h4><table><tbody>` + rows.map(x => `<tr><td>${esc(x.name)}</td><td class="krAct">${can && x.id ? `<button data-mcatdel="${esc(x.id)}">${MKS.pendDel === x.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`; };
  $("mcatList").innerHTML = block("out") + block("in");
}
$("mcatForm").addEventListener("submit", e => e.preventDefault());
$("mcatAdd").addEventListener("click", () => {
  const dir = $("mcatDir").value, name = $("mcatName").value.trim(); if (!name) return mlSay(MKS, mcatRender, "Tur nomini yozing.");
  mksDo(async () => { if (mlCats(dir).some(n => mlK(n) === mlK(name))) { mlSay(MKS, mcatRender, `«${name}» bor.`); throw null; } const rows = mksSeedRows("cat" + dir); rows.push([krT(mlId("C")), "cat" + dir, krT(name), "", "Faol", krT(new Date().toISOString())]); await ML.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Kassa sozlamalari'!A1", values:rows }); $("mcatName").value = ""; mlSay(MKS, mcatRender, `«${name}» qo'shildi.`); }, mcatRender);
});
$("mcatList").addEventListener("click", e => { const b = e.target.closest("[data-mcatdel]"); if (!b) return; const id = b.dataset.mcatdel; if (MKS.pendDel !== id) { MKS.pendDel = id; return mcatRender(); } mksDo(async () => { const x = MKS.list.find(r => r.id === id); if (!x) throw null; if (MKS.list.filter(r => r.kind === x.kind).length <= 1) { mlSay(MKS, mcatRender, "Kamida bittasi qolishi kerak."); throw null; } await ML.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Kassa sozlamalari'!E${x.row}`, values:[["O'chirilgan"]] }); MKS.pendDel = ""; mlSay(MKS, mcatRender, `«${x.name}» o'chirildi (avvalgi yozuvlarda nomi qoladi).`); }, mcatRender); });

// ======================= Qo'lda operatsiyalar (ma'lumot) =======================
const MOP_RANGE = "'Kassa operatsiyalari'!A1:N10000";
const MOP = { list:[], state:"loading", busy:false, msg:"", msgT:null };
const MOP_T = { in:"Kirim", out:"Chiqim", tr:"O'tkazma", fx:"Valyuta ayirboshlash", open:"Boshlang'ich qoldiq", count:"Sanoq farqi" };
function mopParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const t = Object.keys(MOP_T).find(k => MOP_T[k] === String(r[2] || "")) || "in";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, t, cancelled:String(r[3] || "") === "Bekor qilingan", date:String(r[4] || ""), acc:String(r[5] || ""), cur:String(r[6] || "UZS"), sum:Number(r[7]) || 0, acc2:String(r[8] || ""), cur2:String(r[9] || ""), sum2:Number(r[10]) || 0, cat:String(r[11] || ""), note:String(r[12] || ""), createdAt:String(r[13] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function mopApply(vals) { MOP.list = mopParse(vals); MOP.state = "ok"; MLC.v++; mlRenderAll(); }
async function mopReload() { const r = await ML.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:MOP_RANGE }, { cache:false }); mopApply(krVals({ result:r })); }
async function mopAdd(o) {
  const number = MOP.list.reduce((m, x) => Math.max(m, x.number), 0) + 1, now = new Date().toISOString();
  await ML.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Kassa operatsiyalari'!A1", values:[[krT(mlId("M")), number, MOP_T[o.t], "Yakunlangan", krT(o.date || mlToday()), krT(o.acc), o.cur, mlR2(o.sum), krT(o.acc2 || ""), o.cur2 || "", o.sum2 ? mlR2(o.sum2) : "", krT(o.cat || ""), krT(o.note || ""), krT(now)]] });
  return number;
}

// ======================= PUL DAFTARI (hisoblagich) =======================
const MLC = { v:0, key:"", res:null };
function mlLedger() {
  const lst = x => (typeof x !== "undefined" && x && x.list) ? x.list : [];
  const key = [MLC.v, SL.list.length, SL.list.map(s => s.cancelled ? 1 : 0).join(""), lst(typeof PAY !== "undefined" ? PAY : null).map(p => p.cancelled ? 1 : 0).join(""), lst(typeof QT !== "undefined" ? QT : null).map(r => r.cancelled ? 1 : 0).join(""), lst(typeof YT !== "undefined" ? YT : null).map(p => p.cancelled ? 1 : 0).join(""), lst(typeof OR !== "undefined" ? OR : null).map(o => o.st).join(",")].join("/");
  if (MLC.key === key && MLC.res) return MLC.res;
  const rows = [], unmapped = new Set();
  const push = (r) => { if (Math.abs(r.amt) > 0.004) rows.push(r); };
  const acc = pt => { if (mlUnmapped(pt)) unmapped.add(pt); return mlAccOf(pt); };
  // Buyurtma avansi: buyurtma kuni kassaga tushadi; keyin sotuvga aylanganda o'sha qism sotuvdan ayiriladi (ikki marta sanalmasin)
  const orders = lst(typeof OR !== "undefined" ? OR : null), prepayOf = {};
  orders.filter(o => o.st !== "cancel" && o.prepay > 0).forEach(o => {
    prepayOf[o.number] = o;
    push({ ts:o.createdAt || o.date, date:String(o.date).slice(0, 10), acc:acc("Naqd"), cur:o.cur, amt:o.prepay, kind:"Buyurtma avansi", who:o.client, src:`Buyurtma №${o.number}`, auto:true });
  });
  SL.list.filter(s => !s.cancelled && s.paid > 0).forEach(s => {
    let paid = s.paid; const m = String(s.note || "").match(/Buyurtma №(\d+)/), o = m ? prepayOf[Number(m[1])] : null;
    if (o && mlK(o.client) === mlK(s.client) && o.cur === s.currency) paid = mlR2(paid - Math.min(o.prepay, paid));
    push({ ts:s.createdAt || s.date, date:String(s.date).slice(0, 10), acc:acc(s.payType || "Naqd"), cur:s.currency, amt:paid, kind:"Sotuv", who:s.client, src:`Sotuv №${s.number}`, auto:true });
  });
  lst(typeof PAY !== "undefined" ? PAY : null).filter(p => !p.cancelled).forEach(p => push({ ts:p.createdAt || p.date, date:String(p.date).slice(0, 10), acc:acc(p.payType || "Naqd"), cur:p.currency, amt:p.total, kind:"Mijoz to'lovi", who:p.client, src:`To'lov №${p.number}`, auto:true }));
  lst(typeof QT !== "undefined" ? QT : null).filter(r => !r.cancelled && r.cash > 0).forEach(r => push({ ts:r.createdAt || r.date, date:String(r.date).slice(0, 10), acc:acc(r.payType || "Naqd"), cur:r.currency, amt:-r.cash, kind:"Mijozga qaytarildi", who:r.client, src:`Qaytarish №${r.number}`, auto:true }));
  lst(typeof YT !== "undefined" ? YT : null).filter(p => !p.cancelled).forEach(p => push({ ts:p.createdAt || p.date, date:String(p.date).slice(0, 10), acc:acc(p.type || "Naqd"), cur:p.cur, amt:-p.total, kind:"Yetkazib beruvchiga to'lov", who:p.sup, src:`To'lov №${p.number} (ta'minot)`, auto:true }));
  MOP.list.filter(o => !o.cancelled).forEach(o => {
    const base = { ts:o.createdAt || o.date, date:String(o.date).slice(0, 10), src:`Operatsiya №${o.number}`, id:o.id, note:o.note, auto:false };
    if (o.t === "in" || o.t === "open") push(Object.assign({ acc:o.acc, cur:o.cur, amt:o.sum, kind:o.t === "open" ? "Boshlang'ich qoldiq" : o.cat || "Kirim", who:"" }, base));
    else if (o.t === "out") push(Object.assign({ acc:o.acc, cur:o.cur, amt:-o.sum, kind:o.cat || "Xarajat", who:"" }, base));
    else if (o.t === "count") push(Object.assign({ acc:o.acc, cur:o.cur, amt:o.sum, kind:"Sanoq farqi", who:"" }, base));
    else if (o.t === "tr") { push(Object.assign({ acc:o.acc, cur:o.cur, amt:-o.sum, kind:"O'tkazma", who:"→ " + o.acc2 }, base)); push(Object.assign({ acc:o.acc2, cur:o.cur, amt:o.sum, kind:"O'tkazma", who:"← " + o.acc }, base)); }
    else if (o.t === "fx") { push(Object.assign({ acc:o.acc, cur:o.cur, amt:-o.sum, kind:"Valyuta ayirboshlash", who:`→ ${krMoney(o.sum2, o.cur2)}` }, base)); push(Object.assign({ acc:o.acc2 || o.acc, cur:o.cur2, amt:o.sum2, kind:"Valyuta ayirboshlash", who:`← ${krMoney(o.sum, o.cur)}` }, base)); }
  });
  rows.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  MLC.key = key; MLC.res = { rows, unmapped:[...unmapped] };
  return MLC.res;
}
function mlBalances(upTo) { const m = {}; mlLedger().rows.forEach(r => { if (upTo && r.ts > upTo) return; const a = m[r.acc] || (m[r.acc] = {}); a[r.cur] = mlR2((a[r.cur] || 0) + r.amt); }); return m; }
function mlBalTxt(b) { const p = Object.entries(b || {}).filter(([, v]) => Math.abs(v) > 0.005); return p.length ? p.map(([c, v]) => `<span class="${v < 0 ? "mlneg" : ""}">${mlMoney(v, c)}</span>`).join("<br>") : "0"; }
function mlAvail(acc, cur) { return ((mlBalances()[acc] || {})[cur]) || 0; }

// ======================= KASSA (asosiy) =======================
const KS = { mode:"", msg:"", msgT:null };
mlPanel("mkApp2", `<div class="panel"><div class="thead"><h3>Kassa</h3></div>
  <div class="status" id="ksStatus"></div><div class="mlcards" id="ksCards"></div>
  <div class="mlacts"><button class="in" data-ksop="in">+ Kirim</button><button class="out" data-ksop="out">− Chiqim (xarajat)</button><button data-ksop="tr">⇄ Kassalar o'rtasida o'tkazma</button><button data-ksop="fx">$ ⇄ so'm ayirboshlash</button></div>
  <div class="kform" id="ksForm" hidden><div class="kgrid" id="ksGrid"></div><label class="full">Izoh<input id="ksNote" maxlength="300" placeholder="ixtiyoriy"></label><div class="kbtns"><button type="button" class="sec" id="ksCancel">Bekor</button><button type="button" class="pri" id="ksSave">Saqlash</button></div><div class="status" id="ksFmsg"></div></div></div>
  <div class="panel"><div class="thead"><h3>Bugungi harakatlar</h3><div class="hbtns"><input type="date" id="ksDay"></div></div><div id="ksDaySum" class="tmeta"></div><div id="ksList"></div></div>`);
function ksAccOpts(sel) { return mlKassas().map(k => `<option${k.name === sel ? " selected" : ""}>${esc(k.name)}</option>`).join(""); }
function ksCurOpts(sel) { return ["UZS", "USD"].map(c => `<option value="${c}"${c === sel ? " selected" : ""}>${c === "USD" ? "$" : "so'm"}</option>`).join(""); }
function ksOpen(mode) {
  KS.mode = mode; $("ksForm").hidden = false; $("ksNote").value = ""; mlMsg("ksFmsg", "");
  const d = `<label>Sana<input type="date" id="ksDate" value="${mlToday()}"></label>`;
  $("ksGrid").innerHTML = mode === "in" ? `<label>Kassa<select id="ksAcc">${ksAccOpts()}</select></label><label>Turi<select id="ksCat">${mlCats("in").map(c => `<option>${esc(c)}</option>`).join("")}</select></label><label class="span2">Summa<span class="inrow"><input type="number" id="ksSum" min="0" step="any"><select id="ksCur">${ksCurOpts("UZS")}</select></span></label>${d}`
    : mode === "out" ? `<label>Kassa<select id="ksAcc">${ksAccOpts()}</select></label><label>Xarajat turi<select id="ksCat">${mlCats("out").map(c => `<option>${esc(c)}</option>`).join("")}</select></label><label class="span2">Summa<span class="inrow"><input type="number" id="ksSum" min="0" step="any"><select id="ksCur">${ksCurOpts("UZS")}</select></span></label>${d}`
    : mode === "tr" ? `<label>Qaysi kassadan<select id="ksAcc">${ksAccOpts()}</select></label><label>Qaysi kassaga<select id="ksAcc2">${ksAccOpts(mlKassas()[1] ? mlKassas()[1].name : "")}</select></label><label class="span2">Summa<span class="inrow"><input type="number" id="ksSum" min="0" step="any"><select id="ksCur">${ksCurOpts("UZS")}</select></span></label>${d}`
    : `<label>Kassa<select id="ksAcc">${ksAccOpts()}</select></label><label>Beriladi<span class="inrow"><input type="number" id="ksSum" min="0" step="any" placeholder="100"><select id="ksCur">${ksCurOpts("USD")}</select></span></label><label>Olinadi<span class="inrow"><input type="number" id="ksSum2" min="0" step="any" placeholder="1 280 000"><select id="ksCur2">${ksCurOpts("UZS")}</select></span></label><label>Qaysi kassaga tushadi<select id="ksAcc2">${ksAccOpts()}</select></label>${d}<div id="ksRate" class="tmeta" style="align-self:end"></div>`;
  ksHint(); setTimeout(() => { const s = $("ksSum"); if (s) s.focus(); }, 30);
}
function ksHint() {
  if (!$("ksAcc")) return;
  const a = mlAvail($("ksAcc").value, $("ksCur").value), sum = Number($("ksSum").value) || 0;
  const r = KS.mode === "fx" && Number($("ksSum2").value) && sum ? ` · kurs: 1 ${$("ksCur").value === "USD" ? "$" : "so'm"} = ${(Number($("ksSum2").value) / sum).toLocaleString("ru-RU", { maximumFractionDigits:2 })} ${$("ksCur2").value === "USD" ? "$" : "so'm"}` : "";
  mlMsg("ksFmsg", KS.mode === "in" ? "" : `Kassada bor: ${mlMoney(a, $("ksCur").value)}${r}`);
}
async function ksSave() {
  if (MOP.busy) return; if (!ML.mcp) return mlMsg("ksFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const mode = KS.mode, accN = $("ksAcc").value, cur = $("ksCur").value, sum = mlR2($("ksSum").value), date = $("ksDate").value || mlToday(), note = $("ksNote").value.trim();
  if (!(sum > 0)) return mlMsg("ksFmsg", "Summani kiriting.", true);
  const o = { t:mode, date, acc:accN, cur, sum, note };
  if (mode === "in" || mode === "out") o.cat = $("ksCat").value;
  if (mode === "out" && !note && /boshqa/i.test(o.cat)) return mlMsg("ksFmsg", "«Boshqa» xarajat uchun izoh yozing: nimaga sarflandi.", true);
  if (mode === "tr") { o.acc2 = $("ksAcc2").value; if (o.acc2 === accN) return mlMsg("ksFmsg", "Kassalar har xil bo'lsin.", true); }
  if (mode === "fx") { o.acc2 = $("ksAcc2").value; o.cur2 = $("ksCur2").value; o.sum2 = mlR2($("ksSum2").value); if (o.cur2 === cur) return mlMsg("ksFmsg", "Ayirboshlashda valyutalar har xil bo'lsin.", true); if (!(o.sum2 > 0)) return mlMsg("ksFmsg", "Olinadigan summani kiriting.", true); }
  MOP.busy = true; $("ksSave").disabled = true;
  try {
    await mopReload();
    if (mode !== "in") { const a = mlAvail(accN, cur); if (sum - a > 0.005) { mlMsg("ksFmsg", `«${accN}»da ${mlMoney(a, cur)} bor — ${krMoney(sum, cur)} chiqarib bo'lmaydi. Avval kirim yoki boshlang'ich qoldiqni kiriting.`, true); throw null; } }
    const n = await mopAdd(o);
    mlSay(KS, ksRender, `${MOP_T[mode]} №${n} saqlandi.`); $("ksForm").hidden = true; KS.mode = ""; try { await mopReload(); } catch (e) {}
  } catch (e) { if (e) mlMsg("ksFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  MOP.busy = false; $("ksSave").disabled = false;
}
function ksRender() {
  if (!$("ksCards")) return;
  const bal = mlBalances(), L = mlLedger(), day = $("ksDay").value || mlToday(); if (!$("ksDay").value) $("ksDay").value = day;
  const waits = [SL.state, MOP.state, MKS.state].some(s => s !== "ok");
  $("ksStatus").textContent = [waits ? "Ma'lumot yuklanmoqda — qoldiqlar to'liq yuklangach aniq bo'ladi." : "", mlLine(MOP, "Kassa"), KS.msg, L.unmapped.length ? `Kassaga biriktirilmagan to'lov turlari: ${L.unmapped.join(", ")} (Sozlamalar → Kassalar)` : ""].filter(Boolean).join(" · ");
  const today = L.rows.filter(r => r.date === day);
  $("ksCards").innerHTML = mlKassas().map(k => { const t = today.filter(r => r.acc === k.name), inn = {}, out = {}; t.forEach(r => { const m = r.amt > 0 ? inn : out; m[r.cur] = (m[r.cur] || 0) + Math.abs(r.amt); }); return `<div class="mlcard"><h4>${esc(k.name)}</h4><div class="b">${mlBalTxt(bal[k.name])}</div><div class="s">Bugun: <span class="mlin">+${omMoneyMapSafe(inn)}</span> · <span class="mlout">−${omMoneyMapSafe(out)}</span></div></div>`; }).join("");
  const tot = {}; Object.values(bal).forEach(m => Object.entries(m).forEach(([c, v]) => { tot[c] = (tot[c] || 0) + v; }));
  $("ksCards").innerHTML += `<div class="mlcard" style="background:#f9fafb"><h4>Jami pul</h4><div class="b">${mlBalTxt(tot)}</div><div class="s">Barcha kassalar bo'yicha</div></div>`;
  const inn = {}, out = {}; today.forEach(r => { const m = r.amt > 0 ? inn : out; m[r.cur] = (m[r.cur] || 0) + Math.abs(r.amt); });
  $("ksDaySum").innerHTML = today.length ? `Kirim: <span class="mlin">${omMoneyMapSafe(inn)}</span> · Chiqim: <span class="mlout">${omMoneyMapSafe(out)}</span>` : "";
  $("ksList").innerHTML = today.length ? mlTable(today.slice().reverse(), false) : `<div class="empty-box">Bu kunda pul harakati yo'q</div>`;
}
function omMoneyMapSafe(m) { const p = Object.entries(m).filter(([, v]) => Math.abs(v) > 0.005); return p.length ? p.map(([c, v]) => krMoney(v, c)).join(" + ") : "0"; }
function mlTable(rows, cancel) {
  const can = cancel && !!ML.mcp;
  return `<table><thead><tr><th>Sana</th><th>Kassa</th><th>Turi</th><th>Kimdan / kimga</th><th>Manba</th><th>Summa</th>${can ? "<th></th>" : ""}</tr></thead><tbody>` + rows.map(r => `<tr><td>${esc(r.date)}</td><td>${esc(r.acc)}</td><td>${esc(r.kind)}${r.auto ? `<span class="mlauto">avto</span>` : ""}</td><td>${esc(r.who || "")}${r.note ? `<div class="tmeta">${esc(r.note)}</div>` : ""}</td><td class="tmeta">${esc(r.src)}</td><td class="num ${r.amt > 0 ? "mlin" : "mlout"}">${r.amt > 0 ? "+" : "−"}${krMoney(Math.abs(r.amt), r.cur)}</td>${can ? `<td class="krAct">${!r.auto ? `<button data-mopcancel="${esc(r.id)}">${MT.pendCancel === r.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>` : ""}</td>` : ""}</tr>`).join("") + `</tbody></table>`;
}
$("mkApp2").addEventListener("click", e => { const b = e.target.closest("[data-ksop]"); if (b) ksOpen(b.dataset.ksop); });
$("ksCancel").addEventListener("click", () => { $("ksForm").hidden = true; KS.mode = ""; });
$("ksSave").addEventListener("click", ksSave);
$("ksGrid").addEventListener("input", ksHint); $("ksGrid").addEventListener("change", ksHint);
$("ksDay").addEventListener("change", ksRender);

// ======================= TRANZAKSIYALAR =======================
const MT = { pendCancel:"", msg:"", msgT:null };
mlPanel("mtApp", `<div class="panel"><div class="thead"><h3>Tranzaksiyalar</h3></div>
  <div class="tmeta">Barcha pul harakatlari bir joyda. «avto» belgili yozuvlar boshqa bo'limlardagi hujjatdan keladi — ularni o'sha hujjatni bekor qilib o'zgartirasiz (sotuv, to'lov, qaytarish…). Qo'lda kiritilganlarni shu yerda bekor qilish mumkin.</div>
  <div class="omfil"><input type="date" id="mtFrom"><input type="date" id="mtTo"><select id="mtAcc"></select><select id="mtKind"></select><input id="mtQ" placeholder="Qidirish: mijoz, manba, izoh" style="min-width:200px"></div>
  <div class="omtot" id="mtTot"></div><div class="status" id="mtStatus"></div><div id="mtList"></div></div>`);
function mtRender() {
  if (!$("mtList")) return;
  if (!$("mtFrom").value) { const d = new Date(); $("mtFrom").value = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA"); $("mtTo").value = mlToday(); }
  const L = mlLedger(), av = $("mtAcc").value, kv = $("mtKind").value;
  $("mtAcc").innerHTML = `<option value="">Barcha kassalar</option>` + ksAccOpts(av); $("mtAcc").value = av;
  const kinds = [...new Set(L.rows.map(r => r.kind))].sort(); $("mtKind").innerHTML = `<option value="">Barcha turlar</option>` + kinds.map(k => `<option${k === kv ? " selected" : ""}>${esc(k)}</option>`).join("");
  const from = $("mtFrom").value, to = $("mtTo").value, q = mlK($("mtQ").value);
  const list = L.rows.filter(r => r.date >= from && r.date <= to && (!av || r.acc === av) && (!kv || r.kind === kv) && (!q || [r.who, r.src, r.note, r.kind].some(x => mlK(x).indexOf(q) >= 0)));
  const inn = {}, out = {}; list.forEach(r => { const m = r.amt > 0 ? inn : out; m[r.cur] = (m[r.cur] || 0) + Math.abs(r.amt); });
  const net = {}; Object.keys(Object.assign({}, inn, out)).forEach(c => { net[c] = (inn[c] || 0) - (out[c] || 0); });
  $("mtTot").innerHTML = `<div><div class="l">Kirim</div><div class="v mlin">${omMoneyMapSafe(inn)}</div></div><div><div class="l">Chiqim</div><div class="v mlout">${omMoneyMapSafe(out)}</div></div><div><div class="l">Farq</div><div class="v">${Object.entries(net).map(([c, v]) => mlMoney(v, c)).join(" + ") || "0"}</div></div><div><div class="l">Yozuvlar</div><div class="v">${list.length}</div></div>`;
  $("mtStatus").textContent = [mlLine(MOP, "Tranzaksiyalar"), MT.msg].filter(Boolean).join(" · ");
  $("mtList").innerHTML = list.length ? mlTable(list.slice().reverse().slice(0, 1000), true) : `<div class="empty-box">Tanlangan davrda yozuv yo'q</div>`;
}
["mtFrom", "mtTo", "mtAcc", "mtKind"].forEach(id => $(id).addEventListener("change", mtRender));
$("mtQ").addEventListener("input", mtRender);
async function mopCancel(id, render) {
  if (MOP.busy || !ML.mcp) return; MOP.busy = true;
  try {
    await mopReload(); const o = MOP.list.find(x => x.id === id); if (!o || o.cancelled) throw null;
    // Bekor qilish kassani manfiyga tushirmasin (masalan, kirim bekor qilinsa, u pul allaqachon sarflangan bo'lishi mumkin)
    const bal = mlBalances(), chk = (acc, cur, amt) => (((bal[acc] || {})[cur]) || 0) - amt < -0.005;
    let bad = "";
    if ((o.t === "in" || o.t === "open" || (o.t === "count" && o.sum > 0)) && chk(o.acc, o.cur, o.sum)) bad = `${o.acc}: ${krMoney(o.sum, o.cur)}`;
    if (o.t === "tr" && chk(o.acc2, o.cur, o.sum)) bad = `${o.acc2}: ${krMoney(o.sum, o.cur)}`;
    if (o.t === "fx" && chk(o.acc2 || o.acc, o.cur2, o.sum2)) bad = `${o.acc2 || o.acc}: ${krMoney(o.sum2, o.cur2)}`;
    if (bad) { mlSay(MT, render, `Bekor qilib bo'lmaydi: kassa manfiyga tushadi (${bad} yetishmaydi).`); throw null; }
    await ML.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Kassa operatsiyalari'!D${o.row}`, values:[["Bekor qilingan"]] });
    mlSay(MT, render, `${MOP_T[o.t]} №${o.number} bekor qilindi.`); try { await mopReload(); } catch (e) {}
  } catch (e) { if (e) mlSay(MT, render, krCodeMsg(e.code) || "Bekor qilib bo'lmadi."); }
  MOP.busy = false; MT.pendCancel = "";
}
["mtList", "ksList"].forEach(id => $(id).addEventListener("click", e => { const b = e.target.closest("button[data-mopcancel]"); if (!b) return; const r = id === "mtList" ? mtRender : ksRender; if (MT.pendCancel === b.dataset.mopcancel) mopCancel(b.dataset.mopcancel, r); else { MT.pendCancel = b.dataset.mopcancel; r(); } }));

// ======================= KASSA SANOG'I =======================
mlPanel("msApp", `<div class="panel"><div class="thead"><h3>Kassa sanog'i (kun yopish)</h3></div>
  <div class="tmeta">Kassadagi pulni sanab yozing. Tizimdagi qoldiqdan farq bo'lsa, «Sanoq farqi» bo'lib yoziladi va kassa qoldig'i haqiqiy pulga tenglashadi. Farq sababi izohda bo'lsin.</div>
  <div class="kform"><div class="kgrid"><label>Kassa<select id="msAcc"></select></label><label>Sana<input type="date" id="msDate"></label></div>
  <div class="ktable"><table><thead><tr><th>Valyuta</th><th>Tizimda</th><th>Sanaldi</th><th>Farq</th></tr></thead><tbody id="msRows"></tbody></table></div>
  <label class="full">Izoh (farq bo'lsa majburiy)<input id="msNote" maxlength="300"></label>
  <div class="kbtns"><button type="button" class="pri" id="msSave">Sanoqni saqlash</button></div><div class="status" id="msFmsg"></div></div></div>
  <div class="panel"><div class="thead"><h3>Oldingi sanoq farqlari</h3></div><div id="msList"></div></div>`);
function msRender() {
  if (!$("msRows")) return;
  const av = $("msAcc").value; $("msAcc").innerHTML = ksAccOpts(av || (mlKassas()[0] || {}).name); if (!$("msDate").value) $("msDate").value = mlToday();
  const b = mlBalances()[$("msAcc").value] || {}, prev = {}; document.querySelectorAll("#msRows input").forEach(i => { prev[i.dataset.cur] = i.value; });
  $("msRows").innerHTML = ["UZS", "USD"].map(c => { const sys = b[c] || 0, v = prev[c] !== undefined ? prev[c] : "", d = v === "" ? null : mlR2(Number(v) - sys); return `<tr><td>${c === "USD" ? "$" : "so'm"}</td><td class="num">${mlMoney(sys, c)}</td><td><input type="number" step="any" data-cur="${c}" value="${esc(v)}" placeholder="sanalgan summa" style="width:160px"></td><td class="num ${d < 0 ? "mlout" : d > 0 ? "mlin" : ""}">${d === null ? "" : d ? (d > 0 ? "+" : "−") + krMoney(Math.abs(d), c) : "teng"}</td></tr>`; }).join("");
  const list = MOP.list.filter(o => o.t === "count" && !o.cancelled).slice(0, 50);
  $("msList").innerHTML = list.length ? `<table><thead><tr><th>Sana</th><th>Kassa</th><th>Farq</th><th>Izoh</th></tr></thead><tbody>${list.map(o => `<tr><td>${esc(o.date)}</td><td>${esc(o.acc)}</td><td class="num ${o.sum < 0 ? "mlout" : "mlin"}">${o.sum > 0 ? "+" : "−"}${krMoney(Math.abs(o.sum), o.cur)}</td><td>${esc(o.note)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-box">Hozircha farq bo'lmagan</div>`;
}
async function msSave() {
  if (MOP.busy) return; if (!ML.mcp) return mlMsg("msFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const acc = $("msAcc").value, note = $("msNote").value.trim(), counted = {};
  document.querySelectorAll("#msRows input").forEach(i => { if (i.value.trim() !== "") counted[i.dataset.cur] = mlR2(i.value); });
  if (!Object.keys(counted).length) return mlMsg("msFmsg", "Kamida bitta valyutada sanalgan summani yozing.", true);
  MOP.busy = true; $("msSave").disabled = true;
  try {
    await mopReload(); const b = mlBalances()[acc] || {}, diffs = Object.entries(counted).map(([c, v]) => [c, mlR2(v - (b[c] || 0))]).filter(([, d]) => Math.abs(d) > 0.005);
    if (diffs.length && !note) { mlMsg("msFmsg", "Farq bor — izohga sababini yozing.", true); msRender(); throw null; }
    for (const [c, d] of diffs) await mopAdd({ t:"count", date:$("msDate").value || mlToday(), acc, cur:c, sum:d, note });
    mlSay(KS, msRender, diffs.length ? `Sanoq saqlandi: ${diffs.map(([c, d]) => (d > 0 ? "+" : "−") + krMoney(Math.abs(d), c)).join(", ")} farq yozildi.` : "Sanoq tizim bilan teng — farq yo'q.");
    mlMsg("msFmsg", diffs.length ? "Farq yozildi, kassa qoldig'i haqiqiy pulga tenglashdi." : "Kassa to'g'ri: tizimdagi qoldiq sanoq bilan teng."); $("msNote").value = ""; document.querySelectorAll("#msRows input").forEach(i => { i.value = ""; });
    try { await mopReload(); } catch (e) {}
  } catch (e) { if (e) mlMsg("msFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi.", true); }
  MOP.busy = false; $("msSave").disabled = false; msRender();
}
$("msAcc").addEventListener("change", () => { document.querySelectorAll("#msRows input").forEach(i => { i.value = ""; }); msRender(); });
$("msRows").addEventListener("input", e => { const tr = e.target.closest("tr"); const c = e.target.dataset.cur, sys = (mlBalances()[$("msAcc").value] || {})[c] || 0, v = e.target.value, cell = tr.lastElementChild; if (v === "") { cell.textContent = ""; return; } const d = mlR2(Number(v) - sys); cell.className = "num " + (d < 0 ? "mlout" : d > 0 ? "mlin" : ""); cell.textContent = d ? (d > 0 ? "+" : "−") + krMoney(Math.abs(d), c) : "teng"; });
$("msSave").addEventListener("click", msSave);

// ======================= BOSHLANG'ICH QOLDIQ =======================
mlPanel("mbApp", `<div class="panel"><div class="thead"><h3>Boshlang'ich qoldiq</h3></div>
  <div class="tmeta">Tsunami'da ishlashni boshlagan kundagi har bir kassadagi pul. Bir marta kiritiladi; xato bo'lsa — bekor qilib, qaytadan kiriting.</div>
  <div class="kform"><div class="kgrid"><label>Kassa<select id="mbAcc"></select></label><label class="span2">Summa<span class="inrow"><input type="number" id="mbSum" min="0" step="any"><select id="mbCur"><option value="UZS">so'm</option><option value="USD">$</option></select></span></label><label>Sana<input type="date" id="mbDate"></label></div>
  <div class="kbtns"><button type="button" class="pri" id="mbSave">Saqlash</button></div><div class="status" id="mbFmsg"></div></div></div>
  <div class="panel"><div class="thead"><h3>Kiritilgan boshlang'ich qoldiqlar</h3></div><div id="mbList"></div></div>`);
function mbRender() {
  if (!$("mbList")) return;
  const av = $("mbAcc").value; $("mbAcc").innerHTML = ksAccOpts(av); if (!$("mbDate").value) $("mbDate").value = mlToday();
  const list = MOP.list.filter(o => o.t === "open" && !o.cancelled), can = !!ML.mcp;
  $("mbList").innerHTML = list.length ? `<table><thead><tr><th>Sana</th><th>Kassa</th><th>Summa</th><th></th></tr></thead><tbody>${list.map(o => `<tr><td>${esc(o.date)}</td><td>${esc(o.acc)}</td><td class="num">${krMoney(o.sum, o.cur)}</td><td class="krAct">${can ? `<button data-mbcancel="${esc(o.id)}">${MT.pendCancel === o.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>` : ""}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-box">Hali kiritilmagan</div>`;
}
$("mbSave").addEventListener("click", async () => {
  if (MOP.busy) return; if (!ML.mcp) return mlMsg("mbFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const acc = $("mbAcc").value, cur = $("mbCur").value, sum = mlR2($("mbSum").value); if (!(sum > 0)) return mlMsg("mbFmsg", "Summani kiriting.", true);
  MOP.busy = true;
  try { await mopReload(); if (MOP.list.some(o => o.t === "open" && !o.cancelled && o.acc === acc && o.cur === cur)) { mlMsg("mbFmsg", `«${acc}» uchun ${cur === "USD" ? "$" : "so'm"} da boshlang'ich qoldiq bor: o'zgartirish uchun avval uni bekor qiling.`, true); throw null; } const n = await mopAdd({ t:"open", date:$("mbDate").value || mlToday(), acc, cur, sum }); mlMsg("mbFmsg", `Saqlandi (№${n}).`); $("mbSum").value = ""; try { await mopReload(); } catch (e) {} }
  catch (e) { if (e) mlMsg("mbFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi.", true); }
  MOP.busy = false;
});
$("mbList").addEventListener("click", e => { const b = e.target.closest("button[data-mbcancel]"); if (!b) return; if (MT.pendCancel === b.dataset.mbcancel) mopCancel(b.dataset.mbcancel, mbRender); else { MT.pendCancel = b.dataset.mbcancel; mbRender(); } });

// ======================= HISOBOTLAR → PUL OQIMI =======================
mlPanel("mflowApp", `<div class="panel"><div class="thead"><h3>Pul oqimi</h3><div class="hbtns"><input type="date" id="mfFrom"><input type="date" id="mfTo"></div></div>
  <div class="tmeta">Davr boshidagi qoldiq + kirimlar − chiqimlar = davr oxiridagi qoldiq (kassalar o'rtasidagi o'tkazmalarsiz). Har bir tur bo'yicha.</div>
  <div id="mfList"></div></div>`);
function mfRender() {
  if (!$("mfList")) return;
  if (!$("mfFrom").value) { const d = new Date(); $("mfFrom").value = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA"); $("mfTo").value = mlToday(); }
  const from = $("mfFrom").value, to = $("mfTo").value, rows = mlLedger().rows, curs = ["UZS", "USD"];
  const start = {}, end = {}, by = {};
  rows.forEach(r => { if (r.date < from) start[r.cur] = (start[r.cur] || 0) + r.amt; if (r.date <= to) end[r.cur] = (end[r.cur] || 0) + r.amt; if (r.date >= from && r.date <= to && r.kind !== "O'tkazma") { const k = (r.amt > 0 ? "+" : "−") + r.kind, o = by[k] || (by[k] = {}); o[r.cur] = (o[r.cur] || 0) + r.amt; } });
  const line = (label, m, cls) => `<tr><td class="${cls || ""}">${label}</td>${curs.map(c => `<td class="num ${cls || ""}">${mlMoney(m[c] || 0, c)}</td>`).join("")}</tr>`;
  const ins = Object.entries(by).filter(([k]) => k[0] === "+").sort(), outs = Object.entries(by).filter(([k]) => k[0] !== "+").sort();
  const sum = list => { const m = {}; list.forEach(([, o]) => Object.entries(o).forEach(([c, v]) => { m[c] = (m[c] || 0) + v; })); return m; };
  $("mfList").innerHTML = `<table><thead><tr><th></th>${curs.map(c => `<th>${c === "USD" ? "$" : "so'm"}</th>`).join("")}</tr></thead><tbody>` + line("<b>Davr boshidagi qoldiq</b>", start) + ins.map(([k, o]) => line("&nbsp;&nbsp;" + esc(k.slice(1)), o, "mlin")).join("") + line("<b>Jami kirim</b>", sum(ins), "mlin") + outs.map(([k, o]) => line("&nbsp;&nbsp;" + esc(k.slice(1)), o, "mlout")).join("") + line("<b>Jami chiqim</b>", sum(outs), "mlout") + line("<b>Davr oxiridagi qoldiq</b>", end) + `</tbody></table>`;
}
["mfFrom", "mfTo"].forEach(id => $(id).addEventListener("change", mfRender));

// ======================= Yo'naltirish va yuklash =======================
const ML_APPS = { moliya:{ "Kassa":["mkApp2", ksRender], "Tranzaksiyalar":["mtApp", mtRender], "Kassa sanog'i":["msApp", msRender], "Boshlang'ich qoldiq":["mbApp", mbRender] }, sozlamalar:{ "Kassalar":["mkassaApp", mkasRender], "Kirim va xarajat turlari":["mcatApp", mcatRender] }, hisobotlar:{ "Pul oqimi":["mflowApp", mfRender] } };
function mlRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "", on = {};
  Object.entries(ML_APPS).forEach(([s, apps]) => Object.entries(apps).forEach(([name, [app]]) => { on[app] = on[app] || (s === sec && name === n); }));
  Object.keys(on).forEach(app => document.body.classList.toggle(app + "-on", on[app]));
  const hit = (ML_APPS[sec] || {})[n]; if (hit) hit[1]();
}
function mlRenderAll() { const b = document.body.classList; if (b.contains("mkApp2-on")) ksRender(); if (b.contains("mtApp-on")) mtRender(); if (b.contains("msApp-on")) msRender(); if (b.contains("mbApp-on")) mbRender(); if (b.contains("mkassaApp-on")) mkasRender(); if (b.contains("mcatApp-on")) mcatRender(); if (b.contains("mflowApp-on")) mfRender(); }
const mlOrigRenderSub = renderSub;
renderSub = function (i) { mlOrigRenderSub(i); mlRoute(); };
const mlOrigSlApply = slApply; slApply = function (vals) { mlOrigSlApply(vals); mlRenderAll(); };
setInterval(mlRenderAll, 30000);
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { MKS.state = MOP.state = "off"; mlRenderAll(); return; }
  ML.mcp = mcp;
  [[MKS, MKS_RANGE, mksApply, 300000], [MOP, MOP_RANGE, mopApply, 60000]].forEach(([o, range, apply, every]) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        if (o.state !== "ok" || !o.list.length) o.state = (ev.error && ev.error.code) || "upstream_error";
        mlRenderAll();
      }, { refetchInterval:every });
    } catch (e) {}
  });
})();
mlRoute();
