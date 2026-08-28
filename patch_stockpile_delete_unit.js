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

// PATCH 1: Add container id + delete button to each existing unit row in openEditStockpileModal (stockpile)
// Use stk-eu-sakhir to disambiguate from the kapal edit modal which has similar structure
const p1from = [
  "    unitRowsHTML += '<div style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;\">';",
  "    unitRowsHTML += '<div style=\"font-size:12px;font-weight:700;color:#1E293B;margin-bottom:8px;\">' + unitCode + '</div>';",
  "    unitRowsHTML += '<div style=\"display:grid;grid-template-columns:80px 80px 60px 60px 80px;gap:8px;\">';",
  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"stk-eu-hmawal-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.hm_awal + '\"></div>';"
].join(N);

const p1to = [
  "    unitRowsHTML += '<div id=\"stk-eu-container-' + i + '\" style=\"position:relative;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;\">';",
  "    unitRowsHTML += '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;\"><span style=\"font-size:12px;font-weight:700;color:#1E293B;\">' + unitCode + '</span><button type=\"button\" onclick=\"markStkUnitDeleted(' + i + ')\" style=\"font-size:11px;color:#EF4444;background:none;border:none;cursor:pointer;padding:2px 6px;\">&#10005; Hapus</button></div>';",
  "    unitRowsHTML += '<div style=\"display:grid;grid-template-columns:80px 80px 60px 60px 80px;gap:8px;\">';",
  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"stk-eu-hmawal-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + u.hm_awal + '\"></div>';"
].join(N);

replaceExact(p1from, p1to, 'PATCH 1: add container id + delete button to existing unit rows in stockpile edit modal');

// PATCH 2: Add markStkUnitDeleted function after removeStockpileNewUnitRow
const p2from = "function removeStockpileNewUnitRow(idx) { var el = document.getElementById('stk-en-row-' + idx); if (el) el.remove(); }";
const p2to = [
  "function removeStockpileNewUnitRow(idx) { var el = document.getElementById('stk-en-row-' + idx); if (el) el.remove(); }",
  "function markStkUnitDeleted(i) {",
  "  var el = document.getElementById('stk-eu-container-' + i);",
  "  if (!el || el.dataset.deleted === 'true') return;",
  "  el.dataset.deleted = 'true';",
  "  el.style.opacity = '0.4';",
  "  el.style.pointerEvents = 'none';",
  "  var overlay = document.createElement('div');",
  "  overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#EF4444;border-radius:10px;';",
  "  overlay.textContent = 'Akan Dihapus';",
  "  el.appendChild(overlay);",
  "}"
].join(N);

replaceExact(p2from, p2to, 'PATCH 2: add markStkUnitDeleted function');

// PATCH 3: Skip deleted containers in submitEditStockpile loop
const p3from = "    const hmAwal = parseFloat(document.getElementById('stk-eu-hmawal-' + i)?.value);";
const p3to = [
  "    const container = document.getElementById('stk-eu-container-' + i);",
  "    if (container && container.dataset.deleted === 'true') continue;",
  "    const hmAwal = parseFloat(document.getElementById('stk-eu-hmawal-' + i)?.value);"
].join(N);

replaceExact(p3from, p3to, 'PATCH 3: skip deleted containers in submitEditStockpile');

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 3 patches applied');
