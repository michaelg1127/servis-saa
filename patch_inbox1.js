// patch_inbox1.js — Inbox WA (wa_inbox) admin screen + approve hooks
// Spec: docs/superpowers/specs/2026-10-03-wa-inbox-design.md
// Injects inbox_module.src.js before the closing </script> and adds small hooks.
const fs = require('fs');
const FILE = 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
let fails = 0;
const N = '\r\n';

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); fails++; return; }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); fails++; return; }
  src = src.replace(from, () => to);
  console.log('OK: ' + desc);
}

if (src.includes('INBOX WA — review drafts')) { console.error('Already applied.'); process.exit(1); }

// 1) Sidebar link directly under Dashboard
const dashLink = `    <div class="slink on" onclick="switchAdmin('dashboard',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>Dashboard</div>`;
const inboxLink = `    <div class="slink" onclick="switchAdmin('inbox',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>Inbox WA<span id="adm-inbox-badge" style="display:none;margin-left:auto;background:#EF4444;color:white;font-size:11px;font-weight:800;border-radius:999px;padding:1px 7px;"></span></div>`;
replaceExact(dashLink + N, dashLink + N + inboxLink + N, 'sidebar: Inbox WA link');

// 2) Screen skeleton (before Catat Servis screen)
const catatScreen = `    <div id="admin-screen-catat" class="dscreen">`;
const inboxScreen = [
  `    <div id="admin-screen-inbox" class="dscreen">`,
  `      <div style="font-size:22px;font-weight:800;color:#1E293B;margin-bottom:4px;">Inbox WA</div>`,
  `      <div style="font-size:13px;color:#64748B;margin-bottom:16px;">Draft dari grup WhatsApp yang dibaca Claude. Approve membuka form yang biasa dengan data terisi.</div>`,
  `      <div id="adm-inbox-status-pills" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">`,
  `        <button class="vpill on" onclick="setInboxStatus('pending',this)">Pending</button>`,
  `        <button class="vpill" onclick="setInboxStatus('approved',this)">Approved</button>`,
  `        <button class="vpill" onclick="setInboxStatus('rejected',this)">Ditolak</button>`,
  `        <button class="vpill" onclick="setInboxStatus('all',this)">Semua</button>`,
  `        <button class="vpill" onclick="loadAdminInbox()" style="margin-left:auto;">&#8635; Refresh</button>`,
  `      </div>`,
  `      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;"><select id="adm-inbox-group" class="finput" style="max-width:280px;" onchange="setInboxGroup(this.value)"><option value="">Semua grup</option></select></div>`,
  `      <div id="adm-inbox-unit-pills" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;"></div>`,
  `      <div id="adm-inbox-list" style="max-width:820px;"></div>`,
  `    </div>`,
  ``
].join(N);
replaceExact(catatScreen, inboxScreen + catatScreen, 'screen: admin-screen-inbox');

// 3) switchAdmin label + lazy load
replaceExact(`'karyawan-tetap':'Karyawan Tetap' };`, `'karyawan-tetap':'Karyawan Tetap', inbox:'Inbox WA' };`, 'switchAdmin: label');
replaceExact(`  if (name === 'woodlog') initWoodlogModule();` + N,
             `  if (name === 'woodlog') initWoodlogModule();` + N + `  if (name === 'inbox') loadAdminInbox();` + N, 'switchAdmin: lazy load');

// 4) Badge refresh with dashboard
replaceExact(`async function loadAdminDashboard() {` + N,
             `async function loadAdminDashboard() {` + N + `  if (typeof refreshInboxBadge === 'function') refreshInboxBadge();` + N, 'dashboard: badge refresh');

// 5) Hooks after successful saves (no-op unless form was opened from Inbox)
replaceExact(`    showToast('Proyek ' + projectCode + ' berhasil disimpan!', 'success');` + N + `    loadProyekKapal();`,
             `    showToast('Proyek ' + projectCode + ' berhasil disimpan!', 'success');` + N + `    if (typeof onInboxSaved === 'function') onInboxSaved('projects', proj.id);` + N + `    loadProyekKapal();`,
             'hook: submitAddKapal');
replaceExact(`    showToast('Proyek berhasil diperbarui!', 'success');` + N + `    loadProyekKapal();`,
             `    showToast('Proyek berhasil diperbarui!', 'success');` + N + `    if (typeof onInboxSaved === 'function') onInboxSaved('project_units', projId);` + N + `    loadProyekKapal();`,
             'hook: submitEditKapal');
replaceExact(`    showToast('Pengisian ' + transferCode + ' berhasil dicatat!', 'success');`,
             `    showToast('Pengisian ' + transferCode + ' berhasil dicatat!', 'success');` + N + `    if (typeof onInboxSaved === 'function') onInboxSaved('fuel_transfers', tData.id);`,
             'hook: submitPengisian');
replaceExact(`    showToast('Log servis berhasil disimpan!', 'success');` + N + `    document.getElementById('adm-catat-unit').value = '';`,
             `    showToast('Log servis berhasil disimpan!', 'success');` + N + `    if (typeof onInboxSaved === 'function') onInboxSaved('service_log', null);` + N + `    document.getElementById('adm-catat-unit').value = '';`,
             'hook: submitAdminServiceLog');

// 6) Inject module before the closing </script>
const mod = fs.readFileSync('inbox_module.src.js', 'utf8').replace(/\r\n/g, '\n').replace(/\n/g, N);
replaceExact(N + `</script>` + N + `</body>`, N + mod + N + `</script>` + N + `</body>`, 'inject inbox module');

if (fails) { console.error(fails + ' patch(es) failed — index.html NOT written.'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('Done.');
