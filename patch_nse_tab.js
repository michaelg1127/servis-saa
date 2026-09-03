const fs = require('fs');
const FILE = 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
let fails = 0;
const N = '\r\n'; // CRITICAL: file uses CRLF line endings

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); fails++; return; }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); fails++; return; }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

// ============================================================
// PATCH 1 — Tab button: add NSE between Stockpile and Ringkasan Gaji
// ============================================================
replaceExact(
  '    <button id="proyek-tab-stockpile" onclick="switchProyekTab(\'stockpile\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Stockpile</button>' + N +
  '    <button id="proyek-tab-ringkasan" onclick="switchProyekTab(\'ringkasan\',this)"',
  '    <button id="proyek-tab-stockpile" onclick="switchProyekTab(\'stockpile\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Stockpile</button>' + N +
  '    <button id="proyek-tab-nse" onclick="switchProyekTab(\'nse\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">NSE</button>' + N +
  '    <button id="proyek-tab-ringkasan" onclick="switchProyekTab(\'ringkasan\',this)"',
  'PATCH 1: NSE tab button'
);

// ============================================================
// PATCH 2 — Panel div: add proyek-panel-nse after proyek-panel-stockpile
// ============================================================
replaceExact(
  '  <div id="proyek-panel-stockpile" style="display:none;"></div>' + N +
  '  <div id="proyek-panel-ringkasan" style="display:none;"></div>',
  '  <div id="proyek-panel-stockpile" style="display:none;"></div>' + N +
  '  <div id="proyek-panel-nse" style="display:none;"></div>' + N +
  '  <div id="proyek-panel-ringkasan" style="display:none;"></div>',
  'PATCH 2: NSE panel div'
);

// ============================================================
// PATCH 3 — Global vars: add nseData and _nseMonthFilter after proyekStockpileData
// ============================================================
replaceExact(
  'let proyekStockpileData = [];' + N +
  'let proyekMonthFilter',
  'let proyekStockpileData = [];' + N +
  'var nseData = [];' + N +
  'var _nseMonthFilter = (function(){ var d=new Date(); if(d.getDate()<=10){d.setMonth(d.getMonth()-1);} return d.toISOString().slice(0,7); })();' + N +
  'let proyekMonthFilter',
  'PATCH 3: nseData and _nseMonthFilter global vars'
);

// ============================================================
// PATCH 4 — switchProyekTab: add 'nse' to tabs array and load call
// ============================================================
replaceExact(
  'function switchProyekTab(tab, el) {' + N +
  '  proyekTab = tab;' + N +
  '  const tabs = [\'kapal\',\'stockpile\',\'ringkasan\',\'analisis\',\'kontinuitas\'];',
  'function switchProyekTab(tab, el) {' + N +
  '  proyekTab = tab;' + N +
  '  const tabs = [\'kapal\',\'stockpile\',\'nse\',\'ringkasan\',\'analisis\',\'kontinuitas\'];',
  'PATCH 4a: switchProyekTab tabs array'
);

replaceExact(
  '  if (tab === \'stockpile\') loadProyekStockpile();' + N +
  '  if (tab === \'ringkasan\') loadProyekRingkasan();',
  '  if (tab === \'stockpile\') loadProyekStockpile();' + N +
  '  if (tab === \'nse\') loadProyekNSE();' + N +
  '  if (tab === \'ringkasan\') loadProyekRingkasan();',
  'PATCH 4b: switchProyekTab nse load call'
);

// ============================================================
// PATCH 5 — loadProyekNSE() — add after loadProyekStockpile closing brace
// ============================================================
replaceExact(
  '  } catch(e) { panel.innerHTML = \'<div style="color:#EF4444;padding:20px;">Error: \' + e.message + \'</div>\'; }' + N +
  '}' + N +
  N +
  'function renderProyekStockpileList()',
  '  } catch(e) { panel.innerHTML = \'<div style="color:#EF4444;padding:20px;">Error: \' + e.message + \'</div>\'; }' + N +
  '}' + N +
  N +
  'async function loadProyekNSE() {' + N +
  '  var panel = document.getElementById(\'proyek-panel-nse\');' + N +
  '  panel.innerHTML = \'<div style="color:#64748B;padding:20px;">Memuat data...</div>\';' + N +
  '  try {' + N +
  '    var res = await sb.from(\'nse_sessions\').select(\'*, units(code,name)\').eq(\'month_year\', _nseMonthFilter).order(\'session_date\').order(\'session_num\');' + N +
  '    if (res.error) throw res.error;' + N +
  '    nseData = res.data || [];' + N +
  '    renderProyekNSEList();' + N +
  '  } catch(e) { panel.innerHTML = \'<div style="color:#EF4444;padding:20px;">Error: \' + e.message + \'</div>\'; }' + N +
  '}' + N +
  N +
  'function renderProyekStockpileList()',
  'PATCH 5: loadProyekNSE()'
);

// ============================================================
// PATCH 6 — renderProyekNSEList() + helpers — add after loadProyekStockpile block
// Insert after loadProyekNSE (which we just added), before renderProyekStockpileList
// We'll anchor on "function renderProyekStockpileList()" which is unique
// ============================================================
replaceExact(
  'function renderProyekStockpileList() {' + N +
  '  const panel = document.getElementById(\'proyek-panel-stockpile\');',
  'function _nseHrs(start, end) {' + N +
  '  function dec(t) { var p=t.split(\':\'); return parseInt(p[0])+parseInt(p[1])/60; }' + N +
  '  var s=dec(start), e=dec(end);' + N +
  '  return e > s ? e - s : (24 - s) + e;' + N +
  '}' + N +
  'function _isOvernight(start, end) { function dec(t){var p=t.split(\':\');return parseInt(p[0])+parseInt(p[1])/60;} return dec(end)<=dec(start); }' + N +
  N +
  'function renderProyekNSEList() {' + N +
  '  var panel = document.getElementById(\'proyek-panel-nse\');' + N +
  '  var h = \'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">\';' + N +
  '  h += \'<div style="font-size:15px;font-weight:700;color:#1E293B;">NSE — Sesi Kerja</div>\';' + N +
  '  h += \'<div style="display:flex;gap:8px;align-items:center;">\';' + N +
  '  h += \'<input type="month" value="\' + _nseMonthFilter + \'" onchange="_nseMonthFilter=this.value;loadProyekNSE();" style="border:1px solid #CBD5E1;border-radius:6px;padding:6px 10px;font-size:13px;">\';' + N +
  '  h += \'<button onclick="openAddNSEModal()" class="btn-primary" style="padding:8px 16px;font-size:13px;width:auto;">+ Tambah Sesi</button>\';' + N +
  '  h += \'</div></div>\';' + N +
  '  if (nseData.length === 0) {' + N +
  '    h += \'<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Tidak ada sesi NSE bulan ini.</div>\';' + N +
  '    panel.innerHTML = h; return;' + N +
  '  }' + N +
  '  // Group by date' + N +
  '  var dateGroups = {};' + N +
  '  var dateOrder = [];' + N +
  '  nseData.forEach(function(s) {' + N +
  '    if (!dateGroups[s.session_date]) { dateGroups[s.session_date] = []; dateOrder.push(s.session_date); }' + N +
  '    dateGroups[s.session_date].push(s);' + N +
  '  });' + N +
  '  h += \'<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">\';' + N +
  '  h += \'<thead><tr style="background:#F1F5F9;">\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;">Tanggal</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;">Sesi</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;">Unit</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;">Start</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;">End</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;text-align:right;">Billed Hrs</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;text-align:right;">HM Awal</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;text-align:right;">HM Akhir</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;text-align:right;">HM Gap</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;font-weight:700;color:#475569;text-align:right;">Salary</th>\';' + N +
  '  h += \'<th style="padding:10px 12px;"></th>\';' + N +
  '  h += \'</tr></thead><tbody>\';' + N +
  '  var grandHrs = 0, grandSalary = 0;' + N +
  '  dateOrder.forEach(function(date) {' + N +
  '    var sessions = dateGroups[date];' + N +
  '    var dayHrs = 0, daySalary = 0;' + N +
  '    var dateParts = date.split(\'-\');' + N +
  '    var dateLabel = dateParts[2] + \' \' + [\'Jan\',\'Feb\',\'Mar\',\'Apr\',\'Mei\',\'Jun\',\'Jul\',\'Ags\',\'Sep\',\'Okt\',\'Nov\',\'Des\'][parseInt(dateParts[1],10)-1];' + N +
  '    sessions.forEach(function(s, si) {' + N +
  '      var hrs = _nseHrs(s.start_time, s.end_time);' + N +
  '      var salary = Math.round(hrs * 35000);' + N +
  '      dayHrs += hrs; daySalary += salary;' + N +
  '      grandHrs += hrs; grandSalary += salary;' + N +
  '      var overnight = _isOvernight(s.start_time, s.end_time);' + N +
  '      var unitCode = s.units ? s.units.code : \'?\';' + N +
  '      var startFmt = s.start_time.slice(0,5);' + N +
  '      var endFmt = s.end_time.slice(0,5);' + N +
  '      var hmGap = (s.hm_awal != null && s.hm_akhir != null) ? (s.hm_akhir - s.hm_awal).toFixed(1) : \'—\';' + N +
  '      h += \'<tr style="border-bottom:1px solid #F1F5F9;">\';' + N +
  '      h += \'<td style="padding:10px 12px;white-space:nowrap;font-weight:600;">\' + (si===0 ? dateLabel : \'\') + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;text-align:center;">\' + s.session_num + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;font-weight:700;">\' + unitCode + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;">\' + startFmt + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;">\' + endFmt + (overnight ? \' <span style="background:#FEF3C7;color:#B45309;font-size:10px;font-weight:700;padding:2px 5px;border-radius:99px;">&#8593;</span>\' : \'\') + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;text-align:right;font-weight:700;">\' + hrs.toFixed(1) + \'j</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;text-align:right;">\' + (s.hm_awal != null ? s.hm_awal : \'—\') + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;text-align:right;">\' + (s.hm_akhir != null ? s.hm_akhir : \'—\') + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;text-align:right;">\' + hmGap + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;text-align:right;font-weight:700;color:#16A34A;">\' + fmtRp(salary) + \'</td>\';' + N +
  '      h += \'<td style="padding:10px 12px;white-space:nowrap;">\' +' + N +
  '        \'<button onclick="openEditNSEModal(\\\'\' + s.id + \'\\\')" style="background:#EFF6FF;border:1.5px solid #93C5FD;color:#1D4ED8;font-size:12px;font-weight:700;padding:4px 10px;border-radius:7px;cursor:pointer;margin-right:4px;">✎</button>\' +' + N +
  '        \'<button onclick="deleteNSESession(\\\'\' + s.id + \'\\\')" style="background:#FEF2F2;border:1.5px solid #FECACA;color:#DC2626;font-size:12px;font-weight:700;padding:4px 10px;border-radius:7px;cursor:pointer;">🗑</button>\' +' + N +
  '        \'</td>\';' + N +
  '      h += \'</tr>\';' + N +
  '    });' + N +
  '    // Date subtotal row' + N +
  '    h += \'<tr style="background:#F8FAFC;border-bottom:2px solid #E2E8F0;">\';' + N +
  '    h += \'<td colspan="5" style="padding:8px 12px;font-size:12px;color:#64748B;font-style:italic;">Subtotal \' + dateLabel + \'</td>\';' + N +
  '    h += \'<td style="padding:8px 12px;text-align:right;font-weight:700;">\' + dayHrs.toFixed(1) + \'j</td>\';' + N +
  '    h += \'<td colspan="2"></td>\';' + N +
  '    h += \'<td></td>\';' + N +
  '    h += \'<td style="padding:8px 12px;text-align:right;font-weight:700;color:#16A34A;">\' + fmtRp(daySalary) + \'</td>\';' + N +
  '    h += \'<td></td></tr>\';' + N +
  '  });' + N +
  '  // Grand total' + N +
  '  h += \'<tr style="background:#EFF6FF;border-top:2px solid #BFDBFE;">\';' + N +
  '  h += \'<td colspan="5" style="padding:10px 12px;font-size:13px;font-weight:800;color:#1D4ED8;">GRAND TOTAL</td>\';' + N +
  '  h += \'<td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:800;color:#1D4ED8;">\' + grandHrs.toFixed(1) + \'j</td>\';' + N +
  '  h += \'<td colspan="3"></td>\';' + N +
  '  h += \'<td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:800;color:#1D4ED8;">\' + fmtRp(grandSalary) + \'</td>\';' + N +
  '  h += \'<td></td></tr>\';' + N +
  '  h += \'</tbody></table></div>\';' + N +
  '  panel.innerHTML = h;' + N +
  '}' + N +
  N +
  'function renderProyekStockpileList() {' + N +
  '  const panel = document.getElementById(\'proyek-panel-stockpile\');',
  'PATCH 6: _nseHrs, _isOvernight helpers + renderProyekNSEList()'
);

// ============================================================
// PATCH 7 — openAddNSEModal() and openEditNSEModal(id)
// Add before openEditStockpileModal
// ============================================================
replaceExact(
  'function openEditStockpileModal(id) {' + N +
  '  const p = proyekStockpileData.find(function(x) { return x.id === id; });',
  'function _nsePreviewUpdate() {' + N +
  '  var startEl = document.getElementById(\'nse-m-start\');' + N +
  '  var endEl = document.getElementById(\'nse-m-end\');' + N +
  '  var prevEl = document.getElementById(\'nse-m-preview\');' + N +
  '  if (!startEl || !endEl || !prevEl) return;' + N +
  '  var start = startEl.value; var end = endEl.value;' + N +
  '  if (!start || !end) { prevEl.innerHTML = \'\'; return; }' + N +
  '  var hrs = _nseHrs(start + \':00\', end + \':00\');' + N +
  '  var overnight = _isOvernight(start + \':00\', end + \':00\');' + N +
  '  var salary = Math.round(hrs * 35000);' + N +
  '  var badge = overnight ? \' <span style="background:#FEF3C7;color:#B45309;font-size:11px;font-weight:700;padding:2px 6px;border-radius:99px;">Overnight &#8593;</span>\' : \'\';' + N +
  '  prevEl.innerHTML = \'<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-top:4px;">\' +' + N +
  '    \'<span style="font-size:13px;font-weight:700;color:#16A34A;">\' + hrs.toFixed(1) + \' jam\' + badge + \' — \' + fmtRp(salary) + \'</span></div>\';' + N +
  '}' + N +
  N +
  'async function openAddNSEModal() {' + N +
  '  var units = (window.allUnits && allUnits.length > 0) ? allUnits : [];' + N +
  '  if (units.length === 0) {' + N +
  '    var ur = await sb.from(\'units\').select(\'id,code,name\').order(\'code\');' + N +
  '    units = ur.data || [];' + N +
  '  }' + N +
  '  var unitOpts = units.map(function(u) { return \'<option value="\' + u.id + \'">\' + u.code + (u.name ? \' — \' + u.name : \'\') + \'</option>\'; }).join(\'\');' + N +
  '  var today = new Date().toISOString().slice(0,10);' + N +
  '  var modalHTML = \'<div style="padding:24px;max-width:480px;width:100%;">\' +' + N +
  '    \'<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;">Tambah Sesi NSE</div>\' +' + N +
  '    \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tanggal *</label><input type="date" id="nse-m-date" class="finput" value="\' + today + \'"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Sesi *</label><select id="nse-m-sesi" class="finput"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>\' +' + N +
  '    \'</div>\' +' + N +
  '    \'<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Unit *</label><select id="nse-m-unit" class="finput"><option value="">-- Pilih Unit --</option>\' + unitOpts + \'</select></div>\' +' + N +
  '    \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Jam Mulai *</label><input type="time" id="nse-m-start" class="finput" oninput="_nsePreviewUpdate()"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Jam Selesai *</label><input type="time" id="nse-m-end" class="finput" oninput="_nsePreviewUpdate()"></div>\' +' + N +
  '    \'</div>\' +' + N +
  '    \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Awal</label><input type="number" step="0.1" id="nse-m-hmawal" class="finput" placeholder="Opsional"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Akhir</label><input type="number" step="0.1" id="nse-m-hmakhir" class="finput" placeholder="Opsional"></div>\' +' + N +
  '    \'</div>\' +' + N +
  '    \'<div id="nse-m-preview" style="margin-bottom:12px;"></div>\' +' + N +
  '    \'<div style="display:flex;gap:12px;margin-top:16px;">\' +' + N +
  '    \'<button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>\' +' + N +
  '    \'<button onclick="submitAddNSE()" class="btn-primary" style="flex:2;">Simpan Sesi</button>\' +' + N +
  '    \'</div></div>\';' + N +
  '  document.getElementById(\'modal-box\').innerHTML = modalHTML;' + N +
  '  document.getElementById(\'modal-overlay\').style.display = \'flex\';' + N +
  '}' + N +
  N +
  'async function openEditNSEModal(id) {' + N +
  '  var s = nseData.find(function(x) { return x.id === id; });' + N +
  '  if (!s) { showToast(\'Data tidak ditemukan\'); return; }' + N +
  '  var units = (window.allUnits && allUnits.length > 0) ? allUnits : [];' + N +
  '  if (units.length === 0) {' + N +
  '    var ur = await sb.from(\'units\').select(\'id,code,name\').order(\'code\');' + N +
  '    units = ur.data || [];' + N +
  '  }' + N +
  '  var unitOpts = units.map(function(u) { return \'<option value="\' + u.id + \'" \' + (u.id === s.unit_id ? \'selected\' : \'\') + \'>\' + u.code + (u.name ? \' — \' + u.name : \'\') + \'</option>\'; }).join(\'\');' + N +
  '  var startVal = s.start_time ? s.start_time.slice(0,5) : \'\';' + N +
  '  var endVal = s.end_time ? s.end_time.slice(0,5) : \'\';' + N +
  '  var modalHTML = \'<div style="padding:24px;max-width:480px;width:100%;">\' +' + N +
  '    \'<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;">Edit Sesi NSE</div>\' +' + N +
  '    \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tanggal *</label><input type="date" id="nse-m-date" class="finput" value="\' + s.session_date + \'"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Sesi *</label><select id="nse-m-sesi" class="finput"><option value="1" \' + (s.session_num===1?\'selected\':\'\') + \'>1</option><option value="2" \' + (s.session_num===2?\'selected\':\'\') + \'>2</option><option value="3" \' + (s.session_num===3?\'selected\':\'\') + \'>3</option></select></div>\' +' + N +
  '    \'</div>\' +' + N +
  '    \'<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Unit *</label><select id="nse-m-unit" class="finput"><option value="">-- Pilih Unit --</option>\' + unitOpts + \'</select></div>\' +' + N +
  '    \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Jam Mulai *</label><input type="time" id="nse-m-start" class="finput" value="\' + startVal + \'" oninput="_nsePreviewUpdate()"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Jam Selesai *</label><input type="time" id="nse-m-end" class="finput" value="\' + endVal + \'" oninput="_nsePreviewUpdate()"></div>\' +' + N +
  '    \'</div>\' +' + N +
  '    \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Awal</label><input type="number" step="0.1" id="nse-m-hmawal" class="finput" value="\' + (s.hm_awal != null ? s.hm_awal : \'\') + \'"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Akhir</label><input type="number" step="0.1" id="nse-m-hmakhir" class="finput" value="\' + (s.hm_akhir != null ? s.hm_akhir : \'\') + \'"></div>\' +' + N +
  '    \'</div>\' +' + N +
  '    \'<div id="nse-m-preview" style="margin-bottom:12px;"></div>\' +' + N +
  '    \'<div style="display:flex;gap:12px;margin-top:16px;">\' +' + N +
  '    \'<button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>\' +' + N +
  '    \'<button onclick="submitEditNSE(\\\'\' + id + \'\\\')" class="btn-primary" style="flex:2;">Simpan Perubahan</button>\' +' + N +
  '    \'</div></div>\';' + N +
  '  document.getElementById(\'modal-box\').innerHTML = modalHTML;' + N +
  '  document.getElementById(\'modal-overlay\').style.display = \'flex\';' + N +
  '  setTimeout(_nsePreviewUpdate, 50);' + N +
  '}' + N +
  N +
  'function openEditStockpileModal(id) {' + N +
  '  const p = proyekStockpileData.find(function(x) { return x.id === id; });',
  'PATCH 7: openAddNSEModal(), openEditNSEModal(id), _nsePreviewUpdate()'
);

// ============================================================
// PATCH 8 — submitAddNSE(), submitEditNSE(id), deleteNSESession(id)
// Add before downloadImportTemplate (which comes after submitEditStockpile)
// ============================================================
replaceExact(
  'function downloadImportTemplate(type) {',
  'async function submitAddNSE() {' + N +
  '  var date = document.getElementById(\'nse-m-date\').value;' + N +
  '  var sesi = parseInt(document.getElementById(\'nse-m-sesi\').value);' + N +
  '  var unitId = document.getElementById(\'nse-m-unit\').value;' + N +
  '  var start = document.getElementById(\'nse-m-start\').value;' + N +
  '  var end = document.getElementById(\'nse-m-end\').value;' + N +
  '  var hmAwal = document.getElementById(\'nse-m-hmawal\').value;' + N +
  '  var hmAkhir = document.getElementById(\'nse-m-hmakhir\').value;' + N +
  '  hmAwal = hmAwal !== \'\' ? parseFloat(hmAwal) : null;' + N +
  '  hmAkhir = hmAkhir !== \'\' ? parseFloat(hmAkhir) : null;' + N +
  '  if (!date || !start || !end || !unitId) { showToast(\'Lengkapi semua field wajib\'); return; }' + N +
  '  if (hmAwal != null && hmAkhir != null && hmAkhir < hmAwal) { showToast(\'HM Akhir harus >= HM Awal\'); return; }' + N +
  '  var monthYear = date.slice(0,7);' + N +
  '  var res = await sb.from(\'nse_sessions\').insert({ session_date:date, session_num:sesi, start_time:start+\':00\', end_time:end+\':00\', hm_awal:hmAwal, hm_akhir:hmAkhir, unit_id:unitId, month_year:monthYear });' + N +
  '  if (res.error) {' + N +
  '    if (res.error.code === \'23505\') { showToast(\'Sesi \' + sesi + \' untuk tanggal ini sudah ada\'); }' + N +
  '    else { showToast(\'Gagal simpan: \' + res.error.message); }' + N +
  '    return;' + N +
  '  }' + N +
  '  closeModal(); loadProyekNSE(); showToast(\'Sesi ditambahkan\', \'success\');' + N +
  '}' + N +
  N +
  'async function submitEditNSE(id) {' + N +
  '  var date = document.getElementById(\'nse-m-date\').value;' + N +
  '  var sesi = parseInt(document.getElementById(\'nse-m-sesi\').value);' + N +
  '  var unitId = document.getElementById(\'nse-m-unit\').value;' + N +
  '  var start = document.getElementById(\'nse-m-start\').value;' + N +
  '  var end = document.getElementById(\'nse-m-end\').value;' + N +
  '  var hmAwal = document.getElementById(\'nse-m-hmawal\').value;' + N +
  '  var hmAkhir = document.getElementById(\'nse-m-hmakhir\').value;' + N +
  '  hmAwal = hmAwal !== \'\' ? parseFloat(hmAwal) : null;' + N +
  '  hmAkhir = hmAkhir !== \'\' ? parseFloat(hmAkhir) : null;' + N +
  '  if (!date || !start || !end || !unitId) { showToast(\'Lengkapi semua field wajib\'); return; }' + N +
  '  if (hmAwal != null && hmAkhir != null && hmAkhir < hmAwal) { showToast(\'HM Akhir harus >= HM Awal\'); return; }' + N +
  '  var monthYear = date.slice(0,7);' + N +
  '  var res = await sb.from(\'nse_sessions\').update({ session_date:date, session_num:sesi, start_time:start+\':00\', end_time:end+\':00\', hm_awal:hmAwal, hm_akhir:hmAkhir, unit_id:unitId, month_year:monthYear }).eq(\'id\', id);' + N +
  '  if (res.error) {' + N +
  '    if (res.error.code === \'23505\') { showToast(\'Sesi \' + sesi + \' untuk tanggal ini sudah ada\'); }' + N +
  '    else { showToast(\'Gagal simpan: \' + res.error.message); }' + N +
  '    return;' + N +
  '  }' + N +
  '  closeModal(); loadProyekNSE(); showToast(\'Sesi diperbarui\', \'success\');' + N +
  '}' + N +
  N +
  'async function deleteNSESession(id) {' + N +
  '  if (!confirm(\'Hapus sesi ini?\')) return;' + N +
  '  var res = await sb.from(\'nse_sessions\').delete().eq(\'id\', id);' + N +
  '  if (res.error) { showToast(\'Gagal hapus: \' + res.error.message); return; }' + N +
  '  loadProyekNSE(); showToast(\'Sesi dihapus\', \'success\');' + N +
  '}' + N +
  N +
  'function downloadImportTemplate(type) {',
  'PATCH 8: submitAddNSE, submitEditNSE, deleteNSESession'
);

// ============================================================
// PATCH 9 — loadProyekRingkasan(): fetch NSE sessions and pass to render
// ============================================================
replaceExact(
  '    const [projRes, unitRes, kasbonRes, staffRes] = await Promise.all([' + N +
  '      sb.from(\'projects\')' + N +
  '        .select(\'*, project_units(*, units(code, name, operator_name))\')' + N +
  '        .in(\'type\', [\'kapal\', \'stockpile\'])' + N +
  '        .gte(\'end_date\', firstDay)' + N +
  '        .lte(\'end_date\', lastDay),' + N +
  '      sb.from(\'units\').select(\'code, operator_name\'),' + N +
  '      sb.from(\'proyek_kasbon\').select(\'*\').eq(\'month_year\', monthYear),' + N +
  '      sb.from(\'staff_salary\').select(\'id,name,role,monthly_amount,bank_name,bank_account_number,bank_account_name\').eq(\'is_active\', true).order(\'name\')' + N +
  '    ]);' + N +
  '    if (projRes.error) throw projRes.error;' + N +
  '    renderProyekRingkasan(projRes.data || [], unitRes.data || [], kasbonRes.data || [], monthYear, staffRes.data || []);',
  '    const [projRes, unitRes, kasbonRes, staffRes, nseRes] = await Promise.all([' + N +
  '      sb.from(\'projects\')' + N +
  '        .select(\'*, project_units(*, units(code, name, operator_name))\')' + N +
  '        .in(\'type\', [\'kapal\', \'stockpile\'])' + N +
  '        .gte(\'end_date\', firstDay)' + N +
  '        .lte(\'end_date\', lastDay),' + N +
  '      sb.from(\'units\').select(\'code, operator_name\'),' + N +
  '      sb.from(\'proyek_kasbon\').select(\'*\').eq(\'month_year\', monthYear),' + N +
  '      sb.from(\'staff_salary\').select(\'id,name,role,monthly_amount,bank_name,bank_account_number,bank_account_name\').eq(\'is_active\', true).order(\'name\'),' + N +
  '      sb.from(\'nse_sessions\').select(\'*, units(code,name)\').eq(\'month_year\', monthYear).is(\'paid_batch\', null).order(\'session_date\').order(\'session_num\')' + N +
  '    ]);' + N +
  '    if (projRes.error) throw projRes.error;' + N +
  '    var nseUnpaid = nseRes.data || [];' + N +
  '    renderProyekRingkasan(projRes.data || [], unitRes.data || [], kasbonRes.data || [], monthYear, staffRes.data || [], nseUnpaid);',
  'PATCH 9: loadProyekRingkasan fetch NSE sessions'
);

// ============================================================
// PATCH 10 — renderProyekRingkasan(): update signature + NSE section + store ids
// Step 10a: Update function signature
// ============================================================
replaceExact(
  'function renderProyekRingkasan(projects, allUnits, kasbons, monthYear, fixedStaff) {',
  'function renderProyekRingkasan(projects, allUnits, kasbons, monthYear, fixedStaff, nseSessions) {',
  'PATCH 10a: renderProyekRingkasan signature'
);

// Step 10b: remove NSE from kapal batch logic (isNSE cleanup) and store NSE ids
replaceExact(
  '  function isNSE(p) { return p.type === \'stockpile\' && p.code_prefix === \'NSE\'; }' + N +
  '  const batch16 = unpaid.filter(function(p) { return (p.type === \'kapal\' || isNSE(p)) && dayOf(p.end_date) <= 15; });' + N +
  '  const batch31Kapal = unpaid.filter(function(p) { return (p.type === \'kapal\' || isNSE(p)) && dayOf(p.end_date) > 15; });' + N +
  '  const batch31Stk = unpaid.filter(function(p) { return p.type === \'stockpile\' && !isNSE(p); });',
  '  var nseSess = nseSessions || [];' + N +
  '  var nseBatch16 = nseSess.filter(function(s) { return dayOf(s.session_date) <= 15; });' + N +
  '  var nseBatch31 = nseSess.filter(function(s) { return dayOf(s.session_date) > 15; });' + N +
  '  panel._nseBatch16Ids = nseBatch16.map(function(s) { return s.id; });' + N +
  '  panel._nseBatch31Ids = nseBatch31.map(function(s) { return s.id; });' + N +
  '  panel._allNseSessions = nseSess;' + N +
  '  const batch16 = unpaid.filter(function(p) { return p.type === \'kapal\' && dayOf(p.end_date) <= 15; });' + N +
  '  const batch31Kapal = unpaid.filter(function(p) { return p.type === \'kapal\' && dayOf(p.end_date) > 15; });' + N +
  '  const batch31Stk = unpaid.filter(function(p) { return p.type === \'stockpile\'; });',
  'PATCH 10b: remove isNSE from kapal batches, add NSE batch ids'
);

// Step 10c: Add NSE section after the Batch 31 closing div, before panel.innerHTML = h
// Anchor uses exact file content (double-escaped backslash before quotes in onclick attr)
{
  var _from10c = "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Lunas Batch 31</button></div>';" + N +
    "  }" + N +
    "  h += '</div>';" + N +
    "  panel.innerHTML = h;";
  var _nseSection = N +
    "  // NSE section" + N +
    "  if (nseSess.length > 0) {" + N +
    "    h += '<div style=\"background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:16px;margin-top:20px;\">';" + N +
    "    h += '<div style=\"font-size:14px;font-weight:800;color:#C2410C;margin-bottom:12px;\">NSE — Sesi Belum Dibayar</div>';" + N +
    "    function _nseRingkasanBatch(sessions, label, batchType) {" + N +
    "      if (sessions.length === 0) return '';" + N +
    "      var bh = '<div style=\"margin-bottom:12px;\">';" + N +
    "      bh += '<div style=\"font-size:13px;font-weight:700;color:#9A3412;margin-bottom:8px;\">' + label + '</div>';" + N +
    "      bh += '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:12px;\">';" + N +
    "      bh += '<thead><tr style=\"background:#FFEDD5;\"><th style=\"padding:7px 10px;text-align:left;\">Tanggal</th><th style=\"padding:7px 10px;\">Sesi</th><th style=\"padding:7px 10px;\">Unit</th><th style=\"padding:7px 10px;\">Mulai</th><th style=\"padding:7px 10px;\">Selesai</th><th style=\"padding:7px 10px;text-align:right;\">Billed Hrs</th><th style=\"padding:7px 10px;text-align:right;\">Salary</th></tr></thead><tbody>';" + N +
    "      var totalHrs = 0, totalSalary = 0;" + N +
    "      sessions.forEach(function(s) {" + N +
    "        var hrs = _nseHrs(s.start_time, s.end_time);" + N +
    "        var salary = Math.round(hrs * 35000);" + N +
    "        totalHrs += hrs; totalSalary += salary;" + N +
    "        var overnight = _isOvernight(s.start_time, s.end_time);" + N +
    "        var unitCode = s.units ? s.units.code : '?';" + N +
    "        bh += '<tr style=\"border-bottom:1px solid #FED7AA;\">';" + N +
    "        bh += '<td style=\"padding:7px 10px;\">' + s.session_date + '</td>';" + N +
    "        bh += '<td style=\"padding:7px 10px;text-align:center;\">' + s.session_num + '</td>';" + N +
    "        bh += '<td style=\"padding:7px 10px;font-weight:700;\">' + unitCode + '</td>';" + N +
    "        bh += '<td style=\"padding:7px 10px;\">' + s.start_time.slice(0,5) + '</td>';" + N +
    "        bh += '<td style=\"padding:7px 10px;\">' + s.end_time.slice(0,5) + (overnight ? ' &#8593;' : '') + '</td>';" + N +
    "        bh += '<td style=\"padding:7px 10px;text-align:right;\">' + hrs.toFixed(1) + 'j</td>';" + N +
    "        bh += '<td style=\"padding:7px 10px;text-align:right;font-weight:700;\">' + fmtRp(salary) + '</td></tr>';" + N +
    "      });" + N +
    "      bh += '<tr style=\"background:#FFEDD5;font-weight:700;\"><td colspan=\"5\" style=\"padding:7px 10px;\">Subtotal ' + label + '</td><td style=\"padding:7px 10px;text-align:right;\">' + totalHrs.toFixed(1) + 'j</td><td style=\"padding:7px 10px;text-align:right;\">' + fmtRp(totalSalary) + '</td></tr>';" + N +
    "      bh += '</tbody></table></div>';" + N +
    "      bh += '<div style=\"margin-top:8px;\"><button onclick=\"markNSEPaid(\\'' + batchType + '\\')\" style=\"background:#EA580C;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;\">Tandai Lunas NSE ' + label + '</button></div>';" + N +
    "      bh += '</div>';" + N +
    "      return bh;" + N +
    "    }" + N +
    "    h += _nseRingkasanBatch(nseBatch16, 'Batch 16 (Tgl 1-15)', 'mid_month');" + N +
    "    h += _nseRingkasanBatch(nseBatch31, 'Batch 31 (Tgl 16-31)', 'end_month');" + N +
    "    h += '</div>';" + N +
    "  }";
  var _to10c = "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Lunas Batch 31</button></div>';" + N +
    "  }" + N +
    "  h += '</div>';" + N +
    _nseSection + N +
    "  panel.innerHTML = h;";
  replaceExact(_from10c, _to10c, 'PATCH 10c: NSE section in renderProyekRingkasan');
}

// ============================================================
// PATCH 11 — markNSEPaid(batchType) — add after markProyekPaid
// ============================================================
replaceExact(
  'async function saveProyekKasbon(monthYear) {',
  'async function markNSEPaid(batchType) {' + N +
  '  var el = document.getElementById(\'proyek-panel-ringkasan\');' + N +
  '  var ids = batchType === \'mid_month\' ? (el._nseBatch16Ids || []) : (el._nseBatch31Ids || []);' + N +
  '  if (!ids || ids.length === 0) { showToast(\'Tidak ada sesi NSE untuk batch ini\'); return; }' + N +
  '  if (!confirm(\'Tandai \' + ids.length + \' sesi NSE sebagai sudah dibayar?\')) return;' + N +
  '  var res = await sb.from(\'nse_sessions\').update({ paid_batch: batchType }).in(\'id\', ids);' + N +
  '  if (res.error) { showToast(\'Gagal: \' + res.error.message); return; }' + N +
  '  showToast(\'NSE ditandai lunas\', \'success\'); loadProyekRingkasan();' + N +
  '}' + N +
  N +
  'async function saveProyekKasbon(monthYear) {',
  'PATCH 11: markNSEPaid()'
);

// ============================================================
// PATCH 12 — exportProyekExcel(): add NSE sheet after Stockpile sheet
// ============================================================
replaceExact(
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stkRows), \'Stockpile\');' + N +
  '  // Sheet 3 - Salary Summary',
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stkRows), \'Stockpile\');' + N +
  '  // Sheet NSE' + N +
  '  var _nseExSessions = panel._allNseSessions || [];' + N +
  '  var nseRows = [[\'Tanggal\',\'Sesi\',\'Unit\',\'Jam Mulai\',\'Jam Selesai\',\'Overnight\',\'Billed Hrs\',\'HM Awal\',\'HM Akhir\',\'HM Gap\',\'Salary\']];' + N +
  '  var _nseExDateGroups = {}, _nseExDateOrder = [];' + N +
  '  _nseExSessions.forEach(function(s) {' + N +
  '    if (!_nseExDateGroups[s.session_date]) { _nseExDateGroups[s.session_date] = []; _nseExDateOrder.push(s.session_date); }' + N +
  '    _nseExDateGroups[s.session_date].push(s);' + N +
  '  });' + N +
  '  var _nseExGrandHrs = 0, _nseExGrandSalary = 0;' + N +
  '  _nseExDateOrder.forEach(function(date) {' + N +
  '    var sessList = _nseExDateGroups[date];' + N +
  '    var dayHrs = 0, daySalary = 0;' + N +
  '    sessList.forEach(function(s) {' + N +
  '      var hrs = _nseHrs(s.start_time, s.end_time);' + N +
  '      var salary = Math.round(hrs * 35000);' + N +
  '      dayHrs += hrs; daySalary += salary;' + N +
  '      var overnight = _isOvernight(s.start_time, s.end_time);' + N +
  '      var hmGap = (s.hm_awal != null && s.hm_akhir != null) ? s.hm_akhir - s.hm_awal : null;' + N +
  '      nseRows.push([s.session_date, s.session_num, s.units ? s.units.code : \'?\', s.start_time.slice(0,5), s.end_time.slice(0,5), overnight ? \'Ya\' : \'Tidak\', +hrs.toFixed(1), s.hm_awal, s.hm_akhir, hmGap, salary]);' + N +
  '    });' + N +
  '    _nseExGrandHrs += dayHrs; _nseExGrandSalary += daySalary;' + N +
  '    nseRows.push([\'Subtotal \' + date, \'\', \'\', \'\', \'\', \'\', +dayHrs.toFixed(1), \'\', \'\', \'\', daySalary]);' + N +
  '  });' + N +
  '  if (_nseExSessions.length > 0) nseRows.push([\'GRAND TOTAL\', \'\', \'\', \'\', \'\', \'\', +_nseExGrandHrs.toFixed(1), \'\', \'\', \'\', _nseExGrandSalary]);' + N +
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(nseRows), \'NSE\');' + N +
  '  // Sheet 3 - Salary Summary',
  'PATCH 12: NSE sheet in exportProyekExcel'
);

// ============================================================
// PATCH 13 — exportBatchExcel(): cleanup _isNSE and add NSE sheet
// Step 13a: Remove _isNSE from kapal filter
// ============================================================
replaceExact(
  '  function _isNSE(p) { return p.type === \'stockpile\' && p.code_prefix === \'NSE\'; }' + N +
  '  function _dayOf(d) { return d ? parseInt(d.slice(8,10), 10) : 0; }' + N +
  '  const projects = batchType === \'mid_month\'' + N +
  '    ? allProjects.filter(function(p) { return (p.type === \'kapal\' || _isNSE(p)) && _dayOf(p.end_date) <= 15; })' + N +
  '    : allProjects.filter(function(p) { return ((p.type === \'kapal\' || _isNSE(p)) && _dayOf(p.end_date) > 15) || (p.type === \'stockpile\' && !_isNSE(p)); });',
  '  function _dayOf(d) { return d ? parseInt(d.slice(8,10), 10) : 0; }' + N +
  '  const projects = batchType === \'mid_month\'' + N +
  '    ? allProjects.filter(function(p) { return p.type === \'kapal\' && _dayOf(p.end_date) <= 15; })' + N +
  '    : allProjects.filter(function(p) { return (p.type === \'kapal\' && _dayOf(p.end_date) > 15) || p.type === \'stockpile\'; });',
  'PATCH 13a: remove _isNSE from exportBatchExcel'
);

// Step 13b: add NSE sheet to exportBatchExcel before the Download section
replaceExact(
  '  // Download' + N +
  '  const label = batchType === \'mid_month\' ? \'Batch16\' : \'Batch31\';',
  '  // NSE sheet in batch export' + N +
  '  var _batchNseIds = batchType === \'mid_month\' ? (panel._nseBatch16Ids || []) : (panel._nseBatch31Ids || []);' + N +
  '  var _batchNseSessions = (panel._allNseSessions || []).filter(function(s) { return _batchNseIds.indexOf(s.id) >= 0; });' + N +
  '  if (_batchNseSessions.length > 0) {' + N +
  '    var _bNseRows = [[\'Tanggal\',\'Sesi\',\'Unit\',\'Jam Mulai\',\'Jam Selesai\',\'Overnight\',\'Billed Hrs\',\'HM Awal\',\'HM Akhir\',\'HM Gap\',\'Salary\']];' + N +
  '    var _bNseGrandHrs = 0, _bNseGrandSalary = 0;' + N +
  '    _batchNseSessions.forEach(function(s) {' + N +
  '      var hrs = _nseHrs(s.start_time, s.end_time);' + N +
  '      var salary = Math.round(hrs * 35000);' + N +
  '      _bNseGrandHrs += hrs; _bNseGrandSalary += salary;' + N +
  '      var overnight = _isOvernight(s.start_time, s.end_time);' + N +
  '      var hmGap = (s.hm_awal != null && s.hm_akhir != null) ? s.hm_akhir - s.hm_awal : null;' + N +
  '      _bNseRows.push([s.session_date, s.session_num, s.units ? s.units.code : \'?\', s.start_time.slice(0,5), s.end_time.slice(0,5), overnight ? \'Ya\' : \'Tidak\', +hrs.toFixed(1), s.hm_awal, s.hm_akhir, hmGap, salary]);' + N +
  '    });' + N +
  '    _bNseRows.push([\'TOTAL\', \'\', \'\', \'\', \'\', \'\', +_bNseGrandHrs.toFixed(1), \'\', \'\', \'\', _bNseGrandSalary]);' + N +
  '    wb.addWorksheet(\'NSE\');' + N +
  '    var _bNseWs = wb.getWorksheet(\'NSE\');' + N +
  '    _bNseRows.forEach(function(row) { _bNseWs.addRow(row); });' + N +
  '  }' + N +
  '  // Download' + N +
  '  const label = batchType === \'mid_month\' ? \'Batch16\' : \'Batch31\';',
  'PATCH 13b: NSE sheet in exportBatchExcel'
);

// ============================================================
// FINAL CHECK AND WRITE
// ============================================================
if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
