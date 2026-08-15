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

// 1. Add _wlKapalFillMap global alongside _wlKapalCache
replaceExact(
  'let _wlKapalCache = {};\r\nlet _wlHourlyCache = {};',
  'let _wlKapalCache = {};\r\nlet _wlKapalFillMap = {};\r\nlet _wlHourlyCache = {};',
  'add _wlKapalFillMap global'
);

// 2. Replace loadWoodlogKapal to also fetch fuel_dispenses
replaceExact(
  '    const ids = (projects || []).map(p => p.id);\r\n    let salaryMap = {};\r\n    if (ids.length > 0) {\r\n      const { data: sals } = await sb.from(\'woodlog_operator_salary\').select(\'*\').in(\'project_id\', ids);\r\n      (sals || []).forEach(s => { if (!salaryMap[s.project_id]) salaryMap[s.project_id] = []; salaryMap[s.project_id].push(s); });\r\n    }\r\n    projects.forEach(p => { _wlKapalCache[p.id] = p; });\r\n    renderWoodlogKapalList(projects || [], salaryMap);',
  '    const ids = (projects || []).map(p => p.id);\r\n    let salaryMap = {};\r\n    if (ids.length > 0) {\r\n      const [salRes, fillRes] = await Promise.all([\r\n        sb.from(\'woodlog_operator_salary\').select(\'*\').in(\'project_id\', ids),\r\n        fetchFillMap(ids)\r\n      ]);\r\n      (salRes.data || []).forEach(s => { if (!salaryMap[s.project_id]) salaryMap[s.project_id] = []; salaryMap[s.project_id].push(s); });\r\n      _wlKapalFillMap = fillRes;\r\n    } else {\r\n      _wlKapalFillMap = {};\r\n    }\r\n    projects.forEach(p => { _wlKapalCache[p.id] = p; });\r\n    renderWoodlogKapalList(projects || [], salaryMap);',
  'loadWoodlogKapal: add fuel_dispenses fetch via fetchFillMap'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
