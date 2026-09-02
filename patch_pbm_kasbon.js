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
const EM = '\x5cu2014'; // literal 6-char: —

// PATCH 1: add _pbmKasbonMap global var
replaceExact(
  "var _pbmGajiData = { p1: [], p2: [] };",
  "var _pbmGajiData = { p1: [], p2: [] };" + N +
  "var _pbmKasbonMap = {};",
  'PATCH 1: add _pbmKasbonMap global'
);

// PATCH 2: loadPbmGaji — fetch kasbon, pass period to render
replaceExact(
  [
    "async function loadPbmGaji() {",
    "  var bulan = document.getElementById('pbm-bulan').value;",
    "  if (!bulan) { alert('Pilih bulan terlebih dahulu'); return; }",
    "  var parts = bulan.split('-');",
    "  var year = parts[0];",
    "  var month = parts[1];",
    "  var lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();",
    "  var p1Start = year + '-' + month + '-01';",
    "  var p1End   = year + '-' + month + '-15';",
    "  var p2Start = year + '-' + month + '-16';",
    "  var p2End   = year + '-' + month + '-' + String(lastDay).padStart(2, '0');",
    "  var results = await Promise.all([_fetchPbmPeriod(p1Start, p1End), _fetchPbmPeriod(p2Start, p2End)]);",
    "  _pbmGajiData = { p1: results[0], p2: results[1] };",
    "  _renderPbmTable('pbm-table-1', results[0], p1Start, p1End);",
    "  _renderPbmTable('pbm-table-2', results[1], p2Start, p2End);",
    "}"
  ].join(N),
  [
    "async function loadPbmGaji() {",
    "  var bulan = document.getElementById('pbm-bulan').value;",
    "  if (!bulan) { alert('Pilih bulan terlebih dahulu'); return; }",
    "  var parts = bulan.split('-');",
    "  var year = parts[0];",
    "  var month = parts[1];",
    "  var lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();",
    "  var p1Start = year + '-' + month + '-01';",
    "  var p1End   = year + '-' + month + '-15';",
    "  var p2Start = year + '-' + month + '-16';",
    "  var p2End   = year + '-' + month + '-' + String(lastDay).padStart(2, '0');",
    "  var kRes = await sb.from('pbm_kasbon').select('pbm_staff_id, period, kasbon, bonus').eq('month_year', bulan);",
    "  _pbmKasbonMap = {};",
    "  (kRes.data || []).forEach(function(k) { _pbmKasbonMap[k.pbm_staff_id + '-' + k.period] = { kasbon: k.kasbon, bonus: k.bonus }; });",
    "  var results = await Promise.all([_fetchPbmPeriod(p1Start, p1End), _fetchPbmPeriod(p2Start, p2End)]);",
    "  _pbmGajiData = { p1: results[0], p2: results[1] };",
    "  _renderPbmTable('pbm-table-1', results[0], p1Start, p1End, bulan, 1);",
    "  _renderPbmTable('pbm-table-2', results[1], p2Start, p2End, bulan, 2);",
    "}"
  ].join(N),
  'PATCH 2: loadPbmGaji — fetch pbm_kasbon + pass period'
);

// PATCH 3: _renderPbmTable — add Kasbon/Bonus/Net columns
replaceExact(
  [
    "function _renderPbmTable(containerId, rows, startDate, endDate) {",
    "  var tarif = parseInt(document.getElementById('pbm-tarif').value) || 0;",
    "  var total = rows.reduce(function(s, r) { return s + r.shifts; }, 0);",
    "  var bodyHtml = '';",
    "  if (rows.length === 0) {",
    "    bodyHtml = '<tr><td colspan=\"3\" style=\"text-align:center;padding:16px;color:#9ca3af;\">Tidak ada data</td></tr>';",
    "  } else {",
    "    rows.forEach(function(r) {",
    "      var safeName = r.name.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;');",
    "      bodyHtml +=",
    "        '<tr class=\"pbm-row\"' +",
    "        ' data-sid=\"' + r.id + '\"' +",
    "        ' data-sname=\"' + safeName + '\"' +",
    "        ' data-sd=\"' + startDate + '\"' +",
    "        ' data-ed=\"' + endDate + '\"' +",
    "        ' onclick=\"_pbmRowClick(this)\">' +",
    "        '<td style=\"padding:8px 10px;\">' + r.name + '</td>' +",
    "        '<td style=\"text-align:center;padding:8px 10px;font-weight:600;\">' + r.shifts + '</td>' +",
    "        '<td style=\"text-align:right;padding:8px 10px;\">' + (tarif ? fmtRp(r.shifts * tarif) : '" + EM + "') + '</td>' +",
    "        '</tr>';",
    "      if (r.details && r.details.length > 0) {",
    "        var detailLines = r.details.map(function(d) {",
    "          return d.date + ' &nbsp;&middot;&nbsp; Shift ' + d.shiftNum + ' &nbsp;&middot;&nbsp; ' + d.kapal;",
    "        }).join('<br>');",
    "        bodyHtml +=",
    "          '<tr style=\"background:#f9fafb;\">' +",
    "          '<td colspan=\"3\" style=\"padding:2px 10px 8px 24px;font-size:11px;color:#9ca3af;line-height:1.8;\">' +",
    "          detailLines + '</td></tr>';",
    "      }",
    "    });",
    "  }",
    "  var footRp = tarif ? fmtRp(total * tarif) : '" + EM + "';",
    "  var html =",
    "    '<table style=\"width:100%;border-collapse:collapse;font-size:13px;\">' +",
    "    '<thead><tr style=\"background:#f3f4f6;\">' +",
    "      '<th style=\"text-align:left;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Nama Staff PBM</th>' +",
    "      '<th style=\"text-align:center;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Shift</th>' +",
    "      '<th style=\"text-align:right;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Total</th>' +",
    "    '</tr></thead>' +",
    "    '<tbody>' + bodyHtml + '</tbody>' +",
    "    '<tfoot><tr style=\"background:#f9fafb;font-weight:600;border-top:2px solid #e5e7eb;\">' +",
    "      '<td style=\"padding:8px 10px;\">Grand Total</td>' +",
    "      '<td style=\"text-align:center;padding:8px 10px;\">' + total + '</td>' +",
    "      '<td style=\"text-align:right;padding:8px 10px;\">' + footRp + '</td>' +",
    "    '</tr></tfoot></table>';",
    "  document.getElementById(containerId).innerHTML = html;",
    "}"
  ].join(N),
  [
    "function _renderPbmTable(containerId, rows, startDate, endDate, monthYear, period) {",
    "  var tarif = parseInt(document.getElementById('pbm-tarif').value) || 0;",
    "  var totalShifts = rows.reduce(function(s, r) { return s + r.shifts; }, 0);",
    "  var totalKasbon = 0, totalBonus = 0, totalGaji = 0;",
    "  var bodyHtml = '';",
    "  if (rows.length === 0) {",
    "    bodyHtml = '<tr><td colspan=\"7\" style=\"text-align:center;padding:16px;color:#9ca3af;\">Tidak ada data</td></tr>';",
    "  } else {",
    "    rows.forEach(function(r) {",
    "      var k = (_pbmKasbonMap && _pbmKasbonMap[r.id + '-' + period]) || { kasbon: 0, bonus: 0 };",
    "      var gaji = tarif * r.shifts;",
    "      var net = gaji - k.kasbon + k.bonus;",
    "      totalGaji += gaji; totalKasbon += k.kasbon; totalBonus += k.bonus;",
    "      var safeName = r.name.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;');",
    "      bodyHtml +=",
    "        '<tr class=\"pbm-row\"' +",
    "        ' data-sid=\"' + r.id + '\"' +",
    "        ' data-sname=\"' + safeName + '\"' +",
    "        ' data-sd=\"' + startDate + '\"' +",
    "        ' data-ed=\"' + endDate + '\"' +",
    "        ' onclick=\"_pbmRowClick(this)\">' +",
    "        '<td style=\"padding:8px 10px;\">' + r.name + '</td>' +",
    "        '<td style=\"text-align:center;padding:8px 10px;font-weight:600;\">' + r.shifts + '</td>' +",
    "        '<td style=\"text-align:right;padding:8px 10px;\">' + (tarif ? fmtRp(gaji) : '" + EM + "') + '</td>' +",
    "        '<td style=\"padding:4px 6px;\" onclick=\"event.stopPropagation()\"><input type=\"number\" id=\"pbm-kasbon-' + r.id + '-' + period + '\" value=\"' + k.kasbon + '\" style=\"width:88px;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;\"></td>' +",
    "        '<td style=\"padding:4px 6px;\" onclick=\"event.stopPropagation()\"><input type=\"number\" id=\"pbm-bonus-' + r.id + '-' + period + '\" value=\"' + k.bonus + '\" style=\"width:88px;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;\"></td>' +",
    "        '<td style=\"text-align:right;padding:8px 10px;font-weight:600;\" id=\"pbm-net-' + r.id + '-' + period + '\">' + fmtRp(net) + '</td>' +",
    "        '<td style=\"padding:4px 6px;\" onclick=\"event.stopPropagation()\"><button onclick=\"savePbmKasbon(this,event)\" data-sid=\"' + r.id + '\" data-period=\"' + period + '\" data-my=\"' + monthYear + '\" data-shifts=\"' + r.shifts + '\" style=\"padding:4px 10px;font-size:11px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;\">Simpan</button></td>' +",
    "        '</tr>';",
    "      if (r.details && r.details.length > 0) {",
    "        var detailLines = r.details.map(function(d) {",
    "          return d.date + ' &nbsp;&middot;&nbsp; Shift ' + d.shiftNum + ' &nbsp;&middot;&nbsp; ' + d.kapal;",
    "        }).join('<br>');",
    "        bodyHtml +=",
    "          '<tr style=\"background:#f9fafb;\">' +",
    "          '<td colspan=\"7\" style=\"padding:2px 10px 8px 24px;font-size:11px;color:#9ca3af;line-height:1.8;\">' +",
    "          detailLines + '</td></tr>';",
    "      }",
    "    });",
    "  }",
    "  var totalNet = totalGaji - totalKasbon + totalBonus;",
    "  var html =",
    "    '<table style=\"width:100%;border-collapse:collapse;font-size:13px;\">' +",
    "    '<thead><tr style=\"background:#f3f4f6;\">' +",
    "      '<th style=\"text-align:left;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Nama</th>' +",
    "      '<th style=\"text-align:center;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Shift</th>' +",
    "      '<th style=\"text-align:right;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Gaji Shift</th>' +",
    "      '<th style=\"text-align:center;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Kasbon (Rp)</th>' +",
    "      '<th style=\"text-align:center;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Bonus (Rp)</th>' +",
    "      '<th style=\"text-align:right;padding:8px 10px;border-bottom:1px solid #e5e7eb;\">Net</th>' +",
    "      '<th style=\"padding:8px 10px;border-bottom:1px solid #e5e7eb;\"></th>' +",
    "    '</tr></thead>' +",
    "    '<tbody>' + bodyHtml + '</tbody>' +",
    "    '<tfoot><tr style=\"background:#f9fafb;font-weight:600;border-top:2px solid #e5e7eb;\">' +",
    "      '<td style=\"padding:8px 10px;\">Grand Total</td>' +",
    "      '<td style=\"text-align:center;padding:8px 10px;\">' + totalShifts + '</td>' +",
    "      '<td style=\"text-align:right;padding:8px 10px;\">' + (tarif ? fmtRp(totalGaji) : '" + EM + "') + '</td>' +",
    "      '<td style=\"text-align:right;padding:8px 10px;color:#dc2626;\">' + (totalKasbon ? fmtRp(totalKasbon) : '" + EM + "') + '</td>' +",
    "      '<td style=\"text-align:right;padding:8px 10px;color:#16a34a;\">' + (totalBonus ? fmtRp(totalBonus) : '" + EM + "') + '</td>' +",
    "      '<td style=\"text-align:right;padding:8px 10px;\">' + (tarif ? fmtRp(totalNet) : '" + EM + "') + '</td>' +",
    "      '<td></td>' +",
    "    '</tr></tfoot></table>';",
    "  document.getElementById(containerId).innerHTML = html;",
    "}"
  ].join(N),
  'PATCH 3: _renderPbmTable — add Kasbon/Bonus/Net columns'
);

// PATCH 4: add savePbmKasbon function before _pbmRowClick
replaceExact(
  "function _pbmRowClick(el) {",
  [
    "async function savePbmKasbon(btn, event) {",
    "  if (event) event.stopPropagation();",
    "  var sid = btn.dataset.sid;",
    "  var period = parseInt(btn.dataset.period);",
    "  var monthYear = btn.dataset.my;",
    "  var shifts = parseInt(btn.dataset.shifts) || 0;",
    "  var tarif = parseInt(document.getElementById('pbm-tarif').value) || 0;",
    "  var kasbon = parseInt(document.getElementById('pbm-kasbon-' + sid + '-' + period).value) || 0;",
    "  var bonus = parseInt(document.getElementById('pbm-bonus-' + sid + '-' + period).value) || 0;",
    "  var res = await sb.from('pbm_kasbon').upsert({ pbm_staff_id: sid, month_year: monthYear, period: period, kasbon: kasbon, bonus: bonus }, { onConflict: 'pbm_staff_id,month_year,period' });",
    "  if (res.error) { alert('Gagal simpan: ' + res.error.message); return; }",
    "  if (!_pbmKasbonMap) _pbmKasbonMap = {};",
    "  _pbmKasbonMap[sid + '-' + period] = { kasbon: kasbon, bonus: bonus };",
    "  var net = (tarif * shifts) - kasbon + bonus;",
    "  var netEl = document.getElementById('pbm-net-' + sid + '-' + period);",
    "  if (netEl) netEl.textContent = fmtRp(net);",
    "  var orig = btn.textContent;",
    "  btn.textContent = '" + "✓" + " Tersimpan';",
    "  setTimeout(function() { btn.textContent = orig; }, 1500);",
    "}",
    "",
    "function _pbmRowClick(el) {"
  ].join(N),
  'PATCH 4: add savePbmKasbon function'
);

// PATCH 5: exportPbmGajiExcel — add Kasbon/Bonus/Net columns
replaceExact(
  [
    "function exportPbmGajiExcel() {",
    "  var bulan = document.getElementById('pbm-bulan').value || 'unknown';",
    "  var tarif = parseInt(document.getElementById('pbm-tarif').value) || 0;",
    "  var toSheet = function(rows) {",
    "    return rows.map(function(r) {",
    "      var o = {};",
    "      o['Nama Staff PBM'] = r.name;",
    "      o['Jumlah Shift'] = r.shifts;",
    "      o['Tarif/Shift'] = tarif;",
    "      o['Total'] = r.shifts * tarif;",
    "      return o;",
    "    });",
    "  };",
    "  var wb = XLSX.utils.book_new();",
    "  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(_pbmGajiData.p1)), 'Periode 1-15');",
    "  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(_pbmGajiData.p2)), 'Periode 16-31');",
    "  XLSX.writeFile(wb, 'PBM_Gaji_' + bulan + '.xlsx');",
    "}"
  ].join(N),
  [
    "function exportPbmGajiExcel() {",
    "  var bulan = document.getElementById('pbm-bulan').value || 'unknown';",
    "  var tarif = parseInt(document.getElementById('pbm-tarif').value) || 0;",
    "  var toSheet = function(rows, period) {",
    "    return rows.map(function(r) {",
    "      var kasbonEl = document.getElementById('pbm-kasbon-' + r.id + '-' + period);",
    "      var bonusEl  = document.getElementById('pbm-bonus-'  + r.id + '-' + period);",
    "      var k = (_pbmKasbonMap && _pbmKasbonMap[r.id + '-' + period]) || { kasbon: 0, bonus: 0 };",
    "      var kasbon = kasbonEl ? (parseInt(kasbonEl.value) || 0) : k.kasbon;",
    "      var bonus  = bonusEl  ? (parseInt(bonusEl.value)  || 0) : k.bonus;",
    "      var gaji = r.shifts * tarif;",
    "      var net  = gaji - kasbon + bonus;",
    "      return { 'Nama Staff PBM': r.name, 'Jumlah Shift': r.shifts, 'Tarif/Shift': tarif, 'Gaji Shift': gaji, 'Kasbon': kasbon, 'Bonus': bonus, 'Net': net };",
    "    });",
    "  };",
    "  var wb = XLSX.utils.book_new();",
    "  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(_pbmGajiData.p1, 1)), 'Periode 1-15');",
    "  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheet(_pbmGajiData.p2, 2)), 'Periode 16-31');",
    "  XLSX.writeFile(wb, 'PBM_Gaji_' + bulan + '.xlsx');",
    "}"
  ].join(N),
  'PATCH 5: exportPbmGajiExcel — add Kasbon/Bonus/Net'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
