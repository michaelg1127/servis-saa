const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let src = fs.readFileSync(file, 'utf8');
const original = src;

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1)   { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

// 1. Replace yieldHM calculation with ratio (BL Tonnage / BBM Used)
replaceExact(
  "    const yieldHM = totalHM > 0 ? profit / totalHM : 0;",
  "    const ratio = totalBBM > 0 ? Number(p.total_mt_m3 || 0) / totalBBM : 0;",
  'Replace yieldHM with ratio formula'
);

// 2. Replace the sub-line display value in the Profit cell
replaceExact(
  "' + Math.round(yieldHM).toLocaleString('id') + '/HM</span></td>' +",
  "' + ratio.toFixed(2) + 'X</span></td>' +",
  'Replace yield display with ratio display'
);

// 3. Rename column header Profit / Yield -> Profit / Ratio
replaceExact(
  "Profit / Yield",
  "Profit / Ratio",
  'Rename column header'
);

if (src === original) { console.error('No changes made!'); process.exit(1); }
fs.writeFileSync(file, src, 'utf8');
console.log('\nDone. Run: node --check index.html');
