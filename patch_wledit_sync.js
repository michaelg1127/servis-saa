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

// 1. Sync button + result div in Edit modal, above Salary Bangau section
const anchorBtn = "    '<div style=\"font-size:13px;font-weight:700;color:#1E293B;margin-bottom:8px;\">Salary Bangau (J02/J03) — auto dari BL</div>' +";
replaceExact(
  anchorBtn,
  "    '<div style=\"margin-bottom:16px;\"><button type=\"button\" id=\"wledit-sync-btn\" onclick=\"wlEditSyncFromMonitoring(\\'' + (p.project_code || '') + '\\')\" style=\"background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px;cursor:pointer;\">↻ Sync dari Woodlog Monitoring</button>' +\r\n" +
  "    '<div id=\"wledit-sync-result\" style=\"margin-top:8px;\"></div></div>' +\r\n" +
  anchorBtn,
  'PATCH 1: sync button + result div in Edit modal'
);

// 2. wlEditSyncFromMonitoring() before submitEditWoodlogKapal
const anchorFn = "async function submitEditWoodlogKapal(id) {";
const syncFn =
"async function wlEditSyncFromMonitoring(code) {\r\n" +
"  var btn = document.getElementById('wledit-sync-btn');\r\n" +
"  var resultDiv = document.getElementById('wledit-sync-result');\r\n" +
"  if (!resultDiv) return;\r\n" +
"  if (!code) { resultDiv.innerHTML = '<div style=\"color:#EF4444;font-size:12px;\">Kode proyek tidak tersedia.</div>'; return; }\r\n" +
"  if (btn) { btn.textContent = 'Memuat...'; btn.disabled = true; }\r\n" +
"  try {\r\n" +
"    var res = await fetch('https://woodlog-monitoring.vercel.app/api/project-stats?code=' + encodeURIComponent(code));\r\n" +
"    if (!res.ok) {\r\n" +
"      if (res.status === 404) throw new Error('Kode ' + code + ' tidak ditemukan di Woodlog Monitoring. Pastikan kode proyek sudah diisi di sana.');\r\n" +
"      throw new Error('Error ' + res.status + ' dari Woodlog Monitoring.');\r\n" +
"    }\r\n" +
"    var data = await res.json();\r\n" +
"    var bl = Number(data.blQuantity || 0);\r\n" +
"    var notes = [];\r\n" +
"    var blInput = document.getElementById('wledit-bl');\r\n" +
"    if (bl > 0 && blInput) {\r\n" +
"      var oldBl = parseFloat(blInput.value) || 0;\r\n" +
"      if (oldBl > 0 && oldBl !== bl) notes.push('<div style=\"color:#D97706;font-size:12px;\">BL diganti: ' + oldBl.toLocaleString('id') + ' \\u2192 ' + bl.toLocaleString('id') + ' MT</div>');\r\n" +
"      blInput.value = bl;\r\n" +
"    }\r\n" +
"    if (!data.totalRitase || data.totalRitase === 0) {\r\n" +
"      notes.push('<div style=\"color:#D97706;font-size:12px;\">Total ritase = 0, tonase STD tidak dihitung.</div>');\r\n" +
"    } else {\r\n" +
"      var tpr = (bl * 0.9) / data.totalRitase;\r\n" +
"      var bonMuat = data.bonMuat || {};\r\n" +
"      var skipped = [];\r\n" +
"      var filled = [];\r\n" +
"      Object.keys(bonMuat).forEach(function(op) {\r\n" +
"        var inp = document.getElementById('wledit-std-ton-' + op);\r\n" +
"        if (inp) {\r\n" +
"          var ton = Math.round(tpr * bonMuat[op] * 100) / 100;\r\n" +
"          inp.value = ton;\r\n" +
"          filled.push(op + ': ' + bonMuat[op] + ' bon \\u2192 ' + ton.toFixed(2) + ' MT');\r\n" +
"        } else if (WL_BANGAU_OPS.indexOf(op) === -1) {\r\n" +
"          skipped.push(op);\r\n" +
"        }\r\n" +
"      });\r\n" +
"      notes.push('<div style=\"color:#64748B;font-size:12px;margin-bottom:4px;\">Ritase: <strong>' + data.totalRitase.toLocaleString('id') + '</strong> \\u00b7 Tonase/Ritase: <strong>' + tpr.toFixed(2) + ' MT</strong></div>');\r\n" +
"      if (filled.length) notes.push('<div style=\"color:#16A34A;font-size:12px;\">' + filled.join(' \\u00b7 ') + '</div>');\r\n" +
"      if (skipped.length) notes.push('<div style=\"color:#D97706;font-size:12px;\">Dilewati (bukan operator STD): ' + skipped.join(', ') + '</div>');\r\n" +
"    }\r\n" +
"    wlEditSalaryPreview();\r\n" +
"    resultDiv.innerHTML = notes.join('');\r\n" +
"  } catch(e) {\r\n" +
"    resultDiv.innerHTML = '<div style=\"color:#EF4444;font-size:12px;\">' + e.message + '</div>';\r\n" +
"  } finally {\r\n" +
"    if (btn) { btn.textContent = '\\u21bb Sync dari Woodlog Monitoring'; btn.disabled = false; }\r\n" +
"  }\r\n" +
"}\r\n" +
"\r\n";
replaceExact(anchorFn, syncFn + anchorFn, 'PATCH 2: wlEditSyncFromMonitoring function');

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
