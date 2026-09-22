// patch_mkn_grouped_render.js — group Overdue/Due Soon rows under Unit or Type header
//   when sorted by Unit or Tipe. Sisa HM sort keeps the flat layout.

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

// Replace the renderRow inner function + the final .innerHTML assignments with
// a grouped renderer when sort is 'type' or 'unit'.
replaceExact(
  "    function renderRow(r, idx, prefix) {\r\n" +
  "      const k = prefix + '-' + idx;\r\n" +
  "      _alertData[k] = { typeName: r.type_name, lastHm: r.last_hm, lastDate: null, intervalHm: r.interval_hm, currentHm: r.current_hm, remaining: r.remaining, status: r.status, unitId: r.unit_id, unitCode: r.unit_code, role: 'mkn' };\r\n" +
  "      const sisaText = r.remaining < 0 ? '(' + Math.abs(r.remaining) + ')' : r.remaining;\r\n" +
  "      const sisaColor = r.status === 'OVERDUE' ? '#DC2626' : '#D97706';\r\n" +
  "      const rowBg = r.status === 'OVERDUE' ? '#FFF1F2' : '#FFFBEB';\r\n" +
  "      return '<div onclick=\"openAlertDetailModal(\\'' + k + '\\')\" style=\"background:' + rowBg + ';border-radius:12px;padding:10px 14px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;\">' +\r\n" +
  "        '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;\"><div style=\"font-size:14px;font-weight:800;color:#1E3A8A;\">' + r.unit_code + '</div>' + badge(r.status) + '</div>' +\r\n" +
  "        '<div style=\"font-size:13px;font-weight:600;color:#1E293B;\">' + r.type_name + '</div>' +\r\n" +
  "        '<div style=\"font-size:15px;font-weight:800;color:' + sisaColor + ';margin-top:2px;\">Sisa: ' + sisaText + ' HM</div></div>';\r\n" +
  "    }\r\n",
  "    function _alertRegister(k, r) {\r\n" +
  "      _alertData[k] = { typeName: r.type_name, lastHm: r.last_hm, lastDate: null, intervalHm: r.interval_hm, currentHm: r.current_hm, remaining: r.remaining, status: r.status, unitId: r.unit_id, unitCode: r.unit_code, role: 'mkn' };\r\n" +
  "    }\r\n" +
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
  "      });\r\n" +
  "      return order.map(function(gk) {\r\n" +
  "        const items = groups[gk];\r\n" +
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
  "        }).join('');\r\n" +
  "        return '<div style=\"background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden;margin-bottom:10px;\">' +\r\n" +
  "          '<div style=\"background:#EFF6FF;padding:8px 14px;font-size:13px;font-weight:800;color:#1E3A8A;border-bottom:1px solid #DBEAFE;\">' + headerPrefix + gk + ' <span style=\"font-weight:600;color:#64748B;\">· ' + items.length + '</span></div>' +\r\n" +
  "          rowsHTML +\r\n" +
  "          '</div>';\r\n" +
  "      }).join('');\r\n" +
  "    }\r\n",
  'add _alertRegister + renderGrouped helper'
);

// Update the final innerHTML assignments to use grouped renderer for type/unit sorts
replaceExact(
  "    overdueEl.innerHTML = sortPillsHTML() + (overdueRows.length === 0 ? '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada Overdue.</div>' : overdueRows.map(function(r, i) { return renderRow(r, i, 'mknov'); }).join(''));\r\n" +
  "    duesoonEl.innerHTML = sortPillsHTML() + (duesoonRows.length === 0 ? '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada Due Soon.</div>' : duesoonRows.map(function(r, i) { return renderRow(r, i, 'mknds'); }).join(''));\r\n",
  "    function renderList(rows, prefix, emptyMsg) {\r\n" +
  "      if (rows.length === 0) return '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">' + emptyMsg + '</div>';\r\n" +
  "      if (mknAlertSort === 'type' || mknAlertSort === 'unit') return renderGrouped(rows, prefix);\r\n" +
  "      return rows.map(function(r, i) { return renderRow(r, i, prefix); }).join('');\r\n" +
  "    }\r\n" +
  "    overdueEl.innerHTML = sortPillsHTML() + renderList(overdueRows, 'mknov', 'Tidak ada Overdue.');\r\n" +
  "    duesoonEl.innerHTML = sortPillsHTML() + renderList(duesoonRows, 'mknds', 'Tidak ada Due Soon.');\r\n",
  'wire grouped renderer via renderList dispatcher'
);

fs.writeFileSync(path, src);
console.log('Done.');
