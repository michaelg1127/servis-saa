# Fuel Tracking (BBM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete admin-only Fuel Tracking (BBM) screen to servis-saa.vercel.app covering 3 storage tanks, drum fills, unit dispenses, tank-to-tank transfers, and L/Hr consumption tracking.

**Architecture:** Single HTML file (`index.html`) with embedded Tailwind + Supabase JS SDK. All changes via Node.js patch scripts (never the Edit tool — it corrupts JS string apostrophes). 4 new Supabase tables. New "BBM" admin sidebar screen with 5 sub-tabs.

**Tech Stack:** Vanilla JS, Tailwind CDN, Supabase JS SDK v2, Node.js patch scripts, git → Vercel auto-deploy.

## Global Constraints

- File: `C:\Users\upsca\Documents\SERVIS-SAA\index.html` — single file, all HTML + JS
- NEVER use Edit tool for JS string changes — always write a Node.js patch script, run it with `node patch_bbm_N.js`, verify, delete it
- After every patch, run JS syntax check: extract `<script>` block, pass to `new Function()`
- Supabase project ref: `xpecefriamslzidlcsuj`
- Supabase Management API PAT: `REDACTED_SUPABASE_PAT`
- Deploy: `git push origin master` (Vercel auto-deploys from master)
- Admin-only: all fuel DB operations require `role = 'admin'` RLS policy
- Bunker code format: `X` + integer, no leading zeros. X1–X25 used on paper. Next = X26
- Transfer code format: `{bunker_code}-{seq}` e.g. X26-1, X26-2
- Tank names in DB: `hijau` / `merah` / `kuning` (lowercase)
- Tank capacities: hijau=8000L, merah=1500L, kuning=1500L
- Drum volume default: 200L (admin can override per drum)
- L/Hr = liters_dispensed / (hm_at_fill - previous_hm_at_fill for same unit); null if no prior fill

---

## Task 1: Create DB Tables + RLS Policies

**Files:**
- Create (temp): `C:\Users\upsca\Documents\SERVIS-SAA\schema_bbm.sql` (keep for reference)

**Goal:** 4 new Supabase tables with RLS.

- [ ] **Step 1: Write schema file**

Create `C:\Users\upsca\Documents\SERVIS-SAA\schema_bbm.sql` with this exact content:

```sql
-- Fuel Tracking Tables
CREATE TABLE IF NOT EXISTS public.fuel_bunkers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bunker_code   text NOT NULL UNIQUE,
  delivery_date date NOT NULL,
  tank_name     text NOT NULL CHECK (tank_name IN ('hijau','merah','kuning')),
  total_liters  numeric NOT NULL CHECK (total_liters > 0),
  notes         text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_transfers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code text NOT NULL UNIQUE,
  bunker_id     uuid NOT NULL REFERENCES public.fuel_bunkers(id),
  drum_name     text NOT NULL,
  volume_liters numeric NOT NULL CHECK (volume_liters > 0),
  filled_date   date NOT NULL,
  status        text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged','deployed')),
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_dispenses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id      uuid NOT NULL UNIQUE REFERENCES public.fuel_transfers(id),
  unit_id          uuid NOT NULL REFERENCES public.units(id),
  hm_at_fill       numeric NOT NULL,
  dispense_date    date NOT NULL,
  dispense_time    time,
  liters_dispensed numeric NOT NULL,
  l_per_hr         numeric,
  notes            text,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_tank_transfers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_tank     text NOT NULL CHECK (from_tank IN ('hijau','merah','kuning')),
  to_tank       text NOT NULL CHECK (to_tank IN ('hijau','merah','kuning')),
  volume_liters numeric NOT NULL CHECK (volume_liters > 0),
  transfer_date date NOT NULL,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  CHECK (from_tank <> to_tank)
);

ALTER TABLE public.fuel_bunkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_dispenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_tank_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_fuel_bunkers" ON public.fuel_bunkers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_fuel_transfers" ON public.fuel_transfers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_fuel_dispenses" ON public.fuel_dispenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_fuel_tank_transfers" ON public.fuel_tank_transfers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
```

- [ ] **Step 2: Apply schema via Management API**

```bash
SQL=$(cat schema_bbm.sql | tr -d '\n' | sed "s/'/'\\''/g")
curl -s -X POST "https://api.supabase.com/v1/projects/xpecefriamslzidlcsuj/database/query" \
  -H "Authorization: Bearer REDACTED_SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$(cat schema_bbm.sql)\"}"
```

If the curl approach fails with escaping, run each CREATE TABLE block separately using the PowerShell tool:

```powershell
$sql = @"
CREATE TABLE IF NOT EXISTS public.fuel_bunkers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bunker_code text NOT NULL UNIQUE,
  delivery_date date NOT NULL,
  tank_name text NOT NULL CHECK (tank_name IN ('hijau','merah','kuning')),
  total_liters numeric NOT NULL CHECK (total_liters > 0),
  notes text,
  created_at timestamptz DEFAULT now()
);
"@
$body = @{ query = $sql } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/xpecefriamslzidlcsuj/database/query" `
  -Method POST -Headers @{ Authorization = "Bearer REDACTED_SUPABASE_PAT" } `
  -ContentType "application/json" -Body $body
```

Run this for each table and then the RLS section.

- [ ] **Step 3: Verify all 4 tables exist**

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/xpecefriamslzidlcsuj/database/query" \
  -H "Authorization: Bearer REDACTED_SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT table_name FROM information_schema.tables WHERE table_schema='\''public'\'' AND table_name LIKE '\''fuel_%'\'' ORDER BY table_name;"}'
```

Expected output:
```json
[{"table_name":"fuel_bunkers"},{"table_name":"fuel_dispenses"},{"table_name":"fuel_tank_transfers"},{"table_name":"fuel_transfers"}]
```

- [ ] **Step 4: Commit schema file**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA"
git add schema_bbm.sql
git commit -m "feat: create fuel tracking DB tables and RLS policies"
```

---

## Task 2: Nav Link + Screen Skeleton + Base JS

**Files:**
- Modify: `index.html`
- Create (temp): `patch_bbm_2.js`

**Goal:** Add BBM sidebar link, the `admin-screen-bbm` div with 5 static panel containers and form HTML, global state vars, and `switchBBMTab()` + `switchAdmin()` updates.

- [ ] **Step 1: Write patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_bbm_2.js`:

```javascript
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');

// ── 1. Add BBM sidebar link after Catat Servis slink ─────────────────────────
const oldSlink = '<div class="slink" onclick="switchAdmin(\'catat\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>Catat Servis</div>';

const newSlink = oldSlink + '\n    <div class="slink" onclick="switchAdmin(\'bbm\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/><line x1="7" y1="5" x2="7" y2="5"/><line x1="7" y1="12" x2="7" y2="12"/></svg>BBM</div>';

if (!html.includes(oldSlink)) { console.error('ERROR: slink not found'); process.exit(1); }
html = html.replace(oldSlink, newSlink);
console.log('pass 1 ok - sidebar link');

// ── 2. Add admin-screen-bbm before modal overlay ─────────────────────────────
const oldModal = '<!-- MODAL OVERLAY -->';
const bbmScreen =
'<div id="admin-screen-bbm" class="dscreen">\n' +
'  <div style="font-size:22px;font-weight:800;color:#1E293B;margin-bottom:16px;">BBM — Fuel Tracking</div>\n' +
'  <div id="bbm-tabs" style="display:flex;gap:0;border-bottom:2px solid #E2E8F0;margin-bottom:20px;flex-wrap:wrap;">\n' +
'    <button id="bbm-tab-status" onclick="switchBBMTab(\'status\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#1D4ED8;border-bottom:3px solid #1D4ED8;margin-bottom:-2px;">Status</button>\n' +
'    <button id="bbm-tab-terima" onclick="switchBBMTab(\'terima\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Terima BBM</button>\n' +
'    <button id="bbm-tab-isidrum" onclick="switchBBMTab(\'isidrum\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Isi Drum</button>\n' +
'    <button id="bbm-tab-distribusi" onclick="switchBBMTab(\'distribusi\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Distribusi</button>\n' +
'    <button id="bbm-tab-riwayat" onclick="switchBBMTab(\'riwayat\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Riwayat</button>\n' +
'  </div>\n' +
'  <div id="bbm-panel-status"></div>\n' +
'  <div id="bbm-panel-terima" style="display:none;max-width:560px;">\n' +
'    <div style="background:white;border-radius:16px;padding:24px;box-shadow:0 1px 6px rgba(0,0,0,0.07);">\n' +
'      <div id="bbm-terima-preview" style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#1D4ED8;font-weight:600;"></div>\n' +
'      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Tanggal Terima <span style="color:#EF4444;">*</span></label><input type="date" id="bbm-terima-date" class="finput" onchange="onTerimaChange()"></div>\n' +
'      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Tanki Tujuan <span style="color:#EF4444;">*</span></label><select id="bbm-terima-tank" class="finput" onchange="onTerimaChange()"><option value="">-- Pilih Tanki --</option><option value="hijau">Tanki Hijau (8.000 L)</option><option value="merah">Tanki Merah (1.500 L)</option><option value="kuning">Tanki Kuning (1.500 L)</option></select></div>\n' +
'      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Volume (L) <span style="color:#EF4444;">*</span></label><input type="number" id="bbm-terima-vol" class="finput" placeholder="Contoh: 8000" min="1" onchange="onTerimaChange()"></div>\n' +
'      <div style="margin-bottom:20px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Catatan</label><textarea id="bbm-terima-notes" class="finput" rows="2" placeholder="Opsional..."></textarea></div>\n' +
'      <button onclick="submitFuelBunker()" class="btn-primary" style="width:100%;padding:13px;font-size:15px;font-weight:700;">Simpan Bunker</button>\n' +
'    </div>\n' +
'  </div>\n' +
'  <div id="bbm-panel-isidrum" style="display:none;max-width:600px;">\n' +
'    <div style="background:white;border-radius:16px;padding:24px;box-shadow:0 1px 6px rgba(0,0,0,0.07);">\n' +
'      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Pilih Bunker <span style="color:#EF4444;">*</span></label><select id="bbm-drum-bunker" class="finput" onchange="updateIsiPreview()"><option value="">-- Pilih Bunker --</option></select></div>\n' +
'      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Tanggal Isi <span style="color:#EF4444;">*</span></label><input type="date" id="bbm-drum-date" class="finput"></div>\n' +
'      <div id="bbm-drum-rows" style="margin-bottom:14px;"></div>\n' +
'      <button onclick="addDrumRow()" style="background:#EFF6FF;color:#1D4ED8;border:1.5px dashed #93C5FD;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;width:100%;margin-bottom:14px;">+ Tambah Drum</button>\n' +
'      <div id="bbm-drum-preview" style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#166534;font-weight:600;display:none;"></div>\n' +
'      <button onclick="submitDrumFills()" class="btn-primary" style="width:100%;padding:13px;font-size:15px;font-weight:700;">Simpan Isi Drum</button>\n' +
'    </div>\n' +
'  </div>\n' +
'  <div id="bbm-panel-distribusi" style="display:none;max-width:560px;">\n' +
'    <div style="background:white;border-radius:16px;padding:24px;box-shadow:0 1px 6px rgba(0,0,0,0.07);">\n' +
'      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Pilih Drum (Staged) <span style="color:#EF4444;">*</span></label><select id="bbm-dist-drum" class="finput"><option value="">-- Pilih Drum --</option></select></div>\n' +
'      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Pilih Unit <span style="color:#EF4444;">*</span></label><select id="bbm-dist-unit" class="finput" onchange="onDistribusiUnitChange(this.value)"><option value="">-- Pilih Unit --</option></select></div>\n' +
'      <div id="bbm-dist-last-info" style="display:none;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#475569;"></div>\n' +
'      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">\n' +
'        <div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">HM saat Isi <span style="color:#EF4444;">*</span></label><input type="number" id="bbm-dist-hm" class="finput" placeholder="HM" oninput="onDistribusiHMChange()"></div>\n' +
'        <div><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Tanggal <span style="color:#EF4444;">*</span></label><input type="date" id="bbm-dist-date" class="finput"></div>\n' +
'      </div>\n' +
'      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Jam</label><input type="time" id="bbm-dist-time" class="finput"></div>\n' +
'      <div style="margin-bottom:20px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Catatan</label><textarea id="bbm-dist-notes" class="finput" rows="2" placeholder="Opsional..."></textarea></div>\n' +
'      <div id="bbm-dist-lhr-preview" style="display:none;background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400E;font-weight:600;"></div>\n' +
'      <button onclick="submitFuelDispense()" class="btn-primary" style="width:100%;padding:13px;font-size:15px;font-weight:700;">Catat Distribusi</button>\n' +
'    </div>\n' +
'  </div>\n' +
'  <div id="bbm-panel-riwayat" style="display:none;"></div>\n' +
'</div>\n';

const newModal = bbmScreen + oldModal;
if (!html.includes(oldModal)) { console.error('ERROR: modal anchor not found'); process.exit(1); }
html = html.replace(oldModal, newModal);
console.log('pass 2 ok - BBM screen HTML');

// ── 3. Add global state vars after _alertSRUrgency ───────────────────────────
const oldState = "let _alertSRUrgency = 'Normal';";
const newState = oldState + "\nlet fuelBbmSubTab = 'status';\nlet fuelRiwayatSort = 'date';\nlet fuelRiwayatData = [];\nlet bbmDrumRowCount = 0;\nlet bbmLastDispenseByUnit = {};\nconst FUEL_TANKS = [{name:'hijau',label:'Tanki Hijau',cap:8000,color:'#16A34A'},{name:'merah',label:'Tanki Merah',cap:1500,color:'#DC2626'},{name:'kuning',label:'Tanki Kuning',cap:1500,color:'#CA8A04'}];";
if (!html.includes(oldState)) { console.error('ERROR: state anchor not found'); process.exit(1); }
html = html.replace(oldState, newState);
console.log('pass 3 ok - global state vars');

// ── 4. Update switchAdmin labels + init ──────────────────────────────────────
const oldLabels = "const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis' };";
const newLabels = "const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM' };";
if (!html.includes(oldLabels)) { console.error('ERROR: labels not found'); process.exit(1); }
html = html.replace(oldLabels, newLabels);

const oldInit = "  if (name === 'catat') initAdminCatat();\n}";
const newInit = "  if (name === 'catat') initAdminCatat();\n  if (name === 'bbm') initFuelBBM();\n}";
if (!html.includes(oldInit)) { console.error('ERROR: init anchor not found'); process.exit(1); }
html = html.replace(oldInit, newInit);
console.log('pass 4 ok - switchAdmin updated');

// ── 5. Add switchBBMTab + initFuelBBM before boot() ─────────────────────────
const oldBoot = "  boot();\n});\n</script>";
const bbmBaseFns =
"// ============================================================\n" +
"// FUEL TRACKING (BBM)\n" +
"// ============================================================\n" +
"function switchBBMTab(tab, el) {\n" +
"  fuelBbmSubTab = tab;\n" +
"  const tabs = ['status','terima','isidrum','distribusi','riwayat'];\n" +
"  tabs.forEach(t => {\n" +
"    const btn = document.getElementById('bbm-tab-' + t);\n" +
"    const panel = document.getElementById('bbm-panel-' + t);\n" +
"    const active = t === tab;\n" +
"    if (btn) { btn.style.color = active ? '#1D4ED8' : '#94A3B8'; btn.style.borderBottomColor = active ? '#1D4ED8' : 'transparent'; }\n" +
"    if (panel) panel.style.display = active ? '' : 'none';\n" +
"  });\n" +
"  if (tab === 'status') loadFuelStatus();\n" +
"  if (tab === 'terima') initTerimaForm();\n" +
"  if (tab === 'isidrum') initIsiDrumForm();\n" +
"  if (tab === 'distribusi') initDistribusiForm();\n" +
"  if (tab === 'riwayat') loadFuelRiwayat();\n" +
"}\n\n" +
"function initFuelBBM() {\n" +
"  switchBBMTab('status', document.getElementById('bbm-tab-status'));\n" +
"}\n\n";

const newBoot = bbmBaseFns + "  boot();\n});\n</script>";
if (!html.includes(oldBoot)) { console.error('ERROR: boot anchor not found'); process.exit(1); }
html = html.replace(oldBoot, newBoot);
console.log('pass 5 ok - base BBM functions');

// ── 6. JS syntax check ───────────────────────────────────────────────────────
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
if (sm) { try { new Function(sm[1]); console.log('JS syntax OK'); } catch(e) { console.error('JS syntax error:', e.message); process.exit(1); } }
fs.writeFileSync(file, html, 'utf8');
console.log('index.html written OK');
```

- [ ] **Step 2: Run patch**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_bbm_2.js
```

Expected output: 5 `pass N ok` lines + `JS syntax OK` + `index.html written OK`

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA"
git add index.html
git commit -m "feat: BBM nav link + screen skeleton + base tab switching"
rm patch_bbm_2.js
```

---

## Task 3: STATUS Tab — Tank Gauges + Staged Drums + Tank Transfer Modal

**Files:**
- Modify: `index.html`
- Create (temp): `patch_bbm_3.js`

**Interfaces:**
- Produces: `loadFuelStatus()`, `calcTankLevels()`, `openTankTransferModal()`, `submitTankTransfer()`
- These are called by `switchBBMTab('status')` (already wired in Task 2)

- [ ] **Step 1: Write patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_bbm_3.js`:

```javascript
const fs = require('fs');
const file = require('path').join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');

const oldBoot = "  boot();\n});\n</script>";

const statusFns =
"async function calcTankLevels() {\n" +
"  const [bunkRes, transRes, ttRes] = await Promise.all([\n" +
"    sb.from('fuel_bunkers').select('tank_name, total_liters'),\n" +
"    sb.from('fuel_transfers').select('volume_liters, bunker_id, fuel_bunkers(tank_name)'),\n" +
"    sb.from('fuel_tank_transfers').select('from_tank, to_tank, volume_liters'),\n" +
"  ]);\n" +
"  const levels = { hijau: 0, merah: 0, kuning: 0 };\n" +
"  (bunkRes.data || []).forEach(b => { levels[b.tank_name] = (levels[b.tank_name] || 0) + Number(b.total_liters); });\n" +
"  (transRes.data || []).forEach(t => {\n" +
"    const tn = t.fuel_bunkers && t.fuel_bunkers.tank_name;\n" +
"    if (tn) levels[tn] = (levels[tn] || 0) - Number(t.volume_liters);\n" +
"  });\n" +
"  (ttRes.data || []).forEach(tt => {\n" +
"    levels[tt.from_tank] = (levels[tt.from_tank] || 0) - Number(tt.volume_liters);\n" +
"    levels[tt.to_tank] = (levels[tt.to_tank] || 0) + Number(tt.volume_liters);\n" +
"  });\n" +
"  FUEL_TANKS.forEach(t => { if (levels[t.name] < 0) levels[t.name] = 0; });\n" +
"  return levels;\n" +
"}\n\n" +
"function renderTankGauges(levels) {\n" +
"  return '<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;\">' +\n" +
"    FUEL_TANKS.map(t => {\n" +
"      const lvl = levels[t.name] || 0;\n" +
"      const pct = Math.min(100, Math.round(lvl / t.cap * 100));\n" +
"      const barColor = pct < 20 ? '#F97316' : t.color;\n" +
"      const warn = pct < 20 ? '<span style=\"margin-left:6px;font-size:11px;background:#FEF3C7;color:#92400E;padding:2px 7px;border-radius:20px;font-weight:700;\">LOW</span>' : '';\n" +
"      return '<div style=\"background:white;border-radius:14px;padding:18px;box-shadow:0 1px 6px rgba(0,0,0,0.07);\">' +\n" +
"        '<div style=\"font-size:14px;font-weight:800;color:#1E293B;margin-bottom:4px;\">' + t.label + warn + '</div>' +\n" +
"        '<div style=\"font-size:24px;font-weight:900;color:' + barColor + ';margin-bottom:4px;\">' + lvl.toLocaleString('id') + ' L</div>' +\n" +
"        '<div style=\"font-size:12px;color:#94A3B8;margin-bottom:10px;\">' + pct + '% dari ' + t.cap.toLocaleString('id') + ' L</div>' +\n" +
"        '<div style=\"background:#F1F5F9;border-radius:99px;height:10px;overflow:hidden;\"><div style=\"background:' + barColor + ';height:10px;border-radius:99px;width:' + pct + '%;transition:width 0.4s;\"></div></div>' +\n" +
"      '</div>';\n" +
"    }).join('') +\n" +
"  '</div>';\n" +
"}\n\n" +
"function renderStagedDrums(transfers) {\n" +
"  if (!transfers || transfers.length === 0) {\n" +
"    return '<div style=\"background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:10px;\"><svg width=\"18\" height=\"18\" fill=\"none\" stroke=\"#16A34A\" stroke-width=\"2.5\" viewBox=\"0 0 24 24\"><path d=\"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z\"/></svg><div style=\"font-size:13px;font-weight:700;color:#16A34A;\">Tidak ada drum staged — semua sudah didistribusi</div></div>';\n" +
"  }\n" +
"  const rows = transfers.map(t => '<tr>' +\n" +
"    '<td style=\"font-weight:700;color:#1D4ED8;\">' + (t.transfer_code || '') + '</td>' +\n" +
"    '<td>' + (t.drum_name || '') + '</td>' +\n" +
"    '<td>' + (t.volume_liters || '') + ' L</td>' +\n" +
"    '<td>' + formatDate(t.filled_date) + '</td>' +\n" +
"    '<td>' + ((t.fuel_bunkers && t.fuel_bunkers.bunker_code) || '') + '</td>' +\n" +
"    '<td><button class=\"btn-primary\" style=\"padding:4px 10px;font-size:12px;\" onclick=\"prefillDistribusiDrum(\\'' + t.id + '\\');\">Distribusi</button></td>' +\n" +
"  '</tr>').join('');\n" +
"  return '<div style=\"font-size:15px;font-weight:700;color:#DC2626;margin-bottom:12px;\">Drum Staged — Belum Didistribusi (' + transfers.length + ')</div>' +\n" +
"    '<div class=\"table-wrap\"><table class=\"dt\"><thead><tr><th>Kode Transfer</th><th>Drum</th><th>Volume</th><th>Tgl Isi</th><th>Bunker</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';\n" +
"}\n\n" +
"async function loadFuelStatus() {\n" +
"  const el = document.getElementById('bbm-panel-status');\n" +
"  if (!el) return;\n" +
"  el.innerHTML = '<div style=\"padding:20px;text-align:center;\"><div class=\"spinner\"></div></div>';\n" +
"  try {\n" +
"    const [levels, { data: staged }] = await Promise.all([\n" +
"      calcTankLevels(),\n" +
"      sb.from('fuel_transfers').select('id, transfer_code, drum_name, volume_liters, filled_date, fuel_bunkers(bunker_code)').eq('status','staged').order('created_at'),\n" +
"    ]);\n" +
"    const transferBtn = '<button onclick=\"openTankTransferModal()\" style=\"background:#F1F5F9;border:1.5px solid #CBD5E1;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:700;color:#475569;cursor:pointer;margin-bottom:20px;\">&#8646; Pindah Antar Tanki</button>';\n" +
"    el.innerHTML = renderTankGauges(levels) + transferBtn + renderStagedDrums(staged);\n" +
"  } catch(e) { el.innerHTML = '<div style=\"color:#DC2626;padding:16px;\">Gagal load: ' + e.message + '</div>'; }\n" +
"}\n\n" +
"function openTankTransferModal() {\n" +
"  showModal('<div style=\"font-size:16px;font-weight:700;color:#1E293B;margin-bottom:16px;\">Pindah Antar Tanki</div>' +\n" +
"    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;\">Dari Tanki</label>' +\n" +
"    '<select id=\"tt-from\" class=\"finput\"><option value=\"\">-- Pilih --</option><option value=\"hijau\">Tanki Hijau</option><option value=\"merah\">Tanki Merah</option><option value=\"kuning\">Tanki Kuning</option></select></div>' +\n" +
"    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;\">Ke Tanki</label>' +\n" +
"    '<select id=\"tt-to\" class=\"finput\"><option value=\"\">-- Pilih --</option><option value=\"hijau\">Tanki Hijau</option><option value=\"merah\">Tanki Merah</option><option value=\"kuning\">Tanki Kuning</option></select></div>' +\n" +
"    '<div style=\"margin-bottom:12px;\"><label style=\"font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;\">Volume (L)</label>' +\n" +
"    '<input type=\"number\" id=\"tt-vol\" class=\"finput\" placeholder=\"Jumlah liter\" min=\"1\"></div>' +\n" +
"    '<div style=\"margin-bottom:16px;\"><label style=\"font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;\">Tanggal</label>' +\n" +
"    '<input type=\"date\" id=\"tt-date\" class=\"finput\" value=\"' + todayISO() + '\"></div>' +\n" +
"    '<div style=\"margin-bottom:16px;\"><label style=\"font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:5px;\">Catatan</label>' +\n" +
"    '<textarea id=\"tt-notes\" class=\"finput\" rows=\"2\" placeholder=\"Opsional...\"></textarea></div>' +\n" +
"    '<div style=\"display:flex;gap:8px;\"><button onclick=\"submitTankTransfer()\" class=\"btn-primary\" style=\"flex:1;\">Simpan</button><button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button></div>');\n" +
"}\n\n" +
"async function submitTankTransfer() {\n" +
"  const from_tank = document.getElementById('tt-from').value;\n" +
"  const to_tank = document.getElementById('tt-to').value;\n" +
"  const vol = parseFloat(document.getElementById('tt-vol').value);\n" +
"  const date = document.getElementById('tt-date').value;\n" +
"  const notes = document.getElementById('tt-notes').value.trim();\n" +
"  if (!from_tank || !to_tank || !vol || !date) { showToast('Semua field wajib diisi.'); return; }\n" +
"  if (from_tank === to_tank) { showToast('Tanki asal dan tujuan tidak boleh sama.'); return; }\n" +
"  try {\n" +
"    const { error } = await sb.from('fuel_tank_transfers').insert({ from_tank, to_tank, volume_liters: vol, transfer_date: date, notes: notes || null });\n" +
"    if (error) throw error;\n" +
"    closeModal();\n" +
"    showToast('Transfer berhasil dicatat.', 'success');\n" +
"    loadFuelStatus();\n" +
"  } catch(e) { showToast('Gagal: ' + e.message); }\n" +
"}\n\n";

if (!html.includes(oldBoot)) { console.error('ERROR: boot anchor not found'); process.exit(1); }
html = html.replace(oldBoot, statusFns + "  boot();\n});\n</script>");
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
if (sm) { try { new Function(sm[1]); console.log('JS syntax OK'); } catch(e) { console.error('JS error:', e.message); process.exit(1); } }
fs.writeFileSync(file, html, 'utf8');
console.log('Done');
```

- [ ] **Step 2: Run patch**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_bbm_3.js
```

Expected: `JS syntax OK` + `Done`

- [ ] **Step 3: Commit**

```bash
git add index.html && git commit -m "feat: BBM Status tab — tank gauges, staged drums, tank transfer modal"
rm patch_bbm_3.js
```

---

## Task 4: TERIMA BBM Tab — Bunker Receipt

**Files:**
- Modify: `index.html`
- Create (temp): `patch_bbm_4.js`

**Interfaces:**
- Produces: `getNextBunkerCode()`, `initTerimaForm()`, `onTerimaChange()`, `submitFuelBunker()`
- `initTerimaForm()` is called by `switchBBMTab('terima')` (wired in Task 2)

- [ ] **Step 1: Write patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_bbm_4.js`:

```javascript
const fs = require('fs');
const file = require('path').join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const oldBoot = "  boot();\n});\n</script>";

const fns =
"async function getNextBunkerCode() {\n" +
"  const { data } = await sb.from('fuel_bunkers').select('bunker_code').order('created_at', { ascending: false }).limit(1);\n" +
"  if (!data || data.length === 0) return 'X26';\n" +
"  const last = data[0].bunker_code;\n" +
"  const num = parseInt(last.replace('X',''), 10);\n" +
"  return isNaN(num) ? 'X26' : 'X' + (num + 1);\n" +
"}\n\n" +
"async function initTerimaForm() {\n" +
"  const dateEl = document.getElementById('bbm-terima-date');\n" +
"  if (dateEl && !dateEl.value) dateEl.value = todayISO();\n" +
"  await onTerimaChange();\n" +
"}\n\n" +
"async function onTerimaChange() {\n" +
"  const prev = document.getElementById('bbm-terima-preview');\n" +
"  if (!prev) return;\n" +
"  const tank = document.getElementById('bbm-terima-tank').value;\n" +
"  const code = await getNextBunkerCode();\n" +
"  let msg = 'Kode Bunker: <strong>' + code + '</strong>';\n" +
"  if (tank) {\n" +
"    const levels = await calcTankLevels();\n" +
"    const cap = FUEL_TANKS.find(t => t.name === tank);\n" +
"    const rem = cap ? cap.cap - (levels[tank] || 0) : 0;\n" +
"    const label = cap ? cap.label : tank;\n" +
"    msg += ' &nbsp;|&nbsp; Kapasitas sisa ' + label + ': <strong>' + Math.max(0,rem).toLocaleString('id') + ' L</strong>';\n" +
"  }\n" +
"  prev.innerHTML = msg;\n" +
"}\n\n" +
"async function submitFuelBunker() {\n" +
"  const date = document.getElementById('bbm-terima-date').value;\n" +
"  const tank = document.getElementById('bbm-terima-tank').value;\n" +
"  const vol = parseFloat(document.getElementById('bbm-terima-vol').value);\n" +
"  const notes = document.getElementById('bbm-terima-notes').value.trim();\n" +
"  if (!date || !tank || !vol) { showToast('Tanggal, Tanki, dan Volume wajib diisi.'); return; }\n" +
"  try {\n" +
"    const code = await getNextBunkerCode();\n" +
"    const { error } = await sb.from('fuel_bunkers').insert({ bunker_code: code, delivery_date: date, tank_name: tank, total_liters: vol, notes: notes || null });\n" +
"    if (error) throw error;\n" +
"    showToast('Bunker ' + code + ' berhasil disimpan!', 'success');\n" +
"    document.getElementById('bbm-terima-vol').value = '';\n" +
"    document.getElementById('bbm-terima-notes').value = '';\n" +
"    document.getElementById('bbm-terima-tank').value = '';\n" +
"    document.getElementById('bbm-terima-date').value = todayISO();\n" +
"    await onTerimaChange();\n" +
"  } catch(e) { showToast('Gagal: ' + e.message); }\n" +
"}\n\n";

if (!html.includes(oldBoot)) { console.error('ERROR: boot not found'); process.exit(1); }
html = html.replace(oldBoot, fns + "  boot();\n});\n</script>");
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
if (sm) { try { new Function(sm[1]); console.log('JS syntax OK'); } catch(e) { console.error(e.message); process.exit(1); } }
fs.writeFileSync(file, html, 'utf8');
console.log('Done');
```

- [ ] **Step 2: Run + commit**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_bbm_4.js
git add index.html && git commit -m "feat: BBM Terima BBM tab — bunker receipt form"
rm patch_bbm_4.js
```

---

## Task 5: ISI DRUM Tab — Batch Drum Fill

**Files:**
- Modify: `index.html`
- Create (temp): `patch_bbm_5.js`

**Interfaces:**
- Produces: `initIsiDrumForm()`, `addDrumRow()`, `removeDrumRow(idx)`, `updateIsiPreview()`, `getNextTransferSeq(bunkerCode)`, `submitDrumFills()`
- `initIsiDrumForm()` is called by `switchBBMTab('isidrum')` (wired in Task 2)
- Uses `bbmDrumRowCount` global (set in Task 2)

- [ ] **Step 1: Write patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_bbm_5.js`:

```javascript
const fs = require('fs');
const file = require('path').join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const oldBoot = "  boot();\n});\n</script>";

const fns =
"async function initIsiDrumForm() {\n" +
"  const dateEl = document.getElementById('bbm-drum-date');\n" +
"  if (dateEl && !dateEl.value) dateEl.value = todayISO();\n" +
"  const bunkerSel = document.getElementById('bbm-drum-bunker');\n" +
"  if (!bunkerSel) return;\n" +
"  const { data } = await sb.from('fuel_bunkers').select('id, bunker_code, tank_name, total_liters, delivery_date').order('delivery_date', { ascending: false });\n" +
"  bunkerSel.innerHTML = '<option value=\"\">-- Pilih Bunker --</option>' + (data || []).map(b => '<option value=\"' + b.id + '\" data-code=\"' + b.bunker_code + '\" data-tank=\"' + b.tank_name + '\" data-total=\"' + b.total_liters + '\">' + b.bunker_code + ' — ' + b.tank_name.charAt(0).toUpperCase() + b.tank_name.slice(1) + ' — ' + Number(b.total_liters).toLocaleString('id') + 'L — ' + formatDate(b.delivery_date) + '</option>').join('');\n" +
"  const rows = document.getElementById('bbm-drum-rows');\n" +
"  if (rows && rows.children.length === 0) addDrumRow();\n" +
"}\n\n" +
"function addDrumRow() {\n" +
"  bbmDrumRowCount++;\n" +
"  const idx = bbmDrumRowCount;\n" +
"  const wrap = document.getElementById('bbm-drum-rows');\n" +
"  if (!wrap) return;\n" +
"  const row = document.createElement('div');\n" +
"  row.id = 'bbm-drum-row-' + idx;\n" +
"  row.style.cssText = 'display:grid;grid-template-columns:1fr 100px 36px;gap:8px;margin-bottom:8px;align-items:center;';\n" +
"  row.innerHTML = '<input type=\"text\" id=\"bbm-drum-name-' + idx + '\" class=\"finput\" placeholder=\"Nama Drum (contoh: Drum 3)\" oninput=\"updateIsiPreview()\"> ' +\n" +
"    '<input type=\"number\" id=\"bbm-drum-vol-' + idx + '\" class=\"finput\" value=\"200\" min=\"1\" oninput=\"updateIsiPreview()\"> ' +\n" +
"    '<button onclick=\"removeDrumRow(' + idx + ')\" style=\"background:#FEE2E2;color:#DC2626;border:none;border-radius:8px;width:36px;height:40px;font-size:18px;cursor:pointer;font-weight:700;\">x</button>';\n" +
"  wrap.appendChild(row);\n" +
"  updateIsiPreview();\n" +
"}\n\n" +
"function removeDrumRow(idx) {\n" +
"  const row = document.getElementById('bbm-drum-row-' + idx);\n" +
"  if (row) row.remove();\n" +
"  updateIsiPreview();\n" +
"}\n\n" +
"async function getNextTransferSeq(bunkerCode) {\n" +
"  const { data } = await sb.from('fuel_transfers').select('transfer_code').like('transfer_code', bunkerCode + '-%');\n" +
"  if (!data || data.length === 0) return 1;\n" +
"  const nums = data.map(r => parseInt(r.transfer_code.split('-').pop(), 10)).filter(n => !isNaN(n));\n" +
"  return nums.length ? Math.max(...nums) + 1 : 1;\n" +
"}\n\n" +
"async function updateIsiPreview() {\n" +
"  const prev = document.getElementById('bbm-drum-preview');\n" +
"  if (!prev) return;\n" +
"  const bunkerSel = document.getElementById('bbm-drum-bunker');\n" +
"  const opt = bunkerSel && bunkerSel.selectedOptions[0];\n" +
"  if (!opt || !opt.value) { prev.style.display = 'none'; return; }\n" +
"  const bunkerCode = opt.dataset.code;\n" +
"  const totalLiters = parseFloat(opt.dataset.total) || 0;\n" +
"  const rows = document.getElementById('bbm-drum-rows');\n" +
"  const inputs = rows ? rows.querySelectorAll('[id^=\"bbm-drum-name-\"]') : [];\n" +
"  let totalVol = 0;\n" +
"  inputs.forEach(inp => {\n" +
"    const idx = inp.id.replace('bbm-drum-name-','');\n" +
"    const v = parseFloat(document.getElementById('bbm-drum-vol-'+idx) ? document.getElementById('bbm-drum-vol-'+idx).value : 0) || 0;\n" +
"    totalVol += v;\n" +
"  });\n" +
"  const startSeq = await getNextTransferSeq(bunkerCode);\n" +
"  const codes = Array.from({length: inputs.length}, (_,i) => bunkerCode + '-' + (startSeq+i)).join(', ');\n" +
"  const usedInBunker = totalLiters; // approximate: we sum all transfers for this bunker\n" +
"  const { data: existingT } = await sb.from('fuel_transfers').select('volume_liters').eq('bunker_id', opt.value);\n" +
"  const usedSoFar = (existingT || []).reduce((s,t) => s + Number(t.volume_liters), 0);\n" +
"  const remaining = totalLiters - usedSoFar;\n" +
"  prev.style.display = '';\n" +
"  prev.innerHTML = 'Kode: <strong>' + (codes || '—') + '</strong> &nbsp;|&nbsp; Total: <strong>' + totalVol.toLocaleString('id') + 'L</strong> &nbsp;|&nbsp; Sisa Bunker: ' + remaining.toLocaleString('id') + 'L &rarr; <strong>' + Math.max(0, remaining - totalVol).toLocaleString('id') + 'L</strong>';\n" +
"}\n\n" +
"async function submitDrumFills() {\n" +
"  const bunkerSel = document.getElementById('bbm-drum-bunker');\n" +
"  const opt = bunkerSel && bunkerSel.selectedOptions[0];\n" +
"  if (!opt || !opt.value) { showToast('Pilih bunker terlebih dahulu.'); return; }\n" +
"  const bunkerId = opt.value;\n" +
"  const bunkerCode = opt.dataset.code;\n" +
"  const date = document.getElementById('bbm-drum-date').value;\n" +
"  if (!date) { showToast('Tanggal isi wajib diisi.'); return; }\n" +
"  const rows = document.getElementById('bbm-drum-rows');\n" +
"  const nameInputs = rows ? Array.from(rows.querySelectorAll('[id^=\"bbm-drum-name-\"]')) : [];\n" +
"  if (nameInputs.length === 0) { showToast('Tambah minimal satu drum.'); return; }\n" +
"  const drumData = [];\n" +
"  for (const inp of nameInputs) {\n" +
"    const idx = inp.id.replace('bbm-drum-name-','');\n" +
"    const name = inp.value.trim();\n" +
"    const vol = parseFloat(document.getElementById('bbm-drum-vol-'+idx) ? document.getElementById('bbm-drum-vol-'+idx).value : 0);\n" +
"    if (!name) { showToast('Nama drum tidak boleh kosong.'); return; }\n" +
"    if (!vol || vol <= 0) { showToast('Volume drum harus > 0.'); return; }\n" +
"    drumData.push({ name, vol });\n" +
"  }\n" +
"  try {\n" +
"    const startSeq = await getNextTransferSeq(bunkerCode);\n" +
"    const inserts = drumData.map((d, i) => ({ transfer_code: bunkerCode + '-' + (startSeq+i), bunker_id: bunkerId, drum_name: d.name, volume_liters: d.vol, filled_date: date, status: 'staged' }));\n" +
"    const { error } = await sb.from('fuel_transfers').insert(inserts);\n" +
"    if (error) throw error;\n" +
"    showToast(inserts.length + ' drum berhasil disimpan (' + inserts.map(r=>r.transfer_code).join(', ') + ')!', 'success');\n" +
"    document.getElementById('bbm-drum-rows').innerHTML = '';\n" +
"    bbmDrumRowCount = 0;\n" +
"    document.getElementById('bbm-drum-bunker').value = '';\n" +
"    document.getElementById('bbm-drum-date').value = todayISO();\n" +
"    document.getElementById('bbm-drum-preview').style.display = 'none';\n" +
"    addDrumRow();\n" +
"  } catch(e) { showToast('Gagal: ' + e.message); }\n" +
"}\n\n";

if (!html.includes(oldBoot)) { console.error('ERROR: boot not found'); process.exit(1); }
html = html.replace(oldBoot, fns + "  boot();\n});\n</script>");
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
if (sm) { try { new Function(sm[1]); console.log('JS syntax OK'); } catch(e) { console.error(e.message); process.exit(1); } }
fs.writeFileSync(file, html, 'utf8');
console.log('Done');
```

- [ ] **Step 2: Run + commit**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_bbm_5.js
git add index.html && git commit -m "feat: BBM Isi Drum tab — batch drum fill form"
rm patch_bbm_5.js
```

---

## Task 6: DISTRIBUSI Tab — Dispatch Drum to Unit

**Files:**
- Modify: `index.html`
- Create (temp): `patch_bbm_6.js`

**Interfaces:**
- Produces: `initDistribusiForm()`, `onDistribusiUnitChange(unitId)`, `onDistribusiHMChange()`, `calcLPerHr(unitId, hm, liters)`, `prefillDistribusiDrum(transferId)`, `submitFuelDispense()`
- `initDistribusiForm()` called by `switchBBMTab('distribusi')` (Task 2)
- `prefillDistribusiDrum(transferId)` called by STATUS tab "Distribusi" button (Task 3)

- [ ] **Step 1: Write patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_bbm_6.js`:

```javascript
const fs = require('fs');
const file = require('path').join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const oldBoot = "  boot();\n});\n</script>";

const fns =
"async function initDistribusiForm() {\n" +
"  const dateEl = document.getElementById('bbm-dist-date');\n" +
"  if (dateEl && !dateEl.value) dateEl.value = todayISO();\n" +
"  const [{ data: units }, { data: staged }] = await Promise.all([\n" +
"    sb.from('units').select('id, code, name').order('code'),\n" +
"    sb.from('fuel_transfers').select('id, transfer_code, drum_name, volume_liters, filled_date').eq('status','staged').order('created_at'),\n" +
"  ]);\n" +
"  const unitSel = document.getElementById('bbm-dist-unit');\n" +
"  if (unitSel) unitSel.innerHTML = '<option value=\"\">-- Pilih Unit --</option>' + (units||[]).map(u => '<option value=\"' + u.id + '\">' + u.code + ' — ' + u.name + '</option>').join('');\n" +
"  const drumSel = document.getElementById('bbm-dist-drum');\n" +
"  if (drumSel) drumSel.innerHTML = '<option value=\"\">-- Pilih Drum --</option>' + (staged||[]).map(t => '<option value=\"' + t.id + '\" data-vol=\"' + t.volume_liters + '\">' + t.transfer_code + ' · ' + t.drum_name + ' · ' + t.volume_liters + 'L · Isi: ' + formatDate(t.filled_date) + '</option>').join('');\n" +
"}\n\n" +
"async function onDistribusiUnitChange(unitId) {\n" +
"  const info = document.getElementById('bbm-dist-last-info');\n" +
"  if (!info) return;\n" +
"  if (!unitId) { info.style.display = 'none'; bbmLastDispenseByUnit = {}; return; }\n" +
"  const { data } = await sb.from('fuel_dispenses').select('hm_at_fill, dispense_date, liters_dispensed, l_per_hr').eq('unit_id', unitId).order('hm_at_fill', { ascending: false }).limit(1);\n" +
"  if (!data || data.length === 0) { info.style.display = 'none'; bbmLastDispenseByUnit = {}; return; }\n" +
"  const last = data[0];\n" +
"  bbmLastDispenseByUnit = last;\n" +
"  info.style.display = '';\n" +
"  info.innerHTML = 'Pengisian terakhir: <strong>' + formatDate(last.dispense_date) + '</strong> — HM: <strong>' + Number(last.hm_at_fill).toLocaleString('id') + '</strong>' + (last.l_per_hr ? ' — L/Hr: <strong>' + Number(last.l_per_hr).toFixed(2) + '</strong>' : '');\n" +
"  onDistribusiHMChange();\n" +
"}\n\n" +
"function onDistribusiHMChange() {\n" +
"  const prev = document.getElementById('bbm-dist-lhr-preview');\n" +
"  if (!prev) return;\n" +
"  const hm = parseFloat(document.getElementById('bbm-dist-hm').value);\n" +
"  const drumSel = document.getElementById('bbm-dist-drum');\n" +
"  const opt = drumSel && drumSel.selectedOptions[0];\n" +
"  const liters = opt ? parseFloat(opt.dataset.vol || 0) : 0;\n" +
"  if (!hm || !liters || !bbmLastDispenseByUnit || !bbmLastDispenseByUnit.hm_at_fill) { prev.style.display = 'none'; return; }\n" +
"  const hmDiff = hm - Number(bbmLastDispenseByUnit.hm_at_fill);\n" +
"  if (hmDiff <= 0) { prev.style.display = 'none'; return; }\n" +
"  const lhr = (liters / hmDiff).toFixed(2);\n" +
"  prev.style.display = '';\n" +
"  prev.innerHTML = 'Estimasi L/Hr: <strong>' + lhr + ' L/Hr</strong> (' + liters + 'L / ' + hmDiff.toLocaleString('id') + ' HM)';\n" +
"}\n\n" +
"async function calcLPerHr(unitId, hm, liters) {\n" +
"  const { data } = await sb.from('fuel_dispenses').select('hm_at_fill').eq('unit_id', unitId).order('hm_at_fill', { ascending: false }).limit(1);\n" +
"  if (!data || data.length === 0) return null;\n" +
"  const prevHm = Number(data[0].hm_at_fill);\n" +
"  const diff = hm - prevHm;\n" +
"  if (diff <= 0) return null;\n" +
"  return Math.round((liters / diff) * 100) / 100;\n" +
"}\n\n" +
"async function prefillDistribusiDrum(transferId) {\n" +
"  switchBBMTab('distribusi', document.getElementById('bbm-tab-distribusi'));\n" +
"  await initDistribusiForm();\n" +
"  const drumSel = document.getElementById('bbm-dist-drum');\n" +
"  if (drumSel) { drumSel.value = transferId; }\n" +
"}\n\n" +
"async function submitFuelDispense() {\n" +
"  const drumSel = document.getElementById('bbm-dist-drum');\n" +
"  const drumOpt = drumSel && drumSel.selectedOptions[0];\n" +
"  const transferId = drumOpt ? drumOpt.value : '';\n" +
"  const unitId = document.getElementById('bbm-dist-unit').value;\n" +
"  const hm = parseFloat(document.getElementById('bbm-dist-hm').value);\n" +
"  const date = document.getElementById('bbm-dist-date').value;\n" +
"  const time = document.getElementById('bbm-dist-time').value || null;\n" +
"  const notes = document.getElementById('bbm-dist-notes').value.trim() || null;\n" +
"  if (!transferId || !unitId || !hm || !date) { showToast('Drum, Unit, HM, dan Tanggal wajib diisi.'); return; }\n" +
"  const liters = parseFloat((drumOpt && drumOpt.dataset.vol) || 0);\n" +
"  if (!liters) { showToast('Volume drum tidak valid.'); return; }\n" +
"  try {\n" +
"    const lhr = await calcLPerHr(unitId, hm, liters);\n" +
"    const { error: e1 } = await sb.from('fuel_dispenses').insert({ transfer_id: transferId, unit_id: unitId, hm_at_fill: hm, dispense_date: date, dispense_time: time, liters_dispensed: liters, l_per_hr: lhr, notes });\n" +
"    if (e1) throw e1;\n" +
"    const { error: e2 } = await sb.from('fuel_transfers').update({ status: 'deployed' }).eq('id', transferId);\n" +
"    if (e2) throw e2;\n" +
"    showToast('Distribusi berhasil dicatat!', 'success');\n" +
"    document.getElementById('bbm-dist-hm').value = '';\n" +
"    document.getElementById('bbm-dist-notes').value = '';\n" +
"    document.getElementById('bbm-dist-date').value = todayISO();\n" +
"    document.getElementById('bbm-dist-time').value = '';\n" +
"    document.getElementById('bbm-dist-last-info').style.display = 'none';\n" +
"    document.getElementById('bbm-dist-lhr-preview').style.display = 'none';\n" +
"    bbmLastDispenseByUnit = {};\n" +
"    await initDistribusiForm();\n" +
"  } catch(e) { showToast('Gagal: ' + e.message); }\n" +
"}\n\n";

if (!html.includes(oldBoot)) { console.error('ERROR: boot not found'); process.exit(1); }
html = html.replace(oldBoot, fns + "  boot();\n});\n</script>");
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
if (sm) { try { new Function(sm[1]); console.log('JS syntax OK'); } catch(e) { console.error(e.message); process.exit(1); } }
fs.writeFileSync(file, html, 'utf8');
console.log('Done');
```

- [ ] **Step 2: Run + commit**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_bbm_6.js
git add index.html && git commit -m "feat: BBM Distribusi tab — drum dispatch to unit with L/Hr calc"
rm patch_bbm_6.js
```

---

## Task 7: RIWAYAT Tab + Final Deploy

**Files:**
- Modify: `index.html`
- Create (temp): `patch_bbm_7.js`

**Interfaces:**
- Produces: `loadFuelRiwayat()`, `renderFuelRiwayat(data, sort)`, `setFuelRiwayatSort(sort, el)`
- `loadFuelRiwayat()` called by `switchBBMTab('riwayat')` (Task 2)

- [ ] **Step 1: Write patch script**

Create `C:\Users\upsca\Documents\SERVIS-SAA\patch_bbm_7.js`:

```javascript
const fs = require('fs');
const file = require('path').join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const oldBoot = "  boot();\n});\n</script>";

const fns =
"async function loadFuelRiwayat() {\n" +
"  const el = document.getElementById('bbm-panel-riwayat');\n" +
"  if (!el) return;\n" +
"  el.innerHTML = '<div style=\"padding:20px;text-align:center;\"><div class=\"spinner\"></div></div>';\n" +
"  try {\n" +
"    const { data, error } = await sb.from('fuel_dispenses')\n" +
"      .select('id, dispense_date, dispense_time, hm_at_fill, liters_dispensed, l_per_hr, notes, units(code, name), fuel_transfers(transfer_code, drum_name, fuel_bunkers(bunker_code))')\n" +
"      .order('dispense_date', { ascending: false }).order('created_at', { ascending: false });\n" +
"    if (error) throw error;\n" +
"    fuelRiwayatData = data || [];\n" +
"    renderFuelRiwayat();\n" +
"  } catch(e) { el.innerHTML = '<div style=\"color:#DC2626;padding:16px;\">Gagal: ' + e.message + '</div>'; }\n" +
"}\n\n" +
"function setFuelRiwayatSort(sort, el) {\n" +
"  fuelRiwayatSort = sort;\n" +
"  document.querySelectorAll('#bbm-riwayat-sort-pills button').forEach(b => b.classList.remove('on'));\n" +
"  if (el) el.classList.add('on');\n" +
"  renderFuelRiwayat();\n" +
"}\n\n" +
"function renderFuelRiwayat() {\n" +
"  const el = document.getElementById('bbm-panel-riwayat');\n" +
"  if (!el) return;\n" +
"  const data = fuelRiwayatData;\n" +
"  const sortPills = '<div id=\"bbm-riwayat-sort-pills\" style=\"display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;\">' +\n" +
"    '<button class=\"filter-pill' + (fuelRiwayatSort==='date'?' on':'') + '\" onclick=\"setFuelRiwayatSort(\\' date\\',this)\">Terbaru</button>' +\n" +
"    '<button class=\"filter-pill' + (fuelRiwayatSort==='unit'?' on':'') + '\" onclick=\"setFuelRiwayatSort(\\'unit\\',this)\">Per Unit</button>' +\n" +
"    '<button class=\"filter-pill' + (fuelRiwayatSort==='bunker'?' on':'') + '\" onclick=\"setFuelRiwayatSort(\\'bunker\\',this)\">Per Bunker</button>' +\n" +
"  '</div>';\n" +
"  if (!data || data.length === 0) {\n" +
"    el.innerHTML = sortPills + '<div style=\"color:#94A3B8;padding:20px;\">Belum ada data distribusi.</div>';\n" +
"    return;\n" +
"  }\n" +
"  const rowHtml = (r) => {\n" +
"    const unit = r.units ? r.units.code : '—';\n" +
"    const tc = r.fuel_transfers ? r.fuel_transfers.transfer_code : '—';\n" +
"    const drum = r.fuel_transfers ? r.fuel_transfers.drum_name : '—';\n" +
"    const bunker = r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : '—';\n" +
"    const lhr = r.l_per_hr ? Number(r.l_per_hr).toFixed(2) : '—';\n" +
"    return '<tr><td>' + formatDate(r.dispense_date) + '</td><td style=\"color:#64748B;font-size:12px;\">' + (r.dispense_time ? r.dispense_time.substring(0,5) : '—') + '</td><td style=\"font-weight:700;\">' + unit + '</td><td>' + Number(r.hm_at_fill).toLocaleString('id') + '</td><td style=\"color:#1D4ED8;font-weight:600;\">' + tc + '</td><td>' + drum + '</td><td>' + bunker + '</td><td>' + r.liters_dispensed + 'L</td><td style=\"color:' + (r.l_per_hr ? '#16A34A' : '#94A3B8') + ';font-weight:700;\">' + lhr + '</td></tr>';\n" +
"  };\n" +
"  const hdrRow = '<thead><tr><th>Tanggal</th><th>Jam</th><th>Unit</th><th>HM</th><th>Transfer</th><th>Drum</th><th>Bunker</th><th>Liter</th><th>L/Hr</th></tr></thead>';\n" +
"  let bodyHtml = '';\n" +
"  if (fuelRiwayatSort === 'date') {\n" +
"    bodyHtml = '<tbody>' + data.map(rowHtml).join('') + '</tbody>';\n" +
"  } else if (fuelRiwayatSort === 'unit') {\n" +
"    const groups = {};\n" +
"    data.forEach(r => { const k = r.units ? r.units.code : '—'; if (!groups[k]) groups[k] = []; groups[k].push(r); });\n" +
"    Object.keys(groups).sort().forEach(k => {\n" +
"      bodyHtml += '<tbody><tr style=\"background:#EFF6FF;\"><td colspan=\"9\" style=\"font-weight:800;color:#1D4ED8;padding:8px 12px;\">' + k + '</td></tr>' + groups[k].map(rowHtml).join('') + '</tbody>';\n" +
"    });\n" +
"  } else {\n" +
"    const groups = {};\n" +
"    data.forEach(r => { const k = r.fuel_transfers && r.fuel_transfers.fuel_bunkers ? r.fuel_transfers.fuel_bunkers.bunker_code : '—'; if (!groups[k]) groups[k] = []; groups[k].push(r); });\n" +
"    Object.keys(groups).sort((a,b) => { const na=parseInt(a.replace('X',''),10),nb=parseInt(b.replace('X',''),10); return nb-na; }).forEach(k => {\n" +
"      bodyHtml += '<tbody><tr style=\"background:#F0FDF4;\"><td colspan=\"9\" style=\"font-weight:800;color:#166534;padding:8px 12px;\">' + k + '</td></tr>' + groups[k].map(rowHtml).join('') + '</tbody>';\n" +
"    });\n" +
"  }\n" +
"  el.innerHTML = sortPills + '<div class=\"table-wrap\"><table class=\"dt\">' + hdrRow + bodyHtml + '</table></div>';\n" +
"}\n\n";

if (!html.includes(oldBoot)) { console.error('ERROR: boot not found'); process.exit(1); }
html = html.replace(oldBoot, fns + "  boot();\n});\n</script>");
const sm = html.match(/<script>([\s\S]*?)<\/script>/);
if (sm) { try { new Function(sm[1]); console.log('JS syntax OK'); } catch(e) { console.error(e.message); process.exit(1); } }
fs.writeFileSync(file, html, 'utf8');
console.log('Done');
```

- [ ] **Step 2: Run patch**

```bash
cd "C:\Users\upsca\Documents\SERVIS-SAA" && node patch_bbm_7.js
```

Expected: `JS syntax OK` + `Done`

- [ ] **Step 3: Commit + push to deploy**

```bash
git add index.html
git commit -m "feat: BBM Riwayat tab — dispense history with sort by date/unit/bunker"
git push origin master
rm patch_bbm_7.js
```

- [ ] **Step 4: Browser verify**

Navigate to https://servis-saa.vercel.app, login as admin (michael.gunawan1995@gmail.com), click BBM in sidebar. Verify:
1. STATUS tab loads with 3 tank gauges (all show 0L initially) + empty staged drums message
2. "Pindah Antar Tanki" button opens modal with from/to/volume/date fields
3. TERIMA BBM tab shows form with bunker code preview "X26"
4. ISI DRUM tab shows bunker dropdown + date + "+ Tambah Drum" button
5. DISTRIBUSI tab shows drum + unit dropdowns
6. RIWAYAT tab shows sort pills + "Belum ada data" message

- [ ] **Step 5: End-to-end smoke test**

1. Go to TERIMA BBM → enter today's date, Tanki Hijau, 5000L → submit → toast "Bunker X26 berhasil disimpan!"
2. Go to STATUS → Tanki Hijau should show 5000L / 62%
3. Go to ISI DRUM → select X26, date today → add Drum 1 (200L) → preview shows "X26-1" → submit
4. Go to STATUS → staged drums table shows X26-1
5. Go to DISTRIBUSI → select X26-1, select any unit, enter HM → submit → toast success
6. Go to STATUS → staged drums empty
7. Go to RIWAYAT → one row showing the dispense, L/Hr shows "—" (first fill for this unit)

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Record fuel fills to each unit → Task 6 (Distribusi)
  - Time & Date at fill → `dispense_date` + `dispense_time` fields in Task 6
  - HM at fill → `hm_at_fill` field in Task 6
  - Drum number → `drum_name` free text in Task 5
  - L/Hr consumption → `calcLPerHr()` in Task 6, displayed in Riwayat
  - Sort by Unit/Fill Date/Bunker Code → Task 7 Riwayat with 3 sort modes
  - Current level at each storage tank → Task 3 STATUS gauges
  - Filled drums not yet deployed → Task 3 staged drums table
  - Bunker codes per fill dates → Task 4 TERIMA BBM auto-generates code
  - Admin-only → RLS in Task 1 restricts all tables to role='admin'
  - Tank transfer (Hijau ↔ Merah/Kuning) → Task 3 modal + `submitTankTransfer()`
- [x] **No placeholders or TODOs found**
- [x] **Type consistency:** `calcTankLevels()` returns `{hijau:number, merah:number, kuning:number}`, used correctly in Task 3 + Task 4; `getNextBunkerCode()` returns string e.g. "X26", used in Task 4 + Task 5; `calcLPerHr(unitId, hm, liters)` returns number|null, used in Task 6
