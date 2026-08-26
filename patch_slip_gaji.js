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

// ── PATCH 1: Replace entire SLIP GAJI section ────────────────────────────────
const fromSlip = [
  "  // SLIP GAJI — all operators in one sheet",
  "  var slipRows = [];",
  "  Object.keys(unitSheetData).sort().forEach(function(code) {",
  "    var entry = unitSheetData[code];",
  "    slipRows.push(['Unit:', code, '', 'Nama Operator:', entry.opName || code]);",
  "    slipRows.push(['Periode:', periodeStr, '', '', '']);",
  "    slipRows.push([]);",
  "    slipRows.push(['Kode','Tanggal','Nama Kapal / Proyek','Kade','Alat','HM Mulai','HM Akhir','Total Jam','BL (Ton)','Persentase','Premi','Total Pendapatan']);",
  "    var unitTotal = 0;",
  "    entry.rows.forEach(function(r, i) {",
  "      if (typeof r[11] === 'number' && r[11] > 0) {",
  "        var slipRow = r.slice();",
  "        slipRow[8] = entry.blTons[i];",
  "        slipRows.push(slipRow);",
  "        unitTotal += r[11];",
  "      }",
  "    });",
  "    slipRows.push(['', '', '', '', '', '', 'Total Pendapatan', '', '', '', '', unitTotal]);",
  "    slipRows.push([]);",
  "    slipRows.push([]);",
  "  });",
  "  var wsSlip = XLSX.utils.aoa_to_sheet(slipRows);",
  "  slipRows.forEach(function(row, ri) {",
  "    if (!row || row.length === 0) return;",
  "    if (row[0] === 'Unit:' || row[0] === 'Periode:') { for (var ci = 0; ci < 5; ci++) _xcs(wsSlip, ri, ci, _xh); }",
  "    else if (row[0] === 'Kode') { for (var ci = 0; ci < 12; ci++) _xcs(wsSlip, ri, ci, _xh); }",
  "    else { _xnf(wsSlip, ri, 8); _xnf(wsSlip, ri, 10); _xnf(wsSlip, ri, 11); }",
  "  });",
  "  XLSX.utils.book_append_sheet(wb, wsSlip, 'SLIP GAJI');"
].join(N);

const toSlip = [
  "  // SLIP GAJI — per-operator: Stockpile / Kapal split + Basis + Kasbon",
  "  var _xsec = { font: { bold: true }, fill: { fgColor: { rgb: 'E2EFDA' }, patternType: 'solid' }, border: _xb };",
  "  var _xtot = { font: { bold: true }, fill: { fgColor: { rgb: 'DBEAFE' }, patternType: 'solid' }, border: _xb };",
  "  var _xsub = { font: { italic: true }, border: _xb };",
  "  var _gpok = batchType === 'end_of_month' ? 3100000 : 0;",
  "  var slipRows = [];",
  "  var _xnfAmt = function(ws, ri, ci) {",
  "    var ref = XLSX.utils.encode_cell({ r: ri, c: ci });",
  "    if (ws[ref] && ws[ref].t === 'n') ws[ref].s = Object.assign({}, ws[ref].s || {}, { numFmt: '#,##0' });",
  "  };",
  "  Object.keys(unitSheetData).sort().forEach(function(code) {",
  "    var entry = unitSheetData[code];",
  "    var kasbon = kasbonMap[entry.opName] || 0;",
  "    var stkRs = [], kapalRs = [];",
  "    entry.rows.forEach(function(r) {",
  "      if (typeof r[11] === 'number' && r[11] > 0) {",
  "        if (r[9] === 'STK') stkRs.push(r); else kapalRs.push(r);",
  "      }",
  "    });",
  "    var stkTotal = stkRs.reduce(function(s, r) { return s + r[11]; }, 0);",
  "    var kapalTotal = kapalRs.reduce(function(s, r) { return s + r[11]; }, 0);",
  "    var unitTotal = stkTotal + kapalTotal;",
  "    var grandTotal = unitTotal + _gpok - kasbon;",
  "    slipRows.push(['Unit:', code, '', 'Nama Operator:', entry.opName || code]);",
  "    slipRows.push(['Periode:', periodeStr, '', '', '']);",
  "    slipRows.push([]);",
  "    if (stkRs.length > 0) {",
  "      slipRows.push(['Pekerjaan Stockpile:', '', '', '', '']);",
  "      stkRs.forEach(function(r, i) {",
  "        slipRows.push(['', (i + 1) + '.', r[0] + '  (' + r[1] + ')', r[7] + ' jam', r[11]]);",
  "      });",
  "      slipRows.push(['', '', 'Subtotal Stockpile:', '', stkTotal]);",
  "      slipRows.push([]);",
  "    }",
  "    if (kapalRs.length > 0) {",
  "      slipRows.push(['Pekerjaan Kapal:', '', '', '', '']);",
  "      kapalRs.forEach(function(r, i) {",
  "        var kade = r[3] ? r[3] + '  ' : '';",
  "        slipRows.push(['', (i + 1) + '.', r[2], kade + '(' + r[1] + ')', r[11]]);",
  "      });",
  "      slipRows.push(['', '', 'Subtotal Kapal:', '', kapalTotal]);",
  "      slipRows.push([]);",
  "    }",
  "    slipRows.push(['', '', 'Total Kerja:', '', unitTotal]);",
  "    if (_gpok > 0) slipRows.push(['', '', 'Gaji Pokok (Basis):', '', _gpok]);",
  "    if (kasbon > 0) slipRows.push(['', '', 'Kasbon:', '', -kasbon]);",
  "    slipRows.push(['', '', 'TOTAL BERSIH:', '', grandTotal]);",
  "    slipRows.push([]);",
  "    slipRows.push([]);",
  "  });",
  "  var wsSlip = XLSX.utils.aoa_to_sheet(slipRows);",
  "  slipRows.forEach(function(row, ri) {",
  "    if (!row || row.length === 0) return;",
  "    var c0 = row[0], c2 = row[2];",
  "    if (c0 === 'Unit:' || c0 === 'Periode:') {",
  "      for (var ci = 0; ci < 5; ci++) _xcs(wsSlip, ri, ci, _xh);",
  "    } else if (c0 === 'Pekerjaan Stockpile:' || c0 === 'Pekerjaan Kapal:') {",
  "      for (var ci = 0; ci < 5; ci++) _xcs(wsSlip, ri, ci, _xsec);",
  "    } else if (c2 === 'Subtotal Stockpile:' || c2 === 'Subtotal Kapal:') {",
  "      _xcs(wsSlip, ri, 2, _xsub); _xcs(wsSlip, ri, 4, _xsub); _xnfAmt(wsSlip, ri, 4);",
  "    } else if (c2 === 'Total Kerja:' || c2 === 'Gaji Pokok (Basis):') {",
  "      _xcs(wsSlip, ri, 2, { font: { bold: true } }); _xnfAmt(wsSlip, ri, 4);",
  "    } else if (c2 === 'Kasbon:') {",
  "      _xcs(wsSlip, ri, 2, { font: { bold: true, color: { rgb: 'DC2626' } } }); _xnfAmt(wsSlip, ri, 4);",
  "    } else if (c2 === 'TOTAL BERSIH:') {",
  "      for (var ci = 0; ci < 5; ci++) _xcs(wsSlip, ri, ci, _xtot); _xnfAmt(wsSlip, ri, 4);",
  "    } else {",
  "      _xnfAmt(wsSlip, ri, 4);",
  "    }",
  "  });",
  "  XLSX.utils.book_append_sheet(wb, wsSlip, 'SLIP GAJI');"
].join(N);

replaceExact(fromSlip, toSlip, 'PATCH 1: SLIP GAJI — Stockpile/Kapal split + Basis + Kasbon + formatting');

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
