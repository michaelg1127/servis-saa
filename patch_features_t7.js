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

// T7-1: loadBBMProjectsForUnit — show all open projects instead of unit-filtered
replaceExact(
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
  "}",

  "async function loadBBMProjectsForUnit(unitId) {" + R +
  "  const sel = document.getElementById('bbm-peng-project');" + R +
  "  if (!sel) return;" + R +
  "  sel.innerHTML = '<option value=\"\">-- Pilih Project (opsional) --</option>';" + R +
  "  const { data } = await sb.from('projects')" + R +
  "    .select('id, project_code, nama_kapal, type')" + R +
  "    .is('end_date', null)" + R +
  "    .order('start_date', { ascending: false })" + R +
  "    .limit(100);" + R +
  "  if (!data || data.length === 0) return;" + R +
  "  let unitProjId = null;" + R +
  "  if (unitId) {" + R +
  "    const { data: pu } = await sb.from('project_units')" + R +
  "      .select('project_id').eq('unit_id', unitId).is('hm_akhir', null).limit(1);" + R +
  "    if (pu && pu.length === 1) unitProjId = pu[0].project_id;" + R +
  "  }" + R +
  "  data.forEach(function(p) {" + R +
  "    const opt = document.createElement('option');" + R +
  "    opt.value = p.id;" + R +
  "    opt.dataset.code = p.project_code;" + R +
  "    opt.textContent = p.project_code + (p.nama_kapal ? ' – ' + p.nama_kapal : '') + (p.type === 'stockpile' ? ' [STK]' : '');" + R +
  "    sel.appendChild(opt);" + R +
  "  });" + R +
  "  if (unitProjId) sel.value = unitProjId;" + R +
  "}",

  'T7-1: loadBBMProjectsForUnit: show all open projects'
);

// T7-2: openEditKapalModal — add new unit rows container + button
// Line in file: + '<input type="hidden" id="kapal-e-unitcount" value="' + units.length + '">'
// In double-quoted string: '">' = '\">' (single, escaped-double, gt, single)
replaceExact(
  "    + unitRowsHTML" + R +
  "    + '<input type=\"hidden\" id=\"kapal-e-unitcount\" value=\"' + units.length + '\">'",

  "    + unitRowsHTML" + R +
  "    + '<div id=\"kapal-en-rows\"></div>'" + R +
  "    + '<input type=\"hidden\" id=\"kapal-en-count\" value=\"0\">'" + R +
  "    + '<button type=\"button\" onclick=\"addNewKapalUnitRow()\" style=\"width:100%;padding:8px;margin-bottom:12px;background:#ECFDF5;border:1.5px dashed #6EE7B7;border-radius:8px;color:#059669;font-size:13px;font-weight:600;cursor:pointer;\">+ Tambah Unit</button>'" + R +
  "    + '<input type=\"hidden\" id=\"kapal-e-unitcount\" value=\"' + units.length + '\">'",

  'T7-2: openEditKapalModal: add new unit rows container + button'
);

// T7-3: Add addNewKapalUnitRow + removeKapalNewUnitRow before submitEditKapal
replaceExact(
  "async function submitEditKapal(projId) {",

  "async function addNewKapalUnitRow() {" + R +
  "  var units = (allUnits && allUnits.length > 0) ? allUnits : [];" + R +
  "  if (units.length === 0) {" + R +
  "    var res = await sb.from('units').select('id,code,name').order('code');" + R +
  "    units = res.data || [];" + R +
  "    allUnits = units;" + R +
  "  }" + R +
  "  var countEl = document.getElementById('kapal-en-count');" + R +
  "  if (!countEl) return;" + R +
  "  var idx = parseInt(countEl.value) || 0;" + R +
  "  var opts = '<option value=\"\">-- Pilih Unit --</option>';" + R +
  "  units.forEach(function(u) { opts += '<option value=\"' + u.id + '\">' + u.code + (u.name ? ' – ' + u.name : '') + '</option>'; });" + R +
  "  var row = document.createElement('div');" + R +
  "  row.id = 'kapal-en-row-' + idx;" + R +
  "  row.style.cssText = 'background:#ECFDF5;border:1px solid #6EE7B7;border-radius:10px;padding:12px;margin-bottom:8px;';" + R +
  "  row.innerHTML = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">'" + R +
  "    + '<span style=\"font-size:12px;font-weight:700;color:#059669;\">Unit Baru #' + (idx+1) + '</span>'" + R +
  "    + '<button type=\"button\" onclick=\"removeKapalNewUnitRow(' + idx + ')\" style=\"font-size:11px;color:#EF4444;background:none;border:none;cursor:pointer;\">&#10005;</button>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 80px 60px;gap:8px;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select id=\"kapal-en-unit-' + idx + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\">' + opts + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"kapal-en-hmawal-' + idx + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"HM\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"kapal-en-sawal-' + idx + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"100\"></div>'" + R +
  "    + '</div>';" + R +
  "  document.getElementById('kapal-en-rows').appendChild(row);" + R +
  "  countEl.value = idx + 1;" + R +
  "}" + R +
  "function removeKapalNewUnitRow(idx) { var el = document.getElementById('kapal-en-row-' + idx); if (el) el.remove(); }" + R + R +
  "async function submitEditKapal(projId) {",

  'T7-3: add addNewKapalUnitRow + removeKapalNewUnitRow helpers'
);

// T7-4: submitEditKapal — collect new unit rows in addition to existing
replaceExact(
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, hm_gap_reason: existingUnits[i].hm_gap_reason || null });" + R +
  "  }" + R +
  "  try {",

  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, hm_gap_reason: existingUnits[i].hm_gap_reason || null });" + R +
  "  }" + R +
  "  const newUnitCount = parseInt(document.getElementById('kapal-en-count')?.value) || 0;" + R +
  "  for (let j = 0; j < newUnitCount; j++) {" + R +
  "    if (!document.getElementById('kapal-en-row-' + j)) continue;" + R +
  "    const newUnitId = document.getElementById('kapal-en-unit-' + j)?.value;" + R +
  "    const newHmAwal = parseFloat(document.getElementById('kapal-en-hmawal-' + j)?.value);" + R +
  "    const newSAwal = parseInt(document.getElementById('kapal-en-sawal-' + j)?.value);" + R +
  "    if (!newUnitId) { showToast('Pilih unit untuk baris unit baru'); return; }" + R +
  "    if (isNaN(newHmAwal)) { showToast('HM Awal unit baru wajib diisi'); return; }" + R +
  "    unitUpdates.push({ unit_id: newUnitId, hm_awal: newHmAwal, hm_akhir: null, solar_awal_pct: isNaN(newSAwal) ? 100 : newSAwal, solar_akhir_pct: null, hm_gap_reason: null });" + R +
  "  }" + R +
  "  try {",

  'T7-4: submitEditKapal: collect new unit rows'
);

// T7-5: openEditStockpileModal — add new unit rows container + button
replaceExact(
  "    + unitRowsHTML" + R +
  "    + '<input type=\"hidden\" id=\"stk-e-unitcount\" value=\"' + units.length + '\">'",

  "    + unitRowsHTML" + R +
  "    + '<div id=\"stk-en-rows\"></div>'" + R +
  "    + '<input type=\"hidden\" id=\"stk-en-count\" value=\"0\">'" + R +
  "    + '<button type=\"button\" onclick=\"addNewStockpileUnitRow()\" style=\"width:100%;padding:8px;margin-bottom:12px;background:#ECFDF5;border:1.5px dashed #6EE7B7;border-radius:8px;color:#059669;font-size:13px;font-weight:600;cursor:pointer;\">+ Tambah Unit</button>'" + R +
  "    + '<input type=\"hidden\" id=\"stk-e-unitcount\" value=\"' + units.length + '\">'",

  'T7-5: openEditStockpileModal: add new unit rows container + button'
);

// T7-6: Add addNewStockpileUnitRow + removeStockpileNewUnitRow before submitEditStockpile
replaceExact(
  "async function submitEditStockpile(projId) {",

  "async function addNewStockpileUnitRow() {" + R +
  "  var units = (allUnits && allUnits.length > 0) ? allUnits : [];" + R +
  "  if (units.length === 0) {" + R +
  "    var res = await sb.from('units').select('id,code,name').order('code');" + R +
  "    units = res.data || [];" + R +
  "    allUnits = units;" + R +
  "  }" + R +
  "  var countEl = document.getElementById('stk-en-count');" + R +
  "  if (!countEl) return;" + R +
  "  var idx = parseInt(countEl.value) || 0;" + R +
  "  var opts = '<option value=\"\">-- Pilih Unit --</option>';" + R +
  "  units.forEach(function(u) { opts += '<option value=\"' + u.id + '\">' + u.code + (u.name ? ' – ' + u.name : '') + '</option>'; });" + R +
  "  var row = document.createElement('div');" + R +
  "  row.id = 'stk-en-row-' + idx;" + R +
  "  row.style.cssText = 'background:#ECFDF5;border:1px solid #6EE7B7;border-radius:10px;padding:12px;margin-bottom:8px;';" + R +
  "  row.innerHTML = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\">'" + R +
  "    + '<span style=\"font-size:12px;font-weight:700;color:#059669;\">Unit Baru #' + (idx+1) + '</span>'" + R +
  "    + '<button type=\"button\" onclick=\"removeStockpileNewUnitRow(' + idx + ')\" style=\"font-size:11px;color:#EF4444;background:none;border:none;cursor:pointer;\">&#10005;</button>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 80px 60px;gap:8px;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select id=\"stk-en-unit-' + idx + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\">' + opts + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"stk-en-hmawal-' + idx + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"HM\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"stk-en-sawal-' + idx + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"100\"></div>'" + R +
  "    + '</div>';" + R +
  "  document.getElementById('stk-en-rows').appendChild(row);" + R +
  "  countEl.value = idx + 1;" + R +
  "}" + R +
  "function removeStockpileNewUnitRow(idx) { var el = document.getElementById('stk-en-row-' + idx); if (el) el.remove(); }" + R + R +
  "async function submitEditStockpile(projId) {",

  'T7-6: add addNewStockpileUnitRow + removeStockpileNewUnitRow helpers'
);

// T7-7: submitEditStockpile — collect new unit rows in addition to existing
replaceExact(
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir });" + R +
  "  }" + R +
  "  try {",

  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir });" + R +
  "  }" + R +
  "  const newUnitCount = parseInt(document.getElementById('stk-en-count')?.value) || 0;" + R +
  "  for (let j = 0; j < newUnitCount; j++) {" + R +
  "    if (!document.getElementById('stk-en-row-' + j)) continue;" + R +
  "    const newUnitId = document.getElementById('stk-en-unit-' + j)?.value;" + R +
  "    const newHmAwal = parseFloat(document.getElementById('stk-en-hmawal-' + j)?.value);" + R +
  "    const newSAwal = parseInt(document.getElementById('stk-en-sawal-' + j)?.value);" + R +
  "    if (!newUnitId) { showToast('Pilih unit untuk baris unit baru'); return; }" + R +
  "    if (isNaN(newHmAwal)) { showToast('HM Awal unit baru wajib diisi'); return; }" + R +
  "    unitUpdates.push({ unit_id: newUnitId, hm_awal: newHmAwal, hm_akhir: null, solar_awal_pct: isNaN(newSAwal) ? 100 : newSAwal, solar_akhir_pct: null });" + R +
  "  }" + R +
  "  try {",

  'T7-7: submitEditStockpile: collect new unit rows'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T7 patches applied. Running syntax check...');
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
