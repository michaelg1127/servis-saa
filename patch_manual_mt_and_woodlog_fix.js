const fs = require('fs');
const FILE = 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
let fails = 0;

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); fails++; return; }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); fails++; return; }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

const N = '\r\n';

// ─── PATCH 1: calcKapalTonnageSplit — apply manual_mt override after auto calc ─
replaceExact(
  [
    '    var allocatedMt = hasOutlier',
    '      ? (totalHMIncluded > 0 ? totalMt * u.hm / totalHMIncluded : 0)',
    '      : (count > 0 ? totalMt / count : 0);',
    '    return Object.assign({}, u, { allocatedMt: allocatedMt, isExcluded: false, isOutlier: false });'
  ].join(N),
  [
    '    var allocatedMt = hasOutlier',
    '      ? (totalHMIncluded > 0 ? totalMt * u.hm / totalHMIncluded : 0)',
    '      : (count > 0 ? totalMt / count : 0);',
    '    if (u.manual_mt != null) allocatedMt = Number(u.manual_mt);',
    '    return Object.assign({}, u, { allocatedMt: allocatedMt, isExcluded: false, isOutlier: false, isManual: u.manual_mt != null });'
  ].join(N),
  'PATCH 1: calcKapalTonnageSplit — manual_mt override'
);

// ─── PATCH 2: openEditKapalModal — add Manual MT input per unit row ────────────
// The existing unit row ends with the Solar Isi div closing tag and then '</div></div>'
// We add the manual MT row just before the closing </div></div> of each unit block
replaceExact(
  [
    "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi</label><div id=\"kapal-eu-sisi-display-' + i + '\" style=\"font-size:12px;padding:6px 8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;color:#64748B;\">Memuat...</div></div>';",
    "    unitRowsHTML += '</div></div>';"
  ].join(N),
  [
    "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi</label><div id=\"kapal-eu-sisi-display-' + i + '\" style=\"font-size:12px;padding:6px 8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;color:#64748B;\">Memuat...</div></div>';",
    "    unitRowsHTML += '</div>';",
    "    var calcSplit = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);",
    "    var autoMt = calcSplit[i] ? calcSplit[i].allocatedMt.toFixed(2) : '';",
    "    unitRowsHTML += '<div style=\"margin-top:8px;display:flex;align-items:center;gap:8px;\">';",
    "    unitRowsHTML += '<label style=\"font-size:11px;font-weight:600;color:#64748B;white-space:nowrap;\">Override MT:</label>';",
    "    unitRowsHTML += '<input type=\"number\" id=\"kapal-eu-manualmt-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;width:110px;\" value=\"' + (u.manual_mt != null ? u.manual_mt : '') + '\" placeholder=\"Auto (' + autoMt + ')\" step=\"0.01\">';",
    "    unitRowsHTML += '<span style=\"font-size:11px;color:#94A3B8;\">MT (kosong = otomatis)</span>';",
    "    unitRowsHTML += '</div></div>';"
  ].join(N),
  'PATCH 2: openEditKapalModal — manual MT override input per unit'
);

// ─── PATCH 3: submitEditKapal — collect manual_mt and include in unitUpdates ───
replaceExact(
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, hm_gap_reason: existingUnits[i].hm_gap_reason || null });",
  [
    "    const manualMtVal = parseFloat(document.getElementById('kapal-eu-manualmt-' + i)?.value);",
    "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, hm_gap_reason: existingUnits[i].hm_gap_reason || null, manual_mt: isNaN(manualMtVal) ? null : manualMtVal });"
  ].join(N),
  'PATCH 3: submitEditKapal — save manual_mt per unit'
);

// ─── PATCH 4: Woodlog Sync — remove double-deduction of 5% ────────────────────
// tpr was (bl * 0.95) / totalRitase, then salary = ton * 0.95 * 800 — double 5%
// Fix: tpr = bl / totalRitase so the single 0.95 in the salary formula is correct
replaceExact(
  "      var tpr = (bl * 0.95) / data.totalRitase;",
  "      var tpr = bl / data.totalRitase;",
  'PATCH 4: Woodlog Sync — fix double 5% deduction in tpr calculation'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
