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

// PATCH 1: Add month filter + col filter state vars after _pbmKasbonMap
replaceExact(
  "var _pbmKasbonMap = {};",
  [
    "var _pbmKasbonMap = {};",
    "var _kapalMonthFilter = todayISO().slice(0,7);",
    "var _stkMonthFilter = todayISO().slice(0,7);",
    "var _wlKapalMonthFilter = todayISO().slice(0,7);",
    "var _wlHourlyMonthFilter = todayISO().slice(0,7);",
    "var _colFilters = { kapal: {}, stk: {}, wlk: {}, wlh: {} };",
    "var _wlKapalAllProjects = [];",
    "var _wlKapalSalaryMapStore = {};",
    "var _wlHourlyAllProjects = [];",
    "var _wlHourlySalaryMapStore = {};"
  ].join(N),
  'PATCH 1: month filter + col filter state vars'
);

// PATCH 2: Add column filter infrastructure before exportPbmGajiExcel
replaceExact(
  "function exportPbmGajiExcel() {",
  [
    "// ─── COLUMN FILTER INFRASTRUCTURE ────────────────────────────────────────────",
    "function _cfColDefs(pk) {",
    "  if (pk === 'kapal') return [",
    "    { key: 'kode', get: function(p) { return p.project_code || ''; } },",
    "    { key: 'nama_kapal', get: function(p) { return p.nama_kapal || ''; } },",
    "    { key: 'pemberi_kerja', get: function(p) { return p.pemberi_kerja || ''; } },",
    "    { key: 'kade', get: function(p) { return p.kade || ''; } }",
    "  ];",
    "  if (pk === 'stk') return [",
    "    { key: 'kode', get: function(p) { return p.project_code || ''; } },",
    "    { key: 'pemberi_kerja', get: function(p) { return p.pemberi_kerja || ''; } }",
    "  ];",
    "  if (pk === 'wlk') return [",
    "    { key: 'kode', get: function(p) { return p.project_code || ''; } },",
    "    { key: 'kapal', get: function(p) { return p.nama_kapal || ''; } },",
    "    { key: 'pemberi_kerja', get: function(p) { return p.pemberi_kerja || ''; } },",
    "    { key: 'status', get: function(p) { return p.invoice_number ? 'Tutup' : (p.end_date ? 'Selesai' : 'Berjalan'); } }",
    "  ];",
    "  if (pk === 'wlh') return [",
    "    { key: 'kode', get: function(p) { return p.project_code || ''; } },",
    "    { key: 'pemberi_kerja', get: function(p) { return p.pemberi_kerja || ''; } }",
    "  ];",
    "  return [];",
    "}",
    "function _cfGetData(pk) {",
    "  if (pk === 'kapal') return proyekKapalData;",
    "  if (pk === 'stk') return proyekStockpileData;",
    "  if (pk === 'wlk') return _wlKapalAllProjects;",
    "  if (pk === 'wlh') return _wlHourlyAllProjects;",
    "  return [];",
    "}",
    "function _cfApply(pk, rows) {",
    "  var filters = _colFilters[pk] || {};",
    "  var defs = _cfColDefs(pk);",
    "  return rows.filter(function(row) {",
    "    return defs.every(function(def) {",
    "      var set = filters[def.key];",
    "      if (!set || set.size === 0) return true;",
    "      return set.has(def.get(row));",
    "    });",
    "  });",
    "}",
    "function _cfTh(pk, colKey, label, align) {",
    "  var isActive = _colFilters[pk] && _colFilters[pk][colKey];",
    "  var bg = isActive ? '#DBEAFE' : 'transparent';",
    "  var col = isActive ? '#1D4ED8' : '#94A3B8';",
    "  var s = 'padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;cursor:pointer;user-select:none;background:' + bg + ';';",
    "  if (align) s += 'text-align:' + align + ';';",
    "  return '<th style=\"' + s + '\" data-pk=\"' + pk + '\" data-col=\"' + colKey + '\" onclick=\"event.stopPropagation();_cfOpenByEl(this)\">' + label + ' <span style=\"font-size:10px;color:' + col + ';\">&#9660;</span></th>';",
    "}",
    "function _cfOpenByEl(thEl) { _cfOpen(thEl.dataset.pk, thEl.dataset.col, thEl); }",
    "function _cfToggleAllByEl(btn) { _cfToggleAll(btn.dataset.pk, btn.dataset.col); }",
    "function _cfClearByEl(btn) { _cfClear(btn.dataset.pk, btn.dataset.col); }",
    "function _cfToggleByEl(cb) { _cfHandleToggle(cb.dataset.pk, cb.dataset.col, cb.value, cb.checked); }",
    "function _cfOpen(pk, colKey, thEl) {",
    "  var existing = document.getElementById('_cf_drop');",
    "  if (existing && existing.dataset.pk === pk && existing.dataset.col === colKey) { _cfClose(); return; }",
    "  _cfClose();",
    "  var data = _cfGetData(pk);",
    "  var defs = _cfColDefs(pk);",
    "  var def = defs.find(function(d) { return d.key === colKey; });",
    "  if (!def) return;",
    "  var allVals = Array.from(new Set(data.map(function(r) { return def.get(r); }))).filter(function(v) { return v !== ''; }).sort();",
    "  var activeSet = (_colFilters[pk] || {})[colKey] || null;",
    "  var rect = thEl.getBoundingClientRect();",
    "  var drop = document.createElement('div');",
    "  drop.id = '_cf_drop'; drop.dataset.pk = pk; drop.dataset.col = colKey;",
    "  drop.style.cssText = 'position:fixed;z-index:9999;background:#fff;border:1px solid #CBD5E1;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);padding:8px;min-width:180px;max-height:280px;overflow-y:auto;top:' + (rect.bottom + 4) + 'px;left:' + rect.left + 'px;';",
    "  var btnStyle = 'flex:1;padding:3px 8px;font-size:11px;border-radius:5px;cursor:pointer;';",
    "  var h = '<div style=\"display:flex;gap:6px;margin-bottom:6px;\">';",
    "  h += '<button data-pk=\"' + pk + '\" data-col=\"' + colKey + '\" onclick=\"_cfToggleAllByEl(this)\" style=\"' + btnStyle + 'border:1px solid #93C5FD;color:#1D4ED8;background:#EFF6FF;\">Semua</button>';",
    "  h += '<button data-pk=\"' + pk + '\" data-col=\"' + colKey + '\" onclick=\"_cfClearByEl(this)\" style=\"' + btnStyle + 'border:1px solid #FCA5A5;color:#DC2626;background:#FEF2F2;\">Reset</button>';",
    "  h += '</div>';",
    "  if (allVals.length === 0) { h += '<div style=\"color:#94A3B8;font-size:12px;\">Tidak ada data</div>'; }",
    "  allVals.forEach(function(v) {",
    "    var checked = !activeSet || activeSet.has(v);",
    "    h += '<label style=\"display:flex;align-items:center;gap:6px;padding:4px 2px;font-size:12px;cursor:pointer;\">';",
    "    h += '<input type=\"checkbox\" data-pk=\"' + pk + '\" data-col=\"' + colKey + '\" ' + (checked ? 'checked' : '') + ' value=\"' + v.replace(/\"/g, '&quot;') + '\" onchange=\"_cfToggleByEl(this)\">';",
    "    h += (v || '(kosong)') + '</label>';",
    "  });",
    "  drop.innerHTML = h;",
    "  document.body.appendChild(drop);",
    "  var dr = drop.getBoundingClientRect();",
    "  if (dr.right > window.innerWidth - 10) drop.style.left = Math.max(0, rect.right - drop.offsetWidth) + 'px';",
    "}",
    "function _cfClose(e) {",
    "  if (e && e.target && e.target.closest && e.target.closest('#_cf_drop')) return;",
    "  var d = document.getElementById('_cf_drop'); if (d) d.remove();",
    "}",
    "function _cfHandleToggle(pk, colKey, value, checked) {",
    "  if (!_colFilters[pk]) _colFilters[pk] = {};",
    "  var data = _cfGetData(pk);",
    "  var defs = _cfColDefs(pk);",
    "  var def = defs.find(function(d) { return d.key === colKey; });",
    "  if (!def) return;",
    "  var allVals = Array.from(new Set(data.map(function(r) { return def.get(r); }))).filter(function(v) { return v !== ''; });",
    "  var current = _colFilters[pk][colKey] ? new Set(_colFilters[pk][colKey]) : new Set(allVals);",
    "  if (checked) { current.add(value); } else { current.delete(value); }",
    "  var allSelected = allVals.every(function(v) { return current.has(v); });",
    "  if (allSelected) { delete _colFilters[pk][colKey]; } else { _colFilters[pk][colKey] = current; }",
    "  _cfRerender(pk);",
    "}",
    "function _cfToggleAll(pk, colKey) {",
    "  if (_colFilters[pk]) delete _colFilters[pk][colKey];",
    "  _cfClose(); _cfRerender(pk);",
    "}",
    "function _cfClear(pk, colKey) {",
    "  if (!_colFilters[pk]) _colFilters[pk] = {};",
    "  _colFilters[pk][colKey] = new Set();",
    "  _cfClose(); _cfRerender(pk);",
    "}",
    "function _cfRerender(pk) {",
    "  _cfClose();",
    "  if (pk === 'kapal') renderProyekKapalList();",
    "  else if (pk === 'stk') renderProyekStockpileList();",
    "  else if (pk === 'wlk') renderWoodlogKapalList(_wlKapalAllProjects, _wlKapalSalaryMapStore);",
    "  else if (pk === 'wlh') renderWoodlogHourlyList(_wlHourlyAllProjects, _wlHourlySalaryMapStore);",
    "}",
    "function _cfChangeMonth(pk, val) {",
    "  if (pk === 'kapal') { _kapalMonthFilter = val; _colFilters.kapal = {}; loadProyekKapal(); }",
    "  else if (pk === 'stk') { _stkMonthFilter = val; _colFilters.stk = {}; loadProyekStockpile(); }",
    "  else if (pk === 'wlk') { _wlKapalMonthFilter = val; _colFilters.wlk = {}; loadWoodlogKapal(); }",
    "  else if (pk === 'wlh') { _wlHourlyMonthFilter = val; _colFilters.wlh = {}; loadWoodlogHourly(); }",
    "}",
    "document.addEventListener('click', _cfClose);",
    "// ──────────────────────────────────────────────────────────────────────────────",
    "",
    "function exportPbmGajiExcel() {"
  ].join(N),
  'PATCH 2: column filter infrastructure functions'
);

// PATCH 3: loadProyekKapal — add month_year filter to DB query
replaceExact(
  [
    "      .eq('type', 'kapal')",
    "      .order('project_code', { ascending: false });"
  ].join(N),
  [
    "      .eq('type', 'kapal')",
    "      .eq('month_year', _kapalMonthFilter)",
    "      .order('project_code', { ascending: false });"
  ].join(N),
  'PATCH 3: loadProyekKapal — add month_year filter'
);

// PATCH 4: renderProyekKapalList — replace header section + empty check to add visData + month picker
replaceExact(
  [
    "  let html2 = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;\">';",
    "  html2 += '<div style=\"font-size:15px;font-weight:700;color:#1E293B;\">Daftar Proyek Kapal (' + proyekKapalData.length + ')</div>';",
    "  html2 += '<button onclick=\"openAddKapalModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;width:auto;\">+ Tambah Kapal</button>';",
    "  html2 += '</div>';",
    "  if (proyekKapalData.length === 0) {",
    "    html2 += '<div style=\"background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;\">Belum ada proyek kapal.</div>';",
    "    panel.innerHTML = html2;",
    "    return;",
    "  }"
  ].join(N),
  [
    "  var visData = _cfApply('kapal', proyekKapalData);",
    "  let html2 = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;\">';",
    "  html2 += '<div style=\"font-size:15px;font-weight:700;color:#1E293B;\">Daftar Proyek Kapal (' + visData.length + ')</div>';",
    "  html2 += '<div style=\"display:flex;gap:8px;align-items:center;\">';",
    "  html2 += '<input type=\"month\" value=\"' + _kapalMonthFilter + '\" onchange=\"_cfChangeMonth(\\'kapal\\',this.value)\" style=\"border:1px solid #CBD5E1;border-radius:6px;padding:6px 10px;font-size:13px;\">';",
    "  html2 += '<button onclick=\"openAddKapalModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;width:auto;\">+ Tambah Kapal</button>';",
    "  html2 += '</div></div>';",
    "  if (visData.length === 0) {",
    "    html2 += '<div style=\"background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;\">Tidak ada data.</div>';",
    "    panel.innerHTML = html2;",
    "    return;",
    "  }"
  ].join(N),
  'PATCH 4: renderProyekKapalList — visData + month picker header'
);

// PATCH 5: renderProyekKapalList — replace thead with filter buttons + use visData in loop
replaceExact(
  [
    "  html2 += '<thead><tr style=\"background:#F1F5F9;\">';",
    "  ['Kode','Nama Kapal','Pemberi Kerja','Kade','Tgl','Kapal#','Unit','HM Total','MT/M3','Salary Total'].forEach(h => {",
    "    html2 += '<th style=\"padding:10px 12px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;\">' + h + '</th>';",
    "  });",
    "  html2 += '<th style=\"padding:10px 12px;\"></th></tr></thead><tbody>';",
    "  proyekKapalData.forEach(p => {"
  ].join(N),
  [
    "  html2 += '<thead><tr style=\"background:#F1F5F9;\">';",
    "  html2 += _cfTh('kapal','kode','Kode');",
    "  html2 += _cfTh('kapal','nama_kapal','Nama Kapal');",
    "  html2 += _cfTh('kapal','pemberi_kerja','Pemberi Kerja');",
    "  html2 += _cfTh('kapal','kade','Kade');",
    "  html2 += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;\">Tgl</th>';",
    "  html2 += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;text-align:center;\">Kapal#</th>';",
    "  html2 += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;text-align:center;\">Unit</th>';",
    "  html2 += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;text-align:right;\">HM Total</th>';",
    "  html2 += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;text-align:right;\">MT/M3</th>';",
    "  html2 += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;text-align:right;\">Salary Total</th>';",
    "  html2 += '<th style=\"padding:10px 12px;\"></th></tr></thead><tbody>';",
    "  visData.forEach(p => {"
  ].join(N),
  'PATCH 5: renderProyekKapalList — filterable thead + visData loop'
);

// PATCH 6: loadProyekStockpile — add month_year filter to DB query
replaceExact(
  [
    "      .eq('type', 'stockpile')",
    "      .order('start_date', { ascending: false });"
  ].join(N),
  [
    "      .eq('type', 'stockpile')",
    "      .eq('month_year', _stkMonthFilter)",
    "      .order('start_date', { ascending: false });"
  ].join(N),
  'PATCH 6: loadProyekStockpile — add month_year filter'
);

// PATCH 7: renderProyekStockpileList — replace header + empty check
replaceExact(
  [
    "  let h = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;\">';",
    "  h += '<div style=\"font-size:15px;font-weight:700;color:#1E293B;\">Daftar Proyek Stockpile (' + proyekStockpileData.length + ')</div>';",
    "  h += '<button onclick=\"openAddStockpileModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;width:auto;\">+ Tambah Stockpile</button></div>';",
    "  if (proyekStockpileData.length === 0) {",
    "    h += '<div style=\"background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;\">Belum ada proyek stockpile.</div>';",
    "    panel.innerHTML = h; return;",
    "  }"
  ].join(N),
  [
    "  var visData = _cfApply('stk', proyekStockpileData);",
    "  let h = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;\">';",
    "  h += '<div style=\"font-size:15px;font-weight:700;color:#1E293B;\">Daftar Proyek Stockpile (' + visData.length + ')</div>';",
    "  h += '<div style=\"display:flex;gap:8px;align-items:center;\">';",
    "  h += '<input type=\"month\" value=\"' + _stkMonthFilter + '\" onchange=\"_cfChangeMonth(\\'stk\\',this.value)\" style=\"border:1px solid #CBD5E1;border-radius:6px;padding:6px 10px;font-size:13px;\">';",
    "  h += '<button onclick=\"openAddStockpileModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;width:auto;\">+ Tambah Stockpile</button>';",
    "  h += '</div></div>';",
    "  if (visData.length === 0) {",
    "    h += '<div style=\"background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;\">Tidak ada data.</div>';",
    "    panel.innerHTML = h; return;",
    "  }"
  ].join(N),
  'PATCH 7: renderProyekStockpileList — visData + month picker header'
);

// PATCH 8: renderProyekStockpileList — replace thead with filter buttons + use visData in loop
replaceExact(
  [
    "  h += '<thead><tr style=\"background:#F1F5F9;\">';",
    "  ['Kode','Pemberi Kerja','Tanggal','Unit','HM Awal','HM Akhir','HM Total','Salary Total',''].forEach(function(col) {",
    "    h += '<th style=\"padding:10px 12px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;\">' + col + '</th>';",
    "  });",
    "  h += '</tr></thead><tbody>';",
    "  proyekStockpileData.forEach(function(p) {"
  ].join(N),
  [
    "  h += '<thead><tr style=\"background:#F1F5F9;\">';",
    "  h += _cfTh('stk','kode','Kode');",
    "  h += _cfTh('stk','pemberi_kerja','Pemberi Kerja');",
    "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;\">Tanggal</th>';",
    "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;\">Unit</th>';",
    "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;\">HM Awal</th>';",
    "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;\">HM Akhir</th>';",
    "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;\">HM Total</th>';",
    "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;text-align:right;\">Salary Total</th>';",
    "  h += '<th style=\"padding:10px 12px;\"></th>';",
    "  h += '</tr></thead><tbody>';",
    "  visData.forEach(function(p) {"
  ].join(N),
  'PATCH 8: renderProyekStockpileList — filterable thead + visData loop'
);

// PATCH 9: loadWoodlogKapal — add month_year filter to DB query
replaceExact(
  "      .eq('type', 'woodlog_kapal').order('project_code', { ascending: false });",
  [
    "      .eq('type', 'woodlog_kapal')",
    "      .eq('month_year', _wlKapalMonthFilter)",
    "      .order('project_code', { ascending: false });"
  ].join(N),
  'PATCH 9: loadWoodlogKapal — add month_year filter'
);

// PATCH 10: loadWoodlogKapal — store data for col filter re-render
replaceExact(
  [
    "    projects.forEach(p => { _wlKapalCache[p.id] = p; });",
    "    renderWoodlogKapalList(projects || [], salaryMap);"
  ].join(N),
  [
    "    projects.forEach(p => { _wlKapalCache[p.id] = p; });",
    "    _wlKapalAllProjects = projects || [];",
    "    _wlKapalSalaryMapStore = salaryMap;",
    "    renderWoodlogKapalList(_wlKapalAllProjects, _wlKapalSalaryMapStore);"
  ].join(N),
  'PATCH 10: loadWoodlogKapal — store projects + salaryMap'
);

// PATCH 11: renderWoodlogKapalList — replace addBtn + empty check + map call
replaceExact(
  [
    "  const addBtn = '<button onclick=\"openAddWoodlogKapalModal()\" class=\"btn-primary\" style=\"margin-bottom:16px;width:auto;\">+ Tambah Proyek Kapal</button>';",
    "  if (projects.length === 0) { el.innerHTML = addBtn + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek kapal woodlog.</div>'; return; }",
    "  const rows = projects.map(function(p) {"
  ].join(N),
  [
    "  var visProjects = _cfApply('wlk', projects);",
    "  const monthHdr = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;\">' +",
    "    '<div style=\"font-size:14px;font-weight:700;color:#1E293B;\">Woodlog Kapal (' + visProjects.length + ')</div>' +",
    "    '<div style=\"display:flex;gap:8px;align-items:center;\">' +",
    "    '<input type=\"month\" value=\"' + _wlKapalMonthFilter + '\" onchange=\"_cfChangeMonth(\\'wlk\\',this.value)\" style=\"border:1px solid #CBD5E1;border-radius:6px;padding:5px 8px;font-size:13px;\">' +",
    "    '<button onclick=\"openAddWoodlogKapalModal()\" class=\"btn-primary\" style=\"width:auto;\">+ Tambah Proyek Kapal</button>' +",
    "    '</div></div>';",
    "  if (visProjects.length === 0) { el.innerHTML = monthHdr + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek kapal woodlog.</div>'; return; }",
    "  const rows = visProjects.map(function(p) {"
  ].join(N),
  'PATCH 11: renderWoodlogKapalList — visProjects + month picker + map'
);

// PATCH 12: renderWoodlogKapalList — replace final el.innerHTML with filterable thead
replaceExact(
  "  el.innerHTML = addBtn + '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Kapal</th><th>Pemberi Kerja</th><th>Mulai</th><th>Selesai</th><th>Unit</th><th style=\"text-align:right;\">BL Tonnage</th><th style=\"text-align:right;\">Total HM</th><th style=\"text-align:right;\">BBM</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';",
  [
    "  el.innerHTML = monthHdr + '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr>' +",
    "    _cfTh('wlk','kode','Kode') +",
    "    _cfTh('wlk','kapal','Kapal') +",
    "    _cfTh('wlk','pemberi_kerja','Pemberi Kerja') +",
    "    '<th>Mulai</th><th>Selesai</th><th>Unit</th>' +",
    "    '<th style=\"text-align:right;\">BL Tonnage</th><th style=\"text-align:right;\">Total HM</th><th style=\"text-align:right;\">BBM</th>' +",
    "    _cfTh('wlk','status','Status') +",
    "    '<th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';"
  ].join(N),
  'PATCH 12: renderWoodlogKapalList — filterable thead in el.innerHTML'
);

// PATCH 13: loadWoodlogHourly — add month_year filter to DB query
replaceExact(
  "      .eq('type', 'woodlog_hourly').order('project_code', { ascending: false });",
  [
    "      .eq('type', 'woodlog_hourly')",
    "      .eq('month_year', _wlHourlyMonthFilter)",
    "      .order('project_code', { ascending: false });"
  ].join(N),
  'PATCH 13: loadWoodlogHourly — add month_year filter'
);

// PATCH 14: loadWoodlogHourly — store data for col filter re-render
replaceExact(
  [
    "    projects.forEach(p => { _wlHourlyCache[p.id] = p; });",
    "    renderWoodlogHourlyList(projects || [], salaryMap);"
  ].join(N),
  [
    "    projects.forEach(p => { _wlHourlyCache[p.id] = p; });",
    "    _wlHourlyAllProjects = projects || [];",
    "    _wlHourlySalaryMapStore = salaryMap;",
    "    renderWoodlogHourlyList(_wlHourlyAllProjects, _wlHourlySalaryMapStore);"
  ].join(N),
  'PATCH 14: loadWoodlogHourly — store projects + salaryMap'
);

// PATCH 15: renderWoodlogHourlyList — replace addBtn + empty check + map call
replaceExact(
  [
    "  const addBtn = '<button onclick=\"openAddWoodlogHourlyModal()\" class=\"btn-primary\" style=\"margin-bottom:16px;\">+ Tambah Proyek Hourly</button>';",
    "  if (projects.length === 0) { el.innerHTML = addBtn + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek hourly woodlog.</div>'; return; }",
    "  const rows = projects.map(function(p) {"
  ].join(N),
  [
    "  var visProjects = _cfApply('wlh', projects);",
    "  const monthHdr = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;\">' +",
    "    '<div style=\"font-size:14px;font-weight:700;color:#1E293B;\">Woodlog Hourly (' + visProjects.length + ')</div>' +",
    "    '<div style=\"display:flex;gap:8px;align-items:center;\">' +",
    "    '<input type=\"month\" value=\"' + _wlHourlyMonthFilter + '\" onchange=\"_cfChangeMonth(\\'wlh\\',this.value)\" style=\"border:1px solid #CBD5E1;border-radius:6px;padding:5px 8px;font-size:13px;\">' +",
    "    '<button onclick=\"openAddWoodlogHourlyModal()\" class=\"btn-primary\" style=\"width:auto;\">+ Tambah Proyek Hourly</button>' +",
    "    '</div></div>';",
    "  if (visProjects.length === 0) { el.innerHTML = monthHdr + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek hourly woodlog.</div>'; return; }",
    "  const rows = visProjects.map(function(p) {"
  ].join(N),
  'PATCH 15: renderWoodlogHourlyList — visProjects + month picker + map'
);

// PATCH 16: renderWoodlogHourlyList — replace final el.innerHTML with filterable thead
replaceExact(
  "  el.innerHTML = addBtn + '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Pemberi Kerja</th><th>Mulai</th><th>Selesai</th><th>Unit</th><th style=\"text-align:right;\">Total HM</th><th style=\"text-align:right;\">Total Salary</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';",
  [
    "  el.innerHTML = monthHdr + '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr>' +",
    "    _cfTh('wlh','kode','Kode') +",
    "    _cfTh('wlh','pemberi_kerja','Pemberi Kerja') +",
    "    '<th>Mulai</th><th>Selesai</th><th>Unit</th>' +",
    "    '<th style=\"text-align:right;\">Total HM</th><th style=\"text-align:right;\">Total Salary</th><th></th>' +",
    "    '</tr></thead><tbody>' + rows + '</tbody></table></div>';"
  ].join(N),
  'PATCH 16: renderWoodlogHourlyList — filterable thead in el.innerHTML'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written (' + 16 + ' patches applied)');
