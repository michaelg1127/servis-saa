// patch_analisis_csv.js — add Download CSV for regular + Woodlog Analisis Biaya

const fs = require('fs');
const path = 'index.html';
let src = fs.readFileSync(path, 'utf8');

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

// PATCH 1: add Download CSV button in regular Analisis filter row
replaceExact(
  "  h += '<div style=\"display:flex;gap:8px;margin-bottom:16px;\">';\r\n" +
  "  pills.forEach(f => {\r\n" +
  "    const active = proyekAnalisisFilter === f;\r\n" +
  "    h += '<button onclick=\"setProyekAnalisisFilter(\\'' + f + '\\')\" style=\"padding:6px 14px;border-radius:99px;border:none;cursor:pointer;font-size:13px;font-weight:700;background:' + (active ? '#1D4ED8' : '#F1F5F9') + ';color:' + (active ? '#fff' : '#64748B') + ';\">' + pillLabels[f] + '</button>';\r\n" +
  "  });\r\n" +
  "  h += '</div>';\r\n",
  "  h += '<div style=\"display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap;\">';\r\n" +
  "  pills.forEach(f => {\r\n" +
  "    const active = proyekAnalisisFilter === f;\r\n" +
  "    h += '<button onclick=\"setProyekAnalisisFilter(\\'' + f + '\\')\" style=\"padding:6px 14px;border-radius:99px;border:none;cursor:pointer;font-size:13px;font-weight:700;background:' + (active ? '#1D4ED8' : '#F1F5F9') + ';color:' + (active ? '#fff' : '#64748B') + ';\">' + pillLabels[f] + '</button>';\r\n" +
  "  });\r\n" +
  "  h += '<button onclick=\"downloadProyekAnalisisCSV()\" style=\"margin-left:auto;padding:6px 14px;border-radius:8px;border:1px solid #16A34A;background:#F0FDF4;color:#16A34A;cursor:pointer;font-size:13px;font-weight:700;\">⬇ Download CSV</button>';\r\n" +
  "  h += '</div>';\r\n",
  'add Download CSV button to regular Analisis header'
);

// PATCH 2: add Download CSV button to Woodlog Analisis intro row
replaceExact(
  "  el.innerHTML = '<div style=\"margin-bottom:8px;font-size:12px;color:#94A3B8;\">Klik baris untuk lihat breakdown · ✎ untuk edit</div>' +\r\n" +
  "    '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr>' +\r\n",
  "  el.innerHTML = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\"><div style=\"font-size:12px;color:#94A3B8;\">Klik baris untuk lihat breakdown · ✎ untuk edit</div>' +\r\n" +
  "    '<button onclick=\"downloadWoodlogAnalisisCSV()\" style=\"padding:6px 14px;border-radius:8px;border:1px solid #16A34A;background:#F0FDF4;color:#16A34A;cursor:pointer;font-size:13px;font-weight:700;\">⬇ Download CSV</button></div>' +\r\n" +
  "    '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr>' +\r\n",
  'add Download CSV button to Woodlog Analisis header'
);

// PATCH 3: add CSV helpers + both download functions after setProyekAnalisisFilter
replaceExact(
  "function setProyekAnalisisFilter(f) {\r\n" +
  "  proyekAnalisisFilter = f;\r\n" +
  "  const panel = document.getElementById('proyek-panel-analisis');\r\n" +
  "  if (panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects, panel._fillMap || {});\r\n" +
  "}\r\n",
  "function setProyekAnalisisFilter(f) {\r\n" +
  "  proyekAnalisisFilter = f;\r\n" +
  "  const panel = document.getElementById('proyek-panel-analisis');\r\n" +
  "  if (panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects, panel._fillMap || {});\r\n" +
  "}\r\n\r\n" +
  "function _csvEsc(v) {\r\n" +
  "  if (v == null) return '';\r\n" +
  "  const s = String(v);\r\n" +
  "  return /[\",\\r\\n]/.test(s) ? '\"' + s.replace(/\"/g, '\"\"') + '\"' : s;\r\n" +
  "}\r\n\r\n" +
  "function _downloadCSV(filename, rows) {\r\n" +
  "  const csv = rows.map(function(r) { return r.map(_csvEsc).join(','); }).join('\\r\\n');\r\n" +
  "  const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });\r\n" +
  "  const url = URL.createObjectURL(blob);\r\n" +
  "  const a = document.createElement('a');\r\n" +
  "  a.href = url; a.download = filename;\r\n" +
  "  document.body.appendChild(a); a.click(); document.body.removeChild(a);\r\n" +
  "  setTimeout(function() { URL.revokeObjectURL(url); }, 500);\r\n" +
  "}\r\n\r\n" +
  "function downloadProyekAnalisisCSV() {\r\n" +
  "  const panel = document.getElementById('proyek-panel-analisis');\r\n" +
  "  if (!panel || !panel._analisisProjects) { showToast('Data belum dimuat'); return; }\r\n" +
  "  const projects = panel._analisisProjects;\r\n" +
  "  const fMap = panel._fillMap || {};\r\n" +
  "  let filtered = projects;\r\n" +
  "  if (proyekAnalisisFilter === 'open') filtered = projects.filter(function(p) { return !p.invoice_number; });\r\n" +
  "  if (proyekAnalisisFilter === 'closed') filtered = projects.filter(function(p) { return p.invoice_number; });\r\n" +
  "  filtered = filtered.slice().sort(function(a, b) {\r\n" +
  "    const cmp = String(a.project_code || '').localeCompare(String(b.project_code || ''));\r\n" +
  "    return proyekAnalisisSort === 'desc' ? -cmp : cmp;\r\n" +
  "  });\r\n" +
  "  const header = ['Kode','Nama Kapal','Pemberi Kerja','Kade','Tgl Mulai','Tgl Selesai','BL Unit','BL','Target HM','Actual HM','Delta %','Income (Rp)','Biaya Solar (L)','Biaya Solar (Rp)','Biaya Tenaga (Rp)','Profit (Rp)','Yield/HM (Rp)','Invoice#','Status','Mike Check'];\r\n" +
  "  const rows = [header];\r\n" +
  "  filtered.forEach(function(p) {\r\n" +
  "    const units = p.project_units || [];\r\n" +
  "    const bl = Number(p.total_mt_m3 || 0);\r\n" +
  "    const blUnit = p.bl_unit === 'M3' ? 'M3' : 'MT';\r\n" +
  "    const targetHM = bl > 0 ? (blUnit === 'M3' ? bl / 110 : bl / 95) : 0;\r\n" +
  "    const totalHM = units.reduce(function(s, u) { return s + (u.hm_akhir != null ? Math.max(0, u.hm_akhir - u.hm_awal) : 0); }, 0);\r\n" +
  "    const delta = targetHM > 0 ? ((totalHM - targetHM) / targetHM * 100) : 0;\r\n" +
  "    const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n" +
  "    const split = calcKapalTonnageSplit(units, bl);\r\n" +
  "    const income = bl * (p.unit_price || 0);\r\n" +
  "    const usedSolarL = units.reduce(function(s, u) {\r\n" +
  "      const isi = (fMap[p.id] && fMap[p.id][u.unit_id] != null) ? fMap[p.id][u.unit_id] : (u.solar_isi_liters || 0);\r\n" +
  "      const tankDiff = (u.solar_akhir_pct != null && u.solar_awal_pct != null) ? ((u.solar_awal_pct - u.solar_akhir_pct) / 100) * 320 : 0;\r\n" +
  "      return s + isi + tankDiff;\r\n" +
  "    }, 0);\r\n" +
  "    const fuelCost = usedSolarL * (p.harga_solar_rpl || 0);\r\n" +
  "    const operatorPay = split.reduce(function(s, u) { return s + u.allocatedMt * rate; }, 0);\r\n" +
  "    const laborCost = operatorPay + Math.round(income * 0.05);\r\n" +
  "    const profit = income - fuelCost - laborCost;\r\n" +
  "    const yieldPerHM = totalHM > 0 ? profit / totalHM : 0;\r\n" +
  "    rows.push([\r\n" +
  "      p.project_code, p.nama_kapal || '', p.pemberi_kerja || '', p.kade || '',\r\n" +
  "      p.start_date || '', p.end_date || '', blUnit, bl,\r\n" +
  "      targetHM.toFixed(2), totalHM.toFixed(2), (targetHM > 0 ? delta.toFixed(1) + '%' : ''),\r\n" +
  "      Math.round(income), Math.round(usedSolarL), Math.round(fuelCost),\r\n" +
  "      Math.round(laborCost), Math.round(profit), Math.round(yieldPerHM),\r\n" +
  "      p.invoice_number || '', p.invoice_number ? 'CLOSED' : 'OPEN', p.mike_checked ? 'YES' : 'NO'\r\n" +
  "    ]);\r\n" +
  "  });\r\n" +
  "  _downloadCSV('AnalisisBiaya_' + proyekMonthFilter + '_' + proyekAnalisisFilter + '.csv', rows);\r\n" +
  "}\r\n\r\n" +
  "function downloadWoodlogAnalisisCSV() {\r\n" +
  "  const el = document.getElementById('wl-panel-analisis');\r\n" +
  "  if (!el || !el._wlaProjects) { showToast('Data belum dimuat'); return; }\r\n" +
  "  const projects = el._wlaProjects;\r\n" +
  "  const salMap = el._wlaSalMap || {};\r\n" +
  "  const fillMap = el._wlaFillMap || {};\r\n" +
  "  const header = ['Kode','Nama Kapal','Tipe','Tgl Mulai','Tgl Selesai','Tonnage MT','Rate/MT (Rp)','Income (Rp)','BBM (L)','Harga Solar (Rp/L)','BBM (Rp)','Labor Base (Rp)','Labor +5% (Rp)','Fixed Cost Rp920/MT','Profit (Rp)','Ratio MT/L','Invoice#','Invoice Amount (Rp)','Status'];\r\n" +
  "  const rows = [header];\r\n" +
  "  projects.forEach(function(p) {\r\n" +
  "    const bl = Number(p.total_mt_m3 || 0);\r\n" +
  "    const income = (bl && p.unit_price) ? bl * Number(p.unit_price) : 0;\r\n" +
  "    const pus = p.project_units || [];\r\n" +
  "    const projectFills = (fillMap && fillMap[p.id]) ? fillMap[p.id] : {};\r\n" +
  "    let totalBBM = 0;\r\n" +
  "    pus.forEach(function(pu) {\r\n" +
  "      const unitCode = (pu.units && pu.units.code) ? pu.units.code : '';\r\n" +
  "      const tankSize = WL_BANGAU_CODES.includes(unitCode) ? 500 : 370;\r\n" +
  "      const hasSolar = pu.solar_awal_pct != null && pu.solar_akhir_pct != null;\r\n" +
  "      const tankDiff = hasSolar ? (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * tankSize : 0;\r\n" +
  "      const fills = projectFills[pu.unit_id] || 0;\r\n" +
  "      totalBBM += tankDiff + fills;\r\n" +
  "    });\r\n" +
  "    const fuelCost = totalBBM * Number(p.harga_solar_rpl || 0);\r\n" +
  "    const laborBase = salMap[p.id] || 0;\r\n" +
  "    const laborCost = laborBase * 1.05;\r\n" +
  "    const fixedCost = bl * 920;\r\n" +
  "    const profit = income - fuelCost - laborCost - fixedCost;\r\n" +
  "    const ratio = totalBBM > 0 ? bl / totalBBM : 0;\r\n" +
  "    const isClosed = !!p.invoice_number;\r\n" +
  "    rows.push([\r\n" +
  "      p.project_code, p.nama_kapal || '', p.type, p.start_date || '', p.end_date || '',\r\n" +
  "      bl, Number(p.unit_price || 0), Math.round(income),\r\n" +
  "      Math.round(totalBBM), Number(p.harga_solar_rpl || 0), Math.round(fuelCost),\r\n" +
  "      Math.round(laborBase), Math.round(laborCost), Math.round(fixedCost),\r\n" +
  "      Math.round(profit), ratio.toFixed(2),\r\n" +
  "      p.invoice_number || '', Math.round(Number(p.invoice_amount || 0)), isClosed ? 'CLOSED' : 'OPEN'\r\n" +
  "    ]);\r\n" +
  "  });\r\n" +
  "  _downloadCSV('WoodlogAnalisisBiaya_' + new Date().toISOString().slice(0,10) + '.csv', rows);\r\n" +
  "}\r\n",
  'add CSV helpers + downloadProyekAnalisisCSV + downloadWoodlogAnalisisCSV'
);

fs.writeFileSync(path, src);
console.log('Done.');
