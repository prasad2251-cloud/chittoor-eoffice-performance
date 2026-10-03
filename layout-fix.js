(function(){
'use strict';

const $=id=>document.getElementById(id);
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const num=v=>Number(v)||0;
const name=r=>text(r.name||r.employee);
const unit=r=>text(r.unit_designation||r.station||r.policeStation||r.psName||r.designation||r.post||r.section);
const opening=r=>num(r.opening??r.opening_balance);
const created=r=>num(r.created);
const received=r=>num(r.received);
const disposed=r=>num(r.disposed??r.disposed_total);
const closed=r=>num(r.disposedClosed??r.disposed_closed);
const forwarded=r=>num(r.disposedForwarded??r.disposed_forwarded);
const parked=r=>num(r.parked);
const merged=r=>num(r.merged);
const pending=r=>num(r.pending??r.total_pendency);
const pDays=r=>num(r.pendingDays??r.average_pending_days);
const workload=r=>opening(r)+created(r)+received(r);
function sc(r){
  const w=workload(r);
  const d=w?Math.min(100,disposed(r)/w*100):(pending(r)>0?0:100);
  const p=w?Math.min(100,pending(r)/w*100):(pending(r)>0?100:0);
  const age=pending(r)>0?Math.max(0,100-Math.min(100,pDays(r)/60*100)):100;
  return Math.max(0,Math.min(100,d*.5+(100-p)*.3+age*.2));
}

const SUBS=[
  {key:'Chittoor Sub-Division',label:'SDPO CHITTOOR',leader:'J. VENKATANARAYANA',match:'J VENKATANARAYANA'},
  {key:'Palamaner Sub-Division',label:'SDPO PALAMANER',leader:'D. PRABHAKAR',match:'D PRABHAKAR'},
  {key:'Kuppam Sub-Division',label:'ASST. SUPDT. OF POLICE – KUPPAM',leader:'B. HEMANTH',match:'B HEMANTH'},
  {key:'Nagari Sub-Division',label:'SDPO NAGARI',leader:'S. CHANDRA SEKHAR',match:'S CHANDRA SEKHAR'}
];

const REMOVED=new Set(['J MALLESH YADAV','V BHASKAR']);
const OFFICE_ROLES=new Set(['AO','SUPDT','JR ASST','SR ASST','TYPIST','AAO','ADDL SP (ADMIN)','SP CTR']);
const SPECIAL_RULES=[
  [/INSPR,?\s*DTRB/i,'INSPR, DTRB'],
  [/DSP\s*AR/i,'DSP AR'],
  [/DSP\s*DTC/i,'DSP DTC'],
  [/SPECIAL\s*BRANCH|\bSB\b/i,'SPECIAL BRANCH'],
  [/\bDCRB\b/i,'DCRB'],
  [/RI\s*MTO/i,'RI MTO'],
  [/RIAR\s*HG/i,'RIAR HGs'],
  [/RIAR\s*ADMIN/i,'RIAR ADMIN'],
  [/ADDL\s*SP\s*\(AR\)/i,'ADDL SP (AR)'],
  [/\bCCS\b/i,'CCS'],
  [/TRAFFIC/i,'TRAFFIC'],
  [/MAHILA|WOMEN/i,'MAHILA']
];

function cleanName(r){return name(r).toUpperCase().replace(/\./g,'').replace(/,/g,' ').replace(/\s+/g,' ').trim()}
function specialUnit(r){
  const u=unit(r);
  for(const [re,label] of SPECIAL_RULES) if(re.test(u)) return label;
  return null;
}
function isSubdivision(r){
  const n=cleanName(r);
  return SUBS.some(s=>s.match===n);
}
function subdivisionKey(r){
  const n=cleanName(r);
  const hit=SUBS.find(s=>s.match===n);
  return hit?hit.key:null;
}
function isOffice(r){
  if(cleanName(r)==='AR MAHESWARAN') return true;
  return OFFICE_ROLES.has(unit(r).toUpperCase());
}

function groups(records){
  const g={stations:new Map(),subdivisions:new Map(),office:new Map(),special:new Map()};

  for(const r of records){
    const n=cleanName(r);
    if(REMOVED.has(n)) continue;

    // Four SDPOs are always shown separately under Group 2.
    const sub=subdivisionKey(r);
    if(sub){
      if(!g.subdivisions.has(sub)) g.subdivisions.set(sub,[]);
      g.subdivisions.get(sub).push({...r,displayUnit:SUBS.find(s=>s.key===sub).label});
      continue;
    }

    // Nagari SDPO is not present in source data, so show the post explicitly
    // without inventing E-Office figures.
    if(n==='S CHANDRA SEKHAR') continue;

    if(n==='B HEMANTH') continue;

    const sp=specialUnit(r);
    if(sp){
      if(!g.special.has(sp)) g.special.set(sp,[]);
      g.special.get(sp).push(r);
      continue;
    }

    if(isOffice(r)){
      const role=unit(r).toUpperCase()==='SP CTR'?'SP CTR':unit(r).toUpperCase()==='ADDL SP (ADMIN)'?'ADDL SP (ADMIN)':unit(r).toUpperCase();
      if(!g.office.has(role)) g.office.set(role,[]);
      g.office.get(role).push(r);
      continue;
    }

    // Remaining named operational units are treated as individual police stations.
    const ps=unit(r);
    if(!g.stations.has(ps)) g.stations.set(ps,[]);
    g.stations.get(ps).push(r);
  }

  // Add Kuppam SDPO from source data, with the requested designation.
  const bh=records.find(r=>cleanName(r)==='B HEMANTH');
  g.subdivisions.set('Kuppam Sub-Division',[{...(bh||{}),name:'B. HEMANTH',employee:'B. HEMANTH',displayUnit:'ASST. SUPDT. OF POLICE – KUPPAM'}]);

  // Add Nagari SDPO as a post-only row; no source figures are fabricated.
  g.subdivisions.set('Nagari Sub-Division',[{manualSDPO:true,name:'S. CHANDRA SEKHAR',employee:'S. CHANDRA SEKHAR',displayUnit:'SDPO NAGARI'}]);

  return g;
}

function colour(v){return v>=80?'good':v>=50?'mid':'bad'}
function displayUnit(r){return r.displayUnit||unit(r)||'—'}

function chart(entries){
  const arr=[...entries.entries()].map(([k,rows])=>({k,rows,v:rows.length?rows.reduce((a,r)=>a+sc(r),0)/rows.length:0}));
  return `<div class="ap-chart"><div class="ap-bars">${arr.map(x=>`<div class="ap-bar-item"><b>${x.v.toFixed(1)}</b><div class="ap-bar ${colour(x.v)}" style="height:${Math.max(5,x.v)}%"></div><small title="${esc(x.k)}">${esc(x.k)}</small></div>`).join('')}</div></div>`;
}

function table(rows){
  const sorted=[...rows].sort((a,b)=>sc(b)-sc(a));
  return `<div class="ap-table-wrap"><table class="ap-table"><thead><tr>
    <th>Rank</th><th>Employee</th><th>Police Station / Designation</th><th>Opening</th><th>Created</th><th>Received</th><th>Closed</th><th>Forwarded</th><th>Disposed</th><th>Parked</th><th>Merged</th><th>0–7 Days</th><th>8–15 Days</th><th>16–30 Days</th><th>31–60 Days</th><th>&gt;60 Days</th><th>Total Pendency</th><th>Avg. Pending Days</th><th>Score</th>
  </tr></thead><tbody>${sorted.map((r,i)=>{
    if(r.manualSDPO) return `<tr class="manual-row"><td>${i+1}</td><td><b>${esc(name(r))}</b></td><td>${esc(displayUnit(r))}</td><td colspan="16">—</td></tr>`;
    return `<tr><td>${i+1}</td><td><b>${esc(name(r))}</b></td><td>${esc(displayUnit(r))}</td><td>${opening(r)}</td><td>${created(r)}</td><td>${received(r)}</td><td>${closed(r)}</td><td>${forwarded(r)}</td><td>${disposed(r)}</td><td>${parked(r)}</td><td>${merged(r)}</td><td>${num(r.p0_7??r.pendency_0_7_days)}</td><td>${num(r.p8_15??r.pendency_8_15_days)}</td><td>${num(r.p16_30??r.pendency_16_30_days)}</td><td>${num(r.p31_60??r.pendency_31_60_days)}</td><td>${num(r.p60??r.pendency_over_60_days)}</td><td>${pending(r)}</td><td>${pDays(r).toFixed(2)}</td><td class="${colour(sc(r))}"><b>${sc(r).toFixed(1)}</b></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function groupCard(type,title,subtitle,entries,leader){
  if(!entries.size) return '';
  return `<section class="ap-group ${type}">
    <div class="ap-head"><div><h2>${title}</h2><p>${subtitle} • ${entries.size} Units</p></div><div class="ap-leader"><span>LEADER / OFFICER</span><b>${esc(leader)}</b></div></div>
    <div class="ap-section-title">UNIT PERFORMANCE</div>${chart(entries)}
    <div class="ap-section-title">DETAILED E-OFFICE PERFORMANCE</div>${table([...entries.values()].flat())}
  </section>`;
}

function render(){
  if(typeof DATA==='undefined'||!DATA||!Array.isArray(DATA.records)||!DATA.records.length)return;
  const root=$('groupedEoffice'); if(!root)return;
  const g=groups(DATA.records);

  const subs=new Map(SUBS.map(s=>[s.key,g.subdivisions.get(s.key)||[]]));
  const office=new Map([...g.office.entries()].sort((a,b)=>a[0].localeCompare(b[0])));
  const specialG=new Map([...g.special.entries()].sort((a,b)=>a[0].localeCompare(b[0])));
  const stations=new Map([...g.stations.entries()].sort((a,b)=>a[0].localeCompare(b[0])));

  let html='';
  html+=groupCard('stations','GROUP 1: POLICE STATIONS','Each Police Station / Circle-wise E-Office Performance',stations,'Police Stations');
  html+=groupCard('subdivisions','GROUP 2: SUB-DIVISIONS','SDPO-wise E-Office Performance',subs,'4 SDPOs');
  html+=groupCard('office','GROUP 3: DPO / OFFICE STAFF','DPO / Office Staff-wise E-Office Performance',office,'DPO / Office Staff');
  html+=groupCard('special','GROUP 4: SPECIAL UNITS / WINGS','Special Units and Wings E-Office Performance',specialG,'Special Units / Wings');
  root.innerHTML=html;

  $('#oldCompositePanel')?.style.setProperty('display','none','important');
  document.querySelector('.organisation-wrapper .panel-head')?.style.setProperty('display','none','important');
  document.querySelector('.organisation-wrapper .toolbar')?.style.setProperty('display','none','important');
}

const style=document.createElement('style');
style.textContent=`
#oldCompositePanel,.organisation-wrapper>.panel-head,.organisation-wrapper>.toolbar,#groupSummaryTabs,#tableCount{display:none!important}
#groupedEoffice{padding:0!important;margin:0!important}
.ap-group{background:#fff;border:1px solid #dbe3ed;border-radius:16px;overflow:hidden;margin:24px 0;box-shadow:0 8px 22px rgba(20,50,90,.08)}
.ap-head{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 24px;color:#fff;background:linear-gradient(135deg,#173b67,#245c91)}
.ap-group.subdivisions .ap-head{background:linear-gradient(135deg,#56358a,#7951b3)}
.ap-group.office .ap-head{background:linear-gradient(135deg,#a85f13,#d28725)}
.ap-group.special .ap-head{background:linear-gradient(135deg,#176b55,#29906e)}
.ap-head h2{margin:0;font-size:24px}.ap-head p{margin:6px 0 0;font-size:13px;opacity:.9}
.ap-leader{background:rgba(255,255,255,.14);padding:10px 15px;border-radius:10px;text-align:right;min-width:260px}.ap-leader span{display:block;font-size:10px;opacity:.8;margin-bottom:4px}.ap-leader b{font-size:13px}
.ap-section-title{font-size:14px;font-weight:800;color:#26364a;padding:16px 20px 8px;letter-spacing:.4px}
.ap-chart{height:250px;margin:0 20px 14px;overflow-x:auto;border-bottom:2px solid #cbd5e1;background:repeating-linear-gradient(to top,#fff 0,#fff 49px,#e8edf3 50px)}
.ap-bars{height:235px;min-width:max-content;display:flex;align-items:flex-end;gap:14px;padding:8px 14px 0}.ap-bar-item{width:72px;height:225px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;position:relative}.ap-bar{width:44px;border-radius:7px 7px 0 0;min-height:6px}.ap-bar.good{background:#159447}.ap-bar.mid{background:#e6a21b}.ap-bar.bad{background:#d94141}.ap-bar-item>b{font-size:10px;margin-bottom:4px}.ap-bar-item small{width:90px;text-align:center;font-size:9px;font-weight:700;margin-top:7px;white-space:normal;line-height:1.15}
.ap-table-wrap{width:100%;overflow:auto;padding:0 20px 24px;box-sizing:border-box}.ap-table{border-collapse:collapse;min-width:1600px;width:100%;font-size:11px}.ap-table th{background:#24364b;color:#fff;padding:9px 7px;border:1px solid #526174;white-space:nowrap}.ap-table td{padding:8px 7px;border:1px solid #d8dee7;text-align:center;white-space:nowrap}.ap-table tbody tr:nth-child(even){background:#f7f9fb}.ap-table tbody tr:hover{background:#eef5ff}.ap-table .good{background:#d9f4df;color:#137333}.ap-table .mid{background:#fff0bd;color:#8a6500}.ap-table .bad{background:#ffdede;color:#b42323}.manual-row{background:#fffdf1!important}.manual-row td{color:#49566a}
@media(max-width:800px){.ap-head{flex-direction:column;align-items:flex-start}.ap-leader{width:100%;box-sizing:border-box;text-align:left;min-width:0}.ap-head h2{font-size:20px}}
`;
document.head.appendChild(style);
document.addEventListener('eoffice:data-ready',render);
let tries=0;const timer=setInterval(()=>{tries++;if(typeof DATA!=='undefined'&&DATA.records?.length){render();clearInterval(timer)}if(tries>100)clearInterval(timer)},100);
})();
