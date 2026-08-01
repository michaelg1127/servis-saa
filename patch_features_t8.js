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

// T8-1: PENGISIAN form — add free-text project input below the dropdown
replaceExact(
  '      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Project</label><select id="bbm-peng-project" class="finput"><option value="">-- Pilih Project (opsional) --</option></select></div>',

  '      <div style="margin-bottom:14px;"><label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Project <span style="font-size:11px;font-weight:400;color:#94A3B8;">(pilih dari sistem atau ketik manual)</span></label><select id="bbm-peng-project" class="finput"><option value="">-- Pilih Project Sistem (Agustus+) --</option></select><input type="text" id="bbm-peng-project-text" class="finput" style="margin-top:6px;font-size:13px;" placeholder="Proyek lama / Juli (ketik bebas, mis. M07-001)"></div>',

  'T8-1: PENGISIAN form: add free-text project field'
);

// T8-2: submitPengisian — use free-text field as fallback when no dropdown selected
replaceExact(
  "  const projSel = document.getElementById('bbm-peng-project');" + R +
  "  const projectId = projSel && projSel.value ? projSel.value : null;" + R +
  "  const projOpt = projSel && projSel.selectedOptions[0];" + R +
  "  const project = projOpt && projOpt.dataset.code ? projOpt.dataset.code : null;",

  "  const projSel = document.getElementById('bbm-peng-project');" + R +
  "  const projectId = projSel && projSel.value ? projSel.value : null;" + R +
  "  const projOpt = projSel && projSel.selectedOptions[0];" + R +
  "  const projTextEl = document.getElementById('bbm-peng-project-text');" + R +
  "  const project = (projOpt && projOpt.dataset.code ? projOpt.dataset.code : null) || (projTextEl ? projTextEl.value.trim() : null) || null;",

  'T8-2: submitPengisian: use free-text as fallback project label'
);

// T8-3: submitPengisian reset — also clear the free-text field on success
replaceExact(
  "    document.getElementById('bbm-peng-unit').value = '';" + R +
  "    document.getElementById('bbm-peng-project').value = '';" + R +
  "    document.getElementById('bbm-peng-hm').value = '';",

  "    document.getElementById('bbm-peng-unit').value = '';" + R +
  "    document.getElementById('bbm-peng-project').value = '';" + R +
  "    document.getElementById('bbm-peng-project-text').value = '';" + R +
  "    document.getElementById('bbm-peng-hm').value = '';",

  'T8-3: submitPengisian reset: clear free-text project field'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T8 patches applied. Running syntax check...');
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
