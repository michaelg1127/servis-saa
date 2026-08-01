const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// ── RINGKASAN ─────────────────────────────────────────────────────────────────

// T11-1: operatorMap — add unitCode, stockpileHM, details array
replaceExact(
  "    if (p.type === 'kapal') {" + R +
  "      const rate = calcKapalRate(p.ship_number_in_month || 1);" + R +
  "      const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);" + R +
  "      split.forEach(u => {" + R +
  "        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0 };" + R +
  "        operatorMap[key].kapal += u.allocatedMt * rate;" + R +
  "      });" + R +
  "    } else {" + R +
  "      units.forEach(u => {" + R +
  "        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0 };" + R +
  "        operatorMap[key].stockpile += (u.hm_akhir != null ? (u.hm_akhir - u.hm_awal) * 35000 : 0);" + R +
  "      });" + R +
  "    }",

  "    if (p.type === 'kapal') {" + R +
  "      const rate = calcKapalRate(p.ship_number_in_month || 1);" + R +
  "      const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);" + R +
  "      split.forEach(u => {" + R +
  "        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0, stockpileHM: 0, unitCode: u.units ? u.units.code : '', details: [] };" + R +
  "        const kamt = u.allocatedMt * rate;" + R +
  "        operatorMap[key].kapal += kamt;" + R +
  "        operatorMap[key].details.push({ code: p.project_code, type: 'Kapal', amount: kamt });" + R +
  "      });" + R +
  "    } else {" + R +
  "      units.forEach(u => {" + R +
  "        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0, stockpileHM: 0, unitCode: u.units ? u.units.code : '', details: [] };" + R +
  "        const sHM = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0;" + R +
  "        const samt = sHM * 35000;" + R +
  "        operatorMap[key].stockpile += samt;" + R +
  "        operatorMap[key].stockpileHM += sHM;" + R +
  "        operatorMap[key].details.push({ code: p.project_code, type: 'STK', amount: samt, hm: sHM });" + R +
  "      });" + R +
  "    }",

  'T11-1: renderProyekRingkasan: add unitCode, stockpileHM, details'
);

// T11-2: table header — add HM Stockpile column, rename to Unit / Operator
replaceExact(
  "  h += '<thead><tr style=\"background:#F1F5F9;\"><th style=\"padding:10px 12px;text-align:left;font-weight:700;color:#475569;\">Operator/Unit</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Kapal</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Stockpile</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Total Kerja</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Pokok</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Grand Total</th></tr></thead><tbody>';",
  "  h += '<thead><tr style=\"background:#F1F5F9;\"><th style=\"padding:10px 12px;text-align:left;font-weight:700;color:#475569;\">Unit / Operator</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Kapal</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Stockpile</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">HM Stockpile</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Total Kerja</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Pokok</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Grand Total</th></tr></thead><tbody>';",
  'T11-2: renderProyekRingkasan: add HM Stockpile column header'
);

// T11-3: row rendering — unit/operator label, HM Stockpile cell, breakdown sub-rows
replaceExact(
  "  let grandK = 0, grandS = 0;" + R +
  "  Object.entries(operatorMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name, sal]) => {" + R +
  "    const totalKerja = sal.kapal + sal.stockpile;" + R +
  "    const grandTotal = totalKerja + 3100000;" + R +
  "    grandK += sal.kapal; grandS += sal.stockpile;" + R +
  "    h += '<tr style=\"border-bottom:1px solid #F1F5F9;\">';" + R +
  "    h += '<td style=\"padding:10px 12px;font-weight:600;\">' + name + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(sal.kapal) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(sal.stockpile) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;font-weight:700;\">' + fmtRp(totalKerja) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;color:#64748B;\">Rp 3.100.000</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grandTotal + 3100000 - 3100000) + '</td></tr>';" + R +
  "  });",

  "  let grandK = 0, grandS = 0, grandSTKHM = 0;" + R +
  "  Object.entries(operatorMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name, sal]) => {" + R +
  "    const totalKerja = sal.kapal + sal.stockpile;" + R +
  "    const grandTotal = totalKerja + 3100000;" + R +
  "    grandK += sal.kapal; grandS += sal.stockpile; grandSTKHM += sal.stockpileHM;" + R +
  "    const unitLabel = sal.unitCode ? sal.unitCode + ' / ' + name : name;" + R +
  "    h += '<tr style=\"border-bottom:1px solid #F1F5F9;\">';" + R +
  "    h += '<td style=\"padding:10px 12px;font-weight:600;\">' + unitLabel + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(sal.kapal) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(sal.stockpile) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + (sal.stockpileHM > 0 ? sal.stockpileHM.toFixed(1) + ' HM' : '-') + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;font-weight:700;\">' + fmtRp(totalKerja) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;color:#64748B;\">Rp 3.100.000</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grandTotal) + '</td></tr>';" + R +
  "    if (sal.details.length > 0) {" + R +
  "      const detailText = sal.details.map(function(d) { return d.code + ' (' + d.type + (d.hm != null ? ' ' + d.hm.toFixed(1) + 'HM' : '') + '): ' + fmtRp(d.amount); }).join(' | ');" + R +
  "      h += '<tr style=\"background:#F8FAFC;\"><td colspan=\"7\" style=\"padding:3px 12px 6px 20px;font-size:11px;color:#64748B;\">' + detailText + '</td></tr>';" + R +
  "    }" + R +
  "  });",

  'T11-3: renderProyekRingkasan: unit/operator label, HM Stockpile col, breakdown sub-rows'
);

// T11-4: total row — insert HM Stockpile total cell
replaceExact(
  "  const allTotal = grandK + grandS;" + R +
  "  h += '<tr style=\"background:#F1F5F9;font-weight:800;\"><td style=\"padding:10px 12px;\">TOTAL</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(grandK) + '</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(grandS) + '</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(allTotal) + '</td><td style=\"padding:10px 12px;\"></td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(allTotal + 3100000 * Object.keys(operatorMap).length) + '</td></tr>';",

  "  const allTotal = grandK + grandS;" + R +
  "  h += '<tr style=\"background:#F1F5F9;font-weight:800;\"><td style=\"padding:10px 12px;\">TOTAL</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(grandK) + '</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(grandS) + '</td><td style=\"padding:10px 12px;text-align:right;\">' + grandSTKHM.toFixed(1) + ' HM</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(allTotal) + '</td><td style=\"padding:10px 12px;\"></td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(allTotal + 3100000 * Object.keys(operatorMap).length) + '</td></tr>';",

  'T11-4: renderProyekRingkasan: add HM Stockpile to total row'
);

// ── ANALISIS BIAYA ────────────────────────────────────────────────────────────

// T11-5: labor cost = operator pay + 5% of income (basic salary allocation)
replaceExact(
  "    const laborCost = split.reduce((s, u) => s + u.allocatedMt * rate, 0);" + R +
  "    const profit = income - fuelCost - laborCost;",

  "    const operatorPay = split.reduce((s, u) => s + u.allocatedMt * rate, 0);" + R +
  "    const basicSalaryAlloc = Math.round(income * 0.05);" + R +
  "    const laborCost = operatorPay + basicSalaryAlloc;" + R +
  "    const profit = income - fuelCost - laborCost;",

  'T11-5: renderProyekAnalisis: labor cost includes 5% of income for basic salary'
);

// T11-6: Biaya Tenaga cell — show operator pay + 5% breakdown note
replaceExact(
  "    h += '<td style=\"padding:8px 10px;text-align:right;color:#F59E0B;\">' + fmtRp(laborCost) + '</td>';",
  "    h += '<td style=\"padding:8px 10px;text-align:right;color:#F59E0B;\">' + fmtRp(laborCost) + '<br><span style=\"font-size:10px;color:#94A3B8;\">' + fmtRp(operatorPay) + '+5%</span></td>';",
  'T11-6: renderProyekAnalisis: Biaya Tenaga cell shows operator pay + 5% note'
);

// ── EXCEL EXPORT ──────────────────────────────────────────────────────────────

// T11-7: exportProyekExcel Sheet 3 — add Unit and HM Stockpile columns
replaceExact(
  "  const salRows = [['Operator/Unit','Gaji Kapal','Gaji Stockpile','Total Kerja','Gaji Pokok','Grand Total']];" + R +
  "  const opMap = {};" + R +
  "  projects.forEach(p => {" + R +
  "    const units = p.project_units || [];" + R +
  "    if (p.type === 'kapal') {" + R +
  "      const rate = calcKapalRate(p.ship_number_in_month || 1);" + R +
  "      calcKapalTonnageSplit(units, p.total_mt_m3||0).forEach(u => {" + R +
  "        const k = u.units?(u.units.operator_name||u.units.code):u.unit_id;" + R +
  "        if (!opMap[k]) opMap[k] = { k:0, s:0 };" + R +
  "        opMap[k].k += u.allocatedMt * rate;" + R +
  "      });" + R +
  "    } else {" + R +
  "      units.forEach(u => {" + R +
  "        const k = u.units?(u.units.operator_name||u.units.code):u.unit_id;" + R +
  "        if (!opMap[k]) opMap[k] = { k:0, s:0 };" + R +
  "        opMap[k].s += (u.hm_akhir - u.hm_awal) * 35000;" + R +
  "      });" + R +
  "    }" + R +
  "  });" + R +
  "  Object.entries(opMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name,sal]) => {" + R +
  "    const totalKerja = sal.k + sal.s;" + R +
  "    salRows.push([name, Math.round(sal.k), Math.round(sal.s), Math.round(totalKerja), 3100000, Math.round(totalKerja + 3100000)]);" + R +
  "  });",

  "  const salRows = [['Unit','Operator','Gaji Kapal','Gaji Stockpile','HM Stockpile','Total Kerja','Gaji Pokok','Grand Total']];" + R +
  "  const opMap = {};" + R +
  "  projects.forEach(p => {" + R +
  "    const units = p.project_units || [];" + R +
  "    if (p.type === 'kapal') {" + R +
  "      const rate = calcKapalRate(p.ship_number_in_month || 1);" + R +
  "      calcKapalTonnageSplit(units, p.total_mt_m3||0).forEach(u => {" + R +
  "        const k = u.units?(u.units.operator_name||u.units.code):u.unit_id;" + R +
  "        if (!opMap[k]) opMap[k] = { k:0, s:0, sHM:0, unitCode: u.units?u.units.code:'' };" + R +
  "        opMap[k].k += u.allocatedMt * rate;" + R +
  "      });" + R +
  "    } else {" + R +
  "      units.forEach(u => {" + R +
  "        const k = u.units?(u.units.operator_name||u.units.code):u.unit_id;" + R +
  "        if (!opMap[k]) opMap[k] = { k:0, s:0, sHM:0, unitCode: u.units?u.units.code:'' };" + R +
  "        const hm = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0;" + R +
  "        opMap[k].s += hm * 35000;" + R +
  "        opMap[k].sHM += hm;" + R +
  "      });" + R +
  "    }" + R +
  "  });" + R +
  "  Object.entries(opMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name,sal]) => {" + R +
  "    const totalKerja = sal.k + sal.s;" + R +
  "    salRows.push([sal.unitCode||'', name, Math.round(sal.k), Math.round(sal.s), +sal.sHM.toFixed(1), Math.round(totalKerja), 3100000, Math.round(totalKerja + 3100000)]);" + R +
  "  });",

  'T11-7: exportProyekExcel Sheet 3: add Unit and HM Stockpile columns'
);

// ── BUTTON SIZE FIXES ─────────────────────────────────────────────────────────

// T11-8: Tambah Kapal button — constrain width
replaceExact(
  "<button onclick=\"openAddKapalModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;\">+ Tambah Kapal</button>",
  "<button onclick=\"openAddKapalModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;width:auto;\">+ Tambah Kapal</button>",
  'T11-8: Tambah Kapal button: add width:auto'
);

// T11-9: Tambah Stockpile button — constrain width
replaceExact(
  "<button onclick=\"openAddStockpileModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;\">+ Tambah Stockpile</button>",
  "<button onclick=\"openAddStockpileModal()\" class=\"btn-primary\" style=\"padding:8px 16px;font-size:13px;width:auto;\">+ Tambah Stockpile</button>",
  'T11-9: Tambah Stockpile button: add width:auto'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T11 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
