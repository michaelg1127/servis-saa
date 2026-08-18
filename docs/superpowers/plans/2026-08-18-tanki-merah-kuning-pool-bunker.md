# Tanki Merah & Kuning Pool Bunker Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Tanki Merah and Tanki Kuning to single pool-bunker accounting (M-OB/K-OB), redesign the PENGISIAN form with a Tanki Sumber selector, and remove Merah/Kuning from the TERIMA form.

**Architecture:** A one-time Node.js migration script consolidates all historical Merah/Kuning receipts into two permanent pool bunker records (M-OB, K-OB) and renumbers fills chronologically. HTML/JS edits then replace the old per-session bunker flow for Merah/Kuning with a direct pool-balance check, while Hijau's flow is unchanged.

**Tech Stack:** Vanilla JS, Supabase REST API (native fetch, no extra packages), single `index.html` file at `C:\Users\upsca\Documents\SERVIS-SAA\index.html`.

## Global Constraints

- `index.html` is a 472 KB single-file app — all JS/CSS/HTML is embedded; edit in-place
- Supabase URL: `https://xpecefriamslzidlcsuj.supabase.co` (anon key is in index.html line 879)
- DB tank_name values are lowercase: `'merah'`, `'kuning'`, `'hijau'` — never capitalized in DB queries
- `fuel_bunkers.bunker_code` is UNIQUE — renaming fills requires a two-pass approach (TEMP prefix first)
- `fuel_transfers.transfer_code` is UNIQUE — same two-pass constraint
- No schema changes — use existing tables as-is
- OB bunker codes (`M-OB`, `K-OB`) must NEVER appear in the RIWAYAT UI
- After migration, fill codes must match `^[MK]-\d+$` (e.g., M-1, K-3)
- Existing Hijau TERIMA and PENGISIAN flows are completely unchanged
- `calcTankLevels()` formula is unchanged — balance = SUM(fuel_bunkers) + PINDAH_in - PINDAH_out - fills
- The OB bunker's `total_liters` must NOT be incremented when PINDAH transfers occur (PINDAH is already captured in `fuel_tank_transfers`)
- Migration script uses only Node.js built-ins + native `fetch` (no npm packages to install)
- Migration must be idempotent — safe to run twice (checks for existing M-OB/K-OB before inserting)

---

### Task 1: DB Migration Script

Consolidates all Merah/Kuning bunker history into two permanent pool records, migrates all fills to reference them, renumbers fills chronologically, and deletes the old per-session bunker records.

**Run after Task 1 completes, before Tasks 2 or 3 are deployed** — Tasks 2/3 query M-OB/K-OB by `bunker_code`.

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_bbm5_db.js`

**Interfaces:**
- Produces: M-OB and K-OB records in `fuel_bunkers`; all Merah/Kuning fills renumbered M-1…M-N, K-1…K-N
- Consumes: Supabase REST API (native fetch)

- [ ] **Step 1: Create the migration script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_bbm5_db.js` with this exact content:

```js
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
```

- [ ] **Step 2: Run the migration script**

```bash
cd C:/Users/upsca/Documents/SERVIS-SAA
node patch_bbm5_db.js
```

Expected output (numbers will vary):
```
Merah: 3 bunkers, total 4500 L: M-1, M-2, M-3
Kuning: 2 bunkers, total 3000 L: K-1, K-2
Created M-OB, id: <uuid>
Created K-OB, id: <uuid>
Migrated Merah fills → M-OB
Migrated Kuning fills → K-OB
Renumbering 7 Merah fills...
  Done: M-1 through M-7
Renumbering 4 Kuning fills...
  Done: K-1 through K-4
Deleted 5 old bunker records
Updated 3 Merah tank-transfers, 2 Kuning tank-transfers

✅ Migration complete
  M-OB fills: M-1, M-2, M-3, M-4, M-5, M-6, M-7
  K-OB fills: K-1, K-2, K-3, K-4
  Remaining Merah/Kuning bunkers: M-OB, K-OB
```

If there are 0 existing Merah/Kuning bunkers, totals will be 0 and "(none)" — that is correct.

- [ ] **Step 3: Commit**

```bash
git add patch_bbm5_db.js
git commit -m "feat(bbm): add pool bunker migration script (patch_bbm5_db)"
```

---

### Task 2: TERIMA Form + RIWAYAT Filter

Remove Tanki Merah and Kuning from the TERIMA form's tank selector. Filter M-OB/K-OB records from the RIWAYAT display and filter dropdown.

**Prerequisite:** Task 1 (DB migration) must have been run successfully.

**Files:**
- Modify: `index.html` (4 targeted edits)

**Interfaces:**
- Consumes: `fuelBunkerData`, `renderFuelRiwayat()` — both already exist
- Produces: TERIMA restricted to Hijau only; RIWAYAT shows no OB TERIMA rows; bunker filter dropdown excludes OB codes

- [ ] **Step 1: Remove Merah/Kuning from TERIMA tank selector**

In `index.html` at line 806, find and replace:

Old:
```
<option value="">-- Pilih Tanki --</option><option value="hijau">Tanki Hijau (8.000 L)</option><option value="merah">Tanki Merah (1.500 L)</option><option value="kuning">Tanki Kuning (1.500 L)</option>
```

New:
```
<option value="">-- Pilih Tanki --</option><option value="hijau">Tanki Hijau (8.000 L)</option>
```

- [ ] **Step 2: Filter OB bunkers from fuelBunkerData in loadFuelRiwayat**

In `index.html` at line 4760, find and replace:

Old:
```
    fuelBunkerData = (bunkers || []).map(r => ({ ...r, _type: 'bunker' }));
```

New:
```
    fuelBunkerData = (bunkers || []).filter(r => !r.bunker_code.endsWith('-OB')).map(r => ({ ...r, _type: 'bunker' }));
```

- [ ] **Step 3: Filter OB codes from bunkerOpts in renderFuelRiwayat**

In `index.html` at line 4778, find and replace:

Old:
```
  const bunkerOpts = [...new Set([...bunkerFromDisp, ...bunkerFromXfer, ...bunkerFromTerima].filter(Boolean))].sort((a,b) => { const na=parseInt(a.replace('X',''),10),nb=parseInt(b.replace('X',''),10); return nb-na; });
```

New:
```
  const bunkerOpts = [...new Set([...bunkerFromDisp, ...bunkerFromXfer, ...bunkerFromTerima].filter(b => b && !b.endsWith('-OB')))].sort((a,b) => { const na=parseInt(a.replace('X',''),10),nb=parseInt(b.replace('X',''),10); return nb-na; });
```

- [ ] **Step 4: Filter OB bunkers from loadBunkerHistory (TERIMA panel's history list)**

In `index.html`, find the start of `loadBunkerHistory`:

Old:
```
  const { data } = await sb.from('fuel_bunkers').select('id, bunker_code, delivery_date, tank_name, total_liters, notes').order('delivery_date', { ascending: false });
  if (!data || data.length === 0) {
    el.innerHTML = '<div style="color:#94A3B8;font-size:13px;margin-top:12px;">Belum ada bunker.</div>'; return;
  }
  const rows = data.map(b =>
```

New:
```
  const { data: rawBunkers } = await sb.from('fuel_bunkers').select('id, bunker_code, delivery_date, tank_name, total_liters, notes').order('delivery_date', { ascending: false });
  const data = (rawBunkers || []).filter(b => !b.bunker_code.endsWith('-OB'));
  if (!data || data.length === 0) {
    el.innerHTML = '<div style="color:#94A3B8;font-size:13px;margin-top:12px;">Belum ada bunker.</div>'; return;
  }
  const rows = data.map(b =>
```

- [ ] **Step 5: Verify in browser**

Commit and push (or open index.html directly in browser):

1. Go to BBM → TERIMA tab — confirm only "Tanki Hijau (8.000 L)" appears in the selector; no Merah or Kuning.
2. The "Riwayat Bunker" table in the TERIMA panel must not show M-OB or K-OB rows.
3. Go to BBM → RIWAYAT tab — confirm no green "TERIMA" rows appear for M-OB or K-OB. FILL and PINDAH rows remain.
4. Check the bunker filter dropdown — M-OB and K-OB must not appear as options.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(bbm): restrict TERIMA to Hijau; filter OB bunkers from RIWAYAT"
```

---

### Task 3: PENGISIAN Form Redesign

Add a "Tanki Sumber" selector to the PENGISIAN tab. For Hijau: existing bunker-dropdown flow unchanged. For Merah/Kuning: hide bunker dropdown, show current tank balance, auto-assign OB bunker, validate against tank balance instead of bunker capacity.

**Prerequisite:** Task 1 (DB migration) must have been run. Task 2 must be committed.

**Files:**
- Modify: `index.html` (5 targeted edits — HTML section + 4 JS function changes)

**Interfaces:**
- Consumes: `calcTankLevels()` (existing, unchanged), `getNextTransferSeq()` (existing, unchanged for Hijau), `calcLPerHr()` (existing, unchanged)
- Produces: `getNextFillCode(tank)` — new function; `onSumberChange(tank)` — new function; modified `initPengisianForm()` and `submitPengisian()`

- [ ] **Step 1: Add Tanki Sumber selector + pool balance div to HTML**

In `index.html` at line 815, find and replace the single bunker picker line:

Old (exact string):
```
      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Pilih Bunker <span style="color:#EF4444;">*</span></label><select id="bbm-peng-bunker" class="finput" onchange="onPengisianBunkerChange()"><option value="">-- Pilih Bunker --</option></select></div>
```

New (three divs):
```
      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Tanki Sumber <span style="color:#EF4444;">*</span></label><select id="bbm-peng-sumber" class="finput" onchange="onSumberChange(this.value)"><option value="hijau">Tanki Hijau</option><option value="merah">Tanki Merah</option><option value="kuning">Tanki Kuning</option></select></div>
      <div id="bbm-peng-bunker-row" style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Pilih Bunker <span style="color:#EF4444;">*</span></label><select id="bbm-peng-bunker" class="finput" onchange="onPengisianBunkerChange()"><option value="">-- Pilih Bunker --</option></select></div>
      <div id="bbm-peng-pool-balance" style="display:none;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#1D4ED8;font-weight:600;"></div>
```

- [ ] **Step 2: Modify initPengisianForm() to load only Hijau bunkers**

In `index.html`, find the exact string inside `initPengisianForm()`:

Old:
```
    sb.from('fuel_bunkers').select('id, bunker_code, tank_name, total_liters, delivery_date').order('delivery_date', { ascending: false }),
    sb.from('units').select('id, code, name').order('code'),
  ]);
  const bunkerSel = document.getElementById('bbm-peng-bunker');
  if (bunkerSel) bunkerSel.innerHTML = '<option value="">-- Pilih Bunker --</option>' +
    (bunkers || []).map(b => '<option value="' + b.id + '" data-code="' + b.bunker_code + '" data-total="' + b.total_liters + '">' +
      b.bunker_code + ' — ' + b.tank_name.charAt(0).toUpperCase() + b.tank_name.slice(1) + ' — ' + Number(b.total_liters).toLocaleString('id') + 'L — ' + formatDate(b.delivery_date) + '</option>').join('');
```

New:
```
    sb.from('fuel_bunkers').select('id, bunker_code, total_liters, delivery_date').eq('tank_name', 'hijau').order('delivery_date', { ascending: false }),
    sb.from('units').select('id, code, name').order('code'),
  ]);
  const bunkerSel = document.getElementById('bbm-peng-bunker');
  if (bunkerSel) bunkerSel.innerHTML = '<option value="">-- Pilih Bunker --</option>' +
    (bunkers || []).map(b => '<option value="' + b.id + '" data-code="' + b.bunker_code + '" data-total="' + b.total_liters + '">' +
      b.bunker_code + ' — ' + Number(b.total_liters).toLocaleString('id') + 'L — ' + formatDate(b.delivery_date) + '</option>').join('');
```

Then also add initialization of the new elements at the end of `initPengisianForm()`. Find:

Old (the last three lines of initPengisianForm before its closing brace):
```
  bbmLastDispenseByUnit = {};
  const info = document.getElementById('bbm-peng-last-info');
  if (info) info.style.display = 'none';
  const prev = document.getElementById('bbm-peng-lhr-preview');
  if (prev) prev.style.display = 'none';
  const bprev = document.getElementById('bbm-peng-bunker-preview');
  if (bprev) bprev.style.display = 'none';
  loadBBMProjectsForUnit('');
```

New:
```
  bbmLastDispenseByUnit = {};
  const info = document.getElementById('bbm-peng-last-info');
  if (info) info.style.display = 'none';
  const prev = document.getElementById('bbm-peng-lhr-preview');
  if (prev) prev.style.display = 'none';
  const bprev = document.getElementById('bbm-peng-bunker-preview');
  if (bprev) bprev.style.display = 'none';
  const sumberEl = document.getElementById('bbm-peng-sumber');
  if (sumberEl) sumberEl.value = 'hijau';
  const poolBal = document.getElementById('bbm-peng-pool-balance');
  if (poolBal) poolBal.style.display = 'none';
  const bunkerRow = document.getElementById('bbm-peng-bunker-row');
  if (bunkerRow) bunkerRow.style.display = '';
  loadBBMProjectsForUnit('');
```

- [ ] **Step 3: Add getNextFillCode() and onSumberChange() after getNextTransferSeq()**

In `index.html`, find the exact end of `getNextTransferSeq`:

Old:
```
async function getNextTransferSeq(bunkerCode) {
  const { data } = await sb.from('fuel_transfers').select('transfer_code').like('transfer_code', bunkerCode + '-%');
  if (!data || data.length === 0) return 1;
  const nums = data.map(r => parseInt(r.transfer_code.split('-').pop(), 10)).filter(n => !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1;
}
```

New (same function, plus two new functions appended immediately after):
```
async function getNextTransferSeq(bunkerCode) {
  const { data } = await sb.from('fuel_transfers').select('transfer_code').like('transfer_code', bunkerCode + '-%');
  if (!data || data.length === 0) return 1;
  const nums = data.map(r => parseInt(r.transfer_code.split('-').pop(), 10)).filter(n => !isNaN(n));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

async function getNextFillCode(tank) {
  const prefix = tank === 'merah' ? 'M' : 'K';
  const { data } = await sb.from('fuel_transfers').select('transfer_code').like('transfer_code', prefix + '-%');
  const nums = (data || [])
    .map(r => r.transfer_code)
    .filter(code => new RegExp('^' + prefix + '-\\d+$').test(code))
    .map(code => parseInt(code.split('-')[1], 10))
    .filter(n => !isNaN(n));
  return prefix + '-' + (nums.length ? Math.max(...nums) + 1 : 1);
}

async function onSumberChange(tank) {
  const bunkerRow = document.getElementById('bbm-peng-bunker-row');
  const poolBalance = document.getElementById('bbm-peng-pool-balance');
  const bunkerPrev = document.getElementById('bbm-peng-bunker-preview');
  if (tank === 'hijau') {
    if (bunkerRow) bunkerRow.style.display = '';
    if (poolBalance) poolBalance.style.display = 'none';
    if (bunkerPrev) bunkerPrev.style.display = 'none';
    const bunkerSel = document.getElementById('bbm-peng-bunker');
    if (bunkerSel) bunkerSel.value = '';
  } else {
    if (bunkerRow) bunkerRow.style.display = 'none';
    if (bunkerPrev) bunkerPrev.style.display = 'none';
    if (poolBalance) {
      poolBalance.style.display = '';
      const levels = await calcTankLevels();
      const lvl = levels[tank] || 0;
      const label = tank === 'merah' ? 'Merah' : 'Kuning';
      const nextCode = await getNextFillCode(tank);
      poolBalance.innerHTML = 'Kode isi: <strong>' + nextCode + '</strong> &nbsp;|&nbsp; Saldo Tanki ' + label + ': <strong>' + Math.max(0, lvl).toLocaleString('id') + ' L</strong>';
    }
  }
}
```

- [ ] **Step 4: Replace submitPengisian() entirely**

In `index.html`, find the complete `submitPengisian` function (from `async function submitPengisian()` through its closing `}`). Replace with:

```
async function submitPengisian() {
  const sumberEl = document.getElementById('bbm-peng-sumber');
  const sumber = sumberEl ? sumberEl.value : 'hijau';
  const drumName = document.getElementById('bbm-peng-drum').value.trim();
  const vol = parseFloat(document.getElementById('bbm-peng-vol').value);
  const unitId = document.getElementById('bbm-peng-unit').value;
  const projSel = document.getElementById('bbm-peng-project');
  const projectId = projSel && projSel.value ? projSel.value : null;
  const projOpt = projSel && projSel.selectedOptions[0];
  const projTextEl = document.getElementById('bbm-peng-project-text');
  const project = (projOpt && projOpt.dataset.code ? projOpt.dataset.code : null) || (projTextEl ? projTextEl.value.trim() : null) || null;
  const hm = parseFloat(document.getElementById('bbm-peng-hm').value);
  const date = document.getElementById('bbm-peng-date').value;
  const time = document.getElementById('bbm-peng-time').value || null;
  const notes = document.getElementById('bbm-peng-notes').value.trim() || null;
  const gaugeRaw = parseInt((document.getElementById('bbm-peng-gauge') || {}).value || '');
  const gaugePct = !isNaN(gaugeRaw) && gaugeRaw >= 0 && gaugeRaw <= 100 ? gaugeRaw : null;
  if (!drumName || !vol || !unitId || !hm || !date) { showToast('Drum, Volume, Unit, HM, dan Tanggal wajib diisi.'); return; }

  let bunkerId, transferCode;

  if (sumber === 'hijau') {
    const bunkerSel = document.getElementById('bbm-peng-bunker');
    const bunkerOpt = bunkerSel && bunkerSel.selectedOptions[0];
    bunkerId = bunkerOpt ? bunkerOpt.value : '';
    const bunkerCode = bunkerOpt ? bunkerOpt.dataset.code : '';
    if (!bunkerId) { showToast('Pilih bunker Hijau terlebih dahulu.'); return; }
    const totalBunker = parseFloat(bunkerOpt.dataset.total) || 0;
    const { data: existingT } = await sb.from('fuel_transfers').select('volume_liters').eq('bunker_id', bunkerId);
    const usedSoFar = (existingT || []).reduce((s, t) => s + Number(t.volume_liters), 0);
    if (vol > totalBunker - usedSoFar) { showToast('Volume melebihi sisa kapasitas bunker (' + Math.round(totalBunker - usedSoFar) + 'L).'); return; }
    const seq = await getNextTransferSeq(bunkerCode);
    transferCode = bunkerCode + '-' + seq;
  } else {
    const obCode = sumber === 'merah' ? 'M-OB' : 'K-OB';
    const { data: obData, error: obErr } = await sb.from('fuel_bunkers').select('id').eq('bunker_code', obCode).single();
    if (obErr || !obData) { showToast('Pool bunker ' + obCode + ' tidak ditemukan. Jalankan migrasi dulu.'); return; }
    bunkerId = obData.id;
    const levels = await calcTankLevels();
    const balance = levels[sumber] || 0;
    if (vol > balance) { showToast('Volume melebihi saldo Tanki ' + (sumber === 'merah' ? 'Merah' : 'Kuning') + ' (' + Math.round(balance) + 'L).'); return; }
    transferCode = await getNextFillCode(sumber);
  }

  try {
    const { data: tData, error: e1 } = await sb.from('fuel_transfers')
      .insert({ transfer_code: transferCode, bunker_id: bunkerId, drum_name: drumName, volume_liters: vol, filled_date: date, status: 'deployed' })
      .select('id').single();
    if (e1) throw e1;
    const lhr = await calcLPerHr(unitId, hm, vol, gaugePct);
    const { error: e2 } = await sb.from('fuel_dispenses')
      .insert({ transfer_id: tData.id, unit_id: unitId, hm_at_fill: hm, dispense_date: date, dispense_time: time, liters_dispensed: vol, l_per_hr: lhr, gauge_pct: gaugePct, project_id: projectId, project, notes });
    if (e2) throw e2;
    showToast('Pengisian ' + transferCode + ' berhasil dicatat!', 'success');
    const sumberReset = document.getElementById('bbm-peng-sumber');
    if (sumberReset) sumberReset.value = 'hijau';
    document.getElementById('bbm-peng-bunker').value = '';
    document.getElementById('bbm-peng-drum').value = '';
    document.getElementById('bbm-peng-vol').value = '200';
    document.getElementById('bbm-peng-unit').value = '';
    document.getElementById('bbm-peng-project').value = '';
    document.getElementById('bbm-peng-project-text').value = '';
    document.getElementById('bbm-peng-hm').value = '';
    document.getElementById('bbm-peng-date').value = todayISO();
    document.getElementById('bbm-peng-time').value = '';
    document.getElementById('bbm-peng-notes').value = '';
    const gResetEl = document.getElementById('bbm-peng-gauge');
    if (gResetEl) gResetEl.value = '';
    const gBarEl = document.getElementById('bbm-peng-gauge-bar');
    if (gBarEl) gBarEl.style.width = '0%';
    const gLblEl = document.getElementById('bbm-peng-gauge-label');
    if (gLblEl) gLblEl.textContent = '—';
    document.getElementById('bbm-peng-bunker-preview').style.display = 'none';
    document.getElementById('bbm-peng-last-info').style.display = 'none';
    document.getElementById('bbm-peng-lhr-preview').style.display = 'none';
    const poolBal = document.getElementById('bbm-peng-pool-balance');
    if (poolBal) poolBal.style.display = 'none';
    const bunkerRow = document.getElementById('bbm-peng-bunker-row');
    if (bunkerRow) bunkerRow.style.display = '';
    bbmLastDispenseByUnit = {};
    loadFuelStatus();
  } catch(e) { showToast('Gagal: ' + e.message); }
}
```

- [ ] **Step 5: Test in browser**

Push and deploy (or open index.html locally), then test these scenarios:

**Scenario A — Merah fill:**
1. BBM → PENGISIAN tab
2. Select "Tanki Merah" in Tanki Sumber
3. Confirm bunker dropdown disappears; pool balance div appears showing current Merah balance and next code (e.g., M-8)
4. Fill in Drum, Volume (less than balance), Unit, HM, Tanggal
5. Click "Catat Pengisian" → toast says "Pengisian M-8 berhasil dicatat!"
6. Go to RIWAYAT → new FILL row appears with code M-8

**Scenario B — Hijau fill (regression):**
1. BBM → PENGISIAN tab (starts on Hijau)
2. Confirm bunker dropdown is visible with X-codes listed
3. Select a bunker, fill fields, submit → works as before

**Scenario C — Over-balance rejection:**
1. BBM → PENGISIAN tab → select Tanki Merah
2. Note displayed balance (e.g., 300L)
3. Enter volume 999
4. Submit → toast "Volume melebihi saldo Tanki Merah (300L)" — no record created

**Scenario D — RIWAYAT clean:**
1. Go to RIWAYAT → no green TERIMA rows for M-OB or K-OB
2. Bunker filter dropdown does not show M-OB or K-OB

- [ ] **Step 6: Commit and push**

```bash
git add index.html
git commit -m "feat(bbm): PENGISIAN Tanki Sumber selector; Merah/Kuning use pool bunker"
git push
```
