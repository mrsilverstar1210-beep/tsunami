// ===== Tsunami: Kadrlar → Xodimlar, Davomat, Ish haqi; Sozlamalar → Bo'lim va lavozimlar; Hisobotlar → Sotuvchilar KPI =====
// Davomat va jarimalar «5Tech — Davomat (bot)» jadvalidan jonli o'qiladi (faqat o'qish). Ish haqi to'lovlari kassadan chiqim bo'lib yoziladi.
const HR = { mcp:null };
const BOT_ID = "1TtmWLo_MeIxfDl-gffeEHY5xg3W_ORcHzEtDEIJRqgg", APP_ID = "16SmtbXHdZ5Y15x2gLkrt8QZAIBwc6oA0HZzsgFMyJ-0";
const hrToday = () => new Date().toLocaleDateString("en-CA");
const hrMonth = () => hrToday().slice(0, 7);
const hrK = s => String(s || "").trim().toLowerCase();
const hrD9 = p => String(p || "").replace(/\D/g, "").slice(-9);
function hrId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function hrMsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function hrSay(o, render, m) { o.msg = m; clearTimeout(o.msgT); o.msgT = setTimeout(() => { o.msg = ""; render(); }, 7000); render(); }
function hrLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Jadvalga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
function hrPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
const hrSom = n => krMoney(Number(n) || 0, "UZS");
(function hrCss() {
  const st = document.createElement("style");
  st.textContent = "#hxApp,#hdApp,#hpApp,#hsApp,#hkApp{display:none}.hxApp-on #hxApp,.hdApp-on #hdApp,.hpApp-on #hpApp,.hsApp-on #hsApp,.hkApp-on #hkApp{display:block}"
    + ".hxApp-on .gen,.hxApp-on #kpis,.hdApp-on .gen,.hdApp-on #kpis,.hpApp-on .gen,.hpApp-on #kpis,.hsApp-on .gen,.hsApp-on #kpis,.hkApp-on .gen,.hkApp-on #kpis,.hkApp-on .salesbar{display:none}"
    + ".hrgone td{color:#9ca3af}.hrpay input{width:130px;font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:8px}.hrpay select{font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:8px}";
  document.head.appendChild(st);
})();

// ======================= Sozlamalar: bo'lim va lavozimlar =======================
const HS_RANGE = "'Kadrlar sozlamalari'!A1:E300";
const HS_DEF = { dep:["Savdo", "Ombor", "Boshqaruv", "Servis", "Marketing"], pos:["Sotuvchi", "Kassir", "Omborchi", "Menejer", "Agent", "Kuryer", "Usta"] };
const HS = { list:[], state:"loading", busy:false, msg:"", msgT:null, pendDel:"" };
function hsParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[3] || "") !== "O'chirilgan" && String(r[2] || "").trim()) out.push({ id:String(r[0]), row:i + 1, kind:String(r[1] || "") === "pos" ? "pos" : "dep", name:String(r[2]).trim() }); }); return out; }
function hsNames(kind) { const l = HS.list.filter(x => x.kind === kind); return HS.state === "ok" && l.length ? l.map(x => x.name) : HS_DEF[kind]; }
function hsApply(vals) { HS.list = hsParse(vals); HS.state = "ok"; hsRender(); hxSelects(); }
async function hsReload() { const r = await HR.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:HS_RANGE }, { cache:false }); hsApply(krVals({ result:r })); }
hrPanel("hsApp", `<div class="panel"><div class="thead"><h3>Bo'limlar va lavozimlar</h3></div><div class="tmeta">Xodim kartasidagi «Bo'lim» va «Lavozim» ro'yxatlari shu yerdan olinadi.</div>
  <form id="hsForm" class="kform"><div class="inrow" style="max-width:600px"><select id="hsKind"><option value="dep">Bo'lim</option><option value="pos">Lavozim</option></select><input id="hsName" maxlength="60" placeholder="Yangi nom"><button type="button" class="pri" id="hsAdd">Qo'shish</button></div></form>
  <div class="status" id="hsStatus"></div><div id="hsList"></div></div>`);
function hsRender() {
  if (!$("hsList")) return;
  $("hsStatus").textContent = [hrLine(HS, "Sozlama"), HS.msg].filter(Boolean).join(" · ");
  const can = !!HR.mcp, block = kind => { const rows = HS.state === "ok" && HS.list.some(x => x.kind === kind) ? HS.list.filter(x => x.kind === kind) : HS_DEF[kind].map(n => ({ id:"", name:n })); return `<h4 style="margin:12px 0 4px">${kind === "dep" ? "Bo'limlar" : "Lavozimlar"}</h4><table><tbody>` + rows.map(x => `<tr><td>${esc(x.name)}</td><td class="num tmeta">${HX.list.filter(e => e.st !== "gone" && hrK(kind === "dep" ? e.dep : e.pos) === hrK(x.name)).length} xodim</td><td class="krAct">${can && x.id ? `<button data-hsdel="${esc(x.id)}">${HS.pendDel === x.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`; };
  $("hsList").innerHTML = block("dep") + block("pos");
}
$("hsForm").addEventListener("submit", e => e.preventDefault());
$("hsAdd").addEventListener("click", async () => {
  const kind = $("hsKind").value, name = $("hsName").value.trim(); if (!name) return hrSay(HS, hsRender, "Nomini yozing.");
  if (HS.busy || !HR.mcp) return; HS.busy = true;
  try {
    await hsReload(); if (hsNames(kind).some(n => hrK(n) === hrK(name))) { hrSay(HS, hsRender, `«${name}» bor.`); throw null; }
    const now = krT(new Date().toISOString()), rows = HS.list.some(x => x.kind === kind) ? [] : HS_DEF[kind].map(n => [krT(hrId("Z")), kind, krT(n), "Faol", now]); rows.push([krT(hrId("Z")), kind, krT(name), "Faol", now]);
    await HR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Kadrlar sozlamalari'!A1", values:rows }); $("hsName").value = ""; hrSay(HS, hsRender, `«${name}» qo'shildi.`); try { await hsReload(); } catch (e) {}
  } catch (e) { if (e) hrSay(HS, hsRender, krCodeMsg(e.code) || "Saqlab bo'lmadi."); }
  HS.busy = false;
});
$("hsList").addEventListener("click", async e => {
  const b = e.target.closest("[data-hsdel]"); if (!b) return; const id = b.dataset.hsdel;
  if (HS.pendDel !== id) { HS.pendDel = id; return hsRender(); }
  if (HS.busy || !HR.mcp) return; HS.busy = true;
  try { await hsReload(); const x = HS.list.find(r => r.id === id); if (!x) throw null; if (HS.list.filter(r => r.kind === x.kind).length <= 1) { hrSay(HS, hsRender, "Kamida bittasi qolishi kerak."); throw null; } await HR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Kadrlar sozlamalari'!D${x.row}`, values:[["O'chirilgan"]] }); hrSay(HS, hsRender, `«${x.name}» o'chirildi.`); try { await hsReload(); } catch (e2) {} }
  catch (err) { if (err) hrSay(HS, hsRender, krCodeMsg(err.code) || "O'chirib bo'lmadi."); }
  HS.busy = false; HS.pendDel = "";
});

// ======================= XODIMLAR =======================
const HX_RANGE = "Xodimlar!A1:N500";
const HX = { list:[], state:"loading", busy:false, editId:"", filter:"work", q:"", msg:"", msgT:null };
FORM_FOCUS.hxApp = "hxName";
hrPanel("hxApp", `<div class="panel fpanel"><div class="thead"><h3 id="hxTitle">Yangi xodim</h3><button type="button" class="closebtn" data-close="hxApp">Yopish ✕</button></div>
  <form id="hxForm" class="kform"><div class="kgrid">
    <label class="span2">F.I.Sh.<input id="hxName" maxlength="120" placeholder="Familiya Ism"></label>
    <label>Telefon<input id="hxPhone" maxlength="30" inputmode="tel" placeholder="+998 90 123 45 67"></label>
    <label>Jinsi<select id="hxGender"><option>Erkak</option><option>Ayol</option></select></label>
    <label>Bo'lim<select id="hxDep"></select></label><label>Lavozim<select id="hxPos"></select></label>
    <label>Tashkilot<select id="hxOrg"></select></label>
    <label>Ishga kirgan sana<input type="date" id="hxStart"></label>
    <label class="span2">Oylik (so'm)<input type="number" id="hxSalary" min="0" step="1000" placeholder="3000000"></label>
    <label>Holat<select id="hxSt"><option value="work">Ishlaydi</option><option value="gone">Ishdan ketgan</option></select></label>
    <label class="span2">Izoh<input id="hxNote" maxlength="200" placeholder="ixtiyoriy"></label>
  </div><div class="kbtns"><button type="button" class="pri" id="hxSave">Saqlash</button></div><div class="status" id="hxFmsg"></div></form></div>
  <div class="panel"><div class="thead"><h3>Xodimlar</h3><div class="hbtns"><input class="search" id="hxQ" placeholder="Qidirish: ism, telefon, lavozim"><div class="filters" id="hxFilters"></div><button type="button" class="lnk" id="hxImport">Davomat botidan import</button><button type="button" class="openbtn" data-open="hxApp">+ Yangi xodim</button></div></div>
  <div class="status" id="hxStatus"></div><div id="hxList"></div></div>`);
function hxParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0] || String(r[10] || "") === "O'chirilgan") return;
    out.push({ id:String(r[0]), row:i + 1, name:String(r[1] || ""), phone:String(r[2] || ""), gender:String(r[3] || ""), dep:String(r[4] || ""), pos:String(r[5] || ""), org:String(r[6] || ""), start:String(r[7] || ""), salary:Number(r[8]) || 0, st:String(r[9] || "") === "Ishdan ketgan" ? "gone" : "work", note:String(r[11] || ""), createdAt:String(r[12] || "") });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
function hxApply(vals) { HX.list = hxParse(vals); HX.state = "ok"; hrRenderAll(); }
async function hxReload() { const r = await HR.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:HX_RANGE }, { cache:false }); hxApply(krVals({ result:r })); }
function hxSelects() {
  const set = (id, opts) => { const s = $(id); if (!s) return; const v = s.value; s.innerHTML = opts.map(o => `<option>${esc(o)}</option>`).join(""); if (v && opts.indexOf(v) >= 0) s.value = v; };
  set("hxDep", hsNames("dep")); set("hxPos", hsNames("pos")); set("hxOrg", Object.keys(KR.orgs).sort());
}
function hxReset() { HX.editId = ""; ["hxName", "hxPhone", "hxSalary", "hxNote"].forEach(id => { $(id).value = ""; }); $("hxStart").value = hrToday(); $("hxGender").value = "Erkak"; $("hxSt").value = "work"; hxSelects(); $("hxTitle").textContent = "Yangi xodim"; hrMsg("hxFmsg", ""); }
function hxLoad(id) {
  const x = HX.list.find(e => e.id === id); if (!x) return; hxReset(); HX.editId = id; $("hxTitle").textContent = `Tahrirlash: ${x.name}`;
  $("hxName").value = x.name; $("hxPhone").value = x.phone; $("hxGender").value = x.gender === "Ayol" ? "Ayol" : "Erkak"; $("hxStart").value = x.start; $("hxSalary").value = x.salary || ""; $("hxSt").value = x.st; $("hxNote").value = x.note;
  const opt = (sel, v) => { if (v && ![...$(sel).options].some(o => o.value === v)) $(sel).insertAdjacentHTML("beforeend", `<option>${esc(v)}</option>`); if (v) $(sel).value = v; };
  opt("hxDep", x.dep); opt("hxPos", x.pos); opt("hxOrg", x.org); openForm("hxApp", true);
}
function hxRow(o, ex) { const now = new Date().toISOString(); return [krT(ex ? ex.id : hrId("X")), krT(o.name), krT(o.phone), krT(o.gender), krT(o.dep), krT(o.pos), krT(o.org), krT(o.start), o.salary || "", o.st === "gone" ? "Ishdan ketgan" : "Ishlaydi", "Faol", krT(o.note || ""), krT(ex ? ex.createdAt : now), krT(now)]; }
async function hxSave() {
  if (HX.busy) return; if (!HR.mcp) return hrMsg("hxFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const o = { name:$("hxName").value.trim(), phone:typeof ptPhone === "function" ? ptPhone($("hxPhone").value) : $("hxPhone").value.trim(), gender:$("hxGender").value, dep:$("hxDep").value, pos:$("hxPos").value, org:$("hxOrg").value, start:$("hxStart").value, salary:Number($("hxSalary").value) || 0, st:$("hxSt").value, note:$("hxNote").value.trim() };
  if (!o.name) return hrMsg("hxFmsg", "F.I.Sh. ni yozing.", true);
  if (!o.phone) return hrMsg("hxFmsg", "Telefon raqamini yozing: davomat bot bilan shu raqam orqali bog'lanadi.", true);
  if (o.salary < 0) return hrMsg("hxFmsg", "Oylik manfiy bo'lmasin.", true);
  HX.busy = true; $("hxSave").disabled = true;
  try {
    await hxReload();
    const dup = HX.list.find(e => e.id !== HX.editId && hrD9(e.phone) === hrD9(o.phone)); if (dup) { hrMsg("hxFmsg", `Bu telefon «${dup.name}» da bor.`, true); throw null; }
    const ex = HX.editId ? HX.list.find(e => e.id === HX.editId) : null;
    if (ex) await HR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Xodimlar!A${ex.row}:N${ex.row}`, values:[hxRow(o, ex)] });
    else await HR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Xodimlar!A1", values:[hxRow(o)] });
    hrSay(HX, hxRender, ex ? `${o.name} saqlandi.` : `${o.name} qo'shildi.`); hxReset(); openForm("hxApp", false); try { await hxReload(); } catch (e) {}
  } catch (e) { if (e) hrMsg("hxFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  HX.busy = false; $("hxSave").disabled = false;
}
// Davomat bot va ilova jadvalidagi xodimlarni (telefon bo'yicha) Tsunami ro'yxatiga qo'shish
async function hxImport() {
  if (HX.busy || !HR.mcp) return hrSay(HX, hxRender, krDbLine() || "Tsunami bazasi ulanmagan.");
  HX.busy = true;
  try {
    await hxReload(); await botReload(true);
    const have = new Set(HX.list.map(e => hrD9(e.phone))), add = [], seen = new Set();
    BOT.app.forEach(a => { const d = hrD9(a.phone); if (!d || have.has(d) || seen.has(d)) return; seen.add(d); const b = BOT.staff.find(x => hrD9(x.phone) === d); add.push({ name:a.name, phone:typeof ptPhone === "function" ? ptPhone(a.phone) : a.phone, gender:b ? b.gender : "", dep:"", pos:a.pos || "", org:Object.keys(KR.orgs).sort()[0] || "", start:"", salary:a.salary || 0, st:"work", note:"Davomat botidan" }); });
    BOT.staff.forEach(b => { const d = hrD9(b.phone); if (!d || have.has(d) || seen.has(d) || b.status !== "Faol") return; seen.add(d); add.push({ name:b.name, phone:typeof ptPhone === "function" ? ptPhone(b.phone) : b.phone, gender:b.gender, dep:"", pos:"", org:Object.keys(KR.orgs).sort()[0] || "", start:"", salary:0, st:"work", note:"Davomat botidan" }); });
    if (!add.length) { hrSay(HX, hxRender, "Yangi xodim topilmadi: botdagilarning hammasi ro'yxatda bor."); throw null; }
    await HR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Xodimlar!A1", values:add.map(o => hxRow(o)) });
    hrSay(HX, hxRender, `${add.length} ta xodim qo'shildi: ${add.map(o => o.name).join(", ")}. Oylik va lavozimlarini tekshiring.`); try { await hxReload(); } catch (e) {}
  } catch (e) { if (e) hrSay(HX, hxRender, krCodeMsg(e.code) || "Import qilib bo'lmadi."); }
  HX.busy = false;
}
function hxRender() {
  if (!$("hxList")) return;
  const counts = { work:HX.list.filter(e => e.st === "work").length, gone:HX.list.filter(e => e.st === "gone").length };
  $("hxFilters").innerHTML = [["work", "Ishlaydi"], ["gone", "Ishdan ketgan"]].map(([k, l]) => `<button data-f="${k}" class="${HX.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  const tot = HX.list.filter(e => e.st === "work").reduce((a, e) => a + e.salary, 0);
  $("hxStatus").textContent = [hrLine(HX, "Xodimlar"), HX.msg, HX.state === "ok" && counts.work ? `Oylik fondi: ${hrSom(tot)}` : ""].filter(Boolean).join(" · ");
  const q = hrK(HX.q), list = HX.list.filter(e => e.st === HX.filter && (!q || [e.name, e.phone, e.pos, e.dep].some(x => hrK(x).indexOf(q) >= 0)));
  if (!list.length) { $("hxList").innerHTML = `<div class="empty-box">${HX.state === "ok" ? (HX.list.length ? "Bu ro'yxatda xodim yo'q" : "Hozircha xodim yo'q: «Davomat botidan import» yoki «Yangi xodim» tugmasini bosing") : ""}</div>`; return; }
  const can = !!HR.mcp, m = hrMonth();
  $("hxList").innerHTML = `<table><thead><tr><th>F.I.Sh.</th><th>Telefon</th><th>Bo'lim / lavozim</th><th>Tashkilot</th><th>Ishga kirgan</th><th>Oylik</th><th>Davomat (shu oy)</th><th></th></tr></thead><tbody>` + list.map(e => {
    const j = botFine(e, m), bot = botOf(e);
    return `<tr class="${e.st === "gone" ? "hrgone" : ""}"><td><b>${esc(e.name)}</b>${e.gender ? `<div class="tmeta">${esc(e.gender)}</div>` : ""}</td><td class="mono">${esc(e.phone)}</td><td>${esc(e.dep) || "—"}<div class="tmeta">${esc(e.pos)}</div></td><td>${esc(e.org)}</td><td>${esc(e.start) || "—"}</td><td class="num">${e.salary ? hrSom(e.salary) : "—"}</td><td class="small">${!bot ? `<span class="tmeta">botda yo'q</span>` : j ? `kechikish ${j.lates}, kelmagan ${j.abs}${j.total ? `<div class="mlout">jarima ${hrSom(j.total)}</div>` : ""}` : `<span class="tmeta">botda bor</span>`}</td><td class="krAct">${can ? `<button data-hxedit="${esc(e.id)}">Tahrirlash</button>` : ""}</td></tr>`;
  }).join("") + `</tbody></table>`;
}
$("hxForm").addEventListener("submit", e => e.preventDefault());
$("hxSave").addEventListener("click", hxSave);
$("hxImport").addEventListener("click", hxImport);
$("hxForm").addEventListener("focusout", e => { if (e.target.id === "hxPhone" && e.target.value.trim() && typeof ptPhone === "function") e.target.value = ptPhone(e.target.value); });
$("hxQ").addEventListener("input", e => { HX.q = e.target.value; hxRender(); });
$("hxFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { HX.filter = b.dataset.f; hxRender(); } });
$("hxList").addEventListener("click", e => { const b = e.target.closest("button[data-hxedit]"); if (b) hxLoad(b.dataset.hxedit); });

// ======================= DAVOMAT BOT (faqat o'qish) =======================
const BOT = { state:"loading", staff:[], rows:[], fines:[], app:[], at:0 };
function botParse(res) {
  const v = r => (krVals({ result:r }) || []).slice(1).filter(x => Array.isArray(x) && x.length);
  BOT.staff = v(res[0]).map(r => ({ name:String(r[1] || "").trim(), phone:String(r[2] || ""), status:String(r[3] || ""), gender:String(r[6] || "") }));
  BOT.rows = v(res[1]).map(r => { const d = String(r[0] || "").split("."); return { date:d.length === 3 ? `${d[2]}-${d[1]}-${d[0]}` : String(r[0] || ""), time:String(r[1] || ""), name:String(r[2] || "").trim(), type:String(r[3] || ""), late:Number(r[4]) || 0 }; });
  BOT.fines = v(res[2]).map(r => ({ month:String(r[0] || ""), name:String(r[1] || "").trim(), lates:Number(r[3]) || 0, lateFine:Number(r[4]) || 0, abs:Number(r[5]) || 0, extra:Number(r[6]) || 0, absFine:Number(r[7]) || 0, total:Number(r[8]) || 0, salary:Number(r[9]) || 0 }));
  BOT.app = v(res[3]).map(r => ({ name:String(r[1] || "").trim(), phone:String(r[2] || ""), pos:String(r[5] || "") }));
  BOT.state = "ok"; BOT.at = Date.now();
}
async function botReload(force) {
  if (!HR.mcp || (!force && Date.now() - BOT.at < 120000 && BOT.state === "ok")) return;
  try {
    const res = await Promise.all([[BOT_ID, "Xodimlar!A1:G300"], [BOT_ID, "Davomat!A1:E20000"], [BOT_ID, "Jarimalar!A1:J2000"], [APP_ID, "Xodimlar!A1:H300"]].map(([id, range]) => HR.mcp.callTool(GS, "get_values", { spreadsheetId:id, range }, { cache:false })));
    botParse(res);
  } catch (e) { BOT.state = (e && e.code) || "upstream_error"; }
  hrRenderAll();
}
// Xodimning botdagi nomlari (bot ro'yxati va ilova ro'yxati — telefon orqali)
function botNames(e) { const d = hrD9(e.phone), s = new Set([hrK(e.name)]); BOT.staff.filter(b => hrD9(b.phone) === d).forEach(b => s.add(hrK(b.name))); BOT.app.filter(a => hrD9(a.phone) === d).forEach(a => s.add(hrK(a.name))); return s; }
function botOf(e) { const d = hrD9(e.phone); return BOT.staff.some(b => hrD9(b.phone) === d) || BOT.app.some(a => hrD9(a.phone) === d); }
function botFine(e, month) { const ns = botNames(e); return BOT.fines.find(f => f.month === month && ns.has(hrK(f.name))) || null; }

// ======================= DAVOMAT =======================
hrPanel("hdApp", `<div class="panel"><div class="thead"><h3>Davomat</h3><div class="hbtns"><input type="date" id="hdDate"><button type="button" class="lnk" id="hdRefresh">Yangilash</button></div></div>
  <div class="tmeta">Ma'lumot «5Tech — Davomat (bot)» jadvalidan jonli olinadi (o'zgartirish botning o'zida). Ish vaqti qoidalari va jarimalar botdagi kabi hisoblanadi.</div>
  <div class="status" id="hdStatus"></div><div id="hdDay"></div>
  <h4 style="margin:16px 0 6px">Oy bo'yicha jarimalar <select id="hdMonth" style="font:inherit;margin-left:8px"></select></h4><div id="hdMon"></div></div>`);
function hdRender() {
  if (!$("hdDay")) return;
  if (!$("hdDate").value) $("hdDate").value = hrToday();
  const date = $("hdDate").value, staff = HX.list.filter(e => e.st === "work");
  $("hdStatus").textContent = [hrLine(BOT, "Davomat"), hrLine(HX, "Xodimlar")].filter(Boolean).join(" · ");
  const rowsOf = e => { const ns = botNames(e); return BOT.rows.filter(r => r.date === date && ns.has(hrK(r.name))); };
  const lst = staff.map(e => { const rs = rowsOf(e), inn = rs.filter(r => r.type === "Keldi").sort((a, b) => a.time.localeCompare(b.time))[0], out = rs.filter(r => r.type === "Ketdi").sort((a, b) => b.time.localeCompare(a.time))[0]; return { e, inn, out }; });
  const came = lst.filter(x => x.inn).length;
  $("hdDay").innerHTML = !staff.length ? `<div class="empty-box">${HX.state === "ok" ? "Xodimlar ro'yxati bo'sh: Kadrlar → Xodimlar'da «Davomat botidan import» qiling" : ""}</div>`
    : `<div class="tmeta" style="margin:6px 0">${date}: keldi ${came} / ${staff.length}</div><table><thead><tr><th>Xodim</th><th>Keldi</th><th>Kechikish</th><th>Ketdi</th><th>Holat</th></tr></thead><tbody>` + lst.map(({ e, inn, out }) => `<tr><td><b>${esc(e.name)}</b><div class="tmeta">${esc(e.pos)}</div></td><td>${inn ? esc(inn.time) : "—"}</td><td class="num ${inn && inn.late > 10 ? "late" : ""}">${inn && inn.late > 0 ? inn.late + " daq" : "—"}</td><td>${out ? esc(out.time) : "—"}</td><td>${!botOf(e) ? `<span class="tmeta">botda yo'q</span>` : inn ? (inn.late > 10 ? `<span class="st st-late">Kechikdi</span>` : `<span class="st st-done">Vaqtida</span>`) : date < hrToday() ? `<span class="st st-draft">Kelmagan</span>` : `<span class="st st-yangi">Hali kelmagan</span>`}</td></tr>`).join("") + `</tbody></table>`;
  const months = [...new Set(BOT.fines.map(f => f.month).concat([hrMonth()]))].sort().reverse(), mv = $("hdMonth").value || hrMonth();
  $("hdMonth").innerHTML = months.map(m => `<option${m === mv ? " selected" : ""}>${m}</option>`).join("");
  const fm = staff.map(e => ({ e, f:botFine(e, $("hdMonth").value) })).filter(x => x.f);
  $("hdMon").innerHTML = fm.length ? `<table><thead><tr><th>Xodim</th><th>Kechikishlar</th><th>Kechikish jarimasi</th><th>Kelmagan kunlar</th><th>Ortiqcha</th><th>Kelmaslik jarimasi</th><th>Jami jarima</th></tr></thead><tbody>` + fm.map(({ e, f }) => `<tr><td><b>${esc(e.name)}</b></td><td class="num">${f.lates}</td><td class="num">${f.lateFine ? hrSom(f.lateFine) : "—"}</td><td class="num">${f.abs}</td><td class="num">${f.extra}</td><td class="num">${f.absFine ? hrSom(f.absFine) : "—"}</td><td class="num ${f.total ? "mlout" : ""}">${f.total ? hrSom(f.total) : "—"}</td></tr>`).join("") + `</tbody></table>` : `<div class="empty-box">${BOT.state === "ok" ? "Bu oy uchun jarima ma'lumoti yo'q" : ""}</div>`;
}
$("hdDate").addEventListener("change", hdRender); $("hdMonth").addEventListener("change", hdRender);
$("hdRefresh").addEventListener("click", () => botReload(true));

// ======================= ISH HAQI =======================
const SAL_RANGE = "'Ish haqi'!A1:M5000";
var SAL = { list:[], state:"loading", busy:false, msg:"", msgT:null, month:"", act:"" };
const SAL_T = { pay:"To'lov", adv:"Avans", bonus:"Bonus", ded:"Ushlab qolish" };
hrPanel("hpApp", `<div class="panel"><div class="thead"><h3>Ish haqi</h3><div class="hbtns"><input type="month" id="hpMonth"></div></div>
  <div class="tmeta">Hisoblandi = oylik + bonus − davomat jarimasi − ushlab qolish. To'landi = shu oy uchun berilgan avans va to'lovlar. To'lov kassadan chiqim bo'lib yoziladi va kassada yetarli pul bo'lishi kerak.</div>
  <div class="omtot" id="hpTot"></div><div class="status" id="hpStatus"></div><div id="hpList"></div>
  <h4 style="margin:16px 0 6px">Shu oydagi yozuvlar</h4><div id="hpLog"></div></div>`);
function salParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const t = Object.keys(SAL_T).find(k => SAL_T[k] === String(r[2] || "")) || "pay";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, t, cancelled:String(r[3] || "") === "Bekor qilingan", date:String(r[4] || ""), month:String(r[5] || ""), emp:String(r[6] || ""), empName:String(r[7] || ""), sum:Number(r[8]) || 0, acc:String(r[9] || ""), note:String(r[10] || ""), createdAt:String(r[11] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function salApply(vals) { SAL.list = salParse(vals); SAL.state = "ok"; if (typeof MLC !== "undefined") MLC.v++; hrRenderAll(); if (typeof mlRenderAll === "function") mlRenderAll(); }
async function salReload() { const r = await HR.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:SAL_RANGE }, { cache:false }); salApply(krVals({ result:r })); }
function salCalc(e, month) {
  const recs = SAL.list.filter(s => !s.cancelled && s.emp === e.id && s.month === month), sum = t => recs.filter(s => s.t === t).reduce((a, s) => a + s.sum, 0);
  const f = botFine(e, month), fine = f ? f.total : 0, bonus = sum("bonus"), ded = sum("ded"), paid = sum("pay") + sum("adv");
  const due = Math.max(0, e.salary + bonus - fine - ded);
  return { salary:e.salary, bonus, fine, ded, due, paid, left:Math.round(due - paid) };
}
function hpRender() {
  if (!$("hpList")) return;
  if (!$("hpMonth").value) $("hpMonth").value = hrMonth();
  const month = $("hpMonth").value, staff = HX.list.filter(e => e.st === "work" || SAL.list.some(s => !s.cancelled && s.emp === e.id && s.month === month));
  $("hpStatus").textContent = [hrLine(SAL, "Ish haqi"), hrLine(BOT, "Davomat"), SAL.msg].filter(Boolean).join(" · ");
  if (!staff.length) { $("hpList").innerHTML = `<div class="empty-box">${HX.state === "ok" ? "Xodimlar ro'yxati bo'sh" : ""}</div>`; $("hpTot").innerHTML = ""; $("hpLog").innerHTML = ""; return; }
  const rows = staff.map(e => ({ e, c:salCalc(e, month) })), T = k => rows.reduce((a, x) => a + x.c[k], 0), can = !!HR.mcp;
  $("hpTot").innerHTML = `<div><div class="l">Hisoblandi</div><div class="v">${hrSom(T("due"))}</div></div><div><div class="l">Jarimalar</div><div class="v mlout">${hrSom(T("fine"))}</div></div><div><div class="l">To'landi</div><div class="v">${hrSom(T("paid"))}</div></div><div><div class="l">Qoldi</div><div class="v">${hrSom(rows.reduce((a, x) => a + Math.max(0, x.c.left), 0))}</div></div>`;
  const accs = typeof mlKassas === "function" ? mlKassas().map(k => k.name) : ["Naqd kassa"];
  $("hpList").innerHTML = `<table><thead><tr><th>Xodim</th><th>Oylik</th><th>Bonus</th><th>Jarima (bot)</th><th>Ushlab qolish</th><th>Hisoblandi</th><th>To'landi</th><th>Qoldi</th><th></th></tr></thead><tbody>` + rows.map(({ e, c }) => {
    const open = SAL.act.split("|")[0] === e.id ? SAL.act.split("|")[1] : "";
    let act = "";
    if (can && open) act = `<div class="hrpay"><input type="number" data-hpsum min="0" step="1000" value="${open === "pay" ? Math.max(0, c.left) : ""}" placeholder="Summa">${open === "pay" || open === "adv" ? `<select data-hpacc>${accs.map(a => `<option>${esc(a)}</option>`).join("")}</select>` : ""}<input data-hpnote placeholder="Izoh" style="width:140px"><button data-hpsave="${esc(e.id)}" data-t="${open}">Saqlash</button><button data-hpx="1">Orqaga</button></div>`;
    else if (can) act = `<button data-hpact="${esc(e.id)}|pay">To'lash</button><button data-hpact="${esc(e.id)}|adv">Avans</button><button data-hpact="${esc(e.id)}|bonus">Bonus</button><button data-hpact="${esc(e.id)}|ded">Ushlab qolish</button>`;
    return `<tr class="${e.st === "gone" ? "hrgone" : ""}"><td><b>${esc(e.name)}</b><div class="tmeta">${esc(e.pos)}</div></td><td class="num">${c.salary ? hrSom(c.salary) : `<span class="tmeta">oylik yo'q</span>`}</td><td class="num">${c.bonus ? hrSom(c.bonus) : "—"}</td><td class="num ${c.fine ? "mlout" : ""}">${c.fine ? hrSom(c.fine) : "—"}</td><td class="num">${c.ded ? hrSom(c.ded) : "—"}</td><td class="num"><b>${hrSom(c.due)}</b></td><td class="num">${c.paid ? hrSom(c.paid) : "—"}</td><td class="num ${c.left > 0 ? "balpos" : c.left < 0 ? "mlneg" : ""}">${c.left ? (c.left < 0 ? "ortiqcha " : "") + hrSom(Math.abs(c.left)) : "✓"}</td><td class="krAct">${act}</td></tr>`;
  }).join("") + `</tbody></table>`;
  const log = SAL.list.filter(s => s.month === month);
  $("hpLog").innerHTML = log.length ? `<table><thead><tr><th>№</th><th>Sana</th><th>Xodim</th><th>Turi</th><th>Summa</th><th>Kassa</th><th>Izoh</th><th></th></tr></thead><tbody>` + log.map(s => `<tr class="${s.cancelled ? "slx" : ""}"><td>${s.number}</td><td>${esc(s.date)}</td><td>${esc(s.empName)}</td><td>${SAL_T[s.t]}</td><td class="num">${hrSom(s.sum)}</td><td>${esc(s.acc) || "—"}</td><td class="tmeta">${esc(s.note)}</td><td class="krAct">${can && !s.cancelled ? `<button data-hpcancel="${esc(s.id)}">${SAL.pend === s.id ? "Ha, bekor qilish" : "Bekor qilish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>` : `<div class="empty-box">Shu oy uchun yozuv yo'q</div>`;
}
async function hpSave(empId, t, box) {
  if (SAL.busy || !HR.mcp) return;
  const e = HX.list.find(x => x.id === empId), sum = Math.round(Number(box.querySelector("[data-hpsum]").value) || 0), accEl = box.querySelector("[data-hpacc]"), acc = accEl ? accEl.value : "", note = box.querySelector("[data-hpnote]").value.trim(), month = $("hpMonth").value;
  if (!e) return; if (!(sum > 0)) return hrSay(SAL, hpRender, "Summani kiriting.");
  if ((t === "bonus" || t === "ded") && !note) return hrSay(SAL, hpRender, `${SAL_T[t]} uchun izohda sababini yozing.`);
  SAL.busy = true;
  try {
    await salReload();
    if ((t === "pay" || t === "adv") && typeof mlAvail === "function") { if (typeof mopReload === "function") { try { await mopReload(); } catch (e2) {} } const a = mlAvail(acc, "UZS"); if (sum - a > 0.5) { hrSay(SAL, hpRender, `«${acc}»da ${hrSom(a)} bor — ${hrSom(sum)} to'lab bo'lmaydi.`); throw null; } }
    const number = SAL.list.reduce((m, x) => Math.max(m, x.number), 0) + 1, now = new Date().toISOString();
    await HR.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Ish haqi'!A1", values:[[krT(hrId("I")), number, SAL_T[t], "Yakunlangan", krT(hrToday()), krT(month), krT(e.id), krT(e.name), sum, krT(acc), krT(note), krT(now)]] });
    SAL.act = ""; hrSay(SAL, hpRender, `${e.name}: ${SAL_T[t].toLowerCase()} ${hrSom(sum)} yozildi${acc ? ` (${acc}dan)` : ""}.`); try { await salReload(); } catch (e2) {}
  } catch (err) { if (err) hrSay(SAL, hpRender, krCodeMsg(err.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."); }
  SAL.busy = false;
}
async function hpCancel(id) {
  if (SAL.busy || !HR.mcp) return; SAL.busy = true;
  try { await salReload(); const s = SAL.list.find(x => x.id === id); if (!s || s.cancelled) throw null; await HR.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Ish haqi'!D${s.row}`, values:[["Bekor qilingan"]] }); hrSay(SAL, hpRender, `№${s.number} bekor qilindi${s.acc ? `, pul «${s.acc}»ga qaytdi` : ""}.`); try { await salReload(); } catch (e) {} }
  catch (e) { if (e) hrSay(SAL, hpRender, krCodeMsg(e.code) || "Bekor qilib bo'lmadi."); }
  SAL.busy = false; SAL.pend = "";
}
$("hpMonth").addEventListener("change", hpRender);
$("hpApp").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.hpact) { SAL.act = b.dataset.hpact; hpRender(); const i = document.querySelector("#hpList [data-hpsum]"); if (i) i.focus(); }
  else if (b.dataset.hpx) { SAL.act = ""; hpRender(); }
  else if (b.dataset.hpsave) hpSave(b.dataset.hpsave, b.dataset.t, b.closest(".hrpay"));
  else if (b.dataset.hpcancel) { if (SAL.pend === b.dataset.hpcancel) hpCancel(b.dataset.hpcancel); else { SAL.pend = b.dataset.hpcancel; hpRender(); } }
});
// Kassa daftariga ish haqi to'lovlarini qo'shish (moliya.js hisoblagichi kengaytiriladi)
if (typeof mlLedger === "function") {
  const hrOrigLedger = mlLedger;
  mlLedger = function () {
    const key = "S" + SAL.list.map(s => s.cancelled ? 1 : 0).join("") + SAL.list.length;
    const base = hrOrigLedger();
    if (base.__sal === key) return base;
    const rows = base.rows.filter(r => !r.sal);
    SAL.list.filter(s => !s.cancelled && (s.t === "pay" || s.t === "adv") && s.sum > 0).forEach(s => rows.push({ ts:s.createdAt || s.date, date:String(s.date).slice(0, 10), acc:s.acc || (mlKassas()[0] || {}).name, cur:"UZS", amt:-s.sum, kind:"Ish haqi", who:s.empName, src:`${SAL_T[s.t]} №${s.number} (${s.month})`, auto:true, sal:true, note:s.note }));
    rows.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
    base.rows = rows; base.__sal = key;
    return base;
  };
}

// ======================= HISOBOTLAR → SOTUVCHILAR KPI =======================
hrPanel("hkApp", `<div class="panel"><div class="thead"><h3>Sotuvchilar KPI</h3><div class="hbtns"><input type="month" id="hkMonth"></div></div>
  <div class="tmeta">Tsunami sotuvlari bo'yicha (sotuvdagi «Sotuvchi» maydoni), qaytarishlar ayirilgan. Reja «Sotuvchi reja» (Bito sinxroni) jadvalidan olinadi.</div>
  <div id="hkList"></div></div>`);
function hkRender() {
  if (!$("hkList")) return;
  if (!$("hkMonth").value) $("hkMonth").value = hrMonth();
  const m = $("hkMonth").value, pm = typeof planMap === "function" ? planMap() : {}, agg = {};
  SL.list.filter(s => !s.cancelled && s.date.slice(0, 7) === m).forEach(s => {
    const k = s.seller || "(sotuvchi ko'rsatilmagan)", o = agg[k] || (agg[k] = { n:0, sum:{}, debt:{} }), back = (typeof QT !== "undefined" ? QT.list : []).filter(r => !r.cancelled && r.saleId === s.id).reduce((a, r) => a + r.total, 0);
    o.n++; o.sum[s.currency] = (o.sum[s.currency] || 0) + s.total - back; if (s.debt > 0) o.debt[s.currency] = (o.debt[s.currency] || 0) + s.debt;
  });
  Object.keys(pm).forEach(n => { if (!agg[n]) agg[n] = { n:0, sum:{}, debt:{} }; });
  const rows = Object.entries(agg).sort((a, b) => (b[1].sum.UZS || 0) - (a[1].sum.UZS || 0));
  $("hkList").innerHTML = rows.length ? `<table><thead><tr><th>Sotuvchi</th><th>Sotuvlar soni</th><th>Tushum</th><th>Shundan qarzga</th><th>Oylik reja</th><th>Bajarildi</th></tr></thead><tbody>` + rows.map(([n, o]) => { const p = pm[n], pct = p && p.plan ? Math.round((o.sum.UZS || 0) / p.plan * 100) : null; return `<tr><td><b>${esc(n)}</b>${p ? `<div class="tmeta">${esc(p.dept)}</div>` : ""}</td><td class="num">${o.n}</td><td class="num">${Object.keys(o.sum).length ? Object.entries(o.sum).map(([c, v]) => krMoney(v, c)).join(" + ") : "—"}</td><td class="num">${Object.keys(o.debt).length ? Object.entries(o.debt).map(([c, v]) => krMoney(v, c)).join(" + ") : "—"}</td><td class="num">${p && p.plan ? hrSom(p.plan) : "—"}</td><td class="num">${pct == null ? "—" : `<span class="pct ${pct >= 100 ? "ok" : pct >= 50 ? "mid" : "low"}">${pct}%</span>`}</td></tr>`; }).join("") + `</tbody></table>` : `<div class="empty-box">Bu oyda sotuv yo'q</div>`;
}
$("hkMonth").addEventListener("change", hkRender);

// ======================= Yo'naltirish va yuklash =======================
const HR_APPS = { kadrlar:{ "Xodimlar":["hxApp", hxRender], "Davomat":["hdApp", () => { botReload(); hdRender(); }], "Ish haqi":["hpApp", () => { botReload(); hpRender(); }] }, sozlamalar:{ "Bo'lim va lavozimlar":["hsApp", hsRender] }, hisobotlar:{ "Sotuvchilar KPI":["hkApp", hkRender] } };
function hrRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "", on = {};
  Object.entries(HR_APPS).forEach(([s, apps]) => Object.entries(apps).forEach(([name, [app]]) => { on[app] = on[app] || (s === sec && name === n); }));
  Object.keys(on).forEach(app => { $(app).classList.remove("fopen"); document.body.classList.toggle(app + "-on", on[app]); });
  const hit = (HR_APPS[sec] || {})[n]; if (hit) { if (sec === "kadrlar") botReload(); hit[1](); }
}
function hrRenderAll() { const b = document.body.classList; if (b.contains("hxApp-on")) hxRender(); if (b.contains("hdApp-on")) hdRender(); if (b.contains("hpApp-on")) hpRender(); if (b.contains("hsApp-on")) hsRender(); if (b.contains("hkApp-on")) hkRender(); }
const hrOrigRenderSub = renderSub;
renderSub = function (i) { hrOrigRenderSub(i); hrRoute(); };
document.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (o && o.dataset.open === "hxApp") hxReset(); });
setInterval(() => { if (document.body.classList.contains("hdApp-on")) botReload(); }, 180000);
hxReset();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { HX.state = HS.state = SAL.state = BOT.state = "off"; hrRenderAll(); return; }
  HR.mcp = mcp;
  [[HX, HX_RANGE, hxApply, 300000], [HS, HS_RANGE, hsApply, 300000], [SAL, SAL_RANGE, salApply, 120000]].forEach(([o, range, apply, every]) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        if (o.state !== "ok" || !o.list.length) o.state = (ev.error && ev.error.code) || "upstream_error";
        hrRenderAll();
      }, { refetchInterval:every });
    } catch (e) {}
  });
  botReload(true);
})();
hrRoute();
