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

// ─── PATCH 1: renderProyekNSEList — add Download button in header ─────────────
replaceExact(
  "h += '<button onclick=\"openAddNSEModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;width:auto;\">+ Tambah Sesi</button>';" + N +
  "  h += '</div></div>';",
  "h += '<button onclick=\"openAddNSEModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;width:auto;\">+ Tambah Sesi</button>';" + N +
  "  h += '<button onclick=\"exportNSESummary()\" style=\"background:#0F172A;color:white;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;\">&#11015; Download</button>';" + N +
  "  h += '</div></div>';",
  'PATCH 1: renderProyekNSEList — add Download button'
);

// ─── PATCH 2: Insert exportNSESummary() function before exportBatch16 ─────────
replaceExact(
  "function exportBatch16() { exportBatchExcel('mid_month'); }",
  "async function exportNSESummary() {" + N +
  "  if (typeof ExcelJS === 'undefined') { showToast('ExcelJS tidak tersedia'); return; }" + N +
  "  if (!nseData || nseData.length === 0) { showToast('Tidak ada sesi NSE untuk diexport'); return; }" + N +
  "  var NF = '#,##0';" + N +
  "  var BDR = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };" + N +
  "  var BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];" + N +
  "  var _my = _nseMonthFilter.split('-');" + N +
  "  var periodeStr = (BULAN_ID[parseInt(_my[1], 10) - 1] || '') + ' ' + _my[0];" + N +
  "  function _ndayOf(d) { return d ? parseInt(d.slice(8, 10), 10) : 0; }" + N +
  "  var batch16 = nseData.filter(function(s) { return _ndayOf(s.session_date) <= 15; });" + N +
  "  var batch31 = nseData.filter(function(s) { return _ndayOf(s.session_date) > 15; });" + N +
  "  var wb = new ExcelJS.Workbook();" + N +
  "  var ws = wb.addWorksheet('NSE REKAP');" + N +
  "  var titleRow = ws.addRow(['NSE — REKAP SESI KERJA']);" + N +
  "  titleRow.font = { bold: true, size: 14 };" + N +
  "  ws.addRow(['Bulan: ' + periodeStr]);" + N +
  "  ws.addRow([]);" + N +
  "  var COLS = ['Tanggal', 'Sesi', 'Unit', 'Jam Mulai', 'Jam Selesai', 'Overnight', 'Billed Hrs', 'HM Awal', 'HM Akhir', 'HM Gap', 'Salary (Rp)'];" + N +
  "  function _nseAddBatch(sessions, batchLabel) {" + N +
  "    if (sessions.length === 0) return;" + N +
  "    var batchHdr = ws.addRow([batchLabel]);" + N +
  "    batchHdr.font = { bold: true, size: 12, color: { argb: 'FF9A3412' } };" + N +
  "    batchHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };" + N +
  "    var colHdr = ws.addRow(COLS);" + N +
  "    colHdr.font = { bold: true };" + N +
  "    colHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } };" + N +
  "    colHdr.eachCell(function(cell) { cell.border = BDR; cell.alignment = { horizontal: 'center' }; });" + N +
  "    var totalHrs = 0, totalSalary = 0;" + N +
  "    sessions.forEach(function(s) {" + N +
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
  "    subRow.eachCell(function(cell) { cell.border = BDR; });" + N +
  "    ws.addRow([]);" + N +
  "  }" + N +
  "  _nseAddBatch(batch16, 'Batch 16 (Tgl 1-15)');" + N +
  "  _nseAddBatch(batch31, 'Batch 31 (Tgl 16-31)');" + N +
  "  var grandHrs = nseData.reduce(function(a, s) { return a + _nseHrs(s.start_time, s.end_time); }, 0);" + N +
  "  var grandSalary = nseData.reduce(function(a, s) { return a + Math.round(_nseHrs(s.start_time, s.end_time) * 35000); }, 0);" + N +
  "  var grandRow = ws.addRow(['GRAND TOTAL', '', '', '', '', '', +grandHrs.toFixed(1), '', '', '', grandSalary]);" + N +
  "  grandRow.eachCell(function(cell) { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.border = BDR; cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF9A3412' } }; });" + N +
  "  grandRow.getCell(11).numFmt = NF;" + N +
  "  ws.getColumn(1).width = 14; ws.getColumn(2).width = 6; ws.getColumn(3).width = 8;" + N +
  "  ws.getColumn(4).width = 10; ws.getColumn(5).width = 10; ws.getColumn(6).width = 10;" + N +
  "  ws.getColumn(7).width = 11; ws.getColumn(8).width = 10; ws.getColumn(9).width = 10;" + N +
  "  ws.getColumn(10).width = 10; ws.getColumn(11).width = 16;" + N +
  "  var buffer = await wb.xlsx.writeBuffer();" + N +
  "  var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });" + N +
  "  var url = URL.createObjectURL(blob);" + N +
  "  var a = document.createElement('a');" + N +
  "  a.href = url; a.download = 'NSE_' + _nseMonthFilter.replace('-', '') + '.xlsx';" + N +
  "  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);" + N +
  "  showToast('NSE Summary berhasil didownload!', 'success');" + N +
  "}" + N +
  "function exportBatch16() { exportBatchExcel('mid_month'); }",
  'PATCH 2: insert exportNSESummary() function'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
