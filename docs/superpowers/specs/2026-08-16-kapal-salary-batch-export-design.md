# Kapal Salary Batch Export & NSE Fix Design

**Date:** 2026-08-16
**Status:** Approved
**Approach:** Three surgical patches on index.html — DB migration + bank fields, NSE batch logic, batch Excel export

---

## 1. Data Model

### New DB columns

```sql
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
```

No other schema changes. `code_prefix` already exists on `projects` and is fetched via `*` in `loadProyekRingkasan`. `end_date` already exists on projects for batch assignment.

---

## 2. NSE Batch Assignment

### Current behavior

All `type = 'stockpile'` projects go into **Batch 31** regardless of `end_date`.

### New behavior

If a stockpile project has `code_prefix = 'NSE'`, it is treated like a kapal project for batch assignment:

| Project type | `end_date` day | Batch |
|---|---|---|
| kapal | ≤ 15 | 16 |
| kapal | > 15 | 31 |
| stockpile, prefix = NSE | ≤ 15 | 16 |
| stockpile, prefix = NSE | > 15 | 31 |
| stockpile, prefix ≠ NSE | any | 31 |

### Salary formula

NSE salary is unchanged: `HM × 35,000` (same as regular stockpile).

### Code change location

In `renderProyekRingkasan`, the three `batch16` / `batch31Kapal` / `batch31Stk` filter lines are replaced. A helper `isNSE(p)` is introduced locally:

```js
function isNSE(p) { return p.type === 'stockpile' && p.code_prefix === 'NSE'; }
const batch16     = unpaid.filter(p => (p.type==='kapal' || isNSE(p)) && dayOf(p.end_date) <= 15);
const batch31Kapal = unpaid.filter(p => (p.type==='kapal' || isNSE(p)) && dayOf(p.end_date) > 15);
const batch31Stk  = unpaid.filter(p => p.type==='stockpile' && !isNSE(p));
```

The `buildOpMap` salary calculation is unchanged — NSE stockpile is still `type = 'stockpile'` so it takes the `HM × 35,000` branch.

---

## 3. Bank Info on Unit Edit Form

Two optional fields added to the admin unit-edit modal, below the existing fields and above the save button:

- **Nama Bank** — text input, e.g. "BCA", "BRI", "Mandiri"
- **No. Rekening** — text input, e.g. "1234567890"

Pre-populated from the existing unit record on modal open. Written to `units.bank_name` and `units.bank_account_number` on save. If left blank, stored as `NULL`; displayed as "—" in the Transfer sheet.

---

## 4. Batch Excel Export

### Trigger

Two new buttons added to the **Ringkasan Gaji** panel:

- In the Batch 16 card header: **↓ Excel Batch 16** → calls `exportBatchExcel('mid_month')`
- In the Batch 31 card header: **↓ Excel Batch 31** → calls `exportBatchExcel('end_of_month')`

File names: `Batch16_YYYYMM.xlsx` / `Batch31_YYYYMM.xlsx`

### Sheet 1 — REKAP (mirrors PDF page 1)

One row per unit per project. Projects sorted by `end_date`. Columns:

| Kode | Tanggal | Nama Kapal / Proyek | Kade | Alat | HM Mulai | HM Akhir | Total Jam | BL (Rp) | Persentase | Premi | TOTAL |
|--|--|--|--|--|--|--|--|--|--|--|--|

**Kapal rows:**
- BL = `total_mt_m3 × unit_price`
- Persentase = `allocatedMt / total_mt_m3` formatted as `"XX.XX%"`
- Premi = `calcKapalRate(ship_number_in_month)`
- TOTAL = `Math.round(allocatedMt × rate)`

**Stockpile rows (regular and NSE):**
- BL = `hmKerja × 35000`
- Persentase = `"STK"`
- Premi = `35000`
- TOTAL = `Math.round(hmKerja × 35000)`

A **subtotal row** (bold) follows each project group. A **grand total row** at sheet end.

### Sheets 2…N — Per unit code (mirrors PDF pages 2–3)

One sheet per unit code that appears in the batch. Sheet name = unit code (max 31 chars, Excel-safe). Identical columns to REKAP, rows filtered to that unit. Total row at bottom. Rows sorted by `end_date`.

### Sheet TRANSFER (mirrors PDF page 4)

One row per operator, sorted A→Z. Columns:

| No | Nama OP | Unit | Total Kerja | Gaji Pokok | Grand Total | Bank | No. Rekening |
|--|--|--|--|--|--|--|--|

- **Gaji Pokok**: Rp 3,100,000 for Batch 31; Rp 0 for Batch 16
- **Grand Total**: Total Kerja + Gaji Pokok − kasbon (kasbon from `proyek_kasbon` table, Batch 31 only)
- **Bank / No. Rekening**: from `units.bank_name` / `units.bank_account_number`; shows "—" if null
- Grand total row at bottom summing Grand Total column

### Data fetched inside `exportBatchExcel`

- Fill map: `fetchFillMap(projectIds)` — for completeness, solar calculation (not shown in Excel but consistent with other exports)
- Kasbon: `sb.from('proyek_kasbon').select('operator_name, amount').eq('month_year', monthYear)` — only for Batch 31
- Bank info: `sb.from('units').select('code, operator_name, bank_name, bank_account_number')`

---

## 5. What is NOT changing

- `calcKapalTonnageSplit` outlier rule — unchanged; PDF's MITRA 01 row was a manual error
- Regular stockpile salary rate (35,000/HM) — unchanged
- Existing "Export Excel" button — unchanged (still exports all-month summary)
- `markProyekPaid` / `saveProyekKasbon` logic — unchanged

---

## 6. Global Constraints (binding for implementation)

- NEVER use the Edit tool on JS string literals inside `index.html` — all edits via Node.js patch scripts only
- All `replaceExact` match strings must use `\r\n` (CRLF), not `\n`
- Verify every patch script with `node --check` before running
- Run scripts from `C:\Users\upsca\Documents\SERVIS-SAA\`
- Commit after each task
- SheetJS (`XLSX`) is already a global in the app bundle
- `WL_BANGAU_CODES = ['J02','J03']` (450 L), `WL_STD_CODES = ['J45','J46','J47','J48']` (320 L) — unchanged
