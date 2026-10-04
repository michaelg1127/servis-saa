// Run: node test_cases/inbox_checks.test.js
// Scenario tests for the Inbox WA supervisor (inbox_checks.src.js).
// Each case is a draft the supervisor MUST pass (good) or MUST flag (bad), with the rule that should fire.
const IBC = require('../inbox_checks.src.js');

const units = [
  { id: 'u-k7', code: 'K7', current_hm: 8470 },
  { id: 'u-k5', code: 'K5', current_hm: 5262 },
  { id: 'u-a8', code: 'A8', current_hm: 5410 },
];
const projects = [
  { id: 'p1', project_code: 'KCN-2610-01', type: 'kapal', nama_kapal: 'TB. TRI BAHARI 3', kade: 'Kade 2', start_date: '2026-10-02', end_date: '2026-10-04' },
];
const raw = {
  units, projects,
  project_units: [{ id: 'pu1', project_id: 'p1', unit_id: 'u-k7', hm_awal: 8440, hm_akhir: null, projects: projects[0] }],
  fuel_dispenses: [
    { id: 'f0', unit_id: 'u-k7', hm_at_fill: 8395, dispense_date: '2026-10-01', dispense_time: '03:00', liters_dispensed: 200, l_per_hr: 8 },
    { id: 'f1', unit_id: 'u-k7', hm_at_fill: 8420, dispense_date: '2026-10-02', dispense_time: '03:00', liters_dispensed: 200, l_per_hr: 8 },
    { id: 'f2', unit_id: 'u-k7', hm_at_fill: 8370, dispense_date: '2026-09-30', dispense_time: '03:00', liters_dispensed: 200, l_per_hr: 8.2 },
    { id: 'f3', unit_id: 'u-k7', hm_at_fill: 8345, dispense_date: '2026-09-29', dispense_time: '03:00', liters_dispensed: 200, l_per_hr: 7.8 },
  ],
  service_log: [
    // K5: full 500 service at 5000, first Racor at 5250 (24 Sep)
    { id: 's1', unit_id: 'u-k5', maintenance_type: 'Racor', hm_at_service: 5000, service_date: '2026-09-10' },
    { id: 's2', unit_id: 'u-k5', maintenance_type: 'Oli Mesin', hm_at_service: 5000, service_date: '2026-09-10' },
    { id: 's3', unit_id: 'u-k5', maintenance_type: 'Filter Oli Mesin', hm_at_service: 5000, service_date: '2026-09-10' },
    { id: 's4', unit_id: 'u-k5', maintenance_type: 'Filter Solar', hm_at_service: 5000, service_date: '2026-09-10' },
    { id: 's5', unit_id: 'u-k5', maintenance_type: 'Racor', hm_at_service: 5250, service_date: '2026-09-24' },
    // A8: last Racor + oil at 5000
    { id: 's6', unit_id: 'u-a8', maintenance_type: 'Racor', hm_at_service: 5000, service_date: '2026-09-05' },
    { id: 's7', unit_id: 'u-a8', maintenance_type: 'Oli Mesin', hm_at_service: 5000, service_date: '2026-09-05' },
  ],
  maintenance_schedules: [],
  hm_updates: [],
  service_requests: [{ id: 'sr1', unit_id: 'u-k7', sr_number: 'SR-0101', description: 'Hose hidrolik boom bocor', status: 'pending_spv' }],
};

let seq = 0;
function draft(kind, unit, payload, when, extra) {
  return Object.assign({ id: 'd' + (++seq), kind, unit_code: unit, payload, status: 'pending', confidence: 'high',
    source_group: 'KCN excavator group', wa_sent_at: when, photo_taken_at: when }, extra || {});
}
const T = (s) => s + ':00+07:00';

const cases = [
  // ---- must pass ----
  ['good', 'Isi solar normal', draft('fuel_dispense', 'K7', { hm_at_fill: 8445, dispense_date: '2026-10-03', liters: 200, gauge_pct: 20 }, T('2026-10-03T03:39')), 'ok'],
  ['good', 'Racor pertama di +250', draft('service_log', 'A8', { maintenance_type: 'Racor', hm_at_service: 5250, service_date: '2026-09-20' }, T('2026-09-20T10:00')), 'ok'],
  ['bad', 'Racor ke-2 (di +500) tanpa oli mesin + filter', draft('service_log', 'K5', { maintenance_type: 'Racor', hm_at_service: 5500, service_date: '2026-10-08' }, T('2026-10-08T10:00')), 'warn', 'set500'],
  ['good', 'HM akhir proyek wajar', draft('project_unit_hm', 'K7', { project_id: 'p1', hm_akhir: 8460 }, T('2026-10-03T06:00')), 'ok'],
  ['good', 'Kapal baru', draft('project_kapal', null, { nama_kapal: 'MV. SINAR JAYA', kade: 'Kade 5', start_date: '2026-10-03' }, T('2026-10-03T08:00')), 'ok'],
  // ---- must flag ----
  ['bad', 'HM mundur', draft('fuel_dispense', 'K7', { hm_at_fill: 8400, dispense_date: '2026-10-03', liters: 200 }, T('2026-10-03T04:00')), 'fail', 'hm_back'],
  ['bad', 'HM loncat tidak mungkin', draft('hm_update', 'K7', { hm_value: 8600, recorded_at: '2026-10-03T07:00:00+07:00' }, T('2026-10-03T07:00')), 'fail', 'hm_jump'],
  ['bad', 'HM akhir < HM awal', draft('project_unit_hm', 'K7', { hm_awal: 8450, hm_akhir: 8441 }, T('2026-10-03T07:00')), 'fail', 'awal_akhir'],
  ['bad', 'Racor dobel (10 HM setelah ganti)', draft('service_log', 'K5', { maintenance_type: 'Racor', hm_at_service: 5262, service_date: '2026-09-25' }, T('2026-09-25T09:00')), 'fail', 'cycle'],
  ['bad', 'Servis 500 tidak lengkap', draft('service_log', 'K5', { maintenance_type: 'Oli Mesin', hm_at_service: 5500, service_date: '2026-10-08' }, T('2026-10-08T09:00')), 'warn', 'set500'],
  ['bad', 'Racor ke-2 tanpa oli mesin + overdue', draft('service_log', 'A8', { maintenance_type: 'Racor', hm_at_service: 5410, service_date: '2026-09-30' }, T('2026-09-30T09:00')), 'warn', 'set500'],
  ['bad', 'Tanggal draft beda 1 hari dari foto', draft('fuel_dispense', 'K7', { hm_at_fill: 8446, dispense_date: '2026-10-02', liters: 200 }, T('2026-10-03T00:20')), 'warn', 'date'],
  ['bad', 'Nama kapal mirip (TRI BAHARI 3 vs Tribahari 111)', draft('project_kapal', null, { nama_kapal: 'TB. Tribahari 111', kade: 'Kade 2', start_date: '2026-10-02' }, T('2026-10-02T08:00')), 'warn', 'kapal'],
  ['bad', 'Gauge sudah 95% sebelum isi', draft('fuel_dispense', 'K7', { hm_at_fill: 8447, dispense_date: '2026-10-03', liters: 200, gauge_pct: 95 }, T('2026-10-03T05:00')), 'warn', 'gauge'],
  ['bad', 'Liter per jam tidak wajar', draft('fuel_dispense', 'K7', { hm_at_fill: 8448, dispense_date: '2026-10-03', liters: 400 }, T('2026-10-03T05:30')), 'warn', 'lph'],
  ['bad', 'HM isi solar di luar HM awal proyek', draft('fuel_dispense', 'K7', { hm_at_fill: 8431, dispense_date: '2026-10-03', liters: 200 }, T('2026-10-03T01:00')), null, 'kcn'],
  ['bad', 'Unit tidak dikenal', draft('fuel_dispense', 'K99', { hm_at_fill: 100, dispense_date: '2026-10-03', liters: 200 }, T('2026-10-03T05:00')), 'fail', 'unit'],
  ['bad', 'SR dobel', draft('service_request', 'K7', { description: 'hose hidrolik bocor lagi' }, T('2026-10-03T05:00')), 'warn', 'sr_dup'],
];

let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + '\n        ' + detail); }
}

console.log('Scenario checks');
cases.forEach(function (c) {
  const [type, name, d, wantVerdict, wantCode] = c;
  // each case is checked alone against the database (no other pending drafts), like a fresh parse
  const ctx = IBC.buildContext(Object.assign({}, raw, { drafts: [d] }));
  const res = IBC.check(IBC.draftToItem(d, ctx), ctx, {});
  const msgs = res.checks.map(x => x.level + ':' + x.code + ' ' + x.msg).join('\n        ');
  if (type === 'good') {
    ok(res.verdict === 'ok', '[lolos] ' + name, 'verdict ' + res.verdict + '\n        ' + msgs);
  } else {
    const fired = res.checks.some(x => x.code === wantCode && (x.level === 'warn' || x.level === 'fail'));
    const vOk = wantVerdict ? res.verdict === wantVerdict || (wantVerdict === 'warn' && res.verdict === 'fail') : res.verdict !== 'ok';
    ok(fired && vOk, '[ditangkap] ' + name + ' → ' + wantCode, 'verdict ' + res.verdict + '\n        ' + msgs);
  }
});

console.log('\nService cycle: full 500 set in one batch passes');
(function () {
  const ds = ['Racor', 'Oli Mesin', 'Filter Oli Mesin', 'Filter Solar'].map(t =>
    draft('service_log', 'K5', { maintenance_type: t, hm_at_service: 5500, service_date: '2026-10-08' }, T('2026-10-08T09:00')));
  const ctx = IBC.buildContext(Object.assign({}, raw, { drafts: ds }));
  ds.forEach(d => {
    const res = IBC.check(IBC.draftToItem(d, ctx), ctx, {});
    ok(res.verdict === 'ok', '[lolos] ' + d.payload.maintenance_type + ' @5500 bersama set lengkap', res.checks.map(x => x.level + ':' + x.code + ' ' + x.msg).join('\n        '));
  });
})();

console.log('\nDry run: draft that matches what admin already typed');
(function () {
  const d = draft('fuel_dispense', 'K7', { hm_at_fill: 8420, dispense_date: '2026-10-02', liters: 200 }, T('2026-10-02T03:00'));
  const ctx = IBC.buildContext(Object.assign({}, raw, { drafts: [d] }));
  const res = IBC.check(IBC.draftToItem(d, ctx), ctx, {});
  ok(res.matched && res.verdict === 'ok', '[cocok] isi solar K7 8420 = input admin', res.checks.map(x => x.level + ':' + x.code + ' ' + x.msg).join('\n        '));
})();

console.log('\nAudit of existing data (dobel Racor K5 24 & 25 Sep)');
(function () {
  const r2 = JSON.parse(JSON.stringify(raw));
  r2.service_log.push({ id: 's9', unit_id: 'u-k5', maintenance_type: 'Racor', hm_at_service: 5252, service_date: '2026-09-25' });
  const ctx = IBC.buildContext(r2);
  const found = IBC.audit(r2, ctx, '2026-09-20');
  const k5 = found.filter(f => f.item.unit_code === 'K5' && f.result.checks.some(c => c.code === 'dup' || c.code === 'cycle'));
  ok(k5.length >= 2, '[audit] kedua entri Racor K5 ditandai', JSON.stringify(found.map(f => f.item.label)));
  const clean = found.filter(f => f.item.id === 'fuel_dispenses:f1');
  ok(clean.length === 0, '[audit] isi solar K7 yang wajar tidak ditandai', JSON.stringify(clean.map(f => f.result.checks)));
})();

console.log('\nScorecard');
(function () {
  const s = IBC.score([
    { status: 'rejected', check_result: { verdict: 'fail' } },
    { status: 'approved', check_result: { verdict: 'warn' } },
    { status: 'approved', check_result: { verdict: 'ok' } },
    { status: 'duplicate', check_result: { verdict: 'ok' } },
    { status: 'duplicate', check_result: { verdict: 'ok', matched: true } },
    { status: 'pending', check_result: { verdict: 'ok' } },
  ]);
  ok(s.caught.length === 1 && s.falseAlarm.length === 1 && s.cleanPass.length === 2 && s.missed.length === 1 && s.total === 5, '[rapor] hitungan benar', JSON.stringify(s));
})();

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
