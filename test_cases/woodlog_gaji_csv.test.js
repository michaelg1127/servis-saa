// Run: node test_cases/woodlog_gaji_csv.test.js
// Woodlog salary CSV: one row per operator with tonnage salary per batch, basic salary, kasbon, final.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('function buildWoodlogGajiRows'), b = html.indexOf('async function downloadWoodlogGajiCSV');
const ctx = { WL_BANGAU_OPS: ['Andi', 'Iman'], WL_STD_OPS: ['Erwin'] };
vm.createContext(ctx); vm.runInContext(html.slice(a, b), ctx);

const projects = [
  { id: 'p1', project_code: 'K10-01', nama_kapal: 'ALIKA 102', end_date: '2026-10-05' },
  { id: 'p2', project_code: 'K10-02', nama_kapal: 'AME 12', end_date: '2026-10-20' },
  { id: 'p3', project_code: 'K10-03', nama_kapal: 'NEXT MONTH', end_date: '2026-10-30' }, // retained, in neither batch
];
const salary = [
  { project_id: 'p1', operator_name: 'Andi', salary_amount: 1000000 },
  { project_id: 'p2', operator_name: 'Andi', salary_amount: 500000 },
  { project_id: 'p2', operator_name: 'Erwin', salary_amount: 760000 },
  { project_id: 'p3', operator_name: 'Erwin', salary_amount: 999999 },
  { project_id: 'p1', operator_name: 'Tamu', salary_amount: 200000 }, // not in the fixed lists
];
const rows = ctx.buildWoodlogGajiRows(salary, ['p1'], ['p2'], projects, { Andi: { amount: 250000 } });
const by = {}; rows.forEach(function (r) { by[r[0]] = r; });
let fails = 0;
function eq(name, got, want) { const ok = JSON.stringify(got) === JSON.stringify(want); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' got ' + JSON.stringify(got))); if (!ok) fails++; }
eq('Andi: 16 + 31 + pokok - kasbon', by.Andi.slice(1, 8), ['Bangau', 1000000, 500000, 1500000, 3100000, 250000, 4350000]);
eq('Andi detail lists both ships in date order', by.Andi[8], 'K10-01 ALIKA 102: 1.000.000; K10-02 AME 12: 500.000');
eq('Erwin: retained ship excluded', by.Erwin.slice(1, 8), ['Standard', 0, 760000, 760000, 3100000, 0, 3860000]);
eq('Iman: listed operator with no ship still gets basic salary', by.Iman.slice(1, 8), ['Bangau', 0, 0, 0, 3100000, 0, 3100000]);
eq('Tamu: unlisted operator with salary appears', by.Tamu.slice(1, 8), ['', 200000, 0, 200000, 3100000, 0, 3300000]);
eq('TOTAL row adds up', by.TOTAL.slice(2, 8), [1200000, 1260000, 2460000, 12400000, 250000, 14610000]);
process.exit(fails ? 1 : 0);
