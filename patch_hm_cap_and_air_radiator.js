// patch_hm_cap_and_air_radiator.js
//   1. HM submission cap: 24 -> 100 (absolute delta since last update)
//   2. Update Indonesian message: "maks 24 jam/hari" -> "maks 100 HM sejak update terakhir"
//   3. Add 'Air Radiator' to COMMON_MAINTENANCE_TYPES fallback datalist

const fs = require('fs');
const path = 'index.html';
let src = fs.readFileSync(path, 'utf8');

// PATCH 1: replace all `delta > 24` with `delta > 100`
const beforeDelta = (src.match(/delta > 24\b/g) || []).length;
src = src.replace(/delta > 24\b/g, 'delta > 100');
const afterDelta = (src.match(/delta > 100\b/g) || []).length - (src.match(/delta > 1000\b/g) || []).length;
console.log('OK: replaced ' + beforeDelta + ' occurrences of "delta > 24" -> "delta > 100"');
if (beforeDelta !== 4) { console.error('EXPECTED 4 matches, got ' + beforeDelta); process.exit(1); }

// PATCH 2: replace message wording
const beforeMsg = (src.match(/maks 24 jam\/hari/g) || []).length;
src = src.replace(/maks 24 jam\/hari/g, 'maks 100 HM sejak update terakhir');
console.log('OK: replaced ' + beforeMsg + ' occurrences of "maks 24 jam/hari"');
if (beforeMsg !== 2) { console.error('EXPECTED 2 matches, got ' + beforeMsg); process.exit(1); }

// PATCH 3: add 'Air Radiator' at start of COMMON_MAINTENANCE_TYPES array
const oldArr = "const COMMON_MAINTENANCE_TYPES = ['Filter Hidrolik','Filter Oli Mesin','Filter Solar','Filter Udara','Greasing','Oli Final Drive','Oli Hidrolik','Oli Mesin','Oli Swing','Racor'];";
const newArr = "const COMMON_MAINTENANCE_TYPES = ['Air Radiator','Filter Hidrolik','Filter Oli Mesin','Filter Solar','Filter Udara','Greasing','Oli Final Drive','Oli Hidrolik','Oli Mesin','Oli Swing','Racor'];";
const arrCount = src.split(oldArr).length - 1;
if (arrCount !== 1) { console.error('COMMON_MAINTENANCE_TYPES: expected 1 match, got ' + arrCount); process.exit(1); }
src = src.replace(oldArr, newArr);
console.log('OK: added Air Radiator to COMMON_MAINTENANCE_TYPES');

fs.writeFileSync(path, src);
console.log('Done.');
