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

// T6-1: exportProyekExcel — fetch fillMap after getting projects
replaceExact(
  "  const projects = panel._ringkasanProjects;" + R +
  "  if (!projects || projects.length === 0) { showToast('Tidak ada data untuk diexport'); return; }" + R +
  "  const wb = XLSX.utils.book_new();",

  "  const projects = panel._ringkasanProjects;" + R +
  "  if (!projects || projects.length === 0) { showToast('Tidak ada data untuk diexport'); return; }" + R +
  "  const fillMap = await fetchFillMap(projects.map(function(p) { return p.id; }));" + R +
  "  const wb = XLSX.utils.book_new();",

  'T6-1: exportProyekExcel: fetch fillMap for all projects'
);

// T6-2: exportProyekExcel kapalRows — use fillMap for solar (anchored by split.forEach + hmK line)
replaceExact(
  "    split.forEach(u => {" + R +
  "      const hmK = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;" + R +
  "      kapalRows.push([p.project_code, p.nama_kapal||'', p.pemberi_kerja, p.kade||'', p.ship_number_in_month, p.start_date, p.end_date, p.cargo_type||'', p.total_mt_m3, p.unit_price, u.units?u.units.code:'?', u.hm_awal, u.hm_akhir, hmK, +u.allocatedMt.toFixed(2), rate, Math.round(u.allocatedMt*rate), +calcSolarConsumed(u.solar_awal_pct,u.solar_akhir_pct,u.solar_isi_liters).toFixed(1)]);",

  "    split.forEach(u => {" + R +
  "      const hmK = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;" + R +
  "      const kapalSolarIsi = (fillMap[p.id] && fillMap[p.id][u.unit_id] != null) ? fillMap[p.id][u.unit_id] : (u.solar_isi_liters || 0);" + R +
  "      kapalRows.push([p.project_code, p.nama_kapal||'', p.pemberi_kerja, p.kade||'', p.ship_number_in_month, p.start_date, p.end_date, p.cargo_type||'', p.total_mt_m3, p.unit_price, u.units?u.units.code:'?', u.hm_awal, u.hm_akhir, hmK, +u.allocatedMt.toFixed(2), rate, Math.round(u.allocatedMt*rate), +calcSolarConsumed(u.solar_awal_pct,u.solar_akhir_pct,kapalSolarIsi).toFixed(1)]);",

  'T6-2: exportProyekExcel kapalRows: use fillMap for solar'
);

// T6-3: exportProyekExcel stkRows — use fillMap for solar
replaceExact(
  "    (p.project_units || []).forEach(u => {" + R +
  "      const hmK = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;" + R +
  "      stkRows.push([p.project_code, p.pemberi_kerja, p.start_date, p.end_date, u.units?u.units.code:'?', u.hm_awal, u.hm_akhir, hmK, Math.round(hmK*35000), +calcSolarConsumed(u.solar_awal_pct,u.solar_akhir_pct,u.solar_isi_liters).toFixed(1)]);",

  "    (p.project_units || []).forEach(u => {" + R +
  "      const hmK = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;" + R +
  "      const stkSolarIsi = (fillMap[p.id] && fillMap[p.id][u.unit_id] != null) ? fillMap[p.id][u.unit_id] : (u.solar_isi_liters || 0);" + R +
  "      stkRows.push([p.project_code, p.pemberi_kerja, p.start_date, p.end_date, u.units?u.units.code:'?', u.hm_awal, u.hm_akhir, hmK, Math.round(hmK*35000), +calcSolarConsumed(u.solar_awal_pct,u.solar_akhir_pct,stkSolarIsi).toFixed(1)]);",

  'T6-3: exportProyekExcel stkRows: use fillMap for solar'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T6 patches applied. Running syntax check...');
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
