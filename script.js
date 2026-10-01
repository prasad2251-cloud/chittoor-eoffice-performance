const $=id=>document.getElementById(id);
let DATA={records:[],reporting:{},trend:[],quickAccess:[]};

async function loadData(){
  try{
    const r=await fetch("data.json?ts="+Date.now(),{cache:"no-store"});
    DATA=await r.json();
    DATA.records=Array.isArray(DATA.records)?DATA.records:[];
    renderAll();
  }catch(e){
    console.error(e);
    document.querySelector("main").innerHTML='<div class="panel" style="padding:30px"><h2>Data could not be loaded</h2><p>Please check that <b>data.json</b> is uploaded in the same folder as index.html.</p></div>';
  }
}
function num(v){return Number(v)||0}
function score(r){return num(r.score)}
function renderAll(){
  const rs=DATA.records, rec=DATA.reporting||{};
  $("recordCount").textContent=rs.length;
  $("disposedCount").textContent=rs.reduce((a,r)=>a+num(r.disposed),0);
  $("pendingCount").textContent=rs.reduce((a,r)=>a+num(r.pending),0);
  $("totalDisposed").textContent=rs.reduce((a,r)=>a+num(r.disposed),0);
  $("totalReceived").textContent=rs.reduce((a,r)=>a+num(r.received),0);
  $("totalPending").textContent=rs.reduce((a,r)=>a+num(r.pending),0);
  const pend=rs.filter(r=>num(r.pending)>0);
  $("avgPendingDays").textContent=(pend.length?pend.reduce((a,r)=>a+num(r.pendingDays),0)/pend.length:0).toFixed(2);
  $("periodBadge").textContent=`Reporting Period: ${rec.from||"—"} TO ${rec.to||"—"}`;
  $("chartCount").textContent=rs.length+" records";
  renderRankings(); renderPerformance(); renderEmployees(); renderSubdivision(); renderTrends(); renderQuick();
}
function row(r,i,attention=false){
 return `<div class="rank-row"><span class="rank">${attention?"#"+(i+1):"🏅 "+(i+1)}</span><div class="rank-info"><b>${esc(r.designation||"")}</b><small>${esc(r.name||"")} ${r.section?"• "+esc(r.section):""}</small></div>${attention?`<span class="score warn">Pend. ${num(r.pending)}</span>`:""}<span class="score">${score(r).toFixed(1)}</span></div>`;
}
function renderRankings(){
 const rs=[...DATA.records].sort((a,b)=>score(b)-score(a));
 $("topList").innerHTML=rs.slice(0,5).map((r,i)=>row(r,i)).join("")||empty();
 const bottom=[...DATA.records].sort((a,b)=>score(a)-score(b));
 $("bottomList").innerHTML=bottom.slice(0,5).map((r,i)=>row(r,DATA.records.indexOf(r),true)).join("")||empty();
 $("scoreChart").innerHTML=rs.map(r=>`<div class="bar" style="height:${Math.max(8,Math.min(100,score(r)))}%"><label>${Math.round(score(r))}</label></div>`).join("");
}
function renderPerformance(){
 let rs=[...DATA.records];
 const q=($("perfSearch").value||"").toLowerCase();
 rs=rs.filter(r=>(r.name+" "+r.designation+" "+r.section).toLowerCase().includes(q));
 const s=$("perfSort").value;
 rs.sort((a,b)=>s==="score"?score(b)-score(a):s==="disposed"?num(b.disposed)-num(a.disposed):s==="pending"?num(b.pending)-num(a.pending):num(b.pendingDays)-num(a.pendingDays));
 $("performanceTable").innerHTML=table(rs);
}
function renderEmployees(){
 let rs=[...DATA.records],q=($("empSearch").value||"").toLowerCase(),sub=$("empSubdivision").value;
 rs=rs.filter(r=>(r.name+" "+r.designation+" "+r.section+" "+r.subdivision+" "+r.station).toLowerCase().includes(q));
 if(sub)rs=rs.filter(r=>(r.subdivision||"")===sub);
 $("employeeTable").innerHTML=table(rs);
}
function table(rs){
 if(!rs.length)return empty();
 return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Name</th><th>Designation</th><th>Section/PS</th><th>Sub-Division</th><th>Received</th><th>Disposed</th><th>Pending</th><th>Pending Days</th><th>Score</th></tr></thead><tbody>${rs.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.name)}</td><td>${esc(r.designation)}</td><td>${esc(r.section||r.station||"")}</td><td>${esc(r.subdivision||"")}</td><td>${num(r.received)}</td><td>${num(r.disposed)}</td><td>${num(r.pending)}</td><td>${num(r.pendingDays).toFixed(1)}</td><td><b>${score(r).toFixed(1)}</b></td></tr>`).join("")}</tbody></table></div>`;
}
function renderSubdivision(){
 const map={};
 DATA.records.forEach(r=>{
  const k=r.subdivision||"Unassigned"; if(!map[k])map[k]={name:k,count:0,received:0,disposed:0,pending:0,score:0};
  map[k].count++;map[k].received+=num(r.received);map[k].disposed+=num(r.disposed);map[k].pending+=num(r.pending);map[k].score+=score(r);
 });
 const rows=Object.values(map).map(x=>({...x,avg:x.score/x.count})).sort((a,b)=>b.avg-a.avg);
 $("subdivisionTable").innerHTML=rows.length?`<div class="table-wrap"><table><thead><tr><th>Sub-Division</th><th>Employees/Records</th><th>Received</th><th>Disposed</th><th>Pending</th><th>Avg Score</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${x.count}</td><td>${x.received}</td><td>${x.disposed}</td><td>${x.pending}</td><td><b>${x.avg.toFixed(1)}</b></td></tr>`).join("")}</tbody></table></div>`:empty();
}
function renderTrends(){
 const t=DATA.trend||[];
 const total=DATA.records.reduce((a,r)=>a+num(r.received),0),disp=DATA.records.reduce((a,r)=>a+num(r.disposed),0),pend=DATA.records.reduce((a,r)=>a+num(r.pending),0);
 $("trendCards").innerHTML=`<div class="card"><span>📥 Received</span><b>${total}</b><small>Current data</small></div><div class="card"><span>📤 Disposed</span><b>${disp}</b><small>Current data</small></div><div class="card"><span>⌛ Pending</span><b>${pend}</b><small>Current data</small></div><div class="card"><span>📊 Disposal %</span><b>${total?((disp/total)*100).toFixed(1):"0.0"}%</b><small>Disposed / Received</small></div>`;
 const mx=Math.max(...t.map(x=>num(x.value)),1);
 $("trendChart").innerHTML=t.length?t.map(x=>`<div class="trend-row"><span class="trend-label">${esc(x.label)}</span><div class="trend-track"><div class="trend-fill" style="width:${num(x.value)/mx*100}%"></div></div><b>${num(x.value)}</b></div>`).join(""):"<p>No trend data supplied.</p>";
}
function renderQuick(){
 $("quickGrid").innerHTML=(DATA.quickAccess||[]).map(x=>`<a class="quick" href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.title)}</b><small>${esc(x.description||"Open link")}</small></a>`).join("")||"<p>No Quick Access links supplied.</p>";
 const subs=[...new Set(DATA.records.map(r=>r.subdivision).filter(Boolean))].sort();
 $("empSubdivision").innerHTML='<option value="">All Sub-Divisions</option>'+subs.map(x=>`<option>${esc(x)}</option>`).join("");
}
function empty(){return '<div style="padding:20px;color:#718096">No records found.</div>'}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".section").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.section).classList.add("active")}));
$("perfSearch").addEventListener("input",renderPerformance);$("perfSort").addEventListener("change",renderPerformance);$("empSearch").addEventListener("input",renderEmployees);$("empSubdivision").addEventListener("change",renderEmployees);
$("downloadCsv").addEventListener("click",()=>{const h=["Name","Designation","Section","Sub-Division","Received","Disposed","Pending","Pending Days","Score"];const lines=[h,...DATA.records.map(r=>[r.name,r.designation,r.section||r.station,r.subdivision,r.received,r.disposed,r.pending,r.pendingDays,r.score])].map(a=>a.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(","));const blob=new Blob([lines.join("\n")],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="chittoor-eoffice-report.csv";a.click()});
$("printReport").addEventListener("click",()=>window.print());
loadData();
