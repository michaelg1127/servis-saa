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

replaceExact(
  "function initWoodlogModule() {" + R +
  "  switchWoodlogTab('kapal', document.getElementById('wl-tab-kapal'));" + R +
  "}" + R +
  R +
  "async function loadWoodlogRingkasan() {",

  "function initWoodlogModule() {" + R +
  "  switchWoodlogTab('kapal', document.getElementById('wl-tab-kapal'));" + R +
  "}" + R +
  R +
  "async function getNextWoodlogCode(monthYear) {" + R +
  "  const mm = monthYear.slice(5, 7);" + R +
  "  const { data } = await sb.from('projects').select('ship_number_in_month')" + R +
  "    .in('type', ['woodlog_kapal', 'woodlog_hourly']).eq('month_year', monthYear)" + R +
  "    .order('ship_number_in_month', { ascending: false }).limit(1);" + R +
  "  const next = data && data.length > 0 ? (data[0].ship_number_in_month || 0) + 1 : 1;" + R +
  "  return { code: 'K' + mm + '-' + String(next).padStart(2, '0'), num: next };" + R +
  "}" + R +
  R +
  "async function loadWoodlogKapal() {" + R +
  "  const el = document.getElementById('wl-panel-kapal');" + R +
  "  if (!el) return;" + R +
  "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data: projects, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code, name, operator_name))')" + R +
  "      .eq('type', 'woodlog_kapal').order('start_date', { ascending: false });" + R +
  "    if (error) throw error;" + R +
  "    const ids = (projects || []).map(p => p.id);" + R +
  "    let salaryMap = {};" + R +
  "    if (ids.length > 0) {" + R +
  "      const { data: sals } = await sb.from('woodlog_operator_salary').select('*').in('project_id', ids);" + R +
  "      (sals || []).forEach(s => { if (!salaryMap[s.project_id]) salaryMap[s.project_id] = []; salaryMap[s.project_id].push(s); });" + R +
  "    }" + R +
  "    projects.forEach(p => { _wlKapalCache[p.id] = p; });" + R +
  "    renderWoodlogKapalList(projects || [], salaryMap);" + R +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "function renderWoodlogKapalList(projects, salaryMap) {" + R +
  "  const el = document.getElementById('wl-panel-kapal');" + R +
  "  if (!el) return;" + R +
  "  const addBtn = '<button onclick=\"openAddWoodlogKapalModal()\" class=\"btn-primary\" style=\"margin-bottom:16px;\">+ Tambah Proyek Kapal</button>';" + R +
  "  if (projects.length === 0) { el.innerHTML = addBtn + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek kapal woodlog.</div>'; return; }" + R +
  "  const rows = projects.map(function(p) {" + R +
  "    const units = (p.project_units || []).map(u => u.units ? u.units.code : '?').join(', ');" + R +
  "    const status = p.end_date ? '<span style=\"color:#16A34A;font-weight:700;\">Selesai</span>' : '<span style=\"color:#D97706;font-weight:700;\">Berjalan</span>';" + R +
  "    const sals = salaryMap[p.id] || [];" + R +
  "    return '<tr>' +" + R +
  "      '<td style=\"font-weight:700;color:#1D4ED8;cursor:pointer;\" onclick=\"toggleWoodlogKapalDetail(\\'' + p.id + '\\')\">' + p.project_code + '</td>' +" + R +
  "      '<td>' + (p.nama_kapal || '—') + '</td>' +" + R +
  "      '<td>' + (p.pemberi_kerja || '—') + '</td>' +" + R +
  "      '<td>' + formatDate(p.start_date) + '</td>' +" + R +
  "      '<td>' + (p.end_date ? formatDate(p.end_date) : '—') + '</td>' +" + R +
  "      '<td style=\"font-size:12px;color:#64748B;\">' + units + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (p.total_mt_m3 ? Number(p.total_mt_m3).toLocaleString('id') + ' MT' : '—') + '</td>' +" + R +
  "      '<td>' + status + '</td>' +" + R +
  "      '<td style=\"white-space:nowrap;\">' +" + R +
  "        (!p.end_date ? '<button onclick=\"openCloseWoodlogKapalModal(\\'' + p.id + '\\')\" style=\"background:#DCFCE7;color:#16A34A;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px;\">Tutup</button>' : '') +" + R +
  "        '<button onclick=\"doDeleteWoodlogProject(\\'' + p.id + '\\')\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;\">Hapus</button>' +" + R +
  "      '</td></tr>' +" + R +
  "      '<tr id=\"wl-kapal-detail-' + p.id + '\" style=\"display:none;\"><td colspan=\"9\" style=\"padding:12px 16px;background:#F8FAFC;\">Memuat...</td></tr>';" + R +
  "  }).join('');" + R +
  "  el.innerHTML = addBtn + '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Kapal</th><th>Pemberi Kerja</th><th>Mulai</th><th>Selesai</th><th>Unit</th><th style=\"text-align:right;\">BL Tonnage</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';" + R +
  "}" + R +
  R +
  "async function toggleWoodlogKapalDetail(id) {" + R +
  "  const row = document.getElementById('wl-kapal-detail-' + id);" + R +
  "  if (!row) return;" + R +
  "  if (row.style.display !== 'none') { row.style.display = 'none'; return; }" + R +
  "  row.style.display = '';" + R +
  "  if (row.dataset.rendered === 'true') return;" + R +
  "  const p = _wlKapalCache[id];" + R +
  "  if (!p) { row.querySelector('td').textContent = 'Data tidak ditemukan.'; return; }" + R +
  "  const { data: sals } = await sb.from('woodlog_operator_salary').select('*').eq('project_id', id).order('operator_name');" + R +
  "  const salRows = (sals || []).map(function(s) {" + R +
  "    const paidLabel = s.paid_batch === 'mid_month' ? '16' : s.paid_batch === 'end_of_month' ? 'Akhir Bulan' : '—';" + R +
  "    return '<tr><td>' + s.operator_name + '</td><td style=\"text-transform:capitalize;\">' + s.unit_type + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (s.tonnage_mt != null ? Number(s.tonnage_mt).toLocaleString('id') + ' MT' : '—') + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;\">Rp ' + Number(s.salary_amount).toLocaleString('id') + '</td>' +" + R +
  "      '<td style=\"color:' + (s.paid_batch ? '#16A34A' : '#D97706') + ';font-weight:700;\">' + (s.paid_batch ? 'Dibayar (' + paidLabel + ')' : 'Belum Dibayar') + '</td></tr>';" + R +
  "  }).join('');" + R +
  "  const unitRows = (p.project_units || []).map(function(pu) {" + R +
  "    const hmDur = (pu.hm_akhir && pu.hm_awal) ? (Number(pu.hm_akhir) - Number(pu.hm_awal)).toFixed(1) : '—';" + R +
  "    return '<tr><td style=\"font-weight:700;\">' + (pu.units ? pu.units.code : '?') + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (pu.hm_awal || '—') + '</td><td style=\"text-align:right;\">' + (pu.hm_akhir || '—') + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;\">' + hmDur + ' HM</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (pu.solar_awal_pct != null ? pu.solar_awal_pct + '%' : '—') + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (pu.solar_akhir_pct != null ? pu.solar_akhir_pct + '%' : '—') + '</td></tr>';" + R +
  "  }).join('');" + R +
  "  row.innerHTML = '<td colspan=\"9\" style=\"padding:12px 16px;background:#F8FAFC;\">' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Unit HM</div>' +" + R +
  "    '<div class=\"table-wrap\" style=\"margin-bottom:12px;\"><table class=\"dt\"><thead><tr><th>Unit</th><th>HM Awal</th><th>HM Akhir</th><th>Durasi</th><th>Solar Awal</th><th>Solar Akhir</th></tr></thead><tbody>' + unitRows + '</tbody></table></div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary Operator</div>' +" + R +
  "    '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Operator</th><th>Tipe</th><th>Tonnage</th><th>Salary</th><th>Status</th></tr></thead><tbody>' + salRows + '</tbody></table></div>' +" + R +
  "    '</td>';" + R +
  "  row.dataset.rendered = 'true';" + R +
  "}" + R +
  R +
  "async function openAddWoodlogKapalModal() {" + R +
  "  const today = todayISO();" + R +
  "  const monthYear = today.slice(0, 7);" + R +
  "  const { code, num } = await getNextWoodlogCode(monthYear);" + R +
  "  const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "  const unitCheckboxes = wlUnits.map(function(u) {" + R +
  "    return '<div style=\"display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F1F5F9;\">' +" + R +
  "      '<input type=\"checkbox\" id=\"wl-unit-' + u.id + '\" value=\"' + u.id + '\" data-code=\"' + u.code + '\" onchange=\"wlUpdateSalaryPreview()\" style=\"width:16px;height:16px;\">' +" + R +
  "      '<span style=\"font-weight:700;color:#1D4ED8;width:40px;\">' + u.code + '</span>' +" + R +
  "      '<span style=\"font-size:12px;color:#64748B;flex:1;\">' + (u.name || '') + '</span>' +" + R +
  "      '<input type=\"number\" id=\"wl-hmawal-' + u.id + '\" class=\"finput\" style=\"width:90px;font-size:13px;\" placeholder=\"HM Awal\" step=\"0.1\">' +" + R +
  "      '<input type=\"number\" id=\"wl-solawal-' + u.id + '\" class=\"finput\" style=\"width:80px;font-size:13px;\" placeholder=\"Solar %\" min=\"0\" max=\"100\">' +" + R +
  "      '</div>';" + R +
  "  }).join('');" + R +
  "  const stdOpRows = WL_STD_OPS.map(function(op) {" + R +
  "    return '<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px;\">' +" + R +
  "      '<span style=\"width:100px;font-size:13px;font-weight:600;\">' + op + '</span>' +" + R +
  "      '<input type=\"number\" id=\"wl-std-ton-' + op + '\" class=\"finput\" style=\"width:110px;font-size:13px;\" placeholder=\"Tonnage MT\" min=\"0\" oninput=\"wlUpdateSalaryPreview()\">' +" + R +
  "      '<span id=\"wl-std-sal-' + op + '\" style=\"font-size:13px;font-weight:700;color:#1D4ED8;width:120px;\">Rp 0</span>' +" + R +
  "      '</div>';" + R +
  "  }).join('');" + R +
  "  const bangauOpRows = WL_BANGAU_OPS.map(function(op) {" + R +
  "    return '<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px;\">' +" + R +
  "      '<span style=\"width:100px;font-size:13px;font-weight:600;\">' + op + '</span>' +" + R +
  "      '<span id=\"wl-bang-sal-' + op + '\" style=\"font-size:13px;font-weight:700;color:#1D4ED8;\">Rp 0</span>' +" + R +
  "      '</div>';" + R +
  "  }).join('');" + R +
  "  const modalHTML = '<div style=\"padding:24px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;\">' +" + R +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;\">Tambah Proyek Kapal Woodlog</div>' +" + R +
  "    '<div style=\"font-size:13px;color:#1D4ED8;font-weight:700;margin-bottom:16px;\">Kode: ' + code + '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Nama Kapal *</label><input type=\"text\" id=\"wladd-namakapal\" class=\"finput\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Pemberi Kerja</label><input type=\"text\" id=\"wladd-pemberi\" class=\"finput\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"wladd-start\" class=\"finput\" value=\"' + today + '\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">BL Tonnage (MT)</label><input type=\"number\" id=\"wladd-bl\" class=\"finput\" min=\"0\" oninput=\"wlUpdateSalaryPreview()\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Rate/MT (Rp)</label><input type=\"number\" id=\"wladd-rate\" class=\"finput\" min=\"0\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Harga Solar (Rp/L)</label><input type=\"number\" id=\"wladd-solar\" class=\"finput\" min=\"0\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">No. Invoice</label><input type=\"text\" id=\"wladd-inv\" class=\"finput\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Unit yang Mengerjakan</div>' +" + R +
  "    '<div style=\"margin-bottom:16px;\">' + unitCheckboxes + '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary Bangau (J02/J03) — auto</div>' +" + R +
  "    '<div style=\"background:#EFF6FF;border-radius:10px;padding:12px;margin-bottom:16px;\">' + bangauOpRows + '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary STD (J45–J48) — input manual tonnage</div>' +" + R +
  "    '<div style=\"background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;\">' + stdOpRows + '</div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Catatan</label><textarea id=\"wladd-notes\" class=\"finput\" rows=\"2\"></textarea></div>' +" + R +
  "    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +" + R +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + R +
  "    '<button onclick=\"submitAddWoodlogKapal(' + num + ',\\'' + monthYear + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>' +" + R +
  "    '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "}" + R +
  R +
  "function wlUpdateSalaryPreview() {" + R +
  "  const bl = parseFloat(document.getElementById('wladd-bl') ? document.getElementById('wladd-bl').value : '') || 0;" + R +
  "  const bangauSal = Math.round(bl * 0.9 / 4 * 800);" + R +
  "  WL_BANGAU_OPS.forEach(function(op) {" + R +
  "    const el = document.getElementById('wl-bang-sal-' + op);" + R +
  "    if (el) el.textContent = 'Rp ' + bangauSal.toLocaleString('id');" + R +
  "  });" + R +
  "  WL_STD_OPS.forEach(function(op) {" + R +
  "    const inp = document.getElementById('wl-std-ton-' + op);" + R +
  "    const ton = parseFloat(inp ? inp.value : '') || 0;" + R +
  "    const salEl = document.getElementById('wl-std-sal-' + op);" + R +
  "    if (salEl) salEl.textContent = 'Rp ' + Math.round(ton * 750).toLocaleString('id');" + R +
  "  });" + R +
  "}" + R +
  R +
  "async function submitAddWoodlogKapal(shipNum, monthYear) {" + R +
  "  const namaKapal = (document.getElementById('wladd-namakapal') || {}).value ? document.getElementById('wladd-namakapal').value.trim() : '';" + R +
  "  const pemberi = (document.getElementById('wladd-pemberi') || {}).value ? document.getElementById('wladd-pemberi').value.trim() : null;" + R +
  "  const start = (document.getElementById('wladd-start') || {}).value || '';" + R +
  "  const bl = parseFloat((document.getElementById('wladd-bl') || {}).value) || null;" + R +
  "  const rate = parseFloat((document.getElementById('wladd-rate') || {}).value) || null;" + R +
  "  const solar = parseFloat((document.getElementById('wladd-solar') || {}).value) || null;" + R +
  "  const inv = (document.getElementById('wladd-inv') || {}).value ? document.getElementById('wladd-inv').value.trim() : null;" + R +
  "  const notes = (document.getElementById('wladd-notes') || {}).value ? document.getElementById('wladd-notes').value.trim() : null;" + R +
  "  if (!namaKapal || !start) { showToast('Nama Kapal dan Tgl Mulai wajib diisi.'); return; }" + R +
  "  const mm = monthYear.slice(5, 7);" + R +
  "  const projectCode = 'K' + mm + '-' + String(shipNum).padStart(2, '0');" + R +
  "  try {" + R +
  "    const { data: proj, error: e1 } = await sb.from('projects').insert({" + R +
  "      type: 'woodlog_kapal', project_code: projectCode, ship_number_in_month: shipNum," + R +
  "      month_year: monthYear, nama_kapal: namaKapal, pemberi_kerja: pemberi," + R +
  "      start_date: start, total_mt_m3: bl, unit_price: rate," + R +
  "      harga_solar_rpl: solar, invoice_number: inv, notes: notes" + R +
  "    }).select().single();" + R +
  "    if (e1) throw e1;" + R +
  "    const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "    const checkedUnits = wlUnits.filter(function(u) {" + R +
  "      const cb = document.getElementById('wl-unit-' + u.id);" + R +
  "      return cb && cb.checked;" + R +
  "    });" + R +
  "    if (checkedUnits.length > 0) {" + R +
  "      const puRows = checkedUnits.map(function(u) {" + R +
  "        const hm = parseFloat((document.getElementById('wl-hmawal-' + u.id) || {}).value) || null;" + R +
  "        const solVal = parseFloat((document.getElementById('wl-solawal-' + u.id) || {}).value);" + R +
  "        return { project_id: proj.id, unit_id: u.id, hm_awal: hm, solar_awal_pct: isNaN(solVal) ? null : solVal };" + R +
  "      });" + R +
  "      const { error: e2 } = await sb.from('project_units').insert(puRows);" + R +
  "      if (e2) throw e2;" + R +
  "    }" + R +
  "    const salaryInserts = [];" + R +
  "    if (bl) {" + R +
  "      const bangauSal = Math.round(bl * 0.9 / 4 * 800);" + R +
  "      const bl4 = bl * 0.9 / 4;" + R +
  "      WL_BANGAU_OPS.forEach(function(op) {" + R +
  "        salaryInserts.push({ project_id: proj.id, operator_name: op, unit_type: 'bangau', tonnage_mt: bl4, salary_amount: bangauSal });" + R +
  "      });" + R +
  "    }" + R +
  "    WL_STD_OPS.forEach(function(op) {" + R +
  "      const inp = document.getElementById('wl-std-ton-' + op);" + R +
  "      const ton = parseFloat(inp ? inp.value : '') || 0;" + R +
  "      if (ton > 0) salaryInserts.push({ project_id: proj.id, operator_name: op, unit_type: 'std', tonnage_mt: ton, salary_amount: Math.round(ton * 750) });" + R +
  "    });" + R +
  "    if (salaryInserts.length > 0) {" + R +
  "      const { error: e3 } = await sb.from('woodlog_operator_salary').insert(salaryInserts);" + R +
  "      if (e3) throw e3;" + R +
  "    }" + R +
  "    closeModal();" + R +
  "    showToast('Proyek ' + projectCode + ' berhasil ditambahkan!', 'success');" + R +
  "    await loadWoodlogKapal();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "function openCloseWoodlogKapalModal(id) {" + R +
  "  const p = _wlKapalCache[id];" + R +
  "  if (!p) return;" + R +
  "  const units = p.project_units || [];" + R +
  "  const unitRows = units.map(function(pu) {" + R +
  "    return '<div style=\"margin-bottom:8px;padding:10px;background:#F8FAFC;border-radius:8px;\">' +" + R +
  "      '<div style=\"font-weight:700;color:#1D4ED8;margin-bottom:6px;\">' + (pu.units ? pu.units.code : '?') + '</div>' +" + R +
  "      '<div style=\"display:flex;gap:10px;\">' +" + R +
  "      '<input type=\"number\" id=\"wlclose-hm-' + pu.unit_id + '\" class=\"finput\" style=\"flex:1;font-size:13px;\" placeholder=\"HM Akhir\" step=\"0.1\" value=\"' + (pu.hm_akhir != null ? pu.hm_akhir : '') + '\">' +" + R +
  "      '<input type=\"number\" id=\"wlclose-sol-' + pu.unit_id + '\" class=\"finput\" style=\"width:90px;font-size:13px;\" placeholder=\"Solar Akhir %\" min=\"0\" max=\"100\" value=\"' + (pu.solar_akhir_pct != null ? pu.solar_akhir_pct : '') + '\">' +" + R +
  "      '</div></div>';" + R +
  "  }).join('');" + R +
  "  const modalHTML = '<div style=\"padding:24px;max-width:500px;width:100%;\">' +" + R +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;\">Tutup Proyek ' + p.project_code + '</div>' +" + R +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tanggal Selesai *</label><input type=\"date\" id=\"wlclose-end\" class=\"finput\" value=\"' + todayISO() + '\"></div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">HM Akhir & Solar Akhir per Unit</div>' +" + R +
  "    unitRows +" + R +
  "    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +" + R +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + R +
  "    '<button onclick=\"submitCloseWoodlogKapal(\\'' + id + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>' +" + R +
  "    '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "}" + R +
  R +
  "async function submitCloseWoodlogKapal(id) {" + R +
  "  const endDate = (document.getElementById('wlclose-end') || {}).value || '';" + R +
  "  if (!endDate) { showToast('Tanggal Selesai wajib diisi.'); return; }" + R +
  "  const p = _wlKapalCache[id];" + R +
  "  if (!p) return;" + R +
  "  try {" + R +
  "    const { error: e1 } = await sb.from('projects').update({ end_date: endDate }).eq('id', id);" + R +
  "    if (e1) throw e1;" + R +
  "    const units = p.project_units || [];" + R +
  "    await Promise.all(units.map(function(pu) {" + R +
  "      const inp = document.getElementById('wlclose-hm-' + pu.unit_id);" + R +
  "      const sinp = document.getElementById('wlclose-sol-' + pu.unit_id);" + R +
  "      const hm = parseFloat(inp ? inp.value : '') || null;" + R +
  "      const sol = parseFloat(sinp ? sinp.value : '');" + R +
  "      return sb.from('project_units').update({ hm_akhir: hm, solar_akhir_pct: isNaN(sol) ? null : sol })" + R +
  "        .eq('project_id', id).eq('unit_id', pu.unit_id);" + R +
  "    }));" + R +
  "    closeModal();" + R +
  "    showToast('Proyek berhasil ditutup.', 'success');" + R +
  "    await loadWoodlogKapal();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function doDeleteWoodlogProject(id) {" + R +
  "  if (!confirm('Hapus proyek ini? Semua data unit dan salary akan ikut terhapus.')) return;" + R +
  "  try {" + R +
  "    const { data, error } = await sb.from('projects').delete().eq('id', id).select();" + R +
  "    if (error) throw error;" + R +
  "    if (!data || data.length === 0) throw new Error('Akses ditolak (RLS). Hubungi admin.');" + R +
  "    showToast('Proyek berhasil dihapus.', 'info');" + R +
  "    await loadWoodlogKapal();" + R +
  "    await loadWoodlogHourly();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function loadWoodlogRingkasan() {",

  'WL3: Kapal tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL3 patches applied. Running syntax check...');
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
