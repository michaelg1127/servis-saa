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

// WL9-1: loadProyekAnalisis — add sort by project_code asc (within same month)
replaceExact(
  "      .eq('type', 'kapal')" + R +
  "      .eq('month_year', proyekMonthFilter);",

  "      .eq('type', 'kapal')" + R +
  "      .eq('month_year', proyekMonthFilter)" + R +
  "      .order('project_code', { ascending: true });",

  'WL9-1: loadProyekAnalisis sort by project_code asc'
);

// WL9-2: loadWoodlogAnalisis — change sort from end_date to project_code desc
replaceExact(
  "      .eq('type', 'woodlog_kapal').not('end_date', 'is', null)" + R +
  "      .order('end_date', { ascending: false });",

  "      .eq('type', 'woodlog_kapal').not('end_date', 'is', null)" + R +
  "      .order('project_code', { ascending: false });",

  'WL9-2: loadWoodlogAnalisis sort by project_code desc'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL9 patches applied. Running syntax check...');
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
