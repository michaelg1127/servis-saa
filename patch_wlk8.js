const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
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

replaceFn('loadWoodlogAnalisis', true, `async function loadWoodlogAnalisis() {
  const el = document.getElementById('wl-panel-analisis');
  if (!el) return;
  el.innerHTML = '<div style="color:#94A3B8;padding:20px;">Memuat...</div>';
  try {
    const { data: projects, error } = await sb.from('projects')
      .select('*, project_units(unit_id, hm_awal, hm_akhir, solar_awal_pct, solar_akhir_pct, units(code))')
      .eq('type', 'woodlog_kapal').not('end_date', 'is', null)
      .order('project_code', { ascending: false });
    if (error) throw error;
    if (!projects || projects.length === 0) {
      el.innerHTML = '<div style="color:#94A3B8;padding:20px;">Belum ada proyek kapal woodlog yang selesai.</div>'; return;
    }
    const ids = projects.map(p => p.id);
    const [salRes, fillRes] = await Promise.all([
      sb.from('woodlog_operator_salary').select('project_id, salary_amount').in('project_id', ids),
      fetchFillMap(ids)
    ]);
    const salMap = {};
    (salRes.data || []).forEach(s => { salMap[s.project_id] = (salMap[s.project_id] || 0) + Number(s.salary_amount); });
    renderWoodlogAnalisis(projects, salMap, fillRes);
  } catch(e) { el.innerHTML = '<div style="color:#EF4444;padding:20px;">Error: ' + e.message + '</div>'; }
}`);

replaceFn('renderWoodlogAnalisis', false, `function renderWoodlogAnalisis(projects, salMap, fillMap) {
  const el = document.getElementById('wl-panel-analisis');
  if (!el) return;
  const rows = projects.map(function(p) {
    const income = (p.total_mt_m3 && p.unit_price) ? Number(p.total_mt_m3) * Number(p.unit_price) : 0;
    const pus = p.project_units || [];
    const projectFills = (fillMap && fillMap[p.id]) ? fillMap[p.id] : {};
    // BBM: per unit with correct tank size
    let totalBBM = 0;
    pus.forEach(function(pu) {
      const unitCode = (pu.units && pu.units.code) ? pu.units.code : '';
      const tankSize = WL_BANGAU_CODES.includes(unitCode) ? 450 : 320;
      const hasSolar = pu.solar_awal_pct != null && pu.solar_akhir_pct != null;
      const tankDiff = hasSolar ? (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * tankSize : 0;
      const fills = projectFills[pu.unit_id] || 0;
      totalBBM += tankDiff + fills;
    });
    const fuelCost = totalBBM * Number(p.harga_solar_rpl || 0);
    const laborBase = salMap[p.id] || 0;
    const laborCost = laborBase * 1.05;
    const profit = income - fuelCost - laborCost;
    const totalHM = pus.reduce(function(a, pu) {
      return a + ((pu.hm_akhir && pu.hm_awal) ? Number(pu.hm_akhir) - Number(pu.hm_awal) : 0);
    }, 0);
    const yieldHM = totalHM > 0 ? profit / totalHM : 0;
    const fmtRp = function(v) { return 'Rp ' + Math.round(v).toLocaleString('id'); };
    return '<tr>' +
      '<td style="font-weight:700;color:#1D4ED8;">' + p.project_code + '</td>' +
      '<td>' + (p.nama_kapal || '—') + '</td>' +
      '<td>' + formatDate(p.end_date) + '</td>' +
      '<td style="text-align:right;">' + fmtRp(income) + '</td>' +
      '<td style="text-align:right;color:#D97706;">' + (Math.round(totalBBM).toLocaleString('id') + ' L · ' + fmtRp(fuelCost)) + '</td>' +
      '<td style="text-align:right;color:#7C3AED;">' + fmtRp(laborCost) + '</td>' +
      '<td style="text-align:right;font-weight:700;color:' + (profit >= 0 ? '#16A34A' : '#DC2626') + ';">' + fmtRp(profit) + '</td>' +
      '<td style="text-align:right;font-size:12px;">' + Math.round(yieldHM).toLocaleString('id') + '/HM</td>' +
      '<td style="text-align:right;color:#64748B;">' + (p.invoice_amount ? fmtRp(p.invoice_amount) : '—') + '</td>' +
      '</tr>';
  }).join('');
  el.innerHTML = '<div class="table-wrap"><table class="dt"><thead><tr><th>Kode</th><th>Kapal</th><th>Selesai</th><th style="text-align:right;">Income</th><th style="text-align:right;">BBM (L · Cost)</th><th style="text-align:right;">Labor (+5%)</th><th style="text-align:right;">Profit</th><th style="text-align:right;">Yield/HM</th><th style="text-align:right;">Invoice</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
