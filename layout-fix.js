(function () {
  "use strict";

  /*
    FINAL E-OFFICE GROUPED LAYOUT
    This file runs after script.js.  IMPORTANT:
    DATA is a top-level `let` in script.js, so use DATA directly.
    Do NOT use window.DATA.
  */

  const byId = id => document.getElementById(id);
  const text = v => String(v ?? "").replace(/\s+/g, " ").trim();
  const esc2 = v => String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  const subdivisionOrder = [
    "Chittoor Sub-Division",
    "Palamaner Sub-Division",
    "Kuppam Sub-Division",
    "Nagari Sub-Division"
  ];

  const subdivisionLeaders = {
    "Chittoor Sub-Division": "J. VENKATANARAYANA",
    "Palamaner Sub-Division": "D. PRABHAKAR",
    "Kuppam Sub-Division": "B. HEMANTH, ASST. SUPDT. OF POLICE",
    "Nagari Sub-Division": "S. CHANDRA SEKHAR"
  };

  function station(r) {
    return text(r.station || r.policeStation || r.psName);
  }

  function designation(r) {
    return text(r.designation || r.post || r.section);
  }

  function unitLabel(r) {
    const a = station(r);
    const b = designation(r);
    if (!a) return b || "—";
    if (!b) return a;
    if (a.toLowerCase() === b.toLowerCase()) return a;
    return a + " / " + b;
  }

  function raw(r) {
    return [
      r.name,r.designation,r.post,r.section,r.station,r.policeStation,r.psName,
      r.unit,r.office,r.subdivision,r.subDivision,r.category,r.group
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function subdivision(r) {
    const x = raw(r);
    if (!station(r) && /\bchittoor\b/.test(x)) return "Chittoor Sub-Division";
    if (!station(r) && /\bpalamaner(?:u)?\b/.test(x)) return "Palamaner Sub-Division";
    if (!station(r) && /\bkuppam\b/.test(x)) return "Kuppam Sub-Division";
    if (!station(r) && /\bnagari\b/.test(x)) return "Nagari Sub-Division";
    return null;
  }

  const specialRules = [
    [/DCRB/i,"DCRB"],[/CRIME RECORDS/i,"DCRB"],[/CCS/i,"CCS"],
    [/SPECIAL BRANCH/i,"SB"],[/\bSB\b/i,"SB"],[/DTC/i,"DTC"],
    [/DTRB/i,"DTRB"],[/PCR/i,"PCR"],[/TRAFFIC/i,"Traffic"],
    [/\bAR\b/i,"AR"],[/\bVR\b/i,"VR"],[/MAHILA|WOMEN/i,"Mahila"],
    [/CYBER/i,"Cyber"],[/HOME GUARD/i,"Home Guards"],
    [/COMMUNICATION/i,"Communication"],[/CONTROL ROOM/i,"PCR"]
  ];

  function special(r) {
    const x = raw(r);
    const hit = specialRules.find(([re]) => re.test(x));
    return hit ? hit[1] : null;
  }

  function office(r) {
    const x = raw(r).toUpperCase();
    return [
      "DPO","DISTRICT POLICE OFFICE","ADMINISTRATIVE OFFICER",
      "SUPERINTENDENT","ESTABLISHMENT","MINISTERIAL","OFFICE STAFF",
      "ACCOUNTS","LEGAL CELL","COURT MONITORING","RECORD ROOM"
    ].some(k => x.includes(k));
  }

  // GROUP 2 must contain ONLY the four SDPO records.
  // Police Station records must remain in GROUP 1, and office/special-unit
  // records must remain in their existing groups.
  function isSDPORecord(r) {
    const n = text(r.name).toUpperCase().replace(/\s+/g," ").trim();
    const d = text(r.unit_designation || r.designation || r.post || r.section).toUpperCase();
    return (
      n === "J VENKATANARAYANA" && /SDPO\s*CHITTOOR/.test(d) ||
      n === "D.PRABHAKAR" && /SDPO\s*PALAMANER/.test(d) ||
      n === "B HEMANTH" && /ASST\.?\s*\.?(SP|SUPDT\.? OF POLICE)/.test(d)
    );
  }

  function subdivisionSDPORows(rows) {
    const out = new Map();

    const chittoor = rows.find(r =>
      text(r.name).toUpperCase() === "J VENKATANARAYANA" &&
      /SDPO\s*CHITTOOR/i.test(text(r.unit_designation))
    );
    const palamaner = rows.find(r =>
      text(r.name).toUpperCase() === "D.PRABHAKAR" &&
      /SDPO\s*PALAMANER/i.test(text(r.unit_designation))
    );
    const kuppam = rows.find(r =>
      text(r.name).toUpperCase() === "B HEMANTH" &&
      /ASST\.?\s*SP/i.test(text(r.unit_designation))
    );

    if (chittoor) out.set("Chittoor Sub-Division", [chittoor]);
    if (palamaner) out.set("Palamaner Sub-Division", [palamaner]);
    if (kuppam) out.set("Kuppam Sub-Division", [kuppam]);

    // Nagari SDPO is present in the Sub-Division dashboard as the officer
    // name, but there is no corresponding E-Office record in data.json.
    // Display the officer without inventing E-Office figures.
    out.set("Nagari Sub-Division", [{
      name: "S. CHANDRA SEKHAR",
      unit_designation: "SDPO NAGARI",
      opening_balance: 0, created: 0, received: 0,
      disposed_closed: 0, disposed_forwarded: 0, disposed_total: 0,
      parked: 0, merged: 0,
      pendency_0_7_days: 0, pendency_8_15_days: 0,
      pendency_16_30_days: 0, pendency_31_60_days: 0,
      pendency_over_60_days: 0, total_pendency: 0,
      average_pending_days: 0,
      __manualSDPO: true
    }]);

    return out;
  }

  function groups(rows) {
    const out = {
      stations:new Map(),
      subdivisions:subdivisionSDPORows(rows),
      office:new Map(),
      special:new Map()
    };

    rows.forEach(r => {
      // The three real SDPO records belong exclusively to GROUP 2.
      if (isSDPORecord(r)) return;

      let type, name;
      const st = station(r);
      const sp = special(r);

      // Police Stations remain in GROUP 1 exactly as before.
      if (st) {
        type = "stations"; name = st;
      } else if (sp) {
        type = "special"; name = sp;
      } else {
        type = "office";
        name = text(r.section || r.designation || r.post || r.unit || "Office Staff");
      }

      if (!out[type].has(name)) out[type].set(name, []);
      out[type].get(name).push(r);
    });

    return out;
  }

  function sc(r) {
    return typeof score === "function" ? Number(score(r)) || 0 : 0;
  }

  function num(v) {
    return Number(v) || 0;
  }

  function avg(rows) {
    return rows.length ? rows.reduce((a,r)=>a+sc(r),0)/rows.length : 0;
  }

  function colour(v) {
    return v >= 80 ? "good" : v >= 50 ? "mid" : "bad";
  }

  function table(rows) {
    const sorted = [...rows].sort((a,b)=>sc(b)-sc(a));
    return `
      <div class="table-wrap ap-final-table">
        <table>
          <thead><tr>
            <th>Rank</th><th>Employee</th><th>Police Station / Designation</th>
            <th>Opening</th><th>Created</th><th>Received</th><th>Closed</th>
            <th>Forwarded</th><th>Disposed</th><th>Parked</th><th>Merged</th>
            <th>0–7 Days</th><th>8–15 Days</th><th>16–30 Days</th>
            <th>31–60 Days</th><th>&gt;60 Days</th><th>Total Pendency</th>
            <th>Avg. Pending Days</th><th>Score</th>
          </tr></thead>
          <tbody>
            ${sorted.map((r,i)=>`
              <tr>
                <td>${i+1}</td>
                <td>${esc2(r.name)}</td>
                <td>${esc2(unitLabel(r))}</td>
                <td>${num(r.opening)}</td><td>${num(r.created)}</td><td>${num(r.received)}</td>
                <td>${num(r.disposedClosed)}</td><td>${num(r.disposedForwarded)}</td>
                <td>${num(r.disposed)}</td><td>${num(r.parked)}</td><td>${num(r.merged)}</td>
                <td>${num(r.p0_7)}</td><td>${num(r.p8_15)}</td><td>${num(r.p16_30)}</td>
                <td>${num(r.p31_60)}</td><td>${num(r.p60)}</td>
                <td>${num(r.pending)}</td><td>${num(r.pendingDays).toFixed(2)}</td>
                <td><b class="${colour(sc(r))}">${sc(r).toFixed(1)}</b></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function chart(entries) {
    return `
      <div class="ap-final-chart">
        <div class="ap-scale"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
        <div class="ap-bars">
          ${entries.map(([name,rows])=>{
            const v=avg(rows);
            return `<div class="ap-bar-item">
              <div class="ap-bar-value">${v.toFixed(1)}</div>
              <div class="ap-bar ${colour(v)}" style="height:${Math.max(5,v)}%"></div>
              <div class="ap-bar-name" title="${esc2(name)}">${esc2(name)}</div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  function render() {
    if (typeof DATA === "undefined" || !Array.isArray(DATA.records) || !DATA.records.length) return;

    const root = byId("groupedEoffice");
    if (!root) return;

    const g = groups(DATA.records);

    const defs = [
      ["stations","🚔","GROUP 1: POLICE STATIONS","Police Station-wise E-Office Performance"],
      ["subdivisions","🏛️","GROUP 2: SUB-DIVISIONS","Sub-Division-wise E-Office Performance"],
      ["office","🗂️","GROUP 3: OFFICE STAFF","Office Staff / DPO E-Office Performance"],
      ["special","⭐","GROUP 4: SPECIAL UNITS / WINGS","Special Units and Wings E-Office Performance"]
    ];

    let html = "";

    defs.forEach(([type,icon,title,subtitle],gi)=>{
      let entries=[...g[type].entries()];

      if(type==="subdivisions"){
        entries.sort((a,b)=>subdivisionOrder.indexOf(a[0])-subdivisionOrder.indexOf(b[0]));
      } else {
        entries.sort((a,b)=>a[0].localeCompare(b[0]));
      }

      if(!entries.length) return;

      const rows=entries.flatMap(x=>x[1]);

      let leader;
      if(type==="subdivisions"){
        // Group 2 is represented by the four fixed SDPO names.
        leader = "4 SDPOs";
      } else {
        const best=[...rows].sort((a,b)=>sc(b)-sc(a))[0];
        leader=best ? `${text(best.name)} (${sc(best).toFixed(1)})` : "—";
      }

      html += `
        <section class="ap-final-group ap-g${gi+1}">
          <div class="ap-final-head">
            <div>
              <h2>${icon} ${title}</h2>
              <p>${entries.length} Units • ${subtitle}</p>
            </div>
            <div class="ap-final-leader">Leader: ${esc2(leader)}</div>
          </div>
          ${chart(entries)}
          ${table(rows)}
        </section>`;
    });

    root.innerHTML=html;
  }

  const style=document.createElement("style");
  style.id="ap-final-eoffice-style";
  style.textContent=`
    /* Remove the unwanted old composite chart and organisation wrapper elements. */
    #rankings > .chart-panel { display:none !important; }
    #groupSummaryTabs, #tableCount { display:none !important; }
    #groupedEoffice { margin-top:0 !important; }

    .ap-final-group{
      background:#fff;
      border:1px solid #dce4ef;
      border-top:4px solid #2457c5;
      border-radius:14px;
      margin:0 0 20px;
      overflow:hidden;
      box-shadow:0 3px 12px rgba(30,60,100,.08);
    }
    .ap-g2{border-top-color:#6941c6}
    .ap-g3{border-top-color:#e58a16}
    .ap-g4{border-top-color:#159b70}

    .ap-final-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:18px;
      padding:16px 18px 12px;
    }
    .ap-final-head h2{
      margin:0;color:#17396e;font-size:20px;font-weight:800;
    }
    .ap-final-head p{
      margin:5px 0 0;color:#70809a;font-size:13px;
    }
    .ap-final-leader{
      background:#edf4ff;color:#2151a5;border-radius:8px;
      padding:9px 12px;font-size:12px;font-weight:800;white-space:nowrap;
    }

    .ap-final-chart{
      height:245px;margin:0 14px;
      border-top:1px solid #e5ebf3;border-bottom:1px solid #e5ebf3;
      position:relative;overflow:hidden;padding:10px 0 42px;
    }
    .ap-scale{
      position:absolute;left:0;top:10px;bottom:42px;width:30px;
      display:flex;flex-direction:column;justify-content:space-between;
      color:#70809a;font-size:10px;text-align:right;
    }
    .ap-bars{
      position:absolute;left:40px;right:0;top:10px;bottom:42px;
      display:flex;align-items:flex-end;gap:8px;
      overflow-x:auto;border-bottom:1px solid #cfd8e5;
    }
    .ap-bar-item{
      min-width:58px;height:100%;position:relative;
      display:flex;align-items:center;flex-direction:column;justify-content:flex-end;
    }
    .ap-bar{
      width:42px;min-height:5px;border-radius:4px 4px 0 0;
    }
    .ap-bar.good{background:#16b77e}
    .ap-bar.mid{background:#f5b820}
    .ap-bar.bad{background:#e76b63}
    .ap-bar-value{
      font-size:9px;font-weight:800;color:#263b5e;margin-bottom:2px;
    }
    .ap-bar-name{
      position:absolute;bottom:-36px;width:72px;
      text-align:center;font-size:8px;color:#52627b;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      transform:rotate(-35deg);transform-origin:top center;
    }

    .ap-final-table{margin:0!important;overflow:auto}
    .ap-final-table table{min-width:1450px}
    .ap-final-table thead th{
      background:#102e5b;color:#fff;font-size:11px;
      padding:10px 7px;white-space:nowrap;
    }
    .ap-final-table tbody td{
      font-size:11px;padding:8px 7px;white-space:nowrap;
    }
    .ap-final-table b.good{color:#0b9f6a}
    .ap-final-table b.mid{color:#d48a00}
    .ap-final-table b.bad{color:#d94d43}

    @media(max-width:800px){
      .ap-final-head{flex-direction:column;align-items:flex-start}
      .ap-final-leader{white-space:normal}
    }
  `;
  document.head.appendChild(style);

  // script.js finishes asynchronously. DATA is shared as a global lexical binding,
  // so wait until the original loader has populated it.
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    try{
      if(typeof DATA!=="undefined" && Array.isArray(DATA.records) && DATA.records.length){
        render();
        clearInterval(timer);
      }
    }catch(e){
      console.error("Final E-Office layout:",e);
    }
    if(attempts>150) clearInterval(timer);
  },100);

})();
