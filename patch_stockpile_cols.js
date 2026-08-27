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

// PATCH 1: Sort by start_date instead of end_date
replaceExact(
  "      .eq('type', 'stockpile')" + N +
  "      .order('end_date', { ascending: false });",
  "      .eq('type', 'stockpile')" + N +
  "      .order('start_date', { ascending: false });",
  'PATCH 1: Sort stockpile by start_date desc'
);

// PATCH 2: Column headers — remove Unit(count), add Unit, HM Awal, HM Akhir before HM Total
replaceExact(
  "  ['Kode','Pemberi Kerja','Tanggal','Unit','HM Total','Salary Total'].forEach(col => {",
  "  ['Kode','Pemberi Kerja','Tanggal','Unit','HM Awal','HM Akhir','HM Total','Salary Total'].forEach(col => {",
  'PATCH 2: Add Unit/HM Awal/HM Akhir columns, remove Unit count'
);

// PATCH 3: Row data — remove unit count cell, add unit code + HM Awal + HM Akhir cells
replaceExact(
  "    h += '<td style=\"padding:10px 12px;text-align:center;\">' + units.length + '</td>';" + N +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + totalHM.toFixed(1) + '</td>';",
  "    var unitCodes = units.map(function(u) { return u.units ? u.units.code : '?'; }).join('<br>');" + N +
  "    var hmAwalList = units.map(function(u) { return u.hm_awal != null ? u.hm_awal : '—'; }).join('<br>');" + N +
  "    var hmAkhirList = units.map(function(u) { return u.hm_akhir != null ? u.hm_akhir : '<span style=\"color:#F59E0B;font-weight:700;\">Ongoing</span>'; }).join('<br>');" + N +
  "    h += '<td style=\"padding:10px 12px;font-weight:700;\">' + unitCodes + '</td>';" + N +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + hmAwalList + '</td>';" + N +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + hmAkhirList + '</td>';" + N +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + totalHM.toFixed(1) + '</td>';",
  'PATCH 3: Add unit code/HM Awal/HM Akhir data cells'
);

// PATCH 4: colspan 7 -> 9 in placeholder detail row
replaceExact(
  "<td colspan=\"7\" style=\"padding:8px;color:#64748B;font-size:12px;\">Klik untuk memuat detail...</td>",
  "<td colspan=\"9\" style=\"padding:8px;color:#64748B;font-size:12px;\">Klik untuk memuat detail...</td>",
  'PATCH 4: colspan 7->9 in placeholder row'
);

// PATCH 5: colspan 7 -> 9 in rendered detail row
replaceExact(
  "'<td colspan=\"7\" style=\"padding:12px 16px;\">' + renderStockpileDetailHTML(p, unitFillMap) + '</td>'",
  "'<td colspan=\"9\" style=\"padding:12px 16px;\">' + renderStockpileDetailHTML(p, unitFillMap) + '</td>'",
  'PATCH 5: colspan 7->9 in rendered detail row'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 5 patches applied');
