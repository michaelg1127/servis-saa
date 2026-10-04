// ============================================================
// INBOX WA — review drafts extracted from WhatsApp (table wa_inbox)
// Source of truth: inbox_module.src.js (injected by patch_inbox1.js)
// ============================================================
window.pendingInboxId = null;
var inboxState = { status: 'pending', group: '', unit: '', rows: [] };
var ibUnits = [];
var ibKapalChildIds = [];
var IB_KIND_LABEL = {
  project_kapal: 'Proyek Kapal', project_unit_hm: 'HM Unit (Proyek)', fuel_dispense: 'Isi Solar',
  service_request: 'Keluhan / Request', service_log: 'Servis Selesai', hm_update: 'Update HM', nse_session: 'Sesi NSE'
};
var IB_SR_CATS = ['Mesin/Engine','Hidrolik','Transmisi','Listrik','Track/Undercarriage','Bodi/Struktur','Lainnya'];

function ibEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function ibPayload(r) { return Object.assign({}, r.payload || {}, r.payload_edited || {}); }
function ibFmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function ibFmtNum(n) {
  return (n === null || n === undefined || n === '') ? '—' : Number(n).toLocaleString('id-ID', { maximumFractionDigits: 1 });
}
function ibNorm(code) { return String(code || '').toUpperCase().replace(/[\s\-]/g, ''); }
function ibUnitId(code) {
  var n = ibNorm(code);
  var u = ibUnits.find(function(x) { return ibNorm(x.code) === n; });
  return u ? u.id : '';
}
function ibSet(id, val) {
  var el = document.getElementById(id);
  if (!el || val === undefined || val === null || val === '') return;
  el.value = val;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
function ibWait(testFn, timeoutMs) {
  return new Promise(function(resolve) {
    var t0 = Date.now();
    (function tick() {
      if (testFn()) return resolve(true);
      if (Date.now() - t0 > (timeoutMs || 4000)) return resolve(false);
      setTimeout(tick, 80);
    })();
  });
}
function ibRow(id) { return inboxState.rows.find(function(x) { return x.id === id; }); }

async function ibLoadUnits() {
  if (ibUnits.length) return;
  var res = await sb.from('units').select('id, code, name, current_hm').order('code');
  ibUnits = res.data || [];
}

// ---------- badge ----------
async function refreshInboxBadge() {
  try {
    var res = await sb.from('wa_inbox').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    var badge = document.getElementById('adm-inbox-badge');
    if (!badge || res.error) return;
    var n = res.count || 0;
    badge.textContent = n;
    badge.style.display = n > 0 ? 'inline-block' : 'none';
  } catch (e) { /* table may not exist yet */ }
}

// ---------- list ----------
async function loadAdminInbox() {
  var wrap = document.getElementById('adm-inbox-list');
  if (!wrap) return;
  wrap.innerHTML = '<div style="color:#94A3B8;font-size:13px;">Memuat...</div>';
  await ibLoadUnits();
  var q = sb.from('wa_inbox').select('*').order('wa_sent_at', { ascending: false }).limit(500);
  if (inboxState.status !== 'all') q = q.eq('status', inboxState.status);
  var res = await q;
  if (res.error) {
    wrap.innerHTML = '<div style="color:#DC2626;font-size:13px;">Gagal memuat Inbox: ' + ibEsc(res.error.message) + '</div>';
    return;
  }
  inboxState.rows = res.data || [];
  if (typeof ibcRunPending === 'function') { try { await ibcRunPending(inboxState.rows); } catch (e) { console.warn('Supervisor gagal:', e); } }
  renderInboxFilters();
  renderInboxList();
  refreshInboxBadge();
}

function setInboxStatus(st, el) {
  inboxState.status = st;
  document.querySelectorAll('#adm-inbox-status-pills .vpill').forEach(function(b) { b.classList.remove('on'); });
  if (el) el.classList.add('on');
  loadAdminInbox();
}
function setInboxGroup(g) { inboxState.group = g || ''; renderInboxList(); }
function setInboxUnit(u) { inboxState.unit = u || ''; renderInboxFilters(); renderInboxList(); }

function renderInboxFilters() {
  var groups = [], units = [];
  inboxState.rows.forEach(function(r) {
    if (r.source_group && groups.indexOf(r.source_group) < 0) groups.push(r.source_group);
    if (r.unit_code && units.indexOf(r.unit_code) < 0) units.push(r.unit_code);
  });
  groups.sort(); units.sort();
  var gSel = document.getElementById('adm-inbox-group');
  if (gSel) gSel.innerHTML = '<option value="">Semua grup</option>' + groups.map(function(g) {
    return '<option value="' + ibEsc(g) + '"' + (g === inboxState.group ? ' selected' : '') + '>' + ibEsc(g) + '</option>';
  }).join('');
  var uWrap = document.getElementById('adm-inbox-unit-pills');
  if (uWrap) uWrap.innerHTML = [''].concat(units).map(function(u) {
    return '<button class="vpill' + (u === inboxState.unit ? ' on' : '') + '" data-u="' + ibEsc(u) + '" onclick="setInboxUnit(this.dataset.u)">' + (u ? ibEsc(u) : 'Semua unit') + '</button>';
  }).join('');
}

function renderInboxList() {
  var wrap = document.getElementById('adm-inbox-list');
  if (!wrap) return;
  var rows = inboxState.rows.filter(function(r) {
    return (!inboxState.group || r.source_group === inboxState.group) && (!inboxState.unit || r.unit_code === inboxState.unit)
      && (typeof ibcState === 'undefined' || !ibcState.onlyFlagged || (r._chk && r._chk.verdict !== 'ok'));
  });
  if (!rows.length) {
    wrap.innerHTML = '<div style="background:white;border-radius:14px;padding:32px;text-align:center;color:#94A3B8;font-size:14px;">Tidak ada draft.</div>';
    return;
  }
  var ids = {};
  rows.forEach(function(r) { ids[r.id] = r; });
  var children = {}, tops = [];
  rows.forEach(function(r) {
    if (r.parent_id && ids[r.parent_id]) (children[r.parent_id] = children[r.parent_id] || []).push(r);
    else tops.push(r);
  });
  var byDay = {}, days = [];
  tops.forEach(function(r) {
    var key = new Date(r.photo_taken_at || r.wa_sent_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!byDay[key]) { byDay[key] = []; days.push(key); }
    byDay[key].push(r);
  });
  wrap.innerHTML = days.map(function(day) {
    return '<div style="font-size:13px;font-weight:800;color:#475569;margin:18px 0 8px;">' + ibEsc(day) + '</div>'
      + byDay[day].map(function(r) { return renderInboxCard(r, children[r.id] || [], null); }).join('');
  }).join('');
}

function ibSummary(r) {
  var p = ibPayload(r);
  var pct = function(v) { return (v === null || v === undefined || v === '') ? '—' : v + '%'; };
  switch (r.kind) {
    case 'project_kapal':
      return 'Kapal <b>' + ibEsc(p.nama_kapal || '?') + '</b> · ' + ibEsc(p.kade || 'kade ?') + (p.pemberi_kerja ? ' · ' + ibEsc(p.pemberi_kerja) : '') + (p.start_date ? ' · mulai ' + ibEsc(p.start_date) : '');
    case 'project_unit_hm':
      return 'HM <b>' + ibFmtNum(p.hm_awal) + ' → ' + ibFmtNum(p.hm_akhir) + '</b> · Solar ' + pct(p.solar_awal_pct) + ' → ' + pct(p.solar_akhir_pct) + (p.kade ? ' · ' + ibEsc(p.kade) : '');
    case 'fuel_dispense':
      return 'HM <b>' + ibFmtNum(p.hm_at_fill) + '</b> · ' + ibEsc(p.drum_name || 'drum ?') + ' · ' + ibFmtNum(p.liters) + ' L' + (p.gauge_pct != null ? ' · gauge ' + pct(p.gauge_pct) : '');
    case 'service_request':
      var col = p.urgency === 'darurat' ? '#DC2626' : (p.urgency === 'urgent' ? '#D97706' : '#475569');
      return ibEsc(p.description || '') + ' · <span style="text-transform:uppercase;font-weight:700;color:' + col + ';">' + ibEsc(p.urgency || 'normal') + '</span>';
    case 'service_log':
      return ibEsc(p.maintenance_type || '') + ' · HM <b>' + ibFmtNum(p.hm_at_service) + '</b>' + (p.parts_used ? ' · ' + ibEsc(p.parts_used) : '');
    case 'hm_update':
      return 'HM <b>' + ibFmtNum(p.hm_value) + '</b>';
    case 'nse_session':
      return 'Sesi ' + ibEsc(p.session_num || '?') + ' · ' + ibEsc(p.start_time || '?') + '–' + ibEsc(p.end_time || '?') + ' · HM ' + ibFmtNum(p.hm_awal) + ' → ' + ibFmtNum(p.hm_akhir);
  }
  return '';
}

function renderInboxCard(r, kids, parent) {
  var conf = ({ high: ['#DCFCE7', '#166534', 'Yakin'], medium: ['#FEF3C7', '#92400E', 'Cek'], low: ['#FEE2E2', '#991B1B', 'Ragu'] })[r.confidence] || ['#F1F5F9', '#475569', r.confidence];
  var stCol = ({ pending: '#1D4ED8', approved: '#16A34A', rejected: '#DC2626', duplicate: '#64748B' })[r.status] || '#475569';
  var issues = (r.issues || []).map(function(i) { return '<div style="font-size:12px;color:#B45309;margin-top:2px;">⚠ ' + ibEsc(i) + '</div>'; }).join('');
  var pending = r.status === 'pending';
  var waitParent = parent && parent.status === 'pending';
  var btn = 'padding:6px 14px;font-size:13px;width:auto;';
  var actions = pending
    ? '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center;">'
      + (waitParent ? '<span style="font-size:12px;color:#64748B;">Approve Proyek Kapal di atas dulu</span>'
                    : '<button class="btn-primary" style="' + btn + '" onclick="approveInbox(\'' + r.id + '\')">Approve</button>')
      + '<button class="btn-secondary" style="' + btn + '" onclick="rejectInbox(\'' + r.id + '\')">Tolak</button>'
      + '<button class="btn-secondary" style="' + btn + '" onclick="markInboxDuplicate(\'' + r.id + '\')">Duplikat</button>'
      + '</div>'
    : '<div style="font-size:12px;color:' + stCol + ';margin-top:8px;font-weight:700;">' + ibEsc(r.status.toUpperCase())
      + (r.target_table ? ' → ' + ibEsc(r.target_table) : '') + (r.reject_reason ? ' · ' + ibEsc(r.reject_reason) : '') + '</div>';
  var kidsHtml = (kids || []).map(function(k) { return renderInboxCard(k, [], r); }).join('');
  return '<div style="background:white;border-radius:14px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border-left:4px solid ' + stCol + ';' + (parent ? 'margin-left:20px;' : '') + '">'
    + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;">'
    + '<div style="font-size:14px;font-weight:800;color:#1E293B;">' + ibEsc(IB_KIND_LABEL[r.kind] || r.kind)
    + (r.unit_code ? ' · <span style="color:#1D4ED8;">' + ibEsc(r.unit_code) + '</span>' : '') + '</div>'
    + '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:' + conf[0] + ';color:' + conf[1] + ';">' + ibEsc(conf[2]) + '</span>'
    + '</div>'
    + '<div style="font-size:13px;color:#334155;margin-top:6px;">' + ibSummary(r) + '</div>'
    + issues
    + (typeof ibcBlock === 'function' ? ibcBlock(r) : '')
    + '<div style="font-size:12px;color:#64748B;margin-top:6px;">' + ibEsc(r.source_group) + ' · ' + ibEsc(r.wa_sender || '?') + ' · ' + ibFmtTime(r.photo_taken_at || r.wa_sent_at) + '</div>'
    + (r.wa_text ? '<div style="font-size:12px;color:#475569;background:#F8FAFC;border-radius:8px;padding:6px 10px;margin-top:6px;white-space:pre-wrap;">“' + ibEsc(r.wa_text) + '”</div>' : '')
    + actions + '</div>' + kidsHtml;
}

// ---------- approve plumbing ----------
function ibBanner(r) {
  var iss = (r.issues || []);
  return '<div class="ib-banner" data-ib-id="' + r.id + '" style="background:#EFF6FF;border:1px solid #BFDBFE;color:#1E3A8A;border-radius:10px;padding:8px 12px;font-size:12px;margin-bottom:12px;">'
    + '<b>Dari Inbox WA</b> · ' + ibEsc(r.source_group) + ' · ' + ibEsc(r.wa_sender || '') + ' · ' + ibFmtTime(r.photo_taken_at || r.wa_sent_at)
    + (r.wa_text ? '<br>“' + ibEsc(r.wa_text) + '”' : '')
    + (iss.length ? '<br><b style="color:#B45309;">⚠ ' + iss.map(ibEsc).join(' · ') + '</b>' : '')
    + (typeof ibcBannerLine === 'function' ? ibcBannerLine(r) : '')
    + ' <a href="#" onclick="ibCancel();return false;" style="margin-left:6px;color:#DC2626;font-weight:700;">batal</a></div>';
}
function ibClearBanners() { document.querySelectorAll('.ib-banner').forEach(function(b) { b.remove(); }); }
function ibCancel() { window.pendingInboxId = null; ibKapalChildIds = []; ibClearBanners(); }

// Called by existing submit functions after a successful save. No-op for manual entry.
async function onInboxSaved(table, newId) {
  var id = window.pendingInboxId;
  if (!id) return;
  if (!document.querySelector('.ib-banner[data-ib-id="' + id + '"]')) { window.pendingInboxId = null; return; }
  window.pendingInboxId = null;
  ibClearBanners();
  var meta = { reviewed_by: (typeof currentProfile !== 'undefined' && currentProfile) ? currentProfile.id : null, reviewed_at: new Date().toISOString() };
  var res = await sb.from('wa_inbox').update(Object.assign({ status: 'approved', target_table: table, target_id: newId || null }, meta)).eq('id', id);
  if (res.error) { showToast('Data tersimpan, tapi status Inbox gagal diupdate: ' + res.error.message); return; }
  if (table === 'projects' && newId) {
    if (ibKapalChildIds.length) {
      await sb.from('wa_inbox').update(Object.assign({ status: 'approved', target_table: 'project_units', target_id: newId }, meta)).in('id', ibKapalChildIds);
    }
    var rest = inboxState.rows.filter(function(x) { return x.parent_id === id && x.status === 'pending' && ibKapalChildIds.indexOf(x.id) < 0; });
    for (var i = 0; i < rest.length; i++) {
      await sb.from('wa_inbox').update({ payload_edited: Object.assign({}, rest[i].payload_edited || {}, { project_id: newId }) }).eq('id', rest[i].id);
    }
  }
  ibKapalChildIds = [];
  refreshInboxBadge();
  var scr = document.getElementById('admin-screen-inbox');
  if (scr && scr.classList.contains('on')) loadAdminInbox();
}

async function approveInbox(id) {
  var r = ibRow(id);
  if (!r) return;
  await ibLoadUnits();
  var p = ibPayload(r);
  ibCancel();
  window.pendingInboxId = r.id;
  try {
    if (r.kind === 'project_kapal') return await ibApproveKapal(r, p);
    if (r.kind === 'project_unit_hm') return await ibApproveUnitHM(r, p);
    if (r.kind === 'fuel_dispense') return await ibApproveFuel(r, p);
    if (r.kind === 'service_log') return await ibApproveServiceLog(r, p);
    if (r.kind === 'service_request') return ibApproveSR(r, p);
    if (r.kind === 'hm_update') return ibApproveHM(r, p);
    return ibApproveManual(r, p);
  } catch (e) {
    window.pendingInboxId = null;
    showToast('Gagal membuka form: ' + e.message);
  }
}

// project_kapal → Tambah Proyek Kapal modal
async function ibApproveKapal(r, p) {
  if (!allUnits.length) await loadAdminUnits();
  await openAddKapalModal();
  var box = document.getElementById('modal-box');
  box.firstElementChild.insertAdjacentHTML('afterbegin', ibBanner(r));
  ibSet('kapal-add-namakapal', p.nama_kapal);
  ibSet('kapal-add-pemberi', p.pemberi_kerja);
  ibSet('kapal-add-kade', p.kade);
  ibSet('kapal-add-cargo', p.cargo_type);
  ibSet('kapal-add-start', p.start_date);
  ibSet('kapal-add-notes', p.notes);
  var kids = inboxState.rows.filter(function(x) {
    var kp = ibPayload(x);
    return x.parent_id === r.id && x.status === 'pending' && x.kind === 'project_unit_hm' && kp.hm_awal != null && kp.hm_awal !== '';
  });
  ibKapalChildIds = kids.map(function(k) { return k.id; });
  if (kids.length) {
    document.getElementById('kapal-unit-rows').innerHTML = '';
    kids.forEach(function(k) {
      var kp = ibPayload(k);
      addKapalUnitRow();
      var rid = _kapalUnitRowId;
      ibSet('ku-unit-' + rid, ibUnitId(k.unit_code || kp.unit_code));
      ibSet('ku-hmawal-' + rid, kp.hm_awal);
      ibSet('ku-sawal-' + rid, kp.solar_awal_pct);
      var el = document.getElementById('ku-hmawal-' + rid);
      if (el && el.value) onKapalHMAwalChange(el, rid);
    });
  }
}

// project_unit_hm → Edit Proyek Kapal modal (fills HM akhir of the unit row, or adds a new unit row)
async function ibApproveUnitHM(r, p) {
  var projectId = p.project_id;
  if (!projectId && r.parent_id) {
    var par = await sb.from('wa_inbox').select('status, target_id').eq('id', r.parent_id).single();
    if (par.data && par.data.status === 'approved') projectId = par.data.target_id;
  }
  if (!projectId) { window.pendingInboxId = null; showToast('Proyek kapal untuk draft ini belum ada. Approve/buat proyeknya dulu.'); return; }
  if (!allUnits.length) await loadAdminUnits();
  if (!proyekKapalData.some(function(x) { return x.id === projectId; })) {
    var pr = await sb.from('projects').select('*, project_units(*, units(code,name))').eq('id', projectId).single();
    if (pr.error || !pr.data) { window.pendingInboxId = null; showToast('Proyek tidak ditemukan.'); return; }
    proyekKapalData.push(pr.data);
  }
  await openEditKapalModal(projectId);
  var box = document.getElementById('modal-box');
  if (!box || !box.firstElementChild) return;
  box.firstElementChild.insertAdjacentHTML('afterbegin', ibBanner(r));
  var code = ibNorm(r.unit_code || p.unit_code);
  var match = Array.prototype.slice.call(box.querySelectorAll('[id^="kapal-eu-row-"]')).find(function(el) {
    var words = el.textContent.toUpperCase().split(/[^A-Z0-9]+/);
    return words.indexOf(code) >= 0;
  });
  if (match) {
    var i = match.id.replace('kapal-eu-row-', '');
    if (p.hm_akhir != null) { ibSet('kapal-eu-hmakhir-' + i, p.hm_akhir); ibSet('kapal-eu-sakhir-' + i, p.solar_akhir_pct); }
    var aw = document.getElementById('kapal-eu-hmawal-' + i);
    if (p.hm_awal != null && aw && !aw.value) ibSet('kapal-eu-hmawal-' + i, p.hm_awal);
    match.style.outline = '2px solid #3B82F6';
    match.scrollIntoView({ block: 'center' });
  } else if (p.hm_awal != null) {
    await addNewKapalUnitRow();
    var idx = (parseInt((document.getElementById('kapal-en-count') || {}).value) || 1) - 1;
    ibSet('kapal-en-unit-' + idx, ibUnitId(r.unit_code || p.unit_code));
    ibSet('kapal-en-hmawal-' + idx, p.hm_awal);
    ibSet('kapal-en-sawal-' + idx, p.solar_awal_pct);
  } else {
    showToast('Unit ' + (r.unit_code || '') + ' belum ada di proyek ini dan HM awal tidak diketahui — isi manual.');
  }
}

// fuel_dispense → BBM > PENGISIAN form
async function ibApproveFuel(r, p) {
  switchAdmin('bbm', document.querySelector('.slink[onclick*="switchAdmin(\'bbm\'"]'));
  switchBBMTab('pengisian', document.getElementById('bbm-tab-pengisian'));
  await ibWait(function() { var s = document.getElementById('bbm-peng-unit'); return s && s.options.length > 1; });
  var panel = document.getElementById('bbm-panel-pengisian');
  if (panel) panel.insertAdjacentHTML('afterbegin', ibBanner(r));
  ibSet('bbm-peng-unit', ibUnitId(r.unit_code || p.unit_code));
  ibSet('bbm-peng-hm', p.hm_at_fill);
  ibSet('bbm-peng-date', p.dispense_date);
  ibSet('bbm-peng-time', p.dispense_time);
  ibSet('bbm-peng-drum', p.drum_name);
  ibSet('bbm-peng-vol', p.liters);
  ibSet('bbm-peng-gauge', p.gauge_pct);
  ibSet('bbm-peng-notes', 'WA ' + (r.wa_sender || '') + ': ' + (r.wa_text || ''));
  var vol = document.getElementById('bbm-peng-vol');
  if (vol) vol.style.background = '#FEF3C7';
  showToast('Form terisi dari Inbox. Pilih Tanki Sumber/Bunker, cek volume, lalu Simpan.', 'success');
}

// service_log → Catat Servis
async function ibApproveServiceLog(r, p) {
  switchAdmin('catat', document.querySelector('.slink[onclick*="switchAdmin(\'catat\'"]'));
  await ibWait(function() { var s = document.getElementById('adm-catat-unit'); return s && s.options.length > 1; });
  var scr = document.getElementById('admin-screen-catat');
  if (scr) scr.insertAdjacentHTML('afterbegin', ibBanner(r));
  ibSet('adm-catat-unit', ibUnitId(r.unit_code || p.unit_code));
  await new Promise(function(res) { setTimeout(res, 700); });
  var typeSel = document.getElementById('adm-catat-type');
  if (typeSel && p.maintenance_type) {
    var has = Array.prototype.some.call(typeSel.options, function(o) { return o.value === p.maintenance_type; });
    if (!has) typeSel.insertAdjacentHTML('beforeend', '<option value="' + ibEsc(p.maintenance_type) + '">' + ibEsc(p.maintenance_type) + '</option>');
    typeSel.value = p.maintenance_type;
  }
  ibSet('adm-catat-hm', p.hm_at_service != null ? Math.round(p.hm_at_service) : null);
  ibSet('adm-catat-date', p.service_date);
  ibSet('adm-catat-mekanik', p.mkn_name);
  ibSet('adm-catat-parts', p.parts_used);
  ibSet('adm-catat-notes', p.notes || ('WA ' + (r.wa_sender || '') + ': ' + (r.wa_text || '')));
}

// service_request → small inbox modal, inserted as pending_spv (normal SPV flow)
function ibApproveSR(r, p) {
  var uid = ibUnitId(r.unit_code || p.unit_code);
  var unitOpts = ibUnits.map(function(u) { return '<option value="' + u.id + '"' + (u.id === uid ? ' selected' : '') + '>' + ibEsc(u.code) + ' — ' + ibEsc(u.name || '') + '</option>'; }).join('');
  var catOpts = IB_SR_CATS.map(function(c) { return '<option value="' + c + '"' + (c === p.category ? ' selected' : '') + '>' + c + '</option>'; }).join('');
  var urg = ['normal', 'urgent', 'darurat'].map(function(u) { return '<option value="' + u + '"' + (u === (p.urgency || 'normal') ? ' selected' : '') + '>' + u + '</option>'; }).join('');
  var L = 'font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;';
  showModal('<div style="padding:24px;max-width:520px;width:100%;box-sizing:border-box;">' + ibBanner(r)
    + '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:14px;">Buat Service Request</div>'
    + '<div style="margin-bottom:10px;"><label style="' + L + '">Unit *</label><select id="ib-sr-unit" class="finput"><option value="">Pilih</option>' + unitOpts + '</select></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;"><div><label style="' + L + '">Kategori *</label><select id="ib-sr-cat" class="finput">' + catOpts + '</select></div>'
    + '<div><label style="' + L + '">Urgensi</label><select id="ib-sr-urg" class="finput">' + urg + '</select></div></div>'
    + '<div style="margin-bottom:10px;"><label style="' + L + '">Deskripsi *</label><textarea id="ib-sr-desc" class="finput" rows="3">' + ibEsc(p.description || '') + '</textarea></div>'
    + '<div style="margin-bottom:10px;"><label style="' + L + '">Nama Barang</label><input id="ib-sr-barang" class="finput" value="' + ibEsc(p.nama_barang || '') + '"></div>'
    + '<div style="display:flex;gap:12px;margin-top:14px;"><button onclick="ibCancel();closeModal()" class="btn-secondary" style="flex:1;">Batal</button>'
    + '<button onclick="ibSubmitSR()" class="btn-primary" style="flex:2;">Kirim ke SPV</button></div></div>');
}
async function ibSubmitSR() {
  var unitId = document.getElementById('ib-sr-unit').value;
  var desc = document.getElementById('ib-sr-desc').value.trim();
  if (!unitId || !desc) { showToast('Unit dan deskripsi wajib diisi.'); return; }
  try {
    var ins = await sb.from('service_requests').insert({
      sr_number: generateSRNumber(), unit_id: unitId, category: document.getElementById('ib-sr-cat').value,
      description: desc, nama_barang: document.getElementById('ib-sr-barang').value.trim() || null,
      urgency: document.getElementById('ib-sr-urg').value, submitted_by: currentProfile.id,
      status: 'pending_spv', created_at: new Date().toISOString()
    }).select('id').single();
    if (ins.error) throw ins.error;
    showToast('Service request dibuat!', 'success');
    await onInboxSaved('service_requests', ins.data.id);
    closeModal();
  } catch (e) { showToast('Gagal: ' + e.message); }
}

// hm_update → confirm modal (same rules as SPV HM update: must increase, max +100)
function ibApproveHM(r, p) {
  var u = ibUnits.find(function(x) { return x.id === ibUnitId(r.unit_code || p.unit_code); });
  showModal('<div style="padding:24px;max-width:420px;width:100%;box-sizing:border-box;">' + ibBanner(r)
    + '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:10px;">Update HM ' + ibEsc(r.unit_code || '') + '</div>'
    + '<div style="font-size:13px;color:#475569;margin-bottom:10px;">HM sekarang di sistem: <b>' + (u ? ibFmtNum(u.current_hm) : '—') + '</b></div>'
    + '<input id="ib-hm-val" type="number" step="0.1" class="finput" value="' + ibEsc(p.hm_value) + '">'
    + '<div style="display:flex;gap:12px;margin-top:14px;"><button onclick="ibCancel();closeModal()" class="btn-secondary" style="flex:1;">Batal</button>'
    + '<button onclick="ibSubmitHM(\'' + (u ? u.id : '') + '\')" class="btn-primary" style="flex:2;">Simpan HM</button></div></div>');
}
async function ibSubmitHM(unitId) {
  var val = parseFloat(document.getElementById('ib-hm-val').value);
  var u = ibUnits.find(function(x) { return x.id === unitId; });
  if (!u) { showToast('Unit tidak dikenali.'); return; }
  if (isNaN(val) || val <= (u.current_hm || 0)) { showToast('HM harus lebih besar dari HM sekarang (' + ibFmtNum(u.current_hm) + ').'); return; }
  if ((u.current_hm || 0) > 0 && val - u.current_hm > 100) { showToast('Selisih HM > 100 sejak update terakhir. Periksa kembali.'); return; }
  try {
    var ins = await sb.from('hm_updates').insert({ unit_id: unitId, hm_value: val, recorded_by: currentProfile.id, recorded_at: new Date().toISOString() }).select('id').single();
    if (ins.error) throw ins.error;
    await sb.from('units').update({ current_hm: val }).eq('id', unitId).lt('current_hm', val);
    u.current_hm = val;
    showToast('HM ' + u.code + ' diupdate ke ' + ibFmtNum(val), 'success');
    await onInboxSaved('hm_updates', ins.data.id);
    closeModal();
  } catch (e) { showToast('Gagal: ' + e.message); }
}

// nse_session and anything else → show values, admin inputs in its module, then marks done
function ibApproveManual(r, p) {
  showModal('<div style="padding:24px;max-width:460px;width:100%;box-sizing:border-box;">' + ibBanner(r)
    + '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:10px;">' + ibEsc(IB_KIND_LABEL[r.kind] || r.kind) + '</div>'
    + '<div style="font-size:13px;color:#334155;margin-bottom:10px;">' + ibSummary(r) + '</div>'
    + '<div style="font-size:12px;color:#64748B;">Input data ini di modulnya (mis. Proyek → NSE), lalu klik "Sudah diinput".</div>'
    + '<div style="display:flex;gap:12px;margin-top:14px;"><button onclick="ibCancel();closeModal()" class="btn-secondary" style="flex:1;">Batal</button>'
    + '<button onclick="ibMarkManual()" class="btn-primary" style="flex:2;">Sudah diinput</button></div></div>');
}
async function ibMarkManual() { await onInboxSaved('manual', null); closeModal(); }

// ---------- reject / duplicate ----------
function rejectInbox(id) {
  showModal('<div style="padding:24px;max-width:420px;width:100%;box-sizing:border-box;">'
    + '<div style="font-size:18px;font-weight:800;color:#1E293B;margin-bottom:10px;">Tolak draft</div>'
    + '<textarea id="ib-reject-reason" class="finput" rows="3" placeholder="Alasan (wajib)"></textarea>'
    + '<div style="display:flex;gap:12px;margin-top:14px;"><button onclick="closeModal()" class="btn-secondary" style="flex:1;">Batal</button>'
    + '<button onclick="ibSubmitReject(\'' + id + '\')" class="btn-primary" style="flex:2;background:#DC2626;">Tolak</button></div></div>');
}
async function ibSubmitReject(id) {
  var reason = document.getElementById('ib-reject-reason').value.trim();
  if (!reason) { showToast('Alasan wajib diisi.'); return; }
  var res = await sb.from('wa_inbox').update({ status: 'rejected', reject_reason: reason, reviewed_by: currentProfile.id, reviewed_at: new Date().toISOString() }).eq('id', id);
  if (res.error) { showToast('Gagal: ' + res.error.message); return; }
  closeModal(); showToast('Draft ditolak.', 'success'); loadAdminInbox();
}
async function markInboxDuplicate(id) {
  var res = await sb.from('wa_inbox').update({ status: 'duplicate', reviewed_by: currentProfile.id, reviewed_at: new Date().toISOString() }).eq('id', id);
  if (res.error) { showToast('Gagal: ' + res.error.message); return; }
  showToast('Ditandai duplikat.', 'success'); loadAdminInbox();
}
// ===================== END INBOX WA =====================
