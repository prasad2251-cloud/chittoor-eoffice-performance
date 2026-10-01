let DATA = null;

const $ = id => document.getElementById(id);

const fmt = n =>
  Number(n || 0).toLocaleString("en-IN");

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));


/* =========================
   NUMBER HELPER
========================= */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}


/* =========================
   NORMALIZE DATA
   Supports new + old JSON
========================= */

function normalizeRecord(r) {

  return {
    employee:
      r.employee ??
      r.name ??
      r.employee_name ??
      "",

    unit_designation:
      r.unit_designation ??
      r.designation ??
      r.unit ??
      r.unitName ??
      r.station ??
      r.PS ??
      "",

    opening_balance:
      num(r.opening_balance ?? r.openingBalance),

    created:
      num(r.created),

    received:
      num(r.received),

    disposed_closed:
      num(r.disposed_closed ?? r.closed),

    disposed_forwarded:
      num(r.disposed_forwarded ?? r.forwarded),

    disposed_total:
      num(r.disposed_total ?? r.disposedTotal),

    parked:
      num(r.parked),

    merged:
      num(r.merged),

    pendency_0_7_days:
      num(r.pendency_0_7_days ?? r.pendency0to7),

    pendency_8_15_days:
      num(r.pendency_8_15_days ?? r.pendency8to15),

    pendency_16_30_days:
      num(r.pendency_16_30_days ?? r.pendency16to30),

    pendency_31_60_days:
      num(r.pendency_31_60_days ?? r.pendency31to60),

    pendency_over_60_days:
      num(r.pendency_over_60_days ?? r.pendencyOver60),

    total_pendency:
      num(r.total_pendency ?? r.totalPendency),

    average_pending_days:
      num(r.average_pending_days ?? r.averagePendingDays)
  };
}


/* =========================
   NORMALIZE DISTRICT TOTAL
========================= */

function normalizeTotal(t) {

  return {

    opening_balance:
      num(t.opening_balance ?? t.openingBalance),

    created:
      num(t.created),

    received:
      num(t.received),

    disposed_closed:
      num(t.disposed_closed ?? t.closed),

    disposed_forwarded:
      num(t.disposed_forwarded ?? t.forwarded),

    disposed_total:
      num(t.disposed_total ?? t.disposedTotal),

    parked:
      num(t.parked),

    merged:
      num(t.merged),

    pendency_0_7_days:
      num(t.pendency_0_7_days ?? t.pendency0to7),

    pendency_8_15_days:
      num(t.pendency_8_15_days ?? t.pendency8to15),

    pendency_16_30_days:
      num(t.pendency_16_30_days ?? t.pendency16to30),

    pendency_31_60_days:
      num(t.pendency_31_60_days ?? t.pendency31to60),

    pendency_over_60_days:
      num(t.pendency_over_60_days ?? t.pendencyOver60),

    total_pendency:
      num(t.total_pendency ?? t.totalPendency),

    average_pending_days:
      num(t.average_pending_days ?? t.averagePendingDays)
  };
}


/* =========================
   SCORE
========================= */

function score(r) {

  const available =
    num(r.opening_balance) +
    num(r.created) +
    num(r.received);

  const disposed =
    num(r.disposed_total);

  const pend =
    num(r.total_pendency);

  const disposalRate =
    available > 0
      ? Math.min(100, disposed / available * 100)
      : 0;

  const pendPenalty =
    Math.min(
      35,
      pend / Math.max(1, disposed + pend) * 100
    );

  return Math.max(
    0,
    Math.min(
      100,
      disposalRate * 0.8 +
      (100 - pendPenalty) * 0.2
    )
  );
}


/* =========================
   RECORDS
========================= */

function enriched() {

  if (!DATA || !Array.isArray(DATA.records)) {
    return [];
  }

  return DATA.records.map(r => {

    const x = normalizeRecord(r);

    return {
      ...x,
      score: score(x)
    };

  });
}


/* =========================
   AVERAGE PENDING
========================= */

function avgWeighted(records) {

  const totalPend =
    records.reduce(
      (a, r) => a + num(r.total_pendency),
      0
    );

  if (!totalPend) return 0;

  return records.reduce(
    (a, r) =>
      a +
      num(r.average_pending_days) *
      num(r.total_pendency),
    0
  ) / totalPend;
}


/* =========================
   NAME
========================= */

function nameOf(r) {

  return (
    r.unit_designation ||
    r.employee ||
    "Unknown"
  );
}


/* =========================
   TABS
========================= */

function setupTabs() {

  document
    .querySelectorAll(".tab")
    .forEach(btn => {

      btn.addEventListener("click", () => {

        document
          .querySelectorAll(".tab")
          .forEach(b =>
            b.classList.remove("active")
          );

        document
          .querySelectorAll(".section")
          .forEach(s =>
            s.classList.remove("active-section")
          );

        btn.classList.add("active");

        const target =
          $(btn.dataset.target);

        if (target) {
          target.classList.add(
            "active-section"
          );
        }

      });

    });
}


/* =========================
   MAIN RENDER
========================= */

function render() {

  const rows = enriched();

  const t =
    normalizeTotal(
      DATA.district_total || {}
    );

  if ($("period")) {
    $("period").textContent =
      "Reporting Period: " +
      (DATA.reporting_period ||
       DATA.period ||
       "");
  }

  if ($("unitCount")) {
    $("unitCount").textContent =
      fmt(rows.length);
  }

  if ($("disposedHero")) {
    $("disposedHero").textContent =
      fmt(t.disposed_total);
  }

  if ($("pendencyHero")) {
    $("pendencyHero").textContent =
      fmt(t.total_pendency);
  }

  if ($("disposedTotal")) {
    $("disposedTotal").textContent =
      fmt(t.disposed_total);
  }

  if ($("receivedTotal")) {
    $("receivedTotal").textContent =
      fmt(
        t.created +
        t.received
      );
  }

  if ($("pendencyTotal")) {
    $("pendencyTotal").textContent =
      fmt(t.total_pendency);
  }

  if ($("avgPending")) {

    const avg =
      t.average_pending_days ||
      avgWeighted(rows);

    $("avgPending").textContent =
      Number(avg).toFixed(2);
  }

  if ($("chartNote")) {
    $("chartNote").textContent =
      rows.length + " records";
  }

  renderRankings(rows);
  renderChart(rows);
  renderPerformance(rows);
  renderTrends(t);
  renderTable(rows);
  renderReport(t);

  if ($("lastLoaded")) {
    $("lastLoaded").textContent =
      "Last loaded: " +
      new Date().toLocaleString("en-IN");
  }
}


/* =========================
   RANKINGS
========================= */

function renderRankings(rows) {

  const sorted =
    [...rows].sort(
      (a, b) => b.score - a.score
    );

  const item =
    (r, i, bottom = false) => {

      return `
        <div class="rank-item">

          <div class="rank-num">
            ${
              bottom
                ? "#" + (rows.length - i)
                : "🏅 " + (i + 1)
            }
          </div>

          <div>
            <div class="rank-name">
              ${esc(nameOf(r))}
            </div>

            <div class="rank-meta">
              ${esc(r.employee)}
            </div>
          </div>

          <span class="badge ${bottom ? "red" : ""}">
            ${
              bottom
                ? "Pend. " +
                  fmt(r.total_pendency)
                : "Score"
            }
          </span>

          <div class="score">
            ${r.score.toFixed(1)}
          </div>

        </div>
      `;
    };

  if ($("topList")) {

    $("topList").innerHTML =
      sorted
        .slice(0, 5)
        .map((r, i) =>
          item(r, i)
        )
        .join("");
  }

  if ($("bottomList")) {

    const bottom =
      sorted
        .slice(-5)
        .reverse();

    $("bottomList").innerHTML =
      bottom
        .map((r, i) =>
          item(
            r,
            i,
            true
          )
        )
        .join("");
  }
}


/* =========================
   CHART
========================= */

function renderChart(rows) {

  if (!$("barChart")) return;

  const sorted =
    [...rows].sort(
      (a, b) => b.score - a.score
    );

  const max =
    Math.max(
      ...sorted.map(r => r.score),
      1
    );

  $("barChart").innerHTML =
    sorted
      .map(r => {

        const h =
          Math.max(
            8,
            r.score / max * 220
          );

        return `
          <div
            class="bar"
            style="height:${h}px"
            title="${esc(nameOf(r))}: ${r.score.toFixed(1)}"
          >
            <span>
              ${r.score.toFixed(0)}
            </span>

            <label>
              ${esc(nameOf(r))}
            </label>
          </div>
        `;

      })
      .join("");
}


/* =========================
   PERFORMANCE
========================= */

function renderPerformance(rows) {

  if (!$("performanceGrid")) return;

  const sorted =
    [...rows].sort(
      (a, b) => b.score - a.score
    );

  $("performanceGrid").innerHTML =
    sorted
      .map(r => {

        const available =
          num(r.opening_balance) +
          num(r.created) +
          num(r.received);

        const rate =
          available
            ? Math.min(
                100,
                num(r.disposed_total) /
                available *
                100
              )
            : 0;

        return `
          <div class="perf">

            <div class="perf-head">

              <span>
                ${esc(nameOf(r))}
              </span>

              <b>
                ${r.score.toFixed(1)}
              </b>

            </div>

            <div class="progress">
              <i style="width:${rate}%"></i>
            </div>

            <small>
              Disposal rate:
              ${rate.toFixed(1)}%
              • Pending:
              ${fmt(r.total_pendency)}
              • Avg days:
              ${num(r.average_pending_days).toFixed(2)}
            </small>

          </div>
        `;

      })
      .join("");
}


/* =========================
   SUMMARY BARS
========================= */

function barRows(items) {

  const max =
    Math.max(
      ...items.map(x => x.v),
      1
    );

  return items
    .map(x => {

      return `
        <div class="summary-row">

          <span>
            ${x.k}
          </span>

          <div class="track">

            <i
              style="
                width:${Math.max(
                  2,
                  x.v / max * 100
                )}%
              "
            ></i>

          </div>

          <strong>
            ${fmt(x.v)}
          </strong>

        </div>
      `;

    })
    .join("");
}


/* =========================
   TRENDS
========================= */

function renderTrends(t) {

  if ($("movementBars")) {

    $("movementBars").innerHTML =
      barRows([

        {
          k: "Opening Balance",
          v: t.opening_balance
        },

        {
          k: "Created",
          v: t.created
        },

        {
          k: "Received",
          v: t.received
        },

        {
          k: "Disposed",
          v: t.disposed_total
        },

        {
          k: "Parked",
          v: t.parked
        },

        {
          k: "Merged",
          v: t.merged
        }

      ]);
  }

  if ($("pendencyBars")) {

    $("pendencyBars").innerHTML =
      barRows([

        {
          k: "0–7 Days",
          v: t.pendency_0_7_days
        },

        {
          k: "8–15 Days",
          v: t.pendency_8_15_days
        },

        {
          k: "16–30 Days",
          v: t.pendency_16_30_days
        },

        {
          k: "31–60 Days",
          v: t.pendency_31_60_days
        },

        {
          k: ">60 Days",
          v: t.pendency_over_60_days
        }

      ]);
  }
}


/* =========================
   DETAIL TABLE
========================= */

function renderTable(
  rows,
  filter = ""
) {

  if (!$("dataTable")) return;

  const q =
    filter
      .toLowerCase()
      .trim();

  const list =
    rows
      .filter(r => {

        const text =
          (
            r.employee +
            " " +
            r.unit_designation
          ).toLowerCase();

        return text.includes(q);
      })
      .sort(
        (a, b) =>
          b.score - a.score
      );

  $("dataTable").innerHTML =
    list.length

      ? list.map((r, i) => {

          return `
            <tr>

              <td>
                ${i + 1}
              </td>

              <td>
                <b>
                  ${esc(r.employee)}
                </b>
              </td>

              <td>
                ${esc(r.unit_designation)}
              </td>

              <td>
                ${fmt(r.disposed_total)}
              </td>

              <td>
                ${fmt(r.total_pendency)}
              </td>

              <td>
                ${num(
                  r.average_pending_days
                ).toFixed(2)}
              </td>

              <td class="score-cell">
                ${r.score.toFixed(1)}
              </td>

            </tr>
          `;

        }).join("")

      : `
        <tr>
          <td
            colspan="7"
            style="
              text-align:center;
              padding:25px
            "
          >
            No matching record found.
          </td>
        </tr>
      `;
}


/* =========================
   REPORT
========================= */

function renderReport(t) {

  if (!$("reportBox")) return;

  const items = [

    [
      "Opening Balance",
      t.opening_balance
    ],

    [
      "Created",
      t.created
    ],

    [
      "Received",
      t.received
    ],

    [
      "Disposed — Closed",
      t.disposed_closed
    ],

    [
      "Disposed — Forwarded",
      t.disposed_forwarded
    ],

    [
      "Total Disposed",
      t.disposed_total
    ],

    [
      "Parked",
      t.parked
    ],

    [
      "Merged",
      t.merged
    ],

    [
      "Total Pendency",
      t.total_pendency
    ],

    [
      "0–7 Days",
      t.pendency_0_7_days
    ],

    [
      "8–15 Days",
      t.pendency_8_15_days
    ],

    [
      "16–30 Days",
      t.pendency_16_30_days
    ],

    [
      "31–60 Days",
      t.pendency_31_60_days
    ],

    [
      ">60 Days",
      t.pendency_over_60_days
    ],

    [
      "Average Pending Days",
      num(
        t.average_pending_days
      ).toFixed(2)
    ]

  ];

  $("reportBox").innerHTML = `
    <div class="report-grid">

      ${
        items.map(x => {

          const value =
            typeof x[1] === "number"
              ? fmt(x[1])
              : x[1];

          return `
            <div class="report-item">

              <span>
                ${x[0]}
              </span>

              <strong>
                ${value}
              </strong>

            </div>
          `;

        }).join("")
      }

    </div>
  `;
}


/* =========================
   LOAD DATA.JSON
========================= */

async function load() {

  try {

    console.log(
      "Loading Chittoor E-Office data.json..."
    );

    const url =
      "data.json?cache=" +
      Date.now();

    const res =
      await fetch(url, {
        cache: "no-store"
      });

    if (!res.ok) {

      throw new Error(
        "data.json could not be loaded. HTTP " +
        res.status
      );
    }

    const json =
      await res.json();

    if (!json) {

      throw new Error(
        "data.json is empty."
      );
    }

    DATA = json;

    console.log(
      "data.json loaded successfully",
      DATA
    );

    render();

  }

  catch (e) {

    console.error(
      "Dashboard loading error:",
      e
    );

    document.body.innerHTML = `

      <div
        style="
          font-family:Arial;
          padding:50px;
          max-width:900px;
          margin:auto;
        "
      >

        <h2>
          Dashboard data could not be loaded
        </h2>

        <p>
          ${esc(e.message)}
        </p>

        <hr>

        <p>
          Please make sure these files are
          in the same GitHub root folder:
        </p>

        <ul>

          <li>
            <b>index.html</b>
          </li>

          <li>
            <b>script.js</b>
          </li>

          <li>
            <b>style.css</b>
          </li>

          <li>
            <b>data.json</b>
          </li>

        </ul>

        <p>
          The dashboard is configured to load:
          <b>data.json</b>
        </p>

      </div>

    `;
  }
}


/* =========================
   START
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupTabs();

    if ($("search")) {

      $("search").addEventListener(
        "input",
        e => {

          renderTable(
            enriched(),
            e.target.value
          );

        }
      );
    }

    if ($("refresh")) {

      $("refresh").addEventListener(
        "click",
        load
      );
    }

    load();

  }
);
