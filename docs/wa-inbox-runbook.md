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
4. "Sebelum dan sesudah isi solar <unit> drum no X" → one `fuel_dispense` (HM = **BEFORE** photo — admin convention confirmed by backtest 3 Okt; gauge_pct = before %, liters = 200 default + issue "volume default 200L"). Drum number is often a separate follow-up message ("No 6").
   - Before drafting, check `fuel_dispenses` for same unit within ±0.5 HM — admin often enters fills the next morning; skip if present.
   - Never "correct" a photo reading toward `units.current_hm`: current_hm may already include later HM akhir. Flag the doubt instead.
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

## Backtest 30 Sep – 3 Okt 2026 (results)
- KCN excavator group: 26/26 HM awal/akhir matched `project_units`; 4/4 ship names; 23/23 fuel fills matched `fuel_dispenses` (HM before).
- Analog Quartz meters (K5, K7): readable when shown full-screen; one mistake came from overriding a correct read with current_hm.
- Service Alat: scheduled-maintenance logs match on HM; repairs (roller, final drive, hose, lights) are mostly not logged; service_requests module is barely used (2 rows vs ~15 WA requests).
- Dashboard warnings visible in photos (fuel injection fault, filter/oil due, coolant low) are worth extracting as `service_request` drafts.

## Supervisor (cluster SAA · WA Data Intake)
Every pending draft is re-checked when the Inbox opens (`inbox_checks.src.js`, UI `inbox_supervisor.src.js`).
Verdict on each card: **✓ Masuk akal** / **⚠ Cek ini** / **✕ Tidak masuk akal**, with the reason.

Rules (approved by Michael 4 Okt 2026):
1. HM never goes backwards vs the unit's last known HM (project HM awal/akhir, isi solar, servis, update HM, other drafts). Uses timestamps, not `units.current_hm`.
2. HM jump must fit the hours elapsed since the previous reading.
3. HM akhir ≥ HM awal (also vs the project's HM awal).
4. Service cycle: **Racor every 250 HM; Oli Mesin + Filter Oli Mesin + Filter Solar every 500 HM, together with the 2nd Racor.** Flags: < 50% of interval = likely double (✕), < 80% = early (⚠), > 110% = overdue (⚠), incomplete 500 set, 2nd Racor without the oil set.
5. Solar: liters per HM vs the unit's median L/jam (0.5×–1.6×), gauge ≥ 90% before filling, fill HM inside the project's HM awal–akhir on days strictly inside the project.
6. Already entered: same unit ±0.5 HM (solar), same type ±5 HM (servis), same HM (proyek) → "cocok dengan input admin".
7. Dates: photo stamp vs WA time; draft date vs photo date (Asia/Jakarta).
8. Ship & kade: similar names within ±14 days (e.g. TRI BAHARI 3 vs Tribahari 111), two ships on one kade, kade differs from project.
9. Service requests: similar open SR already exists.

## Dry run — how we know the supervisor is right
1. **Scenario tests** (every change to the rules): `node test_cases/inbox_checks.test.js` — known-good drafts must pass, known-bad drafts (HM mundur, HM loncat, Racor dobel K5, servis 500 tidak lengkap, tanggal beda 1 hari, TRI BAHARI vs Tribahari, gauge 95%, L/jam aneh, unit tak dikenal, SR dobel) must be flagged by the right rule.
2. **Audit data lama** (once, then weekly): Inbox WA → *Audit data 14 hari* runs the same rules over what is already in SERVIS SAA. It must find the issues we already know from the 3 Okt backtest (Racor dobel K5 24 Sep & A8 30 Sep). Anything else it finds is either a real data error or a rule to tune.
3. **Daily dry run (7 days)** — Claude parses WA every night, admin keeps typing manually as usual. Next morning in Inbox WA:
   - Click *Tandai … yang cocok admin sebagai sudah diinput* (closes drafts that equal the admin's entry).
   - For every remaining draft decide: **Tolak** with a reason if the draft is wrong; **Approve** if the admin missed it; **Duplikat** if it is a repeat message.
   - *Rapor dry run (7 hari)* then shows: parser benar %, cocok dengan admin %, draft salah yang ditangkap %, alarm palsu %, and lists of misses and false alarms.
4. **Go-live criteria:** 7 consecutive days with **0 wrong drafts that the supervisor passed**, false alarms below ±20%, parser right ≥ 95%. Each miss becomes a new rule + a new scenario test.
