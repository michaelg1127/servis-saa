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

// ─── PATCH 1: _nsePreviewUpdate — add continuity check vs window._nseLastHM ─
replaceExact(
  "  var hmGapHtml = '';" + N +
  "  if (!isNaN(hmAwal) && !isNaN(hmAkhir)) {" + N +
  "    var gap = hmAkhir - hmAwal;" + N +
  "    var gapColor = gap < 0 ? '#DC2626' : '#1D4ED8';" + N +
  "    hmGapHtml = '<span style=\"font-size:12px;color:' + gapColor + ';font-weight:700;margin-left:12px;\">HM Gap: ' + gap.toFixed(1) + '</span>';" + N +
  "  }" + N +
  "  prevEl.innerHTML = '<div style=\"background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-top:4px;\">' +" + N +
  "    '<span style=\"font-size:13px;font-weight:700;color:#16A34A;\">' + hrs.toFixed(1) + ' jam' + badge + ' — ' + fmtRp(salary) + '</span>' + hmGapHtml + '</div>';" + N +
  "}",
  "  var hmGapHtml = '';" + N +
  "  if (!isNaN(hmAwal) && !isNaN(hmAkhir)) {" + N +
  "    var gap = hmAkhir - hmAwal;" + N +
  "    var gapColor = gap < 0 ? '#DC2626' : '#1D4ED8';" + N +
  "    hmGapHtml = '<span style=\"font-size:12px;color:' + gapColor + ';font-weight:700;margin-left:12px;\">HM Gap: ' + gap.toFixed(1) + '</span>';" + N +
  "  }" + N +
  "  var continuityHtml = '';" + N +
  "  if (window._nseLastHM != null && !isNaN(hmAwal)) {" + N +
  "    var cont = hmAwal - window._nseLastHM;" + N +
  "    if (cont < 0) { continuityHtml = '<div style=\"margin-top:6px;font-size:11px;color:#DC2626;font-weight:700;\">&#9888; HM Awal (' + hmAwal.toFixed(1) + ') lebih kecil dari HM Terakhir (' + window._nseLastHM.toFixed(1) + ')</div>'; }" + N +
  "    else if (cont < 0.1) { continuityHtml = '<div style=\"margin-top:6px;font-size:11px;color:#16A34A;font-weight:700;\">&#10003; Lanjut dari HM Terakhir (' + window._nseLastHM.toFixed(1) + ')</div>'; }" + N +
  "    else { continuityHtml = '<div style=\"margin-top:6px;font-size:11px;color:#D97706;font-weight:700;\">&#9432; Gap +' + cont.toFixed(1) + ' dari HM Terakhir (' + window._nseLastHM.toFixed(1) + ')</div>'; }" + N +
  "  }" + N +
  "  prevEl.innerHTML = '<div style=\"background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 14px;margin-top:4px;\">' +" + N +
  "    '<span style=\"font-size:13px;font-weight:700;color:#16A34A;\">' + hrs.toFixed(1) + ' jam' + badge + ' — ' + fmtRp(salary) + '</span>' + hmGapHtml + continuityHtml + '</div>';" + N +
  "}",
  'PATCH 1: _nsePreviewUpdate — add continuity check'
);

// ─── PATCH 2: Insert loadNSEUnitLastHM() function after _nsePreviewUpdate ────
replaceExact(
  "    '<span style=\"font-size:13px;font-weight:700;color:#16A34A;\">' + hrs.toFixed(1) + ' jam' + badge + ' — ' + fmtRp(salary) + '</span>' + hmGapHtml + continuityHtml + '</div>';" + N +
  "}" + N +
  N +
  "async function openAddNSEModal()",
  "    '<span style=\"font-size:13px;font-weight:700;color:#16A34A;\">' + hrs.toFixed(1) + ' jam' + badge + ' — ' + fmtRp(salary) + '</span>' + hmGapHtml + continuityHtml + '</div>';" + N +
  "}" + N +
  N +
  "async function loadNSEUnitLastHM() {" + N +
  "  var unitId = (document.getElementById('nse-m-unit') || {}).value;" + N +
  "  window._nseLastHM = null;" + N +
  "  var hintEl = document.getElementById('nse-m-hm-hint');" + N +
  "  if (!unitId || !hintEl) { _nsePreviewUpdate(); return; }" + N +
  "  hintEl.innerHTML = '<span style=\"font-size:11px;color:#64748B;\">Mengecek HM terakhir...</span>';" + N +
  "  var pu = await sb.from('project_units').select('hm_akhir').eq('unit_id', unitId).not('hm_akhir', 'is', null).order('hm_akhir', { ascending: false }).limit(1);" + N +
  "  var ns = await sb.from('nse_sessions').select('hm_akhir').eq('unit_id', unitId).not('hm_akhir', 'is', null).order('hm_akhir', { ascending: false }).limit(1);" + N +
  "  var puVal = pu.data && pu.data.length > 0 ? pu.data[0].hm_akhir : null;" + N +
  "  var nsVal = ns.data && ns.data.length > 0 ? ns.data[0].hm_akhir : null;" + N +
  "  var lastHM = null;" + N +
  "  if (puVal != null && nsVal != null) lastHM = Math.max(puVal, nsVal);" + N +
  "  else if (puVal != null) lastHM = puVal;" + N +
  "  else if (nsVal != null) lastHM = nsVal;" + N +
  "  window._nseLastHM = lastHM;" + N +
  "  if (lastHM != null) {" + N +
  "    hintEl.innerHTML = '<div style=\"background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:6px 10px;font-size:12px;color:#1D4ED8;\">HM Terakhir unit ini: <strong>' + lastHM.toFixed(1) + '</strong></div>';" + N +
  "  } else {" + N +
  "    hintEl.innerHTML = '<div style=\"background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:6px 10px;font-size:12px;color:#64748B;\">Belum ada data HM untuk unit ini.</div>';" + N +
  "  }" + N +
  "  _nsePreviewUpdate();" + N +
  "}" + N +
  N +
  "async function openAddNSEModal()",
  'PATCH 2: insert loadNSEUnitLastHM() function'
);

// ─── PATCH 3: Add modal — unit select onchange + hint div ────────────────────
replaceExact(
  "'<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Unit *</label><select id=\"nse-m-unit\" class=\"finput\"><option value=\"\">-- Pilih Unit --</option>' + unitOpts + '</select></div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Mulai *</label><input type=\"time\" id=\"nse-m-start\" class=\"finput\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Selesai *</label><input type=\"time\" id=\"nse-m-end\" class=\"finput\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Awal</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmawal\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" placeholder=\"Opsional\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Akhir</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmakhir\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" placeholder=\"Opsional\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div id=\"nse-m-preview\" style=\"margin-bottom:12px;\"></div>' +",
  "'<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Unit *</label><select id=\"nse-m-unit\" class=\"finput\" onchange=\"loadNSEUnitLastHM()\"><option value=\"\">-- Pilih Unit --</option>' + unitOpts + '</select></div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Mulai *</label><input type=\"time\" id=\"nse-m-start\" class=\"finput\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Selesai *</label><input type=\"time\" id=\"nse-m-end\" class=\"finput\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Awal</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmawal\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" placeholder=\"Opsional\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Akhir</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmakhir\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" placeholder=\"Opsional\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div id=\"nse-m-hm-hint\" style=\"margin-bottom:8px;\"></div>' +" + N +
  "    '<div id=\"nse-m-preview\" style=\"margin-bottom:12px;\"></div>' +",
  'PATCH 3: Add modal — unit select onchange + hint div'
);

// ─── PATCH 4: Edit modal — unit select onchange + hint div ───────────────────
replaceExact(
  "'<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Unit *</label><select id=\"nse-m-unit\" class=\"finput\"><option value=\"\">-- Pilih Unit --</option>' + unitOpts + '</select></div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Mulai *</label><input type=\"time\" id=\"nse-m-start\" class=\"finput\" value=\"' + startVal + '\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Selesai *</label><input type=\"time\" id=\"nse-m-end\" class=\"finput\" value=\"' + endVal + '\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Awal</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmawal\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" value=\"' + (s.hm_awal != null ? s.hm_awal : '') + '\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Akhir</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmakhir\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" value=\"' + (s.hm_akhir != null ? s.hm_akhir : '') + '\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div id=\"nse-m-preview\" style=\"margin-bottom:12px;\"></div>' +",
  "'<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Unit *</label><select id=\"nse-m-unit\" class=\"finput\" onchange=\"loadNSEUnitLastHM()\"><option value=\"\">-- Pilih Unit --</option>' + unitOpts + '</select></div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Mulai *</label><input type=\"time\" id=\"nse-m-start\" class=\"finput\" value=\"' + startVal + '\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Jam Selesai *</label><input type=\"time\" id=\"nse-m-end\" class=\"finput\" value=\"' + endVal + '\" oninput=\"_nsePreviewUpdate()\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;\">' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Awal</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmawal\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" value=\"' + (s.hm_awal != null ? s.hm_awal : '') + '\"></div>' +" + N +
  "    '<div><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">HM Akhir</label><input type=\"number\" step=\"0.1\" id=\"nse-m-hmakhir\" class=\"finput\" oninput=\"_nsePreviewUpdate()\" value=\"' + (s.hm_akhir != null ? s.hm_akhir : '') + '\"></div>' +" + N +
  "    '</div>' +" + N +
  "    '<div id=\"nse-m-hm-hint\" style=\"margin-bottom:8px;\"></div>' +" + N +
  "    '<div id=\"nse-m-preview\" style=\"margin-bottom:12px;\"></div>' +",
  'PATCH 4: Edit modal — unit select onchange + hint div'
);

// ─── PATCH 5: Edit modal setTimeout — call loadNSEUnitLastHM on open ─────────
replaceExact(
  "  setTimeout(_nsePreviewUpdate, 50);" + N +
  "}",
  "  setTimeout(function() { loadNSEUnitLastHM(); }, 50);" + N +
  "}",
  'PATCH 5: Edit modal setTimeout — trigger loadNSEUnitLastHM'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
