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

// PS1-1: Rewrite loadProyekRingkasan — pivot query to end_date range + parallel fetch
replaceExact(
  "async function loadProyekRingkasan() {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  panel.innerHTML = '<div style=\"color:#64748B;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code, name, operator_name))')" + R +
  "      .eq('month_year', proyekMonthFilter);" + R +
  "    if (error) throw error;" + R +
  "    renderProyekRingkasan(data || []);" + R +
  "  } catch(e) { panel.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  "async function loadProyekRingkasan() {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  panel.innerHTML = '<div style=\"color:#64748B;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const monthYear = proyekMonthFilter;" + R +
  "    const y = parseInt(monthYear.slice(0, 4), 10);" + R +
  "    const m = parseInt(monthYear.slice(5, 7), 10);" + R +
  "    const firstDay = monthYear + '-01';" + R +
  "    const tmpDate = new Date(y, m, 0);" + R +
  "    const lastDay = tmpDate.getFullYear() + '-' + String(tmpDate.getMonth() + 1).padStart(2, '0') + '-' + String(tmpDate.getDate()).padStart(2, '0');" + R +
  "    const [projRes, unitRes, kasbonRes] = await Promise.all([" + R +
  "      sb.from('projects')" + R +
  "        .select('*, project_units(*, units(code, name, operator_name))')" + R +
  "        .in('type', ['kapal', 'stockpile'])" + R +
  "        .gte('end_date', firstDay)" + R +
  "        .lte('end_date', lastDay)," + R +
  "      sb.from('units').select('code, operator_name')," + R +
  "      sb.from('proyek_kasbon').select('*').eq('month_year', monthYear)" + R +
  "    ]);" + R +
  "    if (projRes.error) throw projRes.error;" + R +
  "    renderProyekRingkasan(projRes.data || [], unitRes.data || [], kasbonRes.data || [], monthYear);" + R +
  "  } catch(e) { panel.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  'PS1-1: rewrite loadProyekRingkasan with end_date range query'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll PS-1 patches applied. Running syntax check...');
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
