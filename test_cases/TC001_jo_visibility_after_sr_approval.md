# TC-001: Job Order Visibility After SR Approval

**Bug:** JO disappears / never appears after SPV approves SR and assigns MKN  
**Root cause:** Missing `renderSPVJadwal()` / `renderMKNJobList()` refresh calls in `approveSR()` and tab-switch handlers  
**Status:** FAILING (unfixed)

---

## Test Case A — SPV: JO must appear in Jadwal immediately after approval

**Precondition:**
- Logged in as SPV (test SPV account — see Credentials.xlsx)
- At least one SR exists with status `pending_spv`
- Navigate to Permintaan tab

**Steps:**
1. Open the Permintaan tab — confirm SR card is visible
2. Tap **Setujui** on the SR card
3. In the modal, select any MKN from the dropdown
4. Tap **Setujui** in the modal
5. Observe: SR card disappears from Permintaan (expected)
6. Navigate to **Jadwal** tab → **Terjadwal** sub-tab
7. Look for the newly created JO

**Expected result:** The new JO appears in Jadwal > Terjadwal immediately with status `Pending`  
**Actual result:** JO does NOT appear. List shows stale data from page load (no refresh)

**Verification (browser console — run after step 4):**
```js
// Confirm JO exists in DB
const { data } = await sb.from('job_orders').select('jo_number, status, created_at').order('created_at', { ascending: false }).limit(3);
console.table(data);
// Should show a new JO-XXX with status 'pending'
// If it appears here but NOT in UI → confirms missing renderSPVJadwal() call
```

---

## Test Case B — SPV: Navigating to Jadwal tab must always reload data

**Precondition:**
- Logged in as SPV
- The Jadwal tab has already been loaded once (page was open)
- A new JO was created (by this SPV or by Admin)

**Steps:**
1. Start on any tab other than Jadwal (e.g., Dashboard)
2. Navigate to **Jadwal** tab
3. Observe whether the JO list is fresh or stale

**Expected result:** Jadwal list refreshes on every tab navigation  
**Actual result:** Data is frozen at page load time; new JOs created after load are not shown

**Code evidence:** `switchSpvScreen()` calls refresh for `dashboard`, `riwayat`, `catat` — but has no handler for `jadwal`:
```js
// line 1691 — jadwal is missing:
if (name === 'dashboard') { loadSPVStats(); loadSPVUnitList(); }
if (name === 'riwayat') initSPVRiwayat();
if (name === 'catat') initSPVCatat();
// ← no: if (name === 'jadwal') renderSPVJadwal();
```

---

## Test Case C — MKN: Job Order must appear after being assigned by SPV

**Precondition:**
- MKN is already logged in (e.g., on Parts tab)
- SPV approves an SR and assigns this MKN

**Steps:**
1. Log in as MKN — navigate to Parts tab (or any other tab)
2. SPV (separate session/device) approves an SR and assigns this MKN
3. MKN taps the **Job Order** tab
4. Check the **Menunggu** sub-tab

**Expected result:** New JO assigned to this MKN appears in Menunggu  
**Actual result:** JO does NOT appear. `switchMknScreen()` has no refresh logic:
```js
// line 2042 — no reload at all:
function switchMknScreen(name, el) {
  document.querySelectorAll('#view-mkn .mscreen').forEach(...);
  document.querySelectorAll('#view-mkn .nav-tab').forEach(...);
  const screen = document.getElementById('mkn-screen-' + name);
  if (screen) screen.classList.add('on');
  if (el) el.classList.add('on');
  // ← no: if (name === 'jo') renderMKNJobList();
}
```

**Workaround (until fixed):** Page reload (F5 / pull-to-refresh on mobile)

**Verification (browser console — while logged in as MKN):**
```js
const { data } = await sb.from('job_orders')
  .select('jo_number, status, assigned_mkn_id')
  .eq('assigned_mkn_id', currentProfile.id)
  .in('status', ['pending','in_progress']);
console.table(data);
// If rows appear here but NOT in the UI → confirms missing renderMKNJobList() call
```

---

## Files to Fix

| File | Line | Fix |
|---|---|---|
| `index.html` | 1349 | Add `await renderSPVJadwal();` inside `approveSR()` after `loadSPVStats()` |
| `index.html` | 1693 | Add `if (name === 'jadwal') renderSPVJadwal();` in `switchSpvScreen()` |
| `index.html` | 2047 | Add `if (name === 'jo') renderMKNJobList();` in `switchMknScreen()` |
