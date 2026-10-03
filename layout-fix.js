(function () {
  "use strict";

  // Final AP Smart Policing-style E-Office presentation.
  // Works with the existing script.js and data.json.

  const $ = id => document.getElementById(id);

  const SUBDIVISION_LEADERS = {
    "Chittoor Sub-Division": "J. VENKATANARAYANA",
    "Palamaner Sub-Division": "D. PRABHAKAR",
    "Kuppam Sub-Division": "B. HEMANTH, ASST. SUPDT. OF POLICE",
    "Nagari Sub-Division": "S. CHANDRA SEKHAR"
  };

  const SUBDIVISION_ORDER = [
    "Chittoor Sub-Division",
    "Palamaner Sub-Division",
    "Kuppam Sub-Division",
    "Nagari Sub-Division"
  ];

  const SPECIAL_PATTERNS = [
    [/DCRB/i, "DCRB"], [/CRIME RECORDS/i, "DCRB"], [/CCS/i, "CCS"],
    [/SPECIAL BRANCH/i, "SB"], [/\bSB\b/i, "SB"], [/DTC/i, "DTC"],
    [/DTRB/i, "DTRB"], [/PCR/i, "PCR"], [/TRAFFIC/i, "Traffic"],
    [/\bAR\b/i, "AR"], [/\bVR\b/i, "VR"], [/MAHILA|WOMEN/i, "Mahila"],
    [/CYBER/i, "Cyber"], [/HOME GUARD/i, "Home Guards"],
    [/COMMUNICATION/i, "Communication"], [/CONTROL ROOM/i, "PCR"]
  ];

  function s(v) {
    return String(v ?? "").replace(/\s+/g, " ").trim();
  }

  function norm(v) {
    return s(v).replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function stationOf(r) {
    return s(r.station || r.policeStation || r.psName || "");
  }

  function designationOf(r) {
    return s(r.designation || r.post || r.section || "");
  }

  // Prevent duplicate display such as:
  // "Chittoor Traffic UPS / Chittoor Traffic UPS"
  function displayUnit(r) {
    const station = stationOf(r);
    const designation = designationOf(r);

    if (!station && !designation) return "—";
    if (!station) return designation;
    if (!designation) return station;

    if (norm(station) === norm(designation)) return station;

    const dParts = designation.split(/\s*\/\s*/).map(norm).filter(Boolean);
    if (dParts.length && dParts.every(x => x === norm(station))) return station;

    return station + " / " + designation;
  }

  function raw(r) {
    return [
      r.name, r.designation, r.post, r.section, r.station, r.policeStation,
      r.psName, r.unit, r.office, r.subdivision, r.subDivision,
      r.category, r.group
    ].filter(Boolean).join(" ");
  }

  function subdivisionOf(r) {
    const x = raw(r).toLowerCase();
    if (!stationOf(r) && /\bchittoor\b/.test(x)) return "Chittoor Sub-Division";
    if (!stationOf(r) && /\bpalamaner(?:u)?\b/.test(x)) return "Palamaner Sub-Division";
    if (!stationOf(r) && /\bkuppam\b/.test(x)) return "Kuppam Sub-Division";
    if (!stationOf(r) && /\bnagari\b/.test(x)) return "Nagari Sub-Division";
    return null;
  }

  function specialOf(r) {
    const hit = SPECIAL_PATTERNS.find(([re]) => re.test(raw(r)));
    return hit ? hit[1] : null;
  }

  function isOffice(r) {
    const x = raw(r).toUpperCase();
    return [
      "DPO", "DISTRICT POLICE OFFICE", "AO", "ADMINISTRATIVE OFFICER",
      "SUPERINTENDENT", "ESTABLISHMENT", "MINISTERIAL", "OFFICE STAFF",
      "ACCOUNTS", "LEGAL CELL", "COURT MONITORING", "RECORD ROOM"
    ].some(v => x.includes(v));
  }

  function makeGroups(records) {
    const g = {
      stations: new Map(),
      subdivisions: new Map(),
      office: new Map(),
      special: new Map()
    };

    records.forEach(r => {
      const station = stationOf(r);
      const sub = subdivisionOf(r);
      const special = specialOf(r);

      let type, name;

      if (sub) {
        type = "subdivisions";
        name = sub;
      } else if (station) {
        type = "stations";
        name = station;
      } else if (special) {
        type = "special";
        name = special;
      } else if (isOffice(r)) {
        type = "office";
        name = "Office Staff / DPO";
      } else {
        type = "office";
        name = "Office Staff / DPO";
      }

      if (!g[type].has(name)) g[type].set(name, []);
      g[type].get(name).push(r);
    });

    return g;
  }

  function average(rows) {
    return rows.length ? rows.reduce((a, r) => a + score(r), 0) / rows.length : 0;
  }

  function chart(entries) {
    return `
      <div class="ap-group-chart">
        <div class="ap-chart-scale">
          <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
        </div>
        <div class="ap-chart-area">
          ${entries.map(([name, rows]) => {
            const value = average(rows);
            return `
              <div class="ap-bar-wrap">
                <div class="ap-bar" style="height:${Math.max(6, Math.min(100, value))}%">
                  <b>${value.toFixed(1)}</b>
                </div>
                <small title="${esc(name)}">${esc(name)}</small>
              </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  function combinedTable(rows) {
    const sorted = [...rows].sort((a, b) => score(b) - score(a));

    return `
      <div class="table-wrap ap-combined-table">
        <table>
          <thead>
            <tr>
              <th>Rank</th><th>Employee</th><th>Police Station / Designation</th>
              <th>Opening</th><th>Created</th><th>Received</th>
              <th>Closed</th><th>Forwarded</th><th>Disposed</th>
              <th>Parked</th><th>Merged</th><th>0–7 Days</th>
              <th>8–15 Days</th><th>16–30 Days</th><th>31–60 Days</th>
              <th>&gt;60 Days</th><th>Total Pendency</th>
              <th>Avg. Pending Days</th><th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${esc(r.name)}</td>
                <td>${esc(displayUnit(r))}</td>
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
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function renderFinalGroups() {
    if (typeof DATA === "undefined" || !Array.isArray(DATA.records) || !DATA.records.length) return;

    const g = makeGroups(DATA.records);

    const definitions = [
      ["stations", "🚔", "GROUP 1: POLICE STATIONS", "Police Station-wise E-Office Performance"],
      ["subdivisions", "🏛️", "GROUP 2: SUB-DIVISIONS", "Sub-Division-wise E-Office Performance"],
      ["office", "🗂️", "GROUP 3: OFFICE STAFF", "Office Staff / DPO E-Office Performance"],
      ["special", "⭐", "GROUP 4: SPECIAL UNITS / WINGS", "Special Units and Wings E-Office Performance"]
    ];

    let html = "";

    definitions.forEach(([type, icon, title, subtitle], index) => {
      let entries = [...g[type].entries()];

      if (type === "subdivisions") {
        entries.sort((a, b) =>
          SUBDIVISION_ORDER.indexOf(a[0]) - SUBDIVISION_ORDER.indexOf(b[0])
        );
      } else {
        entries.sort((a, b) => a[0].localeCompare(b[0]));
      }

      if (!entries.length) return;

      let leader = "—";

      if (type === "subdivisions") {
        // Fixed SDPO names requested for the four sub-divisions.
        const first = entries[0][0];
        leader = SUBDIVISION_LEADERS[first] || "—";
      } else {
        const best = [...entries.flatMap(x => x[1])]
          .sort((a, b) => score(b) - score(a))[0];
        if (best) leader = `${s(best.name)} (${score(best).toFixed(1)})`;
      }

      const allRows = entries.flatMap(x => x[1]);

      html += `
        <section class="ap-group-section group-${index + 1}">
          <div class="ap-group-head">
            <div>
              <h2>${icon} ${title}</h2>
              <p>${entries.length} Units • ${subtitle}</p>
            </div>
            <div class="ap-leader">Leader: ${esc(leader)}</div>
          </div>
          ${chart(entries)}
          ${combinedTable(allRows)}
        </section>`;
    });

    $("groupedEoffice").innerHTML = html;
  }

  function addStyles() {
    if ($("ap-final-eoffice-style")) return;

    const style = document.createElement("style");
    style.id = "ap-final-eoffice-style";
    style.textContent = `
      /* Remove the old Composite Score panel and its large blank gap. */
      #rankings .chart-panel {
        display: none !important;
      }

      #groupedEoffice {
        margin-top: 0 !important;
      }

      .ap-group-section {
        background:#fff;
        border:1px solid #dce4ef;
        border-top:4px solid #2457c5;
        border-radius:14px;
        margin:0 0 18px !important;
        overflow:hidden;
        box-shadow:0 3px 12px rgba(30,60,100,.08);
      }

      .ap-group-section.group-2 { border-top-color:#6941c6; }
      .ap-group-section.group-3 { border-top-color:#e58a16; }
      .ap-group-section.group-4 { border-top-color:#159b70; }

      .ap-group-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:18px;
        padding:16px 18px 10px;
      }

      .ap-group-head h2 {
        margin:0;
        color:#17396e;
        font-size:20px;
        font-weight:800;
      }

      .ap-group-head p {
        margin:5px 0 0;
        color:#70809a;
        font-size:13px;
      }

      .ap-leader {
        background:#edf4ff;
        color:#2151a5;
        border-radius:8px;
        padding:9px 12px;
        font-size:12px;
        font-weight:800;
        white-space:nowrap;
      }

      .ap-group-chart {
        position:relative;
        height:235px;
        margin:0 14px;
        border-top:1px solid #e5ebf3;
        border-bottom:1px solid #e5ebf3;
        padding:10px 8px 40px;
        overflow:hidden;
      }

      .ap-chart-scale {
        position:absolute;
        left:0;
        top:10px;
        bottom:40px;
        width:30px;
        display:flex;
        flex-direction:column;
        justify-content:space-between;
        color:#70809a;
        font-size:10px;
        text-align:right;
      }

      .ap-chart-area {
        position:absolute;
        left:40px;
        right:2px;
        top:10px;
        bottom:40px;
        display:flex;
        align-items:flex-end;
        gap:8px;
        overflow-x:auto;
        overflow-y:hidden;
        border-bottom:1px solid #cfd8e5;
      }

      .ap-bar-wrap {
        height:100%;
        min-width:56px;
        display:flex;
        flex-direction:column;
        justify-content:flex-end;
        align-items:center;
        position:relative;
      }

      .ap-bar {
        width:42px;
        min-height:6px;
        background:#39aee0;
        border-radius:4px 4px 0 0;
        position:relative;
      }

      .ap-bar-wrap:nth-child(4n+1) .ap-bar { background:#16b77e; }
      .ap-bar-wrap:nth-child(4n+2) .ap-bar { background:#39aee0; }
      .ap-bar-wrap:nth-child(4n+3) .ap-bar { background:#39aee0; }
      .ap-bar-wrap:nth-child(4n) .ap-bar { background:#f5b820; }

      .ap-bar b {
        position:absolute;
        top:-18px;
        left:50%;
        transform:translateX(-50%);
        font-size:9px;
        color:#263b5e;
        white-space:nowrap;
      }

      .ap-bar-wrap small {
        position:absolute;
        bottom:-34px;
        width:72px;
        text-align:center;
        font-size:8px;
        color:#52627b;
        transform:rotate(-35deg);
        transform-origin:top center;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .ap-combined-table {
        margin:0 !important;
        overflow:auto;
      }

      .ap-combined-table table {
        min-width:1450px;
      }

      .ap-combined-table thead th {
        background:#102e5b;
        color:#fff;
        font-size:11px;
        padding:10px 7px;
        white-space:nowrap;
      }

      .ap-combined-table tbody td {
        font-size:11px;
        padding:8px 7px;
        white-space:nowrap;
      }

      #groupSummaryTabs,
      #tableCount {
        display:none !important;
      }

      @media(max-width:800px) {
        .ap-group-head {
          flex-direction:column;
          align-items:flex-start;
        }

        .ap-leader {
          white-space:normal;
        }
      }
    `;
    document.head.appendChild(style);
  }

  addStyles();

  // script.js renders before this file is loaded, so re-render after data.json
  // becomes available. This is the key fix for the previous layout-fix.js.
  let tries = 0;
  const timer = setInterval(() => {
    tries++;

    try {
      if (typeof DATA !== "undefined" &&
          Array.isArray(DATA.records) &&
          DATA.records.length) {
        renderFinalGroups();
        clearInterval(timer);
      }
    } catch (e) {
      console.error("AP E-Office layout error:", e);
    }

    if (tries > 100) clearInterval(timer);
  }, 100);
})();
