// patch_nse_spans_fix1.js
// Fix: Add await _nseDeriveChain() to exportBatchExcel and exportProyekExcel
// Run: node patch_nse_spans_fix1.js

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

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 1: Add await _nseDeriveChain() at start of exportBatchExcel
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "async function exportBatchExcel(batchType) {" + N +
  "  if (typeof XLSX === 'undefined') { showToast('SheetJS tidak tersedia'); return; }",
  "async function exportBatchExcel(batchType) {" + N +
  "  await _nseDeriveChain();" + N +
  "  if (typeof XLSX === 'undefined') { showToast('SheetJS tidak tersedia'); return; }",
  'PATCH 1: add await _nseDeriveChain() in exportBatchExcel'
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH 2: Add await _nseDeriveChain() at start of exportProyekExcel
// ─────────────────────────────────────────────────────────────────────────────
replaceExact(
  "async function exportProyekExcel() {" + N +
  "  if (typeof XLSX === 'undefined') { showToast('SheetJS tidak tersedia'); return; }",
  "async function exportProyekExcel() {" + N +
  "  await _nseDeriveChain();" + N +
  "  if (typeof XLSX === 'undefined') { showToast('SheetJS tidak tersedia'); return; }",
  'PATCH 2: add await _nseDeriveChain() in exportProyekExcel'
);

if (fails > 0) {
  console.error('\nFAILED: ' + fails + ' patch(es)');
  process.exit(1);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log('\nDONE: index.html written (' + src.length + ' bytes)');
