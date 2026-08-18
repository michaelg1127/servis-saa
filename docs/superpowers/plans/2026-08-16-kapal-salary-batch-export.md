# Kapal Salary Batch Export & NSE Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix NSE stockpile batch assignment, add bank account info to units, and add PDF-mirroring Excel export buttons for each pay batch (16th and 31st).

**Architecture:** All JS edits via Node.js patch scripts targeting `index.html`. One SQL file for the DB migration. Three tasks with one patch script each. No new files beyond patch scripts — everything stays in the single-file app pattern.

**Tech Stack:** Vanilla JS, Supabase JS SDK, SheetJS (`XLSX` global already bundled), Node.js patch scripts

## Global Constraints

- NEVER use the Edit tool on JS string literals inside `index.html` — it corrupts apostrophes and silently breaks the entire `<script>` block. All JS edits via Node.js patch scripts only.
- All multi-line `replaceExact` match strings in patch scripts must use `\r\n` (CRLF), not `\n`. Use string concatenation with a `CRLF` constant: `const CRLF = '\r\n';`.
- Verify every patch script with `node --check patch_XXX.js` before running.
- Run all patch scripts from `C:\Users\upsca\Documents\SERVIS-SAA\`.
- Commit after each task.
- `calcKapalTonnageSplit` outlier rule is CORRECT — do NOT change it.
- NSE salary formula: `HM × 35,000` — unchanged from regular stockpile.
- `calcKapalRate(shipNum)`: returns 175 for ≤15, 200 for ≤30, 225 for >30.
- SheetJS is available as `XLSX` global — no import needed.

## File Map

| File | Role |
|---|---|
| `patch_sal1_db.sql` | DB migration — add bank columns to units |
| `patch_sal1.js` | Patch: bank fields in unit form HTML + JS |
| `patch_sal2.js` | Patch: NSE batch logic in renderProyekRingkasan |
| `patch_sal3.js` | Patch: exportBatchExcel + wrapper functions + two buttons |
| `index.html` | Modified by all three patch scripts |

---

### Task 1: Bank info columns + unit form fields

**Files:**
- Create: `patch_sal1_db.sql`
- Create: `patch_sal1.js`
- Modify: `index.html` (via patch)

**Interfaces:**
- Consumes:
  - Inline unit form at line ~697: inputs `uf-code`, `uf-name`, `uf-model`, `uf-hm`, `uf-operator`, `uf-edit-id`
  - `editUnit(id)` at line 3849 — reads `allUnits` to pre-populate form
  - `cancelUnitEdit()` at line 3863 — resets form fields
  - `saveUnit()` at line 3875 — reads form and writes to Supabase
  - `loadAdminUnits()` at line 3091 — fetches units into `allUnits`
- Produces:
  - `units.bank_name` (TEXT nullable), `units.bank_account_number` (TEXT nullable) columns in DB
  - `uf-bank-name` and `uf-bank-account` inputs in the unit form
  - `editUnit` pre-populates both new fields from `u.bank_name` / `u.bank_account_number`
  - `cancelUnitEdit` resets both new fields to `''`
  - `saveUnit` writes `bank_name` and `bank_account_number` on update
  - `loadAdminUnits` fetches both new fields so `allUnits` entries include them

- [ ] **Step 1: Write the SQL migration**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_sal1_db.sql`:

```sql
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
```

Run in the Supabase SQL editor. Verify with: `SELECT bank_name, bank_account_number FROM units LIMIT 1;` — should return two nullable columns with no error.

- [ ] **Step 2: Write patch_sal1.js**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_sal1.js`:

```js
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

// 1. Insert bank fields in form HTML — between operator closing </div> and hidden input
// Matches lines 719-720 in the unit form (inside admin-screen-unit)
replaceExact(
  '            </select>' + CRLF +
  '          </div>' + CRLF +
  '          <input type="hidden" id="uf-edit-id">',

  '            </select>' + CRLF +
  '          </div>' + CRLF +
  '          <div style="margin-bottom:12px;">' + CRLF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Nama Bank</label>' + CRLF +
  '            <input type="text" id="uf-bank-name" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="BCA / BRI / Mandiri">' + CRLF +
  '          </div>' + CRLF +
  '          <div style="margin-bottom:16px;">' + CRLF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">No. Rekening</label>' + CRLF +
  '            <input type="text" id="uf-bank-account" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="Nomor rekening">' + CRLF +
  '          </div>' + CRLF +
  '          <input type="hidden" id="uf-edit-id">',
  'insert bank fields into unit form HTML'
);

// 2. loadAdminUnits: add bank columns to select (line 3093)
replaceExact(
  "    const { data } = await sb.from('units').select('id, code, name, model, current_hm, assigned_operator_id');",
  "    const { data } = await sb.from('units').select('id, code, name, model, current_hm, assigned_operator_id, bank_name, bank_account_number');",
  'loadAdminUnits: fetch bank columns'
);

// 3. editUnit: pre-populate bank fields (after operator line, before edit-id line — lines 3856-3857)
replaceExact(
  "  document.getElementById('uf-operator').value = u.assigned_operator_id || '';" + CRLF +
  "  document.getElementById('uf-edit-id').value = id;",

  "  document.getElementById('uf-operator').value = u.assigned_operator_id || '';" + CRLF +
  "  document.getElementById('uf-bank-name').value = u.bank_name || '';" + CRLF +
  "  document.getElementById('uf-bank-account').value = u.bank_account_number || '';" + CRLF +
  "  document.getElementById('uf-edit-id').value = id;",
  'editUnit: pre-populate bank fields'
);

// 4. cancelUnitEdit: reset bank fields (lines 3868-3869)
replaceExact(
  "  document.getElementById('uf-operator').value = '';" + CRLF +
  "  document.getElementById('uf-edit-id').value = '';",

  "  document.getElementById('uf-operator').value = '';" + CRLF +
  "  document.getElementById('uf-bank-name').value = '';" + CRLF +
  "  document.getElementById('uf-bank-account').value = '';" + CRLF +
  "  document.getElementById('uf-edit-id').value = '';",
  'cancelUnitEdit: reset bank fields'
);

// 5. saveUnit: include bank fields in update payload (line 3886)
replaceExact(
  "      const { error } = await sb.from('units').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null }).eq('id', editId);",

  "      const bankName = document.getElementById('uf-bank-name').value.trim() || null;" + CRLF +
  "      const bankAccount = document.getElementById('uf-bank-account').value.trim() || null;" + CRLF +
  "      const { error } = await sb.from('units').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null, bank_name: bankName, bank_account_number: bankAccount }).eq('id', editId);",
  'saveUnit: write bank fields on update'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 3: Validate and run**

```bash
node --check patch_sal1.js
node patch_sal1.js
```

Expected output:
```
OK: insert bank fields into unit form HTML
OK: loadAdminUnits: fetch bank columns
OK: editUnit: pre-populate bank fields
OK: cancelUnitEdit: reset bank fields
OK: saveUnit: write bank fields on update
Done. 5 replacements made.
```

- [ ] **Step 4: Verify in browser**

1. Open app → Admin → Kelola Unit
2. Click **Edit** on any unit → confirm "Nama Bank" and "No. Rekening" fields appear below Operator field
3. Enter "BCA" and "1234567890" → click Simpan Perubahan → confirm success toast
4. Click Edit on same unit → confirm fields pre-filled with "BCA" and "1234567890"
5. Click Batal → confirm both bank fields clear
6. Check Supabase: `SELECT code, bank_name, bank_account_number FROM units WHERE bank_name IS NOT NULL;` — verify values saved

- [ ] **Step 5: Commit**

```bash
git add patch_sal1_db.sql patch_sal1.js index.html
git commit -m "feat(sal1): bank_name + bank_account_number on units — DB + form"
```

---

### Task 2: NSE batch logic

**Files:**
- Create: `patch_sal2.js`
- Modify: `index.html` (via patch)

**Interfaces:**
- Consumes: `renderProyekRingkasan` at line ~5790; the five batch filter lines at ~5801–5806; `p.code_prefix` (already present in projects fetched via `select('*', ...)` in `loadProyekRingkasan`)
- Produces: modified batch assignment — NSE stockpile (`code_prefix === 'NSE'`) goes into Batch 16 when `end_date` day ≤ 15, Batch 31 when day > 15; non-NSE stockpile still always Batch 31; `buildOpMap` salary logic untouched

**Current block** (exact text, lines 5801–5806, confirmed):
```
  const batch16 = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) <= 15; });
  const batch31Kapal = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) > 15; });
  const batch31Stk = unpaid.filter(function(p) { return p.type === 'stockpile'; });
  panel._batch16Ids = batch16.map(function(p) { return p.id; });
  panel._batch31Ids = batch31Kapal.concat(batch31Stk).map(function(p) { return p.id; });
```

**Replacement:**
```
  function isNSE(p) { return p.type === 'stockpile' && p.code_prefix === 'NSE'; }
  const batch16 = unpaid.filter(function(p) { return (p.type === 'kapal' || isNSE(p)) && dayOf(p.end_date) <= 15; });
  const batch31Kapal = unpaid.filter(function(p) { return (p.type === 'kapal' || isNSE(p)) && dayOf(p.end_date) > 15; });
  const batch31Stk = unpaid.filter(function(p) { return p.type === 'stockpile' && !isNSE(p); });
  panel._batch16Ids = batch16.map(function(p) { return p.id; });
  panel._batch31Ids = batch31Kapal.concat(batch31Stk).map(function(p) { return p.id; });
```

- [ ] **Step 1: Write patch_sal2.js**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_sal2.js`:

```js
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

replaceExact(
  "  const batch16 = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) <= 15; });" + CRLF +
  "  const batch31Kapal = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) > 15; });" + CRLF +
  "  const batch31Stk = unpaid.filter(function(p) { return p.type === 'stockpile'; });" + CRLF +
  "  panel._batch16Ids = batch16.map(function(p) { return p.id; });" + CRLF +
  "  panel._batch31Ids = batch31Kapal.concat(batch31Stk).map(function(p) { return p.id; });",

  "  function isNSE(p) { return p.type === 'stockpile' && p.code_prefix === 'NSE'; }" + CRLF +
  "  const batch16 = unpaid.filter(function(p) { return (p.type === 'kapal' || isNSE(p)) && dayOf(p.end_date) <= 15; });" + CRLF +
  "  const batch31Kapal = unpaid.filter(function(p) { return (p.type === 'kapal' || isNSE(p)) && dayOf(p.end_date) > 15; });" + CRLF +
  "  const batch31Stk = unpaid.filter(function(p) { return p.type === 'stockpile' && !isNSE(p); });" + CRLF +
  "  panel._batch16Ids = batch16.map(function(p) { return p.id; });" + CRLF +
  "  panel._batch31Ids = batch31Kapal.concat(batch31Stk).map(function(p) { return p.id; });",

  'NSE batch logic'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Validate and run**

```bash
node --check patch_sal2.js
node patch_sal2.js
```

Expected: `OK: NSE batch logic` / `Done. 1 replacements made.`

- [ ] **Step 3: Verify in browser**

If no NSE project exists, create a test one: Admin → Proyek → Tambah Stockpile, Prefix = NSE, Pemberi Kerja = NSE, with an `end_date` day ≤ 15.

Then open Proyek → Ringkasan:
1. NSE project with `end_date` day ≤ 15 → appears in **Batch 16** card, not Batch 31
2. NSE project with `end_date` day > 15 → appears in **Batch 31** card
3. Non-NSE stockpile (e.g., KCN prefix) → still only in Batch 31 regardless of `end_date`
4. Regular kapal projects → unchanged behavior

- [ ] **Step 4: Commit**

```bash
git add patch_sal2.js index.html
git commit -m "feat(sal2): NSE stockpile split Batch 16/31 like kapal"
```

---

### Task 3: Batch Excel export

**Files:**
- Create: `patch_sal3.js`
- Modify: `index.html` (via patch)

**Interfaces:**
- Consumes:
  - `panel._ringkasanProjects`, `panel._batch16Ids`, `panel._batch31Ids`, `panel._monthYear` (set by `renderProyekRingkasan`)
  - `calcKapalTonnageSplit(units, totalMt)`, `calcKapalRate(shipNum)`, `fetchFillMap(ids)`, `fmtRp(v)` — all existing globals
  - `proyek_kasbon` table: `operator_name, amount` filtered by `month_year`
  - `units` table: `code, operator_name, bank_name, bank_account_number` (added by Task 1)
  - `XLSX` global (SheetJS — already loaded in bundle)
  - Existing line 5844: `h += '<div style="font-size:14px;font-weight:800;color:#1D4ED8;margin-bottom:12px;">Batch 16 - Kapal Selesai Tgl 1-15</div>';`
  - Existing line 5860: `h += '<div style="font-size:14px;font-weight:800;color:#16A34A;margin-bottom:12px;">Batch 31 - Kapal Tgl 16-31 + Semua Stockpile + Gaji Pokok</div>';`
  - Existing line 5919: `async function exportProyekExcel() {`
- Produces:
  - `async function exportBatchExcel(batchType)` — main export function
  - `function exportBatch16()` — wrapper, calls `exportBatchExcel('mid_month')`
  - `function exportBatch31()` — wrapper, calls `exportBatchExcel('end_of_month')`
  - Two download buttons in Ringkasan panel: `onclick="exportBatch16()"` and `onclick="exportBatch31()"`

**Excel file structure:**

| Sheet | Content |
|---|---|
| REKAP | One row per unit per project; Kode, Tanggal, Nama Kapal/Proyek, Kade, Alat, HM Mulai, HM Akhir, Total Jam, BL (Rp), Persentase, Premi, TOTAL; subtotal per project; grand total |
| {unit code} | One sheet per unit (e.g., A1, B5); same columns, filtered to that unit; total row at bottom |
| TRANSFER | No, Nama OP, Unit, Total Kerja, Gaji Pokok, Grand Total, Bank, No. Rekening; grand total row |

Kapal rows: BL = `total_mt_m3 × unit_price`; Persentase = `(allocatedMt/total_mt_m3 × 100).toFixed(2) + '%'`; Premi = `calcKapalRate(ship_number_in_month)`.
Stockpile rows: BL = `hmKerja × 35000`; Persentase = `'STK'`; Premi = `35000`.
TRANSFER Gaji Pokok: `3100000` for Batch 31, `0` for Batch 16.
TRANSFER Grand Total: `Total Kerja + Gaji Pokok − kasbon`.

- [ ] **Step 1: Write patch_sal3.js**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_sal3.js`:

```js
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
        const pct = p.total_mt_m3 > 0 ? (u.allocatedMt / p.total_mt_m3 * 100).toFixed(2) + '%' : '—';
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
        const row = [p.project_code, p.end_date, p.project_code, '—', unitCode, u.hm_awal, u.hm_akhir, hmK, blStk, 'STK', 35000, total];
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
    transferRows.push([no++, name, s.unitCode, s.total, gajiPokok, grand, bInfo.bank_name || '—', bInfo.bank_account_number || '—']);
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
// From line 5844 (single-line, no CRLF needed)
replaceExact(
  'h += \'<div style="font-size:14px;font-weight:800;color:#1D4ED8;margin-bottom:12px;">Batch 16 - Kapal Selesai Tgl 1-15</div>\';',
  'h += \'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-size:14px;font-weight:800;color:#1D4ED8;">Batch 16 - Kapal Selesai Tgl 1-15</div><button onclick="exportBatch16()" style="background:#1D4ED8;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">&#8595; Excel Batch 16</button></div>\';',
  'add Excel Batch 16 button'
);

// ── 3. Add ↓ Excel Batch 31 button in Batch 31 card header ──────────────────
// From line 5860 (single-line, no CRLF needed)
replaceExact(
  'h += \'<div style="font-size:14px;font-weight:800;color:#16A34A;margin-bottom:12px;">Batch 31 - Kapal Tgl 16-31 + Semua Stockpile + Gaji Pokok</div>\';',
  'h += \'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><div style="font-size:14px;font-weight:800;color:#16A34A;">Batch 31 - Kapal Tgl 16-31 + Semua Stockpile + Gaji Pokok</div><button onclick="exportBatch31()" style="background:#16A34A;color:white;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">&#8595; Excel Batch 31</button></div>\';',
  'add Excel Batch 31 button'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Check from-strings exist in the file**

Before running, verify the two button from-strings are present:

```bash
grep -c "Batch 16 - Kapal Selesai Tgl 1-15" index.html
grep -c "Batch 31 - Kapal Tgl 16-31 + Semua Stockpile" index.html
```

Both should print `1`. If not, read the actual lines from index.html and adjust the from-strings accordingly.

- [ ] **Step 3: Validate and run**

```bash
node --check patch_sal3.js
node patch_sal3.js
```

Expected:
```
OK: insert exportBatchExcel + wrappers
OK: add Excel Batch 16 button
OK: add Excel Batch 31 button
Done. 3 replacements made.
```

- [ ] **Step 4: Smoke-test JS syntax**

Extract the script block and check for syntax errors:

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const start = html.lastIndexOf('<script');
const end = html.lastIndexOf('</script>');
const src = html.slice(html.indexOf('>',start)+1, end);
require('fs').writeFileSync('_tmp_check.js', src);
" && node --check _tmp_check.js && echo "SYNTAX OK" && del _tmp_check.js
```

Expected: `SYNTAX OK`. If it fails, read the error line and fix the patch.

- [ ] **Step 5: Verify REKAP sheet in browser**

1. Open Proyek → Ringkasan Gaji (choose a month with kapal and stockpile projects)
2. Confirm two new buttons appear: **↓ Excel Batch 16** (blue) and **↓ Excel Batch 31** (green)
3. Click **↓ Excel Batch 16** → file downloads as `Batch16_YYYYMM.xlsx`
4. Open file in Excel/LibreOffice. Check **REKAP** sheet:
   - One row per unit per project; sorted by date
   - Kapal rows: BL column = total ship income in Rp; Persentase = XX.XX%; Premi = 175 or 200; TOTAL = allocatedMt × rate
   - Stockpile rows: Persentase = "STK"; Premi = 35000; TOTAL = HM × 35000
   - Subtotal row (bold) after each project
   - Grand total row at end
5. Check each **unit sheet** (A1, B3, etc.) — same columns, only rows for that unit, total at bottom
6. Check **TRANSFER** sheet — one row per operator, Gaji Pokok = 0 (Batch 16), Grand Total = Total Kerja + 0 − kasbon

- [ ] **Step 6: Verify Batch 31 and cross-check numbers**

1. Click **↓ Excel Batch 31** → file downloads as `Batch31_YYYYMM.xlsx`
2. TRANSFER sheet: Gaji Pokok = 3,100,000 per operator
3. If any operator has kasbon: Grand Total = Total Kerja + 3,100,000 − kasbon
4. Pick one operator from TRANSFER. Sum their rows in REKAP. Confirm Total Kerja matches.
5. Verify sum of all Grand Total rows in TRANSFER = the grand total row at the bottom.

- [ ] **Step 7: Commit**

```bash
git add patch_sal3.js index.html
git commit -m "feat(sal3): batch Excel export — REKAP + per-unit sheets + TRANSFER list"
```

---

## Report file

Write your full report to: `.superpowers/sdd/2026-08-16-kapal-salary-batch-export/task-N-report.md`

Return only: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), commit hash, one-line test summary, and concerns.
