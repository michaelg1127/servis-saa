// patch_admin_jadwal_grouped.js — group Admin Jadwal Maintenance rows under a
//   Unit or Tipe header row (colspan) so the sort key isn't repeated in every row.

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

// Replace the flat table body render with grouped rendering when a sort mode is active
replaceExact(
  "    if (adminJadwalMode === 'unit') data.sort((a,b) => (a.units?.code||'').localeCompare(b.units?.code||''));\r\n" +
  "    else data.sort((a,b) => a.type_name.localeCompare(b.type_name));\r\n" +
  "    wrap.innerHTML = `<table class=\"dt\">\r\n" +
  "      <thead><tr><th>Unit</th><th>Tipe Maintenance</th><th>Interval (HM)</th><th>HM Terakhir</th><th>Tgl Terakhir</th><th>HM Due</th><th>HM Sekarang</th><th>Sisa HM</th><th>Status</th></tr></thead>\r\n" +
  "      <tbody>${data.map(d => `<tr class=\"${d.status === 'OVERDUE' ? 'row-overdue' : d.status === 'DUE SOON' ? 'row-duesoon' : ''}\">\r\n" +
  "        <td style=\"font-weight:600;\">${d.units ? d.units.code : '&mdash;'}</td>\r\n" +
  "        <td>${d.type_name}</td>\r\n" +
  "        <td>${fmtHM(d.interval_hm)}</td>\r\n" +
  "        <td>${fmtHM(d.effHm)}</td>\r\n" +
  "        <td>${formatDate(d.last_date)}</td>\r\n" +
  "        <td>${d.hm_due != null ? fmtHM(d.hm_due) : '&mdash;'}</td>\r\n" +
  "        <td>${fmtHM(d.hm)}</td>\r\n" +
  "        <td style=\"font-weight:700;color:${d.remaining == null ? '#94A3B8' : d.remaining < 0 ? '#DC2626' : '#374151'};\">${d.remaining == null ? '&mdash;' : d.remaining < 0 ? '(' + fmtHM(Math.abs(d.remaining)) + ')' : fmtHM(d.remaining)}</td>\r\n" +
  "        <td>${badge(d.status)}</td>\r\n" +
  "      </tr>`).join('')}</tbody>\r\n" +
  "    </table>`;\r\n",
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
  'group Admin Jadwal Maintenance rows by Unit or Tipe'
);

fs.writeFileSync(path, src);
console.log('Done.');
