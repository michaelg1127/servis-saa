const fs = require('fs');
const FILE = 'index.html';
let src = fs.readFileSync(FILE, 'utf8');

const FROM = "WL_BANGAU_CODES.includes(unitCode) ? 450 : 320";
const TO = "WL_BANGAU_CODES.includes(unitCode) ? 500 : 370";

const count = src.split(FROM).length - 1;
if (count !== 5) {
  console.error('EXPECTED 5 occurrences, found ' + count + ' — aborting');
  process.exit(1);
}
src = src.split(FROM).join(TO);

const remain = src.split(FROM).length - 1;
const applied = src.split(TO).length - 1;
if (remain !== 0 || applied !== 5) {
  console.error('POST-CHECK FAILED remain=' + remain + ' applied=' + applied);
  process.exit(1);
}

fs.writeFileSync(FILE, src);
console.log('OK: 5 tank-size sites updated (Bangau 450->500, STD 320->370)');
