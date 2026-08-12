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
  "function renderWoodlogKontinuitas() {" + R +
  "}",

  "function renderWoodlogKontinuitas() {" + R +
  "  const el = document.getElementById('wl-panel-kontinuitas');" + R +
  "  if (!el) return;" + R +
  "  const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.indexOf(u.code) >= 0; });" + R +
  "  const opts = wlUnits.map(function(u) {" + R +
  "    return '<option value=\"' + u.id + '\"' + (_wlKontinuitasUnitId === u.id ? ' selected' : '') + '>' + u.code + ' – ' + (u.name || '') + '</option>';" + R +
  "  }).join('');" + R +
  "  el.innerHTML = '<div style=\"margin-bottom:16px;display:flex;align-items:center;gap:12px;\">' +" + R +
  "    '<label style=\"font-size:13px;font-weight:700;\">Unit:</label>' +" + R +
  "    '<select id=\"wl-kontin-unit\" class=\"finput\" style=\"width:220px;\" onchange=\"_wlKontinuitasUnitId=this.value;loadWoodlogKontinuitasUnit(this.value)\"><option value=\"\">-- Pilih Unit --</option>' + opts + '</select>' +" + R +
  "    '</div>' +" + R +
  "    '<div id=\"wl-kontin-wrap\"><div style=\"color:#94A3B8;\">Pilih unit untuk melihat kontinuitas HM.</div></div>';" + R +
  "  if (_wlKontinuitasUnitId) loadWoodlogKontinuitasUnit(_wlKontinuitasUnitId);" + R +
  "}" + R +
  R +
  "async function loadWoodlogKontinuitasUnit(unitId) {" + R +
  "  const wrap = document.getElementById('wl-kontin-wrap');" + R +
  "  if (!wrap || !unitId) return;" + R +
  "  wrap.innerHTML = '<div style=\"color:#94A3B8;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data, error } = await sb.from('project_units')" + R +
  "      .select('*, projects(project_code, type, start_date, end_date, pemberi_kerja)')" + R +
  "      .eq('unit_id', unitId)" + R +
  "      .order('hm_awal', { ascending: true });" + R +
  "    if (error) throw error;" + R +
  "    const rows = (data || []).filter(function(r) {" + R +
  "      return r.projects && (r.projects.type === 'woodlog_kapal' || r.projects.type === 'woodlog_hourly');" + R +
  "    });" + R +
  "    if (rows.length === 0) {" + R +
  "      wrap.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Belum ada data proyek woodlog untuk unit ini.</div>'; return;" + R +
  "    }" + R +
  "    var billedHM = 0, gapHM = 0;" + R +
  "    var tableHTML = '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:12px;\">';" + R +
  "    tableHTML += '<thead><tr style=\"background:#F1F5F9;\"><th style=\"padding:8px 10px;text-align:left;\">Tipe</th><th style=\"padding:8px 10px;text-align:left;\">Proyek</th><th style=\"padding:8px 10px;text-align:right;\">HM Awal</th><th style=\"padding:8px 10px;text-align:right;\">HM Akhir</th><th style=\"padding:8px 10px;text-align:right;\">Durasi</th><th style=\"padding:8px 10px;text-align:left;\">Tanggal</th><th style=\"padding:8px 10px;text-align:left;\">Pemberi Kerja</th></tr></thead><tbody>';" + R +
  "    rows.forEach(function(row, i) {" + R +
  "      var p = row.projects;" + R +
  "      var hmDur = row.hm_akhir && row.hm_awal ? Number(row.hm_akhir) - Number(row.hm_awal) : 0;" + R +
  "      billedHM += hmDur;" + R +
  "      if (i > 0 && rows[i - 1].hm_akhir && row.hm_awal) {" + R +
  "        var gap = Number(row.hm_awal) - Number(rows[i - 1].hm_akhir);" + R +
  "        if (gap > 0.05) {" + R +
  "          gapHM += gap;" + R +
  "          tableHTML += '<tr style=\"background:#FEF2F2;\"><td style=\"padding:8px 10px;font-weight:800;color:#DC2626;\">GAP</td><td style=\"padding:8px 10px;color:#DC2626;\">—</td><td style=\"padding:8px 10px;text-align:right;color:#DC2626;\">' + rows[i-1].hm_akhir + '</td><td style=\"padding:8px 10px;text-align:right;color:#DC2626;\">' + row.hm_awal + '</td><td style=\"padding:8px 10px;text-align:right;font-weight:700;color:#DC2626;\">' + gap.toFixed(1) + ' HM</td><td colspan=\"2\" style=\"padding:8px 10px;\"></td></tr>';" + R +
  "        }" + R +
  "      }" + R +
  "      tableHTML += '<tr style=\"border-bottom:1px solid #F1F5F9;background:#F0FDF4;\"><td style=\"padding:8px 10px;font-weight:700;color:#16A34A;\">' + (p ? p.type.replace('woodlog_', '').toUpperCase() : '?') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;font-weight:700;color:#1D4ED8;\">' + (p ? p.project_code : '?') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;text-align:right;\">' + (row.hm_awal || '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;text-align:right;\">' + (row.hm_akhir || '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;text-align:right;font-weight:700;\">' + (hmDur > 0 ? hmDur.toFixed(1) + ' HM' : '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;white-space:nowrap;\">' + (p ? formatDate(p.start_date) + ' – ' + (p.end_date ? formatDate(p.end_date) : '…') : '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;\">' + (p ? (p.pemberi_kerja || '—') : '—') + '</td>' +" + R +
  "        '</tr>';" + R +
  "    });" + R +
  "    tableHTML += '</tbody></table></div>';" + R +
  "    tableHTML += '<div style=\"margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;\">' +" + R +
  "      '<div style=\"background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:10px 16px;\"><div style=\"font-size:12px;color:#16A34A;font-weight:700;\">Total HM Terbilang</div><div style=\"font-size:20px;font-weight:800;color:#15803D;\">' + billedHM.toFixed(1) + ' HM</div></div>' +" + R +
  "      '<div style=\"background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:10px 16px;\"><div style=\"font-size:12px;color:#DC2626;font-weight:700;\">Total HM Gap</div><div style=\"font-size:20px;font-weight:800;color:#B91C1C;\">' + gapHM.toFixed(1) + ' HM</div></div>' +" + R +
  "      '</div>';" + R +
  "    wrap.innerHTML = tableHTML;" + R +
  "  } catch(e) { wrap.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  'WL7: Kontinuitas HM tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL7 patches applied. Running syntax check...');
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
