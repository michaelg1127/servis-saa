const fs = require('fs');
const path = 'C:/Users/upsca/Documents/SERVIS-SAA/index.html';
let html = fs.readFileSync(path, 'utf8');

function replaceExact(from, to, desc) {
  const count = (html.split(from).length - 1);
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
    if (c === '`' && !inStr1 && !inStr2) { inTpl = inTpl ? 0 : 1; i++; continue; }
    if (inStr1 || inStr2 || inTpl) { i++; continue; }
    if (c === '{') { braces++; started = true; }
    else if (c === '}') { braces--; if (started && braces === 0) { i++; break; } }
    i++;
  }
  const end = i;
  html = html.slice(0, start) + prefix + name + newBody + html.slice(end);
  console.log('OK: replaceFn', name);
}

// 1. Fix getNextBunkerCode: filter to X-series only, fallback X24
replaceExact(
  "async function getNextBunkerCode() {\n  const { data } = await sb.from('fuel_bunkers').select('bunker_code').order('created_at', { ascending: false }).limit(1);\n  if (!data || data.length === 0) return 'X26';\n  const last = data[0].bunker_code;\n  const num = parseInt(last.replace('X',''), 10);\n  return isNaN(num) ? 'X26' : 'X' + (num + 1);\n}",
  "async function getNextBunkerCode() {\n  const { data } = await sb.from('fuel_bunkers').select('bunker_code').like('bunker_code', 'X%').order('created_at', { ascending: false }).limit(1);\n  if (!data || data.length === 0) return 'X24';\n  const last = data[0].bunker_code;\n  const num = parseInt(last.replace('X',''), 10);\n  return isNaN(num) ? 'X24' : 'X' + (num + 1);\n}",
  'getNextBunkerCode: X-series filter + fallback X24'
);

// 2. Add fuelBunkerData global
replaceExact(
  'let fuelTankXferData = [];\nlet bbmLastDispenseByUnit = {};',
  'let fuelTankXferData = [];\nlet fuelBunkerData = [];\nlet bbmLastDispenseByUnit = {};',
  'add fuelBunkerData global'
);

// 3. Rewrite loadFuelRiwayat with third parallel query for fuel_bunkers
replaceFn('loadFuelRiwayat', true, '() {\n' +
'  const el = document.getElementById(\'bbm-panel-riwayat\');\n' +
'  if (!el) return;\n' +
'  el.innerHTML = \'<div style="padding:20px;text-align:center;"><div class="spinner"></div></div>\';\n' +
'  try {\n' +
'    const [{ data: dispenses, error: e1 }, { data: xfers, error: e2 }, { data: bunkers, error: e3 }] = await Promise.all([\n' +
'      sb.from(\'fuel_dispenses\')\n' +
'        .select(\'id, dispense_date, dispense_time, hm_at_fill, liters_dispensed, l_per_hr, project, notes, units(id, code, name), fuel_transfers(id, transfer_code, drum_name, fuel_bunkers(bunker_code))\')\n' +
'        .order(\'dispense_date\', { ascending: false }).order(\'created_at\', { ascending: false }),\n' +
'      sb.from(\'fuel_tank_transfers\')\n' +
'        .select(\'id, from_tank, to_tank, volume_liters, transfer_date, notes, fuel_bunkers(bunker_code)\')\n' +
'        .not(\'bunker_id\', \'is\', null)\n' +
'        .order(\'transfer_date\', { ascending: false }).order(\'created_at\', { ascending: false }),\n' +
'      sb.from(\'fuel_bunkers\')\n' +
'        .select(\'id, bunker_code, tank_name, total_liters, delivery_date\')\n' +
'        .order(\'delivery_date\', { ascending: false }),\n' +
'    ]);\n' +
'    if (e1) throw e1;\n' +
'    if (e2) throw e2;\n' +
'    if (e3) throw e3;\n' +
'    fuelRiwayatData = (dispenses || []).map(r => ({ ...r, _type: \'dispense\' }));\n' +
'    fuelTankXferData = (xfers || []).map(r => ({ ...r, _type: \'xfer\' }));\n' +
'    fuelBunkerData = (bunkers || []).map(r => ({ ...r, _type: \'bunker\' }));\n' +
'    renderFuelRiwayat();\n' +
'  } catch(e) { el.innerHTML = \'<div style="color:#DC2626;padding:16px;">Gagal: \' + e.message + \'</div>\'; }\n' +
'}');

// 4. Rewrite renderFuelRiwayat with TERIMA rows for fuel_bunkers
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
'    const unit = r.units ? r.units.code : \'\\u2014\';\n' +
'    const tc = r.fuel_transfers ? r.fuel_transfers.transfer_code : \'\\u2014\';\n' +
'    const drum = r.fuel_transfers ? r.fuel_transfers.drum_name : \'\\u2014\';\n' +
'    const bunker = r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : \'\\u2014\';\n' +
'    const lhr = r.l_per_hr ? Number(r.l_per_hr).toFixed(2) : \'\\u2014\';\n' +
'    return \'<tr>\' +\n' +
'      \'<td>\' + formatDate(r.dispense_date) + \'</td>\' +\n' +
'      \'<td style="color:#64748B;font-size:12px;">\' + (r.dispense_time ? r.dispense_time.substring(0,5) : \'\\u2014\') + \'</td>\' +\n' +
'      \'<td style="font-weight:700;">\' + unit + \'</td>\' +\n' +
'      \'<td>\' + Number(r.hm_at_fill).toLocaleString(\'id\') + \'</td>\' +\n' +
'      \'<td style="color:#1D4ED8;font-weight:600;">\' + tc + \'</td>\' +\n' +
'      \'<td>\' + drum + \'</td>\' +\n' +
'      \'<td>\' + bunker + \'</td>\' +\n' +
'      \'<td style="color:#64748B;font-size:12px;">\' + (r.project || \'\\u2014\') + \'</td>\' +\n' +
'      \'<td>\' + r.liters_dispensed + \'L</td>\' +\n' +
'      \'<td style="color:\' + (r.l_per_hr ? \'#16A34A\' : \'#94A3B8\') + \';font-weight:700;">\' + lhr + \'</td>\' +\n' +
'      \'<td><button onclick="deletePengisian(this.dataset.did,this.dataset.tid)" data-did="\' + r.id + \'" data-tid="\' + (r.fuel_transfers ? r.fuel_transfers.id : \'\') + \'" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;">Hapus</button></td>\' +\n' +
'      \'</tr>\';\n' +
'  };\n' +
'  const xferRow = (r) => {\n' +
'    const bunker = r.fuel_bunkers ? r.fuel_bunkers.bunker_code : \'\\u2014\';\n' +
'    const fromL = r.from_tank.charAt(0).toUpperCase() + r.from_tank.slice(1);\n' +
'    const toL = r.to_tank.charAt(0).toUpperCase() + r.to_tank.slice(1);\n' +
'    return \'<tr style="background:#EFF6FF;">\' +\n' +
'      \'<td>\' + formatDate(r.transfer_date) + \'</td>\' +\n' +
'      \'<td>\\u2014</td>\' +\n' +
'      \'<td><span style="background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;">PINDAH</span></td>\' +\n' +
'      \'<td>\\u2014</td><td>\\u2014</td>\' +\n' +
'      \'<td style="font-weight:600;color:#1D4ED8;">\' + fromL + \' \\u2192 \' + toL + \'</td>\' +\n' +
'      \'<td>\' + bunker + \'</td>\' +\n' +
'      \'<td>\\u2014</td>\' +\n' +
'      \'<td>\' + Number(r.volume_liters).toLocaleString(\'id\') + \'L</td>\' +\n' +
'      \'<td>\\u2014</td>\' +\n' +
'      \'<td><button onclick="deleteTankTransfer(this.dataset.id)" data-id="\' + r.id + \'" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;">Hapus</button></td>\' +\n' +
'      \'</tr>\';\n' +
'  };\n' +
'  const bunkerRow = (r) => {\n' +
'    return \'<tr style="background:#F0FDF4;">\' +\n' +
'      \'<td>\' + formatDate(r.delivery_date) + \'</td>\' +\n' +
'      \'<td>\\u2014</td>\' +\n' +
'      \'<td><span style="background:#DCFCE7;color:#166534;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;">TERIMA</span></td>\' +\n' +
'      \'<td>\\u2014</td><td>\\u2014</td>\' +\n' +
'      \'<td style="font-weight:600;color:#166534;">\\u2192 Hijau</td>\' +\n' +
'      \'<td>\' + r.bunker_code + \'</td>\' +\n' +
'      \'<td>\\u2014</td>\' +\n' +
'      \'<td style="color:#166534;font-weight:700;">+\' + Number(r.total_liters).toLocaleString(\'id\') + \'L</td>\' +\n' +
'      \'<td>\\u2014</td>\' +\n' +
'      \'<td>\\u2014</td>\' +\n' +
'      \'</tr>\';\n' +
'  };\n' +
'  const hdr = \'<thead><tr><th>Tanggal</th><th>Jam</th><th>Unit</th><th>HM</th><th>Transfer</th><th>Drum / Rute</th><th>Bunker</th><th>Project</th><th>Liter</th><th>L/Hr</th><th></th></tr></thead>\';\n' +
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
'    filtDisp.forEach(r => { const k = r.units ? r.units.code : \'\\u2014\'; if (!grps[k]) grps[k] = []; grps[k].push(r); });\n' +
'    Object.keys(grps).sort().forEach(k => {\n' +
'      body += \'<tbody><tr style="background:#EFF6FF;"><td colspan="11" style="font-weight:800;color:#1D4ED8;padding:8px 12px;">\' + k + \'</td></tr>\' + grps[k].map(dispRow).join(\'\') + \'</tbody>\';\n' +
'    });\n' +
'    if (filtXfer.length) body += \'<tbody><tr style="background:#DBEAFE;"><td colspan="11" style="font-weight:800;color:#1E40AF;padding:8px 12px;">Pindah Antar Tanki</td></tr>\' + filtXfer.map(xferRow).join(\'\') + \'</tbody>\';\n' +
'    if (filtBunkers.length) body += \'<tbody><tr style="background:#DCFCE7;"><td colspan="11" style="font-weight:800;color:#166534;padding:8px 12px;">Terima Bunker</td></tr>\' + filtBunkers.map(bunkerRow).join(\'\') + \'</tbody>\';\n' +
'  } else {\n' +
'    const grps = {};\n' +
'    filtDisp.forEach(r => { const k = r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : \'\\u2014\'; if (!grps[k]) grps[k] = []; grps[k].push(r); });\n' +
'    filtXfer.forEach(r => { const k = r.fuel_bunkers ? r.fuel_bunkers.bunker_code : \'\\u2014\'; if (!grps[k]) grps[k] = []; grps[k].push(r); });\n' +
'    filtBunkers.forEach(r => { const k = r.bunker_code || \'\\u2014\'; if (!grps[k]) grps[k] = []; grps[k].push(r); });\n' +
'    Object.keys(grps).sort((a,b) => { const na=parseInt(a.replace(\'X\',\'\'),10),nb=parseInt(b.replace(\'X\',\'\'),10); return nb-na; }).forEach(k => {\n' +
'      body += \'<tbody><tr style="background:#F0FDF4;"><td colspan="11" style="font-weight:800;color:#166534;padding:8px 12px;">\' + k + \'</td></tr>\' + grps[k].map(r => r._type === \'xfer\' ? xferRow(r) : r._type === \'bunker\' ? bunkerRow(r) : dispRow(r)).join(\'\') + \'</tbody>\';\n' +
'    });\n' +
'  }\n' +
'  el.innerHTML = filterRow + sortPills + \'<div class="table-wrap"><table class="dt">\' + hdr + body + \'</table></div>\';\n' +
'}');

// 5. deleteBunkerRecord: also refresh fuelBunkerData and re-render Riwayat
replaceExact(
  '  showToast(\'Bunker berhasil dihapus.\', \'success\');\n  await loadBunkerHistory();\n  await onTerimaChange();\n  loadFuelStatus();\n}',
  '  showToast(\'Bunker berhasil dihapus.\', \'success\');\n  await loadBunkerHistory();\n  await onTerimaChange();\n  loadFuelStatus();\n  fuelBunkerData = fuelBunkerData.filter(r => String(r.id) !== String(id));\n  renderFuelRiwayat();\n}',
  'deleteBunkerRecord: refresh fuelBunkerData + re-render Riwayat'
);

fs.writeFileSync(path, html, 'utf8');
console.log('\nDone. Lines:', html.split('\n').length);
