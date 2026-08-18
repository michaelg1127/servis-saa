// patch_bbm5_db.js — Pool Bunker Migration for Tanki Merah & Kuning
// Run: node patch_bbm5_db.js
// Safe to run twice — checks for existing M-OB/K-OB before inserting.

const SUPABASE_URL = 'https://xpecefriamslzidlcsuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwZWNlZnJpYW1zbHppZGxjc3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMjYwODYsImV4cCI6MjA5NzYwMjA4Nn0.uvTe_2x2wXoGGomRIHfS1vZjVYu_BbeU09L9dZRR-AU';
const BASE = SUPABASE_URL + '/rest/v1';

const HDR = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
};

async function api(path, opts = {}) {
  const headers = { ...HDR, ...(opts.headers || {}) };
  const res = await fetch(BASE + path, { ...opts, headers });
  if (!res.ok) { const t = await res.text(); throw new Error('HTTP ' + res.status + ': ' + t); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function get(path) { return api(path) || []; }
async function patch(path, body) { return api(path, { method: 'PATCH', body: JSON.stringify(body) }); }
async function del(path) { return api(path, { method: 'DELETE' }); }
async function post(path, body) {
  return api(path, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  });
}

async function run() {
  const today = new Date().toISOString().slice(0, 10);

  // ── 1a. Compute consolidated totals ───────────────────────────────────────
  const merahBunkers = await get('/fuel_bunkers?tank_name=eq.merah&bunker_code=neq.M-OB&select=id,bunker_code,total_liters');
  const kuningBunkers = await get('/fuel_bunkers?tank_name=eq.kuning&bunker_code=neq.K-OB&select=id,bunker_code,total_liters');
  const merahTotal = merahBunkers.reduce((s, b) => s + Number(b.total_liters), 0);
  const kuningTotal = kuningBunkers.reduce((s, b) => s + Number(b.total_liters), 0);
  console.log('Merah:', merahBunkers.length, 'bunkers, total', merahTotal, 'L:', merahBunkers.map(b => b.bunker_code).join(', ') || '(none)');
  console.log('Kuning:', kuningBunkers.length, 'bunkers, total', kuningTotal, 'L:', kuningBunkers.map(b => b.bunker_code).join(', ') || '(none)');

  // ── 1b. Create OB pool bunkers (idempotent) ────────────────────────────────
  let [mOB] = await get('/fuel_bunkers?bunker_code=eq.M-OB&select=id,total_liters');
  if (!mOB) {
    const res = await post('/fuel_bunkers', { bunker_code: 'M-OB', tank_name: 'merah', total_liters: merahTotal, delivery_date: today, notes: 'Pool bunker — migrated 2026-08-18' });
    mOB = Array.isArray(res) ? res[0] : res;
    console.log('Created M-OB, id:', mOB.id);
  } else {
    console.log('M-OB already exists, id:', mOB.id, '— skipping insert');
  }

  let [kOB] = await get('/fuel_bunkers?bunker_code=eq.K-OB&select=id,total_liters');
  if (!kOB) {
    const res = await post('/fuel_bunkers', { bunker_code: 'K-OB', tank_name: 'kuning', total_liters: kuningTotal, delivery_date: today, notes: 'Pool bunker — migrated 2026-08-18' });
    kOB = Array.isArray(res) ? res[0] : res;
    console.log('Created K-OB, id:', kOB.id);
  } else {
    console.log('K-OB already exists, id:', kOB.id, '— skipping insert');
  }

  // ── 1c. Migrate fills to reference OB bunkers ─────────────────────────────
  if (merahBunkers.length > 0) {
    const ids = merahBunkers.map(b => b.id).join(',');
    await patch('/fuel_transfers?bunker_id=in.(' + ids + ')', { bunker_id: mOB.id });
    console.log('Migrated Merah fills → M-OB');
  }
  if (kuningBunkers.length > 0) {
    const ids = kuningBunkers.map(b => b.id).join(',');
    await patch('/fuel_transfers?bunker_id=in.(' + ids + ')', { bunker_id: kOB.id });
    console.log('Migrated Kuning fills → K-OB');
  }

  // ── 1d. Renumber fills chronologically (two-pass for UNIQUE constraint) ───
  for (const { obId, prefix, label } of [
    { obId: mOB.id, prefix: 'M', label: 'Merah' },
    { obId: kOB.id, prefix: 'K', label: 'Kuning' },
  ]) {
    const fills = await get('/fuel_transfers?bunker_id=eq.' + obId + '&select=id,transfer_code&order=created_at.asc');
    if (fills.length === 0) { console.log('No', label, 'fills to renumber'); continue; }
    console.log('Renumbering', fills.length, label, 'fills...');
    // Pass 1: temp names to avoid UNIQUE conflicts
    for (let i = 0; i < fills.length; i++) {
      await patch('/fuel_transfers?id=eq.' + fills[i].id, { transfer_code: 'TEMP-' + prefix + '-' + (i + 1) });
    }
    // Pass 2: final sequential names
    for (let i = 0; i < fills.length; i++) {
      await patch('/fuel_transfers?id=eq.' + fills[i].id, { transfer_code: prefix + '-' + (i + 1) });
    }
    console.log('  Done:', prefix + '-1 through ' + prefix + '-' + fills.length);
  }

  // ── 1e. Delete old per-session bunker records ─────────────────────────────
  const toDelete = [
    ...merahBunkers.map(b => b.id),
    ...kuningBunkers.map(b => b.id),
  ];
  if (toDelete.length > 0) {
    await del('/fuel_bunkers?id=in.(' + toDelete.join(',') + ')');
    console.log('Deleted', toDelete.length, 'old bunker records');
  } else {
    console.log('No old bunker records to delete');
  }

  // ── 1f. Update fuel_tank_transfers bunker references ─────────────────────
  const merahXfers = await get('/fuel_tank_transfers?to_tank=eq.merah&bunker_id=not.is.null&select=id,bunker_id');
  const kuningXfers = await get('/fuel_tank_transfers?to_tank=eq.kuning&bunker_id=not.is.null&select=id,bunker_id');
  for (const xfer of merahXfers) {
    if (xfer.bunker_id !== mOB.id) await patch('/fuel_tank_transfers?id=eq.' + xfer.id, { bunker_id: mOB.id });
  }
  for (const xfer of kuningXfers) {
    if (xfer.bunker_id !== kOB.id) await patch('/fuel_tank_transfers?id=eq.' + xfer.id, { bunker_id: kOB.id });
  }
  console.log('Updated', merahXfers.length, 'Merah tank-transfers,', kuningXfers.length, 'Kuning tank-transfers');

  // ── Verification summary ──────────────────────────────────────────────────
  const merahFills = await get('/fuel_transfers?bunker_id=eq.' + mOB.id + '&select=transfer_code&order=created_at.asc');
  const kuningFills = await get('/fuel_transfers?bunker_id=eq.' + kOB.id + '&select=transfer_code&order=created_at.asc');
  console.log('\n✅ Migration complete');
  console.log('  M-OB fills:', merahFills.map(f => f.transfer_code).join(', ') || '(none)');
  console.log('  K-OB fills:', kuningFills.map(f => f.transfer_code).join(', ') || '(none)');
  const remaining = await get('/fuel_bunkers?tank_name=in.(merah,kuning)&select=bunker_code');
  console.log('  Remaining Merah/Kuning bunkers:', remaining.map(b => b.bunker_code).join(', '));
  if (remaining.some(b => b.bunker_code !== 'M-OB' && b.bunker_code !== 'K-OB')) {
    console.error('  ❌ Old bunker records still exist — check for constraint errors above');
    process.exit(1);
  }
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
