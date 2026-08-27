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

const N = '\r\n';

// ── FIX 1: Stockpile — sort by end_date instead of project_code ──────────────
replaceExact(
  [
    `      .eq('type', 'stockpile')`,
    `      .order('project_code', { ascending: false });`
  ].join(N),
  [
    `      .eq('type', 'stockpile')`,
    `      .order('end_date', { ascending: false });`
  ].join(N),
  'FIX 1: Stockpile sort by end_date desc'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE');
