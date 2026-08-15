const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf8');
let changed = 0;
const BS = String.fromCharCode(92);
const SQ = String.fromCharCode(39);

function replaceExact(from, to, desc) {
  if (!html.includes(from)) { console.error('MISS: ' + desc); process.exit(1); }
  const count = html.split(from).length - 1;
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  html = html.replace(from, to);
  changed++;
  console.log('OK: ' + desc);
}

// Fix renderKapalDetailHTML: Edit button — '' → \''  (add backslash before the quote pairs)
const editFrom = 'openEditKapalModal(' + SQ + SQ + ' + p.id + ' + SQ + SQ + ')';
const editTo   = 'openEditKapalModal(' + BS + SQ + SQ + ' + p.id + ' + SQ + BS + SQ + ')';
replaceExact(editFrom, editTo, 'fix Edit button onclick in renderKapalDetailHTML');

// Fix renderKapalDetailHTML: Hapus button — '' → \'' (two params: p.id and p.project_code)
const hapusFrom = 'deleteKapalProject(' + SQ + SQ + ' + p.id + ' + SQ + SQ + ',' + SQ + SQ + ' + p.project_code + ' + SQ + SQ + ')';
const hapusTo   = 'deleteKapalProject(' + BS + SQ + SQ + ' + p.id + ' + SQ + BS + SQ + ',' + BS + SQ + SQ + ' + p.project_code + ' + SQ + BS + SQ + ')';
replaceExact(hapusFrom, hapusTo, 'fix Hapus button onclick in renderKapalDetailHTML');

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
