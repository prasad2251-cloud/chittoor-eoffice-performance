let DATA=null;
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('en-IN');
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));

function score(r){
  const available=(Number(r.opening_balance)||0)+(Number(r.created)||0)+(Number(r.received)||0);
  const disposed=Number(r.disposed_total)||0;
  const pend=Number(r.total_pendency)||0;
  const disposalRate=available>0 ? Math.min(100,disposed/available*100) : 0;
  const pendPenalty=Math.min(35,pend/Math.max(1,disposed+pend)*100);
  return Math.max(0,Math.min(100,disposalRate*0.8 + (100-pendPenalty)*0.2));
}

function enriched(){
  return DATA.records.map(r=>({...r,score:score(r)}));
}

function avgWeighted(records){
  const totalPend=records.reduce((a,r)=>a+(+r.total_pendency||0),0);
  if(!totalPend)return 0;
  return records.reduce(
    (a,r)=>a+(+r.average_pending_days||0)*(+r.total_pendency||0),
    0
  )/totalPend;
}

function setupTabs(){
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active-section'));
    btn.classList.add('active');
    $(btn.dataset.target).classList.add('active-section');
  }));
}

function render(){
  const rows=enriched(), t=DATA.district_total;

  $('period').textContent='Reporting Period: '+DATA.reporting_period;
  $('unitCount').textContent=fmt(rows.length);
  $('disposedHero').textContent=fmt(t.disposed_total);
  $('pendencyHero').textContent=fmt(t.total_pendency);

  $('disposedTotal').textContent=fmt(t.disposed_total);
  $('receivedTotal').textContent=fmt((+t.created||0)+(+t.received||0));
  $('pendencyTotal').textContent=fmt(t.total_pendency);

  $('avgPending').textContent=
    Number(t.average_pending_days||avgWeighted(rows)).toFixed(2);

  $('chartNote').textContent=rows.length+' records';

  renderRankings(rows);
  renderChart(rows);
  renderPerformance(rows);
  renderTrends(t);
  renderTable(rows);
  renderReport(t);

  $('lastLoaded').textContent=
    'Last loaded: '+new Date().toLocaleString('en-IN');
}

function nameOf(r){
  return r.unit_designation || r.employee || 'Unknown';
}

function renderRankings(rows){

  const sorted=[...rows].sort((a,b)=>b.score-a.score);

  const item=(r,i,bottom=false)=>`
    <div class="rank-item">
      <div class="rank-num">
        ${bottom?'#'+(rows.length-i):'🏅 '+(i+1)}
      </div>

      <div>
        <div class="rank-name">
          ${esc(nameOf(r))}
        </div>

        <div class="rank-meta">
          ${esc(r.employee)}
        </div>
      </div>

      <span class="badge ${bottom?'red':''}">
        ${bottom?'Pend. '+fmt(r.total_pendency):'Score'}
      </span>

      <div class="score">
        ${r.score.toFixed(1)}
      </div>
    </div>`;

  $('topList').innerHTML=
    sorted.slice(0,5).map((r,i)=>item(r,i)).join('');

  const bottom=sorted.slice(-5).reverse();

  $('bottomList').innerHTML=
    bottom.map((r,i)=>item(r,rows.length-5+i,true)).join('');
}

function renderChart(rows){

  const sorted=[...rows].sort((a,b)=>b.score-a.score);

  const max=Math.max(
    ...sorted.map(r=>r.score),
    1
  );

  $('barChart').innerHTML=
    sorted.map(r=>{

      const h=Math.max(
        8,
        r.score/max*220
      );

      return `
        <div
          class="bar"
          style="height:${h}px"
          title="${esc(nameOf(r))}: ${r.score.toFixed(1)}">

          <span>${r.score.toFixed(0)}</span>

          <label>
            ${esc(nameOf(r))}
          </label>

        </div>`;

    }).join('');
}

function renderPerformance(rows){

  const sorted=[...rows].sort(
    (a,b)=>b.score-a.score
  );

  $('performanceGrid').innerHTML=
    sorted.map(r=>{

      const available=
        (+r.opening_balance||0)+
        (+r.created||0)+
        (+r.received||0);

      const rate=
        available
          ? Math.min(
              100,
              (+r.disposed_total||0)/available*100
            )
          : 0;

      return `
        <div class="perf">

          <div class="perf-head">
            <span>${esc(nameOf(r))}</span>
            <b>${r.score.toFixed(1)}</b>
          </div>

          <div class="progress">
            <i style="width:${rate}%"></i>
          </div>

          <small>
            Disposal rate: ${rate.toFixed(1)}%
            • Pending: ${fmt(r.total_pendency)}
            • Avg days:
            ${Number(r.average_pending_days||0).toFixed(2)}
          </small>

        </div>`;

    }).join('');
}

function barRows(items){

  const max=Math.max(
    ...items.map(x=>x.v),
    1
  );

  return items.map(x=>`

    <div class="summary-row">

      <span>${x.k}</span>

      <div class="track">
        <i style="width:${Math.max(
          2,
          x.v/max*100
        )}%"></i>
      </div>

      <strong>${fmt(x.v)}</strong>

    </div>

  `).join('');
}

function renderTrends(t){

  $('movementBars').innerHTML=
    barRows([
      {
        k:'Opening Balance',
        v:+t.opening_balance||0
      },
      {
        k:'Created',
        v:+t.created||0
      },
      {
        k:'Received',
        v:+t.received||0
      },
      {
        k:'Disposed',
        v:+t.disposed_total||0
      },
      {
        k:'Parked',
        v:+t.parked||0
      },
      {
        k:'Merged',
        v:+t.merged||0
      }
    ]);

  $('pendencyBars').innerHTML=
    barRows([
      {
        k:'0–7 Days',
        v:+t.pendency_0_7_days||0
      },
      {
        k:'8–15 Days',
        v:+t.pendency_8_15_days||0
      },
      {
        k:'16–30 Days',
        v:+t.pendency_16_30_days||0
      },
      {
        k:'31–60 Days',
        v:+t.pendency_31_60_days||0
      },
      {
        k:'>60 Days',
        v:+t.pendency_over_60_days||0
      }
    ]);
}

function renderTable(rows,filter=''){

  const q=filter.toLowerCase().trim();

  const list=
    rows
      .filter(r=>
        (r.employee+' '+r.unit_designation)
          .toLowerCase()
          .includes(q)
      )
      .sort((a,b)=>b.score-a.score);

  $('dataTable').innerHTML=

    list.map((r,i)=>`

      <tr>

        <td>${i+1}</td>

        <td>
          <b>${esc(r.employee)}</b>
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
          ${Number(
            r.average_pending_days||0
          ).toFixed(2)}
        </td>

        <td class="score-cell">
          ${r.score.toFixed(1)}
        </td>

      </tr>

    `).join('')

    ||

    `<tr>
      <td colspan="7"
          style="text-align:center;padding:25px">
        No matching record found.
      </td>
    </tr>`;
}

function renderReport(t){

  const items=[

    ['Opening Balance',t.opening_balance],
    ['Created',t.created],
    ['Received',t.received],

    ['Disposed — Closed',t.disposed_closed],
    ['Disposed — Forwarded',t.disposed_forwarded],
    ['Total Disposed',t.disposed_total],

    ['Parked',t.parked],
    ['Merged',t.merged],
    ['Total Pendency',t.total_pendency],

    ['0–7 Days',t.pendency_0_7_days],
    ['8–15 Days',t.pendency_8_15_days],
    ['16–30 Days',t.pendency_16_30_days],
    ['31–60 Days',t.pendency_31_60_days],
    ['>60 Days',t.pendency_over_60_days],

    [
      'Average Pending Days',
      Number(
        t.average_pending_days||0
      ).toFixed(2)
    ]

  ];

  $('reportBox').innerHTML=
    `<div class="report-grid">
      ${items.map(x=>`
        <div class="report-item">
          <span>${x[0]}</span>
          <strong>
            ${
              typeof x[1]==='number'
                ? fmt(x[1])
                : x[1]
            }
          </strong>
        </div>
      `).join('')}
    </div>`;
}

async function load(){

  try{

    const res=
      await fetch(
        'data.json?cache='+Date.now()
      );

    if(!res.ok)
      throw new Error(
        'data.json could not be loaded'
      );

    DATA=await res.json();

    render();

  }catch(e){

    document.body.innerHTML=`
      <div style="
        font-family:Arial;
        padding:50px">

        <h2>
          Dashboard data could not be loaded
        </h2>

        <p>
          ${esc(e.message)}
        </p>

        <p>
          Make sure
          <b>data.json</b>,
          <b>index.html</b>,
          <b>style.css</b>
          and
          <b>script.js</b>
          are in the same GitHub folder.
        </p>

      </div>`;
  }
}

document.addEventListener(
  'DOMContentLoaded',
  ()=>{

    setupTabs();

    $('search').addEventListener(
      'input',
      e=>
        renderTable(
          enriched(),
          e.target.value
        )
    );

    $('refresh').addEventListener(
      'click',
      load
    );

    load();
  }
);
