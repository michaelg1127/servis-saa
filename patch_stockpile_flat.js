const fs = require('fs');
const FILE = 'index.html';
let src = fs.readFileSync(FILE, 'utf8');

const FUNC_START = 'function renderProyekStockpileList() {';
const END_MARKER = '\r\nasync function toggleStockpileDetail(id) {';

const si = src.indexOf(FUNC_START);
if (si === -1) { console.error('MISS: renderProyekStockpileList not found'); process.exit(1); }
const ei = src.indexOf(END_MARKER, si);
if (ei === -1) { console.error('MISS: end marker not found'); process.exit(1); }

const newFuncLF = `function renderProyekStockpileList() {
  const panel = document.getElementById('proyek-panel-stockpile');
  let h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  h += '<div style="font-size:15px;font-weight:700;color:#1E293B;">Daftar Proyek Stockpile (' + proyekStockpileData.length + ')</div>';
  h += '<button onclick="openAddStockpileModal()" class="btn-primary" style="padding:8px 16px;font-size:13px;width:auto;">+ Tambah Stockpile</button></div>';
  if (proyekStockpileData.length === 0) {
    h += '<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Belum ada proyek stockpile.</div>';
    panel.innerHTML = h; return;
  }
  h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';
  h += '<thead><tr style="background:#F1F5F9;">';
  ['Kode','Pemberi Kerja','Tanggal','Unit','HM Awal','HM Akhir','HM Total','Salary Total',''].forEach(function(col) {
    h += '<th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;">' + col + '</th>';
  });
  h += '</tr></thead><tbody>';
  proyekStockpileData.forEach(function(p) {
    var units = p.project_units || [];
    _proyekStockpileCache[p.id] = p;
    if (units.length === 0) {
      h += '<tr style="border-bottom:1px solid #F1F5F9;">';
      h += '<td style="padding:10px 12px;font-weight:700;color:#1D4ED8;">' + p.project_code + '</td>';
      h += '<td style="padding:10px 12px;">' + (p.pemberi_kerja || '—') + '</td>';
      h += '<td style="padding:10px 12px;white-space:nowrap;">' + formatDate(p.start_date) + ' – ' + formatDate(p.end_date) + '</td>';
      h += '<td colspan="5" style="padding:10px 12px;color:#94A3B8;">—</td>';
      h += '<td style="padding:10px 12px;"><button onclick="openEditStockpileModal(\\'' + p.id + '\\')" style="background:#EFF6FF;border:1.5px solid #93C5FD;color:#1D4ED8;font-size:12px;font-weight:700;padding:5px 12px;border-radius:7px;cursor:pointer;">✎ Edit</button></td>';
      h += '</tr>';
      return;
    }
    units.forEach(function(u, ui) {
      var unitCode = u.units ? u.units.code : '?';
      var hmKerja = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;
      var salary = hmKerja != null ? Math.round(hmKerja * 35000) : null;
      var isOngoing = u.hm_akhir == null;
      var rs = ui === 0 && units.length > 1 ? ' rowspan="' + units.length + '"' : '';
      h += '<tr style="border-bottom:1px solid #F1F5F9;">';
      if (ui === 0) {
        h += '<td' + rs + ' style="padding:10px 12px;font-weight:700;color:#1D4ED8;vertical-align:middle;">' + p.project_code + '</td>';
        h += '<td' + rs + ' style="padding:10px 12px;vertical-align:middle;">' + (p.pemberi_kerja || '—') + '</td>';
        h += '<td' + rs + ' style="padding:10px 12px;white-space:nowrap;vertical-align:middle;">' + formatDate(p.start_date) + ' – ' + formatDate(p.end_date) + '</td>';
      }
      h += '<td style="padding:10px 12px;font-weight:700;">' + unitCode + (isOngoing ? ' <span style="background:#FEF3C7;color:#B45309;font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;">Ongoing</span>' : '') + '</td>';
      h += '<td style="padding:10px 12px;">' + (u.hm_awal != null ? u.hm_awal : '—') + '</td>';
      h += '<td style="padding:10px 12px;">' + (u.hm_akhir != null ? u.hm_akhir : '—') + '</td>';
      h += '<td style="padding:10px 12px;">' + (hmKerja != null ? hmKerja.toFixed(1) : '—') + '</td>';
      h += '<td style="padding:10px 12px;font-weight:700;color:#16A34A;">' + (salary != null ? fmtRp(salary) : '—') + '</td>';
      if (ui === 0) {
        h += '<td' + rs + ' style="padding:10px 12px;vertical-align:middle;"><button onclick="openEditStockpileModal(\\'' + p.id + '\\')" style="background:#EFF6FF;border:1.5px solid #93C5FD;color:#1D4ED8;font-size:12px;font-weight:700;padding:5px 12px;border-radius:7px;cursor:pointer;">✎ Edit</button></td>';
      }
      h += '</tr>';
    });
  });
  h += '</tbody></table></div>';
  panel.innerHTML = h;
}`;

const newFunc = newFuncLF.replace(/\n/g, '\r\n');
src = src.slice(0, si) + newFunc + src.slice(ei);
fs.writeFileSync(FILE, src);
console.log('DONE: renderProyekStockpileList replaced — flat per-unit rows with Edit button');
