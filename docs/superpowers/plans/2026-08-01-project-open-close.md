# Project Open/Close Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip the Add Project form to open-only fields (Awal + identity), make Solar Isi auto-computed from `fuel_dispenses` (never manually entered), and integrate fill data into detail view, edit modal, Ringkasan, and Excel export.

**Architecture:** All JS changes go through Node.js patch scripts (`patch_*.js`) using `replaceExact(from, to, desc)` — never the Edit tool directly on `index.html`. Six patch scripts, one per task. A new `fetchFillMap(projectIds)` async helper centralises all fill-data fetching. Detail rows are lazy-rendered on first expand (project data cached in `_proyekKapalCache` / `_proyekStockpileCache`).

**Tech Stack:** Single `index.html` (Vanilla JS + Tailwind CDN + Supabase JS SDK), Node.js patch scripts, Vercel auto-deploy from GitHub master.

## Global Constraints

- **NEVER use the Edit tool on JS string literals in index.html** — corrupts apostrophes to curly quotes, breaks the entire `<script>` silently. All JS changes go through Node.js patch scripts.
- All multiline `from`/`to` strings in patch scripts use `const R = '\r\n'` (Windows CRLF).
- `replaceExact(from, to, desc)` exits with code 1 if the match count ≠ 1 (MISS or AMBIGUOUS). Fix the string before re-running.
- Always end each patch script with `node --check` on the extracted `<script>` block.
- Commit after each task. Do not batch tasks into one commit.
- DB SQL must be run in Supabase **before** deploying code that depends on nullable columns.

---

## Task 1: DB Schema — Nullable Columns

**Files:**
- No code changes. SQL only.
- Modify: Supabase SQL editor

**What this enables:** `solar_akhir_pct`, `solar_isi_liters` can be NULL (not entered at open time). `end_date` and `total_mt_m3` on `projects` can be NULL (filled in later).

- [ ] **Step 1: Run SQL in Supabase**

Open Supabase → SQL Editor → run:

```sql
ALTER TABLE project_units ALTER COLUMN solar_akhir_pct DROP NOT NULL;
ALTER TABLE project_units ALTER COLUMN solar_isi_liters DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN total_mt_m3 DROP NOT NULL;
```

- [ ] **Step 2: Verify**

In Supabase Table Editor, open `project_units`. Confirm `solar_akhir_pct` and `solar_isi_liters` columns now show as nullable (no NOT NULL badge). Open `projects`, confirm `end_date` and `total_mt_m3` are nullable.

---

## Task 2: Add Form Simplification

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t2.js`
- Modify: `index.html` (via patch script)

**What changes:**
- `addKapalUnitRow()` — grid shrinks from 7 cols to 4: Unit + HM Awal + Solar Awal% + × button. HM Akhir, Solar Akhir%, Solar Isi divs removed.
- `addStockpileUnitRow()` — same pattern (su- prefix).
- `openAddKapalModal()` — remove the Total MT/M3 field from the 3-col grid (make it 2-col: Kade + Jenis Kargo), remove the Harga/MT + Harga Solar grid entirely, change Tgl Mulai/Selesai 2-col grid to Tgl Mulai only.
- `openAddStockpileModal()` — remove the Tgl Selesai field (Tgl Mulai stays as single field).
- `submitAddKapal()` — remove `hmAkhir`, `sAkhir`, `sIsi` reads; remove `isNaN(sAkhir)` from validation; fix `unitRows.push` to always send `hm_akhir: null, solar_akhir_pct: null, solar_isi_liters: 0`.
- `submitAddStockpile()` — same.

- [ ] **Step 1: Create patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t2.js`:

```javascript
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// T2-1: addKapalUnitRow — strip to 4 cols (Unit | HM Awal | Solar Awal% | ×)
replaceExact(
  "  div.innerHTML = '<div style=\"display:grid;grid-template-columns:1fr 80px 80px 60px 60px 80px 24px;gap:8px;align-items:end;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select class=\"finput\" id=\"ku-unit-' + rowId + '\" style=\"font-size:12px;padding:6px 8px;\"><option value=\"\">Pilih</option>' + unitOptions + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"ku-hmawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" onblur=\"onKapalHMAwalChange(this,' + rowId + ')\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Akhir</label><input type=\"number\" id=\"ku-hmakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"Opsional\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"ku-sawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"80\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Akhir%</label><input type=\"number\" id=\"ku-sakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"20\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"ku-sisi-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" min=\"0\"></div>'" + R +
  "    + '<div style=\"padding-bottom:2px;\"><button onclick=\"removeKapalUnitRow(' + rowId + ')\" style=\"background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;\">×</button></div>'" + R +
  "    + '</div>'",

  "  div.innerHTML = '<div style=\"display:grid;grid-template-columns:1fr 80px 60px 24px;gap:8px;align-items:end;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select class=\"finput\" id=\"ku-unit-' + rowId + '\" style=\"font-size:12px;padding:6px 8px;\"><option value=\"\">Pilih</option>' + unitOptions + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"ku-hmawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" onblur=\"onKapalHMAwalChange(this,' + rowId + ')\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"ku-sawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"80\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div style=\"padding-bottom:2px;\"><button onclick=\"removeKapalUnitRow(' + rowId + ')\" style=\"background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;\">×</button></div>'" + R +
  "    + '</div>'",

  'T2-1: addKapalUnitRow: strip to 4 cols'
);

// T2-2: addStockpileUnitRow — strip to 4 cols (Unit | HM Awal | Solar Awal% | ×)
replaceExact(
  "  div.innerHTML = '<div style=\"display:grid;grid-template-columns:1fr 80px 80px 60px 60px 80px 24px;gap:8px;align-items:end;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select class=\"finput\" id=\"su-unit-' + rowId + '\" style=\"font-size:12px;padding:6px 8px;\"><option value=\"\">Pilih</option>' + unitOptions + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"su-hmawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" onblur=\"onStockpileHMAwalChange(this,' + rowId + ')\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Akhir</label><input type=\"number\" id=\"su-hmakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"Opsional\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"su-sawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"80\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Akhir%</label><input type=\"number\" id=\"su-sakhir-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"20\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"su-sisi-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" min=\"0\"></div>'" + R +
  "    + '<div style=\"padding-bottom:2px;\"><button onclick=\"removeStockpileUnitRow(' + rowId + ')\" style=\"background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;\">×</button></div>'" + R +
  "    + '</div>'",

  "  div.innerHTML = '<div style=\"display:grid;grid-template-columns:1fr 80px 60px 24px;gap:8px;align-items:end;\">'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Unit</label><select class=\"finput\" id=\"su-unit-' + rowId + '\" style=\"font-size:12px;padding:6px 8px;\"><option value=\"\">Pilih</option>' + unitOptions + '</select></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">HM Awal</label><input type=\"number\" id=\"su-hmawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"0\" onblur=\"onStockpileHMAwalChange(this,' + rowId + ')\"></div>'" + R +
  "    + '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Awal%</label><input type=\"number\" id=\"su-sawal-' + rowId + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" placeholder=\"80\" min=\"0\" max=\"100\"></div>'" + R +
  "    + '<div style=\"padding-bottom:2px;\"><button onclick=\"removeStockpileUnitRow(' + rowId + ')\" style=\"background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;\">×</button></div>'" + R +
  "    + '</div>'",

  'T2-2: addStockpileUnitRow: strip to 4 cols'
);

// T2-3: openAddKapalModal — remove 3rd grid row (Harga/MT | Harga Solar | empty)
// and remove Total MT from 2nd grid, change Tgl Selesai grid to Tgl Mulai only
replaceExact(
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Kade</label><input type=\"text\" id=\"kapal-add-kade\" class=\"finput\" placeholder=\"Kade 3\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jenis Kargo</label><input type=\"text\" id=\"kapal-add-cargo\" class=\"finput\" placeholder=\"Batubara\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Total MT/M3 *</label><input type=\"number\" id=\"kapal-add-mt\" class=\"finput\" placeholder=\"5000\" min=\"0\" step=\"0.01\"></div>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Harga (Rp/MT)</label><input type=\"number\" id=\"kapal-add-unitprice\" class=\"finput\" placeholder=\"Revenue/MT\" min=\"0\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Harga Solar (Rp/L)</label><input type=\"number\" id=\"kapal-add-solarprice\" class=\"finput\" placeholder=\"10000\" min=\"0\"></div>'" + R +
  "    + '<div></div>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"kapal-add-start\" class=\"finput\" value=\"' + today + '\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Selesai *</label><input type=\"date\" id=\"kapal-add-end\" class=\"finput\" value=\"' + today + '\"></div>'" + R +
  "    + '</div>'",

  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Kade</label><input type=\"text\" id=\"kapal-add-kade\" class=\"finput\" placeholder=\"Kade 3\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jenis Kargo</label><input type=\"text\" id=\"kapal-add-cargo\" class=\"finput\" placeholder=\"Batubara\"></div>'" + R +
  "    + '</div>'" + R +
  "    + '<div style=\"margin-bottom:16px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"kapal-add-start\" class=\"finput\" value=\"' + today + '\"></div>'",

  'T2-3: openAddKapalModal: remove Total MT, Harga, Tgl Selesai'
);

// T2-4: openAddStockpileModal — remove Tgl Selesai, keep Tgl Mulai only
replaceExact(
  "    + '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"stk-add-start\" class=\"finput\" value=\"' + today + '\"></div>'" + R +
  "    + '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Selesai *</label><input type=\"date\" id=\"stk-add-end\" class=\"finput\" value=\"' + today + '\"></div>'" + R +
  "    + '</div>'",

  "    + '<div style=\"margin-bottom:16px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"stk-add-start\" class=\"finput\" value=\"' + today + '\"></div>'",

  'T2-4: openAddStockpileModal: remove Tgl Selesai'
);

// T2-5: submitAddKapal — read only what the form still has, fix push
replaceExact(
  "    const hmAkhir = parseFloat(document.getElementById('ku-hmakhir-' + rowId)?.value);" + R +
  "    const sAwal = parseInt(document.getElementById('ku-sawal-' + rowId)?.value);" + R +
  "    const sAkhir = parseInt(document.getElementById('ku-sakhir-' + rowId)?.value);" + R +
  "    const sIsi = parseFloat(document.getElementById('ku-sisi-' + rowId)?.value) || 0;" + R +
  "    const gapDiv = document.getElementById('ku-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('ku-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    if (isNaN(sAwal) || isNaN(sAkhir)) { showToast('Solar gauge wajib diisi'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: sAwal, solar_akhir_pct: sAkhir, solar_isi_liters: sIsi, hm_gap_reason: gapReason || null });",

  "    const sAwal = parseInt(document.getElementById('ku-sawal-' + rowId)?.value);" + R +
  "    const gapDiv = document.getElementById('ku-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('ku-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (isNaN(sAwal) || sAwal < 0 || sAwal > 100) { showToast('Solar Awal% wajib diisi (0-100)'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: null, solar_awal_pct: sAwal, solar_akhir_pct: null, solar_isi_liters: 0, hm_gap_reason: gapReason || null });",

  'T2-5: submitAddKapal: remove Akhir/Isi reads + fix push'
);

// T2-6: submitAddStockpile — same cleanup (su- prefix, unique by stk-urow-)
replaceExact(
  "    const hmAkhir = parseFloat(document.getElementById('su-hmakhir-' + rowId)?.value);" + R +
  "    const sAwal = parseInt(document.getElementById('su-sawal-' + rowId)?.value);" + R +
  "    const sAkhir = parseInt(document.getElementById('su-sakhir-' + rowId)?.value);" + R +
  "    const sIsi = parseFloat(document.getElementById('su-sisi-' + rowId)?.value) || 0;" + R +
  "    const gapDiv = document.getElementById('su-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('su-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (!isNaN(hmAkhir) && hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }" + R +
  "    if (isNaN(sAwal) || isNaN(sAkhir)) { showToast('Solar gauge wajib diisi'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: sAwal, solar_akhir_pct: sAkhir, solar_isi_liters: sIsi, hm_gap_reason: gapReason || null });",

  "    const sAwal = parseInt(document.getElementById('su-sawal-' + rowId)?.value);" + R +
  "    const gapDiv = document.getElementById('su-gap-' + rowId);" + R +
  "    const gapVisible = gapDiv && gapDiv.style.display !== 'none';" + R +
  "    const gapReason = gapVisible ? document.getElementById('su-gap-reason-' + rowId)?.value.trim() : null;" + R +
  "    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }" + R +
  "    if (isNaN(hmAwal)) { showToast('HM Awal wajib diisi'); return; }" + R +
  "    if (isNaN(sAwal) || sAwal < 0 || sAwal > 100) { showToast('Solar Awal% wajib diisi (0-100)'); return; }" + R +
  "    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }" + R +
  "    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: null, solar_awal_pct: sAwal, solar_akhir_pct: null, solar_isi_liters: 0, hm_gap_reason: gapReason || null });",

  'T2-6: submitAddStockpile: remove Akhir/Isi reads + fix push'
);

// Also remove the Tgl Selesai read in submitAddKapal (it was end date)
// Find: const endDate = document.getElementById('kapal-add-end').value;
// This needs to be grepped first to verify exact string — see Step 2 note.

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T2 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
```

- [ ] **Step 2: Check for end-date read in submitAddKapal/submitAddStockpile**

Before running, grep for the date reads to see if they need patches too:

```bash
node -e "const c=require('fs').readFileSync('index.html','utf8'); const lines=c.split('\n'); lines.forEach((l,i)=>{ if(l.includes('kapal-add-end')||l.includes('stk-add-end')) console.log(i+1,l.trim()); });"
```

If lines are found that read the value (e.g. `const endDate = document.getElementById('kapal-add-end').value`), add additional `replaceExact` patches to remove those reads before the `fs.writeFileSync` call. Also check if `endDate` is used in the subsequent Supabase insert — if so, replace it with `null`.

- [ ] **Step 3: Run the patch**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_open_close_t2.js
```

Expected: 6 OK lines (or more if Step 2 adds patches) + "Syntax OK"

- [ ] **Step 4: Manual verify**

Open `servis-saa.vercel.app` (after push) or test locally. Go to Admin → Proyek → Kapal → "+ Tambah Kapal":
- Unit row should show: Unit | HM Awal | Solar Awal% | × (no HM Akhir, no Solar Akhir, no Solar Isi)
- Modal should NOT have Total MT, Harga/MT, Harga Solar, or Tgl Selesai fields
- Submit with just Nama Kapal + Tgl Mulai + 1 unit row → should save successfully → Supabase `project_units` row should have `hm_akhir=null, solar_akhir_pct=null, solar_isi_liters=0`

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA"
git add index.html patch_open_close_t2.js
git commit -m "feat: strip Add Project form to open-only fields (Awal + identity)"
git push
```

---

## Task 3: fetchFillMap Helper + Global Caches

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t3.js`
- Modify: `index.html` (via patch script)

**What changes:**
- Add `let _proyekKapalCache = {};` and `let _proyekStockpileCache = {};` alongside existing Proyek global state vars.
- Add `async function fetchFillMap(projectIds)` helper that queries `fuel_dispenses` and returns `{ [project_id]: { [unit_id]: liters } }`.

The helper is used by Tasks 4, 5, and 6. Adding it now avoids writing it three times.

- [ ] **Step 1: Find the insertion point for global vars**

```bash
node -e "const c=require('fs').readFileSync('index.html','utf8'); const lines=c.split('\n'); lines.forEach((l,i)=>{ if(l.includes('proyekMonthFilter')||l.includes('let proyekTab')) console.log(i+1,l.trim()); });"
```

Note the line with `let proyekMonthFilter` (or similar Proyek state var declaration block) — the cache vars go right after it.

- [ ] **Step 2: Find the insertion point for the helper function**

```bash
node -e "const c=require('fs').readFileSync('index.html','utf8'); const lines=c.split('\n'); lines.forEach((l,i)=>{ if(l.includes('async function loadProyekKapal')) console.log(i+1,l.trim()); });"
```

The `fetchFillMap` function goes immediately before `loadProyekKapal`.

- [ ] **Step 3: Create patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t3.js`. Use the exact strings found in Steps 1 and 2 as the `from` anchors. The pattern is:

```javascript
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// T3-1: Add cache vars after proyekMonthFilter declaration
// Replace the EXACT line found in Step 1, e.g.:
replaceExact(
  "let proyekMonthFilter = todayISO().slice(0, 7);",   // <-- verify exact string from Step 1
  "let proyekMonthFilter = todayISO().slice(0, 7);" + R +
  "let _proyekKapalCache = {};" + R +
  "let _proyekStockpileCache = {};",
  'T3-1: add project data cache vars'
);

// T3-2: Add fetchFillMap helper before loadProyekKapal
replaceExact(
  "async function loadProyekKapal() {",
  "async function fetchFillMap(projectIds) {" + R +
  "  if (!projectIds || projectIds.length === 0) return {};" + R +
  "  const { data } = await sb.from('fuel_dispenses')" + R +
  "    .select('project_id, unit_id, liters_dispensed')" + R +
  "    .in('project_id', projectIds);" + R +
  "  const map = {};" + R +
  "  (data || []).forEach(function(d) {" + R +
  "    if (!d.project_id) return;" + R +
  "    if (!map[d.project_id]) map[d.project_id] = {};" + R +
  "    map[d.project_id][d.unit_id] = (map[d.project_id][d.unit_id] || 0) + (d.liters_dispensed || 0);" + R +
  "  });" + R +
  "  return map;" + R +
  "}" + R + R +
  "async function loadProyekKapal() {",
  'T3-2: add fetchFillMap helper'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T3 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
```

**Important:** The `from` string in T3-1 must be the exact text of the `proyekMonthFilter` declaration line as it appears in the file. Run the grep in Step 1 and copy it verbatim.

- [ ] **Step 4: Run the patch**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_open_close_t3.js
```

Expected: 2 OK + "Syntax OK"

- [ ] **Step 5: Commit**

```bash
git add index.html patch_open_close_t3.js
git commit -m "feat: add fetchFillMap helper + project data caches"
git push
```

---

## Task 4: Detail Lazy-Load (Toggle + Render)

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t4.js`
- Modify: `index.html` (via patch script)

**What changes:**
- `renderProyekKapalList()` — instead of calling `renderKapalDetailHTML(p)` inline, stores `p` in `_proyekKapalCache[p.id]` and inserts an empty placeholder `<td>` with `data-rendered="false"`.
- `renderProyekStockpileList()` — same.
- `toggleKapalDetail(id)` — becomes `async`. On first expand: calls `fetchFillMap([id])`, builds `unitFillMap = fillMap[id] || {}`, calls `renderKapalDetailHTML(p, unitFillMap)`, inserts HTML, marks `data-rendered="true"`. Subsequent toggles just show/hide.
- `toggleStockpileDetail(id)` — same.
- `renderKapalDetailHTML(p, fillMap)` — new `fillMap` parameter. For each unit: `const solarIsi = fillMap[u.unit_id] != null ? fillMap[u.unit_id] : (u.solar_isi_liters || 0)` and uses it in `calcSolarConsumed`. Display label: "X L (aktual)" if `fillMap[u.unit_id] != null`, else "X L (manual)" if `u.solar_isi_liters`, else "0 L".
- `renderStockpileDetailHTML(p, fillMap)` — same.

- [ ] **Step 1: Find exact strings to replace**

```bash
node -e "
const c = require('fs').readFileSync('index.html', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (
    l.includes('renderKapalDetailHTML(p)') ||
    l.includes('renderStockpileDetailHTML(p)') ||
    l.includes('function toggleKapalDetail') ||
    l.includes('function toggleStockpileDetail') ||
    l.includes('function renderKapalDetailHTML') ||
    l.includes('function renderStockpileDetailHTML')
  ) console.log(i+1, l.trim());
});
"
```

Note the exact lines and surrounding context for each.

- [ ] **Step 2: Create patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t4.js`:

```javascript
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// T4-1: renderProyekKapalList — replace renderKapalDetailHTML(p) call
// with cache + placeholder. The exact surrounding context:
// html2 += '<td colspan="6" style="padding:0;">';
// html2 += renderKapalDetailHTML(p);
// html2 += '</td>';
replaceExact(
  "    html2 += '<td colspan=\"6\" style=\"padding:0;\">';" + R +
  "    html2 += renderKapalDetailHTML(p);" + R +
  "    html2 += '</td>';",

  "    _proyekKapalCache[p.id] = p;" + R +
  "    html2 += '<td colspan=\"6\" style=\"padding:8px;color:#64748B;font-size:12px;\">Klik untuk memuat detail...</td>';",

  'T4-1: renderProyekKapalList: placeholder + cache'
);

// T4-2: renderProyekStockpileList — same
replaceExact(
  "    h += '<td colspan=\"5\" style=\"padding:0;\">';" + R +
  "    h += renderStockpileDetailHTML(p);" + R +
  "    h += '</td>';",

  "    _proyekStockpileCache[p.id] = p;" + R +
  "    h += '<td colspan=\"5\" style=\"padding:8px;color:#64748B;font-size:12px;\">Klik untuk memuat detail...</td>';",

  'T4-2: renderProyekStockpileList: placeholder + cache'
);

// T4-3: toggleKapalDetail — lazy fetch on first expand
replaceExact(
  "function toggleKapalDetail(id) {" + R +
  "  const row = document.getElementById('kapal-detail-' + id);" + R +
  "  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';" + R +
  "}",

  "async function toggleKapalDetail(id) {" + R +
  "  const row = document.getElementById('kapal-detail-' + id);" + R +
  "  if (!row) return;" + R +
  "  if (row.style.display !== 'none') { row.style.display = 'none'; return; }" + R +
  "  row.style.display = '';" + R +
  "  if (row.dataset.rendered === 'true') return;" + R +
  "  const td = row.querySelector('td');" + R +
  "  if (td) td.textContent = 'Memuat...';" + R +
  "  const fillMap = await fetchFillMap([id]);" + R +
  "  const unitFillMap = fillMap[id] || {};" + R +
  "  const p = _proyekKapalCache[id];" + R +
  "  if (!p) { if (td) td.textContent = 'Data tidak ditemukan.'; return; }" + R +
  "  row.innerHTML = '<td colspan=\"6\" style=\"padding:0;\">' + renderKapalDetailHTML(p, unitFillMap) + '</td>';" + R +
  "  row.dataset.rendered = 'true';" + R +
  "}",

  'T4-3: toggleKapalDetail: async lazy fetch'
);

// T4-4: toggleStockpileDetail — same
replaceExact(
  "function toggleStockpileDetail(id) {" + R +
  "  const row = document.getElementById('stk-detail-' + id);" + R +
  "  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';" + R +
  "}",

  "async function toggleStockpileDetail(id) {" + R +
  "  const row = document.getElementById('stk-detail-' + id);" + R +
  "  if (!row) return;" + R +
  "  if (row.style.display !== 'none') { row.style.display = 'none'; return; }" + R +
  "  row.style.display = '';" + R +
  "  if (row.dataset.rendered === 'true') return;" + R +
  "  const td = row.querySelector('td');" + R +
  "  if (td) td.textContent = 'Memuat...';" + R +
  "  const fillMap = await fetchFillMap([id]);" + R +
  "  const unitFillMap = fillMap[id] || {};" + R +
  "  const p = _proyekStockpileCache[id];" + R +
  "  if (!p) { if (td) td.textContent = 'Data tidak ditemukan.'; return; }" + R +
  "  row.innerHTML = '<td colspan=\"5\" style=\"padding:0;\">' + renderStockpileDetailHTML(p, unitFillMap) + '</td>';" + R +
  "  row.dataset.rendered = 'true';" + R +
  "}",

  'T4-4: toggleStockpileDetail: async lazy fetch'
);

// T4-5: renderKapalDetailHTML — add fillMap param + use it for solar
replaceExact(
  "function renderKapalDetailHTML(p) {",
  "function renderKapalDetailHTML(p, fillMap) {" + R +
  "  fillMap = fillMap || {};",
  'T4-5: renderKapalDetailHTML: add fillMap param'
);

// T4-6: renderKapalDetailHTML — replace calcSolarConsumed call with fillMap-aware version
replaceExact(
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);" + R +
  "    const salary = u.allocatedMt * rate;",

  "    const fillLiters = fillMap[u.unit_id] != null ? fillMap[u.unit_id] : (u.solar_isi_liters || 0);" + R +
  "    const solarLabel = fillMap[u.unit_id] != null ? ' (aktual)' : (u.solar_isi_liters ? ' (manual)' : '');" + R +
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, fillLiters);" + R +
  "    const salary = u.allocatedMt * rate;",

  'T4-6: renderKapalDetailHTML: use fillMap for solar'
);

// T4-7: renderKapalDetailHTML — update solar cell display to show label
replaceExact(
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L</td>';",
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L<span style=\"font-size:10px;color:#94A3B8;\">' + solarLabel + '</span></td>';",
  'T4-7: renderKapalDetailHTML: solar label'
);

// T4-8: renderStockpileDetailHTML — add fillMap param + use it
replaceExact(
  "function renderStockpileDetailHTML(p) {",
  "function renderStockpileDetailHTML(p, fillMap) {" + R +
  "  fillMap = fillMap || {};",
  'T4-8: renderStockpileDetailHTML: add fillMap param'
);

// T4-9: renderStockpileDetailHTML — replace calcSolarConsumed call
replaceExact(
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);" + R +
  "    h += '<tr style=\"border-bottom:1px solid #E2E8F0;\">';",

  "    const fillLiters = fillMap[u.unit_id] != null ? fillMap[u.unit_id] : (u.solar_isi_liters || 0);" + R +
  "    const solarLabel = fillMap[u.unit_id] != null ? ' (aktual)' : (u.solar_isi_liters ? ' (manual)' : '');" + R +
  "    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, fillLiters);" + R +
  "    h += '<tr style=\"border-bottom:1px solid #E2E8F0;\">';",

  'T4-9: renderStockpileDetailHTML: use fillMap for solar'
);

// T4-10: renderStockpileDetailHTML — update solar cell display
replaceExact(
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L</td></tr>';",
  "    h += '<td style=\"padding:6px 10px;text-align:right;\">' + solar.toFixed(1) + ' L<span style=\"font-size:10px;color:#94A3B8;\">' + solarLabel + '</span></td></tr>';",
  'T4-10: renderStockpileDetailHTML: solar label'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T4 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
```

**Note on T4-1 and T4-2:** The exact `colspan` value and surrounding HTML lines must match exactly. Run the grep in Step 1 first and adjust if the actual context differs.

- [ ] **Step 3: Run**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_open_close_t4.js
```

Expected: 10 OK + "Syntax OK"

- [ ] **Step 4: Manual verify**

Open Proyek → Kapal tab. Click any project row. The detail should:
1. Show "Memuat..." briefly, then render the unit table
2. Solar column shows "X L (aktual)" if fuel fills exist for that project, "X L (manual)" if only stored data
3. Clicking the same row again collapses it. Re-clicking re-shows without fetching again.

- [ ] **Step 5: Commit**

```bash
git add index.html patch_open_close_t4.js
git commit -m "feat: lazy-fetch Solar Isi from fuel_dispenses on detail expand"
git push
```

---

## Task 5: Edit Modal — Solar Isi Read-Only + Submit Cleanup

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t5.js`
- Modify: `index.html` (via patch script)

**What changes:**
- `openEditKapalModal(id)` — make async, replace Solar Isi `<input>` with a read-only display `<div>`, fetch fills after building modal HTML, populate display divs with "X L (aktual)"/"X L (manual)".
- `openEditStockpileModal(id)` — same.
- `submitEditKapal()` — remove Solar Isi read (`kapal-eu-sisi-{i}`), remove `solar_isi_liters` from `unitUpdates.push`.
- `submitEditStockpile()` — same.

- [ ] **Step 1: Find exact Solar Isi lines in edit modals and submit functions**

```bash
node -e "
const c = require('fs').readFileSync('index.html', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (
    l.includes('kapal-eu-sisi') || l.includes('stk-eu-sisi') ||
    l.includes('async function openEditKapalModal') || l.includes('function openEditKapalModal') ||
    l.includes('async function openEditStockpileModal') || l.includes('function openEditStockpileModal')
  ) console.log(i+1, l.trim());
});
"
```

Also find the `solar_isi_liters` in `submitEditKapal` and `submitEditStockpile`:
```bash
node -e "
const c = require('fs').readFileSync('index.html', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('solar_isi_liters') && (l.includes('unitUpdates') || l.includes('sIsi'))) console.log(i+1, l.trim());
});
"
```

- [ ] **Step 2: Create patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t5.js`:

```javascript
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// T5-1: openEditKapalModal — make async
// Replace "async function openEditKapalModal" if already async, or add async
// Use the exact function declaration line found in Step 1.
// If currently: "async function openEditKapalModal(id) {"  → already async, skip this patch
// If currently: "function openEditKapalModal(id) {"  → patch to add async

// T5-2: openEditKapalModal — replace Solar Isi input with read-only display div
replaceExact(
  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"kapal-eu-sisi-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + (u.solar_isi_liters || 0) + '\"></div>';",

  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi</label><div id=\"kapal-eu-sisi-display-' + i + '\" style=\"font-size:12px;padding:6px 8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;color:#64748B;\">Memuat...</div></div>';",

  'T5-2: openEditKapalModal: Solar Isi as read-only display'
);

// T5-3: openEditKapalModal — after setting modal innerHTML, fetch fills + populate displays
// Find the line where the edit modal content is inserted into the DOM.
// Typically: document.getElementById('modal-edit-kapal').innerHTML = ... or similar
// Then add fill fetch + populate after it.
// The exact pattern to match will be found from Step 1 grep. Example:
//   document.getElementById('modal-edit-kapal-body').innerHTML = modalHTML;
//   document.getElementById('modal-edit-kapal').style.display = '';
// Replace with:
//   document.getElementById('modal-edit-kapal-body').innerHTML = modalHTML;
//   document.getElementById('modal-edit-kapal').style.display = '';
//   fetchFillMap([id]).then(function(fm) {
//     const ufm = fm[id] || {};
//     units.forEach(function(u, i) {
//       const el = document.getElementById('kapal-eu-sisi-display-' + i);
//       if (!el) return;
//       const liters = ufm[u.unit_id];
//       el.textContent = liters != null ? liters.toFixed(1) + ' L (aktual)' : ((u.solar_isi_liters || 0) + ' L (manual)');
//     });
//   });
// NOTE: Find the exact insertion trigger line in Step 1 and write the replaceExact accordingly.

// T5-4: openEditStockpileModal — replace Solar Isi input with read-only display
replaceExact(
  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi(L)</label><input type=\"number\" id=\"stk-eu-sisi-' + i + '\" class=\"finput\" style=\"font-size:12px;padding:6px 8px;\" value=\"' + (u.solar_isi_liters || 0) + '\"></div>';",

  "    unitRowsHTML += '<div><label style=\"font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;\">Solar Isi</label><div id=\"stk-eu-sisi-display-' + i + '\" style=\"font-size:12px;padding:6px 8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;color:#64748B;\">Memuat...</div></div>';",

  'T5-4: openEditStockpileModal: Solar Isi as read-only display'
);

// T5-5: submitEditKapal — remove sIsi read, remove from unitUpdates.push
// The exact from string for unitUpdates.push (with solar_isi_liters: sIsi) from B7 patch result:
replaceExact(
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi, hm_gap_reason: existingUnits[i].hm_gap_reason || null });",
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, hm_gap_reason: existingUnits[i].hm_gap_reason || null });",
  'T5-5: submitEditKapal: remove solar_isi_liters from push'
);

// T5-6: submitEditStockpile — same (unique: no hm_gap_reason at end)
replaceExact(
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir, solar_isi_liters: sIsi });",
  "    unitUpdates.push({ unit_id: existingUnits[i].unit_id, hm_awal: hmAwal, hm_akhir: isNaN(hmAkhir) ? null : hmAkhir, solar_awal_pct: isNaN(sAwal) ? 0 : sAwal, solar_akhir_pct: isNaN(sAkhir) ? 0 : sAkhir });",
  'T5-6: submitEditStockpile: remove solar_isi_liters from push'
);

// Also remove any sIsi reads from submitEditKapal / submitEditStockpile if present.
// Grep for 'kapal-eu-sisi' and 'stk-eu-sisi' in submitEdit functions before writing this script
// and add replaceExact to remove those reads.

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T5 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
```

- [ ] **Step 3: Run**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_open_close_t5.js
```

- [ ] **Step 4: Manual verify**

Open any existing Kapal project → click Edit. The Solar Isi field per unit should show as a grey read-only box with "X L (aktual)" or "X L (manual)" text (not an editable number input). Save the edit — Supabase `project_units` rows should NOT have `solar_isi_liters` updated (it stays at its stored value, not zeroed).

- [ ] **Step 5: Commit**

```bash
git add index.html patch_open_close_t5.js
git commit -m "feat: Solar Isi read-only in Edit modal, removed from submit"
git push
```

---

## Task 6: Ringkasan + Excel fillMap Integration

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t6.js`
- Modify: `index.html` (via patch script)

**What changes:**
- `loadProyekRingkasan()` — after fetching projects, fetch `fillMap` for all project IDs, pass to `renderProyekRingkasan(data, fillMap)`.
- `renderProyekRingkasan(projects, fillMap)` — receives fillMap, uses `fillMap[p.id]?.[u.unit_id]` in place of `u.solar_isi_liters` when computing solar consumed per unit.
- `exportProyekExcel()` — after fetching projects, fetch `fillMap`, use `fillMap[p.id]?.[u.unit_id]` in `calcSolarConsumed` calls in both `kapalRows.push` and `stkRows.push`.

- [ ] **Step 1: Find exact calcSolarConsumed calls in Ringkasan and Excel**

```bash
node -e "
const c = require('fs').readFileSync('index.html', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('calcSolarConsumed') || l.includes('renderProyekRingkasan(') || l.includes('async function loadProyekRingkasan') || l.includes('async function exportProyekExcel')) console.log(i+1, l.trim());
});
"
```

- [ ] **Step 2: Create patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_open_close_t6.js`:

```javascript
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// T6-1: loadProyekRingkasan — fetch fillMap + pass to render
replaceExact(
  "    if (error) throw error;" + R +
  "    renderProyekRingkasan(data || []);" + R +
  "  } catch(e) { panel.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  "    if (error) throw error;" + R +
  "    const projects = data || [];" + R +
  "    const ids = projects.map(function(p) { return p.id; });" + R +
  "    const fillMap = await fetchFillMap(ids);" + R +
  "    renderProyekRingkasan(projects, fillMap);" + R +
  "  } catch(e) { panel.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  'T6-1: loadProyekRingkasan: fetch fillMap + pass to render'
);

// T6-2: renderProyekRingkasan — update signature to accept fillMap
replaceExact(
  "function renderProyekRingkasan(projects) {",
  "function renderProyekRingkasan(projects, fillMap) {" + R +
  "  fillMap = fillMap || {};",
  'T6-2: renderProyekRingkasan: add fillMap param'
);

// T6-3: renderProyekRingkasan — replace calcSolarConsumed(u.solar_isi_liters) with fillMap-aware version (Kapal)
// The exact call found in Step 1 for Kapal units inside renderProyekRingkasan
// Pattern: calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters)
// Replace with: calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, (fillMap[p.id] && fillMap[p.id][u.unit_id] != null) ? fillMap[p.id][u.unit_id] : (u.solar_isi_liters || 0))
// NOTE: There may be two such calls (Kapal and Stockpile). Use surrounding context lines to distinguish.
// Use the grep output from Step 1 to write the exact replaceExact strings here.

// T6-4: exportProyekExcel — fetch fillMap after fetching projects
// Find the block where projects are fetched in exportProyekExcel and add fillMap fetch after it.
// Then update kapalRows.push and stkRows.push calcSolarConsumed calls.
// Pattern for kapalRows (from grep):
//   const hmK = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;
//   kapalRows.push([..., +calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters).toFixed(1)]);
// Replace with:
//   const hmK = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : null;
//   const kapalSolarIsi = (fillMap[p.id] && fillMap[p.id][u.unit_id] != null) ? fillMap[p.id][u.unit_id] : (u.solar_isi_liters || 0);
//   kapalRows.push([..., +calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, kapalSolarIsi).toFixed(1)]);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T6 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
```

**Important:** T6-3 and T6-4 contain placeholder comments. Before creating the final script, run the greps in Step 1 to find the exact strings and replace the comment blocks with proper `replaceExact` calls.

- [ ] **Step 3: Run**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_open_close_t6.js
```

- [ ] **Step 4: Manual verify**

Open Proyek → Ringkasan tab. Select a month that has projects with fuel fills logged. Verify:
1. Solar column in the salary summary reflects actual fill liters, not formula
2. Excel export → Solar column in Kapal sheet shows actual liters

Also test a month with NO fuel fills — Solar should fall back to `solar_isi_liters` stored value (or 0 if null).

- [ ] **Step 5: Commit**

```bash
git add index.html patch_open_close_t6.js
git commit -m "feat: Ringkasan and Excel export use actual solar from fuel_dispenses"
git push
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Tgl Selesai removed from Add form | Task 2 (T2-3, T2-4) |
| Total MT/M3, Harga removed from Add form | Task 2 (T2-3) |
| HM Akhir, Solar Akhir%, Solar Isi removed from Add unit row | Task 2 (T2-1, T2-2) |
| Solar Awal% kept in Add unit row | Task 2 (T2-1, T2-2 — kept in new row) |
| `hm_akhir: null` on Add submit | Task 2 (T2-5, T2-6) |
| `solar_akhir_pct: null` on Add submit | Task 2 (T2-5, T2-6) |
| DB columns made nullable | Task 1 |
| `fetchFillMap` helper | Task 3 |
| Project data cached in `_proyekKapalCache` | Task 4 (T4-1) |
| Lazy fill fetch on detail expand | Task 4 (T4-3, T4-4) |
| `renderKapalDetailHTML(p, fillMap)` | Task 4 (T4-5 to T4-7) |
| `renderStockpileDetailHTML(p, fillMap)` | Task 4 (T4-8 to T4-10) |
| Solar Isi read-only in Edit modal | Task 5 (T5-2, T5-4) |
| Actual fill liters shown in Edit modal | Task 5 (T5-3 + stk equivalent) |
| `solar_isi_liters` removed from `submitEditKapal` push | Task 5 (T5-5) |
| `solar_isi_liters` removed from `submitEditStockpile` push | Task 5 (T5-6) |
| Ringkasan uses fillMap for solar | Task 6 (T6-1 to T6-3) |
| Excel export uses fillMap for solar | Task 6 (T6-4) |
| Backward compat fallback to `solar_isi_liters` | Task 4 (T4-6, T4-9), Task 6 (T6-3, T6-4) |
| Analisis Biaya unchanged | ✓ Already uses `solarActualMap` — no change needed |

**Known prep steps required before T6-3 and T6-4:** The implementer must run the grep in Task 6 Step 1 to find exact `calcSolarConsumed` call strings in `renderProyekRingkasan` and `exportProyekExcel`, then fill in the `replaceExact` calls. These cannot be determined without reading the current file state.
