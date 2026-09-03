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

// ─── PATCH 1: SELECT in loadProyekRingkasan ──────────────────────────────────
replaceExact(
  "sb.from('proyek_kasbon').select('*').eq('month_year', monthYear)," + N +
  "      sb.from('staff_salary').select('id,name,role,monthly_amount,bank_name,bank_account_number,bank_account_name').eq('is_active', true).order('name'),",
  "sb.from('proyek_kasbon').select('*').eq('month_year', monthYear)," + N +
  "      sb.from('staff_salary').select('id,name,role,monthly_amount,bonus,bank_name,bank_account_number,bank_account_name').eq('is_active', true).order('name'),",
  'PATCH 1: add bonus to loadProyekRingkasan SELECT'
);

// ─── PATCH 2: SELECT in loadKaryawanTetap ────────────────────────────────────
replaceExact(
  "sb.from('staff_salary').select('id,name,role,monthly_amount,bank_name,bank_account_number,bank_account_name,is_active').order('name').then",
  "sb.from('staff_salary').select('id,name,role,monthly_amount,bonus,bank_name,bank_account_number,bank_account_name,is_active').order('name').then",
  'PATCH 2: add bonus to loadKaryawanTetap SELECT'
);

// ─── PATCH 3: SELECT in exportBatchExcel ─────────────────────────────────────
replaceExact(
  "const { data: _fsData } = await sb.from('staff_salary').select('id,name,role,monthly_amount,bank_name,bank_account_number,bank_account_name').eq('is_active', true).order('name');",
  "const { data: _fsData } = await sb.from('staff_salary').select('id,name,role,monthly_amount,bonus,bank_name,bank_account_number,bank_account_name').eq('is_active', true).order('name');",
  'PATCH 3: add bonus to exportBatchExcel SELECT'
);

// ─── PATCH 4: openKaryawanModal — add Bonus input field ──────────────────────
replaceExact(
  "'<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Gaji Tetap / Bulan (Rp) *</label><input type=\"number\" id=\"kt-amount\" class=\"finput\" value=\"' + (d.monthly_amount || '') + '\" placeholder=\"mis: 5000000\"></div>' +" + N +
  "    '<div style=\"font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;border-top:1px solid #E2E8F0;padding-top:12px;\">Info Bank</div>' +",
  "'<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Gaji Tetap / Bulan (Rp) *</label><input type=\"number\" id=\"kt-amount\" class=\"finput\" value=\"' + (d.monthly_amount || '') + '\" placeholder=\"mis: 5000000\"></div>' +" + N +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Bonus (Rp)</label><input type=\"number\" id=\"kt-bonus\" class=\"finput\" value=\"' + (d.bonus || '') + '\" placeholder=\"Opsional\"></div>' +" + N +
  "    '<div style=\"font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;border-top:1px solid #E2E8F0;padding-top:12px;\">Info Bank</div>' +",
  'PATCH 4: openKaryawanModal — add Bonus input'
);

// ─── PATCH 5: submitKaryawan — read bonus and include in payload ──────────────
replaceExact(
  "  var payload = { name: name, role: role || null, monthly_amount: amount, bank_name: bank || null, bank_account_number: accNum || null, bank_account_name: accName || null };",
  [
    "  var bonus = parseInt(document.getElementById('kt-bonus')?.value) || 0;",
    "  var payload = { name: name, role: role || null, monthly_amount: amount, bonus: bonus || null, bank_name: bank || null, bank_account_number: accNum || null, bank_account_name: accName || null };"
  ].join(N),
  'PATCH 5: submitKaryawan — save bonus to DB'
);

// ─── PATCH 6a: renderKaryawanTetap — add Bonus column to row ─────────────────
replaceExact(
  "      '<td style=\"padding:10px 12px;text-align:right;font-weight:600;\">' + fmtRp(s.monthly_amount) + '</td>' +" + N +
  "      '<td style=\"padding:10px 12px;color:#64748B;\">' + (s.bank_name || '—') + '</td>' +",
  "      '<td style=\"padding:10px 12px;text-align:right;font-weight:600;\">' + fmtRp(s.monthly_amount) + '</td>' +" + N +
  "      '<td style=\"padding:10px 12px;text-align:right;font-weight:600;color:#D97706;\">' + (s.bonus ? fmtRp(s.bonus) : '—') + '</td>' +" + N +
  "      '<td style=\"padding:10px 12px;color:#64748B;\">' + (s.bank_name || '—') + '</td>' +",
  'PATCH 6a: renderKaryawanTetap — add Bonus cell to row'
);

// ─── PATCH 6b: renderKaryawanTetap — add Bonus column to header ──────────────
replaceExact(
  "    '<th style=\"padding:10px 12px;text-align:right;\">Gaji Tetap</th>' +" + N +
  "    '<th style=\"padding:10px 12px;text-align:left;\">Bank</th>' +",
  "    '<th style=\"padding:10px 12px;text-align:right;\">Gaji Tetap</th>' +" + N +
  "    '<th style=\"padding:10px 12px;text-align:right;\">Bonus</th>' +" + N +
  "    '<th style=\"padding:10px 12px;text-align:left;\">Bank</th>' +",
  'PATCH 6b: renderKaryawanTetap — add Bonus column to header'
);

// ─── PATCH 7a: renderProyekRingkasan — Ringkasan table header + Bonus column ──
replaceExact(
  "'<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;\"><thead><tr style=\"background:#DCFCE7;\"><th style=\"padding:8px 10px;text-align:left;\">Nama</th><th style=\"padding:8px 10px;text-align:left;\">Jabatan</th><th style=\"padding:8px 10px;text-align:right;\">Gaji Tetap</th><th style=\"padding:8px 10px;text-align:right;color:#DC2626;\">Kasbon</th><th style=\"padding:8px 10px;text-align:center;\">Ubah Kasbon</th><th style=\"padding:8px 10px;text-align:right;\">Grand Total</th></tr></thead><tbody>';",
  "'<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;\"><thead><tr style=\"background:#DCFCE7;\"><th style=\"padding:8px 10px;text-align:left;\">Nama</th><th style=\"padding:8px 10px;text-align:left;\">Jabatan</th><th style=\"padding:8px 10px;text-align:right;\">Gaji Tetap</th><th style=\"padding:8px 10px;text-align:right;color:#D97706;\">Bonus</th><th style=\"padding:8px 10px;text-align:right;color:#DC2626;\">Kasbon</th><th style=\"padding:8px 10px;text-align:center;\">Ubah Kasbon</th><th style=\"padding:8px 10px;text-align:right;\">Grand Total</th></tr></thead><tbody>';",
  'PATCH 7a: renderProyekRingkasan — add Bonus column header'
);

// ─── PATCH 7b: renderProyekRingkasan — grandTotal includes bonus ──────────────
replaceExact(
  "        var kasbon = kasbonMap[fs.name] ? kasbonMap[fs.name].amount : 0;" + N +
  "        var grandTotal = fs.monthly_amount - kasbon;",
  "        var kasbon = kasbonMap[fs.name] ? kasbonMap[fs.name].amount : 0;" + N +
  "        var grandTotal = fs.monthly_amount + (fs.bonus || 0) - kasbon;",
  'PATCH 7b: renderProyekRingkasan — grandTotal = salary + bonus - kasbon'
);

// ─── PATCH 7c: renderProyekRingkasan — add Bonus cell in row ─────────────────
replaceExact(
  "        h += '<td style=\"padding:8px 10px;text-align:right;\">' + fmtRp(fs.monthly_amount) + '</td>';" + N +
  "        h += '<td id=\"proy-kasbon-saved-' + safeId + '\"",
  "        h += '<td style=\"padding:8px 10px;text-align:right;\">' + fmtRp(fs.monthly_amount) + '</td>';" + N +
  "        h += '<td style=\"padding:8px 10px;text-align:right;color:#D97706;\">' + (fs.bonus ? fmtRp(fs.bonus) : '—') + '</td>';" + N +
  "        h += '<td id=\"proy-kasbon-saved-' + safeId + '\"",
  'PATCH 7c: renderProyekRingkasan — add Bonus cell in row'
);

// ─── PATCH 7d: renderProyekRingkasan — data-worktotal includes bonus ──────────
replaceExact(
  "data-worktotal=\"' + fs.monthly_amount + '\"",
  "data-worktotal=\"' + (fs.monthly_amount + (fs.bonus || 0)) + '\"",
  'PATCH 7d: renderProyekRingkasan — data-worktotal includes bonus for live kasbon update'
);

// ─── PATCH 7e: renderProyekRingkasan — _totalFixed includes bonus ────────────
replaceExact(
  "var _totalFixed = (fixedStaff || []).reduce(function(acc, fs) { var kb = kasbonMap[fs.name] ? kasbonMap[fs.name].amount : 0; return acc + fs.monthly_amount - kb; }, 0);",
  "var _totalFixed = (fixedStaff || []).reduce(function(acc, fs) { var kb = kasbonMap[fs.name] ? kasbonMap[fs.name].amount : 0; return acc + fs.monthly_amount + (fs.bonus || 0) - kb; }, 0);",
  'PATCH 7e: renderProyekRingkasan — _totalFixed includes bonus'
);

// ─── PATCH 8a: exportBatchExcel SLIP GAJI — _fsgt includes bonus ─────────────
replaceExact(
  "      var _fskb = kasbonMap[fs.name] || 0;" + N +
  "      var _fsgt = fs.monthly_amount - _fskb;",
  "      var _fskb = kasbonMap[fs.name] || 0;" + N +
  "      var _fsgt = fs.monthly_amount + (fs.bonus || 0) - _fskb;",
  'PATCH 8a: exportBatchExcel SLIP GAJI — _fsgt includes bonus'
);

// ─── PATCH 8b: exportBatchExcel SLIP GAJI — add Bonus line item ──────────────
replaceExact(
  "      var _fssr = wsSlip.addRow(['', '', 'Gaji Tetap:', '', fs.monthly_amount]); _fssr.getCell(3).font={bold:true}; _fssr.getCell(5).numFmt=NF;" + N +
  "      if (_fskb > 0) { var _fskr = wsSlip.addRow(['', '', 'Kasbon:', '', -_fskb]); _fskr.getCell(3).font={bold:true,color:{argb:'FFDC2626'}}; _fskr.getCell(5).numFmt=NF; }",
  "      var _fssr = wsSlip.addRow(['', '', 'Gaji Tetap:', '', fs.monthly_amount]); _fssr.getCell(3).font={bold:true}; _fssr.getCell(5).numFmt=NF;" + N +
  "      if (fs.bonus > 0) { var _fsbr = wsSlip.addRow(['', '', 'Bonus:', '', fs.bonus]); _fsbr.getCell(3).font={bold:true,color:{argb:'FFD97706'}}; _fsbr.getCell(5).numFmt=NF; }" + N +
  "      if (_fskb > 0) { var _fskr = wsSlip.addRow(['', '', 'Kasbon:', '', -_fskb]); _fskr.getCell(3).font={bold:true,color:{argb:'FFDC2626'}}; _fskr.getCell(5).numFmt=NF; }",
  'PATCH 8b: exportBatchExcel SLIP GAJI — add Bonus line item'
);

// ─── PATCH 9: exportBatchExcel TRANSFER — _fsgr includes bonus ───────────────
replaceExact(
  "      var _fskb2 = kasbonMap[fs.name] || 0;" + N +
  "      var _fsgr = fs.monthly_amount - _fskb2;",
  "      var _fskb2 = kasbonMap[fs.name] || 0;" + N +
  "      var _fsgr = fs.monthly_amount + (fs.bonus || 0) - _fskb2;",
  'PATCH 9: exportBatchExcel TRANSFER — _fsgr includes bonus'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
