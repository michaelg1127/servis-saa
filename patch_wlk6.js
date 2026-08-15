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

// Insert new functions before openCloseWoodlogKapalModal
const newFunctions = `async function openEditWoodlogKapalModal(id) {
  const p = _wlKapalCache[id];
  if (!p) { showToast('Data tidak ditemukan'); return; }
  const units = p.project_units || [];
  // Fetch actual fill liters per unit for Solar Isi display
  const fillMap = await fetchFillMap([id]);
  const unitFills = (fillMap[id] || {});
  const unitRowsHTML = units.map(function(pu, i) {
    const unitCode = pu.units ? pu.units.code : '?';
    const fillL = unitFills[pu.unit_id];
    const sisiDisplay = fillL != null ? fillL.toFixed(1) + ' L (aktual)' : '—';
    return '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;">' +
      '<div style="font-size:12px;font-weight:700;color:#1E293B;margin-bottom:8px;">' + unitCode + '</div>' +
      '<div style="display:grid;grid-template-columns:80px 80px 60px 60px 80px;gap:8px;">' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">HM Awal</label><input type="number" id="wledit-hmawal-' + i + '" class="finput" style="font-size:12px;padding:6px 8px;" value="' + (pu.hm_awal != null ? pu.hm_awal : '') + '" step="0.1"></div>' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">HM Akhir</label><input type="number" id="wledit-hmakhir-' + i + '" class="finput" style="font-size:12px;padding:6px 8px;" value="' + (pu.hm_akhir != null ? pu.hm_akhir : '') + '" placeholder="Opsional" step="0.1"></div>' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Awal%</label><input type="number" id="wledit-sawal-' + i + '" class="finput" style="font-size:12px;padding:6px 8px;" value="' + (pu.solar_awal_pct != null ? pu.solar_awal_pct : '') + '" min="0" max="100"></div>' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Akhir%</label><input type="number" id="wledit-sakhir-' + i + '" class="finput" style="font-size:12px;padding:6px 8px;" value="' + (pu.solar_akhir_pct != null ? pu.solar_akhir_pct : '') + '" min="0" max="100"></div>' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Isi</label><div style="font-size:12px;padding:6px 8px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;color:#64748B;">' + sisiDisplay + '</div></div>' +
      '</div></div>';
  }).join('');
  // Existing salary rows for STD pre-fill
  const { data: existingSals } = await sb.from('woodlog_operator_salary').select('*').eq('project_id', id);
  const salByOp = {};
  (existingSals || []).forEach(function(s) { salByOp[s.operator_name] = s; });
  const bangauRows = WL_BANGAU_OPS.map(function(op) {
    const existing = salByOp[op];
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
      '<span style="width:100px;font-size:13px;font-weight:600;">' + op + '</span>' +
      '<span id="wledit-bang-sal-' + op + '" style="font-size:13px;font-weight:700;color:#1D4ED8;">Rp ' + (existing ? Number(existing.salary_amount).toLocaleString('id') : '0') + '</span>' +
      '</div>';
  }).join('');
  const stdRows = WL_STD_OPS.map(function(op) {
    const existing = salByOp[op];
    const existingTon = existing ? Number(existing.tonnage_mt || 0) : 0;
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
      '<span style="width:100px;font-size:13px;font-weight:600;">' + op + '</span>' +
      '<input type="number" id="wledit-std-ton-' + op + '" class="finput" style="width:110px;font-size:13px;" placeholder="Tonnage MT" min="0" value="' + (existingTon > 0 ? existingTon : '') + '" oninput="wlEditSalaryPreview()">' +
      '<span id="wledit-std-sal-' + op + '" style="font-size:13px;font-weight:700;color:#1D4ED8;width:120px;">Rp ' + (existing ? Number(existing.salary_amount).toLocaleString('id') : '0') + '</span>' +
      '</div>';
  }).join('');
  const modalHTML = '<div style="padding:24px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;">' +
    '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;">Edit Proyek: ' + p.project_code + '</div>' +
    '<div style="font-size:13px;color:#64748B;margin-bottom:16px;">' + (p.nama_kapal || '') + '</div>' +
    '<input type="hidden" id="wledit-unitcount" value="' + units.length + '">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nama Kapal *</label><input type="text" id="wledit-namakapal" class="finput" value="' + (p.nama_kapal || '') + '"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Pemberi Kerja</label><input type="text" id="wledit-pemberi" class="finput" value="' + (p.pemberi_kerja || '') + '"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tgl Mulai *</label><input type="date" id="wledit-start" class="finput" value="' + (p.start_date || '') + '"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tgl Selesai</label><input type="date" id="wledit-end" class="finput" value="' + (p.end_date || '') + '"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">BL Tonnage (MT)</label><input type="number" id="wledit-bl" class="finput" min="0" value="' + (p.total_mt_m3 || '') + '" oninput="wlEditSalaryPreview()"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Rate/MT (Rp)</label><input type="number" id="wledit-rate" class="finput" min="0" value="' + (p.unit_price || '') + '"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Harga Solar (Rp/L)</label><input type="number" id="wledit-solar" class="finput" min="0" value="' + (p.harga_solar_rpl || '') + '"></div>' +
    '</div>' +
    '<div style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Catatan</label><textarea id="wledit-notes" class="finput" rows="2">' + (p.notes || '') + '</textarea></div>' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Unit HM + Solar (' + units.length + ' unit)</div>' +
    unitRowsHTML +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary Bangau (J02/J03) — auto dari BL</div>' +
    '<div style="background:#EFF6FF;border-radius:10px;padding:12px;margin-bottom:16px;">' + bangauRows + '</div>' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary STD (J45–J48) — input tonnage</div>' +
    '<div style="background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;">' + stdRows + '</div>' +
    '<div style="display:flex;gap:12px;margin-top:16px;">' +
    '<button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>' +
    '<button onclick="submitEditWoodlogKapal(\'' + id + '\')" class="btn-primary" style="flex:2;">Simpan Perubahan</button>' +
    '</div></div>';
  document.getElementById('modal-box').innerHTML = modalHTML;
  document.getElementById('modal-overlay').style.display = 'flex';
  wlEditSalaryPreview();
}

function wlEditSalaryPreview() {
  const bl = parseFloat(document.getElementById('wledit-bl') ? document.getElementById('wledit-bl').value : '') || 0;
  const bangauSal = Math.round(bl * 0.9 / 4 * 800);
  WL_BANGAU_OPS.forEach(function(op) {
    const el = document.getElementById('wledit-bang-sal-' + op);
    if (el) el.textContent = 'Rp ' + bangauSal.toLocaleString('id');
  });
  WL_STD_OPS.forEach(function(op) {
    const inp = document.getElementById('wledit-std-ton-' + op);
    const ton = parseFloat(inp ? inp.value : '') || 0;
    const salEl = document.getElementById('wledit-std-sal-' + op);
    if (salEl) salEl.textContent = 'Rp ' + Math.round(ton * 750).toLocaleString('id');
  });
}

async function submitEditWoodlogKapal(id) {
  const namaKapal = (document.getElementById('wledit-namakapal') || {}).value ? document.getElementById('wledit-namakapal').value.trim() : '';
  const pemberi = (document.getElementById('wledit-pemberi') || {}).value ? document.getElementById('wledit-pemberi').value.trim() : null;
  const start = (document.getElementById('wledit-start') || {}).value || '';
  const end = (document.getElementById('wledit-end') || {}).value || null;
  const bl = parseFloat((document.getElementById('wledit-bl') || {}).value) || null;
  const rate = parseFloat((document.getElementById('wledit-rate') || {}).value) || null;
  const solar = parseFloat((document.getElementById('wledit-solar') || {}).value) || null;
  const notes = (document.getElementById('wledit-notes') || {}).value ? document.getElementById('wledit-notes').value.trim() : null;
  if (!namaKapal || !start) { showToast('Nama Kapal dan Tgl Mulai wajib diisi.'); return; }
  const p = _wlKapalCache[id];
  if (!p) { showToast('Data tidak ditemukan'); return; }
  const units = p.project_units || [];
  const unitCount = parseInt((document.getElementById('wledit-unitcount') || {}).value) || 0;
  const unitUpdates = [];
  for (let i = 0; i < unitCount; i++) {
    const hmAwal = parseFloat((document.getElementById('wledit-hmawal-' + i) || {}).value);
    const hmAkhir = parseFloat((document.getElementById('wledit-hmakhir-' + i) || {}).value);
    const sAwal = parseFloat((document.getElementById('wledit-sawal-' + i) || {}).value);
    const sAkhir = parseFloat((document.getElementById('wledit-sakhir-' + i) || {}).value);
    unitUpdates.push({
      project_id: id,
      unit_id: units[i].unit_id,
      hm_awal: isNaN(hmAwal) ? null : hmAwal,
      hm_akhir: isNaN(hmAkhir) ? null : hmAkhir,
      solar_awal_pct: isNaN(sAwal) ? null : sAwal,
      solar_akhir_pct: isNaN(sAkhir) ? null : sAkhir
    });
  }
  // Build salary inserts
  const salaryInserts = [];
  const blVal = bl || 0;
  if (blVal > 0) {
    const bangauSal = Math.round(blVal * 0.9 / 4 * 800);
    const bl4 = blVal * 0.9 / 4;
    WL_BANGAU_OPS.forEach(function(op) {
      salaryInserts.push({ project_id: id, operator_name: op, unit_type: 'bangau', tonnage_mt: bl4, salary_amount: bangauSal });
    });
  }
  WL_STD_OPS.forEach(function(op) {
    const inp = document.getElementById('wledit-std-ton-' + op);
    const ton = parseFloat(inp ? inp.value : '') || 0;
    if (ton > 0) salaryInserts.push({ project_id: id, operator_name: op, unit_type: 'std', tonnage_mt: ton, salary_amount: Math.round(ton * 750) });
  });
  try {
    const { error: pe } = await sb.from('projects').update({
      nama_kapal: namaKapal || null, pemberi_kerja: pemberi || null,
      start_date: start, end_date: end || null,
      total_mt_m3: bl, unit_price: rate, harga_solar_rpl: solar, notes: notes || null
    }).eq('id', id);
    if (pe) throw pe;
    // Update project_units
    await Promise.all(unitUpdates.map(function(u) {
      return sb.from('project_units').update({
        hm_awal: u.hm_awal, hm_akhir: u.hm_akhir,
        solar_awal_pct: u.solar_awal_pct, solar_akhir_pct: u.solar_akhir_pct
      }).eq('project_id', id).eq('unit_id', u.unit_id);
    }));
    // Delete + re-insert salary rows
    await sb.from('woodlog_operator_salary').delete().eq('project_id', id);
    if (salaryInserts.length > 0) {
      const { error: se } = await sb.from('woodlog_operator_salary').insert(salaryInserts);
      if (se) throw se;
    }
    // Clear detail rendered flag so it re-renders with fresh data
    const detailRow = document.getElementById('wl-kapal-detail-' + id);
    if (detailRow) detailRow.dataset.rendered = '';
    closeModal();
    showToast('Proyek berhasil diperbarui!', 'success');
    await loadWoodlogKapal();
  } catch(e) { showToast('Gagal simpan: ' + e.message); }
}

`;

replaceExact(
  'function openCloseWoodlogKapalModal(id) {',
  newFunctions + 'function openCloseWoodlogKapalModal(id) {',
  'insert openEditWoodlogKapalModal + wlEditSalaryPreview + submitEditWoodlogKapal before openCloseWoodlogKapalModal'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
