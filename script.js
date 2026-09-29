/* =========================================================
   CHITTOOR POLICE — E-OFFICE PERFORMANCE DASHBOARD
   FINAL SCRIPT
   Compatible with current index.html
   ========================================================= */

let DATA = null;

const $ = id => document.getElementById(id);

const num = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const fmt = value => num(value).toLocaleString("en-IN");

const esc = value =>
    String(value ?? "")
        .replace(/[&<>"']/g, ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[ch]));

/* =========================================================
   SCORE
   ========================================================= */

function calculateScore(r) {

    const incoming =
        num(r.openingBalance) +
        num(r.created) +
        num(r.received);

    const disposed = num(r.disposedTotal);
    const pending = num(r.totalPendency);

    const disposalRate =
        incoming > 0
            ? Math.min(100, (disposed / incoming) * 100)
            : 0;

    const pendingRate =
        disposed + pending > 0
            ? Math.min(
                100,
                (pending / (disposed + pending)) * 100
            )
            : 0;

    const score =
        disposalRate * 0.78 +
        (100 - pendingRate) * 0.22;

    return Math.max(0, Math.min(100, score));
}

/* =========================================================
   PREPARE ROWS
   ========================================================= */

function getRows() {

    if (!DATA || !Array.isArray(DATA.records)) {
        return [];
    }

    return DATA.records.map(record => ({
        ...record,
        score: calculateScore(record)
    }));
}

/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadData() {

    try {

        const response = await fetch(
            "eoffice_data.json?ts=" + Date.now()
        );

        if (!response.ok) {
            throw new Error(
                "HTTP error " + response.status
            );
        }

        DATA = await response.json();

        renderDashboard();

    } catch (error) {

        console.error(
            "E-Office JSON loading error:",
            error
        );

        document.body.insertAdjacentHTML(
            "afterbegin",
            `
            <div style="
                position:fixed;
                top:0;
                left:0;
                right:0;
                z-index:99999;
                background:#b91c1c;
                color:white;
                padding:15px;
                text-align:center;
                font-family:Arial;
                font-weight:bold;
            ">
                Unable to load eoffice_data.json.
                Please check the GitHub file name and location.
            </div>
            `
        );
    }
}

/* =========================================================
   MAIN DASHBOARD
   ========================================================= */

function renderDashboard() {

    const records = getRows();

    const period =
        DATA.period ||
        "Reporting Period";

    /* Header */

    if ($("period")) {
        $("period").textContent =
            "Reporting Period: " + period;
    }

    if ($("unitCount")) {
        $("unitCount").textContent =
            records.length;
    }

    /* =====================================================
       TOTALS
       ===================================================== */

    const totalDisposed =
        records.reduce(
            (sum, r) => sum + num(r.disposedTotal),
            0
        );

    const totalReceived =
        records.reduce(
            (sum, r) =>
                sum +
                num(r.created) +
                num(r.received),
            0
        );

    const totalPendency =
        records.reduce(
            (sum, r) =>
                sum + num(r.totalPendency),
            0
        );

    const weightedAverage =
        totalPendency > 0
            ? records.reduce(
                (sum, r) =>
                    sum +
                    num(r.averagePendingDays) *
                    num(r.totalPendency),
                0
            ) / totalPendency
            : 0;

    /* Header cards */

    if ($("disposedHero")) {
        $("disposedHero").textContent =
            fmt(totalDisposed);
    }

    if ($("pendencyHero")) {
        $("pendencyHero").textContent =
            fmt(totalPendency);
    }

    /* Main KPI cards */

    if ($("disposedTotal")) {
        $("disposedTotal").textContent =
            fmt(totalDisposed);
    }

    if ($("receivedTotal")) {
        $("receivedTotal").textContent =
            fmt(totalReceived);
    }

    if ($("pendencyTotal")) {
        $("pendencyTotal").textContent =
            fmt(totalPendency);
    }

    if ($("avgPending")) {
        $("avgPending").textContent =
            weightedAverage.toFixed(2);
    }

    if ($("lastLoaded")) {
        $("lastLoaded").textContent =
            "Last loaded: " +
            new Date().toLocaleString("en-IN");
    }

    /* =====================================================
       RENDER ALL SECTIONS
       ===================================================== */

    renderRankings(records);
    renderChart(records);
    renderPerformance(records);
    renderTrends(records);
    renderRankingTable(records);
    renderDetailTable(records);
    renderReports(
        records,
        totalDisposed,
        totalReceived,
        totalPendency,
        weightedAverage
    );

    setupSearch();
}

/* =========================================================
   DISPLAY NAME
   ========================================================= */

function displayName(record) {

    return record.designation ||
        "Unknown";
}

/* =========================================================
   RANKINGS
   ========================================================= */

function renderRankings(records) {

    const sorted = [...records].sort(
        (a, b) => b.score - a.score
    );

    const topFive =
        sorted.slice(0, 5);

    const bottomFive =
        sorted
            .slice(-5)
            .reverse();

    /* TOP 5 */

    if ($("topList")) {

        $("topList").innerHTML =
            topFive.map(
                (record, index) => {

                    return `
                    <div class="rank-item">

                        <div class="rank-num">
                            🏅 ${index + 1}
                        </div>

                        <div>
                            <div class="rank-name">
                                ${esc(displayName(record))}
                            </div>

                            <div class="rank-meta">
                                ${esc(record.employee)}
                            </div>
                        </div>

                        <span class="badge">
                            Score
                        </span>

                        <div class="score">
                            ${record.score.toFixed(1)}
                        </div>

                    </div>
                    `;
                }
            ).join("");
    }

    /* BOTTOM 5 */

    if ($("bottomList")) {

        $("bottomList").innerHTML =
            bottomFive.map(
                (record, index) => {

                    const rank =
                        records.length - index;

                    return `
                    <div class="rank-item">

                        <div class="rank-num">
                            #${rank}
                        </div>

                        <div>
                            <div class="rank-name">
                                ${esc(displayName(record))}
                            </div>

                            <div class="rank-meta">
                                ${esc(record.employee)}
                            </div>
                        </div>

                        <span class="badge red">
                            Pend. ${fmt(record.totalPendency)}
                        </span>

                        <div class="score">
                            ${record.score.toFixed(1)}
                        </div>

                    </div>
                    `;
                }
            ).join("");
    }
}

/* =========================================================
   BAR CHART
   ========================================================= */

function renderChart(records) {

    if (!$("barChart")) {
        return;
    }

    const sorted =
        [...records].sort(
            (a, b) => b.score - a.score
        );

    $("barChart").innerHTML =
        sorted.map(record => {

            const height =
                Math.max(
                    18,
                    record.score * 2.05
                );

            return `
            <div
                class="bar"
                style="height:${height}px"
                title="${esc(displayName(record))}: ${record.score.toFixed(1)}"
            >

                <span>
                    ${record.score.toFixed(0)}
                </span>

                <label>
                    ${esc(displayName(record))}
                </label>

            </div>
            `;

        }).join("");

    if ($("chartNote")) {

        $("chartNote").textContent =
            records.length + " records";
    }
}

/* =========================================================
   PERFORMANCE
   ========================================================= */

function renderPerformance(records) {

    if (!$("performanceGrid")) {
        return;
    }

    const sorted =
        [...records].sort(
            (a, b) => b.score - a.score
        );

    $("performanceGrid").innerHTML =
        sorted.map(record => {

            const incoming =
                num(record.openingBalance) +
                num(record.created) +
                num(record.received);

            const disposalRate =
                incoming > 0
                    ? Math.min(
                        100,
                        num(record.disposedTotal) /
                        incoming * 100
                    )
                    : 0;

            return `
            <div class="perf">

                <div class="perf-head">

                    <span>
                        ${esc(displayName(record))}
                        —
                        ${esc(record.employee)}
                    </span>

                    <b>
                        ${record.score.toFixed(1)}
                    </b>

                </div>

                <div class="progress">
                    <i
                        style="width:${disposalRate}%"
                    ></i>
                </div>

                <small>
                    Disposal rate:
                    ${disposalRate.toFixed(1)}%
                    • Pending:
                    ${fmt(record.totalPendency)}
                    • Avg days:
                    ${num(record.averagePendingDays).toFixed(2)}
                </small>

            </div>
            `;

        }).join("");
}

/* =========================================================
   TRENDS
   ========================================================= */

function renderTrends(records) {

    /* FILE MOVEMENT */

    if ($("movementBars")) {

        const movement = [

            [
                "Created",
                records.reduce(
                    (a, r) =>
                        a + num(r.created),
                    0
                )
            ],

            [
                "Received",
                records.reduce(
                    (a, r) =>
                        a + num(r.received),
                    0
                )
            ],

            [
                "Closed",
                records.reduce(
                    (a, r) =>
                        a + num(r.closed),
                    0
                )
            ],

            [
                "Forwarded",
                records.reduce(
                    (a, r) =>
                        a + num(r.forwarded),
                    0
                )
            ],

            [
                "Disposed",
                records.reduce(
                    (a, r) =>
                        a + num(r.disposedTotal),
                    0
                )
            ]

        ];

        const max =
            Math.max(
                ...movement.map(x => x[1]),
                1
            );

        $("movementBars").innerHTML =
            movement.map(
                ([name, value]) => {

                    const width =
                        value / max * 100;

                    return `
                    <div class="simple-row">

                        <b>${name}</b>

                        <div class="simple-track">

                            <div
                                class="simple-fill"
                                style="width:${width}%"
                            ></div>

                        </div>

                        <strong>
                            ${fmt(value)}
                        </strong>

                    </div>
                    `;
                }
            ).join("");
    }

    /* PENDENCY AGE */

    if ($("pendencyBars")) {

        const pendency = [

            [
                "0–7 Days",
                records.reduce(
                    (a, r) =>
                        a + num(r.pendency0to7),
                    0
                )
            ],

            [
                "8–15 Days",
                records.reduce(
                    (a, r) =>
                        a + num(r.pendency8to15),
                    0
                )
            ],

            [
                "16–30 Days",
                records.reduce(
                    (a, r) =>
                        a + num(r.pendency16to30),
                    0
                )
            ],

            [
                "31–60 Days",
                records.reduce(
                    (a, r) =>
                        a + num(r.pendency31to60),
                    0
                )
            ],

            [
                ">60 Days",
                records.reduce(
                    (a, r) =>
                        a + num(r.pendencyOver60),
                    0
                )
            ]

        ];

        const max =
            Math.max(
                ...pendency.map(x => x[1]),
                1
            );

        $("pendencyBars").innerHTML =
            pendency.map(
                ([name, value]) => {

                    const width =
                        value / max * 100;

                    return `
                    <div class="simple-row">

                        <b>${name}</b>

                        <div class="simple-track">

                            <div
                                class="simple-fill"
                                style="width:${width}%"
                            ></div>

                        </div>

                        <strong>
                            ${fmt(value)}
                        </strong>

                    </div>
                    `;
                }
            ).join("");
    }
}

/* =========================================================
   TABLE ROW
   ========================================================= */

function tableRow(record) {

    return `
    <tr>

        <td>${record.slNo}</td>

        <td>
            <strong>
                ${esc(record.employee)}
            </strong>
        </td>

        <td>
            ${esc(record.designation)}
        </td>

        <td>${fmt(record.openingBalance)}</td>
        <td>${fmt(record.created)}</td>
        <td>${fmt(record.received)}</td>
        <td>${fmt(record.closed)}</td>
        <td>${fmt(record.forwarded)}</td>

        <td>
            <b style="color:#1761c7">
                ${fmt(record.disposedTotal)}
            </b>
        </td>

        <td>${fmt(record.parked)}</td>
        <td>${fmt(record.merged)}</td>

        <td>${fmt(record.pendency0to7)}</td>
        <td>${fmt(record.pendency8to15)}</td>
        <td>${fmt(record.pendency16to30)}</td>
        <td>${fmt(record.pendency31to60)}</td>
        <td>${fmt(record.pendencyOver60)}</td>

        <td>
            <b>
                ${fmt(record.totalPendency)}
            </b>
        </td>

        <td>
            ${num(record.averagePendingDays).toFixed(2)}
        </td>

        <td>
            <span class="score">
                ${record.score.toFixed(1)}
            </span>
        </td>

    </tr>
    `;
}

/* =========================================================
   RANKINGS TABLE
   ========================================================= */

function renderRankingTable(records) {

    if (!$("rankingTable")) {
        return;
    }

    const search =
        ($("searchRank")?.value || "")
            .toLowerCase()
            .trim();

    const filtered =
        records.filter(record => {

            const text =
                `${record.employee} ${record.designation}`
                    .toLowerCase();

            return text.includes(search);
        });

    $("rankingTable").innerHTML =
        filtered
            .map(tableRow)
            .join("");

    if ($("tableCount")) {

        $("tableCount").textContent =
            `${filtered.length} of ${records.length} records`;
    }
}

/* =========================================================
   DETAIL TABLE
   ========================================================= */

function renderDetailTable(records) {

    if (!$("detailTable")) {
        return;
    }

    const search =
        ($("searchDetail")?.value || "")
            .toLowerCase()
            .trim();

    const filtered =
        records.filter(record => {

            const text =
                `${record.employee} ${record.designation}`
                    .toLowerCase();

            return text.includes(search);
        });

    $("detailTable").innerHTML =
        filtered
            .map(tableRow)
            .join("");
}

/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const rankSearch =
        $("searchRank");

    const detailSearch =
        $("searchDetail");

    if (rankSearch) {

        rankSearch.oninput = () => {

            renderRankingTable(
                getRows()
            );
        };
    }

    if (detailSearch) {

        detailSearch.oninput = () => {

            renderDetailTable(
                getRows()
            );
        };
    }

    /* RANKING REFRESH */

    if ($("refreshRank")) {

        $("refreshRank").onclick = () => {

            renderRankingTable(
                getRows()
            );
        };
    }

    /* DETAIL REFRESH */

    if ($("refreshDetail")) {

        $("refreshDetail").onclick = () => {

            renderDetailTable(
                getRows()
            );
        };
    }
}

/* =========================================================
   REPORTS
   ========================================================= */

function renderReports(
    records,
    disposed,
    received,
    pending,
    weightedAverage
) {

    if (!$("reportBox")) {
        return;
    }

    const disposalRate =
        received > 0
            ? disposed / received * 100
            : 0;

    const parked =
        records.reduce(
            (a, r) =>
                a + num(r.parked),
            0
        );

    const merged =
        records.reduce(
            (a, r) =>
                a + num(r.merged),
            0
        );

    $("reportBox").innerHTML = `

        <div class="report-card">

            <b>
                Total Employees / Units
            </b>

            <strong>
                ${fmt(records.length)}
            </strong>

            <small>
                Records in current E-Office report
            </small>

        </div>

        <div class="report-card">

            <b>
                Overall Disposal Rate
            </b>

            <strong>
                ${disposalRate.toFixed(1)}%
            </strong>

            <small>
                Disposed compared with created + received
            </small>

        </div>

        <div class="report-card">

            <b>
                Average Pending Days
            </b>

            <strong>
                ${weightedAverage.toFixed(2)}
            </strong>

            <small>
                Weighted by current pendency
            </small>

        </div>

        <div class="report-card">

            <b>
                Total Parked Files
            </b>

            <strong>
                ${fmt(parked)}
            </strong>

            <small>
                Across all records
            </small>

        </div>

        <div class="report-card">

            <b>
                Total Merged Files
            </b>

            <strong>
                ${fmt(merged)}
            </strong>

            <small>
                Across all records
            </small>

        </div>

        <div class="report-card">

            <b>
                Current Pendency
            </b>

            <strong>
                ${fmt(pending)}
            </strong>

            <small>
                All age categories combined
            </small>

        </div>

    `;
}

/* =========================================================
   TAB NAVIGATION
   ========================================================= */

document
    .querySelectorAll(".tab")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".tab")
                    .forEach(btn =>
                        btn.classList.remove("active")
                    );

                document
                    .querySelectorAll(".section")
                    .forEach(section =>
                        section.classList.remove(
                            "active-section"
                        )
                    );

                button.classList.add("active");

                const target =
                    document.getElementById(
                        button.dataset.target
                    );

                if (target) {

                    target.classList.add(
                        "active-section"
                    );

                    window.scrollTo({
                        top:
                            target.offsetTop - 10,
                        behavior:
                            "smooth"
                    });
                }
            }
        );
    });

/* =========================================================
   START
   ========================================================= */

loadData();
