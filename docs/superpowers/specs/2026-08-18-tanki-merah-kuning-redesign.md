# Tanki Merah & Kuning Redesign — Design Spec

**Date:** 2026-08-18
**Project:** SERVIS SAA (`C:\Users\upsca\Documents\SERVIS-SAA\index.html`)

---

## Goal

Redesign Tanki Merah and Tanki Kuning so they operate as pure transfer-destination tanks with a single running pool balance, while Tanki Hijau remains the only tank that receives bunker deliveries. Fill serial numbers (M-1, M-2...) are preserved. All existing data is migrated — no fresh start.

---

## Architecture Overview

**Before:** Merah/Kuning had their own bunker sessions (M-1, M-2... as bunker codes), each with its own capacity and fill sequence (M-1-1, M-1-2...). Transfers from Hijau created new sessions.

**After:** Each tank has exactly one permanent pool bunker (M-OB for Merah, K-OB for Kuning). All fills reference this OB record. Fill codes are simple integers (M-1, M-2, M-3...). Transfers from Hijau just add to balance — no new session created.

---

## Section 1 — Migration (patch_bbm5.js)

### 1a. Compute consolidated balances

Query existing data to find:
- `merah_total`: `SUM(total_liters)` from `fuel_bunkers WHERE tank_name = 'Tanki Merah'`
- `kuning_total`: `SUM(total_liters)` from `fuel_bunkers WHERE tank_name = 'Tanki Kuning'`

### 1b. Create OB pool bunkers

Insert two records into `fuel_bunkers`:
```
bunker_code: 'M-OB', tank_name: 'Tanki Merah', total_liters: merah_total, notes: 'Pool bunker — migrated'
bunker_code: 'K-OB', tank_name: 'Tanki Kuning', total_liters: kuning_total, notes: 'Pool bunker — migrated'
```

### 1c. Migrate all fills to reference OB bunkers

Update `fuel_transfers` for each fill:
- All fills where `bunker_id` references any Merah bunker → set `bunker_id = M-OB.id`
- All fills where `bunker_id` references any Kuning bunker → set `bunker_id = K-OB.id`

### 1d. Renumber fills chronologically

After reassigning `bunker_id`:
1. Fetch all Merah fills ordered by `created_at ASC`
2. Rename `transfer_code` to `M-1`, `M-2`, `M-3`... in order
3. Repeat for Kuning: `K-1`, `K-2`, `K-3`...

Note: `transfer_code` is `UNIQUE` — use a two-pass approach (temp suffix then final rename) to avoid constraint collisions during renaming.

### 1e. Delete old Merah/Kuning bunker records

Delete all `fuel_bunkers` rows where `tank_name IN ('Tanki Merah', 'Tanki Kuning')` AND `bunker_code != 'M-OB'` AND `bunker_code != 'K-OB'`.

### 1f. Update fuel_tank_transfers OB references

Update `fuel_tank_transfers` so that any transfer to Merah/Kuning now has its `bunker_id` set to the corresponding OB record (if not already set). This keeps PINDAH accounting consistent.

---

## Section 2 — PENGISIAN Form Redesign

### New flow

The PENGISIAN tab gains a "Tanki Sumber" selector shown first:
- **Tanki Hijau** — unchanged existing flow: bunker dropdown appears, user picks a Hijau bunker (X-codes), fill references that bunker
- **Tanki Merah** — no bunker dropdown; shows current balance; auto-assigns `bunker_id = M-OB.id`
- **Tanki Kuning** — no bunker dropdown; shows current balance; auto-assigns `bunker_id = K-OB.id`

### getNextFillCode(tank)

New function that counts only simple integer-format codes for the given tank:

```js
async function getNextFillCode(tank) {
  const prefix = tank === 'Tanki Merah' ? 'M' : tank === 'Tanki Kuning' ? 'K' : 'X'
  const { data } = await supabase
    .from('fuel_transfers')
    .select('transfer_code')
    .eq('tank_name', tank)  // or join via bunker tank_name
  
  const nums = (data || [])
    .map(r => r.transfer_code)
    .filter(code => new RegExp(`^${prefix}-\\d+$`).test(code))
    .map(code => parseInt(code.split('-')[1], 10))
  
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `${prefix}-${next}`
}
```

This regex `^M-\d+$` matches only `M-1`, `M-2`... and NOT the old `M-1-1` or `M-OB` format.

### Capacity validation change

- **Hijau:** validate against selected bunker's remaining capacity (existing logic)
- **Merah/Kuning:** validate against current tank balance (i.e., `calcTankLevels()` result for that tank must be ≥ fill volume). No bunker capacity check.

---

## Section 3 — TERIMA UI & RIWAYAT Filter

### TERIMA UI

Remove `Tanki Merah` and `Tanki Kuning` from the tank selector in the TERIMA form. Only `Tanki Hijau` remains. Users can no longer create TERIMA entries for Merah/Kuning — transfers in come exclusively from Hijau via the PINDAH flow (which already exists).

### RIWAYAT filter

In `loadFuelRiwayat()` / `renderFuelRiwayat()`, when rendering TERIMA rows (from `fuel_bunkers`):
- Filter out any row where `bunker_code.endsWith('-OB')` — OB records are accounting-only entries and must not appear in the user-facing history.

All FILL rows (from `fuel_transfers`) and PINDAH rows (from `fuel_tank_transfers`) continue to display as before.

---

## Section 4 — Balance Calculation (Unchanged)

`calcTankLevels()` formula remains:

```
balance = SUM(fuel_bunkers.total_liters WHERE tank = T)
         + SUM(fuel_tank_transfers.volume WHERE to_tank = T)
         - SUM(fuel_tank_transfers.volume WHERE from_tank = T)
         - SUM(fuel_transfers.volume_liters WHERE tank = T)
```

After migration, `SUM(fuel_bunkers)` for Merah = `M-OB.total_liters` which equals all historical receipts + all PINDAH increments (since PINDAH updates M-OB's `total_liters`... see note below).

**Important:** When a PINDAH transfer to Merah/Kuning is recorded (`fuel_tank_transfers`), the OB bunker's `total_liters` must NOT be incremented. The PINDAH volume is already captured in `fuel_tank_transfers` and `calcTankLevels()` adds it via the `PINDAH_in` term. Double-counting would occur if OB were also updated. This means OB stays frozen at the migration total — only PINDAH and fills move balance after migration.

---

## Global Constraints

- `index.html` is a single-file app; all changes are in-place JS/HTML edits
- Supabase is the backend; all DB changes go through the JS client
- Migration runs as a standalone Node.js script (`patch_bbm5.js`) executed once
- `fuel_bunkers.bunker_code` has a UNIQUE constraint — renaming must use temp values first
- `fuel_transfers.transfer_code` also has a UNIQUE constraint — same two-pass approach
- No schema changes — the Pool Bunker approach uses existing tables as-is
- OB bunker codes must never appear in the RIWAYAT UI
- Fill codes must match `^[MKX]-\d+$` pattern after migration
- Existing Hijau TERIMA and PENGISIAN flows are unchanged
