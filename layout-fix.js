(function () {
  'use strict';

  /*
    E-OFFICE GROUPED LAYOUT — STABLE VERSION
    Uses the actual data.json fields (employee, unit_designation, opening_balance, etc.).
    ONLY GROUP 2 SDPO presentation is corrected; Groups 1, 3 and 4 keep their
    established grouping and records.
  */

  const byId = id => document.getElementById(id);
  const txt = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
  const num = v => Number(v) || 0;

  function employee(r) { return txt(r.employee || r.name); }
  function unit(r) { return txt(r.unit_designation || r.designation || r.post || r.section); }

  function score(r) {
    const workload = num(r.opening_balance) + num(r.created) + num(r.received);
    const disposed = num(r.disposed_total);
    const pending = num(r.total_pendency);
    const disposal = workload ? Math.min(100, disposed / workload * 100) : (pending > 0 ? 0 : 100);
    const pendency = workload ? Math.max(0, 100 - Math.min(100, pending / workload * 100)) : (pending > 0 ? 0 : 100);
    const ageing = pending > 0 ? Math.max(0, 100 - Math.min(100, num(r.average_pending_days) / 60 * 100)) : 100;
    return Math.max(0, Math.min(100, disposal * .50 + pendency * .30 + ageing * .20));
  }

  function colour(v) { return v >= 80 ? 'good' : v >= 50 ? 'mid' : 'bad'; }

  /* These are the exact four SDPOs required in GROUP 2. */
  const SDPO = [
    { key:'chittoor',  name:'J. VENKATANARAYANA', label:'SDPO CHITTOOR', match:r => /J\s*VENKATANARAYANA/i.test(employee(r)) && /SDPO\s*CHITTOOR/i.test(unit(r)) },
    { key:'palamaner', name:'D. PRABHAKAR', label:'SDPO PALAMANER', match:r => /D\.?\s*PRABHAKAR/i.test(employee(r)) && /SDPO\s*PALAMANER/i.test(unit(r)) },
    { key:'kuppam',    name:'B. HEMANTH', label:'ASST. SUPDT. OF POLICE – KUPPAM', match:r => /B\s*HEMANTH/i.test(employee(r)) && /ASST\.?\s*\.?(SP|SUPDT\.?\s*OF\s*POLICE)/i.test(unit(r)) },
    { key:'nagari',    name:'S. CHANDRA SEKHAR', label:'SDPO NAGARI', match:r => /S\.?\s*CHANDRA\s*SEKHAR/i.test(employee(r)) && /SDPO\s*NAGARI/i.test(unit(r)) }
  ];

  function sdpoRows(records) {
    return SDPO.map(def => {
      const found = records.find(def.match);
      if (found) return { ...found, __sdpoLabel:def.label };
      return {
        employee:def.name,
        unit_designation:def.label,
        opening_balance:0, created:0, received:0,
        disposed_closed:0, disposed_forwarded:0, disposed_total:0,
        parked:0, merged:0,
        pendency_0_7_days:0, pendency_8_15_days:0,
        pendency_16_30_days:0, pendency_31_60_days:0,
        pendency_over_60_days:0, total_pendency:0,
        average_pending_days:0,
        __manualSDPO:true,
        __sdpoLabel:def.label
      };
    });
  }

  function isSDPO(r) { return SDPO.some(x => x.match(r)); }

  /* Group 3 — exact office designations already established in the dashboard. */
  const OFFICE_UNITS = [
    'AO','ADDL SP (ADMIN)','AAO','JR ASST','SP CTR','SR ASST','SUPDT','TYPIST'
  ];
  function isOffice(r) {
    const u = unit(r).toUpperCase();
    return OFFICE_UNITS.includes(u);
  }

  /* Group 4 — exact special units/wings already established in the dashboard. */
  const SPECIAL_RULES = [
    [/^ADDL SP \(AR\)$/i,'ADDL SP (AR)'],
    [/^CCS/i,'CCS'],
    [/DCRB/i,'DCRB'],
    [/^DSP AR$/i,'DSP AR'],
    [/^DSP DTC$/i,'DSP DTC'],
    [/DTRB/i,'INSPR, DTRB'],
    [/^Mahila UPS/i,'MAHILA'],
    [/^RI MTO$/i,'RI MTO'],
    [/^RIAR ADMIN$/i,'RIAR ADMIN'],
    [/^RIAR HGs$/i,'RIAR HGs'],
    [/^SPECIAL BRANCH$/i,'SPECIAL BRANCH'],
    [/^Chittoor Traffic UPS$/i,'TRAFFIC']
  ];
  function specialName(r) {
    const u = unit(r);
    const hit = SPECIAL_RULES.find(([re]) => re.test(u));
    return hit ? hit[1] : null;
  }

  function groups(records) {
    const g = { stations:new Map(), subdivisions:new Map(), office:new Map(), special:new Map() };
    const sdpo = sdpoRows(records);
    SDPO.forEach((def,i) => g.subdivisions.set(def.key, [sdpo[i]]));

    records.forEach(r => {
      if (isSDPO(r)) return;
      /* Keep the two previously excluded records out of the dashboard groups. */
      const n = employee(r).toUpperCase();
      if (n === 'V BHASKAR' || n === 'J.MALLESH YADAV') return;

      if (isOffice(r)) {
        const key = unit(r).toUpperCase();
        if (!g.office.has(key)) g.office.set(key, []);
        g.office.get(key).push(r);
        return;
      }

      const sp = specialName(r);
      if (sp) {
        if (!g.special.has(sp)) g.special.set(sp, []);
        g.special.get(sp).push(r);
        return;
      }

      /* Everything else in the source is a police-station/circle record. */
      const key = unit(r) || 'Police Station';
      if (!g.stations.has(key)) g.stations.set(key, []);
      g.stations.get(key).push(r);
    });
    return g;
  }

  function table(rows) {
    const sorted = [...rows].sort((a,b) => score(b) - score(a));
    return `<div class="table-wrap ap-final-table"><table>
      <thead><tr>
        <th>Rank</th><th>Employee</th><th>Police Station / Designation</th>
        <th>Opening</th><th>Created</th><th>Received</th><th>Closed</th><th>Forwarded</th><th>Disposed</th>
        <th>Parked</th><th>Merged</th><th>0–7 Days</th><th>8–15 Days</th><th>16–30 Days</th>
        <th>31–60 Days</th><th>&gt;60 Days</th><th>Total Pendency</th><th>Avg. Pending Days</th><th>Score</th>
      </tr></thead>
      <tbody>${sorted.map((r,i) => `<tr>
        <td>${i+1}</td>
        <td><b>${esc(employee(r))}</b></td>
        <td>${esc(r.__sdpoLabel || unit(r) || '—')}</td>
        <td>${num(r.opening_balance)}</td><td>${num(r.created)}</td><td>${num(r.received)}</td>
        <td>${num(r.disposed_closed)}</td><td>${num(r.disposed_forwarded)}</td><td>${num(r.disposed_total)}</td>
        <td>${num(r.parked)}</td><td>${num(r.merged)}</td>
        <td>${num(r.pendency_0_7_days)}</td><td>${num(r.pendency_8_15_days)}</td><td>${num(r.pendency_16_30_days)}</td>
        <td>${num(r.pendency_31_60_days)}</td><td>${num(r.pendency_over_60_days)}</td><td>${num(r.total_pendency)}</td>
        <td>${num(r.average_pending_days).toFixed(2)}</td><td><b class="${colour(score(r))}">${score(r).toFixed(1)}</b></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function chart(entries) {
    return `<div class="ap-final-chart"><div class="ap-scale"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
      <div class="ap-bars">${entries.map(([name,rows]) => {
        const v = rows.reduce((a,r)=>a+score(r),0) / Math.max(1,rows.length);
        return `<div class="ap-bar-item"><div class="ap-bar-value">${v.toFixed(1)}</div><div class="ap-bar ${colour(v)}" style="height:${Math.max(5,v)}%"></div><div class="ap-bar-name" title="${esc(name)}">${esc(name)}</div></div>`;
      }).join('')}</div></div>`;
  }

  function render() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA.records) || !DATA.records.length) return;
    const root = byId('groupedEoffice');
    if (!root) return;

    const g = groups(DATA.records);
    const defs = [
      ['stations','🚔','GROUP 1: POLICE STATIONS','Police Station-wise E-Office Performance','#2457c5'],
      ['subdivisions','🏛️','GROUP 2: SUB-DIVISIONS','SDPO-wise E-Office Performance','#6941c6'],
      ['office','🗂️','GROUP 3: DPO / OFFICE STAFF','DPO / Office Staff-wise E-Office Performance','#e58a16'],
      ['special','⭐','GROUP 4: SPECIAL UNITS / WINGS','Special Units and Wings E-Office Performance','#159b70']
    ];
    let html = '';

    defs.forEach(([type,icon,title,subtitle,border]) => {
      let entries = [...g[type].entries()];
      if (type === 'subdivisions') {
        const order = ['chittoor','palamaner','kuppam','nagari'];
        entries.sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]));
      } else entries.sort((a,b)=>a[0].localeCompare(b[0]));
      if (!entries.length) return;
      const rows = entries.flatMap(x=>x[1]);
      let leader = '';
      if (type === 'subdivisions') leader = '4 SDPOs';
      else {
        const best = [...rows].sort((a,b)=>score(b)-score(a))[0];
        leader = best ? `${employee(best)} (${score(best).toFixed(1)})` : '—';
      }
      html += `<section class="ap-final-group" style="--group-border:${border}">
        <div class="ap-final-head"><div><h2>${icon} ${title}</h2><p>${entries.length} Units • ${subtitle}</p></div><div class="ap-final-leader">LEADER / OFFICER<br><b>${esc(leader)}</b></div></div>
        ${chart(entries)}
        <div class="ap-detail-title">DETAILED E-OFFICE PERFORMANCE</div>
        ${table(rows)}
      </section>`;
    });
    root.innerHTML = html;
  }

  const style = document.createElement('style');
  style.id = 'ap-stable-group-style';
  style.textContent = `
    #rankings > .chart-panel{display:none!important}
    #groupSummaryTabs,#tableCount{display:none!important}
    #groupedEoffice{margin-top:0!important}
    .ap-final-group{background:#fff;border:1px solid #dce4ef;border-top:4px solid var(--group-border);border-radius:14px;margin:0 0 20px;overflow:hidden;box-shadow:0 3px 12px rgba(30,60,100,.08)}
    .ap-final-head{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:16px 18px 12px}
    .ap-final-head h2{margin:0;color:#17396e;font-size:20px;font-weight:800}.ap-final-head p{margin:5px 0 0;color:#70809a;font-size:13px}
    .ap-final-leader{background:#edf4ff;color:#2151a5;border-radius:8px;padding:9px 12px;font-size:11px;font-weight:800;text-align:right;white-space:nowrap}
    .ap-final-chart{height:245px;margin:0 14px;border-top:1px solid #e5ebf3;border-bottom:1px solid #e5ebf3;position:relative;overflow:hidden;padding:10px 0 42px}
    .ap-scale{position:absolute;left:0;top:10px;bottom:42px;width:30px;display:flex;flex-direction:column;justify-content:space-between;color:#70809a;font-size:10px;text-align:right}
    .ap-bars{position:absolute;left:40px;right:0;top:10px;bottom:42px;display:flex;align-items:flex-end;gap:8px;overflow-x:auto;border-bottom:1px solid #cfd8e5}
    .ap-bar-item{min-width:58px;height:100%;position:relative;display:flex;align-items:center;flex-direction:column;justify-content:flex-end}.ap-bar{width:42px;min-height:5px;border-radius:4px 4px 0 0}.ap-bar.good{background:#16b77e}.ap-bar.mid{background:#f5b820}.ap-bar.bad{background:#e76b63}.ap-bar-value{font-size:9px;font-weight:800;color:#263b5e;margin-bottom:2px}.ap-bar-name{position:absolute;bottom:-36px;width:82px;text-align:center;font-size:8px;color:#52627b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transform:rotate(-35deg);transform-origin:top center}
    .ap-detail-title{padding:14px 16px 8px;font-size:12px;font-weight:900;color:#243b5e;letter-spacing:.2px}.ap-final-table{margin:0!important;overflow:auto}.ap-final-table table{min-width:1450px;border-collapse:collapse}.ap-final-table thead th{background:#102e5b;color:#fff;font-size:11px;padding:10px 7px;white-space:nowrap}.ap-final-table tbody td{font-size:11px;padding:8px 7px;white-space:nowrap;border-bottom:1px solid #dfe6ef}.ap-final-table b.good{color:#0b9f6a}.ap-final-table b.mid{color:#d48a00}.ap-final-table b.bad{color:#d94d43}
    @media(max-width:800px){.ap-final-head{flex-direction:column;align-items:flex-start}.ap-final-leader{white-space:normal;text-align:left}}
  `;
  document.head.appendChild(style);

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    try { if (typeof DATA !== 'undefined' && Array.isArray(DATA.records) && DATA.records.length) { render(); clearInterval(timer); } }
    catch(e){ console.error(e); }
    if (tries>150) clearInterval(timer);
  },100);
})();
