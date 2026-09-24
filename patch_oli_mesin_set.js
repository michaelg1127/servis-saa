// patch_oli_mesin_set.js
// Feature: Oli Mesin Set collapse + Overdue checklist / Jadwalkan Servis
// Re-reads the file fresh each time (patches 1 & 2 already applied on first run,
// this is idempotent — they will be MISSes if already done, which is OK if we
// restructure this as two separate scripts). But since we already patched 1 & 2,
// we just re-run the remaining patches.

const fs = require('fs');
const path = 'index.html';
let src = fs.readFileSync(path, 'utf8');

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

// ============================================================
// PATCH 3a: In loadMknAlerts — change overdueRows/duesoonRows declaration
// to also collect allRows, and add bundle collapse before sort calls
// ============================================================
replaceExact(
  "    const overdueRows = [], duesoonRows = [];\r\n" +
  "    (scheds || []).forEach(function(s) {\r\n" +
  "      const u = (units || []).find(function(x) { return x.id === s.unit_id; });\r\n" +
  "      if (!u) return;\r\n" +
  "      const effHm = logMap[s.unit_id + '|' + s.type_name] != null ? logMap[s.unit_id + '|' + s.type_name] : s.last_hm;\r\n" +
  "      const rem = mRemaining(s.interval_hm, effHm, u.current_hm || 0);\r\n" +
  "      const st = mStatus(s.interval_hm, effHm, u.current_hm || 0);\r\n" +
  "      const rowData = { unit_id: u.id, unit_code: u.code, current_hm: u.current_hm || 0, type_name: s.type_name, interval_hm: s.interval_hm, last_hm: effHm, remaining: rem, status: st };\r\n" +
  "      if (st === 'OVERDUE') overdueRows.push(rowData);\r\n" +
  "      else if (st === 'DUE SOON') duesoonRows.push(rowData);\r\n" +
  "    });\r\n",

  "    const overdueRows = [], duesoonRows = [], _allMknRows = [];\r\n" +
  "    (scheds || []).forEach(function(s) {\r\n" +
  "      const u = (units || []).find(function(x) { return x.id === s.unit_id; });\r\n" +
  "      if (!u) return;\r\n" +
  "      const effHm = logMap[s.unit_id + '|' + s.type_name] != null ? logMap[s.unit_id + '|' + s.type_name] : s.last_hm;\r\n" +
  "      const rem = mRemaining(s.interval_hm, effHm, u.current_hm || 0);\r\n" +
  "      const st = mStatus(s.interval_hm, effHm, u.current_hm || 0);\r\n" +
  "      const rowData = { unit_id: u.id, unit_code: u.code, current_hm: u.current_hm || 0, type_name: s.type_name, interval_hm: s.interval_hm, last_hm: effHm, remaining: rem, status: st };\r\n" +
  "      _allMknRows.push(rowData);\r\n" +
  "      if (st === 'OVERDUE') overdueRows.push(rowData);\r\n" +
  "      else if (st === 'DUE SOON') duesoonRows.push(rowData);\r\n" +
  "    });\r\n",
  'loadMknAlerts: add _allMknRows collection'
);

// ============================================================
// PATCH 3b: Add bundle collapse + update jadwalkanAllRows AFTER badge counts
// (just before the _alertRegister helper)
// ============================================================
replaceExact(
  "    if (overdueBadge) overdueBadge.textContent = overdueRows.length;\r\n" +
  "    if (duesoonBadge) duesoonBadge.textContent = duesoonRows.length;\r\n" +
  "    function _alertRegister(k, r) {\r\n",

  "    if (overdueBadge) overdueBadge.textContent = overdueRows.length;\r\n" +
  "    if (duesoonBadge) duesoonBadge.textContent = duesoonRows.length;\r\n" +
  "\r\n" +
  "    // Bundle collapse: group overdueRows by unit, run _detectOliMesinSet\r\n" +
  "    function _applyBundleCollapse(rows) {\r\n" +
  "      const byUnit = {}; const unitOrder = [];\r\n" +
  "      rows.forEach(function(r) {\r\n" +
  "        if (!byUnit[r.unit_id]) { byUnit[r.unit_id] = []; unitOrder.push(r.unit_id); }\r\n" +
  "        byUnit[r.unit_id].push(r);\r\n" +
  "      });\r\n" +
  "      const result = [];\r\n" +
  "      unitOrder.forEach(function(uid) {\r\n" +
  "        const unitItems = byUnit[uid];\r\n" +
  "        const allForUnit = _allMknRows.filter(function(r) { return r.unit_id === uid; });\r\n" +
  "        const det = _detectOliMesinSet(unitItems, allForUnit);\r\n" +
  "        if (det.bundleItem) {\r\n" +
  "          det.bundleItem.unit_id = unitItems[0].unit_id;\r\n" +
  "          det.bundleItem.unit_code = unitItems[0].unit_code;\r\n" +
  "          det.bundleItem.current_hm = unitItems[0].current_hm;\r\n" +
  "          result.push(det.bundleItem);\r\n" +
  "        }\r\n" +
  "        det.remainingItems.forEach(function(it) { result.push(it); });\r\n" +
  "      });\r\n" +
  "      return result;\r\n" +
  "    }\r\n" +
  "    const collapsedOverdue = _applyBundleCollapse(overdueRows);\r\n" +
  "    jadwalkanAllRows = collapsedOverdue.slice();\r\n" +
  "\r\n" +
  "    function _alertRegister(k, r) {\r\n",
  'loadMknAlerts: add bundle collapse logic'
);

// ============================================================
// PATCH 3c: Replace renderRow in loadMknAlerts to add checkboxes for Overdue
// ============================================================
replaceExact(
  "    function renderRow(r, idx, prefix) {\r\n" +
  "      const k = prefix + '-' + idx;\r\n" +
  "      _alertRegister(k, r);\r\n" +
  "      const sisaText = r.remaining < 0 ? '(' + Math.abs(r.remaining) + ')' : r.remaining;\r\n" +
  "      const sisaColor = r.status === 'OVERDUE' ? '#DC2626' : '#D97706';\r\n" +
  "      const rowBg = r.status === 'OVERDUE' ? '#FFF1F2' : '#FFFBEB';\r\n" +
  "      return '<div onclick=\"openAlertDetailModal(\\'' + k + '\\')\" style=\"background:' + rowBg + ';border-radius:12px;padding:10px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;\">' +\r\n" +
  "        '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;\"><div style=\"font-size:14px;font-weight:800;color:#1E3A8A;\">' + r.unit_code + '</div>' + badge(r.status) + '</div>' +\r\n" +
  "        '<div style=\"font-size:13px;font-weight:600;color:#1E293B;\">' + r.type_name + '</div>' +\r\n" +
  "        '<div style=\"font-size:15px;font-weight:800;color:' + sisaColor + ';margin-top:2px;\">Sisa: ' + sisaText + ' HM</div></div>';\r\n" +
  "    }\r\n" +
  "    function renderGrouped(rows, prefix) {\r\n",

  "    function _renderBundleCard(b, idx, prefix) {\r\n" +
  "      const k = prefix + '-bundle-' + idx;\r\n" +
  "      const overdueMembers = b.members.filter(function(m) { return m.status === 'OVERDUE'; });\r\n" +
  "      const sisaAbs = b.worst_remaining != null ? Math.abs(b.worst_remaining) : 0;\r\n" +
  "      const chkKey = b.unit_id + '|Oli Mesin Set';\r\n" +
  "      const chkId = 'chk-' + k;\r\n" +
  "      const checked = jadwalkanChecked.has(chkKey);\r\n" +
  "      return '<div id=\"card-' + k + '\" style=\"background:#FFF1F2;border-radius:12px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;\">' +\r\n" +
  "        '<div style=\"display:flex;align-items:center;padding:10px 14px;cursor:pointer;\" onclick=\"_toggleBundleCard(\\'' + k + '\\')\">' +\r\n" +
  "          '<input type=\"checkbox\" id=\"' + chkId + '\" ' + (checked ? 'checked' : '') + ' onclick=\"event.stopPropagation();_toggleJadwalCheck(\\'' + chkKey + '\\',this)\" style=\"width:18px;height:18px;margin-right:10px;cursor:pointer;flex-shrink:0;\" />' +\r\n" +
  "          '<div style=\"flex:1;min-width:0;\">' +\r\n" +
  "            '<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;\">' +\r\n" +
  "              '<div style=\"font-size:14px;font-weight:800;color:#1E3A8A;\">' + b.unit_code + ' · Oli Mesin Set</div>' +\r\n" +
  "              '<div style=\"display:flex;align-items:center;gap:4px;\">' + badge('OVERDUE') + '<svg id=\"bundle-chev-' + k + '\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"#64748B\" stroke-width=\"2.5\" viewBox=\"0 0 24 24\" style=\"transition:transform 0.2s;\"><path d=\"M9 18l6-6-6-6\"/></svg></div>' +\r\n" +
  "            '</div>' +\r\n" +
  "            '<div style=\"font-size:12px;color:#475569;\">' + overdueMembers.map(function(m) { return m.type_name; }).join(' · ') + '</div>' +\r\n" +
  "            '<div style=\"font-size:14px;font-weight:800;color:#DC2626;margin-top:2px;\">Sisa terparah: (' + sisaAbs + ') HM</div>' +\r\n" +
  "          '</div>' +\r\n" +
  "        '</div>' +\r\n" +
  "        '<div id=\"bundle-rows-' + k + '\" style=\"display:none;border-top:1px solid #FECACA;\">' +\r\n" +
  "          b.members.map(function(m, mi) {\r\n" +
  "            const isOverdue = m.status === 'OVERDUE';\r\n" +
  "            return '<div style=\"display:flex;align-items:center;padding:8px 14px;' + (mi > 0 ? 'border-top:1px solid #FEE2E2;' : '') + 'background:' + (isOverdue ? '#FFF1F2' : '#F0FDF4') + ';\">' +\r\n" +
  "              '<input type=\"checkbox\" ' + (checked ? 'checked' : '') + ' onclick=\"event.stopPropagation();_toggleJadwalCheck(\\'' + chkKey + '\\',document.getElementById(\\'' + chkId + '\\'))\" style=\"width:16px;height:16px;margin-right:8px;cursor:pointer;flex-shrink:0;\" />' +\r\n" +
  "              '<div style=\"flex:1;\">' +\r\n" +
  "                '<div style=\"font-size:13px;font-weight:600;color:#1E293B;\">' + m.type_name + '</div>' +\r\n" +
  "                (isOverdue ? '<div style=\"font-size:12px;font-weight:700;color:#DC2626;\">LEWAT · Sisa: (' + Math.abs(m.remaining) + ') HM</div>' : '<div style=\"font-size:12px;font-weight:700;color:#16A34A;\">direkomendasikan</div>') +\r\n" +
  "              '</div>' +\r\n" +
  "            '</div>';\r\n" +
  "          }).join('') +\r\n" +
  "        '</div>' +\r\n" +
  "      '</div>';\r\n" +
  "    }\r\n" +
  "    function renderRow(r, idx, prefix) {\r\n" +
  "      if (r.is_bundle) return _renderBundleCard(r, idx, prefix);\r\n" +
  "      const k = prefix + '-' + idx;\r\n" +
  "      _alertRegister(k, r);\r\n" +
  "      const sisaText = r.remaining < 0 ? '(' + Math.abs(r.remaining) + ')' : r.remaining;\r\n" +
  "      const sisaColor = r.status === 'OVERDUE' ? '#DC2626' : '#D97706';\r\n" +
  "      const rowBg = r.status === 'OVERDUE' ? '#FFF1F2' : '#FFFBEB';\r\n" +
  "      const chkKey2 = r.unit_id + '|' + r.type_name;\r\n" +
  "      const chkId2 = 'chk-' + k;\r\n" +
  "      const checked2 = jadwalkanChecked.has(chkKey2);\r\n" +
  "      return '<div style=\"background:' + rowBg + ';border-radius:12px;padding:10px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;align-items:flex-start;gap:10px;\">' +\r\n" +
  "        (prefix === 'mknov' ? '<input type=\"checkbox\" id=\"' + chkId2 + '\" ' + (checked2 ? 'checked' : '') + ' onclick=\"_toggleJadwalCheck(\\'' + chkKey2 + '\\',this)\" style=\"width:18px;height:18px;margin-top:2px;cursor:pointer;flex-shrink:0;\" />' : '') +\r\n" +
  "        '<div onclick=\"openAlertDetailModal(\\'' + k + '\\')\" style=\"flex:1;cursor:pointer;\">' +\r\n" +
  "        '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;\"><div style=\"font-size:14px;font-weight:800;color:#1E3A8A;\">' + r.unit_code + '</div>' + badge(r.status) + '</div>' +\r\n" +
  "        '<div style=\"font-size:13px;font-weight:600;color:#1E293B;\">' + r.type_name + '</div>' +\r\n" +
  "        '<div style=\"font-size:15px;font-weight:800;color:' + sisaColor + ';margin-top:2px;\">Sisa: ' + sisaText + ' HM</div></div></div>';\r\n" +
  "    }\r\n" +
  "    function renderGrouped(rows, prefix) {\r\n",
  'loadMknAlerts: add renderBundleCard + checkbox in renderRow'
);

// ============================================================
// PATCH 3d: Replace renderList + overdueEl assignments to use collapsedOverdue
// and add _renderJadwalkanBtn call
// ============================================================
replaceExact(
  "    function renderList(rows, prefix, emptyMsg) {\r\n" +
  "      if (rows.length === 0) return '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">' + emptyMsg + '</div>';\r\n" +
  "      if (mknAlertSort === 'type' || mknAlertSort === 'unit') return renderGrouped(rows, prefix);\r\n" +
  "      return rows.map(function(r, i) { return renderRow(r, i, prefix); }).join('');\r\n" +
  "    }\r\n" +
  "    overdueEl.innerHTML = sortPillsHTML() + renderList(overdueRows, 'mknov', 'Tidak ada Overdue.');\r\n" +
  "    duesoonEl.innerHTML = sortPillsHTML() + renderList(duesoonRows, 'mknds', 'Tidak ada Due Soon.');\r\n",

  "    function renderList(rows, prefix, emptyMsg) {\r\n" +
  "      if (rows.length === 0) return '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">' + emptyMsg + '</div>';\r\n" +
  "      if (mknAlertSort === 'type' || mknAlertSort === 'unit') return renderGrouped(rows, prefix);\r\n" +
  "      return rows.map(function(r, i) { return renderRow(r, i, prefix); }).join('');\r\n" +
  "    }\r\n" +
  "    overdueEl.innerHTML = sortPillsHTML() + renderList(collapsedOverdue, 'mknov', 'Tidak ada Overdue.');\r\n" +
  "    duesoonEl.innerHTML = sortPillsHTML() + renderList(duesoonRows, 'mknds', 'Tidak ada Due Soon.');\r\n" +
  "    _renderJadwalkanBtn();\r\n",
  'loadMknAlerts: use collapsedOverdue + call _renderJadwalkanBtn'
);

// ============================================================
// PATCH 3e: Update renderGrouped to handle bundle items too
// (in the grouped view, bundles should render as bundle cards)
// Replace the rows.forEach to handle is_bundle items
// ============================================================
replaceExact(
  "    function renderGrouped(rows, prefix) {\r\n" +
  "      if (rows.length === 0) return '';\r\n" +
  "      const groupKey = mknAlertSort === 'unit' ? 'unit_code' : 'type_name';\r\n" +
  "      const otherLabel = mknAlertSort === 'unit' ? 'type_name' : 'unit_code';\r\n" +
  "      const headerPrefix = mknAlertSort === 'unit' ? 'Unit ' : '';\r\n" +
  "      const groups = {};\r\n" +
  "      const order = [];\r\n" +
  "      rows.forEach(function(r, i) {\r\n" +
  "        const gk = r[groupKey];\r\n" +
  "        if (!groups[gk]) { groups[gk] = []; order.push(gk); }\r\n" +
  "        groups[gk].push({ row: r, idx: i });\r\n" +
  "      });\r\n",

  "    function renderGrouped(rows, prefix) {\r\n" +
  "      if (rows.length === 0) return '';\r\n" +
  "      const groupKey = mknAlertSort === 'unit' ? 'unit_code' : 'type_name';\r\n" +
  "      const otherLabel = mknAlertSort === 'unit' ? 'type_name' : 'unit_code';\r\n" +
  "      const headerPrefix = mknAlertSort === 'unit' ? 'Unit ' : '';\r\n" +
  "      const groups = {};\r\n" +
  "      const order = [];\r\n" +
  "      rows.forEach(function(r, i) {\r\n" +
  "        const gk = r.is_bundle ? (mknAlertSort === 'unit' ? r.unit_code : 'Oli Mesin Set') : r[groupKey];\r\n" +
  "        if (!groups[gk]) { groups[gk] = []; order.push(gk); }\r\n" +
  "        groups[gk].push({ row: r, idx: i });\r\n" +
  "      });\r\n",
  'loadMknAlerts: renderGrouped handles bundle items'
);

// Also fix the inner row rendering in renderGrouped for bundle items
replaceExact(
  "        const rowsHTML = items.map(function(it, j) {\r\n" +
  "          const k = prefix + '-' + it.idx;\r\n" +
  "          _alertRegister(k, it.row);\r\n" +
  "          const r = it.row;\r\n" +
  "          const sisaText = r.remaining < 0 ? '(' + Math.abs(r.remaining) + ')' : r.remaining;\r\n" +
  "          const sisaColor = r.status === 'OVERDUE' ? '#DC2626' : '#D97706';\r\n" +
  "          const rowBg = r.status === 'OVERDUE' ? '#FFF1F2' : '#FFFBEB';\r\n" +
  "          return '<div onclick=\"openAlertDetailModal(\\'' + k + '\\')\" style=\"background:' + rowBg + ';padding:10px 14px;' + (j > 0 ? 'border-top:1px solid #F1F5F9;' : '') + 'cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;\">' +\r\n" +
  "            '<div style=\"font-size:13px;font-weight:600;color:#1E293B;flex:1;min-width:0;\">' + r[otherLabel] + '</div>' +\r\n" +
  "            '<div style=\"font-size:14px;font-weight:800;color:' + sisaColor + ';white-space:nowrap;\">Sisa: ' + sisaText + ' HM</div>' +\r\n" +
  "            '</div>';\r\n" +
  "        }).join('');\r\n",

  "        const rowsHTML = items.map(function(it, j) {\r\n" +
  "          if (it.row.is_bundle) return _renderBundleCard(it.row, it.idx, prefix);\r\n" +
  "          const k = prefix + '-' + it.idx;\r\n" +
  "          _alertRegister(k, it.row);\r\n" +
  "          const r = it.row;\r\n" +
  "          const sisaText = r.remaining < 0 ? '(' + Math.abs(r.remaining) + ')' : r.remaining;\r\n" +
  "          const sisaColor = r.status === 'OVERDUE' ? '#DC2626' : '#D97706';\r\n" +
  "          const rowBg = r.status === 'OVERDUE' ? '#FFF1F2' : '#FFFBEB';\r\n" +
  "          const chkKey3 = r.unit_id + '|' + r.type_name;\r\n" +
  "          const chkId3 = 'chk-' + k;\r\n" +
  "          const ck3 = jadwalkanChecked.has(chkKey3);\r\n" +
  "          return '<div style=\"background:' + rowBg + ';padding:10px 14px;' + (j > 0 ? 'border-top:1px solid #F1F5F9;' : '') + 'display:flex;align-items:center;gap:10px;\">' +\r\n" +
  "            (prefix === 'mknov' ? '<input type=\"checkbox\" id=\"' + chkId3 + '\" ' + (ck3 ? 'checked' : '') + ' onclick=\"_toggleJadwalCheck(\\'' + chkKey3 + '\\',this)\" style=\"width:18px;height:18px;cursor:pointer;flex-shrink:0;\" />' : '') +\r\n" +
  "            '<div onclick=\"openAlertDetailModal(\\'' + k + '\\')\" style=\"flex:1;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;\">' +\r\n" +
  "            '<div style=\"font-size:13px;font-weight:600;color:#1E293B;flex:1;min-width:0;\">' + r[otherLabel] + '</div>' +\r\n" +
  "            '<div style=\"font-size:14px;font-weight:800;color:' + sisaColor + ';white-space:nowrap;\">Sisa: ' + sisaText + ' HM</div>' +\r\n" +
  "            '</div></div>';\r\n" +
  "        }).join('');\r\n",
  'loadMknAlerts: renderGrouped inner rows handle bundles + checkboxes'
);

// ============================================================
// PATCH 4: Add helper functions after loadMknAlerts
// (_toggleBundleCard, _toggleJadwalCheck, _renderJadwalkanBtn, openJadwalkanModal)
// Insert BEFORE the ADMIN comment
// ============================================================
replaceExact(
  "// ============================================================\r\n" +
  "// ADMIN\r\n" +
  "// ============================================================\r\n" +
  "async function loadAdminData() {\r\n",

  "// ============================================================\r\n" +
  "// ADMIN\r\n" +
  "// ============================================================\r\n" +
  "\r\n" +
  "function _toggleBundleCard(k) {\r\n" +
  "  const rows = document.getElementById('bundle-rows-' + k);\r\n" +
  "  const chev = document.getElementById('bundle-chev-' + k);\r\n" +
  "  if (!rows) return;\r\n" +
  "  const open = rows.style.display === 'none';\r\n" +
  "  rows.style.display = open ? 'block' : 'none';\r\n" +
  "  if (chev) chev.style.transform = open ? 'rotate(90deg)' : '';\r\n" +
  "}\r\n" +
  "\r\n" +
  "function _toggleJadwalCheck(key, el) {\r\n" +
  "  if (el && el.checked) {\r\n" +
  "    jadwalkanChecked.add(key);\r\n" +
  "  } else {\r\n" +
  "    jadwalkanChecked.delete(key);\r\n" +
  "  }\r\n" +
  "  _renderJadwalkanBtn();\r\n" +
  "}\r\n" +
  "\r\n" +
  "function _renderJadwalkanBtn() {\r\n" +
  "  let mknBtn = document.getElementById('jadwalkan-btn-mkn');\r\n" +
  "  if (!mknBtn) {\r\n" +
  "    mknBtn = document.createElement('div');\r\n" +
  "    mknBtn.id = 'jadwalkan-btn-mkn';\r\n" +
  "    mknBtn.style.cssText = 'position:fixed;bottom:80px;left:0;right:0;padding:0 14px;z-index:200;display:none;';\r\n" +
  "    mknBtn.innerHTML = '<button onclick=\"openJadwalkanModal()\" id=\"jadwalkan-btn-mkn-inner\" style=\"width:100%;padding:14px;background:#1D4ED8;color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.2);cursor:pointer;\"></button>';\r\n" +
  "    document.body.appendChild(mknBtn);\r\n" +
  "  }\r\n" +
  "  let adminBtn = document.getElementById('jadwalkan-btn-admin');\r\n" +
  "  if (!adminBtn) {\r\n" +
  "    adminBtn = document.createElement('div');\r\n" +
  "    adminBtn.id = 'jadwalkan-btn-admin';\r\n" +
  "    adminBtn.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:200;display:none;';\r\n" +
  "    adminBtn.innerHTML = '<button onclick=\"openJadwalkanModal()\" id=\"jadwalkan-btn-admin-inner\" style=\"padding:13px 32px;background:#1D4ED8;color:white;border:none;border-radius:99px;font-size:14px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.25);cursor:pointer;white-space:nowrap;\"></button>';\r\n" +
  "    document.body.appendChild(adminBtn);\r\n" +
  "  }\r\n" +
  "  const cnt = jadwalkanChecked.size;\r\n" +
  "  const label = 'Jadwalkan Servis (' + cnt + ')';\r\n" +
  "  const mknInner = document.getElementById('jadwalkan-btn-mkn-inner');\r\n" +
  "  const adminInner = document.getElementById('jadwalkan-btn-admin-inner');\r\n" +
  "  if (mknInner) mknInner.textContent = label;\r\n" +
  "  if (adminInner) adminInner.textContent = label;\r\n" +
  "  const overduePane = document.getElementById('mkn-alat-overdue');\r\n" +
  "  const onMknOverdue = overduePane && overduePane.style.display !== 'none';\r\n" +
  "  if (mknBtn) mknBtn.style.display = (cnt > 0 && onMknOverdue) ? 'block' : 'none';\r\n" +
  "  const jadwalWrap = document.getElementById('adm-jadwal-table-wrap');\r\n" +
  "  const adminView = document.getElementById('view-admin');\r\n" +
  "  const onAdminJadwal = jadwalWrap && adminView && adminView.style.display !== 'none';\r\n" +
  "  if (adminBtn) adminBtn.style.display = (cnt > 0 && onAdminJadwal) ? 'block' : 'none';\r\n" +
  "}\r\n" +
  "\r\n" +
  "function openJadwalkanModal() {\r\n" +
  "  if (jadwalkanChecked.size === 0) return;\r\n" +
  "  const today = new Date();\r\n" +
  "  const dd = String(today.getDate()).padStart(2,'0');\r\n" +
  "  const mm = String(today.getMonth()+1).padStart(2,'0');\r\n" +
  "  const yyyy = today.getFullYear();\r\n" +
  "  const dateStr = dd + '/' + mm + '/' + yyyy;\r\n" +
  "  const entries = [];\r\n" +
  "  jadwalkanChecked.forEach(function(key) {\r\n" +
  "    const pipeIdx = key.indexOf('|');\r\n" +
  "    const unitId = key.slice(0, pipeIdx);\r\n" +
  "    const typeName = key.slice(pipeIdx + 1);\r\n" +
  "    if (typeName === 'Oli Mesin Set') {\r\n" +
  "      const b = jadwalkanAllRows.find(function(r) { return r.is_bundle && r.unit_id === unitId; });\r\n" +
  "      if (b) entries.push({ isBundle: true, unit_code: b.unit_code, type_name: 'Oli Mesin Set', last_hm: b.worst_last_hm, current_hm: b.current_hm, remaining: b.worst_remaining, members: b.members });\r\n" +
  "      else entries.push({ isBundle: true, unit_code: unitId, type_name: 'Oli Mesin Set', last_hm: null, current_hm: null, remaining: null, members: [] });\r\n" +
  "    } else {\r\n" +
  "      const row = jadwalkanAllRows.find(function(r) { return !r.is_bundle && r.unit_id === unitId && r.type_name === typeName; });\r\n" +
  "      if (row) entries.push({ isBundle: false, unit_code: row.unit_code, type_name: typeName, last_hm: row.last_hm, current_hm: row.current_hm, remaining: row.remaining });\r\n" +
  "      else {\r\n" +
  "        const ad = Object.values(_alertData).find(function(d) { return d.unitId === unitId && d.typeName === typeName; });\r\n" +
  "        if (ad) entries.push({ isBundle: false, unit_code: ad.unitCode, type_name: typeName, last_hm: ad.lastHm, current_hm: ad.currentHm, remaining: ad.remaining });\r\n" +
  "        else entries.push({ isBundle: false, unit_code: unitId, type_name: typeName, last_hm: null, current_hm: null, remaining: null });\r\n" +
  "      }\r\n" +
  "    }\r\n" +
  "  });\r\n" +
  "  let text = 'Jadwal Servis Hari Ini · ' + dateStr + '\\n';\r\n" +
  "  text += entries.length + ' alat\\n';\r\n" +
  "  entries.forEach(function(e, i) {\r\n" +
  "    text += '\\n' + (i+1) + '. ' + e.unit_code + ' · ' + e.type_name + '\\n';\r\n" +
  "    const hmSbl = e.last_hm != null ? fmtHM(e.last_hm) : '—';\r\n" +
  "    const hmNow = e.current_hm != null ? fmtHM(e.current_hm) : '—';\r\n" +
  "    text += '   HM Sebelum: ' + hmSbl + ' · HM Saat Ini: ' + hmNow + '\\n';\r\n" +
  "    const sisaAbs = e.remaining != null ? Math.abs(e.remaining) : '—';\r\n" +
  "    text += '   Sisa: (' + sisaAbs + ') HM\\n';\r\n" +
  "    if (e.isBundle && e.members && e.members.length) {\r\n" +
  "      text += '   (' + e.members.map(function(m) { return m.type_name; }).join(', ') + ')\\n';\r\n" +
  "    }\r\n" +
  "  });\r\n" +
  "  const existing = document.getElementById('jadwalkan-modal');\r\n" +
  "  if (existing) existing.remove();\r\n" +
  "  const modal = document.createElement('div');\r\n" +
  "  modal.id = 'jadwalkan-modal';\r\n" +
  "  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;';\r\n" +
  "  const closeId = 'jadwalkan-modal';\r\n" +
  "  modal.innerHTML = '<div style=\"background:white;border-radius:16px;width:100%;max-width:480px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);\">' +\r\n" +
  "    '<div style=\"display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #E2E8F0;\">' +\r\n" +
  "      '<div style=\"font-size:16px;font-weight:700;color:#1E293B;\">Jadwal Servis Hari Ini</div>' +\r\n" +
  "      '<div style=\"display:flex;gap:8px;align-items:center;\">' +\r\n" +
  "        '<button onclick=\"_jadwalkanCopy()\" style=\"padding:7px 14px;background:#EFF6FF;color:#1D4ED8;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;\">Salin</button>' +\r\n" +
  "        '<button onclick=\"document.getElementById(\\'jadwalkan-modal\\').remove()\" style=\"width:32px;height:32px;background:#F1F5F9;border:none;border-radius:8px;font-size:18px;cursor:pointer;color:#64748B;\">×</button>' +\r\n" +
  "      '</div>' +\r\n" +
  "    '</div>' +\r\n" +
  "    '<div style=\"overflow-y:auto;padding:16px 20px;flex:1;\">' +\r\n" +
  "      '<pre id=\"jadwalkan-text\" style=\"font-family:inherit;font-size:13px;white-space:pre-wrap;word-break:break-word;color:#1E293B;margin:0;\"></pre>' +\r\n" +
  "    '</div>' +\r\n" +
  "    '<div style=\"padding:16px 20px;border-top:1px solid #E2E8F0;display:flex;justify-content:center;\">' +\r\n" +
  "      '<button onclick=\"document.getElementById(\\'jadwalkan-modal\\').remove()\" style=\"padding:11px 32px;background:#F1F5F9;color:#374151;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;\">Tutup</button>' +\r\n" +
  "    '</div>' +\r\n" +
  "  '</div>';\r\n" +
  "  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });\r\n" +
  "  document.body.appendChild(modal);\r\n" +
  "  document.getElementById('jadwalkan-text').textContent = text;\r\n" +
  "}\r\n" +
  "\r\n" +
  "function _jadwalkanCopy() {\r\n" +
  "  const pre = document.getElementById('jadwalkan-text');\r\n" +
  "  if (!pre) return;\r\n" +
  "  const txt = pre.textContent;\r\n" +
  "  if (navigator.clipboard && navigator.clipboard.writeText) {\r\n" +
  "    navigator.clipboard.writeText(txt).then(function() {\r\n" +
  "      showToast('Tersalin ke clipboard!', 'success');\r\n" +
  "    }).catch(function() { _jadwalkanCopyFallback(pre); });\r\n" +
  "  } else {\r\n" +
  "    _jadwalkanCopyFallback(pre);\r\n" +
  "  }\r\n" +
  "}\r\n" +
  "\r\n" +
  "function _jadwalkanCopyFallback(pre) {\r\n" +
  "  const range = document.createRange();\r\n" +
  "  range.selectNodeContents(pre);\r\n" +
  "  const sel = window.getSelection();\r\n" +
  "  sel.removeAllRanges();\r\n" +
  "  sel.addRange(range);\r\n" +
  "  try { document.execCommand('copy'); showToast('Tersalin ke clipboard!', 'success'); } catch(e2) { showToast('Gagal menyalin.'); }\r\n" +
  "  sel.removeAllRanges();\r\n" +
  "}\r\n" +
  "\r\n" +
  "async function loadAdminData() {\r\n",
  'add _toggleBundleCard + _toggleJadwalCheck + _renderJadwalkanBtn + openJadwalkanModal'
);

// ============================================================
// PATCH 5: Modify renderAdminJadwal — add bundle collapse + checkboxes
// ============================================================
replaceExact(
  "    if (!scheds) { wrap.innerHTML = '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada data.</div>'; return; }\r\n" +
  "    const filterMap = { 'Semua': null, 'Overdue': 'OVERDUE', 'Due Soon': 'DUE SOON', 'OK': 'OK' };\r\n" +
  "    const filterVal = filterMap[adminJadwalFilter];\r\n" +
  "    let data = scheds.map(s => {\r\n" +
  "      const hm = s.units ? s.units.current_hm || 0 : 0;\r\n" +
  "      const effHm = logMap[s.unit_id + '|' + s.type_name] ?? s.last_hm;\r\n" +
  "      const rem = mRemaining(s.interval_hm, effHm, hm);\r\n" +
  "      const st = mStatus(s.interval_hm, effHm, hm);\r\n" +
  "      return { ...s, effHm, hm, remaining: rem, status: st, hm_due: effHm != null ? effHm + s.interval_hm : null };\r\n" +
  "    });\r\n" +
  "    if (filterVal) data = data.filter(d => d.status === filterVal);\r\n" +
  "    if (data.length === 0) { wrap.innerHTML = '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada data.</div>'; return; }\r\n" +
  "    if (adminJadwalMode === 'unit') data.sort((a,b) => (a.units?.code||'').localeCompare(b.units?.code||'') || a.type_name.localeCompare(b.type_name));\r\n" +
  "    else data.sort((a,b) => a.type_name.localeCompare(b.type_name) || (a.units?.code||'').localeCompare(b.units?.code||''));\r\n" +
  "    const groupBy = adminJadwalMode === 'unit' ? 'unit' : 'tipe';\r\n" +
  "    const groups = {}; const order = [];\r\n" +
  "    data.forEach(function(d) {\r\n" +
  "      const gk = groupBy === 'unit' ? (d.units ? d.units.code : '\\u2014') : d.type_name;\r\n" +
  "      if (!groups[gk]) { groups[gk] = []; order.push(gk); }\r\n" +
  "      groups[gk].push(d);\r\n" +
  "    });\r\n" +
  "    const headerLabel = groupBy === 'unit' ? 'Unit' : 'Tipe';\r\n" +
  "    let bodyHTML = '';\r\n" +
  "    order.forEach(function(gk) {\r\n" +
  "      bodyHTML += '<tr class=\"grp\"><td colspan=\"9\" style=\"background:#EFF6FF;color:#1D4ED8;font-weight:800;padding:8px 10px;border-top:2px solid #DBEAFE;border-bottom:1px solid #DBEAFE;\">' + headerLabel + ' ' + gk + ' <span style=\"font-weight:600;color:#64748B;\">\\u00b7 ' + groups[gk].length + '</span></td></tr>';\r\n" +
  "      groups[gk].forEach(function(d) {\r\n" +
  "        const cls = d.status === 'OVERDUE' ? 'row-overdue' : d.status === 'DUE SOON' ? 'row-duesoon' : '';\r\n" +
  "        const unitCell = groupBy === 'unit' ? '' : (d.units ? d.units.code : '\\u2014');\r\n" +
  "        const typeCell = groupBy === 'tipe' ? '' : d.type_name;\r\n" +
  "        bodyHTML += '<tr class=\"' + cls + '\">' +\r\n" +
  "          '<td style=\"font-weight:600;color:#94A3B8;\">' + unitCell + '</td>' +\r\n" +
  "          '<td' + (groupBy === 'tipe' ? ' style=\"color:#94A3B8;\"' : '') + '>' + typeCell + '</td>' +\r\n" +
  "          '<td>' + fmtHM(d.interval_hm) + '</td>' +\r\n" +
  "          '<td>' + fmtHM(d.effHm) + '</td>' +\r\n" +
  "          '<td>' + formatDate(d.last_date) + '</td>' +\r\n" +
  "          '<td>' + (d.hm_due != null ? fmtHM(d.hm_due) : '\\u2014') + '</td>' +\r\n" +
  "          '<td>' + fmtHM(d.hm) + '</td>' +\r\n" +
  "          '<td style=\"font-weight:700;color:' + (d.remaining == null ? '#94A3B8' : d.remaining < 0 ? '#DC2626' : '#374151') + ';\">' + (d.remaining == null ? '\\u2014' : d.remaining < 0 ? '(' + fmtHM(Math.abs(d.remaining)) + ')' : fmtHM(d.remaining)) + '</td>' +\r\n" +
  "          '<td>' + badge(d.status) + '</td>' +\r\n" +
  "          '</tr>';\r\n" +
  "      });\r\n" +
  "    });\r\n" +
  "    wrap.innerHTML = '<table class=\"dt\">' +\r\n" +
  "      '<thead><tr><th>Unit</th><th>Tipe Maintenance</th><th>Interval (HM)</th><th>HM Terakhir</th><th>Tgl Terakhir</th><th>HM Due</th><th>HM Sekarang</th><th>Sisa HM</th><th>Status</th></tr></thead>' +\r\n" +
  "      '<tbody>' + bodyHTML + '</tbody></table>';\r\n",

  "    if (!scheds) { wrap.innerHTML = '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada data.</div>'; return; }\r\n" +
  "    const filterMap = { 'Semua': null, 'Overdue': 'OVERDUE', 'Due Soon': 'DUE SOON', 'OK': 'OK' };\r\n" +
  "    const filterVal = filterMap[adminJadwalFilter];\r\n" +
  "    const allSchedsEnriched = scheds.map(s => {\r\n" +
  "      const hm = s.units ? s.units.current_hm || 0 : 0;\r\n" +
  "      const effHm = logMap[s.unit_id + '|' + s.type_name] ?? s.last_hm;\r\n" +
  "      const rem = mRemaining(s.interval_hm, effHm, hm);\r\n" +
  "      const st = mStatus(s.interval_hm, effHm, hm);\r\n" +
  "      return { ...s, effHm, hm, remaining: rem, status: st, hm_due: effHm != null ? effHm + s.interval_hm : null };\r\n" +
  "    });\r\n" +
  "    let data = allSchedsEnriched.slice();\r\n" +
  "    if (filterVal) data = data.filter(d => d.status === filterVal);\r\n" +
  "    if (data.length === 0) { wrap.innerHTML = '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada data.</div>'; return; }\r\n" +
  "    if (adminJadwalMode === 'unit') data.sort((a,b) => (a.units?.code||'').localeCompare(b.units?.code||'') || a.type_name.localeCompare(b.type_name));\r\n" +
  "    else data.sort((a,b) => a.type_name.localeCompare(b.type_name) || (a.units?.code||'').localeCompare(b.units?.code||''));\r\n" +
  "\r\n" +
  "    // Apply bundle collapse when Overdue filter is active\r\n" +
  "    const isOverdueFilter = adminJadwalFilter === 'Overdue';\r\n" +
  "    let displayData = data;\r\n" +
  "    if (isOverdueFilter) {\r\n" +
  "      const flatOverdue = data.map(function(d) {\r\n" +
  "        return { unit_id: d.unit_id, unit_code: d.units ? d.units.code : '', type_name: d.type_name, last_hm: d.effHm, current_hm: d.hm, remaining: d.remaining, status: d.status, _orig: d };\r\n" +
  "      });\r\n" +
  "      const allForDetect = allSchedsEnriched.map(function(d) {\r\n" +
  "        return { unit_id: d.unit_id, unit_code: d.units ? d.units.code : '', type_name: d.type_name, last_hm: d.effHm, current_hm: d.hm, remaining: d.remaining, status: d.status };\r\n" +
  "      });\r\n" +
  "      const byUnit = {}; const unitOrder2 = [];\r\n" +
  "      flatOverdue.forEach(function(r) {\r\n" +
  "        if (!byUnit[r.unit_id]) { byUnit[r.unit_id] = []; unitOrder2.push(r.unit_id); }\r\n" +
  "        byUnit[r.unit_id].push(r);\r\n" +
  "      });\r\n" +
  "      displayData = [];\r\n" +
  "      const adminJdRows = [];\r\n" +
  "      unitOrder2.forEach(function(uid) {\r\n" +
  "        const unitItems = byUnit[uid];\r\n" +
  "        const allForUnit2 = allForDetect.filter(function(r) { return r.unit_id === uid; });\r\n" +
  "        const det = _detectOliMesinSet(unitItems, allForUnit2);\r\n" +
  "        if (det.bundleItem) {\r\n" +
  "          det.bundleItem.unit_code = unitItems[0].unit_code;\r\n" +
  "          displayData.push({ _is_bundle: true, _bundle: det.bundleItem, unit_id: uid, unit_code: unitItems[0].unit_code });\r\n" +
  "          adminJdRows.push(det.bundleItem);\r\n" +
  "        }\r\n" +
  "        det.remainingItems.forEach(function(it) {\r\n" +
  "          displayData.push(it._orig || it);\r\n" +
  "          adminJdRows.push(it);\r\n" +
  "        });\r\n" +
  "      });\r\n" +
  "      jadwalkanAllRows = adminJdRows;\r\n" +
  "    }\r\n" +
  "\r\n" +
  "    const groupBy = adminJadwalMode === 'unit' ? 'unit' : 'tipe';\r\n" +
  "    const groups = {}; const order = [];\r\n" +
  "    displayData.forEach(function(d) {\r\n" +
  "      let gk;\r\n" +
  "      if (d._is_bundle) gk = groupBy === 'unit' ? d.unit_code : 'Oli Mesin Set';\r\n" +
  "      else gk = groupBy === 'unit' ? (d.units ? d.units.code : (d.unit_code || '—')) : d.type_name;\r\n" +
  "      if (!groups[gk]) { groups[gk] = []; order.push(gk); }\r\n" +
  "      groups[gk].push(d);\r\n" +
  "    });\r\n" +
  "    const headerLabel = groupBy === 'unit' ? 'Unit' : 'Tipe';\r\n" +
  "    const colSpan = isOverdueFilter ? '10' : '9';\r\n" +
  "    let bodyHTML = '';\r\n" +
  "    order.forEach(function(gk) {\r\n" +
  "      const grpItems = groups[gk];\r\n" +
  "      bodyHTML += '<tr class=\"grp\"><td colspan=\"' + colSpan + '\" style=\"background:#EFF6FF;color:#1D4ED8;font-weight:800;padding:8px 10px;border-top:2px solid #DBEAFE;border-bottom:1px solid #DBEAFE;\">' + headerLabel + ' ' + gk + ' <span style=\"font-weight:600;color:#64748B;\">· ' + grpItems.length + '</span></td></tr>';\r\n" +
  "      grpItems.forEach(function(d) {\r\n" +
  "        if (d._is_bundle) {\r\n" +
  "          const b = d._bundle;\r\n" +
  "          const bKey = b.unit_id + '|Oli Mesin Set';\r\n" +
  "          const bChecked = jadwalkanChecked.has(bKey);\r\n" +
  "          const overdueMbrs = b.members.filter(function(m) { return m.status === 'OVERDUE'; });\r\n" +
  "          const sisaAbs = b.worst_remaining != null ? Math.abs(b.worst_remaining) : 0;\r\n" +
  "          bodyHTML += '<tr class=\"row-overdue\">' +\r\n" +
  "            (isOverdueFilter ? '<td><input type=\"checkbox\" ' + (bChecked ? 'checked' : '') + ' onclick=\"_toggleJadwalCheck(\\'' + bKey + '\\',this)\" style=\"width:16px;height:16px;cursor:pointer;\" /></td>' : '<td></td>') +\r\n" +
  "            '<td colspan=\"2\" style=\"font-weight:800;color:#1D4ED8;\">' + b.unit_code + ' · Oli Mesin Set <span style=\"font-size:11px;font-weight:600;color:#64748B;\">' + b.member_count + ' dari 4</span></td>' +\r\n" +
  "            '<td>' + fmtHM(b.interval_hm) + '</td>' +\r\n" +
  "            '<td>' + fmtHM(b.worst_last_hm) + '</td>' +\r\n" +
  "            '<td>—</td><td>—</td>' +\r\n" +
  "            '<td>' + fmtHM(b.current_hm) + '</td>' +\r\n" +
  "            '<td style=\"font-weight:700;color:#DC2626;\">(' + fmtHM(sisaAbs) + ')</td>' +\r\n" +
  "            '<td>' + badge('OVERDUE') + '</td>' +\r\n" +
  "          '</tr>';\r\n" +
  "          b.members.forEach(function(m) {\r\n" +
  "            const isOv = m.status === 'OVERDUE';\r\n" +
  "            const mCls = isOv ? 'row-overdue' : '';\r\n" +
  "            const mSisaStr = m.remaining != null ? (m.remaining < 0 ? '(' + fmtHM(Math.abs(m.remaining)) + ')' : fmtHM(m.remaining)) : '—';\r\n" +
  "            const mSisaColor = isOv ? '#DC2626' : '#16A34A';\r\n" +
  "            bodyHTML += '<tr class=\"' + mCls + '\" style=\"opacity:0.85;\">' +\r\n" +
  "              (isOverdueFilter ? '<td style=\"width:36px;\"></td>' : '<td></td>') +\r\n" +
  "              '<td style=\"color:#94A3B8;padding-left:20px;\">└</td>' +\r\n" +
  "              '<td style=\"' + (!isOv ? 'color:#16A34A;' : '') + '\">' + m.type_name + (!isOv ? ' <span style=\"background:#DCFCE7;color:#16A34A;font-size:10px;padding:1px 5px;border-radius:4px;\">direkomendasikan</span>' : '') + '</td>' +\r\n" +
  "              '<td>500</td><td>' + fmtHM(m.last_hm) + '</td><td>—</td><td>—</td>' +\r\n" +
  "              '<td>' + fmtHM(m.current_hm) + '</td>' +\r\n" +
  "              '<td style=\"font-weight:700;color:' + mSisaColor + ';\">' + mSisaStr + '</td>' +\r\n" +
  "              '<td>' + (isOv ? badge('OVERDUE') : '<span style=\"font-size:11px;color:#16A34A;\">OK</span>') + '</td>' +\r\n" +
  "            '</tr>';\r\n" +
  "          });\r\n" +
  "        } else {\r\n" +
  "          const cls = d.status === 'OVERDUE' ? 'row-overdue' : d.status === 'DUE SOON' ? 'row-duesoon' : '';\r\n" +
  "          const unitCell = groupBy === 'unit' ? '' : (d.units ? d.units.code : (d.unit_code || '—'));\r\n" +
  "          const typeCell = groupBy === 'tipe' ? '' : d.type_name;\r\n" +
  "          const dKey = (d.unit_id || '') + '|' + d.type_name;\r\n" +
  "          const dChecked = jadwalkanChecked.has(dKey);\r\n" +
  "          bodyHTML += '<tr class=\"' + cls + '\">' +\r\n" +
  "            (isOverdueFilter ? '<td><input type=\"checkbox\" ' + (dChecked ? 'checked' : '') + ' onclick=\"_toggleJadwalCheck(\\'' + dKey + '\\',this)\" style=\"width:16px;height:16px;cursor:pointer;\" /></td>' : '<td></td>') +\r\n" +
  "            '<td style=\"font-weight:600;color:#94A3B8;\">' + unitCell + '</td>' +\r\n" +
  "            '<td' + (groupBy === 'tipe' ? ' style=\"color:#94A3B8;\"' : '') + '>' + typeCell + '</td>' +\r\n" +
  "            '<td>' + fmtHM(d.interval_hm) + '</td>' +\r\n" +
  "            '<td>' + fmtHM(d.effHm) + '</td>' +\r\n" +
  "            '<td>' + formatDate(d.last_date) + '</td>' +\r\n" +
  "            '<td>' + (d.hm_due != null ? fmtHM(d.hm_due) : '—') + '</td>' +\r\n" +
  "            '<td>' + fmtHM(d.hm) + '</td>' +\r\n" +
  "            '<td style=\"font-weight:700;color:' + (d.remaining == null ? '#94A3B8' : d.remaining < 0 ? '#DC2626' : '#374151') + ';\">' + (d.remaining == null ? '—' : d.remaining < 0 ? '(' + fmtHM(Math.abs(d.remaining)) + ')' : fmtHM(d.remaining)) + '</td>' +\r\n" +
  "            '<td>' + badge(d.status) + '</td>' +\r\n" +
  "          '</tr>';\r\n" +
  "        }\r\n" +
  "      });\r\n" +
  "    });\r\n" +
  "    wrap.innerHTML = '<table class=\"dt\">' +\r\n" +
  "      '<thead><tr><th style=\"width:36px;\"></th><th>Unit</th><th>Tipe Maintenance</th><th>Interval (HM)</th><th>HM Terakhir</th><th>Tgl Terakhir</th><th>HM Due</th><th>HM Sekarang</th><th>Sisa HM</th><th>Status</th></tr></thead>' +\r\n" +
  "      '<tbody>' + bodyHTML + '</tbody></table>';\r\n" +
  "    if (isOverdueFilter) _renderJadwalkanBtn();\r\n",
  'renderAdminJadwal: bundle collapse + checkboxes for Overdue filter'
);

// ============================================================
// PATCH 6: Modify loadSPVUnitList — add bundle detection
// ============================================================
replaceExact(
  "      const rows = u.alertItems.map((s, idx) => {\r\n" +
  "        const isOverdue = s.status === 'OVERDUE';\r\n" +
  "        const rowBg     = isOverdue ? '#FEF2F2' : '#FFFBEB';\r\n" +
  "        const rowBorder = isOverdue ? '#FECACA' : '#FDE68A';\r\n" +
  "        const hmColor   = isOverdue ? '#DC2626' : '#D97706';\r\n" +
  "        const hmLabel   = s.remaining < 0\r\n" +
  "          ? `${fmtHM(Math.abs(Math.round(s.remaining)))} HM terlambat`\r\n" +
  "          : `${fmtHM(Math.round(s.remaining))} HM lagi`;\r\n" +
  "        const k = 'spv-' + u.id + '-' + idx;\r\n" +
  "        _alertData[k] = { typeName: s.type_name, lastHm: s.last_hm || 0, lastDate: s.last_date || null, intervalHm: s.interval_hm, currentHm: u.current_hm || 0, remaining: s.remaining, status: s.status, unitId: u.id, unitCode: u.code, role: 'spv' };\r\n" +
  "        return `<div onclick=\"openAlertDetailModal('${k}');event.stopPropagation();\" style=\"display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:5px;border-radius:9px;background:${rowBg};border:1.5px solid ${rowBorder};cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,0.08);\">\r\n" +
  "          <div style=\"flex:1;min-width:0;\">\r\n" +
  "            <div style=\"font-size:13px;font-weight:700;color:#1E293B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">${s.type_name}</div>\r\n" +
  "          </div>\r\n" +
  "          <div style=\"font-size:12px;font-weight:700;color:${hmColor};white-space:nowrap;\">${hmLabel}</div>\r\n" +
  "          ${badge(s.status)}\r\n" +
  "          <svg width=\"14\" height=\"14\" fill=\"none\" stroke=\"#CBD5E1\" stroke-width=\"2.5\" viewBox=\"0 0 24 24\" style=\"flex-shrink:0;\"><path d=\"M9 18l6-6-6-6\"/></svg>\r\n" +
  "        </div>`;\r\n" +
  "      }).join('');\r\n",

  "      // Detect bundle for this unit (text summary only, no checkboxes on SPV)\r\n" +
  "      const _spvOverdueMapped = u.alertItems\r\n" +
  "        .filter(function(s) { return s.status === 'OVERDUE'; })\r\n" +
  "        .map(function(s) { return Object.assign({}, s, { unit_id: u.id, unit_code: u.code, current_hm: u.current_hm || 0 }); });\r\n" +
  "      const _spvAllMapped = schedsWithMeta.map(function(s) { return Object.assign({}, s, { unit_id: u.id, unit_code: u.code, current_hm: u.current_hm || 0 }); });\r\n" +
  "      const _spvBundleDet = _detectOliMesinSet(_spvOverdueMapped, _spvAllMapped);\r\n" +
  "      const rows = u.alertItems.map((s, idx) => {\r\n" +
  "        const isOverdue = s.status === 'OVERDUE';\r\n" +
  "        const rowBg     = isOverdue ? '#FEF2F2' : '#FFFBEB';\r\n" +
  "        const rowBorder = isOverdue ? '#FECACA' : '#FDE68A';\r\n" +
  "        const hmColor   = isOverdue ? '#DC2626' : '#D97706';\r\n" +
  "        const hmLabel   = s.remaining < 0\r\n" +
  "          ? `${fmtHM(Math.abs(Math.round(s.remaining)))} HM terlambat`\r\n" +
  "          : `${fmtHM(Math.round(s.remaining))} HM lagi`;\r\n" +
  "        const k = 'spv-' + u.id + '-' + idx;\r\n" +
  "        _alertData[k] = { typeName: s.type_name, lastHm: s.last_hm || 0, lastDate: s.last_date || null, intervalHm: s.interval_hm, currentHm: u.current_hm || 0, remaining: s.remaining, status: s.status, unitId: u.id, unitCode: u.code, role: 'spv' };\r\n" +
  "        return `<div onclick=\"openAlertDetailModal('${k}');event.stopPropagation();\" style=\"display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:5px;border-radius:9px;background:${rowBg};border:1.5px solid ${rowBorder};cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,0.08);\">\r\n" +
  "          <div style=\"flex:1;min-width:0;\">\r\n" +
  "            <div style=\"font-size:13px;font-weight:700;color:#1E293B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">${s.type_name}</div>\r\n" +
  "          </div>\r\n" +
  "          <div style=\"font-size:12px;font-weight:700;color:${hmColor};white-space:nowrap;\">${hmLabel}</div>\r\n" +
  "          ${badge(s.status)}\r\n" +
  "          <svg width=\"14\" height=\"14\" fill=\"none\" stroke=\"#CBD5E1\" stroke-width=\"2.5\" viewBox=\"0 0 24 24\" style=\"flex-shrink:0;\"><path d=\"M9 18l6-6-6-6\"/></svg>\r\n" +
  "        </div>`;\r\n" +
  "      }).join('');\r\n",
  'loadSPVUnitList: add bundle detection'
);

// Patch body building to include bundleSummaryHtml
replaceExact(
  "      const body = u.alertItems.length > 0\r\n" +
  "        ? `<div style=\"padding:10px 12px 12px;\">${rows}${u.okCount > 0 ? `<div style=\"font-size:11px;color:#94A3B8;text-align:center;margin-top:4px;\">${u.okCount} jadwal lainnya OK</div>` : ''}</div>`\r\n" +
  "        : `<div style=\"padding:14px 12px;text-align:center;font-size:13px;color:#6EE7B7;font-weight:600;\">Semua jadwal OK ✓</div>`;\r\n",

  "      let _spvBundleHTML = '';\r\n" +
  "      if (_spvBundleDet.bundleItem) {\r\n" +
  "        const bOvMbrs = _spvBundleDet.bundleItem.members.filter(function(m) { return m.status === 'OVERDUE'; });\r\n" +
  "        const bRecMbrs = _spvBundleDet.bundleItem.members.filter(function(m) { return m.status !== 'OVERDUE'; });\r\n" +
  "        const bMbrsText = bOvMbrs.map(function(m) { return m.type_name; }).join(', ');\r\n" +
  "        const bRecText = bRecMbrs.length > 0 ? ' · juga direkomendasikan: ' + bRecMbrs.map(function(m) { return m.type_name; }).join(', ') : '';\r\n" +
  "        _spvBundleHTML = '<div style=\"font-size:11px;font-weight:600;color:#DC2626;padding:6px 12px 0;\">Overdue: Oli Mesin Set (' + bMbrsText + ')' + bRecText + '</div>';\r\n" +
  "      }\r\n" +
  "      const body = u.alertItems.length > 0\r\n" +
  "        ? `<div style=\"padding:10px 12px 12px;\">${_spvBundleHTML}${rows}${u.okCount > 0 ? `<div style=\"font-size:11px;color:#94A3B8;text-align:center;margin-top:4px;\">${u.okCount} jadwal lainnya OK</div>` : ''}</div>`\r\n" +
  "        : `<div style=\"padding:14px 12px;text-align:center;font-size:13px;color:#6EE7B7;font-weight:600;\">Semua jadwal OK ✓</div>`;\r\n",
  'loadSPVUnitList: bundle summary in unit card'
);

// ============================================================
// PATCH 7: Modify loadAdminDashboard — Set-aware overdue text
// ============================================================
replaceExact(
  "          ${overdueList.length > 0 ? `<div style=\"font-size:11px;color:#DC2626;margin-top:4px;\">Overdue: ${overdueList.join(', ')}</div>` : ''}\r\n" +
  "          ${dueSoonList.length > 0 ? `<div style=\"font-size:11px;color:#D97706;margin-top:2px;\">Due Soon: ${dueSoonList.join(', ')}</div>` : ''}\r\n" +
  "        </div>`;\r\n",

  "          ${(function() {\r\n" +
  "            if (overdueList.length === 0) return '';\r\n" +
  "            const fakeOvRows = overdueList.map(function(tn) { return { unit_id: u.id, unit_code: u.code, type_name: tn, last_hm: null, current_hm: u.current_hm || 0, remaining: -1, status: 'OVERDUE' }; });\r\n" +
  "            const fakeAllRows = (scheds || []).filter(function(s) { return s.unit_id === u.id; }).map(function(s) {\r\n" +
  "              const eff = logMap[s.unit_id + '|' + s.type_name] ?? s.last_hm;\r\n" +
  "              return { unit_id: u.id, unit_code: u.code, type_name: s.type_name, last_hm: eff, current_hm: u.current_hm || 0, remaining: mRemaining(s.interval_hm, eff, u.current_hm || 0), status: mStatus(s.interval_hm, eff, u.current_hm || 0) };\r\n" +
  "            });\r\n" +
  "            const adminDet = _detectOliMesinSet(fakeOvRows, fakeAllRows);\r\n" +
  "            if (adminDet.bundleItem) {\r\n" +
  "              const bOv2 = adminDet.bundleItem.members.filter(function(m) { return m.status === 'OVERDUE'; });\r\n" +
  "              const bRec2 = adminDet.bundleItem.members.filter(function(m) { return m.status !== 'OVERDUE'; });\r\n" +
  "              const bMbrs2 = bOv2.map(function(m) { return m.type_name; }).join(', ');\r\n" +
  "              const bRec2Text = bRec2.length > 0 ? ' · juga direkomendasikan: ' + bRec2.map(function(m) { return m.type_name; }).join(', ') : '';\r\n" +
  "              const extras2 = adminDet.remainingItems.map(function(r) { return r.type_name; });\r\n" +
  "              const extText2 = extras2.length > 0 ? ' + ' + extras2.join(', ') : '';\r\n" +
  "              return '<div style=\"font-size:11px;color:#DC2626;margin-top:4px;\">Overdue: Oli Mesin Set (' + bMbrs2 + ')' + bRec2Text + extText2 + '</div>';\r\n" +
  "            }\r\n" +
  "            return '<div style=\"font-size:11px;color:#DC2626;margin-top:4px;\">Overdue: ' + overdueList.join(', ') + '</div>';\r\n" +
  "          })()}\r\n" +
  "          ${dueSoonList.length > 0 ? `<div style=\"font-size:11px;color:#D97706;margin-top:2px;\">Due Soon: ${dueSoonList.join(', ')}</div>` : ''}\r\n" +
  "        </div>`;\r\n",
  'loadAdminDashboard: bundle-aware overdue text in unit grid'
);

fs.writeFileSync(path, src);
console.log('Done.');
