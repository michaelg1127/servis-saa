const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  // find opening brace
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

replaceFn('toggleWoodlogKapalDetail', true, `async function toggleWoodlogKapalDetail(id) {
  const row = document.getElementById('wl-kapal-detail-' + id);
  if (!row) return;
  if (row.style.display !== 'none') { row.style.display = 'none'; return; }
  row.style.display = '';
  if (row.dataset.rendered === 'true') return;
  const p = _wlKapalCache[id];
  if (!p) { row.querySelector('td').textContent = 'Data tidak ditemukan.'; return; }
  const { data: sals } = await sb.from('woodlog_operator_salary').select('*').eq('project_id', id).order('operator_name');
  const salRows = (sals || []).map(function(s) {
    const paidLabel = s.paid_batch === 'mid_month' ? '16' : s.paid_batch === 'end_of_month' ? 'Akhir Bulan' : '—';
    return '<tr><td>' + s.operator_name + '</td><td style="text-transform:capitalize;">' + s.unit_type + '</td>' +
      '<td style="text-align:right;">' + (s.tonnage_mt != null ? Number(s.tonnage_mt).toLocaleString('id') + ' MT' : '—') + '</td>' +
      '<td style="text-align:right;font-weight:700;">Rp ' + Number(s.salary_amount).toLocaleString('id') + '</td>' +
      '<td style="color:' + (s.paid_batch ? '#16A34A' : '#D97706') + ';font-weight:700;">' + (s.paid_batch ? 'Dibayar (' + paidLabel + ')' : 'Belum Dibayar') + '</td></tr>';
  }).join('');
  const fillMap = (_wlKapalFillMap && _wlKapalFillMap[id]) ? _wlKapalFillMap[id] : {};
  const unitRows = (p.project_units || []).map(function(pu) {
    const hmDur = (pu.hm_akhir != null && pu.hm_awal != null) ? (Number(pu.hm_akhir) - Number(pu.hm_awal)).toFixed(1) : '—';
    return '<tr><td style="font-weight:700;">' + (pu.units ? pu.units.code : '?') + '</td>' +
      '<td style="text-align:right;">' + (pu.hm_awal != null ? pu.hm_awal : '—') + '</td><td style="text-align:right;">' + (pu.hm_akhir != null ? pu.hm_akhir : '—') + '</td>' +
      '<td style="text-align:right;font-weight:700;">' + hmDur + ' HM</td>' +
      '<td style="text-align:right;">' + (pu.solar_awal_pct != null ? pu.solar_awal_pct + '%' : '—') + '</td>' +
      '<td style="text-align:right;">' + (pu.solar_akhir_pct != null ? pu.solar_akhir_pct + '%' : '—') + '</td></tr>';
  }).join('');
  const bbmRows = (p.project_units || []).map(function(pu) {
    const unitCode = pu.units ? pu.units.code : '';
    const tankSize = WL_BANGAU_CODES.includes(unitCode) ? 450 : 320;
    const hasSolar = pu.solar_awal_pct != null && pu.solar_akhir_pct != null;
    const tankDiff = hasSolar ? (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * tankSize : 0;
    const fills = fillMap[pu.unit_id] || 0;
    const total = tankDiff + fills;
    return '<tr><td style="font-weight:700;">' + unitCode + '</td>' +
      '<td style="text-align:right;">' + (hasSolar ? Math.round(tankDiff).toLocaleString('id') + ' L' : '—') + '</td>' +
      '<td style="text-align:right;">' + (fills > 0 ? Math.round(fills).toLocaleString('id') + ' L' : '0 L') + '</td>' +
      '<td style="text-align:right;font-weight:700;color:#059669;">' + (hasSolar ? Math.round(total).toLocaleString('id') + ' L' : '—') + '</td></tr>';
  }).join('');
  row.innerHTML = '<td colspan="11" style="padding:12px 16px;background:#F8FAFC;">' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Unit HM</div>' +
    '<div class="table-wrap" style="margin-bottom:12px;"><table class="dt"><thead><tr><th>Unit</th><th>HM Awal</th><th>HM Akhir</th><th>Durasi</th><th>Solar Awal</th><th>Solar Akhir</th></tr></thead><tbody>' + unitRows + '</tbody></table></div>' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">BBM per Unit</div>' +
    '<div class="table-wrap" style="margin-bottom:12px;"><table class="dt"><thead><tr><th>Unit</th><th style="text-align:right;">Tank Diff (L)</th><th style="text-align:right;">Isi Aktual (L)</th><th style="text-align:right;">Total (L)</th></tr></thead><tbody>' + bbmRows + '</tbody></table></div>' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary Operator</div>' +
    '<div class="table-wrap"><table class="dt"><thead><tr><th>Operator</th><th>Tipe</th><th>Tonnage</th><th>Salary</th><th>Status</th></tr></thead><tbody>' + salRows + '</tbody></table></div>' +
    '</td>';
  row.dataset.rendered = 'true';
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
