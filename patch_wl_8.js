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

// WL8-1: loadProyekKapal — sort by project_code desc
replaceExact(
  "      .eq('type', 'kapal')" + R +
  "      .order('created_at', { ascending: false });",

  "      .eq('type', 'kapal')" + R +
  "      .order('project_code', { ascending: false });",

  'WL8-1: loadProyekKapal sort by project_code desc'
);

// WL8-2: loadProyekStockpile — sort by project_code desc
replaceExact(
  "      .eq('type', 'stockpile')" + R +
  "      .order('created_at', { ascending: false });",

  "      .eq('type', 'stockpile')" + R +
  "      .order('project_code', { ascending: false });",

  'WL8-2: loadProyekStockpile sort by project_code desc'
);

// WL8-3: loadWoodlogKapal — sort by project_code desc
replaceExact(
  "      .eq('type', 'woodlog_kapal').order('start_date', { ascending: false });",
  "      .eq('type', 'woodlog_kapal').order('project_code', { ascending: false });",
  'WL8-3: loadWoodlogKapal sort by project_code desc'
);

// WL8-4: loadWoodlogHourly — sort by project_code desc
replaceExact(
  "      .eq('type', 'woodlog_hourly').order('start_date', { ascending: false });",
  "      .eq('type', 'woodlog_hourly').order('project_code', { ascending: false });",
  'WL8-4: loadWoodlogHourly sort by project_code desc'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL8 patches applied. Running syntax check...');
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
