# Inbox WA — Design Spec

**Date:** 2026-10-03
**Project:** SERVIS SAA — servis-saa.vercel.app
**Author:** Design session with Michael (Claude / Cowork)
**Status:** Approved concept — awaiting review of this spec

---

## Overview

All operational data for SERVIS SAA (HM awal/akhir per kapal, isi solar, keluhan alat, servis selesai, sesi NSE) currently arrives through WhatsApp groups and is typed in by hand.

**Inbox WA** lets Claude read those WhatsApp groups (via WhatsApp Web + Claude in Chrome), read the HM / fuel-gauge photos, and save each finding as a **draft** in a new table `wa_inbox`. An admin reviews drafts in a new admin screen **"Inbox WA"** and approves, edits or rejects them. Only approved drafts touch operational tables.

**Core rule:** Claude never writes to operational tables (`projects`, `project_units`, `fuel_dispenses`, `service_requests`, `service_log`, `hm_updates`, `nse_sessions`). Claude only inserts into `wa_inbox`.

**Approve = prefill an existing form.** Approving a draft opens the *existing* modal/form for that data type (Add Kapal, BBM Pengisian, Catat Servis, …) prefilled with the draft values. The admin presses the normal Save button, so every existing validation (HM overlap, HM duplicate, bunker capacity, 1/day, current_hm+200 …) still runs. On successful save the draft is marked `approved` and linked to the new row.

---

## Global Constraints

- Single-file app: all UI changes in `index.html`
- **NEVER use the Edit tool on `index.html` JS sections** — use Node.js patch scripts (`replaceFn` / `replaceExact`), CRLF (`\r\n`) match strings, verify with `node --check`
- Admin-only: "Inbox WA" nav item and screen must not appear for SPV, Operator or MKN
- Repo is PUBLIC: no keys, phone numbers or credentials in committed files
- Draft rows are immutable evidence: edits go into `payload_edited`, original `payload` is never overwritten

---

## Data sources (WhatsApp groups)

| Group | Content | Draft kinds produced |
|---|---|---|
| KCN excavator group | HM awal/akhir per unit per kade, isi solar dari drum, photos of Kobelco dashboard (HM + fuel gauge) | `project_unit_hm`, `fuel_dispense`, `project_kapal` |
| Customer groups (e.g. Surya alam armada x bsa, Pengawasan Pindo / SAA) | Nama kapal (TK./BG./MV), kade, start time, SPK | `project_kapal` |
| Service Alat | Keluhan / request (hose pecah, seal rembes, order part) and servis selesai with HM photo | `service_request`, `service_log`, `hm_update` |
| stockpile NSE | HM photos for NSE sessions | `nse_session` |

Who creates the Proyek Kapal: **whoever is first.** If no open kapal project matches (same kade, nama kapal, overlapping date), Claude drafts a `project_kapal`; unit HM drafts reference it via `parent_id`. If the admin already created the project, Claude links unit drafts to the existing `project_id`.

---

## Database

### New table: `wa_inbox`

```sql
CREATE TABLE IF NOT EXISTS public.wa_inbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  kind            text NOT NULL CHECK (kind IN ('project_kapal','project_unit_hm','fuel_dispense',
                                                 'service_request','service_log','hm_update','nse_session')),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','duplicate')),
  source_group    text NOT NULL,          -- WhatsApp group name
  wa_sender       text,                   -- display name as shown in WA (no phone numbers)
  wa_sent_at      timestamptz NOT NULL,   -- message time
  photo_taken_at  timestamptz,            -- Timemark / camera stamp if readable (preferred over wa_sent_at)
  wa_text         text,                   -- caption / message text, verbatim
  unit_code       text,                   -- e.g. 'K7', 'A10' (denormalized for filtering)
  payload         jsonb NOT NULL,         -- Claude's extraction (see per-kind schema)
  payload_edited  jsonb,                  -- admin edits, if any
  confidence      text NOT NULL DEFAULT 'high' CHECK (confidence IN ('high','medium','low')),
  issues          text[],                 -- e.g. {'HM desimal kurang jelas','HM awal tidak ditemukan'}
  parent_id       uuid REFERENCES public.wa_inbox(id) ON DELETE SET NULL,
  dedupe_key      text UNIQUE,            -- source_group|wa_sender|wa_sent_at|kind|unit_code
  target_table    text,
  target_id       uuid,
  reviewed_by     uuid REFERENCES public.profiles(id),
  reviewed_at     timestamptz,
  reject_reason   text
);
CREATE INDEX IF NOT EXISTS idx_wa_inbox_status ON public.wa_inbox(status, wa_sent_at DESC);

ALTER TABLE public.wa_inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_wa_inbox" ON public.wa_inbox FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
```

Claude inserts rows while running inside a Chrome tab logged in to SERVIS SAA as admin, using the page's own `sb` client, so no new keys or service accounts are needed. `dedupe_key` UNIQUE makes re-reading the same chat safe (insert with `onConflict: 'dedupe_key', ignoreDuplicates: true`).

### Payload schema per kind

| kind | payload fields | Approve opens | Target |
|---|---|---|---|
| `project_kapal` | `nama_kapal, pemberi_kerja, kade, start_date, cargo_type, notes` | `openAddKapalModal()` prefilled | `projects` |
| `project_unit_hm` | `project_id` or `parent_id`, `unit_code, hm_awal, hm_akhir, solar_awal_pct, solar_akhir_pct, kade` | Add Kapal unit row (new project) or `openEditKapalModal(id)` with unit row prefilled (existing project; fills hm_akhir if an open row exists) | `project_units` |
| `fuel_dispense` | `unit_code, hm_at_fill, dispense_date, dispense_time, drum_name, liters (default 200, flagged), gauge_pct, project_code` | BBM → Pengisian form prefilled; admin chooses sumber/bunker | `fuel_transfers` + `fuel_dispenses` |
| `service_request` | `unit_code, category, description, urgency, nama_barang` | Catat / SR form prefilled | `service_requests` |
| `service_log` | `unit_code, maintenance_type, hm_at_service, service_date, parts_used, notes` | Catat Servis form prefilled | `service_log` (+ `hm_updates`) |
| `hm_update` | `unit_code, hm_value, recorded_at` | Simple confirm dialog | `hm_updates` |
| `nse_session` | `session_date, session_num, start_time, end_time, hm_awal, hm_akhir, unit_code` | NSE add form prefilled | `nse_sessions` |

---

## UI — Admin screen "Inbox WA"

- Sidebar item **Inbox WA** with a red badge = count of `pending`.
- Filters: status pills (Pending / Approved / Rejected / Semua), group dropdown, unit pills.
- List grouped by day, newest first. Each card shows: kind label + unit, extracted values (HM awal → akhir, solar %, drum, keluhan), WA group, sender, time, verbatim caption, confidence chip (green/amber/red) and `issues` in amber.
- Draft children (unit HM rows) are shown nested under their `project_kapal` draft; approving the parent first is enforced.
- Actions: **Approve** (opens prefilled form), **Tolak** (reason required), **Tandai duplikat**.
- After a successful save in the prefilled form, the hook `markInboxApproved(inboxId, table, newId)` sets `status='approved'`, `target_table`, `target_id`, `reviewed_by`, `reviewed_at`, and stores any changed fields in `payload_edited`.

Hook mechanism: a global `window.pendingInboxId` is set when a form is opened from the inbox; each submit function (`submitAddKapal`, `submitEditKapal`, `submitPengisian`, service/NSE submits) calls `await onInboxSaved(table, newId)` after its success toast. `onInboxSaved` is a no-op when `pendingInboxId` is null, so manual entry is unaffected.

---

## Claude ingestion rules (agent side — runbook)

Documented in `docs/wa-inbox-runbook.md`; summary:

1. Open WhatsApp Web, read only the configured groups, messages since the last ingested `wa_sent_at` per group.
2. Text messages without photos → service_request / notes. Photo messages → open the viewer, read **HM** (digital `XXXXX.Xh` or analog Quartz meter), **fuel gauge %** and **Timemark date/time** per photo.
3. Caption decides meaning; "awal & akhir" with 2 photos → earlier timestamp = awal. Analog meters / blurred digits → `confidence='medium'|'low'` + issue text.
4. Own messages (green bubble) are never drafted as operator reports.
5. Sanity checks before insert: HM must not be lower than `units.current_hm` − 1; HM akhir ≥ HM awal; flag gaps > 24h of HM in one shift.
6. Insert drafts via `sb.from('wa_inbox').upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true })` in the logged-in SERVIS SAA tab.
7. Post a short summary to Michael: count per kind, low-confidence items, urgent service requests.

---

## Out of scope (v1)

- Storing WhatsApp photos in Supabase Storage (v2 — card shows WA reference instead)
- Running without a computer (v2 — WhatsApp Business API + server agent)
- Auto-approve of high-confidence drafts
