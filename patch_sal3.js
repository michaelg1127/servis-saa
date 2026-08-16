const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceExact(from, to, desc) {
  if (!html.includes(from)) { console.error('MISS: ' + desc); process.exit(1); }
  const count = html.split(from).length - 1;
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changed++;
  console.log('OK: ' + desc);
}

const CRLF = '\r\n';

// ── 1. Insert exportBatchExcel + wrappers before exportProyekExcel ──────────
const newFunctions =
`function exportBatch16() { exportBatchExcel('mid_month'); }
function exportBatch31() { exportBatchExcel('end_of_month'); }
async function exportBatchExcel(batchType) {
  if (typeof XLSX === 'undefined') { showToast('SheetJS tidak tersedia'); return; }
  const panel = document.getElementById('proyek-panel-ringkasan');
  const allProjects = panel._ringkasanProjects;
  const monthYear = panel._monthYear;
  const ids = batchType === 'mid_month' ? (panel._batch16Ids || []) : (panel._batch31Ids || []);
  if (!allProjects || ids.length === 0) { showToast('Tidak ada data untuk batch ini'); return; }
  const projects = allProjects.filter(function(p) { return ids.indexOf(p.id) >= 0; });
  projects.sort(function(a, b) { return (a.end_date || '').localeCompare(b.end_date || ''); });
  const fillMap = await fetchFillMap(projects.map(function(p) { return p.id; }));
  let kasbonMap = {};
  if (batchType === 'end_of_month') {
    const { data: kb } = await sb.from('proyek_kasbon').select('operator_name, amount').eq('month_year', monthYear);
    (kb || []).forEach(function(k) { kasbonMap[k.operator_name] = Number(k.amount); });
  }
  const { data: unitsBank } = await sb.from('units').select('code, operator_name, bank_name, bank_account_number');
  const bankMap = {};
  (unitsBank || []).forEach(function(u) { bankMap[u.code] = u; });
  const wb = XLSX.utils.book_new();
  // Build REKAP rows and index data for per-unit sheets and TRANSFER
  const rekapRows = [['Kode','Tanggal','Nama Kapal / Proyek','Kade','Alat','HM Mulai','HM Akhir','Total Jam','BL (Rp)','Persentase','Premi','TOTAL']];
  const unitSheetData = {};
  const opTotals = {};
  projects.forEach(function(p) {
    const isStk = p.type === 'stockpile';
    const pUnits = p.project_units || [];
    let projSubtotal = 0;
    if (!isStk) {
      const rate = calcKapalRate(p.ship_number_in_month || 1);
      const split = calcKapalTonnageSplit(pUnits, p.total_mt_m3 || 0);
      const blTotal = Math.round((p.total_mt_m3 || 0) * (p.unit_price || 0));
      split.forEach(function(u) {
        const hmK = u.hm_akhir != null ? +(u.hm_akhir - u.hm_awal).toFixed(1) : 0;
        const pct = p.total_mt_m3 > 0 ? (u.allocatedMt / p.total_mt_m3 * 100).toFixed(2) + '%' : '---';
        const total = Math.round(u.allocatedMt * rate);
        const unitCode = u.units ? u.units.code : '?';
        const opName = u.units ? (u.units.operator_name || unitCode) : unitCode;
        const row = [p.project_code, p.end_date, p.nama_kapal || '', p.kade || '', unitCode, u.hm_awal, u.hm_akhir, hmK, blTotal, pct, rate, total];
        rekapRows.push(row);
        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = [];
        unitSheetData[unitCode].push(row);
        if (!opTotals[opName]) opTotals[opName] = { total: 0, unitCode: unitCode };
        opTotals[opName].total += total;
        projSubtotal += total;
      });
    } else {
      pUnits.forEach(function(u) {
        const hmK = u.hm_akhir != null ? +(u.hm_akhir - u.hm_awal).toFixed(1) : 0;
        const total = Math.round(hmK * 35000);
        const unitCode = u.units ? u.units.code : '?';
        const opName = u.units ? (u.units.operator_name || unitCode) : unitCode;
        const blStk = total;
        const row = [p.project_code, p.end_date, p.project_code, '---', unitCode, u.hm_awal, u.hm_akhir, hmK, blStk, 'STK', 35000, total];
        rekapRows.push(row);
        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = [];
        unitSheetData[unitCode].push(row);
        if (!opTotals[opName]) opTotals[opName] = { total: 0, unitCode: unitCode };
        opTotals[opName].total += total;
        projSubtotal += total;
      });
    }
    rekapRows.push(['', '', '', '', '', '', 'SUBTOTAL', '', '', '', '', projSubtotal]);
  });
  const grandKerja = Object.values(opTotals).reduce(function(s, o) { return s + o.total; }, 0);
  rekapRows.push(['', '', '', '', '', '', 'GRAND TOTAL', '', '', '', '', grandKerja]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rekapRows), 'REKAP');
  // Per-unit sheets
  Object.keys(unitSheetData).sort().forEach(function(code) {
    const rows = [['Kode','Tanggal','Nama Kapal / Proyek','Kade','Alat','HM Mulai','HM Akhir','Total Jam','BL (Rp)','Persentase','Premi','TOTAL']];
    let unitTotal = 0;
    unitSheetData[code].forEach(function(r) { rows.push(r); unitTotal += (typeof r[11] === 'number' ? r[11] : 0); });
    rows.push(['', '', '', '', '', '', 'TOTAL', '', '', '', '', unitTotal]);
    const safeName = code.replace(/[:\\\/?*[\]]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), safeName);
  });
  // TRANSFER sheet
  const gajiPokok = batchType === 'end_of_month' ? 3100000 : 0;
  const transferRows = [['No','Nama OP','Unit','Total Kerja','Gaji Pokok','Grand Total','Bank','No. Rekening']];
  let no = 1;
  let transferGrand = 0;
  Object.keys(opTotals).sort().forEach(function(name) {
    const s = opTotals[name];
    const kasbon = kasbonMap[name] || 0;
    const grand = s.total + gajiPokok - kasbon;
    const bInfo = bankMap[s.unitCode] || {};
    transferRows.push([no++, name, s.unitCode, s.total, gajiPokok, grand, bInfo.bank_name || '---', bInfo.bank_account_number || '---']);
    transferGrand += grand;
  });
  transferRows.push(['', 'TOTAL', '', '', '', transferGrand, '', '']);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transferRows), 'TRANSFER');
  const label = batchType === 'mid_month' ? 'Batch16' : 'Batch31';
  XLSX.writeFile(wb, label + '_' + monthYear.replace('-', '') + '.xlsx');
  showToast('Export ' + label + ' berhasil!', 'success');
}
`;

replaceExact(
  'async function exportProyekExcel() {',
  newFunctions + 'async function exportProyekExcel() {',
  'insert exportBatchExcel + wrappers'
);

// ── 2. Add ↓ Excel Batch 16 button in Batch 16 card header ──────────────────
// From line 5859 (single-line, no CRLF needed)
replaceExact(
  'h += \'<div style="font-size:14px;font-weight:800;color:#1D4ED8;margin-bottom:12px;">Batch 16 - Kapal Selesai Tgl 1-15</div>\';',
  'h += \'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-size:14px;font-weight:800;color:#1D4ED8;">Batch 16 - Kapal Selesai Tgl 1-15</div><button onclick="exportBatch16()" style="background:#1D4ED8;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">&#8595; Excel Batch 16</button></div>\';',
  'add Excel Batch 16 button'
);

// ── 3. Add ↓ Excel Batch 31 button in Batch 31 card header ──────────────────
// From line 5875 (single-line, no CRLF needed)
replaceExact(
  'h += \'<div style="font-size:14px;font-weight:800;color:#16A34A;margin-bottom:12px;">Batch 31 - Kapal Tgl 16-31 + Semua Stockpile + Gaji Pokok</div>\';',
  'h += \'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-size:14px;font-weight:800;color:#16A34A;">Batch 31 - Kapal Tgl 16-31 + Semua Stockpile + Gaji Pokok</div><button onclick="exportBatch31()" style="background:#16A34A;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">&#8595; Excel Batch 31</button></div>\';',
  'add Excel Batch 31 button'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
