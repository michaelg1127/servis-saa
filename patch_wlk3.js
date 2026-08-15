const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceFn(name, isAsync, newBody) {
  const prefix = (isAsync ? 'async ' : '') + 'function ' + name + '(';
  const start = html.indexOf(prefix);
  if (start < 0) { console.error('MISS fn: ' + name); process.exit(1); }
  let braceStart = html.indexOf('{', start);
  let depth = 0, i = braceStart;
  while (i < html.length) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
    i++;
  }
  html = html.slice(0, start) + newBody + html.slice(i + 1);
  changed++;
  console.log('OK fn: ' + name);
}

const newRenderFn = `function renderWoodlogKapalList(projects, salaryMap) {
  const el = document.getElementById('wl-panel-kapal');
  if (!el) return;
  const addBtn = '<button onclick="openAddWoodlogKapalModal()" class="btn-primary" style="margin-bottom:16px;width:auto;">+ Tambah Proyek Kapal</button>';
  if (projects.length === 0) { el.innerHTML = addBtn + '<div style="color:#94A3B8;padding:20px;">Belum ada proyek kapal woodlog.</div>'; return; }
  const rows = projects.map(function(p) {
    const units = (p.project_units || []).map(u => u.units ? u.units.code : '?').join(', ');
    // Status: Tutup > Selesai > Berjalan
    let statusLabel, statusColor;
    if (p.invoice_number) {
      statusLabel = 'Tutup'; statusColor = '#16A34A';
    } else if (p.end_date) {
      statusLabel = 'Selesai'; statusColor = '#1D4ED8';
    } else {
      statusLabel = 'Berjalan'; statusColor = '#D97706';
    }
    const status = '<span style="color:' + statusColor + ';font-weight:700;">' + statusLabel + '</span>';
    // Total HM
    const totalHM = (p.project_units || []).reduce(function(a, pu) {
      return a + ((pu.hm_akhir != null && pu.hm_awal != null) ? Number(pu.hm_akhir) - Number(pu.hm_awal) : 0);
    }, 0);
    const hmHasData = (p.project_units || []).some(pu => pu.hm_akhir != null && pu.hm_awal != null);
    const totalHMCell = hmHasData
      ? '<td style="text-align:right;font-weight:700;color:#1D4ED8;cursor:pointer;" onclick="toggleWoodlogKapalDetail(\\'' + p.id + '\\')">' + totalHM.toFixed(1) + ' HM</td>'
      : '<td style="text-align:right;color:#94A3B8;">&#8212;</td>';
    // BBM total
    const fillMap = (_wlKapalFillMap && _wlKapalFillMap[p.id]) ? _wlKapalFillMap[p.id] : {};
    let bbmTotal = 0;
    let bbmHasData = false;
    (p.project_units || []).forEach(function(pu) {
      if (pu.solar_awal_pct == null || pu.solar_akhir_pct == null) return;
      bbmHasData = true;
      const unitCode = pu.units ? pu.units.code : '';
      const tankSize = WL_BANGAU_CODES.includes(unitCode) ? 450 : 320;
      const tankDiff = (Number(pu.solar_awal_pct) - Number(pu.solar_akhir_pct)) / 100 * tankSize;
      const fills = fillMap[pu.unit_id] || 0;
      bbmTotal += tankDiff + fills;
    });
    const bbmCell = bbmHasData
      ? '<td style="text-align:right;font-weight:700;color:#059669;cursor:pointer;" onclick="toggleWoodlogKapalDetail(\\'' + p.id + '\\')">' + Math.round(bbmTotal).toLocaleString('id') + ' L</td>'
      : '<td style="text-align:right;color:#94A3B8;">&#8212;</td>';
    // Action buttons
    let btns = '<button onclick="event.stopPropagation();openEditWoodlogKapalModal(\\'' + p.id + '\\')" style="background:#EFF6FF;border:1.5px solid #93C5FD;color:#1D4ED8;font-size:12px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;margin-right:4px;">Edit</button>';
    if (p.end_date && !p.invoice_number) {
      btns += '<button onclick="openCloseWoodlogKapalModal(\\'' + p.id + '\\')" style="background:#DCFCE7;color:#16A34A;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;margin-right:4px;">Tutup</button>';
    }
    if (!p.invoice_number) {
      btns += '<button onclick="doDeleteWoodlogProject(\\'' + p.id + '\\')" style="background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;cursor:pointer;">Hapus</button>';
    }
    return '<tr>' +
      '<td style="font-weight:700;color:#1D4ED8;cursor:pointer;" onclick="toggleWoodlogKapalDetail(\\'' + p.id + '\\')">' + p.project_code + '</td>' +
      '<td>' + (p.nama_kapal || '&#8212;') + '</td>' +
      '<td>' + (p.pemberi_kerja || '&#8212;') + '</td>' +
      '<td>' + formatDate(p.start_date) + '</td>' +
      '<td>' + (p.end_date ? formatDate(p.end_date) : '&#8212;') + '</td>' +
      '<td style="font-size:12px;color:#64748B;">' + units + '</td>' +
      '<td style="text-align:right;">' + (p.total_mt_m3 ? Number(p.total_mt_m3).toLocaleString('id') + ' MT' : '&#8212;') + '</td>' +
      totalHMCell +
      bbmCell +
      '<td>' + status + '</td>' +
      '<td style="white-space:nowrap;">' + btns + '</td></tr>' +
      '<tr id="wl-kapal-detail-' + p.id + '" style="display:none;"><td colspan="11" style="padding:12px 16px;background:#F8FAFC;">Memuat...</td></tr>';
  }).join('');
  el.innerHTML = addBtn + '<div class="table-wrap"><table class="dt"><thead><tr><th>Kode</th><th>Kapal</th><th>Pemberi Kerja</th><th>Mulai</th><th>Selesai</th><th>Unit</th><th style="text-align:right;">BL Tonnage</th><th style="text-align:right;">Total HM</th><th style="text-align:right;">BBM</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}`;

replaceFn('renderWoodlogKapalList', false, newRenderFn);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
