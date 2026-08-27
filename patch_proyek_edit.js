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

// PATCH A1: Analisa Income cell - add Price/MT button
replaceExact(
  `    h += '<td style="padding:8px 10px;text-align:right;">' + fmtRp(income) + '</td>';`,
  `    h += '<td style="padding:8px 10px;text-align:right;">' + fmtRp(income) + '<br><button onclick="event.stopPropagation();proyekAnalisisEdit(\\'' + p.id + '\\',\\'unit_price\\')" style="margin-top:4px;background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:10px;padding:2px 7px;border-radius:5px;cursor:pointer;">✎ Price/MT</button></td>';`,
  'PATCH A1: Analisa Income cell - add Price/MT button'
);

// PATCH A2: Analisa Solar cell - add Rp/L button
replaceExact(
  `    h += '<td style="padding:8px 10px;text-align:right;color:#EF4444;">' + fmtRp(fuelCost) + (p.harga_solar_rpl ? '<br><span style="font-size:10px;color:#94A3B8;">' + Math.round(usedSolarL) + 'L (isi+tangki)</span>' : '') + '</td>';`,
  `    h += '<td style="padding:8px 10px;text-align:right;color:#EF4444;">' + fmtRp(fuelCost) + (p.harga_solar_rpl ? '<br><span style="font-size:10px;color:#94A3B8;">' + Math.round(usedSolarL) + 'L (isi+tangki)</span>' : '') + '<br><button onclick="event.stopPropagation();proyekAnalisisEdit(\\'' + p.id + '\\',\\'harga_solar_rpl\\')" style="margin-top:4px;background:#FFF7ED;border:1px solid #FED7AA;color:#EA580C;font-size:10px;padding:2px 7px;border-radius:5px;cursor:pointer;">✎ Rp/L</button></td>';`,
  'PATCH A2: Analisa Solar cell - add Rp/L button'
);

// PATCH A3: Insert hidden proy-edit row after Analisa main row
replaceExact(
  [
    `    h += '<td style="padding:8px 10px;">' + (isClosed ? '' : '<button onclick="openAddInvoice(\\'' + p.id + '\\')" style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;">Add Invoice</button>') + '</td>';`,
    `    h += '</tr>';`,
    `    if (!isClosed) {`
  ].join(N),
  [
    `    h += '<td style="padding:8px 10px;">' + (isClosed ? '' : '<button onclick="openAddInvoice(\\'' + p.id + '\\')" style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;">Add Invoice</button>') + '</td>';`,
    `    h += '</tr>';`,
    `    h += '<tr id="proy-edit-' + p.id + '" style="display:none;background:#F0F9FF;"><td colspan="13" style="padding:8px 16px;"><div id="proy-edit-inner-' + p.id + '"></div></td></tr>';`,
    `    if (!isClosed) {`
  ].join(N),
  'PATCH A3: Insert hidden proy-edit row after main </tr>'
);

// PATCH A4: Insert proyekAnalisisEdit + proyekAnalisisSave
replaceExact(
  `function openAddInvoice(projectId) {`,
  [
    `function proyekAnalisisEdit(pid, field) {`,
    `  document.querySelectorAll('[id^="proy-edit-"]').forEach(function(r) { r.style.display = 'none'; });`,
    `  const editRow = document.getElementById('proy-edit-' + pid);`,
    `  if (!editRow) return;`,
    `  const inner = document.getElementById('proy-edit-inner-' + pid);`,
    `  if (!inner) return;`,
    `  const panel = document.getElementById('proyek-panel-analisis');`,
    `  const projects = panel._analisisProjects || [];`,
    `  const p = projects.find(function(x) { return String(x.id) === String(pid); });`,
    `  const curVal = p ? (p[field] || '') : '';`,
    `  const label = field === 'unit_price' ? 'Price/MT (Rp/MT)' : 'Harga Solar (Rp/L)';`,
    `  inner.innerHTML = '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;"><span style="font-size:13px;font-weight:600;">' + label + ':</span><input type="number" id="proy-edit-val-' + pid + '" value="' + curVal + '" style="width:160px;padding:5px 8px;font-size:13px;border:1px solid #BFDBFE;border-radius:6px;"><button onclick="proyekAnalisisSave(\\'' + pid + '\\',\\'' + field + '\\')" class="btn-primary" style="padding:5px 14px;font-size:13px;">Simpan</button><button onclick="document.getElementById(\\'proy-edit-' + pid + '\\').style.display=\\'none\\';" class="btn-secondary" style="padding:5px 12px;">Batal</button></div>';`,
    `  editRow.style.display = '';`,
    `}`,
    ``,
    `async function proyekAnalisisSave(pid, field) {`,
    `  const input = document.getElementById('proy-edit-val-' + pid);`,
    `  if (!input) return;`,
    `  const val = parseFloat(input.value);`,
    `  if (isNaN(val) || val < 0) { alert('Nilai tidak valid.'); return; }`,
    `  const upd = {};`,
    `  upd[field] = val;`,
    `  const { error } = await sb.from('projects').update(upd).eq('id', pid);`,
    `  if (error) { alert('Gagal: ' + error.message); return; }`,
    `  await loadProyekAnalisis();`,
    `}`,
    ``,
    `function openAddInvoice(projectId) {`
  ].join(N),
  'PATCH A4: Insert proyekAnalisisEdit + proyekAnalisisSave functions'
);

// PATCH K1: Kapal MT/M3 cell - add Edit BL button
replaceExact(
  `    html2 += '<td style="padding:10px 12px;text-align:right;">' + (p.total_mt_m3 ? p.total_mt_m3.toLocaleString('id-ID') : '—') + '</td>';`,
  `    html2 += '<td style="padding:10px 12px;text-align:right;">' + (p.total_mt_m3 ? p.total_mt_m3.toLocaleString('id-ID') : '—') + '<br><button onclick="event.stopPropagation();openKapalBLEdit(\\'' + p.id + '\\')" style="margin-top:4px;background:#F0FDF4;border:1px solid #BBF7D0;color:#16A34A;font-size:10px;padding:2px 7px;border-radius:5px;cursor:pointer;">✎ Edit BL</button></td>';`,
  'PATCH K1: Kapal MT/M3 cell - add Edit BL button'
);

// PATCH K2: Insert hidden kapal-bledit row
replaceExact(
  [
    `    html2 += '<tr id="kapal-detail-' + p.id + '" style="display:none;background:#F8FAFC;">';`,
    `    _proyekKapalCache[p.id] = p;`,
    `    html2 += '<td colspan="11" style="padding:8px;color:#64748B;font-size:12px;">Klik untuk memuat detail...</td></tr>';`
  ].join(N),
  [
    `    html2 += '<tr id="kapal-detail-' + p.id + '" style="display:none;background:#F8FAFC;">';`,
    `    _proyekKapalCache[p.id] = p;`,
    `    html2 += '<td colspan="11" style="padding:8px;color:#64748B;font-size:12px;">Klik untuk memuat detail...</td></tr>';`,
    `    html2 += '<tr id="kapal-bledit-' + p.id + '" style="display:none;background:#F0F9FF;"><td colspan="11" style="padding:8px 16px;"><div id="kapal-bledit-inner-' + p.id + '"></div></td></tr>';`
  ].join(N),
  'PATCH K2: Insert hidden kapal-bledit row'
);

// PATCH K3: Insert openKapalBLEdit + saveKapalBL before toggleKapalDetail
replaceExact(
  `async function toggleKapalDetail(id) {`,
  [
    `function openKapalBLEdit(id) {`,
    `  document.querySelectorAll('[id^="kapal-bledit-"]').forEach(function(r) { r.style.display = 'none'; });`,
    `  const bleditRow = document.getElementById('kapal-bledit-' + id);`,
    `  if (!bleditRow) return;`,
    `  const inner = document.getElementById('kapal-bledit-inner-' + id);`,
    `  if (!inner) return;`,
    `  const p = _proyekKapalCache[id];`,
    `  const curVal = p ? (p.total_mt_m3 || '') : '';`,
    `  inner.innerHTML = '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;"><span style="font-size:13px;font-weight:600;">Total BL/M3:</span><input type="number" id="kapal-bl-val-' + id + '" value="' + curVal + '" style="width:160px;padding:5px 8px;font-size:13px;border:1px solid #BBF7D0;border-radius:6px;"><button onclick="saveKapalBL(\\'' + id + '\\')" class="btn-primary" style="padding:5px 14px;font-size:13px;">Simpan</button><button onclick="document.getElementById(\\'kapal-bledit-' + id + '\\').style.display=\\'none\\';" class="btn-secondary" style="padding:5px 12px;">Batal</button></div>';`,
    `  bleditRow.style.display = '';`,
    `}`,
    ``,
    `async function saveKapalBL(id) {`,
    `  const input = document.getElementById('kapal-bl-val-' + id);`,
    `  if (!input) return;`,
    `  const val = parseFloat(input.value);`,
    `  if (isNaN(val) || val < 0) { alert('Nilai tidak valid.'); return; }`,
    `  const { error } = await sb.from('projects').update({ total_mt_m3: val }).eq('id', id);`,
    `  if (error) { alert('Gagal: ' + error.message); return; }`,
    `  await loadProyekKapal();`,
    `}`,
    ``,
    `async function toggleKapalDetail(id) {`
  ].join(N),
  'PATCH K3: Insert openKapalBLEdit + saveKapalBL functions'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written - 6 patches applied');
