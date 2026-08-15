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

replaceFn('openCloseWoodlogKapalModal', false, `function openCloseWoodlogKapalModal(id) {
  const p = _wlKapalCache[id];
  if (!p) return;
  const modalHTML = '<div style="padding:24px;max-width:460px;width:100%;">' +
    '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:4px;">Tutup Proyek ' + p.project_code + '</div>' +
    '<div style="font-size:13px;color:#64748B;margin-bottom:20px;">' + (p.nama_kapal || '') + ' · ' + formatDate(p.end_date) + '</div>' +
    '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">No. Invoice *</label><input type="text" id="wlclose-inv" class="finput" value="' + (p.invoice_number || '') + '" placeholder="Nomor invoice dari klien"></div>' +
    '<div style="margin-bottom:20px;"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nilai Invoice (Rp) *</label><input type="number" id="wlclose-invamt" class="finput" value="' + (p.invoice_amount || '') + '" min="0" placeholder="0"></div>' +
    '<div style="display:flex;gap:12px;">' +
    '<button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>' +
    '<button onclick="submitCloseWoodlogKapal(\'' + id + '\')" class="btn-primary" style="flex:2;">Tutup Proyek</button>' +
    '</div></div>';
  document.getElementById('modal-box').innerHTML = modalHTML;
  document.getElementById('modal-overlay').style.display = 'flex';
}`);

replaceFn('submitCloseWoodlogKapal', true, `async function submitCloseWoodlogKapal(id) {
  const inv = (document.getElementById('wlclose-inv') || {}).value ? document.getElementById('wlclose-inv').value.trim() : '';
  const invAmt = parseFloat((document.getElementById('wlclose-invamt') || {}).value) || null;
  if (!inv) { showToast('No. Invoice wajib diisi.'); return; }
  try {
    const { error } = await sb.from('projects').update({ invoice_number: inv, invoice_amount: invAmt }).eq('id', id);
    if (error) throw error;
    const detailRow = document.getElementById('wl-kapal-detail-' + id);
    if (detailRow) detailRow.dataset.rendered = '';
    closeModal();
    showToast('Proyek berhasil ditutup.', 'success');
    await loadWoodlogKapal();
  } catch(e) { showToast('Gagal: ' + e.message); }
}`);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
