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

// 1. Add Nama Rekening input after No. Rekening field (~line 724)
replaceExact(
  '          <div style="margin-bottom:16px;">' + CRLF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">No. Rekening</label>' + CRLF +
  '            <input type="text" id="uf-bank-account" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="Nomor rekening">' + CRLF +
  '          </div>',

  '          <div style="margin-bottom:12px;">' + CRLF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">No. Rekening</label>' + CRLF +
  '            <input type="text" id="uf-bank-account" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="Nomor rekening">' + CRLF +
  '          </div>' + CRLF +
  '          <div style="margin-bottom:16px;">' + CRLF +
  '            <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:5px;">Nama Rekening</label>' + CRLF +
  '            <input type="text" id="uf-bank-account-name" class="finput" style="font-size:14px;padding:10px 12px;" placeholder="Nama pemilik rekening">' + CRLF +
  '          </div>',

  'form: add Nama Rekening input field'
);

// 2. Wire into cancelUnitEdit — clear the new field
replaceExact(
  '  document.getElementById(\'uf-bank-account\').value = \'\';' + CRLF +
  '  document.getElementById(\'uf-edit-id\').value = \'\';',

  '  document.getElementById(\'uf-bank-account\').value = \'\';' + CRLF +
  '  document.getElementById(\'uf-bank-account-name\').value = \'\';' + CRLF +
  '  document.getElementById(\'uf-edit-id\').value = \'\';',

  'cancelUnitEdit: clear uf-bank-account-name'
);

// 3. Wire into openEditUnit — populate from DB value
replaceExact(
  '  document.getElementById(\'uf-bank-account\').value = u.bank_account_number || \'\';' + CRLF +
  '  document.getElementById(\'uf-edit-id\').value = id;',

  '  document.getElementById(\'uf-bank-account\').value = u.bank_account_number || \'\';' + CRLF +
  '  document.getElementById(\'uf-bank-account-name\').value = u.bank_account_name || \'\';' + CRLF +
  '  document.getElementById(\'uf-edit-id\').value = id;',

  'openEditUnit: populate uf-bank-account-name'
);

// 4. Wire into saveUnit — read value and include in update
replaceExact(
  '      const bankName = document.getElementById(\'uf-bank-name\').value.trim() || null;' + CRLF +
  '      const bankAccount = document.getElementById(\'uf-bank-account\').value.trim() || null;' + CRLF +
  '      const { error } = await sb.from(\'units\').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null, bank_name: bankName, bank_account_number: bankAccount }).eq(\'id\', editId);',

  '      const bankName = document.getElementById(\'uf-bank-name\').value.trim() || null;' + CRLF +
  '      const bankAccount = document.getElementById(\'uf-bank-account\').value.trim() || null;' + CRLF +
  '      const bankAccountName = document.getElementById(\'uf-bank-account-name\').value.trim() || null;' + CRLF +
  '      const { error } = await sb.from(\'units\').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null, bank_name: bankName, bank_account_number: bankAccount, bank_account_name: bankAccountName }).eq(\'id\', editId);',

  'saveUnit: include bank_account_name in update'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
