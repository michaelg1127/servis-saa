const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

function replaceFn(name, isAsync, newBody) {
  const prefix = isAsync ? 'async function ' : 'function ';
  const start = html.indexOf(prefix + name + '(');
  if (start === -1) { console.error('MISS fn: ' + name); process.exit(1); }
  let depth = 0, i = html.indexOf('{', start), bodyStart = i;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
  }
  html = html.slice(0, start) + (isAsync ? 'async ' : '') + 'function ' + name + newBody + html.slice(i + 1);
  changes++;
  console.log('OK fn: ' + name);
}

const kapalFunctions = `\r\nasync function loadProyekKapal() {\r\n  const panel = document.getElementById('proyek-panel-kapal');\r\n  panel.innerHTML = '<div style="color:#64748B;padding:20px;">Memuat data...</div>';\r\n  try {\r\n    const { data, error } = await sb.from('projects')\r\n      .select('*, project_units(*, units(code,name))')\r\n      .eq('type', 'kapal')\r\n      .order('created_at', { ascending: false });\r\n    if (error) throw error;\r\n    proyekKapalData = data || [];\r\n    renderProyekKapalList();\r\n  } catch(e) { panel.innerHTML = '<div style="color:#EF4444;padding:20px;">Error: ' + e.message + '</div>'; }\r\n}\r\n\r\nfunction renderProyekKapalList() {\r\n  const panel = document.getElementById('proyek-panel-kapal');\r\n  let html2 = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';\r\n  html2 += '<div style="font-size:15px;font-weight:700;color:#1E293B;">Daftar Proyek Kapal (' + proyekKapalData.length + ')</div>';\r\n  html2 += '<button onclick="openAddKapalModal()" class="btn-primary" style="padding:8px 16px;font-size:13px;">+ Tambah Kapal</button>';\r\n  html2 += '</div>';\r\n  if (proyekKapalData.length === 0) {\r\n    html2 += '<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Belum ada proyek kapal.</div>';\r\n    panel.innerHTML = html2;\r\n    return;\r\n  }\r\n  html2 += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';\r\n  html2 += '<thead><tr style="background:#F1F5F9;">';\r\n  ['Kode','Nama Kapal','Pemberi Kerja','Kade','Tgl','Kapal#','Unit','HM Total','MT/M3','Salary Total'].forEach(h => {\r\n    html2 += '<th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;">' + h + '</th>';\r\n  });\r\n  html2 += '<th style="padding:10px 12px;"></th></tr></thead><tbody>';\r\n  proyekKapalData.forEach(p => {\r\n    const units = p.project_units || [];\r\n    const totalHM = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal), 0);\r\n    const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n    const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);\r\n    const totalSalary = split.reduce((s, u) => s + u.allocatedMt * rate, 0);\r\n    html2 += '<tr style="border-bottom:1px solid #F1F5F9;cursor:pointer;" onclick="toggleKapalDetail(\\'' + p.id + '\\')">';\r\n    html2 += '<td style="padding:10px 12px;font-weight:700;color:#1D4ED8;">' + p.project_code + '</td>';\r\n    html2 += '<td style="padding:10px 12px;">' + (p.nama_kapal || '—') + '</td>';\r\n    html2 += '<td style="padding:10px 12px;">' + p.pemberi_kerja + '</td>';\r\n    html2 += '<td style="padding:10px 12px;">' + (p.kade || '—') + '</td>';\r\n    html2 += '<td style="padding:10px 12px;white-space:nowrap;">' + formatDate(p.start_date) + ' – ' + formatDate(p.end_date) + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:center;">' + (p.ship_number_in_month || '—') + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:center;">' + units.length + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:right;">' + totalHM.toFixed(1) + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:right;">' + (p.total_mt_m3 ? p.total_mt_m3.toLocaleString('id-ID') : '—') + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:right;font-weight:700;color:#16A34A;">' + fmtRp(totalSalary) + '</td>';\r\n    html2 += '<td style="padding:10px 12px;"><svg style="width:14px;height:14px;" fill="none" stroke="#94A3B8" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg></td>';\r\n    html2 += '</tr>';\r\n    html2 += '<tr id="kapal-detail-' + p.id + '" style="display:none;background:#F8FAFC;">';\r\n    html2 += '<td colspan="11" style="padding:12px 16px;">';\r\n    html2 += renderKapalDetailHTML(p);\r\n    html2 += '</td></tr>';\r\n  });\r\n  html2 += '</tbody></table></div>';\r\n  panel.innerHTML = html2;\r\n}\r\n\r\nfunction toggleKapalDetail(id) {\r\n  const row = document.getElementById('kapal-detail-' + id);\r\n  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';\r\n}\r\n\r\nfunction renderKapalDetailHTML(p) {\r\n  const units = p.project_units || [];\r\n  const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n  const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);\r\n  let h = '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;">';\r\n  h += '<tr style="background:#E2E8F0;"><th style="padding:6px 10px;text-align:left;">Unit</th><th style="padding:6px 10px;text-align:right;">HM Awal</th><th style="padding:6px 10px;text-align:right;">HM Akhir</th><th style="padding:6px 10px;text-align:right;">HM Kerja</th><th style="padding:6px 10px;text-align:right;">MT Alokasi</th><th style="padding:6px 10px;text-align:right;">Rate</th><th style="padding:6px 10px;text-align:right;">Salary</th><th style="padding:6px 10px;text-align:right;">Solar (L)</th></tr>';\r\n  split.forEach(u => {\r\n    const hmKerja = u.hm_akhir - u.hm_awal;\r\n    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);\r\n    const salary = u.allocatedMt * rate;\r\n    const unitCode = u.units ? u.units.code : '?';\r\n    h += '<tr style="border-bottom:1px solid #E2E8F0;">';\r\n    h += '<td style="padding:6px 10px;font-weight:700;">' + unitCode + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + u.hm_awal + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + u.hm_akhir + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + hmKerja.toFixed(1) + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + u.allocatedMt.toFixed(2) + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">Rp ' + rate + '/MT</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;font-weight:700;color:#16A34A;">' + fmtRp(salary) + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + solar.toFixed(1) + ' L</td>';\r\n    h += '</tr>';\r\n  });\r\n  h += '</table>';\r\n  if (p.notes) h += '<div style="margin-top:8px;font-size:12px;color:#64748B;">Catatan: ' + p.notes + '</div>';\r\n  return h;\r\n}\r\n`;

replaceExact(
  'function switchProyekTab(tab, el) {',
  kapalFunctions + 'function switchProyekTab(tab, el) {',
  'add kapal list functions'
);

fs.writeFileSync(filePath, html, 'utf8');
console.log('patch_proyek3.js: ' + changes + ' changes applied.');
