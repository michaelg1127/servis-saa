// patch_pbm_distinct.js — PBM Gaji: dedupe rows per (staff, date, shift) so activity-log
//   duplicates don't inflate shift counts

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

replaceExact(
  "  var map = {};\r\n" +
  "  (res.data || []).forEach(function(row) {\r\n" +
  "    var id = row.pbm_staff_id;\r\n" +
  "    var name = (row.pbm_staff && row.pbm_staff.name) ? row.pbm_staff.name : '\\u2014';\r\n" +
  "    if (!map[id]) map[id] = { id: id, name: name, shifts: 0, details: [] };\r\n" +
  "    map[id].shifts++;\r\n" +
  "    var label = (row.sof_projects && row.sof_projects.label) ? row.sof_projects.label : '\\u2014';\r\n" +
  "    var kapal = label.split(' / ')[0];\r\n" +
  "    var d = row.shift_date ? row.shift_date.slice(8,10) + '/' + row.shift_date.slice(5,7) : '\\u2014';\r\n" +
  "    map[id].details.push({ date: d, shiftNum: row.shift_num || '\\u2014', kapal: kapal });\r\n" +
  "  });\r\n",
  "  var map = {};\r\n" +
  "  var seen = {};\r\n" +
  "  (res.data || []).forEach(function(row) {\r\n" +
  "    var id = row.pbm_staff_id;\r\n" +
  "    var key = id + '|' + row.shift_date + '|' + row.shift_num;\r\n" +
  "    if (seen[key]) return;\r\n" +
  "    seen[key] = true;\r\n" +
  "    var name = (row.pbm_staff && row.pbm_staff.name) ? row.pbm_staff.name : '\\u2014';\r\n" +
  "    if (!map[id]) map[id] = { id: id, name: name, shifts: 0, details: [] };\r\n" +
  "    map[id].shifts++;\r\n" +
  "    var label = (row.sof_projects && row.sof_projects.label) ? row.sof_projects.label : '\\u2014';\r\n" +
  "    var kapal = label.split(' / ')[0];\r\n" +
  "    var d = row.shift_date ? row.shift_date.slice(8,10) + '/' + row.shift_date.slice(5,7) : '\\u2014';\r\n" +
  "    map[id].details.push({ date: d, shiftNum: row.shift_num || '\\u2014', kapal: kapal });\r\n" +
  "  });\r\n",
  'dedupe _fetchPbmPeriod by (staff, date, shift)'
);

fs.writeFileSync(path, src);
console.log('Done.');
