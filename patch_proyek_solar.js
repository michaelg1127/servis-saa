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
const EM = '—'; // em-dash

// ═══════════════════════════════════════════════════════════
// SECTION A — PENGISIAN: project text input → select dropdown
// ═══════════════════════════════════════════════════════════

// A1. Replace <input> with <select> in HTML
replaceExact(
  '<div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Project</label><input type="text" id="bbm-peng-project" class="finput" placeholder="Nama project (opsional)"></div>',
  '<div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Project</label><select id="bbm-peng-project" class="finput"><option value="">-- Pilih Project (opsional) --</option></select></div>',
  'A1: PENGISIAN project field: input -> select'
);

// A2. Rewrite onPengisianUnitChange + add loadBBMProjectsForUnit after it
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
// SECTION B — HM Akhir optional in all Add/Edit forms
// ═══════════════════════════════════════════════════════════

// B1. addKapalUnitRow: placeholder "0" → "Opsional"
replaceExact(
  "'HM Akhir</label><input type=\"number\" id=\"ku-hmakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\"></div>'",
  "'HM Akhir</label><input type=\"number\" id=\"ku-hmakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"Opsional\"></div>'",
  'B1: addKapalUnitRow: HM Akhir placeholder → Opsional'
);

// B2. addStockpileUnitRow: placeholder "0" → "Opsional"
replaceExact(
  "'HM Akhir</label><input type=\"number\" id=\"su-hmakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\"></div>'",
  "'HM Akhir</label><input type=\"number\" id=\"su-hmakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"Opsional\"></div>'",
  'B2: addStockpileUnitRow: HM Akhir placeholder → Opsional'
);

// B3. submitAddKapal: relax HM Akhir validation + null-safe push
replaceExact(
  "    const rowId = row.id.replace('kapal-urow-','');" + R +
  "    const unitId = document.getElementById('ku-unit-' + rowId)?.value;" + R +
  "    const hmAwal = parseFloat(document.getElementById('ku-hmawal-' + rowId)?.value);" + R +
  "    const hmAkhir = parseFloat(document.getElementById('ku-hmakhir-' + rowId)?.value);" + R +
  "    const sAwal = parseInt(document.getElementById('ku-sawal-' + rowId)?.value);" + R +
  "    const sAkhir = parseInt(document.getElementById('ku-sakhir-' + rowId)?.value);" + R +
  "    const sIsi = parseFloat(document.getElementById('ku-sisi-' + rowId)?.value) || 0;" + R +
  "    const gapDiv = document.getElementById('ku-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('ku-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal) || isNaN(hmAkhir) || hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    if (isNaN(sAwal) || isNaN(sAkhir)) { showToast('Solar gauge wajib diisi'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: hmAkhir, solar_awal_pct: sAwal, solar_akhir_pct: sAkhir, solar_isi_liters: sIsi, hm_gap_reason: gapReason || null });",

  "    const rowId = row.id.replace('kapal-urow-','');" + R +
  "    const unitId = document.getElementById('ku-unit-' + rowId)?.value;" + R +
  "    const hmAwal = parseFloat(document.getElementById('ku-hmawal-' + rowId)?.value);" + R +
  "    const hmAkhir = parseFloat(document.getElementById('ku-hmakhir-' + rowId)?.value);" + R +
  "    const sAwal = parseInt(document.getElementById('ku-sawal-' + rowId)?.value);" + R +
  "    const sAkhir = parseInt(document.getElementById('ku-sakhir-' + rowId)?.value);" + R +
  "    const sIsi = parseFloat(document.getElementById('ku-sisi-' + rowId)?.value) || 0;" + R +
  "    const gapDiv = document.getElementById('ku-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('ku-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    if (isNaN(sAwal) || isNaN(sAkhir)) { showToast('Solar gauge wajib diisi'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: sAwal, solar_akhir_pct: sAkhir, solar_isi_liters: sIsi, hm_gap_reason: gapReason || null });",

  'B3: submitAddKapal: HM Akhir optional'
);

// B4. submitAddStockpile: same (uses stk-urow / su- prefix)
replaceExact(
  "    const rowId = row.id.replace('stk-urow-','');" + R +
  "    const unitId = document.getElementById('su-unit-' + rowId)?.value;" + R +
  "    const hmAwal = parseFloat(document.getElementById('su-hmawal-' + rowId)?.value);" + R +
  "    const hmAkhir = parseFloat(document.getElementById('su-hmakhir-' + rowId)?.value);" + R +
  "    const sAwal = parseInt(document.getElementById('su-sawal-' + rowId)?.value);" + R +
  "    const sAkhir = parseInt(document.getElementById('su-sakhir-' + rowId)?.value);" + R +
  "    const sIsi = parseFloat(document.getElementById('su-sisi-' + rowId)?.value) || 0;" + R +
  "    const gapDiv = document.getElementById('su-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('su-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal) || isNaN(hmAkhir) || hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    if (isNaN(sAwal) || isNaN(sAkhir)) { showToast('Solar gauge wajib diisi'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: hmAkhir, solar_awal_pct: sAwal, solar_akhir_pct: sAkhir, solar_isi_liters: sIsi, hm_gap_reason: gapReason || null });",

  "    const rowId = row.id.replace('stk-urow-','');" + R +
  "    const unitId = document.getElementById('su-unit-' + rowId)?.value;" + R +
  "    const hmAwal = parseFloat(document.getElementById('su-hmawal-' + rowId)?.value);" + R +
  "    const hmAkhir = parseFloat(document.getElementById('su-hmakhir-' + rowId)?.value);" + R +
  "    const sAwal = parseInt(document.getElementById('su-sawal-' + rowId)?.value);" + R +
  "    const sAkhir = parseInt(document.getElementById('su-sakhir-' + rowId)?.value);" + R +
  "    const sIsi = parseFloat(document.getElementById('su-sisi-' + rowId)?.value) || 0;" + R +
  "    const gapDiv = document.getElementById('su-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('su-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    if (isNaN(sAwal) || isNaN(sAkhir)) { showToast('Solar gauge wajib diisi'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: sAwal, solar_akhir_pct: sAkhir, solar_isi_liters: sIsi, hm_gap_reason: gapReason || null });",

  'B4: submitAddStockpile: HM Akhir optional'
);

// B5. openEditKapalModal: null-safe HM Akhir value in pre-filled row
replaceExact(
  "kapal-eu-hmakhir-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.hm_akhir + '\"></div>';",
  "kapal-eu-hmakhir-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + (u.hm_akhir != null ? u.hm_akhir : '') + '\" placeholder=\"Opsional\"></div>';",
  'B5: openEditKapalModal: null-safe HM Akhir value'
);

// B6. openEditStockpileModal: same
replaceExact(
  "stk-eu-hmakhir-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.hm_akhir + '\"></div>';",
  "stk-eu-hmakhir-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + (u.hm_akhir != null ? u.hm_akhir : '') + '\" placeholder=\"Opsional\"></div>';",
  'B6: openEditStockpileModal: null-safe HM Akhir value'
);

// B7. submitEditKapal: relax validation + null-safe push (unique by hm_gap_reason)
replaceExact(
  "    if (isNaN(hmAwal) || isNaN(hmAkhir) || hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi, hm_gap_reason: existingUnits[i].hm_gap_reason || null });",

  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi, hm_gap_reason: existingUnits[i].hm_gap_reason || null });",

  'B7: submitEditKapal: HM Akhir optional'
);

// B8. submitEditStockpile: same (unique by NO hm_gap_reason at end)
replaceExact(
  "    if (isNaN(hmAwal) || isNaN(hmAkhir) || hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi });",

  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi });",

  'B8: submitEditStockpile: HM Akhir optional'
);

// ═══════════════════════════════════════════════════════════
// SECTION C — calcKapalTonnageSplit: null-safe hm
// ═══════════════════════════════════════════════════════════

replaceExact(
  "  const withHM = units.map(u => ({ ...u, hm: (u.hm_akhir - u.hm_awal) }));",
  "  const withHM = units.map(u => ({ ...u, hm: (u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0) }));",
  'C: calcKapalTonnageSplit: null-safe hm'
);

// ═══════════════════════════════════════════════════════════
// SECTION D — Display: null-safe totalHM + Ongoing badges
// ═══════════════════════════════════════════════════════════

// D1. renderProyekKapalList: null-safe totalHM + Ongoing badge in project code cell
replaceExact(
  "    const totalHM = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal), 0);" + R +
  "    const rate = calcKapalRate(p.ship_number_in_month || 1);",
  "    const totalHM = units.reduce((s, u) => s + (u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0), 0);" + R +
  "    const hasOngoing = units.some(function(u) { return u.hm_akhir == null; });" + R +
  "    const rate = calcKapalRate(p.ship_number_in_month || 1);",
  'D1: renderProyekKapalList: null-safe totalHM + hasOngoing flag'
);

// D1b. renderProyekKapalList: show Ongoing badge in project code cell
replaceExact(
  "    html2 += '<td style=\"padding:10px 12px;font-weight:700;color:#1D4ED8;\">' + p.project_code + '</td>';",
  "    html2 += '<td style=\"padding:10px 12px;font-weight:700;color:#1D4ED8;\">' + p.project_code + (hasOngoing ? ' <span style=\"background:#FEF3C7;color:#B45309;font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;\">Ongoing</span>' : '') + '</td>';",
  'D1b: renderProyekKapalList: Ongoing badge in code cell'
);

// D2. renderProyekStockpileList: null-safe totalHM + totalSalary
replaceExact(
  "    const totalHM = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal), 0);" + R +
  "    const totalSalary = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal) * 35000, 0);",
  "    const totalHM = units.reduce((s, u) => s + (u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0), 0);" + R +
  "    const hasOngoingStk = units.some(function(u) { return u.hm_akhir == null; });" + R +
  "    const totalSalary = units.reduce((s, u) => s + (u.hm_akhir != null ? (u.hm_akhir - u.hm_awal) * 35000 : 0), 0);",
  'D2: renderProyekStockpileList: null-safe totalHM + totalSalary'
);

// D2b. renderProyekStockpileList: Ongoing badge in project code cell
replaceExact(
  "    h += '<td style=\"padding:10px 12px;font-weight:700;color:#1D4ED8;\">' + p.project_code + '</td>';",
  "    h += '<td style=\"padding:10px 12px;font-weight:700;color:#1D4ED8;\">' + p.project_code + (hasOngoingStk ? ' <span style=\"background:#FEF3C7;color:#B45309;font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;\">Ongoing</span>' : '') + '</td>';",
  'D2b: renderProyekStockpileList: Ongoing badge'
);

// D3. renderKapalDetailHTML: show Ongoing for null hm_akhir in unit rows
replaceExact(
  "    const hmKerja = u.hm_akhir - u.hm_awal;" + R +
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);" + R +
  "    const salary = u.allocatedMt * rate;" + R +
  "    const unitCode = u.units ? u.units.code : '?';" + R +
  "    h += '<tr style=\"border-bottom:1px solid #E2E8F0;\">';" + R +
  "    h += '<td style=\"padding:6px 10px;font-weight:700;\">' + unitCode + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + u.hm_awal + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + u.hm_akhir + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + hmKerja.toFixed(1) + '</td>';",

  "    const hmKerja = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;" + R +
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);" + R +
  "    const salary = u.allocatedMt * rate;" + R +
  "    const unitCode = u.units ? u.units.code : '?';" + R +
  "    h += '<tr style=\"border-bottom:1px solid #E2E8F0;\">';" + R +
  "    h += '<td style=\"padding:6px 10px;font-weight:700;\">' + unitCode + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + u.hm_awal + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + (u.hm_akhir != null ? u.hm_akhir : '<span style=\"color:#F59E0B;font-weight:700;\">Ongoing</span>') + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + (hmKerja != null ? hmKerja.toFixed(1) : '—') + '</td>';",

  'D3: renderKapalDetailHTML: Ongoing for null hm_akhir'
);

// D4. renderStockpileDetailHTML: same
replaceExact(
  "    const hmKerja = u.hm_akhir - u.hm_awal;" + R +
  "    const salary = hmKerja * 35000;" + R +
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);" + R +
  "    h += '<tr style=\"border-bottom:1px solid #E2E8F0;\">';" + R +
  "    h += '<td style=\"padding:6px 10px;font-weight:700;\">' + (u.units ? u.units.code : '?') + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + u.hm_awal + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + u.hm_akhir + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + hmKerja.toFixed(1) + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;font-weight:700;color:#16A34A;\">' + fmtRp(salary) + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L</td></tr>';",

  "    const hmKerja = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;" + R +
  "    const salary = hmKerja != null ? hmKerja * 35000 : null;" + R +
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);" + R +
  "    h += '<tr style=\"border-bottom:1px solid #E2E8F0;\">';" + R +
  "    h += '<td style=\"padding:6px 10px;font-weight:700;\">' + (u.units ? u.units.code : '?') + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + u.hm_awal + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + (u.hm_akhir != null ? u.hm_akhir : '<span style=\"color:#F59E0B;font-weight:700;\">Ongoing</span>') + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + (hmKerja != null ? hmKerja.toFixed(1) : '—') + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;font-weight:700;color:#16A34A;\">' + (salary != null ? fmtRp(salary) : '—') + '</td>';" + R +
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L</td></tr>';",

  'D4: renderStockpileDetailHTML: Ongoing for null hm_akhir'
);

// D5. renderProyekRingkasan stockpile: null-safe salary
replaceExact(
  "        operatorMap[key].stockpile += (u.hm_akhir - u.hm_awal) * 35000;",
  "        operatorMap[key].stockpile += (u.hm_akhir != null ? (u.hm_akhir - u.hm_awal) * 35000 : 0);",
  'D5: renderProyekRingkasan: null-safe stockpile salary'
);

// D6. exportProyekExcel kapal hmK: null-safe
replaceExact(
  "      const hmK = u.hm_akhir - u.hm_awal;" + R +
  "      kapalRows.push([p.project_code",
  "      const hmK = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;" + R +
  "      kapalRows.push([p.project_code",
  'D6: exportProyekExcel kapal: null-safe hmK'
);

// D7. exportProyekExcel stockpile hmK: null-safe
replaceExact(
  "      const hmK = u.hm_akhir - u.hm_awal;" + R +
  "      stkRows.push([p.project_code",
  "      const hmK = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;" + R +
  "      stkRows.push([p.project_code",
  'D7: exportProyekExcel stockpile: null-safe hmK'
);

// ═══════════════════════════════════════════════════════════
// SECTION E — Analisis Biaya: actual solar from fuel_dispenses
// ═══════════════════════════════════════════════════════════

// E1. loadProyekAnalisis: fetch fuel_dispenses + pass solarActualMap
replaceExact(
  "async function loadProyekAnalisis() {" + R +
  "  const panel = document.getElementById('proyek-panel-analisis');" + R +
  "  panel.innerHTML = '<div style=\"color:#64748B;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code,name))')" + R +
  "      .eq('type', 'kapal')" + R +
  "      .eq('month_year', proyekMonthFilter);" + R +
  "    if (error) throw error;" + R +
  "    renderProyekAnalisis(data || []);" + R +
  "  } catch(e) { panel.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  "async function loadProyekAnalisis() {" + R +
  "  const panel = document.getElementById('proyek-panel-analisis');" + R +
  "  panel.innerHTML = '<div style=\"color:#64748B;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code,name))')" + R +
  "      .eq('type', 'kapal')" + R +
  "      .eq('month_year', proyekMonthFilter);" + R +
  "    if (error) throw error;" + R +
  "    const projects = data || [];" + R +
  "    const solarActualMap = {};" + R +
  "    if (projects.length > 0) {" + R +
  "      const ids = projects.map(function(p) { return p.id; });" + R +
  "      const { data: dispenses } = await sb.from('fuel_dispenses')" + R +
  "        .select('project_id, liters_dispensed')" + R +
  "        .in('project_id', ids);" + R +
  "      (dispenses || []).forEach(function(d) {" + R +
  "        if (d.project_id) solarActualMap[d.project_id] = (solarActualMap[d.project_id] || 0) + (d.liters_dispensed || 0);" + R +
  "      });" + R +
  "    }" + R +
  "    renderProyekAnalisis(projects, solarActualMap);" + R +
  "  } catch(e) { panel.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  'E1: loadProyekAnalisis: fetch fuel_dispenses + pass solarActualMap'
);

// E2. renderProyekAnalisis: update signature + use actual solar + null-safe totalHM
replaceExact(
  "function renderProyekAnalisis(projects) {" + R +
  "  const panel = document.getElementById('proyek-panel-analisis');" + R +
  "  panel._analisisProjects = projects;",

  "function renderProyekAnalisis(projects, solarActualMap) {" + R +
  "  const panel = document.getElementById('proyek-panel-analisis');" + R +
  "  panel._analisisProjects = projects;" + R +
  "  panel._solarActualMap = solarActualMap || {};" + R +
  "  const actMap = solarActualMap || {};",

  'E2: renderProyekAnalisis: signature + actMap'
);

// E3. renderProyekAnalisis: null-safe totalHM
replaceExact(
  "    const totalHM = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal), 0);" + R +
  "    const rate = calcKapalRate(p.ship_number_in_month || 1);",
  "    const totalHM = units.reduce((s, u) => s + (u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0), 0);" + R +
  "    const rate = calcKapalRate(p.ship_number_in_month || 1);",
  'E3: renderProyekAnalisis: null-safe totalHM'
);

// E4. renderProyekAnalisis: replace formula solar with actual-or-formula
replaceExact(
  "    const fuelCost = units.reduce((s, u) => s + calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters), 0) * (p.harga_solar_rpl || 0);",
  "    const formulaSolarL = units.reduce((s, u) => s + calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters), 0);" + R +
  "    const actualSolarL = actMap[p.id] != null ? actMap[p.id] : null;" + R +
  "    const usedSolarL = actualSolarL !== null ? actualSolarL : formulaSolarL;" + R +
  "    const fuelCost = usedSolarL * (p.harga_solar_rpl || 0);",
  'E4: renderProyekAnalisis: actual-or-formula solar'
);

// E5. renderProyekAnalisis: show solar source label in Biaya Solar cell
replaceExact(
  "    h += '<td style=\"padding:8px 10px;text-align:right;color:#EF4444;\">' + fmtRp(fuelCost) + '</td>';",
  "    h += '<td style=\"padding:8px 10px;text-align:right;color:#EF4444;\">' + fmtRp(fuelCost) + (p.harga_solar_rpl ? '<br><span style=\"font-size:10px;color:#94A3B8;\">' + Math.round(usedSolarL) + 'L ' + (actualSolarL !== null ? '(aktual)' : '(formula)') + '</span>' : '') + '</td>';",
  'E5: renderProyekAnalisis: solar source label in cell'
);

// E6. setProyekAnalisisFilter: pass solarActualMap
replaceExact(
  "  if (panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects);",
  "  if (panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects, panel._solarActualMap || {});",
  'E6: setProyekAnalisisFilter: pass solarActualMap'
);

// ═══════════════════════════════════════════════════════════
// SECTION F — Riwayat: show linked project code + nama
// ═══════════════════════════════════════════════════════════

// F1. loadFuelRiwayat: add project_id + projects join
replaceExact(
  "      sb.from('fuel_dispenses')" + R +
  "        .select('id, dispense_date, dispense_time, hm_at_fill, liters_dispensed, l_per_hr, gauge_pct, project, notes, units(id, code, name), fuel_transfers(id, transfer_code, drum_name, fuel_bunkers(bunker_code))')" + R +
  "        .order('dispense_date', { ascending: false }).order('created_at', { ascending: false }),",

  "      sb.from('fuel_dispenses')" + R +
  "        .select('id, dispense_date, dispense_time, hm_at_fill, liters_dispensed, l_per_hr, gauge_pct, project, project_id, notes, units(id, code, name), fuel_transfers(id, transfer_code, drum_name, fuel_bunkers(bunker_code)), projects(project_code, nama_kapal)')" + R +
  "        .order('dispense_date', { ascending: false }).order('created_at', { ascending: false }),",

  'F1: loadFuelRiwayat: add project_id + projects join'
);

// F2. renderFuelRiwayat: project options from linked FK or text
replaceExact(
  "  const projectOpts = [...new Set(fuelRiwayatData.map(r => r.project).filter(Boolean))].sort();",
  "  const projectCodes = fuelRiwayatData.map(r => (r.project_id && r.projects) ? r.projects.project_code : r.project).filter(Boolean);" + R +
  "  const projectOpts = [...new Set(projectCodes)].sort();",
  'F2: renderFuelRiwayat: project options from FK or text'
);

// F3. renderFuelRiwayat: filter uses FK or text
replaceExact(
  "  if (fuelRiwayatFilters.project) { filtDisp = filtDisp.filter(r => r.project === fuelRiwayatFilters.project); filtXfer = []; filtBunkers = []; }",
  "  if (fuelRiwayatFilters.project) { filtDisp = filtDisp.filter(r => ((r.project_id && r.projects) ? r.projects.project_code : r.project) === fuelRiwayatFilters.project); filtXfer = []; filtBunkers = []; }",
  'F3: renderFuelRiwayat: filter by FK or text'
);

// F4. renderFuelRiwayat: project column shows code + nama_kapal when linked
replaceExact(
  "      '<td style=\"color:#64748B;font-size:12px;\">' + (r.project || '—') + '</td>' +",
  "      '<td style=\"color:#64748B;font-size:12px;\">' + (r.project_id && r.projects ? '<span style=\"font-weight:700;color:#1D4ED8;\">' + r.projects.project_code + '</span>' + (r.projects.nama_kapal ? '<br><span style=\"font-size:11px;color:#64748B;\">' + r.projects.nama_kapal + '</span>' : '') : (r.project || '—')) + '</td>' +",
  'F4: renderFuelRiwayat: show linked project code + nama'
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

console.log('\nDone. Run SQL in Supabase then commit.');
