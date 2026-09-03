const fs = require('fs');
const FILE = 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
let fails = 0;

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); fails++; return; }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); fails++; return; }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

const N = '\r\n';

// ─── PATCH 1: _nsePreviewUpdate — add live HM gap display ───────────────────
replaceExact(
  [
    'function _nsePreviewUpdate() {',
    '  var startEl = document.getElementById(\'nse-m-start\');',
    '  var endEl = document.getElementById(\'nse-m-end\');',
    '  var prevEl = document.getElementById(\'nse-m-preview\');',
    '  if (!startEl || !endEl || !prevEl) return;',
    '  var start = startEl.value; var end = endEl.value;',
    '  if (!start || !end) { prevEl.innerHTML = \'\'; return; }',
    '  var hrs = _nseHrs(start + \':00\', end + \':00\');',
    '  var overnight = _isOvernight(start + \':00\', end + \':00\');',
    '  var salary = Math.round(hrs * 35000);',
    '  var badge = overnight ? \' <span style="background:#FEF3C7;color:#B45309;font-size:11px;font-weight:700;padding:2px 6px;border-radius:99px;">Overnight &#8593;</span>\' : \'\';',
    '  prevEl.innerHTML = \'<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-top:4px;">\' +',
    '    \'<span style="font-size:13px;font-weight:700;color:#16A34A;">\' + hrs.toFixed(1) + \' jam\' + badge + \' — \' + fmtRp(salary) + \'</span></div>\';',
    '}'
  ].join(N),
  [
    'function _nsePreviewUpdate() {',
    '  var startEl = document.getElementById(\'nse-m-start\');',
    '  var endEl = document.getElementById(\'nse-m-end\');',
    '  var prevEl = document.getElementById(\'nse-m-preview\');',
    '  if (!startEl || !endEl || !prevEl) return;',
    '  var start = startEl.value; var end = endEl.value;',
    '  if (!start || !end) { prevEl.innerHTML = \'\'; return; }',
    '  var hrs = _nseHrs(start + \':00\', end + \':00\');',
    '  var overnight = _isOvernight(start + \':00\', end + \':00\');',
    '  var salary = Math.round(hrs * 35000);',
    '  var badge = overnight ? \' <span style="background:#FEF3C7;color:#B45309;font-size:11px;font-weight:700;padding:2px 6px;border-radius:99px;">Overnight &#8593;</span>\' : \'\';',
    '  var hmAwal = parseFloat(document.getElementById(\'nse-m-hmawal\') ? document.getElementById(\'nse-m-hmawal\').value : \'\');',
    '  var hmAkhir = parseFloat(document.getElementById(\'nse-m-hmakhir\') ? document.getElementById(\'nse-m-hmakhir\').value : \'\');',
    '  var hmGapHtml = \'\';',
    '  if (!isNaN(hmAwal) && !isNaN(hmAkhir)) {',
    '    var gap = hmAkhir - hmAwal;',
    '    var gapColor = gap < 0 ? \'#DC2626\' : \'#1D4ED8\';',
    '    hmGapHtml = \'<span style="font-size:12px;color:\' + gapColor + \';font-weight:700;margin-left:12px;">HM Gap: \' + gap.toFixed(1) + \'</span>\';',
    '  }',
    '  prevEl.innerHTML = \'<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-top:4px;">\' +',
    '    \'<span style="font-size:13px;font-weight:700;color:#16A34A;">\' + hrs.toFixed(1) + \' jam\' + badge + \' — \' + fmtRp(salary) + \'</span>\' + hmGapHtml + \'</div>\';',
    '}'
  ].join(N),
  'PATCH 1: _nsePreviewUpdate — add live HM gap display'
);

// ─── PATCH 2: openAddNSEModal — trigger preview on HM input changes ──────────
replaceExact(
  '\'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Awal</label><input type="number" step="0.1" id="nse-m-hmawal" class="finput" placeholder="Opsional"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Akhir</label><input type="number" step="0.1" id="nse-m-hmakhir" class="finput" placeholder="Opsional"></div>\' +',
  '\'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Awal</label><input type="number" step="0.1" id="nse-m-hmawal" class="finput" oninput="_nsePreviewUpdate()" placeholder="Opsional"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Akhir</label><input type="number" step="0.1" id="nse-m-hmakhir" class="finput" oninput="_nsePreviewUpdate()" placeholder="Opsional"></div>\' +',
  'PATCH 2: openAddNSEModal — oninput on HM fields'
);

// ─── PATCH 3: openEditNSEModal — trigger preview on HM input changes ─────────
replaceExact(
  '\'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Awal</label><input type="number" step="0.1" id="nse-m-hmawal" class="finput" value="\' + (s.hm_awal != null ? s.hm_awal : \'\') + \'"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Akhir</label><input type="number" step="0.1" id="nse-m-hmakhir" class="finput" value="\' + (s.hm_akhir != null ? s.hm_akhir : \'\') + \'"></div>\' +',
  '\'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Awal</label><input type="number" step="0.1" id="nse-m-hmawal" class="finput" oninput="_nsePreviewUpdate()" value="\' + (s.hm_awal != null ? s.hm_awal : \'\') + \'"></div>\' +' + N +
  '    \'<div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">HM Akhir</label><input type="number" step="0.1" id="nse-m-hmakhir" class="finput" oninput="_nsePreviewUpdate()" value="\' + (s.hm_akhir != null ? s.hm_akhir : \'\') + \'"></div>\' +',
  'PATCH 3: openEditNSEModal — oninput on HM fields'
);

// ─── PATCH 4: loadProyekKontinuitas — include NSE sessions in timeline ───────
replaceExact(
  [
    'async function loadProyekKontinuitas() {',
    '  const wrap = document.getElementById(\'kontinuitas-table-wrap\');',
    '  if (!wrap || !proyekHMUnitId) return;',
    '  try {',
    '    const { data, error } = await sb.from(\'project_units\')',
    '      .select(\'*, projects(project_code, type, start_date, end_date, pemberi_kerja)\')',
    '      .eq(\'unit_id\', proyekHMUnitId)',
    '      .order(\'hm_awal\', { ascending: true });',
    '    if (error) throw error;',
    '    const rows = data || [];',
    '    if (rows.length === 0) {',
    '      wrap.innerHTML = \'<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Belum ada data proyek untuk unit ini.</div>\';',
    '      return;',
    '    }',
    '    let billedHM = 0, gapHM = 0;',
    '    let tableHTML = \'<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">\';',
    '    tableHTML += \'<thead><tr style="background:#F1F5F9;"><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Tipe</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Proyek</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Awal</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Akhir</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Durasi</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Tanggal</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Pemberi Kerja</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Keterangan</th></tr></thead><tbody>\';',
    '    rows.forEach((row, i) => {',
    '      const p = row.projects;',
    '      const hmDur = row.hm_akhir - row.hm_awal;',
    '      billedHM += hmDur;',
    '      if (i > 0) {',
    '        const prev = rows[i - 1];',
    '        const gap = row.hm_awal - prev.hm_akhir;',
    '        if (gap > 0) {',
    '          gapHM += gap;',
    '          tableHTML += \'<tr style="background:#FEF2F2;">\';',
    '          tableHTML += \'<td style="padding:8px 10px;font-weight:800;color:#DC2626;">GAP</td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;color:#DC2626;">—</td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;text-align:right;color:#DC2626;">\' + prev.hm_akhir + \'</td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;text-align:right;color:#DC2626;">\' + row.hm_awal + \'</td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;text-align:right;font-weight:700;color:#DC2626;">\' + gap.toFixed(1) + \' HM</td>\';',
    '          tableHTML += \'<td colspan="2" style="padding:8px 10px;"></td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;font-size:11px;color:#DC2626;">\' + (row.hm_gap_reason || \'Alasan tidak dicatat\') + \'</td>\';',
    '          tableHTML += \'</tr>\';',
    '        }',
    '      }',
    '      tableHTML += \'<tr style="border-bottom:1px solid #F1F5F9;background:#F0FDF4;">\';',
    '      tableHTML += \'<td style="padding:8px 10px;font-weight:700;color:#16A34A;">\' + (p ? p.type.toUpperCase() : \'?\') + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;font-weight:700;color:#1D4ED8;">\' + (p ? p.project_code : \'?\') + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;text-align:right;">\' + row.hm_awal + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;text-align:right;">\' + row.hm_akhir + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;text-align:right;font-weight:700;">\' + hmDur.toFixed(1) + \' HM</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;white-space:nowrap;">\' + (p ? formatDate(p.start_date) + \' – \' + formatDate(p.end_date) : \'—\') + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;">\' + (p ? p.pemberi_kerja : \'—\') + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;font-size:11px;color:#64748B;"></td>\';',
    '      tableHTML += \'</tr>\';',
    '    });',
    '    tableHTML += \'</tbody></table></div>\';',
    '    tableHTML += \'<div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;">\';',
    '    tableHTML += \'<div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:10px 16px;"><div style="font-size:12px;color:#16A34A;font-weight:700;">Total HM Terbilang</div><div style="font-size:20px;font-weight:800;color:#15803D;">\' + billedHM.toFixed(1) + \' HM</div></div>\';',
    '    tableHTML += \'<div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:10px 16px;"><div style="font-size:12px;color:#DC2626;font-weight:700;">Total HM Gap</div><div style="font-size:20px;font-weight:800;color:#B91C1C;">\' + gapHM.toFixed(1) + \' HM</div></div>\';',
    '    tableHTML += \'</div>\';',
    '    wrap.innerHTML = tableHTML;',
    '  } catch(e) { wrap.innerHTML = \'<div style="color:#EF4444;padding:20px;">Error: \' + e.message + \'</div>\'; }',
    '}'
  ].join(N),
  [
    'async function loadProyekKontinuitas() {',
    '  const wrap = document.getElementById(\'kontinuitas-table-wrap\');',
    '  if (!wrap || !proyekHMUnitId) return;',
    '  try {',
    '    const [puRes, nseRes] = await Promise.all([',
    '      sb.from(\'project_units\').select(\'*, projects(project_code, type, start_date, end_date, pemberi_kerja)\').eq(\'unit_id\', proyekHMUnitId),',
    '      sb.from(\'nse_sessions\').select(\'*\').eq(\'unit_id\', proyekHMUnitId)',
    '    ]);',
    '    if (puRes.error) throw puRes.error;',
    '    if (nseRes.error) throw nseRes.error;',
    '    var unified = [];',
    '    (puRes.data || []).forEach(function(row) {',
    '      if (row.hm_awal == null || row.hm_akhir == null) return;',
    '      const p = row.projects;',
    '      unified.push({ hm_awal: row.hm_awal, hm_akhir: row.hm_akhir, hm_gap_reason: row.hm_gap_reason,',
    '        _type: p ? p.type.toUpperCase() : \'?\', _code: p ? p.project_code : \'?\',',
    '        _dateStr: p ? formatDate(p.start_date) + \' – \' + formatDate(p.end_date) : \'—\',',
    '        _pemberiKerja: p ? p.pemberi_kerja : \'—\', _isNse: false });',
    '    });',
    '    (nseRes.data || []).forEach(function(s) {',
    '      if (s.hm_awal == null || s.hm_akhir == null) return;',
    '      unified.push({ hm_awal: s.hm_awal, hm_akhir: s.hm_akhir, hm_gap_reason: null,',
    '        _type: \'NSE\', _code: s.session_date + \' S\' + s.session_num,',
    '        _dateStr: s.session_date, _pemberiKerja: \'NSE\', _isNse: true });',
    '    });',
    '    unified.sort(function(a, b) { return a.hm_awal - b.hm_awal; });',
    '    if (unified.length === 0) {',
    '      wrap.innerHTML = \'<div style="background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">Belum ada data proyek untuk unit ini.</div>\';',
    '      return;',
    '    }',
    '    let billedHM = 0, gapHM = 0;',
    '    let tableHTML = \'<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">\';',
    '    tableHTML += \'<thead><tr style="background:#F1F5F9;"><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Tipe</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Proyek</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Awal</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Akhir</th><th style="padding:8px 10px;text-align:right;font-weight:700;color:#475569;">HM Durasi</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Tanggal</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Pemberi Kerja</th><th style="padding:8px 10px;text-align:left;font-weight:700;color:#475569;">Keterangan</th></tr></thead><tbody>\';',
    '    unified.forEach(function(row, i) {',
    '      const hmDur = row.hm_akhir - row.hm_awal;',
    '      billedHM += hmDur;',
    '      if (i > 0) {',
    '        const prev = unified[i - 1];',
    '        const gap = row.hm_awal - prev.hm_akhir;',
    '        if (gap > 0) {',
    '          gapHM += gap;',
    '          tableHTML += \'<tr style="background:#FEF2F2;">\';',
    '          tableHTML += \'<td style="padding:8px 10px;font-weight:800;color:#DC2626;">GAP</td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;color:#DC2626;">—</td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;text-align:right;color:#DC2626;">\' + prev.hm_akhir + \'</td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;text-align:right;color:#DC2626;">\' + row.hm_awal + \'</td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;text-align:right;font-weight:700;color:#DC2626;">\' + gap.toFixed(1) + \' HM</td>\';',
    '          tableHTML += \'<td colspan="2" style="padding:8px 10px;"></td>\';',
    '          tableHTML += \'<td style="padding:8px 10px;font-size:11px;color:#DC2626;">\' + (row.hm_gap_reason || \'Alasan tidak dicatat\') + \'</td>\';',
    '          tableHTML += \'</tr>\';',
    '        }',
    '      }',
    '      var rowBg = row._isNse ? \'#FFF7ED\' : \'#F0FDF4\';',
    '      var typeColor = row._isNse ? \'#D97706\' : \'#16A34A\';',
    '      tableHTML += \'<tr style="border-bottom:1px solid #F1F5F9;background:\' + rowBg + \';\">\';',
    '      tableHTML += \'<td style="padding:8px 10px;font-weight:700;color:\' + typeColor + \';\">\' + row._type + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;font-weight:700;color:#1D4ED8;">\' + row._code + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;text-align:right;">\' + row.hm_awal + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;text-align:right;">\' + row.hm_akhir + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;text-align:right;font-weight:700;">\' + hmDur.toFixed(1) + \' HM</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;white-space:nowrap;">\' + row._dateStr + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;">\' + row._pemberiKerja + \'</td>\';',
    '      tableHTML += \'<td style="padding:8px 10px;font-size:11px;color:#64748B;"></td>\';',
    '      tableHTML += \'</tr>\';',
    '    });',
    '    tableHTML += \'</tbody></table></div>\';',
    '    tableHTML += \'<div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;">\';',
    '    tableHTML += \'<div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:10px 16px;"><div style="font-size:12px;color:#16A34A;font-weight:700;">Total HM Terbilang</div><div style="font-size:20px;font-weight:800;color:#15803D;">\' + billedHM.toFixed(1) + \' HM</div></div>\';',
    '    tableHTML += \'<div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:10px 16px;"><div style="font-size:12px;color:#DC2626;font-weight:700;">Total HM Gap</div><div style="font-size:20px;font-weight:800;color:#B91C1C;">\' + gapHM.toFixed(1) + \' HM</div></div>\';',
    '    tableHTML += \'</div>\';',
    '    wrap.innerHTML = tableHTML;',
    '  } catch(e) { wrap.innerHTML = \'<div style="color:#EF4444;padding:20px;">Error: \' + e.message + \'</div>\'; }',
    '}'
  ].join(N),
  'PATCH 4: loadProyekKontinuitas — merge NSE sessions into HM continuity timeline'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
