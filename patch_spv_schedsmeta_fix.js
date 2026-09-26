// patch_spv_schedsmeta_fix.js — fix ReferenceError: schedsWithMeta is not defined
//   In loadSPVUnitList, schedsWithMeta was referenced in a second map() scope
//   after being declared in the first. Attach it to the unit object.

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

// 1) In the first .map(u => {...}), include schedsWithMeta in the returned object
replaceExact(
  "      return { ...u, worst, alertItems, okCount };\r\n",
  "      return { ...u, worst, alertItems, okCount, schedsWithMeta };\r\n",
  'attach schedsWithMeta to enriched unit object'
);

// 2) In the second .map(u => {...}), read from the attached property
replaceExact(
  "      const _spvAllMapped = schedsWithMeta.map(function(s) { return Object.assign({}, s, { unit_id: u.id, unit_code: u.code, current_hm: u.current_hm || 0 }); });\r\n",
  "      const _spvAllMapped = (u.schedsWithMeta || []).map(function(s) { return Object.assign({}, s, { unit_id: u.id, unit_code: u.code, current_hm: u.current_hm || 0 }); });\r\n",
  'read schedsWithMeta from unit prop'
);

fs.writeFileSync(path, src);
console.log('Done.');
