(function () {
  "use strict";

  /*
    CHITTOOR POLICE
    FINAL E-OFFICE LAYOUT

    IMPORTANT:
    DATA is declared as a top-level let in script.js.
    Therefore use DATA directly.
    Do NOT use window.DATA.
  */

  /* =====================================================
     HELPERS
  ===================================================== */

  const $ = id => document.getElementById(id);

  const txt = v =>
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

  function getStation(r) {
    return txt(
      r.station ||
      r.policeStation ||
      r.psName ||
      ""
    );
  }

  function getDesignation(r) {
    return txt(
      r.designation ||
      r.post ||
      r.section ||
      ""
    );
  }

  function getUnitName(r) {

    const station = getStation(r);
    const designation = getDesignation(r);

    if (!station && !designation) return "—";

    if (!station) return designation;

    if (!designation) return station;

    if (
      station.toLowerCase() ===
      designation.toLowerCase()
    ) {
      return station;
    }

    return station + " / " + designation;
  }

  function rawText(r) {

    return [
      r.name,
      r.designation,
      r.post,
      r.section,
      r.station,
      r.policeStation,
      r.psName,
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

  /* =====================================================
     SCORE
  ===================================================== */

  function getScore(r) {

    if (typeof score === "function") {
      return Number(score(r)) || 0;
    }

    return 0;
  }

  function average(rows) {

    if (!rows.length) return 0;

    return rows.reduce(
      (total, r) => total + getScore(r),
      0
    ) / rows.length;
  }

  function cls(v) {

    if (v >= 80) return "good";

    if (v >= 50) return "medium";

    return "poor";
  }

  function num(v) {

    return Number(v) || 0;
  }

  /* =====================================================
     SUB-DIVISIONS
  ===================================================== */

  const SUBDIVISION_ORDER = [
    "Chittoor Sub-Division",
    "Palamaner Sub-Division",
    "Kuppam Sub-Division",
    "Nagari Sub-Division"
  ];

  const SDPO = {

    "Chittoor Sub-Division":
      "J. VENKATANARAYANA",

    "Palamaner Sub-Division":
      "D. PRABHAKAR",

    "Kuppam Sub-Division":
      "B. HEMANTH, ASST. SUPDT. OF POLICE",

    "Nagari Sub-Division":
      "S. CHANDRA SEKHAR"

  };

  function findSubdivision(r) {

    const x = rawText(r);

    if (
      !getStation(r) &&
      /\bchittoor\b/i.test(x)
    ) {
      return "Chittoor Sub-Division";
    }

    if (
      !getStation(r) &&
      /\bpalamaner(?:u)?\b/i.test(x)
    ) {
      return "Palamaner Sub-Division";
    }

    if (
      !getStation(r) &&
      /\bkuppam\b/i.test(x)
    ) {
      return "Kuppam Sub-Division";
    }

    if (
      !getStation(r) &&
      /\bnagari\b/i.test(x)
    ) {
      return "Nagari Sub-Division";
    }

    return null;
  }

  /* =====================================================
     SPECIAL UNITS
  ===================================================== */

  const SPECIAL = [

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

  function findSpecial(r) {

    const x = rawText(r);

    const hit =
      SPECIAL.find(([regex]) =>
        regex.test(x)
      );

    return hit ? hit[1] : null;
  }

  /* =====================================================
     OFFICE STAFF
  ===================================================== */

  function isOffice(r) {

    const x = rawText(r).toUpperCase();

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

  /* =====================================================
     CREATE FOUR GROUPS
  ===================================================== */

  function makeGroups(records) {

    const groups = {

      stations: new Map(),

      subdivisions: new Map(),

      office: new Map(),

      special: new Map()

    };

    records.forEach(r => {

      const station =
        getStation(r);

      const sub =
        findSubdivision(r);

      const special =
        findSpecial(r);

      let type;
      let name;

      if (sub) {

        type = "subdivisions";
        name = sub;

      } else if (station) {

        type = "stations";
        name = station;

      } else if (special) {

        type = "special";
        name = special;

      } else {

        type = "office";

        name =
          txt(
            r.section ||
            r.designation ||
            r.post ||
            r.unit
          ) || "Office Staff";

      }

      if (!groups[type].has(name)) {

        groups[type].set(
          name,
          []
        );

      }

      groups[type]
        .get(name)
        .push(r);

    });

    return groups;
  }

  /* =====================================================
     CHART
  ===================================================== */

  function chart(entries) {

    return `
      <div class="final-chart">

        <div class="final-scale">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>

        <div class="final-bars">

          ${entries.map(
            ([name, rows]) => {

              const value =
                average(rows);

              return `

                <div class="final-bar-item">

                  <div class="final-value">
                    ${value.toFixed(1)}
                  </div>

                  <div
                    class="final-bar ${cls(value)}"
                    style="
                      height:${Math.max(
                        5,
                        value
                      )}%
                    "
                  ></div>

                  <div
                    class="final-bar-name"
                    title="${esc(name)}"
                  >
                    ${esc(name)}
                  </div>

                </div>

              `;

            }
          ).join("")}

        </div>

      </div>
    `;
  }

  /* =====================================================
     COMBINED TABLE
  ===================================================== */

  function table(rows) {

    const sorted =
      [...rows].sort(
        (a, b) =>
          getScore(b) -
          getScore(a)
      );

    return `

      <div class="final-table-wrapper">

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

            ${sorted.map(
              (r, i) => {

                const s =
                  getScore(r);

                return `

                  <tr>

                    <td>${i + 1}</td>

                    <td>
                      ${esc(r.name)}
                    </td>

                    <td>
                      ${esc(
                        getUnitName(r)
                      )}
                    </td>

                    <td>${num(r.opening)}</td>
                    <td>${num(r.created)}</td>
                    <td>${num(r.received)}</td>
                    <td>${num(r.disposedClosed)}</td>
                    <td>${num(r.disposedForwarded)}</td>
                    <td>${num(r.disposed)}</td>
                    <td>${num(r.parked)}</td>
                    <td>${num(r.merged)}</td>

                    <td>${num(r.p0_7)}</td>
                    <td>${num(r.p8_15)}</td>
                    <td>${num(r.p16_30)}</td>
                    <td>${num(r.p31_60)}</td>
                    <td>${num(r.p60)}</td>

                    <td>${num(r.pending)}</td>

                    <td>
                      ${num(
                        r.pendingDays
                      ).toFixed(2)}
                    </td>

                    <td>
                      <b class="${cls(s)}">
                        ${s.toFixed(1)}
                      </b>
                    </td>

                  </tr>

                `;

              }
            ).join("")}

          </tbody>

        </table>

      </div>

    `;
  }

  /* =====================================================
     SUB-DIVISION LEADERS
  ===================================================== */

  function leaders() {

    return `

      <div class="sdpo-list">

        <span>
          Chittoor:
          J. VENKATANARAYANA
        </span>

        <span>
          Palamaner:
          D. PRABHAKAR
        </span>

        <span>
          Kuppam:
          B. HEMANTH,
          ASST. SUPDT. OF POLICE
        </span>

        <span>
          Nagari:
          S. CHANDRA SEKHAR
        </span>

      </div>

    `;
  }

  /* =====================================================
     FINAL RENDER
  ===================================================== */

  function renderFinal() {

    if (
      typeof DATA === "undefined" ||
      !Array.isArray(DATA.records) ||
      !DATA.records.length
    ) {
      return;
    }

    const root =
      $("groupedEoffice");

    if (!root) return;

    const groups =
      makeGroups(
        DATA.records
      );

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

        if (
          type ===
          "subdivisions"
        ) {

          entries.sort(
            (a, b) =>
              SUBDIVISION_ORDER.indexOf(
                a[0]
              ) -
              SUBDIVISION_ORDER.indexOf(
                b[0]
              )
          );

        } else {

          entries.sort(
            (a, b) =>
              a[0].localeCompare(
                b[0]
              )
          );

        }

        if (!entries.length)
          return;

        const rows =
          entries.flatMap(
            x => x[1]
          );

        html += `

          <section
            class="final-group group-${index + 1}"
          >

            <div class="final-header">

              <div>

                <h2>
                  ${icon}
                  ${title}
                </h2>

                <p>
                  ${entries.length}
                  Units
                  •
                  ${subtitle}
                </p>

              </div>

              ${
                type ===
                "subdivisions"
                  ? leaders()
                  : ""
              }

            </div>

            ${chart(entries)}

            ${table(rows)}

          </section>

        `;

      }
    );

    root.innerHTML =
      html;
  }

  /* =====================================================
     REMOVE OLD COMPOSITE SCORE
  ===================================================== */

  function hideOldComposite() {

    const chart =
      $("barChart");

    if (chart) {

      const panel =
        chart.closest(
          ".chart-panel"
        );

      if (panel) {

        panel.style.setProperty(
          "display",
          "none",
          "important"
        );

      }

    }

    /* Extra protection */

    document
      .querySelectorAll(
        "#rankings > .chart-panel"
      )
      .forEach(el => {

        el.style.setProperty(
          "display",
          "none",
          "important"
        );

      });

  }

  /* =====================================================
     CSS
  ===================================================== */

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "FINAL-CHITTOOR-EOFFICE-LAYOUT";

  style.textContent = `

    /* REMOVE OLD COMPOSITE PANEL */

    #rankings > .chart-panel {
      display:none !important;
    }


    /* FINAL GROUP */

    .final-group {

      background:#fff;

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

    .final-header {

      display:flex;

      justify-content:space-between;

      align-items:center;

      gap:20px;

      padding:18px 20px 14px;

    }

    .final-header h2 {

      margin:0;

      color:#17396e;

      font-size:20px;

      font-weight:800;

    }

    .final-header p {

      margin:5px 0 0;

      color:#70809a;

      font-size:13px;

    }


    /* SDPO */

    .sdpo-list {

      display:flex;

      flex-wrap:wrap;

      justify-content:flex-end;

      gap:6px;

      max-width:800px;

    }

    .sdpo-list span {

      background:#edf4ff;

      color:#2151a5;

      border-radius:7px;

      padding:7px 9px;

      font-size:11px;

      font-weight:800;

    }


    /* CHART */

    .final-chart {

      position:relative;

      height:260px;

      margin:0 14px;

      border-top:1px solid #e5ebf3;

      border-bottom:1px solid #e5ebf3;

      overflow:hidden;

      padding-bottom:45px;

    }

    .final-scale {

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

    .final-bars {

      position:absolute;

      left:40px;

      right:0;

      top:10px;

      bottom:45px;

      display:flex;

      align-items:flex-end;

      gap:8px;

      overflow-x:auto;

      border-bottom:1px solid #cfd8e5;

    }

    .final-bar-item {

      min-width:60px;

      height:100%;

      position:relative;

      display:flex;

      flex-direction:column;

      align-items:center;

      justify-content:flex-end;

    }

    .final-bar {

      width:42px;

      min-height:5px;

      border-radius:4px 4px 0 0;

    }

    .final-bar.good {
      background:#16b77e;
    }

    .final-bar.medium {
      background:#f5b820;
    }

    .final-bar.poor {
      background:#e76b63;
    }

    .final-value {

      font-size:9px;

      font-weight:800;

      color:#263b5e;

      margin-bottom:2px;

    }

    .final-bar-name {

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

    .final-table-wrapper {

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

      color:#fff;

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

    .final-table b.medium {
      color:#d48a00;
    }

    .final-table b.poor {
      color:#d94d43;
    }


    @media(max-width:800px) {

      .final-header {

        flex-direction:column;

        align-items:flex-start;

      }

      .sdpo-list {

        justify-content:flex-start;

      }

    }

  `;

  document.head.appendChild(
    style
  );


  /* =====================================================
     KEEP OVERRIDING OLD SCRIPT
     
     IMPORTANT:
     script.js calls render() after data loads.
     render() calls the OLD renderGroupedEoffice().
     
     Therefore we keep applying our final layout.
  ===================================================== */

  function applyFinalLayout() {

    try {

      hideOldComposite();

      if (
        typeof DATA !== "undefined" &&
        Array.isArray(DATA.records) &&
        DATA.records.length
      ) {

        renderFinal();

      }

    } catch (e) {

      console.error(
        "Final E-Office layout error:",
        e
      );

    }

  }


  /* First attempts */

  setTimeout(
    applyFinalLayout,
    100
  );

  setTimeout(
    applyFinalLayout,
    500
  );

  setTimeout(
    applyFinalLayout,
    1000
  );

  setTimeout(
    applyFinalLayout,
    2000
  );

  setTimeout(
    applyFinalLayout,
    4000
  );


  /* =====================================================
     WATCH FOR script.js RE-RENDERING
  ===================================================== */

  const target =
    $("rankings");

  if (target) {

    const observer =
      new MutationObserver(
        function () {

          hideOldComposite();

          if (
            typeof DATA !== "undefined" &&
            Array.isArray(DATA.records) &&
            DATA.records.length
          ) {

            const root =
              $("groupedEoffice");

            if (
              root &&
              !root.querySelector(
                ".final-group"
              )
            ) {

              renderFinal();

            }

          }

        }
      );

    observer.observe(
      target,
      {
        childList:true,
        subtree:true
      }
    );

  }

})();
