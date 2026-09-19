// patch_mkn_alert_sort.js — add HM/Type/Unit sort pills to Overdue + Due Soon panels

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

// PATCH 1: add state var
replaceExact(
  "let mknAlatSubTab = 'riwayat';\r\n" +
  "let mknRiwayatUnitId = null;\r\n",
  "let mknAlatSubTab = 'riwayat';\r\n" +
  "let mknRiwayatUnitId = null;\r\n" +
  "let mknAlertSort = 'hm';\r\n",
  'add mknAlertSort state'
);

// PATCH 2: rewrite loadMknAlerts sort logic + inject pills into rendered output
replaceExact(
  "    overdueRows.sort(function(a, b) { return a.remaining - b.remaining; });\r\n" +
  "    duesoonRows.sort(function(a, b) { return a.remaining - b.remaining; });\r\n",
  "    const cmpFn = mknAlertSort === 'type'\r\n" +
  "      ? function(a, b) { return String(a.type_name).localeCompare(String(b.type_name)) || a.remaining - b.remaining; }\r\n" +
  "      : mknAlertSort === 'unit'\r\n" +
  "      ? function(a, b) { return String(a.unit_code).localeCompare(String(b.unit_code)) || a.remaining - b.remaining; }\r\n" +
  "      : function(a, b) { return a.remaining - b.remaining; };\r\n" +
  "    overdueRows.sort(cmpFn);\r\n" +
  "    duesoonRows.sort(cmpFn);\r\n",
  'apply mknAlertSort in loadMknAlerts'
);

// PATCH 3: prepend sort pills to both rendered panels
replaceExact(
  "    overdueEl.innerHTML = overdueRows.length === 0 ? '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada Overdue.</div>' : overdueRows.map(function(r, i) { return renderRow(r, i, 'mknov'); }).join('');\r\n" +
  "    duesoonEl.innerHTML = duesoonRows.length === 0 ? '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada Due Soon.</div>' : duesoonRows.map(function(r, i) { return renderRow(r, i, 'mknds'); }).join('');\r\n",
  "    function sortPillsHTML() {\r\n" +
  "      const pills = [{k:'hm',l:'Sisa HM'},{k:'type',l:'Tipe'},{k:'unit',l:'Unit'}];\r\n" +
  "      return '<div style=\"display:flex;gap:6px;padding:8px 0 10px;position:sticky;top:0;background:#F8FAFC;z-index:5;\">' + pills.map(function(p) {\r\n" +
  "        const on = mknAlertSort === p.k;\r\n" +
  "        return '<button onclick=\"setMknAlertSort(\\'' + p.k + '\\')\" style=\"padding:5px 12px;border-radius:99px;border:none;cursor:pointer;font-size:12px;font-weight:700;background:' + (on ? '#1D4ED8' : '#F1F5F9') + ';color:' + (on ? '#fff' : '#64748B') + ';\">' + p.l + '</button>';\r\n" +
  "      }).join('') + '</div>';\r\n" +
  "    }\r\n" +
  "    overdueEl.innerHTML = sortPillsHTML() + (overdueRows.length === 0 ? '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada Overdue.</div>' : overdueRows.map(function(r, i) { return renderRow(r, i, 'mknov'); }).join(''));\r\n" +
  "    duesoonEl.innerHTML = sortPillsHTML() + (duesoonRows.length === 0 ? '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada Due Soon.</div>' : duesoonRows.map(function(r, i) { return renderRow(r, i, 'mknds'); }).join(''));\r\n",
  'inject sort pills into panels'
);

// PATCH 4: add setMknAlertSort handler right after switchMknAlatSubTab
replaceExact(
  "function switchMknAlatSubTab(tab) {\r\n" +
  "  mknAlatSubTab = tab;\r\n",
  "function setMknAlertSort(s) {\r\n" +
  "  if (s !== 'hm' && s !== 'type' && s !== 'unit') return;\r\n" +
  "  mknAlertSort = s;\r\n" +
  "  loadMknAlerts();\r\n" +
  "}\r\n\r\n" +
  "function switchMknAlatSubTab(tab) {\r\n" +
  "  mknAlatSubTab = tab;\r\n",
  'add setMknAlertSort handler'
);

fs.writeFileSync(path, src);
console.log('Done.');
