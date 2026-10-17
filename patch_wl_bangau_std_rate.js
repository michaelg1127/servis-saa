// Bangau operators on the bon muat list get STD salary at Rp 200/MT (STD operators Rp 800/MT).
// Monitoring "Rizki" = SAA "Riski". Cek vs Monitoring also flags rows saved at the wrong rate.
const fs = require('fs');
const F = __dirname + '/index.html';
let s = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n');
const q0 = (s.match(/[‘’“”]/g) || []).length;
function rep(a, b, n) {
  const c = s.split(a).length - 1;
  if (c !== (n || 1)) { console.error('expected ' + (n || 1) + ' got ' + c + ': ' + a.slice(0, 80)); process.exit(1); }
  s = s.split(a).join(b);
}

rep(`const WL_STD_OPS = ['Erwin', 'Uncong', 'Valdo', 'Andre', 'Alif', 'Rudianto'];
`, `const WL_STD_OPS = ['Erwin', 'Uncong', 'Valdo', 'Andre', 'Alif', 'Rudianto'];
// Monitoring spelling -> SAA name.
const WL_NAME_ALIAS = { Rizki: 'Riski' };

// STD salary per MT: Bangau operators who also ran STD trucks get Rp 200/MT, STD operators Rp 800/MT.
function wlStdRate(op) { return WL_BANGAU_OPS.indexOf(op) !== -1 ? 200 : 800; }

// Monitoring bonMuat with names mapped to SAA spelling (counts merged).
function wlNormBon(bon) {
  const out = {};
  Object.keys(bon || {}).forEach(function(op) {
    const n = WL_NAME_ALIAS[op] || op;
    out[n] = (out[n] || 0) + Number(bon[op] || 0);
  });
  return out;
}
`);

// Compare: alias names, and flag rows whose salary is not tonnage x rate.
rep(`  const res = { status: 'ok', diffs: [], unknown: [], blMon: Number(mon.blQuantity || 0), blDiffers: false };`,
    `  const res = { status: 'ok', diffs: [], rateDiffs: [], unknown: [], blMon: Number(mon.blQuantity || 0), blDiffers: false };`);
rep(`  (stdRows || []).forEach(function(r) { saa[r.operator_name] = (saa[r.operator_name] || 0) + Number(r.tonnage_mt || 0); });
  const bon = mon.bonMuat || {};`,
    `  (stdRows || []).forEach(function(r) {
    saa[r.operator_name] = (saa[r.operator_name] || 0) + Number(r.tonnage_mt || 0);
    if (r.salary_amount != null) {
      const want = Math.round(Number(r.tonnage_mt || 0) * wlStdRate(r.operator_name));
      if (Math.abs(Number(r.salary_amount) - want) > 1) res.rateDiffs.push({ op: r.operator_name, saa: Number(r.salary_amount), want: want, rate: wlStdRate(r.operator_name) });
    }
  });
  const bon = wlNormBon(mon.bonMuat);`);
rep(`  else if (res.diffs.length > 0) res.status = 'diff';
  return res;`, `  else if (res.diffs.length > 0 || res.rateDiffs.length > 0) res.status = 'diff';
  return res;`);

// Edit Kapal STD row: salary at the operator's rate, Bangau operators labelled.
rep(`    '<span id="wledit-std-sal-' + sid + '" style="font-size:13px;font-weight:700;color:#1D4ED8;width:120px;">Rp ' + Math.round((ton || 0) * 800).toLocaleString('id') + '</span>' + tag +`,
    `    '<span id="wledit-std-sal-' + sid + '" style="font-size:13px;font-weight:700;color:#1D4ED8;width:120px;">Rp ' + Math.round((ton || 0) * wlStdRate(op)).toLocaleString('id') + '</span>' + tag +`);
rep(`    return wlEditStdRowHTML(op, existing ? Number(existing.tonnage_mt || 0) : 0, WL_STD_OPS.indexOf(op) === -1 ? 'tambahan' : '');`,
    `    return wlEditStdRowHTML(op, existing ? Number(existing.tonnage_mt || 0) : 0, WL_BANGAU_OPS.indexOf(op) !== -1 ? 'Bangau \\u00b7 Rp 200/MT' : (WL_STD_OPS.indexOf(op) === -1 ? 'tambahan' : ''));`);
rep(`          document.getElementById('wledit-std-rows').insertAdjacentHTML('beforeend', wlEditStdRowHTML(op, 0, 'tambahan'));`,
    `          document.getElementById('wledit-std-rows').insertAdjacentHTML('beforeend', wlEditStdRowHTML(op, 0, WL_BANGAU_OPS.indexOf(op) !== -1 ? 'Bangau \\u00b7 Rp 200/MT' : 'tambahan'));`);
rep(`    const salEl = document.getElementById('wledit-std-sal-' + wlSafeId(inp.dataset.op));
    if (salEl) salEl.textContent = 'Rp ' + Math.round(ton * 800).toLocaleString('id');`,
    `    const salEl = document.getElementById('wledit-std-sal-' + wlSafeId(inp.dataset.op));
    if (salEl) salEl.textContent = 'Rp ' + Math.round(ton * wlStdRate(inp.dataset.op)).toLocaleString('id');`);
rep(`salary_amount: Math.round(ton * 800) });`, `salary_amount: Math.round(ton * wlStdRate(inp.dataset.op)) });`);

// Edit Kapal sync: use SAA spelling.
rep(`      var bonMuat = data.bonMuat || {};
      var filled = [], cleared = [], added = [], unknown = [];`,
    `      var bonMuat = wlNormBon(data.bonMuat);
      var filled = [], cleared = [], added = [], unknown = [];`);

// Analisis: fetch salary too, show rate mismatches.
rep(`select('id, project_id, operator_name, tonnage_mt').in('project_id', ids).eq('unit_type', 'std')`,
    `select('id, project_id, operator_name, tonnage_mt, salary_amount').in('project_id', ids).eq('unit_type', 'std')`);
rep(`  if (cmp.status === 'diff') parts.push('<span style="color:#DC2626;font-weight:700;">Tonase berbeda</span>');`,
    `  if (cmp.status === 'diff' && cmp.diffs.length) parts.push('<span style="color:#DC2626;font-weight:700;">Tonase berbeda</span>');
  if (cmp.rateDiffs.length) parts.push('<span style="color:#DC2626;font-weight:700;">Gaji tidak sesuai tarif</span>');`);
rep(`  }).join('<br>');
  return parts.join(' \\u00b7 ') + (detail && cmp.status !== 'no_trucks'`,
    `  }).concat(cmp.rateDiffs.map(function(d) {
    return d.op + ': gaji Rp ' + d.saa.toLocaleString('id') + ' \\u2192 Rp ' + d.want.toLocaleString('id') + ' (Rp ' + d.rate + '/MT)';
  })).join('<br>');
  return parts.join(' \\u00b7 ') + (detail && cmp.status !== 'no_trucks'`);
rep(`Tonase STD = BL SAA \\u00d7 0,95 \\u00f7 total ritase \\u00d7 bon operator.`,
    `Tonase STD = BL SAA \\u00d7 0,95 \\u00f7 total ritase \\u00d7 bon operator. Gaji = tonase \\u00d7 Rp 800/MT (operator Bangau Rp 200/MT).`);

const q1 = (s.match(/[‘’“”]/g) || []).length;
if (q0 !== q1) { console.error('curly quote count changed'); process.exit(1); }
fs.writeFileSync(F, s.replace(/\n/g, '\r\n'));
console.log('patched');
