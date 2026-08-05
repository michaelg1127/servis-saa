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

// T15-1: doAdminDeleteJO — reset linked SR to pending_spv after deleting JO.
//        Previously the linked SR stayed in 'scheduled' status forever (orphaned),
//        making it appear in Permintaan Servis 'Terjadwal' tab with no associated JO.
replaceExact(
  "async function doAdminDeleteJO(joId) {" + R +
  "  try {" + R +
  "    // Null out service_log job_order_id before deleting (FK NO ACTION)" + R +
  "    await sb.from('service_log').update({ job_order_id: null }).eq('job_order_id', joId);" + R +
  "    const { data, error } = await sb.from('job_orders').delete().eq('id', joId).select();" + R +
  "    if (error) throw error;" + R +
  "    if (!data || data.length === 0) throw new Error('Akses ditolak (RLS). Hubungi admin.');" + R +
  "    closeModal();" + R +
  "    showToast('JO berhasil dihapus.', 'info');" + R +
  "    await loadAdminJadwalMKN();" + R +
  "    await loadAdminDashboard();" + R +
  "  } catch (e) { showToast('Gagal: ' + e.message); }" + R +
  "}",

  "async function doAdminDeleteJO(joId) {" + R +
  "  try {" + R +
  "    const { data: joInfo } = await sb.from('job_orders').select('linked_sr_id').eq('id', joId).single();" + R +
  "    // Null out service_log job_order_id before deleting (FK NO ACTION)" + R +
  "    await sb.from('service_log').update({ job_order_id: null }).eq('job_order_id', joId);" + R +
  "    const { data, error } = await sb.from('job_orders').delete().eq('id', joId).select();" + R +
  "    if (error) throw error;" + R +
  "    if (!data || data.length === 0) throw new Error('Akses ditolak (RLS). Hubungi admin.');" + R +
  "    if (joInfo?.linked_sr_id) {" + R +
  "      await sb.from('service_requests').update({ status: 'pending_spv', assigned_mkn_id: null }).eq('id', joInfo.linked_sr_id);" + R +
  "    }" + R +
  "    closeModal();" + R +
  "    showToast('JO berhasil dihapus.', 'info');" + R +
  "    await loadAdminJadwalMKN();" + R +
  "    await loadAdminDashboard();" + R +
  "  } catch (e) { showToast('Gagal: ' + e.message); }" + R +
  "}",

  'T15-1: doAdminDeleteJO: reset linked SR to pending_spv after JO deletion'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T15 patches applied. Running syntax check...');
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
