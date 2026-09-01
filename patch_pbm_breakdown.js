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
// '\x5cu2014' = literal 6-char sequence: backslash + u2014 (matches file content)
const EM = '\x5cu2014';

// PATCH 1: enhance _fetchPbmPeriod to join sof_projects(label) + collect per-shift details
replaceExact(
  [
    "async function _fetchPbmPeriod(startDate, endDate) {",
    "  var res = await sb.from('sof_shifts').select('pbm_staff_id, shift_date, pbm_staff(name)')",
    "    .gte('shift_date', startDate).lte('shift_date', endDate);",
    "  if (res.error) { console.error('_fetchPbmPeriod:', res.error); return []; }",
    "  var map = {};",
    "  (res.data || []).forEach(function(row) {",
    "    var id = row.pbm_staff_id;",
    "    var name = (row.pbm_staff && row.pbm_staff.name) ? row.pbm_staff.name : '" + EM + "';",
    "    if (!map[id]) map[id] = { id: id, name: name, shifts: 0 };",
    "    map[id].shifts++;",
    "  });",
    "  return Object.values(map).sort(function(a, b) { return a.name.localeCompare(b.name); });",
    "}"
  ].join(N),
  [
    "async function _fetchPbmPeriod(startDate, endDate) {",
    "  var res = await sb.from('sof_shifts').select('pbm_staff_id, shift_date, shift_num, sof_projects(label), pbm_staff(name)')",
    "    .gte('shift_date', startDate).lte('shift_date', endDate)",
    "    .order('shift_date').order('shift_num');",
    "  if (res.error) { console.error('_fetchPbmPeriod:', res.error); return []; }",
    "  var map = {};",
    "  (res.data || []).forEach(function(row) {",
    "    var id = row.pbm_staff_id;",
    "    var name = (row.pbm_staff && row.pbm_staff.name) ? row.pbm_staff.name : '" + EM + "';",
    "    if (!map[id]) map[id] = { id: id, name: name, shifts: 0, details: [] };",
    "    map[id].shifts++;",
    "    var label = (row.sof_projects && row.sof_projects.label) ? row.sof_projects.label : '" + EM + "';",
    "    var kapal = label.split(' / ')[0];",
    "    var d = row.shift_date ? row.shift_date.slice(8,10) + '/' + row.shift_date.slice(5,7) : '" + EM + "';",
    "    map[id].details.push({ date: d, shiftNum: row.shift_num || '" + EM + "', kapal: kapal });",
    "  });",
    "  return Object.values(map).sort(function(a, b) { return a.name.localeCompare(b.name); });",
    "}"
  ].join(N),
  'PATCH 1: _fetchPbmPeriod — join sof_projects label + collect shift details'
);

// PATCH 2: _renderPbmTable — add breakdown sub-row after each staff row
replaceExact(
  [
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
    "    });"
  ].join(N),
  [
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
    "    });"
  ].join(N),
  'PATCH 2: _renderPbmTable — add per-shift breakdown sub-rows'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
