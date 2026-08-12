const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// WL2-1: Add "Proyek Woodlog" nav button after existing Proyek button
replaceExact(
  '    <div class="slink" onclick="switchAdmin(\'proyek\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>Proyek</div>',

  '    <div class="slink" onclick="switchAdmin(\'proyek\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>Proyek</div>' + R +
  '    <div class="slink" onclick="switchAdmin(\'woodlog\',this)"><svg style="width:18px;height:18px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Proyek Woodlog</div>',

  'WL2-1: add Proyek Woodlog nav button'
);

// WL2-2: Add woodlog screen div after closing tags of proyek screen
replaceExact(
  '  </div>' + R +
  '  </div>' + R +
  '</div>' + R +
  '<!-- MODAL OVERLAY -->',

  '  </div>' + R +
  '  <div id="admin-screen-woodlog" class="dscreen">' + R +
  '  <div style="font-size:22px;font-weight:800;color:#1E293B;margin-bottom:16px;">Proyek Woodlog</div>' + R +
  '  <div id="wl-tabs" style="display:flex;gap:0;border-bottom:2px solid #E2E8F0;margin-bottom:20px;flex-wrap:wrap;">' + R +
  '    <button id="wl-tab-kapal" onclick="switchWoodlogTab(\'kapal\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#1D4ED8;border-bottom:3px solid #1D4ED8;margin-bottom:-2px;">Kapal</button>' + R +
  '    <button id="wl-tab-hourly" onclick="switchWoodlogTab(\'hourly\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Hourly</button>' + R +
  '    <button id="wl-tab-ringkasan" onclick="switchWoodlogTab(\'ringkasan\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Ringkasan</button>' + R +
  '    <button id="wl-tab-analisis" onclick="switchWoodlogTab(\'analisis\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Analisis Biaya</button>' + R +
  '    <button id="wl-tab-kontinuitas" onclick="switchWoodlogTab(\'kontinuitas\',this)" style="padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;">Kontinuitas HM</button>' + R +
  '  </div>' + R +
  '  <div id="wl-panel-kapal"></div>' + R +
  '  <div id="wl-panel-hourly" style="display:none;"></div>' + R +
  '  <div id="wl-panel-ringkasan" style="display:none;"></div>' + R +
  '  <div id="wl-panel-analisis" style="display:none;"></div>' + R +
  '  <div id="wl-panel-kontinuitas" style="display:none;"></div>' + R +
  '  </div>' + R +
  '  </div>' + R +
  '</div>' + R +
  '<!-- MODAL OVERLAY -->',

  'WL2-2: add admin-screen-woodlog div with 5 sub-tab panels'
);

// WL2-3: Add 'woodlog' to switchAdmin labels object
replaceExact(
  "  const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM', proyek:'Proyek' };",
  "  const labels = { dashboard:'Dashboard', jadwal:'Jadwal Maintenance', permintaan:'Permintaan Servis', riwayat:'Riwayat Per Unit', jadwalmkn:'Jadwal MKN', import:'Import Data', export:'Export Data', pengguna:'Kelola Pengguna', unit:'Kelola Unit', catat:'Catat Servis', bbm:'BBM', proyek:'Proyek', woodlog:'Proyek Woodlog' };",
  'WL2-3: add woodlog to switchAdmin labels'
);

// WL2-4: Add lazy-load call for woodlog in switchAdmin
replaceExact(
  "  if (name === 'proyek') initProyekModule();" + R +
  "}",
  "  if (name === 'proyek') initProyekModule();" + R +
  "  if (name === 'woodlog') initWoodlogModule();" + R +
  "}",
  'WL2-4: add initWoodlogModule lazy-load in switchAdmin'
);

// WL2-5: Add switchWoodlogTab + initWoodlogModule + stubs before </script>
replaceExact(
  "function initProyekModule() {" + R +
  "  switchProyekTab('kapal', document.getElementById('proyek-tab-kapal'));" + R +
  "}",

  "function initProyekModule() {" + R +
  "  switchProyekTab('kapal', document.getElementById('proyek-tab-kapal'));" + R +
  "}" + R +
  R +
  "// ============================================================" + R +
  "// PROYEK WOODLOG MODULE" + R +
  "// ============================================================" + R +
  "const WL_BANGAU_OPS = ['Andi', 'Iman', 'Riski', 'Purwanto'];" + R +
  "const WL_STD_OPS = ['Erwin', 'Uncong', 'Valdo', 'Andre', 'Alif', 'Rudianto'];" + R +
  "const WL_BANGAU_CODES = ['J02', 'J03'];" + R +
  "const WL_STD_CODES = ['J45', 'J46', 'J47', 'J48'];" + R +
  "const WL_ALL_CODES = ['J02', 'J03', 'J45', 'J46', 'J47', 'J48'];" + R +
  "let _wlKapalCache = {};" + R +
  "let _wlHourlyCache = {};" + R +
  "let _wlKontinuitasUnitId = null;" + R +
  R +
  "function switchWoodlogTab(tab, el) {" + R +
  "  ['kapal','hourly','ringkasan','analisis','kontinuitas'].forEach(function(t) {" + R +
  "    const panel = document.getElementById('wl-panel-' + t);" + R +
  "    const btn = document.getElementById('wl-tab-' + t);" + R +
  "    if (panel) panel.style.display = t === tab ? '' : 'none';" + R +
  "    if (btn) { btn.style.color = t === tab ? '#1D4ED8' : '#94A3B8'; btn.style.borderBottom = t === tab ? '3px solid #1D4ED8' : '3px solid transparent'; }" + R +
  "  });" + R +
  "  if (tab === 'kapal') loadWoodlogKapal();" + R +
  "  if (tab === 'hourly') loadWoodlogHourly();" + R +
  "  if (tab === 'ringkasan') loadWoodlogRingkasan();" + R +
  "  if (tab === 'analisis') loadWoodlogAnalisis();" + R +
  "  if (tab === 'kontinuitas') renderWoodlogKontinuitas();" + R +
  "}" + R +
  R +
  "function initWoodlogModule() {" + R +
  "  switchWoodlogTab('kapal', document.getElementById('wl-tab-kapal'));" + R +
  "}" + R +
  R +
  "async function loadWoodlogRingkasan() {" + R +
  "}" + R +
  R +
  "async function loadWoodlogAnalisis() {" + R +
  "}" + R +
  R +
  "function renderWoodlogKontinuitas() {" + R +
  "}" + R +
  R +
  "async function loadWoodlogKontinuitas() {" + R +
  "}",

  'WL2-5: add switchWoodlogTab + initWoodlogModule + module constants + stubs'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL2 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
