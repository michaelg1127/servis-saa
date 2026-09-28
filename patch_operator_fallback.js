// patch_operator_fallback.js — fix operator name display when profiles JOIN
//   returns a truthy object but .name is null/undefined. Prefer profiles.name,
//   fall back to denormalized units.operator_name.

const fs = require('fs');
const path = 'index.html';
let src = fs.readFileSync(path, 'utf8');

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

replaceExact(
  "      const opName = u.profiles ? u.profiles.name : (u.operator_name || '—');\r\n",
  "      const opName = (u.profiles && u.profiles.name) || u.operator_name || '—';\r\n",
  'SPV unit list opName fallback order'
);

fs.writeFileSync(path, src);
console.log('Done.');
