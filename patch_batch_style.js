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

// PATCH B31: Add styling + cellStyles to Batch31 export
replaceExact(
  [
    `  const wb = XLSX.utils.book_new();`,
    `  const ws = XLSX.utils.aoa_to_sheet(rows);`,
    `  XLSX.utils.book_append_sheet(wb, ws, 'Batch 31');`,
    `  XLSX.writeFile(wb, 'WL_Batch31_' + monthYear + '.xlsx');`
  ].join(N),
  [
    `  const wb = XLSX.utils.book_new();`,
    `  const ws = XLSX.utils.aoa_to_sheet(rows);`,
    `  var _bx31 = { top:{style:'thin',color:{rgb:'DDDDDD'}}, bottom:{style:'thin',color:{rgb:'DDDDDD'}}, left:{style:'thin',color:{rgb:'DDDDDD'}}, right:{style:'thin',color:{rgb:'DDDDDD'}} };`,
    `  var _hdr31 = { font:{bold:true}, fill:{fgColor:{rgb:'DBEAFE'},patternType:'solid'}, border:_bx31 };`,
    `  var _tot31 = { font:{bold:true}, fill:{fgColor:{rgb:'DCFCE7'},patternType:'solid'}, border:_bx31 };`,
    `  var _cs31 = function(r,c,s){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(!ws[ref]) ws[ref]={t:'s',v:''}; ws[ref].s=s; };`,
    `  var _nf31 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n') ws[ref].s=Object.assign({},ws[ref].s||{},{numFmt:'#,##0'}); };`,
    `  for(var _ci=0;_ci<6;_ci++) _cs31(2,_ci,_hdr31);`,
    `  rows.forEach(function(row,ri){ if(ri<3||!row||!row.length) return; if(row[1]==='GRAND TOTAL'){ for(var _ci=0;_ci<6;_ci++) _cs31(ri,_ci,_tot31); _nf31(ri,2); _nf31(ri,3); _nf31(ri,5); } else { _nf31(ri,2); _nf31(ri,3); _nf31(ri,4); _nf31(ri,5); } });`,
    `  ws['!cols']=[{wch:18},{wch:40},{wch:16},{wch:14},{wch:14},{wch:16}];`,
    `  XLSX.utils.book_append_sheet(wb, ws, 'Batch 31');`,
    `  XLSX.writeFile(wb, 'WL_Batch31_' + monthYear + '.xlsx', { cellStyles: true });`
  ].join(N),
  'PATCH B31: Add styling + cellStyles to Batch31 export'
);

// PATCH B16: Add styling + cellStyles to Batch16 export
replaceExact(
  [
    `  const wb = XLSX.utils.book_new();`,
    `  const ws = XLSX.utils.aoa_to_sheet(rows);`,
    `  XLSX.utils.book_append_sheet(wb, ws, 'Batch 16');`,
    `  XLSX.writeFile(wb, 'WL_Batch16_' + monthYear + '.xlsx');`
  ].join(N),
  [
    `  const wb = XLSX.utils.book_new();`,
    `  const ws = XLSX.utils.aoa_to_sheet(rows);`,
    `  var _bx16 = { top:{style:'thin',color:{rgb:'DDDDDD'}}, bottom:{style:'thin',color:{rgb:'DDDDDD'}}, left:{style:'thin',color:{rgb:'DDDDDD'}}, right:{style:'thin',color:{rgb:'DDDDDD'}} };`,
    `  var _hdr16 = { font:{bold:true}, fill:{fgColor:{rgb:'DBEAFE'},patternType:'solid'}, border:_bx16 };`,
    `  var _tot16 = { font:{bold:true}, fill:{fgColor:{rgb:'DCFCE7'},patternType:'solid'}, border:_bx16 };`,
    `  var _cs16 = function(r,c,s){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(!ws[ref]) ws[ref]={t:'s',v:''}; ws[ref].s=s; };`,
    `  var _nf16 = function(r,c){ var ref=XLSX.utils.encode_cell({r:r,c:c}); if(ws[ref]&&ws[ref].t==='n') ws[ref].s=Object.assign({},ws[ref].s||{},{numFmt:'#,##0'}); };`,
    `  for(var _ci=0;_ci<3;_ci++) _cs16(2,_ci,_hdr16);`,
    `  rows.forEach(function(row,ri){ if(ri<3||!row||!row.length) return; if(row[1]==='GRAND TOTAL'){ for(var _ci=0;_ci<3;_ci++) _cs16(ri,_ci,_tot16); _nf16(ri,2); } else { _nf16(ri,2); } });`,
    `  ws['!cols']=[{wch:18},{wch:40},{wch:16}];`,
    `  XLSX.utils.book_append_sheet(wb, ws, 'Batch 16');`,
    `  XLSX.writeFile(wb, 'WL_Batch16_' + monthYear + '.xlsx', { cellStyles: true });`
  ].join(N),
  'PATCH B16: Add styling + cellStyles to Batch16 export'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 2 patches applied');
