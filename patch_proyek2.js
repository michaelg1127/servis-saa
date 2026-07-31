const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

// 1. Add global state vars after bbmLastDispenseByUnit line
replaceExact(
  'let bbmLastDispenseByUnit = {};',
  `let bbmLastDispenseByUnit = {};\r\nlet proyekTab = 'kapal';\r\nlet proyekKapalData = [];\r\nlet proyekStockpileData = [];\r\nlet proyekMonthFilter = new Date().toISOString().slice(0,7);\r\nlet proyekHMUnitId = null;\r\nlet proyekAnalisisFilter = 'semua';`,
  'add proyek global state vars'
);

// 2. Add calculation helpers before the PROYEK MODULE comment
replaceExact(
  '// ============================================================\r\n// PROYEK MODULE\r\n// ============================================================',
  `// ============================================================\r\n// PROYEK CALC HELPERS\r\n// ============================================================\r\nfunction calcKapalRate(shipNum) {\r\n  if (shipNum <= 15) return 175;\r\n  if (shipNum <= 30) return 200;\r\n  return 225;\r\n}\r\n\r\nfunction calcSolarConsumed(awalPct, akhirPct, isiLiters) {\r\n  return ((awalPct - akhirPct) / 100) * 320 + (isiLiters || 0);\r\n}\r\n\r\nfunction calcMedianHM(hmArray) {\r\n  const sorted = [...hmArray].sort((a, b) => a - b);\r\n  const mid = Math.floor(sorted.length / 2);\r\n  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;\r\n}\r\n\r\nfunction calcKapalTonnageSplit(units, totalMt) {\r\n  const withHM = units.map(u => ({ ...u, hm: (u.hm_akhir - u.hm_awal) }));\r\n  const hmArr = withHM.map(u => u.hm);\r\n  const median = calcMedianHM(hmArr);\r\n  const totalHM = hmArr.reduce((s, h) => s + h, 0);\r\n  const allWithin = median > 0 && withHM.every(u => Math.abs(u.hm - median) / median <= 0.25);\r\n  return withHM.map(u => ({\r\n    ...u,\r\n    allocatedMt: allWithin\r\n      ? totalMt / units.length\r\n      : (totalHM > 0 ? totalMt * (u.hm / totalHM) : 0)\r\n  }));\r\n}\r\n\r\nasync function getNextKapalShipNum(monthYear) {\r\n  const { count } = await sb.from('projects')\r\n    .select('id', { count: 'exact', head: true })\r\n    .eq('type', 'kapal')\r\n    .eq('month_year', monthYear);\r\n  return (count || 0) + 1;\r\n}\r\n\r\nfunction formatKapalCode(monthYear, shipNum) {\r\n  const mm = monthYear.slice(5, 7);\r\n  return 'M' + mm + '-' + String(shipNum).padStart(3, '0');\r\n}\r\n\r\nfunction formatStockpileCode(prefix, seq) {\r\n  return prefix.toUpperCase().trim() + '-' + String(seq).padStart(3, '0');\r\n}\r\n\r\nfunction fmtRp(n) {\r\n  if (n == null || isNaN(n)) return 'Rp 0';\r\n  return 'Rp ' + Math.round(n).toLocaleString('id-ID');\r\n}\r\n\r\nasync function checkHMContinuity(unitId, hmAwal) {\r\n  const { data } = await sb.from('project_units')\r\n    .select('hm_akhir, project_id')\r\n    .eq('unit_id', unitId)\r\n    .lt('hm_akhir', hmAwal)\r\n    .order('hm_akhir', { ascending: false })\r\n    .limit(1);\r\n  if (!data || data.length === 0) return { hasGap: false };\r\n  const prevHmAkhir = data[0].hm_akhir;\r\n  const gap = hmAwal - prevHmAkhir;\r\n  if (gap <= 0) return { hasGap: false };\r\n  return { hasGap: true, gapSize: gap, prevHmAkhir };\r\n}\r\n\r\n// ============================================================\r\n// PROYEK MODULE\r\n// ============================================================`,
  'add proyek calc helpers'
);

fs.writeFileSync(filePath, html, 'utf8');
console.log('patch_proyek2.js: ' + changes + ' changes applied.');
