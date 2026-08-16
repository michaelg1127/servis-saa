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
const EM = '—'; // em-dash

// Replace calcKapalTonnageSplit: remove outlier/de-minimis rules, use equal share always.
// Matches the PDF model (item 1 of the spec).
// Section uses LF endings (confirmed via JSON.stringify dump).
replaceExact(
  'function calcKapalTonnageSplit(units, totalMt) {' + LF +
  '  const withHM = units.map(function(u) {' + LF +
  '    return Object.assign({}, u, { hm: u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0 });' + LF +
  '  });' + LF +
  '  // Rule 1: de minimis ' + EM + ' use pre-exclusion total as threshold denominator' + LF +
  '  const totalHMAll = withHM.reduce(function(s, u) { return s + u.hm; }, 0);' + LF +
  '  const threshold = totalHMAll * 0.05;' + LF +
  '  const tagged = withHM.map(function(u) {' + LF +
  '    return Object.assign({}, u, { excluded: u.hm < threshold });' + LF +
  '  });' + LF +
  '  // Included units only' + LF +
  '  const included = tagged.filter(function(u) { return !u.excluded; });' + LF +
  '  const totalHMIncluded = included.reduce(function(s, u) { return s + u.hm; }, 0);' + LF +
  '  // Rule 2: median among included, then outlier = >30% deviation' + LF +
  '  const incHMs = included.map(function(u) { return u.hm; });' + LF +
  '  const median = calcMedianHM(incHMs.length > 0 ? incHMs : [0]);' + LF +
  '  const outlierAllocTotal = included.reduce(function(s, u) {' + LF +
  '    const isOut = median > 0 && Math.abs(u.hm - median) / median > 0.30;' + LF +
  '    return s + (isOut && totalHMIncluded > 0 ? totalMt * u.hm / totalHMIncluded : 0);' + LF +
  '  }, 0);' + LF +
  '  const nonOutliers = included.filter(function(u) {' + LF +
  '    return !(median > 0 && Math.abs(u.hm - median) / median > 0.30);' + LF +
  '  });' + LF +
  '  const remainingMt = totalMt - outlierAllocTotal;' + LF +
  '  const equalShare = nonOutliers.length > 0 ? remainingMt / nonOutliers.length : 0;' + LF +
  '  return tagged.map(function(u) {' + LF +
  '    if (u.excluded) return Object.assign({}, u, { allocatedMt: 0, isExcluded: true, isOutlier: false });' + LF +
  '    const isOut = median > 0 && Math.abs(u.hm - median) / median > 0.30;' + LF +
  '    const allocatedMt = isOut && totalHMIncluded > 0' + LF +
  '      ? totalMt * u.hm / totalHMIncluded' + LF +
  '      : equalShare;' + LF +
  '    return Object.assign({}, u, { allocatedMt: allocatedMt, isExcluded: false, isOutlier: isOut });' + LF +
  '  });' + LF +
  '}',

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

  'calcKapalTonnageSplit: equal share always, no outlier/de-minimis rule (matches PDF model)'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
