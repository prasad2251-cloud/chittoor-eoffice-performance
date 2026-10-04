const $ = id => document.getElementById(id);

let DATA = {
  records: [],
  reporting: {},
  scoreFormula: {}
};

const n = v => Number(v) || 0;

const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[m]));

const textOf = r => [
  r.name, r.designation, r.section, r.station, r.unit,
  r.office, r.subdivision, r.subDivision, r.category, r.group
].filter(Boolean).join(" ").toLowerCase();

const workload = r => n(r.opening) + n(r.created) + n(r.received);

function calcScore(r) {
  const w = workload(r);
  const disposal = w ? Math.min(100, n(r.disposed) / w * 100) : (n(r.pending) > 0 ? 0 : 100);
  const pendingPct = w ? Math.min(100, n(r.pending) / w * 100) : (n(r.pending) > 0 ? 100 : 0);
  const pendency = Math.max(0, 100 - pendingPct);
  const age = n(r.pending) > 0
    ? Math.max(0, 100 - Math.min(100, n(r.pendingDays) / 60 * 100))
    : 100;
  return Math.max(0, Math.min(100, disposal * .50 + pendency * .30 + age * .20));
}

const score = r => calcScore(r);

function disposalPct(r) {
  const w = workload(r);
  return w ? Math.min(100, n(r.disposed) / w * 100) : (n(r.pending) > 0 ? 0 : 100);
}

function pendingPct(r) {
  const w = workload(r);
  return w ? Math.min(100, n(r.pending) / w * 100) : (n(r.pending) > 0 ? 100 : 0);
}

/* =========================================================
   ORGANISATIONAL GROUPING
   ========================================================= */

const SUBDIVISIONS = {
  "chittoor": "Chittoor Sub-Division",
  "palamaner": "Palamaner Sub-Division",
  "palamaneru": "Palamaner Sub-Division",
  "kuppam": "Kuppam Sub-Division",
  "nagari": "Nagari Sub-Division"
};

const SPECIAL_PATTERNS = [
  ["DCRB", "DCRB"],
  ["CRIME RECORDS", "DCRB"],
  ["CCS", "CCS"],
  ["SPECIAL BRANCH", "SB"],
  ["\\bSB\\b", "SB"],
  ["DTC", "DTC"],
  ["DTRB", "DTRB"],
  ["PCR", "PCR"],
  ["TRAFFIC", "Traffic"],
  ["\\bAR\\b", "AR"],
  ["\\bVR\\b", "VR"],
  ["MAHILA", "Mahila PS"],
  ["WOMEN", "Mahila PS"],
  ["CYBER", "Cyber / Special Unit"],
  ["HOME GUARD", "Home Guards"],
  ["HOME GUARDS", "Home Guards"],
  ["COMMUNICATION", "Communication"],
  ["CONTROL ROOM", "PCR"]
];

const OFFICE_PATTERNS = [
  "DPO", "DISTRICT POLICE OFFICE", "AO", "ADMINISTRATIVE OFFICER",
  "SUPERINTENDENT", "ESTABLISHMENT", "MINISTERIAL", "OFFICE STAFF",
  "ACCOUNTS", "LEGAL CELL", "COURT MONITORING", "RECORD ROOM"
];

function cleanUnitName(v) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

function stationFromRecord(r) {
  return cleanUnitName(r.station || r.policeStation || r.psName || "");
}

function designationFromRecord(r) {
  return cleanUnitName(r.designation || r.post || r.section || "");
}

function rawOrgText(r) {
  return [
    stationFromRecord(r),
    designationFromRecord(r),
    r.section,
    r.unit,
    r.office,
    r.subdivision,
    r.subDivision,
    r.category,
    r.group
  ].filter(Boolean).join(" ");
}

function findSubdivision(r) {
  const s = rawOrgText(r).toLowerCase();
  for (const key of Object.keys(SUBDIVISIONS)) {
    if (new RegExp("\\b" + key + "\\b", "i").test(s)) {
      return SUBDIVISIONS[key];
    }
  }
  return null;
}

function findSpecialUnit(r) {
  const s = rawOrgText(r);
  for (const [pattern, name] of SPECIAL_PATTERNS) {
    try {
      if (new RegExp(pattern, "i").test(s)) return name;
    } catch(e) {}
  }
  return null;
}

function isOfficeStaff(r) {
  const s = rawOrgText(r).toUpperCase();
  return OFFICE_PATTERNS.some(x => s.includes(x));
}

function getOrganisation(r) {
  const explicitCategory = String(r.category || r.group || "").toLowerCase();

  if (explicitCategory.includes("sub")) {
    const sub = findSubdivision(r);
    if (sub) return {type:"subdivisions", name:sub};
  }

  if (explicitCategory.includes("office")) {
    return {type:"office", name:"Office Staff / DPO"};
  }

  if (explicitCategory.includes("special") || explicitCategory.includes("wing")) {
    const sp = findSpecialUnit(r);
    return {type:"special", name:sp || "Special Units / Wings"};
  }

  const sub = findSubdivision(r);
  if (sub && !stationFromRecord(r)) {
    return {type:"subdivisions", name:sub};
  }

  const special = findSpecialUnit(r);
  if (special && !stationFromRecord(r)) {
    return {type:"special", name:special};
  }

  if (isOfficeStaff(r) && !stationFromRecord(r)) {
    return {type:"office", name:"Office Staff / DPO"};
  }

  const station = stationFromRecord(r);
  if (station) {
    return {type:"stations", name:station};
  }

  const special2 = findSpecialUnit(r);
  if (special2) return {type:"special", name:special2};

  if (isOfficeStaff(r)) return {type:"office", name:"Office Staff / DPO"};

  return {type:"office", name:"Other Office / Unclassified"};
}

function groupRecords(records) {
  const result = {
    stations: new Map(),
    subdivisions: new Map(),
    office: new Map(),
    special: new Map()
  };

  records.forEach(r => {
    const org = getOrganisation(r);
    if (!result[org.type]) result.office;
    if (!result[org.type].has(org.name)) result[org.type].set(org.name, []);
    result[org.type].get(org.name).push(r);
  });

  return result;
}

const GROUP_META = {
  stations: {
    title:"GROUP 1: POLICE STATIONS",
    icon:"🚔",
    subtitle:"Police Station-wise E-Office Performance",
    colour:"blue"
  },
  subdivisions: {
    title:"GROUP 2: SUB-DIVISIONS",
    icon:"🏛️",
    subtitle:"Sub-Division-wise E-Office Performance",
    colour:"purple"
  },
  office: {
    title:"GROUP 3: OFFICE STAFF",
    icon:"🗂️",
    subtitle:"DPO / Office Staff E-Office Performance",
    colour:"orange"
  },
  special: {
    title:"GROUP 4: SPECIAL UNITS / WINGS",
    icon:"⭐",
    subtitle:"Special Units and Wings E-Office Performance",
    colour:"green"
  }
};

/* =========================================================
   LOAD
   ========================================================= */

async function loadData() {
  const urls = [
    new URL("data.json", window.location.href).href,
    new URL("./data.json", window.location.href).href
  ];

  let lastError = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {cache:"no-store"});
      if (!res.ok) throw new Error("data.json HTTP " + res.status);

      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Invalid data.json format");

      DATA = json;
      DATA.records = Array.isArray(DATA.records) ? DATA.records : [];
      DATA.reporting = DATA.reporting || {};
      DATA.scoreFormula = DATA.scoreFormula || {};

      render();
      return;
    } catch(e) {
      lastError = e;
      console.error("Failed to load:", url, e);
    }
  }

  console.error(lastError);
  const main = document.querySelector("main");
  if (main) {
    main.innerHTML =
      '<div class="panel error"><h2>Data could not be loaded</h2>' +
      '<p>Please keep the existing <b>data.json</b> in the repository root.</p>' +
      '<p>Check that <b>data.json</b> is present and valid JSON.</p></div>';
  }
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

function render() {
  const r = DATA.records;
  const p = DATA.reporting || {};

  const received = r.reduce((a,x) => a + n(x.received), 0);
  const disposed = r.reduce((a,x) => a + n(x.disposed), 0);
  const pending = r.reduce((a,x) => a + n(x.pending), 0);

  const pd = r.filter(x => n(x.pending) > 0);
  const avg = pd.length ? pd.reduce((a,x) => a + n(x.pendingDays), 0) / pd.length : 0;

  $("unitCount").textContent = r.length;
  $("disposedHero").textContent = disposed.toLocaleString();
  $("pendencyHero").textContent = pending.toLocaleString();
  $("disposedTotal").textContent = disposed.toLocaleString();
  $("receivedTotal").textContent = received.toLocaleString();
  $("pendencyTotal").textContent = pending.toLocaleString();
  $("avgPending").textContent = avg.toFixed(2);
  $("period").textContent = `Reporting Period: ${p.from || "—"} TO ${p.to || "—"}`;
  $("chartNote").textContent = `${r.length} records • Final Score = 50% Disposal + 30% Pendency + 20% Ageing`;
  $("lastLoaded").textContent = " • " + new Date().toLocaleString();

  renderRanks();
  renderGroupedEoffice();
  renderPerformance();
  renderTrends();
  renderReports();
}

/* =========================================================
   RANKINGS
   ========================================================= */

function rankItem(r, i, bottom) {
  return `
    <div class="rank-item">
      <b class="rank-num">${bottom ? "#" + (i+1) : "🏅 " + (i+1)}</b>
      <div>
        <div class="rank-name">${esc(r.designation || "")}</div>
        <div class="rank-meta">${esc(r.name || "")}${r.section ? " • " + esc(r.section) : ""}</div>
      </div>
      ${bottom ? `<span class="badge red">Pend. ${n(r.pending)}</span>` : ""}
      <span class="score">${score(r).toFixed(1)}</span>
    </div>`;
}

function renderRanks() {
  const top = [...DATA.records].sort((a,b) => score(b) - score(a));
  const bottom = [...DATA.records].sort((a,b) => score(a) - score(b));

  $("topList").innerHTML = top.slice(0,5).map((r,i) => rankItem(r,i,false)).join("");
  $("bottomList").innerHTML = bottom.slice(0,5).map((r,i) => rankItem(r,i,true)).join("");

  const max = Math.max(...top.slice(0,10).map(x => score(x)), 1);

  $("barChart").innerHTML = top.slice(0,10).map(r => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(8, score(r)/max*100)}%">
        <span>${score(r).toFixed(1)}</span>
      </div>
      <small>${esc(r.name || r.station || "")}</small>
    </div>`).join("");
}

/* =========================================================
   TABLE ROW
   ========================================================= */

function openingColour(value) {
  const v=n(value); return v===0 ? "eo-green" : "eo-red";
}
function disposedColour(r) {
  const rate=disposalPct(r);
  return rate>=80 ? "eo-green" : rate>=50 ? "eo-yellow" : "eo-red";
}
function lowIsGoodColour(value) {
  const v=n(value); return v===0 ? "eo-green" : v<=10 ? "eo-yellow" : "eo-red";
}
function ageColour(value) {
  const v=n(value); return v===0 ? "eo-green" : v<=5 ? "eo-yellow" : "eo-red";
}
function pendingTotalColour(value) {
  const v=n(value); return v===0 ? "eo-green" : v<=10 ? "eo-yellow" : "eo-red";
}
function pendingDaysColour(value) {
  const v=n(value); return v===0 ? "eo-green" : v<=15 ? "eo-yellow" : "eo-red";
}
function scoreColour(value) {
  const v=n(value); return v>=80 ? "eo-score-green" : v>=50 ? "eo-score-yellow" : "eo-score-red";
}

function colouredFullRow(r, i) {
  const station = stationFromRecord(r);
  const designation = designationFromRecord(r);

  return `
  <tr>
    <td>${i+1}</td>
    <td>${esc(r.name)}</td>
    <td>${esc(station + (station && designation ? " / " : "") + designation)}</td>
    <td class="${openingColour(r.opening)}">${n(r.opening)}</td>
    <td>${n(r.created)}</td>
    <td>${n(r.received)}</td>
    <td>${n(r.disposedClosed)}</td>
    <td>${n(r.disposedForwarded)}</td>
    <td class="${disposedColour(r)}">${n(r.disposed)}</td>
    <td class="${lowIsGoodColour(r.parked)}">${n(r.parked)}</td>
    <td class="${lowIsGoodColour(r.merged)}">${n(r.merged)}</td>
    <td class="${ageColour(r.p0_7)}">${n(r.p0_7)}</td>
    <td class="${ageColour(r.p8_15)}">${n(r.p8_15)}</td>
    <td class="${ageColour(r.p16_30)}">${n(r.p16_30)}</td>
    <td class="${ageColour(r.p31_60)}">${n(r.p31_60)}</td>
    <td class="${ageColour(r.p60)}">${n(r.p60)}</td>
    <td class="${pendingTotalColour(r.pending)}">${n(r.pending)}</td>
    <td class="${pendingDaysColour(r.pendingDays)}">${n(r.pendingDays).toFixed(2)}</td>
    <td class="${scoreColour(score(r))}"><b>${score(r).toFixed(1)}</b></td>
  </tr>`;
}

/* =========================================================
   GROUPED E-OFFICE DISPLAY
   ========================================================= */

function groupStats(rows) {
  const avg = rows.length ? rows.reduce((a,r) => a + score(r), 0) / rows.length : 0;
  const leader = [...rows].sort((a,b) => score(b)-score(a))[0];
  const workloadTotal = rows.reduce((a,r)=>a+workload(r),0);
  const disposed = rows.reduce((a,r)=>a+n(r.disposed),0);
  const pending = rows.reduce((a,r)=>a+n(r.pending),0);
  const disposalRate = workloadTotal ? Math.min(100, disposed/workloadTotal*100) : 0;
  return {avg, leader, workloadTotal, disposed, pending, disposalRate};
}

function miniChart(rows) {
  const sorted = [...rows].sort((a,b)=>score(b)-score(a)).slice(0,10);
  const max = Math.max(...sorted.map(r=>score(r)),1);

  return `<div class="group-chart">
    ${sorted.map(r=>`
      <div class="group-bar-wrap">
        <div class="group-bar ${scoreColour(score(r))}" style="height:${Math.max(8,score(r)/max*100)}%">
          <span>${score(r).toFixed(1)}</span>
        </div>
        <small>${esc(r.name || r.station || r.designation || "")}</small>
      </div>`).join("")}
  </div>`;
}

function groupTable(rows) {
  const sorted=[...rows].sort((a,b)=>score(b)-score(a));

  return `<div class="table-wrap grouped-table-wrap">
    <table>
      <thead>
        <tr>
          <th>Rank</th><th>Employee</th><th>Police Station / Designation</th>
          <th>Opening</th><th>Created</th><th>Received</th><th>Closed</th>
          <th>Forwarded</th><th>Disposed</th><th>Parked</th><th>Merged</th>
          <th>0–7 Days</th><th>8–15 Days</th><th>16–30 Days</th>
          <th>31–60 Days</th><th>&gt;60 Days</th><th>Total Pendency</th>
          <th>Avg. Pending Days</th><th>Score</th>
        </tr>
      </thead>
      <tbody>${sorted.map((r,i)=>colouredFullRow(r,i)).join("")}</tbody>
    </table>
  </div>`;
}

function renderGroupCard(type, name, rows) {
  const meta=GROUP_META[type];
  const st=groupStats(rows);

  return `
  <article class="org-group-card ${meta.colour}">
    <div class="org-group-head">
      <div>
        <h3>${meta.icon} ${esc(name)}</h3>
        <p>${rows.length} Employee${rows.length===1?"":"s"} • Average Score ${st.avg.toFixed(1)}</p>
      </div>
      <div class="leader-badge">
        Leader: ${esc(st.leader?.name || "—")} (${st.leader ? score(st.leader).toFixed(1) : "0.0"})
      </div>
    </div>

    <div class="group-metrics">
      <span>Employees <b>${rows.length}</b></span>
      <span>Disposed <b>${st.disposed.toLocaleString()}</b></span>
      <span>Pending <b>${st.pending.toLocaleString()}</b></span>
      <span>Disposal <b>${st.disposalRate.toFixed(1)}%</b></span>
    </div>

    ${miniChart(rows)}

    <details open>
      <summary>📊 View ${rows.length} E-Office record${rows.length===1?"":"s"}</summary>
      ${groupTable(rows)}
    </details>
  </article>`;
}

function renderGroupedEoffice() {
  const search = $("searchRank");
  const q=(search ? search.value : "").toLowerCase().trim().replace(/\s+/g, " ");
  const filtered=DATA.records.filter(r => textOf(r).includes(q));
  $("tableCount").textContent=filtered.length+" records";

  const groups=groupRecords(filtered);

  const order=[
    ["stations","🚔 Police Stations"],
    ["subdivisions","🏛️ Sub-Divisions"],
    ["office","🗂️ Office Staff"],
    ["special","⭐ Special Units / Wings"]
  ];

  $("groupSummaryTabs").innerHTML=`
    <button class="group-filter active" data-group="all">All Groups <b>${filtered.length}</b></button>
    ${order.map(([key,label])=>`
      <button class="group-filter" data-group="${key}">
        ${label} <b>${groups[key].size}</b>
      </button>`).join("")}
  `;

  const renderAll = selected => {
    let html="";
    for(const [key,label] of order) {
      if(selected!=="all" && selected!==key) continue;
      const entries=[...groups[key].entries()].sort((a,b)=>a[0].localeCompare(b[0]));
      if(!entries.length) continue;

      html+=`
      <section class="organisation-section" data-org-type="${key}">
        <div class="organisation-title">
          <div>
            <h2>${GROUP_META[key].icon} ${GROUP_META[key].title}</h2>
            <span>${entries.length} Units • ${GROUP_META[key].subtitle}</span>
          </div>
          <span class="organisation-count">${entries.reduce((a,x)=>a+x[1].length,0)} Records</span>
        </div>

        <div class="organisation-cards">
          ${entries.map(([name,rows])=>renderGroupCard(key,name,rows)).join("")}
        </div>
      </section>`;
    }

    $("groupedEoffice").innerHTML=html ||
      `<div class="empty-group">No E-Office records found for this search.</div>`;
  };

  renderAll("all");

  document.querySelectorAll(".group-filter").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".group-filter").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      renderAll(btn.dataset.group);
    });
  });
}

/* =========================================================
   DETAIL TABLE
   ========================================================= */

function renderDetail() {
  const q=($("searchDetail").value || "").toLowerCase();
  const rows=DATA.records.filter(r=>textOf(r).includes(q));

  $("detailTable").innerHTML=rows.map((r,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(stationFromRecord(r) || r.section || r.designation || "")}</td>
      <td>${n(r.opening)}</td><td>${n(r.created)}</td><td>${n(r.received)}</td>
      <td>${n(r.disposedClosed)}</td><td>${n(r.disposedForwarded)}</td><td>${n(r.disposed)}</td>
      <td>${n(r.parked)}</td><td>${n(r.merged)}</td><td>${n(r.pending)}</td>
      <td>${n(r.pendingDays).toFixed(2)}</td><td class="${scoreColour(score(r))}"><b>${score(r).toFixed(1)}</b></td>
    </tr>`).join("") || '<tr><td colspan="14">No records found</td></tr>';
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

function renderPerformance() {
  const q=($("perfSearch").value || "").toLowerCase();
  const rows=[...DATA.records]
    .filter(r=>textOf(r).includes(q))
    .sort((a,b)=>score(b)-score(a));

  $("performanceGrid").innerHTML=rows.map(r=>{
    const rate=disposalPct(r);
    return `
      <div class="perf">
        <div class="perf-head"><span>${esc(r.name)}</span><b>${score(r).toFixed(1)}</b></div>
        <div class="perf-meta">${esc(r.designation || "")} • ${esc(r.section || r.station || "")}</div>
        <div class="progress"><i style="width:${rate}%"></i></div>
        <small>
          Workload: ${workload(r).toLocaleString()} •
          Disposed: ${n(r.disposed).toLocaleString()} •
          Disposal: ${rate.toFixed(2)}% •
          Pending: ${n(r.pending)} (${pendingPct(r).toFixed(2)}%) •
          Avg days: ${n(r.pendingDays).toFixed(2)}
        </small>
      </div>`;
  }).join("");
}

/* =========================================================
   TRENDS
   ========================================================= */

function simple(label,value,max){
  return `
    <div class="simple-row">
      <span>${label}</span>
      <div class="simple-track"><i style="width:${max ? value/max*100 : 0}%"></i></div>
      <b>${value.toLocaleString()}</b>
    </div>`;
}

function renderTrends(){
  const r=DATA.records;

  const vals=[
    ["Opening",r.reduce((a,x)=>a+n(x.opening),0)],
    ["Created",r.reduce((a,x)=>a+n(x.created),0)],
    ["Received",r.reduce((a,x)=>a+n(x.received),0)],
    ["Closed",r.reduce((a,x)=>a+n(x.disposedClosed),0)],
    ["Forwarded",r.reduce((a,x)=>a+n(x.disposedForwarded),0)],
    ["Disposed",r.reduce((a,x)=>a+n(x.disposed),0)]
  ];

  const max=Math.max(...vals.map(x=>x[1]),1);
  $("movementBars").innerHTML=vals.map(x=>simple(x[0],x[1],max)).join("");

  const age=[
    ["0–7 Days",r.reduce((a,x)=>a+n(x.p0_7),0)],
    ["8–15 Days",r.reduce((a,x)=>a+n(x.p8_15),0)],
    ["16–30 Days",r.reduce((a,x)=>a+n(x.p16_30),0)],
    ["31–60 Days",r.reduce((a,x)=>a+n(x.p31_60),0)],
    [">60 Days",r.reduce((a,x)=>a+n(x.p60),0)]
  ];

  const m=Math.max(...age.map(x=>x[1]),1);
  $("pendencyBars").innerHTML=age.map(x=>simple(x[0],x[1],m)).join("");
}

/* =========================================================
   REPORTS
   ========================================================= */

function renderReports(){
  const r=DATA.records;
  const workloadTotal=r.reduce((a,x)=>a+workload(x),0);
  const received=r.reduce((a,x)=>a+n(x.received),0);
  const disposed=r.reduce((a,x)=>a+n(x.disposed),0);
  const pending=r.reduce((a,x)=>a+n(x.pending),0);

  const disposal=workloadTotal ? Math.min(100,disposed/workloadTotal*100) : 0;
  const pendPct=workloadTotal ? Math.min(100,pending/workloadTotal*100) : 0;

  const pendingRecords=r.filter(x=>n(x.pending)>0);
  const avgPendingDays=pendingRecords.reduce((a,x)=>a+n(x.pendingDays),0)/(pendingRecords.length||1);
  const age=avgPendingDays ? Math.max(0,100-Math.min(100,avgPendingDays/60*100)) : 100;

  const finalScore=disposal*.50+(100-pendPct)*.30+age*.20;

  $("reportCards").innerHTML=[
    ["Total Records",r.length],
    ["Total Workload",workloadTotal],
    ["Total Received",received],
    ["Total Disposed",disposed],
    ["Total Pendency",pending],
    ["Disposal Performance",disposal.toFixed(2)+"%"],
    ["Pendency %",pendPct.toFixed(2)+"%"],
    ["Final District Score",finalScore.toFixed(1)]
  ].map(x=>`
    <article><span>${x[0]}</span><strong>${typeof x[1]==="number"?x[1].toLocaleString():x[1]}</strong></article>
  `).join("");
}

/* =========================================================
   GROUPED UI STYLES
   ========================================================= */

function addGroupedStyles(){
  if(document.getElementById("grouped-eoffice-style")) return;

  const style=document.createElement("style");
  style.id="grouped-eoffice-style";
  style.textContent=`
    .group-summary-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
    .group-filter{border:1px solid #d5ddeb;background:#fff;border-radius:9px;padding:9px 14px;font-weight:700;cursor:pointer;color:#18345f}
    .group-filter b{margin-left:5px;color:#2457b8}
    .group-filter.active{background:#214eb4;color:#fff;border-color:#214eb4}
    .group-filter.active b{color:#fff}

    .organisation-section{margin:22px 0 34px}
    .organisation-title{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:0 0 12px;padding:14px 16px;border-radius:12px;background:#eef4ff;border-left:5px solid #2457c5}
    .organisation-title h2{margin:0;color:#17396e;font-size:19px}
    .organisation-title span{color:#60708b;font-size:13px}
    .organisation-count{background:#fff;border:1px solid #d6dfef;border-radius:20px;padding:7px 12px;font-weight:800;color:#2457b8;white-space:nowrap}

    .organisation-cards{display:grid;grid-template-columns:1fr;gap:18px}
    .org-group-card{border:1px solid #d9e1ed;border-top:4px solid #2457c5;border-radius:12px;background:#fff;box-shadow:0 3px 12px rgba(30,60,100,.08);overflow:hidden}
    .org-group-card.purple{border-top-color:#6941c6}
    .org-group-card.orange{border-top-color:#e58a16}
    .org-group-card.green{border-top-color:#159b70}

    .org-group-head{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:15px 17px 9px}
    .org-group-head h3{margin:0;color:#17396e;font-size:17px}
    .org-group-head p{margin:4px 0 0;color:#6a7890;font-size:12px}
    .leader-badge{background:#edf4ff;color:#2151a5;padding:8px 11px;border-radius:8px;font-size:12px;font-weight:800;white-space:nowrap}

    .group-metrics{display:flex;gap:8px;flex-wrap:wrap;padding:5px 17px 10px}
    .group-metrics span{background:#f5f8fc;border:1px solid #e3e9f2;border-radius:7px;padding:6px 9px;font-size:11px;color:#68758a}
    .group-metrics b{color:#183b72;margin-left:4px}

    .group-chart{height:220px;display:flex;align-items:flex-end;gap:8px;padding:15px 20px 12px;border-top:1px solid #edf1f6;border-bottom:1px solid #edf1f6;overflow-x:auto}
    .group-bar-wrap{height:100%;min-width:65px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
    .group-bar{width:43px;min-height:8px;border-radius:5px 5px 0 0;background:#3baee0;position:relative}
    .group-bar.eo-score-green{background:#16b77e!important;color:#fff!important}
    .group-bar.eo-score-yellow{background:#f5b820!important;color:#fff!important}
    .group-bar.eo-score-red{background:#e76b63!important;color:#fff!important}
    .group-bar span{position:absolute;top:-20px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:800;color:#35435b}
    .group-bar-wrap small{font-size:9px;color:#59677e;max-width:70px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:5px}

    .org-group-card details summary{cursor:pointer;padding:12px 17px;font-weight:800;color:#214b91;list-style:none;background:#fafcff}
    .org-group-card details summary::-webkit-details-marker{display:none}
    .org-group-card details summary:before{content:"▶";display:inline-block;font-size:10px;margin-right:8px;transition:.2s}
    .org-group-card details[open] summary:before{transform:rotate(90deg)}
    .grouped-table-wrap{margin:0;border-top:1px solid #e5eaf2;overflow:auto}

    .empty-group{padding:30px;text-align:center;color:#6c7890;background:#f8fafc;border-radius:10px}

    @media(max-width:800px){
      .org-group-head{flex-direction:column;align-items:flex-start}
      .leader-badge{white-space:normal}
      .organisation-title{flex-direction:column;align-items:flex-start}
    }
  `;
  document.head.appendChild(style);
}

/* =========================================================
   TABS / SEARCH / REFRESH
   ========================================================= */

function bindDashboardControls(){
  const searchRank = $("searchRank");
  const searchDetail = $("searchDetail");
  const perfSearch = $("perfSearch");
  const refresh = $("refresh");

  if (searchRank) searchRank.addEventListener("input", renderGroupedEoffice);
  if (searchDetail) searchDetail.addEventListener("input", renderDetail);
  if (perfSearch) perfSearch.addEventListener("input", renderPerformance);
  if (refresh) refresh.addEventListener("click", loadData);
}

document.querySelectorAll(".tab[data-target]").forEach(b=>{
  b.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".section").forEach(x=>x.classList.remove("active"));

    b.classList.add("active");
    $(b.dataset.target).classList.add("active");

    if(b.dataset.target==="details") renderDetail();
  });
});

bindDashboardControls();
addGroupedStyles();
loadData();
