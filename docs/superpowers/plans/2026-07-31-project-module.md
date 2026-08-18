# Proyek Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only Proyek module to SERVIS SAA that tracks Kapal (ship) and Stockpile excavator jobs with salary calculations, fuel consumption, cost/profit analysis, invoice closure tracking, and per-unit HM continuity.

**Architecture:** Two new Supabase tables (`projects`, `project_units`) store job records; all calculations are derived on the frontend. A 5-tab admin screen is added following the existing BBM module pattern. All JS changes go through Node.js patch scripts (`patch_proyekN.js`) — never the Edit tool on `<script>` sections.

**Tech Stack:** Vanilla JS + Supabase JS SDK (CDN) + Tailwind CSS (CDN) + SheetJS (CDN — not yet present, added in Task 2)

## Global Constraints

- **NEVER use the Edit tool on `index.html` JS sections** — corrupts U+0027 apostrophes to curly quotes, silently breaks the entire app. All JS changes via Node.js patch scripts only.
- `index.html` uses **CRLF (`\r\n`) line endings** — all multi-line `replaceExact` match strings MUST use `\r\n`, not `\n`. Test each replaceExact by checking count ≥ 1 before replacing.
- After every patch script: run `node patch_proyekN.js && node --check index.html` — must exit 0.
- Admin-only module: Proyek nav + screen must not appear for SPV, Operator, or MKN roles.
- Solar tank capacity: **320 liters** per unit.
- Base salary: **Rp 3,100,000/month** per operator (added in Ringkasan only).
- Ship rate tiers: ships 1–15 → Rp 175/MT, ships 16–30 → Rp 200/MT, ships >30 → Rp 225/MT. Resets every calendar month (`month_year` field, format `'YYYY-MM'`).
- Units are the existing 23 excavators in the `units` Supabase table (K1, K3 … TEST).
- Patch script helper pattern: `replaceFn(name, isAsync, newBody)` replaces entire named function; `replaceExact(from, to, desc)` does count-verified find-replace. Both already exist in previous patch scripts — copy the helpers from `patch_bbm4.js`.
- Commit after each task with `git add index.html && git commit -m "feat: ..."`.

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `schema_proyek.sql` | Create | SQL for `projects` + `project_units` tables + RLS |
| `patch_proyek1.js` | Create | SheetJS CDN + nav link + screen HTML + switchAdmin wire-up + switchProyekTab + initProyekModule |
| `patch_proyek2.js` | Create | Global state vars + calc helper functions |
| `patch_proyek3.js` | Create | Kapal list view: loadProyekKapal + renderProyekKapalList |
| `patch_proyek4.js` | Create | Add Kapal modal: openAddKapalModal + unit rows + HM continuity + submitAddKapal |
| `patch_proyek5.js` | Create | Stockpile tab: list + add modal |
| `patch_proyek6.js` | Create | Ringkasan tab + Excel export |
| `patch_proyek7.js` | Create | Analisis Biaya: cost/profit table + invoice tracking |
| `patch_proyek8.js` | Create | Kontinuitas HM: per-unit timeline |
| `index.html` | Modify (via patches) | Main app file |

---

## Task 1: Database Schema

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\schema_proyek.sql`

**Interfaces:**
- Produces: `projects` table, `project_units` table, RLS policies — consumed by all later tasks via Supabase JS SDK

- [ ] **Step 1: Create schema_proyek.sql**

```sql
-- ============================================================
-- PROYEK MODULE SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code         text NOT NULL UNIQUE,
  type                 text NOT NULL CHECK (type IN ('kapal','stockpile')),
  nama_kapal           text,
  pemberi_kerja        text NOT NULL,
  kade                 text,
  start_date           date NOT NULL,
  end_date             date NOT NULL,
  month_year           text NOT NULL,
  ship_number_in_month int,
  cargo_type           text,
  total_mt_m3          numeric,
  unit_price           numeric,
  harga_solar_rpl      numeric,
  invoice_number       text,
  code_prefix          text,
  code_seq             int,
  notes                text,
  created_at           timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_units (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  unit_id          uuid NOT NULL REFERENCES public.units(id),
  hm_awal          numeric NOT NULL,
  hm_akhir         numeric NOT NULL,
  solar_awal_pct   smallint NOT NULL CHECK (solar_awal_pct BETWEEN 0 AND 100),
  solar_akhir_pct  smallint NOT NULL CHECK (solar_akhir_pct BETWEEN 0 AND 100),
  solar_isi_liters numeric NOT NULL DEFAULT 0,
  hm_gap_reason    text,
  created_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_projects" ON public.projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_project_units" ON public.project_units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

- [ ] **Step 2: Run in Supabase SQL editor**

Open https://supabase.com/dashboard/project/xpecefriamslzidlcsuj/sql/new, paste the entire `schema_proyek.sql` content, click Run.

Expected: "Success. No rows returned"

- [ ] **Step 3: Verify tables exist**

In Supabase Table Editor, confirm `projects` and `project_units` appear with the correct columns.

- [ ] **Step 4: Commit**

```bash
git add schema_proyek.sql
git commit -m "feat: add projects + project_units schema with RLS"
```

---

## Task 2: SheetJS CDN + Nav + Screen Skeleton + Tab Switch

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_proyek1.js`
- Modify: `index.html` (via patch script)

**Interfaces:**
- Consumes: existing `switchAdmin(name, el)` at line ~3884, existing BBM nav slink at line ~548, existing `admin-screen-bbm` block ending at line ~818
- Produces: `switchProyekTab(tab, el)`, `initProyekModule()` — consumed by Tasks 3–9

- [ ] **Step 1: Create patch_proyek1.js**

```js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

// 1. Add SheetJS CDN after supabase script tag
replaceExact(
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\r\n<script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>',
  'add SheetJS CDN'
);

// 2. Add Proyek nav slink after BBM slink
replaceExact(
  '    <div class="slink" onclick="switchAdmin(\'bbm\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/><line x1="7" y1="5" x2="7" y2="5"/><line x1="7" y1="12" x2="7" y2="12"/></svg>BBM</div>\r\n    </div>',
  '    <div class="slink" onclick="switchAdmin(\'bbm\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/><line x1="7" y1="5" x2="7" y2="5"/><line x1="7" y1="12" x2="7" y2="12"/></svg>BBM</div>\r\n    <div class="slink" onclick="switchAdmin(\'proyek\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>Proyek</div>\r\n    </div>',
  'add Proyek nav slink'
);

// 3. Add admin-screen-proyek HTML before closing desk-content
const screenHTML = `  <div id="admin-screen-proyek" class="dscreen">\r\n  <div style="font-size:22px;font-weight:800;color:#1E293B;margin-bottom:16px;">Proyek</div>\r\n  <div id="proyek-tabs" style="display:flex;gap:0;border-bottom:2px solid #E2E8F0;margin-bottom:20px;flex-wrap:wrap;">\r\n    <button id="proyek-tab-kapal" onclick="switchProyekTab(\'kapal\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#1D4ED8;border-bottom:3px solid #1D4ED8;margin-bottom:-2px;">Kapal</button>\r\n    <button id="proyek-tab-stockpile" onclick="switchProyekTab(\'stockpile\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Stockpile</button>\r\n    <button id="proyek-tab-ringkasan" onclick="switchProyekTab(\'ringkasan\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Ringkasan</button>\r\n    <button id="proyek-tab-analisis" onclick="switchProyekTab(\'analisis\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Analisis Biaya</button>\r\n    <button id="proyek-tab-kontinuitas" onclick="switchProyekTab(\'kontinuitas\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Kontinuitas HM</button>\r\n  </div>\r\n  <div id="proyek-panel-kapal"></div>\r\n  <div id="proyek-panel-stockpile" style="display:none;"></div>\r\n  <div id="proyek-panel-ringkasan" style="display:none;"></div>\r\n  <div id="proyek-panel-analisis" style="display:none;"></div>\r\n  <div id="proyek-panel-kontinuitas" style="display:none;"></div>\r\n  </div>\r\n`;

replaceExact(
  '<!-- MODAL OVERLAY -->',
  screenHTML + '<!-- MODAL OVERLAY -->',
  'add admin-screen-proyek HTML'
);

// 4. Wire up switchAdmin: add 'proyek' to labels + lazy init
replaceExact(
  "const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM' };",
  "const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM', proyek:'Proyek' };",
  'add proyek to labels'
);

replaceExact(
  "  if (name === 'bbm') initFuelBBM();\r\n}",
  "  if (name === 'bbm') initFuelBBM();\r\n  if (name === 'proyek') initProyekModule();\r\n}",
  'add proyek lazy init to switchAdmin'
);

// 5. Add switchProyekTab + initProyekModule functions (append before closing script tag)
const newFunctions = `\r\n// ============================================================\r\n// PROYEK MODULE\r\n// ============================================================\r\nfunction switchProyekTab(tab, el) {\r\n  proyekTab = tab;\r\n  const tabs = ['kapal','stockpile','ringkasan','analisis','kontinuitas'];\r\n  tabs.forEach(t => {\r\n    const btn = document.getElementById('proyek-tab-' + t);\r\n    const panel = document.getElementById('proyek-panel-' + t);\r\n    const active = t === tab;\r\n    if (btn) { btn.style.color = active ? '#1D4ED8' : '#94A3B8'; btn.style.borderBottomColor = active ? '#1D4ED8' : 'transparent'; }\r\n    if (panel) panel.style.display = active ? '' : 'none';\r\n  });\r\n  if (tab === 'kapal') loadProyekKapal();\r\n  if (tab === 'stockpile') loadProyekStockpile();\r\n  if (tab === 'ringkasan') loadProyekRingkasan();\r\n  if (tab === 'analisis') loadProyekAnalisis();\r\n  if (tab === 'kontinuitas') renderProyekKontinuitas();\r\n}\r\n\r\nfunction initProyekModule() {\r\n  switchProyekTab('kapal', document.getElementById('proyek-tab-kapal'));\r\n}\r\n`;

replaceExact(
  '\r\n</script>\r\n</body>',
  newFunctions + '\r\n</script>\r\n</body>',
  'add switchProyekTab + initProyekModule'
);

fs.writeFileSync(filePath, html, 'utf8');
console.log('patch_proyek1.js: ' + changes + ' changes applied.');
```

- [ ] **Step 2: Run patch and verify**

```bash
node patch_proyek1.js && node --check index.html
```

Expected output:
```
OK: add SheetJS CDN
OK: add Proyek nav slink
OK: add admin-screen-proyek HTML
OK: add proyek to labels
OK: add proyek lazy init to switchAdmin
OK: add switchProyekTab + initProyekModule
patch_proyek1.js: 6 changes applied.
```
Then: `node --check index.html` exits silently (no errors).

- [ ] **Step 3: Browser verify**

Open `index.html` locally or visit servis-saa.vercel.app, log in as admin. Confirm:
- "Proyek" appears in sidebar nav below BBM
- Clicking Proyek shows 5 tab buttons: Kapal | Stockpile | Ringkasan | Analisis Biaya | Kontinuitas HM
- Clicking each tab shows empty panels (no errors in browser console)

- [ ] **Step 4: Commit**

```bash
git add index.html patch_proyek1.js
git commit -m "feat: add Proyek module skeleton — nav, screen, 5 sub-tabs"
```

---

## Task 3: Global State + Calculation Helpers

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_proyek2.js`
- Modify: `index.html` (via patch script)

**Interfaces:**
- Consumes: existing global state block ending at line ~875 (`bbmLastDispenseByUnit`)
- Produces: `proyekTab`, `proyekKapalData`, `proyekStockpileData`, `proyekMonthFilter`, `proyekHMUnitId`, `proyekAnalisisFilter`; `calcKapalRate(shipNum)`, `calcSolarConsumed(awalPct, akhirPct, isiLiters)`, `calcKapalTonnageSplit(units, totalMt)`, `getNextKapalShipNum(monthYear)`, `formatKapalCode(monthYear, shipNum)`, `formatStockpileCode(prefix, seq)`, `fmtRp(n)` — consumed by Tasks 4–9

- [ ] **Step 1: Create patch_proyek2.js**

```js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

// 1. Add global state vars after bbmLastDispenseByUnit line
replaceExact(
  'let bbmLastDispenseByUnit = {};',
  `let bbmLastDispenseByUnit = {};\r\nlet proyekTab = 'kapal';\r\nlet proyekKapalData = [];\r\nlet proyekStockpileData = [];\r\nlet proyekMonthFilter = new Date().toISOString().slice(0,7);\r\nlet proyekHMUnitId = null;\r\nlet proyekAnalisisFilter = 'semua';`,
  'add proyek global state vars'
);

// 2. Add calculation helpers before the PROYEK MODULE comment
replaceExact(
  '// ============================================================\r\n// PROYEK MODULE\r\n// ============================================================',
  `// ============================================================\r\n// PROYEK CALC HELPERS\r\n// ============================================================\r\nfunction calcKapalRate(shipNum) {\r\n  if (shipNum <= 15) return 175;\r\n  if (shipNum <= 30) return 200;\r\n  return 225;\r\n}\r\n\r\nfunction calcSolarConsumed(awalPct, akhirPct, isiLiters) {\r\n  return ((awalPct - akhirPct) / 100) * 320 + (isiLiters || 0);\r\n}\r\n\r\nfunction calcMedianHM(hmArray) {\r\n  const sorted = [...hmArray].sort((a, b) => a - b);\r\n  const mid = Math.floor(sorted.length / 2);\r\n  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;\r\n}\r\n\r\nfunction calcKapalTonnageSplit(units, totalMt) {\r\n  const withHM = units.map(u => ({ ...u, hm: (u.hm_akhir - u.hm_awal) }));\r\n  const hmArr = withHM.map(u => u.hm);\r\n  const median = calcMedianHM(hmArr);\r\n  const totalHM = hmArr.reduce((s, h) => s + h, 0);\r\n  const allWithin = median > 0 && withHM.every(u => Math.abs(u.hm - median) / median <= 0.25);\r\n  return withHM.map(u => ({\r\n    ...u,\r\n    allocatedMt: allWithin\r\n      ? totalMt / units.length\r\n      : (totalHM > 0 ? totalMt * (u.hm / totalHM) : 0)\r\n  }));\r\n}\r\n\r\nasync function getNextKapalShipNum(monthYear) {\r\n  const { count } = await sb.from('projects')\r\n    .select('id', { count: 'exact', head: true })\r\n    .eq('type', 'kapal')\r\n    .eq('month_year', monthYear);\r\n  return (count || 0) + 1;\r\n}\r\n\r\nfunction formatKapalCode(monthYear, shipNum) {\r\n  const mm = monthYear.slice(5, 7);\r\n  return 'M' + mm + '-' + String(shipNum).padStart(3, '0');\r\n}\r\n\r\nfunction formatStockpileCode(prefix, seq) {\r\n  return prefix.toUpperCase().trim() + '-' + String(seq).padStart(3, '0');\r\n}\r\n\r\nfunction fmtRp(n) {\r\n  if (n == null || isNaN(n)) return 'Rp 0';\r\n  return 'Rp ' + Math.round(n).toLocaleString('id-ID');\r\n}\r\n\r\nasync function checkHMContinuity(unitId, hmAwal) {\r\n  const { data } = await sb.from('project_units')\r\n    .select('hm_akhir, project_id')\r\n    .eq('unit_id', unitId)\r\n    .lt('hm_akhir', hmAwal)\r\n    .order('hm_akhir', { ascending: false })\r\n    .limit(1);\r\n  if (!data || data.length === 0) return { hasGap: false };\r\n  const prevHmAkhir = data[0].hm_akhir;\r\n  const gap = hmAwal - prevHmAkhir;\r\n  if (gap <= 0) return { hasGap: false };\r\n  return { hasGap: true, gapSize: gap, prevHmAkhir };\r\n}\r\n\r\n// ============================================================\r\n// PROYEK MODULE\r\n// ============================================================`,
  'add proyek calc helpers'
);

fs.writeFileSync(filePath, html, 'utf8');
console.log('patch_proyek2.js: ' + changes + ' changes applied.');
```

- [ ] **Step 2: Run patch and verify**

```bash
node patch_proyek2.js && node --check index.html
```

Expected:
```
OK: add proyek global state vars
OK: add proyek calc helpers
patch_proyek2.js: 2 changes applied.
```

- [ ] **Step 3: Commit**

```bash
git add index.html patch_proyek2.js
git commit -m "feat: add Proyek global state + calc helpers (rate tiers, tonnage split, solar)"
```

---

## Task 4: Kapal List View

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_proyek3.js`
- Modify: `index.html` (via patch script)

**Interfaces:**
- Consumes: `proyekKapalData`, `calcKapalRate(shipNum)`, `calcKapalTonnageSplit(units, totalMt)`, `calcSolarConsumed(awalPct, akhirPct, isiLiters)`, `fmtRp(n)`, `formatDate(d)`, Supabase `projects` + `project_units` tables
- Produces: `loadProyekKapal()`, `renderProyekKapalList()`, `toggleKapalDetail(id)` — consumed by Task 5 (list refresh after add)

- [ ] **Step 1: Create patch_proyek3.js**

```js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

function replaceFn(name, isAsync, newBody) {
  const prefix = isAsync ? 'async function ' : 'function ';
  const start = html.indexOf(prefix + name + '(');
  if (start === -1) { console.error('MISS fn: ' + name); process.exit(1); }
  let depth = 0, i = html.indexOf('{', start), bodyStart = i;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
  }
  html = html.slice(0, start) + (isAsync ? 'async ' : '') + 'function ' + name + newBody + html.slice(i + 1);
  changes++;
  console.log('OK fn: ' + name);
}

const kapalFunctions = `\r\nasync function loadProyekKapal() {\r\n  const panel = document.getElementById('proyek-panel-kapal');\r\n  panel.innerHTML = '<div style="color:#64748B;padding:20px;">Memuat data...</div>';\r\n  try {\r\n    const { data, error } = await sb.from('projects')\r\n      .select('*, project_units(*, units(code,name))')\r\n      .eq('type', 'kapal')\r\n      .order('created_at', { ascending: false });\r\n    if (error) throw error;\r\n    proyekKapalData = data || [];\r\n    renderProyekKapalList();\r\n  } catch(e) { panel.innerHTML = '<div style="color:#EF4444;padding:20px;">Error: ' + e.message + '</div>'; }\r\n}\r\n\r\nfunction renderProyekKapalList() {\r\n  const panel = document.getElementById('proyek-panel-kapal');\r\n  let html2 = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';\r\n  html2 += '<div style="font-size:15px;font-weight:700;color:#1E293B;">Daftar Proyek Kapal (' + proyekKapalData.length + ')</div>';\r\n  html2 += '<button onclick="openAddKapalModal()" class="btn-primary" style="padding:8px 16px;font-size:13px;">+ Tambah Kapal</button>';\r\n  html2 += '</div>';\r\n  if (proyekKapalData.length === 0) {\r\n    html2 += '<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Belum ada proyek kapal.</div>';\r\n    panel.innerHTML = html2;\r\n    return;\r\n  }\r\n  html2 += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';\r\n  html2 += '<thead><tr style="background:#F1F5F9;">';\r\n  ['Kode','Nama Kapal','Pemberi Kerja','Kade','Tgl','Kapal#','Unit','HM Total','MT/M3','Salary Total'].forEach(h => {\r\n    html2 += '<th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;">' + h + '</th>';\r\n  });\r\n  html2 += '<th style="padding:10px 12px;"></th></tr></thead><tbody>';\r\n  proyekKapalData.forEach(p => {\r\n    const units = p.project_units || [];\r\n    const totalHM = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal), 0);\r\n    const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n    const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);\r\n    const totalSalary = split.reduce((s, u) => s + u.allocatedMt * rate, 0);\r\n    html2 += '<tr style="border-bottom:1px solid #F1F5F9;cursor:pointer;" onclick="toggleKapalDetail(\\'' + p.id + '\\')">';\r\n    html2 += '<td style="padding:10px 12px;font-weight:700;color:#1D4ED8;">' + p.project_code + '</td>';\r\n    html2 += '<td style="padding:10px 12px;">' + (p.nama_kapal || '—') + '</td>';\r\n    html2 += '<td style="padding:10px 12px;">' + p.pemberi_kerja + '</td>';\r\n    html2 += '<td style="padding:10px 12px;">' + (p.kade || '—') + '</td>';\r\n    html2 += '<td style="padding:10px 12px;white-space:nowrap;">' + formatDate(p.start_date) + ' – ' + formatDate(p.end_date) + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:center;">' + (p.ship_number_in_month || '—') + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:center;">' + units.length + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:right;">' + totalHM.toFixed(1) + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:right;">' + (p.total_mt_m3 ? p.total_mt_m3.toLocaleString('id-ID') : '—') + '</td>';\r\n    html2 += '<td style="padding:10px 12px;text-align:right;font-weight:700;color:#16A34A;">' + fmtRp(totalSalary) + '</td>';\r\n    html2 += '<td style="padding:10px 12px;"><svg style="width:14px;height:14px;" fill="none" stroke="#94A3B8" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg></td>';\r\n    html2 += '</tr>';\r\n    html2 += '<tr id="kapal-detail-' + p.id + '" style="display:none;background:#F8FAFC;">';\r\n    html2 += '<td colspan="11" style="padding:12px 16px;">';\r\n    html2 += renderKapalDetailHTML(p);\r\n    html2 += '</td></tr>';\r\n  });\r\n  html2 += '</tbody></table></div>';\r\n  panel.innerHTML = html2;\r\n}\r\n\r\nfunction toggleKapalDetail(id) {\r\n  const row = document.getElementById('kapal-detail-' + id);\r\n  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';\r\n}\r\n\r\nfunction renderKapalDetailHTML(p) {\r\n  const units = p.project_units || [];\r\n  const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n  const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);\r\n  let h = '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px;">';\r\n  h += '<tr style="background:#E2E8F0;"><th style="padding:6px 10px;text-align:left;">Unit</th><th style="padding:6px 10px;text-align:right;">HM Awal</th><th style="padding:6px 10px;text-align:right;">HM Akhir</th><th style="padding:6px 10px;text-align:right;">HM Kerja</th><th style="padding:6px 10px;text-align:right;">MT Alokasi</th><th style="padding:6px 10px;text-align:right;">Rate</th><th style="padding:6px 10px;text-align:right;">Salary</th><th style="padding:6px 10px;text-align:right;">Solar (L)</th></tr>';\r\n  split.forEach(u => {\r\n    const hmKerja = u.hm_akhir - u.hm_awal;\r\n    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);\r\n    const salary = u.allocatedMt * rate;\r\n    const unitCode = u.units ? u.units.code : '?';\r\n    h += '<tr style="border-bottom:1px solid #E2E8F0;">';\r\n    h += '<td style="padding:6px 10px;font-weight:700;">' + unitCode + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + u.hm_awal + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + u.hm_akhir + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + hmKerja.toFixed(1) + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + u.allocatedMt.toFixed(2) + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">Rp ' + rate + '/MT</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;font-weight:700;color:#16A34A;">' + fmtRp(salary) + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + solar.toFixed(1) + ' L</td>';\r\n    h += '</tr>';\r\n  });\r\n  h += '</table>';\r\n  if (p.notes) h += '<div style="margin-top:8px;font-size:12px;color:#64748B;">Catatan: ' + p.notes + '</div>';\r\n  return h;\r\n}\r\n`;

replaceExact(
  'function switchProyekTab(tab, el) {',
  kapalFunctions + 'function switchProyekTab(tab, el) {',
  'add kapal list functions'
);

fs.writeFileSync(filePath, html, 'utf8');
console.log('patch_proyek3.js: ' + changes + ' changes applied.');
```

- [ ] **Step 2: Run patch and verify**

```bash
node patch_proyek3.js && node --check index.html
```

Expected:
```
OK: add kapal list functions
patch_proyek3.js: 1 changes applied.
```

- [ ] **Step 3: Browser verify**

Log in as admin → Proyek → Kapal tab. Confirm:
- "Daftar Proyek Kapal (0)" heading with "+ Tambah Kapal" button visible
- No JS errors in console

- [ ] **Step 4: Commit**

```bash
git add index.html patch_proyek3.js
git commit -m "feat: Proyek Kapal list view with per-unit detail expansion"
```

---

## Task 5: Add Kapal Modal

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_proyek4.js`
- Modify: `index.html` (via patch script)

**Interfaces:**
- Consumes: `proyekKapalData`, `allUnits` (global), `checkHMContinuity(unitId, hmAwal)`, `getNextKapalShipNum(monthYear)`, `formatKapalCode(monthYear, shipNum)`, `calcKapalRate(shipNum)`, `loadProyekKapal()`, `showToast()`, `openModal(html)` / `closeModal()` or existing modal pattern
- Produces: `openAddKapalModal()`, `addKapalUnitRow(containerId)`, `removeKapalUnitRow(btn)`, `onKapalHMAwalChange(input, unitId)`, `submitAddKapal()` — consumed by list view "+ Tambah Kapal" button

**Note:** Check existing modal pattern first. Look for `openModal` or `showModal` in index.html around line 822 (modal overlay). The existing pattern uses `document.getElementById('modal-box').innerHTML = ...` then shows `modal-overlay`. Use that same pattern.

- [ ] **Step 1: Check existing modal pattern**

```bash
grep -n "modal-overlay\|modal-box\|function.*[Mm]odal\|openModal\|closeModal" index.html | head -20
```

Note the function names and adapt the patch below to match.

- [ ] **Step 2: Create patch_proyek4.js**

```js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

const kapalModalFunctions = `\r\nasync function openAddKapalModal() {\r\n  const today = todayISO();\r\n  const monthYear = today.slice(0,7);\r\n  const shipNum = await getNextKapalShipNum(monthYear);\r\n  const previewCode = formatKapalCode(monthYear, shipNum);\r\n  const rate = calcKapalRate(shipNum);\r\n  const unitOptions = allUnits.map(u => '<option value="' + u.id + '">' + u.code + ' – ' + u.name + '</option>').join('');\r\n  const modalHTML = '<div style="padding:24px;max-width:680px;width:100%;max-height:80vh;overflow-y:auto;">'\r\n    + '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;">Tambah Proyek Kapal</div>'\r\n    + '<div style="font-size:13px;color:#1D4ED8;font-weight:700;margin-bottom:16px;">Kode: ' + previewCode + ' &nbsp;|&nbsp; Rate: Rp ' + rate + '/MT (Kapal #' + shipNum + ' bulan ini)</div>'\r\n    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nama Kapal *</label><input type="text" id="kapal-add-namakapal" class="finput" placeholder="MV Sumber Jaya"></div>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Pemberi Kerja *</label><input type="text" id="kapal-add-pemberi" class="finput" placeholder="KCN"></div>'\r\n    + '</div>'\r\n    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Kade</label><input type="text" id="kapal-add-kade" class="finput" placeholder="Kade 3"></div>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Jenis Kargo</label><input type="text" id="kapal-add-cargo" class="finput" placeholder="Batubara"></div>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Total MT/M3 *</label><input type="number" id="kapal-add-mt" class="finput" placeholder="5000" min="0" step="0.01"></div>'\r\n    + '</div>'\r\n    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Harga (Rp/MT) *</label><input type="number" id="kapal-add-unitprice" class="finput" placeholder="Revenue/MT" min="0"></div>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Harga Solar (Rp/L)</label><input type="number" id="kapal-add-solarprice" class="finput" placeholder="10000" min="0"></div>'\r\n    + '<div></div>'\r\n    + '</div>'\r\n    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tgl Mulai *</label><input type="date" id="kapal-add-start" class="finput" value="' + today + '"></div>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tgl Selesai *</label><input type="date" id="kapal-add-end" class="finput" value="' + today + '"></div>'\r\n    + '</div>'\r\n    + '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Unit yang Mengerjakan</div>'\r\n    + '<div id="kapal-unit-rows" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>'\r\n    + '<button onclick="addKapalUnitRow()" style="background:#EFF6FF;border:1.5px dashed #93C5FD;color:#1D4ED8;font-size:13px;font-weight:700;padding:8px 16px;border-radius:8px;cursor:pointer;width:100%;margin-bottom:16px;">+ Tambah Unit</button>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Catatan</label><textarea id="kapal-add-notes" class="finput" rows="2" placeholder="Opsional"></textarea></div>'\r\n    + '<div style="display:flex;gap:12px;margin-top:16px;">'\r\n    + '<button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>'\r\n    + '<button onclick="submitAddKapal(' + shipNum + ',\\'' + monthYear + '\\')" class="btn-primary" style="flex:2;">Simpan Proyek</button>'\r\n    + '</div></div>';\r\n  document.getElementById('modal-box').innerHTML = modalHTML;\r\n  document.getElementById('modal-overlay').style.display = 'flex';\r\n  addKapalUnitRow();\r\n}\r\n\r\nlet _kapalUnitRowId = 0;\r\nfunction addKapalUnitRow() {\r\n  const rowId = ++_kapalUnitRowId;\r\n  const unitOptions = allUnits.map(u => '<option value="' + u.id + '">' + u.code + '</option>').join('');\r\n  const container = document.getElementById('kapal-unit-rows');\r\n  const div = document.createElement('div');\r\n  div.id = 'kapal-urow-' + rowId;\r\n  div.style.cssText = 'background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;';\r\n  div.innerHTML = '<div style="display:grid;grid-template-columns:1fr 80px 80px 60px 60px 80px 24px;gap:8px;align-items:end;">'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Unit</label><select class="finput" id="ku-unit-' + rowId + '" style="font-size:12px;padding:6px 8px;"><option value="">Pilih</option>' + unitOptions + '</select></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">HM Awal</label><input type="number" id="ku-hmawal-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="0" onblur="onKapalHMAwalChange(this,' + rowId + ')"></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">HM Akhir</label><input type="number" id="ku-hmakhir-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="0"></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Awal%</label><input type="number" id="ku-sawal-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="80" min="0" max="100"></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Akhir%</label><input type="number" id="ku-sakhir-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="20" min="0" max="100"></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Isi(L)</label><input type="number" id="ku-sisi-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="0" min="0"></div>'\r\n    + '<div style="padding-bottom:2px;"><button onclick="removeKapalUnitRow(' + rowId + ')" style="background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;">×</button></div>'\r\n    + '</div>'\r\n    + '<div id="ku-gap-' + rowId + '" style="display:none;margin-top:8px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:8px 12px;font-size:12px;color:#DC2626;">'\r\n    + '<strong>GAP HM terdeteksi!</strong> <span id="ku-gap-msg-' + rowId + '"></span>'\r\n    + '<div style="margin-top:6px;"><label style="font-size:11px;font-weight:600;">Alasan gap (wajib diisi): </label><input type="text" id="ku-gap-reason-' + rowId + '" class="finput" style="font-size:12px;padding:5px 8px;margin-top:4px;" placeholder="Contoh: unit diparkir, perawatan, dll."></div>'\r\n    + '</div>';\r\n  container.appendChild(div);\r\n}\r\n\r\nfunction removeKapalUnitRow(rowId) {\r\n  const el = document.getElementById('kapal-urow-' + rowId);\r\n  if (el) el.remove();\r\n}\r\n\r\nasync function onKapalHMAwalChange(input, rowId) {\r\n  const unitId = document.getElementById('ku-unit-' + rowId)?.value;\r\n  const hmAwal = parseFloat(input.value);\r\n  const gapDiv = document.getElementById('ku-gap-' + rowId);\r\n  if (!unitId || !hmAwal || !gapDiv) return;\r\n  const result = await checkHMContinuity(unitId, hmAwal);\r\n  if (result.hasGap) {\r\n    document.getElementById('ku-gap-msg-' + rowId).textContent =\r\n      'HM ' + result.prevHmAkhir + ' → ' + hmAwal + ' (gap ' + result.gapSize.toFixed(1) + ' HM tidak terbilang).';\r\n    gapDiv.style.display = '';\r\n  } else {\r\n    gapDiv.style.display = 'none';\r\n  }\r\n}\r\n\r\nasync function submitAddKapal(shipNum, monthYear) {\r\n  const namaKapal = document.getElementById('kapal-add-namakapal')?.value.trim();\r\n  const pemberiKerja = document.getElementById('kapal-add-pemberi')?.value.trim();\r\n  const kade = document.getElementById('kapal-add-kade')?.value.trim();\r\n  const cargo = document.getElementById('kapal-add-cargo')?.value.trim();\r\n  const totalMt = parseFloat(document.getElementById('kapal-add-mt')?.value);\r\n  const unitPrice = parseFloat(document.getElementById('kapal-add-unitprice')?.value);\r\n  const solarPrice = parseFloat(document.getElementById('kapal-add-solarprice')?.value) || null;\r\n  const startDate = document.getElementById('kapal-add-start')?.value;\r\n  const endDate = document.getElementById('kapal-add-end')?.value;\r\n  const notes = document.getElementById('kapal-add-notes')?.value.trim();\r\n  if (!pemberiKerja) { showToast('Pemberi kerja wajib diisi'); return; }\r\n  if (!totalMt || totalMt <= 0) { showToast('Total MT/M3 wajib diisi'); return; }\r\n  if (!unitPrice || unitPrice <= 0) { showToast('Harga per MT wajib diisi'); return; }\r\n  if (!startDate || !endDate) { showToast('Tanggal wajib diisi'); return; }\r\n  const rows = document.querySelectorAll('#kapal-unit-rows > div[id^=\"kapal-urow-\"]');\r\n  if (rows.length === 0) { showToast('Tambahkan minimal 1 unit'); return; }\r\n  const unitRows = [];\r\n  for (const row of rows) {\r\n    const rowId = row.id.replace('kapal-urow-','');\r\n    const unitId = document.getElementById('ku-unit-' + rowId)?.value;\r\n    const hmAwal = parseFloat(document.getElementById('ku-hmawal-' + rowId)?.value);\r\n    const hmAkhir = parseFloat(document.getElementById('ku-hmakhir-' + rowId)?.value);\r\n    const sAwal = parseInt(document.getElementById('ku-sawal-' + rowId)?.value);\r\n    const sAkhir = parseInt(document.getElementById('ku-sakhir-' + rowId)?.value);\r\n    const sIsi = parseFloat(document.getElementById('ku-sisi-' + rowId)?.value) || 0;\r\n    const gapDiv = document.getElementById('ku-gap-' + rowId);\r\n    const gapVisible = gapDiv && gapDiv.style.display !== 'none';\r\n    const gapReason = gapVisible ? document.getElementById('ku-gap-reason-' + rowId)?.value.trim() : null;\r\n    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }\r\n    if (isNaN(hmAwal) || isNaN(hmAkhir) || hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }\r\n    if (isNaN(sAwal) || isNaN(sAkhir)) { showToast('Solar gauge wajib diisi'); return; }\r\n    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }\r\n    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: hmAkhir, solar_awal_pct: sAwal, solar_akhir_pct: sAkhir, solar_isi_liters: sIsi, hm_gap_reason: gapReason || null });\r\n  }\r\n  const projectCode = formatKapalCode(monthYear, shipNum);\r\n  try {\r\n    const { data: proj, error: pe } = await sb.from('projects').insert({\r\n      project_code: projectCode, type: 'kapal', nama_kapal: namaKapal || null,\r\n      pemberi_kerja: pemberiKerja, kade: kade || null, start_date: startDate,\r\n      end_date: endDate, month_year: monthYear, ship_number_in_month: shipNum,\r\n      cargo_type: cargo || null, total_mt_m3: totalMt, unit_price: unitPrice,\r\n      harga_solar_rpl: solarPrice, notes: notes || null\r\n    }).select().single();\r\n    if (pe) throw pe;\r\n    const unitInserts = unitRows.map(u => ({ ...u, project_id: proj.id }));\r\n    const { error: ue } = await sb.from('project_units').insert(unitInserts);\r\n    if (ue) throw ue;\r\n    closeModal();\r\n    showToast('Proyek ' + projectCode + ' berhasil disimpan!', 'success');\r\n    loadProyekKapal();\r\n  } catch(e) { showToast('Gagal simpan: ' + e.message); }\r\n}\r\n`;\r\n\r\nreplaceExact(\r\n  'function switchProyekTab(tab, el) {',\r\n  kapalModalFunctions + 'function switchProyekTab(tab, el) {',\r\n  'add kapal modal functions'\r\n);\r\n\r\nfs.writeFileSync(filePath, html, 'utf8');\r\nconsole.log('patch_proyek4.js: ' + changes + ' changes applied.');\r\n```

- [ ] **Step 3: Run patch and verify**

```bash
node patch_proyek4.js && node --check index.html
```

- [ ] **Step 4: Browser verify**

Admin → Proyek → Kapal → click "+ Tambah Kapal":
- Modal opens with correct preview code (e.g. M08-001), rate (Rp 175/MT)
- "+ Tambah Unit" adds a unit row with all fields
- Entering HM Awal for a unit that has prior project_units triggers the red gap warning
- Submitting with missing required fields shows toast errors
- Successful save shows toast, modal closes, list refreshes with new project
- Click the new row → detail expands showing per-unit HM/MT/salary/solar breakdown

- [ ] **Step 5: Commit**

```bash
git add index.html patch_proyek4.js
git commit -m "feat: Add Kapal modal with HM continuity gap detection"
```

---

## Task 6: Stockpile Tab

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_proyek5.js`
- Modify: `index.html` (via patch script)

**Interfaces:**
- Consumes: `proyekStockpileData`, `allUnits`, `checkHMContinuity()`, `formatStockpileCode(prefix, seq)`, `calcSolarConsumed()`, `fmtRp()`, `formatDate()`, `showToast()`, `closeModal()`
- Produces: `loadProyekStockpile()`, `renderProyekStockpileList()`, `openAddStockpileModal()`, `addStockpileUnitRow()`, `removeStockpileUnitRow(rowId)`, `onStockpileHMAwalChange(input, rowId)`, `submitAddStockpile()` — consumed by Stockpile tab switch

- [ ] **Step 1: Create patch_proyek5.js**

```js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

const stockpileFunctions = `\r\nasync function loadProyekStockpile() {\r\n  const panel = document.getElementById('proyek-panel-stockpile');\r\n  panel.innerHTML = '<div style="color:#64748B;padding:20px;">Memuat data...</div>';\r\n  try {\r\n    const { data, error } = await sb.from('projects')\r\n      .select('*, project_units(*, units(code,name))')\r\n      .eq('type', 'stockpile')\r\n      .order('created_at', { ascending: false });\r\n    if (error) throw error;\r\n    proyekStockpileData = data || [];\r\n    renderProyekStockpileList();\r\n  } catch(e) { panel.innerHTML = '<div style="color:#EF4444;padding:20px;">Error: ' + e.message + '</div>'; }\r\n}\r\n\r\nfunction renderProyekStockpileList() {\r\n  const panel = document.getElementById('proyek-panel-stockpile');\r\n  let h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';\r\n  h += '<div style="font-size:15px;font-weight:700;color:#1E293B;">Daftar Proyek Stockpile (' + proyekStockpileData.length + ')</div>';\r\n  h += '<button onclick="openAddStockpileModal()" class="btn-primary" style="padding:8px 16px;font-size:13px;">+ Tambah Stockpile</button></div>';\r\n  if (proyekStockpileData.length === 0) {\r\n    h += '<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Belum ada proyek stockpile.</div>';\r\n    panel.innerHTML = h; return;\r\n  }\r\n  h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';\r\n  h += '<thead><tr style="background:#F1F5F9;">';\r\n  ['Kode','Pemberi Kerja','Tanggal','Unit','HM Total','Salary Total'].forEach(col => {\r\n    h += '<th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;white-space:nowrap;">' + col + '</th>';\r\n  });\r\n  h += '<th></th></tr></thead><tbody>';\r\n  proyekStockpileData.forEach(p => {\r\n    const units = p.project_units || [];\r\n    const totalHM = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal), 0);\r\n    const totalSalary = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal) * 35000, 0);\r\n    h += '<tr style="border-bottom:1px solid #F1F5F9;cursor:pointer;" onclick="toggleStockpileDetail(\\'' + p.id + '\\')">';\r\n    h += '<td style="padding:10px 12px;font-weight:700;color:#1D4ED8;">' + p.project_code + '</td>';\r\n    h += '<td style="padding:10px 12px;">' + p.pemberi_kerja + '</td>';\r\n    h += '<td style="padding:10px 12px;white-space:nowrap;">' + formatDate(p.start_date) + ' – ' + formatDate(p.end_date) + '</td>';\r\n    h += '<td style="padding:10px 12px;text-align:center;">' + units.length + '</td>';\r\n    h += '<td style="padding:10px 12px;text-align:right;">' + totalHM.toFixed(1) + '</td>';\r\n    h += '<td style="padding:10px 12px;text-align:right;font-weight:700;color:#16A34A;">' + fmtRp(totalSalary) + '</td>';\r\n    h += '<td style="padding:10px 12px;"><svg style="width:14px;height:14px;" fill="none" stroke="#94A3B8" stroke-width="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg></td></tr>';\r\n    h += '<tr id="stk-detail-' + p.id + '" style="display:none;background:#F8FAFC;"><td colspan="7" style="padding:12px 16px;">';\r\n    h += renderStockpileDetailHTML(p) + '</td></tr>';\r\n  });\r\n  h += '</tbody></table></div>';\r\n  panel.innerHTML = h;\r\n}\r\n\r\nfunction toggleStockpileDetail(id) {\r\n  const row = document.getElementById('stk-detail-' + id);\r\n  if (row) row.style.display = row.style.display === 'none' ? '' : 'none';\r\n}\r\n\r\nfunction renderStockpileDetailHTML(p) {\r\n  const units = p.project_units || [];\r\n  let h = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';\r\n  h += '<tr style="background:#E2E8F0;"><th style="padding:6px 10px;text-align:left;">Unit</th><th style="padding:6px 10px;text-align:right;">HM Awal</th><th style="padding:6px 10px;text-align:right;">HM Akhir</th><th style="padding:6px 10px;text-align:right;">HM Kerja</th><th style="padding:6px 10px;text-align:right;">Salary</th><th style="padding:6px 10px;text-align:right;">Solar (L)</th></tr>';\r\n  units.forEach(u => {\r\n    const hmKerja = u.hm_akhir - u.hm_awal;\r\n    const salary = hmKerja * 35000;\r\n    const solar = calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters);\r\n    h += '<tr style="border-bottom:1px solid #E2E8F0;">';\r\n    h += '<td style="padding:6px 10px;font-weight:700;">' + (u.units ? u.units.code : '?') + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + u.hm_awal + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + u.hm_akhir + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + hmKerja.toFixed(1) + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;font-weight:700;color:#16A34A;">' + fmtRp(salary) + '</td>';\r\n    h += '<td style="padding:6px 10px;text-align:right;">' + solar.toFixed(1) + ' L</td></tr>';\r\n  });\r\n  h += '</table>';\r\n  return h;\r\n}\r\n\r\nfunction openAddStockpileModal() {\r\n  const today = todayISO();\r\n  const unitOptions = allUnits.map(u => '<option value="' + u.id + '">' + u.code + '</option>').join('');\r\n  const modalHTML = '<div style="padding:24px;max-width:640px;width:100%;max-height:80vh;overflow-y:auto;">'\r\n    + '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:16px;">Tambah Proyek Stockpile</div>'\r\n    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Pemberi Kerja *</label><input type="text" id="stk-add-pemberi" class="finput" placeholder="KCN"></div>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Prefix Kode *</label><input type="text" id="stk-add-prefix" class="finput" placeholder="KCN" maxlength="6" oninput="this.value=this.value.toUpperCase()"></div>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nomor Urut *</label><input type="number" id="stk-add-seq" class="finput" placeholder="1" min="1" step="1"></div>'\r\n    + '</div>'\r\n    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tgl Mulai *</label><input type="date" id="stk-add-start" class="finput" value="' + today + '"></div>'\r\n    + '<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Tgl Selesai *</label><input type="date" id="stk-add-end" class="finput" value="' + today + '"></div>'\r\n    + '</div>'\r\n    + '<div style="font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;">Unit yang Mengerjakan</div>'\r\n    + '<div id="stk-unit-rows" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>'\r\n    + '<button onclick="addStockpileUnitRow()" style="background:#EFF6FF;border:1.5px dashed #93C5FD;color:#1D4ED8;font-size:13px;font-weight:700;padding:8px 16px;border-radius:8px;cursor:pointer;width:100%;margin-bottom:16px;">+ Tambah Unit</button>'\r\n    + '<div style="display:flex;gap:12px;">'\r\n    + '<button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>'\r\n    + '<button onclick="submitAddStockpile()" class="btn-primary" style="flex:2;">Simpan Proyek</button>'\r\n    + '</div></div>';\r\n  document.getElementById('modal-box').innerHTML = modalHTML;\r\n  document.getElementById('modal-overlay').style.display = 'flex';\r\n  addStockpileUnitRow();\r\n}\r\n\r\nlet _stkUnitRowId = 0;\r\nfunction addStockpileUnitRow() {\r\n  const rowId = ++_stkUnitRowId;\r\n  const unitOptions = allUnits.map(u => '<option value="' + u.id + '">' + u.code + '</option>').join('');\r\n  const container = document.getElementById('stk-unit-rows');\r\n  const div = document.createElement('div');\r\n  div.id = 'stk-urow-' + rowId;\r\n  div.style.cssText = 'background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;';\r\n  div.innerHTML = '<div style="display:grid;grid-template-columns:1fr 80px 80px 60px 60px 80px 24px;gap:8px;align-items:end;">'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Unit</label><select class="finput" id="su-unit-' + rowId + '" style="font-size:12px;padding:6px 8px;"><option value="">Pilih</option>' + unitOptions + '</select></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">HM Awal</label><input type="number" id="su-hmawal-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="0" onblur="onStockpileHMAwalChange(this,' + rowId + ')"></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">HM Akhir</label><input type="number" id="su-hmakhir-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="0"></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Awal%</label><input type="number" id="su-sawal-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="80" min="0" max="100"></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Akhir%</label><input type="number" id="su-sakhir-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="20" min="0" max="100"></div>'\r\n    + '<div><label style="font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:3px;">Solar Isi(L)</label><input type="number" id="su-sisi-' + rowId + '" class="finput" style="font-size:12px;padding:6px 8px;" placeholder="0" min="0"></div>'\r\n    + '<div style="padding-bottom:2px;"><button onclick="removeStockpileUnitRow(' + rowId + ')" style="background:none;border:none;cursor:pointer;color:#EF4444;font-size:18px;line-height:1;">×</button></div>'\r\n    + '</div>'\r\n    + '<div id="su-gap-' + rowId + '" style="display:none;margin-top:8px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:8px 12px;font-size:12px;color:#DC2626;">'\r\n    + '<strong>GAP HM terdeteksi!</strong> <span id="su-gap-msg-' + rowId + '"></span>'\r\n    + '<div style="margin-top:6px;"><label style="font-size:11px;font-weight:600;">Alasan gap (wajib): </label><input type="text" id="su-gap-reason-' + rowId + '" class="finput" style="font-size:12px;padding:5px 8px;margin-top:4px;" placeholder="Contoh: unit diparkir"></div>'\r\n    + '</div>';\r\n  container.appendChild(div);\r\n}\r\n\r\nfunction removeStockpileUnitRow(rowId) {\r\n  const el = document.getElementById('stk-urow-' + rowId);\r\n  if (el) el.remove();\r\n}\r\n\r\nasync function onStockpileHMAwalChange(input, rowId) {\r\n  const unitId = document.getElementById('su-unit-' + rowId)?.value;\r\n  const hmAwal = parseFloat(input.value);\r\n  const gapDiv = document.getElementById('su-gap-' + rowId);\r\n  if (!unitId || !hmAwal || !gapDiv) return;\r\n  const result = await checkHMContinuity(unitId, hmAwal);\r\n  if (result.hasGap) {\r\n    document.getElementById('su-gap-msg-' + rowId).textContent =\r\n      'HM ' + result.prevHmAkhir + ' → ' + hmAwal + ' (gap ' + result.gapSize.toFixed(1) + ' HM tidak terbilang).';\r\n    gapDiv.style.display = '';\r\n  } else {\r\n    gapDiv.style.display = 'none';\r\n  }\r\n}\r\n\r\nasync function submitAddStockpile() {\r\n  const pemberiKerja = document.getElementById('stk-add-pemberi')?.value.trim();\r\n  const prefix = document.getElementById('stk-add-prefix')?.value.trim().toUpperCase();\r\n  const seq = parseInt(document.getElementById('stk-add-seq')?.value);\r\n  const startDate = document.getElementById('stk-add-start')?.value;\r\n  const endDate = document.getElementById('stk-add-end')?.value;\r\n  if (!pemberiKerja) { showToast('Pemberi kerja wajib diisi'); return; }\r\n  if (!prefix || !seq || seq < 1) { showToast('Prefix dan nomor urut wajib diisi'); return; }\r\n  if (!startDate || !endDate) { showToast('Tanggal wajib diisi'); return; }\r\n  const projectCode = formatStockpileCode(prefix, seq);\r\n  const monthYear = startDate.slice(0,7);\r\n  const rows = document.querySelectorAll('#stk-unit-rows > div[id^=\"stk-urow-\"]');\r\n  if (rows.length === 0) { showToast('Tambahkan minimal 1 unit'); return; }\r\n  const unitRows = [];\r\n  for (const row of rows) {\r\n    const rowId = row.id.replace('stk-urow-','');\r\n    const unitId = document.getElementById('su-unit-' + rowId)?.value;\r\n    const hmAwal = parseFloat(document.getElementById('su-hmawal-' + rowId)?.value);\r\n    const hmAkhir = parseFloat(document.getElementById('su-hmakhir-' + rowId)?.value);\r\n    const sAwal = parseInt(document.getElementById('su-sawal-' + rowId)?.value);\r\n    const sAkhir = parseInt(document.getElementById('su-sakhir-' + rowId)?.value);\r\n    const sIsi = parseFloat(document.getElementById('su-sisi-' + rowId)?.value) || 0;\r\n    const gapDiv = document.getElementById('su-gap-' + rowId);\r\n    const gapVisible = gapDiv && gapDiv.style.display !== 'none';\r\n    const gapReason = gapVisible ? document.getElementById('su-gap-reason-' + rowId)?.value.trim() : null;\r\n    if (!unitId) { showToast('Pilih unit untuk semua baris'); return; }\r\n    if (isNaN(hmAwal) || isNaN(hmAkhir) || hmAkhir <= hmAwal) { showToast('HM Akhir harus lebih besar dari HM Awal'); return; }\r\n    if (isNaN(sAwal) || isNaN(sAkhir)) { showToast('Solar gauge wajib diisi'); return; }\r\n    if (gapVisible && !gapReason) { showToast('Alasan gap HM wajib diisi'); return; }\r\n    unitRows.push({ unit_id: unitId, hm_awal: hmAwal, hm_akhir: hmAkhir, solar_awal_pct: sAwal, solar_akhir_pct: sAkhir, solar_isi_liters: sIsi, hm_gap_reason: gapReason || null });\r\n  }\r\n  try {\r\n    const { data: proj, error: pe } = await sb.from('projects').insert({\r\n      project_code: projectCode, type: 'stockpile',\r\n      pemberi_kerja: pemberiKerja, start_date: startDate, end_date: endDate,\r\n      month_year: monthYear, code_prefix: prefix, code_seq: seq\r\n    }).select().single();\r\n    if (pe) throw pe;\r\n    const { error: ue } = await sb.from('project_units').insert(unitRows.map(u => ({ ...u, project_id: proj.id })));\r\n    if (ue) throw ue;\r\n    closeModal();\r\n    showToast('Proyek ' + projectCode + ' berhasil disimpan!', 'success');\r\n    loadProyekStockpile();\r\n  } catch(e) { showToast('Gagal simpan: ' + e.message); }\r\n}\r\n`;\r\n\r\nreplaceExact(\r\n  'function switchProyekTab(tab, el) {',\r\n  stockpileFunctions + 'function switchProyekTab(tab, el) {',\r\n  'add stockpile functions'\r\n);\r\n\r\nfs.writeFileSync(filePath, html, 'utf8');\r\nconsole.log('patch_proyek5.js: ' + changes + ' changes applied.');\r\n```

- [ ] **Step 2: Run patch and verify**

```bash
node patch_proyek5.js && node --check index.html
```

- [ ] **Step 3: Browser verify**

Admin → Proyek → Stockpile tab:
- "+ Tambah Stockpile" opens modal with prefix + seq fields generating code preview
- Unit rows work with gap detection
- Save creates project and refreshes list with HM/salary totals shown

- [ ] **Step 4: Commit**

```bash
git add index.html patch_proyek5.js
git commit -m "feat: Stockpile tab with list view and add modal"
```

---

## Task 7: Ringkasan + Excel Export

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_proyek6.js`
- Modify: `index.html` (via patch script)

**Interfaces:**
- Consumes: `proyekMonthFilter`, `calcKapalRate()`, `calcKapalTonnageSplit()`, `calcSolarConsumed()`, `fmtRp()`, `allProfiles` (global array of profiles), `XLSX` (SheetJS global from CDN)
- Produces: `loadProyekRingkasan()`, `renderProyekRingkasan(data)`, `exportProyekExcel()` — consumed by Ringkasan tab

- [ ] **Step 1: Create patch_proyek6.js**

```js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

const ringkasanFunctions = `\r\nasync function loadProyekRingkasan() {\r\n  const panel = document.getElementById('proyek-panel-ringkasan');\r\n  panel.innerHTML = '<div style="color:#64748B;padding:20px;">Memuat...</div>';\r\n  try {\r\n    const { data, error } = await sb.from('projects')\r\n      .select('*, project_units(*, units(code, name, operator_name))')\r\n      .eq('month_year', proyekMonthFilter);\r\n    if (error) throw error;\r\n    renderProyekRingkasan(data || []);\r\n  } catch(e) { panel.innerHTML = '<div style="color:#EF4444;padding:20px;">Error: ' + e.message + '</div>'; }\r\n}\r\n\r\nfunction renderProyekRingkasan(projects) {\r\n  const panel = document.getElementById('proyek-panel-ringkasan');\r\n  const operatorMap = {};\r\n  projects.forEach(p => {\r\n    const units = p.project_units || [];\r\n    if (p.type === 'kapal') {\r\n      const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n      const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);\r\n      split.forEach(u => {\r\n        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;\r\n        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0 };\r\n        operatorMap[key].kapal += u.allocatedMt * rate;\r\n      });\r\n    } else {\r\n      units.forEach(u => {\r\n        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;\r\n        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0 };\r\n        operatorMap[key].stockpile += (u.hm_akhir - u.hm_awal) * 35000;\r\n      });\r\n    }\r\n  });\r\n  let h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">';\r\n  h += '<div style="font-size:15px;font-weight:700;color:#1E293B;">Ringkasan Gaji</div>';\r\n  h += '<div style="display:flex;gap:8px;align-items:center;">';\r\n  h += '<input type="month" class="finput" style="padding:6px 10px;font-size:13px;" value="' + proyekMonthFilter + '" onchange="proyekMonthFilter=this.value;loadProyekRingkasan();">';\r\n  h += '<button onclick="exportProyekExcel()" class="btn-primary" style="padding:8px 14px;font-size:13px;">Export Excel</button>';\r\n  h += '</div></div>';\r\n  if (Object.keys(operatorMap).length === 0) {\r\n    h += '<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Tidak ada data untuk bulan ini.</div>';\r\n    panel.innerHTML = h; return;\r\n  }\r\n  h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';\r\n  h += '<thead><tr style="background:#F1F5F9;"><th style="padding:10px 12px;text-align:left;font-weight:700;color:#475569;">Operator/Unit</th><th style="padding:10px 12px;text-align:right;font-weight:700;color:#475569;">Gaji Kapal</th><th style="padding:10px 12px;text-align:right;font-weight:700;color:#475569;">Gaji Stockpile</th><th style="padding:10px 12px;text-align:right;font-weight:700;color:#475569;">Total Kerja</th><th style="padding:10px 12px;text-align:right;font-weight:700;color:#475569;">Gaji Pokok</th><th style="padding:10px 12px;text-align:right;font-weight:700;color:#475569;">Grand Total</th></tr></thead><tbody>';\r\n  let grandK = 0, grandS = 0;\r\n  Object.entries(operatorMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name, sal]) => {\r\n    const totalKerja = sal.kapal + sal.stockpile;\r\n    const grandTotal = totalKerja + 3100000;\r\n    grandK += sal.kapal; grandS += sal.stockpile;\r\n    h += '<tr style="border-bottom:1px solid #F1F5F9;">';\r\n    h += '<td style="padding:10px 12px;font-weight:600;">' + name + '</td>';\r\n    h += '<td style="padding:10px 12px;text-align:right;">' + fmtRp(sal.kapal) + '</td>';\r\n    h += '<td style="padding:10px 12px;text-align:right;">' + fmtRp(sal.stockpile) + '</td>';\r\n    h += '<td style="padding:10px 12px;text-align:right;font-weight:700;">' + fmtRp(totalKerja) + '</td>';\r\n    h += '<td style="padding:10px 12px;text-align:right;color:#64748B;">Rp 3.100.000</td>';\r\n    h += '<td style="padding:10px 12px;text-align:right;font-weight:800;color:#16A34A;">' + fmtRp(grandTotal + 3100000 - 3100000) + '</td></tr>';\r\n  });\r\n  const allTotal = grandK + grandS;\r\n  h += '<tr style="background:#F1F5F9;font-weight:800;"><td style="padding:10px 12px;">TOTAL</td><td style="padding:10px 12px;text-align:right;">' + fmtRp(grandK) + '</td><td style="padding:10px 12px;text-align:right;">' + fmtRp(grandS) + '</td><td style="padding:10px 12px;text-align:right;">' + fmtRp(allTotal) + '</td><td style="padding:10px 12px;"></td><td style="padding:10px 12px;text-align:right;">' + fmtRp(allTotal + 3100000 * Object.keys(operatorMap).length) + '</td></tr>';\r\n  h += '</tbody></table></div>';\r\n  panel.innerHTML = h;\r\n  panel._ringkasanProjects = projects;\r\n}\r\n\r\nasync function exportProyekExcel() {\r\n  if (typeof XLSX === 'undefined') { showToast('SheetJS tidak tersedia'); return; }\r\n  const panel = document.getElementById('proyek-panel-ringkasan');\r\n  const projects = panel._ringkasanProjects;\r\n  if (!projects || projects.length === 0) { showToast('Tidak ada data untuk diexport'); return; }\r\n  const wb = XLSX.utils.book_new();\r\n  // Sheet 1 - Kapal\r\n  const kapalRows = [['Kode','Nama Kapal','Pemberi Kerja','Kade','Kapal#','Tgl Mulai','Tgl Selesai','Kargo','Total MT/M3','Harga/MT','Unit','HM Awal','HM Akhir','HM Kerja','MT Alokasi','Rate (Rp/MT)','Salary','Solar (L)']];\r\n  projects.filter(p => p.type === 'kapal').forEach(p => {\r\n    const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n    const split = calcKapalTonnageSplit(p.project_units || [], p.total_mt_m3 || 0);\r\n    split.forEach(u => {\r\n      const hmK = u.hm_akhir - u.hm_awal;\r\n      kapalRows.push([p.project_code, p.nama_kapal||'', p.pemberi_kerja, p.kade||'', p.ship_number_in_month, p.start_date, p.end_date, p.cargo_type||'', p.total_mt_m3, p.unit_price, u.units?u.units.code:'?', u.hm_awal, u.hm_akhir, hmK, +u.allocatedMt.toFixed(2), rate, Math.round(u.allocatedMt*rate), +calcSolarConsumed(u.solar_awal_pct,u.solar_akhir_pct,u.solar_isi_liters).toFixed(1)]);\r\n    });\r\n  });\r\n  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kapalRows), 'Kapal');\r\n  // Sheet 2 - Stockpile\r\n  const stkRows = [['Kode','Pemberi Kerja','Tgl Mulai','Tgl Selesai','Unit','HM Awal','HM Akhir','HM Kerja','Salary','Solar (L)']];\r\n  projects.filter(p => p.type === 'stockpile').forEach(p => {\r\n    (p.project_units || []).forEach(u => {\r\n      const hmK = u.hm_akhir - u.hm_awal;\r\n      stkRows.push([p.project_code, p.pemberi_kerja, p.start_date, p.end_date, u.units?u.units.code:'?', u.hm_awal, u.hm_akhir, hmK, Math.round(hmK*35000), +calcSolarConsumed(u.solar_awal_pct,u.solar_akhir_pct,u.solar_isi_liters).toFixed(1)]);\r\n    });\r\n  });\r\n  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stkRows), 'Stockpile');\r\n  // Sheet 3 - Salary Summary\r\n  const salRows = [['Operator/Unit','Gaji Kapal','Gaji Stockpile','Total Kerja','Gaji Pokok','Grand Total']];\r\n  const opMap = {};\r\n  projects.forEach(p => {\r\n    const units = p.project_units || [];\r\n    if (p.type === 'kapal') {\r\n      const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n      calcKapalTonnageSplit(units, p.total_mt_m3||0).forEach(u => {\r\n        const k = u.units?(u.units.operator_name||u.units.code):u.unit_id;\r\n        if (!opMap[k]) opMap[k] = { k:0, s:0 };\r\n        opMap[k].k += u.allocatedMt * rate;\r\n      });\r\n    } else {\r\n      units.forEach(u => {\r\n        const k = u.units?(u.units.operator_name||u.units.code):u.unit_id;\r\n        if (!opMap[k]) opMap[k] = { k:0, s:0 };\r\n        opMap[k].s += (u.hm_akhir - u.hm_awal) * 35000;\r\n      });\r\n    }\r\n  });\r\n  Object.entries(opMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name,sal]) => {\r\n    const totalKerja = sal.k + sal.s;\r\n    salRows.push([name, Math.round(sal.k), Math.round(sal.s), Math.round(totalKerja), 3100000, Math.round(totalKerja + 3100000)]);\r\n  });\r\n  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salRows), 'Ringkasan Gaji');\r\n  XLSX.writeFile(wb, 'Proyek_' + proyekMonthFilter.replace('-','') + '.xlsx');\r\n  showToast('Export berhasil!', 'success');\r\n}\r\n`;\r\n\r\nreplaceExact(\r\n  'function switchProyekTab(tab, el) {',\r\n  ringkasanFunctions + 'function switchProyekTab(tab, el) {',\r\n  'add ringkasan + excel export functions'\r\n);\r\n\r\nfs.writeFileSync(filePath, html, 'utf8');\r\nconsole.log('patch_proyek6.js: ' + changes + ' changes applied.');\r\n```

- [ ] **Step 2: Run patch and verify**

```bash
node patch_proyek6.js && node --check index.html
```

- [ ] **Step 3: Browser verify**

Admin → Proyek → Ringkasan:
- Month picker defaults to current month
- After adding sample Kapal + Stockpile projects, salary table shows operator rows with correct totals
- Export Excel downloads `Proyek_202608.xlsx` with 3 sheets

- [ ] **Step 4: Commit**

```bash
git add index.html patch_proyek6.js
git commit -m "feat: Ringkasan salary summary + SheetJS Excel export (3 sheets)"
```

---

## Task 8: Analisis Biaya

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_proyek7.js`
- Modify: `index.html` (via patch script)

**Interfaces:**
- Consumes: `proyekMonthFilter`, `proyekAnalisisFilter`, `calcKapalRate()`, `calcKapalTonnageSplit()`, `calcSolarConsumed()`, `fmtRp()`, Supabase `projects` UPDATE for `invoice_number`
- Produces: `loadProyekAnalisis()`, `renderProyekAnalisis(data)`, `setProyekAnalisisFilter(f)`, `openAddInvoice(projectId)`, `submitInvoiceNumber(projectId)` — consumed by Analisis Biaya tab

- [ ] **Step 1: Create patch_proyek7.js**

```js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

const analisisFunctions = `\r\nasync function loadProyekAnalisis() {\r\n  const panel = document.getElementById('proyek-panel-analisis');\r\n  panel.innerHTML = '<div style="color:#64748B;padding:20px;">Memuat...</div>';\r\n  try {\r\n    const { data, error } = await sb.from('projects')\r\n      .select('*, project_units(*, units(code,name))')\r\n      .eq('type', 'kapal')\r\n      .eq('month_year', proyekMonthFilter);\r\n    if (error) throw error;\r\n    renderProyekAnalisis(data || []);\r\n  } catch(e) { panel.innerHTML = '<div style="color:#EF4444;padding:20px;">Error: ' + e.message + '</div>'; }\r\n}\r\n\r\nfunction renderProyekAnalisis(projects) {\r\n  const panel = document.getElementById('proyek-panel-analisis');\r\n  panel._analisisProjects = projects;\r\n  let filtered = projects;\r\n  if (proyekAnalisisFilter === 'open') filtered = projects.filter(p => !p.invoice_number);\r\n  if (proyekAnalisisFilter === 'closed') filtered = projects.filter(p => p.invoice_number);\r\n  let h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">';\r\n  h += '<div style="font-size:15px;font-weight:700;color:#1E293B;">Analisis Biaya Kapal</div>';\r\n  h += '<input type="month" class="finput" style="padding:6px 10px;font-size:13px;" value="' + proyekMonthFilter + '" onchange="proyekMonthFilter=this.value;loadProyekAnalisis();">';\r\n  h += '</div>';\r\n  const pills = ['semua','open','closed'];\r\n  const pillLabels = { semua:'Semua', open:'Open', closed:'Closed' };\r\n  h += '<div style="display:flex;gap:8px;margin-bottom:16px;">';\r\n  pills.forEach(f => {\r\n    const active = proyekAnalisisFilter === f;\r\n    h += '<button onclick="setProyekAnalisisFilter(\\'' + f + '\\')" style="padding:6px 14px;border-radius:99px;border:none;cursor:pointer;font-size:13px;font-weight:700;background:' + (active ? '#1D4ED8' : '#F1F5F9') + ';color:' + (active ? '#fff' : '#64748B') + ';">' + pillLabels[f] + '</button>';\r\n  });\r\n  h += '</div>';\r\n  if (filtered.length === 0) {\r\n    h += '<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Tidak ada data.</div>';\r\n    panel.innerHTML = h; return;\r\n  }\r\n  h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">';\r\n  h += '<thead><tr style="background:#F1F5F9;">';\r\n  ['Invoice#','Kode','Nama Kapal','Pemberi Kerja','Kade','HM Total','Income','Biaya Solar','Biaya Tenaga','Profit','Yield/HM','Status',''].forEach(col => {\r\n    h += '<th style="padding:8px 10px;text-align:' + (['Income','Biaya Solar','Biaya Tenaga','Profit','Yield/HM','HM Total'].includes(col) ? 'right' : 'left') + ';font-weight:700;color:#475569;white-space:nowrap;">' + col + '</th>';\r\n  });\r\n  h += '</tr></thead><tbody>';\r\n  let sumIncome = 0, sumFuel = 0, sumLabor = 0, sumProfit = 0, sumHM = 0;\r\n  filtered.forEach(p => {\r\n    const units = p.project_units || [];\r\n    const totalHM = units.reduce((s, u) => s + (u.hm_akhir - u.hm_awal), 0);\r\n    const rate = calcKapalRate(p.ship_number_in_month || 1);\r\n    const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);\r\n    const income = (p.total_mt_m3 || 0) * (p.unit_price || 0);\r\n    const fuelCost = units.reduce((s, u) => s + calcSolarConsumed(u.solar_awal_pct, u.solar_akhir_pct, u.solar_isi_liters), 0) * (p.harga_solar_rpl || 0);\r\n    const laborCost = split.reduce((s, u) => s + u.allocatedMt * rate, 0);\r\n    const profit = income - fuelCost - laborCost;\r\n    const yieldPerHM = totalHM > 0 ? profit / totalHM : 0;\r\n    const isClosed = !!p.invoice_number;\r\n    sumIncome += income; sumFuel += fuelCost; sumLabor += laborCost; sumProfit += profit; sumHM += totalHM;\r\n    h += '<tr style="border-bottom:1px solid #F1F5F9;">';\r\n    h += '<td style="padding:8px 10px;font-size:11px;color:#64748B;">' + (p.invoice_number || '—') + '</td>';\r\n    h += '<td style="padding:8px 10px;font-weight:700;color:#1D4ED8;">' + p.project_code + '</td>';\r\n    h += '<td style="padding:8px 10px;">' + (p.nama_kapal || '—') + '</td>';\r\n    h += '<td style="padding:8px 10px;">' + p.pemberi_kerja + '</td>';\r\n    h += '<td style="padding:8px 10px;">' + (p.kade || '—') + '</td>';\r\n    h += '<td style="padding:8px 10px;text-align:right;">' + totalHM.toFixed(1) + '</td>';\r\n    h += '<td style="padding:8px 10px;text-align:right;">' + fmtRp(income) + '</td>';\r\n    h += '<td style="padding:8px 10px;text-align:right;color:#EF4444;">' + fmtRp(fuelCost) + '</td>';\r\n    h += '<td style="padding:8px 10px;text-align:right;color:#F59E0B;">' + fmtRp(laborCost) + '</td>';\r\n    h += '<td style="padding:8px 10px;text-align:right;font-weight:700;color:' + (profit >= 0 ? '#16A34A' : '#EF4444') + ';">' + fmtRp(profit) + '</td>';\r\n    h += '<td style="padding:8px 10px;text-align:right;">' + fmtRp(yieldPerHM) + '/HM</td>';\r\n    h += '<td style="padding:8px 10px;"><span style="background:' + (isClosed ? '#DCFCE7' : '#FEF9C3') + ';color:' + (isClosed ? '#16A34A' : '#CA8A04') + ';font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;">' + (isClosed ? 'CLOSED' : 'OPEN') + '</span></td>';\r\n    h += '<td style="padding:8px 10px;">' + (isClosed ? '' : '<button onclick=\"openAddInvoice(\\'' + p.id + '\\')\" style=\"background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;\">Add Invoice</button>') + '</td>';\r\n    h += '</tr>';\r\n    if (!isClosed) {\r\n      h += '<tr id="inv-input-' + p.id + '" style="display:none;background:#FFFBEB;"><td colspan="13" style="padding:8px 16px;">';\r\n      h += '<div style="display:flex;gap:8px;align-items:center;"><input type="text" id="inv-num-' + p.id + '" class="finput" style="max-width:260px;padding:6px 10px;font-size:13px;" placeholder="Nomor Invoice (contoh: INV-2026-08-001)"><button onclick="submitInvoiceNumber(\\'' + p.id + '\\')" class="btn-primary" style="padding:6px 14px;font-size:13px;">Simpan</button><button onclick="document.getElementById(\\\'inv-input-' + p.id + '\\\').style.display=\\\'none\\\';" class="btn-secondary" style="padding:6px 12px;font-size:13px;">Batal</button></div>';\r\n      h += '</td></tr>';\r\n    }\r\n  });\r\n  h += '<tr style="background:#F1F5F9;font-weight:800;"><td colspan="5" style="padding:8px 10px;">TOTAL</td><td style="padding:8px 10px;text-align:right;">' + sumHM.toFixed(1) + '</td><td style="padding:8px 10px;text-align:right;">' + fmtRp(sumIncome) + '</td><td style="padding:8px 10px;text-align:right;color:#EF4444;">' + fmtRp(sumFuel) + '</td><td style="padding:8px 10px;text-align:right;color:#F59E0B;">' + fmtRp(sumLabor) + '</td><td style="padding:8px 10px;text-align:right;color:' + (sumProfit >= 0 ? '#16A34A' : '#EF4444') + ';">' + fmtRp(sumProfit) + '</td><td style="padding:8px 10px;text-align:right;">' + fmtRp(sumHM > 0 ? sumProfit/sumHM : 0) + '/HM</td><td colspan="2"></td></tr>';\r\n  h += '</tbody></table></div>';\r\n  panel.innerHTML = h;\r\n}\r\n\r\nfunction setProyekAnalisisFilter(f) {\r\n  proyekAnalisisFilter = f;\r\n  const panel = document.getElementById('proyek-panel-analisis');\r\n  if (panel._analisisProjects) renderProyekAnalisis(panel._analisisProjects);\r\n}\r\n\r\nfunction openAddInvoice(projectId) {\r\n  const rows = document.querySelectorAll('[id^=\"inv-input-\"]');\r\n  rows.forEach(r => r.style.display = 'none');\r\n  const row = document.getElementById('inv-input-' + projectId);\r\n  if (row) row.style.display = '';\r\n}\r\n\r\nasync function submitInvoiceNumber(projectId) {\r\n  const invNum = document.getElementById('inv-num-' + projectId)?.value.trim();\r\n  if (!invNum) { showToast('Nomor invoice wajib diisi'); return; }\r\n  try {\r\n    const { error } = await sb.from('projects').update({ invoice_number: invNum }).eq('id', projectId);\r\n    if (error) throw error;\r\n    showToast('Invoice ' + invNum + ' disimpan!', 'success');\r\n    loadProyekAnalisis();\r\n  } catch(e) { showToast('Gagal simpan: ' + e.message); }\r\n}\r\n`;\r\n\r\nreplaceExact(\r\n  'function switchProyekTab(tab, el) {',\r\n  analisisFunctions + 'function switchProyekTab(tab, el) {',\r\n  'add analisis biaya functions'\r\n);\r\n\r\nfs.writeFileSync(filePath, html, 'utf8');\r\nconsole.log('patch_proyek7.js: ' + changes + ' changes applied.');\r\n```

- [ ] **Step 2: Run patch and verify**

```bash
node patch_proyek7.js && node --check index.html
```

- [ ] **Step 3: Browser verify**

Admin → Proyek → Analisis Biaya:
- Month picker + Semua/Open/Closed filter pills work
- Each Kapal project row shows Income, Fuel Cost, Labor Cost, Profit, Yield/HM
- OPEN rows show "Add Invoice" button → inline input row appears → enter invoice number → row turns CLOSED (green badge)
- Summary row shows totals

- [ ] **Step 4: Commit**

```bash
git add index.html patch_proyek7.js
git commit -m "feat: Analisis Biaya with P&L, Yield/HM, and invoice OPEN/CLOSED tracking"
```

---

## Task 9: Kontinuitas HM

**Files:**
- Create: `C:\Users\upsca\Documents\SERVIS-SAA\patch_proyek8.js`
- Modify: `index.html` (via patch script)

**Interfaces:**
- Consumes: `proyekHMUnitId`, `allUnits`, `formatDate()`, `fmtRp()`, Supabase `project_units` + `projects` tables
- Produces: `loadProyekKontinuitas()`, `renderProyekKontinuitas()` — consumed by Kontinuitas HM tab

- [ ] **Step 1: Create patch_proyek8.js**

```js
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

const kontinuitasFunctions = `\r\nfunction renderProyekKontinuitas() {\r\n  const panel = document.getElementById('proyek-panel-kontinuitas');\r\n  const unitOptions = allUnits.map(u => '<option value="' + u.id + '"' + (u.id === proyekHMUnitId ? ' selected' : '') + '>' + u.code + ' – ' + u.name + '</option>').join('');\r\n  let h = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">';\r\n  h += '<div style="font-size:15px;font-weight:700;color:#1E293B;">Kontinuitas HM per Unit</div>';\r\n  h += '<select class="finput" style="max-width:200px;padding:6px 10px;font-size:13px;" onchange="proyekHMUnitId=this.value;loadProyekKontinuitas();"><option value="">-- Pilih Unit --</option>' + unitOptions + '</select>';\r\n  h += '</div>';\r\n  if (!proyekHMUnitId) {\r\n    h += '<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Pilih unit untuk melihat log HM.</div>';\r\n    panel.innerHTML = h; return;\r\n  }\r\n  h += '<div id="kontinuitas-table-wrap"><div style="color:#64748B;">Memuat...</div></div>';\r\n  panel.innerHTML = h;\r\n  loadProyekKontinuitas();\r\n}\r\n\r\nasync function loadProyekKontinuitas() {\r\n  const wrap = document.getElementById('kontinuitas-table-wrap');\r\n  if (!wrap || !proyekHMUnitId) return;\r\n  try {\r\n    const { data, error } = await sb.from('project_units')\r\n      .select('*, projects(project_code, type, start_date, end_date, pemberi_kerja)')\r\n      .eq('unit_id', proyekHMUnitId)\r\n      .order('hm_awal', { ascending: true });\r\n    if (error) throw error;\r\n    const rows = data || [];\r\n    if (rows.length === 0) {\r\n      wrap.innerHTML = '<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Belum ada data proyek untuk unit ini.</div>';\r\n      return;\r\n    }\r\n    let billedHM = 0, gapHM = 0;\r\n    let tableHTML = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">';\r\n    tableHTML += '<thead><tr style="background:#F1F5F9;"><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Tipe</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Proyek</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Awal</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Akhir</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Durasi</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Tanggal</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Pemberi Kerja</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Keterangan</th></tr></thead><tbody>';\r\n    rows.forEach((row, i) => {\r\n      const p = row.projects;\r\n      const hmDur = row.hm_akhir - row.hm_awal;\r\n      billedHM += hmDur;\r\n      if (i > 0) {\r\n        const prev = rows[i - 1];\r\n        const gap = row.hm_awal - prev.hm_akhir;\r\n        if (gap > 0) {\r\n          gapHM += gap;\r\n          tableHTML += '<tr style="background:#FEF2F2;">';\r\n          tableHTML += '<td style="padding:8px 10px;font-weight:800;color:#DC2626;">GAP</td>';\r\n          tableHTML += '<td style="padding:8px 10px;color:#DC2626;">—</td>';\r\n          tableHTML += '<td style="padding:8px 10px;text-align:right;color:#DC2626;">' + prev.hm_akhir + '</td>';\r\n          tableHTML += '<td style="padding:8px 10px;text-align:right;color:#DC2626;">' + row.hm_awal + '</td>';\r\n          tableHTML += '<td style="padding:8px 10px;text-align:right;font-weight:700;color:#DC2626;">' + gap.toFixed(1) + ' HM</td>';\r\n          tableHTML += '<td colspan="2" style="padding:8px 10px;"></td>';\r\n          tableHTML += '<td style="padding:8px 10px;font-size:11px;color:#DC2626;">' + (row.hm_gap_reason || 'Alasan tidak dicatat') + '</td>';\r\n          tableHTML += '</tr>';\r\n        }\r\n      }\r\n      tableHTML += '<tr style="border-bottom:1px solid #F1F5F9;background:#F0FDF4;">';\r\n      tableHTML += '<td style="padding:8px 10px;font-weight:700;color:#16A34A;">' + (p ? p.type.toUpperCase() : '?') + '</td>';\r\n      tableHTML += '<td style="padding:8px 10px;font-weight:700;color:#1D4ED8;">' + (p ? p.project_code : '?') + '</td>';\r\n      tableHTML += '<td style="padding:8px 10px;text-align:right;">' + row.hm_awal + '</td>';\r\n      tableHTML += '<td style="padding:8px 10px;text-align:right;">' + row.hm_akhir + '</td>';\r\n      tableHTML += '<td style="padding:8px 10px;text-align:right;font-weight:700;">' + hmDur.toFixed(1) + ' HM</td>';\r\n      tableHTML += '<td style="padding:8px 10px;white-space:nowrap;">' + (p ? formatDate(p.start_date) + ' – ' + formatDate(p.end_date) : '—') + '</td>';\r\n      tableHTML += '<td style="padding:8px 10px;">' + (p ? p.pemberi_kerja : '—') + '</td>';\r\n      tableHTML += '<td style="padding:8px 10px;font-size:11px;color:#64748B;"></td>';\r\n      tableHTML += '</tr>';\r\n    });\r\n    tableHTML += '</tbody></table></div>';\r\n    tableHTML += '<div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;">';\r\n    tableHTML += '<div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:10px 16px;"><div style="font-size:12px;color:#16A34A;font-weight:700;">Total HM Terbilang</div><div style="font-size:20px;font-weight:800;color:#15803D;">' + billedHM.toFixed(1) + ' HM</div></div>';\r\n    tableHTML += '<div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:10px 16px;"><div style="font-size:12px;color:#DC2626;font-weight:700;">Total HM Gap</div><div style="font-size:20px;font-weight:800;color:#B91C1C;">' + gapHM.toFixed(1) + ' HM</div></div>';\r\n    tableHTML += '</div>';\r\n    wrap.innerHTML = tableHTML;\r\n  } catch(e) { wrap.innerHTML = '<div style="color:#EF4444;padding:20px;">Error: ' + e.message + '</div>'; }\r\n}\r\n`;\r\n\r\nreplaceExact(\r\n  'function switchProyekTab(tab, el) {',\r\n  kontinuitasFunctions + 'function switchProyekTab(tab, el) {',\r\n  'add kontinuitas HM functions'\r\n);\r\n\r\nfs.writeFileSync(filePath, html, 'utf8');\r\nconsole.log('patch_proyek8.js: ' + changes + ' changes applied.');\r\n```

- [ ] **Step 2: Run patch and verify**

```bash
node patch_proyek8.js && node --check index.html
```

- [ ] **Step 3: Browser verify**

Admin → Proyek → Kontinuitas HM:
- Unit dropdown shows all 23 units
- Selecting a unit that has project_units data shows timeline
- Project rows (green) show billed HM; Gap rows (red) show unbilled HM with reason
- Footer shows Billed HM total vs Gap HM total
- Unit with no project data shows empty state message

- [ ] **Step 4: Final push to Vercel**

```bash
git add index.html patch_proyek8.js
git commit -m "feat: Kontinuitas HM tab — per-unit timeline with gap detection"
git push origin master
```

Expected: Vercel auto-deploys within ~60 seconds. Verify at https://servis-saa.vercel.app.

- [ ] **Step 5: End-to-end browser test**

Log in as admin at servis-saa.vercel.app. Run through the full flow:
1. Add a Kapal project with 2 units, different HM ranges → verify tonnage split (equal if within 25%, proportional otherwise)
2. Add a Stockpile project for the same units, HM Awal = previous HM Akhir + gap → verify gap warning fires, save blocked until reason given
3. Ringkasan → verify salary totals per operator, export Excel → open file, check 3 sheets
4. Analisis Biaya → verify Income / Fuel Cost / Labor Cost / Profit / Yield/HM → click Add Invoice → confirm row turns CLOSED
5. Kontinuitas HM → select a unit → verify green project rows + red gap row with reason text

---

## Self-Review

**Spec coverage:**
- [x] DB: `projects` + `project_units` tables with all columns from spec — Task 1
- [x] Project code: Kapal M08-001 auto-generated — Task 5 (`formatKapalCode`)
- [x] Project code: Stockpile KCN-001 manual — Task 6 (`formatStockpileCode`)
- [x] Ship rate tiers: 175/200/225, monthly reset — Task 3 (`calcKapalRate`)
- [x] Tonnage split ±25% median rule — Task 3 (`calcKapalTonnageSplit`)
- [x] Solar formula with `solar_isi_liters` — Task 3 (`calcSolarConsumed`)
- [x] Kapal list + detail expansion — Task 4
- [x] Add Kapal modal with all fields (namaKapal, pemberiKerja, kade, cargo, MT, unitPrice, solarPrice) — Task 5
- [x] HM Continuity: gap detection on HM Awal blur, forced reason, blocks save — Task 5 + 6
- [x] Stockpile list + add modal — Task 6
- [x] Ringkasan: per-operator salary + Rp 3,100,000 base — Task 7
- [x] Excel export: 3 sheets — Task 7
- [x] Analisis Biaya: income/fuel/labor/profit/yield — Task 8
- [x] Invoice tracking Open/Closed + inline Add Invoice — Task 8
- [x] Kontinuitas HM: unit timeline with green/red rows + totals — Task 9
- [x] Admin-only: module wired to `switchAdmin` which is only accessible to admin role
- [x] SheetJS CDN added — Task 2
- [x] RLS policies — Task 1
- [x] CRLF requirement documented in Global Constraints
- [x] Patch script pattern documented

**Placeholder scan:** None found. All code blocks contain actual implementation.

**Type consistency:** `calcKapalTonnageSplit` returns objects with `allocatedMt` (camelCase) — used consistently in Tasks 4, 7, and 8. `calcSolarConsumed` signature `(awalPct, akhirPct, isiLiters)` used consistently in Tasks 4, 6, 7, 8. `fmtRp(n)` used in all render functions. `formatDate(d)` is existing utility, used in Tasks 4, 6, 7, 9. ✓
