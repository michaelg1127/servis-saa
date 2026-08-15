const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceExact(from, to, desc) {
  if (!html.includes(from)) { console.error('MISS: ' + desc); process.exit(1); }
  const count = html.split(from).length - 1;
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changed++;
  console.log('OK: ' + desc);
}

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

// 1. Remove invoice field from modal HTML (in openAddWoodlogKapalModal)
replaceExact(
  `'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +\r\n    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Harga Solar (Rp/L)</label><input type="number" id="wladd-solar" class="finput" min="0"></div>' +\r\n    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">No. Invoice</label><input type="text" id="wladd-inv" class="finput"></div>' +\r\n    '</div>'`,
  `'<div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:16px;">' +\r\n    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Harga Solar (Rp/L)</label><input type="number" id="wladd-solar" class="finput" min="0"></div>' +\r\n    '</div>'`,
  'remove invoice field from Add modal'
);

// 2. Replace STD salary section in modal HTML with read-only note
replaceExact(
  `'<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary STD (J45–J48) — input manual tonnage</div>' +\r\n    '<div style="background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;">' + stdOpRows + '</div>'`,
  `'<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary STD (J45–J48)</div>' +\r\n    '<div style="background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;color:#64748B;font-size:13px;">Tonnage STD akan diisi saat Edit proyek setelah selesai bongkar.</div>'`,
  'replace STD section with read-only note'
);

// 3. Update submitAddWoodlogKapal: remove inv field + skip STD salary inserts
replaceFn('submitAddWoodlogKapal', true, `async function submitAddWoodlogKapal(shipNum, monthYear) {
  const namaKapal = (document.getElementById('wladd-namakapal') || {}).value ? document.getElementById('wladd-namakapal').value.trim() : '';
  const pemberi = (document.getElementById('wladd-pemberi') || {}).value ? document.getElementById('wladd-pemberi').value.trim() : null;
  const start = (document.getElementById('wladd-start') || {}).value || '';
  const bl = parseFloat((document.getElementById('wladd-bl') || {}).value) || null;
  const rate = parseFloat((document.getElementById('wladd-rate') || {}).value) || null;
  const solar = parseFloat((document.getElementById('wladd-solar') || {}).value) || null;
  const notes = (document.getElementById('wladd-notes') || {}).value ? document.getElementById('wladd-notes').value.trim() : null;
  if (!namaKapal || !start) { showToast('Nama Kapal dan Tgl Mulai wajib diisi.'); return; }
  const mm = monthYear.slice(5, 7);
  const projectCode = 'K' + mm + '-' + String(shipNum).padStart(2, '0');
  try {
    const { data: proj, error: e1 } = await sb.from('projects').insert({
      type: 'woodlog_kapal', project_code: projectCode, ship_number_in_month: shipNum,
      month_year: monthYear, nama_kapal: namaKapal, pemberi_kerja: pemberi,
      start_date: start, total_mt_m3: bl, unit_price: rate,
      harga_solar_rpl: solar, notes: notes
    }).select().single();
    if (e1) throw e1;
    const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });
    const checkedUnits = wlUnits.filter(function(u) {
      const cb = document.getElementById('wl-unit-' + u.id);
      return cb && cb.checked;
    });
    if (checkedUnits.length > 0) {
      const puRows = checkedUnits.map(function(u) {
        const hm = parseFloat((document.getElementById('wl-hmawal-' + u.id) || {}).value) || null;
        const solVal = parseFloat((document.getElementById('wl-solawal-' + u.id) || {}).value);
        return { project_id: proj.id, unit_id: u.id, hm_awal: hm, solar_awal_pct: isNaN(solVal) ? null : solVal };
      });
      const { error: e2 } = await sb.from('project_units').insert(puRows);
      if (e2) throw e2;
    }
    if (bl) {
      const bangauSal = Math.round(bl * 0.9 / 4 * 800);
      const bl4 = bl * 0.9 / 4;
      const bangauRows = WL_BANGAU_OPS.map(function(op) {
        return { project_id: proj.id, operator_name: op, unit_type: 'bangau', tonnage_mt: bl4, salary_amount: bangauSal };
      });
      const { error: e3 } = await sb.from('woodlog_operator_salary').insert(bangauRows);
      if (e3) throw e3;
    }
    closeModal();
    showToast('Proyek ' + projectCode + ' berhasil ditambahkan!', 'success');
    await loadWoodlogKapal();
  } catch(e) { showToast('Gagal: ' + e.message); }
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
