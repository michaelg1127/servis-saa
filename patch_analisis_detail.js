// patch_analisis_detail.js — add expandable per-unit breakdown + Target HM
//   to Proyek Analisis Biaya (regular Kapal only)
//
//   1. New global Set: proyekAnalisisExpanded
//   2. Last-column cell gets a "Detail" toggle button
//   3. New hidden <tr> per project with unit breakdown + Target HM widget
//   4. Toggle handler + bl_unit save handler

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

// -----------------------------------------------------------------------
// PATCH 1: add proyekAnalisisExpanded state var
// -----------------------------------------------------------------------
replaceExact(
  "let proyekAnalisisFilter = 'semua';\r\n",
  "let proyekAnalisisFilter = 'semua';\r\n" +
  "let proyekAnalisisExpanded = new Set();\r\n",
  'add proyekAnalisisExpanded state'
);

// -----------------------------------------------------------------------
// PATCH 2: rewrite the last cell of each row (col index 12) to include a
//   "Detail" toggle in addition to (or in place of) the Add Invoice button
// -----------------------------------------------------------------------
replaceExact(
  "    h += '<td style=\"padding:8px 10px;\">' + (isClosed ? '' : '<button onclick=\"openAddInvoice(\\'' + p.id + '\\')\" style=\"background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;\">Add Invoice</button>') + '</td>';\r\n" +
  "    h += '</tr>';",
  "    const _detailOpen = proyekAnalisisExpanded.has(p.id);\r\n" +
  "    h += '<td style=\"padding:8px 10px;white-space:nowrap;\">';\r\n" +
  "    h += '<button onclick=\"toggleProyekAnalisisDetail(\\'' + p.id + '\\')\" style=\"background:#F1F5F9;border:1px solid #CBD5E1;color:#475569;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;cursor:pointer;margin-right:4px;\">' + (_detailOpen ? '▾' : '▸') + ' Detail</button>';\r\n" +
  "    if (!isClosed) h += '<button onclick=\"openAddInvoice(\\'' + p.id + '\\')\" style=\"background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;\">Add Invoice</button>';\r\n" +
  "    h += '</td>';\r\n" +
  "    h += '</tr>';",
  'add Detail toggle button in last column'
);

// -----------------------------------------------------------------------
// PATCH 3: insert new hidden detail <tr> right after the existing edit row
// -----------------------------------------------------------------------
replaceExact(
  "    h += '<tr id=\"proy-edit-' + p.id + '\" style=\"display:none;background:#F0F9FF;\"><td colspan=\"13\" style=\"padding:8px 16px;\"><div id=\"proy-edit-inner-' + p.id + '\"></div></td></tr>';\r\n",
  "    h += '<tr id=\"proy-edit-' + p.id + '\" style=\"display:none;background:#F0F9FF;\"><td colspan=\"13\" style=\"padding:8px 16px;\"><div id=\"proy-edit-inner-' + p.id + '\"></div></td></tr>';\r\n" +
  "    h += '<tr id=\"proy-detail-' + p.id + '\" style=\"display:' + (_detailOpen ? '' : 'none') + ';background:#FAFAFA;\"><td colspan=\"13\" style=\"padding:12px 16px;\">' + renderProyekAnalisisDetail(p, fMap) + '</td></tr>';\r\n",
  'add hidden detail row template'
);

// -----------------------------------------------------------------------
// PATCH 4: add helper functions right after renderProyekAnalisis
// -----------------------------------------------------------------------
replaceExact(
  "function setProyekAnalisisFilter(f) {\r\n" +
  "  proyekAnalisisFilter = f;\r\n",
  "function renderProyekAnalisisDetail(p, fMap) {\r\n" +
  "  const units = p.project_units || [];\r\n" +
  "  const bl = Number(p.total_mt_m3) || 0;\r\n" +
  "  const blUnit = p.bl_unit === 'M3' ? 'M3' : 'MT';\r\n" +
  "  const targetHM = bl > 0 ? (blUnit === 'M3' ? bl / 110 : bl / 95) : 0;\r\n" +
  "  const actualHM = units.reduce(function(s, u) { return s + (u.hm_akhir != null ? Math.max(0, u.hm_akhir - u.hm_awal) : 0); }, 0);\r\n" +
  "  const delta = targetHM > 0 ? ((actualHM - targetHM) / targetHM * 100) : 0;\r\n" +
  "  const deltaColor = delta > 0 ? '#EF4444' : (delta < 0 ? '#16A34A' : '#64748B');\r\n" +
  "  const deltaLbl = targetHM > 0 ? (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%' : '—';\r\n" +
  "  let out = '<div style=\"display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:12px;font-size:13px;\">';\r\n" +
  "  out += '<div style=\"background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;\"><span style=\"color:#64748B;\">BL:</span> <strong>' + bl.toLocaleString('id-ID') + '</strong> ' + blUnit + '</div>';\r\n" +
  "  out += '<div style=\"background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;\"><span style=\"color:#64748B;\">Target HM:</span> <strong>' + targetHM.toFixed(2) + '</strong> h <span style=\"color:#94A3B8;font-size:11px;\">(BL ÷ ' + (blUnit === 'M3' ? 110 : 95) + ')</span></div>';\r\n" +
  "  out += '<div style=\"background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;\"><span style=\"color:#64748B;\">Actual HM:</span> <strong>' + actualHM.toFixed(2) + '</strong> h</div>';\r\n" +
  "  out += '<div style=\"background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;\"><span style=\"color:#64748B;\">Delta:</span> <strong style=\"color:' + deltaColor + ';\">' + deltaLbl + '</strong></div>';\r\n" +
  "  out += '<div style=\"display:inline-flex;background:#F1F5F9;border-radius:99px;padding:2px;\">';\r\n" +
  "  ['MT','M3'].forEach(function(u) {\r\n" +
  "    const on = blUnit === u;\r\n" +
  "    out += '<button onclick=\"setProyekBlUnit(\\'' + p.id + '\\',\\'' + u + '\\')\" style=\"padding:4px 12px;border-radius:99px;border:none;cursor:pointer;font-size:12px;font-weight:700;background:' + (on ? '#1D4ED8' : 'transparent') + ';color:' + (on ? '#fff' : '#64748B') + ';\">' + u + '</button>';\r\n" +
  "  });\r\n" +
  "  out += '</div>';\r\n" +
  "  out += '</div>';\r\n" +
  "  out += '<table style=\"width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;\">';\r\n" +
  "  out += '<thead><tr style=\"background:#F1F5F9;\"><th style=\"padding:8px 10px;text-align:left;color:#475569;\">Unit</th><th style=\"padding:8px 10px;text-align:right;color:#475569;\">HM Kerja</th><th style=\"padding:8px 10px;text-align:right;color:#475569;\">Solar Consumed (L)</th><th style=\"padding:8px 10px;text-align:right;color:#475569;\">Avg L/Hr</th></tr></thead><tbody>';\r\n" +
  "  let tHM = 0, tCons = 0;\r\n" +
  "  units.forEach(function(u) {\r\n" +
  "    const code = u.units ? u.units.code : '?';\r\n" +
  "    const hmKerja = u.hm_akhir != null ? Math.max(0, u.hm_akhir - u.hm_awal) : 0;\r\n" +
  "    const isi = (fMap[p.id] && fMap[p.id][u.unit_id] != null) ? fMap[p.id][u.unit_id] : (u.solar_isi_liters || 0);\r\n" +
  "    const tankDiff = (u.solar_akhir_pct != null && u.solar_awal_pct != null) ? ((u.solar_awal_pct - u.solar_akhir_pct) / 100) * 320 : 0;\r\n" +
  "    const consumed = isi + tankDiff;\r\n" +
  "    const lPerHr = hmKerja > 0 ? consumed / hmKerja : null;\r\n" +
  "    tHM += hmKerja; tCons += consumed;\r\n" +
  "    out += '<tr style=\"border-top:1px solid #F1F5F9;\">';\r\n" +
  "    out += '<td style=\"padding:6px 10px;font-weight:700;\">' + code + '</td>';\r\n" +
  "    out += '<td style=\"padding:6px 10px;text-align:right;\">' + hmKerja.toFixed(2) + '</td>';\r\n" +
  "    out += '<td style=\"padding:6px 10px;text-align:right;\">' + consumed.toFixed(1) + '</td>';\r\n" +
  "    out += '<td style=\"padding:6px 10px;text-align:right;\">' + (lPerHr != null ? lPerHr.toFixed(1) : '—') + '</td>';\r\n" +
  "    out += '</tr>';\r\n" +
  "  });\r\n" +
  "  const avgAll = tHM > 0 ? tCons / tHM : null;\r\n" +
  "  out += '<tr style=\"background:#F8FAFC;font-weight:700;border-top:1px solid #E2E8F0;\"><td style=\"padding:6px 10px;\">TOTAL</td><td style=\"padding:6px 10px;text-align:right;\">' + tHM.toFixed(2) + '</td><td style=\"padding:6px 10px;text-align:right;\">' + tCons.toFixed(1) + '</td><td style=\"padding:6px 10px;text-align:right;\">' + (avgAll != null ? avgAll.toFixed(1) : '—') + '</td></tr>';\r\n" +
  "  out += '</tbody></table>';\r\n" +
  "  return out;\r\n" +
  "}\r\n\r\n" +
  "function toggleProyekAnalisisDetail(pid) {\r\n" +
  "  if (proyekAnalisisExpanded.has(pid)) proyekAnalisisExpanded.delete(pid);\r\n" +
  "  else proyekAnalisisExpanded.add(pid);\r\n" +
  "  const panel = document.getElementById('proyek-panel-analisis');\r\n" +
  "  if (panel && panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects, panel._fillMap || {});\r\n" +
  "}\r\n\r\n" +
  "async function setProyekBlUnit(pid, unit) {\r\n" +
  "  if (unit !== 'MT' && unit !== 'M3') return;\r\n" +
  "  const panel = document.getElementById('proyek-panel-analisis');\r\n" +
  "  const projects = (panel && panel._analisisProjects) || [];\r\n" +
  "  const p = projects.find(function(x) { return String(x.id) === String(pid); });\r\n" +
  "  if (!p) return;\r\n" +
  "  const prev = p.bl_unit;\r\n" +
  "  if (prev === unit) return;\r\n" +
  "  p.bl_unit = unit;\r\n" +
  "  renderProyekAnalisis(projects, panel._fillMap || {});\r\n" +
  "  try {\r\n" +
  "    const { error } = await sb.from('projects').update({ bl_unit: unit }).eq('id', pid);\r\n" +
  "    if (error) throw error;\r\n" +
  "  } catch(e) {\r\n" +
  "    p.bl_unit = prev;\r\n" +
  "    renderProyekAnalisis(projects, panel._fillMap || {});\r\n" +
  "    showToast('Gagal simpan satuan: ' + e.message);\r\n" +
  "  }\r\n" +
  "}\r\n\r\n" +
  "function setProyekAnalisisFilter(f) {\r\n" +
  "  proyekAnalisisFilter = f;\r\n",
  'add renderProyekAnalisisDetail + toggleProyekAnalisisDetail + setProyekBlUnit'
);

fs.writeFileSync(path, src);
console.log('Done.');
