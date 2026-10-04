// ============================================================
// INBOX WA SUPERVISOR — reverse-checks every WA draft before approval
// Source of truth: inbox_checks.src.js (injected by patch_inbox2.js)
// Pure engine (IBC.*) runs in the browser and in Node (test_cases/inbox_checks.test.js)
// ============================================================
var IBC = (function () {
  // Service cycle (Michael, 4 Okt 2026): Racor 250 HM; Oli Mesin + Filter Oli Mesin + Filter Solar 500 HM,
  // done together with the 2nd Racor change.
  var CYCLE = { 'Racor': 250, 'Oli Mesin': 500, 'Filter Oli Mesin': 500, 'Filter Solar': 500 };
  var SET500 = ['Racor', 'Oli Mesin', 'Filter Oli Mesin', 'Filter Solar'];
  var SR_CLOSED = ['done', 'done_confirm', 'rejected'];
  var HOUR = 3600000;

  function num(v) { return (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v); }
  function fmt(n) { return n == null ? '—' : (Math.round(Number(n) * 10) / 10).toLocaleString('id-ID'); }
  function normCode(c) { return String(c || '').toUpperCase().replace(/[\s\-]/g, ''); }

  // ---- time (Asia/Jakarta, UTC+7, no DST) ----
  function jktDate(ts) {
    var d = new Date(new Date(ts).getTime() + 7 * HOUR);
    return d.toISOString().slice(0, 10);
  }
  function at(dateStr, timeStr) { return new Date(dateStr + 'T' + (timeStr ? String(timeStr).slice(0, 5) : '00:00') + ':00+07:00').getTime(); }
  function dayRange(dateStr) { var s = at(dateStr); return [s, s + 24 * HOUR - 1000]; }
  function span(dateStr, timeStr) {
    if (!dateStr) return null;
    if (timeStr) { var t = at(dateStr, timeStr); return [t, t]; }
    return dayRange(dateStr);
  }
  function fmtDay(dateStr) {
    if (!dateStr) return '?';
    var p = String(dateStr).slice(0, 10).split('-');
    return Number(p[2]) + '/' + Number(p[1]);
  }

  // ---- maintenance type names ----
  function normType(s) {
    var t = String(s || '').toLowerCase();
    if (/racor/.test(t)) return 'Racor';
    if (/filter\s*(solar|bahan bakar|bbm)|fuel\s*filter/.test(t)) return 'Filter Solar';
    if (/filter\s*oli|oil\s*filter/.test(t)) return 'Filter Oli Mesin';
    if (/oli\s*mesin|engine\s*oil/.test(t)) return 'Oli Mesin';
    return String(s || '').trim();
  }
  function typesIn(text) {
    var t = String(text || '').toLowerCase(), out = [];
    if (/racor/.test(t)) out.push('Racor');
    if (/filter\s*(solar|bahan bakar|bbm)|fuel\s*filter/.test(t)) out.push('Filter Solar');
    if (/filter\s*oli|oil\s*filter/.test(t)) out.push('Filter Oli Mesin');
    if (/oli\s*mesin|engine\s*oil|ganti\s*oli(?!\s*(hidrolik|hydraulic|swing|final|gardan|transmisi))/.test(t)) out.push('Oli Mesin');
    return out;
  }

  // ---- ship names ----
  function shipKey(s) {
    var t = String(s || '').toUpperCase().replace(/\b(TK|TB|BG|MV|KM|MT|LCT|SPOB)\b\.?/g, ' ').replace(/[^A-Z0-9]/g, '');
    return { full: t, letters: t.replace(/[0-9]/g, ''), digits: t.replace(/[^0-9]/g, '') };
  }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 0; j <= n; j++) { d[0][j] = j; }
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  // ============ context ============
  // raw = { units, projects, project_units, fuel_dispenses, service_log, maintenance_schedules, hm_updates, service_requests, drafts }
  function buildContext(raw) {
    var ctx = { units: {}, byCode: {}, projects: raw.projects || [], projectsById: {}, drafts: raw.drafts || [] };
    (raw.units || []).forEach(function (u) {
      ctx.units[u.id] = { unit: u, hm: [], services: [], fuels: [], projUnits: [], sched: {}, srs: [] };
      ctx.byCode[normCode(u.code)] = u;
    });
    ctx.projects.forEach(function (p) { ctx.projectsById[p.id] = p; });
    function U(id) { return ctx.units[id]; }

    (raw.project_units || []).forEach(function (r) {
      var u = U(r.unit_id); if (!u) return;
      var p = r.projects || ctx.projectsById[r.project_id] || {};
      var row = { ref: 'project_units:' + r.id, id: r.id, project_id: r.project_id, project: p, hm_awal: num(r.hm_awal), hm_akhir: num(r.hm_akhir) };
      u.projUnits.push(row);
      var lbl = 'Proyek ' + (p.project_code || p.nama_kapal || '');
      if (row.hm_awal != null && p.start_date) { var s = dayRange(p.start_date); u.hm.push({ hm: row.hm_awal, tMin: s[0], tMax: s[1], src: 'admin', label: 'HM awal ' + lbl + ' (' + fmtDay(p.start_date) + ')', ref: row.ref + ':awal' }); }
      if (row.hm_akhir != null && (p.end_date || p.start_date)) {
        var a = p.start_date ? dayRange(p.start_date)[0] : dayRange(p.end_date)[0];
        var b = dayRange(p.end_date || p.start_date)[1];
        u.hm.push({ hm: row.hm_akhir, tMin: a, tMax: b, src: 'admin', label: 'HM akhir ' + lbl + ' (' + fmtDay(p.end_date) + ')', ref: row.ref + ':akhir' });
      }
    });
    (raw.fuel_dispenses || []).forEach(function (r) {
      var u = U(r.unit_id); if (!u) return;
      var sp = span(r.dispense_date, r.dispense_time); if (!sp) return;
      var f = { ref: 'fuel_dispenses:' + r.id, id: r.id, hm: num(r.hm_at_fill), date: r.dispense_date, time: r.dispense_time, liters: num(r.liters_dispensed), lph: num(r.l_per_hr), tMin: sp[0], tMax: sp[1] };
      u.fuels.push(f);
      if (f.hm != null) u.hm.push({ hm: f.hm, tMin: f.tMin, tMax: f.tMax, src: 'admin', label: 'isi solar ' + fmtDay(f.date) + (f.time ? ' ' + String(f.time).slice(0, 5) : ''), ref: f.ref });
    });
    (raw.service_log || []).forEach(function (r) {
      var u = U(r.unit_id); if (!u) return;
      var s = { ref: 'service_log:' + r.id, id: r.id, type: normType(r.maintenance_type), rawType: r.maintenance_type, hm: num(r.hm_at_service), date: r.service_date };
      u.services.push(s);
      if (s.hm != null && s.date) { var d = dayRange(s.date); u.hm.push({ hm: s.hm, tMin: d[0], tMax: d[1], src: 'admin', label: 'servis ' + s.rawType + ' ' + fmtDay(s.date), ref: s.ref }); }
    });
    (raw.maintenance_schedules || []).forEach(function (r) {
      var u = U(r.unit_id); if (!u) return;
      u.sched[normType(r.type_name)] = { interval: num(r.interval_hm), last_hm: num(r.last_hm), last_date: r.last_date };
    });
    (raw.hm_updates || []).forEach(function (r) {
      var u = U(r.unit_id); if (!u || num(r.hm_value) == null) return;
      var t = new Date(r.recorded_at).getTime();
      // recorded_at is when it was typed; the reading itself may be up to 2 days earlier
      u.hm.push({ hm: num(r.hm_value), tMin: t - 48 * HOUR, tMax: t, src: 'admin', label: 'update HM ' + fmtDay(jktDate(r.recorded_at)), ref: 'hm_updates:' + r.id });
    });
    (raw.service_requests || []).forEach(function (r) { var u = U(r.unit_id); if (u) u.srs.push(r); });
    return ctx;
  }

  // ============ items (a draft, or an existing record re-checked in audit mode) ============
  function draftToItem(r, ctx) {
    var p = Object.assign({}, r.payload || {}, r.payload_edited || {});
    var code = r.unit_code || p.unit_code;
    var u = code ? ctx.byCode[normCode(code)] : null;
    var t = new Date(r.photo_taken_at || r.wa_sent_at).getTime();
    return { id: r.id, kind: r.kind, unit_code: code, unit_id: u ? u.id : null, tMin: t, tMax: t, payload: p,
             confidence: r.confidence, photo_taken_at: r.photo_taken_at, wa_sent_at: r.wa_sent_at, wa_text: r.wa_text,
             parent_id: r.parent_id, isDraft: true, selfRefs: [] };
  }

  // HM values a draft asserts, with their own timestamp
  function itemHms(it) {
    var p = it.payload, out = [];
    function add(v, lbl) { var n = num(v); if (n != null) out.push({ hm: n, label: lbl }); }
    if (it.kind === 'project_unit_hm') { add(p.hm_awal, 'HM awal'); add(p.hm_akhir, 'HM akhir'); }
    else if (it.kind === 'fuel_dispense') add(p.hm_at_fill, 'HM isi solar');
    else if (it.kind === 'service_log') add(p.hm_at_service, 'HM servis');
    else if (it.kind === 'hm_update') add(p.hm_value, 'HM');
    else if (it.kind === 'nse_session') { add(p.hm_awal, 'HM awal'); add(p.hm_akhir, 'HM akhir'); }
    return out;
  }

  function otherDraftEvents(it, ctx) {
    var out = [];
    ctx.drafts.forEach(function (r) {
      if (r.id === it.id || r.status !== 'pending') return;
      var o = draftToItem(r, ctx);
      if (o.unit_id !== it.unit_id) return;
      itemHms(o).forEach(function (h) { out.push({ hm: h.hm, tMin: o.tMin, tMax: o.tMax, src: 'draft', label: 'draft ' + (r.source_group || '') + ' ' + h.label, ref: 'wa_inbox:' + r.id }); });
    });
    return out;
  }

  // ============ checks ============
  function check(it, ctx, opts) {
    opts = opts || {};
    var out = [];
    function add(code, level, msg) { out.push({ code: code, level: level, msg: msg }); }
    var p = it.payload;
    var U = it.unit_id ? ctx.units[it.unit_id] : null;
    var self = it.selfRefs || [];
    function notSelf(e) { return self.indexOf(e.ref) < 0 && !self.some(function (s) { return e.ref && e.ref.indexOf(s + ':') === 0; }); }

    // --- unit ---
    var needsUnit = ['project_unit_hm', 'fuel_dispense', 'service_log', 'hm_update', 'service_request', 'nse_session'].indexOf(it.kind) >= 0;
    if (needsUnit && !U) { add('unit', 'fail', 'Unit "' + (it.unit_code || '?') + '" tidak dikenal di SERVIS SAA.'); return finish(out); }
    if (it.confidence === 'low') add('conf', 'warn', 'Parser sendiri ragu membaca foto ini.');

    // --- dates (C7) ---
    if (it.isDraft && it.photo_taken_at && it.wa_sent_at) {
      var ph = new Date(it.photo_taken_at).getTime(), ws = new Date(it.wa_sent_at).getTime();
      if (ph > ws + 10 * 60000) add('date', 'warn', 'Jam di foto (' + new Date(ph).toISOString().slice(11, 16) + ' UTC) setelah pesan dikirim. Timestamp foto salah?');
      else if (ws - ph > 36 * HOUR) add('date', 'warn', 'Foto diambil ' + Math.round((ws - ph) / (24 * HOUR)) + ' hari sebelum dikirim. Foto lama?');
    }
    if (it.isDraft) {
      var photoDay = jktDate(it.tMin);
      [['dispense_date', 'tanggal isi'], ['service_date', 'tanggal servis'], ['recorded_at', 'tanggal HM'], ['session_date', 'tanggal sesi']].forEach(function (f) {
        var v = p[f[0]]; if (!v) return;
        var d = String(v).length > 10 ? jktDate(v) : String(v).slice(0, 10);
        if (d !== photoDay) add('date', 'warn', 'Draft pakai ' + f[1] + ' ' + fmtDay(d) + ', tapi foto/pesan tanggal ' + fmtDay(photoDay) + '.');
      });
    }

    // --- HM timeline (C1, C2) ---
    if (U) {
      var events = U.hm.filter(notSelf).concat(it.isDraft ? otherDraftEvents(it, ctx) : []);
      itemHms(it).forEach(function (h) {
        var before = events.filter(function (e) { return e.tMax < it.tMin; });
        var after = events.filter(function (e) { return e.tMin > it.tMax; });
        // compare with the NEAREST readings in time (not the highest ever): one old typo (e.g. HM 7.798.179)
        // must not make every later reading look like it went backwards
        var prev = before.reduce(function (m, e) { return (!m || e.tMax > m.tMax || (e.tMax === m.tMax && e.hm > m.hm)) ? e : m; }, null);
        var next = after.reduce(function (m, e) { return (!m || e.tMin < m.tMin || (e.tMin === m.tMin && e.hm < m.hm)) ? e : m; }, null);
        var bad = false;
        if (prev && h.hm < prev.hm - 1) {
          bad = true;
          add('hm_back', prev.src === 'draft' ? 'warn' : 'fail', h.label + ' ' + fmt(h.hm) + ' lebih KECIL dari HM sebelumnya ' + fmt(prev.hm) + ' (' + prev.label + '). HM tidak bisa mundur.');
        }
        if (next && h.hm > next.hm + 1) {
          bad = true;
          add('hm_back', next.src === 'draft' ? 'warn' : 'fail', h.label + ' ' + fmt(h.hm) + ' lebih BESAR dari HM yang tercatat sesudahnya ' + fmt(next.hm) + ' (' + next.label + ').');
        }
        if (prev && !bad) {
          var dh = h.hm - prev.hm, dtMax = (it.tMax - prev.tMin) / HOUR;
          if (dh > dtMax + 1) add('hm_jump', prev.src === 'draft' ? 'warn' : 'fail', h.label + ' naik ' + fmt(dh) + ' HM sejak ' + prev.label + ', padahal waktunya paling lama ' + fmt(dtMax) + ' jam.');
        }
        if (!bad && (prev || next)) add('hm_ok', 'ok', h.label + ' ' + fmt(h.hm) + ' cocok dengan urutan HM unit' + (prev ? ' (sebelumnya ' + fmt(prev.hm) + ')' : '') + '.');
        if (!prev && !next) add('hm_ok', 'info', 'Belum ada HM pembanding untuk ' + it.unit_code + ' di sekitar waktu ini.');
      });
    }

    if (it.kind === 'project_unit_hm') checkProjectUnit(it, ctx, U, add, notSelf, opts);
    if (it.kind === 'fuel_dispense') checkFuel(it, ctx, U, add, notSelf, opts);
    if (it.kind === 'service_log') checkService(it, ctx, U, add, notSelf, opts);
    if (it.kind === 'project_kapal') checkKapal(it, ctx, add, opts);
    if (it.kind === 'service_request') checkSR(it, ctx, U, add);
    if (it.kind === 'hm_update' && U) {
      var hv = num(p.hm_value);
      var same = U.hm.filter(notSelf).filter(function (e) { return e.src === 'admin' && Math.abs(e.hm - hv) <= 0.5; })[0];
      if (same) add('match', 'match', 'HM ' + fmt(hv) + ' sudah tercatat (' + same.label + ').');
    }
    return finish(out);
  }

  function checkProjectUnit(it, ctx, U, add, notSelf, opts) {
    var p = it.payload, aw = num(p.hm_awal), ak = num(p.hm_akhir);
    if (aw != null && ak != null && ak < aw) add('awal_akhir', 'fail', 'HM akhir ' + fmt(ak) + ' lebih kecil dari HM awal ' + fmt(aw) + '.');
    if (!U) return;
    var pid = p.project_id || null;
    var rows = U.projUnits.filter(notSelf).filter(function (r) { return pid ? r.project_id === pid : true; });
    if (pid) {
      var row = rows[0], proj = ctx.projectsById[pid] || (row && row.project) || null;
      if (row && ak != null && row.hm_awal != null && aw == null) {
        if (ak < row.hm_awal) add('awal_akhir', 'fail', 'HM akhir ' + fmt(ak) + ' lebih kecil dari HM awal di proyek (' + fmt(row.hm_awal) + ').');
        else if (proj && proj.start_date) {
          var maxH = (it.tMax - at(proj.start_date)) / HOUR;
          if (ak - row.hm_awal > maxH + 1) add('hm_jump', 'fail', 'HM akhir naik ' + fmt(ak - row.hm_awal) + ' HM dari HM awal, padahal proyek baru mulai ' + fmt(maxH) + ' jam sebelumnya.');
        }
      }
      if (proj && p.kade && proj.kade && shipKey(p.kade).full !== shipKey(proj.kade).full) add('kade', 'warn', 'Kade di WA "' + p.kade + '" beda dengan kade proyek "' + proj.kade + '".');
    }
    // dry run: did the admin already type the same reading?
    var hit = null, day = jktDate(it.tMin);
    function covers(r) {
      if (pid) return r.project_id === pid;
      var pr = r.project || {}; if (!pr.start_date) return false;
      var s = at(pr.start_date) - 24 * HOUR, e = dayRange(pr.end_date || pr.start_date)[1] + 24 * HOUR, t = at(day);
      return t >= s && t <= e;
    }
    U.projUnits.filter(notSelf).filter(covers).forEach(function (r) {
      if (aw != null && r.hm_awal != null && Math.abs(r.hm_awal - aw) <= 0.5) hit = hit || { r: r, f: 'HM awal' };
      if (ak != null && r.hm_akhir != null && Math.abs(r.hm_akhir - ak) <= 0.5) hit = hit || { r: r, f: 'HM akhir' };
    });
    if (hit) add('match', opts.audit ? 'warn' : 'match', (opts.audit ? 'Dobel: ' : 'Cocok dengan input admin: ') + hit.f + ' di proyek ' + (hit.r.project.project_code || hit.r.project.nama_kapal || '') + '.');
    else if (pid) {
      var r0 = rows[0];
      if (r0 && aw != null && r0.hm_awal != null) add('admin_diff', 'warn', 'Admin input HM awal ' + fmt(r0.hm_awal) + ', draft membaca ' + fmt(aw) + '. Salah satu salah baca.');
      if (r0 && ak != null && r0.hm_akhir != null) add('admin_diff', 'warn', 'Admin input HM akhir ' + fmt(r0.hm_akhir) + ', draft membaca ' + fmt(ak) + '. Salah satu salah baca.');
    }
  }

  function checkFuel(it, ctx, U, add, notSelf, opts) {
    var p = it.payload, h = num(p.hm_at_fill);
    if (!U || h == null) return;
    var day = p.dispense_date || jktDate(it.tMin);
    var fuels = U.fuels.filter(notSelf);
    // C6 — already entered / dry-run match
    var same = fuels.filter(function (f) { return f.hm != null && Math.abs(f.hm - h) <= 0.5; })[0];
    if (same) {
      if (opts.audit) add('dup', 'fail', 'Dobel: isi solar HM ' + fmt(same.hm) + ' sudah ada (' + fmtDay(same.date) + ', ' + fmt(same.liters) + ' L).');
      else add('match', 'match', 'Sudah ada di BBM: HM ' + fmt(same.hm) + ', ' + fmtDay(same.date) + ', ' + fmt(same.liters) + ' L' + (same.date !== day ? '. Tanggal beda: draft ' + fmtDay(day) + ' vs admin ' + fmtDay(same.date) : '') + '.');
      if (same.date !== day && !opts.audit) add('date', 'warn', 'Tanggal isi solar: draft ' + fmtDay(day) + ', admin ' + fmtDay(same.date) + '. Mana yang benar?');
    } else {
      var near = fuels.filter(function (f) { return f.date === day && f.hm != null && Math.abs(f.hm - h) < 30; })[0];
      if (near) add('admin_diff', 'warn', 'Admin input isi solar ' + fmtDay(near.date) + ' di HM ' + fmt(near.hm) + ', draft membaca ' + fmt(h) + '. Salah satu salah baca.');
    }
    // C5 — liters per HM vs this unit's normal
    var liters = num(p.liters);
    var prevFill = fuels.filter(function (f) { return f.tMax < it.tMin && f.hm != null && f.hm < h - 0.5; })
                        .reduce(function (m, f) { return (!m || f.hm > m.hm) ? f : m; }, null);
    var lphs = fuels.map(function (f) { return f.lph; }).filter(function (v) { return v != null && v > 0; }).sort(function (a, b) { return a - b; });
    var med = lphs.length >= 3 ? lphs[Math.floor(lphs.length / 2)] : null;
    if (prevFill && liters != null && med) {
      var rate = liters / (h - prevFill.hm);
      if (rate > med * 1.6 || rate < med * 0.5) add('lph', 'warn', fmt(liters) + ' L untuk ' + fmt(h - prevFill.hm) + ' HM = ' + rate.toFixed(1) + ' L/jam. Normal unit ini ±' + med.toFixed(1) + ' L/jam.');
      else add('lph', 'ok', 'Pemakaian ' + rate.toFixed(1) + ' L/jam, wajar (normal ±' + med.toFixed(1) + ').');
    }
    var g = num(p.gauge_pct);
    if (g != null && g >= 90) add('gauge', 'warn', 'Gauge sebelum isi sudah ' + g + '%. Tangki hampir penuh, isi ' + fmt(liters) + ' L tidak masuk akal.');
    // C5 — cross-check with KCN / Woodlog HM awal–akhir on that day
    U.projUnits.forEach(function (r) {
      var pr = r.project || {};
      if (!pr.start_date || day < pr.start_date || (pr.end_date && day > pr.end_date)) return;
      // on the first/last day the order of fill vs HM awal/akhir is unknown, so only check days strictly inside
      if (r.hm_awal != null && day > pr.start_date && h < r.hm_awal - 1) add('kcn', 'warn', 'HM isi solar ' + fmt(h) + ' di bawah HM awal proyek ' + (pr.project_code || pr.nama_kapal || '') + ' (' + fmt(r.hm_awal) + ').');
      if (r.hm_akhir != null && pr.end_date && day < pr.end_date && h > r.hm_akhir + 1) add('kcn', 'warn', 'HM isi solar ' + fmt(h) + ' di atas HM akhir proyek ' + (pr.project_code || pr.nama_kapal || '') + ' (' + fmt(r.hm_akhir) + ').');
    });
  }

  function checkService(it, ctx, U, add, notSelf, opts) {
    var p = it.payload, h = num(p.hm_at_service);
    if (!U || h == null) return;
    var types = [];
    function push(t) { if (t && types.indexOf(t) < 0) types.push(t); }
    push(normType(p.maintenance_type));
    typesIn(p.parts_used).concat(typesIn(p.notes)).forEach(push);
    var services = U.services.filter(notSelf);
    var drafts = it.isDraft ? ctx.drafts.filter(function (r) { return r.id !== it.id && r.status === 'pending' && r.kind === 'service_log'; })
      .map(function (r) { return draftToItem(r, ctx); }).filter(function (o) { return o.unit_id === it.unit_id; }) : [];
    function doneNear(t, tol) {
      return services.some(function (s) { return s.type === t && s.hm != null && Math.abs(s.hm - h) <= tol; }) ||
             drafts.some(function (o) { var op = o.payload; var ts = [normType(op.maintenance_type)].concat(typesIn(op.parts_used), typesIn(op.notes)); return ts.indexOf(t) >= 0 && Math.abs(num(op.hm_at_service) - h) <= tol; });
    }
    types.forEach(function (t) {
      var I = CYCLE[t] || (U.sched[t] && U.sched[t].interval) || null;
      var same = services.filter(function (s) { return s.type === t && s.hm != null && Math.abs(s.hm - h) <= 5; })[0];
      if (same) {
        if (opts.audit) add('dup', 'fail', 'Dobel: ' + t + ' di HM ' + fmt(same.hm) + ' sudah tercatat (' + fmtDay(same.date) + ').');
        else add('match', 'match', 'Cocok dengan input admin: ' + t + ' HM ' + fmt(same.hm) + ' (' + fmtDay(same.date) + ').');
        return;
      }
      if (!I) return;
      var last = services.filter(function (s) { return s.type === t && s.hm != null && s.hm < h - 5; })
                         .reduce(function (m, s) { return (!m || s.hm > m.hm) ? s : m; }, null);
      var sc = U.sched[t];
      if (sc && sc.last_hm != null && sc.last_hm < h - 5 && (!last || sc.last_hm > last.hm)) last = { hm: sc.last_hm, date: sc.last_date, fromSched: true };
      if (!last) { add('cycle', 'info', 'Belum ada riwayat ' + t + ' untuk ' + it.unit_code + '; interval ' + I + ' HM tidak bisa dicek.'); return; }
      var since = h - last.hm;
      var lastTxt = t + ' terakhir di HM ' + fmt(last.hm) + (last.date ? ' (' + fmtDay(last.date) + ')' : '');
      if (since < I * 0.5) add('cycle', 'fail', t + ' baru ' + fmt(since) + ' HM sejak ganti terakhir (interval ' + I + '). ' + lastTxt + '. Kemungkinan dobel.');
      else if (since < I * 0.8) add('cycle', 'warn', t + ' lebih cepat dari jadwal: ' + fmt(since) + ' HM dari interval ' + I + '. ' + lastTxt + '.');
      else if (since > I * 1.1) add('cycle', 'warn', t + ' terlambat ' + fmt(since - I) + ' HM (sudah ' + fmt(since) + ' HM, interval ' + I + '). ' + lastTxt + '.');
      else add('cycle', 'ok', t + ' sesuai jadwal: ' + fmt(since) + ' HM sejak ganti terakhir (interval ' + I + ').');
    });
    // 500 set: Racor (2nd) + Oli Mesin + Filter Oli Mesin + Filter Solar together
    var has500 = types.some(function (t) { return t !== 'Racor' && SET500.indexOf(t) >= 0; });
    if (has500) {
      var missing = SET500.filter(function (t) { return types.indexOf(t) < 0 && !doneNear(t, 10); });
      if (missing.length) add('set500', 'warn', 'Servis 500 HM harus lengkap. Belum tercatat: ' + missing.join(', ') + '.');
      else add('set500', 'ok', 'Servis 500 lengkap (Racor, oli mesin, filter oli, filter solar).');
    } else if (types.indexOf('Racor') >= 0) {
      var lastOil = services.filter(function (s) { return s.type === 'Oli Mesin' && s.hm != null && s.hm < h - 5; })
                            .reduce(function (m, s) { return (!m || s.hm > m.hm) ? s : m; }, null);
      if (lastOil && h - lastOil.hm >= 400 && !doneNear('Oli Mesin', 10))
        add('set500', 'warn', 'Racor ini jatuh di ' + fmt(h - lastOil.hm) + ' HM sejak oli mesin terakhir: ini Racor ke-2, harusnya sekalian oli mesin + filter oli + filter solar.');
    }
  }

  function checkKapal(it, ctx, add, opts) {
    var p = it.payload;
    if (!p.nama_kapal) { add('kapal', 'warn', 'Nama kapal kosong.'); return; }
    var k = shipKey(p.nama_kapal), d0 = p.start_date || jktDate(it.tMin);
    var exact = null, similar = [], sameKade = [];
    ctx.projects.forEach(function (pr) {
      if (pr.type && pr.type !== 'kapal') return;
      if (!pr.start_date || Math.abs(at(pr.start_date) - at(d0)) > 14 * 24 * HOUR) return;
      var pk = shipKey(pr.nama_kapal);
      if (pk.full && pk.full === k.full) exact = exact || pr;
      else if (pk.letters && (pk.letters === k.letters || lev(pk.letters, k.letters) <= 2)) similar.push(pr);
      else if (p.kade && pr.kade && shipKey(pr.kade).full === shipKey(p.kade).full && (!pr.end_date || d0 <= pr.end_date)) sameKade.push(pr);
    });
    if (exact) add('match', opts.audit ? 'warn' : 'match', 'Proyek sudah ada: ' + (exact.project_code || '') + ' "' + exact.nama_kapal + '" kade ' + (exact.kade || '?') + ', mulai ' + fmtDay(exact.start_date) + '.');
    similar.forEach(function (pr) { add('kapal', 'warn', 'Nama mirip proyek ' + (pr.project_code || '') + ' "' + pr.nama_kapal + '" (' + fmtDay(pr.start_date) + '). Kapal yang sama? Nomor/ejaan beda.'); });
    sameKade.forEach(function (pr) { add('kade', 'warn', 'Kade ' + p.kade + ' sedang dipakai proyek ' + (pr.project_code || '') + ' "' + pr.nama_kapal + '". Dua kapal di kade yang sama?'); });
    if (!exact && !similar.length && !sameKade.length) add('kapal', 'ok', 'Kapal baru, tidak bentrok dengan proyek lain.');
  }

  function checkSR(it, ctx, U, add) {
    if (!U) return;
    var words = String(it.payload.description || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4; });
    U.srs.forEach(function (s) {
      if (SR_CLOSED.indexOf(s.status) >= 0) return;
      var sw = String(s.description || '').toLowerCase();
      var hits = words.filter(function (w) { return sw.indexOf(w) >= 0; });
      if (hits.length >= 2 || (hits.length === 1 && words.length <= 2)) add('sr_dup', 'warn', 'Sudah ada SR terbuka yang mirip: ' + (s.sr_number || '') + ' "' + s.description + '" (' + s.status + ').');
    });
  }

  function finish(checks) {
    var lv = checks.some(function (c) { return c.level === 'fail'; }) ? 'fail'
      : checks.some(function (c) { return c.level === 'warn'; }) ? 'warn' : 'ok';
    return { verdict: lv, checks: checks, matched: checks.some(function (c) { return c.level === 'match'; }) };
  }

  // ============ audit: re-check records already in SERVIS SAA ============
  function auditItems(raw, ctx, sinceDate) {
    var items = [];
    (raw.service_log || []).forEach(function (r) {
      if (!r.service_date || r.service_date < sinceDate) return;
      var u = ctx.units[r.unit_id]; if (!u) return;
      var d = dayRange(r.service_date);
      items.push({ id: 'service_log:' + r.id, kind: 'service_log', unit_id: r.unit_id, unit_code: u.unit.code, tMin: d[0], tMax: d[1],
                   payload: { maintenance_type: r.maintenance_type, hm_at_service: r.hm_at_service, service_date: r.service_date },
                   selfRefs: ['service_log:' + r.id], label: 'Servis ' + r.maintenance_type + ' · HM ' + fmt(r.hm_at_service) + ' · ' + fmtDay(r.service_date) });
    });
    (raw.fuel_dispenses || []).forEach(function (r) {
      if (!r.dispense_date || r.dispense_date < sinceDate) return;
      var u = ctx.units[r.unit_id]; if (!u) return;
      var sp = span(r.dispense_date, r.dispense_time);
      items.push({ id: 'fuel_dispenses:' + r.id, kind: 'fuel_dispense', unit_id: r.unit_id, unit_code: u.unit.code, tMin: sp[0], tMax: sp[1],
                   payload: { hm_at_fill: r.hm_at_fill, dispense_date: r.dispense_date, liters: r.liters_dispensed },
                   selfRefs: ['fuel_dispenses:' + r.id], label: 'Isi solar · HM ' + fmt(r.hm_at_fill) + ' · ' + fmtDay(r.dispense_date) + ' · ' + fmt(r.liters_dispensed) + ' L' });
    });
    (raw.project_units || []).forEach(function (r) {
      var pr = r.projects || ctx.projectsById[r.project_id] || {};
      if (!pr.start_date || pr.start_date < sinceDate) return;
      var u = ctx.units[r.unit_id]; if (!u) return;
      var a = dayRange(pr.start_date)[0], b = dayRange(pr.end_date || pr.start_date)[1];
      items.push({ id: 'project_units:' + r.id, kind: 'project_unit_hm', unit_id: r.unit_id, unit_code: u.unit.code, tMin: a, tMax: b,
                   payload: { hm_awal: r.hm_awal, hm_akhir: r.hm_akhir, project_id: r.project_id },
                   selfRefs: ['project_units:' + r.id], label: 'Proyek ' + (pr.project_code || pr.nama_kapal || '') + ' · HM ' + fmt(r.hm_awal) + ' → ' + fmt(r.hm_akhir) });
    });
    return items;
  }
  function audit(raw, ctx, sinceDate) {
    return auditItems(raw, ctx, sinceDate).map(function (it) {
      var res = check(it, ctx, { audit: true });
      // project rows span days: their own awal/akhir are compared by timeline only when clearly ordered
      return { item: it, result: res };
    }).filter(function (x) { return x.result.verdict !== 'ok'; });
  }

  // ============ scorecard: supervisor verdict vs admin decision ============
  // A draft was wrong when the admin rejected it, or marked it duplicate without it matching an admin entry.
  function score(rows) {
    var s = { caught: [], falseAlarm: [], cleanPass: [], missed: [], total: 0 };
    rows.forEach(function (r) {
      var c = r.check_result; if (!c || r.status === 'pending') return;
      s.total++;
      var flagged = c.verdict !== 'ok';
      // dry run: a draft marked duplicate because the admin already typed the same reading was RIGHT
      var wrong = r.status === 'rejected' || (r.status === 'duplicate' && !c.matched);
      if (flagged && wrong) s.caught.push(r);
      else if (flagged && !wrong) s.falseAlarm.push(r);
      else if (!flagged && wrong) s.missed.push(r);
      else s.cleanPass.push(r);
    });
    return s;
  }

  return { CYCLE: CYCLE, SET500: SET500, normType: normType, typesIn: typesIn, shipKey: shipKey, jktDate: jktDate,
           buildContext: buildContext, draftToItem: draftToItem, check: check, audit: audit, score: score };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = IBC;
