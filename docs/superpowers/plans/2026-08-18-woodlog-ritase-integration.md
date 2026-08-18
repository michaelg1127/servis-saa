# Woodlog Ritase Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull ritase and bon muat data from Woodlog Monitoring into SERVIS SAA so tonnage per operator can be auto-calculated and salary amounts confirmed before saving.

**Architecture:** Woodlog Monitoring gains a new K{MM}-{NN} project code format, an admin UI to manually set codes on existing projects, and a public read-only API endpoint. SERVIS SAA gains a "Sync dari Woodlog Monitoring" button in the Analisis Biaya detail row that calls the API, computes tonnage per operator, and renders an editable salary confirmation table.

**Tech Stack:** Woodlog Monitoring: Next.js 14, Prisma 7, Neon PostgreSQL, TypeScript. SERVIS SAA: vanilla JS single HTML file, Supabase JS client.

## Global Constraints

- Project code format: `K{MM}-{NN}` — month zero-padded 2 digits, sequence zero-padded 2 digits (e.g. `K08-01`)
- API endpoint URL: `https://woodlog-monitoring.vercel.app/api/project-stats`
- Tonnage formula: `total_mt_m3 × 0.9 / totalRitase`
- Operator tonnage formula: `tonnagePerRitase × bonMuat[operatorName]`
- SERVIS SAA salary table: `woodlog_operator_salary` (columns: `project_id`, `operator_name`, `salary_amount`, `paid_batch`)
- API requires no authentication; `Access-Control-Allow-Origin: *` header mandatory
- Woodlog Monitoring codebase: `C:\Users\upsca\Documents\woodlog-monitoring`
- SERVIS SAA codebase: `C:\Users\upsca\Documents\SERVIS-SAA\index.html`

---

### Task 1: New Project Code Format (Woodlog Monitoring)

**Files:**
- Modify: `app/actions.ts` — `getNextProjectCode()` function and its call site in `createProject`

**Interfaces:**
- Produces: `getNextProjectCode(startDate: Date): Promise<string>` returning `K{MM}-{NN}` format

- [ ] **Step 1: Open `app/actions.ts` and replace `getNextProjectCode`**

Replace the entire `getNextProjectCode` function (lines 15–32) with:

```typescript
async function getNextProjectCode(startDate: Date): Promise<string> {
  const mm = String(startDate.getMonth() + 1).padStart(2, '0')
  const prefix = `K${mm}-`
  const rows = await prisma.project.findMany({
    where: { projectCode: { startsWith: prefix } },
    select: { projectCode: true },
  })
  if (rows.length === 0) return `${prefix}01`
  const nums = rows
    .map((r) => parseInt(r.projectCode!.slice(prefix.length)))
    .filter((n) => !isNaN(n))
  const max = Math.max(...nums)
  return `${prefix}${String(max + 1).padStart(2, '0')}`
}
```

- [ ] **Step 2: Update the call site in `createProject`**

In `createProject` (around line 47), change:
```typescript
const projectCode = await getNextProjectCode()
```
to:
```typescript
const projectCode = await getNextProjectCode(startDate)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\upsca\Documents\woodlog-monitoring
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start dev server: `npm run dev`
Navigate to `http://localhost:3000/projects/new`, create a new project with start date in August 2026. Verify the new project card shows code `K08-NN` (where NN = next available number for August).

- [ ] **Step 5: Commit**

```bash
cd C:\Users\upsca\Documents\woodlog-monitoring
git add app/actions.ts
git commit -m "feat: project code format K{MM}-{NN} by start month"
```

---

### Task 2: Admin Inline Project Code Editor (Woodlog Monitoring)

**Files:**
- Modify: `app/actions.ts` — add `updateProjectCode` server action
- Create: `app/components/ProjectCodeEditor.tsx` — client component with inline edit form
- Modify: `app/page.tsx` — render `ProjectCodeEditor` below each card for admin users

**Interfaces:**
- Consumes: `updateProjectCode` server action from `app/actions.ts`
- Produces: `<ProjectCodeEditor projectId={string} currentCode={string | null} />` component

- [ ] **Step 1: Add `updateProjectCode` server action to `app/actions.ts`**

Append after the `clearProjectInvoice` function:

```typescript
export async function updateProjectCode(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin()
  const projectId = formData.get("projectId") as string
  const code = (formData.get("projectCode") as string).trim()
  if (!code) return { error: "Kode wajib diisi" }
  try {
    await prisma.project.update({ where: { id: projectId }, data: { projectCode: code } })
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal menyimpan kode" }
  }
  return { error: null }
}
```

- [ ] **Step 2: Create `app/components/ProjectCodeEditor.tsx`**

```tsx
"use client"

import { useActionState } from "react"
import { updateProjectCode } from "@/app/actions"

type Props = { projectId: string; currentCode: string | null }

export function ProjectCodeEditor({ projectId, currentCode }: Props) {
  const [state, action, pending] = useActionState(updateProjectCode, { error: null })
  return (
    <form action={action} className="flex items-center gap-1 px-4 pb-2">
      <input type="hidden" name="projectId" value={projectId} />
      <span className="text-xs text-gray-400 shrink-0">Kode SAA:</span>
      <input
        name="projectCode"
        defaultValue={currentCode ?? ""}
        placeholder="mis. K08-01"
        className="text-xs border border-gray-300 rounded px-2 py-0.5 w-28 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 disabled:opacity-50 shrink-0"
      >
        {pending ? "..." : "Simpan"}
      </button>
      {state.error && <span className="text-xs text-red-500">{state.error}</span>}
      {!state.error && state.error === null && (
        <span className="text-xs text-green-600 sr-only">Tersimpan</span>
      )}
    </form>
  )
}
```

- [ ] **Step 3: Import and render `ProjectCodeEditor` in `app/page.tsx`**

Add import at the top of `app/page.tsx`:
```typescript
import { ProjectCodeEditor } from "@/app/components/ProjectCodeEditor"
```

In the `cardData.map(...)` section (around line 96), wrap each `ProjectCard` in a `<div>` and add the editor below it for admin users:

```tsx
{cardData.map((project) => (
  <div key={project.id}>
    <ProjectCard project={project} isAdmin={isAdmin} />
    {isAdmin && (
      <ProjectCodeEditor
        projectId={project.id}
        currentCode={project.projectCode}
      />
    )}
  </div>
))}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\upsca\Documents\woodlog-monitoring
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Start dev server: `npm run dev`
Log in as admin (michael.gunawan1995@gmail.com). On the home page, verify each project card now has a "Kode SAA:" input below it. For an existing project (e.g. K-1), type `K07-01` and click Simpan. Verify the value persists after page reload (check that the input shows `K07-01`).

- [ ] **Step 6: Commit**

```bash
cd C:\Users\upsca\Documents\woodlog-monitoring
git add app/actions.ts app/components/ProjectCodeEditor.tsx app/page.tsx
git commit -m "feat: admin inline project code editor for SAA alignment"
```

---

### Task 3: Public API Endpoint (Woodlog Monitoring)

**Files:**
- Create: `app/api/project-stats/route.ts`

**Interfaces:**
- Produces: `GET /api/project-stats?code=K08-01` → JSON response (see shape below)

- [ ] **Step 1: Create `app/api/project-stats/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function json(body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code) return json({ error: "code parameter required" }, 400)

  try {
    const project = await prisma.project.findUnique({
      where: { projectCode: code },
      select: { id: true, projectCode: true, shipName: true, blQuantity: true },
    })
    if (!project) return json({ error: "Project not found" }, 404)

    const [ritaseAgg, bonMuatAggs] = await Promise.all([
      prisma.dailyShiftLog.aggregate({
        where: { projectId: project.id },
        _sum: { ritase: true },
      }),
      prisma.dailyBonMuat.groupBy({
        by: ["operatorName"],
        where: { projectId: project.id },
        _sum: { count: true },
      }),
    ])

    const totalRitase = ritaseAgg._sum.ritase ?? 0
    const bonMuat: Record<string, number> = {}
    bonMuatAggs.forEach((b) => {
      bonMuat[b.operatorName] = b._sum.count ?? 0
    })

    return json({
      projectCode: project.projectCode,
      shipName: project.shipName,
      blQuantity: Number(project.blQuantity),
      totalRitase,
      bonMuat,
    })
  } catch {
    return json({ error: "Database error" }, 500)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\upsca\Documents\woodlog-monitoring
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Test locally with curl**

With dev server running (`npm run dev`):

```bash
curl "http://localhost:3000/api/project-stats?code=K08-01"
```

If a project with code `K08-01` exists, expected response shape:
```json
{
  "projectCode": "K08-01",
  "shipName": "...",
  "blQuantity": 5000,
  "totalRitase": 300,
  "bonMuat": { "Andi": 45, "Iman": 30 }
}
```

Test 404 case:
```bash
curl "http://localhost:3000/api/project-stats?code=DOESNOTEXIST"
```
Expected: `{"error":"Project not found"}` with HTTP 404.

Verify CORS header is present:
```bash
curl -I "http://localhost:3000/api/project-stats?code=K08-01"
```
Expected: `Access-Control-Allow-Origin: *` in response headers.

- [ ] **Step 4: Commit and push, verify on Vercel**

```bash
cd C:\Users\upsca\Documents\woodlog-monitoring
git add app/api/project-stats/route.ts
git commit -m "feat: public read-only project-stats API endpoint"
git push origin master
```

After Vercel deploys (~60s), test the live endpoint:
```bash
curl "https://woodlog-monitoring.vercel.app/api/project-stats?code=K08-01"
```
Expected: same JSON shape as local test.

---

### Task 4: Analisis Biaya Sync Button (SERVIS SAA)

**Files:**
- Modify: `C:\Users\upsca\Documents\SERVIS-SAA\index.html`
  - `toggleWLAnalisis` — append sync button + result div to detail inner HTML
  - Add: `wlSyncFromMonitoring(pid)` — fetch API, calculate, call render
  - Add: `wlRenderSyncTable(pid, data, salDetail, totalMt)` — render editable salary table
  - Add: `wlSaveSyncSalary(pid)` — delete unpaid salary rows + re-insert confirmed values

**Interfaces:**
- Consumes: `el._wlaProjects`, `el._wlaSalDetail` (set by `renderWoodlogAnalisis`)
- Consumes: `https://woodlog-monitoring.vercel.app/api/project-stats?code=...`
- Consumes: `sb` (Supabase client, global), `showToast()` (global), `loadWoodlogAnalisis()` (global)

- [ ] **Step 1: Add sync button + result div to `toggleWLAnalisis`**

In `index.html`, find the end of the `toggleWLAnalisis` function — specifically the line that ends the inner div HTML:

```javascript
      '<tbody>' + (opRows || '<tr><td colspan="3" style="color:#94A3B8;font-size:12px;">Belum ada data salary.</td></tr>') + '</tbody></table></div>' +
      '</div>';
```

Replace it with:

```javascript
      '<tbody>' + (opRows || '<tr><td colspan="3" style="color:#94A3B8;font-size:12px;">Belum ada data salary.</td></tr>') + '</tbody></table></div>' +
      '</div>' +
      '<div style="margin-top:14px;border-top:1px solid #E2E8F0;padding-top:12px;">' +
      '<button onclick="wlSyncFromMonitoring(\'' + pid + '\')" id="wl-sync-btn-' + pid + '" style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;">↻ Sync dari Woodlog Monitoring</button>' +
      '</div>' +
      '<div id="wl-sync-result-' + pid + '" style="margin-top:10px;"></div>';
```

- [ ] **Step 2: Add `wlSyncFromMonitoring` function**

Add this function immediately after the closing brace of `wlOpenInvoiceModal` (around line 7484):

```javascript
async function wlSyncFromMonitoring(pid) {
  var btn = document.getElementById('wl-sync-btn-' + pid);
  var resultDiv = document.getElementById('wl-sync-result-' + pid);
  if (!resultDiv) return;
  var el = document.getElementById('wl-panel-analisis');
  var projects = (el && el._wlaProjects) || [];
  var p = projects.find(function(x) { return x.id === pid; });
  if (!p || !p.project_code) {
    resultDiv.innerHTML = '<div style="color:#EF4444;font-size:12px;padding:8px;">Kode proyek tidak tersedia di SERVIS SAA.</div>';
    return;
  }
  if (btn) { btn.textContent = 'Memuat...'; btn.disabled = true; }
  try {
    var res = await fetch('https://woodlog-monitoring.vercel.app/api/project-stats?code=' + encodeURIComponent(p.project_code));
    if (!res.ok) {
      if (res.status === 404) throw new Error('Kode ' + p.project_code + ' tidak ditemukan di Woodlog Monitoring. Pastikan kode proyek sudah diisi di sana.');
      throw new Error('Error ' + res.status + ' dari Woodlog Monitoring.');
    }
    var data = await res.json();
    var salDetail = ((el && el._wlaSalDetail) || {})[pid] || [];
    wlRenderSyncTable(pid, data, salDetail, Number(p.total_mt_m3 || 0));
  } catch(e) {
    resultDiv.innerHTML = '<div style="color:#EF4444;font-size:12px;padding:8px;">' + e.message + '</div>';
  } finally {
    if (btn) { btn.textContent = '↻ Sync dari Woodlog Monitoring'; btn.disabled = false; }
  }
}
```

- [ ] **Step 3: Add `wlRenderSyncTable` function**

Add immediately after `wlSyncFromMonitoring`:

```javascript
function wlRenderSyncTable(pid, data, salDetail, totalMt) {
  var resultDiv = document.getElementById('wl-sync-result-' + pid);
  if (!resultDiv) return;
  var fmtRp = function(v) { return 'Rp ' + Math.round(v).toLocaleString('id'); };
  var fmtMT = function(v) { return v.toFixed(2) + ' MT'; };
  if (!data.totalRitase || data.totalRitase === 0) {
    resultDiv.innerHTML = '<div style="color:#D97706;font-size:12px;padding:8px;">Total ritase = 0, tidak bisa menghitung tonnage.</div>';
    return;
  }
  var tpr = (totalMt * 0.9) / data.totalRitase;
  var salMap = {};
  salDetail.forEach(function(s) { salMap[s.name] = s.amount; });
  var ops = Object.keys(data.bonMuat);
  var safePid = pid.replace(/[^a-zA-Z0-9]/g, '_');
  var rows = ops.map(function(op) {
    var bonCount = data.bonMuat[op];
    var tonnage = tpr * bonCount;
    var currentSal = salMap[op] || 0;
    var safeOp = op.replace(/[^a-zA-Z0-9]/g, '_');
    return '<tr style="border-bottom:1px solid #E2E8F0;">' +
      '<td style="padding:6px 8px;font-weight:600;">' + op + '</td>' +
      '<td style="padding:6px 8px;text-align:right;">' + bonCount.toLocaleString('id') + '</td>' +
      '<td style="padding:6px 8px;text-align:right;color:#7C3AED;">' + fmtMT(tonnage) + '</td>' +
      '<td style="padding:6px 8px;text-align:right;color:#94A3B8;">' + fmtRp(currentSal) + '</td>' +
      '<td style="padding:6px 8px;"><input type="number" id="wlss-' + safePid + '-' + safeOp + '" data-op="' + op + '" class="finput" style="width:130px;" value="' + currentSal + '" min="0" placeholder="0"></td>' +
      '</tr>';
  }).join('');
  resultDiv._syncOps = ops;
  resultDiv._syncPid = pid;
  resultDiv.innerHTML =
    '<div style="margin-bottom:8px;font-size:12px;color:#64748B;">' +
    'Total Ritase: <strong>' + data.totalRitase.toLocaleString('id') + '</strong> &nbsp;·&nbsp; ' +
    'Tonnage/Ritase: <strong>' + fmtMT(tpr) + '</strong></div>' +
    '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">' +
    '<thead><tr style="background:#EFF6FF;">' +
    '<th style="padding:6px 8px;text-align:left;">Operator</th>' +
    '<th style="padding:6px 8px;text-align:right;">Bon Muat</th>' +
    '<th style="padding:6px 8px;text-align:right;">Tonase</th>' +
    '<th style="padding:6px 8px;text-align:right;">Gaji Saat Ini</th>' +
    '<th style="padding:6px 8px;text-align:left;">Gaji Baru</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div style="margin-top:10px;">' +
    '<button onclick="wlSaveSyncSalary(\'' + pid + '\')" class="btn-primary" style="font-size:12px;padding:7px 16px;">Simpan Gaji</button>' +
    '</div>';
}
```

- [ ] **Step 4: Add `wlSaveSyncSalary` function**

Add immediately after `wlRenderSyncTable`:

```javascript
async function wlSaveSyncSalary(pid) {
  var resultDiv = document.getElementById('wl-sync-result-' + pid);
  var ops = resultDiv ? resultDiv._syncOps : null;
  if (!ops || !ops.length) return;
  var safePid = pid.replace(/[^a-zA-Z0-9]/g, '_');
  var inserts = ops.map(function(op) {
    var safeOp = op.replace(/[^a-zA-Z0-9]/g, '_');
    var input = document.getElementById('wlss-' + safePid + '-' + safeOp);
    var amount = parseFloat((input || {}).value) || 0;
    return { project_id: pid, operator_name: op, salary_amount: amount, paid_batch: null };
  });
  try {
    var { error: delErr } = await sb.from('woodlog_operator_salary')
      .delete().eq('project_id', pid).is('paid_batch', null);
    if (delErr) throw delErr;
    if (inserts.length > 0) {
      var { error: insErr } = await sb.from('woodlog_operator_salary').insert(inserts);
      if (insErr) throw insErr;
    }
    showToast('Gaji berhasil disimpan!', 'success');
    await loadWoodlogAnalisis();
  } catch(e) {
    showToast('Gagal menyimpan: ' + e.message);
  }
}
```

- [ ] **Step 5: Open browser and test end-to-end**

1. Open `servis-saa.vercel.app` (or the local file) in Chrome
2. Log in as admin (Duri)
3. Go to Proyek Woodlog → Analisis Biaya
4. Click any project row to expand it
5. Verify the "↻ Sync dari Woodlog Monitoring" button appears at the bottom of the detail row
6. Click the button — verify it shows "Memuat..." briefly
7. If the project code matches a Woodlog Monitoring project, verify the table renders with Operator | Bon Muat | Tonase | Gaji Saat Ini | Gaji Baru columns
8. Edit a "Gaji Baru" value and click "Simpan Gaji"
9. Verify toast "Gaji berhasil disimpan!" appears
10. Collapse and re-expand the row — verify the "Labor per Operator" breakdown updated
11. Test error case: open a project whose code does NOT exist in Woodlog Monitoring — verify the red error message appears

- [ ] **Step 6: Commit and push SERVIS SAA**

```bash
cd C:\Users\upsca\Documents\SERVIS-SAA
git add index.html
git commit -m "feat(woodlog): sync ritase from Woodlog Monitoring + editable salary table"
git push origin master
```

- [ ] **Step 7: Final live verification**

After both Vercel deployments complete:
```bash
curl "https://woodlog-monitoring.vercel.app/api/project-stats?code=K08-01"
```
Confirm response includes `totalRitase` and `bonMuat`. Then open `servis-saa.vercel.app` and run the full end-to-end test from Step 5 against the live URLs.
