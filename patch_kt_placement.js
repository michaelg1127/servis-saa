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

// Move admin-screen-karyawan-tetap from outside view-admin to inside it.
// Currently it sits after the closing </div> of view-admin (line 903).
// Target: place it just before the two closing wrappers at lines 902-903.
replaceExact(
  [
    '  </div>',
    '  </div>',
    '</div>',
    '<div id="admin-screen-karyawan-tetap" class="dscreen">',
    '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">',
    '    <div style="font-size:22px;font-weight:800;color:#1E293B;">Karyawan Tetap</div>',
    '    <button onclick="openKaryawanModal()" class="btn-primary" style="padding:8px 18px;font-size:14px;">+ Tambah</button>',
    '  </div>',
    '  <div id="kt-list" style="overflow-x:auto;"></div>',
    '</div>'
  ].join(N),
  [
    '  </div>',
    '  <div id="admin-screen-karyawan-tetap" class="dscreen">',
    '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">',
    '    <div style="font-size:22px;font-weight:800;color:#1E293B;">Karyawan Tetap</div>',
    '    <button onclick="openKaryawanModal()" class="btn-primary" style="padding:8px 18px;font-size:14px;">+ Tambah</button>',
    '  </div>',
    '  <div id="kt-list" style="overflow-x:auto;"></div>',
    '  </div>',
    '  </div>',
    '</div>'
  ].join(N),
  'PATCH 1: move admin-screen-karyawan-tetap inside view-admin'
);

if (fails > 0) { console.error('ABORT: ' + fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src);
console.log('DONE: index.html written');
