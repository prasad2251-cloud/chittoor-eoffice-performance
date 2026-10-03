let DATA = null;

const $ = id => document.getElementById(id);
const num = v => Number(v ?? 0) || 0;
const fmt = v => num(v).toLocaleString("en-IN");
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[m]));

function val(o, ...keys) {
  for (const k of keys) {
    if (o && o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  }
  return 0;
}

function normalizeRecord(r, i) {
  return {
    sno: val(r,"sno","slNo") || i + 1,
    employee: val(r,"employee","Employee"),
    unit_designation: val(r,"unit_designation","designation","unitDesignation","Unit / Designation"),
    opening_balance: num(val(r,"opening_balance","openingBalance")),
    created: num(val(r,"created","Created")),
    received: num(val(r,"received","Received")),
    disposed_closed: num(val(r,"disposed_closed","closed","disposedClosed")),
    disposed_forwarded: num(val(r,"disposed_forwarded","forwarded","disposedForwarded")),
    disposed_total: num(val(r,"disposed_total","disposedTotal","disposed")),
    parked: num(val(r,"parked","Parked")),
    merged: num(val(r,"merged","Merged")),
    pendency_0_7_days: num(val(r,"pendency_0_7_days","pendency0to7","pendency_0_7")),
    pendency_8_15_days: num(val(r,"pendency_8_15_days","pendency8to15")),
    pendency_16_30_days: num(val(r,"pendency_16_30_days","pendency16to30")),
    pendency_31_60_days: num(val(r,"pendency_31_60_days","pendency31to60")),
    pendency_over_60_days: num(val(r,"pendency_over_60_days","pendencyOver60")),
    total_pendency: num(val(r,"total_pendency","totalPendency","pendency")),
    average_pending_days: num(val(r,"average_pending_days","averagePendingDays","avgPendingDays"))
  };
}

function normalizeTotal(t) {
  return {
    opening_balance: num(val(t,"opening_balance","openingBalance")),
    created: num(val(t,"created","Created")),
    received: num(val(t,"received","Received")),
    disposed_closed: num(val(t,"disposed_closed","closed","disposedClosed")),
    disposed_forwarded: num(val(t,"disposed_forwarded","forwarded","disposedForwarded")),
    disposed_total: num(val(t,"disposed_total","disposedTotal","disposed")),
    parked: num(val(t,"parked","Parked")),
    merged: num(val(t,"merged","Merged")),
    pendency_0_7_days: num(val(t,"pendency_0_7_days","pendency0to7")),
    pendency_8_15_days: num(val(t,"pendency_8_15_days","pendency8to15")),
    pendency_16_30_days: num(val(t,"pendency_16_30_days","pendency16to30")),
    pendency_31_60_days: num(val(t,"pendency_31_60_days","pendency31to60")),
    pendency_over_60_days: num(val(t,"pendency_over_60_days","pendencyOver60")),
    total_pendency: num(val(t,"total_pendency","totalPendency","pendency")),
    average_pending_days: num(val(t,"average_pending_days","averagePendingDays","avgPendingDays"))
  };
}

function score(r) {
  const available = r.opening_balance + r.created + r.received;
  const disposed = r.disposed_total;
  const pend = r.total_pendency;
  const disposalRate = available ? Math.min(100, disposed / available * 100) : 0;
  const pendPenalty = Math.min(35, pend / Math.max(1, disposed + pend) * 100);
  return Math.max(0, Math.min(100, disposalRate * 0.8 + (100 - pendPenalty) * 0.2));
}

function rows() {
  return (DATA.records || []).map(normalizeRecord).map(r => ({...r, score: score(r)}));
}

function totalFromRows(rs) {
  const t = {
    opening_balance:0, created:0, received:0, disposed_closed:0,
    disposed_forwarded:0, disposed_total:0, parked:0, merged:0,
    pendency_0_7_days:0, pendency_8_15_days:0, pendency_16_30_days:0,
    pendency_31_60_days:0, pendency_over_60_days:0, total_pendency:0
  };
  rs.forEach(r => {
    Object.keys(t).forEach(k => t[k] += num(r[k]));
  });
  const p = rs.reduce((a,r) => a + r.total_pendency, 0);
  t.average_pending_days = p
    ? rs.reduce((a,r) => a + r.average_pending_days * r.total_pendency, 0) / p
    : 0;
  return t;
}

function getTotal(rs) {
  const raw = DATA.district_total || DATA.districtTotal;
  const t = raw ? normalizeTotal(raw) : totalFromRows(rs);

  // If a total object exists but contains zeros while records contain data,
  // use the calculated record totals instead.
  const recordDisposed = rs.reduce((a,r)=>a+r.disposed_total,0);
  const recordCreated = rs.reduce((a,r)=>a+r.created,0);
  if (t.disposed_total === 0 && recordDisposed > 0) return totalFromRows(rs);
  if (t.created === 0 && recordCreated > 0) return totalFromRows(rs);
  return t;
}

function nameOf(r) {
  return r.unit_designation || r.employee || "Unknown";
}

function renderRankings(rs) {
  const sorted = [...rs].sort((a,b)=>b.score-a.score);
  const item = (r,i,bottom=false) => `
    <div class="rank-item">
      <div class="rank-num">${bottom ? "#"+(rs.length-i) : "🏅 "+(i+1)}</div>
      <div>
        <div class="rank-name">${esc(nameOf(r))}</div>
        <div class="rank-meta">${esc(r.employee)}</div>
      </div>
      <span class="badge ${bottom ? "red" : ""}">
        ${bottom ? "Pend. "+fmt(r.total_pendency) : "Score"}
      </span>
      <div class="score">${r.score.toFixed(1)}</div>
    </div>`;
  if ($("topList")) $("topList").innerHTML = sorted.slice(0,5).map((r,i)=>item(r,i)).join("");
  if ($("bottomList")) $("bottomList").innerHTML = sorted.slice(-5).reverse().map((r,i)=>item(r,i,true)).join("");
}

function renderChart(rs) {
  const el = $("barChart");
  if (!el) return;
  const sorted = [...rs].sort((a,b)=>b.score-a.score);
  const max = Math.max(...sorted.map(r=>r.score),1);
  el.innerHTML = sorted.map(r => {
    const h = Math.max(8, r.score/max*220);
    return `<div class="bar" style="height:${h}px" title="${esc(nameOf(r))}: ${r.score.toFixed(1)}">
      <span>${r.score.toFixed(0)}</span><label>${esc(nameOf(r))}</label>
    </div>`;
  }).join("");
}

function renderPerformance(rs) {
  const el = $("performanceGrid");
  if (!el) return;
  const sorted = [...rs].sort((a,b)=>b.score-a.score);
  el.innerHTML = sorted.map(r => {
    const available = r.opening_balance+r.created+r.received;
    const rate = available ? Math.min(100,r.disposed_total/available*100) : 0;
    return `<div class="perf">
      <div class="perf-head"><span>${esc(nameOf(r))}</span><b>${r.score.toFixed(1)}</b></div>
      <div class="progress"><i style="width:${rate}%"></i></div>
      <small>Disposal rate: ${rate.toFixed(1)}% • Pending: ${fmt(r.total_pendency)} • Avg days: ${r.average_pending_days.toFixed(2)}</small>
    </div>`;
  }).join("");
}

function barRows(items) {
  const elmax = Math.max(...items.map(x=>x.v),1);
  return items.map(x=>`<div class="summary-row">
    <span>${x.k}</span><div class="track"><i style="width:${Math.max(2,x.v/elmax*100)}%"></i></div>
    <strong>${fmt(x.v)}</strong>
  </div>`).join("");
}

function renderTrends(t) {
  if ($("movementBars")) $("movementBars").innerHTML = barRows([
    {k:"Opening Balance",v:t.opening_balance},{k:"Created",v:t.created},
    {k:"Received",v:t.received},{k:"Disposed",v:t.disposed_total},
    {k:"Parked",v:t.parked},{k:"Merged",v:t.merged}
  ]);
  if ($("pendencyBars")) $("pendencyBars").innerHTML = barRows([
    {k:"0–7 Days",v:t.pendency_0_7_days},{k:"8–15 Days",v:t.pendency_8_15_days},
    {k:"16–30 Days",v:t.pendency_16_30_days},{k:"31–60 Days",v:t.pendency_31_60_days},
    {k:">60 Days",v:t.pendency_over_60_days}
  ]);
}

function renderTable(rs, filter="") {
  const body = $("detailTable");
  if (!body) return;

  const q = String(filter || "").toLowerCase().trim();
  const list = rs.filter(r =>
    (r.employee + " " + r.unit_designation).toLowerCase().includes(q)
  ).sort((a,b)=>b.score-a.score);

  body.innerHTML = list.map((r,i)=>`<tr>
    <td>${i+1}</td>
    <td><b>${esc(r.employee)}</b></td>
    <td>${esc(r.unit_designation)}</td>
    <td>${fmt(r.opening_balance)}</td>
    <td>${fmt(r.created)}</td>
    <td>${fmt(r.received)}</td>
    <td>${fmt(r.disposed_closed)}</td>
    <td>${fmt(r.disposed_forwarded)}</td>
    <td>${fmt(r.disposed_total)}</td>
    <td>${fmt(r.parked)}</td>
    <td>${fmt(r.merged)}</td>
    <td>${fmt(r.total_pendency)}</td>
    <td>${r.average_pending_days.toFixed(2)}</td>
    <td class="score-cell">${r.score.toFixed(1)}</td>
  </tr>`).join("") ||
  `<tr><td colspan="14" style="text-align:center;padding:25px">No matching record found.</td></tr>`;

  const countEls = ["detailCount","detailsCount","fullDataCount"];
  countEls.forEach(id => {
    if ($(id)) $(id).textContent = list.length+" records";
  });
}

function renderReport(t) {
  const box = $("reportCards");
  if (!box) return;
  const items = [
    ["Opening Balance",t.opening_balance],["Created",t.created],["Received",t.received],
    ["Disposed — Closed",t.disposed_closed],["Disposed — Forwarded",t.disposed_forwarded],
    ["Total Disposed",t.disposed_total],["Parked",t.parked],["Merged",t.merged],
    ["Total Pendency",t.total_pendency],["0–7 Days",t.pendency_0_7_days],
    ["8–15 Days",t.pendency_8_15_days],["16–30 Days",t.pendency_16_30_days],
    ["31–60 Days",t.pendency_31_60_days],[">60 Days",t.pendency_over_60_days],
    ["Average Pending Days",t.average_pending_days.toFixed(2)]
  ];
  box.innerHTML = `<div class="report-grid">${items.map(x=>
    `<div class="report-item"><span>${esc(x[0])}</span><strong>${typeof x[1]==="number" ? fmt(x[1]) : x[1]}</strong></div>`
  ).join("")}</div>`;
}

function render() {
  const rs = rows();
  const t = getTotal(rs);

  if ($("period")) $("period").textContent = "Reporting Period: " + (DATA.reporting_period || DATA.period || "");
  if ($("unitCount")) $("unitCount").textContent = fmt(rs.length);
  if ($("disposedHero")) $("disposedHero").textContent = fmt(t.disposed_total);
  if ($("pendencyHero")) $("pendencyHero").textContent = fmt(t.total_pendency);
  if ($("disposedTotal")) $("disposedTotal").textContent = fmt(t.disposed_total);
  if ($("receivedTotal")) $("receivedTotal").textContent = fmt(t.created+t.received);
  if ($("pendencyTotal")) $("pendencyTotal").textContent = fmt(t.total_pendency);
  if ($("avgPending")) $("avgPending").textContent = t.average_pending_days.toFixed(2);
  if ($("chartNote")) $("chartNote").textContent = rs.length+" records";

  renderRankings(rs);
  renderChart(rs);
  renderPerformance(rs);
  renderTrends(t);
  renderTable(rs);
  renderReport(t);

  if ($("lastLoaded")) $("lastLoaded").textContent = "Last loaded: "+new Date().toLocaleString("en-IN");
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".section").forEach(s=>s.classList.remove("active-section"));
      btn.classList.add("active");
      const target = $(btn.dataset.target);
      if (target) target.classList.add("active-section");
    });
  });
}

async function load() {
  try {
    const response = await fetch("data.json?ts="+Date.now(), {cache:"no-store"});
    if (!response.ok) throw new Error("data.json HTTP "+response.status);
    DATA = await response.json();
    if (!Array.isArray(DATA.records)) throw new Error("records array not found");
    render();
  } catch (err) {
    document.body.innerHTML = `<div style="padding:60px;font-family:Arial;text-align:center">
      <h2>Dashboard data could not be loaded</h2>
      <p>${esc(err.message)}</p>
      <p>Please make sure data.json is in the GitHub root folder.</p>
    </div>`;
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  if ($("searchDetail")) {
    $("searchDetail").addEventListener("input", e => renderTable(rows(), e.target.value));
  }
  if ($("searchRank")) {
    $("searchRank").addEventListener("input", e => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = rows().filter(r => (r.employee+" "+r.unit_designation).toLowerCase().includes(q));
      renderTable(filtered);
    });
  }
  if ($("refresh")) $("refresh").addEventListener("click", load);
  load();
});
