/* ============================================================
   CHITTOOR POLICE E-OFFICE
   FINAL AP SMART POLICING STYLE LAYOUT
   ============================================================ */

(function () {
  "use strict";

  const $ = id => document.getElementById(id);

  const num = v => Number(v) || 0;

  const esc = v =>
    String(v ?? "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));

  function station(r) {
    return String(
      r.station ||
      r.policeStation ||
      r.psName ||
      ""
    ).replace(/\s+/g, " ").trim();
  }

  function designation(r) {
    return String(
      r.designation ||
      r.post ||
      ""
    ).replace(/\s+/g, " ").trim();
  }

  function workload(r) {
    return num(r.opening) + num(r.created) + num(r.received);
  }

  function score(r) {

    const w = workload(r);

    const disposal = w
      ? Math.min(100, num(r.disposed) / w * 100)
      : (num(r.pending) > 0 ? 0 : 100);

    const pendingPct = w
      ? Math.min(100, num(r.pending) / w * 100)
      : (num(r.pending) > 0 ? 100 : 0);

    const pendency = Math.max(0, 100 - pendingPct);

    const ageing = num(r.pending) > 0
      ? Math.max(
          0,
          100 - Math.min(100, num(r.pendingDays) / 60 * 100)
        )
      : 100;

    return Math.max(
      0,
      Math.min(
        100,
        disposal * 0.50 +
        pendency * 0.30 +
        ageing * 0.20
      )
    );
  }

  /* ============================================================
     SUB-DIVISIONS
     ============================================================ */

  const SUBDIVISIONS = [
    {
      key: "chittoor",
      name: "Chittoor Sub-Division",
      leader: "J. VENKATANARAYANA"
    },
    {
      key: "palamaner",
      name: "Palamaner Sub-Division",
      leader: "D. PRABHAKAR"
    },
    {
      key: "kuppam",
      name: "Kuppam Sub-Division",
      leader: "B. HEMANTH, ASST. SUPDT. OF POLICE"
    },
    {
      key: "nagari",
      name: "Nagari Sub-Division",
      leader: "S. CHANDRA SEKHAR"
    }
  ];

  const SPECIAL_WORDS = [
    "DCRB",
    "CRIME RECORDS",
    "CCS",
    "SPECIAL BRANCH",
    " SB ",
    "DTC",
    "DTRB",
    "PCR",
    "TRAFFIC",
    " AR ",
    " VR ",
    "MAHILA",
    "WOMEN",
    "CYBER",
    "HOME GUARD",
    "HOME GUARDS",
    "COMMUNICATION",
    "CONTROL ROOM"
  ];

  function rawText(r) {

    return [
      r.name,
      r.designation,
      r.section,
      r.station,
      r.unit,
      r.office,
      r.subdivision,
      r.subDivision,
      r.category,
      r.group
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase();
  }

  function isSubdivision(r) {

    const s = rawText(r);

    if (station(r)) return null;

    for (const x of SUBDIVISIONS) {

      if (
        new RegExp(
          "\\b" + x.key + "\\b",
          "i"
        ).test(s)
      ) {
        return x;
      }

    }

    return null;
  }

  function isSpecial(r) {

    const s = " " + rawText(r) + " ";

    if (station(r)) return null;

    for (const word of SPECIAL_WORDS) {

      if (s.includes(word)) {
        return true;
      }

    }

    return false;
  }

  function isOffice(r) {

    if (station(r)) return false;

    const s = rawText(r);

    const words = [
      "DPO",
      "DISTRICT POLICE OFFICE",
      "SUPERINTENDENT",
      "ADMINISTRATIVE",
      "ESTABLISHMENT",
      "MINISTERIAL",
      "OFFICE STAFF",
      "ACCOUNTS",
      "LEGAL CELL",
      "COURT MONITORING",
      "RECORD ROOM"
    ];

    return words.some(x => s.includes(x));
  }

  /* ============================================================
     GROUP RECORDS
     ============================================================ */

  function makeGroups(records) {

    const groups = {
      stations: new Map(),
      subdivisions: new Map(),
      office: new Map(),
      special: new Map()
    };

    records.forEach(r => {

      const st = station(r);

      /* POLICE STATIONS */

      if (st) {

        if (!groups.stations.has(st)) {
          groups.stations.set(st, []);
        }

        groups.stations.get(st).push(r);

        return;
      }

      /* SUB-DIVISIONS */

      const sub = isSubdivision(r);

      if (sub) {

        if (!groups.subdivisions.has(sub.name)) {
          groups.subdivisions.set(sub.name, []);
        }

        groups.subdivisions.get(sub.name).push(r);

        return;
      }

      /* SPECIAL UNITS */

      if (isSpecial(r)) {

        let unit =
          r.section ||
          r.unit ||
          r.office ||
          r.designation ||
          "Special Unit / Wing";

        unit = String(unit)
          .replace(/\s+/g, " ")
          .trim();

        if (!groups.special.has(unit)) {
          groups.special.set(unit, []);
        }

        groups.special.get(unit).push(r);

        return;
      }

      /* OFFICE STAFF */

      if (isOffice(r)) {

        let unit =
          r.section ||
          r.office ||
          r.unit ||
          r.designation ||
          "Office Staff";

        unit = String(unit)
          .replace(/\s+/g, " ")
          .trim();

        if (!groups.office.has(unit)) {
          groups.office.set(unit, []);
        }

        groups.office.get(unit).push(r);

        return;
      }

      /* REMAINING RECORDS */

      let unit =
        r.section ||
        r.office ||
        r.unit ||
        "Office Staff";

      unit = String(unit)
        .replace(/\s+/g, " ")
        .trim();

      if (!groups.office.has(unit)) {
        groups.office.set(unit, []);
      }

      groups.office.get(unit).push(r);

    });

    return groups;
  }

  /* ============================================================
     SCORE COLOUR
     ============================================================ */

  function scoreClass(v) {

    if (v >= 80) return "score-green";

    if (v >= 50) return "score-yellow";

    return "score-red";
  }

  function cellClass(v, type) {

    const n = num(v);

    if (type === "opening") {
      return n === 0 ? "good" : "bad";
    }

    if (type === "disposed") {
      return n >= 80
        ? "good"
        : n >= 50
          ? "warn"
          : "bad";
    }

    if (type === "pending") {
      return n === 0
        ? "good"
        : n <= 10
          ? "warn"
          : "bad";
    }

    if (type === "days") {
      return n === 0
        ? "good"
        : n <= 15
          ? "warn"
          : "bad";
    }

    return "";
  }

  /* ============================================================
     TABLE
     ============================================================ */

  function makeTable(rows) {

    const sorted = [...rows].sort(
      (a, b) => score(b) - score(a)
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

              const st = station(r);
              const des = designation(r);

              let org = "";

              if (st && des) {

                if (
                  st.toLowerCase() ===
                  des.toLowerCase()
                ) {
                  org = st;
                } else {
                  org = st + " / " + des;
                }

              } else {

                org =
                  st ||
                  des ||
                  r.section ||
                  "";

              }

              return `
                <tr>

                  <td>${i + 1}</td>

                  <td class="employee">
                    ${esc(r.name || "")}
                  </td>

                  <td>
                    ${esc(org)}
                  </td>

                  <td class="${cellClass(r.opening, "opening")}">
                    ${num(r.opening)}
                  </td>

                  <td>${num(r.created)}</td>

                  <td>${num(r.received)}</td>

                  <td>${num(r.disposedClosed)}</td>

                  <td>${num(r.disposedForwarded)}</td>

                  <td>
                    ${num(r.disposed)}
                  </td>

                  <td>${num(r.parked)}</td>

                  <td>${num(r.merged)}</td>

                  <td>${num(r.p0_7)}</td>

                  <td>${num(r.p8_15)}</td>

                  <td>${num(r.p16_30)}</td>

                  <td>${num(r.p31_60)}</td>

                  <td>${num(r.p60)}</td>

                  <td class="${cellClass(r.pending, "pending")}">
                    ${num(r.pending)}
                  </td>

                  <td class="${cellClass(r.pendingDays, "days")}">
                    ${num(r.pendingDays).toFixed(2)}
                  </td>

                  <td class="${scoreClass(score(r))}">
                    <b>${score(r).toFixed(1)}</b>
                  </td>

                </tr>
              `;

            }).join("")}

          </tbody>

        </table>

      </div>
    `;
  }

  /* ============================================================
     BAR CHART
     ============================================================ */

  function makeChart(entries) {

    const units = [...entries.entries()]
      .map(([name, rows]) => {

        const avg =
          rows.reduce(
            (sum, r) => sum + score(r),
            0
          ) /
          (rows.length || 1);

        return {
          name,
          rows,
          score: avg
        };

      })
      .sort(
        (a, b) => b.score - a.score
      );

    if (!units.length) {
      return `
        <div class="no-data">
          No data available
        </div>
      `;
    }

    return `
      <div class="final-chart-scroll">

        <div class="final-chart">

          ${units.map(u => {

            const height =
              Math.max(
                6,
                Math.min(
                  100,
                  u.score
                )
              );

            return `
              <div class="final-bar-item">

                <div class="final-bar-value">
                  ${u.score.toFixed(1)}
                </div>

                <div
                  class="final-bar ${scoreClass(u.score)}"
                  style="height:${height}%"
                ></div>

                <div class="final-bar-label">
                  ${esc(u.name)}
                </div>

              </div>
            `;

          }).join("")}

        </div>

      </div>
    `;
  }

  /* ============================================================
     LEADER
     ============================================================ */

  function getLeader(type, rows) {

    if (type === "subdivisions") {

      return SUBDIVISIONS
        .filter(x =>
          rows.some(r => {

            const sub =
              isSubdivision(r);

            return (
              sub &&
              sub.name === x.name
            );

          })
        )
        .map(x => x.leader)
        .join("  •  ");
    }

    if (!rows.length) {
      return "—";
    }

    const leader =
      [...rows].sort(
        (a, b) =>
          score(b) - score(a)
      )[0];

    return leader.name || "—";
  }

  /* ============================================================
     GROUP CARD
     ============================================================ */

  function makeGroup(
    type,
    title,
    subtitle,
    entries
  ) {

    const rows =
      [...entries.values()].flat();

    if (!rows.length) {
      return "";
    }

    const leader =
      getLeader(type, rows);

    const unitCount =
      entries.size;

    return `
      <section class="final-group ${type}">

        <div class="final-group-header">

          <div>

            <div class="final-group-title">
              ${esc(title)}
            </div>

            <div class="final-group-subtitle">
              ${esc(subtitle)}
              • ${unitCount} Units
            </div>

          </div>

          <div class="final-leader">

            <span>
              LEADER / OFFICER
            </span>

            <strong>
              ${esc(leader)}
            </strong>

          </div>

        </div>

        <div class="final-section-title">
          UNIT PERFORMANCE
        </div>

        ${makeChart(entries)}

        <div class="final-section-title table-title">
          DETAILED E-OFFICE PERFORMANCE
        </div>

        ${makeTable(rows)}

      </section>
    `;
  }

  /* ============================================================
     CSS
     ============================================================ */

  function addStyles() {

    if ($("final-eoffice-layout-style")) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "final-eoffice-layout-style";

    style.textContent = `

      #barChart {
        display:none !important;
      }

      #rankings > .chart-panel {
        display:none !important;
      }

      .group-summary-tabs {
        display:none !important;
      }

      .organisation-tabs,
      .organization-tabs,
      .organisation-filter,
      .organization-filter {
        display:none !important;
      }

      #groupedEoffice {
        display:block !important;
        width:100% !important;
        margin:0 !important;
        padding:0 !important;
      }

      .final-group {
        margin:24px 0;
        padding:0;
        border-radius:18px;
        overflow:hidden;
        background:#fff;
        border:1px solid #d8dee8;
        box-shadow:0 8px 24px rgba(0,0,0,.08);
      }

      .final-group-header {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:20px;
        padding:22px 26px;
        background:linear-gradient(
          135deg,
          #173b67,
          #245c91
        );
        color:#fff;
      }

      .final-group.subdivisions
      .final-group-header {
        background:linear-gradient(
          135deg,
          #56358a,
          #7951b3
        );
      }

      .final-group.office
      .final-group-header {
        background:linear-gradient(
          135deg,
          #9a5a16,
          #d28725
        );
      }

      .final-group.special
      .final-group-header {
        background:linear-gradient(
          135deg,
          #176b55,
          #29906e
        );
      }

      .final-group-title {
        font-size:25px;
        font-weight:800;
        letter-spacing:.3px;
      }

      .final-group-subtitle {
        margin-top:6px;
        font-size:13px;
        opacity:.9;
      }

      .final-leader {
        min-width:260px;
        text-align:right;
        background:rgba(255,255,255,.13);
        padding:10px 15px;
        border-radius:10px;
      }

      .final-leader span {
        display:block;
        font-size:10px;
        font-weight:700;
        opacity:.8;
        margin-bottom:4px;
      }

      .final-leader strong {
        font-size:14px;
      }

      .final-section-title {
        padding:15px 22px 8px;
        font-size:14px;
        font-weight:800;
        color:#26364a;
        letter-spacing:.5px;
      }

      .table-title {
        padding-top:22px;
      }

      .final-chart-scroll {
        overflow-x:auto;
        padding:8px 22px 20px;
      }

      .final-chart {
        min-width:max-content;
        height:260px;
        display:flex;
        align-items:flex-end;
        gap:14px;
        padding:20px 10px 0;
        border-bottom:2px solid #cbd3df;
        background:
          repeating-linear-gradient(
            to top,
            transparent 0,
            transparent 49px,
            #e9edf3 50px
          );
      }

      .final-bar-item {
        width:76px;
        height:230px;
        display:flex;
        flex-direction:column;
        justify-content:flex-end;
        align-items:center;
        position:relative;
      }

      .final-bar {
        width:48px;
        min-height:8px;
        border-radius:7px 7px 0 0;
        transition:.2s;
      }

      .final-bar:hover {
        opacity:.8;
        transform:scaleY(1.02);
      }

      .final-bar-value {
        font-size:11px;
        font-weight:800;
        margin-bottom:4px;
      }

      .final-bar-label {
        width:90px;
        margin-top:8px;
        font-size:10px;
        font-weight:700;
        text-align:center;
        line-height:1.2;
        word-break:break-word;
      }

      .score-green {
        background:#159447 !important;
        color:#08752f;
      }

      .score-yellow {
        background:#e6a21b !important;
        color:#996b00;
      }

      .score-red {
        background:#d94141 !important;
        color:#b51f1f;
      }

      .final-table-wrap {
        width:100%;
        overflow-x:auto;
        padding:0 20px 24px;
        box-sizing:border-box;
      }

      .final-table {
        width:100%;
        min-width:1550px;
        border-collapse:collapse;
        font-size:12px;
      }

      .final-table th {
        background:#24364b;
        color:#fff;
        padding:10px 8px;
        border:1px solid #526174;
        white-space:nowrap;
        text-align:center;
      }

      .final-table td {
        padding:8px 7px;
        border:1px solid #d8dee7;
        text-align:center;
        white-space:nowrap;
      }

      .final-table tbody tr:nth-child(even) {
        background:#f7f9fb;
      }

      .final-table tbody tr:hover {
        background:#eef5ff;
      }

      .final-table .employee {
        text-align:left;
        font-weight:700;
      }

      .good {
        background:#d9f4df !important;
        color:#137333;
        font-weight:700;
      }

      .warn {
        background:#fff0bd !important;
        color:#8a6500;
        font-weight:700;
      }

      .bad {
        background:#ffdede !important;
        color:#b42323;
        font-weight:700;
      }

      .final-table td.score-green,
      .final-table td.score-yellow,
      .final-table td.score-red {
        color:#fff;
        font-weight:800;
      }

      .no-data {
        padding:30px;
        text-align:center;
        color:#777;
      }

      @media(max-width:800px) {

        .final-group-header {
          flex-direction:column;
          align-items:flex-start;
        }

        .final-leader {
          width:100%;
          min-width:0;
          text-align:left;
          box-sizing:border-box;
        }

        .final-group-title {
          font-size:20px;
        }

      }

    `;

    document.head.appendChild(style);
  }

  /* ============================================================
     HIDE OLD COMPOSITE SCORE / CONTROLS
     ============================================================ */

  function hideOldPanels() {

    const bar = $("barChart");

    if (bar) {

      const panel =
        bar.closest(".chart-panel") ||
        bar.closest(".panel") ||
        bar.parentElement;

      if (panel) {
        panel.style.display = "none";
      }

    }

    [
      "groupSummaryTabs",
      "tableCount",
      "organisationControls",
      "organizationControls"
    ].forEach(id => {

      const el = $(id);

      if (el) {
        el.style.display = "none";
      }

    });

  }

  /* ============================================================
     FINAL RENDER
     ============================================================ */

  function renderFinal() {

    const root =
      $("groupedEoffice");

    if (!root) {
      return;
    }

    if (
      typeof DATA === "undefined" ||
      !DATA ||
      !Array.isArray(DATA.records) ||
      !DATA.records.length
    ) {
      return;
    }

    addStyles();

    hideOldPanels();

    const groups =
      makeGroups(DATA.records);

    let html = "";

    html += makeGroup(
      "stations",
      "GROUP 1: POLICE STATIONS",
      "Police Station-wise E-Office Performance",
      groups.stations
    );

    html += makeGroup(
      "subdivisions",
      "GROUP 2: SUB-DIVISIONS",
      "Sub-Division-wise E-Office Performance",
      groups.subdivisions
    );

    html += makeGroup(
      "office",
      "GROUP 3: OFFICE STAFF",
      "DPO / Office Staff E-Office Performance",
      groups.office
    );

    html += makeGroup(
      "special",
      "GROUP 4: SPECIAL UNITS / WINGS",
      "Special Units and Wings E-Office Performance",
      groups.special
    );

    root.innerHTML =
      html ||
      `
        <div class="no-data">
          No E-Office records found.
        </div>
      `;

    root.dataset.finalLayout =
      "yes";
  }

  /* ============================================================
     START
     ============================================================ */

  function start() {

    addStyles();

    let attempts = 0;

    const timer =
      setInterval(() => {

        attempts++;

        try {

          if (
            typeof DATA !== "undefined" &&
            DATA &&
            Array.isArray(DATA.records) &&
            DATA.records.length
          ) {
            renderFinal();
          }

        } catch (e) {

          console.error(
            "E-Office layout fix:",
            e
          );

        }

        if (attempts > 120) {
          clearInterval(timer);
        }

      }, 500);

    const observer =
      new MutationObserver(() => {

        const root =
          $("groupedEoffice");

        if (!root) {
          return;
        }

        if (
          typeof DATA === "undefined" ||
          !DATA ||
          !Array.isArray(DATA.records) ||
          !DATA.records.length
        ) {
          return;
        }

        if (
          root.dataset.finalLayout !== "yes" ||
          !root.querySelector(".final-group")
        ) {

          setTimeout(() => {

            if (
              root.dataset.finalLayout !== "yes" ||
              !root.querySelector(".final-group")
            ) {
              renderFinal();
            }

          }, 50);

        }

      });

    observer.observe(
      document.body,
      {
        childList:true,
        subtree:true
      }
    );

  }

  /* ============================================================
     RUN
     ============================================================ */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start
    );

  } else {

    start();

  }

})();
