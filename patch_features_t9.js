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

// T9-1: loadBBMProjectsForUnit — remove end_date filter, order by created_at desc
// so newly created projects always appear at the top regardless of status
replaceExact(
  "  const { data } = await sb.from('projects')" + R +
  "    .select('id, project_code, nama_kapal, type')" + R +
  "    .is('end_date', null)" + R +
  "    .order('start_date', { ascending: false })" + R +
  "    .limit(100);",

  "  const { data } = await sb.from('projects')" + R +
  "    .select('id, project_code, nama_kapal, type, end_date')" + R +
  "    .order('created_at', { ascending: false })" + R +
  "    .limit(100);",

  'T9-1: loadBBMProjectsForUnit: remove end_date filter, newest first'
);

// T9-2: add [Selesai] label for closed projects so user can tell them apart
replaceExact(
  "    opt.textContent = p.project_code + (p.nama_kapal ? ' – ' + p.nama_kapal : '') + (p.type === 'stockpile' ? ' [STK]' : '');",
  "    opt.textContent = p.project_code + (p.nama_kapal ? ' – ' + p.nama_kapal : '') + (p.type === 'stockpile' ? ' [STK]' : '') + (p.end_date ? ' ✓' : '');",
  'T9-2: loadBBMProjectsForUnit: mark closed projects with checkmark'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T9 patches applied. Running syntax check...');
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
