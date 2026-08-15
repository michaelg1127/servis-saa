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

// Build from/to using char codes to sidestep all escaping issues
// BS = backslash, SQ = single-quote
const BS = String.fromCharCode(92);
const SQ = String.fromCharCode(39);

// Currently in file around id: BS+SQ+' + id + '+BS+SQ  (broken: id is inside the string)
// Needed around id: BS+SQ+SQ+' + id + '+SQ+BS+SQ     (correct: string ends/starts around id)
const editFrom = SQ + '<button onclick="submitEditWoodlogKapal(' + BS + SQ + ' + id + ' + BS + SQ + ')" class="btn-primary" style="flex:2;">Simpan Perubahan</button>' + SQ + ' +';
const editTo   = SQ + '<button onclick="submitEditWoodlogKapal(' + BS + SQ + SQ + ' + id + ' + SQ + BS + SQ + ')" class="btn-primary" style="flex:2;">Simpan Perubahan</button>' + SQ + ' +';

const closeFrom = SQ + '<button onclick="submitCloseWoodlogKapal(' + BS + SQ + ' + id + ' + BS + SQ + ')" class="btn-primary" style="flex:2;">Tutup Proyek</button>' + SQ + ' +';
const closeTo   = SQ + '<button onclick="submitCloseWoodlogKapal(' + BS + SQ + SQ + ' + id + ' + SQ + BS + SQ + ')" class="btn-primary" style="flex:2;">Tutup Proyek</button>' + SQ + ' +';

console.log('editFrom:', JSON.stringify(editFrom));
console.log('editTo:  ', JSON.stringify(editTo));

replaceExact(editFrom, editTo, 'fix Edit modal onclick quoting');
replaceExact(closeFrom, closeTo, 'fix Tutup modal onclick quoting');

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
