# Excel Export Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `exportBatchExcel` in `index.html`: combine per-operator slips into one SLIP GAJI sheet, add slip headers, fix BL column to tonnage, rename Total → Total Pendapatan, add Admin Fee / Net Transfer / Nama Rekening to TRANSFER.

**Architecture:** All changes are patch scripts (`patch_expN.js`) that run `replaceExact` against `index.html`. Four sequential patches: (1) DB + UI form field, (2) export data fetch + unitSheetData structure, (3) SLIP GAJI sheet builder, (4) TRANSFER sheet update. Each patch is independently testable.

**Tech Stack:** Node.js patch scripts, SheetJS (XLSX) already loaded in index.html, Supabase REST API.

## Global Constraints

- All patches modify only `index.html` in `C:\Users\upsca\Documents\SERVIS-SAA\`
- Patch scripts use `replaceExact` — fail loudly on MISS or AMBIGUOUS, never silently corrupt the file
- Line endings in index.html are LF (`\n`) — use `const LF = '\n'` in patch strings
- The existing REKAP sheet must remain byte-for-byte identical — do not touch it
- `bank_account_name` column must exist in Supabase before Task 1 patch is deployed — run the SQL migration first (see Task 1 step 1)
- Sheet named `'SLIP GAJI'` (with space, uppercase) — exactly this string
- Admin Fee logic: `(bInfo.bank_name || '').toUpperCase().includes('BCA')` → 0; else → 2500

---

### Task 1: DB Migration + Nama Rekening UI Field

Add `bank_account_name` column to Supabase `units` table and wire a new "Nama Rekening" input into the unit edit form.

**Files:**
- Modify: `index.html` (lines ~724–727 HTML form, ~3865–3900 JS form functions)
- Create: `patch_exp1.js`

**Interfaces:**
- Produces: `uf-bank-account-name` input in the form; `bank_account_name` saved to Supabase on unit edit; `u.bank_account_name` available when unit data is loaded

- [ ] **Step 1: Run DB migration in Supabase SQL editor**

Open the Supabase dashboard for project `xpecefriamslzidlcsuj`, go to SQL editor, run:

```sql
ALTER TABLE units ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
```

Verify: `SELECT bank_account_name FROM units LIMIT 1;` returns without error.

- [ ] **Step 2: Write patch_exp1.js**

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

const LF = '\n';

// 1. Add Nama Rekening input after No. Rekening field (~line 724)
replaceExact(
  '          <div style="margin-bottom:16px;">' + LF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">No. Rekening</label>' + LF +
  '            <input type="text" id="uf-bank-account" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="Nomor rekening">' + LF +
  '          </div>',

  '          <div style="margin-bottom:12px;">' + LF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">No. Rekening</label>' + LF +
  '            <input type="text" id="uf-bank-account" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="Nomor rekening">' + LF +
  '          </div>' + LF +
  '          <div style="margin-bottom:16px;">' + LF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Nama Rekening</label>' + LF +
  '            <input type="text" id="uf-bank-account-name" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="Nama pemilik rekening">' + LF +
  '          </div>',

  'form: add Nama Rekening input field'
);

// 2. Wire into cancelUnitEdit — clear the new field
replaceExact(
  '  document.getElementById(\'uf-bank-account\').value = \'\';' + LF +
  '  document.getElementById(\'uf-edit-id\').value = \'\';',

  '  document.getElementById(\'uf-bank-account\').value = \'\';' + LF +
  '  document.getElementById(\'uf-bank-account-name\').value = \'\';' + LF +
  '  document.getElementById(\'uf-edit-id\').value = \'\';',

  'cancelUnitEdit: clear uf-bank-account-name'
);

// 3. Wire into openEditUnit — populate from DB value
replaceExact(
  '  document.getElementById(\'uf-bank-account\').value = u.bank_account_number || \'\';' + LF +
  '  document.getElementById(\'uf-edit-id\').value = id;',

  '  document.getElementById(\'uf-bank-account\').value = u.bank_account_number || \'\';' + LF +
  '  document.getElementById(\'uf-bank-account-name\').value = u.bank_account_name || \'\';' + LF +
  '  document.getElementById(\'uf-edit-id\').value = id;',

  'openEditUnit: populate uf-bank-account-name'
);

// 4. Wire into saveUnit — read value and include in update
replaceExact(
  '      const bankName = document.getElementById(\'uf-bank-name\').value.trim() || null;' + LF +
  '      const bankAccount = document.getElementById(\'uf-bank-account\').value.trim() || null;' + LF +
  '      const { error } = await sb.from(\'units\').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null, bank_name: bankName, bank_account_number: bankAccount }).eq(\'id\', editId);',

  '      const bankName = document.getElementById(\'uf-bank-name\').value.trim() || null;' + LF +
  '      const bankAccount = document.getElementById(\'uf-bank-account\').value.trim() || null;' + LF +
  '      const bankAccountName = document.getElementById(\'uf-bank-account-name\').value.trim() || null;' + LF +
  '      const { error } = await sb.from(\'units\').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null, bank_name: bankName, bank_account_number: bankAccount, bank_account_name: bankAccountName }).eq(\'id\', editId);',

  'saveUnit: include bank_account_name in update'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 3: Run patch**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA"
node patch_exp1.js
```

Expected: 4 lines `OK: ...`, then `Done. 4 replacements made.`

- [ ] **Step 4: Verify in browser**

Open `index.html` locally (or `servis-saa.vercel.app`). Go to Admin → Units, click Edit on any unit. Confirm "Nama Rekening" field appears below "No. Rekening". Type a value, click Simpan. Verify no JS error.

- [ ] **Step 5: Commit**

```bash
git add index.html patch_exp1.js
git commit -m "feat(units): add Nama Rekening (bank_account_name) field to unit edit form"
```

---

### Task 2: Export — Data Fetch + unitSheetData Structure + periodeStr

Update the units SELECT to fetch `bank_account_name`, restructure `unitSheetData` from a flat array per code to an object `{ opName, rows, blTons }`, and compute `periodeStr`.

**Files:**
- Modify: `index.html` (inside `exportBatchExcel`, lines ~5942–5984)
- Create: `patch_exp2.js`

**Interfaces:**
- Consumes: `exportBatchExcel(batchType)` with `batchType = 'mid_month' | 'end_of_month'`, `monthYear` from `panel._monthYear`
- Produces:
  - `bankMap[code].bank_account_name` — available for Task 4
  - `unitSheetData[code]` is now `{ opName: string, rows: Array<Array>, blTons: Array<number|string> }` — consumed by Task 3
  - `periodeStr: string` e.g. `'1-15 Agustus 2026'` — consumed by Task 3

- [ ] **Step 1: Write patch_exp2.js**

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

const LF = '\n';

// 1. Update units SELECT to include bank_account_name, add periodeStr after bankMap
replaceExact(
  '  const { data: unitsBank } = await sb.from(\'units\').select(\'code, operator_name, bank_name, bank_account_number\');' + LF +
  '  const bankMap = {};' + LF +
  '  (unitsBank || []).forEach(function(u) { bankMap[u.code] = u; });' + LF +
  '  const wb = XLSX.utils.book_new();',

  '  const { data: unitsBank } = await sb.from(\'units\').select(\'code, operator_name, bank_name, bank_account_number, bank_account_name\');' + LF +
  '  const bankMap = {};' + LF +
  '  (unitsBank || []).forEach(function(u) { bankMap[u.code] = u; });' + LF +
  '  const BULAN_ID = [\'Januari\',\'Februari\',\'Maret\',\'April\',\'Mei\',\'Juni\',\'Juli\',\'Agustus\',\'September\',\'Oktober\',\'November\',\'Desember\'];' + LF +
  '  const _my = (monthYear || \'\').split(\'-\');' + LF +
  '  const periodeStr = batchType === \'mid_month\' ? \'1-15 \' + (BULAN_ID[parseInt(_my[1], 10) - 1] || \'\') + \' \' + _my[0] : \'16-31 \' + (BULAN_ID[parseInt(_my[1], 10) - 1] || \'\') + \' \' + _my[0];' + LF +
  '  const wb = XLSX.utils.book_new();',

  'exportBatchExcel: fetch bank_account_name + add periodeStr'
);

// 2. unitSheetData structure for kapal rows — use surrounding unique context
replaceExact(
  '        const row = [p.project_code, p.end_date, p.nama_kapal || \'\', p.kade || \'\', unitCode, u.hm_awal, u.hm_akhir, hmK, blTotal, pct, rate, total];' + LF +
  '        rekapRows.push(row);' + LF +
  '        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = [];' + LF +
  '        unitSheetData[unitCode].push(row);',

  '        const row = [p.project_code, p.end_date, p.nama_kapal || \'\', p.kade || \'\', unitCode, u.hm_awal, u.hm_akhir, hmK, blTotal, pct, rate, total];' + LF +
  '        rekapRows.push(row);' + LF +
  '        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = { opName: opName, rows: [], blTons: [] };' + LF +
  '        unitSheetData[unitCode].rows.push(row);' + LF +
  '        unitSheetData[unitCode].blTons.push(p.total_mt_m3 || 0);',

  'unitSheetData kapal: restructure to {opName, rows, blTons}'
);

// 3. unitSheetData structure for STK rows
replaceExact(
  '        const row = [p.project_code, p.end_date, p.project_code, \'---\', unitCode, u.hm_awal, u.hm_akhir, hmK, blStk, \'STK\', 35000, total];' + LF +
  '        rekapRows.push(row);' + LF +
  '        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = [];' + LF +
  '        unitSheetData[unitCode].push(row);',

  '        const row = [p.project_code, p.end_date, p.project_code, \'---\', unitCode, u.hm_awal, u.hm_akhir, hmK, blStk, \'STK\', 35000, total];' + LF +
  '        rekapRows.push(row);' + LF +
  '        if (!unitSheetData[unitCode]) unitSheetData[unitCode] = { opName: opName, rows: [], blTons: [] };' + LF +
  '        unitSheetData[unitCode].rows.push(row);' + LF +
  '        unitSheetData[unitCode].blTons.push(\'—\');',

  'unitSheetData STK: restructure to {opName, rows, blTons}'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Run patch**

```bash
node patch_exp2.js
```

Expected: 3 lines `OK: ...`, then `Done. 3 replacements made.`

- [ ] **Step 3: Smoke-check — confirm no JS reference error introduced**

Open browser console on the page. The page should still load without errors. The export buttons will be broken until Task 3 is applied (per-unit loop now reads `.rows` which doesn't exist yet on the old structure) — that's expected and acceptable since Task 3 follows immediately.

- [ ] **Step 4: Commit**

```bash
git add index.html patch_exp2.js
git commit -m "refactor(export): restructure unitSheetData to {opName,rows,blTons}; add periodeStr and bank_account_name fetch"
```

---

### Task 3: Replace Per-Operator Tabs with SLIP GAJI Sheet

Remove the per-operator tab loop and replace it with a single SLIP GAJI sheet builder.

**Files:**
- Modify: `index.html` (lines ~5994–6001, the per-unit sheet loop)
- Create: `patch_exp3.js`

**Interfaces:**
- Consumes:
  - `unitSheetData[code]` = `{ opName: string, rows: Array<Array>, blTons: Array<number|string> }` (from Task 2)
  - `periodeStr: string` (from Task 2)
- Produces: SLIP GAJI worksheet appended to `wb` before TRANSFER

- [ ] **Step 1: Write patch_exp3.js**

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

const LF = '\n';

// Replace per-operator tabs loop with SLIP GAJI combined sheet
replaceExact(
  '  // Per-unit sheets' + LF +
  '  Object.keys(unitSheetData).sort().forEach(function(code) {' + LF +
  '    const rows = [[\'Kode\',\'Tanggal\',\'Nama Kapal / Proyek\',\'Kade\',\'Alat\',\'HM Mulai\',\'HM Akhir\',\'Total Jam\',\'BL (Rp)\',\'Persentase\',\'Premi\',\'TOTAL\']];' + LF +
  '    let unitTotal = 0;' + LF +
  '    unitSheetData[code].forEach(function(r) { rows.push(r); unitTotal += (typeof r[11] === \'number\' ? r[11] : 0); });' + LF +
  '    rows.push([\'\', \'\', \'\', \'\', \'\', \'\', \'TOTAL\', \'\', \'\', \'\', \'\', unitTotal]);' + LF +
  '    const safeName = code.replace(/[:\\\\/\\?*\\[\\]]/g, \'_\').slice(0, 31);' + LF +
  '    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), safeName);' + LF +
  '  });',

  '  // SLIP GAJI — all operators in one sheet' + LF +
  '  var slipRows = [];' + LF +
  '  Object.keys(unitSheetData).sort().forEach(function(code) {' + LF +
  '    var entry = unitSheetData[code];' + LF +
  '    slipRows.push([\'Unit:\', code, \'\', \'Nama Operator:\', entry.opName || code]);' + LF +
  '    slipRows.push([\'Periode:\', periodeStr, \'\', \'\', \'\']);' + LF +
  '    slipRows.push([]);' + LF +
  '    slipRows.push([\'Kode\',\'Tanggal\',\'Nama Kapal / Proyek\',\'Kade\',\'Alat\',\'HM Mulai\',\'HM Akhir\',\'Total Jam\',\'BL (Ton)\',\'Persentase\',\'Premi\',\'Total Pendapatan\']);' + LF +
  '    var unitTotal = 0;' + LF +
  '    entry.rows.forEach(function(r, i) {' + LF +
  '      if (typeof r[11] === \'number\' && r[11] > 0) {' + LF +
  '        var slipRow = r.slice();' + LF +
  '        slipRow[8] = entry.blTons[i];' + LF +
  '        slipRows.push(slipRow);' + LF +
  '        unitTotal += r[11];' + LF +
  '      }' + LF +
  '    });' + LF +
  '    slipRows.push([\'\', \'\', \'\', \'\', \'\', \'\', \'Total Pendapatan\', \'\', \'\', \'\', \'\', unitTotal]);' + LF +
  '    slipRows.push([]);' + LF +
  '    slipRows.push([]);' + LF +
  '  });' + LF +
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(slipRows), \'SLIP GAJI\');',

  'exportBatchExcel: replace per-unit tabs with single SLIP GAJI sheet'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Run patch**

```bash
node patch_exp3.js
```

Expected: `OK: exportBatchExcel: replace per-unit tabs with single SLIP GAJI sheet`, then `Done. 1 replacements made.`

- [ ] **Step 3: Test export in browser**

Open the Ringkasan Gaji screen for a month that has projects. Click "Excel Batch 16" (or Batch 31). Open the downloaded `.xlsx`.

Verify:
- Only 3 sheets: REKAP, SLIP GAJI, TRANSFER (no per-operator tabs)
- SLIP GAJI has operator blocks with header rows (Unit, Nama Operator, Periode)
- Each block has column header "BL (Ton)" and "Total Pendapatan"
- BL (Ton) column shows MT quantity for kapal rows, "—" for STK
- Zero-salary rows are absent from each block
- Footer row shows "Total Pendapatan" label at column G, value at column L
- Periode shows e.g. "1-15 Agustus 2026"
- REKAP sheet is unchanged (BL (Rp) still shows Rp value)

- [ ] **Step 4: Commit**

```bash
git add index.html patch_exp3.js
git commit -m "feat(export): combine operator slips into single SLIP GAJI sheet with headers"
```

---

### Task 4: TRANSFER Sheet — Admin Fee + Net Transfer + Nama Rekening

Update the TRANSFER sheet to add Admin Fee, Net Transfer, and Nama Rekening columns. Update TOTAL row to sum all numeric columns.

**Files:**
- Modify: `index.html` (TRANSFER block inside `exportBatchExcel`, lines ~6003–6017)
- Create: `patch_exp4.js`

**Interfaces:**
- Consumes:
  - `bankMap[code].bank_account_name` (from Task 2 fetch update)
  - `bankMap[code].bank_name` (existing)
  - `opTotals[name].total`, `opTotals[name].unitCode` (existing)
  - `kasbonMap[name]` (existing)
  - `gajiPokok` (existing)
- Produces: TRANSFER sheet with 11 columns; admin fee = 2500 for non-BCA, 0 for BCA

- [ ] **Step 1: Write patch_exp4.js**

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

const LF = '\n';

replaceExact(
  '  // TRANSFER sheet' + LF +
  '  const gajiPokok = batchType === \'end_of_month\' ? 3100000 : 0;' + LF +
  '  const transferRows = [[\'No\',\'Nama OP\',\'Unit\',\'Total Kerja\',\'Gaji Pokok\',\'Grand Total\',\'Bank\',\'No. Rekening\']];' + LF +
  '  let no = 1;' + LF +
  '  let transferGrand = 0;' + LF +
  '  Object.keys(opTotals).sort().forEach(function(name) {' + LF +
  '    const s = opTotals[name];' + LF +
  '    const kasbon = kasbonMap[name] || 0;' + LF +
  '    const grand = s.total + gajiPokok - kasbon;' + LF +
  '    const bInfo = bankMap[s.unitCode] || {};' + LF +
  '    transferRows.push([no++, name, s.unitCode, s.total, gajiPokok, grand, bInfo.bank_name || \'---\', bInfo.bank_account_number || \'---\']);' + LF +
  '    transferGrand += grand;' + LF +
  '  });' + LF +
  '  transferRows.push([\'\', \'TOTAL\', \'\', \'\', \'\', transferGrand, \'\', \'\']);' + LF +
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transferRows), \'TRANSFER\');',

  '  // TRANSFER sheet' + LF +
  '  const gajiPokok = batchType === \'end_of_month\' ? 3100000 : 0;' + LF +
  '  const transferRows = [[\'No\',\'Nama OP\',\'Unit\',\'Total Kerja\',\'Gaji Pokok\',\'Grand Total\',\'Admin Fee\',\'Net Transfer\',\'Bank\',\'No. Rekening\',\'Nama Rekening\']];' + LF +
  '  let no = 1;' + LF +
  '  let trTotKerja = 0, trTotPokok = 0, trTotGrand = 0, trTotFee = 0, trTotNet = 0;' + LF +
  '  Object.keys(opTotals).sort().forEach(function(name) {' + LF +
  '    const s = opTotals[name];' + LF +
  '    const kasbon = kasbonMap[name] || 0;' + LF +
  '    const grand = s.total + gajiPokok - kasbon;' + LF +
  '    const bInfo = bankMap[s.unitCode] || {};' + LF +
  '    const isBCA = (bInfo.bank_name || \'\').toUpperCase().includes(\'BCA\');' + LF +
  '    const adminFee = isBCA ? 0 : 2500;' + LF +
  '    const netTransfer = grand - adminFee;' + LF +
  '    transferRows.push([no++, name, s.unitCode, s.total, gajiPokok, grand, adminFee, netTransfer, bInfo.bank_name || \'---\', bInfo.bank_account_number || \'---\', bInfo.bank_account_name || \'---\']);' + LF +
  '    trTotKerja += s.total; trTotPokok += gajiPokok; trTotGrand += grand; trTotFee += adminFee; trTotNet += netTransfer;' + LF +
  '  });' + LF +
  '  transferRows.push([\'\', \'TOTAL\', \'\', trTotKerja, trTotPokok, trTotGrand, trTotFee, trTotNet, \'\', \'\', \'\']);' + LF +
  '  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transferRows), \'TRANSFER\');',

  'TRANSFER: add Admin Fee, Net Transfer, Nama Rekening columns'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Run patch**

```bash
node patch_exp4.js
```

Expected: `OK: TRANSFER: add Admin Fee, Net Transfer, Nama Rekening columns`, then `Done. 1 replacements made.`

- [ ] **Step 3: Test TRANSFER sheet**

Export a batch Excel. Open TRANSFER sheet. Verify:
- 11 columns: No, Nama OP, Unit, Total Kerja, Gaji Pokok, Grand Total, Admin Fee, Net Transfer, Bank, No. Rekening, Nama Rekening
- BCA operators (e.g. those with bank_name = "BCA"): Admin Fee = 0, Net Transfer = Grand Total
- Non-BCA operators (BRI, BNI, Mandiri, SeaBank): Admin Fee = 2500, Net Transfer = Grand Total − 2500
- TOTAL row sums all 5 numeric columns (Total Kerja, Gaji Pokok, Grand Total, Admin Fee, Net Transfer)
- Nama Rekening shows value if entered, "---" if not yet filled

- [ ] **Step 4: Push and deploy**

```bash
git add index.html patch_exp4.js
git commit -m "feat(export): TRANSFER sheet — add Admin Fee, Net Transfer, Nama Rekening columns"
git push origin master
```

Expected: Vercel auto-deploys within ~60 seconds.

- [ ] **Step 5: Post-deploy — populate Nama Rekening for all operators**

Go to Admin → Units, edit each unit, fill in "Nama Rekening" from the bank list:

| No. Rekening | Nama Rekening |
|---|---|
| 1916816738 | Daniel Eko Prabowo |
| 5735513963 | Rista Astuti |
| 6255084988 | M. Nur |
| 059701037275504 | Unus Nugraha |
| 4921521841 | Ali Imron |
| 747801002531536 | Ramdanah |
| 901423938368 | Muhamad Aldi |
| 426401019047530 | Asmanto |
| 322701048414537 | Sigit Prastio |
| 1247538814 | Mukri Turmudi |
| 4140879067 | Topik Rohman |
| 1760005430440 | Diky Muzaky |
| 60501080667509 | Egi Adi Putra |
| 6600478824 | Rian Muklis |
| 8001092393532 | Siti Mulyanah |
| 814101009135531 | Marfuah |
| 785701018341537 | Peni Rahayu |
| 5335281133 | Fahmi Fahror Rozi |
| 430001037516533 | Wili Sangra |
| 741101003576509 | Ahmad Sobari |
| 599401002540531 | Kartini |

Re-export a batch Excel and verify Nama Rekening column is populated.
