// patch_analisis_sort_and_mike.js
//   1. Sort by project_code asc/desc via header click
//   2. Add "Mike Check" checkbox column (Michael editable, others read-only)

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

// PATCH 1: add sort state var next to proyekAnalisisExpanded
replaceExact(
  "let proyekAnalisisExpanded = new Set();\r\n",
  "let proyekAnalisisExpanded = new Set();\r\n" +
  "let proyekAnalisisSort = 'asc';\r\n" +
  "const MIKE_EMAIL = 'michael.gunawan1995@gmail.com';\r\n",
  'add proyekAnalisisSort state + MIKE_EMAIL constant'
);

// PATCH 2: apply sort in the render (filter already exists as let filtered = projects)
replaceExact(
  "  if (proyekAnalisisFilter === 'open') filtered = projects.filter(p => !p.invoice_number);\r\n" +
  "  if (proyekAnalisisFilter === 'closed') filtered = projects.filter(p => p.invoice_number);\r\n",
  "  if (proyekAnalisisFilter === 'open') filtered = projects.filter(p => !p.invoice_number);\r\n" +
  "  if (proyekAnalisisFilter === 'closed') filtered = projects.filter(p => p.invoice_number);\r\n" +
  "  filtered = filtered.slice().sort(function(a, b) {\r\n" +
  "    const cmp = String(a.project_code || '').localeCompare(String(b.project_code || ''));\r\n" +
  "    return proyekAnalisisSort === 'desc' ? -cmp : cmp;\r\n" +
  "  });\r\n",
  'apply sort by project_code'
);

// PATCH 3: rewrite header cell for "Kode" to be a sortable button + add "Mike Check" column
replaceExact(
  "  ['Invoice#','Kode','Nama Kapal','Pemberi Kerja','Kade','HM Total','Income','Biaya Solar','Biaya Tenaga','Profit','Yield/HM','Status',''].forEach(col => {\r\n" +
  "    h += '<th style=\"padding:8px 10px;text-align:' + (['Income','Biaya Solar','Biaya Tenaga','Profit','Yield/HM','HM Total'].includes(col) ? 'right' : 'left') + ';font-weight:700;color:#475569;white-space:nowrap;\">' + col + '</th>';\r\n" +
  "  });\r\n",
  "  ['Invoice#','Kode','Nama Kapal','Pemberi Kerja','Kade','HM Total','Income','Biaya Solar','Biaya Tenaga','Profit','Yield/HM','Status','Mike Check',''].forEach(col => {\r\n" +
  "    let inner = col;\r\n" +
  "    if (col === 'Kode') {\r\n" +
  "      const arrow = proyekAnalisisSort === 'asc' ? '▲' : '▼';\r\n" +
  "      inner = '<button onclick=\"toggleProyekAnalisisSort()\" style=\"background:none;border:none;color:#475569;font-weight:700;cursor:pointer;padding:0;font-size:12px;\">Kode ' + arrow + '</button>';\r\n" +
  "    }\r\n" +
  "    h += '<th style=\"padding:8px 10px;text-align:' + (['Income','Biaya Solar','Biaya Tenaga','Profit','Yield/HM','HM Total'].includes(col) ? 'right' : 'left') + ';font-weight:700;color:#475569;white-space:nowrap;\">' + inner + '</th>';\r\n" +
  "  });\r\n",
  'sortable Kode header + Mike Check header column'
);

// PATCH 4: add Mike Check cell right before the last (action) cell
replaceExact(
  "    h += '<td style=\"padding:8px 10px;\"><span style=\"background:' + (isClosed ? '#DCFCE7' : '#FEF9C3') + ';color:' + (isClosed ? '#16A34A' : '#CA8A04') + ';font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;\">' + (isClosed ? 'CLOSED' : 'OPEN') + '</span></td>';\r\n" +
  "    const _detailOpen = proyekAnalisisExpanded.has(p.id);",
  "    h += '<td style=\"padding:8px 10px;\"><span style=\"background:' + (isClosed ? '#DCFCE7' : '#FEF9C3') + ';color:' + (isClosed ? '#16A34A' : '#CA8A04') + ';font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;\">' + (isClosed ? 'CLOSED' : 'OPEN') + '</span></td>';\r\n" +
  "    h += '<td style=\"padding:8px 10px;text-align:center;\">' + renderMikeCheckCell(p) + '</td>';\r\n" +
  "    const _detailOpen = proyekAnalisisExpanded.has(p.id);",
  'insert Mike Check cell per row'
);

// PATCH 5: update colspan="13" -> "14" for the 3 sibling rows (edit / detail / invoice)
replaceExact(
  "    h += '<tr id=\"proy-edit-' + p.id + '\" style=\"display:none;background:#F0F9FF;\"><td colspan=\"13\" style=\"padding:8px 16px;\"><div id=\"proy-edit-inner-' + p.id + '\"></div></td></tr>';\r\n" +
  "    h += '<tr id=\"proy-detail-' + p.id + '\" style=\"display:' + (_detailOpen ? '' : 'none') + ';background:#FAFAFA;\"><td colspan=\"13\" style=\"padding:12px 16px;\">' + renderProyekAnalisisDetail(p, fMap) + '</td></tr>';\r\n" +
  "    if (!isClosed) {\r\n" +
  "      h += '<tr id=\"inv-input-' + p.id + '\" style=\"display:none;background:#FFFBEB;\"><td colspan=\"13\" style=\"padding:8px 16px;\">';",
  "    h += '<tr id=\"proy-edit-' + p.id + '\" style=\"display:none;background:#F0F9FF;\"><td colspan=\"14\" style=\"padding:8px 16px;\"><div id=\"proy-edit-inner-' + p.id + '\"></div></td></tr>';\r\n" +
  "    h += '<tr id=\"proy-detail-' + p.id + '\" style=\"display:' + (_detailOpen ? '' : 'none') + ';background:#FAFAFA;\"><td colspan=\"14\" style=\"padding:12px 16px;\">' + renderProyekAnalisisDetail(p, fMap) + '</td></tr>';\r\n" +
  "    if (!isClosed) {\r\n" +
  "      h += '<tr id=\"inv-input-' + p.id + '\" style=\"display:none;background:#FFFBEB;\"><td colspan=\"14\" style=\"padding:8px 16px;\">';",
  'bump colspan 13->14 in 3 sibling rows'
);

// PATCH 6: extend the TOTAL row last colspan to include the new Mike Check column
replaceExact(
  "  h += '<tr style=\"background:#F1F5F9;font-weight:800;\"><td colspan=\"5\" style=\"padding:8px 10px;\">TOTAL</td><td style=\"padding:8px 10px;text-align:right;\">' + sumHM.toFixed(1) + '</td><td style=\"padding:8px 10px;text-align:right;\">' + fmtRp(sumIncome) + '</td><td style=\"padding:8px 10px;text-align:right;color:#EF4444;\">' + fmtRp(sumFuel) + '</td><td style=\"padding:8px 10px;text-align:right;color:#F59E0B;\">' + fmtRp(sumLabor) + '</td><td style=\"padding:8px 10px;text-align:right;color:' + (sumProfit >= 0 ? '#16A34A' : '#EF4444') + ';\">' + fmtRp(sumProfit) + '</td><td style=\"padding:8px 10px;text-align:right;\">' + fmtRp(sumHM > 0 ? sumProfit/sumHM : 0) + '/HM</td><td colspan=\"2\"></td></tr>';\r\n",
  "  h += '<tr style=\"background:#F1F5F9;font-weight:800;\"><td colspan=\"5\" style=\"padding:8px 10px;\">TOTAL</td><td style=\"padding:8px 10px;text-align:right;\">' + sumHM.toFixed(1) + '</td><td style=\"padding:8px 10px;text-align:right;\">' + fmtRp(sumIncome) + '</td><td style=\"padding:8px 10px;text-align:right;color:#EF4444;\">' + fmtRp(sumFuel) + '</td><td style=\"padding:8px 10px;text-align:right;color:#F59E0B;\">' + fmtRp(sumLabor) + '</td><td style=\"padding:8px 10px;text-align:right;color:' + (sumProfit >= 0 ? '#16A34A' : '#EF4444') + ';\">' + fmtRp(sumProfit) + '</td><td style=\"padding:8px 10px;text-align:right;\">' + fmtRp(sumHM > 0 ? sumProfit/sumHM : 0) + '/HM</td><td colspan=\"3\"></td></tr>';\r\n",
  'bump TOTAL row last colspan 2->3'
);

// PATCH 7: add helpers: toggleProyekAnalisisSort, renderMikeCheckCell, setMikeChecked
replaceExact(
  "function renderProyekAnalisisDetail(p, fMap) {\r\n",
  "function toggleProyekAnalisisSort() {\r\n" +
  "  proyekAnalisisSort = proyekAnalisisSort === 'asc' ? 'desc' : 'asc';\r\n" +
  "  const panel = document.getElementById('proyek-panel-analisis');\r\n" +
  "  if (panel && panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects, panel._fillMap || {});\r\n" +
  "}\r\n\r\n" +
  "function renderMikeCheckCell(p) {\r\n" +
  "  const isMike = currentUser && currentUser.email === MIKE_EMAIL;\r\n" +
  "  const checked = !!p.mike_checked;\r\n" +
  "  if (isMike) {\r\n" +
  "    return '<input type=\"checkbox\" ' + (checked ? 'checked' : '') + ' onchange=\"setMikeChecked(\\'' + p.id + '\\', this.checked)\" style=\"width:18px;height:18px;cursor:pointer;\">';\r\n" +
  "  }\r\n" +
  "  return checked ? '<span style=\"color:#16A34A;font-size:16px;font-weight:800;\">✓</span>' : '<span style=\"color:#CBD5E1;\">—</span>';\r\n" +
  "}\r\n\r\n" +
  "async function setMikeChecked(pid, checked) {\r\n" +
  "  const panel = document.getElementById('proyek-panel-analisis');\r\n" +
  "  const projects = (panel && panel._analisisProjects) || [];\r\n" +
  "  const p = projects.find(function(x) { return String(x.id) === String(pid); });\r\n" +
  "  if (!p) return;\r\n" +
  "  const prev = p.mike_checked;\r\n" +
  "  p.mike_checked = !!checked;\r\n" +
  "  try {\r\n" +
  "    const { error } = await sb.from('projects').update({ mike_checked: !!checked }).eq('id', pid);\r\n" +
  "    if (error) throw error;\r\n" +
  "  } catch(e) {\r\n" +
  "    p.mike_checked = prev;\r\n" +
  "    renderProyekAnalisis(projects, panel._fillMap || {});\r\n" +
  "    showToast('Gagal simpan Mike Check: ' + e.message);\r\n" +
  "  }\r\n" +
  "}\r\n\r\n" +
  "function renderProyekAnalisisDetail(p, fMap) {\r\n",
  'add sort + Mike Check helpers'
);

fs.writeFileSync(path, src);
console.log('Done.');
