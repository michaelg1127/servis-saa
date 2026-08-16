const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;

function replaceExact(from, to, desc) {
  if (!html.includes(from)) { console.error('MISS: ' + desc); process.exit(1); }
  const count = html.split(from).length - 1;
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changed++;
  console.log('OK: ' + desc);
}

const CRLF = '\r\n';

// 1. Insert bank fields in form HTML — between operator closing </div> and hidden input
// Matches lines 719-720 in the unit form (inside admin-screen-unit)
replaceExact(
  '            </select>' + CRLF +
  '          </div>' + CRLF +
  '          <input type="hidden" id="uf-edit-id">',

  '            </select>' + CRLF +
  '          </div>' + CRLF +
  '          <div style="margin-bottom:12px;">' + CRLF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Nama Bank</label>' + CRLF +
  '            <input type="text" id="uf-bank-name" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="BCA / BRI / Mandiri">' + CRLF +
  '          </div>' + CRLF +
  '          <div style="margin-bottom:16px;">' + CRLF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">No. Rekening</label>' + CRLF +
  '            <input type="text" id="uf-bank-account" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="Nomor rekening">' + CRLF +
  '          </div>' + CRLF +
  '          <input type="hidden" id="uf-edit-id">',
  'insert bank fields into unit form HTML'
);

// 2. loadAdminUnits: add bank columns to select (line 3093)
replaceExact(
  "    const { data } = await sb.from('units').select('id, code, name, model, current_hm, assigned_operator_id');",
  "    const { data } = await sb.from('units').select('id, code, name, model, current_hm, assigned_operator_id, bank_name, bank_account_number');",
  'loadAdminUnits: fetch bank columns'
);

// 3. editUnit: pre-populate bank fields (after operator line, before edit-id line — lines 3856-3857)
replaceExact(
  "  document.getElementById('uf-operator').value = u.assigned_operator_id || '';" + CRLF +
  "  document.getElementById('uf-edit-id').value = id;",

  "  document.getElementById('uf-operator').value = u.assigned_operator_id || '';" + CRLF +
  "  document.getElementById('uf-bank-name').value = u.bank_name || '';" + CRLF +
  "  document.getElementById('uf-bank-account').value = u.bank_account_number || '';" + CRLF +
  "  document.getElementById('uf-edit-id').value = id;",
  'editUnit: pre-populate bank fields'
);

// 4. cancelUnitEdit: reset bank fields (lines 3868-3869)
replaceExact(
  "  document.getElementById('uf-operator').value = '';" + CRLF +
  "  document.getElementById('uf-edit-id').value = '';",

  "  document.getElementById('uf-operator').value = '';" + CRLF +
  "  document.getElementById('uf-bank-name').value = '';" + CRLF +
  "  document.getElementById('uf-bank-account').value = '';" + CRLF +
  "  document.getElementById('uf-edit-id').value = '';",
  'cancelUnitEdit: reset bank fields'
);

// 5. saveUnit: include bank fields in update payload (line 3886)
replaceExact(
  "      const { error } = await sb.from('units').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null }).eq('id', editId);",

  "      const bankName = document.getElementById('uf-bank-name').value.trim() || null;" + CRLF +
  "      const bankAccount = document.getElementById('uf-bank-account').value.trim() || null;" + CRLF +
  "      const { error } = await sb.from('units').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null, bank_name: bankName, bank_account_number: bankAccount }).eq('id', editId);",
  'saveUnit: write bank fields on update'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
