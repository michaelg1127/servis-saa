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

const LF = '\n';

// Replace the patch_sal4 equal-share-only version with the correct formula:
//   1. De-minimis exclusion: units with HM < 5% of total ship HM get 0 allocation
//   2. Compute median HM among included units
//   3. If any included unit has HM > median * 1.3 (high outlier) → fully proportional
//   4. Else → equal share
// This matches the PDF model exactly for all 21 ships.
replaceExact(
  'function calcKapalTonnageSplit(units, totalMt) {' + LF +
  '  const withHM = units.map(function(u) {' + LF +
  '    return Object.assign({}, u, { hm: u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0 });' + LF +
  '  });' + LF +
  '  const count = withHM.length;' + LF +
  '  const share = count > 0 ? totalMt / count : 0;' + LF +
  '  return withHM.map(function(u) {' + LF +
  '    return Object.assign({}, u, { allocatedMt: share, isExcluded: false, isOutlier: false });' + LF +
  '  });' + LF +
  '}',

  'function calcKapalTonnageSplit(units, totalMt) {' + LF +
  '  const withHM = units.map(function(u) {' + LF +
  '    return Object.assign({}, u, { hm: u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0 });' + LF +
  '  });' + LF +
  '  const totalHMAll = withHM.reduce(function(s, u) { return s + u.hm; }, 0);' + LF +
  '  const threshold = totalHMAll * 0.05;' + LF +
  '  const tagged = withHM.map(function(u) {' + LF +
  '    return Object.assign({}, u, { excluded: u.hm < threshold });' + LF +
  '  });' + LF +
  '  const included = tagged.filter(function(u) { return !u.excluded; });' + LF +
  '  const totalHMIncluded = included.reduce(function(s, u) { return s + u.hm; }, 0);' + LF +
  '  const incHMs = included.map(function(u) { return u.hm; });' + LF +
  '  const sortedHMs = incHMs.slice().sort(function(a, b) { return a - b; });' + LF +
  '  const mid = Math.floor(sortedHMs.length / 2);' + LF +
  '  const median = sortedHMs.length % 2 !== 0 ? sortedHMs[mid] : (sortedHMs[mid - 1] + sortedHMs[mid]) / 2;' + LF +
  '  const hasHighOutlier = included.some(function(u) { return median > 0 && u.hm > median * 1.3; });' + LF +
  '  const count = included.length;' + LF +
  '  return tagged.map(function(u) {' + LF +
  '    if (u.excluded) return Object.assign({}, u, { allocatedMt: 0, isExcluded: true, isOutlier: false });' + LF +
  '    var allocatedMt = hasHighOutlier' + LF +
  '      ? (totalHMIncluded > 0 ? totalMt * u.hm / totalHMIncluded : 0)' + LF +
  '      : (count > 0 ? totalMt / count : 0);' + LF +
  '    return Object.assign({}, u, { allocatedMt: allocatedMt, isExcluded: false, isOutlier: false });' + LF +
  '  });' + LF +
  '}',

  'calcKapalTonnageSplit: de-minimis 5% + high-outlier check (>30% above median) → proportional, else equal share'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
