const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// T3-1: Add project data cache vars after proyekMonthFilter declaration
replaceExact(
  "let proyekMonthFilter = new Date().toISOString().slice(0,7);",
  "let proyekMonthFilter = new Date().toISOString().slice(0,7);" + R +
  "let _proyekKapalCache = {};" + R +
  "let _proyekStockpileCache = {};",
  'T3-1: add project data cache vars'
);

// T3-2: Add fetchFillMap helper immediately before loadProyekKapal
replaceExact(
  "async function loadProyekKapal() {",
  "async function fetchFillMap(projectIds) {" + R +
  "  if (!projectIds || projectIds.length === 0) return {};" + R +
  "  const { data } = await sb.from('fuel_dispenses')" + R +
  "    .select('project_id, unit_id, liters_dispensed')" + R +
  "    .in('project_id', projectIds);" + R +
  "  const map = {};" + R +
  "  (data || []).forEach(function(d) {" + R +
  "    if (!d.project_id) return;" + R +
  "    if (!map[d.project_id]) map[d.project_id] = {};" + R +
  "    map[d.project_id][d.unit_id] = (map[d.project_id][d.unit_id] || 0) + (d.liters_dispensed || 0);" + R +
  "  });" + R +
  "  return map;" + R +
  "}" + R + R +
  "async function loadProyekKapal() {",
  'T3-2: add fetchFillMap helper'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T3 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
