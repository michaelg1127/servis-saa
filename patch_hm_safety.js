// patch_hm_safety.js — HM input safety barrier + mStatus NO DATA fix
// Run: node patch_hm_safety.js

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html');
let src = fs.readFileSync(FILE, 'utf8');
const orig = src;

let patchCount = 0;

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error(`MISS: ${desc}`); process.exit(1); }
  if (count > 1) { console.error(`AMBIGUOUS (${count}): ${desc}`); process.exit(1); }
  src = src.replace(from, to);
  console.log(`OK: ${desc}`);
  patchCount++;
}

// ─── PATCH 1: Operator HM input — step=0.1, oninput, current display + delta preview ───
replaceExact(
  '      <div style="display:flex;gap:8px;align-items:center;">\r\n' +
  '        <input type="number" id="op-hm-input" class="finput" placeholder="Masukkan HM" step="1" style="flex:1;width:auto;min-width:0;padding:10px 12px;font-size:15px;">\r\n' +
  '        <button onclick="submitHMUpdate()" class="btn-primary" style="width:auto;flex-shrink:0;padding:10px 18px;font-size:15px;white-space:nowrap;">Update</button>\r\n' +
  '      </div>',

  '      <div id="op-hm-current-display" style="font-size:12px;color:#6B7280;margin-bottom:6px;font-weight:600;"></div>\r\n' +
  '      <div style="display:flex;gap:8px;align-items:center;">\r\n' +
  '        <input type="number" id="op-hm-input" class="finput" placeholder="Masukkan HM (cth: 7817.4)" step="0.1" oninput="onOpHMInput(this.value)" style="flex:1;width:auto;min-width:0;padding:10px 12px;font-size:15px;">\r\n' +
  '        <button onclick="submitHMUpdate()" class="btn-primary" style="width:auto;flex-shrink:0;padding:10px 18px;font-size:15px;white-space:nowrap;">Update</button>\r\n' +
  '      </div>\r\n' +
  '      <div id="op-hm-delta-preview" style="font-size:12px;margin-top:5px;font-weight:600;min-height:16px;"></div>',

  'PATCH 1: operator HM input — step=0.1 + delta preview'
);

// ─── PATCH 2: SPV HM input — step=0.1, oninput, delta preview ───
replaceExact(
  '          <input type="number" id="spv-hm-input" class="finput" placeholder="Masukkan HM baru" step="1">\r\n' +
  '        </div>\r\n' +
  '        <button onclick="submitSPVHMUpdate()" class="btn-primary" style="width:100%;">Update HM</button>',

  '          <input type="number" id="spv-hm-input" class="finput" placeholder="Masukkan HM baru (cth: 7817.4)" step="0.1" oninput="onSPVHMInput(this.value)">\r\n' +
  '          <div id="spv-hm-delta-preview" style="font-size:12px;margin-top:5px;font-weight:600;min-height:16px;"></div>\r\n' +
  '        </div>\r\n' +
  '        <button onclick="submitSPVHMUpdate()" class="btn-primary" style="width:100%;">Update HM</button>',

  'PATCH 2: SPV HM input — step=0.1 + delta preview'
);

// ─── PATCH 3: mStatus — treat last_hm === 0 as NO DATA ───
replaceExact(
  'function mStatus(interval_hm, last_hm, current_hm) {\r\n' +
  '  if (last_hm == null) return \'NO DATA\';',

  'function mStatus(interval_hm, last_hm, current_hm) {\r\n' +
  '  if (last_hm == null || last_hm === 0) return \'NO DATA\';',

  'PATCH 3: mStatus treats last_hm=0 as NO DATA'
);

// ─── PATCH 4: submitHMUpdate — parseFloat + 24-HM delta cap + zero-HM confirm ───
replaceExact(
  'async function submitHMUpdate() {\r\n' +
  '  if (!currentUnit) { showToast(\'Belum ada unit yang ditugaskan.\'); return; }\r\n' +
  '  const val = parseInt(document.getElementById(\'op-hm-input\').value);\r\n' +
  '  if (!val || val <= 0) { showToast(\'Masukkan nilai HM yang valid.\'); return; }\r\n' +
  '  const prev = currentUnit.current_hm || 0;\r\n' +
  '  if (val <= prev) { showToast(`HM harus lebih dari HM sekarang (${fmtHM(prev)}).`); return; }\r\n' +
  '  if (val > prev + 200) { showToast(`Maksimal 200 HM di atas HM sekarang. Batas: ${fmtHM(prev + 200)}.`); return; }',

  'async function submitHMUpdate() {\r\n' +
  '  if (!currentUnit) { showToast(\'Belum ada unit yang ditugaskan.\'); return; }\r\n' +
  '  const val = parseFloat(document.getElementById(\'op-hm-input\').value);\r\n' +
  '  if (!val || val <= 0 || isNaN(val)) { showToast(\'Masukkan nilai HM yang valid.\'); return; }\r\n' +
  '  const prev = currentUnit.current_hm || 0;\r\n' +
  '  if (val <= prev) { showToast(`HM harus lebih dari HM sekarang (${fmtHM(prev)}).`); return; }\r\n' +
  '  const delta = val - prev;\r\n' +
  '  if (prev === 0) {\r\n' +
  '    if (!confirm(`HM unit belum pernah diisi.\\nApakah benar HM saat ini adalah ${fmtHM(val)}?\\nTekan OK untuk konfirmasi.`)) return;\r\n' +
  '  } else if (delta > 24) {\r\n' +
  '    showToast(`\\u26a0 Selisih ${fmtHM(delta)} HM terlalu besar (maks 24 jam/hari). Periksa kembali input Anda.`);\r\n' +
  '    return;\r\n' +
  '  }',

  'PATCH 4: submitHMUpdate — parseFloat + 24-HM delta cap + zero-HM confirm'
);

// ─── PATCH 5: submitHMUpdate — update current display + clear delta after success ───
replaceExact(
  '    currentUnit.current_hm = newHm;\r\n' +
  '    document.getElementById(\'op-unit-hm\').textContent = fmtHM(newHm);\r\n' +
  '    document.getElementById(\'op-hm-input\').value = \'\';',

  '    currentUnit.current_hm = newHm;\r\n' +
  '    document.getElementById(\'op-unit-hm\').textContent = fmtHM(newHm);\r\n' +
  '    const hmDisp = document.getElementById(\'op-hm-current-display\');\r\n' +
  '    if (hmDisp) hmDisp.textContent = \'HM saat ini: \' + fmtHM(newHm);\r\n' +
  '    document.getElementById(\'op-hm-input\').value = \'\';\r\n' +
  '    const dpEl = document.getElementById(\'op-hm-delta-preview\');\r\n' +
  '    if (dpEl) dpEl.textContent = \'\';',

  'PATCH 5: submitHMUpdate — refresh current display + clear delta preview on success'
);

// ─── PATCH 6: loadOperatorData — populate op-hm-current-display when banner shows ───
replaceExact(
  '      document.getElementById(\'op-hm-banner\').style.display = \'block\';\r\n' +
  '      await checkHMUpdateToday();',

  '      document.getElementById(\'op-hm-banner\').style.display = \'block\';\r\n' +
  '      const _hmDisp = document.getElementById(\'op-hm-current-display\');\r\n' +
  '      if (_hmDisp) _hmDisp.textContent = \'HM saat ini: \' + fmtHM(currentUnit.current_hm);\r\n' +
  '      await checkHMUpdateToday();',

  'PATCH 6: loadOperatorData — show current HM in banner'
);

// ─── PATCH 7: submitSPVHMUpdate — parseFloat + 24-HM delta cap + zero-HM confirm ───
replaceExact(
  'async function submitSPVHMUpdate() {\r\n' +
  '  const sel = document.getElementById(\'spv-hm-unit\');\r\n' +
  '  const unitId = sel.value;\r\n' +
  '  const val = parseInt(document.getElementById(\'spv-hm-input\').value);\r\n' +
  '  if (!unitId) { showToast(\'Pilih unit terlebih dahulu.\'); return; }\r\n' +
  '  if (!val || val <= 0) { showToast(\'Masukkan nilai HM yang valid.\'); return; }\r\n' +
  '  try {\r\n' +
  '    const { data: unit } = await sb.from(\'units\').select(\'current_hm, code\').eq(\'id\', unitId).single();\r\n' +
  '    const prev = unit?.current_hm || 0;\r\n' +
  '    if (val <= prev) { showToast(`HM harus lebih dari HM sekarang (${fmtHM(prev)}).`); return; }\r\n' +
  '    if (val > prev + 200) { showToast(`Maksimal 200 HM di atas HM sekarang. Batas: ${fmtHM(prev + 200)}.`); return; }',

  'async function submitSPVHMUpdate() {\r\n' +
  '  const sel = document.getElementById(\'spv-hm-unit\');\r\n' +
  '  const unitId = sel.value;\r\n' +
  '  const val = parseFloat(document.getElementById(\'spv-hm-input\').value);\r\n' +
  '  if (!unitId) { showToast(\'Pilih unit terlebih dahulu.\'); return; }\r\n' +
  '  if (!val || val <= 0 || isNaN(val)) { showToast(\'Masukkan nilai HM yang valid.\'); return; }\r\n' +
  '  try {\r\n' +
  '    const { data: unit } = await sb.from(\'units\').select(\'current_hm, code\').eq(\'id\', unitId).single();\r\n' +
  '    const prev = unit?.current_hm || 0;\r\n' +
  '    if (val <= prev) { showToast(`HM harus lebih dari HM sekarang (${fmtHM(prev)}).`); return; }\r\n' +
  '    const delta = val - prev;\r\n' +
  '    if (prev === 0) {\r\n' +
  '      if (!confirm(`HM unit ${unit.code} belum pernah diisi.\\nApakah benar HM saat ini adalah ${fmtHM(val)}?\\nTekan OK untuk konfirmasi.`)) return;\r\n' +
  '    } else if (delta > 24) {\r\n' +
  '      showToast(`\\u26a0 Selisih ${fmtHM(delta)} HM terlalu besar (maks 24 jam/hari). Periksa kembali input Anda.`);\r\n' +
  '      return;\r\n' +
  '    }',

  'PATCH 7: submitSPVHMUpdate — parseFloat + 24-HM delta cap + zero-HM confirm'
);

// ─── PATCH 8: submitSPVHMUpdate — clear delta preview on success ───
replaceExact(
  '    showToast(`HM ${unit.code} berhasil diupdate ke ${fmtHM(val)}.`, \'success\');\r\n' +
  '    document.getElementById(\'spv-hm-input\').value = \'\';',

  '    showToast(`HM ${unit.code} berhasil diupdate ke ${fmtHM(val)}.`, \'success\');\r\n' +
  '    document.getElementById(\'spv-hm-input\').value = \'\';\r\n' +
  '    const _spvDp = document.getElementById(\'spv-hm-delta-preview\');\r\n' +
  '    if (_spvDp) _spvDp.textContent = \'\';',

  'PATCH 8: submitSPVHMUpdate — clear delta preview on success'
);

// ─── PATCH 9: Add onOpHMInput + onSPVHMInput after submitSPVHMUpdate ───
replaceExact(
  '// ============================================================\r\n' +
  '// ADMIN CATAT SERVIS\r\n' +
  '// ============================================================',

  'function onOpHMInput(rawVal) {\r\n' +
  '  const val = parseFloat(rawVal);\r\n' +
  '  const prev = currentUnit ? (currentUnit.current_hm || 0) : 0;\r\n' +
  '  const el = document.getElementById(\'op-hm-delta-preview\');\r\n' +
  '  if (!el) return;\r\n' +
  '  if (!rawVal || isNaN(val)) { el.textContent = \'\'; return; }\r\n' +
  '  const delta = val - prev;\r\n' +
  '  if (delta <= 0) {\r\n' +
  '    el.style.color = \'#DC2626\';\r\n' +
  '    el.textContent = \'\\u26a0 HM tidak boleh lebih kecil dari sekarang\';\r\n' +
  '  } else if (prev > 0 && delta > 24) {\r\n' +
  '    el.style.color = \'#DC2626\';\r\n' +
  '    el.textContent = `\\u26a0 Selisih ${delta.toFixed(1)} HM \\u2014 terlalu besar, periksa kembali`;\r\n' +
  '  } else {\r\n' +
  '    el.style.color = \'#16A34A\';\r\n' +
  '    el.textContent = `Jam kerja hari ini: +${delta.toFixed(1)} HM`;\r\n' +
  '  }\r\n' +
  '}\r\n' +
  '\r\n' +
  'function onSPVHMInput(rawVal) {\r\n' +
  '  const val = parseFloat(rawVal);\r\n' +
  '  const sel = document.getElementById(\'spv-hm-unit\');\r\n' +
  '  const opt = sel ? sel.options[sel.selectedIndex] : null;\r\n' +
  '  const prev = opt ? parseFloat(opt.dataset.hm || 0) : 0;\r\n' +
  '  const el = document.getElementById(\'spv-hm-delta-preview\');\r\n' +
  '  if (!el) return;\r\n' +
  '  if (!rawVal || isNaN(val)) { el.textContent = \'\'; return; }\r\n' +
  '  const delta = val - prev;\r\n' +
  '  if (delta <= 0) {\r\n' +
  '    el.style.color = \'#DC2626\';\r\n' +
  '    el.textContent = \'\\u26a0 HM tidak boleh lebih kecil dari sekarang\';\r\n' +
  '  } else if (prev > 0 && delta > 24) {\r\n' +
  '    el.style.color = \'#DC2626\';\r\n' +
  '    el.textContent = `\\u26a0 Selisih ${delta.toFixed(1)} HM \\u2014 terlalu besar, periksa kembali`;\r\n' +
  '  } else {\r\n' +
  '    el.style.color = \'#16A34A\';\r\n' +
  '    el.textContent = `Jam kerja hari ini: +${delta.toFixed(1)} HM`;\r\n' +
  '  }\r\n' +
  '}\r\n' +
  '\r\n' +
  '// ============================================================\r\n' +
  '// ADMIN CATAT SERVIS\r\n' +
  '// ============================================================',

  'PATCH 9: add onOpHMInput + onSPVHMInput live delta preview functions'
);

// ─── Write output ───
if (src === orig) {
  console.error('ERROR: No changes made — all patches missed!');
  process.exit(1);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\nDone. ${patchCount}/9 patches applied.`);
