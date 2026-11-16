// ===== Tsunami: Marketing → Chegirma (tovar, kategoriya yoki hamma tovarga muddatli chegirma; Google Drive bazasida) =====
// Asosiy sahifadan keyin yuklanadi. Sotuv formasida mos chegirma ko'rsatiladi va bir bosishda narxga qo'llanadi.
const CH_RANGE = "Chegirmalar!A1:O1000";
const CH = { mode:"gen", list:[], state:"loading", busy:false, editId:"", filter:"now", q:"", pendDel:"", msg:"", msgT:null, mcp:null, scope:"all", cats:[], prods:[] };
const CH_SCOPE = { all:"Hamma tovarlar", cat:"Kategoriyalar", prod:"Tanlangan tovarlar" };
FORM_FOCUS.chApp = "chName";
(function chBuild() {
  const el = document.createElement("div");
  el.id = "chApp";
  el.innerHTML = `<div class="panel fpanel"><div class="thead"><h3 id="chTitle">Yangi chegirma</h3><button type="button" class="closebtn" data-close="chApp">Yopish ✕</button></div>
    <form id="chForm" class="kform">
      <div class="kgrid">
        <label class="span2" id="chClientL" hidden>Mijoz<input id="chClient" list="pyClients" maxlength="160" placeholder="Mijoz ismi (CRM → Mijozlar ro'yxatidan)"></label>
        <label class="span2">Chegirma nomi<input id="chName" maxlength="100" placeholder="Masalan: Kuzgi aksiya — quloqchinlar"></label>
        <label>Turi<select id="chType"><option value="pct">Foiz (%)</option><option value="sum">Summa</option></select></label>
        <label>Qiymati<span class="inrow"><input type="number" id="chVal" min="0" step="any" placeholder="10"><select id="chCur" hidden><option value="UZS">so'm</option><option value="USD">$</option></select><span id="chPct" class="tmeta">%</span></span></label>
        <label>Boshlanish<input type="date" id="chFrom"></label>
        <label>Tugash<input type="date" id="chTo"><span class="tmeta">bo'sh qolsa — muddatsiz</span></label>
      </div>
      <div class="tvrow"><span class="lbl">Qaysi tovarlarga</span><div class="chips" id="chScope">${Object.entries(CH_SCOPE).map(([k, l]) => `<label class="chip"><input type="radio" name="chScope" value="${k}"${k === "all" ? " checked" : ""}> ${l}</label>`).join("")}</div></div>
      <div id="chCatBox" hidden><div class="inrow"><select id="chCatSel"></select><button type="button" class="mini" id="chCatAdd">Qo'shish</button></div><div class="chips" id="chCats"></div><div class="tmeta">Kategoriya tanlansa, uning ichidagi barcha kategoriyalar ham kiradi.</div></div>
      <div id="chProdBox" hidden><div class="inrow"><input id="chProdIn" list="krProducts" placeholder="Tovar nomi, SKU yoki shtrix-kod"><button type="button" class="mini" id="chProdAdd">Qo'shish</button></div><div class="chips" id="chProds"></div></div>
      <label class="full">Izoh<input id="chNote" maxlength="300" placeholder="ixtiyoriy"></label>
      <div class="kbtns"><button type="button" class="pri" id="chSave">Saqlash</button></div>
      <div class="status" id="chFmsg"></div>
    </form></div>
    <div class="panel"><div class="thead"><h3 id="chListTitle">Chegirmalar</h3><div class="hbtns"><input class="search" id="chQ" placeholder="Qidirish: nomi, tovar"><div class="filters" id="chFilters"></div><button type="button" class="openbtn" data-open="chApp" id="chOpenBtn">+ Yangi chegirma</button></div></div>
    <div class="status" id="chStatus"></div><div id="chList"></div></div>`;
  $("kirimApp").parentNode.insertBefore(el, $("kirimApp"));
  const st = document.createElement("style");
  st.textContent = "#chApp{display:none}.chApp-on #chApp{display:block}.chApp-on .gen,.chApp-on #kpis{display:none}#chCatBox,#chProdBox{margin:4px 0 10px}#chCatBox .inrow,#chProdBox .inrow{max-width:560px}.chips .xchip{display:inline-flex;gap:6px;align-items:center;background:#eef2ff;border-radius:999px;padding:3px 10px;font-size:13px;margin:4px 6px 0 0}.xchip button{border:0;background:none;cursor:pointer;color:#6b7280;font-size:15px;padding:0}.chhint{font-size:12px;color:#15803d;margin-top:3px}.chhint button{font:inherit;font-size:12px;margin-left:6px;border:1px solid #86efac;background:#f0fdf4;color:#15803d;border-radius:6px;padding:1px 8px;cursor:pointer}.chhint.on{color:#6b7280}";
  document.head.appendChild(st);
})();
function chFmsg(m, bad) { const x = $("chFmsg"); x.textContent = m || ""; x.classList.toggle("err", !!bad); }
function chSay(m) { CH.msg = m; clearTimeout(CH.msgT); CH.msgT = setTimeout(() => { CH.msg = ""; chRender(); }, 6000); chRender(); }
function chParse(vals) {
  const out = [];
  (Array.isArray(vals) ? vals : []).forEach((r, i) => {
    if (!i || !Array.isArray(r) || !r[0] || String(r[2] || "") === "O'chirilgan") return;
    let target = []; try { target = JSON.parse(r[5] || "[]"); } catch (e) { target = []; }
    out.push({ id:String(r[0]), row:i + 1, number:Number(r[1]) || 0, paused:String(r[2] || "") === "To'xtatilgan", name:String(r[3] || ""), scope:CH_SCOPE[String(r[4] || "")] ? String(r[4]) : "all", target:Array.isArray(target) ? target : [], type:String(r[6] || "") === "sum" ? "sum" : "pct", value:Number(r[7]) || 0, cur:String(r[8] || "UZS"), from:String(r[9] || ""), to:String(r[10] || ""), client:String(r[11] || "").trim(), note:String(r[12] || ""), createdAt:String(r[13] || "") });
  });
  return out.sort((a, b) => b.number - a.number);
}
function chApply(vals) { CH.list = chParse(vals); CH.state = "ok"; chRender(); chHints(); }
async function chReload() { const r = await CH.mcp.callTool(GS, "get_values", { spreadsheetId:BASE_ID, range:CH_RANGE }, { cache:false }); chApply(krVals({ result:r })); }
function chToday() { return new Date().toLocaleDateString("en-CA"); }
function chPhase(d) { const t = chToday(); if (d.paused) return "paused"; if (d.from && d.from > t) return "soon"; if (d.to && d.to < t) return "ended"; return "now"; }
function chValTxt(d) { return d.type === "pct" ? `−${d.value}%` : `−${krMoney(d.value, d.cur)}`; }
function chCatName(id) { return (typeof ktPath === "function" && ktPath(id)) || "(o'chirilgan kategoriya)"; }
function chTargetTxt(d) { return d.scope === "all" ? "Hamma tovarlar" : d.scope === "cat" ? d.target.map(chCatName).join(", ") : d.target.join(", "); }
// Tovarga hozir amaldagi eng foydali chegirma (sotuv valyutasi va narxi bo'yicha)
function chFor(name, cur, price, client) {
  const ck = String(client || "").trim().toLowerCase();
  const n = String(name || "").trim().toLowerCase(); if (!n) return null;
  const tv = TV.list.find(t => t.name.toLowerCase() === n);
  const cat = tv ? tv.catId : "";
  let best = null;
  CH.list.filter(d => chPhase(d) === "now" && (!d.client || (ck && d.client.toLowerCase() === ck))).forEach(d => {
    const hit = d.scope === "all" || (d.scope === "prod" && d.target.some(x => String(x).toLowerCase() === n)) || (d.scope === "cat" && cat && d.target.some(c => ktSubtree(c).has(cat)));
    if (!hit || (d.type === "sum" && d.cur !== cur)) return;
    const off = d.type === "pct" ? (Number(price) || 0) * d.value / 100 : d.value;
    if (!best || off > best.off) best = { d, off };
  });
  return best;
}
function chNewPrice(price, d, cur) { const p = Number(price) || 0, v = d.type === "pct" ? p * (1 - d.value / 100) : p - d.value; return Math.max(0, cur === "USD" ? Math.round(v * 100) / 100 : Math.round(v)); }

// ---------- Forma ----------
function chScopeDraw() {
  $("chCatBox").hidden = CH.scope !== "cat"; $("chProdBox").hidden = CH.scope !== "prod";
  $("chCatSel").innerHTML = typeof ktOptions === "function" ? ktOptions("", "", "— kategoriyani tanlang —") : "";
  $("chCats").innerHTML = CH.cats.map((c, i) => `<span class="xchip">${esc(chCatName(c))}<button type="button" data-chrmcat="${i}">×</button></span>`).join("");
  $("chProds").innerHTML = CH.prods.map((p, i) => `<span class="xchip">${esc(p)}<button type="button" data-chrmprod="${i}">×</button></span>`).join("");
}
function chTypeDraw() { const sum = $("chType").value === "sum"; $("chCur").hidden = !sum; $("chPct").hidden = sum; }
function chReset() {
  CH.editId = ""; CH.scope = "all"; CH.cats = []; CH.prods = [];
  ["chName", "chVal", "chTo", "chNote", "chProdIn", "chClient"].forEach(id => { $(id).value = ""; });
  $("chFrom").value = chToday(); $("chType").value = "pct"; $("chCur").value = "UZS";
  document.querySelector('#chScope input[value="all"]').checked = true;
  $("chTitle").textContent = CH.mode === "cli" ? "Yangi mijoz chegirmasi" : "Yangi chegirma"; chTypeDraw(); chScopeDraw(); chFmsg("");
}
function chLoad(id) {
  const d = CH.list.find(x => x.id === id); if (!d) return;
  chReset(); CH.editId = id; $("chTitle").textContent = `Tahrirlash: ${d.name}`;
  $("chClient").value = d.client; $("chName").value = d.name; $("chType").value = d.type; $("chVal").value = d.value; $("chCur").value = d.cur; $("chFrom").value = d.from; $("chTo").value = d.to; $("chNote").value = d.note;
  CH.scope = d.scope; if (d.scope === "cat") CH.cats = d.target.slice(); if (d.scope === "prod") CH.prods = d.target.slice();
  document.querySelector(`#chScope input[value="${d.scope}"]`).checked = true;
  chTypeDraw(); chScopeDraw(); openForm("chApp", true);
}
function chAddProd() {
  const v = $("chProdIn").value.trim(); if (!v) return;
  const p = krProduct(v) || KR.products.find(x => x.sku === v || x.barcode === v), name = p ? p.name : v;
  if (!CH.prods.some(x => x.toLowerCase() === name.toLowerCase())) CH.prods.push(name);
  $("chProdIn").value = ""; chScopeDraw(); $("chProdIn").focus();
}
async function chSave() {
  if (CH.busy) return;
  if (!CH.mcp) return chFmsg(krDbLine() || "Tsunami bazasi ulanmagan.", true);
  const name = $("chName").value.trim(), type = $("chType").value, value = Number($("chVal").value), cur = $("chCur").value, from = $("chFrom").value, to = $("chTo").value, note = $("chNote").value.trim();
  let client = CH.mode === "cli" ? $("chClient").value.trim() : "";
  if (CH.mode === "cli") {
    if (!client) return chFmsg("Mijozni tanlang.", true);
    const k = (PARTY.cliApp ? PARTY.cliApp.list : []).find(c => c.name.toLowerCase() === client.toLowerCase());
    if (!k) return chFmsg(`«${client}» mijozlar ro'yxatida yo'q: avval CRM → Mijozlar bo'limida yarating.`, true);
    client = k.name;
  }
  if (!name) return chFmsg("Chegirma nomini yozing.", true);
  if (!(value > 0)) return chFmsg("Chegirma qiymatini kiriting.", true);
  if (type === "pct" && value >= 100) return chFmsg("Foiz 100 dan kichik bo'lsin.", true);
  if (!from) return chFmsg("Boshlanish sanasini kiriting.", true);
  if (to && to < from) return chFmsg("Tugash sanasi boshlanishdan oldin bo'lmasin.", true);
  const target = CH.scope === "cat" ? CH.cats : CH.scope === "prod" ? CH.prods : [];
  if (CH.scope !== "all" && !target.length) return chFmsg(CH.scope === "cat" ? "Kamida bitta kategoriya qo'shing." : "Kamida bitta tovar qo'shing.", true);
  CH.busy = true; $("chSave").disabled = true;
  let step = "read";
  try {
    await chReload();
    const ex = CH.editId ? CH.list.find(x => x.id === CH.editId) : null;
    if (CH.editId && !ex) { chFmsg("Bu chegirma boshqa joyda o'chirilgan.", true); throw null; }
    const now = new Date().toISOString(), id = ex ? ex.id : "C" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const number = ex ? ex.number : CH.list.reduce((m, x) => Math.max(m, x.number), 0) + 1;
    const row = [krT(id), number, ex && ex.paused ? "To'xtatilgan" : "Faol", krT(name), CH.scope, krT(JSON.stringify(target)), type, value, type === "sum" ? cur : "", krT(from), krT(to), krT(client), krT(note), krT(ex ? ex.createdAt : now), krT(now)];
    step = "write";
    if (ex) await CH.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Chegirmalar!A${ex.row}:O${ex.row}`, values:[row] });
    else await CH.mcp.callTool(GS, "append_values", { spreadsheetId:BASE_ID, range:"Chegirmalar!A1", values:[row] });
    chSay(ex ? `«${name}» saqlandi.` : `«${name}» chegirmasi yaratildi.`);
    chReset(); openForm("chApp", false);
    try { await chReload(); } catch (e) {}
  } catch (e) {
    if (e) { const m = krCodeMsg(e.code); chFmsg(m || (step === "write" ? "Javob kelmadi: saqlangan bo'lishi ham mumkin. Ro'yxatni tekshiring." : "Bazaga ulanib bo'lmadi, qayta urinib ko'ring."), true); }
  }
  CH.busy = false; $("chSave").disabled = false;
}
async function chSetState(id, state) {
  if (CH.busy || !CH.mcp) return;
  CH.busy = true;
  try {
    await chReload();
    const d = CH.list.find(x => x.id === id); if (!d) throw null;
    await CH.mcp.callTool(GS, "update_values", { spreadsheetId:BASE_ID, range:`Chegirmalar!C${d.row}`, values:[[state]] });
    chSay(state === "O'chirilgan" ? `«${d.name}» o'chirildi.` : state === "To'xtatilgan" ? `«${d.name}» to'xtatildi.` : `«${d.name}» qayta yoqildi.`);
    try { await chReload(); } catch (e) {}
  } catch (e) { if (e) chSay(krCodeMsg(e.code) || "O'zgartirib bo'lmadi, qayta urinib ko'ring."); }
  CH.busy = false; CH.pendDel = "";
}
function chRender() {
  if (!$("chList")) return;
  const P = { now:"Amalda", soon:"Rejada", ended:"Tugagan", paused:"To'xtatilgan" };
  const counts = { now:0, soon:0, ended:0, paused:0 }; CH.list.filter(d => CH.mode === "cli" ? !!d.client : !d.client).forEach(d => { counts[chPhase(d)]++; });
  $("chFilters").innerHTML = Object.entries(P).map(([k, l]) => `<button data-f="${k}" class="${CH.filter === k ? "on" : ""}">${l} (${counts[k]})</button>`).join("");
  const line = CH.state === "ok" ? "" : CH.state === "loading" ? "Tsunami bazasidan yuklanmoqda…" : CH.state === "off" ? "Chegirmalar bu ko'rinishda ishlamaydi: sahifani claude.ai'da, tizimga kirgan holda oching." : (krCodeMsg(CH.state) || "Tsunami bazasiga hozircha ulanib bo'lmadi, birozdan keyin o'zi qayta urinadi.");
  $("chStatus").textContent = [line, CH.msg].filter(Boolean).join(" · ");
  const q = CH.q.trim().toLowerCase();
  const mine = CH.list.filter(d => CH.mode === "cli" ? !!d.client : !d.client);
  const list = mine.filter(d => chPhase(d) === CH.filter && (!q || d.name.toLowerCase().indexOf(q) >= 0 || d.client.toLowerCase().indexOf(q) >= 0 || chTargetTxt(d).toLowerCase().indexOf(q) >= 0));
  if (!list.length) { $("chList").innerHTML = `<div class="empty-box">${CH.state === "ok" ? (mine.length ? "Bu ro'yxatda chegirma yo'q" : CH.mode === "cli" ? "Hozircha mijoz chegirmasi yo'q: doimiy mijozlarga shaxsiy chegirma bering" : "Hozircha chegirma yo'q: «Yangi chegirma» tugmasini bosing") : ""}</div>`; return; }
  const can = !!CH.mcp;
  $("chList").innerHTML = `<table><thead><tr><th>№</th>${CH.mode === "cli" ? "<th>Mijoz</th>" : ""}<th>Nomi</th><th>Qaysi tovarlarga</th><th>Chegirma</th><th>Muddat</th><th>Holat</th><th></th></tr></thead><tbody>`
    + list.map(d => {
      const ph = chPhase(d), badge = ph === "now" ? `<span class="st st-done">Amalda</span>` : ph === "soon" ? `<span class="st st-yangi">Rejada</span>` : ph === "ended" ? `<span class="st st-draft">Tugagan</span>` : `<span class="st st-draft">To'xtatilgan</span>`;
      const act = can ? `<button data-chedit="${esc(d.id)}">Tahrirlash</button>` + (d.paused ? `<button data-chon="${esc(d.id)}">Yoqish</button>` : ph !== "ended" ? `<button data-choff="${esc(d.id)}">To'xtatish</button>` : "") + `<button data-chdel="${esc(d.id)}">${CH.pendDel === d.id ? "Ha, o'chirish" : "O'chirish"}</button>` : "";
      return `<tr><td>${esc(d.number)}</td>${CH.mode === "cli" ? `<td><b>${esc(d.client)}</b></td>` : ""}<td>${CH.mode === "cli" ? esc(d.name) : `<b>${esc(d.name)}</b>`}${d.note ? `<div class="tmeta">${esc(d.note)}</div>` : ""}</td><td class="small">${d.scope === "all" ? "<i>Hamma tovarlar</i>" : esc(chTargetTxt(d))}</td><td class="num"><b>${chValTxt(d)}</b></td><td>${esc(d.from)}${d.to ? " — " + esc(d.to) : " dan, muddatsiz"}</td><td>${badge}</td><td class="krAct">${act}</td></tr>`;
    }).join("") + `</tbody></table>`;
}

// ---------- Sotuv formasida chegirma ----------
function chHints() {
  if (!$("slRows")) return;
  const cur = $("slCur").value;
  document.querySelectorAll("#slRows tr[data-i]").forEach(tr => {
    const it = SL.items[Number(tr.dataset.i)]; if (!it) return;
    let box = tr.querySelector(".chhint");
    const cell = tr.querySelector('[data-f="name"]').parentNode;
    if (it.disc) {
      if (!box) { box = document.createElement("div"); box.className = "chhint"; cell.appendChild(box); }
      box.classList.add("on"); box.innerHTML = it.disc.promo ? `Aksiya: «${esc(it.disc.name)}» ${esc(it.disc.txt)}` : `Chegirma qo'llandi: «${esc(it.disc.name)}» ${esc(it.disc.txt)} (asl narx ${krMoney(it.disc.base, cur)})<button type="button" data-chundo="${tr.dataset.i}">Bekor</button>`;
      return;
    }
    const b = chFor(it.name, cur, it.price, $("slClient").value);
    if (!b) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement("div"); box.className = "chhint"; cell.appendChild(box); }
    box.classList.remove("on");
    box.innerHTML = `${b.d.client ? "Mijoz chegirmasi" : "Chegirma bor"}: «${esc(b.d.name)}» ${chValTxt(b.d)}` + (String(it.price).trim() !== "" ? `<button type="button" data-chapply="${tr.dataset.i}" data-chid="${esc(b.d.id)}">Qo'llash</button>` : ` <span class="tmeta">— narxni kiriting</span>`);
  });
}
function chApplyRow(i, id) {
  const it = SL.items[i], d = CH.list.find(x => x.id === id); if (!it || !d) return;
  const cur = $("slCur").value, base = Number(it.price) || 0, np = chNewPrice(base, d, cur);
  it.disc = { id:d.id, name:d.name, txt:chValTxt(d), base, off:Math.round((base - np) * 100) / 100 };
  it.price = np; const tr = document.querySelector(`#slRows tr[data-i="${i}"]`); if (tr) tr.querySelector('[data-f="price"]').value = np;
  slTotals(); chHints();
}
function chUndoRow(i) {
  const it = SL.items[i]; if (!it || !it.disc) return;
  it.price = it.disc.base; delete it.disc; const tr = document.querySelector(`#slRows tr[data-i="${i}"]`); if (tr) tr.querySelector('[data-f="price"]').value = it.price;
  slTotals(); chHints();
}
const chOrigSlRows = slRows;
slRows = function () { chOrigSlRows(); chHints(); };
$("slRows").addEventListener("input", e => {
  const tr = e.target.closest("tr[data-i]"); if (!tr) return;
  const it = SL.items[Number(tr.dataset.i)];
  if (it && it.disc && (e.target.dataset.f === "price" || e.target.dataset.f === "name")) delete it.disc;
  chHints();
});
$("slRows").addEventListener("change", () => setTimeout(chHints, 0));
$("slRows").addEventListener("click", e => {
  const a = e.target.closest("[data-chapply]"); if (a) { chApplyRow(Number(a.dataset.chapply), a.dataset.chid); return; }
  const u = e.target.closest("[data-chundo]"); if (u) chUndoRow(Number(u.dataset.chundo));
});
$("slCur").addEventListener("change", chHints);
$("slClient").addEventListener("input", chHints);

// ---------- Yo'naltirish va hodisalar ----------
function chRoute() {
  const n = current && current.id === "marketing" && current.subs[currentSub] ? current.subs[currentSub].n : "";
  const on = n === "Chegirma" || n === "Mijozga chegirma";
  $("chApp").classList.remove("fopen");
  document.body.classList.toggle("chApp-on", on);
  if (!on) return;
  CH.mode = n === "Mijozga chegirma" ? "cli" : "gen";
  $("chClientL").hidden = CH.mode !== "cli";
  $("chListTitle").textContent = CH.mode === "cli" ? "Mijozlarga shaxsiy chegirmalar" : "Chegirmalar";
  $("chOpenBtn").textContent = CH.mode === "cli" ? "+ Mijozga chegirma" : "+ Yangi chegirma";
  if (CH.mode === "cli" && typeof pyClientsFill === "function") pyClientsFill();
  chReset(); chRender();
}
const chOrigRenderSub = renderSub;
renderSub = function (i) { chOrigRenderSub(i); chRoute(); };
document.addEventListener("click", e => { const o = e.target.closest("[data-open]"); if (o && o.dataset.open === "chApp") chReset(); });
$("chForm").addEventListener("submit", e => e.preventDefault());
$("chSave").addEventListener("click", chSave);
$("chType").addEventListener("change", chTypeDraw);
$("chScope").addEventListener("change", e => { if (e.target.name === "chScope") { CH.scope = e.target.value; chScopeDraw(); } });
$("chCatAdd").addEventListener("click", () => { const v = $("chCatSel").value; if (v && CH.cats.indexOf(v) < 0) { CH.cats.push(v); chScopeDraw(); } });
$("chProdAdd").addEventListener("click", chAddProd);
$("chProdIn").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); chAddProd(); } });
$("chForm").addEventListener("click", e => {
  const c = e.target.closest("[data-chrmcat]"); if (c) { CH.cats.splice(Number(c.dataset.chrmcat), 1); chScopeDraw(); return; }
  const p = e.target.closest("[data-chrmprod]"); if (p) { CH.prods.splice(Number(p.dataset.chrmprod), 1); chScopeDraw(); }
});
$("chFilters").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { CH.filter = b.dataset.f; chRender(); } });
$("chQ").addEventListener("input", e => { CH.q = e.target.value; chRender(); });
$("chList").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.chedit) chLoad(b.dataset.chedit);
  else if (b.dataset.choff) chSetState(b.dataset.choff, "To'xtatilgan");
  else if (b.dataset.chon) chSetState(b.dataset.chon, "Faol");
  else if (b.dataset.chdel) { if (CH.pendDel === b.dataset.chdel) chSetState(b.dataset.chdel, "O'chirilgan"); else { CH.pendDel = b.dataset.chdel; chRender(); } }
});
chReset();
(async () => {
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use("mcp") : null; } catch (e) { mcp = null; }
  if (!mcp) { CH.state = "off"; chRender(); return; }
  CH.mcp = mcp;
  try {
    mcp.watchTool(GS, "get_values", { spreadsheetId:BASE_ID, range:CH_RANGE }, ev => {
      if (ev.type === "data") { if (!CH.busy) chApply(krVals(ev)); return; }
      if (CH.state !== "ok" || !CH.list.length) CH.state = (ev.error && ev.error.code) || "upstream_error";
      chRender();
    }, { refetchInterval:120000 });
  } catch (e) {}
})();
chRoute();
