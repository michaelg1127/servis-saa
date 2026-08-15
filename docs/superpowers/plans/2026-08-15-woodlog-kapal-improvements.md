# Woodlog Kapal — Feature Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Woodlog Kapal to have a 3-state lifecycle (Berjalan/Selesai/Tutup), a full Edit modal, STD tonnage at edit time, fuel gauge per unit, BBM + Total HM columns in the list, and updated cost analysis fuel formula.

**Architecture:** All JS changes via Node.js patch scripts using `replaceExact(from, to, desc)` and `replaceFn(name, isAsync, newBody)` helpers (CRLF `\r\n` match strings). One patch script per task, committed after each task. DB migration runs first via Supabase SQL editor.

**Tech Stack:** Vanilla JS + Supabase JS SDK, single HTML file (`index.html`), Node.js patch scripts, Vercel (auto-deploy from master)

## Global Constraints

- NEVER use the Edit tool on JS string literals inside index.html — it corrupts apostrophes (U+2018/U+2019) and silently breaks the entire `<script>` block. All JS edits via Node.js patch scripts only.
- All multi-line `replaceExact` match strings must use `\r\n` (CRLF), not `\n`.
- Verify every patch script with `node --check patch_wlk<N>.js` before running.
- Run `node patch_wlk<N>.js` from `C:\Users\upsca\Documents\SERVIS-SAA\`.
- After each patch, open `servis-saa.vercel.app` in Chrome and verify the changed screen manually.
- Commit after every task.
- WL_BANGAU_CODES = `['J02', 'J03']` · WL_STD_CODES = `['J45', 'J46', 'J47', 'J48']` · WL_ALL_CODES = `['J02', 'J03', 'J45', 'J46', 'J47', 'J48']`
- STD salary rate: tonnage × 750. Bangau salary: BL × 0.9 / 4 × 800 per operator.
- Tank size per unit type: STD = 320 L, Bangau = 450 L.

---

### Task 1: DB Migration — add `invoice_amount` column

**Files:**
- Create: `patch_wlk1_db.sql`

**Interfaces:**
- Produces: `projects.invoice_amount NUMERIC(15,2)` column available for all subsequent tasks

- [ ] **Step 1: Write the SQL file**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_wlk1_db.sql`:

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(15,2);
```

- [ ] **Step 2: Run in Supabase SQL editor**

Go to Supabase dashboard → SQL Editor → paste and run the SQL above.

- [ ] **Step 3: Verify column exists**

Run in Supabase SQL editor:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'invoice_amount';
```
Expected: one row returned, `data_type = numeric`.

- [ ] **Step 4: Commit**

```bash
git add patch_wlk1_db.sql
git commit -m "feat(wlk1): add invoice_amount column to projects"
```

---

### Task 2: Extend `loadWoodlogKapal` — fetch fuel_dispenses upfront

**Files:**
- Modify: `index.html` (via `patch_wlk2.js`)
- Create: `patch_wlk2.js`

**Interfaces:**
- Consumes: `fetchFillMap(projectIds)` at line ~5002 — returns `{ [projectId]: { [unitId]: totalLiters } }`
- Produces: `_wlKapalFillMap` global — `{ [projectId]: { [unitId]: totalLiters } }` — used by Tasks 3, 4, 6

- [ ] **Step 1: Write the patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_wlk2.js`:

```js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceExact(from, to, desc) {
  if (!html.includes(from)) { console.error('MISS: ' + desc); process.exit(1); }
  const count = html.split(from).length - 1;
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changed++;
  console.log('OK: ' + desc);
}

// 1. Add _wlKapalFillMap global alongside _wlKapalCache
replaceExact(
  'let _wlKapalCache = {};\r\nlet _wlHourlyCache = {};',
  'let _wlKapalCache = {};\r\nlet _wlKapalFillMap = {};\r\nlet _wlHourlyCache = {};',
  'add _wlKapalFillMap global'
);

// 2. Replace loadWoodlogKapal to also fetch fuel_dispenses
replaceExact(
  '    const ids = (projects || []).map(p => p.id);\r\n    let salaryMap = {};\r\n    if (ids.length > 0) {\r\n      const { data: sals } = await sb.from(\'woodlog_operator_salary\').select(\'*\').in(\'project_id\', ids);\r\n      (sals || []).forEach(s => { if (!salaryMap[s.project_id]) salaryMap[s.project_id] = []; salaryMap[s.project_id].push(s); });\r\n    }\r\n    projects.forEach(p => { _wlKapalCache[p.id] = p; });\r\n    renderWoodlogKapalList(projects || [], salaryMap);',
  '    const ids = (projects || []).map(p => p.id);\r\n    let salaryMap = {};\r\n    if (ids.length > 0) {\r\n      const [salRes, fillRes] = await Promise.all([\r\n        sb.from(\'woodlog_operator_salary\').select(\'*\').in(\'project_id\', ids),\r\n        fetchFillMap(ids)\r\n      ]);\r\n      (salRes.data || []).forEach(s => { if (!salaryMap[s.project_id]) salaryMap[s.project_id] = []; salaryMap[s.project_id].push(s); });\r\n      _wlKapalFillMap = fillRes;\r\n    } else {\r\n      _wlKapalFillMap = {};\r\n    }\r\n    projects.forEach(p => { _wlKapalCache[p.id] = p; });\r\n    renderWoodlogKapalList(projects || [], salaryMap);',
  'loadWoodlogKapal: add fuel_dispenses fetch via fetchFillMap'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Validate and run**

```bash
node --check patch_wlk2.js
node patch_wlk2.js
```
Expected output: `OK: add _wlKapalFillMap global`, `OK: loadWoodlogKapal: add fuel_dispenses fetch via fetchFillMap`, `Done. 2 replacements made.`

- [ ] **Step 3: Manual verify**

Open Chrome → Admin → Proyek Woodlog → Kapal tab. Open DevTools console, check no errors on load.

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wlk2.js
git commit -m "feat(wlk2): fetch fuel_dispenses upfront in loadWoodlogKapal"
```

---

### Task 3: Update `renderWoodlogKapalList` — new columns, status badges, action buttons

**Files:**
- Modify: `index.html` (via `patch_wlk3.js`)
- Create: `patch_wlk3.js`

**Interfaces:**
- Consumes: `_wlKapalFillMap` (from Task 2), `WL_STD_CODES`, `WL_BANGAU_CODES`
- Produces: Updated Kapal list table with 11 columns, 3-state status, Edit/Tutup/Hapus buttons

- [ ] **Step 1: Write the patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_wlk3.js`:

```js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

const newRenderFn = `function renderWoodlogKapalList(projects, salaryMap) {
  const el = document.getElementById('wl-panel-kapal');
  if (!el) return;
  const addBtn = '<button onclick="openAddWoodlogKapalModal()" class="btn-primary" style="margin-bottom:16px;width:auto;">+ Tambah Proyek Kapal</button>';
  if (projects.length === 0) { el.innerHTML = addBtn + '<div style="color:#94A3B8;padding:20px;">Belum ada proyek kapal woodlog.</div>'; return; }
  const rows = projects.map(function(p) {
    const units = (p.project_units || []).map(u => u.units ? u.units.code : '?').join(', ');
    // Status: Tutup > Selesai > Berjalan
    let statusLabel, statusColor;
    if (p.invoice_number) {
      statusLabel = 'Tutup'; statusColor = '#16A34A';
    } else if (p.end_date) {
      statusLabel = 'Selesai'; statusColor = '#1D4ED8';
    } else {
      statusLabel = 'Berjalan'; statusColor = '#D97706';
    }
    const status = '<span style="color:' + statusColor + ';font-weight:700;">' + statusLabel + '</span>';
    // Total HM
    const totalHM = (p.project_units || []).reduce(function(a, pu) {
      return a + ((pu.hm_akhir != null && pu.hm_awal != null) ? Number(pu.hm_akhir) - Number(pu.hm_awal) : 0);
    }, 0);
    const hmHasData = (p.project_units || []).some(pu => pu.hm_akhir != null && pu.hm_awal != null);
    const totalHMCell = hmHasData
      ? '<td style="text-align:right;font-weight:700;color:#1D4ED8;cursor:pointer;" onclick="toggleWoodlogKapalDetail(\'' + p.id + '\')">' + totalHM.toFixed(1) + ' HM</td>'
      : '<td style="text-align:right;color:#94A3B8;">—</td>';
    // BBM total
    const fillMap = (_wlKapalFillMap && _wlKapalFillMap[p.id]) ? _wlKapalFillMap[p.id] : {};
    let bbmTotal = 0;
    let bbmHasData = false;
    (p.project_units || []).forEach(function(pu) {
      if (pu.solar_awal_pct == null || pu.solar_akhir_pct == null) return;
      bbmHasData = true;
      const unitCode = pu.units ? pu.units.code : '';
      const tankSize = WL_BANGAU_CODES.includes(unitCode) ? 450 : 320;
      const tankDiff = (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * tankSize;
      const fills = fillMap[pu.unit_id] || 0;
      bbmTotal += tankDiff + fills;
    });
    const bbmCell = bbmHasData
      ? '<td style="text-align:right;font-weight:700;color:#059669;cursor:pointer;" onclick="toggleWoodlogKapalDetail(\'' + p.id + '\')">' + Math.round(bbmTotal).toLocaleString('id') + ' L</td>'
      : '<td style="text-align:right;color:#94A3B8;">—</td>';
    // Action buttons
    let btns = '<button onclick="event.stopPropagation();openEditWoodlogKapalModal(\'' + p.id + '\')" style="background:#EFF6FF;border:1.5px solid #93C5FD;color:#1D4ED8;font-size:12px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;margin-right:4px;">Edit</button>';
    if (p.end_date && !p.invoice_number) {
      btns += '<button onclick="openCloseWoodlogKapalModal(\'' + p.id + '\')" style="background:#DCFCE7;color:#16A34A;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px;">Tutup</button>';
    }
    if (!p.invoice_number) {
      btns += '<button onclick="doDeleteWoodlogProject(\'' + p.id + '\')" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;">Hapus</button>';
    }
    return '<tr>' +
      '<td style="font-weight:700;color:#1D4ED8;cursor:pointer;" onclick="toggleWoodlogKapalDetail(\'' + p.id + '\')">' + p.project_code + '</td>' +
      '<td>' + (p.nama_kapal || '—') + '</td>' +
      '<td>' + (p.pemberi_kerja || '—') + '</td>' +
      '<td>' + formatDate(p.start_date) + '</td>' +
      '<td>' + (p.end_date ? formatDate(p.end_date) : '—') + '</td>' +
      '<td style="font-size:12px;color:#64748B;">' + units + '</td>' +
      '<td style="text-align:right;">' + (p.total_mt_m3 ? Number(p.total_mt_m3).toLocaleString('id') + ' MT' : '—') + '</td>' +
      totalHMCell +
      bbmCell +
      '<td>' + status + '</td>' +
      '<td style="white-space:nowrap;">' + btns + '</td></tr>' +
      '<tr id="wl-kapal-detail-' + p.id + '" style="display:none;"><td colspan="11" style="padding:12px 16px;background:#F8FAFC;">Memuat...</td></tr>';
  }).join('');
  el.innerHTML = addBtn + '<div class="table-wrap"><table class="dt"><thead><tr><th>Kode</th><th>Kapal</th><th>Pemberi Kerja</th><th>Mulai</th><th>Selesai</th><th>Unit</th><th style="text-align:right;">BL Tonnage</th><th style="text-align:right;">Total HM</th><th style="text-align:right;">BBM</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}`;

replaceFn('renderWoodlogKapalList', false, newRenderFn);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

> **Note:** The `replaceExact` match string above must exactly match the current file content including CRLF. If it misses, use `grep -c "renderWoodlogKapalList" index.html` to confirm the function exists, then manually inspect the exact whitespace/quote characters around it and adjust. The function body in the match string was captured from the code read in Task 0 context.

- [ ] **Step 2: Validate and run**

```bash
node --check patch_wlk3.js
node patch_wlk3.js
```
Expected: `OK fn: renderWoodlogKapalList`, `Done. 1 replacements made.`

- [ ] **Step 3: Manual verify in Chrome**

- Kapal tab loads without errors
- Table has 11 columns: Kode, Kapal, Pemberi Kerja, Mulai, Selesai, Unit, BL Tonnage, Total HM, BBM, Status, (actions)
- Open projects show "Berjalan" in orange
- Projects with end_date but no invoice show "Selesai" in blue, "Tutup" button visible
- Projects with invoice_number show "Tutup" in green, no Hapus button
- Edit button appears on all rows

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wlk3.js
git commit -m "feat(wlk3): add Total HM + BBM columns, 3-state status, Edit button to WL Kapal list"
```

---

### Task 4: Update `toggleWoodlogKapalDetail` — add BBM per unit section, fix colspan

**Files:**
- Modify: `index.html` (via `patch_wlk4.js`)
- Create: `patch_wlk4.js`

**Interfaces:**
- Consumes: `_wlKapalFillMap[id][unitId]` (from Task 2), `WL_BANGAU_CODES`, `WL_STD_CODES`
- Produces: Detail row with 3 sections (Unit HM | BBM per Unit | Salary Operator), colspan=11

- [ ] **Step 1: Write the patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_wlk4.js`:

```js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  // find opening brace
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

replaceFn('toggleWoodlogKapalDetail', true, `async function toggleWoodlogKapalDetail(id) {
  const row = document.getElementById('wl-kapal-detail-' + id);
  if (!row) return;
  if (row.style.display !== 'none') { row.style.display = 'none'; return; }
  row.style.display = '';
  if (row.dataset.rendered === 'true') return;
  const p = _wlKapalCache[id];
  if (!p) { row.querySelector('td').textContent = 'Data tidak ditemukan.'; return; }
  const { data: sals } = await sb.from('woodlog_operator_salary').select('*').eq('project_id', id).order('operator_name');
  const salRows = (sals || []).map(function(s) {
    const paidLabel = s.paid_batch === 'mid_month' ? '16' : s.paid_batch === 'end_of_month' ? 'Akhir Bulan' : '—';
    return '<tr><td>' + s.operator_name + '</td><td style="text-transform:capitalize;">' + s.unit_type + '</td>' +
      '<td style="text-align:right;">' + (s.tonnage_mt != null ? Number(s.tonnage_mt).toLocaleString('id') + ' MT' : '—') + '</td>' +
      '<td style="text-align:right;font-weight:700;">Rp ' + Number(s.salary_amount).toLocaleString('id') + '</td>' +
      '<td style="color:' + (s.paid_batch ? '#16A34A' : '#D97706') + ';font-weight:700;">' + (s.paid_batch ? 'Dibayar (' + paidLabel + ')' : 'Belum Dibayar') + '</td></tr>';
  }).join('');
  const fillMap = (_wlKapalFillMap && _wlKapalFillMap[id]) ? _wlKapalFillMap[id] : {};
  const unitRows = (p.project_units || []).map(function(pu) {
    const hmDur = (pu.hm_akhir != null && pu.hm_awal != null) ? (Number(pu.hm_akhir) - Number(pu.hm_awal)).toFixed(1) : '—';
    return '<tr><td style="font-weight:700;">' + (pu.units ? pu.units.code : '?') + '</td>' +
      '<td style="text-align:right;">' + (pu.hm_awal != null ? pu.hm_awal : '—') + '</td><td style="text-align:right;">' + (pu.hm_akhir != null ? pu.hm_akhir : '—') + '</td>' +
      '<td style="text-align:right;font-weight:700;">' + hmDur + ' HM</td>' +
      '<td style="text-align:right;">' + (pu.solar_awal_pct != null ? pu.solar_awal_pct + '%' : '—') + '</td>' +
      '<td style="text-align:right;">' + (pu.solar_akhir_pct != null ? pu.solar_akhir_pct + '%' : '—') + '</td></tr>';
  }).join('');
  const bbmRows = (p.project_units || []).map(function(pu) {
    const unitCode = pu.units ? pu.units.code : '';
    const tankSize = WL_BANGAU_CODES.includes(unitCode) ? 450 : 320;
    const hasSolar = pu.solar_awal_pct != null && pu.solar_akhir_pct != null;
    const tankDiff = hasSolar ? (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * tankSize : 0;
    const fills = fillMap[pu.unit_id] || 0;
    const total = tankDiff + fills;
    return '<tr><td style="font-weight:700;">' + unitCode + '</td>' +
      '<td style="text-align:right;">' + (hasSolar ? Math.round(tankDiff).toLocaleString('id') + ' L' : '—') + '</td>' +
      '<td style="text-align:right;">' + (fills > 0 ? Math.round(fills).toLocaleString('id') + ' L' : '0 L') + '</td>' +
      '<td style="text-align:right;font-weight:700;color:#059669;">' + (hasSolar ? Math.round(total).toLocaleString('id') + ' L' : '—') + '</td></tr>';
  }).join('');
  row.innerHTML = '<td colspan="11" style="padding:12px 16px;background:#F8FAFC;">' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Unit HM</div>' +
    '<div class="table-wrap" style="margin-bottom:12px;"><table class="dt"><thead><tr><th>Unit</th><th>HM Awal</th><th>HM Akhir</th><th>Durasi</th><th>Solar Awal</th><th>Solar Akhir</th></tr></thead><tbody>' + unitRows + '</tbody></table></div>' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">BBM per Unit</div>' +
    '<div class="table-wrap" style="margin-bottom:12px;"><table class="dt"><thead><tr><th>Unit</th><th style="text-align:right;">Tank Diff (L)</th><th style="text-align:right;">Isi Aktual (L)</th><th style="text-align:right;">Total (L)</th></tr></thead><tbody>' + bbmRows + '</tbody></table></div>' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary Operator</div>' +
    '<div class="table-wrap"><table class="dt"><thead><tr><th>Operator</th><th>Tipe</th><th>Tonnage</th><th>Salary</th><th>Status</th></tr></thead><tbody>' + salRows + '</tbody></table></div>' +
    '</td>';
  row.dataset.rendered = 'true';
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Validate and run**

```bash
node --check patch_wlk4.js
node patch_wlk4.js
```
Expected: `OK fn: toggleWoodlogKapalDetail`, `Done. 1 replacements made.`

- [ ] **Step 3: Manual verify in Chrome**

- Click on a project code or "Total HM" or "BBM" cell → detail row expands
- 3 sections visible: Unit HM table, BBM per Unit table, Salary Operator table
- Click again → collapses

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wlk4.js
git commit -m "feat(wlk4): add BBM per unit section in WL Kapal detail row, colspan 11"
```

---

### Task 5: Trim Add modal — remove STD tonnage + invoice fields

**Files:**
- Modify: `index.html` (via `patch_wlk5.js`)
- Create: `patch_wlk5.js`

**Interfaces:**
- Produces: Simplified Add modal and `submitAddWoodlogKapal` that skips STD salary inserts

- [ ] **Step 1: Write the patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_wlk5.js`:

```js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceExact(from, to, desc) {
  if (!html.includes(from)) { console.error('MISS: ' + desc); process.exit(1); }
  const count = html.split(from).length - 1;
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changed++;
  console.log('OK: ' + desc);
}

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

// 1. Remove invoice field from modal HTML (in openAddWoodlogKapalModal)
replaceExact(
  `'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +\r\n    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Harga Solar (Rp/L)</label><input type="number" id="wladd-solar" class="finput" min="0"></div>' +\r\n    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">No. Invoice</label><input type="text" id="wladd-inv" class="finput"></div>' +\r\n    '</div>'`,
  `'<div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:16px;">' +\r\n    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Harga Solar (Rp/L)</label><input type="number" id="wladd-solar" class="finput" min="0"></div>' +\r\n    '</div>'`,
  'remove invoice field from Add modal'
);

// 2. Replace STD salary section in modal HTML with read-only note
replaceExact(
  `'<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary STD (J45–J48) — input manual tonnage</div>' +\r\n    '<div style="background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;">' + stdOpRows + '</div>'`,
  `'<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary STD (J45–J48)</div>' +\r\n    '<div style="background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;color:#64748B;font-size:13px;">Tonnage STD akan diisi saat Edit proyek setelah selesai bongkar.</div>'`,
  'replace STD section with read-only note'
);

// 3. Update submitAddWoodlogKapal: remove inv field + skip STD salary inserts
replaceFn('submitAddWoodlogKapal', true, `async function submitAddWoodlogKapal(shipNum, monthYear) {
  const namaKapal = (document.getElementById('wladd-namakapal') || {}).value ? document.getElementById('wladd-namakapal').value.trim() : '';
  const pemberi = (document.getElementById('wladd-pemberi') || {}).value ? document.getElementById('wladd-pemberi').value.trim() : null;
  const start = (document.getElementById('wladd-start') || {}).value || '';
  const bl = parseFloat((document.getElementById('wladd-bl') || {}).value) || null;
  const rate = parseFloat((document.getElementById('wladd-rate') || {}).value) || null;
  const solar = parseFloat((document.getElementById('wladd-solar') || {}).value) || null;
  const notes = (document.getElementById('wladd-notes') || {}).value ? document.getElementById('wladd-notes').value.trim() : null;
  if (!namaKapal || !start) { showToast('Nama Kapal dan Tgl Mulai wajib diisi.'); return; }
  const mm = monthYear.slice(5, 7);
  const projectCode = 'K' + mm + '-' + String(shipNum).padStart(2, '0');
  try {
    const { data: proj, error: e1 } = await sb.from('projects').insert({
      type: 'woodlog_kapal', project_code: projectCode, ship_number_in_month: shipNum,
      month_year: monthYear, nama_kapal: namaKapal, pemberi_kerja: pemberi,
      start_date: start, total_mt_m3: bl, unit_price: rate,
      harga_solar_rpl: solar, notes: notes
    }).select().single();
    if (e1) throw e1;
    const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });
    const checkedUnits = wlUnits.filter(function(u) {
      const cb = document.getElementById('wl-unit-' + u.id);
      return cb && cb.checked;
    });
    if (checkedUnits.length > 0) {
      const puRows = checkedUnits.map(function(u) {
        const hm = parseFloat((document.getElementById('wl-hmawal-' + u.id) || {}).value) || null;
        const solVal = parseFloat((document.getElementById('wl-solawal-' + u.id) || {}).value);
        return { project_id: proj.id, unit_id: u.id, hm_awal: hm, solar_awal_pct: isNaN(solVal) ? null : solVal };
      });
      const { error: e2 } = await sb.from('project_units').insert(puRows);
      if (e2) throw e2;
    }
    // Bangau salary: insert from BL if available
    if (bl) {
      const bangauSal = Math.round(bl * 0.9 / 4 * 800);
      const bl4 = bl * 0.9 / 4;
      const bangauRows = WL_BANGAU_OPS.map(function(op) {
        return { project_id: proj.id, operator_name: op, unit_type: 'bangau', tonnage_mt: bl4, salary_amount: bangauSal };
      });
      const { error: e3 } = await sb.from('woodlog_operator_salary').insert(bangauRows);
      if (e3) throw e3;
    }
    closeModal();
    showToast('Proyek ' + projectCode + ' berhasil ditambahkan!', 'success');
    await loadWoodlogKapal();
  } catch(e) { showToast('Gagal: ' + e.message); }
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Validate and run**

```bash
node --check patch_wlk5.js
node patch_wlk5.js
```
Expected: 3 OK messages, `Done. 3 replacements made.`

- [ ] **Step 3: Manual verify in Chrome**

- Click "+ Tambah Proyek Kapal" → modal opens
- No "No. Invoice" field visible
- STD section shows read-only note (no tonnage inputs)
- Bangau section still shows auto-preview
- Submit a test project → confirms in DB without invoice or STD salary rows

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wlk5.js
git commit -m "feat(wlk5): trim WL Kapal Add modal — remove STD tonnage + invoice fields"
```

---

### Task 6: New Edit modal — `openEditWoodlogKapalModal` + `submitEditWoodlogKapal`

**Files:**
- Modify: `index.html` (via `patch_wlk6.js`)
- Create: `patch_wlk6.js`

**Interfaces:**
- Consumes: `_wlKapalCache[id]`, `fetchFillMap([id])`, `WL_BANGAU_OPS`, `WL_STD_OPS`, `WL_BANGAU_CODES`
- Produces: `openEditWoodlogKapalModal(id)`, `wlEditSalaryPreview()`, `submitEditWoodlogKapal(id)`

- [ ] **Step 1: Write the patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_wlk6.js`:

```js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceExact(from, to, desc) {
  if (!html.includes(from)) { console.error('MISS: ' + desc); process.exit(1); }
  const count = html.split(from).length - 1;
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changed++;
  console.log('OK: ' + desc);
}

// Insert new functions before openCloseWoodlogKapalModal
const newFunctions = `async function openEditWoodlogKapalModal(id) {
  const p = _wlKapalCache[id];
  if (!p) { showToast('Data tidak ditemukan'); return; }
  const units = p.project_units || [];
  // Fetch actual fill liters per unit for Solar Isi display
  const fillMap = await fetchFillMap([id]);
  const unitFills = (fillMap[id] || {});
  const unitRowsHTML = units.map(function(pu, i) {
    const unitCode = pu.units ? pu.units.code : '?';
    const fillL = unitFills[pu.unit_id];
    const sisiDisplay = fillL != null ? fillL.toFixed(1) + ' L (aktual)' : '—';
    return '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:8px;">' +
      '<div style="font-size:12px;font-weight:700;color:#1E293B;margin-bottom:8px;">' + unitCode + '</div>' +
      '<div style="display:grid;grid-template-columns:80px 80px 60px 60px 80px;gap:8px;">' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">HM Awal</label><input type="number" id="wledit-hmawal-' + i + '" class="finput" style="font-size:12px;padding:6px 8px;" value="' + (pu.hm_awal != null ? pu.hm_awal : '') + '" step="0.1"></div>' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">HM Akhir</label><input type="number" id="wledit-hmakhir-' + i + '" class="finput" style="font-size:12px;padding:6px 8px;" value="' + (pu.hm_akhir != null ? pu.hm_akhir : '') + '" placeholder="Opsional" step="0.1"></div>' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Awal%</label><input type="number" id="wledit-sawal-' + i + '" class="finput" style="font-size:12px;padding:6px 8px;" value="' + (pu.solar_awal_pct != null ? pu.solar_awal_pct : '') + '" min="0" max="100"></div>' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Akhir%</label><input type="number" id="wledit-sakhir-' + i + '" class="finput" style="font-size:12px;padding:6px 8px;" value="' + (pu.solar_akhir_pct != null ? pu.solar_akhir_pct : '') + '" min="0" max="100"></div>' +
      '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Isi</label><div style="font-size:12px;padding:6px 8px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;color:#64748B;">' + sisiDisplay + '</div></div>' +
      '</div></div>';
  }).join('');
  // Existing salary rows for STD pre-fill
  const { data: existingSals } = await sb.from('woodlog_operator_salary').select('*').eq('project_id', id);
  const salByOp = {};
  (existingSals || []).forEach(function(s) { salByOp[s.operator_name] = s; });
  const bangauRows = WL_BANGAU_OPS.map(function(op) {
    const existing = salByOp[op];
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
      '<span style="width:100px;font-size:13px;font-weight:600;">' + op + '</span>' +
      '<span id="wledit-bang-sal-' + op + '" style="font-size:13px;font-weight:700;color:#1D4ED8;">Rp ' + (existing ? Number(existing.salary_amount).toLocaleString('id') : '0') + '</span>' +
      '</div>';
  }).join('');
  const stdRows = WL_STD_OPS.map(function(op) {
    const existing = salByOp[op];
    const existingTon = existing ? Number(existing.tonnage_mt || 0) : 0;
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
      '<span style="width:100px;font-size:13px;font-weight:600;">' + op + '</span>' +
      '<input type="number" id="wledit-std-ton-' + op + '" class="finput" style="width:110px;font-size:13px;" placeholder="Tonnage MT" min="0" value="' + (existingTon > 0 ? existingTon : '') + '" oninput="wlEditSalaryPreview()">' +
      '<span id="wledit-std-sal-' + op + '" style="font-size:13px;font-weight:700;color:#1D4ED8;width:120px;">Rp ' + (existing ? Number(existing.salary_amount).toLocaleString('id') : '0') + '</span>' +
      '</div>';
  }).join('');
  const bl = p.total_mt_m3 || 0;
  const modalHTML = '<div style="padding:24px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;">' +
    '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;">Edit Proyek: ' + p.project_code + '</div>' +
    '<div style="font-size:13px;color:#64748B;margin-bottom:16px;">' + (p.nama_kapal || '') + '</div>' +
    '<input type="hidden" id="wledit-unitcount" value="' + units.length + '">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nama Kapal *</label><input type="text" id="wledit-namakapal" class="finput" value="' + (p.nama_kapal || '') + '"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Pemberi Kerja</label><input type="text" id="wledit-pemberi" class="finput" value="' + (p.pemberi_kerja || '') + '"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tgl Mulai *</label><input type="date" id="wledit-start" class="finput" value="' + (p.start_date || '') + '"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tgl Selesai</label><input type="date" id="wledit-end" class="finput" value="' + (p.end_date || '') + '"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">BL Tonnage (MT)</label><input type="number" id="wledit-bl" class="finput" min="0" value="' + (p.total_mt_m3 || '') + '" oninput="wlEditSalaryPreview()"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Rate/MT (Rp)</label><input type="number" id="wledit-rate" class="finput" min="0" value="' + (p.unit_price || '') + '"></div>' +
    '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Harga Solar (Rp/L)</label><input type="number" id="wledit-solar" class="finput" min="0" value="' + (p.harga_solar_rpl || '') + '"></div>' +
    '</div>' +
    '<div style="margin-bottom:16px;"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Catatan</label><textarea id="wledit-notes" class="finput" rows="2">' + (p.notes || '') + '</textarea></div>' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Unit HM + Solar (' + units.length + ' unit)</div>' +
    unitRowsHTML +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary Bangau (J02/J03) — auto dari BL</div>' +
    '<div style="background:#EFF6FF;border-radius:10px;padding:12px;margin-bottom:16px;">' + bangauRows + '</div>' +
    '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Salary STD (J45–J48) — input tonnage</div>' +
    '<div style="background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;">' + stdRows + '</div>' +
    '<div style="display:flex;gap:12px;margin-top:16px;">' +
    '<button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>' +
    '<button onclick="submitEditWoodlogKapal(\'' + id + '\')" class="btn-primary" style="flex:2;">Simpan Perubahan</button>' +
    '</div></div>';
  document.getElementById('modal-box').innerHTML = modalHTML;
  document.getElementById('modal-overlay').style.display = 'flex';
  wlEditSalaryPreview();
}

function wlEditSalaryPreview() {
  const bl = parseFloat(document.getElementById('wledit-bl') ? document.getElementById('wledit-bl').value : '') || 0;
  const bangauSal = Math.round(bl * 0.9 / 4 * 800);
  WL_BANGAU_OPS.forEach(function(op) {
    const el = document.getElementById('wledit-bang-sal-' + op);
    if (el) el.textContent = 'Rp ' + bangauSal.toLocaleString('id');
  });
  WL_STD_OPS.forEach(function(op) {
    const inp = document.getElementById('wledit-std-ton-' + op);
    const ton = parseFloat(inp ? inp.value : '') || 0;
    const salEl = document.getElementById('wledit-std-sal-' + op);
    if (salEl) salEl.textContent = 'Rp ' + Math.round(ton * 750).toLocaleString('id');
  });
}

async function submitEditWoodlogKapal(id) {
  const namaKapal = (document.getElementById('wledit-namakapal') || {}).value ? document.getElementById('wledit-namakapal').value.trim() : '';
  const pemberi = (document.getElementById('wledit-pemberi') || {}).value ? document.getElementById('wledit-pemberi').value.trim() : null;
  const start = (document.getElementById('wledit-start') || {}).value || '';
  const end = (document.getElementById('wledit-end') || {}).value || null;
  const bl = parseFloat((document.getElementById('wledit-bl') || {}).value) || null;
  const rate = parseFloat((document.getElementById('wledit-rate') || {}).value) || null;
  const solar = parseFloat((document.getElementById('wledit-solar') || {}).value) || null;
  const notes = (document.getElementById('wledit-notes') || {}).value ? document.getElementById('wledit-notes').value.trim() : null;
  if (!namaKapal || !start) { showToast('Nama Kapal dan Tgl Mulai wajib diisi.'); return; }
  const p = _wlKapalCache[id];
  if (!p) { showToast('Data tidak ditemukan'); return; }
  const units = p.project_units || [];
  const unitCount = parseInt((document.getElementById('wledit-unitcount') || {}).value) || 0;
  const unitUpdates = [];
  for (let i = 0; i < unitCount; i++) {
    const hmAwal = parseFloat((document.getElementById('wledit-hmawal-' + i) || {}).value);
    const hmAkhir = parseFloat((document.getElementById('wledit-hmakhir-' + i) || {}).value);
    const sAwal = parseFloat((document.getElementById('wledit-sawal-' + i) || {}).value);
    const sAkhir = parseFloat((document.getElementById('wledit-sakhir-' + i) || {}).value);
    unitUpdates.push({
      project_id: id,
      unit_id: units[i].unit_id,
      hm_awal: isNaN(hmAwal) ? null : hmAwal,
      hm_akhir: isNaN(hmAkhir) ? null : hmAkhir,
      solar_awal_pct: isNaN(sAwal) ? null : sAwal,
      solar_akhir_pct: isNaN(sAkhir) ? null : sAkhir
    });
  }
  // Build salary inserts
  const salaryInserts = [];
  const blVal = bl || 0;
  if (blVal > 0) {
    const bangauSal = Math.round(blVal * 0.9 / 4 * 800);
    const bl4 = blVal * 0.9 / 4;
    WL_BANGAU_OPS.forEach(function(op) {
      salaryInserts.push({ project_id: id, operator_name: op, unit_type: 'bangau', tonnage_mt: bl4, salary_amount: bangauSal });
    });
  }
  WL_STD_OPS.forEach(function(op) {
    const inp = document.getElementById('wledit-std-ton-' + op);
    const ton = parseFloat(inp ? inp.value : '') || 0;
    if (ton > 0) salaryInserts.push({ project_id: id, operator_name: op, unit_type: 'std', tonnage_mt: ton, salary_amount: Math.round(ton * 750) });
  });
  try {
    const { error: pe } = await sb.from('projects').update({
      nama_kapal: namaKapal || null, pemberi_kerja: pemberi || null,
      start_date: start, end_date: end || null,
      total_mt_m3: bl, unit_price: rate, harga_solar_rpl: solar, notes: notes || null
    }).eq('id', id);
    if (pe) throw pe;
    // Update project_units
    await Promise.all(unitUpdates.map(function(u) {
      return sb.from('project_units').update({
        hm_awal: u.hm_awal, hm_akhir: u.hm_akhir,
        solar_awal_pct: u.solar_awal_pct, solar_akhir_pct: u.solar_akhir_pct
      }).eq('project_id', id).eq('unit_id', u.unit_id);
    }));
    // Delete + re-insert salary rows
    await sb.from('woodlog_operator_salary').delete().eq('project_id', id);
    if (salaryInserts.length > 0) {
      const { error: se } = await sb.from('woodlog_operator_salary').insert(salaryInserts);
      if (se) throw se;
    }
    // Clear detail rendered flag so it re-renders with fresh data
    const detailRow = document.getElementById('wl-kapal-detail-' + id);
    if (detailRow) detailRow.dataset.rendered = '';
    closeModal();
    showToast('Proyek berhasil diperbarui!', 'success');
    await loadWoodlogKapal();
  } catch(e) { showToast('Gagal simpan: ' + e.message); }
}

`;

replaceExact(
  'function openCloseWoodlogKapalModal(id) {',
  newFunctions + 'function openCloseWoodlogKapalModal(id) {',
  'insert openEditWoodlogKapalModal + wlEditSalaryPreview + submitEditWoodlogKapal before openCloseWoodlogKapalModal'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Validate and run**

```bash
node --check patch_wlk6.js
node patch_wlk6.js
```
Expected: `OK: insert openEditWoodlogKapalModal...`, `Done. 1 replacements made.`

- [ ] **Step 3: Manual verify in Chrome**

- Click "Edit" on a Berjalan project → modal opens with all fields pre-filled
- Change BL tonnage → Bangau salary preview updates immediately
- Enter STD tonnage for an operator → STD salary preview updates
- Per-unit grid shows HM Awal, HM Akhir, Solar Awal%, Solar Akhir%, Solar Isi (read-only)
- Save → toast success, list reloads with updated data
- Click project detail row → BBM section shows updated values (detail re-renders, not cached)

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wlk6.js
git commit -m "feat(wlk6): add Edit modal for WL Kapal (HM/Solar/STD salary/Bangau preview)"
```

---

### Task 7: Repurpose Tutup modal — invoice number + amount only

**Files:**
- Modify: `index.html` (via `patch_wlk7.js`)
- Create: `patch_wlk7.js`

**Interfaces:**
- Produces: `openCloseWoodlogKapalModal(id)` shows 2-field modal (invoice_number + invoice_amount); `submitCloseWoodlogKapal(id)` only updates those two fields

- [ ] **Step 1: Write the patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_wlk7.js`:

```js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

replaceFn('openCloseWoodlogKapalModal', false, `function openCloseWoodlogKapalModal(id) {
  const p = _wlKapalCache[id];
  if (!p) return;
  const modalHTML = '<div style="padding:24px;max-width:460px;width:100%;">' +
    '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;">Tutup Proyek ' + p.project_code + '</div>' +
    '<div style="font-size:13px;color:#64748B;margin-bottom:20px;">' + (p.nama_kapal || '') + ' · ' + formatDate(p.end_date) + '</div>' +
    '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">No. Invoice *</label><input type="text" id="wlclose-inv" class="finput" value="' + (p.invoice_number || '') + '" placeholder="Nomor invoice dari klien"></div>' +
    '<div style="margin-bottom:20px;"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nilai Invoice (Rp) *</label><input type="number" id="wlclose-invamt" class="finput" value="' + (p.invoice_amount || '') + '" min="0" placeholder="0"></div>' +
    '<div style="display:flex;gap:12px;">' +
    '<button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>' +
    '<button onclick="submitCloseWoodlogKapal(\'' + id + '\')" class="btn-primary" style="flex:2;">Tutup Proyek</button>' +
    '</div></div>';
  document.getElementById('modal-box').innerHTML = modalHTML;
  document.getElementById('modal-overlay').style.display = 'flex';
}`);

replaceFn('submitCloseWoodlogKapal', true, `async function submitCloseWoodlogKapal(id) {
  const inv = (document.getElementById('wlclose-inv') || {}).value ? document.getElementById('wlclose-inv').value.trim() : '';
  const invAmt = parseFloat((document.getElementById('wlclose-invamt') || {}).value) || null;
  if (!inv) { showToast('No. Invoice wajib diisi.'); return; }
  try {
    const { error } = await sb.from('projects').update({ invoice_number: inv, invoice_amount: invAmt }).eq('id', id);
    if (error) throw error;
    const detailRow = document.getElementById('wl-kapal-detail-' + id);
    if (detailRow) detailRow.dataset.rendered = '';
    closeModal();
    showToast('Proyek berhasil ditutup.', 'success');
    await loadWoodlogKapal();
  } catch(e) { showToast('Gagal: ' + e.message); }
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Validate and run**

```bash
node --check patch_wlk7.js
node patch_wlk7.js
```
Expected: `OK fn: openCloseWoodlogKapalModal`, `OK fn: submitCloseWoodlogKapal`, `Done. 2 replacements made.`

- [ ] **Step 3: Manual verify in Chrome**

- A project with `end_date` set shows "Tutup" button
- Click "Tutup" → modal shows only Invoice Number + Invoice Amount fields, no HM/Solar fields
- Submit with invoice → project status changes to "Tutup" (green), Hapus and Tutup buttons disappear

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wlk7.js
git commit -m "feat(wlk7): repurpose WL Kapal Tutup modal to invoice number + amount only"
```

---

### Task 8: Update Analisis Biaya — new BBM formula + Invoice Amount column

**Files:**
- Modify: `index.html` (via `patch_wlk8.js`)
- Create: `patch_wlk8.js`

**Interfaces:**
- Consumes: `WL_BANGAU_CODES`, `WL_STD_CODES`, `project_units.solar_awal_pct`, `project_units.solar_akhir_pct`, `project_units.unit_id`, `projects.invoice_amount`, `fuel_dispenses` (already fetched by `loadWoodlogAnalisis`)
- Produces: Updated `renderWoodlogAnalisis` with correct BBM formula and Invoice Amount column; `loadWoodlogAnalisis` also fetches `units(code)` on project_units for tank size calculation

- [ ] **Step 1: Write the patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_wlk8.js`:

```js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

replaceFn('loadWoodlogAnalisis', true, `async function loadWoodlogAnalisis() {
  const el = document.getElementById('wl-panel-analisis');
  if (!el) return;
  el.innerHTML = '<div style="color:#94A3B8;padding:20px;">Memuat...</div>';
  try {
    const { data: projects, error } = await sb.from('projects')
      .select('*, project_units(unit_id, hm_awal, hm_akhir, solar_awal_pct, solar_akhir_pct, units(code))')
      .eq('type', 'woodlog_kapal').not('end_date', 'is', null)
      .order('project_code', { ascending: false });
    if (error) throw error;
    if (!projects || projects.length === 0) {
      el.innerHTML = '<div style="color:#94A3B8;padding:20px;">Belum ada proyek kapal woodlog yang selesai.</div>'; return;
    }
    const ids = projects.map(p => p.id);
    const [salRes, fillRes] = await Promise.all([
      sb.from('woodlog_operator_salary').select('project_id, salary_amount').in('project_id', ids),
      fetchFillMap(ids)
    ]);
    const salMap = {};
    (salRes.data || []).forEach(s => { salMap[s.project_id] = (salMap[s.project_id] || 0) + Number(s.salary_amount); });
    renderWoodlogAnalisis(projects, salMap, fillRes);
  } catch(e) { el.innerHTML = '<div style="color:#EF4444;padding:20px;">Error: ' + e.message + '</div>'; }
}`);

replaceFn('renderWoodlogAnalisis', false, `function renderWoodlogAnalisis(projects, salMap, fillMap) {
  const el = document.getElementById('wl-panel-analisis');
  if (!el) return;
  const rows = projects.map(function(p) {
    const income = (p.total_mt_m3 && p.unit_price) ? Number(p.total_mt_m3) * Number(p.unit_price) : 0;
    const pus = p.project_units || [];
    const projectFills = (fillMap && fillMap[p.id]) ? fillMap[p.id] : {};
    // BBM: per unit with correct tank size
    let totalBBM = 0;
    pus.forEach(function(pu) {
      const unitCode = (pu.units && pu.units.code) ? pu.units.code : '';
      const tankSize = WL_BANGAU_CODES.includes(unitCode) ? 450 : 320;
      const hasSolar = pu.solar_awal_pct != null && pu.solar_akhir_pct != null;
      const tankDiff = hasSolar ? (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * tankSize : 0;
      const fills = projectFills[pu.unit_id] || 0;
      totalBBM += tankDiff + fills;
    });
    const fuelCost = totalBBM * Number(p.harga_solar_rpl || 0);
    const laborBase = salMap[p.id] || 0;
    const laborCost = laborBase * 1.05;
    const profit = income - fuelCost - laborCost;
    const totalHM = pus.reduce(function(a, pu) {
      return a + ((pu.hm_akhir && pu.hm_awal) ? Number(pu.hm_akhir) - Number(pu.hm_awal) : 0);
    }, 0);
    const yieldHM = totalHM > 0 ? profit / totalHM : 0;
    const fmtRp = function(v) { return 'Rp ' + Math.round(v).toLocaleString('id'); };
    return '<tr>' +
      '<td style="font-weight:700;color:#1D4ED8;">' + p.project_code + '</td>' +
      '<td>' + (p.nama_kapal || '—') + '</td>' +
      '<td>' + formatDate(p.end_date) + '</td>' +
      '<td style="text-align:right;">' + fmtRp(income) + '</td>' +
      '<td style="text-align:right;color:#D97706;">' + (Math.round(totalBBM).toLocaleString('id') + ' L · ' + fmtRp(fuelCost)) + '</td>' +
      '<td style="text-align:right;color:#7C3AED;">' + fmtRp(laborCost) + '</td>' +
      '<td style="text-align:right;font-weight:700;color:' + (profit >= 0 ? '#16A34A' : '#DC2626') + ';">' + fmtRp(profit) + '</td>' +
      '<td style="text-align:right;font-size:12px;">' + Math.round(yieldHM).toLocaleString('id') + '/HM</td>' +
      '<td style="text-align:right;color:#64748B;">' + (p.invoice_amount ? fmtRp(p.invoice_amount) : '—') + '</td>' +
      '</tr>';
  }).join('');
  el.innerHTML = '<div class="table-wrap"><table class="dt"><thead><tr><th>Kode</th><th>Kapal</th><th>Selesai</th><th style="text-align:right;">Income</th><th style="text-align:right;">BBM (L · Cost)</th><th style="text-align:right;">Labor (+5%)</th><th style="text-align:right;">Profit</th><th style="text-align:right;">Yield/HM</th><th style="text-align:right;">Invoice</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
```

- [ ] **Step 2: Validate and run**

```bash
node --check patch_wlk8.js
node patch_wlk8.js
```
Expected: `OK fn: loadWoodlogAnalisis`, `OK fn: renderWoodlogAnalisis`, `Done. 2 replacements made.`

- [ ] **Step 3: Manual verify in Chrome**

- Admin → Proyek Woodlog → Analisis tab
- Table has new column "Invoice" (rightmost)
- Projects with invoice_amount show Rp value; without show "—"
- BBM column shows e.g. `1,240 L · Rp 12,400,000`
- For a project with J02/J03 units, verify tank size = 450L (Bangau), J45–J48 = 320L (STD)

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wlk8.js
git commit -m "feat(wlk8): update WL Analisis Biaya — BBM formula (320/450L) + Invoice Amount column"
```

---

## Post-Implementation Checklist

- [ ] Full end-to-end flow test in Chrome:
  1. Add new Kapal project → confirm no STD tonnage, no invoice field
  2. Edit project → fill HM Akhir, Solar Akhir, STD tonnage, set Tgl Selesai → save
  3. Verify status changes to "Selesai" 🔵, Tutup button appears
  4. Click "Tutup" → enter invoice → save
  5. Verify status changes to "Tutup" 🟢, Hapus button gone
  6. Click project code → detail row expands → 3 sections visible
  7. Click "Total HM" cell → same detail row expands
  8. Click "BBM" cell → same detail row expands
  9. Analisis tab → new Invoice column visible, BBM formula updated
- [ ] Verify `node --check` passes on all 7 patch scripts
- [ ] Push to remote: `git push origin master`
- [ ] Check Vercel deploy log — no build errors
