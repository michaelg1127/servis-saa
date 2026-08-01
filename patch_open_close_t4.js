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

// T4-1: renderProyekKapalList — store cache + replace detail cell with placeholder
replaceExact(
  "    html2 += '<td colspan=\"11\" style=\"padding:12px 16px;\">';" + R +
  "    html2 += renderKapalDetailHTML(p);" + R +
  "    html2 += '</td></tr>';",

  "    _proyekKapalCache[p.id] = p;" + R +
  "    html2 += '<td colspan=\"11\" style=\"padding:8px;color:#64748B;font-size:12px;\">Klik untuk memuat detail...</td></tr>';",

  'T4-1: renderProyekKapalList: placeholder + cache'
);

// T4-2: renderProyekStockpileList — store cache + replace detail with placeholder
replaceExact(
  "    h += '<tr id=\"stk-detail-' + p.id + '\" style=\"display:none;background:#F8FAFC;\"><td colspan=\"7\" style=\"padding:12px 16px;\">';" + R +
  "    h += renderStockpileDetailHTML(p) + '</td></tr>';",

  "    _proyekStockpileCache[p.id] = p;" + R +
  "    h += '<tr id=\"stk-detail-' + p.id + '\" style=\"display:none;background:#F8FAFC;\"><td colspan=\"7\" style=\"padding:8px;color:#64748B;font-size:12px;\">Klik untuk memuat detail...</td></tr>';",

  'T4-2: renderProyekStockpileList: placeholder + cache'
);

// T4-3: toggleKapalDetail — async lazy fetch on first expand
replaceExact(
  "function toggleKapalDetail(id) {" + R +
  "  const row = document.getElementById('kapal-detail-' + id);" + R +
  "  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';" + R +
  "}",

  "async function toggleKapalDetail(id) {" + R +
  "  const row = document.getElementById('kapal-detail-' + id);" + R +
  "  if (!row) return;" + R +
  "  if (row.style.display !== 'none') { row.style.display = 'none'; return; }" + R +
  "  row.style.display = '';" + R +
  "  if (row.dataset.rendered === 'true') return;" + R +
  "  const td = row.querySelector('td');" + R +
  "  if (td) td.textContent = 'Memuat...';" + R +
  "  const fillMap = await fetchFillMap([id]);" + R +
  "  const unitFillMap = fillMap[id] || {};" + R +
  "  const p = _proyekKapalCache[id];" + R +
  "  if (!p) { if (td) td.textContent = 'Data tidak ditemukan.'; return; }" + R +
  "  row.innerHTML = '<td colspan=\"11\" style=\"padding:12px 16px;\">' + renderKapalDetailHTML(p, unitFillMap) + '</td>';" + R +
  "  row.dataset.rendered = 'true';" + R +
  "}",

  'T4-3: toggleKapalDetail: async lazy fetch'
);

// T4-4: toggleStockpileDetail — async lazy fetch on first expand
replaceExact(
  "function toggleStockpileDetail(id) {" + R +
  "  const row = document.getElementById('stk-detail-' + id);" + R +
  "  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';" + R +
  "}",

  "async function toggleStockpileDetail(id) {" + R +
  "  const row = document.getElementById('stk-detail-' + id);" + R +
  "  if (!row) return;" + R +
  "  if (row.style.display !== 'none') { row.style.display = 'none'; return; }" + R +
  "  row.style.display = '';" + R +
  "  if (row.dataset.rendered === 'true') return;" + R +
  "  const td = row.querySelector('td');" + R +
  "  if (td) td.textContent = 'Memuat...';" + R +
  "  const fillMap = await fetchFillMap([id]);" + R +
  "  const unitFillMap = fillMap[id] || {};" + R +
  "  const p = _proyekStockpileCache[id];" + R +
  "  if (!p) { if (td) td.textContent = 'Data tidak ditemukan.'; return; }" + R +
  "  row.innerHTML = '<td colspan=\"7\" style=\"padding:12px 16px;\">' + renderStockpileDetailHTML(p, unitFillMap) + '</td>';" + R +
  "  row.dataset.rendered = 'true';" + R +
  "}",

  'T4-4: toggleStockpileDetail: async lazy fetch'
);

// T4-5: renderKapalDetailHTML — add fillMap parameter
replaceExact(
  "function renderKapalDetailHTML(p) {",
  "function renderKapalDetailHTML(p, fillMap) {" + R +
  "  fillMap = fillMap || {};",
  'T4-5: renderKapalDetailHTML: add fillMap param'
);

// T4-6: renderKapalDetailHTML — replace calcSolarConsumed with fillMap-aware version
replaceExact(
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);" + R +
  "    const salary = u.allocatedMt * rate;",

  "    const fillLiters = fillMap[u.unit_id] != null ? fillMap[u.unit_id] : (u.solar_isi_liters || 0);" + R +
  "    const solarLabel = fillMap[u.unit_id] != null ? ' (aktual)' : (u.solar_isi_liters ? ' (manual)' : '');" + R +
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, fillLiters);" + R +
  "    const salary = u.allocatedMt * rate;",

  'T4-6: renderKapalDetailHTML: use fillMap for solar'
);

// T4-7: renderKapalDetailHTML — add solar label to display (ends with </td>; not </td></tr>;)
replaceExact(
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L</td>';",
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L<span style=\"font-size:10px;color:#94A3B8;\">' + solarLabel + '</span></td>';",
  'T4-7: renderKapalDetailHTML: solar label'
);

// T4-8: renderStockpileDetailHTML — add fillMap parameter
replaceExact(
  "function renderStockpileDetailHTML(p) {",
  "function renderStockpileDetailHTML(p, fillMap) {" + R +
  "  fillMap = fillMap || {};",
  'T4-8: renderStockpileDetailHTML: add fillMap param'
);

// T4-9: renderStockpileDetailHTML — replace calcSolarConsumed with fillMap-aware version
replaceExact(
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);" + R +
  "    h += '<tr style=\"border-bottom:1px solid #E2E8F0;\">';",

  "    const fillLiters = fillMap[u.unit_id] != null ? fillMap[u.unit_id] : (u.solar_isi_liters || 0);" + R +
  "    const solarLabel = fillMap[u.unit_id] != null ? ' (aktual)' : (u.solar_isi_liters ? ' (manual)' : '');" + R +
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, fillLiters);" + R +
  "    h += '<tr style=\"border-bottom:1px solid #E2E8F0;\">';",

  'T4-9: renderStockpileDetailHTML: use fillMap for solar'
);

// T4-10: renderStockpileDetailHTML — add solar label (ends with </td></tr>; not </td>;)
replaceExact(
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L</td></tr>';",
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L<span style=\"font-size:10px;color:#94A3B8;\">' + solarLabel + '</span></td></tr>';",
  'T4-10: renderStockpileDetailHTML: solar label'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T4 patches applied. Running syntax check...');
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
