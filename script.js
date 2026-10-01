const $=id=>document.getElementById(id);
let DATA={records:[],reporting:{},scoreFormula:{}};

const n=v=>Number(v)||0;
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const workload=r=>n(r.opening)+n(r.created)+n(r.received);

function calcScore(r){
  const w=workload(r);
  const disposal=w?Math.min(100,n(r.disposed)/w*100):(n(r.pending)>0?0:100);
  const pendingPct=w?Math.min(100,n(r.pending)/w*100):(n(r.pending)>0?100:0);
  const pendency=Math.max(0,100-pendingPct);
  const age=n(r.pending)>0 ? Math.max(0,100-Math.min(100,n(r.pendingDays)/60*100)) : 100;
  return Math.max(0,Math.min(100,disposal*.50+pendency*.30+age*.20));
}
function disposalPct(r){
  const w=workload(r);
  return w?Math.min(100,n(r.disposed)/w*100):(n(r.pending)>0?0:100);
}
function pendingPct(r){
  const w=workload(r);
  return w?Math.min(100,n(r.pending)/w*100):(n(r.pending)>0?100:0);
}
const score=r=>calcScore(r);

async function loadData(){
  try{
    const res=await fetch("data.json?ts="+Date.now(),{cache:"no-store"});
    if(!res.ok) throw new Error("data.json HTTP "+res.status);
    DATA=await res.json();
    DATA.records=Array.isArray(DATA.records)?DATA.records:[];
    render();
  }catch(e){
    console.error(e);
    document.querySelector("main").innerHTML='<div class="panel error"><h2>Data could not be loaded</h2><p>Please keep the existing <b>data.json</b> in the repository root.</p></div>';
  }
}

function render(){
  const r=DATA.records,p=DATA.reporting||{};
  const received=r.reduce((a,x)=>a+n(x.received),0);
  const disposed=r.reduce((a,x)=>a+n(x.disposed),0);
  const pending=r.reduce((a,x)=>a+n(x.pending),0);
  const pd=r.filter(x=>n(x.pending)>0);
  const avg=pd.length?pd.reduce((a,x)=>a+n(x.pendingDays),0)/pd.length:0;

  $("unitCount").textContent=r.length;
  $("disposedHero").textContent=disposed.toLocaleString();
  $("pendencyHero").textContent=pending.toLocaleString();
  $("disposedTotal").textContent=disposed.toLocaleString();
  $("receivedTotal").textContent=received.toLocaleString();
  $("pendencyTotal").textContent=pending.toLocaleString();
  $("avgPending").textContent=avg.toFixed(2);
  $("period").textContent=`Reporting Period: ${p.from||"—"} TO ${p.to||"—"}`;
  $("chartNote").textContent=r.length+" records • Final Score = 50% Disposal + 30% Pendency + 20% Ageing";
  $("lastLoaded").textContent=" • "+new Date().toLocaleString();

  renderRanks();renderTable();renderPerformance();renderTrends();renderReports();
}

function rankItem(r,i,bottom){
  return `<div class="rank-item">
    <b class="rank-num">${bottom?"#"+(i+1):"🏅 "+(i+1)}</b>
    <div><div class="rank-name">${esc(r.designation||"")}</div><div class="rank-meta">${esc(r.name||"")}${r.section?" • "+esc(r.section):""}</div></div>
    ${bottom?`<span class="badge red">Pend. ${n(r.pending)}</span>`:""}
    <span class="score">${score(r).toFixed(1)}</span>
  </div>`;
}
function renderRanks(){
  const top=[...DATA.records].sort((a,b)=>score(b)-score(a));
  const bottom=[...DATA.records].sort((a,b)=>score(a)-score(b));
  $("topList").innerHTML=top.slice(0,5).map((r,i)=>rankItem(r,i,false)).join("");
  $("bottomList").innerHTML=bottom.slice(0,5).map((r,i)=>rankItem(r,i,true)).join("");
  const max=Math.max(...top.map(x=>score(x)),1);
  $("barChart").innerHTML=top.map(r=>`<div class="bar" style="height:${Math.max(8,score(r)/max*100)}%"><span>${score(r).toFixed(1)}</span></div>`).join("");
}

function fullRow(r,i){
  return `<tr>
 <td>${i+1}</td><td>${esc(r.name)}</td><td>${esc((r.station||"")+(r.station&&r.designation?" / ":"")+(r.designation||r.section||""))}</td>
 <td>${n(r.opening)}</td><td>${n(r.created)}</td><td>${n(r.received)}</td><td>${n(r.disposedClosed)}</td><td>${n(r.disposedForwarded)}</td><td>${n(r.disposed)}</td>
 <td>${n(r.parked)}</td><td>${n(r.merged)}</td><td>${n(r.p0_7)}</td><td>${n(r.p8_15)}</td><td>${n(r.p16_30)}</td><td>${n(r.p31_60)}</td><td>${n(r.p60)}</td>
 <td>${n(r.pending)}</td><td>${n(r.pendingDays).toFixed(2)}</td><td><b>${score(r).toFixed(1)}</b></td></tr>`;
}
function renderTable(){
  const q=($("searchRank").value||"").toLowerCase();
  const rows=DATA.records.filter(r=>(r.name+" "+r.designation+" "+r.section+" "+r.station).toLowerCase().includes(q));
  $("tableCount").textContent=rows.length+" records";
  $("rankingTable").innerHTML=rows.map(fullRow).join("")||'<tr><td colspan="19">No records found</td></tr>';
}
function renderDetail(){
  const q=($("searchDetail").value||"").toLowerCase();
  const rows=DATA.records.filter(r=>(r.name+" "+r.designation+" "+r.section+" "+r.station).toLowerCase().includes(q));
  $("detailTable").innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.name)}</td><td>${esc(r.station||r.section||r.designation)}</td><td>${n(r.opening)}</td><td>${n(r.created)}</td><td>${n(r.received)}</td><td>${n(r.disposedClosed)}</td><td>${n(r.disposedForwarded)}</td><td>${n(r.disposed)}</td><td>${n(r.parked)}</td><td>${n(r.merged)}</td><td>${n(r.pending)}</td><td>${n(r.pendingDays).toFixed(2)}</td><td>${score(r).toFixed(1)}</td></tr>`).join("");
}
function renderPerformance(){
  const q=($("perfSearch").value||"").toLowerCase();
  const rows=[...DATA.records].filter(r=>(r.name+" "+r.designation+" "+r.section+" "+r.station).toLowerCase().includes(q)).sort((a,b)=>score(b)-score(a));
  $("performanceGrid").innerHTML=rows.map(r=>{
    const rate=disposalPct(r);
    return `<div class="perf"><div class="perf-head"><span>${esc(r.name)}</span><b>${score(r).toFixed(1)}</b></div><div class="perf-meta">${esc(r.designation)} • ${esc(r.section||r.station||"")}</div><div class="progress"><i style="width:${rate}%"></i></div><small>Workload: ${workload(r).toLocaleString()} • Disposed: ${n(r.disposed).toLocaleString()} • Disposal: ${rate.toFixed(2)}% • Pending: ${n(r.pending)} (${pendingPct(r).toFixed(2)}%) • Avg days: ${n(r.pendingDays).toFixed(2)}</small></div>`;
  }).join("");
}
function simple(label,value,max){
  return `<div class="simple-row"><span>${label}</span><div class="simple-track"><i style="width:${max?value/max*100:0}%"></i></div><b>${value.toLocaleString()}</b></div>`;
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
function renderReports(){
  const r=DATA.records;
  const workloadTotal=r.reduce((a,x)=>a+workload(x),0);
  const received=r.reduce((a,x)=>a+n(x.received),0);
  const disposed=r.reduce((a,x)=>a+n(x.disposed),0);
  const pending=r.reduce((a,x)=>a+n(x.pending),0);
  const disposal=workloadTotal?Math.min(100,disposed/workloadTotal*100):0;
  const pendPct=workloadTotal?Math.min(100,pending/workloadTotal*100):0;
  const avgPendingDays = r.filter(x=>n(x.pending)>0).reduce((a,x)=>a+n(x.pendingDays),0)/(r.filter(x=>n(x.pending)>0).length||1);
  const age=avgPendingDays?Math.max(0,100-Math.min(100,avgPendingDays/60*100)):100;
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
  ].map(x=>`<article><span>${x[0]}</span><strong>${typeof x[1]==="number"?x[1].toLocaleString():x[1]}</strong></article>`).join("");
}

document.querySelectorAll(".tab[data-target]").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".section").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");$(b.dataset.target).classList.add("active");
  if(b.dataset.target==="details")renderDetail();
}));
$("searchRank").addEventListener("input",renderTable);
$("searchDetail").addEventListener("input",renderDetail);
$("perfSearch").addEventListener("input",renderPerformance);
$("refresh").addEventListener("click",loadData);
loadData();
