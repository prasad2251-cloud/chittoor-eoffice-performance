/* ============================================================
   CHITTOOR POLICE - E-OFFICE PERFORMANCE DASHBOARD
   FINAL STABLE SCRIPT
   ============================================================ */

let DATA = null;

const $ = id => document.getElementById(id);

const fmt = n =>
  Number(n || 0).toLocaleString("en-IN");

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );


/* ============================================================
   PERFORMANCE SCORE
   ============================================================ */

function score(r) {

  const available =
    (Number(r.opening_balance) || 0) +
    (Number(r.created) || 0) +
    (Number(r.received) || 0);

  const disposed =
    Number(r.disposed_total) || 0;

  const pend =
    Number(r.total_pendency) || 0;

  const disposalRate =
    available > 0
      ? Math.min(
          100,
          disposed / available * 100
        )
      : 0;

  const pendPenalty =
    Math.min(
      35,
      pend /
      Math.max(
        1,
        disposed + pend
      ) * 100
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


/* ============================================================
   ENRICH RECORDS
   ============================================================ */

function enriched() {

  if (
    !DATA ||
    !Array.isArray(DATA.records)
  ) {
    return [];
  }

  return DATA.records.map(r => ({
    ...r,
    score: score(r)
  }));
}


/* ============================================================
   ⭐ PERMANENT DISTRICT AVERAGE PENDING DAYS
   BUCKET-WEIGHTED CALCULATION
   ============================================================ */

function calculateDistrictAvgPending(t) {

  const b0_7 =
    Number(t.pendency_0_7_days) || 0;

  const b8_15 =
    Number(t.pendency_8_15_days) || 0;

  const b16_30 =
    Number(t.pendency_16_30_days) || 0;

  const b31_60 =
    Number(t.pendency_31_60_days) || 0;

  const b60plus =
    Number(t.pendency_over_60_days) || 0;


  const total =
    b0_7 +
    b8_15 +
    b16_30 +
    b31_60 +
    b60plus;


  if (total === 0) {
    return 0;
  }


  /*
     Bucket midpoints:

     0–7 Days     = 3.5
     8–15 Days    = 11.5
     16–30 Days   = 23
     31–60 Days   = 45
     >60 Days     = 75

     IMPORTANT:
     Do NOT use t.average_pending_days.
     The source JSON contains an incorrect
     aggregate value for this dashboard.
  */

  const weightedDays =

    (b0_7 * 3.5) +

    (b8_15 * 11.5) +

    (b16_30 * 23) +

    (b31_60 * 45) +

    (b60plus * 75);


  return weightedDays / total;
}


/* ============================================================
   NAME
   ============================================================ */

function nameOf(r) {

  return (
    r.unit_designation ||
    r.employee ||
    "Unknown"
  );
}


/* ============================================================
   TABS
   ============================================================ */

function setupTabs() {

  document
    .querySelectorAll(".tab")
    .forEach(btn => {

      btn.addEventListener(
        "click",
        () => {

          const target =
            btn.getAttribute(
              "data-target"
            );

          if (!target) return;


          document
            .querySelectorAll(".tab")
            .forEach(b =>
              b.classList.remove(
                "active"
              )
            );


          document
            .querySelectorAll(".section")
            .forEach(s =>
              s.classList.remove(
                "active-section"
              )
            );


          btn.classList.add("active");


          const section =
            $(target);

          if (section) {

            section.classList.add(
              "active-section"
            );

          }

        }
      );

    });

}


/* ============================================================
   MAIN RENDER
   ============================================================ */

function render() {

  if (!DATA) return;


  const rows =
    enriched();

  const t =
    DATA.district_total || {};


  /* ----------------------------------------------------------
     HEADER
     ---------------------------------------------------------- */

  if ($("period")) {

    $("period").textContent =
      "Reporting Period: " +
      (
        DATA.reporting_period ||
        ""
      );

  }


  if ($("unitCount")) {

    $("unitCount").textContent =
      fmt(
        DATA.record_count ||
        rows.length
      );

  }


  if ($("disposedHero")) {

    $("disposedHero").textContent =
      fmt(
        t.disposed_total
      );

  }


  if ($("pendencyHero")) {

    $("pendencyHero").textContent =
      fmt(
        t.total_pendency
      );

  }


  /* ----------------------------------------------------------
     MAIN CARDS
     ---------------------------------------------------------- */

  if ($("disposedTotal")) {

    $("disposedTotal").textContent =
      fmt(
        t.disposed_total
      );

  }


  if ($("receivedTotal")) {

    $("receivedTotal").textContent =
      fmt(
        (Number(t.created) || 0) +
        (Number(t.received) || 0)
      );

  }


  if ($("pendencyTotal")) {

    $("pendencyTotal").textContent =
      fmt(
        t.total_pendency
      );

  }


  /* ⭐ CORRECT AVG PENDING DAYS */

  if ($("avgPending")) {

    $("avgPending").textContent =
      calculateDistrictAvgPending(t)
        .toFixed(2);

  }


  if ($("chartNote")) {

    $("chartNote").textContent =
      rows.length +
      " records";

  }


  /* ----------------------------------------------------------
     RENDER SECTIONS
     ---------------------------------------------------------- */

  renderRankings(rows);

  renderChart(rows);

  renderPerformance(rows);

  renderTrends(t);

  renderEmployeeDetail(rows);

  renderOrganisation(rows);

  renderReports(t);

  updateLastLoaded();

}


/* ============================================================
   RANKINGS
   ============================================================ */

function renderRankings(rows) {

  const sorted =
    [...rows].sort(
      (a, b) =>
        b.score - a.score
    );


  function item(
    r,
    i,
    bottom = false
  ) {

    return `

      <div class="rank-item">

        <div class="rank-num">

          ${
            bottom
              ? "#" +
                (
                  rows.length -
                  i
                )
              : "🏅 " +
                (
                  i + 1
                )
          }

        </div>


        <div>

          <div class="rank-name">

            ${esc(
              nameOf(r)
            )}

          </div>


          <div class="rank-meta">

            ${esc(
              r.employee
            )}

          </div>

        </div>


        <span
          class="badge ${
            bottom
              ? "red"
              : ""
          }">

          ${
            bottom
              ? "Pend. " +
                fmt(
                  r.total_pendency
                )
              : "Score"
          }

        </span>


        <div class="score">

          ${r.score.toFixed(1)}

        </div>

      </div>

    `;

  }


  if ($("topList")) {

    $("topList").innerHTML =
      sorted
        .slice(0, 5)
        .map(
          (r, i) =>
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
        .map(
          (r, i) =>
            item(
              r,
              i,
              true
            )
        )
        .join("");

  }

}


/* ============================================================
   BAR CHART
   ============================================================ */

function renderChart(rows) {

  const el =
    $("barChart");

  if (!el) return;


  const sorted =
    [...rows].sort(
      (a, b) =>
        b.score - a.score
    );


  const max =
    Math.max(
      ...sorted.map(
        r => r.score
      ),
      1
    );


  el.innerHTML =
    sorted
      .map(r => {

        const h =
          Math.max(
            8,
            r.score /
            max *
            220
          );


        return `

          <div
            class="bar"
            style="
              height:${h}px
            "
            title="${
              esc(nameOf(r))
            }: ${
              r.score.toFixed(1)
            }">

            <span>
              ${
                r.score.toFixed(0)
              }
            </span>

            <label>
              ${
                esc(
                  nameOf(r)
                )
              }
            </label>

          </div>

        `;

      })
      .join("");

}


/* ============================================================
   PERFORMANCE
   ============================================================ */

function renderPerformance(rows) {

  const el =
    $("performanceGrid");

  if (!el) return;


  const sorted =
    [...rows].sort(
      (a, b) =>
        b.score - a.score
    );


  el.innerHTML =
    sorted
      .map(r => {

        const available =

          (Number(
            r.opening_balance
          ) || 0) +

          (Number(
            r.created
          ) || 0) +

          (Number(
            r.received
          ) || 0);


        const rate =
          available
            ? Math.min(
                100,
                Number(
                  r.disposed_total ||
                  0
                ) /
                available *
                100
              )
            : 0;


        return `

          <div class="perf">

            <div
              class="perf-head">

              <span>

                ${
                  esc(
                    nameOf(r)
                  )
                }

              </span>

              <b>

                ${
                  r.score.toFixed(1)
                }

              </b>

            </div>


            <div class="progress">

              <i
                style="
                  width:${rate}%
                ">
              </i>

            </div>


            <small>

              Disposal rate:
              ${
                rate.toFixed(1)
              }%

              • Pending:
              ${
                fmt(
                  r.total_pendency
                )
              }

              • Avg days:
              ${
                Number(
                  r.average_pending_days ||
                  0
                ).toFixed(2)
              }

            </small>

          </div>

        `;

      })
      .join("");

}


/* ============================================================
   TREND BAR ROWS
   ============================================================ */

function barRows(items) {

  const max =
    Math.max(
      ...items.map(
        x => x.v
      ),
      1
    );


  return items
    .map(
      x => `

        <div
          class="summary-row">

          <span>
            ${
              esc(x.k)
            }
          </span>


          <div
            class="track">

            <i
              style="
                width:${
                  Math.max(
                    2,
                    x.v /
                    max *
                    100
                  )
                }%
              ">
            </i>

          </div>


          <strong>

            ${
              fmt(x.v)
            }

          </strong>

        </div>

      `
    )
    .join("");

}


/* ============================================================
   TRENDS
   ============================================================ */

function renderTrends(t) {

  if ($("movementBars")) {

    $("movementBars").innerHTML =
      barRows([

        {
          k:
            "Opening Balance",

          v:
            Number(
              t.opening_balance
            ) || 0
        },

        {
          k:
            "Created",

          v:
            Number(
              t.created
            ) || 0
        },

        {
          k:
            "Received",

          v:
            Number(
              t.received
            ) || 0
        },

        {
          k:
            "Disposed",

          v:
            Number(
              t.disposed_total
            ) || 0
        },

        {
          k:
            "Parked",

          v:
            Number(
              t.parked
            ) || 0
        },

        {
          k:
            "Merged",

          v:
            Number(
              t.merged
            ) || 0
        }

      ]);

  }


  if ($("pendencyBars")) {

    $("pendencyBars").innerHTML =
      barRows([

        {
          k:
            "0–7 Days",

          v:
            Number(
              t.pendency_0_7_days
            ) || 0
        },

        {
          k:
            "8–15 Days",

          v:
            Number(
              t.pendency_8_15_days
            ) || 0
        },

        {
          k:
            "16–30 Days",

          v:
            Number(
              t.pendency_16_30_days
            ) || 0
        },

        {
          k:
            "31–60 Days",

          v:
            Number(
              t.pendency_31_60_days
            ) || 0
        },

        {
          k:
            ">60 Days",

          v:
            Number(
              t.pendency_over_60_days
            ) || 0
        }

      ]);

  }

}


/* ============================================================
   ⭐ EMPLOYEE / UNIT DETAIL
   ============================================================ */

function renderEmployeeDetail(
  rows,
  filter = ""
) {

  const tbody =
    $("detailTable");

  if (!tbody) return;


  const q =
    String(filter || "")
      .toLowerCase()
      .trim();


  const list =
    rows.filter(r => {

      const searchText = [

        r.employee,

        r.unit_designation

      ]
        .join(" ")
        .toLowerCase();


      return searchText
        .includes(q);

    });


  if (!list.length) {

    tbody.innerHTML = `

      <tr>

        <td
          colspan="14"
          style="
            text-align:center;
            padding:25px;
            color:#64748b;
            font-weight:600;
          ">

          No matching employee /
          unit record found.

        </td>

      </tr>

    `;

    return;
  }


  tbody.innerHTML =
    list
      .map(
        (r, i) => `

          <tr>

            <td>
              ${i + 1}
            </td>


            <td>

              <strong>
                ${
                  esc(
                    r.employee
                  )
                }
              </strong>

            </td>


            <td>

              ${
                esc(
                  r.unit_designation
                )
              }

            </td>


            <td>
              ${
                fmt(
                  r.opening_balance
                )
              }
            </td>


            <td>
              ${
                fmt(
                  r.created
                )
              }
            </td>


            <td>
              ${
                fmt(
                  r.received
                )
              }
            </td>


            <td>
              ${
                fmt(
                  r.disposed_closed
                )
              }
            </td>


            <td>
              ${
                fmt(
                  r.disposed_forwarded
                )
              }
            </td>


            <td>

              <strong>
                ${
                  fmt(
                    r.disposed_total
                  )
                }
              </strong>

            </td>


            <td>
              ${
                fmt(
                  r.parked
                )
              }
            </td>


            <td>
              ${
                fmt(
                  r.merged
                )
              }
            </td>


            <td>

              <strong>
                ${
                  fmt(
                    r.total_pendency
                  )
                }
              </strong>

            </td>


            <td>

              ${
                Number(
                  r.average_pending_days ||
                  0
                ).toFixed(2)
              }

            </td>


            <td>

              ${
                r.score.toFixed(1)
              }

            </td>

          </tr>

        `
      )
      .join("");

}


/* ============================================================
   ORGANISATION
   ============================================================ */

function renderOrganisation(rows) {

  const container =
    $("groupedEoffice");

  if (!container) return;


  if ($("tableCount")) {

    $("tableCount").textContent =
      rows.length +
      " records";

  }


  if (!rows.length) {

    container.innerHTML =
      "";

    return;

  }


  const groups = {};


  rows.forEach(r => {

    const key =
      r.unit_designation ||
      "Other";


    if (!groups[key]) {

      groups[key] = [];

    }


    groups[key].push(r);

  });


  let html = "";


  Object
    .keys(groups)
    .sort()
    .forEach(key => {

      const group =
        groups[key];


      const disposed =
        group.reduce(
          (a, r) =>
            a +
            Number(
              r.disposed_total ||
              0
            ),
          0
        );


      const pending =
        group.reduce(
          (a, r) =>
            a +
            Number(
              r.total_pendency ||
              0
            ),
          0
        );


      html += `

        <div class="org-row">

          <div
            class="org-name">

            <strong>

              ${
                esc(key)
              }

            </strong>

            <small>

              ${
                group.length
              }
              record(s)

            </small>

          </div>


          <div
            class="org-number">

            <span>
              Disposed
            </span>

            <strong>

              ${
                fmt(
                  disposed
                )
              }

            </strong>

          </div>


          <div
            class="org-number">

            <span>
              Pending
            </span>

            <strong>

              ${
                fmt(
                  pending
                )
              }

            </strong>

          </div>

        </div>

      `;

    });


  container.innerHTML =
    html;

}


/* ============================================================
   ⭐ REPORTS
   ============================================================ */

function renderReports(t) {

  const el =
    $("reportCards");

  if (!el) return;


  const avgDays =
    calculateDistrictAvgPending(t);


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
      avgDays.toFixed(2)
    ]

  ];


  el.innerHTML =
    items
      .map(
        x => `

          <article>

            <span>
              ${
                esc(x[0])
              }
            </span>

            <strong>

              ${
                typeof x[1] ===
                "number"

                  ? fmt(x[1])

                  : x[1]

              }

            </strong>

          </article>

        `
      )
      .join("");

}


/* ============================================================
   SEARCH - ORGANISATION
   ============================================================ */

function setupRankSearch(rows) {

  const input =
    $("searchRank");

  if (!input) return;


  input.addEventListener(
    "input",
    e => {

      const q =
        e.target.value
          .toLowerCase()
          .trim();


      const filtered =
        rows.filter(r =>
          (
            r.employee +
            " " +
            r.unit_designation
          )
            .toLowerCase()
            .includes(q)
        );


      renderOrganisation(
        filtered
      );

    }
  );

}


/* ============================================================
   SEARCH - EMPLOYEE DETAIL
   ============================================================ */

function setupDetailSearch(rows) {

  const input =
    $("searchDetail");

  if (!input) return;


  input.addEventListener(
    "input",
    e => {

      renderEmployeeDetail(
        rows,
        e.target.value
      );

    }
  );

}


/* ============================================================
   REFRESH
   ============================================================ */

function setupRefresh() {

  const btn =
    $("refresh");

  if (!btn) return;


  btn.addEventListener(
    "click",
    () => {

      load();

    }
  );

}


/* ============================================================
   LOAD DATA
   ============================================================ */

async function load() {

  try {

    const response =
      await fetch(
        "data.json?v=" +
        Date.now(),
        {
          cache:
            "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "data.json could not be loaded. HTTP " +
        response.status
      );

    }


    DATA =
      await response.json();


    console.log(
      "Chittoor E-Office DATA loaded:",
      DATA
    );


    console.log(
      "Employee records:",
      DATA.records
        ? DATA.records.length
        : 0
    );


    render();


  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );


    if ($("period")) {

      $("period").textContent =
        "Data loading error";

    }


    if ($("detailTable")) {

      $("detailTable").innerHTML = `

        <tr>

          <td
            colspan="14"
            style="
              text-align:center;
              padding:30px;
              color:#b91c1c;
            ">

            Unable to load employee data.

            <br><br>

            <small>

              ${
                esc(
                  error.message
                )
              }

            </small>

          </td>

        </tr>

      `;

    }

  }

}


/* ============================================================
   LAST LOADED
   ============================================================ */

function updateLastLoaded() {

  if (!$("lastLoaded")) return;


  $("lastLoaded").textContent =
    "Last loaded: " +
    new Date()
      .toLocaleString("en-IN");

}


/* ============================================================
   START DASHBOARD
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupTabs();

    load();

  }
);
