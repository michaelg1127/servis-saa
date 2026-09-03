const fs = require('fs');
const FILE = 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
let fails = 0;

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); fails++; return; }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); fails++; return; }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

const N = '\r\n';

// ─── PATCH 1: loadWoodlogRingkasan — fetch prev batch31 for retainer ──────────
replaceExact(
  [
    "async function loadWoodlogRingkasan() {",
    "  const el = document.getElementById('wl-panel-ringkasan');",
    "  if (!el) return;",
    "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';",
    "  try {",
    "    const monthYear = _wlRingkasanMonthFilter;",
    "    const [y, m] = monthYear.split('-').map(Number);",
    "    const monthStart = monthYear + '-01';",
    "    const lastDay = new Date(y, m, 0).getDate();",
    "    const monthEnd = monthYear + '-' + String(lastDay).padStart(2, '0');",
    "    const { data: monthProjects } = await sb.from('projects')",
    "      .select('id, project_code, nama_kapal, end_date, type')",
    "      .in('type', ['woodlog_kapal', 'woodlog_hourly'])",
    "      .not('end_date', 'is', null)",
    "      .gte('end_date', monthStart)",
    "      .lte('end_date', monthEnd)",
    "      .order('end_date', { ascending: true });",
    "    const allMonthProjects = monthProjects || [];",
    "    const allIds = allMonthProjects.map(p => p.id);",
    "    let salaryRows = [];",
    "    if (allIds.length > 0) {",
    "      const { data: sals } = await sb.from('woodlog_operator_salary')",
    "        .select('*').in('project_id', allIds).is('paid_batch', null);",
    "      salaryRows = sals || [];",
    "    }",
    "    const { data: kasbons } = await sb.from('woodlog_kasbon').select('*').eq('month_year', monthYear);",
    "    const kasbonMap = {};",
    "    (kasbons || []).forEach(k => { kasbonMap[k.operator_name] = { amount: Number(k.amount), id: k.id }; });",
    "    renderWoodlogRingkasan(salaryRows, allMonthProjects, kasbonMap, monthYear);",
    "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }",
    "}"
  ].join(N),
  [
    "async function loadWoodlogRingkasan() {",
    "  const el = document.getElementById('wl-panel-ringkasan');",
    "  if (!el) return;",
    "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';",
    "  try {",
    "    const monthYear = _wlRingkasanMonthFilter;",
    "    const [y, m] = monthYear.split('-').map(Number);",
    "    const monthStart = monthYear + '-01';",
    "    const lastDay = new Date(y, m, 0).getDate();",
    "    const monthEnd = monthYear + '-' + String(lastDay).padStart(2, '0');",
    "    // Prev month Batch 31 (days 16-end) — last 2 are retainer into current Batch 16",
    "    const prevDate = new Date(y, m - 2, 1);",
    "    const prevY = prevDate.getFullYear();",
    "    const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');",
    "    const prevStart16 = prevY + '-' + prevM + '-16';",
    "    const prevLastDay = new Date(prevY, prevDate.getMonth() + 1, 0).getDate();",
    "    const prevEnd = prevY + '-' + prevM + '-' + String(prevLastDay).padStart(2, '0');",
    "    const [curRes, prevRes] = await Promise.all([",
    "      sb.from('projects').select('id, project_code, nama_kapal, end_date, type')",
    "        .in('type', ['woodlog_kapal', 'woodlog_hourly']).not('end_date', 'is', null)",
    "        .gte('end_date', monthStart).lte('end_date', monthEnd).order('end_date', { ascending: true }),",
    "      sb.from('projects').select('id, project_code, nama_kapal, end_date, type')",
    "        .in('type', ['woodlog_kapal', 'woodlog_hourly']).not('end_date', 'is', null)",
    "        .gte('end_date', prevStart16).lte('end_date', prevEnd).order('end_date', { ascending: true })",
    "    ]);",
    "    const allMonthProjects = curRes.data || [];",
    "    const prevBatch31All = prevRes.data || [];",
    "    const prevRetainer = prevBatch31All.slice(-2); // last 2 of prev Batch31 = retainer",
    "    const allIds = allMonthProjects.map(p => p.id);",
    "    const prevIds = prevRetainer.map(p => p.id);",
    "    const allFetchIds = Array.from(new Set(allIds.concat(prevIds)));",
    "    let salaryRows = [];",
    "    if (allFetchIds.length > 0) {",
    "      const { data: sals } = await sb.from('woodlog_operator_salary')",
    "        .select('*').in('project_id', allFetchIds).is('paid_batch', null);",
    "      salaryRows = sals || [];",
    "    }",
    "    const { data: kasbons } = await sb.from('woodlog_kasbon').select('*').eq('month_year', monthYear);",
    "    const kasbonMap = {};",
    "    (kasbons || []).forEach(k => { kasbonMap[k.operator_name] = { amount: Number(k.amount), id: k.id }; });",
    "    renderWoodlogRingkasan(salaryRows, allMonthProjects, prevRetainer, kasbonMap, monthYear);",
    "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }",
    "}"
  ].join(N),
  'PATCH 1: loadWoodlogRingkasan — fetch prev Batch31 retainer'
);

// ─── PATCH 2: renderWoodlogRingkasan — signature + retainer-aware batch split ─
replaceExact(
  [
    "function renderWoodlogRingkasan(salaryRows, allProjects, kasbonMap, monthYear) {",
    "  const el = document.getElementById('wl-panel-ringkasan');",
    "  if (!el) return;",
    "  el._wlMonthYear = monthYear;",
    "  el._wlProjects = allProjects;",
    "  el._wlSalary = salaryRows;",
    "  el._wlKasbon = kasbonMap;",
    "  const batch16 = allProjects.filter(function(p) { return parseInt((p.end_date || '').split('-')[2], 10) <= 15; });",
    "  const batch31 = allProjects.filter(function(p) { return parseInt((p.end_date || '').split('-')[2], 10) >= 16; });",
    "  const projMap = {};",
    "  allProjects.forEach(function(p) { projMap[p.id] = p; });",
    "  function buildOpMap(batchProjects) {",
    "    const batchIds = new Set(batchProjects.map(function(p) { return p.id; }));",
    "    const opMap = {};",
    "    WL_BANGAU_OPS.concat(WL_STD_OPS).forEach(function(op) { opMap[op] = { total: 0, rows: [] }; });",
    "    salaryRows.filter(function(s) { return batchIds.has(s.project_id); }).forEach(function(s) {",
    "      if (!opMap[s.operator_name]) opMap[s.operator_name] = { total: 0, rows: [] };",
    "      const p = projMap[s.project_id];",
    "      const label = p ? ((p.project_code || '') + ' ' + (p.nama_kapal || '')) : s.project_id;",
    "      const amt = Number(s.salary_amount);",
    "      opMap[s.operator_name].total += amt;",
    "      if (amt > 0) opMap[s.operator_name].rows.push(label + ': Rp ' + amt.toLocaleString('id'));",
    "    });",
    "    return opMap;",
    "  }",
    "  const opMap16 = buildOpMap(batch16);",
    "  const opMap31 = buildOpMap(batch31);"
  ].join(N),
  [
    "function renderWoodlogRingkasan(salaryRows, allProjects, prevRetainer, kasbonMap, monthYear) {",
    "  const el = document.getElementById('wl-panel-ringkasan');",
    "  if (!el) return;",
    "  el._wlMonthYear = monthYear;",
    "  el._wlProjects = allProjects;",
    "  el._wlSalary = salaryRows;",
    "  el._wlKasbon = kasbonMap;",
    "  // Retainer logic: last 2 ships of each batch carry into the next batch",
    "  function _sortP(a,b) { return (a.end_date||'').localeCompare(b.end_date||'') || (a.project_code||'').localeCompare(b.project_code||''); }",
    "  const raw16 = allProjects.filter(function(p) { return parseInt((p.end_date||'').split('-')[2],10) <= 15; }).sort(_sortP);",
    "  const raw31 = allProjects.filter(function(p) { return parseInt((p.end_date||'').split('-')[2],10) >= 16; }).sort(_sortP);",
    "  const ret16 = raw16.slice(Math.max(0, raw16.length - 2));   // last 2 of batch16 → go to batch31",
    "  const ret31 = raw31.slice(Math.max(0, raw31.length - 2));   // last 2 of batch31 → go to next month",
    "  const paid16 = raw16.slice(0, Math.max(0, raw16.length - 2));",
    "  const paid31 = raw31.slice(0, Math.max(0, raw31.length - 2));",
    "  const effectiveBatch16 = (prevRetainer || []).concat(paid16);",
    "  const effectiveBatch31 = ret16.concat(paid31);",
    "  const allProjectsWithRetainer = (prevRetainer || []).concat(allProjects);",
    "  const projMap = {};",
    "  allProjectsWithRetainer.forEach(function(p) { projMap[p.id] = p; });",
    "  el._wlBatch16Ids = effectiveBatch16.map(function(p) { return p.id; });",
    "  el._wlBatch31Ids = effectiveBatch31.map(function(p) { return p.id; });",
    "  el._wlAllProjects = allProjectsWithRetainer;",
    "  const prevRetainerIds = new Set((prevRetainer || []).map(function(p) { return p.id; }));",
    "  function buildOpMap(batchProjects) {",
    "    const batchIds = new Set(batchProjects.map(function(p) { return p.id; }));",
    "    const opMap = {};",
    "    WL_BANGAU_OPS.concat(WL_STD_OPS).forEach(function(op) { opMap[op] = { total: 0, rows: [] }; });",
    "    salaryRows.filter(function(s) { return batchIds.has(s.project_id); }).forEach(function(s) {",
    "      if (!opMap[s.operator_name]) opMap[s.operator_name] = { total: 0, rows: [] };",
    "      const p = projMap[s.project_id];",
    "      const isRetainer = prevRetainerIds.has(s.project_id);",
    "      const label = p ? ((p.project_code || '') + ' ' + (p.nama_kapal || '') + (isRetainer ? ' ★' : '')) : s.project_id;",
    "      const amt = Number(s.salary_amount);",
    "      opMap[s.operator_name].total += amt;",
    "      if (amt > 0) opMap[s.operator_name].rows.push(label + ': Rp ' + amt.toLocaleString('id'));",
    "    });",
    "    return opMap;",
    "  }",
    "  const opMap16 = buildOpMap(effectiveBatch16);",
    "  const opMap31 = buildOpMap(effectiveBatch31);"
  ].join(N),
  'PATCH 2: renderWoodlogRingkasan — retainer-aware batch split'
);

// ─── PATCH 3: Batch 16 section header — show retainer info + fix button check ─
replaceExact(
  [
    "    '<div style=\"background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;margin-bottom:20px;\">' +",
    "    '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;\">' +",
    "    '<div style=\"font-size:14px;font-weight:800;color:#1D4ED8;\">Batch 16 — Kapal Selesai Tgl 1–15</div>' +",
    "    '<button onclick=\"exportWoodlogBatch16()\" style=\"background:#1D4ED8;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;\">↓ Excel Batch 16</button>' +",
    "    '</div>' + tbl16(opMap16) +",
    "    (batch16.length > 0 ? '<div style=\"margin-top:12px;\"><button onclick=\"markWLPaid(\\'mid_month\\')\" class=\"btn-primary\" style=\"background:#1D4ED8;\">Tandai Lunas Batch 16</button></div>' : '') +"
  ].join(N),
  [
    "    '<div style=\"background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;margin-bottom:20px;\">' +",
    "    '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;\">' +",
    "    '<div style=\"font-size:14px;font-weight:800;color:#1D4ED8;\">Batch 16 — Kapal Selesai Tgl 1–15</div>' +",
    "    '<button onclick=\"exportWoodlogBatch16()\" style=\"background:#1D4ED8;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;\">↓ Excel Batch 16</button>' +",
    "    '</div>' +",
    "    ((prevRetainer && prevRetainer.length > 0) ? '<div style=\"font-size:11px;color:#1D4ED8;margin-bottom:8px;\">★ Retensi masuk dari batch sebelumnya: ' + prevRetainer.map(function(p){return p.project_code;}).join(', ') + '</div>' : '') +",
    "    (ret16.length > 0 ? '<div style=\"font-size:11px;color:#64748B;margin-bottom:8px;\">Retensi ke Batch 31: ' + ret16.map(function(p){return p.project_code;}).join(', ') + '</div>' : '') +",
    "    tbl16(opMap16) +",
    "    (effectiveBatch16.length > 0 ? '<div style=\"margin-top:12px;\"><button onclick=\"markWLPaid(\\'mid_month\\')\" class=\"btn-primary\" style=\"background:#1D4ED8;\">Tandai Lunas Batch 16</button></div>' : '') +"
  ].join(N),
  'PATCH 3: Batch 16 header — retainer info + button check fix'
);

// ─── PATCH 4: Batch 31 section header — show retainer info ────────────────────
replaceExact(
  [
    "    '<div style=\"background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px;\">' +",
    "    '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;\">' +",
    "    '<div style=\"font-size:14px;font-weight:800;color:#16A34A;\">Batch 31 — Kapal Tgl 16–31 + Gaji Pokok</div>' +",
    "    '<button onclick=\"exportWoodlogBatch31()\" style=\"background:#16A34A;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;\">↓ Excel Batch 31</button>' +",
    "    '</div>' + tbl31(opMap31) +"
  ].join(N),
  [
    "    '<div style=\"background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px;\">' +",
    "    '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;\">' +",
    "    '<div style=\"font-size:14px;font-weight:800;color:#16A34A;\">Batch 31 — Kapal Tgl 16–31 + Gaji Pokok</div>' +",
    "    '<button onclick=\"exportWoodlogBatch31()\" style=\"background:#16A34A;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;\">↓ Excel Batch 31</button>' +",
    "    '</div>' +",
    "    (ret16.length > 0 ? '<div style=\"font-size:11px;color:#16A34A;margin-bottom:8px;\">★ Retensi masuk dari Batch 16: ' + ret16.map(function(p){return p.project_code;}).join(', ') + '</div>' : '') +",
    "    (ret31.length > 0 ? '<div style=\"font-size:11px;color:#64748B;margin-bottom:8px;\">Retensi ke bulan berikutnya: ' + ret31.map(function(p){return p.project_code;}).join(', ') + '</div>' : '') +",
    "    tbl31(opMap31) +"
  ].join(N),
  'PATCH 4: Batch 31 header — retainer info'
);

// ─── PATCH 5: markWLPaid — use stored batch IDs ───────────────────────────────
replaceExact(
  [
    "    const projects = el._wlProjects || [];",
    "    const batchProjects = paymentType === 'mid_month'",
    "      ? projects.filter(function(p) { return parseInt((p.end_date || '').split('-')[2], 10) <= 15; })",
    "      : projects.filter(function(p) { return parseInt((p.end_date || '').split('-')[2], 10) >= 16; });",
    "    const batchIds = batchProjects.map(function(p) { return p.id; });"
  ].join(N),
  "    const batchIds = paymentType === 'mid_month' ? (el._wlBatch16Ids || []) : (el._wlBatch31Ids || []);",
  'PATCH 5: markWLPaid — use stored batch IDs'
);

// ─── PATCH 6: exportWoodlogBatch16 — use stored batch IDs + allProjects ───────
replaceExact(
  [
    "  const allProjects = el._wlProjects || [];",
    "  const salaryRows = el._wlSalary || [];",
    "  const batch16 = allProjects.filter(function(p) { return parseInt((p.end_date || '').split('-')[2], 10) <= 15; });",
    "  if (batch16.length === 0) { showToast('Tidak ada data Batch 16'); return; }",
    "  const projMap = {};",
    "  allProjects.forEach(function(p) { projMap[p.id] = p; });",
    "  const batchIds = new Set(batch16.map(function(p) { return p.id; }));"
  ].join(N),
  [
    "  const allProjects = el._wlAllProjects || el._wlProjects || [];",
    "  const salaryRows = el._wlSalary || [];",
    "  const batch16Ids = el._wlBatch16Ids || [];",
    "  if (batch16Ids.length === 0) { showToast('Tidak ada data Batch 16'); return; }",
    "  const projMap = {};",
    "  allProjects.forEach(function(p) { projMap[p.id] = p; });",
    "  const batchIds = new Set(batch16Ids);"
  ].join(N),
  'PATCH 6: exportWoodlogBatch16 — use stored batch IDs'
);

// ─── PATCH 7: exportWoodlogBatch31 — use stored batch IDs + allProjects ───────
replaceExact(
  [
    "  const allProjects = el._wlProjects || [];",
    "  const salaryRows = el._wlSalary || [];",
    "  const kasbonMap = el._wlKasbon || {};",
    "  const batch31 = allProjects.filter(function(p) { return parseInt((p.end_date || '').split('-')[2], 10) >= 16; });",
    "  const projMap = {};",
    "  allProjects.forEach(function(p) { projMap[p.id] = p; });",
    "  const batchIds = new Set(batch31.map(function(p) { return p.id; }));"
  ].join(N),
  [
    "  const allProjects = el._wlAllProjects || el._wlProjects || [];",
    "  const salaryRows = el._wlSalary || [];",
    "  const kasbonMap = el._wlKasbon || {};",
    "  const batch31Ids = el._wlBatch31Ids || [];",
    "  const projMap = {};",
    "  allProjects.forEach(function(p) { projMap[p.id] = p; });",
    "  const batchIds = new Set(batch31Ids);"
  ].join(N),
  'PATCH 7: exportWoodlogBatch31 — use stored batch IDs'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
