const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

replaceExact(
  "async function loadWoodlogAnalisis() {" + R +
  "}",

  "async function loadWoodlogAnalisis() {" + R +
  "  const el = document.getElementById('wl-panel-analisis');" + R +
  "  if (!el) return;" + R +
  "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data: projects, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(unit_id, hm_awal, hm_akhir, solar_awal_pct, solar_akhir_pct)')" + R +
  "      .eq('type', 'woodlog_kapal').not('end_date', 'is', null)" + R +
  "      .order('end_date', { ascending: false });" + R +
  "    if (error) throw error;" + R +
  "    if (!projects || projects.length === 0) {" + R +
  "      el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek kapal woodlog yang selesai.</div>'; return;" + R +
  "    }" + R +
  "    const ids = projects.map(p => p.id);" + R +
  "    const allUnitIds = [];" + R +
  "    projects.forEach(function(p) { (p.project_units || []).forEach(function(pu) { if (allUnitIds.indexOf(pu.unit_id) < 0) allUnitIds.push(pu.unit_id); }); });" + R +
  "    const [salRes, fillRes] = await Promise.all([" + R +
  "      sb.from('woodlog_operator_salary').select('project_id, salary_amount').in('project_id', ids)," + R +
  "      allUnitIds.length > 0" + R +
  "        ? sb.from('fuel_dispenses').select('unit_id, liters_dispensed, dispense_date').in('unit_id', allUnitIds)" + R +
  "        : Promise.resolve({ data: [] })" + R +
  "    ]);" + R +
  "    const salMap = {};" + R +
  "    (salRes.data || []).forEach(s => { salMap[s.project_id] = (salMap[s.project_id] || 0) + Number(s.salary_amount); });" + R +
  "    const allFills = fillRes.data || [];" + R +
  "    renderWoodlogAnalisis(projects, salMap, allFills);" + R +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "function renderWoodlogAnalisis(projects, salMap, allFills) {" + R +
  "  const el = document.getElementById('wl-panel-analisis');" + R +
  "  if (!el) return;" + R +
  "  const rows = projects.map(function(p) {" + R +
  "    const income = (p.total_mt_m3 && p.unit_price) ? Number(p.total_mt_m3) * Number(p.unit_price) : 0;" + R +
  "    const pus = p.project_units || [];" + R +
  "    const tankFuel = pus.reduce(function(a, pu) {" + R +
  "      if (pu.solar_awal_pct != null && pu.solar_akhir_pct != null) {" + R +
  "        return a + (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * 320;" + R +
  "      }" + R +
  "      return a;" + R +
  "    }, 0);" + R +
  "    const projectUnitIds = pus.map(pu => pu.unit_id);" + R +
  "    const fillLiters = allFills.filter(function(f) {" + R +
  "      return projectUnitIds.indexOf(f.unit_id) >= 0 &&" + R +
  "        f.dispense_date >= p.start_date &&" + R +
  "        (!p.end_date || f.dispense_date <= p.end_date);" + R +
  "    }).reduce(function(a, f) { return a + Number(f.liters_dispensed || 0); }, 0);" + R +
  "    const fuelCost = (tankFuel + fillLiters) * Number(p.harga_solar_rpl || 0);" + R +
  "    const laborBase = salMap[p.id] || 0;" + R +
  "    const laborCost = laborBase * 1.05;" + R +
  "    const profit = income - fuelCost - laborCost;" + R +
  "    const totalHM = pus.reduce(function(a, pu) {" + R +
  "      return a + ((pu.hm_akhir && pu.hm_awal) ? Number(pu.hm_akhir) - Number(pu.hm_awal) : 0);" + R +
  "    }, 0);" + R +
  "    const yieldHM = totalHM > 0 ? profit / totalHM : 0;" + R +
  "    const fmtRp = function(v) { return 'Rp ' + Math.round(v).toLocaleString('id'); };" + R +
  "    return '<tr>' +" + R +
  "      '<td style=\"font-weight:700;color:#1D4ED8;\">' + p.project_code + '</td>' +" + R +
  "      '<td>' + (p.nama_kapal || '—') + '</td>' +" + R +
  "      '<td>' + formatDate(p.end_date) + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + fmtRp(income) + '</td>' +" + R +
  "      '<td style=\"text-align:right;color:#D97706;\">' + fmtRp(fuelCost) + '</td>' +" + R +
  "      '<td style=\"text-align:right;color:#7C3AED;\">' + fmtRp(laborCost) + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;color:' + (profit >= 0 ? '#16A34A' : '#DC2626') + ';\">' + fmtRp(profit) + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-size:12px;\">' + Math.round(yieldHM).toLocaleString('id') + '/HM</td>' +" + R +
  "      '</tr>';" + R +
  "  }).join('');" + R +
  "  el.innerHTML = '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Kapal</th><th>Selesai</th><th style=\"text-align:right;\">Income</th><th style=\"text-align:right;\">Fuel Cost</th><th style=\"text-align:right;\">Labor (+5%)</th><th style=\"text-align:right;\">Profit</th><th style=\"text-align:right;\">Yield/HM</th></tr></thead><tbody>' + rows + '</tbody></table></div>';" + R +
  "}",

  'WL6: Analisis Biaya tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL6 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
