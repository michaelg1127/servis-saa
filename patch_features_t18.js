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

// T18-1: loadHMMissing — revert operator_name filter (T17), instead hardcode
//         an exclusion set of specific unit codes that should never appear in
//         the "belum update HM" list.
replaceExact(
  "    sb.from('units').select('id, code, operator_name').not('operator_name', 'is', null).order('code')," + R +
  "    sb.from('hm_updates').select('unit_id').gte('recorded_at', cutoffISO + 'T00:00:00')," + R +
  "  ]);" + R +
  "  if (!units) return [];" + R +
  "  const submittedIds = new Set((hmRecent || []).map(h => h.unit_id));" + R +
  "  return units.filter(u => !submittedIds.has(u.id));",

  "    sb.from('units').select('id, code, operator_name').order('code')," + R +
  "    sb.from('hm_updates').select('unit_id').gte('recorded_at', cutoffISO + 'T00:00:00')," + R +
  "  ]);" + R +
  "  if (!units) return [];" + R +
  "  const EXCLUDE_HM = new Set(['J02', 'J03', 'J45', 'J46', 'J47', 'J48', 'MESIN LAS', 'Tangki Kuning', 'Tangki Merah']);" + R +
  "  const submittedIds = new Set((hmRecent || []).map(h => h.unit_id));" + R +
  "  return units.filter(u => !submittedIds.has(u.id) && !EXCLUDE_HM.has(u.code));",

  'T18-1: loadHMMissing: hardcode exclusion list instead of operator_name filter'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T18 patches applied. Running syntax check...');
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
