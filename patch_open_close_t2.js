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

// T2-1: addKapalUnitRow — strip grid from 7 cols to 4 (Unit | HM Awal | Solar Awal% | ×)
replaceExact(
  "  div.innerHTML = '<div style=\"display:grid;grid-template-columns:1fr 80px 80px 60px 60px 80px 24px;gap:8px;align-items:end;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select class=\"finput\" id=\"ku-unit-' + rowId + '\" style=\"font-size:12px;padding:6px 8px;\"><option value=\"\">Pilih</option>' + unitOptions + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"ku-hmawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" onblur=\"onKapalHMAwalChange(this,' + rowId + ')\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Akhir</label><input type=\"number\" id=\"ku-hmakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"Opsional\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"ku-sawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"80\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Akhir%</label><input type=\"number\" id=\"ku-sakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"20\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"ku-sisi-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" min=\"0\"></div>'" + R +
  "    + '<div style=\"padding-bottom:2px;\"><button onclick=\"removeKapalUnitRow(' + rowId + ')\" style=\"background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;\">×</button></div>'" + R +
  "    + '</div>'",

  "  div.innerHTML = '<div style=\"display:grid;grid-template-columns:1fr 80px 60px 24px;gap:8px;align-items:end;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select class=\"finput\" id=\"ku-unit-' + rowId + '\" style=\"font-size:12px;padding:6px 8px;\"><option value=\"\">Pilih</option>' + unitOptions + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"ku-hmawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" onblur=\"onKapalHMAwalChange(this,' + rowId + ')\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"ku-sawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"80\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div style=\"padding-bottom:2px;\"><button onclick=\"removeKapalUnitRow(' + rowId + ')\" style=\"background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;\">×</button></div>'" + R +
  "    + '</div>'",

  'T2-1: addKapalUnitRow: strip to 4 cols'
);

// T2-2: addStockpileUnitRow — strip grid from 7 cols to 4
replaceExact(
  "  div.innerHTML = '<div style=\"display:grid;grid-template-columns:1fr 80px 80px 60px 60px 80px 24px;gap:8px;align-items:end;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select class=\"finput\" id=\"su-unit-' + rowId + '\" style=\"font-size:12px;padding:6px 8px;\"><option value=\"\">Pilih</option>' + unitOptions + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"su-hmawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" onblur=\"onStockpileHMAwalChange(this,' + rowId + ')\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Akhir</label><input type=\"number\" id=\"su-hmakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"Opsional\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"su-sawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"80\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Akhir%</label><input type=\"number\" id=\"su-sakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"20\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"su-sisi-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" min=\"0\"></div>'" + R +
  "    + '<div style=\"padding-bottom:2px;\"><button onclick=\"removeStockpileUnitRow(' + rowId + ')\" style=\"background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;\">×</button></div>'" + R +
  "    + '</div>'",

  "  div.innerHTML = '<div style=\"display:grid;grid-template-columns:1fr 80px 60px 24px;gap:8px;align-items:end;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select class=\"finput\" id=\"su-unit-' + rowId + '\" style=\"font-size:12px;padding:6px 8px;\"><option value=\"\">Pilih</option>' + unitOptions + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"su-hmawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" onblur=\"onStockpileHMAwalChange(this,' + rowId + ')\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"su-sawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"80\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div style=\"padding-bottom:2px;\"><button onclick=\"removeStockpileUnitRow(' + rowId + ')\" style=\"background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;\">×</button></div>'" + R +
  "    + '</div>'",

  'T2-2: addStockpileUnitRow: strip to 4 cols'
);

// T2-3: openAddKapalModal — remove Total MT row, Harga row, simplify Tgl to Mulai only
replaceExact(
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Kade</label><input type=\"text\" id=\"kapal-add-kade\" class=\"finput\" placeholder=\"Kade 3\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jenis Kargo</label><input type=\"text\" id=\"kapal-add-cargo\" class=\"finput\" placeholder=\"Batubara\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Total MT/M3 *</label><input type=\"number\" id=\"kapal-add-mt\" class=\"finput\" placeholder=\"5000\" min=\"0\" step=\"0.01\"></div>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Harga (Rp/MT)</label><input type=\"number\" id=\"kapal-add-unitprice\" class=\"finput\" placeholder=\"Revenue/MT\" min=\"0\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Harga Solar (Rp/L)</label><input type=\"number\" id=\"kapal-add-solarprice\" class=\"finput\" placeholder=\"10000\" min=\"0\"></div>'" + R +
  "    + '<div></div>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"kapal-add-start\" class=\"finput\" value=\"' + today + '\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Selesai *</label><input type=\"date\" id=\"kapal-add-end\" class=\"finput\" value=\"' + today + '\"></div>'" + R +
  "    + '</div>'",

  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Kade</label><input type=\"text\" id=\"kapal-add-kade\" class=\"finput\" placeholder=\"Kade 3\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jenis Kargo</label><input type=\"text\" id=\"kapal-add-cargo\" class=\"finput\" placeholder=\"Batubara\"></div>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"margin-bottom:16px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"kapal-add-start\" class=\"finput\" value=\"' + today + '\"></div>'",

  'T2-3: openAddKapalModal: remove Total MT, Harga, Tgl Selesai'
);

// T2-4: openAddStockpileModal — remove Tgl Selesai, keep Tgl Mulai only
replaceExact(
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"stk-add-start\" class=\"finput\" value=\"' + today + '\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Selesai *</label><input type=\"date\" id=\"stk-add-end\" class=\"finput\" value=\"' + today + '\"></div>'" + R +
  "    + '</div>'",

  "    + '<div style=\"margin-bottom:16px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"stk-add-start\" class=\"finput\" value=\"' + today + '\"></div>'",

  'T2-4: openAddStockpileModal: remove Tgl Selesai'
);

// T2-5a: submitAddKapal — remove project-level reads (totalMt, unitPrice, solarPrice, endDate)
replaceExact(
  "  const totalMt = parseFloat(document.getElementById('kapal-add-mt')?.value);" + R +
  "  const unitPrice = parseFloat(document.getElementById('kapal-add-unitprice')?.value);" + R +
  "  const solarPrice = parseFloat(document.getElementById('kapal-add-solarprice')?.value) || null;" + R +
  "  const startDate = document.getElementById('kapal-add-start')?.value;" + R +
  "  const endDate = document.getElementById('kapal-add-end')?.value;",

  "  const startDate = document.getElementById('kapal-add-start')?.value;",

  'T2-5a: submitAddKapal: remove project-level reads'
);

// T2-5b: submitAddKapal — remove totalMt/endDate validations (anchor on kapal-add-notes)
replaceExact(
  "  const notes = document.getElementById('kapal-add-notes')?.value.trim();" + R +
  "  if (!totalMt || totalMt <= 0) { showToast('Total MT/M3 wajib diisi'); return; }" + R +
  "  if (!startDate || !endDate) { showToast('Tanggal wajib diisi'); return; }",

  "  const notes = document.getElementById('kapal-add-notes')?.value.trim();" + R +
  "  if (!startDate) { showToast('Tanggal Mulai wajib diisi'); return; }",

  'T2-5b: submitAddKapal: remove totalMt/endDate validations'
);

// T2-5: submitAddKapal — remove unit-level hmAkhir/sAkhir/sIsi reads + fix push
replaceExact(
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

  "    const sAwal = parseInt(document.getElementById('ku-sawal-' + rowId)?.value);" + R +
  "    const gapDiv = document.getElementById('ku-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('ku-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (isNaN(sAwal) || sAwal < 0 || sAwal > 100) { showToast('Solar Awal% wajib diisi (0-100)'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: null, solar_awal_pct: sAwal, solar_akhir_pct: null, solar_isi_liters: 0, hm_gap_reason: gapReason || null });",

  'T2-5: submitAddKapal: remove unit Akhir/Isi reads + fix push'
);

// T2-5d: submitAddKapal — fix project insert (remove end_date, total_mt_m3, unit_price, harga_solar_rpl)
replaceExact(
  "      project_code: projectCode, type: 'kapal', nama_kapal: namaKapal || null," + R +
  "      pemberi_kerja: pemberiKerja || null, kade: kade || null, start_date: startDate," + R +
  "      end_date: endDate, month_year: monthYear, ship_number_in_month: shipNum," + R +
  "      cargo_type: cargo || null, total_mt_m3: totalMt, unit_price: unitPrice || null," + R +
  "      harga_solar_rpl: solarPrice, notes: notes || null",

  "      project_code: projectCode, type: 'kapal', nama_kapal: namaKapal || null," + R +
  "      pemberi_kerja: pemberiKerja || null, kade: kade || null, start_date: startDate," + R +
  "      month_year: monthYear, ship_number_in_month: shipNum," + R +
  "      cargo_type: cargo || null, notes: notes || null",

  'T2-5d: submitAddKapal: fix project insert'
);

// T2-6a: submitAddStockpile — remove endDate read + fix validation
replaceExact(
  "  const startDate = document.getElementById('stk-add-start')?.value;" + R +
  "  const endDate = document.getElementById('stk-add-end')?.value;" + R +
  "  if (!prefix || !seq || seq < 1) { showToast('Prefix dan nomor urut wajib diisi'); return; }" + R +
  "  if (!startDate || !endDate) { showToast('Tanggal wajib diisi'); return; }",

  "  const startDate = document.getElementById('stk-add-start')?.value;" + R +
  "  if (!prefix || !seq || seq < 1) { showToast('Prefix dan nomor urut wajib diisi'); return; }" + R +
  "  if (!startDate) { showToast('Tanggal Mulai wajib diisi'); return; }",

  'T2-6a: submitAddStockpile: remove endDate read + fix validation'
);

// T2-6: submitAddStockpile — remove unit-level hmAkhir/sAkhir/sIsi reads + fix push
replaceExact(
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

  "    const sAwal = parseInt(document.getElementById('su-sawal-' + rowId)?.value);" + R +
  "    const gapDiv = document.getElementById('su-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('su-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (isNaN(sAwal) || sAwal < 0 || sAwal > 100) { showToast('Solar Awal% wajib diisi (0-100)'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: null, solar_awal_pct: sAwal, solar_akhir_pct: null, solar_isi_liters: 0, hm_gap_reason: gapReason || null });",

  'T2-6: submitAddStockpile: remove unit Akhir/Isi reads + fix push'
);

// T2-6d: submitAddStockpile — fix project insert (remove end_date: endDate)
replaceExact(
  "      pemberi_kerja: pemberiKerja || null, start_date: startDate, end_date: endDate," + R +
  "      month_year: monthYear, code_prefix: prefix, code_seq: seq",

  "      pemberi_kerja: pemberiKerja || null, start_date: startDate," + R +
  "      month_year: monthYear, code_prefix: prefix, code_seq: seq",

  'T2-6d: submitAddStockpile: fix project insert'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T2 patches applied. Running syntax check...');
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
