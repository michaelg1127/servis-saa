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

// PATCH 1: add save-in-progress guard to submitEditWoodlogKapal
// Adds a module-level flag + check at top + finally to reset it
replaceExact(
  "async function submitEditWoodlogKapal(id) {",
  [
    "var _wlEditKapalSaving = false;",
    "async function submitEditWoodlogKapal(id) {",
    "  if (_wlEditKapalSaving) return;",
    "  _wlEditKapalSaving = true;"
  ].join(N),
  'PATCH 1: add double-submit guard flag to submitEditWoodlogKapal'
);

replaceExact(
  "  } catch(e) { showToast('Gagal simpan: ' + e.message); }\r\n}\r\n\r\nfunction openCloseWoodlogKapalModal",
  [
    "  } catch(e) { showToast('Gagal simpan: ' + e.message); }",
    "  finally { _wlEditKapalSaving = false; }",
    "}",
    "",
    "function openCloseWoodlogKapalModal"
  ].join(N),
  'PATCH 2: add finally block to reset guard in submitEditWoodlogKapal'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
