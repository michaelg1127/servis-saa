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

function replaceN(from, to, expectedCount, desc) {
  const count = src.split(from).length - 1;
  if (count !== expectedCount) { console.error('EXPECTED ' + expectedCount + ', found ' + count + ': ' + desc); fails++; return; }
  src = src.split(from).join(to);
  console.log('OK (' + count + 'x): ' + desc);
}

// ── BANGAU salary: bl * 0.9 / 4 * 800  →  bl * 750 / 4 ──────────────────────
// 3 sites: wlUpdateSalaryPreview (Add modal), submitAddWoodlogKapal, wlEditSalaryPreview
replaceN(
  'bl * 0.9 / 4 * 800',
  'bl * 750 / 4',
  3,
  'PATCH B1: Bangau salary formula bl*0.9/4*800 → bl*750/4 (3 sites)'
);

// ── BANGAU tonnage_mt stored in Add modal ────────────────────────────────────
// submitAddWoodlogKapal: const bl4 = bl * 0.9 / 4;
replaceExact(
  'const bl4 = bl * 0.9 / 4;',
  'const bl4 = bl / 4;',
  'PATCH B2: Bangau tonnage_mt stored in submitAddWoodlogKapal (bl*0.9/4 → bl/4)'
);

// ── BANGAU salary in Edit submit: blVal * 0.9 / 4 * 800  →  blVal * 750 / 4 ─
replaceExact(
  'blVal * 0.9 / 4 * 800',
  'blVal * 750 / 4',
  'PATCH B3: Bangau salary formula blVal*0.9/4*800 → blVal*750/4 (submitEditWoodlogKapal)'
);

// ── BANGAU tonnage_mt stored in Edit submit ───────────────────────────────────
replaceExact(
  'const bl4 = blVal * 0.9 / 4;',
  'const bl4 = blVal / 4;',
  'PATCH B4: Bangau tonnage_mt stored in submitEditWoodlogKapal (blVal*0.9/4 → blVal/4)'
);

// ── STD salary: ton * 750  →  ton * 0.95 * 800 ───────────────────────────────
// 3 sites: wlUpdateSalaryPreview, wlEditSalaryPreview, submitEditWoodlogKapal
replaceN(
  'Math.round(ton * 750)',
  'Math.round(ton * 0.95 * 800)',
  3,
  'PATCH S1: STD salary formula ton*750 → ton*0.95*800 (3 sites)'
);

// ── STD tpr in wlEditSyncFromMonitoring: bl*0.9 → bl*0.95 ───────────────────
replaceExact(
  '(bl * 0.9) / data.totalRitase',
  '(bl * 0.95) / data.totalRitase',
  'PATCH S2: STD tpr in wlEditSyncFromMonitoring (bl*0.9 → bl*0.95)'
);

// ── STD tpr in wlRenderSyncTable (Analisis): totalMt*0.9 → totalMt*0.95 ─────
replaceExact(
  '(totalMt * 0.9) / data.totalRitase',
  '(totalMt * 0.95) / data.totalRitase',
  'PATCH S3: STD tpr in wlRenderSyncTable Analisis (totalMt*0.9 → totalMt*0.95)'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 7 patches applied');
