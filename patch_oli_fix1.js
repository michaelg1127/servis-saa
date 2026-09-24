// patch_oli_fix1.js — Fix round 1 for Oli Mesin Set feature
// Fixes:
//   (1) Admin Jadwal bundle: render as grp group-header row, fix outer count
//   (2) Admin floating button: hide when adminJadwalFilter !== 'Overdue'
//   (3) Remove dead closeId variable in openJadwalkanModal
//   (4) SPV/Admin "juga direkomendasikan" — already correct, verified below

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
// FIX 1: Admin Jadwal Overdue bundle — render as grp group-header row
// The outer unit group header count should tally 4 members (not 1 bundle obj).
// The bundle row itself must be <tr class="grp">, not <tr class="row-overdue">.
// ============================================================

// 1a: Fix outer group header to use effCount + bundle renders as grp row
// Note: · is U+00B7, — is U+2014 (actual chars, not escape sequences)
replaceExact(
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
  "          '</tr>';\r\n",

  "      const grpItems = groups[gk];\r\n" +
  "      // Count effective rows: bundle expands to its members.length, not 1 object\r\n" +
  "      const effCount = grpItems.reduce(function(acc, d) { return acc + (d._is_bundle ? d._bundle.members.length : 1); }, 0);\r\n" +
  "      bodyHTML += '<tr class=\"grp\"><td colspan=\"' + colSpan + '\" style=\"background:#EFF6FF;color:#1D4ED8;font-weight:800;padding:8px 10px;border-top:2px solid #DBEAFE;border-bottom:1px solid #DBEAFE;\">' + headerLabel + ' ' + gk + ' <span style=\"font-weight:600;color:#64748B;\">· ' + effCount + '</span></td></tr>';\r\n" +
  "      grpItems.forEach(function(d) {\r\n" +
  "        if (d._is_bundle) {\r\n" +
  "          const b = d._bundle;\r\n" +
  "          const bKey = b.unit_id + '|Oli Mesin Set';\r\n" +
  "          const bChecked = jadwalkanChecked.has(bKey);\r\n" +
  "          // Spec section 4: bundle is its own blue grp group-header row\r\n" +
  "          bodyHTML += '<tr class=\"grp\"><td colspan=\"' + colSpan + '\" style=\"background:#DBEAFE;color:#1D4ED8;font-weight:800;padding:7px 10px;border-top:1px solid #BFDBFE;border-bottom:1px solid #BFDBFE;\">' +\r\n" +
  "            (isOverdueFilter ? '<span style=\"margin-right:8px;\"><input type=\"checkbox\" ' + (bChecked ? 'checked' : '') + ' onclick=\"event.stopPropagation();_toggleJadwalCheck(\\'' + bKey + '\\',this)\" style=\"width:15px;height:15px;cursor:pointer;vertical-align:middle;\" /></span>' : '') +\r\n" +
  "            b.unit_code + ' · Oli Mesin Set · <span style=\"font-weight:600;color:#374151;\">' + b.member_count + ' dari 4</span></td></tr>';\r\n",

  'renderAdminJadwal: bundle renders as grp row, outer unit count uses effCount'
);

// ============================================================
// FIX 2: Admin floating button — add adminJadwalFilter check
// ============================================================

// 2a: Fix _renderJadwalkanBtn to require adminJadwalFilter === 'Overdue'
replaceExact(
  "  const jadwalWrap = document.getElementById('adm-jadwal-table-wrap');\r\n" +
  "  const adminView = document.getElementById('view-admin');\r\n" +
  "  const onAdminJadwal = jadwalWrap && adminView && adminView.style.display !== 'none';\r\n" +
  "  if (adminBtn) adminBtn.style.display = (cnt > 0 && onAdminJadwal) ? 'block' : 'none';\r\n" +
  "}",

  "  const jadwalWrap = document.getElementById('adm-jadwal-table-wrap');\r\n" +
  "  const adminView = document.getElementById('view-admin');\r\n" +
  "  const onAdminJadwal = jadwalWrap && adminView && adminView.style.display !== 'none' && adminJadwalFilter === 'Overdue';\r\n" +
  "  if (adminBtn) adminBtn.style.display = (cnt > 0 && onAdminJadwal) ? 'block' : 'none';\r\n" +
  "}",

  '_renderJadwalkanBtn: add adminJadwalFilter === Overdue check for admin button'
);

// 2b: Always call _renderJadwalkanBtn at end of renderAdminJadwal (not only on Overdue)
replaceExact(
  "    if (isOverdueFilter) _renderJadwalkanBtn();\r\n" +
  "  } catch (e) { showToast('Error jadwal: ' + e.message); }",

  "    _renderJadwalkanBtn();\r\n" +
  "  } catch (e) { showToast('Error jadwal: ' + e.message); }",

  'renderAdminJadwal: always call _renderJadwalkanBtn (not only on Overdue)'
);

// ============================================================
// FIX 3: Remove dead closeId variable in openJadwalkanModal
// ============================================================
replaceExact(
  "  modal.id = 'jadwalkan-modal';\r\n" +
  "  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;';\r\n" +
  "  const closeId = 'jadwalkan-modal';\r\n" +
  "  modal.innerHTML =",

  "  modal.id = 'jadwalkan-modal';\r\n" +
  "  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;';\r\n" +
  "  modal.innerHTML =",

  'openJadwalkanModal: remove dead closeId variable'
);

// ============================================================
// FIX 4: Verify SPV/Admin "juga direkomendasikan" already correct
// ============================================================
const jugas = src.split('juga direkomendasikan').length - 1;
console.log('VERIFY: "juga direkomendasikan" occurrences = ' + jugas + ' (expected >= 2)');

fs.writeFileSync(path, src);
console.log('Done — patch_oli_fix1.js applied.');
