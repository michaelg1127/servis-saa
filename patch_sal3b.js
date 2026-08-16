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

const LF = '\n';

// exportBatchExcel uses `pUnits` (not `p.project_units || []`) in the split call,
// making this 2-line block unique to exportBatchExcel vs exportProyekExcel.
// The section was inserted by patch_sal3.js which used LF (template literal), so match LF here.
// Fix: add isCarryover check so rate = 175 for carryover ships, matching buildOpMap.
replaceExact(
  "      const rate = calcKapalRate(p.ship_number_in_month || 1);" + LF +
  "      const split = calcKapalTonnageSplit(pUnits, p.total_mt_m3 || 0);",

  "      const isCarryoverP = p.month_year && p.end_date && p.month_year.slice(0, 7) !== p.end_date.slice(0, 7);" + LF +
  "      const rate = isCarryoverP ? 175 : calcKapalRate(p.ship_number_in_month || 1);" + LF +
  "      const split = calcKapalTonnageSplit(pUnits, p.total_mt_m3 || 0);",

  'exportBatchExcel: apply isCarryover rate override (175) like buildOpMap'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
