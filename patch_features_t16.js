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

// T16-1: getNextBunkerCode — add tank param; hijau→X sequence (filtered by tank_name),
//         merah→M-N sequence, kuning→K-N sequence.
//         Previously queried all X% codes regardless of tank, so merah/kuning bunkers
//         incorrectly consumed X sequence numbers.
replaceExact(
  "async function getNextBunkerCode() {" + R +
  "  const { data } = await sb.from('fuel_bunkers').select('bunker_code').like('bunker_code', 'X%').order('created_at', { ascending: false }).limit(1);" + R +
  "  if (!data || data.length === 0) return 'X24';" + R +
  "  const last = data[0].bunker_code;" + R +
  "  const num = parseInt(last.replace('X',''), 10);" + R +
  "  return isNaN(num) ? 'X24' : 'X' + (num + 1);" + R +
  "}",

  "async function getNextBunkerCode(tank) {" + R +
  "  if (tank === 'merah') {" + R +
  "    const { data } = await sb.from('fuel_bunkers').select('bunker_code').eq('tank_name', 'merah').like('bunker_code', 'M-%').order('created_at', { ascending: false }).limit(1);" + R +
  "    if (!data || data.length === 0) return 'M-1';" + R +
  "    const last = data[0].bunker_code;" + R +
  "    const num = parseInt(last.replace('M-', ''), 10);" + R +
  "    return isNaN(num) ? 'M-1' : 'M-' + (num + 1);" + R +
  "  }" + R +
  "  if (tank === 'kuning') {" + R +
  "    const { data } = await sb.from('fuel_bunkers').select('bunker_code').eq('tank_name', 'kuning').like('bunker_code', 'K-%').order('created_at', { ascending: false }).limit(1);" + R +
  "    if (!data || data.length === 0) return 'K-1';" + R +
  "    const last = data[0].bunker_code;" + R +
  "    const num = parseInt(last.replace('K-', ''), 10);" + R +
  "    return isNaN(num) ? 'K-1' : 'K-' + (num + 1);" + R +
  "  }" + R +
  "  const { data } = await sb.from('fuel_bunkers').select('bunker_code').eq('tank_name', 'hijau').like('bunker_code', 'X%').order('created_at', { ascending: false }).limit(1);" + R +
  "  if (!data || data.length === 0) return 'X24';" + R +
  "  const last = data[0].bunker_code;" + R +
  "  const num = parseInt(last.replace('X', ''), 10);" + R +
  "  return isNaN(num) ? 'X24' : 'X' + (num + 1);" + R +
  "}",

  'T16-1: getNextBunkerCode: per-tank sequences (hijau=X, merah=M-N, kuning=K-N)'
);

// T16-2: onTerimaChange — pass tank to getNextBunkerCode; bail early when no tank selected.
replaceExact(
  "async function onTerimaChange() {" + R +
  "  const prev = document.getElementById('bbm-terima-preview');" + R +
  "  if (!prev) return;" + R +
  "  const tank = document.getElementById('bbm-terima-tank').value;" + R +
  "  const code = await getNextBunkerCode();" + R +
  "  let msg = 'Kode Bunker: <strong>' + code + '</strong>';" + R +
  "  if (tank) {" + R +
  "    const levels = await calcTankLevels();" + R +
  "    const cap = FUEL_TANKS.find(t => t.name === tank);" + R +
  "    const rem = cap ? cap.cap - (levels[tank] || 0) : 0;" + R +
  "    const label = cap ? cap.label : tank;" + R +
  "    msg += ' &nbsp;|&nbsp; Kapasitas sisa ' + label + ': <strong>' + Math.max(0,rem).toLocaleString('id') + ' L</strong>';" + R +
  "  }" + R +
  "  prev.innerHTML = msg;" + R +
  "}",

  "async function onTerimaChange() {" + R +
  "  const prev = document.getElementById('bbm-terima-preview');" + R +
  "  if (!prev) return;" + R +
  "  const tank = document.getElementById('bbm-terima-tank').value;" + R +
  "  if (!tank) { prev.innerHTML = 'Pilih tanki untuk melihat kode bunker.'; return; }" + R +
  "  const code = await getNextBunkerCode(tank);" + R +
  "  const levels = await calcTankLevels();" + R +
  "  const cap = FUEL_TANKS.find(t => t.name === tank);" + R +
  "  const rem = cap ? cap.cap - (levels[tank] || 0) : 0;" + R +
  "  const label = cap ? cap.label : tank;" + R +
  "  prev.innerHTML = 'Kode Bunker: <strong>' + code + '</strong> &nbsp;|&nbsp; Kapasitas sisa ' + label + ': <strong>' + Math.max(0,rem).toLocaleString('id') + ' L</strong>';" + R +
  "}",

  'T16-2: onTerimaChange: pass tank to getNextBunkerCode, early return when no tank'
);

// T16-3: submitFuelBunker — pass tank to getNextBunkerCode.
replaceExact(
  "    const code = await getNextBunkerCode();",
  "    const code = await getNextBunkerCode(tank);",
  'T16-3: submitFuelBunker: pass tank to getNextBunkerCode'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T16 patches applied. Running syntax check...');
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
