const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');

// Read file with CRLF preservation
const content = fs.readFileSync(filePath, 'utf-8');

// Detect line endings
const hasCRLF = content.includes('\r\n');
const EOL = hasCRLF ? '\r\n' : '\n';

const find = `  // TRANSFER sheet${EOL}  const gajiPokok = batchType === 'end_of_month' ? 3100000 : 0;${EOL}  const transferRows = [['No','Nama OP','Unit','Total Kerja','Gaji Pokok','Grand Total','Bank','No. Rekening']];${EOL}  let no = 1;${EOL}  let transferGrand = 0;${EOL}  Object.keys(opTotals).sort().forEach(function(name) {${EOL}    const s = opTotals[name];${EOL}    const kasbon = kasbonMap[name] || 0;${EOL}    const grand = s.total + gajiPokok - kasbon;${EOL}    const bInfo = bankMap[s.unitCode] || {};${EOL}    transferRows.push([no++, name, s.unitCode, s.total, gajiPokok, grand, bInfo.bank_name || '---', bInfo.bank_account_number || '---']);${EOL}    transferGrand += grand;${EOL}  });${EOL}  transferRows.push(['', 'TOTAL', '', '', '', transferGrand, '', '']);${EOL}  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transferRows), 'TRANSFER');`;

const replace = `  // TRANSFER sheet${EOL}  const gajiPokok = batchType === 'end_of_month' ? 3100000 : 0;${EOL}  const transferRows = [['No','Nama OP','Unit','Total Kerja','Gaji Pokok','Grand Total','Admin Fee','Net Transfer','Bank','No. Rekening','Nama Rekening']];${EOL}  let no = 1;${EOL}  let trTotKerja = 0, trTotPokok = 0, trTotGrand = 0, trTotFee = 0, trTotNet = 0;${EOL}  Object.keys(opTotals).sort().forEach(function(name) {${EOL}    const s = opTotals[name];${EOL}    const kasbon = kasbonMap[name] || 0;${EOL}    const grand = s.total + gajiPokok - kasbon;${EOL}    const bInfo = bankMap[s.unitCode] || {};${EOL}    const isBCA = (bInfo.bank_name || '').toUpperCase().includes('BCA');${EOL}    const adminFee = isBCA ? 0 : 2500;${EOL}    const netTransfer = grand - adminFee;${EOL}    transferRows.push([no++, name, s.unitCode, s.total, gajiPokok, grand, adminFee, netTransfer, bInfo.bank_name || '---', bInfo.bank_account_number || '---', bInfo.bank_account_name || '---']);${EOL}    trTotKerja += s.total; trTotPokok += gajiPokok; trTotGrand += grand; trTotFee += adminFee; trTotNet += netTransfer;${EOL}  });${EOL}  transferRows.push(['', 'TOTAL', '', trTotKerja, trTotPokok, trTotGrand, trTotFee, trTotNet, '', '', '']);${EOL}  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transferRows), 'TRANSFER');`;

// Check if find string exists exactly once
const count = (content.split(find).length - 1);

if (count === 0) {
  console.error('MISS: String not found in file');
  process.exit(1);
}
if (count > 1) {
  console.error('AMBIGUOUS: String found ' + count + ' times');
  process.exit(1);
}

// Perform replacement
const newContent = content.replace(find, replace);

// Write file back with same line endings
fs.writeFileSync(filePath, newContent, 'utf-8');

console.log('OK: 1 TRANSFER sheet replacement made with ' + (hasCRLF ? 'CRLF' : 'LF') + ' line endings');
console.log('Done. 1 replacements made.');
