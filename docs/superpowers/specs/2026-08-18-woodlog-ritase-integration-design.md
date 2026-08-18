# Woodlog Ritase Integration Design

## Goal

Pull ritase and bon muat data from Woodlog Monitoring into SERVIS SAA so that tonnage per operator can be calculated automatically and salary amounts can be confirmed before saving.

## Formula

- **Tonnage per Ritase** = `total_mt_m3 × 0.9 / totalRitase`
- **Operator Tonnage** = `tonnagePerRitase × bonMuat[operatorName]`

## Architecture

Three pieces across two codebases:

1. **Woodlog Monitoring** — standardize project code format + editable field for existing projects
2. **Woodlog Monitoring** — public read-only API endpoint
3. **SERVIS SAA** — Analisis Biaya sync button + editable salary form

---

## Piece 1: Project Code Alignment (Woodlog Monitoring)

**Codebase:** `C:\Users\upsca\Documents\woodlog-monitoring`

### New Format

`K{MM}-{NN}` — month 2-digit, sequence 2-digit padded within the month.
Examples: `K08-01`, `K08-02`, `K09-01`.

### New Projects

Change `getNextProjectCode()` in `app/actions.ts`:
- Use `startDate` month to determine `MM`
- Count existing projects with `projectCode LIKE K{MM}-%` to determine next sequence
- Emit `K{MM}-{padded sequence}`

The `projectCode` column (`String? @unique`) already exists in the schema — no migration required.

### Existing Projects (K-1, K-2, etc.)

Add an inline editable "Kode SAA" field on the project list page (`app/page.tsx`), visible to admin only:
- Small text input next to each project's existing code
- Save button per row → `PATCH /api/projects/{id}/code` or direct server action
- Writes to the existing `projectCode` field
- No new DB column needed

---

## Piece 2: Public API Endpoint (Woodlog Monitoring)

**Route:** `GET /api/project-stats?code=K08-01`

**Implementation file:** `app/api/project-stats/route.ts`

### Logic

1. Find project by `projectCode` (exact match)
2. If not found → `404 { error: "Project not found" }`
3. Query:
   - `DailyShiftLog` grouped by `projectId` → `_sum.ritase` = `totalRitase`
   - `DailyBonMuat` grouped by `projectId + operatorName` → sum of `count` per operator
4. Return:

```json
{
  "projectCode": "K08-01",
  "shipName": "MV Example",
  "blQuantity": 5000.00,
  "totalRitase": 312,
  "bonMuat": {
    "Andi": 48,
    "Iman": 36,
    "Riski": 40,
    "Purwanto": 42,
    "Erwin": 30,
    "Uncong": 28,
    "Valdo": 32,
    "Andre": 26,
    "Alif": 18,
    "Rudianto": 12
  }
}
```

**Security:** No authentication — read-only aggregate data, no PII. CORS open (`Access-Control-Allow-Origin: *`) so SERVIS SAA browser JS can call it directly.

**Error handling:**
- `404` — project code not found
- `500` — database error

---

## Piece 3: Analisis Biaya Sync (SERVIS SAA)

**File:** `C:\Users\upsca\Documents\SERVIS-SAA\index.html`

### Trigger

Inside the collapsible detail row (`wla-detail-inner-{pid}`) in the Analisis Biaya tab, below the existing BBM and labor tables, add a **"↻ Sync dari Woodlog Monitoring"** button.

### On Click

1. Call `https://woodlog-monitoring.vercel.app/api/project-stats?code={p.project_code}`
2. Show loading state on the button
3. On success:
   - Calculate `tpr = total_mt_m3 × 0.9 / totalRitase`
   - For each operator in `bonMuat`: `opTonnage = tpr × bonMuat[op]`
   - Fetch current salary amounts from `el._wlaSalDetail[pid]` (already loaded)
   - Render the salary confirmation table
4. On error (404 or network): show inline error message

### Salary Confirmation Table

Rendered inside the detail row after sync:

| Operator | Bon Muat | Tonase | Gaji Saat Ini | Gaji Baru |
|---|---|---|---|---|
| Andi | 48 | 45.2 MT | Rp 1.200.000 | [input] |
| Iman | 36 | 33.9 MT | Rp 800.000 | [input] |
| ... | | | | |

- **Gaji Baru** inputs are pre-filled with current salary amounts from `woodlog_operator_salary`
- **"Simpan Gaji"** button at bottom → upserts `woodlog_operator_salary` rows for this project
- After save: refresh `loadWoodlogAnalisis()`

### Error State

If API returns 404: display inline message — *"Kode K08-01 tidak ditemukan di Woodlog Monitoring. Pastikan kode proyek sudah diisi di sana."*

---

## Data Flow Summary

```
SERVIS SAA browser
  → GET woodlog-monitoring.vercel.app/api/project-stats?code=K08-01
  ← { totalRitase, bonMuat }
  → calculate tonnage per operator
  → display editable salary table
  → admin confirms/overrides
  → upsert woodlog_operator_salary in Supabase
```

---

## Global Constraints

- Project code format: `K{MM}-{NN}` (month zero-padded, sequence zero-padded to 2 digits)
- API endpoint: `https://woodlog-monitoring.vercel.app/api/project-stats`
- Tonnage formula: `total_mt_m3 × 0.9 / totalRitase` (0.9 = BL deduction factor)
- Operator tonnage formula: `tonnagePerRitase × bonMuat[operatorName]`
- SERVIS SAA stores salary in `woodlog_operator_salary` (columns: `project_id`, `operator_name`, `salary_amount`)
- Woodlog Monitoring: `projectCode String? @unique` already exists in schema
- API requires no authentication; CORS must be open
