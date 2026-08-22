# HM Duplicate / Overlap Check — Design Spec

**Goal:** Block duplicate or overlapping HM entries for two work-related flows: BBM fuel fills and project unit assignments.

**Architecture:** Two async pre-flight helper functions called before their respective Supabase INSERTs. All validation is client-side (Supabase query → check → block or proceed). No DB constraints added.

---

## Global Constraints

- Single-file app: all changes in `C:\Users\upsca\Documents\SERVIS-SAA\index.html`
- Use existing `showToast(msg)` for error display (hard block — do not save)
- Both checks are hard blocks: if a conflict is found, the submit function returns early without inserting
- No changes to existing validations (1/day check, current_hm+200 check, etc.)

---

## Check 1: BBM Fill HM Duplicate

**Trigger:** `submitPengisian()` — before inserting to `fuel_dispenses`

**Helper:** `async function checkHMFillDuplicate(unitId, hm)` → returns conflicting record or null

**Query:**
```javascript
sb.from('fuel_dispenses')
  .select('id, dispense_date, liters_dispensed, units(code)')
  .eq('unit_id', unitId)
  .eq('hm_at_fill', hm)
  .limit(1)
  .single()
```

**Error message (toast):**
> `Unit [unit.code] sudah pernah diisi pada HM [hm] — [dispense_date], [liters_dispensed]L. Koreksi HM sebelum menyimpan.`

**Integration point:** Call immediately after extracting `unitId` and `hm` in `submitPengisian()`, before any further logic.

---

## Check 2: Project HM Overlap

**Trigger:** `submitAddKapal()` and `submitAddStockpile()` — before inserting to `project_units`

**Helper:** `async function checkProjectHMOverlap(unitId, hmAwal, hmAkhir, unitCode)` → returns conflicting record or null

**Overlap condition:**
- New range: `[hmAwal, hmAkhir]` (hmAkhir may be null = open/ongoing)
- Existing row conflicts if: `existing.hm_awal <= (hmAkhir ?? ∞)` AND `(existing.hm_akhir IS NULL OR existing.hm_akhir >= hmAwal)`
- PostgREST filter: `.lte('hm_awal', hmAkhir ?? 999999999).or('hm_akhir.is.null,hm_akhir.gte.' + hmAwal)`

**Query:**
```javascript
sb.from('project_units')
  .select('id, hm_awal, hm_akhir, projects(project_code)')
  .eq('unit_id', unitId)
  .lte('hm_awal', hmAkhir ?? 999999999)
  .or('hm_akhir.is.null,hm_akhir.gte.' + hmAwal)
  .limit(1)
  .single()
```

**Error message (toast):**
> `Unit [unitCode] sudah tercatat di Proyek [project_code] pada HM [hm_awal]–[hm_akhir ?? 'sekarang']. Selesaikan atau perbaiki HM sebelum menyimpan.`

**Integration points:**
- `submitAddKapal()`: loop over each unit row, call helper, break and return on first conflict
- `submitAddStockpile()`: same pattern
- Both called BEFORE the batch INSERT

---

## Out of Scope

- `hm_updates` table — no duplicate check
- `service_log.hm_at_service` — no duplicate check
- Cross-table overlap (project vs BBM) — not checked
- DB-level constraints
