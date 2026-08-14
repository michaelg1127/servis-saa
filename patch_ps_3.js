const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

function replaceExact(from, to, desc) {
  const count = content.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  content = content.replace(from, to);
  console.log('OK: ' + desc);
}

const R = '\r\n';

// PS3-1: Rename Ringkasan tab to Ringkasan Gaji
replaceExact(
  "onclick=\"switchProyekTab('ringkasan',this)\" style=\"padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;\">Ringkasan</button>",
  "onclick=\"switchProyekTab('ringkasan',this)\" style=\"padding:12px 18px;border:none;background:none;font-size:14px;font-weight:700;cursor:pointer;color:#94A3B8;border-bottom:3px solid transparent;margin-bottom:-2px;\">Ringkasan Gaji</button>",
  'PS3-1: rename Ringkasan tab to Ringkasan Gaji'
);

// PS3-2: Add end_date and nama_kapal to kapal detail row
replaceExact(
  "          opMap[key].rows.push(p.project_code + (isCarryover(p) ? ' [CO]' : '') + ' @' + rate + '/MT: ' + fmtRp(amt));",
  "          opMap[key].rows.push(p.project_code + ' ' + (p.end_date || '') + (p.nama_kapal ? ' ' + p.nama_kapal : '') + (isCarryover(p) ? ' [CO]' : '') + ' @' + rate + '/MT: ' + fmtRp(amt));",
  'PS3-2: add end_date + nama_kapal to kapal detail row'
);

// PS3-3: Add end_date to stockpile detail row
replaceExact(
  "          opMap[key].rows.push(p.project_code + ' STK ' + hm.toFixed(1) + 'HM: ' + fmtRp(amt));",
  "          opMap[key].rows.push(p.project_code + ' ' + (p.end_date || '') + ' STK ' + hm.toFixed(1) + 'HM: ' + fmtRp(amt));",
  'PS3-3: add end_date to stockpile detail row'
);

// PS3-4: Sort rows ascending by project_code before returning opMap
replaceExact(
  "    return opMap;",
  "    Object.values(opMap).forEach(function(s) { s.rows.sort(); });" + R +
  "    return opMap;",
  'PS3-4: sort detail rows ascending before return'
);

fs.writeFileSync(file, content, 'utf8');
console.log('\nAll PS-3 patches applied. Running syntax check...');
const { execSync } = require('child_process');
try {
  const s = content.indexOf('<script>') + '<script>'.length;
  const e = content.lastIndexOf('</script>');
  const tmp = path.join(__dirname, '_stx_tmp.js');
  fs.writeFileSync(tmp, content.slice(s, e), 'utf8');
  execSync('node --check "' + tmp + '"');
  fs.unlinkSync(tmp);
  console.log('Syntax OK');
} catch(err) { console.error('SYNTAX ERROR:', err.message); process.exit(1); }
console.log('\nDone.');
