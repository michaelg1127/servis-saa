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

// Replace per-unit sheets loop with SLIP GAJI sheet
replaceExact(
  "  // Per-unit sheets" + CRLF +
  "  Object.keys(unitSheetData).sort().forEach(function(code) {" + CRLF +
  "    const rows = [['Kode','Tanggal','Nama Kapal / Proyek','Kade','Alat','HM Mulai','HM Akhir','Total Jam','BL (Rp)','Persentase','Premi','TOTAL']];" + CRLF +
  "    let unitTotal = 0;" + CRLF +
  "    unitSheetData[code].forEach(function(r) { rows.push(r); unitTotal += (typeof r[11] === 'number' ? r[11] : 0); });" + CRLF +
  "    rows.push(['', '', '', '', '', '', 'TOTAL', '', '', '', '', unitTotal]);" + CRLF +
  "    const safeName = code.replace(/[:\\\\/\\?*\\[\\]]/g, '_').slice(0, 31);" + CRLF +
  "    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), safeName);" + CRLF +
  "  });",

  "  // SLIP GAJI — all operators in one sheet" + CRLF +
  "  var slipRows = [];" + CRLF +
  "  Object.keys(unitSheetData).sort().forEach(function(code) {" + CRLF +
  "    var entry = unitSheetData[code];" + CRLF +
  "    slipRows.push(['Unit:', code, '', 'Nama Operator:', entry.opName || code]);" + CRLF +
  "    slipRows.push(['Periode:', periodeStr, '', '', '']);" + CRLF +
  "    slipRows.push([]);" + CRLF +
  "    slipRows.push(['Kode','Tanggal','Nama Kapal / Proyek','Kade','Alat','HM Mulai','HM Akhir','Total Jam','BL (Ton)','Persentase','Premi','Total Pendapatan']);" + CRLF +
  "    var unitTotal = 0;" + CRLF +
  "    entry.rows.forEach(function(r, i) {" + CRLF +
  "      if (typeof r[11] === 'number' && r[11] > 0) {" + CRLF +
  "        var slipRow = r.slice();" + CRLF +
  "        slipRow[8] = entry.blTons[i];" + CRLF +
  "        slipRows.push(slipRow);" + CRLF +
  "        unitTotal += r[11];" + CRLF +
  "      }" + CRLF +
  "    });" + CRLF +
  "    slipRows.push(['', '', '', '', '', '', 'Total Pendapatan', '', '', '', '', unitTotal]);" + CRLF +
  "    slipRows.push([]);" + CRLF +
  "    slipRows.push([]);" + CRLF +
  "  });" + CRLF +
  "  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(slipRows), 'SLIP GAJI');",

  'replace per-unit sheets with SLIP GAJI sheet'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
