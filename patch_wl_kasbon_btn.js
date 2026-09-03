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

// ─── PATCH 1: tbl31 — add Simpan button + ID on grand total cell ─────────────
replaceExact(
  "'<td style=\"padding:8px 10px;text-align:center;\"><input id=\"wl-kasbon-' + sid + '\" data-op=\"' + name + '\" type=\"number\" class=\"finput\" style=\"width:110px;text-align:right;\" value=\"' + kb + '\" placeholder=\"0\"></td>' +" + N +
  "          '<td style=\"padding:8px 10px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grand) + '</td></tr>';",
  "'<td style=\"padding:8px 10px;text-align:center;\"><div style=\"display:flex;gap:4px;align-items:center;justify-content:center;\"><input id=\"wl-kasbon-' + sid + '\" data-op=\"' + name + '\" type=\"number\" class=\"finput\" style=\"width:80px;text-align:right;\" value=\"' + kb + '\" placeholder=\"0\"><button data-sid=\"' + sid + '\" data-op=\"' + name + '\" data-worktotal=\"' + (s.total + 3100000) + '\" data-monthyear=\"' + monthYear + '\" onclick=\"saveWlKasbonRow(this)\" style=\"background:#0F172A;color:white;border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;\">Simpan</button></div></td>' +" + N +
  "          '<td id=\"wl-grand-' + sid + '\" style=\"padding:8px 10px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grand) + '</td></tr>';",
  'PATCH 1: tbl31 — Simpan button + ID on grand total cell'
);

// ─── PATCH 2: insert saveWlKasbonRow() after saveKasbonRow ───────────────────
replaceExact(
  "  btn.disabled = false; btn.textContent = 'Simpan';" + N +
  "}" + N +
  "function updateBatch31TotalTransfer()",
  "  btn.disabled = false; btn.textContent = 'Simpan';" + N +
  "}" + N +
  "async function saveWlKasbonRow(btn) {" + N +
  "  var sid = btn.dataset.sid;" + N +
  "  var opName = btn.dataset.op;" + N +
  "  var monthYear = btn.dataset.monthyear;" + N +
  "  var workTotal = parseFloat(btn.dataset.worktotal) || 0;" + N +
  "  var input = document.getElementById('wl-kasbon-' + sid);" + N +
  "  var amount = parseFloat(input ? input.value : 0) || 0;" + N +
  "  btn.disabled = true; btn.textContent = '...';" + N +
  "  try {" + N +
  "    var exRes = await sb.from('woodlog_kasbon').select('id').eq('month_year', monthYear).eq('operator_name', opName);" + N +
  "    if (exRes.data && exRes.data.length > 0) {" + N +
  "      var { error } = await sb.from('woodlog_kasbon').update({ amount: amount }).eq('id', exRes.data[0].id);" + N +
  "      if (error) throw error;" + N +
  "    } else {" + N +
  "      var { error } = await sb.from('woodlog_kasbon').insert({ month_year: monthYear, operator_name: opName, amount: amount });" + N +
  "      if (error) throw error;" + N +
  "    }" + N +
  "    var grandEl = document.getElementById('wl-grand-' + sid);" + N +
  "    if (grandEl) grandEl.textContent = fmtRp(workTotal - amount);" + N +
  "    showToast('Kasbon ' + opName + ' tersimpan', 'success');" + N +
  "  } catch(e) { showToast('Gagal simpan kasbon: ' + e.message); }" + N +
  "  btn.disabled = false; btn.textContent = 'Simpan';" + N +
  "}" + N +
  "function updateBatch31TotalTransfer()",
  'PATCH 2: insert saveWlKasbonRow() function'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
