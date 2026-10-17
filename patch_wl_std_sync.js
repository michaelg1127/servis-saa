// Woodlog STD sync fixes (2026-10-17):
//  - Edit Kapal sync keeps SAA BL (SAA is the source of truth), clears STD boxes for operators
//    with no bon muat, adds rows for Bangau-list operators who also ran STD trucks (e.g. Andi),
//    warns about names SAA does not know, and ignores a response that lands in another ship's modal.
//  - STD rows are keyed by (operator, unit_type) so one person can have a Bangau and an STD row.
//  - Woodlog Analisis: per-ship sync is view-only (old "Simpan Gaji" deleted Bangau rows and priced
//    salary at the client rate); new "Cek vs Monitoring" compares every ship.
// Run: node patch_wl_std_sync.js   (index.html is CRLF)
const fs = require('fs');
const path = __dirname + '/index.html';
const orig = fs.readFileSync(path, 'utf8');
const crlf = orig.includes('\r\n');
let s = orig.replace(/\r\n/g, '\n');

function rep(from, to) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error('Expected 1 match, got ' + n + ' for: ' + from.slice(0, 80));
  s = s.replace(from, function() { return to; });
}

// ── 1. Shared helpers, placed after WL_STD_OPS ──────────────────────────────
rep(
"const WL_STD_OPS = ['Erwin', 'Uncong', 'Valdo', 'Andre', 'Alif', 'Rudianto'];\n",
"const WL_STD_OPS = ['Erwin', 'Uncong', 'Valdo', 'Andre', 'Alif', 'Rudianto'];\n" +
"\n" +
"// STD tonnage per operator from Monitoring bon muat. SAA BL is always used (SAA is the source of truth).\n" +
"function wlStdTonnage(saaBl, totalRitase, bon) {\n" +
"  if (!saaBl || !totalRitase) return 0;\n" +
"  return Math.round((saaBl * 0.95 / totalRitase) * bon * 100) / 100;\n" +
"}\n" +
"\n" +
"// Compares one ship's saved STD rows with Monitoring. stdRows: [{operator_name, tonnage_mt}] (unit_type std only).\n" +
"function wlCompareStd(saaBl, mon, stdRows) {\n" +
"  const res = { status: 'ok', diffs: [], unknown: [], blMon: Number(mon.blQuantity || 0), blDiffers: false };\n" +
"  res.blDiffers = res.blMon > 0 && saaBl > 0 && Math.abs(res.blMon - saaBl) > 0.005;\n" +
"  const saa = {};\n" +
"  (stdRows || []).forEach(function(r) { saa[r.operator_name] = (saa[r.operator_name] || 0) + Number(r.tonnage_mt || 0); });\n" +
"  const bon = mon.bonMuat || {};\n" +
"  const exp = {};\n" +
"  Object.keys(bon).forEach(function(op) {\n" +
"    exp[op] = wlStdTonnage(saaBl, mon.totalRitase, bon[op]);\n" +
"    if (WL_STD_OPS.indexOf(op) === -1 && WL_BANGAU_OPS.indexOf(op) === -1) res.unknown.push(op);\n" +
"  });\n" +
"  Object.keys(Object.assign({}, exp, saa)).sort().forEach(function(op) {\n" +
"    const a = Math.round((saa[op] || 0) * 100) / 100, b = exp[op] || 0;\n" +
"    if (Math.abs(a - b) > 0.05) res.diffs.push({ op: op, saa: a, mon: b, bon: bon[op] || 0 });\n" +
"  });\n" +
"  if (!mon.totalRitase) res.status = 'no_trucks';\n" +
"  else if (Object.keys(saa).length === 0) res.status = 'std_missing';\n" +
"  else if (res.diffs.length > 0) res.status = 'diff';\n" +
"  return res;\n" +
"}\n" +
"\n" +
"function wlSafeId(op) { return String(op).replace(/[^a-zA-Z0-9]/g, '_'); }\n" +
"\n" +
"function wlEditStdRowHTML(op, ton, note) {\n" +
"  const sid = wlSafeId(op);\n" +
"  const tag = note ? '<span style=\"font-size:10px;color:#B45309;font-weight:700;\">' + note + '</span>' : '';\n" +
"  return '<div id=\"wledit-std-row-' + sid + '\" style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px;\">' +\n" +
"    '<span style=\"width:100px;font-size:13px;font-weight:600;\">' + op + '</span>' +\n" +
"    '<input type=\"number\" id=\"wledit-std-ton-' + sid + '\" data-op=\"' + op + '\" class=\"finput\" style=\"width:110px;font-size:13px;\" placeholder=\"Tonnage MT\" min=\"0\" value=\"' + (ton > 0 ? ton : '') + '\" oninput=\"wlEditSalaryPreview()\">' +\n" +
"    '<span id=\"wledit-std-sal-' + sid + '\" style=\"font-size:13px;font-weight:700;color:#1D4ED8;width:120px;\">Rp ' + Math.round((ton || 0) * 800).toLocaleString('id') + '</span>' + tag +\n" +
"    '</div>';\n" +
"}\n" +
"\n" +
"function wlEditStdInputs() {\n" +
"  return Array.prototype.slice.call(document.querySelectorAll('#wledit-std-rows input[data-op]'));\n" +
"}\n"
);

// ── 2. Edit modal: key existing rows by type, render STD rows incl. extra names ──
rep(
"  const salByOp = {};\n" +
"  (existingSals || []).forEach(function(s) { salByOp[s.operator_name] = s; });\n" +
"  const bangauRows = WL_BANGAU_OPS.map(function(op) {\n" +
"    const existing = salByOp[op];\n",
"  const salByOp = {}, stdByOp = {};\n" +
"  (existingSals || []).forEach(function(s) {\n" +
"    if (s.unit_type === 'std') stdByOp[s.operator_name] = s; else salByOp[s.operator_name] = s;\n" +
"  });\n" +
"  const bangauRows = WL_BANGAU_OPS.map(function(op) {\n" +
"    const existing = salByOp[op];\n"
);
rep(
"  const stdRows = WL_STD_OPS.map(function(op) {\n" +
"    const existing = salByOp[op];\n" +
"    const existingTon = existing ? Number(existing.tonnage_mt || 0) : 0;\n" +
"    return '<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px;\">' +\n" +
"      '<span style=\"width:100px;font-size:13px;font-weight:600;\">' + op + '</span>' +\n" +
"      '<input type=\"number\" id=\"wledit-std-ton-' + op + '\" class=\"finput\" style=\"width:110px;font-size:13px;\" placeholder=\"Tonnage MT\" min=\"0\" value=\"' + (existingTon > 0 ? existingTon : '') + '\" oninput=\"wlEditSalaryPreview()\">' +\n" +
"      '<span id=\"wledit-std-sal-' + op + '\" style=\"font-size:13px;font-weight:700;color:#1D4ED8;width:120px;\">Rp ' + (existing ? Number(existing.salary_amount).toLocaleString('id') : '0') + '</span>' +\n" +
"      '</div>';\n" +
"  }).join('');\n",
"  const stdNames = WL_STD_OPS.concat(Object.keys(stdByOp).filter(function(n) { return WL_STD_OPS.indexOf(n) === -1; }));\n" +
"  const stdRows = stdNames.map(function(op) {\n" +
"    const existing = stdByOp[op];\n" +
"    return wlEditStdRowHTML(op, existing ? Number(existing.tonnage_mt || 0) : 0, WL_STD_OPS.indexOf(op) === -1 ? 'tambahan' : '');\n" +
"  }).join('');\n"
);
rep(
"    '<div style=\"background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;\">' + stdRows + '</div>' +\n" +
"    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +\n" +
"    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +\n" +
"    '<button onclick=\"submitEditWoodlogKapal(",
"    '<div id=\"wledit-std-rows\" style=\"background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;\">' + stdRows + '</div>' +\n" +
"    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +\n" +
"    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +\n" +
"    '<button onclick=\"submitEditWoodlogKapal("
);
rep(
"  document.getElementById('modal-box').innerHTML = modalHTML;\n" +
"  document.getElementById('modal-overlay').style.display = 'flex';\n" +
"  wlEditSalaryPreview();\n" +
"}\n",
"  document.getElementById('modal-box').innerHTML = modalHTML;\n" +
"  document.getElementById('modal-box').dataset.wlEditCode = p.project_code || '';\n" +
"  document.getElementById('modal-overlay').style.display = 'flex';\n" +
"  wlEditSalaryPreview();\n" +
"}\n"
);

// ── 3. Preview + save iterate over every STD input (listed + extra names) ──
rep(
"  WL_STD_OPS.forEach(function(op) {\n" +
"    const inp = document.getElementById('wledit-std-ton-' + op);\n" +
"    const ton = parseFloat(inp ? inp.value : '') || 0;\n" +
"    const salEl = document.getElementById('wledit-std-sal-' + op);\n" +
"    if (salEl) salEl.textContent = 'Rp ' + Math.round(ton * 800).toLocaleString('id');\n" +
"  });\n",
"  wlEditStdInputs().forEach(function(inp) {\n" +
"    const ton = parseFloat(inp.value) || 0;\n" +
"    const salEl = document.getElementById('wledit-std-sal-' + wlSafeId(inp.dataset.op));\n" +
"    if (salEl) salEl.textContent = 'Rp ' + Math.round(ton * 800).toLocaleString('id');\n" +
"  });\n"
);
rep(
"  WL_STD_OPS.forEach(function(op) {\n" +
"    const inp = document.getElementById('wledit-std-ton-' + op);\n" +
"    const ton = parseFloat(inp ? inp.value : '') || 0;\n" +
"    if (ton > 0) salaryInserts.push({ project_id: id, operator_name: op, unit_type: 'std', tonnage_mt: ton, salary_amount: Math.round(ton * 800) });\n" +
"  });\n",
"  wlEditStdInputs().forEach(function(inp) {\n" +
"    const ton = parseFloat(inp.value) || 0;\n" +
"    if (ton > 0) salaryInserts.push({ project_id: id, operator_name: inp.dataset.op, unit_type: 'std', tonnage_mt: ton, salary_amount: Math.round(ton * 800) });\n" +
"  });\n"
);

// ── 4. Edit Kapal sync: SAA BL wins, clear stale boxes, add Bangau-name STD rows, warn unknown names ──
const syncStart = s.indexOf('async function wlEditSyncFromMonitoring(code) {');
const syncEnd = s.indexOf('var _wlEditKapalSaving = false;');
if (syncStart < 0 || syncEnd < syncStart) throw new Error('wlEditSyncFromMonitoring not found');
s = s.slice(0, syncStart) +
"async function wlEditSyncFromMonitoring(code) {\n" +
"  var btn = document.getElementById('wledit-sync-btn');\n" +
"  var resultDiv = document.getElementById('wledit-sync-result');\n" +
"  if (!resultDiv) return;\n" +
"  if (!code) { resultDiv.innerHTML = '<div style=\"color:#EF4444;font-size:12px;\">Kode proyek tidak tersedia.</div>'; return; }\n" +
"  var blInput = document.getElementById('wledit-bl');\n" +
"  var saaBl = parseFloat(blInput ? blInput.value : '') || 0;\n" +
"  if (!(saaBl > 0)) { resultDiv.innerHTML = '<div style=\"color:#EF4444;font-size:12px;\">Isi BL Tonnage dulu. Tonase STD dihitung dari BL SAA.</div>'; return; }\n" +
"  if (btn) { btn.textContent = 'Memuat...'; btn.disabled = true; }\n" +
"  try {\n" +
"    var res = await fetch('https://woodlog-monitoring.vercel.app/api/project-stats?code=' + encodeURIComponent(code));\n" +
"    if (!res.ok) {\n" +
"      if (res.status === 404) throw new Error('Kode ' + code + ' belum ada di Woodlog Monitoring. Tonase STD belum bisa diisi; sync lagi setelah bon muat diinput di Monitoring.');\n" +
"      throw new Error('Error ' + res.status + ' dari Woodlog Monitoring.');\n" +
"    }\n" +
"    var data = await res.json();\n" +
"    var modalBox = document.getElementById('modal-box');\n" +
"    if (!modalBox || modalBox.dataset.wlEditCode !== code) return; // modal switched to another ship while loading\n" +
"    var notes = [];\n" +
"    var monBl = Number(data.blQuantity || 0);\n" +
"    if (monBl > 0 && Math.abs(monBl - saaBl) > 0.005) notes.push('<div style=\"color:#D97706;font-size:12px;\">BL Monitoring ' + monBl.toLocaleString('id') + ' MT berbeda; dipakai BL SAA ' + saaBl.toLocaleString('id') + ' MT.</div>');\n" +
"    if (!data.totalRitase || data.totalRitase === 0) {\n" +
"      notes.push('<div style=\"color:#D97706;font-size:12px;\">Total ritase = 0 di Monitoring, tonase STD tidak diubah.</div>');\n" +
"    } else {\n" +
"      var bonMuat = data.bonMuat || {};\n" +
"      var filled = [], cleared = [], added = [], unknown = [];\n" +
"      wlEditStdInputs().forEach(function(inp) {\n" +
"        var op = inp.dataset.op;\n" +
"        if (bonMuat[op] == null && (parseFloat(inp.value) || 0) > 0) { inp.value = ''; cleared.push(op); }\n" +
"      });\n" +
"      Object.keys(bonMuat).forEach(function(op) {\n" +
"        var ton = wlStdTonnage(saaBl, data.totalRitase, bonMuat[op]);\n" +
"        var inp = document.getElementById('wledit-std-ton-' + wlSafeId(op));\n" +
"        var known = WL_STD_OPS.indexOf(op) !== -1 || WL_BANGAU_OPS.indexOf(op) !== -1;\n" +
"        if (!inp && known) {\n" +
"          document.getElementById('wledit-std-rows').insertAdjacentHTML('beforeend', wlEditStdRowHTML(op, 0, 'tambahan'));\n" +
"          inp = document.getElementById('wledit-std-ton-' + wlSafeId(op));\n" +
"          added.push(op + ' (' + bonMuat[op] + ' bon)');\n" +
"        }\n" +
"        if (inp) { inp.value = ton; filled.push(op + ': ' + bonMuat[op] + ' bon \\u2192 ' + ton.toFixed(2) + ' MT'); }\n" +
"        else unknown.push(op + ' (' + bonMuat[op] + ' bon = ' + ton.toFixed(2) + ' MT)');\n" +
"      });\n" +
"      notes.push('<div style=\"color:#64748B;font-size:12px;margin-bottom:4px;\">Ritase: <strong>' + data.totalRitase.toLocaleString('id') + '</strong> \\u00b7 Tonase/Ritase: <strong>' + (saaBl * 0.95 / data.totalRitase).toFixed(2) + ' MT</strong> (BL SAA)</div>');\n" +
"      if (filled.length) notes.push('<div style=\"color:#16A34A;font-size:12px;\">' + filled.join(' \\u00b7 ') + '</div>');\n" +
"      if (added.length) notes.push('<div style=\"color:#B45309;font-size:12px;font-weight:700;\">Operator Bangau dengan bon STD, ditambahkan: ' + added.join(', ') + '</div>');\n" +
"      if (cleared.length) notes.push('<div style=\"color:#B45309;font-size:12px;font-weight:700;\">Dikosongkan (tidak ada bon di Monitoring untuk kapal ini): ' + cleared.join(', ') + '</div>');\n" +
"      if (unknown.length) notes.push('<div style=\"color:#DC2626;font-size:12px;font-weight:700;\">\\u26a0 Nama tidak dikenal di SAA, TIDAK disimpan: ' + unknown.join(', ') + '. Samakan ejaan nama di Monitoring.</div>');\n" +
"    }\n" +
"    wlEditSalaryPreview();\n" +
"    resultDiv.innerHTML = notes.join('');\n" +
"  } catch(e) {\n" +
"    resultDiv.innerHTML = '<div style=\"color:#EF4444;font-size:12px;\">' + e.message + '</div>';\n" +
"  } finally {\n" +
"    if (btn) { btn.textContent = '\\u21bb Sync dari Woodlog Monitoring'; btn.disabled = false; }\n" +
"  }\n" +
"}\n" +
"\n" +
s.slice(syncEnd);

// ── 5. Analisis: per-ship sync becomes view-only; add "Cek vs Monitoring" for all ships ──
rep(
"    '<button onclick=\"downloadWoodlogAnalisisCSV()\" style=\"padding:6px 14px;border-radius:8px;border:1px solid #16A34A;background:#F0FDF4;color:#16A34A;cursor:pointer;font-size:13px;font-weight:700;\">\u2b07 Download CSV</button></div>' +\n",
"    '<div style=\"display:flex;gap:8px;\"><button id=\"wl-cek-mon-btn\" onclick=\"wlCekVsMonitoring()\" style=\"padding:6px 14px;border-radius:8px;border:1px solid #1D4ED8;background:#EFF6FF;color:#1D4ED8;cursor:pointer;font-size:13px;font-weight:700;\">\u21bb Cek vs Monitoring</button>' +\n" +
"    '<button onclick=\"downloadWoodlogAnalisisCSV()\" style=\"padding:6px 14px;border-radius:8px;border:1px solid #16A34A;background:#F0FDF4;color:#16A34A;cursor:pointer;font-size:13px;font-weight:700;\">\u2b07 Download CSV</button></div></div>' +\n" +
"    '<div id=\"wl-cek-mon-result\" style=\"margin-bottom:12px;\"></div>' +\n"
);

const rsStart = s.indexOf('async function wlSyncFromMonitoring(pid) {');
const rsEnd = s.indexOf('\n}\n', s.indexOf('async function wlSaveSyncSalary(pid) {')) + 3;
if (rsStart < 0 || rsEnd < rsStart) throw new Error('Analisis sync block not found');
s = s.slice(0, rsStart) +
"async function wlFetchMonitoringStats(code) {\n" +
"  var res = await fetch('https://woodlog-monitoring.vercel.app/api/project-stats?code=' + encodeURIComponent(code));\n" +
"  if (res.status === 404) return null;\n" +
"  if (!res.ok) throw new Error('Error ' + res.status + ' dari Woodlog Monitoring');\n" +
"  return res.json();\n" +
"}\n" +
"\n" +
"async function wlFetchStdRows(ids) {\n" +
"  var r = await fetchAllRows(function() { return sb.from('woodlog_operator_salary').select('id, project_id, operator_name, tonnage_mt').in('project_id', ids).eq('unit_type', 'std').order('id'); });\n" +
"  if (r.error) throw r.error;\n" +
"  var by = {};\n" +
"  (r.data || []).forEach(function(s) { (by[s.project_id] = by[s.project_id] || []).push(s); });\n" +
"  return by;\n" +
"}\n" +
"\n" +
"function wlCompareSummaryHTML(cmp) {\n" +
"  var parts = [];\n" +
"  if (cmp.status === 'ok') parts.push('<span style=\"color:#16A34A;font-weight:700;\">\\u2713 Sama</span>');\n" +
"  if (cmp.status === 'no_trucks') parts.push('<span style=\"color:#94A3B8;\">Belum ada bon muat di Monitoring</span>');\n" +
"  if (cmp.status === 'std_missing') parts.push('<span style=\"color:#DC2626;font-weight:700;\">STD belum diisi</span>');\n" +
"  if (cmp.status === 'diff') parts.push('<span style=\"color:#DC2626;font-weight:700;\">Tonase berbeda</span>');\n" +
"  if (cmp.unknown.length) parts.push('<span style=\"color:#DC2626;font-weight:700;\">Nama tidak dikenal: ' + cmp.unknown.join(', ') + '</span>');\n" +
"  if (cmp.blDiffers) parts.push('<span style=\"color:#D97706;\">BL Monitoring ' + cmp.blMon.toLocaleString('id') + ' (dipakai BL SAA)</span>');\n" +
"  var detail = cmp.diffs.map(function(d) {\n" +
"    return d.op + ': SAA ' + d.saa.toFixed(2) + ' \\u2192 Monitoring ' + d.mon.toFixed(2) + ' MT (' + d.bon + ' bon)';\n" +
"  }).join('<br>');\n" +
"  return parts.join(' \\u00b7 ') + (detail && cmp.status !== 'no_trucks' ? '<div style=\"font-size:11px;color:#64748B;margin-top:2px;\">' + detail + '</div>' : '');\n" +
"}\n" +
"\n" +
"// View-only: compares this ship's saved STD rows with Monitoring. Saving happens in Edit Kapal.\n" +
"async function wlSyncFromMonitoring(pid) {\n" +
"  var btn = document.getElementById('wl-sync-btn-' + pid);\n" +
"  var resultDiv = document.getElementById('wl-sync-result-' + pid);\n" +
"  if (!resultDiv) return;\n" +
"  var el = document.getElementById('wl-panel-analisis');\n" +
"  var p = ((el && el._wlaProjects) || []).find(function(x) { return x.id === pid; });\n" +
"  if (!p || !p.project_code) { resultDiv.innerHTML = '<div style=\"color:#EF4444;font-size:12px;padding:8px;\">Kode proyek tidak tersedia di SERVIS SAA.</div>'; return; }\n" +
"  if (btn) { btn.textContent = 'Memuat...'; btn.disabled = true; }\n" +
"  try {\n" +
"    var mon = await wlFetchMonitoringStats(p.project_code);\n" +
"    if (!mon) throw new Error('Kode ' + p.project_code + ' belum ada di Woodlog Monitoring.');\n" +
"    var std = await wlFetchStdRows([pid]);\n" +
"    var cmp = wlCompareStd(Number(p.total_mt_m3 || 0), mon, std[pid] || []);\n" +
"    resultDiv.innerHTML = '<div style=\"font-size:12px;\">' + wlCompareSummaryHTML(cmp) + '</div>' +\n" +
"      (cmp.status === 'ok' ? '' : '<div style=\"font-size:11px;color:#64748B;margin-top:6px;\">Perbaiki lewat \\u270e Tonnage \\u2192 \\u21bb Sync dari Woodlog Monitoring \\u2192 Simpan Perubahan.</div>');\n" +
"  } catch(e) {\n" +
"    resultDiv.innerHTML = '<div style=\"color:#EF4444;font-size:12px;padding:8px;\">' + e.message + '</div>';\n" +
"  } finally {\n" +
"    if (btn) { btn.textContent = '\\u21bb Cek vs Woodlog Monitoring'; btn.disabled = false; }\n" +
"  }\n" +
"}\n" +
"\n" +
"async function wlCekVsMonitoring() {\n" +
"  var el = document.getElementById('wl-panel-analisis');\n" +
"  var out = document.getElementById('wl-cek-mon-result');\n" +
"  var btn = document.getElementById('wl-cek-mon-btn');\n" +
"  if (!el || !out) return;\n" +
"  var ships = ((el._wlaProjects) || []).filter(function(p) { return p.type === 'woodlog_kapal' && p.project_code; });\n" +
"  if (!ships.length) { out.innerHTML = ''; return; }\n" +
"  if (btn) { btn.disabled = true; btn.textContent = 'Memeriksa...'; }\n" +
"  try {\n" +
"    var std = await wlFetchStdRows(ships.map(function(p) { return p.id; }));\n" +
"    var rows = [], flagged = 0;\n" +
"    for (var i = 0; i < ships.length; i++) {\n" +
"      var p = ships[i], cell;\n" +
"      out.innerHTML = '<div style=\"font-size:12px;color:#64748B;\">Memeriksa ' + (i + 1) + ' / ' + ships.length + '...</div>';\n" +
"      try {\n" +
"        var mon = await wlFetchMonitoringStats(p.project_code);\n" +
"        if (!mon) { cell = '<span style=\"color:#DC2626;font-weight:700;\">Belum ada di Monitoring</span>'; flagged++; }\n" +
"        else {\n" +
"          var cmp = wlCompareStd(Number(p.total_mt_m3 || 0), mon, std[p.id] || []);\n" +
"          if (cmp.status === 'std_missing' || cmp.status === 'diff' || cmp.unknown.length) flagged++;\n" +
"          cell = wlCompareSummaryHTML(cmp);\n" +
"        }\n" +
"      } catch(e) { cell = '<span style=\"color:#EF4444;\">Gagal: ' + e.message + '</span>'; flagged++; }\n" +
"      var running = !p.end_date ? ' <span style=\"font-size:10px;color:#D97706;\">(berjalan)</span>' : '';\n" +
"      rows.push('<tr><td style=\"font-weight:700;color:#1D4ED8;white-space:nowrap;\">' + p.project_code + running + '</td><td>' + (p.nama_kapal || '\\u2014') + '</td><td>' + cell + '</td></tr>');\n" +
"    }\n" +
"    out.innerHTML = '<div style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;\">' +\n" +
"      '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\"><div style=\"font-size:13px;font-weight:800;color:#1E293B;\">Cek STD vs Woodlog Monitoring \\u00b7 ' + (ships.length - flagged) + ' sama, ' + flagged + ' perlu dicek</div>' +\n" +
"      '<button onclick=\"document.getElementById(\\'wl-cek-mon-result\\').innerHTML=\\'\\'\" style=\"font-size:12px;color:#64748B;background:none;border:none;cursor:pointer;\">Tutup</button></div>' +\n" +
"      '<div style=\"font-size:11px;color:#64748B;margin-bottom:8px;\">Tonase STD = BL SAA \\u00d7 0,95 \\u00f7 total ritase \\u00d7 bon operator. Perbaiki lewat \\u270e Tonnage \\u2192 \\u21bb Sync \\u2192 Simpan Perubahan.</div>' +\n" +
"      '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Kapal</th><th>Hasil</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div></div>';\n" +
"  } catch(e) {\n" +
"    out.innerHTML = '<div style=\"color:#EF4444;font-size:12px;\">Gagal: ' + e.message + '</div>';\n" +
"  } finally {\n" +
"    if (btn) { btn.disabled = false; btn.textContent = '\\u21bb Cek vs Monitoring'; }\n" +
"  }\n" +
"}\n" +
s.slice(rsEnd);

rep(
"id=\"wl-sync-btn-' + pid + '\" style=\"background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;\">\u21bb Sync dari Woodlog Monitoring</button>'",
"id=\"wl-sync-btn-' + pid + '\" style=\"background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;\">\u21bb Cek vs Woodlog Monitoring</button>'"
);

const curly = function(t) { return (t.match(/[\u2018\u2019]/g) || []).length; };
if (curly(s) !== curly(orig)) throw new Error('curly quote introduced');
fs.writeFileSync(path, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('patched OK');
