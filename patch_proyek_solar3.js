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
const EM = '—'; // em-dash literal

// ═══════════════════════════════════════════════════════════
// SECTION A — PENGISIAN: project text input → select dropdown
// (These were applied in memory in patch_proyek_solar.js but
//  that script exited before writing, so they were never saved)
// ═══════════════════════════════════════════════════════════

// A1. Replace <input type="text"> with <select> in HTML
replaceExact(
  '<div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Project</label><input type="text" id="bbm-peng-project" class="finput" placeholder="Nama project (opsional)"></div>',
  '<div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Project</label><select id="bbm-peng-project" class="finput"><option value="">-- Pilih Project (opsional) --</option></select></div>',
  'A1: PENGISIAN project field: input -> select'
);

// A2. Rewrite onPengisianUnitChange to also call loadBBMProjectsForUnit,
//     then add the new loadBBMProjectsForUnit function after it
const oldUnitChange =
  "async function onPengisianUnitChange(unitId) {" + R +
  "  const info = document.getElementById('bbm-peng-last-info');" + R +
  "  if (!info) return;" + R +
  "  if (!unitId) { info.style.display = 'none'; bbmLastDispenseByUnit = {}; onPengisianHMChange(); return; }" + R +
  "  const { data } = await sb.from('fuel_dispenses').select('hm_at_fill, dispense_date, liters_dispensed, l_per_hr, gauge_pct').eq('unit_id', unitId).order('hm_at_fill', { ascending: false }).limit(1);" + R +
  "  if (!data || data.length === 0) { info.style.display = 'none'; bbmLastDispenseByUnit = {}; onPengisianHMChange(); return; }" + R +
  "  const last = data[0];" + R +
  "  bbmLastDispenseByUnit = last;" + R +
  "  info.style.display = '';" + R +
  "  info.innerHTML = 'Pengisian terakhir: <strong>' + formatDate(last.dispense_date) + '</strong> " + EM + " HM: <strong>' + Number(last.hm_at_fill).toLocaleString('id') + '</strong>' +" + R +
  "    (last.l_per_hr ? ' " + EM + " L/Hr: <strong>' + Number(last.l_per_hr).toFixed(2) + '</strong>' : '') +" + R +
  "    (last.gauge_pct != null ? ' " + EM + " Gauge: <strong>' + last.gauge_pct + '%</strong>' : '');" + R +
  "  onPengisianHMChange();" + R +
  "}";

const newUnitChange =
  "async function onPengisianUnitChange(unitId) {" + R +
  "  const info = document.getElementById('bbm-peng-last-info');" + R +
  "  if (!info) return;" + R +
  "  if (!unitId) { info.style.display = 'none'; bbmLastDispenseByUnit = {}; onPengisianHMChange(); loadBBMProjectsForUnit(''); return; }" + R +
  "  const { data } = await sb.from('fuel_dispenses').select('hm_at_fill, dispense_date, liters_dispensed, l_per_hr, gauge_pct').eq('unit_id', unitId).order('hm_at_fill', { ascending: false }).limit(1);" + R +
  "  if (!data || data.length === 0) { info.style.display = 'none'; bbmLastDispenseByUnit = {}; onPengisianHMChange(); await loadBBMProjectsForUnit(unitId); return; }" + R +
  "  const last = data[0];" + R +
  "  bbmLastDispenseByUnit = last;" + R +
  "  info.style.display = '';" + R +
  "  info.innerHTML = 'Pengisian terakhir: <strong>' + formatDate(last.dispense_date) + '</strong> " + EM + " HM: <strong>' + Number(last.hm_at_fill).toLocaleString('id') + '</strong>' +" + R +
  "    (last.l_per_hr ? ' " + EM + " L/Hr: <strong>' + Number(last.l_per_hr).toFixed(2) + '</strong>' : '') +" + R +
  "    (last.gauge_pct != null ? ' " + EM + " Gauge: <strong>' + last.gauge_pct + '%</strong>' : '');" + R +
  "  onPengisianHMChange();" + R +
  "  await loadBBMProjectsForUnit(unitId);" + R +
  "}" + R + R +
  "async function loadBBMProjectsForUnit(unitId) {" + R +
  "  const sel = document.getElementById('bbm-peng-project');" + R +
  "  if (!sel) return;" + R +
  "  sel.innerHTML = '<option value=\"\">-- Pilih Project (opsional) --</option>';" + R +
  "  if (!unitId) return;" + R +
  "  const { data } = await sb.from('project_units')" + R +
  "    .select('project_id, hm_awal, hm_akhir, projects(id, project_code, nama_kapal, type)')" + R +
  "    .eq('unit_id', unitId);" + R +
  "  if (!data || data.length === 0) return;" + R +
  "  const active = data.filter(function(pu) { return pu.projects; });" + R +
  "  active.sort(function(a,b) { return (a.hm_awal||0) - (b.hm_awal||0); });" + R +
  "  active.forEach(function(pu) {" + R +
  "    const p = pu.projects;" + R +
  "    const opt = document.createElement('option');" + R +
  "    opt.value = p.id;" + R +
  "    opt.dataset.code = p.project_code;" + R +
  "    const status = pu.hm_akhir == null ? ' [Ongoing]' : ' [HM ' + pu.hm_awal + '–' + pu.hm_akhir + ']';" + R +
  "    opt.textContent = p.project_code + (p.nama_kapal ? ' – ' + p.nama_kapal : '') + status;" + R +
  "    sel.appendChild(opt);" + R +
  "  });" + R +
  "  if (active.length === 1) sel.value = active[0].projects.id;" + R +
  "}";

replaceExact(oldUnitChange, newUnitChange, 'A2: onPengisianUnitChange + loadBBMProjectsForUnit');

// A3. submitPengisian: read project_id from select, store both project_id and project code
replaceExact(
  "  const project = document.getElementById('bbm-peng-project').value.trim() || null;",
  "  const projSel = document.getElementById('bbm-peng-project');" + R +
  "  const projectId = projSel && projSel.value ? projSel.value : null;" + R +
  "  const projOpt = projSel && projSel.selectedOptions[0];" + R +
  "  const project = projOpt && projOpt.dataset.code ? projOpt.dataset.code : null;",
  'A3: submitPengisian: read project_id from select'
);

// A4. submitPengisian: add project_id to insert
replaceExact(
  "      .insert({ transfer_id: tData.id, unit_id: unitId, hm_at_fill: hm, dispense_date: date, dispense_time: time, liters_dispensed: vol, l_per_hr: lhr, gauge_pct: gaugePct, project, notes });",
  "      .insert({ transfer_id: tData.id, unit_id: unitId, hm_at_fill: hm, dispense_date: date, dispense_time: time, liters_dispensed: vol, l_per_hr: lhr, gauge_pct: gaugePct, project_id: projectId, project, notes });",
  'A4: submitPengisian: add project_id to insert'
);

// ═══════════════════════════════════════════════════════════
// Write + syntax check
// ═══════════════════════════════════════════════════════════
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll patches applied. Running syntax check...');

const { execSync } = require('child_process');
try {
  const scriptStart = content.indexOf('<script>') + '<script>'.length;
  const scriptEnd = content.lastIndexOf('</script>');
  const js = content.slice(scriptStart, scriptEnd);
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, js, 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}

console.log('\nDone.');
