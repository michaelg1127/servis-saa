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

replaceExact(
  "  const batch16 = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) <= 15; });" + CRLF +
  "  const batch31Kapal = unpaid.filter(function(p) { return p.type === 'kapal' && dayOf(p.end_date) > 15; });" + CRLF +
  "  const batch31Stk = unpaid.filter(function(p) { return p.type === 'stockpile'; });" + CRLF +
  "  panel._batch16Ids = batch16.map(function(p) { return p.id; });" + CRLF +
  "  panel._batch31Ids = batch31Kapal.concat(batch31Stk).map(function(p) { return p.id; });",

  "  function isNSE(p) { return p.type === 'stockpile' && p.code_prefix === 'NSE'; }" + CRLF +
  "  const batch16 = unpaid.filter(function(p) { return (p.type === 'kapal' || isNSE(p)) && dayOf(p.end_date) <= 15; });" + CRLF +
  "  const batch31Kapal = unpaid.filter(function(p) { return (p.type === 'kapal' || isNSE(p)) && dayOf(p.end_date) > 15; });" + CRLF +
  "  const batch31Stk = unpaid.filter(function(p) { return p.type === 'stockpile' && !isNSE(p); });" + CRLF +
  "  panel._batch16Ids = batch16.map(function(p) { return p.id; });" + CRLF +
  "  panel._batch31Ids = batch31Kapal.concat(batch31Stk).map(function(p) { return p.id; });",

  'NSE batch logic'
);

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
