// patch_edit_delete_unit.js — add delete-existing-unit affordance to
//   Edit Kapal modal (Proyek regular) and Edit Woodlog Kapal modal
//
//   1. Wrap existing unit rows in id="kapal-eu-row-{i}" / "wledit-row-{i}"
//   2. Add x delete button with confirm() in each header
//   3. Add removeExistingKapalUnit / removeExistingWlUnit helpers
//   4. submitEditKapal: skip deleted rows, enforce min-1 total
//   5. submitEditWoodlogKapal: skip deleted rows, delete removed unit_ids
//      from DB, enforce min-1 total

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

// -----------------------------------------------------------------------
// PATCH 1: openEditKapalModal — wrap existing rows + add delete button
// -----------------------------------------------------------------------
replaceExact(
  "    unitRowsHTML += '<div style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;\">';\r\n" +
  "    unitRowsHTML += '<div style=\"font-size:12px;font-weight:700;color:#1E293B;margin-bottom:8px;\">' + unitCode + '</div>';",
  "    unitRowsHTML += '<div id=\"kapal-eu-row-' + i + '\" style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;\">';\r\n" +
  "    unitRowsHTML += '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\"><span style=\"font-size:12px;font-weight:700;color:#1E293B;\">' + unitCode + '</span><button type=\"button\" onclick=\"removeExistingKapalUnit(' + i + ', \\'' + unitCode + '\\')\" style=\"font-size:14px;color:#EF4444;background:none;border:none;cursor:pointer;line-height:1;\" title=\"Hapus unit dari proyek\">&#10005;</button></div>';",
  'wrap existing unit rows in openEditKapalModal + add delete button'
);

// -----------------------------------------------------------------------
// PATCH 2: openEditWoodlogKapalModal — wrap existing rows + add delete
// -----------------------------------------------------------------------
replaceExact(
  "    return '<div style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;\">' +\r\n" +
  "      '<div style=\"font-size:12px;font-weight:700;color:#1E293B;margin-bottom:8px;\">' + unitCode + '</div>' +",
  "    return '<div id=\"wledit-row-' + i + '\" style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;\">' +\r\n" +
  "      '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\"><span style=\"font-size:12px;font-weight:700;color:#1E293B;\">' + unitCode + '</span><button type=\"button\" onclick=\"removeExistingWlUnit(' + i + ', \\'' + unitCode + '\\')\" style=\"font-size:14px;color:#EF4444;background:none;border:none;cursor:pointer;line-height:1;\" title=\"Hapus unit dari proyek\">&#10005;</button></div>' +",
  'wrap existing unit rows in openEditWoodlogKapalModal + add delete button'
);

// -----------------------------------------------------------------------
// PATCH 3: add remove helpers after removeKapalNewUnitRow
// -----------------------------------------------------------------------
replaceExact(
  "function removeKapalNewUnitRow(idx) { var el = document.getElementById('kapal-en-row-' + idx); if (el) el.remove(); }\r\n",
  "function removeKapalNewUnitRow(idx) { var el = document.getElementById('kapal-en-row-' + idx); if (el) el.remove(); }\r\n" +
  "function removeExistingKapalUnit(i, code) {\r\n" +
  "  if (!confirm('Hapus unit ' + code + ' dari proyek ini?')) return;\r\n" +
  "  var el = document.getElementById('kapal-eu-row-' + i);\r\n" +
  "  if (el) el.remove();\r\n" +
  "}\r\n" +
  "function removeExistingWlUnit(i, code) {\r\n" +
  "  if (!confirm('Hapus unit ' + code + ' dari proyek ini?')) return;\r\n" +
  "  var el = document.getElementById('wledit-row-' + i);\r\n" +
  "  if (el) el.remove();\r\n" +
  "}\r\n",
  'add removeExistingKapalUnit + removeExistingWlUnit helpers'
);

// -----------------------------------------------------------------------
// PATCH 4: submitEditKapal — skip deleted rows in existing-unit loop
// -----------------------------------------------------------------------
replaceExact(
  "  for (let i = 0; i < unitCount; i++) {\r\n" +
  "    const hmAwal = parseFloat(document.getElementById('kapal-eu-hmawal-' + i)?.value);\r\n" +
  "    const hmAkhir = parseFloat(document.getElementById('kapal-eu-hmakhir-' + i)?.value);\r\n" +
  "    const sAwal = parseInt(document.getElementById('kapal-eu-sawal-' + i)?.value);\r\n" +
  "    const sAkhir = parseInt(document.getElementById('kapal-eu-sakhir-' + i)?.value);\r\n",
  "  for (let i = 0; i < unitCount; i++) {\r\n" +
  "    if (!document.getElementById('kapal-eu-row-' + i)) continue;\r\n" +
  "    const hmAwal = parseFloat(document.getElementById('kapal-eu-hmawal-' + i)?.value);\r\n" +
  "    const hmAkhir = parseFloat(document.getElementById('kapal-eu-hmakhir-' + i)?.value);\r\n" +
  "    const sAwal = parseInt(document.getElementById('kapal-eu-sawal-' + i)?.value);\r\n" +
  "    const sAkhir = parseInt(document.getElementById('kapal-eu-sakhir-' + i)?.value);\r\n",
  'submitEditKapal: skip deleted existing-unit rows'
);

// -----------------------------------------------------------------------
// PATCH 5: submitEditKapal — min-1 guard before try
// -----------------------------------------------------------------------
replaceExact(
  "    unitUpdates.push({ unit_id: newUnitId, hm_awal: newHmAwal, hm_akhir: null, solar_awal_pct: isNaN(newSAwal) ? 100 : newSAwal, solar_akhir_pct: null, hm_gap_reason: null });\r\n" +
  "  }\r\n" +
  "  try {\r\n" +
  "    const { error: pe } = await sb.from('projects').update({\r\n" +
  "      nama_kapal: namaKapal || null, pemberi_kerja: pemberiKerja || null,",
  "    unitUpdates.push({ unit_id: newUnitId, hm_awal: newHmAwal, hm_akhir: null, solar_awal_pct: isNaN(newSAwal) ? 100 : newSAwal, solar_akhir_pct: null, hm_gap_reason: null });\r\n" +
  "  }\r\n" +
  "  if (unitUpdates.length === 0) { showToast('Proyek harus punya minimal 1 unit'); return; }\r\n" +
  "  try {\r\n" +
  "    const { error: pe } = await sb.from('projects').update({\r\n" +
  "      nama_kapal: namaKapal || null, pemberi_kerja: pemberiKerja || null,",
  'submitEditKapal: min-1 unit guard'
);

// -----------------------------------------------------------------------
// PATCH 6: submitEditWoodlogKapal — skip deleted rows + collect removed
//   unit_ids for later delete
// -----------------------------------------------------------------------
replaceExact(
  "  const unitCount = parseInt((document.getElementById('wledit-unitcount') || {}).value) || 0;\r\n" +
  "  const unitUpdates = [];\r\n" +
  "  for (let i = 0; i < unitCount; i++) {\r\n" +
  "    const hmAwal = parseFloat((document.getElementById('wledit-hmawal-' + i) || {}).value);\r\n",
  "  const unitCount = parseInt((document.getElementById('wledit-unitcount') || {}).value) || 0;\r\n" +
  "  const unitUpdates = [];\r\n" +
  "  const removedUnitIds = [];\r\n" +
  "  for (let i = 0; i < unitCount; i++) {\r\n" +
  "    if (!document.getElementById('wledit-row-' + i)) { if (units[i]) removedUnitIds.push(units[i].unit_id); continue; }\r\n" +
  "    const hmAwal = parseFloat((document.getElementById('wledit-hmawal-' + i) || {}).value);\r\n",
  'submitEditWoodlogKapal: skip deleted rows + collect removedUnitIds'
);

// -----------------------------------------------------------------------
// PATCH 7: submitEditWoodlogKapal — min-1 guard + delete removed from DB
// -----------------------------------------------------------------------
replaceExact(
  "  try {\r\n" +
  "    const { error: pe } = await sb.from('projects').update({\r\n" +
  "      nama_kapal: namaKapal || null, pemberi_kerja: pemberi || null,\r\n" +
  "      start_date: start, end_date: end || null,\r\n" +
  "      total_mt_m3: bl, unit_price: rate, harga_solar_rpl: solar, notes: notes || null\r\n" +
  "    }).eq('id', id);\r\n" +
  "    if (pe) throw pe;\r\n" +
  "    // Update project_units",
  "  const newCountPre = parseInt((document.getElementById('wlen-count') || {}).value) || 0;\r\n" +
  "  let newCountAlive = 0;\r\n" +
  "  for (let j = 0; j < newCountPre; j++) { if (document.getElementById('wlen-row-' + j)) newCountAlive++; }\r\n" +
  "  if (unitUpdates.length + newCountAlive === 0) { showToast('Proyek harus punya minimal 1 unit'); _wlEditKapalSaving = false; return; }\r\n" +
  "  try {\r\n" +
  "    const { error: pe } = await sb.from('projects').update({\r\n" +
  "      nama_kapal: namaKapal || null, pemberi_kerja: pemberi || null,\r\n" +
  "      start_date: start, end_date: end || null,\r\n" +
  "      total_mt_m3: bl, unit_price: rate, harga_solar_rpl: solar, notes: notes || null\r\n" +
  "    }).eq('id', id);\r\n" +
  "    if (pe) throw pe;\r\n" +
  "    if (removedUnitIds.length > 0) {\r\n" +
  "      const { error: dre } = await sb.from('project_units').delete().eq('project_id', id).in('unit_id', removedUnitIds);\r\n" +
  "      if (dre) throw dre;\r\n" +
  "    }\r\n" +
  "    // Update project_units",
  'submitEditWoodlogKapal: min-1 guard + delete removed unit_ids'
);

fs.writeFileSync(path, src);
console.log('Done.');
