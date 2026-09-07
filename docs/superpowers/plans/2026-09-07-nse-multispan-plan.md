# NSE Multi-Span Sessions + Derived HM Awal — Implementation Plan

Spec: approved in-chat design (bounded task). Reference spec for original NSE tab: `docs/superpowers/specs/2026-09-03-nse-tab-design.md`.

## Context

The NSE tab (Proyek module, admin-only) currently records one time span per session (`start_time`/`end_time` columns) and manual HM Awal + HM Akhir. New requirements:

1. A session holds **1–5 time spans** (e.g. 09:00–13:00 + 14:00–17:00); billed hours = sum of span durations. Stored in new `nse_sessions.time_spans JSONB` column: `[{"start":"09:00","end":"13:00"}, ...]`.
2. **HM Awal is no longer input** — it is derived: HM Awal of a session = `hm_akhir` of the immediately previous NSE session (ordered by `session_date`, then `session_num`). Derived at read so edits ripple. The very first session in the chain has no predecessor: the modal shows a manual "HM Awal" seed input **only in that case**, stored to the `hm_awal` column.
3. Sesi is now **1 or 2** (DB CHECK already tightened to `BETWEEN 1 AND 2`).

DB migration is ALREADY DONE on live Supabase: `time_spans JSONB` added, `start_time`/`end_time` now nullable (stop writing them), CHECK tightened. The `nse_sessions` table is currently EMPTY — no legacy data handling needed beyond a cheap fallback.

## Global Constraints

- **NEVER use the Edit/Write tool to modify JS inside `index.html`.** All changes to index.html go through ONE Node.js patch script `patch_nse_spans.js` at repo root, using the established pattern (see `patch_nse_hm_lookup.js` for reference): `replaceExact(from, to, desc)` that counts occurrences, errors on MISS/AMBIGUOUS, aborts without writing if any patch fails. **index.html uses CRLF — multi-line match strings must join with `\r\n`.** Only ASCII apostrophes (U+0027) in all JS strings — no curly quotes.
- After running the patch script, verify JS syntax: extract every `<script>` block body (excluding `src=` script tags) to a temp `.js` file and run `node --check` on it. The app fails silently and completely on a JS syntax error.
- Rate is hardcoded: salary = billed hours × 35,000 (Rp/hour). `Math.round` for Rp values.
- Per-span duration uses the existing helpers `_nseHrs(start, end)` and `_isOvernight(start, end)` (they take `"HH:MM:SS"` strings; overnight = end <= start, adds 24h).
- Span storage format: `time_spans = [{"start":"09:00","end":"13:00"}]` — HH:MM strings, no seconds.
- Max 5 spans per session, min 1.
- Indonesian UI labels, consistent with existing modal styling (inline styles, `.finput` class, same label markup).
- Do not touch anything outside the NSE code paths listed below.
- Commit on the current branch of the worktree; commit message style follows repo history (`feat:` / `fix:` prefix).

## Key code locations (line numbers as of commit 6e8d433)

- `var nseData` / `_nseMonthFilter` — 981–982
- `loadProyekNSE()` — 5494
- `_nseHrs`, `_isOvernight` — 5505, 5510
- `renderProyekNSEList()` — 5512 (reads `s.start_time`/`s.end_time` at 5553–5560)
- `_nsePreviewUpdate()` — 6035
- `loadNSEUnitLastHM()` — 6065 (old max-lookup across project_units + nse_sessions — REMOVE, replaced by chain derivation)
- `openAddNSEModal()` — 6088
- `openEditNSEModal(id)` — 6121 (prefills at 6130–6131)
- `submitAddNSE()` — 6293 (insert at 6306)
- `submitEditNSE(id)` — 6315 (update at 6328)
- `deleteNSESession(id)` — 6337 (unchanged)
- `renderProyekRingkasan` NSE section `_nseRingkasanBatch` — 6513–6531
- `exportNSESummary()` — 6745 (rows at 6774–6795)
- Batch export NSE rows — 7006–7011 and 7070–7075

## Task 1: Multi-span NSE sessions + derived HM Awal (single task)

All changes in `index.html` via `patch_nse_spans.js`.

### 1a. New helpers (place near `_nseHrs`)

```js
function _nseSpans(s) {
  if (s.time_spans && s.time_spans.length) return s.time_spans;
  if (s.start_time) return [{ start: s.start_time.slice(0,5), end: s.end_time.slice(0,5) }];
  return [];
}
function _nseTotalHrs(s) {
  return _nseSpans(s).reduce(function(a, sp) { return a + _nseHrs(sp.start + ':00', sp.end + ':00'); }, 0);
}
function _nseSpansLabel(s) {
  return _nseSpans(s).map(function(sp) {
    var ov = _isOvernight(sp.start + ':00', sp.end + ':00');
    return sp.start + '–' + sp.end + (ov ? ' ↑' : '');
  }).join(', ');
}
```

### 1b. Chain derivation helper

```js
var _nseHMMap = {};        // session id -> derived hm_awal (or null)
var _nseChainAll = [];     // all sessions sorted, for predecessor lookup
async function _nseDeriveChain() { ... }
```

`_nseDeriveChain()`: fetch ALL `nse_sessions` (`select('id, session_date, session_num, hm_awal, hm_akhir')`, order by `session_date` asc, `session_num` asc). Walk the sorted list: for row i=0, derived = `row.hm_awal` (seed, may be null); for i>0, derived = previous row's `hm_akhir` (may be null). Populate `_nseHMMap[id]` and `_nseChainAll`. Table is small (a few hundred rows/year) — fetch-all is fine.

Call `await _nseDeriveChain()` inside: `loadProyekNSE()` (before render), the Ringkasan loader path that fetches NSE sessions (before `renderProyekRingkasan`), and before the three Excel export row builders run (exportNSESummary can reuse the map from the last load, but call it again defensively at export start since exports are async user actions).

Derived HM display rule everywhere: value from `_nseHMMap[s.id]`; if null/undefined → show `—`. HM Gap = `s.hm_akhir - derived` only when both present.

### 1c. Add modal (`openAddNSEModal`)

- Sesi select: options 1 and 2 only (keep the existing "only free slots for that date" behavior if present; otherwise just 1/2).
- Replace the single Jam Mulai/Jam Selesai grid with a spans container:
  - `<div id="nse-m-spans">` holding span rows. Each row: `Jam Awal` time input + `Jam Akhir` time input + a small `×` remove button (remove button hidden on the first row).
  - Below the container: small `+ Tambah Jam` button calling `addNSESpanRow()`; hide/disable it when 5 rows exist.
  - `addNSESpanRow(startVal, endVal)` appends a row; all time inputs call `_nsePreviewUpdate()` on input. Row inputs use classes (e.g. `nse-span-start`, `nse-span-end`) not ids, collected via `querySelectorAll`.
- Remove the HM Awal input. Keep HM Akhir input.
- HM Awal auto line: after unit/date/sesi context, an info div `#nse-m-hm-hint`. On modal open (and on date/sesi change), call new `updateNSEHMAwal()`:
  - Ensure `_nseDeriveChain()` has run (await it on modal open).
  - Find the predecessor of the (date, sesi) being entered: the last row in `_nseChainAll` strictly before it in (session_date, session_num) order, excluding the session being edited (edit mode).
  - If predecessor exists with non-null `hm_akhir`: show `HM Awal (otomatis): <val> — dari sesi <date> #<num>`, store in `window._nseDerivedHMAwal`, and HIDE the seed input.
  - If none: show a manual seed input `<input type="number" step="0.1" id="nse-m-hmawal-seed">` labeled `HM Awal (sesi pertama)`, and set `window._nseDerivedHMAwal = null`.
- Live preview (`_nsePreviewUpdate`): total jam = sum over span rows (skip incomplete rows), overnight badge if any span overnight, salary = round(total × 35000), HM Gap = hmAkhir − (derived HM Awal or seed input value), red when negative. Keep the existing green preview box styling.

### 1d. Edit modal (`openEditNSEModal`)

Same layout as Add. Prefill span rows from `_nseSpans(s)`. Prefill HM Akhir. For HM Awal: run the same `updateNSEHMAwal()` logic excluding this session's own id; if this session is chain-first (no predecessor), show the seed input prefilled with `s.hm_awal`.

### 1e. Submits

- Collect spans from the DOM rows; validate: at least 1 complete span, no row with only one side filled, max 5. Toast on validation failure (existing toast pattern).
- `submitAddNSE`: insert `{ session_date, session_num, time_spans: spans, hm_akhir, unit_id, month_year }` — do NOT write `start_time`/`end_time`. Include `hm_awal: <seed value>` ONLY when the seed input is visible (parse float; null if empty).
- `submitEditNSE`: same shape via update. When the seed input is not shown, write `hm_awal: null` (the value is derived; clearing avoids stale seeds when a predecessor later appears).
- Keep existing UNIQUE-conflict friendly error and post-submit reload.

### 1f. List render (`renderProyekNSEList`)

- Replace Start/End columns with one `Jam` column showing `_nseSpansLabel(s)`.
- Billed hrs = `_nseTotalHrs(s)`; HM Awal cell = derived (`—` when null); HM Gap = derived-based; salary and all subtotals/grand totals recomputed from `_nseTotalHrs`.

### 1g. Ringkasan (`_nseRingkasanBatch`)

- hrs via `_nseTotalHrs(s)`; the two time cells (start / end+overnight) collapse into ONE cell with `_nseSpansLabel(s)` (adjust any colspan totals row accordingly).

### 1h. Excel exports (3 sites: `exportNSESummary` rows + grand totals, batch export rows at ~7006 and ~7070)

- Columns `Jam Mulai | Jam Selesai | Overnight` collapse into one `Jam` column containing `_nseSpansLabel(s)` (keep header arrays consistent with row arrays — column counts must match).
- hrs = `_nseTotalHrs(s)`; `hm_awal` cell = derived from `_nseHMMap`; grand totals recomputed with `_nseTotalHrs`.

### 1i. Remove `loadNSEUnitLastHM`

Delete the function and its call sites (unit select `onchange="loadNSEUnitLastHM()"` → remove attribute or point to `_nsePreviewUpdate()`; the edit-modal `setTimeout` that calls it → call `updateNSEHMAwal()` instead). The `window._nseLastHM` continuity block in `_nsePreviewUpdate` is superseded by the derived HM Awal logic — remove it.

### Verification (required before commit)

1. `node patch_nse_spans.js` — all patches print OK, file written.
2. Extract all inline `<script>` bodies to a temp file, `node --check` passes.
3. `node -e` sanity: grep the patched index.html to confirm (a) no remaining `nse-m-hmawal"` single input id in modals (seed id `nse-m-hmawal-seed` is fine), (b) `time_spans` appears in both submit payloads, (c) `loadNSEUnitLastHM` no longer exists.
4. Commit `patch_nse_spans.js` + `index.html` + this plan file.

### Out of scope

- No changes to Kontinuitas timeline, deleteNSESession, markNSEPaid, or non-NSE code.
- No RLS/DB changes (already applied).
- No browser QA (controller does it post-merge).
