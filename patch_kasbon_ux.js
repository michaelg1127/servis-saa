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

// ── PATCH 1: Redesign Batch 31 table — add Kasbon display col + per-row Save button ──
const p1from = [
  '    h += \'<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;"><thead><tr style="background:#DCFCE7;"><th style="padding:8px 10px;text-align:left;">Operator</th><th style="padding:8px 10px;text-align:right;">Gaji Proyek</th><th style="padding:8px 10px;text-align:right;">Gaji Pokok</th><th style="padding:8px 10px;text-align:center;">Kasbon</th><th style="padding:8px 10px;text-align:right;">Grand Total</th></tr></thead><tbody>\';',
  '    opNames.forEach(function(name) {',
  '      const s = opMap31[name] || { total: 0, rows: [] };',
  '      const kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0;',
  '      const grandTotal = s.total + 3100000 - kasbon;',
  '      const safeId = name.replace(/\\s+/g, \'_\');',
  '      h += \'<tr style="border-bottom:1px solid #BBF7D0;"><td style="padding:8px 10px;font-weight:600;">\' + name + \'</td>\';',
  '      h += \'<td style="padding:8px 10px;text-align:right;">\';',
  '      if (s.rows.length > 0) h += \'<span style="font-size:11px;color:#64748B;">\' + s.rows.join(\'<br>\') + \'</span><br>\';',
  '      h += \'<strong>\' + fmtRp(s.total) + \'</strong></td>\';',
  '      h += \'<td style="padding:8px 10px;text-align:right;color:#64748B;">Rp 3.100.000</td>\';',
  '      h += \'<td style="padding:8px 10px;text-align:center;"><input id="proy-kasbon-\' + safeId + \'" data-op="\' + name + \'" type="number" class="finput" style="width:110px;text-align:right;" value="\' + kasbon + \'" placeholder="0"></td>\';',
  '      h += \'<td style="padding:8px 10px;text-align:right;font-weight:800;color:#16A34A;">\' + fmtRp(grandTotal) + \'</td></tr>\';',
  '    });',
  '    h += \'</tbody></table></div>\';',
  '    var total31 = opNames.reduce(function(acc, name) { var s = opMap31[name] || { total: 0 }; var kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0; return acc + s.total + 3100000 - kasbon; }, 0);',
  '    h += \'<div style="display:flex;justify-content:flex-end;align-items:center;padding:10px 10px 6px;border-top:2px solid #BBF7D0;margin-top:6px;"><span style="font-size:14px;font-weight:800;color:#16A34A;">Total Transfer: \' + fmtRp(total31) + \'</span></div>\';'
].join(N);

const p1to = [
  '    h += \'<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;"><thead><tr style="background:#DCFCE7;"><th style="padding:8px 10px;text-align:left;">Operator</th><th style="padding:8px 10px;text-align:right;">Gaji Proyek</th><th style="padding:8px 10px;text-align:right;">Gaji Pokok</th><th style="padding:8px 10px;text-align:right;color:#DC2626;">Kasbon</th><th style="padding:8px 10px;text-align:center;">Ubah Kasbon</th><th style="padding:8px 10px;text-align:right;">Grand Total</th></tr></thead><tbody>\';',
  '    opNames.forEach(function(name) {',
  '      const s = opMap31[name] || { total: 0, rows: [] };',
  '      const kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0;',
  '      const grandTotal = s.total + 3100000 - kasbon;',
  '      const safeId = name.replace(/\\s+/g, \'_\');',
  '      const safeName = name.replace(/"/g, \'&quot;\');',
  '      h += \'<tr style="border-bottom:1px solid #BBF7D0;"><td style="padding:8px 10px;font-weight:600;">\' + name + \'</td>\';',
  '      h += \'<td style="padding:8px 10px;text-align:right;">\';',
  '      if (s.rows.length > 0) h += \'<span style="font-size:11px;color:#64748B;">\' + s.rows.join(\'<br>\') + \'</span><br>\';',
  '      h += \'<strong>\' + fmtRp(s.total) + \'</strong></td>\';',
  '      h += \'<td style="padding:8px 10px;text-align:right;color:#64748B;">Rp 3.100.000</td>\';',
  '      h += \'<td id="proy-kasbon-saved-\' + safeId + \'" style="padding:8px 10px;text-align:right;font-weight:600;color:\' + (kasbon > 0 ? \'#DC2626\' : \'#94A3B8\') + \';\">\' + (kasbon > 0 ? fmtRp(kasbon) : \'—\') + \'</td>\';',
  '      h += \'<td style="padding:8px 10px;text-align:center;"><div style="display:flex;gap:4px;align-items:center;justify-content:center;"><input id="proy-kasbon-\' + safeId + \'" type="number" class="finput" style="width:90px;text-align:right;" placeholder="0"><button data-safe="\' + safeId + \'" data-op="\' + safeName + \'" data-worktotal="\' + s.total + \'" data-monthyear="\' + monthYear + \'" onclick="saveKasbonRow(this)" style="background:#0F172A;color:white;border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">Simpan</button></div></td>\';',
  '      h += \'<td id="proy-grand-\' + safeId + \'" style="padding:8px 10px;text-align:right;font-weight:800;color:#16A34A;">\' + fmtRp(grandTotal) + \'</td></tr>\';',
  '    });',
  '    h += \'</tbody></table></div>\';',
  '    var total31 = opNames.reduce(function(acc, name) { var s = opMap31[name] || { total: 0 }; var kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0; return acc + s.total + 3100000 - kasbon; }, 0);',
  '    h += \'<div style="display:flex;justify-content:flex-end;align-items:center;padding:10px 10px 6px;border-top:2px solid #BBF7D0;margin-top:6px;"><span id="proy-batch31-total" style="font-size:14px;font-weight:800;color:#16A34A;">Total Transfer: \' + fmtRp(total31) + \'</span></div>\';'
].join(N);

replaceExact(p1from, p1to, 'PATCH 1: Batch 31 — split Kasbon display/edit cols + Save button per row');

// ── PATCH 2: Remove auto-save kasbon on Tandai Lunas ──────────────────────────
replaceExact(
  "    if (paymentType === 'end_of_month') await saveProyekKasbon(monthYear);",
  "    // kasbon is saved per-row via saveKasbonRow(); no auto-save on Tandai Lunas",
  'PATCH 2: remove saveProyekKasbon auto-call from markProyekPaid'
);

// ── PATCH 3: Add saveKasbonRow + updateBatch31TotalTransfer functions ─────────
const p3from = [
  '  }));',
  '}',
  '',
  'function exportBatch16() { exportBatchExcel(\'mid_month\'); }'
].join(N);

const p3to = [
  '  }));',
  '}',
  '',
  'async function saveKasbonRow(btn) {',
  '  const safeId = btn.dataset.safe;',
  '  const opName = btn.dataset.op;',
  '  const monthYear = btn.dataset.monthyear;',
  '  const workTotal = parseFloat(btn.dataset.worktotal) || 0;',
  '  const input = document.getElementById(\'proy-kasbon-\' + safeId);',
  '  const amount = parseFloat(input ? input.value : 0) || 0;',
  '  btn.disabled = true; btn.textContent = \'...\';',
  '  try {',
  '    const { data: existing } = await sb.from(\'proyek_kasbon\').select(\'id\').eq(\'month_year\', monthYear).eq(\'operator_name\', opName);',
  '    if (existing && existing.length > 0) {',
  '      const { error } = await sb.from(\'proyek_kasbon\').update({ amount: amount }).eq(\'id\', existing[0].id);',
  '      if (error) throw error;',
  '    } else {',
  '      const { error } = await sb.from(\'proyek_kasbon\').insert({ month_year: monthYear, operator_name: opName, amount: amount });',
  '      if (error) throw error;',
  '    }',
  '    var savedEl = document.getElementById(\'proy-kasbon-saved-\' + safeId);',
  '    if (savedEl) { savedEl.textContent = amount > 0 ? fmtRp(amount) : \'—\'; savedEl.style.color = amount > 0 ? \'#DC2626\' : \'#94A3B8\'; }',
  '    var grandEl = document.getElementById(\'proy-grand-\' + safeId);',
  '    if (grandEl) grandEl.textContent = fmtRp(workTotal + 3100000 - amount);',
  '    updateBatch31TotalTransfer();',
  '    showToast(\'Kasbon \' + opName + \' tersimpan\', \'success\');',
  '  } catch(e) { showToast(\'Gagal simpan kasbon: \' + e.message); }',
  '  btn.disabled = false; btn.textContent = \'Simpan\';',
  '}',
  'function updateBatch31TotalTransfer() {',
  '  var els = document.querySelectorAll(\'[id^="proy-grand-"]\');',
  '  var total = 0;',
  '  els.forEach(function(el) { total += parseInt(el.textContent.replace(/[^0-9]/g, \'\')) || 0; });',
  '  var totEl = document.getElementById(\'proy-batch31-total\');',
  '  if (totEl) totEl.textContent = \'Total Transfer: \' + fmtRp(total);',
  '}',
  '',
  'function exportBatch16() { exportBatchExcel(\'mid_month\'); }'
].join(N);

replaceExact(p3from, p3to, 'PATCH 3: add saveKasbonRow + updateBatch31TotalTransfer functions');

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 3 patches applied');
