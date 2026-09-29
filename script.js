let DATA = null;

let sortColumns = [];

const $ = id => document.getElementById(id);


function fmt(n) {

  return Number(n || 0)
    .toLocaleString("en-IN");

}


function esc(s) {

  return String(s ?? "")
    .replace(
      /[&<>"']/g,
      m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m])
    );

}


/* =========================
   SCORE
========================= */

function score(r) {

  const available =
    Number(r.openingBalance || 0) +
    Number(r.created || 0) +
    Number(r.received || 0);

  const disposed =
    Number(r.disposedTotal || 0);

  const pend =
    Number(r.totalPendency || 0);

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


/* =========================
   DATA
========================= */

function enriched() {

  return DATA.records.map(r => ({
    ...r,
    score: score(r)
  }));

}


/* =========================
   TOTALS
========================= */

function totals(rows) {

  const total = field =>
    rows.reduce(
      (a, r) =>
        a + Number(r[field] || 0),
      0
    );

  return {

    openingBalance:
      total("openingBalance"),

    created:
      total("created"),

    received:
      total("received"),

    closed:
      total("closed"),

    forwarded:
      total("forwarded"),

    disposedTotal:
      total("disposedTotal"),

    parked:
      total("parked"),

    merged:
      total("merged"),

    pendency0to7:
      total("pendency0to7"),

    pendency8to15:
      total("pendency8to15"),

    pendency16to30:
      total("pendency16to30"),

    pendency31to60:
      total("pendency31to60"),

    pendencyOver60:
      total("pendencyOver60"),

    totalPendency:
      total("totalPendency")

  };

}


/* =========================
   AVG PENDING
========================= */

function avgWeighted(rows) {

  const totalPend =
    rows.reduce(
      (a, r) =>
        a + Number(r.totalPendency || 0),
      0
    );

  if (!totalPend)
    return 0;

  return rows.reduce(
    (a, r) =>
      a +
      Number(r.averagePendingDays || 0) *
      Number(r.totalPendency || 0),
    0
  ) / totalPend;

}


/* =========================
   NAME
========================= */

function nameOf(r) {

  return (
    r.employee ||
    r.designation ||
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

      btn.addEventListener(
        "click",
        () => {

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

          const target =
            document.getElementById(
              btn.dataset.target
            );

          if (target)
            target.classList.add(
              "active-section"
            );

        }
      );

    });

}


/* =========================
   RENDER
========================= */

function render() {

  const rows =
    enriched();

  const t =
    totals(rows);


  $("period").textContent =
    "Reporting Period: " +
    DATA.period;


  $("unitCount").textContent =
    fmt(rows.length);


  $("disposedHero").textContent =
    fmt(t.disposedTotal);


  $("pendencyHero").textContent =
    fmt(t.totalPendency);


  $("disposedTotal").textContent =
    fmt(t.disposedTotal);


  $("receivedTotal").textContent =
    fmt(
      t.created +
      t.received
    );


  $("pendencyTotal").textContent =
    fmt(t.totalPendency);


  $("avgPending").textContent =
    avgWeighted(rows)
      .toFixed(2);


  $("chartNote").textContent =
    rows.length +
    " records";


  $("tableCount").textContent =
    rows.length +
    " records";


  renderRankings(rows);

  renderChart(rows);

  renderPerformance(rows);

  renderTrends(t);

  renderTable(rows);

  renderReport(t);


  $("lastLoaded").textContent =
    "Last loaded: " +
    new Date()
      .toLocaleString("en-IN");


  setupSorting();

}


/* =========================
   RANKINGS
========================= */

function renderRankings(rows) {

  const sorted =
    [...rows].sort(
      (a, b) =>
        b.score -
        a.score
    );


  function item(r, i, bottom) {

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
            ${esc(r.designation)}
          </div>

        </div>

        <span
          class="badge ${
            bottom ? "red" : ""
          }"
        >
          ${
            bottom
              ? "Pend. " +
                fmt(r.totalPendency)
              : "Score"
          }
        </span>

        <div class="score">
          ${r.score.toFixed(1)}
        </div>

      </div>

    `;

  }


  $("topList").innerHTML =
    sorted
      .slice(0, 5)
      .map(
        (r, i) =>
          item(r, i, false)
      )
      .join("");


  $("bottomList").innerHTML =
    sorted
      .slice(-5)
      .reverse()
      .map(
        (r, i) =>
          item(r, i, true)
      )
      .join("");

}


/* =========================
   CHART
========================= */

function renderChart(rows) {

  const sorted =
    [...rows].sort(
      (a, b) =>
        b.score -
        a.score
    );


  const max =
    Math.max(
      ...sorted.map(
        r => r.score
      ),
      1
    );


  $("barChart").innerHTML =
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
            style="height:${h}px"
            title="${esc(
              nameOf(r)
            )}: ${r.score.toFixed(1)}"
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

  const sorted =
    [...rows].sort(
      (a, b) =>
        b.score -
        a.score
    );


  $("performanceGrid").innerHTML =
    sorted
      .map(r => {

        const available =
          Number(
            r.openingBalance || 0
          ) +
          Number(
            r.created || 0
          ) +
          Number(
            r.received || 0
          );


        const rate =
          available
            ? Math.min(
                100,
                Number(
                  r.disposedTotal || 0
                ) /
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

              <i
                style="width:${rate}%"
              ></i>

            </div>

            <small>
              Disposal:
              ${rate.toFixed(1)}%
              • Pending:
              ${fmt(r.totalPendency)}
              • Avg days:
              ${Number(
                r.averagePendingDays || 0
              ).toFixed(2)}
            </small>

          </div>

        `;

      })
      .join("");

}


/* =========================
   SUMMARY
========================= */

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

        <div class="summary-row">

          <span>
            ${x.k}
          </span>

          <div class="track">

            <i
              style="width:${
                Math.max(
                  2,
                  x.v /
                  max *
                  100
                )
              }%"
            ></i>

          </div>

          <strong>
            ${fmt(x.v)}
          </strong>

        </div>

      `
    )
    .join("");

}


function renderTrends(t) {

  $("movementBars").innerHTML =
    barRows([

      {
        k: "Opening Balance",
        v: t.openingBalance
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
        v: t.disposedTotal
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


  $("pendencyBars").innerHTML =
    barRows([

      {
        k: "0–7 Days",
        v: t.pendency0to7
      },

      {
        k: "8–15 Days",
        v: t.pendency8to15
      },

      {
        k: "16–30 Days",
        v: t.pendency16to30
      },

      {
        k: "31–60 Days",
        v: t.pendency31to60
      },

      {
        k: ">60 Days",
        v: t.pendencyOver60
      }

    ]);

}


/* =========================
   TABLE
========================= */

function tableRows(rows) {

  return rows
    .map(
      (r, i) => `

        <tr>

          <td>${i + 1}</td>

          <td>
            <b>
              ${esc(r.employee)}
            </b>
          </td>

          <td>
            ${esc(r.designation)}
          </td>

          <td>${fmt(r.openingBalance)}</td>

          <td>${fmt(r.created)}</td>

          <td>${fmt(r.received)}</td>

          <td>${fmt(r.closed)}</td>

          <td>${fmt(r.forwarded)}</td>

          <td class="disposed-cell">
            ${fmt(r.disposedTotal)}
          </td>

          <td>${fmt(r.parked)}</td>

          <td>${fmt(r.merged)}</td>

          <td>${fmt(r.pendency0to7)}</td>

          <td>${fmt(r.pendency8to15)}</td>

          <td>${fmt(r.pendency16to30)}</td>

          <td>${fmt(r.pendency31to60)}</td>

          <td>${fmt(r.pendencyOver60)}</td>

          <td class="pendency-cell">
            ${fmt(r.totalPendency)}
          </td>

          <td>
            ${Number(
              r.averagePendingDays || 0
            ).toFixed(2)}
          </td>

          <td class="score-cell">
            ${r.score.toFixed(1)}
          </td>

        </tr>

      `
    )
    .join("");

}


/* =========================
   TABLE FILTER
========================= */

function renderTable(
  rows,
  filter = ""
) {

  const q =
    String(filter)
      .toLowerCase()
      .trim();


  const list =
    rows.filter(r => {

      const text =
        `${r.employee || ""} ${
          r.designation || ""
        }`;

      return text
        .toLowerCase()
        .includes(q);

    });


  const html =
    list.length
      ? tableRows(list)
      : `

        <tr>

          <td
            colspan="19"
            style="
              text-align:center;
              padding:30px;
            "
          >
            No matching record found.
          </td>

        </tr>

      `;


  $("rankingTable").innerHTML =
    html;


  $("dataTable").innerHTML =
    html;


  $("tableCount").textContent =
    list.length +
    " of " +
    rows.length +
    " records";


  setupSorting();

}


/* =========================
   REPORT
========================= */

function renderReport(t) {

  const items = [

    [
      "Opening Balance",
      t.openingBalance
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
      "Closed",
      t.closed
    ],

    [
      "Forwarded",
      t.forwarded
    ],

    [
      "Total Disposed",
      t.disposedTotal
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
      t.totalPendency
    ],

    [
      "0–7 Days",
      t.pendency0to7
    ],

    [
      "8–15 Days",
      t.pendency8to15
    ],

    [
      "16–30 Days",
      t.pendency16to30
    ],

    [
      "31–60 Days",
      t.pendency31to60
    ],

    [
      ">60 Days",
      t.pendencyOver60
    ],

    [
      "Average Pending Days",
      avgWeighted(
        enriched()
      ).toFixed(2)
    ]

  ];


  $("reportBox").innerHTML = `

    <div class="report-grid">

      ${
        items
          .map(
            x => `

              <div class="report-item">

                <span>
                  ${x[0]}
                </span>

                <strong>
                  ${
                    typeof x[1] === "number"
                      ? fmt(x[1])
                      : x[1]
                  }
                </strong>

              </div>

            `
          )
          .join("")
      }

    </div>

  `;

}


/* =========================================================
   SORTING
========================================================= */

function getSortValue(text) {

  const clean =
    String(text || "")
      .trim()
      .replace(/,/g, "");


  const number =
    Number(
      clean.replace(
        /[^0-9.-]/g,
        ""
      )
    );


  if (
    clean !== "" &&
    !isNaN(number)
  ) {

    return number;

  }


  return clean.toLowerCase();

}


function sortTable(table) {

  const tbody =
    table.querySelector("tbody");

  if (!tbody)
    return;


  const rows =
    Array.from(
      tbody.querySelectorAll("tr")
    );


  if (
    rows.length <= 1 &&
    rows[0] &&
    rows[0].children.length === 1
  ) {
    return;
  }


  rows.sort(
    (a, b) => {

      for (
        const s
        of sortColumns
      ) {

        const cellA =
          a.children[s.index];

        const cellB =
          b.children[s.index];


        if (!cellA || !cellB)
          continue;


        const A =
          getSortValue(
            cellA.innerText
          );

        const B =
          getSortValue(
            cellB.innerText
          );


        if (A < B)
          return -1 *
            s.direction;


        if (A > B)
          return 1 *
            s.direction;

      }


      return 0;

    }
  );


  rows.forEach(
    row =>
      tbody.appendChild(row)
  );

}


function updateSortArrows(table) {

  const headers =
    table.querySelectorAll(
      "thead th"
    );


  headers.forEach(
    (th, index) => {

      th.querySelectorAll(
        ".sort-arrow"
      ).forEach(
        x => x.remove()
      );


      const s =
        sortColumns.find(
          x =>
            x.index === index
        );


      if (!s)
        return;


      const arrow =
        document.createElement(
          "span"
        );


      arrow.className =
        "sort-arrow";


      arrow.textContent =
        s.direction === 1
          ? " ▲"
          : " ▼";


      th.appendChild(
        arrow
      );

    }
  );

}


function setupSorting() {

  document
    .querySelectorAll(
      ".sortable-table"
    )
    .forEach(table => {

      const headers =
        table.querySelectorAll(
          "thead th"
        );


      headers.forEach(
        (th, index) => {

          if (
            th.dataset.sortReady
          )
            return;


          th.dataset.sortReady =
            "yes";


          th.addEventListener(
            "click",
            event => {

              if (
                event.shiftKey
              ) {

                const existing =
                  sortColumns.find(
                    x =>
                      x.index === index
                  );


                if (existing) {

                  existing.direction *= -1;

                } else {

                  sortColumns.push({
                    index: index,
                    direction: 1
                  });

                }

              } else {

                const existing =
                  sortColumns.find(
                    x =>
                      x.index === index
                  );


                sortColumns = [

                  {
                    index: index,

                    direction:
                      existing
                        ? existing.direction * -1
                        : 1

                  }

                ];

              }


              sortTable(table);

              updateSortArrows(
                table
              );

            }
          );

        }
      );

    });

}


/* =========================
   LOAD E-OFFICE DATA
========================= */

async function load() {

  try {

    const response =
      await fetch(
        "eoffice_data.json?cache=" +
        Date.now()
      );


    if (!response.ok) {

      throw new Error(
        "eoffice_data.json could not be loaded."
      );

    }


    DATA =
      await response.json();


    if (
      !DATA.records ||
      !Array.isArray(
        DATA.records
      )
    ) {

      throw new Error(
        "No E-Office records found."
      );

    }


    render();


  } catch (error) {

    document.body.innerHTML = `

      <div class="error-box">

        <h2>
          E-Office Data Could Not Be Loaded
        </h2>

        <p>
          ${esc(error.message)}
        </p>

        <p>
          Please make sure
          <b>eoffice_data.json</b>
          is in the same GitHub repository.
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


    $("search")
      .addEventListener(
        "input",
        e =>
          renderTable(
            enriched(),
            e.target.value
          )
      );


    $("rankingSearch")
      .addEventListener(
        "input",
        e =>
          renderTable(
            enriched(),
            e.target.value
          )
      );


    $("refresh")
      .addEventListener(
        "click",
        load
      );


    $("refreshRanking")
      .addEventListener(
        "click",
        load
      );


    load();

  }
);
