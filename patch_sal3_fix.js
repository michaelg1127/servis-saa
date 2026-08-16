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

// Fix broken sheet-name sanitizer regex.
// Current in file:  /[:\/?*[]]/g  — char class [:\/?*[] closed by first ], regex matches
//                   one char from the class FOLLOWED by literal ], i.e. broken.
// Target in file:   /[:\\/\?*\[\]]/g  — correctly strips : \ / ? * [ ]
//
// From: one backslash before /?*[]]/g  =>  JS string: "\\/?*[]]/g"
// To:   two backslashes + / + \?*\[\]]/g  =>  JS string: "\\\\/\\?*\\[\\]]/g"
//
// Build via char codes to keep it unambiguous:
const BS = String.fromCharCode(92); // backslash
const from_str = '    const safeName = code.replace(/[:' + BS + '/?*[]]/g, \'_\').slice(0, 31);';
const to_str   = '    const safeName = code.replace(/[:' + BS + BS + '/\\?*\\[\\]]/g, \'_\').slice(0, 31);';

console.log('from JSON:', JSON.stringify(from_str));
console.log('to   JSON:', JSON.stringify(to_str));

replaceExact(from_str, to_str, 'fix sheet-name sanitizer regex');

fs.writeFileSync(file, html, 'utf8');
console.log('\nDone. ' + changed + ' replacements made.');
