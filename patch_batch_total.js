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

// PATCH 1: Batch 16 total — sum of all work pay (no gaji pokok)
const p1from = [
  "    h += '</tbody></table></div>';",
  "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'mid_month\\')\" class=\"btn-primary\" style=\"background:#1D4ED8;\">Tandai Lunas Batch 16</button></div>';"
].join(N);

const p1to = [
  "    h += '</tbody></table></div>';",
  "    var total16 = Object.values(opMap16).reduce(function(s, o) { return s + o.total; }, 0);",
  "    h += '<div style=\"display:flex;justify-content:flex-end;align-items:center;padding:10px 10px 6px;border-top:2px solid #BFDBFE;margin-top:6px;\"><span style=\"font-size:14px;font-weight:800;color:#1D4ED8;\">Total Transfer: ' + fmtRp(total16) + '</span></div>';",
  "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'mid_month\\')\" class=\"btn-primary\" style=\"background:#1D4ED8;\">Tandai Lunas Batch 16</button></div>';"
].join(N);

replaceExact(p1from, p1to, 'PATCH 1: Batch 16 total transfer amount');

// PATCH 2: Batch 31 total — sum of (gaji proyek + gaji pokok - kasbon) per operator
const p2from = [
  "    h += '</tbody></table></div>';",
  "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Lunas Batch 31</button></div>';"
].join(N);

const p2to = [
  "    h += '</tbody></table></div>';",
  "    var total31 = opNames.reduce(function(acc, name) { var s = opMap31[name] || { total: 0 }; var kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0; return acc + s.total + 3100000 - kasbon; }, 0);",
  "    h += '<div style=\"display:flex;justify-content:flex-end;align-items:center;padding:10px 10px 6px;border-top:2px solid #BBF7D0;margin-top:6px;\"><span style=\"font-size:14px;font-weight:800;color:#16A34A;\">Total Transfer: ' + fmtRp(total31) + '</span></div>';",
  "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Lunas Batch 31</button></div>';"
].join(N);

replaceExact(p2from, p2to, 'PATCH 2: Batch 31 total transfer amount');

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 2 patches applied');
