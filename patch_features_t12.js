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

// T12-1: saveUnit — sync operator_name when updating a unit
// When admin saves from KELOLA UNIT, write operator_name alongside assigned_operator_id
replaceExact(
  "      const { error } = await sb.from('units').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null }).eq('id', editId);",
  "      const opProfile = allOperatorProfiles.find(op => op.id === opId);" + R +
  "      const { error } = await sb.from('units').update({ code, name, model, current_hm: hm, assigned_operator_id: opId || null, operator_name: opProfile ? opProfile.name : null }).eq('id', editId);",
  'T12-1: saveUnit: sync operator_name when changing assigned_operator_id'
);

// T12-2: saveOperatorAssignment — sync operator_name when SPV reassigns operator
replaceExact(
  "    const { error } = await sb.from('units').update({ assigned_operator_id: opId || null }).eq('id', unitId);",
  "    const opProf = allOperatorProfiles.find(op => op.id === opId);" + R +
  "    const { error } = await sb.from('units').update({ assigned_operator_id: opId || null, operator_name: opProf ? opProf.name : null }).eq('id', unitId);",
  'T12-2: saveOperatorAssignment: sync operator_name when SPV reassigns operator'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T12 patches applied. Running syntax check...');
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
