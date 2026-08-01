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

// T5-2: openEditKapalModal — replace Solar Isi input with read-only display div
replaceExact(
  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"kapal-eu-sisi-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + (u.solar_isi_liters || 0) + '\"></div>';",

  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi</label><div id=\"kapal-eu-sisi-display-' + i + '\" style=\"font-size:12px;padding:6px 8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;color:#64748B;\">Memuat...</div></div>';",

  'T5-2: openEditKapalModal: Solar Isi as read-only display'
);

// T5-3: openEditKapalModal — after showing modal, fetch fill data and populate display divs
replaceExact(
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "}" + R + R +
  "async function submitEditKapal(projId) {",

  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "  fetchFillMap([id]).then(function(fm) {" + R +
  "    const ufm = fm[id] || {};" + R +
  "    units.forEach(function(u, i) {" + R +
  "      const el = document.getElementById('kapal-eu-sisi-display-' + i);" + R +
  "      if (!el) return;" + R +
  "      const liters = ufm[u.unit_id];" + R +
  "      el.textContent = liters != null ? liters.toFixed(1) + ' L (aktual)' : ((u.solar_isi_liters || 0) + ' L (manual)');" + R +
  "    });" + R +
  "  });" + R +
  "}" + R + R +
  "async function submitEditKapal(projId) {",

  'T5-3: openEditKapalModal: fetch fills + populate Solar Isi displays'
);

// T5-4: openEditStockpileModal — replace Solar Isi input with read-only display div
replaceExact(
  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"stk-eu-sisi-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + (u.solar_isi_liters || 0) + '\"></div>';",

  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi</label><div id=\"stk-eu-sisi-display-' + i + '\" style=\"font-size:12px;padding:6px 8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;color:#64748B;\">Memuat...</div></div>';",

  'T5-4: openEditStockpileModal: Solar Isi as read-only display'
);

// T5-stk-3: openEditStockpileModal — after showing modal, fetch fill data
replaceExact(
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "}" + R + R +
  "async function submitEditStockpile(projId) {",

  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "  fetchFillMap([id]).then(function(fm) {" + R +
  "    const ufm = fm[id] || {};" + R +
  "    units.forEach(function(u, i) {" + R +
  "      const el = document.getElementById('stk-eu-sisi-display-' + i);" + R +
  "      if (!el) return;" + R +
  "      const liters = ufm[u.unit_id];" + R +
  "      el.textContent = liters != null ? liters.toFixed(1) + ' L (aktual)' : ((u.solar_isi_liters || 0) + ' L (manual)');" + R +
  "    });" + R +
  "  });" + R +
  "}" + R + R +
  "async function submitEditStockpile(projId) {",

  'T5-stk-3: openEditStockpileModal: fetch fills + populate Solar Isi displays'
);

// T5-5: submitEditKapal — remove sIsi read + remove solar_isi_liters from push
replaceExact(
  "    const sAkhir = parseInt(document.getElementById('kapal-eu-sakhir-' + i)?.value);" + R +
  "    const sIsi = parseFloat(document.getElementById('kapal-eu-sisi-' + i)?.value) || 0;" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi, hm_gap_reason: existingUnits[i].hm_gap_reason || null });",

  "    const sAkhir = parseInt(document.getElementById('kapal-eu-sakhir-' + i)?.value);" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, hm_gap_reason: existingUnits[i].hm_gap_reason || null });",

  'T5-5: submitEditKapal: remove sIsi read + solar_isi_liters from push'
);

// T5-6: submitEditStockpile — remove sIsi read + remove solar_isi_liters from push
replaceExact(
  "    const sAkhir = parseInt(document.getElementById('stk-eu-sakhir-' + i)?.value);" + R +
  "    const sIsi = parseFloat(document.getElementById('stk-eu-sisi-' + i)?.value) || 0;" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi });",

  "    const sAkhir = parseInt(document.getElementById('stk-eu-sakhir-' + i)?.value);" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir });",

  'T5-6: submitEditStockpile: remove sIsi read + solar_isi_liters from push'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T5 patches applied. Running syntax check...');
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
