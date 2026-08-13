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

// PS2-1: Full rewrite of renderProyekRingkasan + insert markProyekPaid + saveProyekKasbon

const fromRender =
  "function renderProyekRingkasan(projects) {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  const operatorMap = {};" + R +
  "  projects.forEach(p => {" + R +
  "    const units = p.project_units || [];" + R +
  "    if (p.type === 'kapal') {" + R +
  "      const rate = calcKapalRate(p.ship_number_in_month || 1);" + R +
  "      const split = calcKapalTonnageSplit(units, p.total_mt_m3 || 0);" + R +
  "      split.forEach(u => {" + R +
  "        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0, stockpileHM: 0, unitCode: u.units ? u.units.code : '', details: [] };" + R +
  "        const kamt = u.allocatedMt * rate;" + R +
  "        operatorMap[key].kapal += kamt;" + R +
  "        operatorMap[key].details.push({ code: p.project_code, type: 'Kapal', amount: kamt });" + R +
  "      });" + R +
  "    } else {" + R +
  "      units.forEach(u => {" + R +
  "        const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "        if (!operatorMap[key]) operatorMap[key] = { kapal: 0, stockpile: 0, stockpileHM: 0, unitCode: u.units ? u.units.code : '', details: [] };" + R +
  "        const sHM = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0;" + R +
  "        const samt = sHM * 35000;" + R +
  "        operatorMap[key].stockpile += samt;" + R +
  "        operatorMap[key].stockpileHM += sHM;" + R +
  "        operatorMap[key].details.push({ code: p.project_code, type: 'STK', amount: samt, hm: sHM });" + R +
  "      });" + R +
  "    }" + R +
  "  });" + R +
  "  let h = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;\">';" + R +
  "  h += '<div style=\"font-size:15px;font-weight:700;color:#1E293B;\">Ringkasan Gaji</div>';" + R +
  "  h += '<div style=\"display:flex;gap:8px;align-items:center;\">';" + R +
  "  h += '<input type=\"month\" class=\"finput\" style=\"padding:6px 10px;font-size:13px;\" value=\"' + proyekMonthFilter + '\" onchange=\"proyekMonthFilter=this.value;loadProyekRingkasan();\">';" + R +
  "  h += '<button onclick=\"exportProyekExcel()\" class=\"btn-primary\" style=\"padding:8px 14px;font-size:13px;\">Export Excel</button>';" + R +
  "  h += '</div></div>';" + R +
  "  if (Object.keys(operatorMap).length === 0) {" + R +
  "    h += '<div style=\"background:#F8FAFC;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;\">Tidak ada data untuk bulan ini.</div>';" + R +
  "    panel.innerHTML = h; return;" + R +
  "  }" + R +
  "  h += '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;\">';" + R +
  "  h += '<thead><tr style=\"background:#F1F5F9;\"><th style=\"padding:10px 12px;text-align:left;font-weight:700;color:#475569;\">Unit / Operator</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Kapal</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Stockpile</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">HM Stockpile</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Total Kerja</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Gaji Pokok</th><th style=\"padding:10px 12px;text-align:right;font-weight:700;color:#475569;\">Grand Total</th></tr></thead><tbody>';" + R +
  "  let grandK = 0, grandS = 0, grandSTKHM = 0;" + R +
  "  Object.entries(operatorMap).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name, sal]) => {" + R +
  "    const totalKerja = sal.kapal + sal.stockpile;" + R +
  "    const grandTotal = totalKerja + 3100000;" + R +
  "    grandK += sal.kapal; grandS += sal.stockpile; grandSTKHM += sal.stockpileHM;" + R +
  "    const unitLabel = sal.unitCode ? sal.unitCode + ' / ' + name : name;" + R +
  "    h += '<tr style=\"border-bottom:1px solid #F1F5F9;\">';" + R +
  "    h += '<td style=\"padding:10px 12px;font-weight:600;\">' + unitLabel + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(sal.kapal) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(sal.stockpile) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;\">' + (sal.stockpileHM > 0 ? sal.stockpileHM.toFixed(1) + ' HM' : '-') + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;font-weight:700;\">' + fmtRp(totalKerja) + '</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;color:#64748B;\">Rp 3.100.000</td>';" + R +
  "    h += '<td style=\"padding:10px 12px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grandTotal) + '</td></tr>';" + R +
  "    if (sal.details.length > 0) {" + R +
  "      const detailText = sal.details.map(function(d) { return d.code + ' (' + d.type + (d.hm != null ? ' ' + d.hm.toFixed(1) + 'HM' : '') + '): ' + fmtRp(d.amount); }).join(' | ');" + R +
  "      h += '<tr style=\"background:#F8FAFC;\"><td colspan=\"7\" style=\"padding:3px 12px 6px 20px;font-size:11px;color:#64748B;\">' + detailText + '</td></tr>';" + R +
  "    }" + R +
  "  });" + R +
  "  const allTotal = grandK + grandS;" + R +
  "  h += '<tr style=\"background:#F1F5F9;font-weight:800;\"><td style=\"padding:10px 12px;\">TOTAL</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(grandK) + '</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(grandS) + '</td><td style=\"padding:10px 12px;text-align:right;\">' + grandSTKHM.toFixed(1) + ' HM</td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(allTotal) + '</td><td style=\"padding:10px 12px;\"></td><td style=\"padding:10px 12px;text-align:right;\">' + fmtRp(allTotal + 3100000 * Object.keys(operatorMap).length) + '</td></tr>';" + R +
  "  h += '</tbody></table></div>';" + R +
  "  panel.innerHTML = h;" + R +
  "  panel._ringkasanProjects = projects;" + R +
  "}";

const toRender =
  "function renderProyekRingkasan(projects, allUnits, kasbons, monthYear) {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  panel._ringkasanProjects = projects;" + R +
  "  const proyekOps = (allUnits || []).filter(function(u) { return !WL_ALL_CODES.includes(u.code); });" + R +
  "  const opNames = [];" + R +
  "  proyekOps.forEach(function(u) { if (u.operator_name && opNames.indexOf(u.operator_name) < 0) opNames.push(u.operator_name); });" + R +
  "  opNames.sort();" + R +
  "  const kasbonMap = {};" + R +
  "  (kasbons || []).forEach(function(k) { kasbonMap[k.operator_name] = { amount: Number(k.amount), id: k.id }; });" + R +
  "  function dayOf(d) { return d ? parseInt(d.slice(8, 10), 10) : 0; }" + R +
  "  function isCarryover(p) { return p.month_year && p.end_date && p.month_year.slice(0, 7) !== p.end_date.slice(0, 7); }" + R +
  "  const unpaid = projects.filter(function(p) { return !p.paid_batch; });" + R +
  "  const batch16 = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) <= 15; });" + R +
  "  const batch31Kapal = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) > 15; });" + R +
  "  const batch31Stk = unpaid.filter(function(p) { return p.type === 'stockpile'; });" + R +
  "  panel._batch16Ids = batch16.map(function(p) { return p.id; });" + R +
  "  panel._batch31Ids = batch31Kapal.concat(batch31Stk).map(function(p) { return p.id; });" + R +
  "  panel._monthYear = monthYear;" + R +
  "  function buildOpMap(projs) {" + R +
  "    const opMap = {};" + R +
  "    projs.forEach(function(p) {" + R +
  "      if (p.type === 'kapal') {" + R +
  "        const rate = isCarryover(p) ? 175 : calcKapalRate(p.ship_number_in_month || 1);" + R +
  "        const split = calcKapalTonnageSplit(p.project_units || [], p.total_mt_m3 || 0);" + R +
  "        split.forEach(function(u) {" + R +
  "          const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "          if (!opMap[key]) opMap[key] = { total: 0, rows: [] };" + R +
  "          const amt = u.allocatedMt * rate;" + R +
  "          opMap[key].total += amt;" + R +
  "          opMap[key].rows.push(p.project_code + (isCarryover(p) ? ' [CO]' : '') + ' @' + rate + '/MT: ' + fmtRp(amt));" + R +
  "        });" + R +
  "      } else {" + R +
  "        (p.project_units || []).forEach(function(u) {" + R +
  "          const key = u.units ? (u.units.operator_name || u.units.code) : u.unit_id;" + R +
  "          if (!opMap[key]) opMap[key] = { total: 0, rows: [] };" + R +
  "          const hm = u.hm_akhir != null ? u.hm_akhir - u.hm_awal : 0;" + R +
  "          const amt = hm * 35000;" + R +
  "          opMap[key].total += amt;" + R +
  "          opMap[key].rows.push(p.project_code + ' STK ' + hm.toFixed(1) + 'HM: ' + fmtRp(amt));" + R +
  "        });" + R +
  "      }" + R +
  "    });" + R +
  "    return opMap;" + R +
  "  }" + R +
  "  const opMap16 = buildOpMap(batch16);" + R +
  "  const opMap31 = buildOpMap(batch31Kapal.concat(batch31Stk));" + R +
  "  let h = '<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;\">';" + R +
  "  h += '<div style=\"font-size:15px;font-weight:700;color:#1E293B;\">Ringkasan Gaji</div>';" + R +
  "  h += '<div style=\"display:flex;gap:8px;align-items:center;\">';" + R +
  "  h += '<input type=\"month\" id=\"proy-ring-month\" class=\"finput\" style=\"padding:6px 10px;font-size:13px;\" value=\"' + monthYear + '\" onchange=\"proyekMonthFilter=this.value;loadProyekRingkasan();\">';" + R +
  "  h += '<button onclick=\"exportProyekExcel()\" class=\"btn-primary\" style=\"padding:8px 14px;font-size:13px;\">Export Excel</button>';" + R +
  "  h += '</div></div>';" + R +
  "  h += '<div style=\"background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;margin-bottom:20px;\">';" + R +
  "  h += '<div style=\"font-size:14px;font-weight:800;color:#1D4ED8;margin-bottom:12px;\">Batch 16 - Kapal Selesai Tgl 1-15</div>';" + R +
  "  if (batch16.length === 0) {" + R +
  "    h += '<div style=\"color:#64748B;font-size:13px;\">Tidak ada kapal selesai tgl 1-15 bulan ini.</div>';" + R +
  "  } else {" + R +
  "    h += '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;\"><thead><tr style=\"background:#DBEAFE;\"><th style=\"padding:8px 10px;text-align:left;\">Operator</th><th style=\"padding:8px 10px;text-align:left;\">Detail Proyek</th><th style=\"padding:8px 10px;text-align:right;\">Total Gaji</th></tr></thead><tbody>';" + R +
  "    Object.entries(opMap16).sort(function(a, b) { return a[0].localeCompare(b[0]); }).forEach(function(entry) {" + R +
  "      const name = entry[0]; const s = entry[1];" + R +
  "      h += '<tr style=\"border-bottom:1px solid #BFDBFE;\"><td style=\"padding:8px 10px;font-weight:600;\">' + name + '</td>';" + R +
  "      h += '<td style=\"padding:8px 10px;font-size:11px;color:#64748B;\">' + s.rows.join('<br>') + '</td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:right;font-weight:700;\">' + fmtRp(s.total) + '</td></tr>';" + R +
  "    });" + R +
  "    h += '</tbody></table></div>';" + R +
  "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'mid_month\\')\" class=\"btn-primary\" style=\"background:#1D4ED8;\">Tandai Lunas Batch 16</button></div>';" + R +
  "  }" + R +
  "  h += '</div>';" + R +
  "  h += '<div style=\"background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px;\">';" + R +
  "  h += '<div style=\"font-size:14px;font-weight:800;color:#16A34A;margin-bottom:12px;\">Batch 31 - Kapal Tgl 16-31 + Semua Stockpile + Gaji Pokok</div>';" + R +
  "  if (batch31Kapal.length === 0 && batch31Stk.length === 0 && opNames.length === 0) {" + R +
  "    h += '<div style=\"color:#64748B;font-size:13px;\">Tidak ada proyek selesai untuk batch akhir bulan.</div>';" + R +
  "  } else {" + R +
  "    h += '<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;\"><thead><tr style=\"background:#DCFCE7;\"><th style=\"padding:8px 10px;text-align:left;\">Operator</th><th style=\"padding:8px 10px;text-align:right;\">Gaji Proyek</th><th style=\"padding:8px 10px;text-align:right;\">Gaji Pokok</th><th style=\"padding:8px 10px;text-align:center;\">Kasbon</th><th style=\"padding:8px 10px;text-align:right;\">Grand Total</th></tr></thead><tbody>';" + R +
  "    opNames.forEach(function(name) {" + R +
  "      const s = opMap31[name] || { total: 0, rows: [] };" + R +
  "      const kasbon = kasbonMap[name] ? kasbonMap[name].amount : 0;" + R +
  "      const grandTotal = s.total + 3100000 - kasbon;" + R +
  "      const safeId = name.replace(/\\s+/g, '_');" + R +
  "      h += '<tr style=\"border-bottom:1px solid #BBF7D0;\"><td style=\"padding:8px 10px;font-weight:600;\">' + name + '</td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:right;\">';" + R +
  "      if (s.rows.length > 0) h += '<span style=\"font-size:11px;color:#64748B;\">' + s.rows.join('<br>') + '</span><br>';" + R +
  "      h += '<strong>' + fmtRp(s.total) + '</strong></td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:right;color:#64748B;\">Rp 3.100.000</td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:center;\"><input id=\"proy-kasbon-' + safeId + '\" data-op=\"' + name + '\" type=\"number\" class=\"finput\" style=\"width:110px;text-align:right;\" value=\"' + kasbon + '\" placeholder=\"0\"></td>';" + R +
  "      h += '<td style=\"padding:8px 10px;text-align:right;font-weight:800;color:#16A34A;\">' + fmtRp(grandTotal) + '</td></tr>';" + R +
  "    });" + R +
  "    h += '</tbody></table></div>';" + R +
  "    h += '<div style=\"margin-top:12px;\"><button onclick=\"markProyekPaid(\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Lunas Batch 31</button></div>';" + R +
  "  }" + R +
  "  h += '</div>';" + R +
  "  panel.innerHTML = h;" + R +
  "}" + R +
  R +
  "async function markProyekPaid(paymentType) {" + R +
  "  try {" + R +
  "    const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "    const monthYear = panel._monthYear;" + R +
  "    const ids = paymentType === 'mid_month' ? (panel._batch16Ids || []) : (panel._batch31Ids || []);" + R +
  "    if (ids.length === 0) { showToast('Tidak ada proyek untuk ditandai.'); return; }" + R +
  "    if (paymentType === 'end_of_month') await saveProyekKasbon(monthYear);" + R +
  "    const label = paymentType === 'mid_month' ? 'Batch 16' : 'Batch 31';" + R +
  "    if (!confirm('Tandai ' + ids.length + ' proyek sebagai dibayar (' + label + ')?')) return;" + R +
  "    const { error } = await sb.from('projects').update({ paid_batch: paymentType }).in('id', ids);" + R +
  "    if (error) throw error;" + R +
  "    showToast(ids.length + ' proyek ditandai sebagai dibayar.', 'success');" + R +
  "    await loadProyekRingkasan();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function saveProyekKasbon(monthYear) {" + R +
  "  const panel = document.getElementById('proyek-panel-ringkasan');" + R +
  "  const inputs = panel.querySelectorAll('[id^=\"proy-kasbon-\"]');" + R +
  "  const { data: existing } = await sb.from('proyek_kasbon').select('id, operator_name').eq('month_year', monthYear);" + R +
  "  const existMap = {};" + R +
  "  (existing || []).forEach(function(k) { existMap[k.operator_name] = k.id; });" + R +
  "  await Promise.all(Array.from(inputs).map(async function(input) {" + R +
  "    const op = input.dataset.op;" + R +
  "    if (!op) return;" + R +
  "    const amount = parseFloat(input.value) || 0;" + R +
  "    if (existMap[op]) {" + R +
  "      await sb.from('proyek_kasbon').update({ amount: amount }).eq('id', existMap[op]);" + R +
  "    } else if (amount > 0) {" + R +
  "      await sb.from('proyek_kasbon').insert({ month_year: monthYear, operator_name: op, amount: amount });" + R +
  "    }" + R +
  "  }));" + R +
  "}";

replaceExact(fromRender, toRender, 'PS2-1: rewrite renderProyekRingkasan + add markProyekPaid + saveProyekKasbon');

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll PS-2 patches applied. Running syntax check...');
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
