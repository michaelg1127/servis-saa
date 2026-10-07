// Run: node test_cases/project_units_double_submit.test.js
// Regression: double-clicking "Simpan Perubahan" on the kapal / stockpile edit modal ran two
// delete-then-insert saves at once and left every unit twice in project_units.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function slice(fromMarker, toMarker) {
  const a = html.indexOf(fromMarker), b = html.indexOf(toMarker, a);
  if (a < 0 || b < 0) throw new Error('marker not found: ' + fromMarker + ' .. ' + toMarker);
  return html.slice(a, b);
}
const code = [
  slice('var _editKapalSaving', 'function _nsePreviewUpdate'),
  slice('var _editStockpileSaving', 'async function submitAddNSE'),
].join('\n');

function run(fnName, fields, project) {
  const table = project.project_units.map(function (u, i) { return Object.assign({ id: 'old' + i, project_id: project.id }, u); });
  const tick = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const sb = {
    from: function (t) {
      return {
        update: function () { return { eq: async function () { await tick(5); return { error: null }; } }; },
        delete: function () { return { eq: async function (col, id) {
          await tick(5);
          if (t === 'project_units') for (let i = table.length - 1; i >= 0; i--) if (table[i].project_id === id) table.splice(i, 1);
          return { error: null };
        } }; },
        insert: async function (rows) { await tick(5); rows.forEach(function (r) { table.push(r); }); return { error: null }; },
      };
    },
  };
  const ctx = {
    sb, console, setTimeout,
    document: { getElementById: function (id) { return Object.prototype.hasOwnProperty.call(fields, id) ? fields[id] : null; } },
    proyekKapalData: [project], proyekStockpileData: [project],
    showToast: function () {}, closeModal: function () {}, loadProyekKapal: function () {}, loadProyekStockpile: function () {},
    checkProjectHMOverlap: async function () { return null; },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  // two clicks in the same tick, like a double-click on the button
  return Promise.all([ctx[fnName](project.id), ctx[fnName](project.id)]).then(function () { return table; });
}

const v = function (x) { return { value: String(x), dataset: {} }; };
const project = { id: 'p1', project_units: [
  { unit_id: 'u-r', hm_awal: 16745.1, hm_akhir: 16769.2 },
  { unit_id: 'u-b3', hm_awal: 12543.8, hm_akhir: 12561 },
  { unit_id: 'u-a5', hm_awal: 15027.7, hm_akhir: 15050.3 },
] };
function unitFields(prefix) {
  const f = {};
  project.project_units.forEach(function (u, i) {
    f[prefix + 'row-' + i] = v('');
    f[prefix + 'hmawal-' + i] = v(u.hm_awal);
    f[prefix + 'hmakhir-' + i] = v(u.hm_akhir);
    f[prefix + 'sawal-' + i] = v(50);
    f[prefix + 'sakhir-' + i] = v(40);
  });
  return f;
}

(async function () {
  let fails = 0;
  const cases = [
    ['submitEditKapal', Object.assign({ 'kapal-e-mt': v(1000), 'kapal-e-start': v('2026-10-03'), 'kapal-e-end': v('2026-10-04'), 'kapal-e-unitcount': v(3) }, unitFields('kapal-eu-'))],
    ['submitEditStockpile', Object.assign({ 'stk-e-start': v('2026-10-03'), 'stk-e-end': v('2026-10-04'), 'stk-e-unitcount': v(3) }, unitFields('stk-eu-'))],
  ];
  for (const c of cases) {
    const table = await run(c[0], c[1], project);
    const ids = table.map(function (r) { return r.unit_id; }).sort().join(',');
    const ok = ids === 'u-a5,u-b3,u-r';
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + c[0] + ' double-click -> ' + table.length + ' unit rows [' + ids + ']');
    if (!ok) fails++;
  }
  if (fails) { console.error(fails + ' failed'); process.exit(1); }
  console.log('all passed');
})();
