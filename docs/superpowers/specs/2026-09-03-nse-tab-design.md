# NSE Tab — Design Spec
Date: 2026-09-03
Status: Approved

## Overview

Add a dedicated **NSE** tab to the Regular Project (Proyek) module. NSE is a single stockpile site with one dedicated excavator unit. Unlike Kapal and Stockpile (billed by HM), NSE is billed by **daytime clock hours** — e.g., 08:00–13:00 = 5 billed hours. HM readings are recorded for cross-reference only.

Each calendar day has up to **3 sessions**. Sessions can be overnight (e.g., 19:00 → 06:00 the next morning); overnight sessions belong to their **start date** for all billing and batch purposes.

---

## Database

### New table: `nse_sessions`

```sql
CREATE TABLE nse_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE NOT NULL,
  session_num  SMALLINT NOT NULL CHECK (session_num BETWEEN 1 AND 3),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  hm_awal      NUMERIC,
  hm_akhir     NUMERIC,
  unit_id      UUID REFERENCES units(id),
  month_year   TEXT NOT NULL,
  paid_batch   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_date, session_num)
);
```

**No stored computed columns.** All calculated values are derived on read:
- `overnight` = `end_time < start_time`
- `billed_hours` = if overnight: `(24 - start_decimal) + end_decimal`, else `end_decimal - start_decimal`
- `hm_gap` = `hm_akhir - hm_awal`
- `salary` = `billed_hours × 35,000`

### Existing table cleanup

The existing `isNSE()` / `_isNSE()` helper functions in index.html identify NSE projects inside the `projects` table (type='stockpile', code_prefix='NSE'). After this feature ships:
- Historical NSE records remain in `projects` table untouched
- New NSE records go into `nse_sessions`
- `isNSE()` / `_isNSE()` references in batch export code are removed (NSE now has its own Ringkasan section)

---

## Module-Level State

```javascript
var nseData = [];                     // loaded sessions for current month
var _nseMonthFilter = /* smart default: prev month if day ≤ 10, else current */;
```

---

## Tab Bar

Add NSE button immediately after Stockpile, before Ringkasan Gaji:

```html
<button id="proyek-tab-nse" onclick="switchProyekTab('nse', this)"
  style="...same style as other tabs...">NSE</button>
```

Add corresponding panel div:

```html
<div id="proyek-panel-nse" style="display:none;"></div>
```

`switchProyekTab` already handles show/hide — no changes needed there.

---

## Load Function: `loadProyekNSE()`

```javascript
async function loadProyekNSE() {
  const panel = document.getElementById('proyek-panel-nse');
  panel.innerHTML = '<div ...>Memuat data...</div>';
  const { data, error } = await sb
    .from('nse_sessions')
    .select('*, units(code, name)')
    .eq('month_year', _nseMonthFilter)
    .order('session_date').order('session_num');
  if (error) throw error;
  nseData = data || [];
  renderProyekNSEList();
}
```

---

## Render Function: `renderProyekNSEList()`

### Header
- Title "NSE" + month filter `<input type="month">` synced to `_nseMonthFilter`
- "Tambah Sesi" button → `openAddNSEModal()`

### Table — grouped by date

One header row, then for each unique `session_date`:
- **Session rows** (one per session in that date):

| Date | Sesi | Unit | Start | End | Billed Hrs | HM Awal | HM Akhir | HM Gap | Salary | Actions |
|------|------|------|-------|-----|------------|---------|---------|--------|--------|---------|
| 04 Aug | 1 | PC210-4 | 08:00 | 18:00 | 10.0j | 1320 | 1330 | 10 | Rp 350,000 | ✏ 🗑 |
| | 2 | PC210-4 | 19:00 | 06:00 ↑ | 11.0j | 1330 | 1340 | 10 | Rp 385,000 | ✏ 🗑 |

- `↑` badge on overnight sessions (end_time < start_time)
- Date cell only shown on the first session row of each date (rowspan or blank for subsequent rows)

- **Subtotal row** per date (spans all columns):
  - Total Billed Hrs | Total HM Gap | Total Salary

### Footer
- Grand total row: month total billed hours + salary

---

## Add/Edit Modal: `openAddNSEModal()` / `openEditNSEModal(id)`

### Fields

| Field | Input | Notes |
|-------|-------|-------|
| Tanggal | `<input type="date">` | session_date |
| Sesi | `<select>` 1/2/3 | only shows slots not yet taken for that date |
| Unit | `<select>` from units table | pre-filled with NSE unit if identifiable |
| Jam Mulai | `<input type="time">` | start_time, 24h |
| Jam Selesai | `<input type="time">` | end_time, 24h |
| HM Awal | `<input type="number">` | |
| HM Akhir | `<input type="number">` | |

### Live preview (updates on every input change)
- Overnight badge: shown when `end_time < start_time`
- Billed Hours: computed value
- Salary: billed_hours × 35,000

### Validation
- `session_date` required
- `start_time` required
- `end_time` required
- `unit_id` required
- `session_num` uniqueness per date enforced by DB UNIQUE constraint (show friendly error on conflict)
- `hm_akhir >= hm_awal` when both provided

---

## Submit Functions

### `submitAddNSE()`
```javascript
const month_year = sessionDate.slice(0, 7);
await sb.from('nse_sessions').insert({ session_date, session_num, start_time, end_time, hm_awal, hm_akhir, unit_id, month_year });
```

### `submitEditNSE(id)`
```javascript
await sb.from('nse_sessions').update({ ... }).eq('id', id);
```

### `deleteNSESession(id)`
- Confirm dialog before delete
- `await sb.from('nse_sessions').delete().eq('id', id)`

---

## Ringkasan Gaji Integration

NSE sessions appear as a **separate section** in the existing Ringkasan Gaji tab, after Stockpile and before the grand total.

### Batch assignment
- `session_date day ≤ 15` → Batch 16 (mid_month)
- `session_date day > 15` → Batch 31 (end_month)

### `loadProyekRingkasan()` changes
Load NSE sessions for the selected month alongside projects:
```javascript
const { data: nseSessions } = await sb.from('nse_sessions')
  .select('*, units(code, name)')
  .eq('month_year', proyekMonthFilter)
  .is('paid_batch', null);
```

Pass `nseSessions` into `renderProyekRingkasan()`.

### Ringkasan render — NSE section
Aggregate by batch:
- **NSE Batch 16**: sum of billed_hours × 35,000 for sessions where day ≤ 15
- **NSE Batch 31**: sum of billed_hours × 35,000 for sessions where day > 15

Show per-session breakdown (date, sesi, unit, hours, salary) with subtotal.

### `markNSEPaid(batchType)`
```javascript
const sessionIds = nseSessions
  .filter(s => batchType === 'mid_month' ? dayOf(s.session_date) <= 15 : dayOf(s.session_date) > 15)
  .map(s => s.id);
await sb.from('nse_sessions').update({ paid_batch: batchType }).in('id', sessionIds);
```

---

## Excel Export

Add **NSE sheet** to `exportProyekExcel()` / `exportBatchExcel()`:

Columns: `Tanggal | Sesi | Unit | Jam Mulai | Jam Selesai | Overnight | Billed Hrs | HM Awal | HM Akhir | HM Gap | Salary`

Rows sorted by session_date, session_num. Daily subtotals. Grand total row.

---

## Cleanup: Remove Old NSE Workarounds

After this feature is live, remove from existing code:
1. `isNSE(p)` helper and its usages in `renderProyekRingkasan`
2. `_isNSE(p)` helper and its usages in `exportBatchExcel`
3. The special batch logic that mixed NSE with Kapal projects: `(p.type === 'kapal' || isNSE(p))`

Historical NSE records in the `projects` table are left in place (not migrated).

---

## Out of Scope
- Migrating historical NSE data from `projects` table to `nse_sessions`
- Rate changes (rate is hardcoded at 35,000/hour)
- Multi-unit NSE (always 1 dedicated unit per session)
