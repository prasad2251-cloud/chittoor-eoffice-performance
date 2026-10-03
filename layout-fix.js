(function () {
  "use strict";

  /*
    CHITTOOR POLICE
    FINAL E-OFFICE GROUPED LAYOUT

    This file runs after script.js.
    DATA is a top-level let in script.js.
    Therefore use DATA directly.
  */

  const byId = id => document.getElementById(id);

  const text = v =>
    String(v ?? "")
      .replace(/\s+/g, " ")
      .trim();

  const esc = v =>
    String(v ?? "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));

  /* -------------------------------------------------------
     SUB-DIVISION ORDER
  ------------------------------------------------------- */

  const subdivisionOrder = [
    "Chittoor Sub-Division",
    "Palamaner Sub-Division",
    "Kuppam Sub-Division",
    "Nagari Sub-Division"
  ];

  const subdivisionLeaders = {
    "Chittoor Sub-Division": "J. VENKATANARAYANA",
    "Palamaner Sub-Division": "D. PRABHAKAR",
    "Kuppam Sub-Division":
      "B. HEMANTH, ASST. SUPDT. OF POLICE",
    "Nagari Sub-Division": "S. CHANDRA SEKHAR"
  };

  /* -------------------------------------------------------
     FIELD HELPERS
  ------------------------------------------------------- */

  function station(r) {
    return text(
      r.station ||
      r.policeStation ||
      r.psName ||
      r.PSName ||
      r.ps
    );
  }

  function designation(r) {
    return text(
      r.designation ||
      r.post ||
      r.section
    );
  }

  function unitLabel(r) {
    const a = station(r);
    const b = designation(r);

    if (!a && !b) return "—";
    if (!a) return b;
    if (!b) return a;

    /* Prevent:
       Chittoor Traffic UPS / Chittoor Traffic UPS
    */
    if (a.toLowerCase() === b.toLowerCase()) {
      return a;
    }

    return a + " / " + b;
  }

  function raw(r) {
    return [
      r.name,
      r.designation,
      r.post,
      r.section,
      r.station,
      r.policeStation,
      r.psName,
      r.PSName,
      r.unit,
      r.office,
      r.subdivision,
      r.subDivision,
      r.category,
      r.group
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  /* -------------------------------------------------------
     SUB-DIVISION DETECTION
  ------------------------------------------------------- */

  function subdivision(r) {
    const x = raw(r);

    if (!station(r) && /\bchittoor\b/.test(x)) {
      return "Chittoor Sub-Division";
    }

    if (!station(r) && /\bpalamaner(?:u)?\b/.test(x)) {
      return "Palamaner Sub-Division";
    }

    if (!station(r) && /\bkuppam\b/.test(x)) {
      return "Kuppam Sub-Division";
    }

    if (!station(r) && /\bnagari\b/.test(x)) {
      return "Nagari Sub-Division";
    }

    return null;
  }

  /* -------------------------------------------------------
     SPECIAL UNITS / WINGS
  ------------------------------------------------------- */

  const specialRules = [
    [/DCRB/i, "DCRB"],
    [/CRIME RECORDS/i, "DCRB"],
    [/CCS/i, "CCS"],
    [/SPECIAL BRANCH/i, "SB"],
    [/\bSB\b/i, "SB"],
    [/DTC/i, "DTC"],
    [/DTRB/i, "DTRB"],
    [/PCR/i, "PCR"],
    [/TRAFFIC/i, "Traffic"],
    [/\bAR\b/i, "AR"],
    [/\bVR\b/i, "VR"],
    [/MAHILA|WOMEN/i, "Mahila"],
    [/CYBER/i, "Cyber"],
    [/HOME GUARD/i, "Home Guards"],
    [/COMMUNICATION/i, "Communication"],
    [/CONTROL ROOM/i, "PCR"]
  ];

  function special(r) {
    const x = raw(r);

    const hit = specialRules.find(([re]) => re.test(x));

    return hit ? hit[1] : null;
  }

  /* -------------------------------------------------------
     OFFICE STAFF
  ------------------------------------------------------- */

  function isOfficeStaff(r) {
    const x = raw(r).toUpperCase();

    return [
      "DPO",
      "DISTRICT POLICE OFFICE",
      "ADMINISTRATIVE OFFICER",
      "SUPERINTENDENT",
      "ESTABLISHMENT",
      "MINISTERIAL",
      "OFFICE STAFF",
      "ACCOUNTS",
      "LEGAL CELL",
      "COURT MONITORING",
      "RECORD ROOM"
    ].some(k => x.includes(k));
  }

  /* -------------------------------------------------------
     GROUP RECORDS
  ------------------------------------------------------- */

  function makeGroups(rows) {

    const result = {
      stations: new Map(),
      subdivisions: new Map(),
      office: new Map(),
      special: new Map()
    };

    rows.forEach(r => {

      const sub = subdivision(r);
      const st = station(r);
      const sp = special(r);

      let type;
      let name;

      if (sub) {

        type = "subdivisions";
        name = sub;

      } else if (st) {

        type = "stations";
        name = st;

      } else if (sp) {

        type = "special";
        name = sp;

      } else if (isOfficeStaff(r)) {

        type = "office";
        name =
          text(
            r.section ||
            r.designation ||
            r.post ||
            r.unit
          ) || "Office Staff";

      } else {

        type = "office";
        name = "Office Staff";

      }

      if (!result[type].has(name)) {
        result[type].set(name, []);
      }

      result[type].get(name).push(r);
    });

    return result;
  }

  /* -------------------------------------------------------
     SCORE
  ------------------------------------------------------- */

  function getScore(r) {
    return typeof score === "function"
      ? Number(score(r)) || 0
      : 0;
  }

  function number(v) {
    return Number(v) || 0;
  }

  function average(rows) {

    if (!rows.length) return 0;

    return rows.reduce(
      (total, r) => total + getScore(r),
      0
    ) / rows.length;
  }

  function scoreClass(v) {

    if (v >= 80) return "good";
    if (v >= 50) return "mid";

    return "bad";
  }

  /* -------------------------------------------------------
     CHART
  ------------------------------------------------------- */

  function makeChart(entries) {

    return `
      <div class="final-chart">

        <div class="chart-scale">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>

        <div class="chart-bars">

          ${entries.map(([name, rows]) => {

            const value = average(rows);

            return `
              <div class="bar-item">

                <div class="bar-value">
                  ${value.toFixed(1)}
                </div>

                <div
                  class="bar ${scoreClass(value)}"
                  style="height:${Math.max(5, value)}%"
                ></div>

                <div
                  class="bar-name"
                  title="${esc(name)}"
                >
                  ${esc(name)}
                </div>

              </div>
            `;

          }).join("")}

        </div>

      </div>
    `;
  }

  /* -------------------------------------------------------
     COMBINED TABLE
  ------------------------------------------------------- */

  function makeTable(rows) {

    const sorted = [...rows].sort(
      (a, b) => getScore(b) - getScore(a)
    );

    return `
      <div class="final-table-wrap">

        <table class="final-table">

          <thead>
            <tr>

              <th>Rank</th>
              <th>Employee</th>
              <th>Police Station / Designation</th>

              <th>Opening</th>
              <th>Created</th>
              <th>Received</th>
              <th>Closed</th>
              <th>Forwarded</th>
              <th>Disposed</th>
              <th>Parked</th>
              <th>Merged</th>

              <th>0–7 Days</th>
              <th>8–15 Days</th>
              <th>16–30 Days</th>
              <th>31–60 Days</th>
              <th>&gt;60 Days</th>

              <th>Total Pendency</th>
              <th>Avg. Pending Days</th>
              <th>Score</th>

            </tr>
          </thead>

          <tbody>

            ${sorted.map((r, i) => {

              const s = getScore(r);

              return `
                <tr>

                  <td>${i + 1}</td>

                  <td>
                    ${esc(r.name)}
                  </td>

                  <td>
                    ${esc(unitLabel(r))}
                  </td>

                  <td>${number(r.opening)}</td>
                  <td>${number(r.created)}</td>
                  <td>${number(r.received)}</td>
                  <td>${number(r.disposedClosed)}</td>
                  <td>${number(r.disposedForwarded)}</td>
                  <td>${number(r.disposed)}</td>
                  <td>${number(r.parked)}</td>
                  <td>${number(r.merged)}</td>

                  <td>${number(r.p0_7)}</td>
                  <td>${number(r.p8_15)}</td>
                  <td>${number(r.p16_30)}</td>
                  <td>${number(r.p31_60)}</td>
                  <td>${number(r.p60)}</td>

                  <td>${number(r.pending)}</td>

                  <td>
                    ${number(r.pendingDays).toFixed(2)}
                  </td>

                  <td>
                    <b class="${scoreClass(s)}">
                      ${s.toFixed(1)}
                    </b>
                  </td>

                </tr>
              `;

            }).join("")}

          </tbody>

        </table>

      </div>
    `;
  }

  /* -------------------------------------------------------
     GROUP 2 LEADERS
  ------------------------------------------------------- */

  function subdivisionLeaderHTML() {

    return `
      <div class="subdivision-leaders">

        <span>
          Chittoor: J. VENKATANARAYANA
        </span>

        <span>
          Palamaner: D. PRABHAKAR
        </span>

        <span>
          Kuppam: B. HEMANTH, ASST. SUPDT. OF POLICE
        </span>

        <span>
          Nagari: S. CHANDRA SEKHAR
        </span>

      </div>
    `;
  }

  /* -------------------------------------------------------
     RENDER FINAL DASHBOARD
  ------------------------------------------------------- */

  function renderFinal() {

    if (
      typeof DATA === "undefined" ||
      !Array.isArray(DATA.records) ||
      !DATA.records.length
    ) {
      return;
    }

    const root = byId("groupedEoffice");

    if (!root) return;

    const groups = makeGroups(DATA.records);

    const definitions = [

      [
        "stations",
        "🚔",
        "GROUP 1: POLICE STATIONS",
        "Police Station-wise E-Office Performance"
      ],

      [
        "subdivisions",
        "🏛️",
        "GROUP 2: SUB-DIVISIONS",
        "Sub-Division-wise E-Office Performance"
      ],

      [
        "office",
        "🗂️",
        "GROUP 3: OFFICE STAFF",
        "Office Staff / DPO E-Office Performance"
      ],

      [
        "special",
        "⭐",
        "GROUP 4: SPECIAL UNITS / WINGS",
        "Special Units and Wings E-Office Performance"
      ]

    ];

    let html = "";

    definitions.forEach(
      ([type, icon, title, subtitle], index) => {

        let entries =
          [...groups[type].entries()];

        /* Fixed order for Sub-Divisions */

        if (type === "subdivisions") {

          entries.sort(
            (a, b) =>
              subdivisionOrder.indexOf(a[0]) -
              subdivisionOrder.indexOf(b[0])
          );

        } else {

          entries.sort(
            (a, b) =>
              a[0].localeCompare(b[0])
          );

        }

        if (!entries.length) return;

        const rows =
          entries.flatMap(item => item[1]);

        html += `

          <section class="final-group group-${index + 1}">

            <div class="group-header">

              <div>

                <h2>
                  ${icon} ${title}
                </h2>

                <p>
                  ${entries.length} Units
                  &nbsp;•&nbsp;
                  ${subtitle}
                </p>

              </div>

              ${
                type === "subdivisions"
                  ? subdivisionLeaderHTML()
                  : ""
              }

            </div>

            ${makeChart(entries)}

            ${makeTable(rows)}

          </section>

        `;
      }
    );

    root.innerHTML = html;
  }

  /* -------------------------------------------------------
     REMOVE ALL OLD E-OFFICE PANELS
  ------------------------------------------------------- */

  function removeOldPanels() {

    /* Old Composite Score chart */

    const barChart = byId("barChart");

    if (barChart) {

      const oldPanel =
        barChart.closest(
          ".chart-panel, .panel"
        );

      if (oldPanel) {
        oldPanel.style.setProperty(
          "display",
          "none",
          "important"
        );
      }

    }

    /* Any old ranking chart panels */

    document
      .querySelectorAll(
        "#rankings .chart-panel"
      )
      .forEach(el => {

        el.style.setProperty(
          "display",
          "none",
          "important"
        );

      });

    /* Old summary controls */

    [
      "groupSummaryTabs",
      "tableCount"
    ].forEach(id => {

      const el = byId(id);

      if (el) {

        el.style.setProperty(
          "display",
          "none",
          "important"
        );

      }

    });

  }

  /* -------------------------------------------------------
     CSS
  ------------------------------------------------------- */

  const style =
    document.createElement("style");

  style.id =
    "chittoor-final-eoffice-style";

  style.textContent = `

    /* OLD PANELS */

    #rankings .chart-panel {
      display:none !important;
    }

    #groupSummaryTabs,
    #tableCount {
      display:none !important;
    }

    #groupedEoffice {
      margin-top:0 !important;
    }


    /* GROUP CARD */

    .final-group {

      background:#ffffff;

      border:1px solid #dce4ef;

      border-top:5px solid #2457c5;

      border-radius:14px;

      margin:0 0 22px;

      overflow:hidden;

      box-shadow:
        0 3px 14px
        rgba(30,60,100,.08);

    }

    .group-2 {
      border-top-color:#6941c6;
    }

    .group-3 {
      border-top-color:#e58a16;
    }

    .group-4 {
      border-top-color:#159b70;
    }


    /* HEADER */

    .group-header {

      display:flex;

      justify-content:space-between;

      align-items:center;

      gap:20px;

      padding:17px 20px 14px;

    }

    .group-header h2 {

      margin:0;

      color:#17396e;

      font-size:20px;

      font-weight:800;

    }

    .group-header p {

      margin:5px 0 0;

      color:#70809a;

      font-size:13px;

    }


    /* SUB DIVISION LEADERS */

    .subdivision-leaders {

      display:flex;

      flex-wrap:wrap;

      justify-content:flex-end;

      gap:6px;

      max-width:720px;

    }

    .subdivision-leaders span {

      background:#edf4ff;

      color:#2151a5;

      border-radius:7px;

      padding:7px 9px;

      font-size:11px;

      font-weight:800;

    }


    /* CHART */

    .final-chart {

      height:255px;

      margin:0 14px;

      border-top:1px solid #e5ebf3;

      border-bottom:1px solid #e5ebf3;

      position:relative;

      overflow:hidden;

      padding:10px 0 45px;

    }

    .chart-scale {

      position:absolute;

      left:0;

      top:10px;

      bottom:45px;

      width:30px;

      display:flex;

      flex-direction:column;

      justify-content:space-between;

      color:#70809a;

      font-size:10px;

      text-align:right;

    }

    .chart-bars {

      position:absolute;

      left:40px;

      right:0;

      top:10px;

      bottom:45px;

      display:flex;

      align-items:flex-end;

      gap:9px;

      overflow-x:auto;

      border-bottom:1px solid #cfd8e5;

    }

    .bar-item {

      min-width:62px;

      height:100%;

      position:relative;

      display:flex;

      align-items:center;

      flex-direction:column;

      justify-content:flex-end;

    }

    .bar {

      width:42px;

      min-height:5px;

      border-radius:4px 4px 0 0;

    }

    .bar.good {

      background:#16b77e;

    }

    .bar.mid {

      background:#f5b820;

    }

    .bar.bad {

      background:#e76b63;

    }

    .bar-value {

      font-size:9px;

      font-weight:800;

      color:#263b5e;

      margin-bottom:2px;

    }

    .bar-name {

      position:absolute;

      bottom:-37px;

      width:80px;

      text-align:center;

      font-size:8px;

      color:#52627b;

      white-space:nowrap;

      overflow:hidden;

      text-overflow:ellipsis;

      transform:rotate(-35deg);

      transform-origin:top center;

    }


    /* TABLE */

    .final-table-wrap {

      width:100%;

      overflow:auto;

    }

    .final-table {

      width:100%;

      min-width:1450px;

      border-collapse:collapse;

    }

    .final-table thead th {

      background:#102e5b;

      color:#ffffff;

      font-size:11px;

      padding:10px 7px;

      white-space:nowrap;

      text-align:center;

    }

    .final-table tbody td {

      font-size:11px;

      padding:8px 7px;

      white-space:nowrap;

      text-align:center;

      border-bottom:1px solid #edf0f5;

    }

    .final-table tbody tr:hover {

      background:#f5f8fc;

    }

    .final-table b.good {

      color:#0b9f6a;

    }

    .final-table b.mid {

      color:#d48a00;

    }

    .final-table b.bad {

      color:#d94d43;

    }


    /* MOBILE */

    @media(max-width:800px) {

      .group-header {

        flex-direction:column;

        align-items:flex-start;

      }

      .subdivision-leaders {

        justify-content:flex-start;

      }

    }

  `;

  document.head.appendChild(style);


  /* -------------------------------------------------------
     START
  ------------------------------------------------------- */

  let attempts = 0;

  const timer =
    setInterval(() => {

      attempts++;

      try {

        if (
          typeof DATA !== "undefined" &&
          Array.isArray(DATA.records) &&
          DATA.records.length
        ) {

          removeOldPanels();

          renderFinal();

          /*
            Run once more after rendering to make absolutely
            sure the old Composite Score panel stays hidden.
          */

          setTimeout(removeOldPanels, 100);
          setTimeout(removeOldPanels, 500);

          clearInterval(timer);
        }

      } catch (error) {

        console.error(
          "Chittoor E-Office final layout:",
          error
        );

      }

      if (attempts > 150) {
        clearInterval(timer);
      }

    }, 100);

})();
