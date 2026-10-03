# TC002 — Inbox WA approve flows

Pre: `wa_inbox_migration.sql` run; logged in as admin; seed drafts inserted (see plan "Seed examples").

| # | Step | Expected |
|---|---|---|
| 1 | Login as admin | Sidebar shows "Inbox WA" with red badge = pending count |
| 2 | Login as SPV / Operator / MKN | No Inbox WA anywhere |
| 3 | Approve `project_kapal` with 1 child (HM awal) | Tambah Proyek Kapal modal opens prefilled + blue banner + unit row. Save → project created, parent + child status approved |
| 4 | Approve child HM akhir after parent approved | Edit Proyek Kapal opens, unit row highlighted, HM akhir + solar akhir filled. Save → approved |
| 5 | Approve `fuel_dispense` | BBM > PENGISIAN prefilled, volume highlighted amber. Choose sumber, Save → approved, target fuel_transfers |
| 6 | Approve `service_request` | Modal prefilled (unit, kategori, urgensi). Kirim → SR pending_spv visible to SPV, draft approved |
| 7 | Approve `hm_update` with HM lower than current | Blocked with toast, draft stays pending |
| 8 | Approve, then click "batal" in banner, then add a Kapal manually | Manual save works; draft stays pending |
| 9 | Tolak without reason | Blocked; with reason → rejected, shown under "Ditolak" |
| 10 | Insert same draft twice (same dedupe_key) | Second insert ignored |
| 11 | Regression: add Kapal / Pengisian / Catat Servis manually (no Inbox) | Behaves exactly as before |
