// patch_inbox3.js — re-inject the Supervisor engine (inbox_checks.src.js) into index.html after tuning.
// Replaces the block from the engine header to its module.exports line. Safe to re-run.
const fs = require('fs');
const N = '\r\n';
let src = fs.readFileSync('index.html', 'utf8');
const startMark = '// INBOX WA SUPERVISOR — reverse-checks every WA draft before approval';
const endMark = "if (typeof module !== 'undefined' && module.exports) module.exports = IBC;";
const s0 = src.indexOf(startMark), e0 = src.indexOf(endMark);
if (s0 < 0 || e0 < 0 || src.indexOf(startMark, s0 + 1) >= 0) { console.error('anchor missing/ambiguous'); process.exit(1); }
const start = src.lastIndexOf('// ====', s0); // the ===== line above the header
const end = e0 + endMark.length;
const eng = fs.readFileSync('inbox_checks.src.js', 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '').replace(/\n/g, N);
src = src.slice(0, start) + eng + src.slice(end);
fs.writeFileSync('index.html', src);
console.log('OK: engine re-injected');
