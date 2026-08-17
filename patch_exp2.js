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

// 1. Update units SELECT + add periodeStr
replaceExact(
  '  const { data: unitsBank } = await sb.from(\'units\').select(\'code, operator_name, bank_name, bank_account_number\');' + CRLF +
  '  const bankMap = {};' + CRLF +
  '  (unitsBank || []).forEach(function(u) { bankMap[u.code] = u; });' + CRLF +
  '  const wb = XLSX.utils.book_new();',

  '  const { data: unitsBank } = await sb.from(\'units\').select(\'code, operator_name, bank_name, bank_account_number, bank_account_name\');' + CRLF +
  '  const bankMap = {};' + CRLF +
  '  (unitsBank || []).forEach(function(u) { bankMap[u.code] = u; });' + CRLF +
  '  const BULAN_ID = [\'Januari\',\'Februari\',\'Maret\',\'April\',\'Mei\',\'Juni\',\'Juli\',\'Agustus\',\'September\',\'Oktober\',\'November\',\'Desember\'];' + CRLF +
  '  const _my = (monthYear || \'\').split(\'-\');' + CRLF +
  '  const periodeStr = batchType === \'mid_month\' ? \'1-15 \' + (BULAN_ID[parseInt(_my[1], 10) - 1] || \'\') + \' \' + _my[0] : \'16-31 \' + (BULAN_ID[parseInt(_my[1], 10) - 1] || \'\') + \' \' + _my[0];' + CRLF +
  '  const wb = XLSX.utils.book_new();',

  'export: units SELECT + periodeStr'
);

// 2. unitSheetData for kapal rows
replaceExact(
  '        const row = [p.project_code, p.end_date, p.nama_kapal || \'\', p.kade || \'\', unitCode, u.hm_awal, u.hm_akhir, hmK, blTotal, pct, rate, total];' + CRLF +
  '        rekapRows.push(row);' + CRLF +
  '        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = [];' + CRLF +
  '        unitSheetData[unitCode].push(row);',

  '        const row = [p.project_code, p.end_date, p.nama_kapal || \'\', p.kade || \'\', unitCode, u.hm_awal, u.hm_akhir, hmK, blTotal, pct, rate, total];' + CRLF +
  '        rekapRows.push(row);' + CRLF +
  '        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = { opName: opName, rows: [], blTons: [] };' + CRLF +
  '        unitSheetData[unitCode].rows.push(row);' + CRLF +
  '        unitSheetData[unitCode].blTons.push(p.total_mt_m3 || 0);',

  'unitSheetData: restructure for kapal rows'
);

// 3. unitSheetData for STK rows
replaceExact(
  '        const row = [p.project_code, p.end_date, p.project_code, \'---\', unitCode, u.hm_awal, u.hm_akhir, hmK, blStk, \'STK\', 35000, total];' + CRLF +
  '        rekapRows.push(row);' + CRLF +
  '        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = [];' + CRLF +
  '        unitSheetData[unitCode].push(row);',

  '        const row = [p.project_code, p.end_date, p.project_code, \'---\', unitCode, u.hm_awal, u.hm_akhir, hmK, blStk, \'STK\', 35000, total];' + CRLF +
  '        rekapRows.push(row);' + CRLF +
  '        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = { opName: opName, rows: [], blTons: [] };' + CRLF +
  '        unitSheetData[unitCode].rows.push(row);' + CRLF +
  '        unitSheetData[unitCode].blTons.push(\'—\');',

  'unitSheetData: restructure for STK rows'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
