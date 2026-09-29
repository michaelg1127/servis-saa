const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Helper: find and replace a top-level function (from "function name" to the next top-level function)
function replaceFn(label, fnSignature, newFnText) {
  const start = html.indexOf('\n' + fnSignature);
  if (start === -1) throw new Error(label + ': function not found: ' + fnSignature);
  // Find end: next line that starts a new top-level function
  let pos = start + 1;
  let braceDepth = 0;
  let inBody = false;
  for (let i = pos; i < html.length; i++) {
    const c = html[i];
    if (c === '{') { braceDepth++; inBody = true; }
    else if (c === '}') {
      braceDepth--;
      if (inBody && braceDepth === 0) {
        // end of function
        html = html.slice(0, start + 1) + newFnText + html.slice(i + 1);
        console.log('OK:', label);
        return;
      }
    }
  }
  throw new Error(label + ': could not find function end');
}

function replaceExact(label, oldStr, newStr) {
  const count = html.split(oldStr).length - 1;
  if (count !== 1) throw new Error(label + ': expected 1 match, got ' + count);
  html = html.replace(oldStr, newStr);
  console.log('OK:', label);
}

// ─────────────────────────────────────────────────────────────
// 1. Add fuelTankXferData global
// ─────────────────────────────────────────────────────────────
replaceExact(
  'add fuelTankXferData global',
  "let fuelRiwayatFilters = { bunker: '', unit: '', project: '' };",
  "let fuelRiwayatFilters = { bunker: '', unit: '', project: '' };\nlet fuelTankXferData = [];"
);

// ─────────────────────────────────────────────────────────────
// 2. Replace openTankTransferModal (now async, adds bunker row)
// ─────────────────────────────────────────────────────────────
replaceFn('openTankTransferModal', 'function openTankTransferModal() {', `async function openTankTransferModal() {
  const { data: bunkers } = await sb.from('fuel_bunkers').select('id, bunker_code, tank_name, total_liters').order('delivery_date', { ascending: false });
  const hijauBunkers = (bunkers || []).filter(b => b.tank_name === 'hijau');
  const bunkerOptHtml = '<option value="">-- Pilih Bunker --</option>' + hijauBunkers.map(b => '<option value="' + b.id + '">' + b.bunker_code + ' (' + Number(b.total_liters).toLocaleString('id') + 'L)</option>').join('');
  showModal(
    '<div style="font-size:16px;font-weight:700;color:#1E293B;margin-bottom:16px;">Pindah Antar Tanki</div>' +
    '<div style="margin-bottom:12px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Dari Tanki</label>' +
    '<select id="tt-from" class="finput" onchange="onTankFromChange()"><option value="">-- Pilih --</option><option value="hijau">Tanki Hijau</option><option value="merah">Tanki Merah</option><option value="kuning">Tanki Kuning</option></select></div>' +
    '<div id="tt-bunker-row" style="display:none;margin-bottom:12px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Bunker <span style="color:#DC2626;">*</span></label>' +
    '<select id="tt-bunker" class="finput">' + bunkerOptHtml + '</select></div>' +
    '<div style="margin-bottom:12px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Ke Tanki</label>' +
    '<select id="tt-to" class="finput"><option value="">-- Pilih --</option><option value="hijau">Tanki Hijau</option><option value="merah">Tanki Merah</option><option value="kuning">Tanki Kuning</option></select></div>' +
    '<div style="margin-bottom:12px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Volume (L)</label>' +
    '<input type="number" id="tt-vol" class="finput" placeholder="Jumlah liter" min="1"></div>' +
    '<div style="margin-bottom:16px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Tanggal</label>' +
    '<input type="date" id="tt-date" class="finput" value="' + todayISO() + '"></div>' +
    '<div style="margin-bottom:16px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Catatan</label>' +
    '<textarea id="tt-notes" class="finput" rows="2" placeholder="Opsional..."></textarea></div>' +
    '<div style="display:flex;gap:8px;"><button onclick="submitTankTransfer()" class="btn-primary" style="flex:1;">Simpan</button><button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button></div>'
  );
}

function onTankFromChange() {
  const from = document.getElementById('tt-from').value;
  const row = document.getElementById('tt-bunker-row');
  if (row) row.style.display = from === 'hijau' ? 'block' : 'none';
}`);

// ─────────────────────────────────────────────────────────────
// 3. Replace submitTankTransfer (include bunker_id, validate hijau)
// ─────────────────────────────────────────────────────────────
replaceFn('submitTankTransfer', 'async function submitTankTransfer() {', `async function submitTankTransfer() {
  const from_tank = document.getElementById('tt-from').value;
  const to_tank = document.getElementById('tt-to').value;
  const vol = parseFloat(document.getElementById('tt-vol').value);
  const date = document.getElementById('tt-date').value;
  const notes = document.getElementById('tt-notes').value.trim();
  const bunkerEl = document.getElementById('tt-bunker');
  const bunker_id = bunkerEl ? bunkerEl.value : '';
  if (!from_tank || !to_tank || !vol || !date) { showToast('Semua field wajib diisi.'); return; }
  if (from_tank === to_tank) { showToast('Tanki asal dan tujuan tidak boleh sama.'); return; }
  if (from_tank === 'hijau' && !bunker_id) { showToast('Pilih bunker untuk transfer dari Tanki Hijau.'); return; }
  try {
    const payload = { from_tank, to_tank, volume_liters: vol, transfer_date: date, notes: notes || null };
    if (bunker_id) payload.bunker_id = bunker_id;
    const { error } = await sb.from('fuel_tank_transfers').insert(payload);
    if (error) throw error;
    closeModal();
    showToast('Transfer berhasil dicatat.', 'success');
    loadFuelStatus();
  } catch(e) { showToast('Gagal: ' + e.message); }
}`);

// ─────────────────────────────────────────────────────────────
// 4. Replace loadFuelRiwayat (also fetch tank transfers with bunker)
// ─────────────────────────────────────────────────────────────
replaceFn('loadFuelRiwayat', 'async function loadFuelRiwayat() {', `async function loadFuelRiwayat() {
  const el = document.getElementById('bbm-panel-riwayat');
  if (!el) return;
  el.innerHTML = '<div style="padding:20px;text-align:center;"><div class="spinner"></div></div>';
  try {
    const [{ data: dispenses, error: e1 }, { data: xfers, error: e2 }] = await Promise.all([
      sb.from('fuel_dispenses')
        .select('id, dispense_date, dispense_time, hm_at_fill, liters_dispensed, l_per_hr, project, notes, units(id, code, name), fuel_transfers(id, transfer_code, drum_name, fuel_bunkers(bunker_code))')
        .order('dispense_date', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('fuel_tank_transfers')
        .select('id, from_tank, to_tank, volume_liters, transfer_date, notes, fuel_bunkers(bunker_code)')
        .not('bunker_id', 'is', null)
        .order('transfer_date', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    fuelRiwayatData = (dispenses || []).map(r => ({ ...r, _type: 'dispense' }));
    fuelTankXferData = (xfers || []).map(r => ({ ...r, _type: 'xfer' }));
    renderFuelRiwayat();
  } catch(e) { el.innerHTML = '<div style="color:#DC2626;padding:16px;">Gagal: ' + e.message + '</div>'; }
}`);

// ─────────────────────────────────────────────────────────────
// 5. Replace renderFuelRiwayat (unified table: dispenses + tank transfers)
// ─────────────────────────────────────────────────────────────
replaceFn('renderFuelRiwayat', 'function renderFuelRiwayat() {', `function renderFuelRiwayat() {
  const el = document.getElementById('bbm-panel-riwayat');
  if (!el) return;
  const bunkerFromDisp = fuelRiwayatData.map(r => r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : null);
  const bunkerFromXfer = fuelTankXferData.map(r => r.fuel_bunkers ? r.fuel_bunkers.bunker_code : null);
  const bunkerOpts = [...new Set([...bunkerFromDisp, ...bunkerFromXfer].filter(Boolean))].sort((a,b) => { const na=parseInt(a.replace('X',''),10),nb=parseInt(b.replace('X',''),10); return nb-na; });
  const unitOpts = [...new Set(fuelRiwayatData.map(r => r.units ? r.units.code : null).filter(Boolean))].sort();
  const projectOpts = [...new Set(fuelRiwayatData.map(r => r.project).filter(Boolean))].sort();
  const filterRow = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">' +
    '<select onchange="fuelRiwayatFilters.bunker=this.value;renderFuelRiwayat()" style="padding:6px 10px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;background:white;">' +
    '<option value="">Semua Bunker</option>' + bunkerOpts.map(b => '<option value="' + b + '"' + (fuelRiwayatFilters.bunker===b ? ' selected' : '') + '>' + b + '</option>').join('') + '</select>' +
    '<select onchange="fuelRiwayatFilters.unit=this.value;renderFuelRiwayat()" style="padding:6px 10px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;background:white;">' +
    '<option value="">Semua Unit</option>' + unitOpts.map(u => '<option value="' + u + '"' + (fuelRiwayatFilters.unit===u ? ' selected' : '') + '>' + u + '</option>').join('') + '</select>' +
    '<select onchange="fuelRiwayatFilters.project=this.value;renderFuelRiwayat()" style="padding:6px 10px;border:1.5px solid #E2E8F0;border-radius:8px;font-size:13px;background:white;">' +
    '<option value="">Semua Project</option>' + projectOpts.map(p => '<option value="' + p + '"' + (fuelRiwayatFilters.project===p ? ' selected' : '') + '>' + p + '</option>').join('') + '</select>' +
  '</div>';
  const sortPills = '<div id="bbm-riwayat-sort-pills" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">' +
    '<button class="filter-pill' + (fuelRiwayatSort==='date' ? ' on' : '') + '" onclick="setFuelRiwayatSort(this.dataset.s,this)" data-s="date">Terbaru</button>' +
    '<button class="filter-pill' + (fuelRiwayatSort==='unit' ? ' on' : '') + '" onclick="setFuelRiwayatSort(this.dataset.s,this)" data-s="unit">Per Unit</button>' +
    '<button class="filter-pill' + (fuelRiwayatSort==='bunker' ? ' on' : '') + '" onclick="setFuelRiwayatSort(this.dataset.s,this)" data-s="bunker">Per Bunker</button>' +
  '</div>';
  let filtDisp = fuelRiwayatData.slice();
  let filtXfer = fuelTankXferData.slice();
  if (fuelRiwayatFilters.bunker) {
    filtDisp = filtDisp.filter(r => r.fuel_transfers && r.fuel_transfers.fuel_bunkers && r.fuel_transfers.fuel_bunkers.bunker_code === fuelRiwayatFilters.bunker);
    filtXfer = filtXfer.filter(r => r.fuel_bunkers && r.fuel_bunkers.bunker_code === fuelRiwayatFilters.bunker);
  }
  if (fuelRiwayatFilters.unit) { filtDisp = filtDisp.filter(r => r.units && r.units.code === fuelRiwayatFilters.unit); filtXfer = []; }
  if (fuelRiwayatFilters.project) { filtDisp = filtDisp.filter(r => r.project === fuelRiwayatFilters.project); filtXfer = []; }
  if (!filtDisp.length && !filtXfer.length) {
    el.innerHTML = filterRow + sortPills + '<div style="color:#94A3B8;padding:20px;">Belum ada data.</div>';
    return;
  }
  const dispRow = (r) => {
    const unit = r.units ? r.units.code : '—';
    const tc = r.fuel_transfers ? r.fuel_transfers.transfer_code : '—';
    const drum = r.fuel_transfers ? r.fuel_transfers.drum_name : '—';
    const bunker = r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : '—';
    const lhr = r.l_per_hr ? Number(r.l_per_hr).toFixed(2) : '—';
    return '<tr>' +
      '<td>' + formatDate(r.dispense_date) + '</td>' +
      '<td style="color:#64748B;font-size:12px;">' + (r.dispense_time ? r.dispense_time.substring(0,5) : '—') + '</td>' +
      '<td style="font-weight:700;">' + unit + '</td>' +
      '<td>' + Number(r.hm_at_fill).toLocaleString('id') + '</td>' +
      '<td style="color:#1D4ED8;font-weight:600;">' + tc + '</td>' +
      '<td>' + drum + '</td>' +
      '<td>' + bunker + '</td>' +
      '<td style="color:#64748B;font-size:12px;">' + (r.project || '—') + '</td>' +
      '<td>' + r.liters_dispensed + 'L</td>' +
      '<td style="color:' + (r.l_per_hr ? '#16A34A' : '#94A3B8') + ';font-weight:700;">' + lhr + '</td>' +
      '<td><button onclick="deletePengisian(this.dataset.did,this.dataset.tid)" data-did="' + r.id + '" data-tid="' + (r.fuel_transfers ? r.fuel_transfers.id : '') + '" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;">Hapus</button></td>' +
      '</tr>';
  };
  const xferRow = (r) => {
    const bunker = r.fuel_bunkers ? r.fuel_bunkers.bunker_code : '—';
    const fromL = r.from_tank.charAt(0).toUpperCase() + r.from_tank.slice(1);
    const toL = r.to_tank.charAt(0).toUpperCase() + r.to_tank.slice(1);
    return '<tr style="background:#EFF6FF;">' +
      '<td>' + formatDate(r.transfer_date) + '</td>' +
      '<td>—</td>' +
      '<td><span style="background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;">PINDAH</span></td>' +
      '<td>—</td><td>—</td>' +
      '<td style="font-weight:600;color:#1D4ED8;">' + fromL + ' → ' + toL + '</td>' +
      '<td>' + bunker + '</td>' +
      '<td>—</td>' +
      '<td>' + Number(r.volume_liters).toLocaleString('id') + 'L</td>' +
      '<td>—</td>' +
      '<td><button onclick="deleteTankTransfer(this.dataset.id)" data-id="' + r.id + '" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:3px 8px;font-size:12px;cursor:pointer;font-weight:700;">Hapus</button></td>' +
      '</tr>';
  };
  const hdr = '<thead><tr><th>Tanggal</th><th>Jam</th><th>Unit</th><th>HM</th><th>Transfer</th><th>Drum / Rute</th><th>Bunker</th><th>Project</th><th>Liter</th><th>L/Hr</th><th></th></tr></thead>';
  let body = '';
  if (fuelRiwayatSort === 'date') {
    const all = [...filtDisp.map(r => ({ ...r, _d: r.dispense_date })), ...filtXfer.map(r => ({ ...r, _d: r.transfer_date }))].sort((a,b) => b._d.localeCompare(a._d));
    body = '<tbody>' + all.map(r => r._type === 'xfer' ? xferRow(r) : dispRow(r)).join('') + '</tbody>';
  } else if (fuelRiwayatSort === 'unit') {
    const grps = {};
    filtDisp.forEach(r => { const k = r.units ? r.units.code : '—'; if (!grps[k]) grps[k] = []; grps[k].push(r); });
    Object.keys(grps).sort().forEach(k => {
      body += '<tbody><tr style="background:#EFF6FF;"><td colspan="11" style="font-weight:800;color:#1D4ED8;padding:8px 12px;">' + k + '</td></tr>' + grps[k].map(dispRow).join('') + '</tbody>';
    });
    if (filtXfer.length) body += '<tbody><tr style="background:#DBEAFE;"><td colspan="11" style="font-weight:800;color:#1E40AF;padding:8px 12px;">Pindah Antar Tanki</td></tr>' + filtXfer.map(xferRow).join('') + '</tbody>';
  } else {
    const grps = {};
    filtDisp.forEach(r => { const k = r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : '—'; if (!grps[k]) grps[k] = []; grps[k].push(r); });
    filtXfer.forEach(r => { const k = r.fuel_bunkers ? r.fuel_bunkers.bunker_code : '—'; if (!grps[k]) grps[k] = []; grps[k].push(r); });
    Object.keys(grps).sort((a,b) => { const na=parseInt(a.replace('X',''),10),nb=parseInt(b.replace('X',''),10); return nb-na; }).forEach(k => {
      body += '<tbody><tr style="background:#F0FDF4;"><td colspan="11" style="font-weight:800;color:#166534;padding:8px 12px;">' + k + '</td></tr>' + grps[k].map(r => r._type === 'xfer' ? xferRow(r) : dispRow(r)).join('') + '</tbody>';
    });
  }
  el.innerHTML = filterRow + sortPills + '<div class="table-wrap"><table class="dt">' + hdr + body + '</table></div>';
}`);

// ─────────────────────────────────────────────────────────────
// 6. Add deleteTankTransfer after deletePengisian
// ─────────────────────────────────────────────────────────────
const insertAfter = 'async function deletePengisian(dispenseId, transferId) {';
const insertAfterIdx = html.indexOf('\n' + insertAfter);
if (insertAfterIdx === -1) throw new Error('deletePengisian not found');
// Find end of deletePengisian
let depth = 0, inFn = false, endIdx = -1;
for (let i = insertAfterIdx + 1; i < html.length; i++) {
  if (html[i] === '{') { depth++; inFn = true; }
  else if (html[i] === '}') { depth--; if (inFn && depth === 0) { endIdx = i + 1; break; } }
}
if (endIdx === -1) throw new Error('deletePengisian end not found');
const deleteTankXferFn = `

async function deleteTankTransfer(id) {
  if (!confirm('Hapus transfer ini? Tindakan ini tidak bisa dibatalkan.')) return;
  const { error } = await sb.from('fuel_tank_transfers').delete().eq('id', id);
  if (error) { showToast('Gagal hapus: ' + error.message); return; }
  showToast('Transfer berhasil dihapus.', 'success');
  fuelTankXferData = fuelTankXferData.filter(r => r.id !== id);
  renderFuelRiwayat();
  loadFuelStatus();
}`;
html = html.slice(0, endIdx) + deleteTankXferFn + html.slice(endIdx);
console.log('OK: add deleteTankTransfer');

// ─────────────────────────────────────────────────────────────
// Write & verify
// ─────────────────────────────────────────────────────────────
fs.writeFileSync('index.html', html);
console.log('Written. Running syntax check...');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const js = html.slice(scriptStart + 8, scriptEnd);
fs.writeFileSync('_temp_check.js', js);
