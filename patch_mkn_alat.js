// patch_mkn_alat.js — add "Alat" tab to MKN view with Riwayat/Overdue/Due Soon sub-tabs

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

// PATCH 1: insert new screen HTML after mkn-screen-parts, before <nav class="bottom-nav">
replaceExact(
  "  <div id=\"mkn-screen-parts\" class=\"mscreen\">\r\n" +
  "    <div style=\"background:white;padding:16px 14px;box-shadow:0 1px 4px rgba(0,0,0,0.06);margin-bottom:10px;\">\r\n" +
  "      <div style=\"font-size:16px;font-weight:700;color:#1E293B;\">Permintaan Parts</div>\r\n" +
  "    </div>\r\n" +
  "    <div id=\"mkn-parts-list\"></div>\r\n" +
  "  </div>\r\n" +
  "\r\n" +
  "  <nav class=\"bottom-nav\">\r\n",
  "  <div id=\"mkn-screen-parts\" class=\"mscreen\">\r\n" +
  "    <div style=\"background:white;padding:16px 14px;box-shadow:0 1px 4px rgba(0,0,0,0.06);margin-bottom:10px;\">\r\n" +
  "      <div style=\"font-size:16px;font-weight:700;color:#1E293B;\">Permintaan Parts</div>\r\n" +
  "    </div>\r\n" +
  "    <div id=\"mkn-parts-list\"></div>\r\n" +
  "  </div>\r\n" +
  "\r\n" +
  "  <div id=\"mkn-screen-alat\" class=\"mscreen\">\r\n" +
  "    <div style=\"background:white;padding:16px 14px 0;box-shadow:0 1px 4px rgba(0,0,0,0.06);margin-bottom:10px;\">\r\n" +
  "      <div style=\"font-size:16px;font-weight:700;color:#1E293B;margin-bottom:12px;\">Alat</div>\r\n" +
  "      <div style=\"display:flex;border-bottom:2px solid #E2E8F0;\">\r\n" +
  "        <button id=\"mkn-alat-subtab-riwayat\" onclick=\"switchMknAlatSubTab('riwayat')\" style=\"flex:1;padding:10px 0;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;color:#1D4ED8;border-bottom:3px solid #1D4ED8;margin-bottom:-2px;\">Riwayat</button>\r\n" +
  "        <button id=\"mkn-alat-subtab-overdue\" onclick=\"switchMknAlatSubTab('overdue')\" style=\"flex:1;padding:10px 0;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;\">Overdue <span id=\"mkn-count-overdue\" style=\"background:#FEE2E2;color:#DC2626;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:2px;\">0</span></button>\r\n" +
  "        <button id=\"mkn-alat-subtab-duesoon\" onclick=\"switchMknAlatSubTab('duesoon')\" style=\"flex:1;padding:10px 0;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;\">Due Soon <span id=\"mkn-count-duesoon\" style=\"background:#FEF3C7;color:#D97706;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:2px;\">0</span></button>\r\n" +
  "      </div>\r\n" +
  "    </div>\r\n" +
  "    <div id=\"mkn-alat-riwayat\" style=\"display:block;\">\r\n" +
  "      <div style=\"padding:0 14px 6px;\"><div id=\"mkn-riwayat-unit-pills\" style=\"display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:4px;\"></div></div>\r\n" +
  "      <div id=\"mkn-riwayat-schedule\" style=\"padding:0 14px 4px;\"></div>\r\n" +
  "      <div style=\"padding:4px 16px 10px;font-size:14px;font-weight:700;color:#374151;\">Riwayat Servis</div>\r\n" +
  "      <div id=\"mkn-riwayat-log\" style=\"padding:0 14px;\"></div>\r\n" +
  "    </div>\r\n" +
  "    <div id=\"mkn-alat-overdue\" style=\"display:none;padding:0 14px;\"></div>\r\n" +
  "    <div id=\"mkn-alat-duesoon\" style=\"display:none;padding:0 14px;\"></div>\r\n" +
  "  </div>\r\n" +
  "\r\n" +
  "  <nav class=\"bottom-nav\">\r\n",
  'insert mkn-screen-alat HTML'
);

// PATCH 2: add Alat nav-tab in bottom-nav (before Keluar)
replaceExact(
  "    <div class=\"nav-tab\" onclick=\"switchMknScreen('parts',this)\">\r\n" +
  "      <svg fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" viewBox=\"0 0 24 24\"><path d=\"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4\"/></svg>\r\n" +
  "      Parts\r\n" +
  "    </div>\r\n" +
  "    <div class=\"nav-tab\" onclick=\"doLogout()\" style=\"color:#EF4444;\">\r\n",
  "    <div class=\"nav-tab\" onclick=\"switchMknScreen('parts',this)\">\r\n" +
  "      <svg fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" viewBox=\"0 0 24 24\"><path d=\"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4\"/></svg>\r\n" +
  "      Parts\r\n" +
  "    </div>\r\n" +
  "    <div class=\"nav-tab\" onclick=\"switchMknScreen('alat',this)\">\r\n" +
  "      <svg fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" viewBox=\"0 0 24 24\"><path d=\"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z\"/></svg>\r\n" +
  "      Alat\r\n" +
  "    </div>\r\n" +
  "    <div class=\"nav-tab\" onclick=\"doLogout()\" style=\"color:#EF4444;\">\r\n",
  'add Alat nav-tab'
);

// PATCH 3: add state var next to mknJOSubTab
replaceExact(
  "let mknJOSubTab = 'menunggu';\r\n",
  "let mknJOSubTab = 'menunggu';\r\n" +
  "let mknAlatSubTab = 'riwayat';\r\n" +
  "let mknRiwayatUnitId = null;\r\n",
  'add mknAlatSubTab + mknRiwayatUnitId state'
);

// PATCH 4: wire 'alat' handler in switchMknScreen
replaceExact(
  "  if (name === 'jo') renderMKNJobList();\r\n" +
  "}\r\n",
  "  if (name === 'jo') renderMKNJobList();\r\n" +
  "  if (name === 'alat') loadMknAlat();\r\n" +
  "}\r\n",
  'wire alat handler in switchMknScreen'
);

// PATCH 5: add helper functions after switchMknScreen
replaceExact(
  "  if (name === 'alat') loadMknAlat();\r\n" +
  "}\r\n\r\n" +
  "// ============================================================\r\n" +
  "// ADMIN\r\n" +
  "// ============================================================\r\n",
  "  if (name === 'alat') loadMknAlat();\r\n" +
  "}\r\n\r\n" +
  "async function loadMknAlat() {\r\n" +
  "  await Promise.all([loadMknRiwayat(), loadMknAlerts()]);\r\n" +
  "}\r\n\r\n" +
  "function switchMknAlatSubTab(tab) {\r\n" +
  "  mknAlatSubTab = tab;\r\n" +
  "  ['riwayat','overdue','duesoon'].forEach(function(t) {\r\n" +
  "    const btn = document.getElementById('mkn-alat-subtab-' + t);\r\n" +
  "    const pane = document.getElementById('mkn-alat-' + t);\r\n" +
  "    if (btn) {\r\n" +
  "      btn.style.color = t === tab ? '#1D4ED8' : '#94A3B8';\r\n" +
  "      btn.style.borderBottomColor = t === tab ? '#1D4ED8' : 'transparent';\r\n" +
  "    }\r\n" +
  "    if (pane) pane.style.display = t === tab ? 'block' : 'none';\r\n" +
  "  });\r\n" +
  "}\r\n\r\n" +
  "async function loadMknRiwayat() {\r\n" +
  "  const pillsEl = document.getElementById('mkn-riwayat-unit-pills');\r\n" +
  "  if (!pillsEl) return;\r\n" +
  "  try {\r\n" +
  "    const { data: units } = await sb.from('units').select('id, code').order('code');\r\n" +
  "    if (!units || units.length === 0) { pillsEl.innerHTML = '<div style=\"color:#94A3B8;padding:8px;\">Tidak ada unit.</div>'; return; }\r\n" +
  "    pillsEl.innerHTML = units.map(function(u, i) { return '<button class=\"unit-pill' + (i === 0 ? ' on' : '') + '\" onclick=\"loadMknRiwayatLog(\\'' + u.id + '\\', this)\">' + u.code + '</button>'; }).join('');\r\n" +
  "    await loadMknRiwayatLog(units[0].id, pillsEl.children[0]);\r\n" +
  "  } catch(e) { pillsEl.innerHTML = '<div style=\"color:#EF4444;padding:8px;\">Error: ' + e.message + '</div>'; }\r\n" +
  "}\r\n\r\n" +
  "async function loadMknRiwayatLog(unitId, el) {\r\n" +
  "  mknRiwayatUnitId = unitId;\r\n" +
  "  document.querySelectorAll('#mkn-riwayat-unit-pills .unit-pill').forEach(function(p) { p.classList.remove('on'); });\r\n" +
  "  if (el) el.classList.add('on');\r\n" +
  "  loadMknRiwayatSchedule(unitId);\r\n" +
  "  const logEl = document.getElementById('mkn-riwayat-log');\r\n" +
  "  if (!logEl) return;\r\n" +
  "  logEl.innerHTML = '<div style=\"padding:10px 0;text-align:center;\"><div class=\"spinner\"></div></div>';\r\n" +
  "  try {\r\n" +
  "    const { data: logs } = await sb.from('service_log').select('id, maintenance_type, service_date, hm_at_service, mekanik_name, parts_used, cost_idr, notes').eq('unit_id', unitId).order('service_date', { ascending: false }).limit(100);\r\n" +
  "    if (!logs || logs.length === 0) { logEl.innerHTML = '<div style=\"padding:16px;background:white;border-radius:12px;text-align:center;color:#94A3B8;\">Belum ada riwayat servis.</div>'; return; }\r\n" +
  "    logEl.innerHTML = logs.map(function(l) {\r\n" +
  "      return '<div class=\"m-card\" style=\"padding:12px 14px;margin-bottom:8px;\"><div style=\"display:flex;justify-content:space-between;margin-bottom:4px;\"><div style=\"font-size:14px;font-weight:700;color:#1E293B;\">' + (l.maintenance_type || '—') + '</div><div style=\"font-size:12px;color:#64748B;\">' + formatDate(l.service_date) + '</div></div>' +\r\n" +
  "        '<div style=\"font-size:12px;color:#64748B;margin-bottom:2px;\">HM: <strong>' + fmtHM(l.hm_at_service) + '</strong>' + (l.mekanik_name ? ' &nbsp;·&nbsp; MKN: ' + l.mekanik_name : '') + '</div>' +\r\n" +
  "        (l.parts_used ? '<div style=\"font-size:12px;color:#475569;margin-top:4px;\">Parts: ' + l.parts_used + '</div>' : '') +\r\n" +
  "        (l.cost_idr ? '<div style=\"font-size:12px;color:#475569;\">Biaya: Rp ' + Number(l.cost_idr).toLocaleString('id-ID') + '</div>' : '') +\r\n" +
  "        (l.notes ? '<div style=\"font-size:12px;color:#94A3B8;margin-top:4px;font-style:italic;\">' + l.notes + '</div>' : '') +\r\n" +
  "        '</div>';\r\n" +
  "    }).join('');\r\n" +
  "  } catch(e) { logEl.innerHTML = '<div style=\"color:#EF4444;padding:8px;\">Error: ' + e.message + '</div>'; }\r\n" +
  "}\r\n\r\n" +
  "async function loadMknRiwayatSchedule(unitId) {\r\n" +
  "  const el = document.getElementById('mkn-riwayat-schedule');\r\n" +
  "  if (!el) return;\r\n" +
  "  el.innerHTML = '<div style=\"padding:10px 0;text-align:center;\"><div class=\"spinner\"></div></div>';\r\n" +
  "  try {\r\n" +
  "    const [{ data: unit }, { data: scheds }, { data: logs }] = await Promise.all([\r\n" +
  "      sb.from('units').select('code, current_hm').eq('id', unitId).single(),\r\n" +
  "      sb.from('maintenance_schedules').select('type_name, interval_hm, last_hm, last_date').eq('unit_id', unitId).order('type_name'),\r\n" +
  "      sb.from('service_log').select('maintenance_type, hm_at_service, service_date').eq('unit_id', unitId)\r\n" +
  "    ]);\r\n" +
  "    if (!scheds || scheds.length === 0) { el.innerHTML = ''; return; }\r\n" +
  "    const hm = unit ? unit.current_hm || 0 : 0;\r\n" +
  "    const logMap = {};\r\n" +
  "    (logs || []).forEach(function(l) {\r\n" +
  "      if (!logMap[l.maintenance_type] || l.hm_at_service > logMap[l.maintenance_type].hm)\r\n" +
  "        logMap[l.maintenance_type] = { hm: l.hm_at_service, date: l.service_date };\r\n" +
  "    });\r\n" +
  "    const data = scheds.map(function(s) {\r\n" +
  "      const fromLog = logMap[s.type_name];\r\n" +
  "      const effHm = fromLog ? fromLog.hm : s.last_hm;\r\n" +
  "      const effDate = fromLog ? fromLog.date : s.last_date;\r\n" +
  "      return Object.assign({}, s, { last_hm: effHm, last_date: effDate, remaining: mRemaining(s.interval_hm, effHm, hm), status: mStatus(s.interval_hm, effHm, hm) });\r\n" +
  "    }).sort(function(a, b) { return a.remaining - b.remaining; });\r\n" +
  "    data.forEach(function(d, i) {\r\n" +
  "      const k = 'mknrw-' + unitId + '-' + i;\r\n" +
  "      _alertData[k] = { typeName: d.type_name, lastHm: d.last_hm, lastDate: d.last_date, intervalHm: d.interval_hm, currentHm: hm, remaining: d.remaining, status: d.status, unitId: unitId, unitCode: unit && unit.code, role: 'mkn' };\r\n" +
  "    });\r\n" +
  "    el.innerHTML = '<div style=\"background:#EFF6FF;border-radius:12px;padding:12px 14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;\">' +\r\n" +
  "      '<div style=\"font-size:16px;font-weight:800;color:#1E3A8A;\">' + ((unit && unit.code) || '') + '</div>' +\r\n" +
  "      '<div style=\"font-size:14px;font-weight:700;color:#1D4ED8;\">HM Skrg: ' + fmtHM(hm) + '</div></div>' +\r\n" +
  "      '<div style=\"font-size:14px;font-weight:700;color:#374151;margin-bottom:8px;\">Jadwal Maintenance</div>' +\r\n" +
  "      '<div style=\"background:white;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:12px;\">' +\r\n" +
  "      data.map(function(d, i) {\r\n" +
  "        const k = 'mknrw-' + unitId + '-' + i;\r\n" +
  "        const hasData = d.last_hm != null;\r\n" +
  "        const sisaColor = d.remaining < 0 ? '#DC2626' : d.status === 'DUE SOON' ? '#D97706' : '#16A34A';\r\n" +
  "        const rowBg = d.status === 'OVERDUE' ? '#FFF1F2' : d.status === 'DUE SOON' ? '#FFFBEB' : 'white';\r\n" +
  "        const sisaText = hasData ? (d.remaining < 0 ? '(' + Math.abs(d.remaining) + ')' : d.remaining) : '-';\r\n" +
  "        return '<div onclick=\"openAlertDetailModal(\\'' + k + '\\')\" style=\"background:' + rowBg + ';padding:10px 14px;' + (i > 0 ? 'border-top:1px solid #F1F5F9;' : '') + 'cursor:pointer;\">' +\r\n" +
  "          '<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;\">' +\r\n" +
  "          '<div style=\"font-size:13px;font-weight:600;color:#1E293B;\">' + d.type_name + '</div>' +\r\n" +
  "          '<div style=\"display:flex;align-items:center;gap:6px;\">' + badge(d.status) + '<svg width=\"14\" height=\"14\" fill=\"none\" stroke=\"#CBD5E1\" stroke-width=\"2.5\" viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></svg></div></div>' +\r\n" +
  "          '<div style=\"font-size:15px;font-weight:800;color:' + sisaColor + ';\">' + (hasData ? 'Sisa: ' + sisaText + ' HM' : '— belum ada data') + '</div></div>';\r\n" +
  "      }).join('') + '</div>';\r\n" +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:8px;\">Error: ' + e.message + '</div>'; }\r\n" +
  "}\r\n\r\n" +
  "async function loadMknAlerts() {\r\n" +
  "  const overdueEl = document.getElementById('mkn-alat-overdue');\r\n" +
  "  const duesoonEl = document.getElementById('mkn-alat-duesoon');\r\n" +
  "  if (!overdueEl || !duesoonEl) return;\r\n" +
  "  overdueEl.innerHTML = '<div style=\"padding:20px;text-align:center;\"><div class=\"spinner\"></div></div>';\r\n" +
  "  duesoonEl.innerHTML = '<div style=\"padding:20px;text-align:center;\"><div class=\"spinner\"></div></div>';\r\n" +
  "  try {\r\n" +
  "    const [[{ data: units }, { data: scheds }], logMap] = await Promise.all([\r\n" +
  "      Promise.all([\r\n" +
  "        sb.from('units').select('id, code, current_hm'),\r\n" +
  "        sb.from('maintenance_schedules').select('unit_id, type_name, interval_hm, last_hm'),\r\n" +
  "      ]),\r\n" +
  "      fetchServiceLogMap(),\r\n" +
  "    ]);\r\n" +
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
  "    });\r\n" +
  "    overdueRows.sort(function(a, b) { return a.remaining - b.remaining; });\r\n" +
  "    duesoonRows.sort(function(a, b) { return a.remaining - b.remaining; });\r\n" +
  "    const overdueBadge = document.getElementById('mkn-count-overdue');\r\n" +
  "    const duesoonBadge = document.getElementById('mkn-count-duesoon');\r\n" +
  "    if (overdueBadge) overdueBadge.textContent = overdueRows.length;\r\n" +
  "    if (duesoonBadge) duesoonBadge.textContent = duesoonRows.length;\r\n" +
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
  "    }\r\n" +
  "    overdueEl.innerHTML = overdueRows.length === 0 ? '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada Overdue.</div>' : overdueRows.map(function(r, i) { return renderRow(r, i, 'mknov'); }).join('');\r\n" +
  "    duesoonEl.innerHTML = duesoonRows.length === 0 ? '<div style=\"padding:20px;text-align:center;color:#94A3B8;\">Tidak ada Due Soon.</div>' : duesoonRows.map(function(r, i) { return renderRow(r, i, 'mknds'); }).join('');\r\n" +
  "  } catch(e) {\r\n" +
  "    overdueEl.innerHTML = '<div style=\"color:#EF4444;padding:8px;\">Error: ' + e.message + '</div>';\r\n" +
  "    duesoonEl.innerHTML = '<div style=\"color:#EF4444;padding:8px;\">Error: ' + e.message + '</div>';\r\n" +
  "  }\r\n" +
  "}\r\n\r\n" +
  "// ============================================================\r\n" +
  "// ADMIN\r\n" +
  "// ============================================================\r\n",
  'add loadMknAlat + sub-tab handlers + riwayat + alerts helpers'
);

fs.writeFileSync(path, src);
console.log('Done.');
