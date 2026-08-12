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
  "async function doDeleteWoodlogProject(id) {",

  "async function loadWoodlogHourly() {" + R +
  "  const el = document.getElementById('wl-panel-hourly');" + R +
  "  if (!el) return;" + R +
  "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data: projects, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code, name))')" + R +
  "      .eq('type', 'woodlog_hourly').order('start_date', { ascending: false });" + R +
  "    if (error) throw error;" + R +
  "    const ids = (projects || []).map(p => p.id);" + R +
  "    let salaryMap = {};" + R +
  "    if (ids.length > 0) {" + R +
  "      const { data: sals } = await sb.from('woodlog_operator_salary').select('*').in('project_id', ids);" + R +
  "      (sals || []).forEach(s => { if (!salaryMap[s.project_id]) salaryMap[s.project_id] = []; salaryMap[s.project_id].push(s); });" + R +
  "    }" + R +
  "    projects.forEach(p => { _wlHourlyCache[p.id] = p; });" + R +
  "    renderWoodlogHourlyList(projects || [], salaryMap);" + R +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "function renderWoodlogHourlyList(projects, salaryMap) {" + R +
  "  const el = document.getElementById('wl-panel-hourly');" + R +
  "  if (!el) return;" + R +
  "  const addBtn = '<button onclick=\"openAddWoodlogHourlyModal()\" class=\"btn-primary\" style=\"margin-bottom:16px;\">+ Tambah Proyek Hourly</button>';" + R +
  "  if (projects.length === 0) { el.innerHTML = addBtn + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek hourly woodlog.</div>'; return; }" + R +
  "  const rows = projects.map(function(p) {" + R +
  "    const units = (p.project_units || []).map(u => u.units ? u.units.code : '?').join(', ');" + R +
  "    const sals = salaryMap[p.id] || [];" + R +
  "    const totalSal = sals.reduce(function(a, s) { return a + Number(s.salary_amount); }, 0);" + R +
  "    const totalHM = (p.project_units || []).reduce(function(a, pu) {" + R +
  "      return a + ((pu.hm_akhir && pu.hm_awal) ? Number(pu.hm_akhir) - Number(pu.hm_awal) : 0);" + R +
  "    }, 0);" + R +
  "    return '<tr>' +" + R +
  "      '<td style=\"font-weight:700;color:#1D4ED8;\">' + p.project_code + '</td>' +" + R +
  "      '<td>' + (p.pemberi_kerja || '—') + '</td>' +" + R +
  "      '<td>' + formatDate(p.start_date) + '</td>' +" + R +
  "      '<td>' + (p.end_date ? formatDate(p.end_date) : '—') + '</td>' +" + R +
  "      '<td style=\"font-size:12px;color:#64748B;\">' + units + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + totalHM.toFixed(1) + ' HM</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;\">Rp ' + totalSal.toLocaleString('id') + '</td>' +" + R +
  "      '<td><button onclick=\"doDeleteWoodlogProject(\\'' + p.id + '\\')\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;\">Hapus</button></td></tr>';" + R +
  "  }).join('');" + R +
  "  el.innerHTML = addBtn + '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Pemberi Kerja</th><th>Mulai</th><th>Selesai</th><th>Unit</th><th style=\"text-align:right;\">Total HM</th><th style=\"text-align:right;\">Total Salary</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';" + R +
  "}" + R +
  R +
  "async function openAddWoodlogHourlyModal() {" + R +
  "  const today = todayISO();" + R +
  "  const monthYear = today.slice(0, 7);" + R +
  "  const { code, num } = await getNextWoodlogCode(monthYear);" + R +
  "  const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "  const unitCheckboxes = wlUnits.map(function(u) {" + R +
  "    return '<div style=\"display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F1F5F9;\">' +" + R +
  "      '<input type=\"checkbox\" id=\"wlh-unit-' + u.id + '\" value=\"' + u.id + '\" style=\"width:16px;height:16px;\">' +" + R +
  "      '<span style=\"font-weight:700;color:#1D4ED8;width:40px;\">' + u.code + '</span>' +" + R +
  "      '<input type=\"number\" id=\"wlh-hmawal-' + u.id + '\" class=\"finput\" style=\"width:90px;font-size:13px;\" placeholder=\"HM Awal\" step=\"0.1\">' +" + R +
  "      '<input type=\"number\" id=\"wlh-hmakhir-' + u.id + '\" class=\"finput\" style=\"width:90px;font-size:13px;\" placeholder=\"HM Akhir\" step=\"0.1\">' +" + R +
  "      '</div>';" + R +
  "  }).join('');" + R +
  "  const modalHTML = '<div style=\"padding:24px;max-width:600px;width:100%;max-height:85vh;overflow-y:auto;\">' +" + R +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;\">Tambah Proyek Hourly Woodlog</div>' +" + R +
  "    '<div style=\"font-size:13px;color:#1D4ED8;font-weight:700;margin-bottom:16px;\">Kode: ' + code + '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Pemberi Kerja</label><input type=\"text\" id=\"wlh-pemberi\" class=\"finput\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">No. Invoice</label><input type=\"text\" id=\"wlh-inv\" class=\"finput\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"wlh-start\" class=\"finput\" value=\"' + today + '\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Selesai</label><input type=\"date\" id=\"wlh-end\" class=\"finput\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Unit (HM Awal – HM Akhir)</div>' +" + R +
  "    '<div style=\"margin-bottom:16px;\">' + unitCheckboxes + '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary Operator (manual)</div>' +" + R +
  "    '<div id=\"wlh-op-rows\" style=\"margin-bottom:12px;\"></div>' +" + R +
  "    '<button onclick=\"addWoodlogHourlyOpRow()\" style=\"background:#EFF6FF;border:1.5px dashed #93C5FD;color:#1D4ED8;font-size:13px;font-weight:700;padding:8px 16px;border-radius:8px;cursor:pointer;width:100%;margin-bottom:16px;\">+ Tambah Operator</button>' +" + R +
  "    '<div style=\"display:flex;gap:12px;margin-top:4px;\">' +" + R +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + R +
  "    '<button onclick=\"submitAddWoodlogHourly(' + num + ',\\'' + monthYear + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>' +" + R +
  "    '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "  addWoodlogHourlyOpRow();" + R +
  "}" + R +
  R +
  "function addWoodlogHourlyOpRow() {" + R +
  "  const wrap = document.getElementById('wlh-op-rows');" + R +
  "  if (!wrap) return;" + R +
  "  const idx = wrap.children.length;" + R +
  "  const div = document.createElement('div');" + R +
  "  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';" + R +
  "  div.innerHTML = '<input type=\"text\" id=\"wlh-opname-' + idx + '\" class=\"finput\" style=\"flex:1;font-size:13px;\" placeholder=\"Nama Operator\">' +" + R +
  "    '<input type=\"number\" id=\"wlh-opsal-' + idx + '\" class=\"finput\" style=\"width:150px;font-size:13px;\" placeholder=\"Salary (Rp)\" min=\"0\">' +" + R +
  "    '<button onclick=\"this.parentElement.remove()\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;\">✕</button>';" + R +
  "  wrap.appendChild(div);" + R +
  "}" + R +
  R +
  "async function submitAddWoodlogHourly(shipNum, monthYear) {" + R +
  "  const pemberi = (document.getElementById('wlh-pemberi') || {}).value ? document.getElementById('wlh-pemberi').value.trim() : null;" + R +
  "  const inv = (document.getElementById('wlh-inv') || {}).value ? document.getElementById('wlh-inv').value.trim() : null;" + R +
  "  const start = (document.getElementById('wlh-start') || {}).value || '';" + R +
  "  const end = (document.getElementById('wlh-end') || {}).value || null;" + R +
  "  if (!start) { showToast('Tgl Mulai wajib diisi.'); return; }" + R +
  "  const mm = monthYear.slice(5, 7);" + R +
  "  const projectCode = 'K' + mm + '-' + String(shipNum).padStart(2, '0');" + R +
  "  try {" + R +
  "    const { data: proj, error: e1 } = await sb.from('projects').insert({" + R +
  "      type: 'woodlog_hourly', project_code: projectCode, ship_number_in_month: shipNum," + R +
  "      month_year: monthYear, pemberi_kerja: pemberi, start_date: start, end_date: end, invoice_number: inv" + R +
  "    }).select().single();" + R +
  "    if (e1) throw e1;" + R +
  "    const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "    const checkedUnits = wlUnits.filter(function(u) {" + R +
  "      const cb = document.getElementById('wlh-unit-' + u.id);" + R +
  "      return cb && cb.checked;" + R +
  "    });" + R +
  "    if (checkedUnits.length > 0) {" + R +
  "      const puRows = checkedUnits.map(function(u) {" + R +
  "        const hma = parseFloat((document.getElementById('wlh-hmawal-' + u.id) || {}).value) || null;" + R +
  "        const hme = parseFloat((document.getElementById('wlh-hmakhir-' + u.id) || {}).value) || null;" + R +
  "        return { project_id: proj.id, unit_id: u.id, hm_awal: hma, hm_akhir: hme };" + R +
  "      });" + R +
  "      await sb.from('project_units').insert(puRows);" + R +
  "    }" + R +
  "    const opWrap = document.getElementById('wlh-op-rows');" + R +
  "    const salaryInserts = [];" + R +
  "    if (opWrap) {" + R +
  "      for (var i = 0; i < opWrap.children.length; i++) {" + R +
  "        const opName = (document.getElementById('wlh-opname-' + i) || {}).value ? document.getElementById('wlh-opname-' + i).value.trim() : '';" + R +
  "        const opSal = parseFloat((document.getElementById('wlh-opsal-' + i) || {}).value) || 0;" + R +
  "        if (opName && opSal > 0) salaryInserts.push({ project_id: proj.id, operator_name: opName, unit_type: 'hourly', salary_amount: opSal });" + R +
  "      }" + R +
  "    }" + R +
  "    if (salaryInserts.length > 0) await sb.from('woodlog_operator_salary').insert(salaryInserts);" + R +
  "    closeModal();" + R +
  "    showToast('Proyek Hourly ' + projectCode + ' berhasil ditambahkan!', 'success');" + R +
  "    await loadWoodlogHourly();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function doDeleteWoodlogProject(id) {",

  'WL4: Hourly tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL4 patches applied. Running syntax check...');
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
