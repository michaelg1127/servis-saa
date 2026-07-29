# Fuel Tracking Feature — Design Spec
**Project:** SERVIS SAA (servis-saa.vercel.app)  
**Date:** 2026-07-24  
**Role access:** Admin only  
**Status:** Approved, ready for implementation

---

## 1. Background & Business Context

PT Surya Alam Armada operates 23 excavators and manages fuel via a 3-tank + drum system:

- **Tanki Hijau** — 8,000L capacity, primary tank
- **Tanki Merah** — 1,500L capacity, emergency only (used when Hijau is empty)
- **Tanki Kuning** — 1,500L capacity, emergency only (used when Hijau is empty)

Tanks are stationary. Fuel flow:
1. Tanker truck delivers to a storage tank → **Bunker receipt**
2. Fuel is pumped from tank into physical drums → **Drum fill**
3. Drums are carried to a unit, lifted, gravity-poured into the unit's tank → **Unit dispense**
4. When Hijau runs out, fuel is moved from Merah/Kuning to Hijau → **Tank transfer**
5. When Hijau is restocked, fuel can be returned to Merah/Kuning → **Tank transfer**

Physical drums have painted names (free text: "Drum 1", "Drum 2", "Polos", etc.). Drums can be pre-staged (filled but not yet dispatched to any unit).

---

## 2. Bunker Code System

- Each fresh fuel delivery from a tanker is assigned a **Bunker Code**: `X1`, `X2`, … `X25` (already used on paper), next is **X26**
- Each drum fill under a bunker gets a **Transfer Code**: `X26-1`, `X26-2`, etc. (auto-incremented per bunker)
- Transfer codes tie together: which physical drum + which bunker + how much volume

---

## 3. L/Hr Consumption Calculation

```
L/Hr = liters_dispensed / (hm_at_fill - hm_at_previous_fill_for_same_unit)
```

- `liters_dispensed` is recorded at dispense time (copied from the drum fill record)
- Volume per drum is normally 200L but can be less (e.g. 180L when tank is nearly empty)
- Previous fill HM = the `hm_at_fill` of the most recent prior dispense for the same unit
- If no prior dispense exists for that unit, L/Hr is null

---

## 4. Database Schema (4 new Supabase tables)

### 4.1 `fuel_bunkers`
One row per external fuel delivery.

```sql
CREATE TABLE public.fuel_bunkers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bunker_code     text NOT NULL UNIQUE,   -- "X26", "X27", auto-incremented
  delivery_date   date NOT NULL,
  tank_name       text NOT NULL CHECK (tank_name IN ('hijau','merah','kuning')),
  total_liters    numeric NOT NULL CHECK (total_liters > 0),
  notes           text,
  created_at      timestamptz DEFAULT now()
);
```

### 4.2 `fuel_transfers`
One row per drum fill (tank → drum). Batch-generated under a bunker.

```sql
CREATE TABLE public.fuel_transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code   text NOT NULL UNIQUE,   -- "X26-1", "X26-2", auto-generated
  bunker_id       uuid NOT NULL REFERENCES public.fuel_bunkers(id),
  drum_name       text NOT NULL,          -- free text: "Drum 3", "Polos"
  volume_liters   numeric NOT NULL CHECK (volume_liters > 0),
  filled_date     date NOT NULL,
  status          text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged','deployed')),
  created_at      timestamptz DEFAULT now()
);
```

### 4.3 `fuel_dispenses`
One row per drum → unit dispatch event.

```sql
CREATE TABLE public.fuel_dispenses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id       uuid NOT NULL UNIQUE REFERENCES public.fuel_transfers(id),
  unit_id           uuid NOT NULL REFERENCES public.units(id),
  hm_at_fill        numeric NOT NULL,
  dispense_date     date NOT NULL,
  dispense_time     time,
  liters_dispensed  numeric NOT NULL,   -- copied from fuel_transfers.volume_liters
  l_per_hr          numeric,            -- calculated: liters / (hm_now - hm_prev), null if no prior fill
  notes             text,
  created_at        timestamptz DEFAULT now()
);
```

### 4.4 `fuel_tank_transfers`
One row per tank-to-tank fuel move.

```sql
CREATE TABLE public.fuel_tank_transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_tank       text NOT NULL CHECK (from_tank IN ('hijau','merah','kuning')),
  to_tank         text NOT NULL CHECK (to_tank IN ('hijau','merah','kuning')),
  volume_liters   numeric NOT NULL CHECK (volume_liters > 0),
  transfer_date   date NOT NULL,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  CHECK (from_tank <> to_tank)
);
```

### 4.5 Tank Level Formula (always derived, never stored)

```
current_level(tank X) =
  + SUM(fuel_bunkers.total_liters WHERE tank_name = X)
  + SUM(fuel_tank_transfers.volume_liters WHERE to_tank = X)
  - SUM(fuel_transfers.volume_liters JOIN fuel_bunkers WHERE tank_name = X)
  - SUM(fuel_tank_transfers.volume_liters WHERE from_tank = X)
```

### 4.6 RLS Policies
All 4 tables: SELECT/INSERT/UPDATE/DELETE restricted to `role = 'admin'`.

---

## 5. UI — Admin Sidebar

New sidebar nav item: **"BBM"** added after "Catat Servis".

The BBM screen has **5 sub-tabs** rendered as bold pills at the top (same pattern as SPV Jadwal):

```
[ Status ]  [ Terima BBM ]  [ Isi Drum ]  [ Distribusi ]  [ Riwayat ]
```

---

### 5.1 Sub-tab: STATUS

**Tank Gauges** — 3 cards in a row (responsive: stacks on mobile)
- Each card: tank name, color-coded fill bar, current liters, percentage, max capacity
- Colors: Hijau = green, Merah = red, Kuning = yellow
- If level < 20% → bar turns orange with warning icon
- Button: **"Pindah Antar Tanki"** → opens modal with fields: From Tank, To Tank, Volume (L), Tanggal, Catatan

**Staged Drums** — table below tank gauges
- Title: "Drum Terisi — Belum Didistribusi (N)"
- Columns: Transfer Code | Drum | Volume | Tanggal Isi | Bunker
- Each row has a **"Distribusi"** shortcut button that opens Distribusi sub-tab pre-filled

---

### 5.2 Sub-tab: TERIMA BBM

Form to record an incoming fuel delivery.

```
Fields:
  Tanggal Terima   date (default: today)
  Tanki Tujuan     select: Hijau / Merah / Kuning
  Volume (L)       number
  Catatan          text optional

Preview (shown dynamically):
  "Kode Bunker yang akan digenerate: X26"
  "Sisa kapasitas Tanki Hijau sebelum pengisian: 3.240 L"
```

On submit: inserts `fuel_bunkers`, refreshes STATUS tab.

---

### 5.3 Sub-tab: ISI DRUM

Batch-fill drums from an existing bunker.

```
Fields:
  Pilih Bunker     select (shows "X26 — Hijau — 8.000L — 24 Jul 2026")
  Tanggal Isi      date (default: today)

  Drum rows (dynamic, add/remove):
    Nama Drum      text    ("Drum 1", "Polos", etc.)
    Volume (L)     number  (default: 200)
  [+ Tambah Drum] button

Preview:
  "Transfer codes yang akan dibuat: X26-4, X26-5, X26-6"
  "Volume total: 600L | Sisa dari bunker ini: 7.400L → 6.800L setelah isi"
```

On submit: inserts N rows into `fuel_transfers` (status: 'staged'), refreshes STATUS.

---

### 5.4 Sub-tab: DISTRIBUSI

Dispatch a staged drum to a unit and record the HM.

```
Fields:
  Pilih Drum       select from staged drums
                   (shows "X26-3 · Drum 2 · 200L · Isi: 24/07/2026")
  Pilih Unit       select from units
  HM saat Isi      number
  Tanggal          date (default: today)
  Jam              time optional
  Catatan          text optional

Shows dynamically (after unit selected):
  "Pengisian terakhir unit ini: 24/07/2026 — HM: 8.050"
  "L/Hr sebelumnya: 12.4 L/Hr"
  "Estimasi L/Hr sekarang: ~11.8 L/Hr" (if HM entered)
```

On submit:
1. Inserts `fuel_dispenses` (calculates l_per_hr from previous dispense for this unit)
2. Updates `fuel_transfers.status` = 'deployed'
3. Refreshes STATUS and Riwayat

---

### 5.5 Sub-tab: RIWAYAT

Full history of all unit fill events.

Sort pills: **Terbaru** (default) | **Per Unit** | **Per Bunker**

```
Columns: Tanggal | Jam | Unit | HM | Transfer Code | Drum | Bunker | Liter | L/Hr
```

- **Per Unit**: grouped under bold unit code headers (same pattern as existing SPV sort)
- **Per Bunker**: grouped under bold bunker code headers (X25, X26…)
- **Terbaru**: flat list, newest first

---

## 6. Key JS Functions

```
loadFuelStatus()              fetch + render STATUS tab
loadFuelBunkerCapacity()      helper: remaining liters in a bunker
calcTankLevels()              compute all 3 tanks from DB
renderTankGauges()            draw gauge cards
renderStagedDrums()           draw staged drum table
submitFuelBunker()            Terima BBM form submit
submitDrumFills()             Isi Drum batch submit
submitFuelDispense()          Distribusi form submit
submitTankTransfer()          tank-to-tank modal submit
loadFuelRiwayat()             fetch + render Riwayat
setFuelRiwayatSort(sort)      update sort state + re-render
getNextBunkerCode()           query MAX bunker_code, return X(N+1)
getNextTransferSeq(bunkerId)  query MAX seq for this bunker, return N+1
calcLPerHr(unitId, hm, liters) query prev dispense HM, compute ratio
```

---

## 7. Supabase Starting State

After tables are created, seed one manual record:
```sql
-- Most recent bunker already used was X25
-- No seed rows needed; getNextBunkerCode() will return X26 automatically
-- Tank levels start at 0 until first Terima BBM is recorded
```

Admin will input historical bunker data manually via Terima BBM if desired.

---

## 8. Constraints & Edge Cases

- **Cannot distribute a drum twice**: `transfer_id UNIQUE` on `fuel_dispenses`
- **Tank cannot go below 0**: warn on submit if drum fills would exceed remaining tank level
- **L/Hr null on first fill**: no prior HM exists for a unit, show "—" in Riwayat
- **Partial drum**: volume_liters is editable, default 200 but can be any positive number
- **Bunker code format**: always `X` + integer, no leading zeros. Next after X25 = X26
- **Transfer code format**: `{bunker_code}-{seq}` where seq starts at 1 per bunker

---

## 9. Out of Scope

- Fuel cost / IDR tracking (not requested)
- SPV or MKN visibility into fuel data (admin-only)
- Export to CSV (can be added later)
- Push notifications for low tank level (can be added later)
