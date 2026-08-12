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

replaceExact(
  "async function loadWoodlogRingkasan() {" + R +
  "}",

  "async function loadWoodlogRingkasan() {" + R +
  "  const el = document.getElementById('wl-panel-ringkasan');" + R +
  "  if (!el) return;" + R +
  "  el.innerHTML = '<div style=\"color:#94A3B8;padding:20px;\">Memuat...</div>';" + R +
  "  try {" + R +
  "    const monthInput = el.querySelector('#wl-ring-month');" + R +
  "    const monthYear = monthInput ? monthInput.value : todayISO().slice(0, 7);" + R +
  "    const { data: completedProjects } = await sb.from('projects')" + R +
  "      .select('id, project_code, end_date, type')" + R +
  "      .in('type', ['woodlog_kapal', 'woodlog_hourly'])" + R +
  "      .not('end_date', 'is', null)" + R +
  "      .order('end_date', { ascending: true });" + R +
  "    const completedIds = (completedProjects || []).map(p => p.id);" + R +
  "    let salaryRows = [];" + R +
  "    if (completedIds.length > 0) {" + R +
  "      const { data: sals } = await sb.from('woodlog_operator_salary')" + R +
  "        .select('*').in('project_id', completedIds).is('paid_batch', null);" + R +
  "      salaryRows = sals || [];" + R +
  "    }" + R +
  "    const { data: kasbons } = await sb.from('woodlog_kasbon').select('*').eq('month_year', monthYear);" + R +
  "    const kasbonMap = {};" + R +
  "    (kasbons || []).forEach(k => { kasbonMap[k.operator_name] = { amount: Number(k.amount), id: k.id }; });" + R +
  "    renderWoodlogRingkasan(salaryRows, completedProjects || [], kasbonMap, monthYear);" + R +
  "  } catch(e) { el.innerHTML = '<div style=\"color:#EF4444;padding:20px;\">Error: ' + e.message + '</div>'; }" + R +
  "}" + R +
  R +
  "function renderWoodlogRingkasan(salaryRows, completedProjects, kasbonMap, monthYear) {" + R +
  "  const el = document.getElementById('wl-panel-ringkasan');" + R +
  "  if (!el) return;" + R +
  "  const retainerIds = new Set(completedProjects.slice(-2).map(p => p.id));" + R +
  "  const payableRows = salaryRows.filter(s => !retainerIds.has(s.project_id));" + R +
  "  const retainerProjects = completedProjects.slice(-2);" + R +
  "  const opSums = {};" + R +
  "  payableRows.forEach(function(s) {" + R +
  "    if (!opSums[s.operator_name]) opSums[s.operator_name] = 0;" + R +
  "    opSums[s.operator_name] += Number(s.salary_amount);" + R +
  "  });" + R +
  "  const allOps = Array.from(new Set(WL_BANGAU_OPS.concat(WL_STD_OPS).concat(Object.keys(opSums))));" + R +
  "  const tableRows = allOps.map(function(op) {" + R +
  "    const sal16 = opSums[op] || 0;" + R +
  "    const kasbon = kasbonMap[op] ? kasbonMap[op].amount : 0;" + R +
  "    const eom = sal16 + 3100000 - kasbon;" + R +
  "    return '<tr>' +" + R +
  "      '<td style=\"font-weight:700;\">' + op + '</td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;color:#1D4ED8;\">Rp ' + sal16.toLocaleString('id') + '</td>' +" + R +
  "      '<td style=\"text-align:right;\">Rp 3.100.000</td>' +" + R +
  "      '<td style=\"text-align:center;\"><input type=\"number\" id=\"wl-kasbon-' + op + '\" class=\"finput\" style=\"width:130px;font-size:13px;\" value=\"' + kasbon + '\" min=\"0\" placeholder=\"0\"></td>' +" + R +
  "      '<td style=\"text-align:right;font-weight:700;color:#16A34A;\">Rp ' + eom.toLocaleString('id') + '</td>' +" + R +
  "      '</tr>';" + R +
  "  }).join('');" + R +
  "  const retainerInfo = retainerProjects.length > 0" + R +
  "    ? '<div style=\"font-size:12px;color:#D97706;margin-bottom:12px;\">Retainer (belum dibayar): <strong>' + retainerProjects.map(p => p.project_code).join(', ') + '</strong></div>'" + R +
  "    : '';" + R +
  "  const paidCount = payableRows.length;" + R +
  "  el.innerHTML = '<div style=\"margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;\">' +" + R +
  "    '<label style=\"font-size:13px;font-weight:700;\">Bulan:</label>' +" + R +
  "    '<input type=\"month\" id=\"wl-ring-month\" class=\"finput\" style=\"width:160px;\" value=\"' + monthYear + '\" onchange=\"loadWoodlogRingkasan()\">' +" + R +
  "    '</div>' +" + R +
  "    retainerInfo +" + R +
  "    '<div style=\"font-size:13px;color:#64748B;margin-bottom:12px;\">' + paidCount + ' salary row(s) payable (unpaid, completed, excluding last 2 projects).</div>' +" + R +
  "    '<div class=\"table-wrap\" style=\"margin-bottom:16px;\"><table class=\"dt\"><thead><tr><th>Operator</th><th style=\"text-align:right;\">Salary (16th / EOM)</th><th style=\"text-align:right;\">Basic</th><th style=\"text-align:center;\">KASBON</th><th style=\"text-align:right;\">Akhir Bulan</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>' +" + R +
  "    '<div style=\"display:flex;gap:10px;flex-wrap:wrap;\">' +" + R +
  "    '<button onclick=\"markWoodlogPaid(\\'' + monthYear + '\\',\\'mid_month\\')\" class=\"btn-primary\" style=\"background:#1D4ED8;\">Tandai Dibayar (16)</button>' +" + R +
  "    '<button onclick=\"markWoodlogPaid(\\'' + monthYear + '\\',\\'end_of_month\\')\" class=\"btn-primary\" style=\"background:#16A34A;\">Tandai Dibayar (Akhir Bulan)</button>' +" + R +
  "    '</div>';" + R +
  "}" + R +
  R +
  "async function markWoodlogPaid(monthYear, paymentType) {" + R +
  "  try {" + R +
  "    await saveWoodlogKasbon(monthYear);" + R +
  "    const { data: completedProjects } = await sb.from('projects')" + R +
  "      .select('id, end_date').in('type', ['woodlog_kapal', 'woodlog_hourly'])" + R +
  "      .not('end_date', 'is', null).order('end_date', { ascending: true });" + R +
  "    const completedIds = (completedProjects || []).map(p => p.id);" + R +
  "    if (completedIds.length === 0) { showToast('Tidak ada proyek yang selesai.'); return; }" + R +
  "    const retainerIds = new Set(completedProjects.slice(-2).map(p => p.id));" + R +
  "    const payableIds = completedIds.filter(id => !retainerIds.has(id));" + R +
  "    if (payableIds.length === 0) { showToast('Tidak ada salary yang bisa ditandai (semua dalam retainer).'); return; }" + R +
  "    const { data: rows } = await sb.from('woodlog_operator_salary')" + R +
  "      .select('id').in('project_id', payableIds).is('paid_batch', null);" + R +
  "    const ids = (rows || []).map(r => r.id);" + R +
  "    if (ids.length === 0) { showToast('Tidak ada salary unpaid untuk ditandai.'); return; }" + R +
  "    const label = paymentType === 'mid_month' ? '16' : 'Akhir Bulan';" + R +
  "    if (!confirm('Tandai ' + ids.length + ' salary row(s) sebagai dibayar (' + label + ')?')) return;" + R +
  "    const { error } = await sb.from('woodlog_operator_salary').update({ paid_batch: paymentType }).in('id', ids);" + R +
  "    if (error) throw error;" + R +
  "    showToast(ids.length + ' salary ditandai sebagai dibayar.', 'success');" + R +
  "    await loadWoodlogRingkasan();" + R +
  "  } catch(e) { showToast('Gagal: ' + e.message); }" + R +
  "}" + R +
  R +
  "async function saveWoodlogKasbon(monthYear) {" + R +
  "  const allOps = WL_BANGAU_OPS.concat(WL_STD_OPS);" + R +
  "  const { data: existing } = await sb.from('woodlog_kasbon').select('id, operator_name').eq('month_year', monthYear);" + R +
  "  const existMap = {};" + R +
  "  (existing || []).forEach(k => { existMap[k.operator_name] = k.id; });" + R +
  "  await Promise.all(allOps.map(async function(op) {" + R +
  "    const input = document.getElementById('wl-kasbon-' + op);" + R +
  "    if (!input) return;" + R +
  "    const amount = parseFloat(input.value) || 0;" + R +
  "    if (existMap[op]) {" + R +
  "      await sb.from('woodlog_kasbon').update({ amount: amount }).eq('id', existMap[op]);" + R +
  "    } else if (amount > 0) {" + R +
  "      await sb.from('woodlog_kasbon').insert({ month_year: monthYear, operator_name: op, amount: amount });" + R +
  "    }" + R +
  "  }));" + R +
  "}",

  'WL5: Ringkasan tab functions'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll WL5 patches applied. Running syntax check...');
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
