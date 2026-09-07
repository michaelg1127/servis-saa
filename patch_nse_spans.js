// patch_nse_spans.js
// Implements Task 1: Multi-span NSE sessions + derived HM Awal
// Run: node patch_nse_spans.js
// All index.html changes go through replaceExact; CRLF required for multi-line.

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

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1a: Add _nseSpans / _nseTotalHrs / _nseSpansLabel helpers after _isOvernight
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "function _isOvernight(start, end) { function dec(t){var p=t.split(':');return parseInt(p[0])+parseInt(p[1])/60;} return dec(end)<=dec(start); }" + N +
  N +
  "function renderProyekNSEList()",
  "function _isOvernight(start, end) { function dec(t){var p=t.split(':');return parseInt(p[0])+parseInt(p[1])/60;} return dec(end)<=dec(start); }" + N +
  N +
  "function _nseSpans(s) {" + N +
  "  if (s.time_spans && s.time_spans.length) return s.time_spans;" + N +
  "  if (s.start_time) return [{ start: s.start_time.slice(0,5), end: s.end_time.slice(0,5) }];" + N +
  "  return [];" + N +
  "}" + N +
  "function _nseTotalHrs(s) {" + N +
  "  return _nseSpans(s).reduce(function(a, sp) { return a + _nseHrs(sp.start + ':00', sp.end + ':00'); }, 0);" + N +
  "}" + N +
  "function _nseSpansLabel(s) {" + N +
  "  return _nseSpans(s).map(function(sp) {" + N +
  "    var ov = _isOvernight(sp.start + ':00', sp.end + ':00');" + N +
  "    return sp.start + '–' + sp.end + (ov ? ' ↑' : '');" + N +
  "  }).join(', ');" + N +
  "}" + N +
  N +
  "function renderProyekNSEList()",
  'PATCH 1a: add _nseSpans/_nseTotalHrs/_nseSpansLabel helpers'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1b: Add _nseHMMap / _nseChainAll / _nseDeriveChain globals near nseData
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "var nseData = [];" + N +
  "var _nseMonthFilter = new Date().toISOString().slice(0,7);",
  "var nseData = [];" + N +
  "var _nseMonthFilter = new Date().toISOString().slice(0,7);" + N +
  "var _nseHMMap = {};" + N +
  "var _nseChainAll = [];" + N +
  "async function _nseDeriveChain() {" + N +
  "  var res = await sb.from('nse_sessions').select('id, session_date, session_num, hm_awal, hm_akhir').order('session_date', { ascending: true }).order('session_num', { ascending: true });" + N +
  "  var rows = (res.data || []);" + N +
  "  _nseChainAll = rows;" + N +
  "  _nseHMMap = {};" + N +
  "  for (var i = 0; i < rows.length; i++) {" + N +
  "    if (i === 0) { _nseHMMap[rows[i].id] = rows[i].hm_awal; }" + N +
  "    else { _nseHMMap[rows[i].id] = rows[i-1].hm_akhir; }" + N +
  "  }" + N +
  "}",
  'PATCH 1b: add _nseHMMap/_nseChainAll/_nseDeriveChain globals'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1b2: Call _nseDeriveChain() in loadProyekNSE before renderProyekNSEList
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "    nseData = res.data || [];" + N +
  "    renderProyekNSEList();",
  "    nseData = res.data || [];" + N +
  "    await _nseDeriveChain();" + N +
  "    renderProyekNSEList();",
  'PATCH 1b2: call _nseDeriveChain in loadProyekNSE'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1b3: Call _nseDeriveChain() in loadProyekRingkasan before renderProyekRingkasan
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "    var nseUnpaid = nseRes.data || [];" + N +
  "    renderProyekRingkasan(projRes.data || [], unitRes.data || [], kasbonRes.data || [], monthYear, staffRes.data || [], nseUnpaid);",
  "    var nseUnpaid = nseRes.data || [];" + N +
  "    await _nseDeriveChain();" + N +
  "    renderProyekRingkasan(projRes.data || [], unitRes.data || [], kasbonRes.data || [], monthYear, staffRes.data || [], nseUnpaid);",
  'PATCH 1b3: call _nseDeriveChain in loadProyekRingkasan'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1f: renderProyekNSEList — replace Start/End columns with Jam column,
//           use _nseTotalHrs, derived HM Awal, derived HM Gap
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "  h += '<thead><tr style=\"background:#F1F5F9;\">';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;\">Tanggal</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;\">Sesi</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;\">Unit</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;\">Start</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;\">End</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">Billed Hrs</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">HM Awal</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">HM Akhir</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">HM Gap</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">Salary</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;\"></th>';" + N +
  "  h += '</tr></thead><tbody>';",
  "  h += '<thead><tr style=\"background:#F1F5F9;\">';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;white-space:nowrap;\">Tanggal</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;\">Sesi</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;\">Unit</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;\">Jam</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">Billed Hrs</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">HM Awal</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">HM Akhir</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">HM Gap</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;font-weight:700;color:#475569;text-align:right;\">Salary</th>';" + N +
  "  h += '<th style=\"padding:10px 12px;\"></th>';" + N +
  "  h += '</tr></thead><tbody>';",
  'PATCH 1f-header: replace Start/End columns with Jam in list header'
);

// Replace list row data using old _nseHrs(s.start_time, s.end_time) pattern with new helpers
replaceExact(
  "      var hrs = _nseHrs(s.start_time, s.end_time);" + N +
  "      var salary = Math.round(hrs * 35000);" + N +
  "      dayHrs += hrs; daySalary += salary;" + N +
  "      grandHrs += hrs; grandSalary += salary;" + N +
  "      var overnight = _isOvernight(s.start_time, s.end_time);" + N +
  "      var unitCode = s.units ? s.units.code : '?';" + N +
  "      var startFmt = s.start_time.slice(0,5);" + N +
  "      var endFmt = s.end_time.slice(0,5);" + N +
  "      var hmGap = (s.hm_awal != null && s.hm_akhir != null) ? (s.hm_akhir - s.hm_awal).toFixed(1) : '—';" + N +
  "      h += '<tr style=\"border-bottom:1px solid #F1F5F9;\">';" + N +
  "      h += '<td style=\"padding:10px 12px;white-space:nowrap;font-weight:600;\">' + (si===0 ? dateLabel : '') + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;text-align:center;\">' + s.session_num + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;font-weight:700;\">' + unitCode + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;\">' + startFmt + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;\">' + endFmt + (overnight ? ' <span style=\"background:#FEF3C7;color:#B45309;font-size:10px;font-weight:700;padding:2px 5px;border-radius:99px;\">&#8593;</span>' : '') + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;text-align:right;font-weight:700;\">' + hrs.toFixed(1) + 'j</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;text-align:right;\">' + (s.hm_awal != null ? s.hm_awal : '—') + '</td>';",
  "      var hrs = _nseTotalHrs(s);" + N +
  "      var salary = Math.round(hrs * 35000);" + N +
  "      dayHrs += hrs; daySalary += salary;" + N +
  "      grandHrs += hrs; grandSalary += salary;" + N +
  "      var unitCode = s.units ? s.units.code : '?';" + N +
  "      var jamLabel = _nseSpansLabel(s);" + N +
  "      var derivedHMAwal = _nseHMMap[s.id];" + N +
  "      var hmGap = (derivedHMAwal != null && s.hm_akhir != null) ? (s.hm_akhir - derivedHMAwal).toFixed(1) : '—';" + N +
  "      h += '<tr style=\"border-bottom:1px solid #F1F5F9;\">';" + N +
  "      h += '<td style=\"padding:10px 12px;white-space:nowrap;font-weight:600;\">' + (si===0 ? dateLabel : '') + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;text-align:center;\">' + s.session_num + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;font-weight:700;\">' + unitCode + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;\">' + jamLabel + '</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;text-align:right;font-weight:700;\">' + hrs.toFixed(1) + 'j</td>';" + N +
  "      h += '<td style=\"padding:10px 12px;text-align:right;\">' + (derivedHMAwal != null ? derivedHMAwal : '—') + '</td>';",
  'PATCH 1f-rows: use _nseTotalHrs/_nseSpansLabel/derived HM in list rows'
);

// Fix the subtotal colspan (was 5 cols before Jam, now 4: Tanggal,Sesi,Unit,Jam)
replaceExact(
  "    h += '<td colspan=\"5\" style=\"padding:8px 12px;font-size:12px;color:#64748B;font-style:italic;\">Subtotal ' + dateLabel + '</td>';",
  "    h += '<td colspan=\"4\" style=\"padding:8px 12px;font-size:12px;color:#64748B;font-style:italic;\">Subtotal ' + dateLabel + '</td>';",
  'PATCH 1f-subtotal: fix colspan from 5 to 4'
);

// Fix the grand total colspan
replaceExact(
  "  h += '<td colspan=\"5\" style=\"padding:10px 12px;font-size:13px;font-weight:800;color:#1D4ED8;\">GRAND TOTAL</td>';",
  "  h += '<td colspan=\"4\" style=\"padding:10px 12px;font-size:13px;font-weight:800;color:#1D4ED8;\">GRAND TOTAL</td>';",
  'PATCH 1f-grandtotal: fix colspan from 5 to 4'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1g: _nseRingkasanBatch — use _nseTotalHrs, _nseSpansLabel, one Jam column
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
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
  "      bh += '<tr style=\"background:#FFEDD5;font-weight:700;\"><td colspan=\"5\" style=\"padding:7px 10px;\">Subtotal ' + label + '</td><td style=\"padding:7px 10px;text-align:right;\">' + totalHrs.toFixed(1) + 'j</td><td style=\"padding:7px 10px;text-align:right;\">' + fmtRp(totalSalary) + '</td></tr>';",
  "      bh += '<thead><tr style=\"background:#FFEDD5;\"><th style=\"padding:7px 10px;text-align:left;\">Tanggal</th><th style=\"padding:7px 10px;\">Sesi</th><th style=\"padding:7px 10px;\">Unit</th><th style=\"padding:7px 10px;\">Jam</th><th style=\"padding:7px 10px;text-align:right;\">Billed Hrs</th><th style=\"padding:7px 10px;text-align:right;\">Salary</th></tr></thead><tbody>';" + N +
  "      var totalHrs = 0, totalSalary = 0;" + N +
  "      sessions.forEach(function(s) {" + N +
  "        var hrs = _nseTotalHrs(s);" + N +
  "        var salary = Math.round(hrs * 35000);" + N +
  "        totalHrs += hrs; totalSalary += salary;" + N +
  "        var unitCode = s.units ? s.units.code : '?';" + N +
  "        var jamLabel = _nseSpansLabel(s);" + N +
  "        bh += '<tr style=\"border-bottom:1px solid #FED7AA;\">';" + N +
  "        bh += '<td style=\"padding:7px 10px;\">' + s.session_date + '</td>';" + N +
  "        bh += '<td style=\"padding:7px 10px;text-align:center;\">' + s.session_num + '</td>';" + N +
  "        bh += '<td style=\"padding:7px 10px;font-weight:700;\">' + unitCode + '</td>';" + N +
  "        bh += '<td style=\"padding:7px 10px;\">' + jamLabel + '</td>';" + N +
  "        bh += '<td style=\"padding:7px 10px;text-align:right;\">' + hrs.toFixed(1) + 'j</td>';" + N +
  "        bh += '<td style=\"padding:7px 10px;text-align:right;font-weight:700;\">' + fmtRp(salary) + '</td></tr>';" + N +
  "      });" + N +
  "      bh += '<tr style=\"background:#FFEDD5;font-weight:700;\"><td colspan=\"4\" style=\"padding:7px 10px;\">Subtotal ' + label + '</td><td style=\"padding:7px 10px;text-align:right;\">' + totalHrs.toFixed(1) + 'j</td><td style=\"padding:7px 10px;text-align:right;\">' + fmtRp(totalSalary) + '</td></tr>';",
  'PATCH 1g: _nseRingkasanBatch — Jam column, _nseTotalHrs, _nseSpansLabel'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1h-a: exportNSESummary COLS array — collapse Jam Mulai/Selesai/Overnight into Jam
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "  var COLS = ['Tanggal', 'Sesi', 'Unit', 'Jam Mulai', 'Jam Selesai', 'Overnight', 'Billed Hrs', 'HM Awal', 'HM Akhir', 'HM Gap', 'Salary (Rp)'];",
  "  var COLS = ['Tanggal', 'Sesi', 'Unit', 'Jam', 'Billed Hrs', 'HM Awal', 'HM Akhir', 'HM Gap', 'Salary (Rp)'];",
  'PATCH 1h-a: exportNSESummary COLS — collapse Jam Mulai/Selesai/Overnight into Jam'
);

// PATCH 1h-b: exportNSESummary row data inside _nseAddBatch
replaceExact(
  "      var hrs = _nseHrs(s.start_time, s.end_time);" + N +
  "      var salary = Math.round(hrs * 35000);" + N +
  "      totalHrs += hrs; totalSalary += salary;" + N +
  "      var overnight = _isOvernight(s.start_time, s.end_time);" + N +
  "      var hmGap = (s.hm_awal != null && s.hm_akhir != null) ? +(s.hm_akhir - s.hm_awal).toFixed(1) : '';" + N +
  "      var unitCode = s.units ? s.units.code : '?';" + N +
  "      var row = ws.addRow([s.session_date, s.session_num, unitCode, s.start_time.slice(0,5), s.end_time.slice(0,5), overnight ? 'Ya' : 'Tidak', +hrs.toFixed(1), s.hm_awal, s.hm_akhir, hmGap, salary]);" + N +
  "      row.getCell(11).numFmt = NF;" + N +
  "      row.eachCell(function(cell) { cell.border = BDR; });" + N +
  "      if (overnight) { row.getCell(6).font = { color: { argb: 'FFB45309' }, bold: true }; }" + N +
  "    });" + N +
  "    var subRow = ws.addRow(['SUBTOTAL ' + batchLabel, '', '', '', '', '', +totalHrs.toFixed(1), '', '', '', totalSalary]);" + N +
  "    subRow.font = { bold: true };" + N +
  "    subRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };" + N +
  "    subRow.getCell(11).numFmt = NF;" + N +
  "    subRow.eachCell(function(cell) { cell.border = BDR; });",
  "      var hrs = _nseTotalHrs(s);" + N +
  "      var salary = Math.round(hrs * 35000);" + N +
  "      totalHrs += hrs; totalSalary += salary;" + N +
  "      var derivedHMAwal = _nseHMMap[s.id];" + N +
  "      var hmGap = (derivedHMAwal != null && s.hm_akhir != null) ? +(s.hm_akhir - derivedHMAwal).toFixed(1) : '';" + N +
  "      var unitCode = s.units ? s.units.code : '?';" + N +
  "      var jamLabel = _nseSpansLabel(s);" + N +
  "      var row = ws.addRow([s.session_date, s.session_num, unitCode, jamLabel, +hrs.toFixed(1), derivedHMAwal != null ? derivedHMAwal : '', s.hm_akhir != null ? s.hm_akhir : '', hmGap, salary]);" + N +
  "      row.getCell(9).numFmt = NF;" + N +
  "      row.eachCell(function(cell) { cell.border = BDR; });" + N +
  "    });" + N +
  "    var subRow = ws.addRow(['SUBTOTAL ' + batchLabel, '', '', '', +totalHrs.toFixed(1), '', '', '', totalSalary]);" + N +
  "    subRow.font = { bold: true };" + N +
  "    subRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };" + N +
  "    subRow.getCell(9).numFmt = NF;" + N +
  "    subRow.eachCell(function(cell) { cell.border = BDR; });",
  'PATCH 1h-b: exportNSESummary rows — Jam col, _nseTotalHrs, derived HM'
);

// PATCH 1h-c: exportNSESummary grand total row + column widths
replaceExact(
  "  var grandHrs = nseData.reduce(function(a, s) { return a + _nseHrs(s.start_time, s.end_time); }, 0);" + N +
  "  var grandSalary = nseData.reduce(function(a, s) { return a + Math.round(_nseHrs(s.start_time, s.end_time) * 35000); }, 0);" + N +
  "  var grandRow = ws.addRow(['GRAND TOTAL', '', '', '', '', '', +grandHrs.toFixed(1), '', '', '', grandSalary]);" + N +
  "  grandRow.eachCell(function(cell) { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.border = BDR; cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF9A3412' } }; });" + N +
  "  grandRow.getCell(11).numFmt = NF;" + N +
  "  ws.getColumn(1).width = 14; ws.getColumn(2).width = 6; ws.getColumn(3).width = 8;" + N +
  "  ws.getColumn(4).width = 10; ws.getColumn(5).width = 10; ws.getColumn(6).width = 10;" + N +
  "  ws.getColumn(7).width = 11; ws.getColumn(8).width = 10; ws.getColumn(9).width = 10;" + N +
  "  ws.getColumn(10).width = 10; ws.getColumn(11).width = 16;",
  "  var grandHrs = nseData.reduce(function(a, s) { return a + _nseTotalHrs(s); }, 0);" + N +
  "  var grandSalary = nseData.reduce(function(a, s) { return a + Math.round(_nseTotalHrs(s) * 35000); }, 0);" + N +
  "  var grandRow = ws.addRow(['GRAND TOTAL', '', '', '', +grandHrs.toFixed(1), '', '', '', grandSalary]);" + N +
  "  grandRow.eachCell(function(cell) { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.border = BDR; cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF9A3412' } }; });" + N +
  "  grandRow.getCell(9).numFmt = NF;" + N +
  "  ws.getColumn(1).width = 14; ws.getColumn(2).width = 6; ws.getColumn(3).width = 8;" + N +
  "  ws.getColumn(4).width = 22; ws.getColumn(5).width = 11; ws.getColumn(6).width = 10;" + N +
  "  ws.getColumn(7).width = 10; ws.getColumn(8).width = 10; ws.getColumn(9).width = 16;",
  'PATCH 1h-c: exportNSESummary grand total + column widths'
);

// PATCH 1h-d: batch export NSE sheet header + row builder (~line 7003-7013)
replaceExact(
  "    var _bNseRows = [['Tanggal','Sesi','Unit','Jam Mulai','Jam Selesai','Overnight','Billed Hrs','HM Awal','HM Akhir','HM Gap','Salary']];" + N +
  "    var _bNseGrandHrs = 0, _bNseGrandSalary = 0;" + N +
  "    _batchNseSessions.forEach(function(s) {" + N +
  "      var hrs = _nseHrs(s.start_time, s.end_time);" + N +
  "      var salary = Math.round(hrs * 35000);" + N +
  "      _bNseGrandHrs += hrs; _bNseGrandSalary += salary;" + N +
  "      var overnight = _isOvernight(s.start_time, s.end_time);" + N +
  "      var hmGap = (s.hm_awal != null && s.hm_akhir != null) ? s.hm_akhir - s.hm_awal : null;" + N +
  "      _bNseRows.push([s.session_date, s.session_num, s.units ? s.units.code : '?', s.start_time.slice(0,5), s.end_time.slice(0,5), overnight ? 'Ya' : 'Tidak', +hrs.toFixed(1), s.hm_awal, s.hm_akhir, hmGap, salary]);" + N +
  "    });" + N +
  "    _bNseRows.push(['TOTAL', '', '', '', '', '', +_bNseGrandHrs.toFixed(1), '', '', '', _bNseGrandSalary]);",
  "    var _bNseRows = [['Tanggal','Sesi','Unit','Jam','Billed Hrs','HM Awal','HM Akhir','HM Gap','Salary']];" + N +
  "    var _bNseGrandHrs = 0, _bNseGrandSalary = 0;" + N +
  "    _batchNseSessions.forEach(function(s) {" + N +
  "      var hrs = _nseTotalHrs(s);" + N +
  "      var salary = Math.round(hrs * 35000);" + N +
  "      _bNseGrandHrs += hrs; _bNseGrandSalary += salary;" + N +
  "      var derivedHMAwal = _nseHMMap[s.id];" + N +
  "      var hmGap = (derivedHMAwal != null && s.hm_akhir != null) ? s.hm_akhir - derivedHMAwal : null;" + N +
  "      _bNseRows.push([s.session_date, s.session_num, s.units ? s.units.code : '?', _nseSpansLabel(s), +hrs.toFixed(1), derivedHMAwal != null ? derivedHMAwal : null, s.hm_akhir, hmGap, salary]);" + N +
  "    });" + N +
  "    _bNseRows.push(['TOTAL', '', '', '', +_bNseGrandHrs.toFixed(1), '', '', '', _bNseGrandSalary]);",
  'PATCH 1h-d: batch export NSE sheet header+rows — Jam col, _nseTotalHrs, derived HM'
);

// PATCH 1h-e: exportProyekExcel (the second sheet export) NSE section (~line 7059-7080)
replaceExact(
  "  var nseRows = [['Tanggal','Sesi','Unit','Jam Mulai','Jam Selesai','Overnight','Billed Hrs','HM Awal','HM Akhir','HM Gap','Salary']];" + N +
  "  var _nseExDateGroups = {}, _nseExDateOrder = [];" + N +
  "  _nseExSessions.forEach(function(s) {" + N +
  "    if (!_nseExDateGroups[s.session_date]) { _nseExDateGroups[s.session_date] = []; _nseExDateOrder.push(s.session_date); }" + N +
  "    _nseExDateGroups[s.session_date].push(s);" + N +
  "  });" + N +
  "  var _nseExGrandHrs = 0, _nseExGrandSalary = 0;" + N +
  "  _nseExDateOrder.forEach(function(date) {" + N +
  "    var sessList = _nseExDateGroups[date];" + N +
  "    var dayHrs = 0, daySalary = 0;" + N +
  "    sessList.forEach(function(s) {" + N +
  "      var hrs = _nseHrs(s.start_time, s.end_time);" + N +
  "      var salary = Math.round(hrs * 35000);" + N +
  "      dayHrs += hrs; daySalary += salary;" + N +
  "      var overnight = _isOvernight(s.start_time, s.end_time);" + N +
  "      var hmGap = (s.hm_awal != null && s.hm_akhir != null) ? s.hm_akhir - s.hm_awal : null;" + N +
  "      nseRows.push([s.session_date, s.session_num, s.units ? s.units.code : '?', s.start_time.slice(0,5), s.end_time.slice(0,5), overnight ? 'Ya' : 'Tidak', +hrs.toFixed(1), s.hm_awal, s.hm_akhir, hmGap, salary]);" + N +
  "    });" + N +
  "    _nseExGrandHrs += dayHrs; _nseExGrandSalary += daySalary;" + N +
  "    nseRows.push(['Subtotal ' + date, '', '', '', '', '', +dayHrs.toFixed(1), '', '', '', daySalary]);" + N +
  "  });" + N +
  "  if (_nseExSessions.length > 0) nseRows.push(['GRAND TOTAL', '', '', '', '', '', +_nseExGrandHrs.toFixed(1), '', '', '', _nseExGrandSalary]);",
  "  var nseRows = [['Tanggal','Sesi','Unit','Jam','Billed Hrs','HM Awal','HM Akhir','HM Gap','Salary']];" + N +
  "  var _nseExDateGroups = {}, _nseExDateOrder = [];" + N +
  "  _nseExSessions.forEach(function(s) {" + N +
  "    if (!_nseExDateGroups[s.session_date]) { _nseExDateGroups[s.session_date] = []; _nseExDateOrder.push(s.session_date); }" + N +
  "    _nseExDateGroups[s.session_date].push(s);" + N +
  "  });" + N +
  "  var _nseExGrandHrs = 0, _nseExGrandSalary = 0;" + N +
  "  _nseExDateOrder.forEach(function(date) {" + N +
  "    var sessList = _nseExDateGroups[date];" + N +
  "    var dayHrs = 0, daySalary = 0;" + N +
  "    sessList.forEach(function(s) {" + N +
  "      var hrs = _nseTotalHrs(s);" + N +
  "      var salary = Math.round(hrs * 35000);" + N +
  "      dayHrs += hrs; daySalary += salary;" + N +
  "      var derivedHMAwal = _nseHMMap[s.id];" + N +
  "      var hmGap = (derivedHMAwal != null && s.hm_akhir != null) ? s.hm_akhir - derivedHMAwal : null;" + N +
  "      nseRows.push([s.session_date, s.session_num, s.units ? s.units.code : '?', _nseSpansLabel(s), +hrs.toFixed(1), derivedHMAwal != null ? derivedHMAwal : null, s.hm_akhir, hmGap, salary]);" + N +
  "    });" + N +
  "    _nseExGrandHrs += dayHrs; _nseExGrandSalary += daySalary;" + N +
  "    nseRows.push(['Subtotal ' + date, '', '', '', +dayHrs.toFixed(1), '', '', '', daySalary]);" + N +
  "  });" + N +
  "  if (_nseExSessions.length > 0) nseRows.push(['GRAND TOTAL', '', '', '', +_nseExGrandHrs.toFixed(1), '', '', '', _nseExGrandSalary]);",
  'PATCH 1h-e: exportProyekExcel NSE sheet — Jam col, _nseTotalHrs, derived HM'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1i-a: Remove loadNSEUnitLastHM function (large block, already present in code
// after previous patch_nse_hm_lookup.js was applied)
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "async function loadNSEUnitLastHM() {" + N +
  "  var unitId = (document.getElementById('nse-m-unit') || {}).value;" + N +
  "  window._nseLastHM = null;" + N +
  "  var hintEl = document.getElementById('nse-m-hm-hint');" + N +
  "  if (!unitId || !hintEl) { _nsePreviewUpdate(); return; }" + N +
  "  hintEl.innerHTML = '<span style=\"font-size:11px;color:#64748B;\">Mengecek HM terakhir...</span>';" + N +
  "  var pu = await sb.from('project_units').select('hm_akhir').eq('unit_id', unitId).not('hm_akhir', 'is', null).order('hm_akhir', { ascending: false }).limit(1);" + N +
  "  var ns = await sb.from('nse_sessions').select('hm_akhir').eq('unit_id', unitId).not('hm_akhir', 'is', null).order('hm_akhir', { ascending: false }).limit(1);" + N +
  "  var puVal = pu.data && pu.data.length > 0 ? pu.data[0].hm_akhir : null;" + N +
  "  var nsVal = ns.data && ns.data.length > 0 ? ns.data[0].hm_akhir : null;" + N +
  "  var lastHM = null;" + N +
  "  if (puVal != null && nsVal != null) lastHM = Math.max(puVal, nsVal);" + N +
  "  else if (puVal != null) lastHM = puVal;" + N +
  "  else if (nsVal != null) lastHM = nsVal;" + N +
  "  window._nseLastHM = lastHM;" + N +
  "  if (lastHM != null) {" + N +
  "    hintEl.innerHTML = '<div style=\"background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:6px 10px;font-size:12px;color:#1D4ED8;\">HM Terakhir unit ini: <strong>' + lastHM.toFixed(1) + '</strong></div>';" + N +
  "  } else {" + N +
  "    hintEl.innerHTML = '<div style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:6px 10px;font-size:12px;color:#64748B;\">Belum ada data HM untuk unit ini.</div>';" + N +
  "  }" + N +
  "  _nsePreviewUpdate();" + N +
  "}" + N +
  N +
  "async function openAddNSEModal()",
  "async function updateNSEHMAwal(editingId) {" + N +
  "  var hintEl = document.getElementById('nse-m-hm-hint');" + N +
  "  var seedEl = document.getElementById('nse-m-hmawal-seed');" + N +
  "  if (!hintEl) return;" + N +
  "  var dateVal = (document.getElementById('nse-m-date') || {}).value;" + N +
  "  var sesiVal = parseInt((document.getElementById('nse-m-sesi') || {}).value);" + N +
  "  if (!dateVal || isNaN(sesiVal)) {" + N +
  "    hintEl.innerHTML = '';" + N +
  "    window._nseDerivedHMAwal = null;" + N +
  "    _nsePreviewUpdate();" + N +
  "    return;" + N +
  "  }" + N +
  "  await _nseDeriveChain();" + N +
  "  var pred = null;" + N +
  "  for (var i = 0; i < _nseChainAll.length; i++) {" + N +
  "    var r = _nseChainAll[i];" + N +
  "    if (editingId && r.id === editingId) continue;" + N +
  "    if (r.session_date < dateVal || (r.session_date === dateVal && r.session_num < sesiVal)) { pred = r; }" + N +
  "    else break;" + N +
  "  }" + N +
  "  if (pred && pred.hm_akhir != null) {" + N +
  "    window._nseDerivedHMAwal = pred.hm_akhir;" + N +
  "    hintEl.innerHTML = '<div style=\"background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:6px 10px;font-size:12px;color:#1D4ED8;\">HM Awal (otomatis): <strong>' + pred.hm_akhir + '</strong> — dari sesi ' + pred.session_date + ' #' + pred.session_num + '</div><div id=\"nse-m-hmawal-seed-wrap\" style=\"display:none;\"></div>';" + N +
  "  } else {" + N +
  "    window._nseDerivedHMAwal = null;" + N +
  "    var seedPrefill = '';" + N +
  "    if (editingId) { var es = nseData.find(function(x) { return x.id === editingId; }); if (es && es.hm_awal != null) seedPrefill = es.hm_awal; }" + N +
  "    hintEl.innerHTML = '<div style=\"margin-bottom:6px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Awal (sesi pertama)</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmawal-seed\" class=\"finput\" value=\"' + seedPrefill + '\" oninput=\"_nsePreviewUpdate()\"></div>';" + N +
  "  }" + N +
  "  _nsePreviewUpdate();" + N +
  "}" + N +
  N +
  "function addNSESpanRow(startVal, endVal) {" + N +
  "  var cont = document.getElementById('nse-m-spans');" + N +
  "  if (!cont) return;" + N +
  "  var rows = cont.querySelectorAll('.nse-span-row');" + N +
  "  if (rows.length >= 5) return;" + N +
  "  var idx = rows.length;" + N +
  "  var div = document.createElement('div');" + N +
  "  div.className = 'nse-span-row';" + N +
  "  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;';" + N +
  "  div.innerHTML = '<div><label style=\"font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:3px;\">Jam Awal</label><input type=\"time\" class=\"finput nse-span-start\" value=\"' + (startVal || '') + '\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '<div><label style=\"font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:3px;\">Jam Akhir</label><input type=\"time\" class=\"finput nse-span-end\" value=\"' + (endVal || '') + '\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '<button type=\"button\" onclick=\"this.closest(\\'.nse-span-row\\').remove();_nsePreviewUpdate();_nseUpdateAddJamBtn();\" style=\"' + (idx === 0 ? 'visibility:hidden;' : '') + 'background:#FEF2F2;border:1.5px solid #FECACA;color:#DC2626;font-size:13px;font-weight:700;padding:4px 8px;border-radius:6px;cursor:pointer;\">×</button>';" + N +
  "  cont.appendChild(div);" + N +
  "  _nseUpdateAddJamBtn();" + N +
  "}" + N +
  N +
  "function _nseUpdateAddJamBtn() {" + N +
  "  var cont = document.getElementById('nse-m-spans');" + N +
  "  var btn = document.getElementById('nse-m-add-span-btn');" + N +
  "  if (!cont || !btn) return;" + N +
  "  var count = cont.querySelectorAll('.nse-span-row').length;" + N +
  "  btn.style.display = count >= 5 ? 'none' : '';" + N +
  "}" + N +
  N +
  "async function openAddNSEModal()",
  'PATCH 1i-a: remove loadNSEUnitLastHM, add updateNSEHMAwal/addNSESpanRow/_nseUpdateAddJamBtn'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1c: openAddNSEModal — replace modal HTML with spans UI
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "async function openAddNSEModal() {" + N +
  "  var units = (window.allUnits && allUnits.length > 0) ? allUnits : [];" + N +
  "  if (units.length === 0) {" + N +
  "    var ur = await sb.from('units').select('id,code,name').order('code');" + N +
  "    units = ur.data || [];" + N +
  "  }" + N +
  "  var unitOpts = units.map(function(u) { return '<option value=\"' + u.id + '\">' + u.code + (u.name ? ' — ' + u.name : '') + '</option>'; }).join('');" + N +
  "  var today = new Date().toISOString().slice(0,10);" + N +
  "  var modalHTML = '<div style=\"padding:24px;max-width:480px;width:100%;\">' +" + N +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;\">Tambah Sesi NSE</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tanggal *</label><input type=\"date\" id=\"nse-m-date\" class=\"finput\" value=\"' + today + '\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Sesi *</label><select id=\"nse-m-sesi\" class=\"finput\"><option value=\"1\">1</option><option value=\"2\">2</option><option value=\"3\">3</option></select></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Unit *</label><select id=\"nse-m-unit\" class=\"finput\" onchange=\"loadNSEUnitLastHM()\"><option value=\"\">-- Pilih Unit --</option>' + unitOpts + '</select></div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Mulai *</label><input type=\"time\" id=\"nse-m-start\" class=\"finput\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Selesai *</label><input type=\"time\" id=\"nse-m-end\" class=\"finput\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Awal</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmawal\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" placeholder=\"Opsional\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Akhir</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmakhir\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" placeholder=\"Opsional\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div id=\"nse-m-hm-hint\" style=\"margin-bottom:8px;\"></div>' +" + N +
  "    '<div id=\"nse-m-preview\" style=\"margin-bottom:12px;\"></div>' +" + N +
  "    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +" + N +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + N +
  "    '<button onclick=\"submitAddNSE()\" class=\"btn-primary\" style=\"flex:2;\">Simpan Sesi</button>' +" + N +
  "    '</div></div>';" + N +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + N +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + N +
  "}",
  "async function openAddNSEModal() {" + N +
  "  var units = (window.allUnits && allUnits.length > 0) ? allUnits : [];" + N +
  "  if (units.length === 0) {" + N +
  "    var ur = await sb.from('units').select('id,code,name').order('code');" + N +
  "    units = ur.data || [];" + N +
  "  }" + N +
  "  var unitOpts = units.map(function(u) { return '<option value=\"' + u.id + '\">' + u.code + (u.name ? ' — ' + u.name : '') + '</option>'; }).join('');" + N +
  "  var today = new Date().toISOString().slice(0,10);" + N +
  "  var modalHTML = '<div style=\"padding:24px;max-width:480px;width:100%;\">' +" + N +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;\">Tambah Sesi NSE</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tanggal *</label><input type=\"date\" id=\"nse-m-date\" class=\"finput\" value=\"' + today + '\" onchange=\"updateNSEHMAwal(null)\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Sesi *</label><select id=\"nse-m-sesi\" class=\"finput\" onchange=\"updateNSEHMAwal(null)\"><option value=\"1\">1</option><option value=\"2\">2</option></select></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Unit *</label><select id=\"nse-m-unit\" class=\"finput\"><option value=\"\">-- Pilih Unit --</option>' + unitOpts + '</select></div>' +" + N +
  "    '<div style=\"margin-bottom:8px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:6px;\">Waktu Kerja *</label><div id=\"nse-m-spans\"></div><button type=\"button\" id=\"nse-m-add-span-btn\" onclick=\"addNSESpanRow()\" style=\"background:#ECFDF5;border:1.5px dashed #6EE7B7;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;color:#059669;cursor:pointer;width:100%;\">+ Tambah Jam</button></div>' +" + N +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Akhir</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmakhir\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" placeholder=\"Opsional\"></div>' +" + N +
  "    '<div id=\"nse-m-hm-hint\" style=\"margin-bottom:8px;\"></div>' +" + N +
  "    '<div id=\"nse-m-preview\" style=\"margin-bottom:12px;\"></div>' +" + N +
  "    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +" + N +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + N +
  "    '<button onclick=\"submitAddNSE()\" class=\"btn-primary\" style=\"flex:2;\">Simpan Sesi</button>' +" + N +
  "    '</div></div>';" + N +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + N +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + N +
  "  addNSESpanRow();" + N +
  "  await updateNSEHMAwal(null);" + N +
  "}",
  'PATCH 1c: openAddNSEModal — spans container, derived HM Awal'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1d: openEditNSEModal — spans prefill, derived HM Awal
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "async function openEditNSEModal(id) {" + N +
  "  var s = nseData.find(function(x) { return x.id === id; });" + N +
  "  if (!s) { showToast('Data tidak ditemukan'); return; }" + N +
  "  var units = (window.allUnits && allUnits.length > 0) ? allUnits : [];" + N +
  "  if (units.length === 0) {" + N +
  "    var ur = await sb.from('units').select('id,code,name').order('code');" + N +
  "    units = ur.data || [];" + N +
  "  }" + N +
  "  var unitOpts = units.map(function(u) { return '<option value=\"' + u.id + '\" ' + (u.id === s.unit_id ? 'selected' : '') + '>' + u.code + (u.name ? ' — ' + u.name : '') + '</option>'; }).join('');" + N +
  "  var startVal = s.start_time ? s.start_time.slice(0,5) : '';" + N +
  "  var endVal = s.end_time ? s.end_time.slice(0,5) : '';" + N +
  "  var modalHTML = '<div style=\"padding:24px;max-width:480px;width:100%;\">' +" + N +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;\">Edit Sesi NSE</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tanggal *</label><input type=\"date\" id=\"nse-m-date\" class=\"finput\" value=\"' + s.session_date + '\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Sesi *</label><select id=\"nse-m-sesi\" class=\"finput\"><option value=\"1\" ' + (s.session_num===1?'selected':'') + '>1</option><option value=\"2\" ' + (s.session_num===2?'selected':'') + '>2</option><option value=\"3\" ' + (s.session_num===3?'selected':'') + '>3</option></select></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Unit *</label><select id=\"nse-m-unit\" class=\"finput\" onchange=\"loadNSEUnitLastHM()\"><option value=\"\">-- Pilih Unit --</option>' + unitOpts + '</select></div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Mulai *</label><input type=\"time\" id=\"nse-m-start\" class=\"finput\" value=\"' + startVal + '\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Selesai *</label><input type=\"time\" id=\"nse-m-end\" class=\"finput\" value=\"' + endVal + '\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Awal</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmawal\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" value=\"' + (s.hm_awal != null ? s.hm_awal : '') + '\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Akhir</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmakhir\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" value=\"' + (s.hm_akhir != null ? s.hm_akhir : '') + '\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div id=\"nse-m-hm-hint\" style=\"margin-bottom:8px;\"></div>' +" + N +
  "    '<div id=\"nse-m-preview\" style=\"margin-bottom:12px;\"></div>' +" + N +
  "    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +" + N +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + N +
  "    '<button onclick=\"submitEditNSE(\\'' + id + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan Perubahan</button>' +" + N +
  "    '</div></div>';" + N +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + N +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + N +
  "  setTimeout(function() { loadNSEUnitLastHM(); }, 50);" + N +
  "}",
  "async function openEditNSEModal(id) {" + N +
  "  var s = nseData.find(function(x) { return x.id === id; });" + N +
  "  if (!s) { showToast('Data tidak ditemukan'); return; }" + N +
  "  var units = (window.allUnits && allUnits.length > 0) ? allUnits : [];" + N +
  "  if (units.length === 0) {" + N +
  "    var ur = await sb.from('units').select('id,code,name').order('code');" + N +
  "    units = ur.data || [];" + N +
  "  }" + N +
  "  var unitOpts = units.map(function(u) { return '<option value=\"' + u.id + '\" ' + (u.id === s.unit_id ? 'selected' : '') + '>' + u.code + (u.name ? ' — ' + u.name : '') + '</option>'; }).join('');" + N +
  "  var modalHTML = '<div style=\"padding:24px;max-width:480px;width:100%;\">' +" + N +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;\">Edit Sesi NSE</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tanggal *</label><input type=\"date\" id=\"nse-m-date\" class=\"finput\" value=\"' + s.session_date + '\" onchange=\"updateNSEHMAwal(\\'' + id + '\\')\" ></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Sesi *</label><select id=\"nse-m-sesi\" class=\"finput\" onchange=\"updateNSEHMAwal(\\'' + id + '\\')\" ><option value=\"1\" ' + (s.session_num===1?'selected':'') + '>1</option><option value=\"2\" ' + (s.session_num===2?'selected':'') + '>2</option></select></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Unit *</label><select id=\"nse-m-unit\" class=\"finput\"><option value=\"\">-- Pilih Unit --</option>' + unitOpts + '</select></div>' +" + N +
  "    '<div style=\"margin-bottom:8px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:6px;\">Waktu Kerja *</label><div id=\"nse-m-spans\"></div><button type=\"button\" id=\"nse-m-add-span-btn\" onclick=\"addNSESpanRow()\" style=\"background:#ECFDF5;border:1.5px dashed #6EE7B7;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;color:#059669;cursor:pointer;width:100%;\">+ Tambah Jam</button></div>' +" + N +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Akhir</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmakhir\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" value=\"' + (s.hm_akhir != null ? s.hm_akhir : '') + '\"></div>' +" + N +
  "    '<div id=\"nse-m-hm-hint\" style=\"margin-bottom:8px;\"></div>' +" + N +
  "    '<div id=\"nse-m-preview\" style=\"margin-bottom:12px;\"></div>' +" + N +
  "    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +" + N +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + N +
  "    '<button onclick=\"submitEditNSE(\\'' + id + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan Perubahan</button>' +" + N +
  "    '</div></div>';" + N +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + N +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + N +
  "  var spans = _nseSpans(s);" + N +
  "  if (spans.length === 0) { addNSESpanRow(); } else { spans.forEach(function(sp) { addNSESpanRow(sp.start, sp.end); }); }" + N +
  "  await updateNSEHMAwal(id);" + N +
  "}",
  'PATCH 1d: openEditNSEModal — spans prefill, derived HM Awal'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1e-add: submitAddNSE — collect spans, time_spans payload
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "async function submitAddNSE() {" + N +
  "  var date = document.getElementById('nse-m-date').value;" + N +
  "  var sesi = parseInt(document.getElementById('nse-m-sesi').value);" + N +
  "  var unitId = document.getElementById('nse-m-unit').value;" + N +
  "  var start = document.getElementById('nse-m-start').value;" + N +
  "  var end = document.getElementById('nse-m-end').value;" + N +
  "  var hmAwal = document.getElementById('nse-m-hmawal').value;" + N +
  "  var hmAkhir = document.getElementById('nse-m-hmakhir').value;" + N +
  "  hmAwal = hmAwal !== '' ? parseFloat(hmAwal) : null;" + N +
  "  hmAkhir = hmAkhir !== '' ? parseFloat(hmAkhir) : null;" + N +
  "  if (!date || !start || !end || !unitId) { showToast('Lengkapi semua field wajib'); return; }" + N +
  "  if (hmAwal != null && hmAkhir != null && hmAkhir < hmAwal) { showToast('HM Akhir harus >= HM Awal'); return; }" + N +
  "  var monthYear = date.slice(0,7);" + N +
  "  var res = await sb.from('nse_sessions').insert({ session_date:date, session_num:sesi, start_time:start+':00', end_time:end+':00', hm_awal:hmAwal, hm_akhir:hmAkhir, unit_id:unitId, month_year:monthYear });" + N +
  "  if (res.error) {" + N +
  "    if (res.error.code === '23505') { showToast('Sesi ' + sesi + ' untuk tanggal ini sudah ada'); }" + N +
  "    else { showToast('Gagal simpan: ' + res.error.message); }" + N +
  "    return;" + N +
  "  }" + N +
  "  closeModal(); loadProyekNSE(); showToast('Sesi ditambahkan', 'success');" + N +
  "}",
  "async function submitAddNSE() {" + N +
  "  var date = document.getElementById('nse-m-date').value;" + N +
  "  var sesi = parseInt(document.getElementById('nse-m-sesi').value);" + N +
  "  var unitId = document.getElementById('nse-m-unit').value;" + N +
  "  var hmAkhir = document.getElementById('nse-m-hmakhir').value;" + N +
  "  hmAkhir = hmAkhir !== '' ? parseFloat(hmAkhir) : null;" + N +
  "  var cont = document.getElementById('nse-m-spans');" + N +
  "  var spanRows = cont ? cont.querySelectorAll('.nse-span-row') : [];" + N +
  "  var spans = [];" + N +
  "  var spanErr = false;" + N +
  "  spanRows.forEach(function(row) {" + N +
  "    var sv = row.querySelector('.nse-span-start').value;" + N +
  "    var ev = row.querySelector('.nse-span-end').value;" + N +
  "    if (sv && ev) { spans.push({ start: sv, end: ev }); }" + N +
  "    else if (sv || ev) { spanErr = true; }" + N +
  "  });" + N +
  "  if (spanErr) { showToast('Setiap baris waktu harus diisi lengkap (Jam Awal dan Jam Akhir)'); return; }" + N +
  "  if (spans.length === 0) { showToast('Minimal satu rentang waktu wajib diisi'); return; }" + N +
  "  if (spans.length > 5) { showToast('Maksimal 5 rentang waktu per sesi'); return; }" + N +
  "  if (!date || !unitId) { showToast('Lengkapi semua field wajib'); return; }" + N +
  "  var seedEl = document.getElementById('nse-m-hmawal-seed');" + N +
  "  var hmAwal = null;" + N +
  "  if (seedEl) { hmAwal = seedEl.value !== '' ? parseFloat(seedEl.value) : null; }" + N +
  "  var monthYear = date.slice(0,7);" + N +
  "  var payload = { session_date:date, session_num:sesi, time_spans:spans, hm_akhir:hmAkhir, unit_id:unitId, month_year:monthYear };" + N +
  "  if (seedEl) { payload.hm_awal = hmAwal; }" + N +
  "  var res = await sb.from('nse_sessions').insert(payload);" + N +
  "  if (res.error) {" + N +
  "    if (res.error.code === '23505') { showToast('Sesi ' + sesi + ' untuk tanggal ini sudah ada'); }" + N +
  "    else { showToast('Gagal simpan: ' + res.error.message); }" + N +
  "    return;" + N +
  "  }" + N +
  "  closeModal(); loadProyekNSE(); showToast('Sesi ditambahkan', 'success');" + N +
  "}",
  'PATCH 1e-add: submitAddNSE — collect spans, time_spans payload'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1e-edit: submitEditNSE — collect spans, time_spans payload
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "async function submitEditNSE(id) {" + N +
  "  var date = document.getElementById('nse-m-date').value;" + N +
  "  var sesi = parseInt(document.getElementById('nse-m-sesi').value);" + N +
  "  var unitId = document.getElementById('nse-m-unit').value;" + N +
  "  var start = document.getElementById('nse-m-start').value;" + N +
  "  var end = document.getElementById('nse-m-end').value;" + N +
  "  var hmAwal = document.getElementById('nse-m-hmawal').value;" + N +
  "  var hmAkhir = document.getElementById('nse-m-hmakhir').value;" + N +
  "  hmAwal = hmAwal !== '' ? parseFloat(hmAwal) : null;" + N +
  "  hmAkhir = hmAkhir !== '' ? parseFloat(hmAkhir) : null;" + N +
  "  if (!date || !start || !end || !unitId) { showToast('Lengkapi semua field wajib'); return; }" + N +
  "  if (hmAwal != null && hmAkhir != null && hmAkhir < hmAwal) { showToast('HM Akhir harus >= HM Awal'); return; }" + N +
  "  var monthYear = date.slice(0,7);" + N +
  "  var res = await sb.from('nse_sessions').update({ session_date:date, session_num:sesi, start_time:start+':00', end_time:end+':00', hm_awal:hmAwal, hm_akhir:hmAkhir, unit_id:unitId, month_year:monthYear }).eq('id', id);" + N +
  "  if (res.error) {" + N +
  "    if (res.error.code === '23505') { showToast('Sesi ' + sesi + ' untuk tanggal ini sudah ada'); }" + N +
  "    else { showToast('Gagal simpan: ' + res.error.message); }" + N +
  "    return;" + N +
  "  }" + N +
  "  closeModal(); loadProyekNSE(); showToast('Sesi diperbarui', 'success');" + N +
  "}",
  "async function submitEditNSE(id) {" + N +
  "  var date = document.getElementById('nse-m-date').value;" + N +
  "  var sesi = parseInt(document.getElementById('nse-m-sesi').value);" + N +
  "  var unitId = document.getElementById('nse-m-unit').value;" + N +
  "  var hmAkhir = document.getElementById('nse-m-hmakhir').value;" + N +
  "  hmAkhir = hmAkhir !== '' ? parseFloat(hmAkhir) : null;" + N +
  "  var cont = document.getElementById('nse-m-spans');" + N +
  "  var spanRows = cont ? cont.querySelectorAll('.nse-span-row') : [];" + N +
  "  var spans = [];" + N +
  "  var spanErr = false;" + N +
  "  spanRows.forEach(function(row) {" + N +
  "    var sv = row.querySelector('.nse-span-start').value;" + N +
  "    var ev = row.querySelector('.nse-span-end').value;" + N +
  "    if (sv && ev) { spans.push({ start: sv, end: ev }); }" + N +
  "    else if (sv || ev) { spanErr = true; }" + N +
  "  });" + N +
  "  if (spanErr) { showToast('Setiap baris waktu harus diisi lengkap (Jam Awal dan Jam Akhir)'); return; }" + N +
  "  if (spans.length === 0) { showToast('Minimal satu rentang waktu wajib diisi'); return; }" + N +
  "  if (spans.length > 5) { showToast('Maksimal 5 rentang waktu per sesi'); return; }" + N +
  "  if (!date || !unitId) { showToast('Lengkapi semua field wajib'); return; }" + N +
  "  var seedEl = document.getElementById('nse-m-hmawal-seed');" + N +
  "  var hmAwal = seedEl ? (seedEl.value !== '' ? parseFloat(seedEl.value) : null) : null;" + N +
  "  var monthYear = date.slice(0,7);" + N +
  "  var payload = { session_date:date, session_num:sesi, time_spans:spans, hm_awal:hmAwal, hm_akhir:hmAkhir, unit_id:unitId, month_year:monthYear };" + N +
  "  var res = await sb.from('nse_sessions').update(payload).eq('id', id);" + N +
  "  if (res.error) {" + N +
  "    if (res.error.code === '23505') { showToast('Sesi ' + sesi + ' untuk tanggal ini sudah ada'); }" + N +
  "    else { showToast('Gagal simpan: ' + res.error.message); }" + N +
  "    return;" + N +
  "  }" + N +
  "  closeModal(); loadProyekNSE(); showToast('Sesi diperbarui', 'success');" + N +
  "}",
  'PATCH 1e-edit: submitEditNSE — collect spans, time_spans payload'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH preview: Replace _nsePreviewUpdate to use span rows + derived HM Awal
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "function _nsePreviewUpdate() {" + N +
  "  var startEl = document.getElementById('nse-m-start');" + N +
  "  var endEl = document.getElementById('nse-m-end');" + N +
  "  var prevEl = document.getElementById('nse-m-preview');" + N +
  "  if (!startEl || !endEl || !prevEl) return;" + N +
  "  var start = startEl.value; var end = endEl.value;" + N +
  "  if (!start || !end) { prevEl.innerHTML = ''; return; }" + N +
  "  var hrs = _nseHrs(start + ':00', end + ':00');" + N +
  "  var overnight = _isOvernight(start + ':00', end + ':00');" + N +
  "  var salary = Math.round(hrs * 35000);" + N +
  "  var badge = overnight ? ' <span style=\"background:#FEF3C7;color:#B45309;font-size:11px;font-weight:700;padding:2px 6px;border-radius:99px;\">Overnight &#8593;</span>' : '';" + N +
  "  var hmAwal = parseFloat(document.getElementById('nse-m-hmawal') ? document.getElementById('nse-m-hmawal').value : '');" + N +
  "  var hmAkhir = parseFloat(document.getElementById('nse-m-hmakhir') ? document.getElementById('nse-m-hmakhir').value : '');" + N +
  "  var hmGapHtml = '';" + N +
  "  if (!isNaN(hmAwal) && !isNaN(hmAkhir)) {" + N +
  "    var gap = hmAkhir - hmAwal;" + N +
  "    var gapColor = gap < 0 ? '#DC2626' : '#1D4ED8';" + N +
  "    hmGapHtml = '<span style=\"font-size:12px;color:' + gapColor + ';font-weight:700;margin-left:12px;\">HM Gap: ' + gap.toFixed(1) + '</span>';" + N +
  "  }" + N +
  "  var continuityHtml = '';" + N +
  "  if (window._nseLastHM != null && !isNaN(hmAwal)) {" + N +
  "    var cont = hmAwal - window._nseLastHM;" + N +
  "    if (cont < 0) { continuityHtml = '<div style=\"margin-top:6px;font-size:11px;color:#DC2626;font-weight:700;\">&#9888; HM Awal (' + hmAwal.toFixed(1) + ') lebih kecil dari HM Terakhir (' + window._nseLastHM.toFixed(1) + ')</div>'; }" + N +
  "    else if (cont < 0.1) { continuityHtml = '<div style=\"margin-top:6px;font-size:11px;color:#16A34A;font-weight:700;\">&#10003; Lanjut dari HM Terakhir (' + window._nseLastHM.toFixed(1) + ')</div>'; }" + N +
  "    else { continuityHtml = '<div style=\"margin-top:6px;font-size:11px;color:#D97706;font-weight:700;\">&#9432; Gap +' + cont.toFixed(1) + ' dari HM Terakhir (' + window._nseLastHM.toFixed(1) + ')</div>'; }" + N +
  "  }" + N +
  "  prevEl.innerHTML = '<div style=\"background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-top:4px;\">' +" + N +
  "    '<span style=\"font-size:13px;font-weight:700;color:#16A34A;\">' + hrs.toFixed(1) + ' jam' + badge + ' — ' + fmtRp(salary) + '</span>' + hmGapHtml + continuityHtml + '</div>';" + N +
  "}",
  "function _nsePreviewUpdate() {" + N +
  "  var prevEl = document.getElementById('nse-m-preview');" + N +
  "  if (!prevEl) return;" + N +
  "  var cont = document.getElementById('nse-m-spans');" + N +
  "  var spanRows = cont ? cont.querySelectorAll('.nse-span-row') : [];" + N +
  "  var hrs = 0, hasOvernight = false, anySpan = false;" + N +
  "  spanRows.forEach(function(row) {" + N +
  "    var sv = row.querySelector('.nse-span-start').value;" + N +
  "    var ev = row.querySelector('.nse-span-end').value;" + N +
  "    if (!sv || !ev) return;" + N +
  "    hrs += _nseHrs(sv + ':00', ev + ':00');" + N +
  "    if (_isOvernight(sv + ':00', ev + ':00')) hasOvernight = true;" + N +
  "    anySpan = true;" + N +
  "  });" + N +
  "  if (!anySpan) { prevEl.innerHTML = ''; return; }" + N +
  "  var salary = Math.round(hrs * 35000);" + N +
  "  var badge = hasOvernight ? ' <span style=\"background:#FEF3C7;color:#B45309;font-size:11px;font-weight:700;padding:2px 6px;border-radius:99px;\">Overnight &#8593;</span>' : '';" + N +
  "  var hmAkhir = parseFloat(document.getElementById('nse-m-hmakhir') ? document.getElementById('nse-m-hmakhir').value : '');" + N +
  "  var hmAwal = window._nseDerivedHMAwal;" + N +
  "  var seedEl = document.getElementById('nse-m-hmawal-seed');" + N +
  "  if (seedEl && hmAwal == null) { hmAwal = seedEl.value !== '' ? parseFloat(seedEl.value) : null; }" + N +
  "  var hmGapHtml = '';" + N +
  "  if (hmAwal != null && !isNaN(hmAwal) && !isNaN(hmAkhir)) {" + N +
  "    var gap = hmAkhir - hmAwal;" + N +
  "    var gapColor = gap < 0 ? '#DC2626' : '#1D4ED8';" + N +
  "    hmGapHtml = '<span style=\"font-size:12px;color:' + gapColor + ';font-weight:700;margin-left:12px;\">HM Gap: ' + gap.toFixed(1) + '</span>';" + N +
  "  }" + N +
  "  prevEl.innerHTML = '<div style=\"background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-top:4px;\">' +" + N +
  "    '<span style=\"font-size:13px;font-weight:700;color:#16A34A;\">' + hrs.toFixed(1) + ' jam' + badge + ' — ' + fmtRp(salary) + '</span>' + hmGapHtml + '</div>';" + N +
  "}",
  'PATCH preview: replace _nsePreviewUpdate to use span rows + derived HM Awal'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1b-export: Call _nseDeriveChain at start of exportNSESummary
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "async function exportNSESummary() {" + N +
  "  if (typeof ExcelJS === 'undefined') { showToast('ExcelJS tidak tersedia'); return; }" + N +
  "  if (!nseData || nseData.length === 0) { showToast('Tidak ada sesi NSE untuk diexport'); return; }",
  "async function exportNSESummary() {" + N +
  "  if (typeof ExcelJS === 'undefined') { showToast('ExcelJS tidak tersedia'); return; }" + N +
  "  if (!nseData || nseData.length === 0) { showToast('Tidak ada sesi NSE untuk diexport'); return; }" + N +
  "  await _nseDeriveChain();",
  'PATCH 1b-export: call _nseDeriveChain at exportNSESummary start'
);

// ─────────────────────────────────────────────────────────────────────────────
// FINISH
// ─────────────────────────────────────────────────────────────────────────────
if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written (' + src.length + ' bytes)');
