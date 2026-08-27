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

replaceExact(
  `  function _xnf(ws, r, c) { var ref = XLSX.utils.encode_cell({ r: r, c: c }); if (ws[ref] && ws[ref].t === 'n') ws[ref].s = Object.assign({}, ws[ref].s || {}, { numFmt: '#,##0.00' }); }`,
  `  function _xnf(ws, r, c) { var ref = XLSX.utils.encode_cell({ r: r, c: c }); if (ws[ref] && ws[ref].t === 'n') ws[ref].z = '#,##0'; }`,
  'FIX: exportBatchExcel _xnf use cell.z'
);

replaceExact(
  [
    `  var _xnfAmt = function(ws, ri, ci) {`,
    `    var ref = XLSX.utils.encode_cell({ r: ri, c: ci });`,
    `    if (ws[ref] && ws[ref].t === 'n') ws[ref].s = Object.assign({}, ws[ref].s || {}, { numFmt: '#,##0' });`,
    `  };`
  ].join(N),
  [
    `  var _xnfAmt = function(ws, ri, ci) {`,
    `    var ref = XLSX.utils.encode_cell({ r: ri, c: ci });`,
    `    if (ws[ref] && ws[ref].t === 'n') ws[ref].z = '#,##0';`,
    `  };`
  ].join(N),
  'FIX: exportBatchExcel _xnfAmt use cell.z'
);

replaceExact(
  `      if (ci >= 3 && ci <= 7 && wsTransfer[ref].t === 'n') wsTransfer[ref].s.numFmt = '#,##0.00';`,
  `      if (ci >= 3 && ci <= 7 && wsTransfer[ref].t === 'n') wsTransfer[ref].z = '#,##0';`,
  'FIX: TRANSFER sheet use cell.z'
);

replaceExact(
  `  var _nf31 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n') ws[ref].s=Object.assign({},ws[ref].s||{},{numFmt:'#,##0'}); };`,
  `  var _nf31 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n') ws[ref].z='#,##0'; };`,
  'FIX: WL Batch31 _nf31 use cell.z'
);

replaceExact(
  `  var _nf16 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n') ws[ref].s=Object.assign({},ws[ref].s||{},{numFmt:'#,##0'}); };`,
  `  var _nf16 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n') ws[ref].z='#,##0'; };`,
  'FIX: WL Batch16 _nf16 use cell.z'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 5 cell.z fixes applied');
