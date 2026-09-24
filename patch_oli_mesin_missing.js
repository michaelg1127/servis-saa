// patch_oli_mesin_missing.js
// Add the missing MAINTENANCE_BUNDLES constant, _detectOliMesinSet function,
// and state variable declarations that were skipped in the first failed run.

const fs = require('fs');
const path = 'index.html';
let src = fs.readFileSync(path, 'utf8');

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

// ============================================================
// PATCH M1: Add MAINTENANCE_BUNDLES + _detectOliMesinSet after COMMON_MAINTENANCE_TYPES
// ============================================================
replaceExact(
  "const COMMON_MAINTENANCE_TYPES = ['Air Radiator','Filter Hidrolik','Filter Oli Mesin','Filter Solar','Filter Udara','Greasing','Oli Final Drive','Oli Hidrolik','Oli Mesin','Oli Swing','Racor'];\r\n" +
  "\r\n" +
  "async function loadSPVCatatTypes(unitId) {\r\n",

  "const COMMON_MAINTENANCE_TYPES = ['Air Radiator','Filter Hidrolik','Filter Oli Mesin','Filter Solar','Filter Udara','Greasing','Oli Final Drive','Oli Hidrolik','Oli Mesin','Oli Swing','Racor'];\r\n" +
  "\r\n" +
  "const MAINTENANCE_BUNDLES = {\r\n" +
  "  'Oli Mesin Set': {\r\n" +
  "    members: ['Racor', 'Filter Oli Mesin', 'Filter Solar', 'Oli Mesin'],\r\n" +
  "    interval_hm: 500,\r\n" +
  "    min_overdue_to_collapse: 3\r\n" +
  "  }\r\n" +
  "};\r\n" +
  "\r\n" +
  "// Given an array of overdue items belonging to a single unit plus all schedules for\r\n" +
  "// that unit, returns { bundleItem, remainingItems }.\r\n" +
  "// bundleItem is non-null only when >= 3 of 4 Oli Mesin Set members are overdue.\r\n" +
  "function _detectOliMesinSet(unitOverdueItems, allSchedsForUnit) {\r\n" +
  "  const bundle = MAINTENANCE_BUNDLES['Oli Mesin Set'];\r\n" +
  "  const overdueMemberNames = bundle.members.filter(function(m) {\r\n" +
  "    return unitOverdueItems.some(function(it) { return it.type_name === m; });\r\n" +
  "  });\r\n" +
  "  if (overdueMemberNames.length < bundle.min_overdue_to_collapse) {\r\n" +
  "    return { bundleItem: null, remainingItems: unitOverdueItems.slice() };\r\n" +
  "  }\r\n" +
  "  var membersArr = bundle.members.map(function(m) {\r\n" +
  "    var overdueRow = unitOverdueItems.find(function(it) { return it.type_name === m; });\r\n" +
  "    if (overdueRow) {\r\n" +
  "      return { type_name: m, remaining: overdueRow.remaining, last_hm: overdueRow.last_hm, current_hm: overdueRow.current_hm, status: overdueRow.status };\r\n" +
  "    }\r\n" +
  "    var schedRow = (allSchedsForUnit || []).find(function(s) { return s.type_name === m; });\r\n" +
  "    return { type_name: m, remaining: schedRow ? schedRow.remaining : null, last_hm: schedRow ? schedRow.last_hm : null, current_hm: schedRow ? schedRow.current_hm : null, status: schedRow ? schedRow.status : 'OK' };\r\n" +
  "  });\r\n" +
  "  var overdueMembers = membersArr.filter(function(m) { return m.status === 'OVERDUE'; });\r\n" +
  "  var worstLastHm = overdueMembers.reduce(function(mn, m) { return (m.last_hm != null && (mn == null || m.last_hm < mn)) ? m.last_hm : mn; }, null);\r\n" +
  "  var worstRemaining = overdueMembers.reduce(function(mn, m) { return (m.remaining != null && (mn == null || m.remaining < mn)) ? m.remaining : mn; }, null);\r\n" +
  "  var firstItem = unitOverdueItems[0] || {};\r\n" +
  "  var bundleItem = {\r\n" +
  "    is_bundle: true,\r\n" +
  "    bundle_name: 'Oli Mesin Set',\r\n" +
  "    unit_id: firstItem.unit_id,\r\n" +
  "    unit_code: firstItem.unit_code,\r\n" +
  "    members: membersArr,\r\n" +
  "    member_count: overdueMembers.length,\r\n" +
  "    worst_last_hm: worstLastHm,\r\n" +
  "    worst_remaining: worstRemaining,\r\n" +
  "    current_hm: firstItem.current_hm || 0,\r\n" +
  "    interval_hm: bundle.interval_hm\r\n" +
  "  };\r\n" +
  "  var memberNameSet = new Set(bundle.members);\r\n" +
  "  var remainingItems = unitOverdueItems.filter(function(it) { return !memberNameSet.has(it.type_name); });\r\n" +
  "  return { bundleItem: bundleItem, remainingItems: remainingItems };\r\n" +
  "}\r\n" +
  "\r\n" +
  "async function loadSPVCatatTypes(unitId) {\r\n",
  'add MAINTENANCE_BUNDLES + _detectOliMesinSet'
);

// ============================================================
// PATCH M2: Add jadwalkanChecked + jadwalkanAllRows state variables
// ============================================================
replaceExact(
  "let mknAlertSort = 'hm';\r\n",
  "let mknAlertSort = 'hm';\r\n" +
  "let jadwalkanChecked = new Set();\r\n" +
  "let jadwalkanAllRows = [];\r\n",
  'add jadwalkanChecked + jadwalkanAllRows state vars'
);

fs.writeFileSync(path, src);
console.log('Done.');
