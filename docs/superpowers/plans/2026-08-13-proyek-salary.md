# Proyek Salary Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bi-monthly salary payment tracking (16th and 31st batches) to the existing Proyek Ringkasan tab, with per-operator breakdown, carryover logic, KASBON deductions, and payment marking.

**Architecture:** Two additive DB changes (one column on `projects`, one new `proyek_kasbon` table); `loadProyekRingkasan` query pivots from `month_year` filter to `end_date` range; `renderProyekRingkasan` is fully rewritten to split into two payment blocks; two new functions `markProyekPaid` and `saveProyekKasbon` are inserted after the render function.

**Tech Stack:** Vanilla JS, Supabase JS SDK, Node.js patch scripts (replaceExact + CRLF), Supabase CLI for DB migrations, Vercel auto-deploy via git push.

## Global Constraints

- NEVER use Edit tool on JS string literals in index.html — use Node.js patch scripts only
- All multiline `from`/`to` strings in patch scripts MUST use `const R = '\r\n'` (file is Windows CRLF)
- `replaceExact(from, to, desc)` exits non-zero if match count ≠ 1 — all anchors must be unique
- Always run `node --check` on extracted `<script>` after patching (included in each patch script)
- Deploy = `git add -A && git commit -m "..."  && git push` → Vercel auto-deploys, no build step
- Working directory for all commands: `C:\Users\upsca\Documents\SERVIS-SAA`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `setup_proyek_salary.sql` | Create | DB migration: `paid_batch` column + `proyek_kasbon` table |
| `patch_ps_1.js` | Create | Rewrite `loadProyekRingkasan()` — new query (end_date range, parallel fetch) |
| `patch_ps_2.js` | Create | Rewrite `renderProyekRingkasan()` + insert `markProyekPaid()` + `saveProyekKasbon()` |
| `index.html` | Modified by patches | Main app file |

---

### Task 1: DB Migration

**Files:**
- Create: `setup_proyek_salary.sql`

**Interfaces:**
- Produces: `projects.paid_batch` column (nullable text, check constraint); `proyek_kasbon` table with RLS

- [ ] **Step 1: Write the SQL migration file**

```sql
-- PS-DB: Proyek salary schema changes

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS paid_batch text
  CHECK (paid_batch IN ('mid_month', 'end_of_month'));

CREATE TABLE IF NOT EXISTS proyek_kasbon (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year    text NOT NULL,
  operator_name text NOT NULL,
  amount        numeric NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE proyek_kasbon ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'proyek_kasbon' AND policyname = 'public_all'
  ) THEN
    CREATE POLICY "public_all" ON proyek_kasbon
      FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;
```

Save to `C:\Users\upsca\Documents\SERVIS-SAA\setup_proyek_salary.sql`

- [ ] **Step 2: Run via Supabase CLI**

```bash
supabase db query --linked --file setup_proyek_salary.sql
```

Expected: JSON output with `"rows": []` (DDL statements return no rows). No error.

- [ ] **Step 3: Verify both changes landed**

Write to `_verify_ps.sql`:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'paid_batch';

SELECT tablename, rowsecurity
FROM pg_tables WHERE tablename = 'proyek_kasbon';
```

Run: `supabase db query --linked --file _verify_ps.sql`

Expected:
```
column_name: paid_batch, data_type: text, is_nullable: YES
tablename: proyek_kasbon, rowsecurity: true
```

Then delete `_verify_ps.sql`.

- [ ] **Step 4: Commit**

```bash
git add setup_proyek_salary.sql
git commit -m "feat: add proyek salary DB migration (paid_batch + proyek_kasbon)"
```

---

### Task 2: Patch PS-1 — Rewrite loadProyekRingkasan

**Files:**
- Create: `patch_ps_1.js`
- Modify: `index.html` (lines ~5742–5752)

**Interfaces:**
- Consumes: `proyekMonthFilter` (global string, format `YYYY-MM`), `WL_ALL_CODES` (global array)
- Produces: calls `renderProyekRingkasan(projects, allUnits, kasbons, monthYear)` with new 4-arg signature

- [ ] **Step 1: Read the exact current function text**

Read `index.html` lines 5742–5752 to confirm the exact `from` string before writing the patch.
The function must start with `async function loadProyekRingkasan() {` and end with `}` after the catch block.

- [ ] **Step 2: Write patch_ps_1.js**

```js
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

// PS1-1: Rewrite loadProyekRingkasan — pivot query to end_date range + parallel fetch
replaceExact(
  "async function loadProyekRingkasan() {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  panel.innerHTML = '<div style=\"color:#64748B;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const { data, error } = await sb.from('projects')" + R +
  "      .select('*, project_units(*, units(code, name, operator_name))')" + R +
  "      .eq('month_year', proyekMonthFilter);" + R +
  "    if (error) throw error;" + R +
  "    renderProyekRingkasan(data || []);" + R +
  "  } catch(e) { panel.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  "async function loadProyekRingkasan() {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  panel.innerHTML = '<div style=\"color:#64748B;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const monthYear = proyekMonthFilter;" + R +
  "    const y = parseInt(monthYear.slice(0, 4), 10);" + R +
  "    const m = parseInt(monthYear.slice(5, 7), 10);" + R +
  "    const firstDay = monthYear + '-01';" + R +
  "    const tmpDate = new Date(y, m, 0);" + R +
  "    const lastDay = tmpDate.getFullYear() + '-' + String(tmpDate.getMonth() + 1).padStart(2, '0') + '-' + String(tmpDate.getDate()).padStart(2, '0');" + R +
  "    const [projRes, unitRes, kasbonRes] = await Promise.all([" + R +
  "      sb.from('projects')" + R +
  "        .select('*, project_units(*, units(code, name, operator_name))')" + R +
  "        .in('type', ['kapal', 'stockpile'])" + R +
  "        .gte('end_date', firstDay)" + R +
  "        .lte('end_date', lastDay)," + R +
  "      sb.from('units').select('code, operator_name')," + R +
  "      sb.from('proyek_kasbon').select('*').eq('month_year', monthYear)" + R +
  "    ]);" + R +
  "    if (projRes.error) throw projRes.error;" + R +
  "    renderProyekRingkasan(projRes.data || [], unitRes.data || [], kasbonRes.data || [], monthYear);" + R +
  "  } catch(e) { panel.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}",

  'PS1-1: rewrite loadProyekRingkasan with end_date range query'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll PS-1 patches applied. Running syntax check...');
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

- [ ] **Step 3: Run the patch**

```bash
node patch_ps_1.js
```

Expected output:
```
OK: PS1-1: rewrite loadProyekRingkasan with end_date range query

All PS-1 patches applied. Running syntax check...
Syntax OK

Done.
```

If MISS: re-read lines 5742–5752 of index.html and adjust the `from` string character-for-character.

- [ ] **Step 4: Commit**

```bash
git add patch_ps_1.js index.html
git commit -m "feat(proyek-salary): rewrite loadProyekRingkasan with end_date range query"
```

---

### Task 3: Patch PS-2 — Rewrite renderProyekRingkasan + add markProyekPaid + saveProyekKasbon

**Files:**
- Create: `patch_ps_2.js`
- Modify: `index.html` (lines ~5754–5817)

**Interfaces:**
- Consumes: `renderProyekRingkasan(projects, allUnits, kasbons, monthYear)` (4 args from Task 2)
- Consumes: `WL_ALL_CODES`, `calcKapalRate()`, `calcKapalTonnageSplit()`, `fmtRp()`, `sb`, `showToast()`
- Produces: `markProyekPaid(paymentType)` — callable from inline onclick buttons in rendered HTML
- Produces: `saveProyekKasbon(monthYear)` — called by `markProyekPaid` for end_of_month batch

- [ ] **Step 1: Read the exact current renderProyekRingkasan text**

Read `index.html` lines 5754–5817 to get the exact `from` string.
The function starts with `function renderProyekRingkasan(projects) {` and ends with the `}` at line 5817, immediately before the blank line and `async function exportProyekExcel()`.

- [ ] **Step 2: Write patch_ps_2.js**

The `from` string is the ENTIRE current `renderProyekRingkasan` function (lines 5754–5817).
The `to` string is the new `renderProyekRingkasan` + `markProyekPaid` + `saveProyekKasbon`.

```js
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

// PS2-1: Full rewrite of renderProyekRingkasan + insert markProyekPaid + saveProyekKasbon
// FROM: entire current renderProyekRingkasan body (read lines 5754-5817 for exact text)
// TO: new 4-arg render function + two new payment functions

const fromRender =
  "function renderProyekRingkasan(projects) {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  const operatorMap = {};" + R +
  "  projects.forEach(p => {" + R +
  "    const units = p.project_units || [];" + R +
  "    if (p.type === 'kapal') {" + R +
  "      const rate = calcKapalRate(p.ship_number_in_month || 1);" + R +
  "      const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);" + R +
  "      split.forEach(u => {" + R +
  "        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0, stockpileHM: 0, unitCode: u.units ? u.units.code : '', details: [] };" + R +
  "        const kamt = u.allocatedMt * rate;" + R +
  "        operatorMap[key].kapal += kamt;" + R +
  "        operatorMap[key].details.push({ code: p.project_code, type: 'Kapal', amount: kamt });" + R +
  "      });" + R +
  "    } else {" + R +
  "      units.forEach(u => {" + R +
  "        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0, stockpileHM: 0, unitCode: u.units ? u.units.code : '', details: [] };" + R +
  "        const sHM = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0;" + R +
  "        const samt = sHM * 35000;" + R +
  "        operatorMap[key].stockpile += samt;" + R +
  "        operatorMap[key].stockpileHM += sHM;" + R +
  "        operatorMap[key].details.push({ code: p.project_code, type: 'STK', amount: samt, hm: sHM });" + R +
  "      });" + R +
  "    }" + R +
  "  });" + R +
  "  let h = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;\">';" + R +
  "  h += '<div style=\"font-size:15px;font-weight:700;color:#1E293B;\">Ringkasan Gaji</div>';" + R +
  "  h += '<div style=\"display:flex;gap:8px;align-items:center;\">';" + R +
  "  h += '<input type=\"month\" class=\"finput\" style=\"padding:6px 10px;font-size:13px;\" value=\"' + proyekMonthFilter + '\" onchange=\"proyekMonthFilter=this.value;loadProyekRingkasan();\">';" + R +
  "  h += '<button onclick=\"exportProyekExcel()\" class=\"btn-primary\" style=\"padding:8px 14px;font-size:13px;\">Export Excel</button>';" + R +
  "  h += '</div></div>';" + R +
  "  if (Object.keys(operatorMap).length === 0) {" + R +
  "    h += '<div style=\"background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;\">Tidak ada data untuk bulan ini.</div>';" + R +
  "    panel.innerHTML = h; return;" + R +
  "  }" + R +
  "  h += '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;\">';" + R +
  "  h += '<thead><tr style=\"background:#F1F5F9;\"><th style=\"padding:10px 12px;text-align:left;font-weight:700;color:#475569;\">Unit / Operator</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Kapal</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Stockpile</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">HM Stockpile</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Total Kerja</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Pokok</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Grand Total</th></tr></thead><tbody>';" + R +
  "  let grandK = 0, grandS = 0, grandSTKHM = 0;" + R +
  "  Object.entries(operatorMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name, sal]) => {" + R +
  "    const totalKerja = sal.kapal + sal.stockpile;" + R +
  "    const grandTotal = totalKerja + 3100000;" + R +
  "    grandK += sal.kapal; grandS += sal.stockpile; grandSTKHM += sal.stockpileHM;" + R +
  "    const unitLabel = sal.unitCode ? sal.unitCode + ' / ' + name : name;" + R +
  "    h += '<tr style=\"border-bottom:1px solid #F1F5F9;\">';" + R +
  "    h += '<td style=\"padding:10px 12px;font-weight:600;\">' + unitLabel + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(sal.kapal) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(sal.stockpile) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + (sal.stockpileHM > 0 ? sal.stockpileHM.toFixed(1) + ' HM' : '-') + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;font-weight:700;\">' + fmtRp(totalKerja) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;color:#64748B;\">Rp 3.100.000</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grandTotal) + '</td></tr>';" + R +
  "    if (sal.details.length > 0) {" + R +
  "      const detailText = sal.details.map(function(d) { return d.code + ' (' + d.type + (d.hm != null ? ' ' + d.hm.toFixed(1) + 'HM' : '') + '): ' + fmtRp(d.amount); }).join(' | ');" + R +
  "      h += '<tr style=\"background:#F8FAFC;\"><td colspan=\"7\" style=\"padding:3px 12px 6px 20px;font-size:11px;color:#64748B;\">' + detailText + '</td></tr>';" + R +
  "    }" + R +
  "  });" + R +
  "  const allTotal = grandK + grandS;" + R +
  "  h += '<tr style=\"background:#F1F5F9;font-weight:800;\"><td style=\"padding:10px 12px;\">TOTAL</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(grandK) + '</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(grandS) + '</td><td style=\"padding:10px 12px;text-align:right;\">' + grandSTKHM.toFixed(1) + ' HM</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(allTotal) + '</td><td style=\"padding:10px 12px;\"></td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(allTotal + 3100000 * Object.keys(operatorMap).length) + '</td></tr>';" + R +
  "  h += '</tbody></table></div>';" + R +
  "  panel.innerHTML = h;" + R +
  "  panel._ringkasanProjects = projects;" + R +
  "}";

const toRender =
  "function renderProyekRingkasan(projects, allUnits, kasbons, monthYear) {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  panel._ringkasanProjects = projects;" + R +
  "  const proyekOps = (allUnits || []).filter(function(u) { return !WL_ALL_CODES.includes(u.code); });" + R +
  "  const opNames = [];" + R +
  "  proyekOps.forEach(function(u) { if (u.operator_name && opNames.indexOf(u.operator_name) < 0) opNames.push(u.operator_name); });" + R +
  "  opNames.sort();" + R +
  "  const kasbonMap = {};" + R +
  "  (kasbons || []).forEach(function(k) { kasbonMap[k.operator_name] = { amount: Number(k.amount), id: k.id }; });" + R +
  "  function dayOf(d) { return d ? parseInt(d.slice(8, 10), 10) : 0; }" + R +
  "  function isCarryover(p) { return p.month_year && p.end_date && p.month_year.slice(0, 7) !== p.end_date.slice(0, 7); }" + R +
  "  const unpaid = projects.filter(function(p) { return !p.paid_batch; });" + R +
  "  const batch16 = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) <= 15; });" + R +
  "  const batch31Kapal = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) > 15; });" + R +
  "  const batch31Stk = unpaid.filter(function(p) { return p.type === 'stockpile'; });" + R +
  "  panel._batch16Ids = batch16.map(function(p) { return p.id; });" + R +
  "  panel._batch31Ids = batch31Kapal.concat(batch31Stk).map(function(p) { return p.id; });" + R +
  "  panel._monthYear = monthYear;" + R +
  "  function buildOpMap(projs) {" + R +
  "    const opMap = {};" + R +
  "    projs.forEach(function(p) {" + R +
  "      if (p.type === 'kapal') {" + R +
  "        const rate = isCarryover(p) ? 175 : calcKapalRate(p.ship_number_in_month || 1);" + R +
  "        const split = calcKapalTonnageSplit(p.project_units || [], p.total_mt_m3 || 0);" + R +
  "        split.forEach(function(u) {" + R +
  "          const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "          if (!opMap[key]) opMap[key] = { total: 0, rows: [] };" + R +
  "          const amt = u.allocatedMt * rate;" + R +
  "          opMap[key].total += amt;" + R +
  "          opMap[key].rows.push(p.project_code + (isCarryover(p) ? ' [CO]' : '') + ' @' + rate + '/MT: ' + fmtRp(amt));" + R +
  "        });" + R +
  "      } else {" + R +
  "        (p.project_units || []).forEach(function(u) {" + R +
  "          const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "          if (!opMap[key]) opMap[key] = { total: 0, rows: [] };" + R +
  "          const hm = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0;" + R +
  "          const amt = hm * 35000;" + R +
  "          opMap[key].total += amt;" + R +
  "          opMap[key].rows.push(p.project_code + ' STK ' + hm.toFixed(1) + 'HM: ' + fmtRp(amt));" + R +
  "        });" + R +
  "      }" + R +
  "    });" + R +
  "    return opMap;" + R +
  "  }" + R +
  "  const opMap16 = buildOpMap(batch16);" + R +
  "  const opMap31 = buildOpMap(batch31Kapal.concat(batch31Stk));" + R +
  "  let h = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;\">';" + R +
  "  h += '<div style=\"font-size:15px;font-weight:700;color:#1E293B;\">Ringkasan Gaji</div>';" + R +
  "  h += '<div style=\"display:flex;gap:8px;align-items:center;\">';" + R +
  "  h += '<input type=\"month\" id=\"proy-ring-month\" class=\"finput\" style=\"padding:6px 10px;font-size:13px;\" value=\"' + monthYear + '\" onchange=\"proyekMonthFilter=this.value;loadProyekRingkasan();\">';" + R +
  "  h += '<button onclick=\"exportProyekExcel()\" class=\"btn-primary\" style=\"padding:8px 14px;font-size:13px;\">Export Excel</button>';" + R +
  "  h += '</div></div>';" + R +
  "  h += '<div style=\"background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;margin-bottom:20px;\">';" + R +
  "  h += '<div style=\"font-size:14px;font-weight:800;color:#1D4ED8;margin-bottom:12px;\">Batch 16 — Kapal Selesai Tgl 1-15</div>';" + R +
  "  if (batch16.length === 0) {" + R +
  "    h += '<div style=\"color:#64748B;font-size:13px;\">Tidak ada kapal selesai tgl 1-15 bulan ini.</div>';" + R +
  "  } else {" + R +
  "    h += '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;\"><thead><tr style=\"background:#DBEAFE;\"><th style=\"padding:8px 10px;text-align:left;\">Operator</th><th style=\"padding:8px 10px;text-align:left;\">Detail Proyek</th><th style=\"padding:8px 10px;text-align:right;\">Total Gaji</th></tr></thead><tbody>';" + R +
  "    Object.entries(opMap16).sort(function(a, b) { return a[0].localeCompare(b[0]); }).forEach(function(entry) {" + R +
  "      const name = entry[0]; const s = entry[1];" + R +
  "      h += '<tr style=\"border-bottom:1px solid #BFDBFE;\"><td style=\"padding:8px 10px;font-weight:600;\">' + name + '</td>';" + R +
  "      h += '<td style=\"padding:8px 10px;font-size:11px;color:#64748B;\">' + s.rows.join('<br>') + '</td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:right;font-weight:700;\">' + fmtRp(s.total) + '</td></tr>';" + R +
  "    });" + R +
  "    h += '</tbody></table></div>';" + R +
  "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'mid_month\\')\" class=\"btn-primary\" style=\"background:#1D4ED8;\">Tandai Lunas Batch 16</button></div>';" + R +
  "  }" + R +
  "  h += '</div>';" + R +
  "  h += '<div style=\"background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px;\">';" + R +
  "  h += '<div style=\"font-size:14px;font-weight:800;color:#16A34A;margin-bottom:12px;\">Batch 31 — Kapal Tgl 16-31 + Semua Stockpile + Gaji Pokok</div>';" + R +
  "  if (batch31Kapal.length === 0 && batch31Stk.length === 0 && opNames.length === 0) {" + R +
  "    h += '<div style=\"color:#64748B;font-size:13px;\">Tidak ada proyek selesai untuk batch akhir bulan.</div>';" + R +
  "  } else {" + R +
  "    h += '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;\"><thead><tr style=\"background:#DCFCE7;\"><th style=\"padding:8px 10px;text-align:left;\">Operator</th><th style=\"padding:8px 10px;text-align:right;\">Gaji Proyek</th><th style=\"padding:8px 10px;text-align:right;\">Gaji Pokok</th><th style=\"padding:8px 10px;text-align:center;\">Kasbon</th><th style=\"padding:8px 10px;text-align:right;\">Grand Total</th></tr></thead><tbody>';" + R +
  "    opNames.forEach(function(name) {" + R +
  "      const s = opMap31[name] || { total: 0, rows: [] };" + R +
  "      const kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0;" + R +
  "      const grandTotal = s.total + 3100000 - kasbon;" + R +
  "      const safeId = name.replace(/\\s+/g, '_');" + R +
  "      h += '<tr style=\"border-bottom:1px solid #BBF7D0;\"><td style=\"padding:8px 10px;font-weight:600;\">' + name + '</td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:right;\">';" + R +
  "      if (s.rows.length > 0) h += '<span style=\"font-size:11px;color:#64748B;\">' + s.rows.join('<br>') + '</span><br>';" + R +
  "      h += '<strong>' + fmtRp(s.total) + '</strong></td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:right;color:#64748B;\">Rp 3.100.000</td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:center;\"><input id=\"proy-kasbon-' + safeId + '\" data-op=\"' + name + '\" type=\"number\" class=\"finput\" style=\"width:110px;text-align:right;\" value=\"' + kasbon + '\" placeholder=\"0\"></td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grandTotal) + '</td></tr>';" + R +
  "    });" + R +
  "    h += '</tbody></table></div>';" + R +
  "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Lunas Batch 31</button></div>';" + R +
  "  }" + R +
  "  h += '</div>';" + R +
  "  panel.innerHTML = h;" + R +
  "}" + R +
  R +
  "async function markProyekPaid(paymentType) {" + R +
  "  try {" + R +
  "    const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "    const monthYear = panel._monthYear;" + R +
  "    const ids = paymentType === 'mid_month' ? (panel._batch16Ids || []) : (panel._batch31Ids || []);" + R +
  "    if (ids.length === 0) { showToast('Tidak ada proyek untuk ditandai.'); return; }" + R +
  "    if (paymentType === 'end_of_month') await saveProyekKasbon(monthYear);" + R +
  "    const label = paymentType === 'mid_month' ? 'Batch 16' : 'Batch 31';" + R +
  "    if (!confirm('Tandai ' + ids.length + ' proyek sebagai dibayar (' + label + ')?')) return;" + R +
  "    const { error } = await sb.from('projects').update({ paid_batch: paymentType }).in('id', ids);" + R +
  "    if (error) throw error;" + R +
  "    showToast(ids.length + ' proyek ditandai sebagai dibayar.', 'success');" + R +
  "    await loadProyekRingkasan();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function saveProyekKasbon(monthYear) {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  const inputs = panel.querySelectorAll('[id^=\"proy-kasbon-\"]');" + R +
  "  const { data: existing } = await sb.from('proyek_kasbon').select('id, operator_name').eq('month_year', monthYear);" + R +
  "  const existMap = {};" + R +
  "  (existing || []).forEach(function(k) { existMap[k.operator_name] = k.id; });" + R +
  "  await Promise.all(Array.from(inputs).map(async function(input) {" + R +
  "    const op = input.dataset.op;" + R +
  "    if (!op) return;" + R +
  "    const amount = parseFloat(input.value) || 0;" + R +
  "    if (existMap[op]) {" + R +
  "      await sb.from('proyek_kasbon').update({ amount: amount }).eq('id', existMap[op]);" + R +
  "    } else if (amount > 0) {" + R +
  "      await sb.from('proyek_kasbon').insert({ month_year: monthYear, operator_name: op, amount: amount });" + R +
  "    }" + R +
  "  }));" + R +
  "}";

replaceExact(fromRender, toRender, 'PS2-1: rewrite renderProyekRingkasan + add markProyekPaid + saveProyekKasbon');

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll PS-2 patches applied. Running syntax check...');
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

**Critical note on the `fromRender` string:** Every line in the `from` string must match the file exactly, including escaped quote characters. The file at lines 5754–5817 uses backslash-escaped double quotes inside template strings like `\"color:#64748B;\"`. Copy these exactly. If the patch reports MISS, read the file again at those exact lines and compare character by character.

- [ ] **Step 3: Run the patch**

```bash
node patch_ps_2.js
```

Expected:
```
OK: PS2-1: rewrite renderProyekRingkasan + add markProyekPaid + saveProyekKasbon

All PS-2 patches applied. Running syntax check...
Syntax OK

Done.
```

If MISS: Read `index.html` lines 5754–5817 carefully. Check for any differences in spacing, escaping, or line content vs the `fromRender` string. Fix the `fromRender` string and re-run.

If SYNTAX ERROR: Check the `toRender` string for unbalanced quotes or braces.

- [ ] **Step 4: Verify the three new functions exist in index.html**

```bash
node -e "const c=require('fs').readFileSync('index.html','utf8'); ['renderProyekRingkasan(projects, allUnits','markProyekPaid','saveProyekKasbon'].forEach(f=>{console.log(c.includes(f)?'FOUND: '+f:'MISSING: '+f);})"
```

Expected: all three lines say `FOUND`.

- [ ] **Step 5: Commit**

```bash
git add patch_ps_2.js index.html
git commit -m "feat(proyek-salary): add batch16/31 payment blocks, markProyekPaid, saveProyekKasbon"
```

---

### Task 4: Deploy and QA

**Files:** No new files — git push triggers Vercel deploy.

**Interfaces:**
- Consumes: all functions from Tasks 1–3
- Produces: live feature at servis-saa.vercel.app

- [ ] **Step 1: Push to deploy**

```bash
git push
```

Wait ~30–60 seconds for Vercel to build and deploy. Check Vercel dashboard or watch for deployment completion.

- [ ] **Step 2: Open the app and navigate to Proyek → Ringkasan tab**

Open `https://servis-saa.vercel.app`, log in as admin, click "Proyek" in the nav, then click the "Ringkasan" tab.

- [ ] **Step 3: Verify basic render**

Expected: Two colored blocks appear — blue "Batch 16" block and green "Batch 31" block. Month picker shows current month. Export Excel button still present.

If the page shows a JS error or blank panel: open browser DevTools Console, copy the error, and fix accordingly.

- [ ] **Step 4: QA — Batch 16 (Kapal day 1-15)**

Test with a kapal project that has `end_date` set to a day 1-15 of the current month:
- Expected: project appears in the blue Batch 16 block
- Expected: operator name and salary amount shown with detail row (project_code @rate/MT: Rp X)
- Expected: "Tandai Lunas Batch 16" button visible

- [ ] **Step 5: QA — Batch 31 (Kapal day 16-31)**

Test with a kapal project that has `end_date` set to a day 16+ of the current month:
- Expected: project appears in the green Batch 31 block
- Expected: all proyek operators listed with KASBON inputs (even those with no projects that month)
- Expected: Gaji Pokok column shows Rp 3.100.000 per operator
- Expected: Grand Total = Gaji Proyek + 3,100,000 - Kasbon

- [ ] **Step 6: QA — Stockpile always in Batch 31**

Close a stockpile project with an `end_date` on day 5 of the current month:
- Expected: project appears in Batch 31 block only (not Batch 16)
- Expected: stockpile salary shows as `[project_code] STK [X.X]HM: Rp Y` in operator's detail

- [ ] **Step 7: QA — Carryover detection**

Find or create a kapal project where `month_year` (e.g. `2026-07`) differs from `end_date` month (e.g. `2026-08-10`):
- Expected: project appears in Batch 16 of August's Ringkasan
- Expected: rate label shows `@175/MT` (not the original rate)
- Expected: `[CO]` badge in the detail row

- [ ] **Step 8: QA — Mark Batch 16 paid**

With at least one project in Batch 16: click "Tandai Lunas Batch 16"
- Expected: confirm dialog shows count of projects
- Expected: after confirming, Batch 16 block refreshes showing "Tidak ada kapal selesai tgl 1-15 bulan ini"
- Expected: in Supabase dashboard, the project's `paid_batch` column = `'mid_month'`
- Expected: project does NOT reappear on page refresh

- [ ] **Step 9: QA — Mark Batch 31 paid with KASBON**

Enter a KASBON value for one operator (e.g. 500000), then click "Tandai Lunas Batch 31":
- Expected: KASBON saved to `proyek_kasbon` table (verify in Supabase dashboard: month_year, operator_name, amount)
- Expected: projects marked `paid_batch = 'end_of_month'`
- Expected: Batch 31 block clears of those projects

- [ ] **Step 10: QA — No regression on other tabs**

Click through Kapal tab, Stockpile tab, Analisis Biaya tab, Kontinuitas HM tab:
- Expected: all tabs load without errors
- Expected: Kapal and Stockpile lists still show all projects (paid_batch column present but doesn't affect list display)

- [ ] **Step 11: QA — Export Excel still works**

On the Ringkasan tab: click "Export Excel"
- Expected: Excel file downloads with both Kapal and Stockpile sheets
- Expected: file contains the projects that have `end_date` in the selected month (paid and unpaid)

- [ ] **Step 12: QA — Woodlog module unaffected**

Click "Proyek Woodlog" in the nav, open Ringkasan tab:
- Expected: Woodlog Ringkasan loads normally, woodlog salary rows display correctly
- Expected: Tandai Dibayar buttons work as before

- [ ] **Step 13: Final commit if any hotfixes were applied during QA**

```bash
git add index.html
git commit -m "fix(proyek-salary): QA hotfixes"
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ paid on 16th and 31st → Task 3 (two blocks in renderProyekRingkasan)
- ✅ 16th = ships done 1-15 → `batch16 = unpaid.filter(kapal && dayOf <= 15)`
- ✅ 31st = rest + Base → `batch31Kapal + batch31Stk + 3.1M per operator`
- ✅ Stockpile always 31st → `batch31Stk = unpaid.filter(stockpile)` (no day filter)
- ✅ Carryover at 175/MT → `isCarryover(p) ? 175 : calcKapalRate(...)` in buildOpMap
- ✅ No retainer → no retainer logic added
- ✅ KASBON per operator → `proyek_kasbon` table + inputs in Block B
- ✅ Operators from units table (excluding WL) → `(allUnits).filter(!WL_ALL_CODES.includes(u.code))`
- ✅ Payment marking → `markProyekPaid` updates `projects.paid_batch`
- ✅ Paid projects disappear → query has no `paid_batch` filter; render filters to `unpaid = projects.filter(!p.paid_batch)`
- ✅ Export Excel unbroken → `_ringkasanProjects` still set on panel
- ✅ Other tabs unaffected → only `loadProyekRingkasan` and `renderProyekRingkasan` modified

**Placeholder scan:** None found.

**Type consistency:** `renderProyekRingkasan(projects, allUnits, kasbons, monthYear)` — 4 args defined in Task 2 (`loadProyekRingkasan`), consumed in Task 3 (`renderProyekRingkasan` signature). `markProyekPaid(paymentType)` — defined in Task 3, called from inline onclick in Task 3's rendered HTML. All consistent.
