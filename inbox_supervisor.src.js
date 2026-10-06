// ============================================================
// INBOX WA SUPERVISOR — UI: verdict on each card, panel, Rapor, Audit
// Source of truth: inbox_supervisor.src.js (injected by patch_inbox2.js, after inbox_checks.src.js)
// ============================================================
var ibcState = { onlyFlagged: false, noColumn: false, lastCtx: null, counts: null };

async function ibcFetchAll(build) {
  var out = [], page = 1000;
  for (var from = 0; from < 20000; from += page) {
    var res = await build().range(from, from + page - 1);
    if (res.error) throw res.error;
    out = out.concat(res.data || []);
    if (!res.data || res.data.length < page) break;
  }
  return out;
}
function ibcDaysAgo(n) { return IBC.jktDate(Date.now() - n * 86400000); }

// Everything the supervisor needs about these units (default: last 120 days)
async function ibcLoadRaw(unitIds, days) {
  days = days || 120;
  var since = ibcDaysAgo(days);
  var units = (typeof ibUnits !== 'undefined' && ibUnits.length) ? ibUnits : ((await sb.from('units').select('id, code, name, model, current_hm')).data || []);
  var ids = unitIds && unitIds.length ? unitIds : units.map(function (u) { return u.id; });
  if (!ids.length) return { units: units };
  var r = await Promise.all([
    ibcFetchAll(function () { return sb.from('projects').select('id, project_code, type, nama_kapal, kade, start_date, end_date').gte('start_date', since).order('start_date'); }),
    ibcFetchAll(function () { return sb.from('project_units').select('id, project_id, unit_id, hm_awal, hm_akhir, projects!inner(id, project_code, type, nama_kapal, kade, start_date, end_date)').in('unit_id', ids).gte('projects.start_date', since).order('id'); }),
    ibcFetchAll(function () { return sb.from('fuel_dispenses').select('id, unit_id, hm_at_fill, dispense_date, dispense_time, liters_dispensed, l_per_hr, transfer_id, fuel_transfers(bunker_id, fuel_bunkers(bunker_code))').in('unit_id', ids).gte('dispense_date', since).order('id'); }),
    ibcFetchAll(function () { return sb.from('service_log').select('id, unit_id, maintenance_type, hm_at_service, service_date').in('unit_id', ids).order('id'); }),
    ibcFetchAll(function () { return sb.from('maintenance_schedules').select('unit_id, type_name, interval_hm, last_hm, last_date').in('unit_id', ids).order('unit_id'); }),
    ibcFetchAll(function () { return sb.from('hm_updates').select('id, unit_id, hm_value, recorded_at').in('unit_id', ids).gte('recorded_at', since).order('id'); }),
    ibcFetchAll(function () { return sb.from('service_requests').select('id, sr_number, unit_id, description, status, created_at').in('unit_id', ids).gte('created_at', since).order('id'); })
  ]);
  return { units: units, projects: r[0], project_units: r[1], fuel_dispenses: r[2], service_log: r[3], maintenance_schedules: r[4], hm_updates: r[5], service_requests: r[6] };
}

// Called by loadAdminInbox right after rows arrive
async function ibcRunPending(rows) {
  var pend = rows.filter(function (r) { return r.status === 'pending'; });
  ibcState.counts = null;
  if (!pend.length) { ibcRenderPanel(rows); return; }
  var codes = {}; pend.forEach(function (r) { var c = r.unit_code || (r.payload || {}).unit_code; if (c) codes[ibNorm(c)] = 1; });
  var ids = ibUnits.filter(function (u) { return codes[ibNorm(u.code)]; }).map(function (u) { return u.id; });
  var allPending = (await sb.from('wa_inbox').select('*').eq('status', 'pending').limit(1000)).data || pend;
  var raw = await ibcLoadRaw(ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  raw.drafts = allPending;
  var ctx = IBC.buildContext(raw);
  ibcState.lastCtx = ctx;
  var saves = [];
  pend.forEach(function (r) {
    var res = IBC.check(IBC.draftToItem(r, ctx), ctx, {});
    r._chk = res;
    var stored = { verdict: res.verdict, matched: res.matched, checks: res.checks };
    if (!ibcState.noColumn && JSON.stringify(r.check_result || null) !== JSON.stringify(stored)) saves.push({ id: r.id, v: stored });
  });
  for (var i = 0; i < saves.length && !ibcState.noColumn; i++) {
    var up = await sb.from('wa_inbox').update({ check_result: saves[i].v, checked_at: new Date().toISOString() }).eq('id', saves[i].id);
    if (up.error) { if (/check_result|checked_at|column/i.test(up.error.message)) ibcState.noColumn = true; break; }
  }
  ibcRenderPanel(rows);
}

function ibcResult(r) {
  if (r._chk) return r._chk;
  if (r.check_result && r.check_result.checks) return r.check_result;
  return null;
}

// Supervisor block inside each Inbox card
function ibcBlock(r) {
  var c = ibcResult(r);
  if (!c) return '';
  var head = c.verdict === 'fail' ? ['#FEE2E2', '#991B1B', '✕ Cek ini: tidak masuk akal']
    : c.verdict === 'warn' ? ['#FEF3C7', '#92400E', '⚠ Cek ini']
    : c.matched ? ['#DCFCE7', '#166534', '✓ Masuk akal · cocok dengan input admin']
    : ['#DCFCE7', '#166534', '✓ Masuk akal'];
  var icon = { fail: ['✕', '#DC2626'], warn: ['⚠', '#B45309'], match: ['=', '#15803D'], ok: ['✓', '#16A34A'], info: ['·', '#64748B'] };
  var lines = c.checks.filter(function (x) { return c.verdict === 'ok' ? x.level !== 'info' : x.level !== 'ok'; }).map(function (x) {
    var ic = icon[x.level] || icon.info;
    return '<div style="display:flex;gap:6px;font-size:12px;color:#334155;margin-top:3px;"><span style="color:' + ic[1] + ';font-weight:800;width:10px;flex:none;">' + ic[0] + '</span><span>' + ibEsc(x.msg) + '</span></div>';
  }).join('');
  var nOk = c.checks.filter(function (x) { return x.level === 'ok' || x.level === 'match'; }).length;
  return '<div style="margin-top:8px;border-radius:10px;background:' + head[0] + ';padding:8px 10px;">'
    + '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:800;color:' + head[1] + ';"><span>Supervisor: ' + head[2] + '</span>'
    + '<span style="font-weight:600;opacity:.8;">' + nOk + ' cek lolos</span></div>'
    + lines + '</div>';
}

function ibcRenderPanel(rows) {
  var el = document.getElementById('adm-inbox-supervisor');
  if (!el) return;
  var pend = (rows || inboxState.rows).filter(function (r) { return r.status === 'pending' && r._chk; });
  var nOk = pend.filter(function (r) { return r._chk.verdict === 'ok'; }).length;
  var nMatch = pend.filter(function (r) { return r._chk.verdict === 'ok' && r._chk.matched; }).length;
  var nWarn = pend.filter(function (r) { return r._chk.verdict === 'warn'; }).length;
  var nFail = pend.filter(function (r) { return r._chk.verdict === 'fail'; }).length;
  var chip = function (bg, fg, txt) { return '<span style="background:' + bg + ';color:' + fg + ';font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">' + txt + '</span>'; };
  var btn = 'padding:6px 12px;font-size:12px;width:auto;';
  el.innerHTML = '<div style="background:white;border-radius:14px;padding:12px 14px;box-shadow:0 1px 4px rgba(0,0,0,0.06);max-width:820px;">'
    + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
    + '<span style="font-size:13px;font-weight:800;color:#1E293B;margin-right:4px;">Supervisor</span>'
    + (pend.length ? chip('#DCFCE7', '#166534', nOk + ' masuk akal' + (nMatch ? ' (' + nMatch + ' cocok admin)' : '')) + chip('#FEF3C7', '#92400E', nWarn + ' perlu dicek') + chip('#FEE2E2', '#991B1B', nFail + ' tidak masuk akal')
                   : '<span style="font-size:12px;color:#94A3B8;">Tidak ada draft pending.</span>')
    + '<label style="margin-left:auto;font-size:12px;color:#334155;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="ibc-only" ' + (ibcState.onlyFlagged ? 'checked' : '') + ' onchange="ibcToggleOnly(this.checked)"> Hanya yang perlu dicek</label>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">'
    + (nMatch ? '<button class="btn-secondary" style="' + btn + '" onclick="ibcCloseMatched()">Tandai ' + nMatch + ' yang cocok admin sebagai sudah diinput</button>' : '')
    + '<button class="btn-secondary" style="' + btn + '" onclick="ibcShowScore(7)">Rapor dry run (7 hari)</button>'
    + '<button class="btn-secondary" style="' + btn + '" onclick="ibcShowAudit(14)">Audit data 14 hari</button>'
    + '</div>'
    + (ibcState.noColumn ? '<div style="font-size:12px;color:#B45309;margin-top:8px;">Kolom check_result belum ada. Jalankan wa_inbox_checks_migration.sql di Supabase supaya rapor bisa dihitung.</div>' : '')
    + '</div>';
}

function ibcToggleOnly(v) { ibcState.onlyFlagged = !!v; renderInboxList(); }

// Dry run: drafts that equal what the admin already typed are closed in one click
async function ibcCloseMatched() {
  var ids = inboxState.rows.filter(function (r) { return r.status === 'pending' && r._chk && r._chk.verdict === 'ok' && r._chk.matched; }).map(function (r) { return r.id; });
  if (!ids.length) return;
  var res = await sb.from('wa_inbox').update({ status: 'duplicate', reject_reason: 'Dry run: cocok dengan input admin', reviewed_by: currentProfile.id, reviewed_at: new Date().toISOString() }).in('id', ids);
  if (res.error) { showToast('Gagal: ' + res.error.message); return; }
  showToast(ids.length + ' draft ditandai sudah diinput.', 'success');
  loadAdminInbox();
}

function ibcRowLine(r) {
  var c = ibcResult(r) || { checks: [] };
  var why = c.checks.filter(function (x) { return x.level === 'fail' || x.level === 'warn'; }).map(function (x) { return x.msg; }).join(' · ');
  return '<div style="border-top:1px solid #F1F5F9;padding:6px 0;font-size:12px;color:#334155;">'
    + '<b>' + ibEsc(IB_KIND_LABEL[r.kind] || r.kind) + (r.unit_code ? ' · ' + ibEsc(r.unit_code) : '') + '</b> · ' + ibFmtTime(r.photo_taken_at || r.wa_sent_at)
    + '<div>' + ibSummary(r) + '</div>'
    + (why ? '<div style="color:#B45309;">Supervisor: ' + ibEsc(why) + '</div>' : '<div style="color:#64748B;">Supervisor: masuk akal</div>')
    + (r.reject_reason ? '<div style="color:#991B1B;">Admin: ' + ibEsc(r.reject_reason) + '</div>' : '')
    + '</div>';
}

async function ibcShowScore(days) {
  showModal('<div style="padding:24px;">Menghitung rapor...</div>');
  var since = new Date(Date.now() - days * 86400000).toISOString();
  var res = await sb.from('wa_inbox').select('*').neq('status', 'pending').gte('reviewed_at', since).order('reviewed_at', { ascending: false }).limit(2000);
  if (res.error) { closeModal(); showToast('Gagal: ' + res.error.message); return; }
  var rows = res.data || [];
  var s = IBC.score(rows);
  var noRes = rows.filter(function (r) { return !r.check_result; }).length;
  var parserRight = s.caught.length + s.missed.length; parserRight = s.total - parserRight;
  var pct = function (a, b) { return b ? Math.round(a * 100 / b) + '%' : '—'; };
  var flagged = s.caught.length + s.falseAlarm.length, wrong = s.caught.length + s.missed.length;
  var matched = rows.filter(function (r) { return r.check_result && r.check_result.matched; }).length;
  var tile = function (n, lbl, col) { return '<div style="background:#F8FAFC;border-radius:10px;padding:10px;"><div style="font-size:22px;font-weight:800;color:' + col + ';">' + n + '</div><div style="font-size:12px;color:#475569;">' + lbl + '</div></div>'; };
  var list = function (title, arr) { return arr.length ? '<div style="margin-top:14px;font-size:13px;font-weight:800;color:#1E293B;">' + title + ' (' + arr.length + ')</div>' + arr.slice(0, 40).map(ibcRowLine).join('') : ''; };
  showModal('<div style="padding:24px;max-width:640px;width:100%;box-sizing:border-box;max-height:85vh;overflow:auto;">'
    + '<div style="font-size:18px;font-weight:800;color:#1E293B;">Rapor dry run · ' + days + ' hari</div>'
    + '<div style="font-size:12px;color:#64748B;margin:4px 0 12px;">' + s.total + ' draft sudah direview' + (noRes ? ' · ' + noRes + ' tanpa catatan supervisor (sebelum fitur ini)' : '') + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;">'
    + tile(pct(parserRight, s.total), 'Parser benar', '#166534')
    + tile(pct(matched, s.total), 'Cocok dengan input admin', '#166534')
    + tile(pct(s.caught.length, wrong), 'Draft salah yang ditangkap', '#1D4ED8')
    + tile(pct(s.falseAlarm.length, flagged), 'Alarm palsu', '#B45309')
    + '</div>'
    + '<div style="font-size:12px;color:#475569;margin-top:10px;line-height:1.5;">Target sebelum go-live: <b>tidak ada draft salah yang lolos</b> selama 7 hari, alarm palsu di bawah ±20%, dan parser benar ≥ 95%.</div>'
    + list('Lolos padahal salah (perlu aturan baru)', s.missed)
    + list('Alarm palsu (aturan terlalu ketat)', s.falseAlarm)
    + list('Ditangkap dengan benar', s.caught)
    + '<div style="display:flex;justify-content:flex-end;margin-top:16px;"><button class="btn-secondary" style="width:auto;padding:8px 16px;" onclick="closeModal()">Tutup</button></div></div>');
}

async function ibcShowAudit(days) {
  showModal('<div style="padding:24px;">Mengaudit data ' + days + ' hari terakhir...</div>');
  try {
    if (typeof ibLoadUnits === 'function') await ibLoadUnits();
    var raw = await ibcLoadRaw(null, days + 120);
    var ctx = IBC.buildContext(raw);
    var found = IBC.audit(raw, ctx, ibcDaysAgo(days));
    var byUnit = {};
    found.forEach(function (f) { (byUnit[f.item.unit_code] = byUnit[f.item.unit_code] || []).push(f); });
    var codes = Object.keys(byUnit).sort();
    var body = codes.length ? codes.map(function (c) {
      return '<div style="margin-top:12px;font-size:14px;font-weight:800;color:#1D4ED8;">' + ibEsc(c) + ' <span style="color:#64748B;font-weight:600;font-size:12px;">' + byUnit[c].length + ' temuan</span></div>'
        + byUnit[c].map(function (f) {
          var bad = f.result.checks.filter(function (x) { return x.level === 'fail' || x.level === 'warn'; });
          var col = f.result.verdict === 'fail' ? '#DC2626' : '#B45309';
          return '<div style="border-left:3px solid ' + col + ';padding:4px 10px;margin-top:6px;font-size:12px;color:#334155;"><b>' + ibEsc(f.item.label) + '</b>'
            + bad.map(function (x) { return '<div>' + (x.level === 'fail' ? '✕ ' : '⚠ ') + ibEsc(x.msg) + '</div>'; }).join('') + '</div>';
        }).join('');
    }).join('') : '<div style="color:#16A34A;font-size:13px;margin-top:10px;">Tidak ada yang janggal.</div>';
    showModal('<div style="padding:24px;max-width:680px;width:100%;box-sizing:border-box;max-height:85vh;overflow:auto;">'
      + '<div style="font-size:18px;font-weight:800;color:#1E293B;">Audit supervisor · ' + days + ' hari terakhir</div>'
      + '<div style="font-size:12px;color:#64748B;margin-top:4px;">Data yang sudah ada di SERVIS SAA (servis, isi solar, HM proyek) dicek dengan aturan yang sama: HM mundur/loncat, siklus Racor 250 / set 500, dobel input. ' + found.length + ' temuan.</div>'
      + body
      + '<div style="display:flex;justify-content:flex-end;margin-top:16px;"><button class="btn-secondary" style="width:auto;padding:8px 16px;" onclick="closeModal()">Tutup</button></div></div>');
  } catch (e) { closeModal(); showToast('Audit gagal: ' + (e.message || e)); }
}
// Shown inside the "Dari Inbox WA" banner on the prefilled form
function ibcBannerLine(r) {
  var c = ibcResult(r);
  if (!c || c.verdict === 'ok') return '';
  var bad = c.checks.filter(function (x) { return x.level === 'fail' || x.level === 'warn'; }).map(function (x) { return ibEsc(x.msg); });
  return '<br><b style="color:' + (c.verdict === 'fail' ? '#DC2626' : '#B45309') + ';">Supervisor: ' + bad.join(' · ') + '</b>';
}
// ===================== END INBOX WA SUPERVISOR =====================
