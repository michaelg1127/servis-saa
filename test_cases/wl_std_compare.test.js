// Run: node test_cases/wl_std_compare.test.js
// Woodlog STD tonnage vs Woodlog Monitoring. Fixtures are the real ships checked on 2026-10-17.
// SAA BL is the source of truth; tonnage = SAA BL x 0.95 / total ritase x bon.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('const WL_BANGAU_OPS'), b = html.indexOf('function wlSafeId');
const ctx = {};
vm.createContext(ctx); vm.runInContext(html.slice(a, b) + ';this.WL_BANGAU_OPS=WL_BANGAU_OPS;', ctx);

let fails = 0;
function eq(name, got, want) { const ok = JSON.stringify(got) === JSON.stringify(want); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' got ' + JSON.stringify(got))); if (!ok) fails++; }
const std = function(o) { return Object.keys(o).map(function(k) { return { operator_name: k, tonnage_mt: o[k] }; }); };

// K09-06 as it was before the fix: Bangau rows only, Monitoring has 4 STD operators.
const k0906 = { blQuantity: 8450.27, totalRitase: 348, bonMuat: { Erwin: 50, Andre: 121, Rudianto: 54, Alif: 123 } };
eq('K09-06 before fix: STD missing', ctx.wlCompareStd(8450.27, k0906, []).status, 'std_missing');
eq('K09-06 after fix: same', ctx.wlCompareStd(8450.27, k0906, std({ Alif: 2837.40, Andre: 2791.26, Rudianto: 1245.69, Erwin: 1153.41 })).status, 'ok');
eq('Andre tonnage 121 bon', ctx.wlStdTonnage(8450.27, 348, 121), 2791.26);

// K08-01: Monitoring BL differs, SAA BL wins. SAA rows were typed with a rounded 25.1 MT/truck
// (exact 8695.2 x 0.95 / 329 = 25.108), so each operator is up to 0.66 MT off and must be flagged.
const k0801 = { blQuantity: 8851, totalRitase: 329, bonMuat: { Erwin: 81, Uncong: 82, Rudianto: 81, Valdo: 85 } };
const r0801 = ctx.wlCompareStd(8695.2, k0801, std({ Erwin: 2033.10, Rudianto: 2033.10, Uncong: 2058.20, Valdo: 2133.50 }));
eq('K08-01: rounded hand entry flagged', r0801.status, 'diff');
eq('K08-01: expected uses SAA BL', r0801.diffs.map(function(d) { return d.op + ':' + d.mon; }), ['Erwin:2033.73', 'Rudianto:2033.73', 'Uncong:2058.83', 'Valdo:2134.16']);
eq('K08-01: BL difference reported', r0801.blDiffers, true);
// Same ship, rows computed exactly from SAA BL -> same, even though Monitoring BL differs.
eq('K08-01 exact rows: same', ctx.wlCompareStd(8695.2, k0801, std({ Erwin: 2033.73, Rudianto: 2033.73, Uncong: 2058.83, Valdo: 2134.16 })).status, 'ok');

// K09-01: Andi (Bangau operator) ran 59 STD trucks; SAA has no STD row for him.
const k0901 = { blQuantity: 9117.83, totalRitase: 441, bonMuat: { Andre: 59, Erwin: 15, Uncong: 114, Alif: 70, Valdo: 124, Andi: 59 } };
const r0901 = ctx.wlCompareStd(9117.83, k0901, std({ Alif: 1587.27, Andre: 1158.85, Erwin: 340.13, Uncong: 2584.98, Valdo: 2811.73 }));
eq('K09-01: flagged', r0901.status, 'diff');
eq('K09-01: Andi missing 59 bon', r0901.diffs.filter(function(d) { return d.op === 'Andi'; }).map(function(d) { return [d.saa, d.mon, d.bon]; }), [[0, 1158.85, 59]]);
eq('K09-01: Andi is a known name', r0901.unknown, []);

// K10-01: SAA has Erwin + Rudianto, Monitoring has no bon for them on this ship.
const k1001 = { blQuantity: 9784.07, totalRitase: 386, bonMuat: { Andre: 95, Uncong: 97, Alif: 91, Valdo: 103 } };
const r1001 = ctx.wlCompareStd(9784.07, k1001, std({ Alif: 2191.28, Andre: 2287.6, Erwin: 1695.2, Rudianto: 2377.68, Uncong: 2335.76, Valdo: 2480.24 }));
eq('K10-01: only Erwin + Rudianto differ', r1001.diffs.map(function(d) { return d.op + ':' + d.mon; }), ['Erwin:0', 'Rudianto:0']);

// Unknown spelling (Monitoring "Rizki", SAA "Riski") is reported, not silently dropped.
eq('Rizki reported as unknown', ctx.wlCompareStd(10286.7, { blQuantity: 10286.7, totalRitase: 10, bonMuat: { Rizki: 5, Erwin: 5 } }, std({ Erwin: 4886.18 })).unknown, ['Rizki']);

// No trucks yet in Monitoring.
eq('No trucks -> no_trucks', ctx.wlCompareStd(5000, { blQuantity: 5000, totalRitase: 0, bonMuat: {} }, []).status, 'no_trucks');

console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exit(fails ? 1 : 0);
