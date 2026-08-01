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

// T7b-1: initPengisianForm — pre-load project dropdown on tab open
replaceExact(
  "  const bprev = document.getElementById('bbm-peng-bunker-preview');" + R +
  "  if (bprev) bprev.style.display = 'none';" + R +
  "}",

  "  const bprev = document.getElementById('bbm-peng-bunker-preview');" + R +
  "  if (bprev) bprev.style.display = 'none';" + R +
  "  loadBBMProjectsForUnit('');" + R +
  "}",

  'T7b-1: initPengisianForm: pre-load project dropdown on tab open'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T7b patches applied. Running syntax check...');
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
