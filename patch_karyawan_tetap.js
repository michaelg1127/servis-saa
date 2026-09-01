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

// ── PATCH 1: Sidebar nav link ────────────────────────────────────────────────
replaceExact(
  '    <div class="slink" onclick="switchAdmin(\'pbm-gaji\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>PBM Gaji</div>',
  '    <div class="slink" onclick="switchAdmin(\'pbm-gaji\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>PBM Gaji</div>' + N +
  '    <div class="slink" onclick="switchAdmin(\'karyawan-tetap\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"/></svg>Karyawan Tetap</div>',
  'PATCH 1: add Karyawan Tetap sidebar link'
);

// ── PATCH 2: Admin screen HTML ───────────────────────────────────────────────
replaceExact(
  '<div id="pbm-drilldown-modal"',
  [
    '<div id="admin-screen-karyawan-tetap" class="dscreen">',
    '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">',
    '    <div style="font-size:22px;font-weight:800;color:#1E293B;">Karyawan Tetap</div>',
    '    <button onclick="openKaryawanModal()" class="btn-primary" style="padding:8px 18px;font-size:14px;">+ Tambah</button>',
    '  </div>',
    '  <div id="kt-list" style="overflow-x:auto;"></div>',
    '</div>',
    '<div id="pbm-drilldown-modal"'
  ].join(N),
  'PATCH 2: add Karyawan Tetap admin screen'
);

// ── PATCH 3: switchAdmin labels ──────────────────────────────────────────────
replaceExact(
  "'pbm-gaji':'PBM Gaji' };",
  "'pbm-gaji':'PBM Gaji', 'karyawan-tetap':'Karyawan Tetap' };",
  'PATCH 3: add karyawan-tetap to switchAdmin labels'
);

// ── PATCH 4: switchAdmin lazy load ───────────────────────────────────────────
replaceExact(
  "  if (name === 'riwayat') initAdminRiwayat();",
  "  if (name === 'riwayat') initAdminRiwayat();" + N + "  if (name === 'karyawan-tetap') loadKaryawanTetap();",
  'PATCH 4: add karyawan-tetap lazy load'
);

// ── PATCH 5: saveKasbonRow — support data-gpok for fixed staff ───────────────
replaceExact(
  "  if (grandEl) grandEl.textContent = fmtRp(workTotal + 3100000 - amount);",
  "  var _gpok2 = btn.dataset.gpok !== undefined ? parseInt(btn.dataset.gpok) : 3100000;" + N +
  "  if (grandEl) grandEl.textContent = fmtRp(workTotal + _gpok2 - amount);",
  'PATCH 5: saveKasbonRow supports data-gpok for fixed staff'
);

// ── PATCH 6: loadProyekRingkasan — add staff_salary fetch ────────────────────
replaceExact(
  [
    "    const [projRes, unitRes, kasbonRes] = await Promise.all([",
    "      sb.from('projects')",
    "        .select('*, project_units(*, units(code, name, operator_name))')",
    "        .in('type', ['kapal', 'stockpile'])",
    "        .gte('end_date', firstDay)",
    "        .lte('end_date', lastDay),",
    "      sb.from('units').select('code, operator_name'),",
    "      sb.from('proyek_kasbon').select('*').eq('month_year', monthYear)",
    "    ]);",
    "    if (projRes.error) throw projRes.error;",
    "    renderProyekRingkasan(projRes.data || [], unitRes.data || [], kasbonRes.data || [], monthYear);"
  ].join(N),
  [
    "    const [projRes, unitRes, kasbonRes, staffRes] = await Promise.all([",
    "      sb.from('projects')",
    "        .select('*, project_units(*, units(code, name, operator_name))')",
    "        .in('type', ['kapal', 'stockpile'])",
    "        .gte('end_date', firstDay)",
    "        .lte('end_date', lastDay),",
    "      sb.from('units').select('code, operator_name'),",
    "      sb.from('proyek_kasbon').select('*').eq('month_year', monthYear),",
    "      sb.from('staff_salary').select('id,name,role,monthly_amount,bank_name,bank_account_number,bank_account_name').eq('is_active', true).order('name')",
    "    ]);",
    "    if (projRes.error) throw projRes.error;",
    "    renderProyekRingkasan(projRes.data || [], unitRes.data || [], kasbonRes.data || [], monthYear, staffRes.data || []);"
  ].join(N),
  'PATCH 6: loadProyekRingkasan — fetch staff_salary'
);

// ── PATCH 7a: renderProyekRingkasan — add fixedStaff param ──────────────────
replaceExact(
  "function renderProyekRingkasan(projects, allUnits, kasbons, monthYear) {",
  "function renderProyekRingkasan(projects, allUnits, kasbons, monthYear, fixedStaff) {",
  'PATCH 7a: add fixedStaff param to renderProyekRingkasan'
);

// ── PATCH 7b: Batch 31 — add Karyawan Tetap section + include in total ───────
replaceExact(
  [
    "    h += '</tbody></table></div>';",
    "    var total31 = opNames.reduce(function(acc, name) { var s = opMap31[name] || { total: 0 }; var kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0; return acc + s.total + 3100000 - kasbon; }, 0);",
    "    h += '<div style=\"display:flex;justify-content:flex-end;align-items:center;padding:10px 10px 6px;border-top:2px solid #BBF7D0;margin-top:6px;\"><span id=\"proy-batch31-total\" style=\"font-size:14px;font-weight:800;color:#16A34A;\">Total Transfer: ' + fmtRp(total31) + '</span></div>';",
    "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Lunas Batch 31</button></div>';"
  ].join(N),
  [
    "    h += '</tbody></table></div>';",
    "    if (fixedStaff && fixedStaff.length > 0) {",
    "      h += '<div style=\"margin-top:16px;margin-bottom:8px;font-size:13px;font-weight:700;color:#1E293B;border-top:1px solid #BBF7D0;padding-top:12px;\">Karyawan Tetap</div>';",
    "      h += '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;\"><thead><tr style=\"background:#DCFCE7;\"><th style=\"padding:8px 10px;text-align:left;\">Nama</th><th style=\"padding:8px 10px;text-align:left;\">Jabatan</th><th style=\"padding:8px 10px;text-align:right;\">Gaji Tetap</th><th style=\"padding:8px 10px;text-align:right;color:#DC2626;\">Kasbon</th><th style=\"padding:8px 10px;text-align:center;\">Ubah Kasbon</th><th style=\"padding:8px 10px;text-align:right;\">Grand Total</th></tr></thead><tbody>';",
    "      (fixedStaff || []).forEach(function(fs) {",
    "        var kasbon = kasbonMap[fs.name] ? kasbonMap[fs.name].amount : 0;",
    "        var grandTotal = fs.monthly_amount - kasbon;",
    "        var safeId = 'kt_' + fs.name.replace(/\\s+/g, '_');",
    "        var safeName = fs.name.replace(/\"/g, '&quot;');",
    "        h += '<tr style=\"border-bottom:1px solid #BBF7D0;\"><td style=\"padding:8px 10px;font-weight:600;\">' + fs.name + '</td>';",
    "        h += '<td style=\"padding:8px 10px;color:#64748B;\">' + (fs.role || '—') + '</td>';",
    "        h += '<td style=\"padding:8px 10px;text-align:right;\">' + fmtRp(fs.monthly_amount) + '</td>';",
    "        h += '<td id=\"proy-kasbon-saved-' + safeId + '\" style=\"padding:8px 10px;text-align:right;font-weight:600;color:' + (kasbon > 0 ? '#DC2626' : '#94A3B8') + ';\">' + (kasbon > 0 ? fmtRp(kasbon) : '—') + '</td>';",
    "        h += '<td style=\"padding:8px 10px;text-align:center;\"><div style=\"display:flex;gap:4px;align-items:center;justify-content:center;\"><input id=\"proy-kasbon-' + safeId + '\" type=\"number\" class=\"finput\" style=\"width:90px;text-align:right;\" placeholder=\"0\"><button data-safe=\"' + safeId + '\" data-op=\"' + safeName + '\" data-worktotal=\"' + fs.monthly_amount + '\" data-gpok=\"0\" data-monthyear=\"' + monthYear + '\" onclick=\"saveKasbonRow(this)\" style=\"background:#0F172A;color:white;border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;\">Simpan</button></div></td>';",
    "        h += '<td id=\"proy-grand-' + safeId + '\" style=\"padding:8px 10px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grandTotal) + '</td></tr>';",
    "      });",
    "      h += '</tbody></table></div>';",
    "    }",
    "    var _totalFixed = (fixedStaff || []).reduce(function(acc, fs) { var kb = kasbonMap[fs.name] ? kasbonMap[fs.name].amount : 0; return acc + fs.monthly_amount - kb; }, 0);",
    "    var total31 = opNames.reduce(function(acc, name) { var s = opMap31[name] || { total: 0 }; var kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0; return acc + s.total + 3100000 - kasbon; }, 0) + _totalFixed;",
    "    h += '<div style=\"display:flex;justify-content:flex-end;align-items:center;padding:10px 10px 6px;border-top:2px solid #BBF7D0;margin-top:6px;\"><span id=\"proy-batch31-total\" style=\"font-size:14px;font-weight:800;color:#16A34A;\">Total Transfer: ' + fmtRp(total31) + '</span></div>';",
    "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Lunas Batch 31</button></div>';"
  ].join(N),
  'PATCH 7b: add Karyawan Tetap section in Batch 31 Ringkasan'
);

// ── PATCH 8: exportBatchExcel — fetch staff_salary ───────────────────────────
replaceExact(
  [
    "  let kasbonMap = {};",
    "  if (batchType === 'end_of_month') {",
    "    const { data: kb } = await sb.from('proyek_kasbon').select('operator_name, amount').eq('month_year', monthYear);",
    "    (kb || []).forEach(function(k) { kasbonMap[k.operator_name] = Number(k.amount); });",
    "  }"
  ].join(N),
  [
    "  let kasbonMap = {};",
    "  let fixedStaff = [];",
    "  if (batchType === 'end_of_month') {",
    "    const { data: kb } = await sb.from('proyek_kasbon').select('operator_name, amount').eq('month_year', monthYear);",
    "    (kb || []).forEach(function(k) { kasbonMap[k.operator_name] = Number(k.amount); });",
    "    const { data: _fsData } = await sb.from('staff_salary').select('id,name,role,monthly_amount,bank_name,bank_account_number,bank_account_name').eq('is_active', true).order('name');",
    "    fixedStaff = _fsData || [];",
    "  }"
  ].join(N),
  'PATCH 8: exportBatchExcel — fetch staff_salary for end_of_month'
);

// ── PATCH 9: SLIP GAJI — fixed staff slips after unit loop ──────────────────
replaceExact(
  [
    "    var totR=wsSlip.addRow(['', '', 'TOTAL BERSIH:', '', grandTotal]); styleTot(totR); totR.getCell(5).numFmt=NF;",
    "    wsSlip.addRow([]);",
    "    wsSlip.addRow([]);",
    "  });",
    "  // TRANSFER sheet"
  ].join(N),
  [
    "    var totR=wsSlip.addRow(['', '', 'TOTAL BERSIH:', '', grandTotal]); styleTot(totR); totR.getCell(5).numFmt=NF;",
    "    wsSlip.addRow([]);",
    "    wsSlip.addRow([]);",
    "  });",
    "  if (fixedStaff.length > 0) {",
    "    styleSec(wsSlip.addRow(['KARYAWAN TETAP', '', '', '', '']));",
    "    wsSlip.addRow([]);",
    "    fixedStaff.forEach(function(fs) {",
    "      var _fskb = kasbonMap[fs.name] || 0;",
    "      var _fsgt = fs.monthly_amount - _fskb;",
    "      styleHdr(wsSlip.addRow(['Nama:', fs.name, '', 'Jabatan:', fs.role || '—']));",
    "      styleHdr(wsSlip.addRow(['Periode:', periodeStr, '', '', '']));",
    "      wsSlip.addRow([]);",
    "      var _fssr = wsSlip.addRow(['', '', 'Gaji Tetap:', '', fs.monthly_amount]); _fssr.getCell(3).font={bold:true}; _fssr.getCell(5).numFmt=NF;",
    "      if (_fskb > 0) { var _fskr = wsSlip.addRow(['', '', 'Kasbon:', '', -_fskb]); _fskr.getCell(3).font={bold:true,color:{argb:'FFDC2626'}}; _fskr.getCell(5).numFmt=NF; }",
    "      var _fstr = wsSlip.addRow(['', '', 'TOTAL BERSIH:', '', _fsgt]); styleTot(_fstr); _fstr.getCell(5).numFmt=NF;",
    "      wsSlip.addRow([]); wsSlip.addRow([]);",
    "    });",
    "  }",
    "  // TRANSFER sheet"
  ].join(N),
  'PATCH 9: SLIP GAJI — add fixed staff slips'
);

// ── PATCH 10: TRANSFER — fixed staff rows before TOTAL ───────────────────────
replaceExact(
  [
    "  });",
    "  var totTr = wsTransfer.addRow(['', 'TOTAL', '', trTotKerja, trTotPokok, trTotGrand, trTotFee, trTotNet, '', '', '']);",
    "  styleGrt(totTr); [4,5,6,7,8].forEach(function(ci) { totTr.getCell(ci).numFmt=NF; });"
  ].join(N),
  [
    "  });",
    "  if (fixedStaff.length > 0) {",
    "    fixedStaff.forEach(function(fs) {",
    "      var _fskb2 = kasbonMap[fs.name] || 0;",
    "      var _fsgr = fs.monthly_amount - _fskb2;",
    "      var _fsBCA = (fs.bank_name || '').toUpperCase().includes('BCA');",
    "      var _fsAF = _fsBCA ? 0 : 2500;",
    "      var _fsNet = _fsgr - _fsAF;",
    "      var _fsDr = wsTransfer.addRow([no++, fs.name, fs.role || '—', 0, fs.monthly_amount, _fsgr, _fsAF, _fsNet, fs.bank_name||'---', fs.bank_account_number||'---', fs.bank_account_name||'---']);",
    "      [4,5,6,7,8].forEach(function(ci) { _fsDr.getCell(ci).numFmt=NF; });",
    "      trTotPokok += fs.monthly_amount; trTotGrand += _fsgr; trTotFee += _fsAF; trTotNet += _fsNet;",
    "    });",
    "  }",
    "  var totTr = wsTransfer.addRow(['', 'TOTAL', '', trTotKerja, trTotPokok, trTotGrand, trTotFee, trTotNet, '', '', '']);",
    "  styleGrt(totTr); [4,5,6,7,8].forEach(function(ci) { totTr.getCell(ci).numFmt=NF; });"
  ].join(N),
  'PATCH 10: TRANSFER — add fixed staff rows before TOTAL'
);

// ── PATCH 11: Karyawan Tetap CRUD functions ──────────────────────────────────
replaceExact(
  "function exportBatch16() { exportBatchExcel('mid_month'); }",
  [
    "var _ktData = {};",
    "function loadKaryawanTetap() {",
    "  var el = document.getElementById('kt-list');",
    "  if (!el) return;",
    "  el.innerHTML = '<div style=\"padding:20px;text-align:center;\"><div class=\"spinner\"></div></div>';",
    "  sb.from('staff_salary').select('id,name,role,monthly_amount,bank_name,bank_account_number,bank_account_name,is_active').order('name').then(function(res) {",
    "    if (res.error) { el.innerHTML = '<div style=\"color:#EF4444;\">Error: ' + res.error.message + '</div>'; return; }",
    "    renderKaryawanTetap(res.data || []);",
    "  });",
    "}",
    "function renderKaryawanTetap(staff) {",
    "  _ktData = {};",
    "  staff.forEach(function(s) { _ktData[s.id] = s; });",
    "  var el = document.getElementById('kt-list');",
    "  if (!el) return;",
    "  if (staff.length === 0) { el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Belum ada karyawan tetap. Klik + Tambah untuk menambah.</div>'; return; }",
    "  var rows = '';",
    "  staff.forEach(function(s) {",
    "    rows += '<tr style=\"border-bottom:1px solid #F1F5F9;opacity:' + (s.is_active ? '1' : '0.45') + ';\">' +",
    "      '<td style=\"padding:10px 12px;font-weight:600;\">' + s.name + '</td>' +",
    "      '<td style=\"padding:10px 12px;color:#64748B;\">' + (s.role || '—') + '</td>' +",
    "      '<td style=\"padding:10px 12px;text-align:right;font-weight:600;\">' + fmtRp(s.monthly_amount) + '</td>' +",
    "      '<td style=\"padding:10px 12px;color:#64748B;\">' + (s.bank_name || '—') + '</td>' +",
    "      '<td style=\"padding:10px 12px;color:#64748B;\">' + (s.bank_account_number || '—') + '</td>' +",
    "      '<td style=\"padding:10px 12px;color:#64748B;\">' + (s.bank_account_name || '—') + '</td>' +",
    "      '<td style=\"padding:10px 12px;white-space:nowrap;\">' +",
    "        '<button data-kid=\"' + s.id + '\" onclick=\"openKaryawanModal(this.dataset.kid)\" style=\"background:#EFF6FF;color:#1D4ED8;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-weight:700;margin-right:4px;\">Edit</button>' +",
    "        '<button data-kid=\"' + s.id + '\" data-kstate=\"' + !s.is_active + '\" onclick=\"toggleKaryawanActive(this.dataset.kid,this.dataset.kstate===\\'true\\')\" style=\"background:' + (s.is_active ? '#FEE2E2;color:#DC2626' : '#ECFDF5;color:#16A34A') + ';border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-weight:700;\">' + (s.is_active ? 'Nonaktifkan' : 'Aktifkan') + '</button>' +",
    "      '</td></tr>';",
    "  });",
    "  el.innerHTML = '<table style=\"width:100%;border-collapse:collapse;font-size:13px;\">' +",
    "    '<thead><tr style=\"background:#F8FAFC;border-bottom:2px solid #E2E8F0;\">' +",
    "    '<th style=\"padding:10px 12px;text-align:left;\">Nama</th>' +",
    "    '<th style=\"padding:10px 12px;text-align:left;\">Jabatan</th>' +",
    "    '<th style=\"padding:10px 12px;text-align:right;\">Gaji Tetap</th>' +",
    "    '<th style=\"padding:10px 12px;text-align:left;\">Bank</th>' +",
    "    '<th style=\"padding:10px 12px;text-align:left;\">No. Rekening</th>' +",
    "    '<th style=\"padding:10px 12px;text-align:left;\">Nama Rekening</th>' +",
    "    '<th style=\"padding:10px 12px;\"></th>' +",
    "    '</tr></thead><tbody>' + rows + '</tbody></table>';",
    "}",
    "function openKaryawanModal(id) {",
    "  var d = id ? (_ktData[id] || {}) : {};",
    "  var modalHTML = '<div style=\"padding:24px;max-width:520px;width:100%;\">' +",
    "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;\">' + (d.id ? 'Edit' : 'Tambah') + ' Karyawan Tetap</div>' +",
    "    '<input type=\"hidden\" id=\"kt-id\" value=\"' + (d.id || '') + '\">' +",
    "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +",
    "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Nama *</label><input type=\"text\" id=\"kt-name\" class=\"finput\" value=\"' + (d.name || '') + '\" placeholder=\"Nama lengkap\"></div>' +",
    "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jabatan</label><input type=\"text\" id=\"kt-role\" class=\"finput\" value=\"' + (d.role || '') + '\" placeholder=\"mis: Supervisor\"></div>' +",
    "    '</div>' +",
    "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Gaji Tetap / Bulan (Rp) *</label><input type=\"number\" id=\"kt-amount\" class=\"finput\" value=\"' + (d.monthly_amount || '') + '\" placeholder=\"mis: 5000000\"></div>' +",
    "    '<div style=\"font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;border-top:1px solid #E2E8F0;padding-top:12px;\">Info Bank</div>' +",
    "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +",
    "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Nama Bank</label><input type=\"text\" id=\"kt-bank\" class=\"finput\" value=\"' + (d.bank_name || '') + '\" placeholder=\"mis: BCA\"></div>' +",
    "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">No. Rekening</label><input type=\"text\" id=\"kt-accnum\" class=\"finput\" value=\"' + (d.bank_account_number || '') + '\" placeholder=\"No. rekening\"></div>' +",
    "    '</div>' +",
    "    '<div style=\"margin-bottom:20px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Nama Rekening</label><input type=\"text\" id=\"kt-accname\" class=\"finput\" value=\"' + (d.bank_account_name || '') + '\" placeholder=\"Nama pemilik rekening\"></div>' +",
    "    '<div style=\"display:flex;gap:12px;\">' +",
    "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +",
    "    '<button onclick=\"submitKaryawan()\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>' +",
    "    '</div></div>';",
    "  document.getElementById('modal-box').innerHTML = modalHTML;",
    "  document.getElementById('modal-overlay').style.display = 'flex';",
    "}",
    "async function submitKaryawan() {",
    "  var id = document.getElementById('kt-id')?.value;",
    "  var name = document.getElementById('kt-name')?.value.trim();",
    "  var role = document.getElementById('kt-role')?.value.trim();",
    "  var amount = parseInt(document.getElementById('kt-amount')?.value) || 0;",
    "  var bank = document.getElementById('kt-bank')?.value.trim();",
    "  var accNum = document.getElementById('kt-accnum')?.value.trim();",
    "  var accName = document.getElementById('kt-accname')?.value.trim();",
    "  if (!name) { showToast('Nama wajib diisi'); return; }",
    "  if (!amount) { showToast('Gaji Tetap wajib diisi'); return; }",
    "  var payload = { name: name, role: role || null, monthly_amount: amount, bank_name: bank || null, bank_account_number: accNum || null, bank_account_name: accName || null };",
    "  try {",
    "    var res = id ? await sb.from('staff_salary').update(payload).eq('id', id) : await sb.from('staff_salary').insert(payload);",
    "    if (res.error) throw res.error;",
    "    closeModal();",
    "    showToast('Karyawan berhasil disimpan!', 'success');",
    "    loadKaryawanTetap();",
    "  } catch(e) { showToast('Gagal: ' + e.message); }",
    "}",
    "async function toggleKaryawanActive(id, newState) {",
    "  try {",
    "    var { error } = await sb.from('staff_salary').update({ is_active: newState }).eq('id', id);",
    "    if (error) throw error;",
    "    showToast(newState ? 'Karyawan diaktifkan' : 'Karyawan dinonaktifkan', 'success');",
    "    loadKaryawanTetap();",
    "  } catch(e) { showToast('Gagal: ' + e.message); }",
    "}",
    "function exportBatch16() { exportBatchExcel('mid_month'); }"
  ].join(N),
  'PATCH 11: Karyawan Tetap CRUD functions'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 11 patches applied');
