/* =========================================================
   CHITTOOR POLICE - E-OFFICE PERFORMANCE DASHBOARD
   FRESH STABLE SCRIPT
   Employee / Unit Detail FIXED
   ========================================================= */

(() => {
  "use strict";

  let DATA = [];
  let filteredData = [];
  let reportData = {};

  const $ = id => document.getElementById(id);

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function num(v) {
    if (v === null || v === undefined || v === "") return 0;

    if (typeof v === "number") return isFinite(v) ? v : 0;

    const n = Number(
      String(v)
        .replace(/,/g, "")
        .replace(/%/g, "")
        .trim()
    );

    return isFinite(n) ? n : 0;
  }

  function text(v) {
    if (v === null || v === undefined) return "";
    return String(v).trim();
  }

  function esc(v) {
    return text(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function first(obj, names, fallback = "") {
    for (const name of names) {
      if (
        obj &&
        Object.prototype.hasOwnProperty.call(obj, name) &&
        obj[name] !== null &&
        obj[name] !== undefined &&
        String(obj[name]).trim() !== ""
      ) {
        return obj[name];
      }
    }
    return fallback;
  }

  function numberField(obj, names) {
    return num(first(obj, names, 0));
  }

  /* =========================================================
     NORMALISE ONE EMPLOYEE / UNIT RECORD
     ========================================================= */

  function normalizeRecord(raw, index) {
    raw = raw || {};

    const employee = text(first(raw, [
      "Employee",
      "employee",
      "Employee Name",
      "employeeName",
      "Name",
      "name",
      "Officer",
      "Officer Name",
      "Staff Name",
      "Personnel",
      "PERSONNEL",
      "Emp Name"
    ], ""));

    const station = text(first(raw, [
      "Station / Designation",
      "Station/Designation",
      "stationDesignation",
      "Station",
      "station",
      "Police Station",
      "Police Station Name",
      "PS Name",
      "PS",
      "Unit",
      "unit",
      "Designation",
      "designation",
      "Office",
      "office"
    ], ""));

    const designation = text(first(raw, [
      "Designation",
      "designation",
      "Rank",
      "rank",
      "Post",
      "post"
    ], ""));

    const opening = numberField(raw, [
      "Opening",
      "opening",
      "Opening Balance",
      "openingBalance",
      "Opening Files",
      "openingFiles"
    ]);

    const created = numberField(raw, [
      "Created",
      "created",
      "Created Files",
      "createdFiles"
    ]);

    const received = numberField(raw, [
      "Received",
      "received",
      "Received Files",
      "receivedFiles"
    ]);

    const closed = numberField(raw, [
      "Closed",
      "closed",
      "Closed Files",
      "closedFiles"
    ]);

    const forwarded = numberField(raw, [
      "Forwarded",
      "forwarded",
      "Forward",
      "forward",
      "Forwarded Files",
      "forwardedFiles"
    ]);

    const disposedRaw = first(raw, [
      "Disposed",
      "disposed",
      "Total Disposed",
      "totalDisposed",
      "Disposal",
      "disposal"
    ], null);

    let disposed;

    if (disposedRaw !== null && disposedRaw !== "") {
      disposed = num(disposedRaw);
    } else {
      disposed = closed + forwarded;
    }

    const parked = numberField(raw, [
      "Parked",
      "parked",
      "Park",
      "park"
    ]);

    const merged = numberField(raw, [
      "Merged",
      "merged",
      "Merge",
      "merge"
    ]);

    const pendencyRaw = first(raw, [
      "Pendency",
      "pendency",
      "Pending",
      "pending",
      "Pending Files",
      "pendingFiles",
      "Balance",
      "balance"
    ], null);

    let pendency;

    if (pendencyRaw !== null && pendencyRaw !== "") {
      pendency = num(pendencyRaw);
    } else {
      pendency = Math.max(
        0,
        opening + created + received - disposed - parked - merged
      );
    }

    const avgDays = numberField(raw, [
      "Avg Days",
      "Avg. Days",
      "Average Days",
      "avgDays",
      "avg_days",
      "Average Pending Days",
      "averagePendingDays",
      "Pendency Days",
      "pendencyDays"
    ]);

    const score = numberField(raw, [
      "Score",
      "score",
      "Composite Score",
      "compositeScore",
      "Performance Score",
      "performanceScore"
    ]);

    const date = text(first(raw, [
      "Date",
      "date",
      "Reporting Date",
      "reportingDate",
      "Period",
      "period"
    ], ""));

    const subdivision = text(first(raw, [
      "Sub Division",
      "Sub-Division",
      "Subdivision",
      "subdivision",
      "SDPO",
      "sdpo"
    ], ""));

    /* Keep original values also */
    return {
      ...raw,

      __index: index + 1,

      employee,
      station,
      designation,

      opening,
      created,
      received,
      closed,
      forwarded,
      disposed,
      parked,
      merged,
      pendency,
      avgDays,
      score,

      date,
      subdivision
    };
  }

  /* =========================================================
     EXTRACT RECORD ARRAY FROM ANY COMMON data.json FORMAT
     ========================================================= */

  function extractRecords(json) {

    if (Array.isArray(json)) {
      return json;
    }

    if (!json || typeof json !== "object") {
      return [];
    }

    const possibleKeys = [
      "data",
      "records",
      "employees",
      "employeeData",
      "employeeDetails",
      "details",
      "units",
      "rows",
      "results",
      "eoffice",
      "EOffice",
      "Eoffice",
      "performance",
      "performanceData"
    ];

    for (const key of possibleKeys) {
      if (Array.isArray(json[key])) {
        return json[key];
      }
    }

    /* Search one level deeper */
    for (const key of Object.keys(json)) {
      if (Array.isArray(json[key])) {
        const arr = json[key];

        if (
          arr.length === 0 ||
          typeof arr[0] === "object"
        ) {
          return arr;
        }
      }
    }

    return [];
  }

  /* =========================================================
     LOAD DATA
     ========================================================= */

  async function loadData() {

    try {

      const response = await fetch(
        "data.json?v=" + Date.now(),
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          "data.json could not be loaded. HTTP " +
          response.status
        );
      }

      const json = await response.json();

      const records = extractRecords(json);

      DATA = records.map(normalizeRecord);

      filteredData = [...DATA];

      console.log(
        "E-Office records loaded:",
        DATA.length
      );

      console.log(
        "First record:",
        DATA[0]
      );

      if (!DATA.length) {
        console.warn(
          "No employee records found in data.json"
        );
      }

      renderAll();

    } catch (error) {

      console.error(
        "Dashboard data loading error:",
        error
      );

      showDataError(error);
    }
  }

  /* =========================================================
     ERROR DISPLAY
     ========================================================= */

  function showDataError(error) {

    const detail = $("detailTable");

    if (detail) {
      detail.innerHTML = `
        <tr>
          <td colspan="14"
              style="text-align:center;padding:25px;color:#b91c1c;">
            Employee data could not be loaded.
            <br>
            <small>${esc(error.message)}</small>
          </td>
        </tr>
      `;
    }

    if ($("groupedEoffice")) {
      $("groupedEoffice").innerHTML = `
        <div style="
          padding:25px;
          text-align:center;
          color:#b91c1c;
          font-weight:600;">
          Unable to load E-Office data.
        </div>
      `;
    }
  }

  /* =========================================================
     RENDER ALL
     ========================================================= */

  function renderAll() {

    renderHero();

    renderCards();

    renderEmployeeDetail();

    renderOrganisation();

    renderPerformance();

    renderTrends();

    renderRankings();

    renderReports();

    updateLastLoaded();
  }

  /* =========================================================
     HERO
     ========================================================= */

  function renderHero() {

    if ($("unitCount")) {
      $("unitCount").textContent =
        DATA.length.toLocaleString("en-IN");
    }

    const disposed = DATA.reduce(
      (a, r) => a + r.disposed,
      0
    );

    const pending = DATA.reduce(
      (a, r) => a + r.pendency,
      0
    );

    if ($("disposedHero")) {
      $("disposedHero").textContent =
        disposed.toLocaleString("en-IN");
    }

    if ($("pendencyHero")) {
      $("pendencyHero").textContent =
        pending.toLocaleString("en-IN");
    }

    if ($("period")) {

      const dates = DATA
        .map(r => r.date)
        .filter(Boolean);

      if (dates.length) {
        $("period").textContent =
          "Reporting Period: " + dates[0];
      } else {
        $("period").textContent =
          "Reporting Period: Current Data";
      }
    }
  }

  /* =========================================================
     SUMMARY CARDS
     ========================================================= */

  function renderCards() {

    const disposed = DATA.reduce(
      (a, r) => a + r.disposed,
      0
    );

    const received = DATA.reduce(
      (a, r) =>
        a +
        r.created +
        r.received,
      0
    );

    const pending = DATA.reduce(
      (a, r) => a + r.pendency,
      0
    );

    const weightedDays = DATA.reduce(
      (a, r) =>
        a + (r.pendency * r.avgDays),
      0
    );

    const avgPending =
      pending > 0
        ? weightedDays / pending
        : 0;

    if ($("disposedTotal")) {
      $("disposedTotal").textContent =
        disposed.toLocaleString("en-IN");
    }

    if ($("receivedTotal")) {
      $("receivedTotal").textContent =
        received.toLocaleString("en-IN");
    }

    if ($("pendencyTotal")) {
      $("pendencyTotal").textContent =
        pending.toLocaleString("en-IN");
    }

    if ($("avgPending")) {
      $("avgPending").textContent =
        avgPending.toFixed(2);
    }
  }

  /* =========================================================
     EMPLOYEE / UNIT DETAIL
     THIS IS THE MAIN FIX
     ========================================================= */

  function renderEmployeeDetail(data = filteredData) {

    const tbody = $("detailTable");

    if (!tbody) return;

    if (!data || !data.length) {

      tbody.innerHTML = `
        <tr>
          <td colspan="14"
              style="
                text-align:center;
                padding:28px;
                color:#64748b;
                font-weight:600;">
            No employee / unit records found
          </td>
        </tr>
      `;

      return;
    }

    let html = "";

    data.forEach((r, i) => {

      const stationDesignation =
        r.station ||
        r.designation ||
        "—";

      html += `
        <tr>
          <td>${i + 1}</td>

          <td>
            <strong>
              ${esc(r.employee || "—")}
            </strong>
          </td>

          <td>
            ${esc(stationDesignation)}
          </td>

          <td>${formatNumber(r.opening)}</td>

          <td>${formatNumber(r.created)}</td>

          <td>${formatNumber(r.received)}</td>

          <td>${formatNumber(r.closed)}</td>

          <td>${formatNumber(r.forwarded)}</td>

          <td>
            <strong>
              ${formatNumber(r.disposed)}
            </strong>
          </td>

          <td>${formatNumber(r.parked)}</td>

          <td>${formatNumber(r.merged)}</td>

          <td>
            <strong>
              ${formatNumber(r.pendency)}
            </strong>
          </td>

          <td>
            ${r.avgDays.toFixed(2)}
          </td>

          <td>
            ${r.score.toFixed(2)}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function formatNumber(n) {
    return num(n).toLocaleString("en-IN");
  }

  /* =========================================================
     EMPLOYEE SEARCH
     ========================================================= */

  function searchEmployees(value) {

    const q = text(value).toLowerCase();

    if (!q) {
      filteredData = [...DATA];
    } else {

      filteredData = DATA.filter(r => {

        const combined = [
          r.employee,
          r.station,
          r.designation,
          r.subdivision,

          /* Search original fields too */
          first(r, ["Name"]),
          first(r, ["Employee Name"]),
          first(r, ["PS Name"]),
          first(r, ["Police Station"]),
          first(r, ["Unit"])
        ]
          .join(" ")
          .toLowerCase();

        return combined.includes(q);
      });
    }

    renderEmployeeDetail(filteredData);
  }

  /* =========================================================
     ORGANISATION TABLE
     ========================================================= */

  function renderOrganisation(data = DATA) {

    if ($("tableCount")) {
      $("tableCount").textContent =
        `${data.length} records`;
    }

    const container = $("groupedEoffice");

    if (!container) return;

    if (!data.length) {
      container.innerHTML =
        `<div style="padding:20px;text-align:center;">
          No records available
        </div>`;
      return;
    }

    const groups = {};

    data.forEach(r => {

      const key =
        r.station ||
        r.designation ||
        "Other";

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(r);
    });

    const keys = Object.keys(groups)
      .sort((a, b) =>
        a.localeCompare(b)
      );

    let html = `
      <div class="organisation-list">
    `;

    keys.forEach(key => {

      const rows = groups[key];

      const disposed = rows.reduce(
        (a, r) => a + r.disposed,
        0
      );

      const pending = rows.reduce(
        (a, r) => a + r.pendency,
        0
      );

      html += `
        <div class="org-row">
          <div class="org-name">
            <strong>${esc(key)}</strong>
            <small>${rows.length} record(s)</small>
          </div>

          <div class="org-number">
            <span>Disposed</span>
            <strong>
              ${formatNumber(disposed)}
            </strong>
          </div>

          <div class="org-number">
            <span>Pending</span>
            <strong>
              ${formatNumber(pending)}
            </strong>
          </div>
        </div>
      `;
    });

    html += `</div>`;

    container.innerHTML = html;
  }

  /* =========================================================
     PERFORMANCE
     ========================================================= */

  function renderPerformance() {

    const el = $("performanceGrid");

    if (!el) return;

    if (!DATA.length) {
      el.innerHTML = "";
      return;
    }

    const sorted = [...DATA]
      .sort((a, b) =>
        b.score - a.score
      )
      .slice(0, 20);

    let html = "";

    sorted.forEach((r, i) => {

      html += `
        <div class="performance-card">
          <div>
            <strong>
              ${i + 1}. ${esc(r.employee || "Unit")}
            </strong>
            <small>
              ${esc(r.station || r.designation || "")}
            </small>
          </div>

          <div>
            <strong>
              ${r.score.toFixed(2)}
            </strong>
            <small>Score</small>
          </div>
        </div>
      `;
    });

    el.innerHTML = html;
  }

  /* =========================================================
     RANKINGS
     ========================================================= */

  function renderRankings() {

    const sorted = [...DATA].sort(
      (a, b) => b.score - a.score
    );

    renderRankingList(
      $("topList"),
      sorted.slice(0, 5)
    );

    renderRankingList(
      $("bottomList"),
      sorted.slice(-5).reverse()
    );

    renderBarChart(sorted.slice(0, 10));
  }

  function renderRankingList(el, rows) {

    if (!el) return;

    if (!rows.length) {
      el.innerHTML =
        "<p>No records available.</p>";
      return;
    }

    let html = "";

    rows.forEach((r, i) => {

      html += `
        <div class="ranking-row">
          <span class="rank-number">
            ${i + 1}
          </span>

          <div>
            <strong>
              ${esc(r.employee || "Unit")}
            </strong>

            <small>
              ${esc(r.station || r.designation || "")}
            </small>
          </div>

          <strong>
            ${r.score.toFixed(2)}
          </strong>
        </div>
      `;
    });

    el.innerHTML = html;
  }

  /* =========================================================
     BAR CHART
     ========================================================= */

  function renderBarChart(rows) {

    const el = $("barChart");

    if (!el) return;

    if (!rows.length) {
      el.innerHTML = "";
      return;
    }

    const max =
      Math.max(
        ...rows.map(r => r.score),
        1
      );

    let html = "";

    rows.forEach(r => {

      const width =
        Math.max(
          3,
          (r.score / max) * 100
        );

      html += `
        <div class="bar-item">

          <div class="bar-label">
            ${esc(
              r.employee ||
              r.station ||
              "Unit"
            )}
          </div>

          <div class="bar-track">
            <div
              class="bar-fill"
              style="width:${width}%">
            </div>
          </div>

          <div class="bar-value">
            ${r.score.toFixed(2)}
          </div>

        </div>
      `;
    });

    el.innerHTML = html;

    if ($("chartNote")) {
      $("chartNote").textContent =
        `${rows.length} top records`;
    }
  }

  /* =========================================================
     TRENDS
     ========================================================= */

  function renderTrends() {

    const movement = $("movementBars");
    const age = $("pendencyBars");

    if (movement) {

      const values = [
        ["Opening", DATA.reduce((a, r) => a + r.opening, 0)],
        ["Created", DATA.reduce((a, r) => a + r.created, 0)],
        ["Received", DATA.reduce((a, r) => a + r.received, 0)],
        ["Closed", DATA.reduce((a, r) => a + r.closed, 0)],
        ["Forwarded", DATA.reduce((a, r) => a + r.forwarded, 0)],
        ["Disposed", DATA.reduce((a, r) => a + r.disposed, 0)],
        ["Pending", DATA.reduce((a, r) => a + r.pendency, 0)]
      ];

      movement.innerHTML =
        simpleBars(values);
    }

    if (age) {

      const buckets = [
        ["0–7 Days", 0],
        ["8–15 Days", 0],
        ["16–30 Days", 0],
        ["31–60 Days", 0],
        ["60+ Days", 0]
      ];

      DATA.forEach(r => {

        if (r.pendency <= 0) return;

        if (r.avgDays <= 7)
          buckets[0][1] += r.pendency;
        else if (r.avgDays <= 15)
          buckets[1][1] += r.pendency;
        else if (r.avgDays <= 30)
          buckets[2][1] += r.pendency;
        else if (r.avgDays <= 60)
          buckets[3][1] += r.pendency;
        else
          buckets[4][1] += r.pendency;
      });

      age.innerHTML =
        simpleBars(buckets);
    }
  }

  function simpleBars(values) {

    const max =
      Math.max(
        ...values.map(x => num(x[1])),
        1
      );

    return values.map(v => {

      const width =
        Math.max(
          2,
          num(v[1]) / max * 100
        );

      return `
        <div class="simple-bar-row">

          <span>
            ${esc(v[0])}
          </span>

          <div class="simple-bar-track">
            <div
              class="simple-bar-fill"
              style="width:${width}%">
            </div>
          </div>

          <strong>
            ${formatNumber(v[1])}
          </strong>

        </div>
      `;

    }).join("");
  }

  /* =========================================================
     REPORTS
     ========================================================= */

  function renderReports() {

    const el = $("reportCards");

    if (!el) return;

    const totalOpening =
      DATA.reduce((a, r) => a + r.opening, 0);

    const totalCreated =
      DATA.reduce((a, r) => a + r.created, 0);

    const totalReceived =
      DATA.reduce((a, r) => a + r.received, 0);

    const totalClosed =
      DATA.reduce((a, r) => a + r.closed, 0);

    const totalForwarded =
      DATA.reduce((a, r) => a + r.forwarded, 0);

    const totalDisposed =
      DATA.reduce((a, r) => a + r.disposed, 0);

    const totalParked =
      DATA.reduce((a, r) => a + r.parked, 0);

    const totalMerged =
      DATA.reduce((a, r) => a + r.merged, 0);

    const totalPending =
      DATA.reduce((a, r) => a + r.pendency, 0);

    const cards = [
      ["Opening", totalOpening],
      ["Created", totalCreated],
      ["Received", totalReceived],
      ["Closed", totalClosed],
      ["Forwarded", totalForwarded],
      ["Disposed", totalDisposed],
      ["Parked", totalParked],
      ["Merged", totalMerged],
      ["Pendency", totalPending]
    ];

    el.innerHTML = cards.map(c => `
      <article>
        <span>${esc(c[0])}</span>
        <strong>${formatNumber(c[1])}</strong>
      </article>
    `).join("");
  }

  /* =========================================================
     LAST LOADED
     ========================================================= */

  function updateLastLoaded() {

    if (!$("lastLoaded")) return;

    const now = new Date();

    $("lastLoaded").textContent =
      "Last loaded: " +
      now.toLocaleString("en-IN");
  }

  /* =========================================================
     TAB SYSTEM
     ========================================================= */

  function setupTabs() {

    document.querySelectorAll(".tab").forEach(tab => {

      tab.addEventListener("click", function() {

        const target =
          this.getAttribute("data-target");

        if (!target) return;

        document
          .querySelectorAll(".tab")
          .forEach(t =>
            t.classList.remove("active")
          );

        document
          .querySelectorAll(".section")
          .forEach(s =>
            s.classList.remove("active-section")
          );

        this.classList.add("active");

        const section = $(target);

        if (section) {
          section.classList.add(
            "active-section"
          );
        }
      });

    });
  }

  /* =========================================================
     SEARCH EVENTS
     ========================================================= */

  function setupSearch() {

    const detailSearch =
      $("searchDetail");

    if (detailSearch) {

      detailSearch.addEventListener(
        "input",
        e =>
          searchEmployees(e.target.value)
      );
    }

    const rankSearch =
      $("searchRank");

    if (rankSearch) {

      rankSearch.addEventListener(
        "input",
        e => {

          const q =
            text(e.target.value)
              .toLowerCase();

          if (!q) {
            renderOrganisation(DATA);
            return;
          }

          const result =
            DATA.filter(r =>
              [
                r.employee,
                r.station,
                r.designation,
                r.subdivision
              ]
                .join(" ")
                .toLowerCase()
                .includes(q)
            );

          renderOrganisation(result);
        }
      );
    }

    const refresh =
      $("refresh");

    if (refresh) {

      refresh.addEventListener(
        "click",
        () => loadData()
      );
    }
  }

  /* =========================================================
     START
     ========================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      setupTabs();

      setupSearch();

      loadData();

    }
  );

})();
