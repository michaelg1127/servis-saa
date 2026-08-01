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

// ── IMPROVEMENT 1: Cost Analysis ────────────────────────────────────────────

// T10-1: loadProyekAnalisis — build per-unit fillMap instead of per-project total
replaceExact(
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
  "    renderProyekAnalisis(projects, solarActualMap);",

  "    const fillMap = {};" + R +
  "    if (projects.length > 0) {" + R +
  "      const ids = projects.map(function(p) { return p.id; });" + R +
  "      const { data: dispenses } = await sb.from('fuel_dispenses')" + R +
  "        .select('project_id, unit_id, liters_dispensed')" + R +
  "        .in('project_id', ids);" + R +
  "      (dispenses || []).forEach(function(d) {" + R +
  "        if (!d.project_id) return;" + R +
  "        if (!fillMap[d.project_id]) fillMap[d.project_id] = {};" + R +
  "        fillMap[d.project_id][d.unit_id] = (fillMap[d.project_id][d.unit_id] || 0) + (d.liters_dispensed || 0);" + R +
  "      });" + R +
  "    }" + R +
  "    renderProyekAnalisis(projects, fillMap);",

  'T10-1: loadProyekAnalisis: build per-unit fillMap'
);

// T10-2: renderProyekAnalisis — rename param + internal alias + stored key
replaceExact(
  "function renderProyekAnalisis(projects, solarActualMap) {" + R +
  "  const panel = document.getElementById('proyek-panel-analisis');" + R +
  "  panel._analisisProjects = projects;" + R +
  "  panel._solarActualMap = solarActualMap || {};" + R +
  "  const actMap = solarActualMap || {};",

  "function renderProyekAnalisis(projects, fillMap) {" + R +
  "  const panel = document.getElementById('proyek-panel-analisis');" + R +
  "  panel._analisisProjects = projects;" + R +
  "  panel._fillMap = fillMap || {};" + R +
  "  const fMap = fillMap || {};",

  'T10-2: renderProyekAnalisis: rename param to fillMap'
);

// T10-3: Replace fuel calculation — isi + tank level delta per unit
replaceExact(
  "    const formulaSolarL = units.reduce((s, u) => s + calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters), 0);" + R +
  "    const actualSolarL = actMap[p.id] != null ? actMap[p.id] : null;" + R +
  "    const usedSolarL = actualSolarL !== null ? actualSolarL : formulaSolarL;" + R +
  "    const fuelCost = usedSolarL * (p.harga_solar_rpl || 0);",

  "    const usedSolarL = units.reduce(function(s, u) {" + R +
  "      const isi = (fMap[p.id] && fMap[p.id][u.unit_id] != null) ? fMap[p.id][u.unit_id] : (u.solar_isi_liters || 0);" + R +
  "      const tankDiff = (u.solar_akhir_pct != null && u.solar_awal_pct != null) ? ((u.solar_awal_pct - u.solar_akhir_pct) / 100) * 320 : 0;" + R +
  "      return s + isi + tankDiff;" + R +
  "    }, 0);" + R +
  "    const fuelCost = usedSolarL * (p.harga_solar_rpl || 0);",

  'T10-3: renderProyekAnalisis: fuel = isi + tank delta per unit'
);

// T10-4: Biaya Solar cell — remove (aktual)/(formula) label, replace with (isi+tangki)
replaceExact(
  "    h += '<td style=\"padding:8px 10px;text-align:right;color:#EF4444;\">' + fmtRp(fuelCost) + (p.harga_solar_rpl ? '<br><span style=\"font-size:10px;color:#94A3B8;\">' + Math.round(usedSolarL) + 'L ' + (actualSolarL !== null ? '(aktual)' : '(formula)') + '</span>' : '') + '</td>';",
  "    h += '<td style=\"padding:8px 10px;text-align:right;color:#EF4444;\">' + fmtRp(fuelCost) + (p.harga_solar_rpl ? '<br><span style=\"font-size:10px;color:#94A3B8;\">' + Math.round(usedSolarL) + 'L (isi+tangki)</span>' : '') + '</td>';",
  'T10-4: renderProyekAnalisis: Biaya Solar label update'
);

// T10-5: setProyekAnalisisFilter — use _fillMap instead of _solarActualMap
replaceExact(
  "  if (panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects, panel._solarActualMap || {});",
  "  if (panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects, panel._fillMap || {});",
  'T10-5: setProyekAnalisisFilter: use _fillMap'
);

// ── IMPROVEMENT 2: Edit button on PENGISIAN list ─────────────────────────────

// T10-6: dispRow — add Edit button before Hapus button
replaceExact(
  "      '<td><button onclick=\"deletePengisian(this.dataset.did,this.dataset.tid)\" data-did=\"' + r.id + '\" data-tid=\"' + (r.fuel_transfers ? r.fuel_transfers.id : '') + '\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;\">Hapus</button></td>' +",
  "      '<td style=\"white-space:nowrap;\"><button onclick=\"openEditPengisian(this.dataset.id)\" data-id=\"' + r.id + '\" style=\"background:#EFF6FF;color:#1D4ED8;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;margin-right:4px;\">Edit</button><button onclick=\"deletePengisian(this.dataset.did,this.dataset.tid)\" data-did=\"' + r.id + '\" data-tid=\"' + (r.fuel_transfers ? r.fuel_transfers.id : '') + '\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;\">Hapus</button></td>' +",
  'T10-6: dispRow: add Edit button'
);

// T10-7: Add openEditPengisian + submitEditPengisian before deletePengisian
replaceExact(
  "async function deletePengisian(dispenseId, transferId) {",

  "async function openEditPengisian(id) {" + R +
  "  const { data: r, error } = await sb.from('fuel_dispenses')" + R +
  "    .select('*, units(code), fuel_transfers(id, transfer_code, volume_liters), projects(project_code, nama_kapal)')" + R +
  "    .eq('id', id).single();" + R +
  "  if (error || !r) { showToast('Gagal memuat data'); return; }" + R +
  "  const tc = r.fuel_transfers ? r.fuel_transfers.transfer_code : '—';" + R +
  "  const unitCode = r.units ? r.units.code : '—';" + R +
  "  const projVal = (r.project_id && r.projects ? r.projects.project_code : null) || r.project || '';" + R +
  "  const tfId = r.fuel_transfers ? r.fuel_transfers.id : '';" + R +
  "  const modalHTML = '<div style=\"padding:24px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;\">'" + R +
  "    + '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;\">Edit Pengisian</div>'" + R +
  "    + '<div style=\"font-size:13px;color:#64748B;margin-bottom:16px;\">' + tc + ' — ' + unitCode + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tanggal</label><input type=\"date\" id=\"ep-date\" class=\"finput\" value=\"' + (r.dispense_date || '') + '\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam</label><input type=\"time\" id=\"ep-time\" class=\"finput\" value=\"' + (r.dispense_time ? r.dispense_time.substring(0,5) : '') + '\"></div>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM saat Isi</label><input type=\"number\" id=\"ep-hm\" class=\"finput\" value=\"' + (r.hm_at_fill || '') + '\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Volume (L)</label><input type=\"number\" id=\"ep-vol\" class=\"finput\" value=\"' + (r.liters_dispensed || '') + '\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Gauge (%)</label><input type=\"number\" id=\"ep-gauge\" class=\"finput\" min=\"0\" max=\"100\" value=\"' + (r.gauge_pct != null ? r.gauge_pct : '') + '\"></div>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Project</label><input type=\"text\" id=\"ep-project\" class=\"finput\" value=\"' + projVal + '\" placeholder=\"Kode atau nama proyek\"></div>'" + R +
  "    + '<div style=\"margin-bottom:16px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Catatan</label><textarea id=\"ep-notes\" class=\"finput\" rows=\"2\">' + (r.notes || '') + '</textarea></div>'" + R +
  "    + '<div style=\"display:flex;gap:12px;\">'" + R +
  "    + '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>'" + R +
  "    + '<button onclick=\"submitEditPengisian(\\'' + id + '\\',\\'' + tfId + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>'" + R +
  "    + '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "}" + R +
  "async function submitEditPengisian(dispId, transferId) {" + R +
  "  const date = document.getElementById('ep-date')?.value;" + R +
  "  const time = document.getElementById('ep-time')?.value || null;" + R +
  "  const hm = parseFloat(document.getElementById('ep-hm')?.value);" + R +
  "  const vol = parseFloat(document.getElementById('ep-vol')?.value);" + R +
  "  const gaugeRaw = parseInt(document.getElementById('ep-gauge')?.value || '');" + R +
  "  const gaugePct = !isNaN(gaugeRaw) && gaugeRaw >= 0 && gaugeRaw <= 100 ? gaugeRaw : null;" + R +
  "  const project = document.getElementById('ep-project')?.value.trim() || null;" + R +
  "  const notes = document.getElementById('ep-notes')?.value.trim() || null;" + R +
  "  if (!date || isNaN(hm) || isNaN(vol)) { showToast('Tanggal, HM, dan Volume wajib diisi'); return; }" + R +
  "  try {" + R +
  "    const { error: e1 } = await sb.from('fuel_dispenses').update({" + R +
  "      dispense_date: date, dispense_time: time, hm_at_fill: hm," + R +
  "      liters_dispensed: vol, gauge_pct: gaugePct, project: project, notes: notes" + R +
  "    }).eq('id', dispId);" + R +
  "    if (e1) throw e1;" + R +
  "    if (transferId) {" + R +
  "      const { error: e2 } = await sb.from('fuel_transfers').update({ volume_liters: vol }).eq('id', transferId);" + R +
  "      if (e2) throw e2;" + R +
  "    }" + R +
  "    closeModal();" + R +
  "    showToast('Pengisian berhasil diperbarui!', 'success');" + R +
  "    loadFuelRiwayat();" + R +
  "  } catch(e) { showToast('Gagal simpan: ' + e.message); }" + R +
  "}" + R + R +
  "async function deletePengisian(dispenseId, transferId) {",

  'T10-7: add openEditPengisian + submitEditPengisian'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T10 patches applied. Running syntax check...');
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
