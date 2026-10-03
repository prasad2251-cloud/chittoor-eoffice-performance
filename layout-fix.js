
(function(){
  // Final AP Smart Policing-style E-Office layout.
  // This file intentionally overrides only the grouped E-Office presentation.

  const oldRender = window.renderGroupedEoffice;

  function unitNameForOffice(r){
    const s = String(r.section || r.unit || r.office || "").trim();
    const d = String(r.designation || r.post || "").trim();
    // Prefer an explicit office/section name; otherwise use designation.
    if (s) return s.replace(/\s+/g," ");
    if (d) return d.replace(/\s+/g," ");
    return "Office Staff";
  }

  function makeGroups(records){
    const g = {
      stations:new Map(),
      subdivisions:new Map(),
      office:new Map(),
      special:new Map()
    };

    records.forEach(r=>{
      let org;
      const station = typeof stationFromRecord === "function" ? stationFromRecord(r) : String(r.station||"").trim();
      const raw = [
        r.name,r.designation,r.post,r.section,r.station,r.policeStation,r.psName,
        r.unit,r.office,r.subdivision,r.subDivision,r.category,r.group
      ].filter(Boolean).join(" ").toLowerCase();

      if(/\bchittoor\b/.test(raw) && !station) org={type:"subdivisions",name:"Chittoor Sub-Division"};
      else if(/\bpalamaner(?:u)?\b/.test(raw) && !station) org={type:"subdivisions",name:"Palamaner Sub-Division"};
      else if(/\bkuppam\b/.test(raw) && !station) org={type:"subdivisions",name:"Kuppam Sub-Division"};
      else if(/\bnagari\b/.test(raw) && !station) org={type:"subdivisions",name:"Nagari Sub-Division"};
      else if(station) org={type:"stations",name:station};
      else {
        const special = [
          [/DCRB/i,"DCRB"],[/CRIME RECORDS/i,"DCRB"],[/CCS/i,"CCS"],
          [/SPECIAL BRANCH/i,"SB"],[/\bSB\b/i,"SB"],[/DTC/i,"DTC"],
          [/DTRB/i,"DTRB"],[/PCR/i,"PCR"],[/TRAFFIC/i,"Traffic"],
          [/\bAR\b/i,"AR"],[/\bVR\b/i,"VR"],[/MAHILA|WOMEN/i,"Mahila"],
          [/CYBER/i,"Cyber"],[/HOME GUARD/i,"Home Guards"],
          [/COMMUNICATION/i,"Communication"],[/CONTROL ROOM/i,"PCR"]
        ];
        const hit=special.find(x=>x[0].test(raw));
        if(hit) org={type:"special",name:hit[1]};
        else org={type:"office",name:unitNameForOffice(r)};
      }

      if(!g[org.type].has(org.name)) g[org.type].set(org.name,[]);
      g[org.type].get(org.name).push(r);
    });
    return g;
  }

  function unitAverage(rows){
    return rows.length ? rows.reduce((a,r)=>a+score(r),0)/rows.length : 0;
  }

  function groupLeader(rows){
    return [...rows].sort((a,b)=>score(b)-score(a))[0];
  }

  function unitChart(entries){
    const sorted = entries.map(([name,rows])=>({
      name, rows, value:unitAverage(rows)
    }));
    const max=Math.max(...sorted.map(x=>x.value),1);
    return `<div class="ap-group-chart">
      <div class="ap-chart-grid">
        <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
      </div>
      <div class="ap-bars">
        ${sorted.map(x=>`
          <div class="ap-bar-wrap">
            <div class="ap-bar" style="height:${Math.max(8,x.value/max*100)}%">
              <b>${x.value.toFixed(1)}</b>
            </div>
            <small title="${esc(x.name)}">${esc(x.name)}</small>
          </div>`).join("")}
      </div>
    </div>`;
  }

  function combinedTable(rows){
    const sorted=[...rows].sort((a,b)=>score(b)-score(a));
    return `<div class="table-wrap ap-combined-table">
      <table>
        <thead><tr>
          <th>Rank</th><th>Employee</th><th>Police Station / Designation</th>
          <th>Opening</th><th>Created</th><th>Received</th><th>Closed</th>
          <th>Forwarded</th><th>Disposed</th><th>Parked</th><th>Merged</th>
          <th>0–7 Days</th><th>8–15 Days</th><th>16–30 Days</th>
          <th>31–60 Days</th><th>&gt;60 Days</th><th>Total Pendency</th>
          <th>Avg. Pending Days</th><th>Score</th>
        </tr></thead>
        <tbody>${sorted.map((r,i)=>colouredFullRow(r,i)).join("")}</tbody>
      </table>
    </div>`;
  }

  function renderFinalGroups(){
    const records = DATA.records || [];
    const groups = makeGroups(records);

    const order = [
      ["stations","🚔","GROUP 1: POLICE STATIONS","Police Station-wise E-Office Performance"],
      ["subdivisions","🏛️","GROUP 2: SUB-DIVISIONS","Sub-Division-wise E-Office Performance"],
      ["office","🗂️","GROUP 3: OFFICE STAFF","Office Staff / DPO E-Office Performance"],
      ["special","⭐","GROUP 4: SPECIAL UNITS / WINGS","Special Units and Wings E-Office Performance"]
    ];

    // Fixed subdivision order requested by the user.
    const subdivisionOrder = [
      "Chittoor Sub-Division",
      "Palamaner Sub-Division",
      "Kuppam Sub-Division",
      "Nagari Sub-Division"
    ];

    let html="";
    order.forEach(([type,icon,title,subtitle])=>{
      let entries=[...groups[type].entries()];

      if(type==="subdivisions"){
        entries.sort((a,b)=>subdivisionOrder.indexOf(a[0])-subdivisionOrder.indexOf(b[0]));
      }else{
        entries.sort((a,b)=>a[0].localeCompare(b[0]));
      }

      if(!entries.length) return;

      const allRows=entries.flatMap(x=>x[1]);
      const leader=groupLeader(allRows);
      const avg=unitAverage(allRows);

      html += `
      <section class="ap-group-section">
        <div class="ap-group-head">
          <div>
            <h2>${icon} ${title}</h2>
            <p>${entries.length} Units • ${subtitle}</p>
          </div>
          <div class="ap-leader">Leader: ${esc(leader?.name || "—")} (${leader ? score(leader).toFixed(1) : "0.0"})</div>
        </div>
        ${unitChart(entries)}
        ${combinedTable(allRows)}
      </section>`;
    });

    $("groupedEoffice").innerHTML=html;
  }

  // Replace the original grouped renderer.
  window.renderGroupedEoffice = renderFinalGroups;

  // Hide the old wrapper remnants completely.
  const hideOld = ()=>{
    const el=$("groupSummaryTabs");
    if(el) el.style.display="none";
    const tc=$("tableCount");
    if(tc) tc.style.display="none";
  };

  const style=document.createElement("style");
  style.textContent=`
    #groupedEoffice{margin-top:20px}
    .ap-group-section{
      background:#fff;border:1px solid #dce4ef;border-top:4px solid #2457c5;
      border-radius:14px;margin:0 0 22px;overflow:hidden;
      box-shadow:0 3px 12px rgba(30,60,100,.08)
    }
    .ap-group-section:nth-child(2){border-top-color:#6941c6}
    .ap-group-section:nth-child(3){border-top-color:#e58a16}
    .ap-group-section:nth-child(4){border-top-color:#159b70}
    .ap-group-head{
      display:flex;justify-content:space-between;align-items:center;gap:18px;
      padding:18px 18px 12px
    }
    .ap-group-head h2{margin:0;color:#17396e;font-size:20px}
    .ap-group-head p{margin:5px 0 0;color:#70809a;font-size:13px}
    .ap-leader{
      background:#edf4ff;color:#2151a5;border-radius:8px;
      padding:9px 12px;font-size:12px;font-weight:800;white-space:nowrap
    }
    .ap-group-chart{
      position:relative;height:290px;margin:0 14px;
      border-top:1px solid #e5ebf3;border-bottom:1px solid #e5ebf3;
      padding:14px 10px 42px
    }
    .ap-chart-grid{
      position:absolute;left:0;top:14px;bottom:42px;width:34px;
      display:flex;flex-direction:column;justify-content:space-between;
      color:#70809a;font-size:10px;text-align:right
    }
    .ap-bars{
      position:absolute;left:45px;right:5px;top:14px;bottom:42px;
      display:flex;align-items:flex-end;gap:7px;overflow-x:auto;
      border-bottom:1px solid #cfd8e5
    }
    .ap-bar-wrap{
      height:100%;min-width:58px;display:flex;flex-direction:column;
      justify-content:flex-end;align-items:center
    }
    .ap-bar{
      width:46px;min-height:8px;background:#39aee0;border-radius:4px 4px 0 0;
      position:relative
    }
    .ap-bar-wrap:nth-child(4n+1) .ap-bar{background:#16b77e}
    .ap-bar-wrap:nth-child(4n+2) .ap-bar{background:#39aee0}
    .ap-bar-wrap:nth-child(4n+3) .ap-bar{background:#39aee0}
    .ap-bar-wrap:nth-child(4n) .ap-bar{background:#f5b820}
    .ap-bar b{
      position:absolute;top:-19px;left:50%;transform:translateX(-50%);
      font-size:10px;color:#263b5e;white-space:nowrap
    }
    .ap-bar-wrap small{
      position:absolute;bottom:-37px;width:75px;text-align:center;
      font-size:9px;color:#52627b;transform:rotate(-35deg);
      transform-origin:top center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis
    }
    .ap-combined-table{margin:0;overflow:auto}
    .ap-combined-table table{min-width:1450px}
    .ap-combined-table thead th{
      background:#102e5b;color:#fff;font-size:11px;padding:10px 7px;white-space:nowrap
    }
    .ap-combined-table tbody td{font-size:11px;padding:8px 7px;white-space:nowrap}
    @media(max-width:800px){
      .ap-group-head{flex-direction:column;align-items:flex-start}
      .ap-leader{white-space:normal}
    }
  `;
  document.head.appendChild(style);

  // The original loadData() is asynchronous. Re-render after it finishes.
  const timer=setInterval(()=>{
    if(window.DATA && Array.isArray(DATA.records) && DATA.records.length){
      renderFinalGroups();
      hideOld();
      clearInterval(timer);
    }
  },100);

  hideOld();
})();
