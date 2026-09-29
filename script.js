let DATA=null;
const $=id=>document.getElementById(id);
const n=v=>Number(v||0);
const fmt=v=>n(v).toLocaleString("en-IN");
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function score(r){
  const totalIn=n(r.openingBalance)+n(r.created)+n(r.received);
  const disposed=n(r.disposedTotal);
  const pend=n(r.totalPendency);
  const disposalRate=totalIn?Math.min(100,disposed/totalIn*100):0;
  const pendRate=(disposed+pend)?Math.min(100,pend/(disposed+pend)*100):0;
  return Math.max(0,Math.min(100,disposalRate*0.78+(100-pendRate)*0.22));
}
function rows(){return (DATA?.records||[]).map(r=>({...r,score:score(r)}));}

async function loadData(){
  try{
    const res=await fetch("eoffice_data.json?ts="+Date.now());
    DATA=await res.json();
    render();
  }catch(e){
    console.error(e);
    alert("Unable to load eoffice_data.json. Please check that the JSON file is in the same GitHub repository.");
  }
}

function render(){
  const rs=rows(), p=DATA.period||"";
  $("period").textContent="Reporting Period: "+p;
  $("weekPill").textContent=p;
  $("recordCount").textContent=rs.length;
  $("employeeCount").textContent=rs.length;

  const disposed=rs.reduce((a,r)=>a+n(r.disposedTotal),0);
  const received=rs.reduce((a,r)=>a+n(r.created)+n(r.received),0);
  const pending=rs.reduce((a,r)=>a+n(r.totalPendency),0);
  const weighted=pending?rs.reduce((a,r)=>a+n(r.averagePendingDays)*n(r.totalPendency),0)/pending:0;

  $("totalDisposed").textContent=fmt(disposed);
  $("totalReceived").textContent=fmt(received);
  $("totalPendency").textContent=fmt(pending);
  $("pendencyHead").textContent=fmt(pending);
  $("avgPending").textContent=weighted.toFixed(2);
  $("loadedInfo").textContent=rs.length+" records loaded";
  $("chartCount").textContent=rs.length+" records";

  renderRanks(rs); renderChart(rs); renderPerformance(rs);
  renderTrends(rs); renderCategories(rs); renderTable(); renderReports(rs,disposed,received,pending,weighted);
  $("lastLoaded").textContent="Last loaded: "+new Date().toLocaleString("en-IN");
}

function displayName(r){return r.designation||"Unknown";}
function renderRanks(rs){
  const sorted=[...rs].sort((a,b)=>b.score-a.score);
  const top=sorted.slice(0,5), bottom=sorted.slice(-5).reverse();

  const card=(r,i,isBottom)=>{
    const rank=isBottom ? rs.length-i : i+1;
    return `<div class="rank-item">
      <div class="rank-num">${isBottom?"#"+rank:"🏅 "+rank}</div>
      <div><div class="rank-name">${esc(displayName(r))}</div><div class="rank-meta">${esc(r.employee)}</div></div>
      <span class="badge ${isBottom?"red":""}">${isBottom?"Pend. "+fmt(r.totalPendency):"Score"}</span>
      <div class="score">${r.score.toFixed(1)}</div>
    </div>`;
  };
  $("topList").innerHTML=top.map((r,i)=>card(r,i,false)).join("");
  $("bottomList").innerHTML=bottom.map((r,i)=>card(r,i,true)).join("");
}

function renderChart(rs){
  const sorted=[...rs].sort((a,b)=>b.score-a.score);
  $("barChart").innerHTML=sorted.map(r=>{
    const h=Math.max(18,r.score*2.05);
    return `<div class="bar" style="height:${h}px" title="${esc(displayName(r))}: ${r.score.toFixed(1)}">
      <span>${r.score.toFixed(0)}</span><label>${esc(displayName(r))}</label>
    </div>`;
  }).join("");
}

function renderPerformance(rs){
  const sorted=[...rs].sort((a,b)=>b.score-a.score);
  $("performanceGrid").innerHTML=sorted.map(r=>{
    const totalIn=n(r.openingBalance)+n(r.created)+n(r.received);
    const rate=totalIn?Math.min(100,n(r.disposedTotal)/totalIn*100):0;
    return `<div class="perf">
      <div class="perf-head"><span>${esc(displayName(r))} — ${esc(r.employee)}</span><b>${r.score.toFixed(1)}</b></div>
      <div class="progress"><i style="width:${rate}%"></i></div>
      <small>Disposal rate: ${rate.toFixed(1)}% • Pending: ${fmt(r.totalPendency)} • Avg days: ${n(r.averagePendingDays).toFixed(2)}</small>
    </div>`;
  }).join("");
}

function renderTrends(rs){
  const vals=[
    ["Created",rs.reduce((a,r)=>a+n(r.created),0)],
    ["Received",rs.reduce((a,r)=>a+n(r.received),0)],
    ["Closed",rs.reduce((a,r)=>a+n(r.closed),0)],
    ["Forwarded",rs.reduce((a,r)=>a+n(r.forwarded),0)],
    ["Disposed",rs.reduce((a,r)=>a+n(r.disposedTotal),0)]
  ];
  const max=Math.max(...vals.map(x=>x[1]),1);
  $("flowBars").innerHTML=vals.map(([k,v])=>`<div class="simple-row"><b>${k}</b><div class="simple-track"><div class="simple-fill" style="width:${v/max*100}%"></div></div><strong>${fmt(v)}</strong></div>`).join("");

  const pend=[
    ["0–7 Days",rs.reduce((a,r)=>a+n(r.pendency0to7),0)],
    ["8–15 Days",rs.reduce((a,r)=>a+n(r.pendency8to15),0)],
    ["16–30 Days",rs.reduce((a,r)=>a+n(r.pendency16to30),0)],
    ["31–60 Days",rs.reduce((a,r)=>a+n(r.pendency31to60),0)],
    [">60 Days",rs.reduce((a,r)=>a+n(r.pendencyOver60),0)]
  ];
  const pmax=Math.max(...pend.map(x=>x[1]),1);
  $("pendencyBars").innerHTML=pend.map(([k,v])=>`<div class="simple-row"><b>${k}</b><div class="simple-track"><div class="simple-fill" style="width:${v/pmax*100}%"></div></div><strong>${fmt(v)}</strong></div>`).join("");
}

function renderCategories(rs){
  const sums={
    "Files Created":rs.reduce((a,r)=>a+n(r.created),0),
    "Files Received":rs.reduce((a,r)=>a+n(r.received),0),
    "Files Closed":rs.reduce((a,r)=>a+n(r.closed),0),
    "Files Forwarded":rs.reduce((a,r)=>a+n(r.forwarded),0),
    "Files Disposed":rs.reduce((a,r)=>a+n(r.disposedTotal),0),
    "Current Pendency":rs.reduce((a,r)=>a+n(r.totalPendency),0),
    "Parked":rs.reduce((a,r)=>a+n(r.parked),0),
    "Merged":rs.reduce((a,r)=>a+n(r.merged),0)
  };
  $("categoryGrid").innerHTML=Object.entries(sums).map(([k,v])=>`<div class="category-card"><h3>${k}</h3><strong>${fmt(v)}</strong><small>Aggregate for all ${rs.length} records</small></div>`).join("");
}

function renderTable(){
  if(!DATA)return;
  const q=($("searchInput")?.value||"").toLowerCase().trim();
  const rs=rows().filter(r=>(String(r.employee)+" "+String(r.designation)).toLowerCase().includes(q));
  $("tableCount").textContent=`${rs.length} of ${DATA.records.length} records`;
  $("dataTable").innerHTML=rs.map(r=>`<tr>
    <td>${r.slNo}</td><td>${esc(r.employee)}</td><td>${esc(r.designation)}</td>
    <td>${fmt(r.openingBalance)}</td><td>${fmt(r.created)}</td><td>${fmt(r.received)}</td>
    <td>${fmt(r.closed)}</td><td>${fmt(r.forwarded)}</td><td><b style="color:#1761c7">${fmt(r.disposedTotal)}</b></td>
    <td>${fmt(r.parked)}</td><td>${fmt(r.merged)}</td><td>${fmt(r.pendency0to7)}</td>
    <td>${fmt(r.pendency8to15)}</td><td>${fmt(r.pendency16to30)}</td><td>${fmt(r.pendency31to60)}</td><td>${fmt(r.pendencyOver60)}</td>
  </tr>`).join("");
}

function renderReports(rs,disposed,received,pending,weighted){
  const disposalRate=received?disposed/received*100:0;
  $("reportGrid").innerHTML=`
    <div class="report-card"><b>Total Employees / Units</b><strong>${fmt(rs.length)}</strong><small>Records in current E-Office report</small></div>
    <div class="report-card"><b>Overall Disposal Rate</b><strong>${disposalRate.toFixed(1)}%</strong><small>Disposed compared with created + received</small></div>
    <div class="report-card"><b>Average Pending Days</b><strong>${weighted.toFixed(2)}</strong><small>Weighted by current pendency</small></div>
    <div class="report-card"><b>Total Parked Files</b><strong>${fmt(rs.reduce((a,r)=>a+n(r.parked),0))}</strong><small>Across all records</small></div>
    <div class="report-card"><b>Total Merged Files</b><strong>${fmt(rs.reduce((a,r)=>a+n(r.merged),0))}</strong><small>Across all records</small></div>
    <div class="report-card"><b>Current Pendency</b><strong>${fmt(pending)}</strong><small>All age categories combined</small></div>`;
}

document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.target).classList.add("active");
    window.scrollTo({top:document.getElementById(btn.dataset.target).offsetTop-10,behavior:"smooth"});
  });
});

loadData();
