# Project Woodlog Module — Implementation Spec

**Goal:** Add a standalone "Proyek Woodlog" module to the SERVIS SAA admin panel, covering ship-loading (Kapal) and hourly jobs for excavator units J02, J03, J45–J48, with cost analysis, HM continuity, and a payment-schedule-aware salary Ringkasan.

**Architecture:** New top-level admin nav tab, separate screen div and JS functions (no changes to existing Proyek module). Reuses `projects` and `project_units` DB tables with new type values; adds one new table `woodlog_operator_salary`. Fuel data shared from existing `fuel_dispenses`.

**Tech Stack:** Vanilla JS, Supabase JS SDK, single `index.html`. All JS changes via Node.js patch scripts using `replaceExact()` pattern with CRLF line endings.

---

## Global Constraints

- NEVER use Edit tool on JS string literals in index.html — use patch scripts with `replaceExact(from, to, desc)` and `const R = '\r\n'`
- File uses Windows CRLF line endings throughout
- All patches must pass `node --check` syntax validation
- Supabase RLS: all new tables need `SELECT/INSERT/UPDATE/DELETE` policies `TO public`
- Deploy via `git push` → Vercel auto-deploy

---

## Units & Operators

**Bangau units:** J02, J03  
**Bangau operators (fixed 4):** Andi, Iman, Riski, Purwanto

**STD units:** J45, J46, J47, J48  
**STD operators (pool of 6):** Erwin, Uncong, Valdo, Andre, Alif, Rudianto

All 6 unit IDs already exist in the `units` table with `operator_name = null`.

---

## Data Model

### Reused tables (no schema changes)

**`projects`** — new type values: `'woodlog_kapal'`, `'woodlog_hourly'`

Columns used:
| Column | Woodlog use |
|---|---|
| `id` | PK |
| `type` | `'woodlog_kapal'` or `'woodlog_hourly'` |
| `project_code` | Auto-generated: `K{MM}-{NN}` (K = Woodlog, MM = month 01–12, NN = sequential# in month across both Kapal and Hourly types) |
| `ship_number_in_month` | Shared counter within month across both woodlog types for code generation |
| `month_year` | `'YYYY-MM'` string for monthly grouping |
| `nama_kapal` | Vessel name |
| `pemberi_kerja` | Client / job owner |
| `start_date` | Job start |
| `end_date` | Job end (nullable — open jobs have no end date) |
| `total_mt_m3` | BL tonnage (Kapal only) |
| `unit_price` | Client rate per MT (Kapal only; Hourly: rate per HM or null) |
| `harga_solar_rpl` | Fuel cost per liter (for Analisis) |
| `invoice_number` | Invoice reference |
| `notes` | Free text |

**`project_units`** — reused as-is. Each row = one unit assigned to one project.
| Column | Use |
|---|---|
| `project_id` | FK → projects |
| `unit_id` | FK → units (J02/J03/J45–J48) |
| `hm_awal` | HM at job start |
| `hm_akhir` | HM at job end (nullable) |
| `solar_awal_pct` | Tank gauge % at start |
| `solar_akhir_pct` | Tank gauge % at end (nullable) |
| `solar_isi_liters` | Auto-computed from `fuel_dispenses` during job |
| `hm_gap_reason` | Free-text reason if HM gap detected |

**`fuel_dispenses`** — shared, no changes. Woodlog fuel queried by `unit_id` and date range.

### New table: `woodlog_operator_salary`

```sql
CREATE TABLE woodlog_operator_salary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('bangau', 'std', 'hourly')),
  tonnage_mt numeric,       -- STD: manual input; Bangau: BL × 0.9 / 4; Hourly: null
  salary_amount numeric NOT NULL,  -- computed for Bangau/STD; manual for Hourly
  paid_batch text CHECK (paid_batch IN ('mid_month', 'end_of_month')),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE woodlog_operator_salary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON woodlog_operator_salary FOR ALL TO public USING (true) WITH CHECK (true);
```

### New table: `woodlog_kasbon`

```sql
CREATE TABLE woodlog_kasbon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,   -- 'YYYY-MM'
  operator_name text NOT NULL,
  amount numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE woodlog_kasbon ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON woodlog_kasbon FOR ALL TO public USING (true) WITH CHECK (true);
```

---

## Module Structure

### Navigation

New button in admin nav bar: **"PROYEK WOODLOG"** — renders screen div `#screen-woodlog`.

### Sub-tabs (inside #screen-woodlog)

| Tab | Screen div | Purpose |
|---|---|---|
| Kapal | `#wl-tab-kapal` | List and manage ship-loading jobs |
| Hourly | `#wl-tab-hourly` | List and manage hourly jobs |
| Ringkasan | `#wl-tab-ringkasan` | Monthly salary summary + payment runs |
| Analisis | `#wl-tab-analisis` | Cost vs income analysis per project |
| Kontinuitas HM | `#wl-tab-kontinuitas` | HM gap tracking for J02, J03, J45–J48 |

---

## Feature Detail

### Kapal Tab

**Project list** — table showing: Project Code, Vessel, Client, Start, End, Units, BL Tonnage, Status (Open/Closed).

**Add project modal** fields:
- Vessel name, Client, Start date, Invoice#, Notes
- BL Tonnage (total_mt_m3), Client rate/MT (unit_price), Fuel cost/L (harga_solar_rpl)
- Unit selector (multi-select from J02, J03, J45, J46, J47, J48) — each selected unit gets HM Awal + Solar Awal% inputs
- **Bangau salary section** (auto-shown if J02 or J03 selected): displays computed salary per Bangau operator = `BL × 0.9 / 4 × 800`, read-only, 4 rows
- **STD salary section** (auto-shown if any J45–J48 selected): 6 operator rows (Erwin, Uncong, Valdo, Andre, Alif, Rudianto), each with manual tonnage input → salary = `tonnage × 750`

On save: inserts into `projects`, `project_units`, `woodlog_operator_salary` (Bangau rows auto-generated, STD rows from manual inputs).

**Close project** (sets end_date, hm_akhir, solar_akhir_pct per unit).

**Delete project** — cascades to `project_units` and `woodlog_operator_salary`.

### Hourly Tab

Same structure as Kapal but simpler:
- Fields: Client, Start date, End date, Notes, Invoice#, Unit selector + HM per unit
- No tonnage or rate fields
- Salary section: operator name (free text) + manual salary amount per row
- `unit_type = 'hourly'` in `woodlog_operator_salary`

### Ringkasan Tab

**Month selector** (default: current month).

**Calculation logic:**

For each operator, find all `woodlog_operator_salary` rows where:
- `paid_batch IS NULL` (not yet paid)
- Linked project has `end_date IS NOT NULL` (completed)
- Sort linked projects by `end_date` ascending

The **last 2 completed projects** (by `end_date`, globally — same 2 projects for all operators) are the retainer — their salary rows are excluded from the current payment run regardless of which operators participated in them.

**16th payment column** per operator:
```
Σ salary_amount for completed, unpaid projects (excluding last 2)
```

**End-of-month column** per operator:
```
Σ salary_amount for completed, unpaid projects (excluding last 2)
+ Rp 3,100,000 base salary
− KASBON (loaded from woodlog_kasbon for this month_year, editable inline)
```

**Payment confirmation:**
- "Tandai Dibayar (16)" button → sets `paid_batch = 'mid_month'` for included salary rows
- "Tandai Dibayar (Akhir Bulan)" button → sets `paid_batch = 'end_of_month'` for included salary rows + saves KASBON entries

Retainer (last 2 ships) automatically carries forward to the next cycle.

### Analisis Biaya Tab

Per project (Kapal only):

| Item | Calculation |
|---|---|
| Income | `total_mt_m3 × unit_price` |
| Fuel cost | `Σ_per_unit [(solar_awal_pct − solar_akhir_pct) / 100 × 320] + Σ fuel_dispenses.liters_dispensed × harga_solar_rpl` |
| Labor cost | `Σ woodlog_operator_salary.salary_amount × 1.05` (salary + 5% overhead) |
| Profit | `Income − Fuel − Labor` |
| Yield/HM | `Profit / Σ (hm_akhir − hm_awal)` |

### Kontinuitas HM Tab

Reuses same logic as existing Proyek Kontinuitas:
- Unit selector filtered to J02, J03, J45, J46, J47, J48
- Shows chronological job list for selected unit with HM awal/akhir
- Highlights gaps in red with `hm_gap_reason`

---

## Salary Calculation Reference

**Bangau (J02, J03) — auto-computed:**
```
Per operator salary = BL_tonnage × 0.9 / 4 × 800
Operators: Andi, Iman, Riski, Purwanto (always equal split)
```

**STD (J45–J48) — manual tonnage:**
```
Per operator salary = manual_tonnage_mt × 750
Operators: Erwin, Uncong, Valdo, Andre, Alif, Rudianto
```

**Hourly — fully manual:**
```
Per operator salary = manually entered amount
```

**Monthly base salary:** Rp 3,100,000 per operator (paid end of month only)

**KASBON:** Manual deduction per operator per month, stored in `woodlog_kasbon`, subtracted from end-of-month total only

---

## DB SQL to Run in Supabase

```sql
-- New table: woodlog_operator_salary
CREATE TABLE woodlog_operator_salary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('bangau', 'std', 'hourly')),
  tonnage_mt numeric,
  salary_amount numeric NOT NULL,
  paid_batch text CHECK (paid_batch IN ('mid_month', 'end_of_month')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE woodlog_operator_salary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON woodlog_operator_salary FOR ALL TO public USING (true) WITH CHECK (true);

-- New table: woodlog_kasbon
CREATE TABLE woodlog_kasbon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  operator_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE woodlog_kasbon ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON woodlog_kasbon FOR ALL TO public USING (true) WITH CHECK (true);
```

---

## Impact on Existing Code

- Existing `loadProyekKapal`, `renderProyekKapalList`, etc. — **no changes**
- `loadHMMissing` exclusion list already excludes J02, J03, J45–J48 (T18)
- New functions prefixed `loadWoodlog*`, `renderWoodlog*`, `submitWoodlog*`, `openWoodlog*`
- New screen div `#screen-woodlog` added to HTML
- New nav button in admin nav bar

---

## Out of Scope

- SPV/MKN access to Woodlog module (admin-only for now)
- Excel export (can be added later)
- Automated KASBON tracking (manual input for now)
- Hourly salary rate formula (manual input for now)
