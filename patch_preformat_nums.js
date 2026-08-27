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

// _xnf: convert number cell to pre-formatted string
replaceExact(
  `  function _xnf(ws, r, c) { var ref = XLSX.utils.encode_cell({ r: r, c: c }); if (ws[ref] && ws[ref].t === 'n') ws[ref].z = '#,##0'; }`,
  `  function _xnf(ws, r, c) { var ref = XLSX.utils.encode_cell({ r: r, c: c }); if (ws[ref] && ws[ref].t === 'n') { var _v = ws[ref].v; ws[ref].t = 's'; ws[ref].v = Math.round(_v).toLocaleString('id'); delete ws[ref].w; } }`,
  'FIX: _xnf convert to formatted string'
);

// _xnfAmt: convert number cell to pre-formatted string
replaceExact(
  [
    `  var _xnfAmt = function(ws, ri, ci) {`,
    `    var ref = XLSX.utils.encode_cell({ r: ri, c: ci });`,
    `    if (ws[ref] && ws[ref].t === 'n') ws[ref].z = '#,##0';`,
    `  };`
  ].join(N),
  [
    `  var _xnfAmt = function(ws, ri, ci) {`,
    `    var ref = XLSX.utils.encode_cell({ r: ri, c: ci });`,
    `    if (ws[ref] && ws[ref].t === 'n') { var _v = ws[ref].v; ws[ref].t = 's'; ws[ref].v = Math.round(_v).toLocaleString('id'); delete ws[ref].w; }`,
    `  };`
  ].join(N),
  'FIX: _xnfAmt convert to formatted string'
);

// TRANSFER inline numFmt: convert to formatted string
replaceExact(
  `      if (ci >= 3 && ci <= 7 && wsTransfer[ref].t === 'n') wsTransfer[ref].z = '#,##0';`,
  `      if (ci >= 3 && ci <= 7 && wsTransfer[ref].t === 'n') { var _tv = wsTransfer[ref].v; wsTransfer[ref].t = 's'; wsTransfer[ref].v = Math.round(_tv).toLocaleString('id'); delete wsTransfer[ref].w; }`,
  'FIX: TRANSFER inline convert to formatted string'
);

// WL Batch31 _nf31
replaceExact(
  `  var _nf31 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n') ws[ref].z='#,##0'; };`,
  `  var _nf31 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n'){ var _v=ws[ref].v; ws[ref].t='s'; ws[ref].v=Math.round(_v).toLocaleString('id'); delete ws[ref].w; } };`,
  'FIX: WL Batch31 _nf31 convert to formatted string'
);

// WL Batch16 _nf16
replaceExact(
  `  var _nf16 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n') ws[ref].z='#,##0'; };`,
  `  var _nf16 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n'){ var _v=ws[ref].v; ws[ref].t='s'; ws[ref].v=Math.round(_v).toLocaleString('id'); delete ws[ref].w; } };`,
  'FIX: WL Batch16 _nf16 convert to formatted string'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 5 fixes applied');
