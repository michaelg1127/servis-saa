# Project Woodlog Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone PROYEK WOODLOG admin module with Kapal + Hourly job tracking, salary Ringkasan with 2-ship retainer payment logic, cost Analisis, and HM Kontinuitas for units J02, J03, J45–J48.

**Architecture:** New admin nav tab + screen div `#admin-screen-woodlog`, 7 patch scripts sequentially applied to `index.html`. No changes to existing Proyek module. Two new Supabase tables: `woodlog_operator_salary` and `woodlog_kasbon`. Fuel data shared from `fuel_dispenses`.

**Tech Stack:** Vanilla JS, Supabase JS SDK, single `index.html`, Node.js patch scripts, Vercel auto-deploy.

## Global Constraints

- NEVER use Edit tool on JS string literals in index.html — only patch scripts with `replaceExact(from, to, desc)` and `const R = '\r\n'`
- Windows CRLF line endings throughout — every multiline replaceExact string uses `+ R +` between lines
- `replaceExact` exits with code 1 if match count ≠ 1; fix the anchor string, never skip
- Always run `node --check` on the extracted script block after every patch
- Deploy: `git add index.html patch_wl_N.js && git commit -m "..." && git push`
- Supabase RLS: every new table needs `CREATE POLICY "public_all" ON <table> FOR ALL TO public USING (true) WITH CHECK (true)`

---

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Modified by all patch scripts — never edit JS string literals directly |
| `patch_wl_1.js` | No file writes — contains SQL to run manually in Supabase |
| `patch_wl_2.js` | Nav button + screen div HTML + switchAdmin update + switchWoodlogTab + initWoodlogModule |
| `patch_wl_3.js` | Kapal tab: list, add modal, close modal, delete, detail expand |
| `patch_wl_4.js` | Hourly tab: list, add modal, delete |
| `patch_wl_5.js` | Ringkasan tab: payment calculation, mark-as-paid, kasbon |
| `patch_wl_6.js` | Analisis Biaya tab: cost vs income per project |
| `patch_wl_7.js` | Kontinuitas HM tab: HM gap tracking for J02/J03/J45–J48 |

---

## Task 1: DB Setup (Supabase SQL — no file changes)

**Files:** None modified. User runs SQL in Supabase SQL Editor.

**Interfaces:**
- Produces: `woodlog_operator_salary` table, `woodlog_kasbon` table with RLS policies

- [ ] **Step 1: Run this SQL in Supabase SQL Editor**

```sql
-- Table 1: per-operator salary rows linked to woodlog projects
CREATE TABLE woodlog_operator_salary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('bangau', 'std', 'hourly')),
  tonnage_mt numeric,
  salary_amount numeric NOT NULL,
  paid_batch text CHECK (paid_batch IN ('mid_month', 'end_of_month')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE woodlog_operator_salary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON woodlog_operator_salary
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Table 2: monthly KASBON (cash advance deductions) per operator
CREATE TABLE woodlog_kasbon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  operator_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE woodlog_kasbon ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON woodlog_kasbon
  FOR ALL TO public USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Verify tables exist**

In Supabase Table Editor, confirm `woodlog_operator_salary` and `woodlog_kasbon` appear with the correct columns and RLS enabled.

---

## Task 2: Navigation + HTML Shell + switchAdmin + Tab Switching

**Files:**
- Modify: `index.html` (nav button at line 550, screen div after line 838, switchAdmin at lines 3926–3937, last JS before `</script>` at line 6079)
- Create: `patch_wl_2.js`

**Interfaces:**
- Produces: `switchWoodlogTab(tab, el)`, `initWoodlogModule()` — called by later tasks' HTML onclick handlers

- [ ] **Step 1: Create `patch_wl_2.js`**

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

// WL2-1: Add "Proyek Woodlog" nav button after existing Proyek button
replaceExact(
  '    <div class="slink" onclick="switchAdmin(\'proyek\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>Proyek</div>',

  '    <div class="slink" onclick="switchAdmin(\'proyek\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>Proyek</div>' + R +
  '    <div class="slink" onclick="switchAdmin(\'woodlog\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Proyek Woodlog</div>',

  'WL2-1: add Proyek Woodlog nav button'
);

// WL2-2: Add woodlog screen div after closing tags of proyek screen
replaceExact(
  '  </div>' + R +
  '  </div>' + R +
  '</div>' + R +
  '<!-- MODAL OVERLAY -->',

  '  </div>' + R +
  '  <div id="admin-screen-woodlog" class="dscreen">' + R +
  '  <div style="font-size:22px;font-weight:800;color:#1E293B;margin-bottom:16px;">Proyek Woodlog</div>' + R +
  '  <div id="wl-tabs" style="display:flex;gap:0;border-bottom:2px solid #E2E8F0;margin-bottom:20px;flex-wrap:wrap;">' + R +
  '    <button id="wl-tab-kapal" onclick="switchWoodlogTab(\'kapal\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#1D4ED8;border-bottom:3px solid #1D4ED8;margin-bottom:-2px;">Kapal</button>' + R +
  '    <button id="wl-tab-hourly" onclick="switchWoodlogTab(\'hourly\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Hourly</button>' + R +
  '    <button id="wl-tab-ringkasan" onclick="switchWoodlogTab(\'ringkasan\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Ringkasan</button>' + R +
  '    <button id="wl-tab-analisis" onclick="switchWoodlogTab(\'analisis\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Analisis Biaya</button>' + R +
  '    <button id="wl-tab-kontinuitas" onclick="switchWoodlogTab(\'kontinuitas\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Kontinuitas HM</button>' + R +
  '  </div>' + R +
  '  <div id="wl-panel-kapal"></div>' + R +
  '  <div id="wl-panel-hourly" style="display:none;"></div>' + R +
  '  <div id="wl-panel-ringkasan" style="display:none;"></div>' + R +
  '  <div id="wl-panel-analisis" style="display:none;"></div>' + R +
  '  <div id="wl-panel-kontinuitas" style="display:none;"></div>' + R +
  '  </div>' + R +
  '  </div>' + R +
  '</div>' + R +
  '<!-- MODAL OVERLAY -->',

  'WL2-2: add admin-screen-woodlog div with 5 sub-tab panels'
);

// WL2-3: Add 'woodlog' to switchAdmin labels object
replaceExact(
  "  const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM', proyek:'Proyek' };",
  "  const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM', proyek:'Proyek', woodlog:'Proyek Woodlog' };",
  'WL2-3: add woodlog to switchAdmin labels'
);

// WL2-4: Add lazy-load call for woodlog in switchAdmin
replaceExact(
  "  if (name === 'proyek') initProyekModule();" + R +
  "}",
  "  if (name === 'proyek') initProyekModule();" + R +
  "  if (name === 'woodlog') initWoodlogModule();" + R +
  "}",
  'WL2-4: add initWoodlogModule lazy-load in switchAdmin'
);

// WL2-5: Add switchWoodlogTab + initWoodlogModule functions before </script>
replaceExact(
  "function initProyekModule() {" + R +
  "  switchProyekTab('kapal', document.getElementById('proyek-tab-kapal'));" + R +
  "}",

  "function initProyekModule() {" + R +
  "  switchProyekTab('kapal', document.getElementById('proyek-tab-kapal'));" + R +
  "}" + R +
  R +
  "// ============================================================" + R +
  "// PROYEK WOODLOG MODULE" + R +
  "// ============================================================" + R +
  "const WL_BANGAU_OPS = ['Andi', 'Iman', 'Riski', 'Purwanto'];" + R +
  "const WL_STD_OPS = ['Erwin', 'Uncong', 'Valdo', 'Andre', 'Alif', 'Rudianto'];" + R +
  "const WL_BANGAU_CODES = ['J02', 'J03'];" + R +
  "const WL_STD_CODES = ['J45', 'J46', 'J47', 'J48'];" + R +
  "const WL_ALL_CODES = ['J02', 'J03', 'J45', 'J46', 'J47', 'J48'];" + R +
  "let _wlKapalCache = {};" + R +
  "let _wlHourlyCache = {};" + R +
  "let _wlKontinuitasUnitId = null;" + R +
  R +
  "function switchWoodlogTab(tab, el) {" + R +
  "  ['kapal','hourly','ringkasan','analisis','kontinuitas'].forEach(function(t) {" + R +
  "    const panel = document.getElementById('wl-panel-' + t);" + R +
  "    const btn = document.getElementById('wl-tab-' + t);" + R +
  "    if (panel) panel.style.display = t === tab ? '' : 'none';" + R +
  "    if (btn) { btn.style.color = t === tab ? '#1D4ED8' : '#94A3B8'; btn.style.borderBottom = t === tab ? '3px solid #1D4ED8' : '3px solid transparent'; }" + R +
  "  });" + R +
  "  if (tab === 'kapal') loadWoodlogKapal();" + R +
  "  if (tab === 'hourly') loadWoodlogHourly();" + R +
  "  if (tab === 'ringkasan') loadWoodlogRingkasan();" + R +
  "  if (tab === 'analisis') loadWoodlogAnalisis();" + R +
  "  if (tab === 'kontinuitas') renderWoodlogKontinuitas();" + R +
  "}" + R +
  R +
  "function initWoodlogModule() {" + R +
  "  switchWoodlogTab('kapal', document.getElementById('wl-tab-kapal'));" + R +
  "}",

  'WL2-5: add switchWoodlogTab + initWoodlogModule + module constants'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL2 patches applied. Running syntax check...');
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

- [ ] **Step 2: Run the patch**

```bash
node patch_wl_2.js
```

Expected output: 5 OK lines + "Syntax OK"

- [ ] **Step 3: Verify in browser**

Push and navigate to the admin panel. Confirm "Proyek Woodlog" appears in the sidebar. Click it — the screen should show 5 tabs (Kapal, Hourly, Ringkasan, Analisis Biaya, Kontinuitas HM) with empty panels and no JS errors.

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wl_2.js
git commit -m "WL2: Woodlog nav + screen shell + tab switching"
git push
```

---

## Task 3: Kapal Tab

**Files:**
- Modify: `index.html`
- Create: `patch_wl_3.js`

**Interfaces:**
- Consumes: `WL_BANGAU_OPS`, `WL_STD_OPS`, `WL_BANGAU_CODES`, `WL_STD_CODES`, `WL_ALL_CODES`, `allUnits` (global), `sb` (Supabase client), `showToast()`, `closeModal()`, `formatDate()`, `todayISO()`
- Produces: `loadWoodlogKapal()`, `renderWoodlogKapalList(projects, salaryMap)`, `toggleWoodlogKapalDetail(id)`, `openAddWoodlogKapalModal()`, `openCloseWoodlogKapalModal(id)`, `doDeleteWoodlogProject(id)`

- [ ] **Step 1: Create `patch_wl_3.js`**

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

replaceExact(
  "function initWoodlogModule() {" + R +
  "  switchWoodlogTab('kapal', document.getElementById('wl-tab-kapal'));" + R +
  "}",

  "function initWoodlogModule() {" + R +
  "  switchWoodlogTab('kapal', document.getElementById('wl-tab-kapal'));" + R +
  "}" + R +
  R +
  "async function getNextWoodlogCode(monthYear) {" + R +
  "  const mm = monthYear.slice(5, 7);" + R +
  "  const { data } = await sb.from('projects').select('ship_number_in_month')" + R +
  "    .in('type', ['woodlog_kapal', 'woodlog_hourly']).eq('month_year', monthYear)" + R +
  "    .order('ship_number_in_month', { ascending: false }).limit(1);" + R +
  "  const next = data && data.length > 0 ? (data[0].ship_number_in_month || 0) + 1 : 1;" + R +
  "  return { code: 'K' + mm + '-' + String(next).padStart(2, '0'), num: next };" + R +
  "}" + R +
  R +
  "async function loadWoodlogKapal() {" + R +
  "  const el = document.getElementById('wl-panel-kapal');" + R +
  "  if (!el) return;" + R +
  "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data: projects, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code, name, operator_name))')" + R +
  "      .eq('type', 'woodlog_kapal').order('start_date', { ascending: false });" + R +
  "    if (error) throw error;" + R +
  "    const ids = (projects || []).map(p => p.id);" + R +
  "    let salaryMap = {};" + R +
  "    if (ids.length > 0) {" + R +
  "      const { data: sals } = await sb.from('woodlog_operator_salary').select('*').in('project_id', ids);" + R +
  "      (sals || []).forEach(s => { if (!salaryMap[s.project_id]) salaryMap[s.project_id] = []; salaryMap[s.project_id].push(s); });" + R +
  "    }" + R +
  "    projects.forEach(p => { _wlKapalCache[p.id] = p; });" + R +
  "    renderWoodlogKapalList(projects || [], salaryMap);" + R +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "function renderWoodlogKapalList(projects, salaryMap) {" + R +
  "  const el = document.getElementById('wl-panel-kapal');" + R +
  "  if (!el) return;" + R +
  "  const addBtn = '<button onclick=\"openAddWoodlogKapalModal()\" class=\"btn-primary\" style=\"margin-bottom:16px;\">+ Tambah Proyek Kapal</button>';" + R +
  "  if (projects.length === 0) { el.innerHTML = addBtn + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek kapal woodlog.</div>'; return; }" + R +
  "  const rows = projects.map(function(p) {" + R +
  "    const units = (p.project_units || []).map(u => u.units ? u.units.code : '?').join(', ');" + R +
  "    const status = p.end_date ? '<span style=\"color:#16A34A;font-weight:700;\">Selesai</span>' : '<span style=\"color:#D97706;font-weight:700;\">Berjalan</span>';" + R +
  "    const sals = salaryMap[p.id] || [];" + R +
  "    const totalSal = sals.reduce(function(a, s) { return a + Number(s.salary_amount); }, 0);" + R +
  "    return '<tr>' +" + R +
  "      '<td style=\"font-weight:700;color:#1D4ED8;cursor:pointer;\" onclick=\"toggleWoodlogKapalDetail(\\'' + p.id + '\\')\">' + p.project_code + '</td>' +" + R +
  "      '<td>' + (p.nama_kapal || '—') + '</td>' +" + R +
  "      '<td>' + (p.pemberi_kerja || '—') + '</td>' +" + R +
  "      '<td>' + formatDate(p.start_date) + '</td>' +" + R +
  "      '<td>' + (p.end_date ? formatDate(p.end_date) : '—') + '</td>' +" + R +
  "      '<td style=\"font-size:12px;color:#64748B;\">' + units + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (p.total_mt_m3 ? Number(p.total_mt_m3).toLocaleString('id') + ' MT' : '—') + '</td>' +" + R +
  "      '<td>' + status + '</td>' +" + R +
  "      '<td style=\"white-space:nowrap;\">' +" + R +
  "        (!p.end_date ? '<button onclick=\"openCloseWoodlogKapalModal(\\'' + p.id + '\\')\" style=\"background:#DCFCE7;color:#16A34A;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px;\">Tutup</button>' : '') +" + R +
  "        '<button onclick=\"doDeleteWoodlogProject(\\'' + p.id + '\\')\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;\">Hapus</button>' +" + R +
  "      '</td></tr>' +" + R +
  "      '<tr id=\"wl-kapal-detail-' + p.id + '\" style=\"display:none;\"><td colspan=\"9\" style=\"padding:12px 16px;background:#F8FAFC;\">Memuat...</td></tr>';" + R +
  "  }).join('');" + R +
  "  el.innerHTML = addBtn + '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Kapal</th><th>Pemberi Kerja</th><th>Mulai</th><th>Selesai</th><th>Unit</th><th style=\"text-align:right;\">BL Tonnage</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';" + R +
  "}" + R +
  R +
  "async function toggleWoodlogKapalDetail(id) {" + R +
  "  const row = document.getElementById('wl-kapal-detail-' + id);" + R +
  "  if (!row) return;" + R +
  "  if (row.style.display !== 'none') { row.style.display = 'none'; return; }" + R +
  "  row.style.display = '';" + R +
  "  if (row.dataset.rendered === 'true') return;" + R +
  "  const p = _wlKapalCache[id];" + R +
  "  if (!p) { row.querySelector('td').textContent = 'Data tidak ditemukan.'; return; }" + R +
  "  const { data: sals } = await sb.from('woodlog_operator_salary').select('*').eq('project_id', id).order('operator_name');" + R +
  "  const salRows = (sals || []).map(function(s) {" + R +
  "    const paidLabel = s.paid_batch === 'mid_month' ? '16' : s.paid_batch === 'end_of_month' ? 'Akhir Bulan' : '—';" + R +
  "    return '<tr><td>' + s.operator_name + '</td><td style=\"text-transform:capitalize;\">' + s.unit_type + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (s.tonnage_mt != null ? Number(s.tonnage_mt).toLocaleString('id') + ' MT' : '—') + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;\">Rp ' + Number(s.salary_amount).toLocaleString('id') + '</td>' +" + R +
  "      '<td style=\"color:' + (s.paid_batch ? '#16A34A' : '#D97706') + ';font-weight:700;\">' + (s.paid_batch ? 'Dibayar (' + paidLabel + ')' : 'Belum Dibayar') + '</td></tr>';" + R +
  "  }).join('');" + R +
  "  const unitRows = (p.project_units || []).map(function(pu) {" + R +
  "    const hmDur = (pu.hm_akhir && pu.hm_awal) ? (Number(pu.hm_akhir) - Number(pu.hm_awal)).toFixed(1) : '—';" + R +
  "    return '<tr><td style=\"font-weight:700;\">' + (pu.units ? pu.units.code : '?') + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (pu.hm_awal || '—') + '</td><td style=\"text-align:right;\">' + (pu.hm_akhir || '—') + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;\">' + hmDur + ' HM</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (pu.solar_awal_pct != null ? pu.solar_awal_pct + '%' : '—') + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + (pu.solar_akhir_pct != null ? pu.solar_akhir_pct + '%' : '—') + '</td></tr>';" + R +
  "  }).join('');" + R +
  "  row.innerHTML = '<td colspan=\"9\" style=\"padding:12px 16px;background:#F8FAFC;\">' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Unit HM</div>' +" + R +
  "    '<div class=\"table-wrap\" style=\"margin-bottom:12px;\"><table class=\"dt\"><thead><tr><th>Unit</th><th>HM Awal</th><th>HM Akhir</th><th>Durasi</th><th>Solar Awal</th><th>Solar Akhir</th></tr></thead><tbody>' + unitRows + '</tbody></table></div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary Operator</div>' +" + R +
  "    '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Operator</th><th>Tipe</th><th>Tonnage</th><th>Salary</th><th>Status</th></tr></thead><tbody>' + salRows + '</tbody></table></div>' +" + R +
  "    '</td>';" + R +
  "  row.dataset.rendered = 'true';" + R +
  "}" + R +
  R +
  "async function openAddWoodlogKapalModal() {" + R +
  "  const today = todayISO();" + R +
  "  const monthYear = today.slice(0, 7);" + R +
  "  const { code, num } = await getNextWoodlogCode(monthYear);" + R +
  "  const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "  const unitCheckboxes = wlUnits.map(function(u) {" + R +
  "    const isBangau = WL_BANGAU_CODES.includes(u.code);" + R +
  "    return '<div style=\"display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F1F5F9;\">' +" + R +
  "      '<input type=\"checkbox\" id=\"wl-unit-' + u.id + '\" value=\"' + u.id + '\" data-code=\"' + u.code + '\" data-bangau=\"' + isBangau + '\" onchange=\"wlUpdateSalaryPreview()\" style=\"width:16px;height:16px;\">' +" + R +
  "      '<span style=\"font-weight:700;color:#1D4ED8;width:40px;\">' + u.code + '</span>' +" + R +
  "      '<span style=\"font-size:12px;color:#64748B;flex:1;\">' + (u.name || '') + '</span>' +" + R +
  "      '<input type=\"number\" id=\"wl-hmawal-' + u.id + '\" class=\"finput\" style=\"width:90px;font-size:13px;\" placeholder=\"HM Awal\" step=\"0.1\">' +" + R +
  "      '<input type=\"number\" id=\"wl-solawal-' + u.id + '\" class=\"finput\" style=\"width:80px;font-size:13px;\" placeholder=\"Solar %\" min=\"0\" max=\"100\">' +" + R +
  "      '</div>';" + R +
  "  }).join('');" + R +
  "  const stdOpRows = WL_STD_OPS.map(function(op) {" + R +
  "    return '<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px;\">' +" + R +
  "      '<span style=\"width:100px;font-size:13px;font-weight:600;\">' + op + '</span>' +" + R +
  "      '<input type=\"number\" id=\"wl-std-ton-' + op + '\" class=\"finput\" style=\"width:110px;font-size:13px;\" placeholder=\"Tonnage MT\" min=\"0\" oninput=\"wlUpdateSalaryPreview()\">' +" + R +
  "      '<span id=\"wl-std-sal-' + op + '\" style=\"font-size:13px;font-weight:700;color:#1D4ED8;width:120px;\">Rp 0</span>' +" + R +
  "      '</div>';" + R +
  "  }).join('');" + R +
  "  const bangauOpRows = WL_BANGAU_OPS.map(function(op) {" + R +
  "    return '<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px;\">' +" + R +
  "      '<span style=\"width:100px;font-size:13px;font-weight:600;\">' + op + '</span>' +" + R +
  "      '<span id=\"wl-bang-sal-' + op + '\" style=\"font-size:13px;font-weight:700;color:#1D4ED8;\">Rp 0</span>' +" + R +
  "      '</div>';" + R +
  "  }).join('');" + R +
  "  const modalHTML = '<div style=\"padding:24px;max-width:700px;width:100%;max-height:85vh;overflow-y:auto;\">' +" + R +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;\">Tambah Proyek Kapal Woodlog</div>' +" + R +
  "    '<div style=\"font-size:13px;color:#1D4ED8;font-weight:700;margin-bottom:16px;\">Kode: ' + code + '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Nama Kapal *</label><input type=\"text\" id=\"wladd-namakapal\" class=\"finput\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Pemberi Kerja</label><input type=\"text\" id=\"wladd-pemberi\" class=\"finput\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"wladd-start\" class=\"finput\" value=\"' + today + '\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">BL Tonnage (MT)</label><input type=\"number\" id=\"wladd-bl\" class=\"finput\" min=\"0\" oninput=\"wlUpdateSalaryPreview()\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Rate/MT (Rp)</label><input type=\"number\" id=\"wladd-rate\" class=\"finput\" min=\"0\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Harga Solar (Rp/L)</label><input type=\"number\" id=\"wladd-solar\" class=\"finput\" min=\"0\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">No. Invoice</label><input type=\"text\" id=\"wladd-inv\" class=\"finput\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Unit yang Mengerjakan</div>' +" + R +
  "    '<div style=\"margin-bottom:16px;\">' + unitCheckboxes + '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary Bangau (J02/J03) — auto</div>' +" + R +
  "    '<div style=\"background:#EFF6FF;border-radius:10px;padding:12px;margin-bottom:16px;\">' + bangauOpRows + '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary STD (J45–J48) — input manual tonnage</div>' +" + R +
  "    '<div style=\"background:#F0FDF4;border-radius:10px;padding:12px;margin-bottom:16px;\">' + stdOpRows + '</div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Catatan</label><textarea id=\"wladd-notes\" class=\"finput\" rows=\"2\"></textarea></div>' +" + R +
  "    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +" + R +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + R +
  "    '<button onclick=\"submitAddWoodlogKapal(' + num + ',\\'' + monthYear + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>' +" + R +
  "    '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "}" + R +
  R +
  "function wlUpdateSalaryPreview() {" + R +
  "  const bl = parseFloat(document.getElementById('wladd-bl')?.value) || 0;" + R +
  "  const bangauSal = bl * 0.9 / 4 * 800;" + R +
  "  WL_BANGAU_OPS.forEach(function(op) {" + R +
  "    const el = document.getElementById('wl-bang-sal-' + op);" + R +
  "    if (el) el.textContent = 'Rp ' + Math.round(bangauSal).toLocaleString('id');" + R +
  "  });" + R +
  "  WL_STD_OPS.forEach(function(op) {" + R +
  "    const ton = parseFloat(document.getElementById('wl-std-ton-' + op)?.value) || 0;" + R +
  "    const salEl = document.getElementById('wl-std-sal-' + op);" + R +
  "    if (salEl) salEl.textContent = 'Rp ' + Math.round(ton * 750).toLocaleString('id');" + R +
  "  });" + R +
  "}" + R +
  R +
  "async function submitAddWoodlogKapal(shipNum, monthYear) {" + R +
  "  const namaKapal = document.getElementById('wladd-namakapal')?.value.trim();" + R +
  "  const pemberi = document.getElementById('wladd-pemberi')?.value.trim() || null;" + R +
  "  const start = document.getElementById('wladd-start')?.value;" + R +
  "  const bl = parseFloat(document.getElementById('wladd-bl')?.value) || null;" + R +
  "  const rate = parseFloat(document.getElementById('wladd-rate')?.value) || null;" + R +
  "  const solar = parseFloat(document.getElementById('wladd-solar')?.value) || null;" + R +
  "  const inv = document.getElementById('wladd-inv')?.value.trim() || null;" + R +
  "  const notes = document.getElementById('wladd-notes')?.value.trim() || null;" + R +
  "  if (!namaKapal || !start) { showToast('Nama Kapal dan Tgl Mulai wajib diisi.'); return; }" + R +
  "  const mm = monthYear.slice(5, 7);" + R +
  "  const projectCode = 'K' + mm + '-' + String(shipNum).padStart(2, '0');" + R +
  "  try {" + R +
  "    const { data: proj, error: e1 } = await sb.from('projects').insert({" + R +
  "      type: 'woodlog_kapal', project_code: projectCode, ship_number_in_month: shipNum," + R +
  "      month_year: monthYear, nama_kapal: namaKapal, pemberi_kerja: pemberi," + R +
  "      start_date: start, total_mt_m3: bl, unit_price: rate," + R +
  "      harga_solar_rpl: solar, invoice_number: inv, notes: notes" + R +
  "    }).select().single();" + R +
  "    if (e1) throw e1;" + R +
  "    const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "    const checkedUnits = wlUnits.filter(function(u) {" + R +
  "      const cb = document.getElementById('wl-unit-' + u.id);" + R +
  "      return cb && cb.checked;" + R +
  "    });" + R +
  "    if (checkedUnits.length > 0) {" + R +
  "      const puRows = checkedUnits.map(function(u) {" + R +
  "        const hm = parseFloat(document.getElementById('wl-hmawal-' + u.id)?.value) || null;" + R +
  "        const sol = parseFloat(document.getElementById('wl-solawal-' + u.id)?.value);" + R +
  "        return { project_id: proj.id, unit_id: u.id, hm_awal: hm, solar_awal_pct: isNaN(sol) ? null : sol };" + R +
  "      });" + R +
  "      const { error: e2 } = await sb.from('project_units').insert(puRows);" + R +
  "      if (e2) throw e2;" + R +
  "    }" + R +
  "    const salaryInserts = [];" + R +
  "    if (bl) {" + R +
  "      const bangauSal = Math.round(bl * 0.9 / 4 * 800);" + R +
  "      const bl4 = bl * 0.9 / 4;" + R +
  "      WL_BANGAU_OPS.forEach(function(op) {" + R +
  "        salaryInserts.push({ project_id: proj.id, operator_name: op, unit_type: 'bangau', tonnage_mt: bl4, salary_amount: bangauSal });" + R +
  "      });" + R +
  "    }" + R +
  "    WL_STD_OPS.forEach(function(op) {" + R +
  "      const ton = parseFloat(document.getElementById('wl-std-ton-' + op)?.value) || 0;" + R +
  "      if (ton > 0) salaryInserts.push({ project_id: proj.id, operator_name: op, unit_type: 'std', tonnage_mt: ton, salary_amount: Math.round(ton * 750) });" + R +
  "    });" + R +
  "    if (salaryInserts.length > 0) {" + R +
  "      const { error: e3 } = await sb.from('woodlog_operator_salary').insert(salaryInserts);" + R +
  "      if (e3) throw e3;" + R +
  "    }" + R +
  "    closeModal();" + R +
  "    showToast('Proyek ' + projectCode + ' berhasil ditambahkan!', 'success');" + R +
  "    await loadWoodlogKapal();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "function openCloseWoodlogKapalModal(id) {" + R +
  "  const p = _wlKapalCache[id];" + R +
  "  if (!p) return;" + R +
  "  const units = p.project_units || [];" + R +
  "  const unitRows = units.map(function(pu) {" + R +
  "    return '<div style=\"margin-bottom:8px;padding:10px;background:#F8FAFC;border-radius:8px;\">' +" + R +
  "      '<div style=\"font-weight:700;color:#1D4ED8;margin-bottom:6px;\">' + (pu.units ? pu.units.code : '?') + '</div>' +" + R +
  "      '<div style=\"display:flex;gap:10px;\">' +" + R +
  "      '<input type=\"number\" id=\"wlclose-hm-' + pu.unit_id + '\" class=\"finput\" style=\"flex:1;font-size:13px;\" placeholder=\"HM Akhir\" step=\"0.1\" value=\"' + (pu.hm_akhir || '') + '\">' +" + R +
  "      '<input type=\"number\" id=\"wlclose-sol-' + pu.unit_id + '\" class=\"finput\" style=\"width:90px;font-size:13px;\" placeholder=\"Solar Akhir %\" min=\"0\" max=\"100\" value=\"' + (pu.solar_akhir_pct != null ? pu.solar_akhir_pct : '') + '\">' +" + R +
  "      '</div></div>';" + R +
  "  }).join('');" + R +
  "  const modalHTML = '<div style=\"padding:24px;max-width:500px;width:100%;\">' +" + R +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;\">Tutup Proyek ' + p.project_code + '</div>' +" + R +
  "    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tanggal Selesai *</label><input type=\"date\" id=\"wlclose-end\" class=\"finput\" value=\"' + todayISO() + '\"></div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">HM Akhir & Solar Akhir per Unit</div>' +" + R +
  "    unitRows +" + R +
  "    '<div style=\"display:flex;gap:12px;margin-top:16px;\">' +" + R +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + R +
  "    '<button onclick=\"submitCloseWoodlogKapal(\\'' + id + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>' +" + R +
  "    '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "}" + R +
  R +
  "async function submitCloseWoodlogKapal(id) {" + R +
  "  const endDate = document.getElementById('wlclose-end')?.value;" + R +
  "  if (!endDate) { showToast('Tanggal Selesai wajib diisi.'); return; }" + R +
  "  const p = _wlKapalCache[id];" + R +
  "  if (!p) return;" + R +
  "  try {" + R +
  "    const { error: e1 } = await sb.from('projects').update({ end_date: endDate }).eq('id', id);" + R +
  "    if (e1) throw e1;" + R +
  "    const units = p.project_units || [];" + R +
  "    await Promise.all(units.map(function(pu) {" + R +
  "      const hm = parseFloat(document.getElementById('wlclose-hm-' + pu.unit_id)?.value) || null;" + R +
  "      const sol = parseFloat(document.getElementById('wlclose-sol-' + pu.unit_id)?.value);" + R +
  "      return sb.from('project_units').update({ hm_akhir: hm, solar_akhir_pct: isNaN(sol) ? null : sol }).eq('id', pu.id);" + R +
  "    }));" + R +
  "    closeModal();" + R +
  "    showToast('Proyek berhasil ditutup.', 'success');" + R +
  "    await loadWoodlogKapal();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function doDeleteWoodlogProject(id) {" + R +
  "  if (!confirm('Hapus proyek ini? Semua data unit dan salary akan ikut terhapus.')) return;" + R +
  "  try {" + R +
  "    const { data, error } = await sb.from('projects').delete().eq('id', id).select();" + R +
  "    if (error) throw error;" + R +
  "    if (!data || data.length === 0) throw new Error('Akses ditolak (RLS). Hubungi admin.');" + R +
  "    showToast('Proyek berhasil dihapus.', 'info');" + R +
  "    await loadWoodlogKapal();" + R +
  "    await loadWoodlogHourly();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}",

  'WL3: Kapal tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL3 patches applied. Running syntax check...');
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

- [ ] **Step 2: Run the patch**

```bash
node patch_wl_3.js
```

Expected: 1 OK line + "Syntax OK"

- [ ] **Step 3: Test in browser**

Push and deploy. Navigate to Proyek Woodlog → Kapal tab. Verify:
- "Tambah Proyek Kapal" button appears
- Clicking it opens modal with unit checkboxes, BL Tonnage input, salary preview sections
- Typing in BL Tonnage updates Bangau salary auto-calc in real time
- Typing STD tonnage updates STD salary preview
- Saving creates a project row in the list
- Tutup modal lets you enter end date + HM akhir per unit
- Hapus prompts confirmation and removes the row

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wl_3.js
git commit -m "WL3: Woodlog Kapal tab — list, add, close, delete"
git push
```

---

## Task 4: Hourly Tab

**Files:**
- Modify: `index.html`
- Create: `patch_wl_4.js`

**Interfaces:**
- Consumes: `getNextWoodlogCode()`, `WL_ALL_CODES`, `allUnits`, `_wlHourlyCache`, `doDeleteWoodlogProject()` (from Task 3)
- Produces: `loadWoodlogHourly()`, `renderWoodlogHourlyList()`, `openAddWoodlogHourlyModal()`, `submitAddWoodlogHourly()`

- [ ] **Step 1: Create `patch_wl_4.js`**

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

replaceExact(
  "async function doDeleteWoodlogProject(id) {",

  "async function loadWoodlogHourly() {" + R +
  "  const el = document.getElementById('wl-panel-hourly');" + R +
  "  if (!el) return;" + R +
  "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data: projects, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code, name))')" + R +
  "      .eq('type', 'woodlog_hourly').order('start_date', { ascending: false });" + R +
  "    if (error) throw error;" + R +
  "    const ids = (projects || []).map(p => p.id);" + R +
  "    let salaryMap = {};" + R +
  "    if (ids.length > 0) {" + R +
  "      const { data: sals } = await sb.from('woodlog_operator_salary').select('*').in('project_id', ids);" + R +
  "      (sals || []).forEach(s => { if (!salaryMap[s.project_id]) salaryMap[s.project_id] = []; salaryMap[s.project_id].push(s); });" + R +
  "    }" + R +
  "    projects.forEach(p => { _wlHourlyCache[p.id] = p; });" + R +
  "    renderWoodlogHourlyList(projects || [], salaryMap);" + R +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "function renderWoodlogHourlyList(projects, salaryMap) {" + R +
  "  const el = document.getElementById('wl-panel-hourly');" + R +
  "  if (!el) return;" + R +
  "  const addBtn = '<button onclick=\"openAddWoodlogHourlyModal()\" class=\"btn-primary\" style=\"margin-bottom:16px;\">+ Tambah Proyek Hourly</button>';" + R +
  "  if (projects.length === 0) { el.innerHTML = addBtn + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek hourly woodlog.</div>'; return; }" + R +
  "  const rows = projects.map(function(p) {" + R +
  "    const units = (p.project_units || []).map(u => u.units ? u.units.code : '?').join(', ');" + R +
  "    const sals = salaryMap[p.id] || [];" + R +
  "    const totalSal = sals.reduce(function(a, s) { return a + Number(s.salary_amount); }, 0);" + R +
  "    const totalHM = (p.project_units || []).reduce(function(a, pu) {" + R +
  "      return a + ((pu.hm_akhir && pu.hm_awal) ? Number(pu.hm_akhir) - Number(pu.hm_awal) : 0);" + R +
  "    }, 0);" + R +
  "    return '<tr>' +" + R +
  "      '<td style=\"font-weight:700;color:#1D4ED8;\">' + p.project_code + '</td>' +" + R +
  "      '<td>' + (p.pemberi_kerja || '—') + '</td>' +" + R +
  "      '<td>' + formatDate(p.start_date) + '</td>' +" + R +
  "      '<td>' + (p.end_date ? formatDate(p.end_date) : '—') + '</td>' +" + R +
  "      '<td style=\"font-size:12px;color:#64748B;\">' + units + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + totalHM.toFixed(1) + ' HM</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;\">Rp ' + totalSal.toLocaleString('id') + '</td>' +" + R +
  "      '<td><button onclick=\"doDeleteWoodlogProject(\\'' + p.id + '\\')\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;\">Hapus</button></td></tr>';" + R +
  "  }).join('');" + R +
  "  el.innerHTML = addBtn + '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Pemberi Kerja</th><th>Mulai</th><th>Selesai</th><th>Unit</th><th style=\"text-align:right;\">Total HM</th><th style=\"text-align:right;\">Total Salary</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';" + R +
  "}" + R +
  R +
  "async function openAddWoodlogHourlyModal() {" + R +
  "  const today = todayISO();" + R +
  "  const monthYear = today.slice(0, 7);" + R +
  "  const { code, num } = await getNextWoodlogCode(monthYear);" + R +
  "  const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "  const unitCheckboxes = wlUnits.map(function(u) {" + R +
  "    return '<div style=\"display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #F1F5F9;\">' +" + R +
  "      '<input type=\"checkbox\" id=\"wlh-unit-' + u.id + '\" value=\"' + u.id + '\" style=\"width:16px;height:16px;\">' +" + R +
  "      '<span style=\"font-weight:700;color:#1D4ED8;width:40px;\">' + u.code + '</span>' +" + R +
  "      '<input type=\"number\" id=\"wlh-hmawal-' + u.id + '\" class=\"finput\" style=\"width:90px;font-size:13px;\" placeholder=\"HM Awal\" step=\"0.1\">' +" + R +
  "      '<input type=\"number\" id=\"wlh-hmakhir-' + u.id + '\" class=\"finput\" style=\"width:90px;font-size:13px;\" placeholder=\"HM Akhir\" step=\"0.1\">' +" + R +
  "      '</div>';" + R +
  "  }).join('');" + R +
  "  const modalHTML = '<div style=\"padding:24px;max-width:600px;width:100%;max-height:85vh;overflow-y:auto;\">' +" + R +
  "    '<div style=\"font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;\">Tambah Proyek Hourly Woodlog</div>' +" + R +
  "    '<div style=\"font-size:13px;color:#1D4ED8;font-weight:700;margin-bottom:16px;\">Kode: ' + code + '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Pemberi Kerja</label><input type=\"text\" id=\"wlh-pemberi\" class=\"finput\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">No. Invoice</label><input type=\"text\" id=\"wlh-inv\" class=\"finput\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;\">' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Mulai *</label><input type=\"date\" id=\"wlh-start\" class=\"finput\" value=\"' + today + '\"></div>' +" + R +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Tgl Selesai</label><input type=\"date\" id=\"wlh-end\" class=\"finput\"></div>' +" + R +
  "    '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Unit (HM Awal – HM Akhir)</div>' +" + R +
  "    '<div style=\"margin-bottom:16px;\">' + unitCheckboxes + '</div>' +" + R +
  "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary Operator (manual)</div>' +" + R +
  "    '<div id=\"wlh-op-rows\" style=\"margin-bottom:12px;\"></div>' +" + R +
  "    '<button onclick=\"addWoodlogHourlyOpRow()\" style=\"background:#EFF6FF;border:1.5px dashed #93C5FD;color:#1D4ED8;font-size:13px;font-weight:700;padding:8px 16px;border-radius:8px;cursor:pointer;width:100%;margin-bottom:16px;\">+ Tambah Operator</button>' +" + R +
  "    '<div style=\"display:flex;gap:12px;margin-top:4px;\">' +" + R +
  "    '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>' +" + R +
  "    '<button onclick=\"submitAddWoodlogHourly(' + num + ',\\'' + monthYear + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>' +" + R +
  "    '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "  addWoodlogHourlyOpRow();" + R +
  "}" + R +
  R +
  "function addWoodlogHourlyOpRow() {" + R +
  "  const wrap = document.getElementById('wlh-op-rows');" + R +
  "  if (!wrap) return;" + R +
  "  const idx = wrap.children.length;" + R +
  "  const div = document.createElement('div');" + R +
  "  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';" + R +
  "  div.innerHTML = '<input type=\"text\" id=\"wlh-opname-' + idx + '\" class=\"finput\" style=\"flex:1;font-size:13px;\" placeholder=\"Nama Operator\">' +" + R +
  "    '<input type=\"number\" id=\"wlh-opsal-' + idx + '\" class=\"finput\" style=\"width:150px;font-size:13px;\" placeholder=\"Salary (Rp)\" min=\"0\">' +" + R +
  "    '<button onclick=\"this.parentElement.remove()\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;\">✕</button>';" + R +
  "  wrap.appendChild(div);" + R +
  "}" + R +
  R +
  "async function submitAddWoodlogHourly(shipNum, monthYear) {" + R +
  "  const pemberi = document.getElementById('wlh-pemberi')?.value.trim() || null;" + R +
  "  const inv = document.getElementById('wlh-inv')?.value.trim() || null;" + R +
  "  const start = document.getElementById('wlh-start')?.value;" + R +
  "  const end = document.getElementById('wlh-end')?.value || null;" + R +
  "  if (!start) { showToast('Tgl Mulai wajib diisi.'); return; }" + R +
  "  const mm = monthYear.slice(5, 7);" + R +
  "  const projectCode = 'K' + mm + '-' + String(shipNum).padStart(2, '0');" + R +
  "  try {" + R +
  "    const { data: proj, error: e1 } = await sb.from('projects').insert({" + R +
  "      type: 'woodlog_hourly', project_code: projectCode, ship_number_in_month: shipNum," + R +
  "      month_year: monthYear, pemberi_kerja: pemberi, start_date: start, end_date: end, invoice_number: inv" + R +
  "    }).select().single();" + R +
  "    if (e1) throw e1;" + R +
  "    const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "    const checkedUnits = wlUnits.filter(function(u) {" + R +
  "      const cb = document.getElementById('wlh-unit-' + u.id);" + R +
  "      return cb && cb.checked;" + R +
  "    });" + R +
  "    if (checkedUnits.length > 0) {" + R +
  "      const puRows = checkedUnits.map(function(u) {" + R +
  "        const hma = parseFloat(document.getElementById('wlh-hmawal-' + u.id)?.value) || null;" + R +
  "        const hme = parseFloat(document.getElementById('wlh-hmakhir-' + u.id)?.value) || null;" + R +
  "        return { project_id: proj.id, unit_id: u.id, hm_awal: hma, hm_akhir: hme };" + R +
  "      });" + R +
  "      await sb.from('project_units').insert(puRows);" + R +
  "    }" + R +
  "    const opWrap = document.getElementById('wlh-op-rows');" + R +
  "    const salaryInserts = [];" + R +
  "    if (opWrap) {" + R +
  "      for (let i = 0; i < opWrap.children.length; i++) {" + R +
  "        const opName = document.getElementById('wlh-opname-' + i)?.value.trim();" + R +
  "        const opSal = parseFloat(document.getElementById('wlh-opsal-' + i)?.value) || 0;" + R +
  "        if (opName && opSal > 0) salaryInserts.push({ project_id: proj.id, operator_name: opName, unit_type: 'hourly', salary_amount: opSal });" + R +
  "      }" + R +
  "    }" + R +
  "    if (salaryInserts.length > 0) await sb.from('woodlog_operator_salary').insert(salaryInserts);" + R +
  "    closeModal();" + R +
  "    showToast('Proyek Hourly ' + projectCode + ' berhasil ditambahkan!', 'success');" + R +
  "    await loadWoodlogHourly();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function doDeleteWoodlogProject(id) {",

  'WL4: Hourly tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL4 patches applied. Running syntax check...');
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

- [ ] **Step 2: Run the patch**

```bash
node patch_wl_4.js
```

Expected: 1 OK + "Syntax OK"

- [ ] **Step 3: Test in browser**

Push and navigate to Hourly tab. Verify: add modal opens with unit checkboxes + operator rows; adding rows with + button works; submitting creates project in list.

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wl_4.js
git commit -m "WL4: Woodlog Hourly tab — list, add, delete"
git push
```

---

## Task 5: Ringkasan Tab

**Files:**
- Modify: `index.html`
- Create: `patch_wl_5.js`

**Interfaces:**
- Consumes: `sb`, `showToast()`, `todayISO()`, `WL_BANGAU_OPS`, `WL_STD_OPS`
- Produces: `loadWoodlogRingkasan()`, `renderWoodlogRingkasan(salaryRows, completedProjects, kasbonMap, monthYear)`, `markWoodlogPaid(paymentType)`, `saveWoodlogKasbon(monthYear)`

**Calculation logic:**
1. Fetch all completed woodlog projects sorted by `end_date` ascending
2. Fetch all `woodlog_operator_salary` rows with `paid_batch IS NULL` for those project IDs
3. Last 2 project IDs (by end_date) = retainer → excluded from payable set
4. Payable rows = unpaid salary rows NOT in retainer projects
5. Group payable rows by `operator_name`, sum `salary_amount`
6. 16th payment = payable sum per operator
7. End of month = payable sum + 3,100,000 base − KASBON per operator

- [ ] **Step 1: Create `patch_wl_5.js`**

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

replaceExact(
  "async function loadWoodlogAnalisis() {",

  "async function loadWoodlogRingkasan() {" + R +
  "  const el = document.getElementById('wl-panel-ringkasan');" + R +
  "  if (!el) return;" + R +
  "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const monthYear = (el.querySelector('#wl-ring-month') || {}).value || todayISO().slice(0, 7);" + R +
  "    const { data: completedProjects } = await sb.from('projects')" + R +
  "      .select('id, project_code, end_date, type')" + R +
  "      .in('type', ['woodlog_kapal', 'woodlog_hourly'])" + R +
  "      .not('end_date', 'is', null)" + R +
  "      .order('end_date', { ascending: true });" + R +
  "    const completedIds = (completedProjects || []).map(p => p.id);" + R +
  "    let salaryRows = [];" + R +
  "    if (completedIds.length > 0) {" + R +
  "      const { data: sals } = await sb.from('woodlog_operator_salary')" + R +
  "        .select('*').in('project_id', completedIds).is('paid_batch', null);" + R +
  "      salaryRows = sals || [];" + R +
  "    }" + R +
  "    const { data: kasbons } = await sb.from('woodlog_kasbon').select('*').eq('month_year', monthYear);" + R +
  "    const kasbonMap = {};" + R +
  "    (kasbons || []).forEach(k => { kasbonMap[k.operator_name] = { amount: Number(k.amount), id: k.id }; });" + R +
  "    renderWoodlogRingkasan(salaryRows, completedProjects || [], kasbonMap, monthYear);" + R +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "function renderWoodlogRingkasan(salaryRows, completedProjects, kasbonMap, monthYear) {" + R +
  "  const el = document.getElementById('wl-panel-ringkasan');" + R +
  "  if (!el) return;" + R +
  "  const retainerIds = new Set(completedProjects.slice(-2).map(p => p.id));" + R +
  "  const payableRows = salaryRows.filter(s => !retainerIds.has(s.project_id));" + R +
  "  const retainerRows = salaryRows.filter(s => retainerIds.has(s.project_id));" + R +
  "  const retainerProjects = completedProjects.slice(-2);" + R +
  "  const opSums = {};" + R +
  "  payableRows.forEach(function(s) {" + R +
  "    if (!opSums[s.operator_name]) opSums[s.operator_name] = 0;" + R +
  "    opSums[s.operator_name] += Number(s.salary_amount);" + R +
  "  });" + R +
  "  const allOps = Array.from(new Set([...WL_BANGAU_OPS, ...WL_STD_OPS, ...Object.keys(opSums)]));" + R +
  "  const tableRows = allOps.map(function(op) {" + R +
  "    const sal16 = opSums[op] || 0;" + R +
  "    const kasbon = kasbonMap[op] ? kasbonMap[op].amount : 0;" + R +
  "    const eom = sal16 + 3100000 - kasbon;" + R +
  "    return '<tr>' +" + R +
  "      '<td style=\"font-weight:700;\">' + op + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;color:#1D4ED8;\">Rp ' + sal16.toLocaleString('id') + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">Rp 3.100.000</td>' +" + R +
  "      '<td style=\"text-align:center;\"><input type=\"number\" id=\"wl-kasbon-' + op + '\" class=\"finput\" style=\"width:130px;font-size:13px;\" value=\"' + kasbon + '\" min=\"0\" placeholder=\"0\"></td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;color:#16A34A;\">Rp ' + eom.toLocaleString('id') + '</td>' +" + R +
  "      '</tr>';" + R +
  "  }).join('');" + R +
  "  const retainerInfo = retainerProjects.length > 0" + R +
  "    ? '<div style=\"font-size:12px;color:#D97706;margin-bottom:12px;\">Retainer (belum dibayar): <strong>' + retainerProjects.map(p => p.project_code).join(', ') + '</strong></div>'" + R +
  "    : '';" + R +
  "  const paidCount = payableRows.length;" + R +
  "  el.innerHTML = '<div style=\"margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;\">' +" + R +
  "    '<label style=\"font-size:13px;font-weight:700;\">Bulan:</label>' +" + R +
  "    '<input type=\"month\" id=\"wl-ring-month\" class=\"finput\" style=\"width:160px;\" value=\"' + monthYear + '\" onchange=\"loadWoodlogRingkasan()\">' +" + R +
  "    '</div>' +" + R +
  "    retainerInfo +" + R +
  "    '<div style=\"font-size:13px;color:#64748B;margin-bottom:12px;\">' + paidCount + ' salary row(s) payable (unpaid, completed, excluding last 2 projects).</div>' +" + R +
  "    '<div class=\"table-wrap\" style=\"margin-bottom:16px;\"><table class=\"dt\"><thead><tr><th>Operator</th><th style=\"text-align:right;\">Salary (16th / EOM)</th><th style=\"text-align:right;\">Basic</th><th style=\"text-align:center;\">KASBON</th><th style=\"text-align:right;\">Akhir Bulan</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>' +" + R +
  "    '<div style=\"display:flex;gap:10px;flex-wrap:wrap;\">' +" + R +
  "    '<button onclick=\"markWoodlogPaid(\\'' + monthYear + '\\',\\'mid_month\\')\" class=\"btn-primary\" style=\"background:#1D4ED8;\">Tandai Dibayar (16)</button>' +" + R +
  "    '<button onclick=\"markWoodlogPaid(\\'' + monthYear + '\\',\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Dibayar (Akhir Bulan)</button>' +" + R +
  "    '</div>';" + R +
  "}" + R +
  R +
  "async function markWoodlogPaid(monthYear, paymentType) {" + R +
  "  const el = document.getElementById('wl-panel-ringkasan');" + R +
  "  try {" + R +
  "    await saveWoodlogKasbon(monthYear);" + R +
  "    const { data: completedProjects } = await sb.from('projects')" + R +
  "      .select('id, end_date').in('type', ['woodlog_kapal', 'woodlog_hourly'])" + R +
  "      .not('end_date', 'is', null).order('end_date', { ascending: true });" + R +
  "    const completedIds = (completedProjects || []).map(p => p.id);" + R +
  "    if (completedIds.length === 0) { showToast('Tidak ada proyek yang selesai.'); return; }" + R +
  "    const retainerIds = new Set(completedProjects.slice(-2).map(p => p.id));" + R +
  "    const payableIds = completedIds.filter(id => !retainerIds.has(id));" + R +
  "    if (payableIds.length === 0) { showToast('Tidak ada salary yang bisa ditandai (semua dalam retainer).'); return; }" + R +
  "    const { data: rows } = await sb.from('woodlog_operator_salary')" + R +
  "      .select('id').in('project_id', payableIds).is('paid_batch', null);" + R +
  "    const ids = (rows || []).map(r => r.id);" + R +
  "    if (ids.length === 0) { showToast('Tidak ada salary unpaid untuk ditandai.'); return; }" + R +
  "    if (!confirm('Tandai ' + ids.length + ' salary row(s) sebagai dibayar (' + (paymentType === 'mid_month' ? '16' : 'Akhir Bulan') + ')?')) return;" + R +
  "    const { error } = await sb.from('woodlog_operator_salary').update({ paid_batch: paymentType }).in('id', ids);" + R +
  "    if (error) throw error;" + R +
  "    showToast(ids.length + ' salary ditandai sebagai dibayar.', 'success');" + R +
  "    await loadWoodlogRingkasan();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function saveWoodlogKasbon(monthYear) {" + R +
  "  const allOps = [...WL_BANGAU_OPS, ...WL_STD_OPS];" + R +
  "  const { data: existing } = await sb.from('woodlog_kasbon').select('id, operator_name').eq('month_year', monthYear);" + R +
  "  const existMap = {};" + R +
  "  (existing || []).forEach(k => { existMap[k.operator_name] = k.id; });" + R +
  "  await Promise.all(allOps.map(async function(op) {" + R +
  "    const input = document.getElementById('wl-kasbon-' + op);" + R +
  "    if (!input) return;" + R +
  "    const amount = parseFloat(input.value) || 0;" + R +
  "    if (existMap[op]) {" + R +
  "      await sb.from('woodlog_kasbon').update({ amount: amount }).eq('id', existMap[op]);" + R +
  "    } else if (amount > 0) {" + R +
  "      await sb.from('woodlog_kasbon').insert({ month_year: monthYear, operator_name: op, amount: amount });" + R +
  "    }" + R +
  "  }));" + R +
  "}" + R +
  R +
  "async function loadWoodlogAnalisis() {",

  'WL5: Ringkasan tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL5 patches applied. Running syntax check...');
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

- [ ] **Step 2: Run the patch**

```bash
node patch_wl_5.js
```

- [ ] **Step 3: Test in browser**

Push and navigate to Ringkasan tab. Verify:
- Month selector shows current month
- Retainer info shows last 2 completed projects
- Table shows all operators with 16th/EOM salary + KASBON field
- EOM column auto-adds base Rp 3,100,000 and subtracts KASBON
- "Tandai Dibayar (16)" confirms then marks rows as paid; after refresh those rows disappear from payable set

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wl_5.js
git commit -m "WL5: Woodlog Ringkasan tab — payment calculation + mark-as-paid + kasbon"
git push
```

---

## Task 6: Analisis Biaya Tab

**Files:**
- Modify: `index.html`
- Create: `patch_wl_6.js`

**Interfaces:**
- Consumes: `sb`, `formatDate()`
- Produces: `loadWoodlogAnalisis()`, `renderWoodlogAnalisis()`

**Calculation (Kapal only):**
- Income = `total_mt_m3 × unit_price`
- Fuel cost = `Σ_unit [(solar_awal_pct − solar_akhir_pct) / 100 × 320] + Σ fuel_dispenses.liters_dispensed × harga_solar_rpl`
- Labor = `Σ woodlog_operator_salary.salary_amount × 1.05`
- Profit = Income − Fuel − Labor
- Yield/HM = Profit / Σ(hm_akhir − hm_awal)

- [ ] **Step 1: Create `patch_wl_6.js`**

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

replaceExact(
  "async function loadWoodlogAnalisis() {" + R +
  "}",

  "async function loadWoodlogAnalisis() {" + R +
  "  const el = document.getElementById('wl-panel-analisis');" + R +
  "  if (!el) return;" + R +
  "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data: projects, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code))')" + R +
  "      .eq('type', 'woodlog_kapal').not('end_date', 'is', null)" + R +
  "      .order('end_date', { ascending: false });" + R +
  "    if (error) throw error;" + R +
  "    if (!projects || projects.length === 0) { el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Belum ada proyek kapal woodlog yang selesai.</div>'; return; }" + R +
  "    const ids = projects.map(p => p.id);" + R +
  "    const [{ data: sals }, { data: fills }] = await Promise.all([" + R +
  "      sb.from('woodlog_operator_salary').select('project_id, salary_amount').in('project_id', ids)," + R +
  "      sb.from('fuel_dispenses').select('project_id, liters_dispensed').in('project_id', ids)" + R +
  "    ]);" + R +
  "    const salMap = {}; (sals || []).forEach(s => { salMap[s.project_id] = (salMap[s.project_id] || 0) + Number(s.salary_amount); });" + R +
  "    const fillMap = {}; (fills || []).forEach(f => { fillMap[f.project_id] = (fillMap[f.project_id] || 0) + Number(f.liters_dispensed); });" + R +
  "    renderWoodlogAnalisis(projects, salMap, fillMap);" + R +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "function renderWoodlogAnalisis(projects, salMap, fillMap) {" + R +
  "  const el = document.getElementById('wl-panel-analisis');" + R +
  "  if (!el) return;" + R +
  "  const rows = projects.map(function(p) {" + R +
  "    const income = (p.total_mt_m3 && p.unit_price) ? Number(p.total_mt_m3) * Number(p.unit_price) : 0;" + R +
  "    const pus = p.project_units || [];" + R +
  "    const tankFuel = pus.reduce(function(a, pu) {" + R +
  "      if (pu.solar_awal_pct != null && pu.solar_akhir_pct != null) {" + R +
  "        return a + (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * 320;" + R +
  "      }" + R +
  "      return a;" + R +
  "    }, 0);" + R +
  "    const fillLiters = fillMap[p.id] || 0;" + R +
  "    const fuelCost = (tankFuel + fillLiters) * Number(p.harga_solar_rpl || 0);" + R +
  "    const laborBase = salMap[p.id] || 0;" + R +
  "    const laborCost = laborBase * 1.05;" + R +
  "    const profit = income - fuelCost - laborCost;" + R +
  "    const totalHM = pus.reduce(function(a, pu) {" + R +
  "      return a + ((pu.hm_akhir && pu.hm_awal) ? Number(pu.hm_akhir) - Number(pu.hm_awal) : 0);" + R +
  "    }, 0);" + R +
  "    const yieldHM = totalHM > 0 ? profit / totalHM : 0;" + R +
  "    const fmtRp = function(v) { return 'Rp ' + Math.round(v).toLocaleString('id'); };" + R +
  "    return '<tr>' +" + R +
  "      '<td style=\"font-weight:700;color:#1D4ED8;\">' + p.project_code + '</td>' +" + R +
  "      '<td>' + (p.nama_kapal || '—') + '</td>' +" + R +
  "      '<td>' + formatDate(p.end_date) + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">' + fmtRp(income) + '</td>' +" + R +
  "      '<td style=\"text-align:right;color:#D97706;\">' + fmtRp(fuelCost) + '</td>' +" + R +
  "      '<td style=\"text-align:right;color:#7C3AED;\">' + fmtRp(laborCost) + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;color:' + (profit >= 0 ? '#16A34A' : '#DC2626') + ';\">' + fmtRp(profit) + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-size:12px;\">' + Math.round(yieldHM).toLocaleString('id') + '/HM</td>' +" + R +
  "      '</tr>';" + R +
  "  }).join('');" + R +
  "  el.innerHTML = '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode</th><th>Kapal</th><th>Selesai</th><th style=\"text-align:right;\">Income</th><th style=\"text-align:right;\">Fuel Cost</th><th style=\"text-align:right;\">Labor (+5%)</th><th style=\"text-align:right;\">Profit</th><th style=\"text-align:right;\">Yield/HM</th></tr></thead><tbody>' + rows + '</tbody></table></div>';" + R +
  "}",

  'WL6: Analisis Biaya tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL6 patches applied. Running syntax check...');
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

**Note:** Before running, verify the placeholder `async function loadWoodlogAnalisis() {\r\n}` exists (added in WL2-5). If it was added differently, adjust the anchor string to match exactly.

- [ ] **Step 2: Run the patch**

```bash
node patch_wl_6.js
```

- [ ] **Step 3: Test in browser**

Navigate to Analisis Biaya tab. Verify completed kapal projects appear with Income/Fuel/Labor/Profit columns and correct calculations.

- [ ] **Step 4: Commit**

```bash
git add index.html patch_wl_6.js
git commit -m "WL6: Woodlog Analisis Biaya tab"
git push
```

---

## Task 7: Kontinuitas HM Tab

**Files:**
- Modify: `index.html`
- Create: `patch_wl_7.js`

**Interfaces:**
- Consumes: `sb`, `allUnits`, `WL_ALL_CODES`, `_wlKontinuitasUnitId`, `formatDate()`
- Produces: `renderWoodlogKontinuitas()`, `loadWoodlogKontinuitasUnit(unitId)`

- [ ] **Step 1: Create `patch_wl_7.js`**

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

replaceExact(
  "async function loadWoodlogKontinuitas() {" + R +
  "}",

  "function renderWoodlogKontinuitas() {" + R +
  "  const el = document.getElementById('wl-panel-kontinuitas');" + R +
  "  if (!el) return;" + R +
  "  const wlUnits = (allUnits || []).filter(function(u) { return WL_ALL_CODES.includes(u.code); });" + R +
  "  const opts = wlUnits.map(function(u) {" + R +
  "    return '<option value=\"' + u.id + '\"' + (_wlKontinuitasUnitId === u.id ? ' selected' : '') + '>' + u.code + ' – ' + (u.name || '') + '</option>';" + R +
  "  }).join('');" + R +
  "  el.innerHTML = '<div style=\"margin-bottom:16px;display:flex;align-items:center;gap:12px;\">' +" + R +
  "    '<label style=\"font-size:13px;font-weight:700;\">Unit:</label>' +" + R +
  "    '<select id=\"wl-kontin-unit\" class=\"finput\" style=\"width:220px;\" onchange=\"_wlKontinuitasUnitId=this.value;loadWoodlogKontinuitasUnit(this.value)\"><option value=\"\">-- Pilih Unit --</option>' + opts + '</select>' +" + R +
  "    '</div>' +" + R +
  "    '<div id=\"wl-kontin-wrap\"><div style=\"color:#94A3B8;\">Pilih unit untuk melihat kontinuitas HM.</div></div>';" + R +
  "  if (_wlKontinuitasUnitId) loadWoodlogKontinuitasUnit(_wlKontinuitasUnitId);" + R +
  "}" + R +
  R +
  "async function loadWoodlogKontinuitasUnit(unitId) {" + R +
  "  const wrap = document.getElementById('wl-kontin-wrap');" + R +
  "  if (!wrap || !unitId) return;" + R +
  "  wrap.innerHTML = '<div style=\"color:#94A3B8;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data, error } = await sb.from('project_units')" + R +
  "      .select('*, projects(project_code, type, start_date, end_date, pemberi_kerja)')" + R +
  "      .eq('unit_id', unitId)" + R +
  "      .in('projects.type', ['woodlog_kapal', 'woodlog_hourly'])" + R +
  "      .order('hm_awal', { ascending: true });" + R +
  "    if (error) throw error;" + R +
  "    const rows = (data || []).filter(r => r.projects);" + R +
  "    if (rows.length === 0) { wrap.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Belum ada data proyek woodlog untuk unit ini.</div>'; return; }" + R +
  "    let billedHM = 0, gapHM = 0;" + R +
  "    let tableHTML = '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:12px;\">';" + R +
  "    tableHTML += '<thead><tr style=\"background:#F1F5F9;\"><th style=\"padding:8px 10px;text-align:left;\">Tipe</th><th style=\"padding:8px 10px;text-align:left;\">Proyek</th><th style=\"padding:8px 10px;text-align:right;\">HM Awal</th><th style=\"padding:8px 10px;text-align:right;\">HM Akhir</th><th style=\"padding:8px 10px;text-align:right;\">Durasi</th><th style=\"padding:8px 10px;text-align:left;\">Tanggal</th><th style=\"padding:8px 10px;text-align:left;\">Pemberi Kerja</th><th style=\"padding:8px 10px;text-align:left;\">Gap Reason</th></tr></thead><tbody>';" + R +
  "    rows.forEach(function(row, i) {" + R +
  "      const p = row.projects;" + R +
  "      const hmDur = row.hm_akhir && row.hm_awal ? Number(row.hm_akhir) - Number(row.hm_awal) : 0;" + R +
  "      billedHM += hmDur;" + R +
  "      if (i > 0 && rows[i - 1].hm_akhir) {" + R +
  "        const gap = Number(row.hm_awal) - Number(rows[i - 1].hm_akhir);" + R +
  "        if (gap > 0) {" + R +
  "          gapHM += gap;" + R +
  "          tableHTML += '<tr style=\"background:#FEF2F2;\"><td style=\"padding:8px 10px;font-weight:800;color:#DC2626;\">GAP</td><td style=\"padding:8px 10px;color:#DC2626;\">—</td><td style=\"padding:8px 10px;text-align:right;color:#DC2626;\">' + rows[i-1].hm_akhir + '</td><td style=\"padding:8px 10px;text-align:right;color:#DC2626;\">' + row.hm_awal + '</td><td style=\"padding:8px 10px;text-align:right;font-weight:700;color:#DC2626;\">' + gap.toFixed(1) + ' HM</td><td colspan=\"2\" style=\"padding:8px 10px;\"></td><td style=\"padding:8px 10px;font-size:11px;color:#DC2626;\">' + (row.hm_gap_reason || 'Alasan tidak dicatat') + '</td></tr>';" + R +
  "        }" + R +
  "      }" + R +
  "      tableHTML += '<tr style=\"border-bottom:1px solid #F1F5F9;background:#F0FDF4;\"><td style=\"padding:8px 10px;font-weight:700;color:#16A34A;\">' + (p ? p.type.replace('woodlog_','').toUpperCase() : '?') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;font-weight:700;color:#1D4ED8;\">' + (p ? p.project_code : '?') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;text-align:right;\">' + (row.hm_awal || '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;text-align:right;\">' + (row.hm_akhir || '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;text-align:right;font-weight:700;\">' + (hmDur > 0 ? hmDur.toFixed(1) + ' HM' : '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;white-space:nowrap;\">' + (p ? formatDate(p.start_date) + ' – ' + (p.end_date ? formatDate(p.end_date) : '…') : '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;\">' + (p ? (p.pemberi_kerja || '—') : '—') + '</td>' +" + R +
  "        '<td style=\"padding:8px 10px;font-size:11px;color:#64748B;\"></td></tr>';" + R +
  "    });" + R +
  "    tableHTML += '</tbody></table></div>';" + R +
  "    tableHTML += '<div style=\"margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;\">' +" + R +
  "      '<div style=\"background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:10px 16px;\"><div style=\"font-size:12px;color:#16A34A;font-weight:700;\">Total HM Terbilang</div><div style=\"font-size:20px;font-weight:800;color:#15803D;\">' + billedHM.toFixed(1) + ' HM</div></div>' +" + R +
  "      '<div style=\"background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:10px 16px;\"><div style=\"font-size:12px;color:#DC2626;font-weight:700;\">Total HM Gap</div><div style=\"font-size:20px;font-weight:800;color:#B91C1C;\">' + gapHM.toFixed(1) + ' HM</div></div>' +" + R +
  "      '</div>';" + R +
  "    wrap.innerHTML = tableHTML;" + R +
  "  } catch(e) { wrap.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "async function loadWoodlogKontinuitas() {" + R +
  "}",

  'WL7: Kontinuitas HM tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL7 patches applied. Running syntax check...');
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

- [ ] **Step 2: Run the patch**

```bash
node patch_wl_7.js
```

- [ ] **Step 3: Test in browser**

Navigate to Kontinuitas HM tab. Select a unit (e.g., J02). Confirm it shows the chronological job list with HM awal/akhir, gaps highlighted in red, and total HM summary at the bottom.

- [ ] **Step 4: Final commit**

```bash
git add index.html patch_wl_7.js
git commit -m "WL7: Woodlog Kontinuitas HM tab — complete module"
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ Navigation: new top-level "PROYEK WOODLOG" tab — Task 2
- ✅ Kapal sub-tab: list, add, close, delete — Task 3
- ✅ Hourly sub-tab: list, add, delete — Task 4
- ✅ Ringkasan: 16th/EOM payment + retainer + KASBON + mark-as-paid — Task 5
- ✅ Analisis Biaya: income, fuel, labor (+5%), profit, yield/HM — Task 6
- ✅ Kontinuitas HM: gap detection for J02/J03/J45–J48 — Task 7
- ✅ Bangau salary: BL × 0.9 / 4 × 800, fixed 4 operators — Task 3
- ✅ STD salary: manual tonnage × 750, 6 operators — Task 3
- ✅ Hourly salary: fully manual — Task 4
- ✅ Base Rp 3,100,000 in EOM only — Task 5
- ✅ Project code K{MM}-NN shared counter — Task 3 + 4 via `getNextWoodlogCode()`
- ✅ DB tables: woodlog_operator_salary + woodlog_kasbon — Task 1
- ✅ Fuel shared from fuel_dispenses — Task 6
- ✅ Admin-only (no SPV route added) — by design

**Placeholder scan:** No TBDs or TODOs found.

**Type consistency:** `getNextWoodlogCode(monthYear)` returns `{ code, num }` — used correctly in Task 3 (`submitAddWoodlogKapal(num, monthYear)`) and Task 4 (`submitAddWoodlogHourly(num, monthYear)`). `_wlKapalCache[id]` populated in `loadWoodlogKapal()`, consumed in `toggleWoodlogKapalDetail()` and `openCloseWoodlogKapalModal()`. ✅

**Known implementation note for WL2-2:** The anchor `  </div>\r\n  </div>\r\n</div>\r\n<!-- MODAL OVERLAY -->` must match exactly. If this string is not unique (AMBIGUOUS error), add one more line of context above it: prefix with `  <div id="proyek-panel-kontinuitas" style="display:none;"></div>\r\n` as the leading anchor.

**Known implementation note for WL5 + WL6 + WL7:** The placeholder functions `async function loadWoodlogRingkasan() {}`, `async function loadWoodlogAnalisis() {}`, and `async function loadWoodlogKontinuitas() {}` are stubs added in WL2-5. Tasks 5, 6, and 7 replace these stubs. If WL2 adds them differently (e.g., single-line `{}`), adjust the CRLF anchor in those patch scripts to match exactly what WL2 wrote.
