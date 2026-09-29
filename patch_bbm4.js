const fs = require('fs');
const path = 'C:/Users/upsca/Documents/SERVIS-SAA/index.html';
let html = fs.readFileSync(path, 'utf8');

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS:', desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '):', desc); process.exit(1); }
  html = html.replace(from, to);
  console.log('OK:', desc);
}

function replaceFn(name, isAsync, newBody) {
  const prefix = isAsync ? 'async function ' : 'function ';
  const sig = prefix + name + '(';
  const start = html.indexOf(sig);
  if (start === -1) { console.error('FN NOT FOUND:', name); process.exit(1); }
  let braces = 0, i = start, inStr1 = false, inStr2 = false, inTpl = 0, started = false;
  while (i < html.length) {
    const c = html[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'" && !inStr2 && inTpl === 0) { inStr1 = !inStr1; i++; continue; }
    if (c === '"' && !inStr1 && inTpl === 0) { inStr2 = !inStr2; i++; continue; }
    if (c === '\x60' && !inStr1 && !inStr2) { inTpl = inTpl ? 0 : 1; i++; continue; }
    if (inStr1 || inStr2 || inTpl) { i++; continue; }
    if (c === '{') { braces++; started = true; }
    else if (c === '}') { braces--; if (started && braces === 0) { i++; break; } }
    i++;
  }
  html = html.slice(0, start) + prefix + name + newBody + html.slice(i);
  console.log('OK: replaceFn', name);
}

// ── 1. HTML: insert gauge field before Pilih Unit ──────────────────────────
const pilihUnitDiv =
  '      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Pilih Unit <span style="color:#EF4444;">*</span></label><select id="bbm-peng-unit" class="finput" onchange="onPengisianUnitChange(this.value)"><option value="">-- Pilih Unit --</option></select></div>';

const gaugeFieldHtml =
  '      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Gauge Tangki (%) <span style="color:#64748B;font-size:11px;font-weight:400;">sebelum isi</span></label>' +
  '<div style="display:flex;align-items:center;gap:12px;">' +
  '<input type="number" id="bbm-peng-gauge" class="finput" min="0" max="100" placeholder="0-100" style="width:80px;" oninput="onGaugeInput(this.value)">' +
  '<div style="flex:1;background:#F1F5F9;border-radius:99px;height:14px;overflow:hidden;border:1px solid #E2E8F0;">' +
  '<div id="bbm-peng-gauge-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#EF4444 0%,#F59E0B 50%,#22C55E 100%);border-radius:99px;transition:width 0.2s;"></div>' +
  '</div>' +
  '<span id="bbm-peng-gauge-label" style="font-size:14px;font-weight:800;color:#374151;min-width:40px;">—</span>' +
  '</div></div>\n';

replaceExact(pilihUnitDiv, gaugeFieldHtml + pilihUnitDiv, 'HTML: insert gauge field');

// ── 2. onPengisianUnitChange: fetch gauge_pct + show in info ───────────────
replaceFn('onPengisianUnitChange', true, '(unitId) {\n' +
'  const info = document.getElementById(\'bbm-peng-last-info\');\n' +
'  if (!info) return;\n' +
'  if (!unitId) { info.style.display = \'none\'; bbmLastDispenseByUnit = {}; onPengisianHMChange(); return; }\n' +
'  const { data } = await sb.from(\'fuel_dispenses\').select(\'hm_at_fill, dispense_date, liters_dispensed, l_per_hr, gauge_pct\').eq(\'unit_id\', unitId).order(\'hm_at_fill\', { ascending: false }).limit(1);\n' +
'  if (!data || data.length === 0) { info.style.display = \'none\'; bbmLastDispenseByUnit = {}; onPengisianHMChange(); return; }\n' +
'  const last = data[0];\n' +
'  bbmLastDispenseByUnit = last;\n' +
'  info.style.display = \'\';\n' +
'  info.innerHTML = \'Pengisian terakhir: <strong>\' + formatDate(last.dispense_date) + \'</strong> — HM: <strong>\' + Number(last.hm_at_fill).toLocaleString(\'id\') + \'</strong>\' +\n' +
'    (last.l_per_hr ? \' — L/Hr: <strong>\' + Number(last.l_per_hr).toFixed(2) + \'</strong>\' : \'\') +\n' +
'    (last.gauge_pct != null ? \' — Gauge: <strong>\' + last.gauge_pct + \'%</strong>\' : \'\');\n' +
'  onPengisianHMChange();\n' +
'}');

// ── 3. onPengisianHMChange: improve L/Hr preview with gauge ───────────────
replaceFn('onPengisianHMChange', false, '() {\n' +
'  const prev = document.getElementById(\'bbm-peng-lhr-preview\');\n' +
'  if (!prev) return;\n' +
'  const hm = parseFloat(document.getElementById(\'bbm-peng-hm\').value);\n' +
'  const liters = parseFloat(document.getElementById(\'bbm-peng-vol\').value) || 0;\n' +
'  if (!hm || !liters || !bbmLastDispenseByUnit || !bbmLastDispenseByUnit.hm_at_fill) { prev.style.display = \'none\'; return; }\n' +
'  const hmDiff = hm - Number(bbmLastDispenseByUnit.hm_at_fill);\n' +
'  if (hmDiff <= 0) { prev.style.display = \'none\'; return; }\n' +
'  const lhrBasic = (liters / hmDiff).toFixed(2);\n' +
'  let lines = \'Est. L/Hr (isi): <strong>\' + lhrBasic + \' L/Hr</strong> (\' + liters + \'L / \' + hmDiff.toLocaleString(\'id\') + \' HM)\';\n' +
'  const gaugeEl = document.getElementById(\'bbm-peng-gauge\');\n' +
'  const gaugeNow = gaugeEl && gaugeEl.value !== \'\' ? parseInt(gaugeEl.value) : NaN;\n' +
'  const prevGauge = bbmLastDispenseByUnit.gauge_pct;\n' +
'  if (!isNaN(gaugeNow) && gaugeNow >= 0 && prevGauge != null) {\n' +
'    const consumed = Number(prevGauge) + Number(bbmLastDispenseByUnit.liters_dispensed || 0) - gaugeNow;\n' +
'    if (consumed > 0) {\n' +
'      const lhrGauge = (consumed / hmDiff).toFixed(2);\n' +
'      lines += \'<br>Est. L/Hr (gauge): <strong>\' + lhrGauge + \' L/Hr</strong> (\' + prevGauge + \' + \' + (bbmLastDispenseByUnit.liters_dispensed || 0) + \' − \' + gaugeNow + \' = \' + consumed + \')\';\n' +
'    }\n' +
'  }\n' +
'  prev.style.display = \'\';\n' +
'  prev.innerHTML = lines;\n' +
'}');

// ── 4. Insert onGaugeInput after onPengisianHMChange ──────────────────────
replaceExact(
  '\r\nasync function submitPengisian()',
  '\r\nfunction onGaugeInput(v) {\n' +
  '  const val = v !== \'\' ? Math.min(100, Math.max(0, parseInt(v) || 0)) : null;\n' +
  '  const bar = document.getElementById(\'bbm-peng-gauge-bar\');\n' +
  '  const lbl = document.getElementById(\'bbm-peng-gauge-label\');\n' +
  '  if (bar) bar.style.width = (val !== null ? val : 0) + \'%\';\n' +
  '  if (lbl) lbl.textContent = val !== null ? val + \'%\' : \'—\';\n' +
  '  onPengisianHMChange();\n' +
  '}\n\nasync function submitPengisian()',
  'insert onGaugeInput function'
);

// ── 5. submitPengisian: read gauge before validation ──────────────────────
replaceExact(
  '  const notes = document.getElementById(\'bbm-peng-notes\').value.trim() || null;\r\n  if (!bunkerId',
  '  const notes = document.getElementById(\'bbm-peng-notes\').value.trim() || null;\r\n' +
  '  const gaugeRaw = parseInt((document.getElementById(\'bbm-peng-gauge\') || {}).value || \'\');\r\n' +
  '  const gaugePct = !isNaN(gaugeRaw) && gaugeRaw >= 0 && gaugeRaw <= 100 ? gaugeRaw : null;\r\n' +
  '  if (!bunkerId',
  'submitPengisian: read gaugePct'
);

// ── 6. submitPengisian: pass gauge to calcLPerHr ──────────────────────────
replaceExact(
  '    const lhr = await calcLPerHr(unitId, hm, vol);',
  '    const lhr = await calcLPerHr(unitId, hm, vol, gaugePct);',
  'submitPengisian: calcLPerHr with gauge'
);

// ── 7. submitPengisian: include gauge_pct in insert ───────────────────────
replaceExact(
  '      .insert({ transfer_id: tData.id, unit_id: unitId, hm_at_fill: hm, dispense_date: date, dispense_time: time, liters_dispensed: vol, l_per_hr: lhr, project, notes });',
  '      .insert({ transfer_id: tData.id, unit_id: unitId, hm_at_fill: hm, dispense_date: date, dispense_time: time, liters_dispensed: vol, l_per_hr: lhr, gauge_pct: gaugePct, project, notes });',
  'submitPengisian: include gauge_pct in insert'
);

// ── 8. submitPengisian: clear gauge on form reset ─────────────────────────
replaceExact(
  '    document.getElementById(\'bbm-peng-notes\').value = \'\';\r\n    document.getElementById(\'bbm-peng-bunker-preview\').style.display = \'none\';',
  '    document.getElementById(\'bbm-peng-notes\').value = \'\';\r\n' +
  '    const gResetEl = document.getElementById(\'bbm-peng-gauge\');\r\n' +
  '    if (gResetEl) gResetEl.value = \'\';\r\n' +
  '    const gBarEl = document.getElementById(\'bbm-peng-gauge-bar\');\r\n' +
  '    if (gBarEl) gBarEl.style.width = \'0%\';\r\n' +
  '    const gLblEl = document.getElementById(\'bbm-peng-gauge-label\');\r\n' +
  '    if (gLblEl) gLblEl.textContent = \'—\';\r\n' +
  '    document.getElementById(\'bbm-peng-bunker-preview\').style.display = \'none\';',
  'submitPengisian: clear gauge on reset'
);

// ── 9. calcLPerHr: use gauge for improved L/Hr ────────────────────────────
replaceFn('calcLPerHr', true, '(unitId, hm, liters, gaugeNow) {\n' +
'  const { data } = await sb.from(\'fuel_dispenses\').select(\'hm_at_fill, gauge_pct, liters_dispensed\').eq(\'unit_id\', unitId).order(\'hm_at_fill\', { ascending: false }).limit(1);\n' +
'  if (!data || data.length === 0) return null;\n' +
'  const prev = data[0];\n' +
'  const diff = hm - Number(prev.hm_at_fill);\n' +
'  if (diff <= 0) return null;\n' +
'  if (gaugeNow != null && prev.gauge_pct != null) {\n' +
'    const consumed = Number(prev.gauge_pct) + Number(prev.liters_dispensed) - gaugeNow;\n' +
'    if (consumed > 0) return Math.round((consumed / diff) * 100) / 100;\n' +
'  }\n' +
'  return Math.round((liters / diff) * 100) / 100;\n' +
'}');

// ── 10. loadFuelRiwayat: add gauge_pct to dispenses select ────────────────
replaceExact(
  '\'id, dispense_date, dispense_time, hm_at_fill, liters_dispensed, l_per_hr, project, notes, units(id, code, name), fuel_transfers(id, transfer_code, drum_name, fuel_bunkers(bunker_code))\'',
  '\'id, dispense_date, dispense_time, hm_at_fill, liters_dispensed, l_per_hr, gauge_pct, project, notes, units(id, code, name), fuel_transfers(id, transfer_code, drum_name, fuel_bunkers(bunker_code))\'',
  'loadFuelRiwayat: add gauge_pct to select'
);

// ── 11. renderFuelRiwayat: add Gauge column (hdr, dispRow, xferRow, bunkerRow, colspan) ──
replaceFn('renderFuelRiwayat', false, '() {\n' +
'  const el = document.getElementById(\'bbm-panel-riwayat\');\n' +
'  if (!el) return;\n' +
'  const bunkerFromDisp = fuelRiwayatData.map(r => r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : null);\n' +
'  const bunkerFromXfer = fuelTankXferData.map(r => r.fuel_bunkers ? r.fuel_bunkers.bunker_code : null);\n' +
'  const bunkerFromTerima = fuelBunkerData.map(r => r.bunker_code);\n' +
'  const bunkerOpts = [...new Set([...bunkerFromDisp, ...bunkerFromXfer, ...bunkerFromTerima].filter(Boolean))].sort((a,b) => { const na=parseInt(a.replace(\'X\',\'\'),10),nb=parseInt(b.replace(\'X\',\'\'),10); return nb-na; });\n' +
'  const unitOpts = [...new Set(fuelRiwayatData.map(r => r.units ? r.units.code : null).filter(Boolean))].sort();\n' +
'  const projectOpts = [...new Set(fuelRiwayatData.map(r => r.project).filter(Boolean))].sort();\n' +
'  const filterRow = \'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">\' +\n' +
'    \'<select onchange="fuelRiwayatFilters.bunker=this.value;renderFuelRiwayat()" style="padding:6px 10px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;background:white;">\' +\n' +
'    \'<option value="">Semua Bunker</option>\' + bunkerOpts.map(b => \'<option value="\' + b + \'"\' + (fuelRiwayatFilters.bunker===b ? \' selected\' : \'\') + \'>\' + b + \'</option>\').join(\'\') + \'</select>\' +\n' +
'    \'<select onchange="fuelRiwayatFilters.unit=this.value;renderFuelRiwayat()" style="padding:6px 10px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;background:white;">\' +\n' +
'    \'<option value="">Semua Unit</option>\' + unitOpts.map(u => \'<option value="\' + u + \'"\' + (fuelRiwayatFilters.unit===u ? \' selected\' : \'\') + \'>\' + u + \'</option>\').join(\'\') + \'</select>\' +\n' +
'    \'<select onchange="fuelRiwayatFilters.project=this.value;renderFuelRiwayat()" style="padding:6px 10px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;background:white;">\' +\n' +
'    \'<option value="">Semua Project</option>\' + projectOpts.map(p => \'<option value="\' + p + \'"\' + (fuelRiwayatFilters.project===p ? \' selected\' : \'\') + \'>\' + p + \'</option>\').join(\'\') + \'</select>\' +\n' +
'  \'</div>\';\n' +
'  const sortPills = \'<div id="bbm-riwayat-sort-pills" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">\' +\n' +
'    \'<button class="filter-pill\' + (fuelRiwayatSort===\'date\' ? \' on\' : \'\') + \'" onclick="setFuelRiwayatSort(this.dataset.s,this)" data-s="date">Terbaru</button>\' +\n' +
'    \'<button class="filter-pill\' + (fuelRiwayatSort===\'unit\' ? \' on\' : \'\') + \'" onclick="setFuelRiwayatSort(this.dataset.s,this)" data-s="unit">Per Unit</button>\' +\n' +
'    \'<button class="filter-pill\' + (fuelRiwayatSort===\'bunker\' ? \' on\' : \'\') + \'" onclick="setFuelRiwayatSort(this.dataset.s,this)" data-s="bunker">Per Bunker</button>\' +\n' +
'  \'</div>\';\n' +
'  let filtDisp = fuelRiwayatData.slice();\n' +
'  let filtXfer = fuelTankXferData.slice();\n' +
'  let filtBunkers = fuelBunkerData.slice();\n' +
'  if (fuelRiwayatFilters.bunker) {\n' +
'    filtDisp = filtDisp.filter(r => r.fuel_transfers && r.fuel_transfers.fuel_bunkers && r.fuel_transfers.fuel_bunkers.bunker_code === fuelRiwayatFilters.bunker);\n' +
'    filtXfer = filtXfer.filter(r => r.fuel_bunkers && r.fuel_bunkers.bunker_code === fuelRiwayatFilters.bunker);\n' +
'    filtBunkers = filtBunkers.filter(r => r.bunker_code === fuelRiwayatFilters.bunker);\n' +
'  }\n' +
'  if (fuelRiwayatFilters.unit) { filtDisp = filtDisp.filter(r => r.units && r.units.code === fuelRiwayatFilters.unit); filtXfer = []; filtBunkers = []; }\n' +
'  if (fuelRiwayatFilters.project) { filtDisp = filtDisp.filter(r => r.project === fuelRiwayatFilters.project); filtXfer = []; filtBunkers = []; }\n' +
'  if (!filtDisp.length && !filtXfer.length && !filtBunkers.length) {\n' +
'    el.innerHTML = filterRow + sortPills + \'<div style="color:#94A3B8;padding:20px;">Belum ada data.</div>\';\n' +
'    return;\n' +
'  }\n' +
'  const dispRow = (r) => {\n' +
'    const unit = r.units ? r.units.code : \'—\';\n' +
'    const tc = r.fuel_transfers ? r.fuel_transfers.transfer_code : \'—\';\n' +
'    const drum = r.fuel_transfers ? r.fuel_transfers.drum_name : \'—\';\n' +
'    const bunker = r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : \'—\';\n' +
'    const lhr = r.l_per_hr ? Number(r.l_per_hr).toFixed(2) : \'—\';\n' +
'    const gaugeCell = r.gauge_pct != null\n' +
'      ? \'<span style="background:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;">\' + r.gauge_pct + \'%</span>\'\n' +
'      : \'—\';\n' +
'    return \'<tr>\' +\n' +
'      \'<td>\' + formatDate(r.dispense_date) + \'</td>\' +\n' +
'      \'<td style="color:#64748B;font-size:12px;">\' + (r.dispense_time ? r.dispense_time.substring(0,5) : \'—\') + \'</td>\' +\n' +
'      \'<td style="font-weight:700;">\' + unit + \'</td>\' +\n' +
'      \'<td>\' + Number(r.hm_at_fill).toLocaleString(\'id\') + \'</td>\' +\n' +
'      \'<td style="color:#1D4ED8;font-weight:600;">\' + tc + \'</td>\' +\n' +
'      \'<td>\' + drum + \'</td>\' +\n' +
'      \'<td>\' + bunker + \'</td>\' +\n' +
'      \'<td style="color:#64748B;font-size:12px;">\' + (r.project || \'—\') + \'</td>\' +\n' +
'      \'<td>\' + r.liters_dispensed + \'L</td>\' +\n' +
'      \'<td>\' + gaugeCell + \'</td>\' +\n' +
'      \'<td style="color:\' + (r.l_per_hr ? \'#16A34A\' : \'#94A3B8\') + \';font-weight:700;">\' + lhr + \'</td>\' +\n' +
'      \'<td><button onclick="deletePengisian(this.dataset.did,this.dataset.tid)" data-did="\' + r.id + \'" data-tid="\' + (r.fuel_transfers ? r.fuel_transfers.id : \'\') + \'" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;">Hapus</button></td>\' +\n' +
'      \'</tr>\';\n' +
'  };\n' +
'  const xferRow = (r) => {\n' +
'    const bunker = r.fuel_bunkers ? r.fuel_bunkers.bunker_code : \'—\';\n' +
'    const fromL = r.from_tank.charAt(0).toUpperCase() + r.from_tank.slice(1);\n' +
'    const toL = r.to_tank.charAt(0).toUpperCase() + r.to_tank.slice(1);\n' +
'    return \'<tr style="background:#EFF6FF;">\' +\n' +
'      \'<td>\' + formatDate(r.transfer_date) + \'</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'<td><span style="background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;">PINDAH</span></td>\' +\n' +
'      \'<td>—</td><td>—</td>\' +\n' +
'      \'<td style="font-weight:600;color:#1D4ED8;">\' + fromL + \' → \' + toL + \'</td>\' +\n' +
'      \'<td>\' + bunker + \'</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'<td>\' + Number(r.volume_liters).toLocaleString(\'id\') + \'L</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'<td><button onclick="deleteTankTransfer(this.dataset.id)" data-id="\' + r.id + \'" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;">Hapus</button></td>\' +\n' +
'      \'</tr>\';\n' +
'  };\n' +
'  const bunkerRow = (r) => {\n' +
'    return \'<tr style="background:#F0FDF4;">\' +\n' +
'      \'<td>\' + formatDate(r.delivery_date) + \'</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'<td><span style="background:#DCFCE7;color:#166534;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;">TERIMA</span></td>\' +\n' +
'      \'<td>—</td><td>—</td>\' +\n' +
'      \'<td style="font-weight:600;color:#166534;">→ Hijau</td>\' +\n' +
'      \'<td>\' + r.bunker_code + \'</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'<td style="color:#166534;font-weight:700;">+\' + Number(r.total_liters).toLocaleString(\'id\') + \'L</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'<td>—</td>\' +\n' +
'      \'</tr>\';\n' +
'  };\n' +
'  const hdr = \'<thead><tr><th>Tanggal</th><th>Jam</th><th>Unit</th><th>HM</th><th>Transfer</th><th>Drum / Rute</th><th>Bunker</th><th>Project</th><th>Liter</th><th>Gauge</th><th>L/Hr</th><th></th></tr></thead>\';\n' +
'  let body = \'\';\n' +
'  if (fuelRiwayatSort === \'date\') {\n' +
'    const all = [\n' +
'      ...filtDisp.map(r => ({ ...r, _d: r.dispense_date })),\n' +
'      ...filtXfer.map(r => ({ ...r, _d: r.transfer_date })),\n' +
'      ...filtBunkers.map(r => ({ ...r, _d: r.delivery_date }))\n' +
'    ].sort((a,b) => b._d.localeCompare(a._d));\n' +
'    body = \'<tbody>\' + all.map(r => r._type === \'xfer\' ? xferRow(r) : r._type === \'bunker\' ? bunkerRow(r) : dispRow(r)).join(\'\') + \'</tbody>\';\n' +
'  } else if (fuelRiwayatSort === \'unit\') {\n' +
'    const grps = {};\n' +
'    filtDisp.forEach(r => { const k = r.units ? r.units.code : \'—\'; if (!grps[k]) grps[k] = []; grps[k].push(r); });\n' +
'    Object.keys(grps).sort().forEach(k => {\n' +
'      body += \'<tbody><tr style="background:#EFF6FF;"><td colspan="12" style="font-weight:800;color:#1D4ED8;padding:8px 12px;">\' + k + \'</td></tr>\' + grps[k].map(dispRow).join(\'\') + \'</tbody>\';\n' +
'    });\n' +
'    if (filtXfer.length) body += \'<tbody><tr style="background:#DBEAFE;"><td colspan="12" style="font-weight:800;color:#1E40AF;padding:8px 12px;">Pindah Antar Tanki</td></tr>\' + filtXfer.map(xferRow).join(\'\') + \'</tbody>\';\n' +
'    if (filtBunkers.length) body += \'<tbody><tr style="background:#DCFCE7;"><td colspan="12" style="font-weight:800;color:#166534;padding:8px 12px;">Terima Bunker</td></tr>\' + filtBunkers.map(bunkerRow).join(\'\') + \'</tbody>\';\n' +
'  } else {\n' +
'    const grps = {};\n' +
'    filtDisp.forEach(r => { const k = r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : \'—\'; if (!grps[k]) grps[k] = []; grps[k].push(r); });\n' +
'    filtXfer.forEach(r => { const k = r.fuel_bunkers ? r.fuel_bunkers.bunker_code : \'—\'; if (!grps[k]) grps[k] = []; grps[k].push(r); });\n' +
'    filtBunkers.forEach(r => { const k = r.bunker_code || \'—\'; if (!grps[k]) grps[k] = []; grps[k].push(r); });\n' +
'    Object.keys(grps).sort((a,b) => { const na=parseInt(a.replace(\'X\',\'\'),10),nb=parseInt(b.replace(\'X\',\'\'),10); return nb-na; }).forEach(k => {\n' +
'      body += \'<tbody><tr style="background:#F0FDF4;"><td colspan="12" style="font-weight:800;color:#166534;padding:8px 12px;">\' + k + \'</td></tr>\' + grps[k].map(r => r._type === \'xfer\' ? xferRow(r) : r._type === \'bunker\' ? bunkerRow(r) : dispRow(r)).join(\'\') + \'</tbody>\';\n' +
'    });\n' +
'  }\n' +
'  el.innerHTML = filterRow + sortPills + \'<div class="table-wrap"><table class="dt">\' + hdr + body + \'</table></div>\';\n' +
'}');

fs.writeFileSync(path, html, 'utf8');
console.log('\nDone. Lines:', html.split('\n').length);
