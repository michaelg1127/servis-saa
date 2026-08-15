# Woodlog Kapal — Feature Improvements Design

**Date:** 2026-08-15  
**Status:** Approved  
**Approach:** Surgical patch (Approach A) — trim Add modal, add Edit modal, repurpose Tutup modal, extend list table

---

## 1. Data Model

### New DB column
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(15,2);
```

No other schema changes required. `solar_awal_pct`, `solar_akhir_pct` already exist on `project_units`. `end_date` and `invoice_number` already exist on `projects`.

### Project Status (derived, not stored)

| State | Condition | Badge |
|---|---|---|
| Berjalan | `end_date IS NULL` | 🟡 orange |
| Selesai | `end_date IS NOT NULL` AND `invoice_number IS NULL` | 🔵 blue |
| Tutup | `invoice_number IS NOT NULL` | 🟢 green |

---

## 2. Add Modal — Trim Only (`openAddWoodlogKapalModal`)

### Remove
- STD tonnage input fields (entire "Salary STD — input manual tonnage" section)
- `invoice_number` input field

### Add
- STD operator section replaced with read-only note: *"Salary STD dihitung saat Edit proyek."*

### Keep unchanged
- Nama Kapal, Pemberi Kerja, Tgl Mulai, BL Tonnage, Rate/MT, Harga Solar, Notes
- Unit checkboxes with HM Awal + Solar Awal% per unit
- Bangau salary auto-preview (computed from BL tonnage)

### `submitAddWoodlogKapal` change
- Remove WL_STD_OPS salary inserts — STD salary rows are created/overwritten on Edit save
- Bangau salary inserts at Add time remain (using BL entered at Add) — they will be overwritten on first Edit save

---

## 3. Edit Modal — New (`openEditWoodlogKapalModal` + `submitEditWoodlogKapal`)

Triggered by new **Edit** button in the Kapal list. Available in all three project states.

### Modal sections

**Section 1 — Project Info** (all editable)
- Nama Kapal, Pemberi Kerja
- Tgl Mulai, Tgl Selesai (setting Tgl Selesai → project becomes Selesai)
- BL Tonnage (MT), Rate/MT (Rp), Harga Solar (Rp/L)
- Notes

**Section 2 — Unit HM + Solar** (per unit, all editable — existing units only, no add/remove)
WL unit roster is fixed (J02, J03, J45–J48). Edit only updates data for units already attached to the project.
Per unit row:
- HM Awal, HM Akhir
- Solar Awal%, Solar Akhir%
- Solar Isi (read-only — derived from `fuel_dispenses` actuals for this unit+project)

**Section 3 — Salary** (auto-recalculate on save)
- Bangau operators (J02/J03): salary preview = BL × 0.9 / 4 × 800, shown per operator (read-only preview)
- STD operators (J45–J48): tonnage input per operator → salary preview = tonnage × 750

### `submitEditWoodlogKapal` behaviour
1. Update `projects` row (all Section 1 fields)
2. Update each `project_units` row (HM Awal, HM Akhir, Solar Awal%, Solar Akhir%)
3. **Delete all** existing `woodlog_operator_salary` rows for this project
4. **Re-insert** salary rows for all Bangau + STD operators (Bangau auto from BL, STD from input fields; STD operators with 0 tonnage are skipped)

---

## 4. Tutup Modal — Repurposed (`openCloseWoodlogKapalModal` + `submitCloseWoodlogKapal`)

### Visibility
Only the **Tutup** button appears when `end_date IS NOT NULL` (project is Selesai). Hidden for Berjalan projects.

### Fields (2 only)
- Invoice Number (text, required)
- Invoice Amount (Rp, number, required)

### `submitCloseWoodlogKapal` behaviour
- Updates `projects`: set `invoice_number` + `invoice_amount`
- Does NOT touch `end_date`, `project_units`, or salary rows

---

## 5. Kapal List Table

### Column layout (11 columns)
| Kode | Kapal | Pemberi Kerja | Mulai | Selesai | Unit | BL Tonnage | Total HM | BBM | Status | Actions |

### Total HM column
- Value: sum of `(hm_akhir − hm_awal)` for units where both values exist
- Display: `142.5 HM` in blue, bold
- Clickable → `toggleWoodlogKapalDetail(id)`
- No data → `—`

### BBM column
- Value: total liters across all units using formula:
  - STD (J45, J46, J47, J48): `(solar_awal% − solar_akhir%) / 100 × 320 + actual_fills`
  - Bangau (J02, J03): `(solar_awal% − solar_akhir%) / 100 × 450 + actual_fills`
- `fuel_dispenses` fetched upfront in `loadWoodlogKapal()` alongside salary rows
- Display: `1,240 L`
- Clickable → `toggleWoodlogKapalDetail(id)` (same toggle as Total HM)
- Incomplete solar data → `—`

### Status badge
- Berjalan: orange text `font-weight:700`
- Selesai: blue text `font-weight:700`
- Tutup: green text `font-weight:700`

### Action buttons per state
| State | Buttons |
|---|---|
| Berjalan | Edit (blue) · Hapus (red) |
| Selesai | Edit (blue) · Tutup (green) · Hapus (red) |
| Tutup | Edit (blue) |

---

## 6. Detail Row (expanded) — 3 Sections

Colspan updated: 9 → 11

**Section 1 — Unit HM** (existing, unchanged)
`Unit | HM Awal | HM Akhir | Durasi | Solar Awal | Solar Akhir`

**Section 2 — BBM per Unit** (new)
`Unit | Tank Diff (L) | Isi Aktual (L) | Total (L)`
- Tank Diff: `(solar_awal% − solar_akhir%) / 100 × 320` (STD) or `× 450` (Bangau)
- Isi Aktual: sum of `fuel_dispenses.liters_dispensed` for this unit on this project
- Total: Tank Diff + Isi Aktual

**Section 3 — Salary Operator** (existing, unchanged)
`Operator | Tipe | Tonnage | Salary | Status`

---

## 7. Cost Analysis (Analisis Biaya) — Updates

### Fuel cost formula (updated)
```
Total BBM per project =
  Σ STD units:    (solar_awal% − solar_akhir%) / 100 × 320 + actual_fills
  Σ Bangau units: (solar_awal% − solar_akhir%) / 100 × 450 + actual_fills

Biaya Solar = Total BBM (L) × harga_solar_rpl
```
Replaces old formula that only used `solar_isi_liters`.

### New column: Invoice Amount
- Added to Analisis Biaya table alongside existing Income, Biaya Solar, Biaya Tenaga, Profit columns
- Projects without invoice → `—`

### Filter unchanged
Existing Open/Closed invoice filter stays. Closed = `invoice_number IS NOT NULL`.

---

## 8. Fuel Dispenses — Project Linkage

`fuel_dispenses` already has a `project_id` FK column (added in T10). BBM calculation uses `fuel_dispenses WHERE project_id = <project_id>` grouped by `unit_id`.

---

## Implementation Notes

- All JS changes via Node.js patch scripts (CRLF `\r\n` match strings, `replaceExact` / `replaceFn` pattern)
- NEVER use Edit tool on index.html JS sections
- `_wlKapalCache` must include `project_units` with `units(code)` — already fetched via `select('*, project_units(*, units(code, name))')`
- `loadWoodlogKapal()` needs additional fetch: `fuel_dispenses WHERE project_id IN (ids)` — stored in `_wlKapalFillMap[projectId][unitId] = totalLiters`; used by both list BBM column and detail row renderer
- `toggleWoodlogKapalDetail`: clear `row.dataset.rendered` flag after any Edit/Tutup save so detail re-renders with fresh data
- `wlUpdateSalaryPreview()` reused / adapted for Edit modal preview
