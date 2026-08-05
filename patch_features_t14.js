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

// T14-1: Fix calcLPerHr — add .lt('hm_at_fill', hm) so it only looks at fills
//         with lower HM than the current one, not the absolute highest on record.
//         This was the root cause: out-of-order entry or any fill with higher HM
//         made diff <= 0 → null.
replaceExact(
  "  const { data } = await sb.from('fuel_dispenses').select('hm_at_fill, gauge_pct, liters_dispensed').eq('unit_id', unitId).order('hm_at_fill', { ascending: false }).limit(1);",
  "  const { data } = await sb.from('fuel_dispenses').select('hm_at_fill, gauge_pct, liters_dispensed').eq('unit_id', unitId).lt('hm_at_fill', hm).order('hm_at_fill', { ascending: false }).limit(1);",
  'T14-1: calcLPerHr: add lt filter so only prior fills (lower HM) are considered'
);

// T14-2: openEditPengisian modal — add hidden ep-unit-id input so submitEditPengisian
//         can look up the correct unit when recalculating L/Hr
replaceExact(
  "    + '<div style=\"font-size:13px;color:#64748B;margin-bottom:16px;\">' + tc + ' — ' + unitCode + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">'" ,

  "    + '<div style=\"font-size:13px;color:#64748B;margin-bottom:16px;\">' + tc + ' — ' + unitCode + '</div>'" + R +
  "    + '<input type=\"hidden\" id=\"ep-unit-id\" value=\"' + (r.unit_id || '') + '\">' " + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">'" ,

  'T14-2: openEditPengisian: add hidden ep-unit-id input to modal'
);

// T14-3: submitEditPengisian — recalculate L/Hr using corrected lt filter
//         (exclude current record, only look at fills with lower HM),
//         then write l_per_hr into the update call
replaceExact(
  "  if (!date || isNaN(hm) || isNaN(vol)) { showToast('Tanggal, HM, dan Volume wajib diisi'); return; }" + R +
  "  try {" + R +
  "    const { error: e1 } = await sb.from('fuel_dispenses').update({" + R +
  "      dispense_date: date, dispense_time: time, hm_at_fill: hm," + R +
  "      liters_dispensed: vol, gauge_pct: gaugePct, project_id: projectId, project: project, notes: notes" + R +
  "    }).eq('id', dispId);",

  "  if (!date || isNaN(hm) || isNaN(vol)) { showToast('Tanggal, HM, dan Volume wajib diisi'); return; }" + R +
  "  const epUnitId = document.getElementById('ep-unit-id')?.value || null;" + R +
  "  let newLhr = null;" + R +
  "  if (epUnitId) {" + R +
  "    const { data: prevFills } = await sb.from('fuel_dispenses')" + R +
  "      .select('hm_at_fill, gauge_pct, liters_dispensed')" + R +
  "      .eq('unit_id', epUnitId).lt('hm_at_fill', hm).neq('id', dispId)" + R +
  "      .order('hm_at_fill', { ascending: false }).limit(1);" + R +
  "    if (prevFills && prevFills.length > 0) {" + R +
  "      const prevF = prevFills[0];" + R +
  "      const diffF = hm - Number(prevF.hm_at_fill);" + R +
  "      if (diffF > 0) {" + R +
  "        if (gaugePct != null && prevF.gauge_pct != null) {" + R +
  "          const consumedF = Number(prevF.gauge_pct) + Number(prevF.liters_dispensed) - gaugePct;" + R +
  "          if (consumedF > 0) newLhr = Math.round((consumedF / diffF) * 100) / 100;" + R +
  "        }" + R +
  "        if (newLhr === null) newLhr = Math.round((vol / diffF) * 100) / 100;" + R +
  "      }" + R +
  "    }" + R +
  "  }" + R +
  "  try {" + R +
  "    const { error: e1 } = await sb.from('fuel_dispenses').update({" + R +
  "      dispense_date: date, dispense_time: time, hm_at_fill: hm," + R +
  "      liters_dispensed: vol, gauge_pct: gaugePct, l_per_hr: newLhr, project_id: projectId, project: project, notes: notes" + R +
  "    }).eq('id', dispId);",

  'T14-3: submitEditPengisian: recalculate L/Hr with lt+neq filter, write to DB'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T14 patches applied. Running syntax check...');
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
