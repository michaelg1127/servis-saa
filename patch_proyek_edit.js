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

// ─── 1. Remove * from "Pemberi Kerja *" in Kapal modal ───────────────────────
replaceExact(
  '>Pemberi Kerja *</label><input type="text" id="kapal-add-pemberi"',
  '>Pemberi Kerja</label><input type="text" id="kapal-add-pemberi"',
  'Kapal modal: remove * from Pemberi Kerja'
);

// ─── 2. Remove * from "Harga (Rp/MT) *" in Kapal modal ──────────────────────
replaceExact(
  '>Harga (Rp/MT) *</label><input type="number" id="kapal-add-unitprice"',
  '>Harga (Rp/MT)</label><input type="number" id="kapal-add-unitprice"',
  'Kapal modal: remove * from Harga (Rp/MT)'
);

// ─── 3. Remove * from "Pemberi Kerja *" in Stockpile modal ───────────────────
replaceExact(
  '>Pemberi Kerja *</label><input type="text" id="stk-add-pemberi"',
  '>Pemberi Kerja</label><input type="text" id="stk-add-pemberi"',
  'Stockpile modal: remove * from Pemberi Kerja'
);

// ─── 4. Remove pemberiKerja + unitPrice validations in submitAddKapal ─────────
replaceExact(
  "  if (!pemberiKerja) { showToast('Pemberi kerja wajib diisi'); return; }" + R +
  "  if (!totalMt || totalMt <= 0) { showToast('Total MT/M3 wajib diisi'); return; }" + R +
  "  if (!unitPrice || unitPrice <= 0) { showToast('Harga per MT wajib diisi'); return; }",
  "  if (!totalMt || totalMt <= 0) { showToast('Total MT/M3 wajib diisi'); return; }",
  'submitAddKapal: remove pemberiKerja + unitPrice validation'
);

// ─── 5. Make pemberi_kerja nullable in kapal insert ───────────────────────────
replaceExact(
  '      pemberi_kerja: pemberiKerja, kade: kade || null,',
  '      pemberi_kerja: pemberiKerja || null, kade: kade || null,',
  'kapal insert: make pemberi_kerja nullable'
);

// ─── 6. Make unit_price nullable in kapal insert ─────────────────────────────
replaceExact(
  '      cargo_type: cargo || null, total_mt_m3: totalMt, unit_price: unitPrice,',
  '      cargo_type: cargo || null, total_mt_m3: totalMt, unit_price: unitPrice || null,',
  'kapal insert: make unit_price nullable'
);

// ─── 7. Remove pemberiKerja validation in submitAddStockpile ─────────────────
replaceExact(
  "  if (!pemberiKerja) { showToast('Pemberi kerja wajib diisi'); return; }" + R +
  "  if (!prefix || !seq || seq < 1) { showToast('Prefix dan nomor urut wajib diisi'); return; }",
  "  if (!prefix || !seq || seq < 1) { showToast('Prefix dan nomor urut wajib diisi'); return; }",
  'submitAddStockpile: remove pemberiKerja validation'
);

// ─── 8. Make pemberi_kerja nullable in stockpile insert ──────────────────────
replaceExact(
  '      pemberi_kerja: pemberiKerja, start_date: startDate, end_date: endDate,',
  '      pemberi_kerja: pemberiKerja || null, start_date: startDate, end_date: endDate,',
  'stockpile insert: make pemberi_kerja nullable'
);

// ─── 9. Add Edit/Delete buttons to renderKapalDetailHTML ─────────────────────
replaceExact(
  "  if (p.notes) h += '<div style=\"margin-top:8px;font-size:12px;color:#64748B;\">Catatan: ' + p.notes + '</div>';" + R +
  "  return h;" + R +
  "}" + R + R +
  "async function openAddKapalModal()",

  "  if (p.notes) h += '<div style=\"margin-top:8px;font-size:12px;color:#64748B;\">Catatan: ' + p.notes + '</div>';" + R +
  "  h += '<div style=\"display:flex;gap:8px;margin-top:12px;justify-content:flex-end;\">';" + R +
  "  h += '<button onclick=\"event.stopPropagation();openEditKapalModal(\\'' + p.id + '\\')\" style=\"background:#EFF6FF;border:1.5px solid #93C5FD;color:#1D4ED8;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;\">Edit</button>';" + R +
  "  h += '<button onclick=\"event.stopPropagation();deleteKapalProject(\\'' + p.id + '\\',\\'' + p.project_code + '\\')\" style=\"background:#FEF2F2;border:1.5px solid #FECACA;color:#EF4444;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;\">Hapus</button>';" + R +
  "  h += '</div>';" + R +
  "  return h;" + R +
  "}" + R + R +
  "async function openAddKapalModal()",

  'renderKapalDetailHTML: add Edit/Delete buttons'
);

// ─── 10. Add Edit/Delete buttons to renderStockpileDetailHTML ────────────────
replaceExact(
  "  h += '</table>';" + R +
  "  return h;" + R +
  "}" + R + R +
  "function openAddStockpileModal()",

  "  h += '</table>';" + R +
  "  h += '<div style=\"display:flex;gap:8px;margin-top:12px;justify-content:flex-end;\">';" + R +
  "  h += '<button onclick=\"event.stopPropagation();openEditStockpileModal(\\'' + p.id + '\\')\" style=\"background:#EFF6FF;border:1.5px solid #93C5FD;color:#1D4ED8;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;\">Edit</button>';" + R +
  "  h += '<button onclick=\"event.stopPropagation();deleteStockpileProject(\\'' + p.id + '\\',\\'' + p.project_code + '\\')\" style=\"background:#FEF2F2;border:1.5px solid #FECACA;color:#EF4444;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;\">Hapus</button>';" + R +
  "  h += '</div>';" + R +
  "  return h;" + R +
  "}" + R + R +
  "function openAddStockpileModal()",

  'renderStockpileDetailHTML: add Edit/Delete buttons'
);

// ─── 11. Insert new functions before loadProyekRingkasan ─────────────────────
const newFunctions =
// --- deleteKapalProject ---
"async function deleteKapalProject(id, code) {" + R +
"  if (!confirm('Hapus proyek ' + code + '? Data unit akan ikut dihapus.')) return;" + R +
"  try {" + R +
"    await sb.from('project_units').delete().eq('project_id', id);" + R +
"    const { error } = await sb.from('projects').delete().eq('id', id);" + R +
"    if (error) throw error;" + R +
"    showToast('Proyek ' + code + ' dihapus.', 'success');" + R +
"    loadProyekKapal();" + R +
"  } catch(e) { showToast('Gagal hapus: ' + e.message); }" + R +
"}" + R + R +

// --- deleteStockpileProject ---
"async function deleteStockpileProject(id, code) {" + R +
"  if (!confirm('Hapus proyek ' + code + '? Data unit akan ikut dihapus.')) return;" + R +
"  try {" + R +
"    await sb.from('project_units').delete().eq('project_id', id);" + R +
"    const { error } = await sb.from('projects').delete().eq('id', id);" + R +
"    if (error) throw error;" + R +
"    showToast('Proyek ' + code + ' dihapus.', 'success');" + R +
"    loadProyekStockpile();" + R +
"  } catch(e) { showToast('Gagal hapus: ' + e.message); }" + R +
"}" + R + R +

// --- openEditKapalModal ---
"async function openEditKapalModal(id) {" + R +
"  const p = proyekKapalData.find(function(x) { return x.id === id; });" + R +
"  if (!p) { showToast('Data tidak ditemukan'); return; }" + R +
"  const units = p.project_units || [];" + R +
"  const rate = calcKapalRate(p.ship_number_in_month || 1);" + R +
"  let unitRowsHTML = '';" + R +
"  units.forEach(function(u, i) {" + R +
"    const unitCode = u.units ? u.units.code : '?';" + R +
"    unitRowsHTML += '<div style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;\">';" + R +
"    unitRowsHTML += '<div style=\"font-size:12px;font-weight:700;color:#1E293B;margin-bottom:8px;\">' + unitCode + '</div>';" + R +
"    unitRowsHTML += '<div style=\"display:grid;grid-template-columns:80px 80px 60px 60px 80px;gap:8px;\">';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"kapal-eu-hmawal-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.hm_awal + '\"></div>';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Akhir</label><input type=\"number\" id=\"kapal-eu-hmakhir-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.hm_akhir + '\"></div>';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"kapal-eu-sawal-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.solar_awal_pct + '\"></div>';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Akhir%</label><input type=\"number\" id=\"kapal-eu-sakhir-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.solar_akhir_pct + '\"></div>';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"kapal-eu-sisi-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + (u.solar_isi_liters || 0) + '\"></div>';" + R +
"    unitRowsHTML += '</div></div>';" + R +
"  });" + R +
"  const modalHTML = '<div style=\"padding:24px;max-width:680px;width:100%;max-height:80vh;overflow-y:auto;\">'" + R +
"    + '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;\">Edit Proyek: ' + p.project_code + '</div>'" + R +
"    + '<div style=\"font-size:13px;color:#64748B;margin-bottom:16px;\">Rate: Rp ' + rate + '/MT &nbsp;|&nbsp; Kapal #' + (p.ship_number_in_month || 1) + ' bulan ini</div>'" + R +
"    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Nama Kapal</label><input type=\"text\" id=\"kapal-e-namakapal\" class=\"finput\" value=\"' + (p.nama_kapal || '') + '\"></div>'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Pemberi Kerja</label><input type=\"text\" id=\"kapal-e-pemberi\" class=\"finput\" value=\"' + (p.pemberi_kerja || '') + '\"></div>'" + R +
"    + '</div>'" + R +
"    + '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Kade</label><input type=\"text\" id=\"kapal-e-kade\" class=\"finput\" value=\"' + (p.kade || '') + '\"></div>'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jenis Kargo</label><input type=\"text\" id=\"kapal-e-cargo\" class=\"finput\" value=\"' + (p.cargo_type || '') + '\"></div>'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Total MT/M3 *</label><input type=\"number\" id=\"kapal-e-mt\" class=\"finput\" value=\"' + (p.total_mt_m3 || '') + '\" min=\"0\" step=\"0.01\"></div>'" + R +
"    + '</div>'" + R +
"    + '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Harga (Rp/MT)</label><input type=\"number\" id=\"kapal-e-unitprice\" class=\"finput\" value=\"' + (p.unit_price || '') + '\" min=\"0\"></div>'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Harga Solar (Rp/L)</label><input type=\"number\" id=\"kapal-e-solarprice\" class=\"finput\" value=\"' + (p.harga_solar_rpl || '') + '\" min=\"0\"></div>'" + R +
"    + '<div></div>'" + R +
"    + '</div>'" + R +
"    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"kapal-e-start\" class=\"finput\" value=\"' + (p.start_date || '') + '\"></div>'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Selesai *</label><input type=\"date\" id=\"kapal-e-end\" class=\"finput\" value=\"' + (p.end_date || '') + '\"></div>'" + R +
"    + '</div>'" + R +
"    + '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Unit yang Mengerjakan (' + units.length + ' unit)</div>'" + R +
"    + unitRowsHTML" + R +
"    + '<input type=\"hidden\" id=\"kapal-e-unitcount\" value=\"' + units.length + '\">'" + R +
"    + '<div style=\"margin-top:8px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Catatan</label><textarea id=\"kapal-e-notes\" class=\"finput\" rows=\"2\">' + (p.notes || '') + '</textarea></div>'" + R +
"    + '<div style=\"display:flex;gap:12px;margin-top:16px;\">'" + R +
"    + '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>'" + R +
"    + '<button onclick=\"submitEditKapal(\\'' + id + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan Perubahan</button>'" + R +
"    + '</div></div>';" + R +
"  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
"  document.getElementById('modal-overlay').style.display = 'flex';" + R +
"}" + R + R +

// --- submitEditKapal ---
"async function submitEditKapal(projId) {" + R +
"  const p = proyekKapalData.find(function(x) { return x.id === projId; });" + R +
"  if (!p) { showToast('Data tidak ditemukan'); return; }" + R +
"  const namaKapal = document.getElementById('kapal-e-namakapal')?.value.trim();" + R +
"  const pemberiKerja = document.getElementById('kapal-e-pemberi')?.value.trim();" + R +
"  const kade = document.getElementById('kapal-e-kade')?.value.trim();" + R +
"  const cargo = document.getElementById('kapal-e-cargo')?.value.trim();" + R +
"  const totalMt = parseFloat(document.getElementById('kapal-e-mt')?.value);" + R +
"  const unitPrice = parseFloat(document.getElementById('kapal-e-unitprice')?.value);" + R +
"  const solarPrice = parseFloat(document.getElementById('kapal-e-solarprice')?.value) || null;" + R +
"  const startDate = document.getElementById('kapal-e-start')?.value;" + R +
"  const endDate = document.getElementById('kapal-e-end')?.value;" + R +
"  const notes = document.getElementById('kapal-e-notes')?.value.trim();" + R +
"  const unitCount = parseInt(document.getElementById('kapal-e-unitcount')?.value) || 0;" + R +
"  if (!totalMt || totalMt <= 0) { showToast('Total MT/M3 wajib diisi'); return; }" + R +
"  if (!startDate || !endDate) { showToast('Tanggal wajib diisi'); return; }" + R +
"  const existingUnits = p.project_units || [];" + R +
"  const unitUpdates = [];" + R +
"  for (let i = 0; i < unitCount; i++) {" + R +
"    const hmAwal = parseFloat(document.getElementById('kapal-eu-hmawal-' + i)?.value);" + R +
"    const hmAkhir = parseFloat(document.getElementById('kapal-eu-hmakhir-' + i)?.value);" + R +
"    const sAwal = parseInt(document.getElementById('kapal-eu-sawal-' + i)?.value);" + R +
"    const sAkhir = parseInt(document.getElementById('kapal-eu-sakhir-' + i)?.value);" + R +
"    const sIsi = parseFloat(document.getElementById('kapal-eu-sisi-' + i)?.value) || 0;" + R +
"    if (isNaN(hmAwal) || isNaN(hmAkhir) || hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
"    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi, hm_gap_reason: existingUnits[i].hm_gap_reason || null });" + R +
"  }" + R +
"  try {" + R +
"    const { error: pe } = await sb.from('projects').update({" + R +
"      nama_kapal: namaKapal || null, pemberi_kerja: pemberiKerja || null," + R +
"      kade: kade || null, cargo_type: cargo || null, total_mt_m3: totalMt," + R +
"      unit_price: unitPrice || null, harga_solar_rpl: solarPrice," + R +
"      start_date: startDate, end_date: endDate, notes: notes || null" + R +
"    }).eq('id', projId);" + R +
"    if (pe) throw pe;" + R +
"    await sb.from('project_units').delete().eq('project_id', projId);" + R +
"    const { error: ue } = await sb.from('project_units').insert(unitUpdates.map(function(u) { return Object.assign({}, u, { project_id: projId }); }));" + R +
"    if (ue) throw ue;" + R +
"    closeModal();" + R +
"    showToast('Proyek berhasil diperbarui!', 'success');" + R +
"    loadProyekKapal();" + R +
"  } catch(e) { showToast('Gagal simpan: ' + e.message); }" + R +
"}" + R + R +

// --- openEditStockpileModal ---
"function openEditStockpileModal(id) {" + R +
"  const p = proyekStockpileData.find(function(x) { return x.id === id; });" + R +
"  if (!p) { showToast('Data tidak ditemukan'); return; }" + R +
"  const units = p.project_units || [];" + R +
"  let unitRowsHTML = '';" + R +
"  units.forEach(function(u, i) {" + R +
"    const unitCode = u.units ? u.units.code : '?';" + R +
"    unitRowsHTML += '<div style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;\">';" + R +
"    unitRowsHTML += '<div style=\"font-size:12px;font-weight:700;color:#1E293B;margin-bottom:8px;\">' + unitCode + '</div>';" + R +
"    unitRowsHTML += '<div style=\"display:grid;grid-template-columns:80px 80px 60px 60px 80px;gap:8px;\">';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"stk-eu-hmawal-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.hm_awal + '\"></div>';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Akhir</label><input type=\"number\" id=\"stk-eu-hmakhir-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.hm_akhir + '\"></div>';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"stk-eu-sawal-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.solar_awal_pct + '\"></div>';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Akhir%</label><input type=\"number\" id=\"stk-eu-sakhir-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.solar_akhir_pct + '\"></div>';" + R +
"    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"stk-eu-sisi-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + (u.solar_isi_liters || 0) + '\"></div>';" + R +
"    unitRowsHTML += '</div></div>';" + R +
"  });" + R +
"  const modalHTML = '<div style=\"padding:24px;max-width:640px;width:100%;max-height:80vh;overflow-y:auto;\">'" + R +
"    + '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;\">Edit Proyek: ' + p.project_code + '</div>'" + R +
"    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Pemberi Kerja</label><input type=\"text\" id=\"stk-e-pemberi\" class=\"finput\" value=\"' + (p.pemberi_kerja || '') + '\"></div>'" + R +
"    + '<div></div>'" + R +
"    + '</div>'" + R +
"    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"stk-e-start\" class=\"finput\" value=\"' + (p.start_date || '') + '\"></div>'" + R +
"    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Selesai *</label><input type=\"date\" id=\"stk-e-end\" class=\"finput\" value=\"' + (p.end_date || '') + '\"></div>'" + R +
"    + '</div>'" + R +
"    + '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Unit yang Mengerjakan (' + units.length + ' unit)</div>'" + R +
"    + unitRowsHTML" + R +
"    + '<input type=\"hidden\" id=\"stk-e-unitcount\" value=\"' + units.length + '\">'" + R +
"    + '<div style=\"display:flex;gap:12px;margin-top:16px;\">'" + R +
"    + '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>'" + R +
"    + '<button onclick=\"submitEditStockpile(\\'' + id + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan Perubahan</button>'" + R +
"    + '</div></div>';" + R +
"  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
"  document.getElementById('modal-overlay').style.display = 'flex';" + R +
"}" + R + R +

// --- submitEditStockpile ---
"async function submitEditStockpile(projId) {" + R +
"  const p = proyekStockpileData.find(function(x) { return x.id === projId; });" + R +
"  if (!p) { showToast('Data tidak ditemukan'); return; }" + R +
"  const pemberiKerja = document.getElementById('stk-e-pemberi')?.value.trim();" + R +
"  const startDate = document.getElementById('stk-e-start')?.value;" + R +
"  const endDate = document.getElementById('stk-e-end')?.value;" + R +
"  const unitCount = parseInt(document.getElementById('stk-e-unitcount')?.value) || 0;" + R +
"  if (!startDate || !endDate) { showToast('Tanggal wajib diisi'); return; }" + R +
"  const existingUnits = p.project_units || [];" + R +
"  const unitUpdates = [];" + R +
"  for (let i = 0; i < unitCount; i++) {" + R +
"    const hmAwal = parseFloat(document.getElementById('stk-eu-hmawal-' + i)?.value);" + R +
"    const hmAkhir = parseFloat(document.getElementById('stk-eu-hmakhir-' + i)?.value);" + R +
"    const sAwal = parseInt(document.getElementById('stk-eu-sawal-' + i)?.value);" + R +
"    const sAkhir = parseInt(document.getElementById('stk-eu-sakhir-' + i)?.value);" + R +
"    const sIsi = parseFloat(document.getElementById('stk-eu-sisi-' + i)?.value) || 0;" + R +
"    if (isNaN(hmAwal) || isNaN(hmAkhir) || hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
"    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi });" + R +
"  }" + R +
"  try {" + R +
"    const { error: pe } = await sb.from('projects').update({" + R +
"      pemberi_kerja: pemberiKerja || null, start_date: startDate, end_date: endDate" + R +
"    }).eq('id', projId);" + R +
"    if (pe) throw pe;" + R +
"    await sb.from('project_units').delete().eq('project_id', projId);" + R +
"    const { error: ue } = await sb.from('project_units').insert(unitUpdates.map(function(u) { return Object.assign({}, u, { project_id: projId }); }));" + R +
"    if (ue) throw ue;" + R +
"    closeModal();" + R +
"    showToast('Proyek berhasil diperbarui!', 'success');" + R +
"    loadProyekStockpile();" + R +
"  } catch(e) { showToast('Gagal simpan: ' + e.message); }" + R +
"}" + R + R +

// --- downloadImportTemplate ---
"function downloadImportTemplate(type) {" + R +
"  const templates = {" + R +
"    units: 'unit_code,unit_name,model,current_hm,operator_email\\r\\nK1,Kobelco K1,SK200-8,6000,operator@example.com'," + R +
"    intervals: 'type_name,interval_hm\\r\\nOil Change,250\\r\\nGrease,125'," + R +
"    log: 'unit_code,maintenance_type,service_date,hm_at_service,mekanik_name,parts_used,cost_idr,notes\\r\\nK1,Oil Change,01/08/2026,6000,Yadi,Filter oli,150000,'" + R +
"  };" + R +
"  const names = { units: 'template_units.csv', intervals: 'template_intervals.csv', log: 'template_service_log.csv' };" + R +
"  const blob = new Blob([templates[type]], { type: 'text/csv' });" + R +
"  const url = URL.createObjectURL(blob);" + R +
"  const a = document.createElement('a');" + R +
"  a.href = url; a.download = names[type]; a.click();" + R +
"  URL.revokeObjectURL(url);" + R +
"}" + R + R;

replaceExact(
  "async function loadProyekRingkasan() {",
  newFunctions + "async function loadProyekRingkasan() {",
  'Insert new edit/delete/download functions before loadProyekRingkasan'
);

// ─── 12. Add "Download Template" buttons to Import screen ────────────────────
// Units card
replaceExact(
  '<div style="font-size:12px;color:#64748B;margin-bottom:12px;">Format: unit_code,unit_name,model,current_hm &mdash; jadwal maintenance otomatis dibuat</div>' + R +
  '          <input type="file" id="imp-units-file"',
  '<div style="font-size:12px;color:#64748B;margin-bottom:8px;">Format: unit_code,unit_name,model,current_hm &mdash; jadwal maintenance otomatis dibuat</div>' + R +
  '          <button onclick="downloadImportTemplate(\'units\')" style="background:#F0FDF4;border:1px solid #86EFAC;color:#16A34A;font-size:12px;font-weight:600;padding:5px 12px;border-radius:6px;cursor:pointer;margin-bottom:10px;">&#8595; Download Template</button>' + R +
  '          <input type="file" id="imp-units-file"',
  'Import Units: add Download Template button'
);

// Intervals card
replaceExact(
  '<div style="font-size:12px;color:#64748B;margin-bottom:12px;">Format: type_name,interval_hm &mdash; berlaku untuk semua unit</div>' + R +
  '          <input type="file" id="imp-intervals-file"',
  '<div style="font-size:12px;color:#64748B;margin-bottom:8px;">Format: type_name,interval_hm &mdash; berlaku untuk semua unit</div>' + R +
  '          <button onclick="downloadImportTemplate(\'intervals\')" style="background:#F0FDF4;border:1px solid #86EFAC;color:#16A34A;font-size:12px;font-weight:600;padding:5px 12px;border-radius:6px;cursor:pointer;margin-bottom:10px;">&#8595; Download Template</button>' + R +
  '          <input type="file" id="imp-intervals-file"',
  'Import Intervals: add Download Template button'
);

// Service Log card
replaceExact(
  '<div style="font-size:12px;color:#64748B;margin-bottom:12px;">Format: unit_code,maintenance_type,service_date,hm_at_service,mekanik_name,parts_used,cost_idr,notes</div>' + R +
  '          <input type="file" id="imp-log-file"',
  '<div style="font-size:12px;color:#64748B;margin-bottom:8px;">Format: unit_code,maintenance_type,service_date,hm_at_service,mekanik_name,parts_used,cost_idr,notes</div>' + R +
  '          <button onclick="downloadImportTemplate(\'log\')" style="background:#F0FDF4;border:1px solid #86EFAC;color:#16A34A;font-size:12px;font-weight:600;padding:5px 12px;border-radius:6px;cursor:pointer;margin-bottom:10px;">&#8595; Download Template</button>' + R +
  '          <input type="file" id="imp-log-file"',
  'Import Service Log: add Download Template button'
);

// ─── Verify JS syntax ─────────────────────────────────────────────────────────
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll patches applied. Running syntax check...');

const { execSync } = require('child_process');
try {
  const scriptStart = content.indexOf('<script>') + '<script>'.length;
  const scriptEnd = content.lastIndexOf('</script>');
  const js = content.slice(scriptStart, scriptEnd);
  const tmpFile = path.join(__dirname, '_syntax_check_tmp.js');
  fs.writeFileSync(tmpFile, js, 'utf8');
  execSync('node --check "' + tmpFile + '"');
  fs.unlinkSync(tmpFile);
  console.log('Syntax OK');
} catch(e) {
  console.error('SYNTAX ERROR:', e.message);
  process.exit(1);
}

console.log('\nDone. Commit and deploy.');
