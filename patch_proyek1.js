const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

// ── calcKapalTonnageSplit ────────────────────────────────────────────────────
// Old: allWithin-25% → equal, else fully proportional.
// New: Rule 1 (de minimis <5% totalHM → excluded), Rule 2 (outliers >30% from
//      median among included → proportional; non-outliers split remainder equally).
replaceFn('calcKapalTonnageSplit', false, `function calcKapalTonnageSplit(units, totalMt) {
  const withHM = units.map(function(u) {
    return Object.assign({}, u, { hm: u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0 });
  });
  // Rule 1: de minimis — use pre-exclusion total as threshold denominator
  const totalHMAll = withHM.reduce(function(s, u) { return s + u.hm; }, 0);
  const threshold = totalHMAll * 0.05;
  const tagged = withHM.map(function(u) {
    return Object.assign({}, u, { excluded: u.hm < threshold });
  });
  // Included units only
  const included = tagged.filter(function(u) { return !u.excluded; });
  const totalHMIncluded = included.reduce(function(s, u) { return s + u.hm; }, 0);
  // Rule 2: median among included, then outlier = >30% deviation
  const incHMs = included.map(function(u) { return u.hm; });
  const median = calcMedianHM(incHMs.length > 0 ? incHMs : [0]);
  const outlierAllocTotal = included.reduce(function(s, u) {
    const isOut = median > 0 && Math.abs(u.hm - median) / median > 0.30;
    return s + (isOut && totalHMIncluded > 0 ? totalMt * u.hm / totalHMIncluded : 0);
  }, 0);
  const nonOutliers = included.filter(function(u) {
    return !(median > 0 && Math.abs(u.hm - median) / median > 0.30);
  });
  const remainingMt = totalMt - outlierAllocTotal;
  const equalShare = nonOutliers.length > 0 ? remainingMt / nonOutliers.length : 0;
  return tagged.map(function(u) {
    if (u.excluded) return Object.assign({}, u, { allocatedMt: 0, isExcluded: true, isOutlier: false });
    const isOut = median > 0 && Math.abs(u.hm - median) / median > 0.30;
    const allocatedMt = isOut && totalHMIncluded > 0
      ? totalMt * u.hm / totalHMIncluded
      : equalShare;
    return Object.assign({}, u, { allocatedMt: allocatedMt, isExcluded: false, isOutlier: isOut });
  });
}`);

// ── renderKapalDetailHTML ────────────────────────────────────────────────────
// Add (excluded) / (prop.) badges to the MT Alokasi column so the user can
// see which units are affected by which rule.
replaceFn('renderKapalDetailHTML', false, `function renderKapalDetailHTML(p, fillMap) {
  fillMap = fillMap || {};
  const units = p.project_units || [];
  const rate = calcKapalRate(p.ship_number_in_month || 1);
  const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);
  let h = '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;">';
  h += '<tr style="background:#E2E8F0;"><th style="padding:6px 10px;text-align:left;">Unit</th><th style="padding:6px 10px;text-align:right;">HM Awal</th><th style="padding:6px 10px;text-align:right;">HM Akhir</th><th style="padding:6px 10px;text-align:right;">HM Kerja</th><th style="padding:6px 10px;text-align:right;">MT Alokasi</th><th style="padding:6px 10px;text-align:right;">Rate</th><th style="padding:6px 10px;text-align:right;">Salary</th><th style="padding:6px 10px;text-align:right;">Solar (L)</th></tr>';
  split.forEach(function(u) {
    const hmKerja = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;
    const fillLiters = fillMap[u.unit_id] != null ? fillMap[u.unit_id] : (u.solar_isi_liters || 0);
    const solarLabel = fillMap[u.unit_id] != null ? ' (aktual)' : (u.solar_isi_liters ? ' (manual)' : '');
    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, fillLiters);
    const salary = u.allocatedMt * rate;
    const unitCode = u.units ? u.units.code : '?';
    let mtBadge = '';
    if (u.isExcluded) mtBadge = ' <span style="font-size:10px;color:#EF4444;font-weight:700;">(excluded)</span>';
    else if (u.isOutlier) mtBadge = ' <span style="font-size:10px;color:#F59E0B;font-weight:700;">(prop.)</span>';
    h += '<tr style="border-bottom:1px solid #E2E8F0;">';
    h += '<td style="padding:6px 10px;font-weight:700;">' + unitCode + '</td>';
    h += '<td style="padding:6px 10px;text-align:right;">' + u.hm_awal + '</td>';
    h += '<td style="padding:6px 10px;text-align:right;">' + (u.hm_akhir != null ? u.hm_akhir : '<span style="color:#F59E0B;font-weight:700;">Ongoing</span>') + '</td>';
    h += '<td style="padding:6px 10px;text-align:right;">' + (hmKerja != null ? hmKerja.toFixed(1) : '—') + '</td>';
    h += '<td style="padding:6px 10px;text-align:right;">' + u.allocatedMt.toFixed(2) + mtBadge + '</td>';
    h += '<td style="padding:6px 10px;text-align:right;">Rp ' + rate + '/MT</td>';
    h += '<td style="padding:6px 10px;text-align:right;font-weight:700;color:#16A34A;">' + fmtRp(salary) + '</td>';
    h += '<td style="padding:6px 10px;text-align:right;">' + solar.toFixed(1) + ' L<span style="font-size:10px;color:#94A3B8;">' + solarLabel + '</span></td>';
    h += '</tr>';
  });
  h += '</table>';
  if (p.notes) h += '<div style="margin-top:8px;font-size:12px;color:#64748B;">Catatan: ' + p.notes + '</div>';
  h += '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">';
  h += '<button onclick="event.stopPropagation();openEditKapalModal(\'' + p.id + '\')" style="background:#EFF6FF;border:1.5px solid #93C5FD;color:#1D4ED8;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;">Edit</button>';
  h += '<button onclick="event.stopPropagation();deleteKapalProject(\'' + p.id + '\',\'' + p.project_code + '\')" style="background:#FEF2F2;border:1.5px solid #FECACA;color:#EF4444;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;">Hapus</button>';
  h += '</div>';
  return h;
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
