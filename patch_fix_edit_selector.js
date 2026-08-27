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

// Fix: selector was matching both <tr> and inner <div> elements, hiding the div
replaceExact(
  `  document.querySelectorAll('[id^="proy-edit-"]').forEach(function(r) { r.style.display = 'none'; });`,
  `  document.querySelectorAll('tr[id^="proy-edit-"]').forEach(function(r) { r.style.display = 'none'; });`,
  'FIX A: scope proy-edit selector to <tr> only'
);

replaceExact(
  `  document.querySelectorAll('[id^="kapal-bledit-"]').forEach(function(r) { r.style.display = 'none'; });`,
  `  document.querySelectorAll('tr[id^="kapal-bledit-"]').forEach(function(r) { r.style.display = 'none'; });`,
  'FIX K: scope kapal-bledit selector to <tr> only'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written — 2 fixes applied');
