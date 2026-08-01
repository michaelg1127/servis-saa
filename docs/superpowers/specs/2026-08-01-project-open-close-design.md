# Project Open/Close Redesign — SERVIS SAA

**Date:** 2026-08-01  
**Status:** Approved  
**Scope:** Kapal + Stockpile project creation and Solar Isi auto-computation

---

## Problem

The current Add Project form treats project creation as a point-in-time event with all data known upfront. In reality, opening a project means starting an open-ended job — HM Akhir, Solar Akhir%, Tgl Selesai, Total MT, and pricing are unknown at the moment the excavator starts working.

Additionally, Solar Isi (fuel refilled during the project) is now tracked via `fuel_dispenses.project_id` FK, making manual entry redundant and error-prone.

---

## Project Lifecycle

Three states, driven by existing data — no new status field, no new button:

| State | Indicator | Condition |
|---|---|---|
| **Ongoing** | Amber "Ongoing" badge | `hm_akhir IS NULL` on any unit |
| **In Progress** | Amber badge | HM Akhir partially filled, no invoice yet |
| **Closed** | Green "CLOSED" | `invoice_number IS NOT NULL` |

Close gate is unchanged: invoice number entry in Analisis Biaya tab flips the project to green.

---

## Add Form Redesign

### Fields REMOVED from Add form (moved to Edit-only)

**Project level:**
- Tgl Selesai — unknown when opening
- Total MT/M3 — known progressively during unloading
- Harga/MT (unit price) — agreed and entered later
- Harga Solar (Rp/L) — entered later

**Per-unit:**
- HM Akhir — unknown at start
- Solar Akhir% — unknown at start
- Solar Isi — auto-computed from fuel fills (never manually entered)

### Fields KEPT in Add form

**Project level (Kapal):**
- Nama Kapal *(required)
- Pemberi Kerja (optional)
- Kade (optional)
- Jenis Kargo (optional)
- Tgl Mulai *(required, default today)
- Catatan (optional)

**Per-unit (both Kapal and Stockpile):**
- Unit *(required)
- HM Awal *(required)
- Solar Awal% *(required — records starting tank gauge)

The Add form is a minimal "open job" action. All financial and completion data is filled progressively via Edit.

### Edit Form

Edit form is unchanged in structure — it shows all fields. Solar Isi is replaced by a **read-only display line**: `Solar Isi: 340 L (dari pengisian)` pulled live from `fuel_dispenses`. Not an editable input.

---

## Solar Isi Auto-Computation

Solar Isi is never entered manually. It is always derived from `fuel_dispenses WHERE project_id = X GROUP BY unit_id`.

### Data flow

1. A `fillMap` is built: `{ [unit_id]: total_liters_dispensed }`
2. The fill formula uses: `(solar_awal_pct − solar_akhir_pct) / 100 × 320 + fillMap[unit_id]`
3. Display label: "X L (aktual)" when fill data exists, "X L (manual)" when falling back to stored `solar_isi_liters` (backward compat for old projects), "0 L" if neither

### Where fetched

| Context | When fetched |
|---|---|
| **Detail view** (expand row) | Lazy — fetched inside `toggleKapalDetail` / `toggleStockpileDetail` before calling render |
| **Edit modal** | Fetched when `openEditKapalModal` / `openEditStockpileModal` is called |
| **Ringkasan** | Fetched once in `loadProyekRingkasan` for all projects in the month |
| **Excel export** | Fetched once in `exportProyekExcel` for all projects being exported |
| **Analisis Biaya** | Already implemented via `solarActualMap` (project-level total) — unchanged |

### Function signature changes

- `renderKapalDetailHTML(p)` → `renderKapalDetailHTML(p, fillMap)`
- `renderStockpileDetailHTML(p)` → `renderStockpileDetailHTML(p, fillMap)`
- `fillMap` is `{ [unit_id]: liters }` for the specific project being rendered

### Fallback (backward compatibility)

For projects created before `fuel_dispenses.project_id` FK existed, `fillMap[unit_id]` will be 0. In that case, fall back to stored `project_units.solar_isi_liters`. This preserves all existing data.

---

## Validation Changes

### submitAddKapal / submitAddStockpile

Remove validation for: `hmAkhir`, `sAkhir`, `sIsi`

New per-unit validation:
- `unitId` — required
- `hmAwal` — required, must be a number
- `sAwal` — required, 0–100

HM Continuity check (`onKapalHMAwalChange`) is unchanged — still fires on HM Awal blur.

### submitEditKapal / submitEditStockpile

Unchanged — HM Akhir and Solar Akhir% remain optional (already implemented). Solar Isi field removed from edit form (no value to read or validate).

---

## DB Schema Changes

Run in Supabase SQL editor before deploying:

```sql
ALTER TABLE project_units ALTER COLUMN solar_akhir_pct DROP NOT NULL;
ALTER TABLE project_units ALTER COLUMN solar_isi_liters DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN total_mt_m3 DROP NOT NULL;
```

Note: `solar_isi_liters` column is kept (not dropped) for backward compatibility with existing project data. It is simply no longer written by the application.

---

## Impact Summary

| Component | Change |
|---|---|
| `addKapalUnitRow()` | Remove HM Akhir, Solar Akhir%, Solar Isi inputs |
| `addStockpileUnitRow()` | Same |
| `openAddKapalModal()` | Remove Total MT*, Harga/MT, Harga Solar, Tgl Selesai* fields |
| `openAddStockpileModal()` | Same (minus Harga/MT) |
| `submitAddKapal()` | Remove Akhir/Isi reads + validation |
| `submitAddStockpile()` | Same |
| `toggleKapalDetail(id)` | Fetch fillMap before render; pass to renderKapalDetailHTML |
| `toggleStockpileDetail(id)` | Same |
| `renderKapalDetailHTML(p, fillMap)` | Use fillMap for Solar Isi per unit |
| `renderStockpileDetailHTML(p, fillMap)` | Same |
| `openEditKapalModal(id)` | Fetch fillMap; show Solar Isi as read-only display |
| `openEditStockpileModal(id)` | Same |
| `loadProyekRingkasan()` | Fetch fillMap for month; pass into render |
| `renderProyekRingkasan()` | Use fillMap for solar calc |
| `exportProyekExcel()` | Fetch fillMap; use in solar calc for both sheets |
