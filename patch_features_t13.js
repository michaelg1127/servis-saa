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

// T13-1: openEditPengisian — replace plain text project input with
//         dropdown (loads all projects, pre-selects current) + free-text fallback
//         IIFE after modal show populates the dropdown async
replaceExact(
  "    + '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Project</label><input type=\"text\" id=\"ep-project\" class=\"finput\" value=\"' + projVal + '\" placeholder=\"Kode atau nama proyek\"></div>'" + R +
  "    + '<div style=\"margin-bottom:16px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Catatan</label><textarea id=\"ep-notes\" class=\"finput\" rows=\"2\">' + (r.notes || '') + '</textarea></div>'" + R +
  "    + '<div style=\"display:flex;gap:12px;\">'" + R +
  "    + '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>'" + R +
  "    + '<button onclick=\"submitEditPengisian(\\'' + id + '\\',\\'' + tfId + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>'" + R +
  "    + '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "}",

  "    + '<div style=\"margin-bottom:12px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Project <span style=\"font-size:11px;font-weight:400;color:#94A3B8;\">(pilih sistem atau ketik manual)</span></label><select id=\"ep-project-sel\" class=\"finput\"><option value=\"\">-- Pilih Project Sistem --</option></select><input type=\"text\" id=\"ep-project\" class=\"finput\" style=\"margin-top:6px;font-size:13px;\" value=\"' + (r.project || '') + '\" placeholder=\"Proyek lama / ketik manual\"></div>'" + R +
  "    + '<div style=\"margin-bottom:16px;\"><label style=\"font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;\">Catatan</label><textarea id=\"ep-notes\" class=\"finput\" rows=\"2\">' + (r.notes || '') + '</textarea></div>'" + R +
  "    + '<div style=\"display:flex;gap:12px;\">'" + R +
  "    + '<button onclick=\"closeModal()\" class=\"btn-secondary\" style=\"flex:1;\">Batal</button>'" + R +
  "    + '<button onclick=\"submitEditPengisian(\\'' + id + '\\',\\'' + tfId + '\\')\" class=\"btn-primary\" style=\"flex:2;\">Simpan</button>'" + R +
  "    + '</div></div>';" + R +
  "  document.getElementById('modal-box').innerHTML = modalHTML;" + R +
  "  document.getElementById('modal-overlay').style.display = 'flex';" + R +
  "  (async function() {" + R +
  "    const { data: projs } = await sb.from('projects').select('id, project_code, nama_kapal, type, end_date').order('created_at', { ascending: false }).limit(100);" + R +
  "    const sel = document.getElementById('ep-project-sel');" + R +
  "    if (!sel) return;" + R +
  "    (projs || []).forEach(function(p) {" + R +
  "      const opt = document.createElement('option');" + R +
  "      opt.value = p.id;" + R +
  "      opt.dataset.code = p.project_code;" + R +
  "      opt.textContent = p.project_code + (p.nama_kapal ? ' – ' + p.nama_kapal : '') + (p.type === 'stockpile' ? ' [STK]' : '') + (p.end_date ? ' ✓' : '');" + R +
  "      if (p.id === r.project_id) opt.selected = true;" + R +
  "      sel.appendChild(opt);" + R +
  "    });" + R +
  "  })();" + R +
  "}",

  'T13-1: openEditPengisian: project dropdown + free-text + IIFE load'
);

// T13-2: submitEditPengisian — read project from dropdown first (saves project_id FK),
//         fall back to free-text field; also write project_id to fuel_dispenses
replaceExact(
  "  const project = document.getElementById('ep-project')?.value.trim() || null;" + R +
  "  const notes = document.getElementById('ep-notes')?.value.trim() || null;" + R +
  "  if (!date || isNaN(hm) || isNaN(vol)) { showToast('Tanggal, HM, dan Volume wajib diisi'); return; }" + R +
  "  try {" + R +
  "    const { error: e1 } = await sb.from('fuel_dispenses').update({" + R +
  "      dispense_date: date, dispense_time: time, hm_at_fill: hm," + R +
  "      liters_dispensed: vol, gauge_pct: gaugePct, project: project, notes: notes" + R +
  "    }).eq('id', dispId);",

  "  const epSel = document.getElementById('ep-project-sel');" + R +
  "  const projectId = epSel && epSel.value ? epSel.value : null;" + R +
  "  const projOpt = epSel && epSel.selectedOptions[0];" + R +
  "  const project = (projOpt && projOpt.dataset.code ? projOpt.dataset.code : null) || document.getElementById('ep-project')?.value.trim() || null;" + R +
  "  const notes = document.getElementById('ep-notes')?.value.trim() || null;" + R +
  "  if (!date || isNaN(hm) || isNaN(vol)) { showToast('Tanggal, HM, dan Volume wajib diisi'); return; }" + R +
  "  try {" + R +
  "    const { error: e1 } = await sb.from('fuel_dispenses').update({" + R +
  "      dispense_date: date, dispense_time: time, hm_at_fill: hm," + R +
  "      liters_dispensed: vol, gauge_pct: gaugePct, project_id: projectId, project: project, notes: notes" + R +
  "    }).eq('id', dispId);",

  'T13-2: submitEditPengisian: read dropdown + free-text, write project_id to DB'
);

// Write + syntax check
fs.writeFileSync(file, content, 'utf8');
console.log('\nAll T13 patches applied. Running syntax check...');
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
