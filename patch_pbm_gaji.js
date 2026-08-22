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

// ── PBM-0: Add .pbm-row:hover CSS rule ───────────────────────────────────────
replaceExact(
  '  /* ── Sticky mobile screen headers ── */' + R +
  '  #view-spv .mscreen > div:first-child,' + R +
  '  #view-mkn .mscreen > div:first-child { position: sticky; top: 0; z-index: 20; }' + R +
  '</style>',

  '  /* ── Sticky mobile screen headers ── */' + R +
  '  #view-spv .mscreen > div:first-child,' + R +
  '  #view-mkn .mscreen > div:first-child { position: sticky; top: 0; z-index: 20; }' + R +
  '  /* ── PBM Gaji ── */' + R +
  '  .pbm-row { cursor: pointer; border-bottom: 1px solid #f3f4f6; }' + R +
  '  .pbm-row:hover td { background: #f9fafb; }' + R +
  '</style>',

  'PBM-0: Add pbm-row CSS'
);

// ── PBM-1: Add "PBM Gaji" sidebar nav link after Proyek Woodlog ──────────────
replaceExact(
  '    <div class="slink" onclick="switchAdmin(\'woodlog\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Proyek Woodlog</div>' + R +
  '    </div>',

  '    <div class="slink" onclick="switchAdmin(\'woodlog\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Proyek Woodlog</div>' + R +
  '    <div class="slink" onclick="switchAdmin(\'pbm-gaji\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>PBM Gaji</div>' + R +
  '    </div>',

  'PBM-1: Add PBM Gaji sidebar nav link'
);

// ── PBM-2: Add screen div after woodlog screen closing, before outer </div></div> ──
replaceExact(
  '  <div id="wl-panel-kontinuitas" style="display:none;"></div>' + R +
  '  </div>' + R +
  '  </div>' + R +
  '</div>',

  '  <div id="wl-panel-kontinuitas" style="display:none;"></div>' + R +
  '  </div>' + R +
  '  <div id="admin-screen-pbm-gaji" class="dscreen">' + R +
  '  <div style="font-size:22px;font-weight:800;color:#1E293B;margin-bottom:20px;">PBM Gaji</div>' + R +
  '  <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px;">' + R +
  '    <div>' + R +
  '      <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">Bulan</label>' + R +
  '      <input type="month" id="pbm-bulan" style="padding:8px;border:1px solid #d1d5db;border-radius:6px;">' + R +
  '    </div>' + R +
  '    <div>' + R +
  '      <label style="display:block;font-size:12px;color:#6b7280;margin-bottom:4px;">Tarif / Shift (Rp)</label>' + R +
  '      <input type="number" id="pbm-tarif" placeholder="mis: 150000" style="padding:8px;border:1px solid #d1d5db;border-radius:6px;width:160px;">' + R +
  '    </div>' + R +
  '    <button onclick="loadPbmGaji()" class="btn-primary" style="padding:8px 20px;width:auto;font-size:14px;border-radius:8px;">Hitung</button>' + R +
  '    <button onclick="exportPbmGajiExcel()" class="btn-secondary" style="padding:8px 20px;font-size:14px;border-radius:8px;">Export Excel</button>' + R +
  '  </div>' + R +
  '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;" id="pbm-gaji-grid">' + R +
  '    <div>' + R +
  '      <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;">Periode 1-15</h3>' + R +
  '      <div id="pbm-table-1" style="overflow-x:auto;"></div>' + R +
  '    </div>' + R +
  '    <div>' + R +
  '      <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;">Periode 16-31</h3>' + R +
  '      <div id="pbm-table-2" style="overflow-x:auto;"></div>' + R +
  '    </div>' + R +
  '  </div>' + R +
  '  </div>' + R +
  '  </div>' + R +
  '</div>',

  'PBM-2: Add PBM Gaji screen div'
);

// ── PBM-3: Add drilldown modal before <!-- MODAL OVERLAY --> ──
replaceExact(
  '<!-- MODAL OVERLAY -->',

  '<div id="pbm-drilldown-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;">' + R +
  '  <div style="background:#fff;border-radius:12px;padding:24px;width:90%;max-width:480px;max-height:80vh;overflow-y:auto;">' + R +
  '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' + R +
  '      <h3 id="pbm-drilldown-title" style="font-size:16px;font-weight:600;margin:0;"></h3>' + R +
  '      <button onclick="document.getElementById(\'pbm-drilldown-modal\').style.display=\'none\'" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280;">x</button>' + R +
  '    </div>' + R +
  '    <div id="pbm-drilldown-body"></div>' + R +
  '  </div>' + R +
  '</div>' + R +
  '<!-- MODAL OVERLAY -->',

  'PBM-3: Add PBM drilldown modal'
);

// ── PBM-4: Update switchAdmin labels map ──
replaceExact(
  'const labels = { dashboard:\'Dashboard\', jadwal:\'Jadwal Maintenance\', permintaan:\'Permintaan Servis\', riwayat:\'Riwayat Per Unit\', jadwalmkn:\'Jadwal MKN\', import:\'Import Data\', export:\'Export Data\', pengguna:\'Kelola Pengguna\', unit:\'Kelola Unit\', catat:\'Catat Servis\', bbm:\'BBM\', proyek:\'Proyek\', woodlog:\'Proyek Woodlog\' };',

  'const labels = { dashboard:\'Dashboard\', jadwal:\'Jadwal Maintenance\', permintaan:\'Permintaan Servis\', riwayat:\'Riwayat Per Unit\', jadwalmkn:\'Jadwal MKN\', import:\'Import Data\', export:\'Export Data\', pengguna:\'Kelola Pengguna\', unit:\'Kelola Unit\', catat:\'Catat Servis\', bbm:\'BBM\', proyek:\'Proyek\', woodlog:\'Proyek Woodlog\', \'pbm-gaji\':\'PBM Gaji\' };',

  'PBM-4: Add pbm-gaji to labels map'
);

// ── PBM-5: Add JS functions ───────────────────────────────────────────────────
// Note: all string literals in JS code below use only single-quoted strings
// with \' escaping. No regex literals, no template literals, no backticks.
// onmouseover/onmouseout replaced by CSS .pbm-row:hover (added in PBM-0).
replaceExact(
  'async function loadWoodlogKontinuitas() {' + R +
  '}' + R +
  '' + R +
  '</script>',

  'async function loadWoodlogKontinuitas() {' + R +
  '}' + R +
  '' + R +
  '// ─── PBM GAJI ─────────────────────────────────────────────────────────────────' + R +
  'var _pbmGajiData = { p1: [], p2: [] };' + R +
  '' + R +
  'async function loadPbmGaji() {' + R +
  '  var bulan = document.getElementById(\'pbm-bulan\').value;' + R +
  '  if (!bulan) { alert(\'Pilih bulan terlebih dahulu\'); return; }' + R +
  '  var parts = bulan.split(\'-\');' + R +
  '  var year = parts[0];' + R +
  '  var month = parts[1];' + R +
  '  var lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();' + R +
  '  var p1Start = year + \'-\' + month + \'-01\';' + R +
  '  var p1End   = year + \'-\' + month + \'-15\';' + R +
  '  var p2Start = year + \'-\' + month + \'-16\';' + R +
  '  var p2End   = year + \'-\' + month + \'-\' + String(lastDay).padStart(2, \'0\');' + R +
  '  var results = await Promise.all([_fetchPbmPeriod(p1Start, p1End), _fetchPbmPeriod(p2Start, p2End)]);' + R +
  '  _pbmGajiData = { p1: results[0], p2: results[1] };' + R +
  '  _renderPbmTable(\'pbm-table-1\', results[0], p1Start, p1End);' + R +
  '  _renderPbmTable(\'pbm-table-2\', results[1], p2Start, p2End);' + R +
  '}' + R +
  '' + R +
  'async function _fetchPbmPeriod(startDate, endDate) {' + R +
  '  var res = await sb.from(\'sof_shifts\').select(\'pbm_staff_id, shift_date, pbm_staff(name)\')' + R +
  '    .gte(\'shift_date\', startDate).lte(\'shift_date\', endDate);' + R +
  '  if (res.error) { console.error(\'_fetchPbmPeriod:\', res.error); return []; }' + R +
  '  var map = {};' + R +
  '  (res.data || []).forEach(function(row) {' + R +
  '    var id = row.pbm_staff_id;' + R +
  '    var name = (row.pbm_staff && row.pbm_staff.name) ? row.pbm_staff.name : \'\\u2014\';' + R +
  '    if (!map[id]) map[id] = { id: id, name: name, shifts: 0 };' + R +
  '    map[id].shifts++;' + R +
  '  });' + R +
  '  return Object.values(map).sort(function(a, b) { return a.name.localeCompare(b.name); });' + R +
  '}' + R +
  '' + R +
  'function _renderPbmTable(containerId, rows, startDate, endDate) {' + R +
  '  var tarif = parseInt(document.getElementById(\'pbm-tarif\').value) || 0;' + R +
  '  var total = rows.reduce(function(s, r) { return s + r.shifts; }, 0);' + R +
  '  var bodyHtml = \'\';' + R +
  '  if (rows.length === 0) {' + R +
  '    bodyHtml = \'<tr><td colspan="3" style="text-align:center;padding:16px;color:#9ca3af;">Tidak ada data</td></tr>\';' + R +
  '  } else {' + R +
  '    rows.forEach(function(r) {' + R +
  '      var safeName = r.name.replace(/&/g, \'&amp;\').replace(/"/g, \'&quot;\').replace(/</g, \'&lt;\');' + R +
  '      bodyHtml +=' + R +
  '        \'<tr class="pbm-row"\' +' + R +
  '        \' data-sid="\' + r.id + \'"\' +' + R +
  '        \' data-sname="\' + safeName + \'"\' +' + R +
  '        \' data-sd="\' + startDate + \'"\' +' + R +
  '        \' data-ed="\' + endDate + \'"\' +' + R +
  '        \' onclick="_pbmRowClick(this)">\' +' + R +
  '        \'<td style="padding:8px 10px;">\' + r.name + \'</td>\' +' + R +
  '        \'<td style="text-align:center;padding:8px 10px;font-weight:600;">\' + r.shifts + \'</td>\' +' + R +
  '        \'<td style="text-align:right;padding:8px 10px;">\' + (tarif ? fmtRp(r.shifts * tarif) : \'\\u2014\') + \'</td>\' +' + R +
  '        \'</tr>\';' + R +
  '    });' + R +
  '  }' + R +
  '  var footRp = tarif ? fmtRp(total * tarif) : \'\\u2014\';' + R +
  '  var html =' + R +
  '    \'<table style="width:100%;border-collapse:collapse;font-size:13px;">\' +' + R +
  '    \'<thead><tr style="background:#f3f4f6;">\' +' + R +
  '      \'<th style="text-align:left;padding:8px 10px;border-bottom:1px solid #e5e7eb;">Nama Staff PBM</th>\' +' + R +
  '      \'<th style="text-align:center;padding:8px 10px;border-bottom:1px solid #e5e7eb;">Shift</th>\' +' + R +
  '      \'<th style="text-align:right;padding:8px 10px;border-bottom:1px solid #e5e7eb;">Total</th>\' +' + R +
  '    \'</tr></thead>\' +' + R +
  '    \'<tbody>\' + bodyHtml + \'</tbody>\' +' + R +
  '    \'<tfoot><tr style="background:#f9fafb;font-weight:600;border-top:2px solid #e5e7eb;">\' +' + R +
  '      \'<td style="padding:8px 10px;">Grand Total</td>\' +' + R +
  '      \'<td style="text-align:center;padding:8px 10px;">\' + total + \'</td>\' +' + R +
  '      \'<td style="text-align:right;padding:8px 10px;">\' + footRp + \'</td>\' +' + R +
  '    \'</tr></tfoot></table>\';' + R +
  '  document.getElementById(containerId).innerHTML = html;' + R +
  '}' + R +
  '' + R +
  'function _pbmRowClick(el) {' + R +
  '  openPbmDrilldown(el.getAttribute(\'data-sid\'), el.getAttribute(\'data-sname\'), el.getAttribute(\'data-sd\'), el.getAttribute(\'data-ed\'));' + R +
  '}' + R +
  '' + R +
  'async function openPbmDrilldown(staffId, staffName, startDate, endDate) {' + R +
  '  var res = await sb.from(\'sof_shifts\')' + R +
  '    .select(\'sof_project_id, sof_projects(project_id, projects(project_code, nama_kapal))\')' + R +
  '    .eq(\'pbm_staff_id\', staffId).gte(\'shift_date\', startDate).lte(\'shift_date\', endDate);' + R +
  '  if (res.error) { console.error(\'drilldown:\', res.error); return; }' + R +
  '  var map = {};' + R +
  '  (res.data || []).forEach(function(row) {' + R +
  '    var proj = (row.sof_projects && row.sof_projects.projects) ? row.sof_projects.projects : null;' + R +
  '    var code  = proj ? (proj.project_code || \'\\u2014\') : \'\\u2014\';' + R +
  '    var kapal = proj ? (proj.nama_kapal   || \'\\u2014\') : \'\\u2014\';' + R +
  '    if (!map[code]) map[code] = { code: code, kapal: kapal, shifts: 0 };' + R +
  '    map[code].shifts++;' + R +
  '  });' + R +
  '  var rows = Object.values(map).sort(function(a, b) { return a.code.localeCompare(b.code); });' + R +
  '  document.getElementById(\'pbm-drilldown-title\').textContent = staffName;' + R +
  '  var bodyRows = \'\';' + R +
  '  rows.forEach(function(r) {' + R +
  '    bodyRows +=' + R +
  '      \'<tr style="border-bottom:1px solid #f3f4f6;">\' +' + R +
  '      \'<td style="padding:6px 10px;">\' + r.code + \'</td>\' +' + R +
  '      \'<td style="padding:6px 10px;">\' + r.kapal + \'</td>\' +' + R +
  '      \'<td style="text-align:center;padding:6px 10px;font-weight:600;">\' + r.shifts + \'</td></tr>\';' + R +
  '  });' + R +
  '  var totalShifts = rows.reduce(function(s, r) { return s + r.shifts; }, 0);' + R +
  '  document.getElementById(\'pbm-drilldown-body\').innerHTML = rows.length === 0' + R +
  '    ? \'<p style="color:#9ca3af;text-align:center;">Tidak ada data</p>\'' + R +
  '    : \'<table style="width:100%;border-collapse:collapse;font-size:13px;">\' +' + R +
  '        \'<thead><tr style="background:#f3f4f6;">\' +' + R +
  '        \'<th style="text-align:left;padding:6px 10px;">Kode Proyek</th>\' +' + R +
  '        \'<th style="text-align:left;padding:6px 10px;">Nama Kapal</th>\' +' + R +
  '        \'<th style="text-align:center;padding:6px 10px;">Shift</th>\' +' + R +
  '        \'</tr></thead><tbody>\' + bodyRows + \'</tbody>\' +' + R +
  '        \'<tfoot><tr style="font-weight:600;border-top:2px solid #e5e7eb;">\' +' + R +
  '        \'<td colspan="2" style="padding:6px 10px;">Total</td>\' +' + R +
  '        \'<td style="text-align:center;padding:6px 10px;">\' + totalShifts + \'</td>\' +' + R +
  '        \'</tr></tfoot></table>\';' + R +
  '  document.getElementById(\'pbm-drilldown-modal\').style.display = \'flex\';' + R +
  '}' + R +
  '' + R +
  'function exportPbmGajiExcel() {' + R +
  '  var bulan = document.getElementById(\'pbm-bulan\').value || \'unknown\';' + R +
  '  var tarif = parseInt(document.getElementById(\'pbm-tarif\').value) || 0;' + R +
  '  var toSheet = function(rows) {' + R +
  '    return rows.map(function(r) {' + R +
  '      var o = {};' + R +
  '      o[\'Nama Staff PBM\'] = r.name;' + R +
  '      o[\'Jumlah Shift\'] = r.shifts;' + R +
  '      o[\'Tarif/Shift\'] = tarif;' + R +
  '      o[\'Total\'] = r.shifts * tarif;' + R +
  '      return o;' + R +
  '    });' + R +
  '  };' + R +
  '  var wb = XLSX.utils.book_new();' + R +
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(_pbmGajiData.p1)), \'Periode 1-15\');' + R +
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(_pbmGajiData.p2)), \'Periode 16-31\');' + R +
  '  XLSX.writeFile(wb, \'PBM_Gaji_\' + bulan + \'.xlsx\');' + R +
  '}' + R +
  '' + R +
  '</script>',

  'PBM-5: Add PBM Gaji JS functions'
);

// ── PBM-6: Set default month in DOMContentLoaded ──────────────────────────────
replaceExact(
  '  boot();' + R +
  '});',

  '  var pbmBulanEl = document.getElementById(\'pbm-bulan\');' + R +
  '  if (pbmBulanEl) {' + R +
  '    var pbmNow = new Date();' + R +
  '    pbmBulanEl.value = pbmNow.toISOString().slice(0, 7);' + R +
  '  }' + R +
  '  boot();' + R +
  '});',

  'PBM-6: Set default month for pbm-bulan'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll PBM Gaji patches applied. Running syntax check...');

const { execSync } = require('child_process');
try {
  var s = content.indexOf('<script>') + '<script>'.length;
  var e = content.lastIndexOf('</script>');
  var tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) {
  console.error('SYNTAX ERROR:', err.message);
  process.exit(1);
}
console.log('\nDone.');
