# Excel Export Improvements — Design Spec

## Goal

Improve the `exportBatchExcel` output: combine per-operator salary slips into one sheet, add slip headers, fix BL column to show tonnage, rename Total → Total Pendapatan, and add Admin Fee / Net Transfer / Nama Rekening to the TRANSFER sheet.

---

## 1. DB Change — New Column

Add `bank_account_name TEXT` to the `units` table in Supabase.

Run via Supabase SQL editor:
```sql
ALTER TABLE units ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
```

No default, nullable. Existing rows stay NULL until edited.

---

## 2. UI Change — Unit Edit Form (Admin screen)

Add a new input field **"Nama Rekening"** (id `uf-bank-account-name`) immediately after the existing "No. Rekening" field (line ~726 in index.html).

```html
<div style="margin-bottom:12px;">
  <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Nama Rekening</label>
  <input type="text" id="uf-bank-account-name" class="finput"
         style="font-size:14px;padding:10px 12px;" placeholder="Nama pemilik rekening">
</div>
```

Wire it up in three places:

| Location | Action |
|---|---|
| `openAddUnitForm()` / clear form | set `uf-bank-account-name` to `''` |
| `openEditUnit(u)` / populate form | set `uf-bank-account-name` to `u.bank_account_name \|\| ''` |
| `saveUnit()` / update call | include `bank_account_name: bankAccountName \|\| null` |

---

## 3. Export — Data Fetch

In `exportBatchExcel`, update the units SELECT to include `bank_account_name`:

```js
const { data: unitsBank } = await sb.from('units')
  .select('code, operator_name, bank_name, bank_account_number, bank_account_name');
```

---

## 4. Export — Sheet Structure

**Before:** REKAP + one tab per operator code + TRANSFER

**After:** REKAP + **SLIP GAJI** (single combined sheet) + TRANSFER

REKAP sheet: unchanged.

---

## 5. SLIP GAJI Sheet

Replace all per-operator tabs with one sheet named `SLIP GAJI`.

### Layout — per operator block

For each operator (sorted by unit code):

```
Row 1:  "Unit:"    | <unitCode>   |  |  "Nama Operator:"  | <opName>
Row 2:  "Periode:" | <periodeStr> |  |                    |
Row 3:  (blank)
Row 4:  [header row]
Row 5+: [data rows — skip rows where Total Pendapatan = 0]
Row N:  (empty) | (empty) | ... | "Total Pendapatan" | (empty) | (empty) | (empty) | <unitTotal>
(2 blank separator rows)
```

### Header row (row 4)
```
Kode | Tanggal | Nama Kapal / Proyek | Kade | Alat | HM Mulai | HM Akhir | Total Jam | BL (Ton) | Persentase | Premi | Total Pendapatan
```

### BL (Ton) column (index 8)
- **Kapal rows:** `p.total_mt_m3` (numeric, total ship tonnage)
- **Stockpile rows:** `'—'` (string dash, stockpile has no tonnage)

### Total Pendapatan column (index 11)
Same value as before (`Math.round(u.allocatedMt * rate)` for kapal, `Math.round(hmK * 35000)` for STK).

Column header renamed from `"TOTAL"` to `"Total Pendapatan"` everywhere in this sheet.

Footer row label also changed from `"TOTAL"` to `"Total Pendapatan"`.

### Periode string

```js
const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
const [yr, mo] = monthYear.split('-');
const bulan = BULAN_ID[parseInt(mo, 10) - 1];
const periodeStr = batchType === 'mid_month'
  ? `1-15 ${bulan} ${yr}`
  : `16-31 ${bulan} ${yr}`;
```

---

## 6. TRANSFER Sheet

### Columns (in order)

| # | Column | Notes |
|---|---|---|
| 1 | No | row number |
| 2 | Nama OP | operator name |
| 3 | Unit | unit code |
| 4 | Total Kerja | kapal + STK salary sum |
| 5 | Gaji Pokok | 3,100,000 for Batch 31, 0 for Batch 16 |
| 6 | Grand Total | Total Kerja + Gaji Pokok − Kasbon |
| 7 | Admin Fee | 2,500 if bank is not BCA; 0 if BCA |
| 8 | Net Transfer | Grand Total − Admin Fee |
| 9 | Bank | bank_name |
| 10 | No. Rekening | bank_account_number |
| 11 | Nama Rekening | bank_account_name |

### Admin Fee logic

```js
const isBCA = (bInfo.bank_name || '').toUpperCase().includes('BCA');
const adminFee = isBCA ? 0 : 2500;
const netTransfer = grand - adminFee;
```

### TOTAL row

Sum columns: Total Kerja, Gaji Pokok, Grand Total, Admin Fee, Net Transfer.
Bank / No. Rekening / Nama Rekening cells in TOTAL row are blank.

---

## 7. REKAP sheet

No changes. Column 9 (`BL (Rp)`) stays as the rupiah amount — REKAP is a project-level accounting view, not a slip.

---

## 8. Files to modify

| File | Change |
|---|---|
| `index.html` | DB migration SQL (comment / instruction), unit form HTML, `openAddUnitForm`, `openEditUnit`, `saveUnit`, `exportBatchExcel` |

All changes are in `index.html`. No new files.
