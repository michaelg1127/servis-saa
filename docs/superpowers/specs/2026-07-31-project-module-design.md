# Project Module (Proyek) — Design Spec

**Date:** 2026-07-31  
**Project:** SERVIS SAA — servis-saa.vercel.app  
**Author:** Brainstorming session with Michael

---

## Overview

Add an admin-only **Proyek** module to SERVIS SAA that tracks excavator jobs across two types — **Kapal** (ship unloading) and **Stockpile** (land-based). The module calculates operator salaries, fuel consumption, project income and profit yield, invoice closure status, and HM (engine hour) continuity per unit.

This replaces the BULK V8 Google Sheet workflow entirely (Option A — full DB module). All data is entered in SERVIS SAA; no Google Sheets integration.

---

## Global Constraints

- **NEVER use the Edit tool on `index.html` JS sections** — corrupts U+0027 apostrophes to curly/smart quotes, silently breaks the entire `<script>` block (app shows permanent loading spinner for all users)
- All JS edits via Node.js patch scripts using `replaceFn` (brace-depth traversal) and `replaceExact` (count-verified find-replace)
- `index.html` uses **CRLF (`\r\n`) line endings** — all multi-line `replaceExact` match strings MUST use `\r\n`, not `\n`
- Verify every patch with `node --check index.html` after application
- Admin-only: Proyek nav item and all screens must not appear in SPV, Operator, or MKN views
- Solar tank capacity per unit: **320 liters**
- Base salary per operator: **Rp 3,100,000/month** (added on top of job-based salary in Ringkasan)
- Ship rate tiers reset to zero every **calendar month** (keyed on `month_year` field, e.g. `'2026-08'`)
- Units are the same 23 excavators already in SERVIS SAA (K1, K3, K5 … TEST)

---

## Database Schema

### Table: `projects`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| project_code | text | NOT NULL, UNIQUE | Auto-generated for Kapal; manual for Stockpile |
| type | text | CHECK IN ('kapal','stockpile') | |
| nama_kapal | text | nullable | Kapal only; vessel/ship name (e.g. "MV Sumber Jaya") |
| pemberi_kerja | text | NOT NULL | Client / job owner (e.g. "KCN", "ADM") |
| kade | text | nullable | Kapal only; berth/quay location |
| start_date | date | NOT NULL | |
| end_date | date | NOT NULL | |
| month_year | text | NOT NULL | Format: `'2026-08'` — for ship count + rate tier |
| ship_number_in_month | int | nullable | Kapal only; auto-counted at insert time |
| cargo_type | text | nullable | Kapal only |
| total_mt_m3 | numeric | nullable | Kapal only; total tonnage/volume |
| unit_price | numeric | nullable | Kapal only; revenue charged to client per MT/M3 |
| harga_solar_rpl | numeric | nullable | Kapal only; fuel price per liter (manual input) |
| invoice_number | text | nullable | Kapal only; null = OPEN, filled = CLOSED |
| code_prefix | text | nullable | Stockpile only; client prefix e.g. 'KCN', 'ADM' |
| code_seq | int | nullable | Stockpile only; e.g. 1, 22, 23 |
| notes | text | nullable | |
| created_at | timestamptz | default now() | |

**RLS:** Admin full access (SELECT, INSERT, UPDATE, DELETE). All other roles: no access.

**Project code logic:**
- Kapal: `M{MM}-{SSS}` where MM = zero-padded month, SSS = zero-padded count of Kapal projects in same `month_year` + 1. Auto-generated on INSERT. Example: `M08-001`.
- Stockpile: `{code_prefix}-{code_seq_padded}`. Admin inputs prefix (e.g. "KCN") and sequence (e.g. 1) separately; system formats as `KCN-001`. Stored in `project_code` as the combined string.

### Table: `project_units`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PK, default gen_random_uuid() | |
| project_id | uuid | NOT NULL, FK → projects(id) ON DELETE CASCADE | |
| unit_id | uuid | NOT NULL, FK → units(id) | |
| hm_awal | numeric | NOT NULL | Engine hours at job start |
| hm_akhir | numeric | NOT NULL | Engine hours at job end |
| solar_awal_pct | smallint | NOT NULL, CHECK 0-100 | Tank gauge % before job |
| solar_akhir_pct | smallint | NOT NULL, CHECK 0-100 | Tank gauge % after job |
| solar_isi_liters | numeric | NOT NULL, default 0 | Liters refilled mid-job (manual input) |
| hm_gap_reason | text | nullable | Required when a gap exists between this unit's previous HM Akhir and this HM Awal |
| created_at | timestamptz | default now() | |

**RLS:** Same as `projects` — admin full access, all other roles no access.

---

## Derived Calculations (frontend only — never stored)

### Solar Consumed per Unit
```
solar_liters = (solar_awal_pct - solar_akhir_pct) / 100 × 320 + solar_isi_liters
```

### Kapal — HM Worked per Unit
```
hm_worked = hm_akhir - hm_awal
```

### Kapal — Ship Rate Tier
Based on `ship_number_in_month` for the project:
- Ships 1–15: **Rp 175/MT**
- Ships 16–30: **Rp 200/MT**
- Ships > 30: **Rp 225/MT**

### Kapal — Tonnage Split Among Units
1. Calculate median HM worked across all units on the project
2. Check if all units are within ±25% of median:
   - All within ±25% → each unit gets `total_mt_m3 / unit_count` (equal split)
   - Any unit outside ±25% → each unit gets `total_mt_m3 × (unit_hm / total_hm_all_units)` (proportional split)
3. Unit salary from tonnage: `allocated_mt × rate_per_mt`

### Stockpile — Unit Salary
```
unit_salary = (hm_akhir - hm_awal) × 35,000
```

### Analisis Biaya (Kapal only)
```
income        = total_mt_m3 × unit_price
total_hm      = sum of (hm_akhir - hm_awal) across all units
fuel_cost     = sum of solar_consumed per unit × harga_solar_rpl
labor_cost    = sum of unit salaries (after tonnage split)
profit        = income - fuel_cost - labor_cost
yield_per_hm  = profit / total_hm
```

### Ringkasan — Monthly Salary per Operator
```
operator_total = sum of unit salaries across all projects (Kapal + Stockpile) in month + 3,100,000
```

---

## HM Continuity

**Purpose:** Detect unbilled machine hours between projects for each unit. Ensure every HM is either billed to a project or has a documented reason.

**Detection logic (at project save time):**
- For each unit being added to a project, query `project_units` for that unit's most recent previous entry (highest `hm_akhir` before this `hm_awal`)
- If previous `hm_akhir` < this `hm_awal` → gap exists (unbilled hours)
- Gap size = `this hm_awal - previous hm_akhir`
- Block save until `hm_gap_reason` is filled for that unit

**Kontinuitas HM tab** (read-only, 5th sub-tab in Proyek):
- Unit dropdown (all 23 units)
- Chronological table sorted by HM ascending:
  - **Project rows** (green background): Project Code, Type, HM Awal → HM Akhir, HM Duration, Date, SPK
  - **Gap rows** (red background): "GAP", HM From → HM To, Gap Size (HM), Reason
- Footer: Billed HM total vs Gap HM total

---

## UI Screens

### Admin Navigation
Add **"Proyek"** to admin sidebar nav (desktop) and mobile drawer. Admin-only — hidden from all other roles.

`switchAdmin('proyek')` → shows `#admin-screen-proyek` div → calls `initProyekModule()` (lazy, once).

### Sub-tabs (5 total)
`switchProyekTab(tab)` — manages active tab state.

1. **Kapal** — project list table + add button
2. **Stockpile** — project list table + add button  
3. **Ringkasan** — monthly salary summary + Excel export
4. **Analisis Biaya** — Kapal cost/profit analysis with invoice tracking
5. **Kontinuitas HM** — per-unit HM timeline

### Kapal Tab
- Table columns: Project Code | Nama Kapal | Pemberi Kerja | Kade | Date Range | Ship # | Units | Total HM | MT/M3 | Total Salary | Status
- Click row → expandable detail panel showing per-unit breakdown (unit code, HM worked, MT allocated, salary, solar used)
- **"+ Tambah Kapal"** button → Add Kapal modal

**Add Kapal Modal:**
- Fields: Nama Kapal (text), Pemberi Kerja (text), Kade (text), Jenis Kargo, Total MT/M3, Unit Price (Rp/MT), Harga Solar (Rp/L), Start Date, End Date
- Unit rows: multi-select from existing units; each row: Unit (dropdown) | HM Awal | HM Akhir | Solar Awal % | Solar Akhir % | Solar Isi (L)
- "+ Tambah Unit" button to add more unit rows
- Project code auto-previewed as readonly field (e.g. "M08-003")
- **HM Continuity check:** on blur of each HM Awal field, system fetches last HM Akhir for that unit. If gap detected → inline red warning: "GAP: X HM tidak terbilang dari HM [prev] ke [this]. Berikan alasan:" → required text input appears. Save blocked until filled.
- Save → insert `projects` record (with `ship_number_in_month` auto-counted) + all `project_units` records

### Stockpile Tab
- Table columns: Project Code | Pemberi Kerja | Date Range | Units | Total HM | Total Salary
- Click row → expandable detail (unit code, HM worked, salary, solar used)
- **"+ Tambah Stockpile"** button → Add Stockpile modal

**Add Stockpile Modal:**
- Fields: Pemberi Kerja (text), Code Prefix (text, e.g. "KCN"), Sequence (number), Start Date, End Date
- Project code preview: `{PREFIX}-{SEQ_PADDED}` (e.g. "KCN-001")
- Unit rows: same structure as Kapal (HM Awal, HM Akhir, Solar fields)
- Same HM Continuity check

### Ringkasan Tab
- Month picker (defaults to current month)
- Per-operator table: Operator Name | Kapal Salary | Stockpile Salary | Total Job Salary | Base (Rp 3,100,000) | Grand Total
- **"Export Excel"** button → generates 3-sheet workbook via SheetJS

### Analisis Biaya Tab (Kapal only)
- Month picker
- Filter pills: **Semua | Open | Closed**
- Table columns: Invoice # | Project Code | Nama Kapal | Pemberi Kerja | Kade | Total HM | Income | Fuel Cost | Labor Cost | Profit | Yield/HM | Status
- **OPEN** rows (no invoice number): orange "OPEN" badge + "Add Invoice" button → inline input → on save, updates `invoice_number`, row turns CLOSED (green badge)
- **CLOSED** rows: green "CLOSED" badge, invoice number shown in Invoice # column
- Summary row: totals for Income, Fuel Cost, Labor Cost, Profit; average Yield/HM

### Kontinuitas HM Tab
- Unit dropdown selector
- Chronological table (sorted by HM asc):
  - Project row (green): Code | Type | HM Awal | HM Akhir | HM Duration | Date | SPK
  - Gap row (red): "GAP" | — | HM From | HM To | Gap HM | Reason
- Footer: "Total Terbilang: X HM | Total Gap: Y HM"

---

## Excel Export (Ringkasan Tab)

Via SheetJS CDN (`https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js`).

**Sheet 1 — Kapal Projects:**
Columns: Project Code | Nama Kapal | Pemberi Kerja | Kade | Ship # | Date | Cargo | Total MT/M3 | Unit Price | Unit | HM Awal | HM Akhir | HM Worked | MT Allocated | Rate (Rp/MT) | Salary | Solar Used (L)

**Sheet 2 — Stockpile Projects:**
Columns: Project Code | Pemberi Kerja | Date | Unit | HM Awal | HM Akhir | HM Worked | Salary | Solar Used (L)

**Sheet 3 — Salary Summary:**
Columns: Operator Name | Kapal Salary | Stockpile Salary | Total Job Salary | Base Salary | Grand Total

Filename: `Proyek_{YYYY-MM}.xlsx`

---

## Implementation Notes

### Patch Script Pattern
All JS changes follow the established patch script pattern:
- Create `patch_proyek1.js`, `patch_proyek2.js` etc. as needed
- Use `replaceFn(name, isAsync, newBody)` for full function replacements
- Use `replaceExact(from, to, desc)` for targeted insertions (with `\r\n` line endings)
- Run `node patch_proyekN.js && node --check index.html` after each script
- Commit after each successful patch

### SheetJS
If SheetJS CDN script tag is not already present in `index.html`, add it alongside other CDN scripts in the `<head>`. Check first with grep before adding.

### Supabase RLS SQL
```sql
-- projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_projects" ON public.projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- project_units table  
ALTER TABLE public.project_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_project_units" ON public.project_units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Key JS Globals to Add
```js
let proyekTab = 'kapal';          // active sub-tab
let proyekKapalData = [];         // cached kapal projects
let proyekStockpileData = [];     // cached stockpile projects
let proyekMonthFilter = '';       // YYYY-MM for ringkasan/analisis
let proyekHMUnitId = null;        // selected unit for kontinuitas tab
```

---

## Open Questions / Deferred
- None. All design decisions resolved.

---

## Spec Self-Review Checklist
- [x] All 5 sub-tabs specified with full column lists
- [x] All DB columns listed with types and constraints (nama_kapal, pemberi_kerja, kade added; spk removed)
- [x] Kapal rate tiers specified (175/200/225, monthly reset)
- [x] Tonnage split logic (±25% median rule) fully specified
- [x] Solar formula includes mid-project refill
- [x] HM Continuity: detection logic + forced reason + Kontinuitas tab
- [x] Invoice tracking: OPEN/CLOSED states + inline add flow
- [x] Analisis Biaya formula: income, fuel cost, labor cost, profit, yield/HM
- [x] Stockpile excluded from Analisis Biaya
- [x] Project code formats: M08-001 (Kapal auto) vs KCN-001 (Stockpile manual)
- [x] Base salary Rp 3,100,000 included in Ringkasan
- [x] Patch script constraints documented
- [x] RLS SQL included
- [x] SheetJS export: 3 sheets with column specs
- [x] Admin-only access enforced
