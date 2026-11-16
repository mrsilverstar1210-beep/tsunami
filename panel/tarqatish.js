// ===== Tsunami: Tarqatish → Kunlik tashriflar, Tashrif rejasi, Tashriflar, Agentlar; agent mobil ko'rinishi (#agent) =====
// Sozlamalar → Tashrif maqsadlari / bekor qilish sabablari; Hisobotlar → Tashriflar hisoboti. Ma'lumot: Google Drive bazasi.
const TQ = { mcp:null };
const tqToday = () => new Date().toLocaleDateString("en-CA");
const tqK = s => String(s || "").trim().toLowerCase();
const TQ_WD = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"]; // getDay(): 0 = yakshanba
function tqId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function tqMsg(id, m, bad) { const x = $(id); if (!x) return; x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function tqSay(o, render, m) { o.msg = m; clearTimeout(o.msgT); o.msgT = setTimeout(() => { o.msg = ""; render(); }, 6000); render(); }
function tqLine(o, what) { return o.state === "ok" ? "" : o.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : o.state === "off" ? `${what} bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching.` : (krCodeMsg(o.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi."); }
function tqPanel(id, html) { const el = document.createElement("div"); el.id = id; el.innerHTML = html; $("kirimApp").parentNode.insertBefore(el, $("kirimApp")); return el; }
function tqClient(n) { return (PARTY.cliApp ? PARTY.cliApp.list : []).find(c => tqK(c.name) === tqK(n)) || null; }
function tqWd(d) { const [y, m, dd] = String(d).split("-").map(Number); return new Date(y, m - 1, dd).getDay(); }
(function tqCss() {
  const st = document.createElement("style");
  st.textContent = "#tdApp,#tpApp,#tvApp2,#taApp,#tsApp,#trApp,#agentView{display:none}.tdApp-on #tdApp,.tpApp-on #tpApp,.tvApp2-on #tvApp2,.taApp-on #taApp,.tsApp-on #tsApp,.trApp-on #trApp{display:block}"
    + ".tdApp-on .gen,.tdApp-on #kpis,.tpApp-on .gen,.tpApp-on #kpis,.tvApp2-on .gen,.tvApp2-on #kpis,.taApp-on .gen,.taApp-on #kpis,.tsApp-on .gen,.tsApp-on #kpis,.trApp-on .gen,.trApp-on #kpis,.trApp-on .salesbar{display:none}"
    + "body.agentv{display:block}body.agentv nav,body.agentv main,body.agentv #mobile{display:none!important}body.agentv #agentView{display:block}#agentView{max-width:560px;margin:0 auto;padding:12px}#agentView .mhead{font-size:18px;font-weight:700;margin:6px 0 12px}#agentView .mlabel{display:block;font-size:13px;color:#6b7280;margin-bottom:10px}#agentView .mlabel input{display:block;width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;margin-top:4px;border:1px solid var(--line);border-radius:10px;background:#fff;color:#111}#agentView .mback{display:block;text-align:center;margin:18px 0;color:#6b7280}"
    + ".tqcard{border:1px solid var(--line);border-radius:12px;padding:12px;margin:10px 0;background:#fff}.tqcard .t{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.tqcard .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.tqcard .acts button,.tqcard .acts select,.tqcard .acts input{font:inherit;font-size:13px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:#fff}.tqcard .acts button.go{background:#16a34a;color:#fff;border-color:#16a34a}"
    + ".wdchips label{display:inline-flex;gap:4px;align-items:center;margin-right:8px}.tqprog{height:8px;background:#e5e7eb;border-radius:9px;overflow:hidden;min-width:80px}.tqprog i{display:block;height:100%;background:#16a34a}";
  document.head.appendChild(st);
})();

// ======================= Sozlamalar: maqsadlar va sabablar =======================
const TS_RANGE = "'Tarqatish sozlamalari'!A1:E300";
const TS_DEF = { goal:["Buyurtma olish", "Tovar ko'rsatish", "Qarz undirish", "Narxlarni tekshirish", "Boshqa"], reason:["Do'kon yopiq", "Mas'ul shaxs yo'q", "Buyurtma kerak emas", "Vaqt yetmadi", "Boshqa"] };
const TS = { list:[], state:"loading", busy:false, edit:"", pendDel:"", msg:"", msgT:null, kind:"goal" };
tqPanel("tsApp", `<div class="panel"><div class="thead"><h3 id="tsTitle">Tashrif maqsadlari</h3></div><div class="tmeta" id="tsHint"></div>
  <form id="tsForm" class="kform"><div class="inrow" style="max-width:520px"><input id="tsName" maxlength="80" placeholder="Yangi nom"><button type="button" class="pri" id="tsAdd">Qo'shish</button></div></form>
  <div class="status" id="tsStatus"></div><div id="tsList"></div></div>`);
function tsParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[3] || "") !== "O'chirilgan" && String(r[2] || "").trim()) out.push({ id:String(r[0]), row:i + 1, kind:String(r[1] || "") === "reason" ? "reason" : "goal", name:String(r[2]).trim() }); }); return out; }
function tsNames(kind) { const l = TS.list.filter(x => x.kind === kind); return TS.state === "ok" && l.length ? l.map(x => x.name) : TS_DEF[kind]; }
function tsApply(vals) { TS.list = tsParse(vals); TS.state = "ok"; tsRender(); tqSelects(); }
async function tsReload() { const r = await TQ.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:TS_RANGE }, { cache:false }); tsApply(krVals({ result:r })); }
async function tsDo(fn) { if (TS.busy) return; if (!TQ.mcp) return tqSay(TS, tsRender, krDbLine() || "Tsunami bazasi ulanmagan."); TS.busy = true; try { await tsReload(); await fn(); try { await tsReload(); } catch (e) {} } catch (e) { if (e) tqSay(TS, tsRender, krCodeMsg(e.code) || "Saqlab bo'lmadi."); } TS.busy = false; }
function tsAdd() {
  const name = $("tsName").value.trim(), kind = TS.kind; if (!name) return tqSay(TS, tsRender, "Nomini yozing.");
  tsDo(async () => {
    const mine = TS.list.filter(x => x.kind === kind);
    if (mine.some(x => tqK(x.name) === tqK(name))) { tqSay(TS, tsRender, `«${name}» ro'yxatda bor.`); throw null; }
    const now = krT(new Date().toISOString()), rows = mine.length ? [] : TS_DEF[kind].filter(n => tqK(n) !== tqK(name)).map(n => [krT(tqId("Z")), kind, krT(n), "Faol", now]);
    rows.push([krT(tqId("Z")), kind, krT(name), "Faol", now]);
    await TQ.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Tarqatish sozlamalari'!A1", values:rows });
    $("tsName").value = ""; tqSay(TS, tsRender, `«${name}» qo'shildi.`);
  });
}
function tsRename(id, name) { name = String(name || "").trim(); if (!name) return; tsDo(async () => { const x = TS.list.find(r => r.id === id); if (!x) throw null; await TQ.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Tarqatish sozlamalari'!C${x.row}`, values:[[krT(name)]] }); TS.edit = ""; tqSay(TS, tsRender, "Saqlandi."); }); }
function tsDelete(id) { tsDo(async () => { const x = TS.list.find(r => r.id === id); if (!x) throw null; if (TS.list.filter(r => r.kind === x.kind).length <= 1) { tqSay(TS, tsRender, "Kamida bittasi qolishi kerak."); throw null; } await TQ.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Tarqatish sozlamalari'!D${x.row}`, values:[["O'chirilgan"]] }); TS.pendDel = ""; tqSay(TS, tsRender, `«${x.name}» o'chirildi.`); }); }
function tsRender() {
  if (!$("tsList")) return;
  $("tsTitle").textContent = TS.kind === "goal" ? "Tashrif maqsadlari" : "Tashrif bekor qilish sabablari";
  $("tsHint").textContent = TS.kind === "goal" ? "Tarqatish → tashrif yaratishdagi «Maqsad» ro'yxati shu yerdan olinadi." : "Agent tashrifni bekor qilganda shu ro'yxatdan sabab tanlaydi.";
  $("tsStatus").textContent = [tqLine(TS, "Sozlama"), TS.msg].filter(Boolean).join(" · ");
  const mine = TS.list.filter(x => x.kind === TS.kind), rows = TS.state === "ok" && mine.length ? mine : TS_DEF[TS.kind].map(n => ({ id:"", name:n })), can = !!TQ.mcp;
  $("tsList").innerHTML = `<table><tbody>` + rows.map((x, i) => TS.edit && TS.edit === x.id
    ? `<tr><td>${i + 1}</td><td><input id="tsEditIn" value="${esc(x.name)}" maxlength="80"></td><td class="krAct"><button data-tssave="${esc(x.id)}">Saqlash</button><button data-tscancel="1">Bekor</button></td></tr>`
    : `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td class="krAct">${can && x.id ? `<button data-tsedit="${esc(x.id)}">Tahrirlash</button><button data-tsdel="${esc(x.id)}">${TS.pendDel === x.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`
    + (TS.state === "ok" && !mine.length ? `<div class="tmeta">Hozir standart ro'yxat. Birinchi yangi nom qo'shilganda standartlari ham bazaga yoziladi va tahrirlanadigan bo'ladi.</div>` : "");
}
$("tsForm").addEventListener("submit", e => { e.preventDefault(); tsAdd(); });
$("tsAdd").addEventListener("click", tsAdd);
$("tsList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.tsedit) { TS.edit = b.dataset.tsedit; tsRender(); } else if (b.dataset.tscancel) { TS.edit = ""; tsRender(); }
  else if (b.dataset.tssave) tsRename(b.dataset.tssave, $("tsEditIn").value);
  else if (b.dataset.tsdel) { if (TS.pendDel === b.dataset.tsdel) tsDelete(b.dataset.tsdel); else { TS.pendDel = b.dataset.tsdel; tsRender(); } }
});

// ======================= Ma'lumot: rejalar va tashriflar =======================
const TP_RANGE = "'Tashrif rejalari'!A1:I2000", TVS_RANGE = "Tashriflar!A1:P10000";
const TP = { list:[], state:"loading", busy:false, editId:"", pendDel:"", msg:"", msgT:null, agent:"" };
const TV2 = { list:[], state:"loading", busy:false, msg:"", msgT:null, q:"", filter:"all", from:"", to:"", act:"" };
const TV_ST = { plan:"Rejada", done:"Bajarildi", cancel:"Bekor qilingan" };
function tpParse(vals) { const out = []; (Array.isArray(vals) ? vals : []).forEach((r, i) => { if (i && Array.isArray(r) && r[0] && String(r[6] || "") !== "O'chirilgan") out.push({ id:String(r[0]), row:i + 1, agent:String(r[1] || ""), client:String(r[2] || ""), days:String(r[3] || "").split(",").map(Number).filter(n => n >= 0 && n <= 6), goal:String(r[4] || ""), time:String(r[5] || ""), note:String(r[7] || ""), createdAt:String(r[8] || "") }); }); return out; }
function tqvParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0]) return;
    const st = Object.keys(TV_ST).find(k => TV_ST[k] === String(r[2] || "")) || "plan";
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, st, date:String(r[3] || ""), time:String(r[4] || ""), agent:String(r[5] || ""), client:String(r[6] || ""), addr:String(r[7] || ""), goal:String(r[8] || ""), result:String(r[9] || ""), order:Number(r[10]) || 0, cur:String(r[11] || "UZS"), reason:String(r[12] || ""), doneAt:String(r[13] || ""), createdAt:String(r[14] || ""), planId:String(r[15] || "") });
  });
  return out.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time) || b.number - a.number);
}
function tpApply(vals) { TP.list = tpParse(vals); TP.state = "ok"; tqRenderAll(); }
function tvApply(vals) { TV2.list = tqvParse(vals); TV2.state = "ok"; tqRenderAll(); }
async function tpReload() { const r = await TQ.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:TP_RANGE }, { cache:false }); tpApply(krVals({ result:r })); }
async function tqvReload() { const r = await TQ.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:TVS_RANGE }, { cache:false }); tvApply(krVals({ result:r })); }
function tqAgents() {
  const s = new Set(); TP.list.forEach(p => p.agent && s.add(p.agent)); TV2.list.forEach(v => v.agent && s.add(v.agent));
  (typeof SALES !== "undefined" ? rowsOf(SALES.plan) : []).forEach(r => { const n = String(r[0] || "").trim(); if (n && n.indexOf("(bo'sh)") < 0) s.add(n); });
  return [...s].sort();
}
// Bir kun uchun tashriflar: bazadagilar + rejadan kelib chiqqan, hali yozilmaganlari (virtual)
function tqDay(date, agent) {
  const real = TV2.list.filter(v => v.date.slice(0, 10) === date && (!agent || tqK(v.agent) === tqK(agent)));
  const used = new Set(real.map(v => v.planId).filter(Boolean)), wd = tqWd(date);
  const virt = TP.list.filter(p => p.days.indexOf(wd) >= 0 && !used.has(p.id) && String(p.createdAt).slice(0, 10) <= date && (!agent || tqK(p.agent) === tqK(agent)))
    .map(p => { const c = tqClient(p.client); return { id:"", virt:true, planId:p.id, st:"plan", date, time:p.time, agent:p.agent, client:p.client, addr:c ? c.addr : "", goal:p.goal, result:"", order:0, cur:"UZS", reason:"" }; });
  return real.concat(virt).sort((a, b) => String(a.time || "99").localeCompare(String(b.time || "99")) || a.client.localeCompare(b.client));
}
function tqKey(v) { return v.id || "p:" + v.planId + ":" + v.date; }
function tqFind(key, date) { return tqDay(date).find(v => tqKey(v) === key) || TV2.list.find(v => v.id === key) || null; }
async function tqWriteVisit(v, st, extra) {
  // Virtual (rejadan) tashrif birinchi marta yoziladi, mavjudi yangilanadi
  const now = new Date().toISOString();
  if (!v.id) {
    await tqvReload();
    const ex = TV2.list.find(x => x.planId === v.planId && x.date.slice(0, 10) === v.date); if (ex) return tqWriteVisit(ex, st, extra);
    const number = TV2.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    await TQ.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Tashriflar!A1", values:[[krT(tqId("V")), number, TV_ST[st], krT(v.date), krT(v.time || ""), krT(v.agent), krT(v.client), krT(v.addr || ""), krT(v.goal || ""), krT(extra.result || ""), extra.order || "", extra.cur || "UZS", krT(extra.reason || ""), st === "plan" ? "" : krT(now), krT(now), krT(v.planId || "")]] });
    return number;
  }
  const row = v.row;
  await TQ.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Tashriflar!C${row}`, values:[[TV_ST[st]]] });
  await TQ.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Tashriflar!J${row}:N${row}`, values:[[krT(extra.result || ""), extra.order || "", extra.cur || "UZS", krT(extra.reason || ""), st === "plan" ? "" : krT(now)]] });
  return v.number;
}
async function tqMark(key, date, st, extra, after) {
  if (TV2.busy || !TQ.mcp) return tqSay(TV2, tqRenderAll, krDbLine() || "Tsunami bazasi ulanmagan.");
  const v = tqFind(key, date); if (!v) return;
  TV2.busy = true;
  try { const n = await tqWriteVisit(v, st, extra); TV2.act = ""; tqSay(TV2, tqRenderAll, `${v.client}: ${TV_ST[st].toLowerCase()}${n ? ` (tashrif №${n})` : ""}.`); try { await tqvReload(); } catch (e) {} if (after) after(v); }
  catch (e) { tqSay(TV2, tqRenderAll, krCodeMsg(e && e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring."); }
  TV2.busy = false;
}
// Tashrif kartasi (kunlik ro'yxat va agent mobil ko'rinishi uchun umumiy)
function tqCard(v, mob) {
  const key = tqKey(v), c = tqClient(v.client), can = !!TQ.mcp, open = TV2.act === key;
  const badge = v.st === "done" ? `<span class="st st-done">Bajarildi</span>` : v.st === "cancel" ? `<span class="st st-draft">Bekor qilingan</span>` : `<span class="st st-yangi">Rejada</span>`;
  let acts = "";
  if (can && v.st === "plan") acts = open === "done" || TV2.act === key + "|done"
    ? `<input data-tqres placeholder="Natija: nima kelishildi" style="flex:1;min-width:160px"><input data-tqord type="number" min="0" step="any" placeholder="Buyurtma summasi" style="width:150px"><select data-tqcur><option value="UZS">so'm</option><option value="USD">$</option></select><button class="go" data-tqdone2="${esc(key)}" data-date="${esc(v.date)}">Saqlash</button><button data-tqx="1">Bekor</button>`
    : TV2.act === key + "|cancel"
    ? `<select data-tqreason>${tsNames("reason").map(r => `<option>${esc(r)}</option>`).join("")}</select><input data-tqnote placeholder="Izoh (ixtiyoriy)" style="flex:1;min-width:140px"><button data-tqcancel2="${esc(key)}" data-date="${esc(v.date)}">Saqlash</button><button data-tqx="1">Orqaga</button>`
    : `<button class="go" data-tqdone="${esc(key)}">Bajarildi</button><button data-tqcancel="${esc(key)}">Bekor qilish</button>${mob ? "" : `<button data-tqorder="${esc(v.client)}">Buyurtma yaratish</button>`}`;
  return `<div class="tqcard"><div class="t"><div><b>${esc(v.client)}</b>${v.time ? ` · ${esc(v.time)}` : ""}<div class="tmeta">${esc(v.goal || "")}${mob ? "" : ` · agent: ${esc(v.agent)}`}${v.virt ? " · rejadan" : ""}</div>${(v.addr || (c && c.addr)) ? `<div class="tmeta">📍 ${esc(v.addr || c.addr)}</div>` : ""}${c && c.phone ? `<div class="tmeta mono">☎ ${esc(c.phone)}</div>` : ""}</div><div>${badge}</div></div>`
    + (v.st === "done" ? `<div class="tmeta">Natija: ${esc(v.result) || "—"}${v.order ? ` · buyurtma ${krMoney(v.order, v.cur)}` : ""}</div>` : v.st === "cancel" ? `<div class="tmeta">Sabab: ${esc(v.reason)}${v.result ? ` · ${esc(v.result)}` : ""}</div>` : "")
    + (acts ? `<div class="acts">${acts}</div>` : "") + `</div>`;
}
function tqCardClick(e, rerender) {
  const b = e.target.closest("button"); if (!b) return;
  const box = b.closest(".tqcard");
  if (b.dataset.tqdone) { TV2.act = b.dataset.tqdone + "|done"; rerender(); }
  else if (b.dataset.tqcancel) { TV2.act = b.dataset.tqcancel + "|cancel"; rerender(); }
  else if (b.dataset.tqx) { TV2.act = ""; rerender(); }
  else if (b.dataset.tqdone2) tqMark(b.dataset.tqdone2, b.dataset.date, "done", { result:box.querySelector("[data-tqres]").value.trim(), order:Number(box.querySelector("[data-tqord]").value) || 0, cur:box.querySelector("[data-tqcur]").value });
  else if (b.dataset.tqcancel2) tqMark(b.dataset.tqcancel2, b.dataset.date, "cancel", { reason:box.querySelector("[data-tqreason]").value, result:box.querySelector("[data-tqnote]").value.trim() });
  else if (b.dataset.tqorder && typeof crGo === "function") { crGo("crm", "Buyurtmalar"); orReset(); openForm("orApp", true); $("orClient").value = b.dataset.tqorder; $("orClient").dispatchEvent(new Event("change")); }
}

// ======================= KUNLIK TASHRIFLAR =======================
const TD = { date:"", agent:"" };
tqPanel("tdApp", `<div class="panel"><div class="thead"><h3>Kunlik tashriflar</h3><div class="hbtns"><input type="date" id="tdDate"><select id="tdAgent"></select></div></div>
  <div class="tmeta">Tashrif rejasidagi kun bo'yicha ro'yxat o'zi tuziladi. Agentlar telefondan <a href="#agent">agent ko'rinishi</a>da o'z tashriflarini belgilaydi: sahifa havolasi oxiriga <b>#agent</b> qo'shib yuboring.</div>
  <div class="status" id="tdStatus"></div><div id="tdList"></div></div>`);
function tdRender() {
  if (!$("tdList")) return;
  if (!$("tdDate").value) $("tdDate").value = tqToday();
  const date = $("tdDate").value, agents = tqAgents(), cur = $("tdAgent").value;
  $("tdAgent").innerHTML = `<option value="">Barcha agentlar</option>` + agents.map(a => `<option${a === cur ? " selected" : ""}>${esc(a)}</option>`).join("");
  const list = tqDay(date, $("tdAgent").value), done = list.filter(v => v.st === "done").length, canc = list.filter(v => v.st === "cancel").length;
  $("tdStatus").textContent = [tqLine(TV2, "Tashriflar"), TV2.msg, list.length ? `${TQ_WD[tqWd(date)]}, ${date}: ${list.length} ta tashrif · bajarildi ${done} · bekor ${canc} · qoldi ${list.length - done - canc}` : ""].filter(Boolean).join(" · ");
  if (!list.length) { $("tdList").innerHTML = `<div class="empty-box">${TV2.state === "ok" ? "Bu kunga tashrif yo'q. «Tashrif rejasi» bo'limida haftalik reja tuzing yoki «Tashriflar» bo'limida bitta tashrif qo'shing." : ""}</div>`; return; }
  const by = {}; list.forEach(v => { (by[v.agent] = by[v.agent] || []).push(v); });
  $("tdList").innerHTML = Object.entries(by).map(([a, vs]) => `<h4 style="margin:14px 0 4px">${esc(a)} <span class="tmeta">— ${vs.filter(v => v.st === "done").length}/${vs.length}</span></h4>` + vs.map(v => tqCard(v, false)).join("")).join("");
}
$("tdDate").addEventListener("change", tdRender); $("tdAgent").addEventListener("change", tdRender);
$("tdList").addEventListener("click", e => tqCardClick(e, tdRender));

// ======================= TASHRIF REJASI =======================
FORM_FOCUS.tpApp = "tpAgent";
tqPanel("tpApp", `<div class="panel fpanel"><div class="thead"><h3 id="tpTitle">Yangi reja qatori</h3><button type="button" class="closebtn" data-close="tpApp">Yopish ✕</button></div>
  <form id="tpForm" class="kform">
    <div class="kgrid">
      <label>Agent<input id="tpAgent" list="tqAgents" maxlength="80" placeholder="Agent ismi"></label>
      <label>Mijoz (do'kon)<input id="tpClient" list="pyClients" maxlength="160" placeholder="CRM'dagi mijoz"></label>
      <label>Maqsad<select id="tpGoal"></select></label>
      <label>Soat (ixtiyoriy)<input type="time" id="tpTime"></label>
    </div>
    <div class="tvrow"><span class="lbl">Hafta kunlari</span><div class="wdchips" id="tpDays">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" value="${d}"> ${TQ_WD[d]}</label>`).join("")}</div></div>
    <label class="full">Izoh<input id="tpNote" maxlength="200" placeholder="ixtiyoriy"></label>
    <div class="kbtns"><button type="button" class="pri" id="tpSave">Saqlash</button></div>
    <div class="status" id="tpFmsg"></div>
  </form></div>
  <div class="panel"><div class="thead"><h3>Haftalik tashrif rejasi</h3><div class="hbtns"><select id="tpFilter"></select><button type="button" class="openbtn" data-open="tpApp">+ Rejaga qo'shish</button></div></div>
  <div class="tmeta">Har bir qator: qaysi agent, qaysi mijozga, haftaning qaysi kunlari boradi. Kunlik tashriflar shu rejadan o'zi tuziladi.</div>
  <div class="status" id="tpStatus"></div><div id="tpList"></div></div>`);
(function () { const dl = document.createElement("div"); dl.innerHTML = `<datalist id="tqAgents"></datalist>`; document.body.appendChild(dl); })();
function tqSelects() {
  const g = $("tpGoal"), gv = g.value; g.innerHTML = tsNames("goal").map(n => `<option>${esc(n)}</option>`).join(""); if (gv) g.value = gv;
  const g2 = $("tvGoal"); if (g2) { const v = g2.value; g2.innerHTML = g.innerHTML; if (v) g2.value = v; }
  $("tqAgents").innerHTML = tqAgents().map(a => `<option value="${esc(a)}">`).join("");
}
function tpReset() { TP.editId = ""; ["tpAgent", "tpClient", "tpTime", "tpNote"].forEach(id => { $(id).value = ""; }); document.querySelectorAll("#tpDays input").forEach(x => { x.checked = false; }); tqSelects(); $("tpTitle").textContent = "Yangi reja qatori"; tqMsg("tpFmsg", ""); if (typeof pyClientsFill === "function") pyClientsFill(); }
function tpLoad(id) { const p = TP.list.find(x => x.id === id); if (!p) return; tpReset(); TP.editId = id; $("tpTitle").textContent = `Tahrirlash: ${p.agent} → ${p.client}`; $("tpAgent").value = p.agent; $("tpClient").value = p.client; $("tpGoal").value = p.goal; $("tpTime").value = p.time; $("tpNote").value = p.note; document.querySelectorAll("#tpDays input").forEach(x => { x.checked = p.days.indexOf(Number(x.value)) >= 0; }); openForm("tpApp", true); }
async function tpSave() {
  if (TP.busy) return; if (!TQ.mcp) return tqMsg("tpFmsg", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const agent = $("tpAgent").value.trim(), client = $("tpClient").value.trim(), days = [...document.querySelectorAll("#tpDays input:checked")].map(x => x.value);
  if (!agent) return tqMsg("tpFmsg", "Agentni yozing.", true);
  const c = tqClient(client); if (!c) return tqMsg("tpFmsg", client ? `«${client}» CRM → Mijozlar ro'yxatida yo'q: avval o'sha yerda yarating.` : "Mijozni tanlang.", true);
  if (!days.length) return tqMsg("tpFmsg", "Kamida bitta hafta kunini belgilang.", true);
  TP.busy = true; $("tpSave").disabled = true;
  try {
    await tpReload();
    if (TP.list.some(p => p.id !== TP.editId && tqK(p.agent) === tqK(agent) && tqK(p.client) === tqK(c.name))) { tqMsg("tpFmsg", `${agent} → ${c.name} rejada bor: o'sha qatorni tahrirlang.`, true); throw null; }
    const ex = TP.editId ? TP.list.find(x => x.id === TP.editId) : null, now = new Date().toISOString();
    const row = [krT(ex ? ex.id : tqId("R")), krT(agent), krT(c.name), krT(days.join(",")), krT($("tpGoal").value), krT($("tpTime").value), "Faol", krT($("tpNote").value.trim()), krT(ex ? ex.createdAt : now)];
    if (ex) await TQ.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Tashrif rejalari'!A${ex.row}:I${ex.row}`, values:[row] });
    else await TQ.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"'Tashrif rejalari'!A1", values:[row] });
    tqSay(TP, tpRender, ex ? "Reja saqlandi." : `${agent} → ${c.name} rejaga qo'shildi.`); tpReset(); openForm("tpApp", false); try { await tpReload(); } catch (e) {}
  } catch (e) { if (e) tqMsg("tpFmsg", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  TP.busy = false; $("tpSave").disabled = false;
}
async function tpDelete(id) {
  if (TP.busy || !TQ.mcp) return; TP.busy = true;
  try { await tpReload(); const p = TP.list.find(x => x.id === id); if (!p) throw null; await TQ.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`'Tashrif rejalari'!G${p.row}`, values:[["O'chirilgan"]] }); tqSay(TP, tpRender, `${p.agent} → ${p.client} rejadan olib tashlandi.`); try { await tpReload(); } catch (e) {} }
  catch (e) { if (e) tqSay(TP, tpRender, krCodeMsg(e.code) || "O'chirib bo'lmadi."); }
  TP.busy = false; TP.pendDel = "";
}
function tpRender() {
  if (!$("tpList")) return;
  const agents = [...new Set(TP.list.map(p => p.agent))].sort(), f = $("tpFilter").value;
  $("tpFilter").innerHTML = `<option value="">Barcha agentlar</option>` + agents.map(a => `<option${a === f ? " selected" : ""}>${esc(a)}</option>`).join("");
  $("tpStatus").textContent = [tqLine(TP, "Tashrif rejasi"), TP.msg, TP.state === "ok" ? `${TP.list.length} ta qator` : ""].filter(Boolean).join(" · ");
  const list = TP.list.filter(p => !$("tpFilter").value || p.agent === $("tpFilter").value).sort((a, b) => a.agent.localeCompare(b.agent) || a.client.localeCompare(b.client));
  if (!list.length) { $("tpList").innerHTML = `<div class="empty-box">${TP.state === "ok" ? "Reja bo'sh: «Rejaga qo'shish» tugmasini bosing" : ""}</div>`; return; }
  const can = !!TQ.mcp;
  $("tpList").innerHTML = `<table><thead><tr><th>Agent</th><th>Mijoz</th>${[1, 2, 3, 4, 5, 6, 0].map(d => `<th style="text-align:center">${TQ_WD[d]}</th>`).join("")}<th>Maqsad</th><th>Soat</th><th></th></tr></thead><tbody>` + list.map(p => `<tr><td><b>${esc(p.agent)}</b></td><td>${esc(p.client)}${p.note ? `<div class="tmeta">${esc(p.note)}</div>` : ""}</td>${[1, 2, 3, 4, 5, 6, 0].map(d => `<td style="text-align:center">${p.days.indexOf(d) >= 0 ? "●" : ""}</td>`).join("")}<td>${esc(p.goal)}</td><td>${esc(p.time) || "—"}</td><td class="krAct">${can ? `<button data-tpedit="${esc(p.id)}">Tahrirlash</button><button data-tpdel="${esc(p.id)}">${TP.pendDel === p.id ? "Ha, o'chirish" : "O'chirish"}</button>` : ""}</td></tr>`).join("") + `</tbody></table>`;
}
$("tpForm").addEventListener("submit", e => e.preventDefault());
$("tpSave").addEventListener("click", tpSave);
$("tpFilter").addEventListener("change", tpRender);
$("tpList").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.tpedit) tpLoad(b.dataset.tpedit); else if (b.dataset.tpdel) { if (TP.pendDel === b.dataset.tpdel) tpDelete(b.dataset.tpdel); else { TP.pendDel = b.dataset.tpdel; tpRender(); } } });

// ======================= TASHRIFLAR (tarix va bitta tashrif qo'shish) =======================
FORM_FOCUS.tvApp2 = "tvAgent";
tqPanel("tvApp2", `<div class="panel fpanel"><div class="thead"><h3>Yangi tashrif</h3><button type="button" class="closebtn" data-close="tvApp2">Yopish ✕</button></div>
  <form id="tvForm2" class="kform">
    <div class="kgrid">
      <label>Sana<input type="date" id="tvDate"></label>
      <label>Soat<input type="time" id="tvTime"></label>
      <label>Agent<input id="tvAgent" list="tqAgents" maxlength="80" placeholder="Agent ismi"></label>
      <label>Mijoz (do'kon)<input id="tvClient" list="pyClients" maxlength="160"></label>
      <label>Maqsad<select id="tvGoal"></select></label>
    </div>
    <div class="kbtns"><button type="button" class="pri" id="tvSave2">Saqlash</button></div>
    <div class="status" id="tvFmsg2"></div>
  </form></div>
  <div class="panel"><div class="thead"><h3>Tashriflar</h3><div class="hbtns"><input class="search" id="tvQ2" placeholder="Qidirish: mijoz, agent"><input type="date" id="tvFrom"><input type="date" id="tvTo"><div class="filters" id="tvFilters2"></div><button type="button" class="openbtn" data-open="tvApp2">+ Yangi tashrif</button></div></div>
  <div class="status" id="tvStatus2"></div><div id="tvList2"></div></div>`);
function tvReset2() { $("tvDate").value = tqToday(); ["tvTime", "tvAgent", "tvClient"].forEach(id => { $(id).value = ""; }); tqSelects(); tqMsg("tvFmsg2", ""); if (typeof pyClientsFill === "function") pyClientsFill(); }
async function tvSave2() {
  if (TV2.busy) return; if (!TQ.mcp) return tqMsg("tvFmsg2", krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const date = $("tvDate").value, agent = $("tvAgent").value.trim(), c = tqClient($("tvClient").value);
  if (!date) return tqMsg("tvFmsg2", "Sanani kiriting.", true);
  if (!agent) return tqMsg("tvFmsg2", "Agentni yozing.", true);
  if (!c) return tqMsg("tvFmsg2", "Mijozni CRM ro'yxatidan tanlang.", true);
  TV2.busy = true; $("tvSave2").disabled = true;
  try { const n = await tqWriteVisit({ id:"", planId:"", date, time:$("tvTime").value, agent, client:c.name, addr:c.addr, goal:$("tvGoal").value }, "plan", {}); tqSay(TV2, tqRenderAll, `Tashrif №${n} rejalashtirildi.`); tvReset2(); openForm("tvApp2", false); try { await tqvReload(); } catch (e) {} }
  catch (e) { if (e) tqMsg("tvFmsg2", krCodeMsg(e.code) || "Saqlab bo'lmadi, qayta urinib ko'ring.", true); }
  TV2.busy = false; $("tvSave2").disabled = false;
}
function tvRender2() {
  if (!$("tvList2")) return;
  const F = { all:"Barchasi", plan:"Rejada", done:"Bajarilgan", cancel:"Bekor qilingan" }, counts = { all:TV2.list.length, plan:0, done:0, cancel:0 };
  TV2.list.forEach(v => { counts[v.st]++; });
  $("tvFilters2").innerHTML = Object.entries(F).map(([k, l]) => `<button data-f="${k}" class="${TV2.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  $("tvStatus2").textContent = [tqLine(TV2, "Tashriflar"), TV2.msg].filter(Boolean).join(" · ");
  const q = tqK(TV2.q), from = $("tvFrom").value, to = $("tvTo").value;
  const list = TV2.list.filter(v => (TV2.filter === "all" || v.st === TV2.filter) && (!from || v.date >= from) && (!to || v.date.slice(0, 10) <= to) && (!q || tqK(v.client).indexOf(q) >= 0 || tqK(v.agent).indexOf(q) >= 0));
  if (!list.length) { $("tvList2").innerHTML = `<div class="empty-box">${TV2.state === "ok" ? "Tashrif topilmadi" : ""}</div>`; return; }
  $("tvList2").innerHTML = `<table><thead><tr><th>№</th><th>Sana</th><th>Agent</th><th>Mijoz</th><th>Maqsad</th><th>Natija</th><th>Buyurtma</th><th>Holat</th></tr></thead><tbody>` + list.slice(0, 400).map(v => `<tr class="${v.st === "cancel" ? "slx" : ""}"><td>${v.number}</td><td>${esc(v.date.slice(0, 10))}${v.time ? " " + esc(v.time) : ""}</td><td>${esc(v.agent)}</td><td><b>${esc(v.client)}</b></td><td>${esc(v.goal)}</td><td>${v.st === "cancel" ? `Sabab: ${esc(v.reason)}` : esc(v.result) || "—"}</td><td class="num">${v.order ? krMoney(v.order, v.cur) : "—"}</td><td>${v.st === "done" ? `<span class="st st-done">Bajarildi</span>` : v.st === "cancel" ? `<span class="st st-draft">Bekor</span>` : `<span class="st st-yangi">Rejada</span>`}</td></tr>`).join("") + `</tbody></table>`;
}
$("tvForm2").addEventListener("submit", e => e.preventDefault());
$("tvSave2").addEventListener("click", tvSave2);
$("tvQ2").addEventListener("input", e => { TV2.q = e.target.value; tvRender2(); });
["tvFrom", "tvTo"].forEach(id => $(id).addEventListener("change", tvRender2));
$("tvFilters2").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { TV2.filter = b.dataset.f; tvRender2(); } });

// ======================= AGENTLAR =======================
tqPanel("taApp", `<div class="panel"><div class="thead"><h3>Agentlar — bugun</h3></div>
  <div class="tmeta">Har bir agentning bugungi rejasi, bajarilgani va oxirgi tashrif joyi. Jonli GPS joylashuvi bu sahifada ishlamaydi (brauzer joylashuvni bermaydi), shuning uchun oxirgi bajarilgan tashrif manzili ko'rsatiladi.</div>
  <div class="status" id="taStatus"></div><div id="taList"></div></div>`);
function taRender() {
  if (!$("taList")) return;
  const date = tqToday(), agents = tqAgents().filter(a => TP.list.some(p => p.agent === a) || TV2.list.some(v => v.agent === a));
  $("taStatus").textContent = tqLine(TV2, "Agentlar");
  if (!agents.length) { $("taList").innerHTML = `<div class="empty-box">${TV2.state === "ok" ? "Hozircha agent yo'q: tashrif rejasi tuzilganda agentlar shu yerda chiqadi" : ""}</div>`; return; }
  $("taList").innerHTML = `<table><thead><tr><th>Agent</th><th>Bugun</th><th>Bajarildi</th><th></th><th>Bugungi buyurtmalar</th><th>Oxirgi tashrif</th></tr></thead><tbody>` + agents.map(a => {
    const day = tqDay(date, a), done = day.filter(v => v.st === "done"), pct = day.length ? Math.round(done.length / day.length * 100) : 0;
    const ord = {}; done.forEach(v => { if (v.order) ord[v.cur] = (ord[v.cur] || 0) + v.order; });
    const last = TV2.list.filter(v => tqK(v.agent) === tqK(a) && v.st === "done").sort((x, y) => String(y.doneAt).localeCompare(String(x.doneAt)))[0];
    return `<tr><td><b>${esc(a)}</b></td><td class="num">${day.length}</td><td class="num">${done.length}${day.filter(v => v.st === "cancel").length ? ` <span class="tmeta">(bekor ${day.filter(v => v.st === "cancel").length})</span>` : ""}</td><td><div class="tqprog"><i style="width:${pct}%"></i></div></td><td class="num">${Object.keys(ord).length ? Object.entries(ord).map(([c, v]) => krMoney(v, c)).join(" + ") : "—"}</td><td>${last ? `${esc(last.client)}${last.addr ? ` · 📍 ${esc(last.addr)}` : ""}<div class="tmeta">${esc(fmt(last.doneAt))}</div>` : "—"}</td></tr>`;
  }).join("") + `</tbody></table>`;
}

// ======================= HISOBOTLAR → TASHRIFLAR HISOBOTI =======================
tqPanel("trApp", `<div class="panel"><div class="thead"><h3>Tashriflar hisoboti</h3><div class="hbtns"><input type="date" id="trFrom"><input type="date" id="trTo"></div></div>
  <div class="tmeta">Agentlar bo'yicha: rejadagi, bajarilgan va bekor qilingan tashriflar, bajarilish foizi va olingan buyurtmalar.</div>
  <div class="status" id="trStatus"></div><div id="trList"></div><div id="trReasons"></div></div>`);
function trRender() {
  if (!$("trList")) return;
  if (!$("trFrom").value) { const d = new Date(); $("trFrom").value = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA"); $("trTo").value = tqToday(); }
  const from = $("trFrom").value, to = $("trTo").value, m = {}, rs = {};
  for (let d = new Date(from + "T00:00:00"); d.toLocaleDateString("en-CA") <= to && d.toLocaleDateString("en-CA") <= tqToday(); d.setDate(d.getDate() + 1)) {
    tqDay(d.toLocaleDateString("en-CA")).forEach(v => {
      const o = m[v.agent] || (m[v.agent] = { n:0, done:0, cancel:0, ord:{} }); o.n++;
      if (v.st === "done") { o.done++; if (v.order) o.ord[v.cur] = (o.ord[v.cur] || 0) + v.order; } else if (v.st === "cancel") { o.cancel++; rs[v.reason] = (rs[v.reason] || 0) + 1; }
    });
  }
  const rows = Object.entries(m).sort((a, b) => b[1].done - a[1].done);
  $("trStatus").textContent = tqLine(TV2, "Hisobot");
  $("trList").innerHTML = !rows.length ? `<div class="empty-box">${TV2.state === "ok" ? "Tanlangan davrda tashrif yo'q" : ""}</div>` : `<table><thead><tr><th>Agent</th><th>Rejada</th><th>Bajarildi</th><th>Bekor</th><th>Bajarilmagan</th><th>Foiz</th><th>Buyurtmalar</th></tr></thead><tbody>` + rows.map(([a, o]) => { const pct = o.n ? Math.round(o.done / o.n * 100) : 0; return `<tr><td><b>${esc(a)}</b></td><td class="num">${o.n}</td><td class="num">${o.done}</td><td class="num">${o.cancel}</td><td class="num">${o.n - o.done - o.cancel}</td><td class="num"><span class="pct ${pct >= 90 ? "ok" : pct >= 60 ? "mid" : "low"}">${pct}%</span></td><td class="num">${Object.keys(o.ord).length ? Object.entries(o.ord).map(([c, v]) => krMoney(v, c)).join(" + ") : "—"}</td></tr>`; }).join("") + `</tbody></table>`;
  const re = Object.entries(rs).sort((a, b) => b[1] - a[1]);
  $("trReasons").innerHTML = re.length ? `<h4 style="margin:14px 0 4px">Bekor qilish sabablari</h4><table><tbody>${re.map(([r, n]) => `<tr><td>${esc(r)}</td><td class="num">${n}</td></tr>`).join("")}</tbody></table>` : "";
}
["trFrom", "trTo"].forEach(id => $(id).addEventListener("change", trRender));

// ======================= AGENT MOBIL KO'RINISHI (#agent) =======================
const tqAv = document.createElement("div");
tqAv.id = "agentView";
tqAv.innerHTML = `<div class="mhead">Tsunami — Tashriflarim</div>
  <label class="mlabel">Ismingiz<input id="avName" list="tqAgents" placeholder="Ismingizni yozing" maxlength="80"></label>
  <label class="mlabel">Sana<input type="date" id="avDate"></label>
  <div class="status" id="avStatus"></div><div id="avList"></div>
  <a class="mback" href="#tarqatish">Boshqaruv paneliga</a>`;
document.body.appendChild(tqAv);
function avRender() {
  if (!document.body.classList.contains("agentv")) return;
  const name = $("avName").value.trim(); if (!$("avDate").value) $("avDate").value = tqToday();
  $("avStatus").textContent = [tqLine(TV2, "Tashriflar"), TV2.msg].filter(Boolean).join(" · ");
  if (!name) { $("avList").innerHTML = `<div class="empty-box">Tashriflaringizni ko'rish uchun ismingizni yozing.</div>`; return; }
  const list = tqDay($("avDate").value, name);
  $("avList").innerHTML = list.length ? `<div class="tmeta">${list.filter(v => v.st === "done").length} / ${list.length} bajarildi</div>` + list.map(v => tqCard(v, true)).join("") : `<div class="empty-box">${TV2.state === "ok" ? "Bu kunga tashrif rejalashtirilmagan." : ""}</div>`;
}
$("avName").addEventListener("input", () => { try { localStorage.setItem("tsunami_agent", $("avName").value.trim()); } catch (e) {} avRender(); });
$("avDate").addEventListener("change", avRender);
$("avList").addEventListener("click", e => tqCardClick(e, avRender));
const tqOrigRender = render;
render = function (id) {
  const on = id === "agent"; document.body.classList.toggle("agentv", on);
  if (on) { document.title = "Tashriflarim — Tsunami"; try { if (!$("avName").value) $("avName").value = localStorage.getItem("tsunami_agent") || ""; } catch (e) {} tqSelects(); avRender(); return; }
  tqOrigRender(id);
};

// ======================= Yo'naltirish va yuklash =======================
const TQ_APPS = { tarqatish:{ "Kunlik tashriflar":["tdApp", tdRender], "Tashrif rejasi":["tpApp", tpRender], "Tashriflar":["tvApp2", tvRender2], "Agentlar":["taApp", taRender] },
  sozlamalar:{ "Tashrif maqsadlari":["tsApp", () => { TS.kind = "goal"; tsRender(); }], "Tashrif bekor qilish sabablari":["tsApp", () => { TS.kind = "reason"; tsRender(); }] },
  hisobotlar:{ "Tashriflar hisoboti":["trApp", trRender] } };
function tqRoute() {
  const sec = current ? current.id : "", n = current && current.subs[currentSub] ? current.subs[currentSub].n : "";
  const on = {}; Object.entries(TQ_APPS).forEach(([s, apps]) => Object.entries(apps).forEach(([name, [app]]) => { on[app] = on[app] || (s === sec && name === n); }));
  Object.keys(on).forEach(app => { $(app).classList.remove("fopen"); document.body.classList.toggle(app + "-on", on[app]); });
  const hit = (TQ_APPS[sec] || {})[n]; if (hit) { TV2.act = ""; tqSelects(); hit[1](); }
}
function tqRenderAll() { tqSelects(); const b = document.body.classList; if (b.contains("tdApp-on")) tdRender(); if (b.contains("tpApp-on")) tpRender(); if (b.contains("tvApp2-on")) tvRender2(); if (b.contains("taApp-on")) taRender(); if (b.contains("trApp-on")) trRender(); avRender(); }
const tqOrigRenderSub = renderSub;
renderSub = function (i) { tqOrigRenderSub(i); tqRoute(); };
document.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (!o) return; if (o.dataset.open === "tpApp") tpReset(); else if (o.dataset.open === "tvApp2") tvReset2(); });
setInterval(() => { const b = document.body.classList; if (b.contains("tdApp-on") || b.contains("taApp-on") || b.contains("agentv")) tqRenderAll(); }, 60000);
tpReset(); tvReset2();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { TS.state = TP.state = TV2.state = "off"; tqRenderAll(); tsRender(); return; }
  TQ.mcp = mcp;
  [[TS, TS_RANGE, tsApply, tsRender, 300000], [TP, TP_RANGE, tpApply, tqRenderAll, 120000], [TV2, TVS_RANGE, tvApply, tqRenderAll, 60000]].forEach(([o, range, apply, render, every]) => {
    try {
      mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range }, ev => {
        if (ev.type === "data") { if (!o.busy) apply(krVals(ev)); return; }
        if (o.state !== "ok" || !o.list.length) o.state = (ev.error && ev.error.code) || "upstream_error";
        render();
      }, { refetchInterval:every });
    } catch (e) {}
  });
})();
if (location.hash === "#agent") render("agent"); else tqRoute();
