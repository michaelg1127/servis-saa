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

replaceExact(
  '\'<button onclick="submitEditWoodlogKapal(\'\' + id + \'\')" class="btn-primary" style="flex:2;">Simpan Perubahan</button>\' +',
  '\'<button onclick="submitEditWoodlogKapal(\\\'' + ' + id + ' + '\\\')" class="btn-primary" style="flex:2;">Simpan Perubahan</button>\' +',
  'fix Edit modal onclick quoting'
);

replaceExact(
  '\'<button onclick="submitCloseWoodlogKapal(\'\' + id + \'\')" class="btn-primary" style="flex:2;">Tutup Proyek</button>\' +',
  '\'<button onclick="submitCloseWoodlogKapal(\\\'' + ' + id + ' + '\\\')" class="btn-primary" style="flex:2;">Tutup Proyek</button>\' +',
  'fix Tutup modal onclick quoting'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
