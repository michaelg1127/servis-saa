// patch_inbox2.js — Inbox WA Supervisor: reverse-checks every draft (HM timeline, service cycle 250/500,
// solar vs KCN, duplicates, dates, ship/kade) + Rapor dry run + Audit data.
// Engine: inbox_checks.src.js (tested by test_cases/inbox_checks.test.js). UI: inbox_supervisor.src.js.
// Also applies the small hook edits to inbox_module.src.js so the source of truth stays in sync.
const fs = require('fs');
let fails = 0;
const N = '\r\n';

function patchFile(file, nl, edits, inject) {
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('ibcBlock(r)')) { console.error(file + ': already applied.'); return null; }
  edits.forEach(function (e) {
    const from = e[0].split('\n').join(nl), to = e[1].split('\n').join(nl);
    const count = src.split(from).length - 1;
    if (count !== 1) { console.error((count ? 'AMBIGUOUS (' + count + '): ' : 'MISS: ') + file + ': ' + e[2]); fails++; return; }
    src = src.replace(from, () => to);
    console.log('OK: ' + file + ': ' + e[2]);
  });
  if (inject) src = inject(src);
  return src;
}

const hookEdits = [
  ["  inboxState.rows = res.data || [];\n",
   "  inboxState.rows = res.data || [];\n  if (typeof ibcRunPending === 'function') { try { await ibcRunPending(inboxState.rows); } catch (e) { console.warn('Supervisor gagal:', e); } }\n",
   'loadAdminInbox: run supervisor'],
  ["    return (!inboxState.group || r.source_group === inboxState.group) && (!inboxState.unit || r.unit_code === inboxState.unit);",
   "    return (!inboxState.group || r.source_group === inboxState.group) && (!inboxState.unit || r.unit_code === inboxState.unit)\n      && (typeof ibcState === 'undefined' || !ibcState.onlyFlagged || (r._chk && r._chk.verdict !== 'ok'));",
   'renderInboxList: "hanya yang perlu dicek" filter'],
  ["    + '<div style=\"font-size:13px;color:#334155;margin-top:6px;\">' + ibSummary(r) + '</div>'\n    + issues",
   "    + '<div style=\"font-size:13px;color:#334155;margin-top:6px;\">' + ibSummary(r) + '</div>'\n    + issues\n    + (typeof ibcBlock === 'function' ? ibcBlock(r) : '')",
   'renderInboxCard: supervisor block'],
  ["    + (iss.length ? '<br><b style=\"color:#B45309;\">⚠ ' + iss.map(ibEsc).join(' · ') + '</b>' : '')",
   "    + (iss.length ? '<br><b style=\"color:#B45309;\">⚠ ' + iss.map(ibEsc).join(' · ') + '</b>' : '')\n    + (typeof ibcBannerLine === 'function' ? ibcBannerLine(r) : '')",
   'ibBanner: supervisor warnings on the prefilled form'],
];

// 1) source of truth (LF)
const modSrc = patchFile('inbox_module.src.js', '\n', hookEdits);
// 2) index.html (CRLF)
const screenEdit = [
  "      <div id=\"adm-inbox-unit-pills\" style=\"display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;\"></div>\n",
  "      <div id=\"adm-inbox-unit-pills\" style=\"display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;\"></div>\n      <div id=\"adm-inbox-supervisor\" style=\"margin:8px 0 6px;\"></div>\n",
  'screen: supervisor panel'];
const endMark = '// ===================== END INBOX WA =====================';
const html = patchFile('index.html', N, hookEdits.concat([screenEdit]), function (src) {
  const add = ['inbox_checks.src.js', 'inbox_supervisor.src.js'].map(function (f) {
    return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').replace(/\n/g, N);
  }).join(N);
  const count = src.split(endMark + N).length - 1;
  if (count !== 1) { console.error('MISS/AMBIGUOUS: inject anchor (' + count + ')'); fails++; return src; }
  console.log('OK: index.html: inject supervisor engine + UI');
  return src.replace(endMark + N, () => endMark + N + add + N);
});

if (fails || !html || !modSrc) { console.error((fails || 'nothing') + ' failure(s) — files NOT written.'); process.exit(1); }
fs.writeFileSync('inbox_module.src.js', modSrc);
fs.writeFileSync('index.html', html);
console.log('Done.');
