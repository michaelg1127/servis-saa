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

// T17-1: loadHMMissing — only consider units that have an operator_name.
//         Units without an operator (MESIN LAS, Tangki Kuning, Tangki Merah,
//         J02/J03/J45-J48, etc.) have no one responsible for daily HM submission
//         so they should never appear in the "belum update HM" list.
replaceExact(
  "    sb.from('units').select('id, code, operator_name').order('code'),",
  "    sb.from('units').select('id, code, operator_name').not('operator_name', 'is', null).order('code'),",
  'T17-1: loadHMMissing: exclude units with no operator_name'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T17 patches applied. Running syntax check...');
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
