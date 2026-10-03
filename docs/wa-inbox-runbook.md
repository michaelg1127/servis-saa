# Inbox WA — Claude ingestion runbook

How Claude (Cowork + Claude in Chrome) turns WhatsApp messages into `wa_inbox` drafts.
Spec: `docs/superpowers/specs/2026-10-03-wa-inbox-design.md`

## Preconditions
- Chrome on Michael's computer: WhatsApp Web logged in, SERVIS SAA (servis-saa.vercel.app) logged in as **admin** (Michael logs in himself — Claude never types passwords).
- Use a dedicated WhatsApp Web window; nobody else clicks in it during ingestion.

## Groups
| Group | Kinds |
|---|---|
| KCN excavator group | `project_unit_hm`, `fuel_dispense` |
| Surya alam armada x bsa, Pengawasan Pindo / SAA (customer groups) | `project_kapal` (nama kapal, kade, start) |
| Service Alat | `service_request`, `service_log`, `hm_update` |
| stockpile NSE | `nse_session` |

## Reading rules
1. Start from the newest `wa_sent_at` already in `wa_inbox` for that group (query first); read forward.
2. Caption = meaning. Photos = numbers. Open every photo in the viewer:
   - Digital Kobelco display: `⧗ 18445.2h` → HM. Fuel gauge needle → % (E=0, F=100, round to 10).
   - Analog Quartz meter: read digits; red last digit = 1/10. If unsure → `confidence:'medium'`, add issue.
   - Timemark / camera stamp (e.g. "02 Oktober 2026 23:03") → `photo_taken_at`.
3. "awal & akhir" with 2 photos → earlier stamp = awal. Separate drafts for HM awal and HM akhir events.
4. "Sebelum dan sesudah isi solar <unit> drum no X" → one `fuel_dispense` (HM = after photo, gauge_pct = before %, liters = 200 default + issue "volume default 200L").
5. Green bubbles (Michael's own messages) are context, never drafts.
6. Keluhan words → urgency: pecah / bocor / putus / mati / tidak bisa jalan → `darurat`; rembes / bunyi / panas → `urgent`; else `normal`. Category: hose/seal/silinder → Hidrolik; mesin/oli mesin/turbo → Mesin/Engine; lampu/aki/kabel → Listrik; roller/track/sprocket → Track/Undercarriage.
7. Sanity: HM ≥ units.current_hm − 1, HM akhir ≥ HM awal, jump > 24 HM in one shift → issue.
8. Proyek Kapal: look for an open kapal project (`projects` type kapal, same kade/nama kapal, `hm_akhir` null rows). Found → `payload.project_id`. Not found → create a `project_kapal` draft and set unit drafts' `parent_id` to it.

## Insert (run in the logged-in SERVIS SAA tab)
```js
// upsert(..., { onConflict }) failed with "Failed to fetch" from the browser on 2026-10-03 — use plain insert.
// Pre-check: select dedupe_key in (...) and drop rows that already exist, then:
await sb.from('wa_inbox').insert(rows).select('id, kind, unit_code');
```
`dedupe_key = [source_group, wa_sender, wa_sent_at ISO, kind, unit_code].join('|')`
Parent rows must be inserted first (use `.select('id')` to get the id for `parent_id`).

## Report to Michael (chat)
- Count per kind, list of `low`/`medium` confidence items, any `darurat` service request first.
