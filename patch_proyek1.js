const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function replaceExact(from, to, desc) {
  const count = html.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changes++;
  console.log('OK: ' + desc);
}

// 1. Add SheetJS CDN after supabase script tag
replaceExact(
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\r\n<script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>',
  'add SheetJS CDN'
);

// 2. Add Proyek nav slink after BBM slink
replaceExact(
  '    <div class="slink" onclick="switchAdmin(\'bbm\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/><line x1="7" y1="5" x2="7" y2="5"/><line x1="7" y1="12" x2="7" y2="12"/></svg>BBM</div>\r\n    </div>',
  '    <div class="slink" onclick="switchAdmin(\'bbm\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/><line x1="7" y1="5" x2="7" y2="5"/><line x1="7" y1="12" x2="7" y2="12"/></svg>BBM</div>\r\n    <div class="slink" onclick="switchAdmin(\'proyek\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>Proyek</div>\r\n    </div>',
  'add Proyek nav slink'
);

// 3. Add admin-screen-proyek HTML before closing desk-content
const screenHTML = `  <div id="admin-screen-proyek" class="dscreen">\r\n  <div style="font-size:22px;font-weight:800;color:#1E293B;margin-bottom:16px;">Proyek</div>\r\n  <div id="proyek-tabs" style="display:flex;gap:0;border-bottom:2px solid #E2E8F0;margin-bottom:20px;flex-wrap:wrap;">\r\n    <button id="proyek-tab-kapal" onclick="switchProyekTab(\'kapal\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#1D4ED8;border-bottom:3px solid #1D4ED8;margin-bottom:-2px;">Kapal</button>\r\n    <button id="proyek-tab-stockpile" onclick="switchProyekTab(\'stockpile\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Stockpile</button>\r\n    <button id="proyek-tab-ringkasan" onclick="switchProyekTab(\'ringkasan\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Ringkasan</button>\r\n    <button id="proyek-tab-analisis" onclick="switchProyekTab(\'analisis\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Analisis Biaya</button>\r\n    <button id="proyek-tab-kontinuitas" onclick="switchProyekTab(\'kontinuitas\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Kontinuitas HM</button>\r\n  </div>\r\n  <div id="proyek-panel-kapal"></div>\r\n  <div id="proyek-panel-stockpile" style="display:none;"></div>\r\n  <div id="proyek-panel-ringkasan" style="display:none;"></div>\r\n  <div id="proyek-panel-analisis" style="display:none;"></div>\r\n  <div id="proyek-panel-kontinuitas" style="display:none;"></div>\r\n  </div>\r\n`;

replaceExact(
  '<!-- MODAL OVERLAY -->',
  screenHTML + '<!-- MODAL OVERLAY -->',
  'add admin-screen-proyek HTML'
);

// 4. Wire up switchAdmin: add 'proyek' to labels + lazy init
replaceExact(
  "const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM' };",
  "const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM', proyek:'Proyek' };",
  'add proyek to labels'
);

replaceExact(
  "  if (name === 'bbm') initFuelBBM();\r\n}",
  "  if (name === 'bbm') initFuelBBM();\r\n  if (name === 'proyek') initProyekModule();\r\n}",
  'add proyek lazy init to switchAdmin'
);

// 5. Add switchProyekTab + initProyekModule functions (append before closing script tag)
const newFunctions = `\r\n// ============================================================\r\n// PROYEK MODULE\r\n// ============================================================\r\nfunction switchProyekTab(tab, el) {\r\n  proyekTab = tab;\r\n  const tabs = ['kapal','stockpile','ringkasan','analisis','kontinuitas'];\r\n  tabs.forEach(t => {\r\n    const btn = document.getElementById('proyek-tab-' + t);\r\n    const panel = document.getElementById('proyek-panel-' + t);\r\n    const active = t === tab;\r\n    if (btn) { btn.style.color = active ? '#1D4ED8' : '#94A3B8'; btn.style.borderBottomColor = active ? '#1D4ED8' : 'transparent'; }\r\n    if (panel) panel.style.display = active ? '' : 'none';\r\n  });\r\n  if (tab === 'kapal') loadProyekKapal();\r\n  if (tab === 'stockpile') loadProyekStockpile();\r\n  if (tab === 'ringkasan') loadProyekRingkasan();\r\n  if (tab === 'analisis') loadProyekAnalisis();\r\n  if (tab === 'kontinuitas') renderProyekKontinuitas();\r\n}\r\n\r\nfunction initProyekModule() {\r\n  switchProyekTab('kapal', document.getElementById('proyek-tab-kapal'));\r\n}\r\n`;

replaceExact(
  '\r\n</script>\r\n</body>',
  newFunctions + '\r\n</script>\r\n</body>',
  'add switchProyekTab + initProyekModule'
);

fs.writeFileSync(filePath, html, 'utf8');
console.log('patch_proyek1.js: ' + changes + ' changes applied.');
