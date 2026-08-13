# Proyek Salary Tracking Design

**Goal:** Add bi-monthly salary payment tracking (16th and 31st) to the existing Proyek (Kapal + Stockpile) module, with per-operator breakdown, carryover logic, and KASBON deductions.

**Architecture:** Two additive DB changes (one column + one table), a full rewrite of `loadProyekRingkasan` and `renderProyekRingkasan`, and two new payment functions. All other Proyek functions (Kapal list, Stockpile list, Analisis, Kontinuitas) are untouched.

**Tech Stack:** Vanilla JS, Supabase JS SDK, Node.js patch scripts (CRLF), Supabase CLI for DB migrations.

---

## Payment Rules

### Kapal (Ship)
- A kapal project is payable when `end_date` is set (project closed).
- **Batch 16 (mid_month):** end_date falls on day 1–15 of the payment month.
- **Batch 31 (end_of_month):** end_date falls on day 16–last of the payment month.
- **Carryover:** A kapal project whose `end_date` month differs from its `month_year` month is a carryover. Its rate is forced to **Rp 175/MT** (ship #1 rate) regardless of its original `ship_number_in_month`.
- No retainer: every completed project is eligible for the next applicable batch.

### Stockpile
- Always paid in **Batch 31** (end_of_month), regardless of which day end_date falls.
- Rate unchanged: Rp 35,000/HM. No carryover rate adjustment.

### Base Salary
- Rp 3,100,000/month per operator, included only in **Batch 31**.

### KASBON
- Manual advance deduction per operator, entered at payment time.
- Applied only in **Batch 31** (deducted from grand total).
- Stored in `proyek_kasbon` table keyed by `month_year` + `operator_name`.

---

## Data Model

### Migration 1: Add column to projects
```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS paid_batch text
  CHECK (paid_batch IN ('mid_month', 'end_of_month'));
```
- Default: `null` (unpaid).
- Existing rows unaffected (null = unpaid, correctly excluded from payment view).

### Migration 2: New proyek_kasbon table
```sql
CREATE TABLE IF NOT EXISTS proyek_kasbon (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year   text NOT NULL,
  operator_name text NOT NULL,
  amount       numeric NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE proyek_kasbon ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON proyek_kasbon
  FOR ALL TO public USING (true) WITH CHECK (true);
```

---

## Operator List

Operators are fetched dynamically at render time from the `units` table. All units whose `code` is NOT in the woodlog set (`J02`, `J03`, `J45`, `J46`, `J47`, `J48`) are considered proyek operators. Their `operator_name` field provides the display name and KASBON key.

---

## loadProyekRingkasan() — Rewrite

**Old:** Filters projects by `.eq('month_year', proyekMonthFilter)`.

**New:** Filters by `end_date` range for the selected payment month, and `paid_batch` is null:
```
end_date >= YYYY-MM-01
end_date <= YYYY-MM-last
type IN ('kapal', 'stockpile')
paid_batch IS NULL
```
Also fetches: `proyek_kasbon` for selected month, and all non-woodlog units with their operator names.

---

## renderProyekRingkasan() — Rewrite

Renders two blocks:

### Block A — Batch 16 (Tanggal 16)
- Kapal projects only, end_date day 1–15.
- Carryover detection: `project.month_year.slice(0,7) !== project.end_date.slice(0,7)` → show "Carryover" badge, rate = 175.
- Per-operator breakdown table:
  ```
  Operator | Ship codes worked + per-ship amount | Subtotal
  ```
- "Tandai Lunas Batch 16" button → calls `markProyekPaid('mid_month')`.

### Block B — Batch 31 (Tanggal 31)
- Kapal projects: end_date day 16–last of month.
- Stockpile projects: ALL stockpile with end_date in the month (any day).
- Per-operator breakdown table:
  ```
  Operator | Gaji Proyek | Gaji Pokok 3.1M | Kasbon (input) | Grand Total
  ```
- Editable KASBON input per operator.
- "Tandai Lunas Batch 31" button → calls `markProyekPaid('end_of_month')`.

Once marked paid, projects disappear from view (only `paid_batch = null` are shown).

---

## New Functions

### markProyekPaid(paymentType, projects, monthYear)
1. Save KASBON inputs via `saveProyekKasbon(monthYear)`.
2. Collect project IDs from the relevant block.
3. Confirm with user (count of projects).
4. `UPDATE projects SET paid_batch = paymentType WHERE id IN (...)`.
5. Reload Ringkasan.

### saveProyekKasbon(monthYear)
1. Read all KASBON input elements (`#proy-kasbon-{operatorName}`).
2. Upsert into `proyek_kasbon` (update existing row or insert if amount > 0).

---

## Implementation Approach

All changes via Node.js patch scripts (`patch_ps_1.js`, `patch_ps_2.js`, etc.) using `replaceExact(from, to, desc)` with `const R = '\r\n'`. DB migrations run via `supabase db query --linked --file`.

Patch sequence:
- **PS-DB:** SQL migration (paid_batch column + proyek_kasbon table)
- **PS-1:** Rewrite `loadProyekRingkasan()` and `renderProyekRingkasan()`
- **PS-2:** Add `markProyekPaid()` and `saveProyekKasbon()`

---

## QA Checklist

- [ ] Kapal project closed day 1–15 appears in Block A only
- [ ] Kapal project closed day 16–31 appears in Block B only
- [ ] Stockpile project (any end_date day) appears in Block B only
- [ ] Carryover project shows "Carryover" badge and uses Rp 175/MT rate
- [ ] Carryover project does NOT appear in Block A of its original month
- [ ] "Tandai Lunas Batch 16" marks correct projects, Block A clears
- [ ] "Tandai Lunas Batch 31" marks correct projects, Block B clears
- [ ] KASBON saved correctly to `proyek_kasbon` table
- [ ] Base salary (3.1M) appears only in Block B, once per operator
- [ ] Kapal list tab, Stockpile list tab, Analisis, Kontinuitas — all unaffected
- [ ] Woodlog module — unaffected
- [ ] `paid_batch` column visible in Supabase dashboard on projects table
- [ ] Previously-paid projects do not reappear after page refresh
