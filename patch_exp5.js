const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceExact(from, to, desc) {
  if (!html.includes(from)) { console.error('MISS: ' + desc); process.exit(1); }
  const count = html.split(from).length - 1;
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changed++;
  console.log('OK: ' + desc);
}

const CRLF = '\r\n';

replaceExact(
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rekapRows), \'REKAP\');' + CRLF +
  '  // SLIP GAJI — all operators in one sheet' + CRLF +
  '  var slipRows = [];' + CRLF +
  '  Object.keys(unitSheetData).sort().forEach(function(code) {' + CRLF +
  '    var entry = unitSheetData[code];' + CRLF +
  '    slipRows.push([\'Unit:\', code, \'\', \'Nama Operator:\', entry.opName || code]);' + CRLF +
  '    slipRows.push([\'Periode:\', periodeStr, \'\', \'\', \'\']);' + CRLF +
  '    slipRows.push([]);' + CRLF +
  '    slipRows.push([\'Kode\',\'Tanggal\',\'Nama Kapal / Proyek\',\'Kade\',\'Alat\',\'HM Mulai\',\'HM Akhir\',\'Total Jam\',\'BL (Ton)\',\'Persentase\',\'Premi\',\'Total Pendapatan\']);' + CRLF +
  '    var unitTotal = 0;' + CRLF +
  '    entry.rows.forEach(function(r, i) {' + CRLF +
  '      if (typeof r[11] === \'number\' && r[11] > 0) {' + CRLF +
  '        var slipRow = r.slice();' + CRLF +
  '        slipRow[8] = entry.blTons[i];' + CRLF +
  '        slipRows.push(slipRow);' + CRLF +
  '        unitTotal += r[11];' + CRLF +
  '      }' + CRLF +
  '    });' + CRLF +
  '    slipRows.push([\'\', \'\', \'\', \'\', \'\', \'\', \'Total Pendapatan\', \'\', \'\', \'\', \'\', unitTotal]);' + CRLF +
  '    slipRows.push([]);' + CRLF +
  '    slipRows.push([]);' + CRLF +
  '  });' + CRLF +
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(slipRows), \'SLIP GAJI\');' + CRLF +
  '  // TRANSFER sheet' + CRLF +
  '  const gajiPokok = batchType === \'end_of_month\' ? 3100000 : 0;' + CRLF +
  '  const transferRows = [[\'No\',\'Nama OP\',\'Unit\',\'Total Kerja\',\'Gaji Pokok\',\'Grand Total\',\'Admin Fee\',\'Net Transfer\',\'Bank\',\'No. Rekening\',\'Nama Rekening\']];' + CRLF +
  '  let no = 1;' + CRLF +
  '  let trTotKerja = 0, trTotPokok = 0, trTotGrand = 0, trTotFee = 0, trTotNet = 0;' + CRLF +
  '  Object.keys(opTotals).sort().forEach(function(name) {' + CRLF +
  '    const s = opTotals[name];' + CRLF +
  '    const kasbon = kasbonMap[name] || 0;' + CRLF +
  '    const grand = s.total + gajiPokok - kasbon;' + CRLF +
  '    const bInfo = bankMap[s.unitCode] || {};' + CRLF +
  '    const isBCA = (bInfo.bank_name || \'\').toUpperCase().includes(\'BCA\');' + CRLF +
  '    const adminFee = isBCA ? 0 : 2500;' + CRLF +
  '    const netTransfer = grand - adminFee;' + CRLF +
  '    transferRows.push([no++, name, s.unitCode, s.total, gajiPokok, grand, adminFee, netTransfer, bInfo.bank_name || \'---\', bInfo.bank_account_number || \'---\', bInfo.bank_account_name || \'---\']);' + CRLF +
  '    trTotKerja += s.total; trTotPokok += gajiPokok; trTotGrand += grand; trTotFee += adminFee; trTotNet += netTransfer;' + CRLF +
  '  });' + CRLF +
  '  transferRows.push([\'\', \'TOTAL\', \'\', trTotKerja, trTotPokok, trTotGrand, trTotFee, trTotNet, \'\', \'\', \'\']);' + CRLF +
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transferRows), \'TRANSFER\');' + CRLF +
  '  const label = batchType === \'mid_month\' ? \'Batch16\' : \'Batch31\';' + CRLF +
  '  XLSX.writeFile(wb, label + \'_\' + monthYear.replace(\'-\', \'\') + \'.xlsx\');' + CRLF +
  '  showToast(\'Export \' + label + \' berhasil!\', \'success\');' + CRLF +
  '}',

  // ── REPLACEMENT ──────────────────────────────────────────────────────────
  '  // Shared style helpers' + CRLF +
  '  var _xt = { style: \'thin\', color: { rgb: \'000000\' } };' + CRLF +
  '  var _xb = { top: _xt, bottom: _xt, left: _xt, right: _xt };' + CRLF +
  '  var _xh = { font: { bold: true, italic: true }, fill: { fgColor: { rgb: \'FFFF00\' }, patternType: \'solid\' }, border: _xb };' + CRLF +
  '  function _xcs(ws, r, c, s) { var ref = XLSX.utils.encode_cell({ r: r, c: c }); if (!ws[ref]) ws[ref] = { t: \'s\', v: \'\' }; ws[ref].s = s; }' + CRLF +
  '  function _xnf(ws, r, c) { var ref = XLSX.utils.encode_cell({ r: r, c: c }); if (ws[ref] && ws[ref].t === \'n\') ws[ref].s = Object.assign({}, ws[ref].s || {}, { numFmt: \'#,##0.00\' }); }' + CRLF +
  '  // REKAP — shift TOTAL to col M; apply header style + numFmt' + CRLF +
  '  var rekapAoa = rekapRows.map(function(row) { var r2 = row.slice(0, 11); r2.push(\'\'); r2.push(row.length > 11 ? row[11] : \'\'); return r2; });' + CRLF +
  '  var wsRekap = XLSX.utils.aoa_to_sheet(rekapAoa);' + CRLF +
  '  var rkR = XLSX.utils.decode_range(wsRekap[\'!ref\']);' + CRLF +
  '  for (var ci = 0; ci <= 12; ci++) _xcs(wsRekap, 0, ci, _xh);' + CRLF +
  '  for (var ri = 1; ri <= rkR.e.r; ri++) { _xnf(wsRekap, ri, 8); _xnf(wsRekap, ri, 10); _xnf(wsRekap, ri, 12); }' + CRLF +
  '  XLSX.utils.book_append_sheet(wb, wsRekap, \'REKAP\');' + CRLF +
  '  // SLIP GAJI — all operators in one sheet' + CRLF +
  '  var slipRows = [];' + CRLF +
  '  Object.keys(unitSheetData).sort().forEach(function(code) {' + CRLF +
  '    var entry = unitSheetData[code];' + CRLF +
  '    slipRows.push([\'Unit:\', code, \'\', \'Nama Operator:\', entry.opName || code]);' + CRLF +
  '    slipRows.push([\'Periode:\', periodeStr, \'\', \'\', \'\']);' + CRLF +
  '    slipRows.push([]);' + CRLF +
  '    slipRows.push([\'Kode\',\'Tanggal\',\'Nama Kapal / Proyek\',\'Kade\',\'Alat\',\'HM Mulai\',\'HM Akhir\',\'Total Jam\',\'BL (Ton)\',\'Persentase\',\'Premi\',\'Total Pendapatan\']);' + CRLF +
  '    var unitTotal = 0;' + CRLF +
  '    entry.rows.forEach(function(r, i) {' + CRLF +
  '      if (typeof r[11] === \'number\' && r[11] > 0) {' + CRLF +
  '        var slipRow = r.slice();' + CRLF +
  '        slipRow[8] = entry.blTons[i];' + CRLF +
  '        slipRows.push(slipRow);' + CRLF +
  '        unitTotal += r[11];' + CRLF +
  '      }' + CRLF +
  '    });' + CRLF +
  '    slipRows.push([\'\', \'\', \'\', \'\', \'\', \'\', \'Total Pendapatan\', \'\', \'\', \'\', \'\', unitTotal]);' + CRLF +
  '    slipRows.push([]);' + CRLF +
  '    slipRows.push([]);' + CRLF +
  '  });' + CRLF +
  '  var wsSlip = XLSX.utils.aoa_to_sheet(slipRows);' + CRLF +
  '  slipRows.forEach(function(row, ri) {' + CRLF +
  '    if (!row || row.length === 0) return;' + CRLF +
  '    if (row[0] === \'Unit:\' || row[0] === \'Periode:\') { for (var ci = 0; ci < 5; ci++) _xcs(wsSlip, ri, ci, _xh); }' + CRLF +
  '    else if (row[0] === \'Kode\') { for (var ci = 0; ci < 12; ci++) _xcs(wsSlip, ri, ci, _xh); }' + CRLF +
  '    else { _xnf(wsSlip, ri, 8); _xnf(wsSlip, ri, 10); _xnf(wsSlip, ri, 11); }' + CRLF +
  '  });' + CRLF +
  '  XLSX.utils.book_append_sheet(wb, wsSlip, \'SLIP GAJI\');' + CRLF +
  '  // TRANSFER sheet' + CRLF +
  '  const gajiPokok = batchType === \'end_of_month\' ? 3100000 : 0;' + CRLF +
  '  const transferRows = [[\'No\',\'Nama OP\',\'Unit\',\'Total Kerja\',\'Gaji Pokok\',\'Grand Total\',\'Admin Fee\',\'Net Transfer\',\'Bank\',\'No. Rekening\',\'Nama Rekening\']];' + CRLF +
  '  let no = 1;' + CRLF +
  '  let trTotKerja = 0, trTotPokok = 0, trTotGrand = 0, trTotFee = 0, trTotNet = 0;' + CRLF +
  '  Object.keys(opTotals).sort().forEach(function(name) {' + CRLF +
  '    const s = opTotals[name];' + CRLF +
  '    const kasbon = kasbonMap[name] || 0;' + CRLF +
  '    const grand = s.total + gajiPokok - kasbon;' + CRLF +
  '    const bInfo = bankMap[s.unitCode] || {};' + CRLF +
  '    const isBCA = (bInfo.bank_name || \'\').toUpperCase().includes(\'BCA\');' + CRLF +
  '    const adminFee = isBCA ? 0 : 2500;' + CRLF +
  '    const netTransfer = grand - adminFee;' + CRLF +
  '    transferRows.push([no++, name, s.unitCode, s.total, gajiPokok, grand, adminFee, netTransfer, bInfo.bank_name || \'---\', bInfo.bank_account_number || \'---\', bInfo.bank_account_name || \'---\']);' + CRLF +
  '    trTotKerja += s.total; trTotPokok += gajiPokok; trTotGrand += grand; trTotFee += adminFee; trTotNet += netTransfer;' + CRLF +
  '  });' + CRLF +
  '  transferRows.push([\'\', \'TOTAL\', \'\', trTotKerja, trTotPokok, trTotGrand, trTotFee, trTotNet, \'\', \'\', \'\']);' + CRLF +
  '  var wsTransfer = XLSX.utils.aoa_to_sheet(transferRows);' + CRLF +
  '  var trR = XLSX.utils.decode_range(wsTransfer[\'!ref\']);' + CRLF +
  '  for (var ci = 0; ci <= 10; ci++) _xcs(wsTransfer, 0, ci, _xh);' + CRLF +
  '  for (var ri = 1; ri <= trR.e.r; ri++) {' + CRLF +
  '    for (var ci = 0; ci <= 10; ci++) {' + CRLF +
  '      var ref = XLSX.utils.encode_cell({ r: ri, c: ci });' + CRLF +
  '      if (!wsTransfer[ref]) wsTransfer[ref] = { t: \'s\', v: \'\' };' + CRLF +
  '      wsTransfer[ref].s = Object.assign({}, wsTransfer[ref].s || {}, { border: _xb });' + CRLF +
  '      if (ci >= 3 && ci <= 7 && wsTransfer[ref].t === \'n\') wsTransfer[ref].s.numFmt = \'#,##0.00\';' + CRLF +
  '    }' + CRLF +
  '  }' + CRLF +
  '  XLSX.utils.book_append_sheet(wb, wsTransfer, \'TRANSFER\');' + CRLF +
  '  const label = batchType === \'mid_month\' ? \'Batch16\' : \'Batch31\';' + CRLF +
  '  XLSX.writeFile(wb, label + \'_\' + monthYear.replace(\'-\', \'\') + \'.xlsx\');' + CRLF +
  '  showToast(\'Export \' + label + \' berhasil!\', \'success\');' + CRLF +
  '}',

  'exportBatchExcel: sheet styling (REKAP col-M shift, header yellow, numFmt, TRANSFER borders)'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
