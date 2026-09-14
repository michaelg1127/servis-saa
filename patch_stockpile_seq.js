// patch_stockpile_seq.js — fix duplicate-key error on stockpile add:
//   1. Add getNextStockpileSeq(prefix) helper
//   2. Add onStockpilePrefixBlur() to auto-populate seq
//   3. Wire onblur to the prefix input
//   4. Friendly error message on unique-violation

const fs = require('fs');
const path = 'index.html';
let src = fs.readFileSync(path, 'utf8');

function replaceExact(from, to, desc) {
  const count = src.split(from).length - 1;
  if (count === 0) { console.error('MISS: ' + desc); process.exit(1); }
  if (count > 1) { console.error('AMBIGUOUS (' + count + '): ' + desc); process.exit(1); }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

// PATCH 1: add helper + blur handler right after formatStockpileCode
replaceExact(
  "function formatStockpileCode(prefix, seq) {\r\n  return prefix.toUpperCase().trim() + '-' + String(seq).padStart(3, '0');\r\n}\r\n",
  "function formatStockpileCode(prefix, seq) {\r\n  return prefix.toUpperCase().trim() + '-' + String(seq).padStart(3, '0');\r\n}\r\n\r\n" +
  "async function getNextStockpileSeq(prefix) {\r\n" +
  "  if (!prefix) return 1;\r\n" +
  "  const { data } = await sb.from('projects')\r\n" +
  "    .select('code_seq')\r\n" +
  "    .eq('type', 'stockpile')\r\n" +
  "    .eq('code_prefix', prefix.toUpperCase().trim())\r\n" +
  "    .order('code_seq', { ascending: false })\r\n" +
  "    .limit(1);\r\n" +
  "  if (!data || data.length === 0) return 1;\r\n" +
  "  return (data[0].code_seq || 0) + 1;\r\n" +
  "}\r\n\r\n" +
  "async function onStockpilePrefixBlur() {\r\n" +
  "  const prefixEl = document.getElementById('stk-add-prefix');\r\n" +
  "  const seqEl = document.getElementById('stk-add-seq');\r\n" +
  "  if (!prefixEl || !seqEl) return;\r\n" +
  "  const prefix = prefixEl.value.trim().toUpperCase();\r\n" +
  "  if (!prefix) return;\r\n" +
  "  const next = await getNextStockpileSeq(prefix);\r\n" +
  "  seqEl.value = next;\r\n" +
  "}\r\n",
  'add getNextStockpileSeq + onStockpilePrefixBlur'
);

// PATCH 2: wire onblur to prefix input
replaceExact(
  '<input type="text" id="stk-add-prefix" class="finput" placeholder="KCN" maxlength="6" oninput="this.value=this.value.toUpperCase()">',
  '<input type="text" id="stk-add-prefix" class="finput" placeholder="KCN" maxlength="6" oninput="this.value=this.value.toUpperCase()" onblur="onStockpilePrefixBlur()">',
  'wire onblur handler to stk-add-prefix'
);

// PATCH 3: friendly error message in submitAddStockpile catch
replaceExact(
  "  } catch(e) { showToast('Gagal simpan: ' + e.message); }\r\n}\r\n\r\nasync function deleteKapalProject(id, code) {",
  "  } catch(e) {\r\n" +
  "    const msg = (e && e.message) ? e.message : String(e);\r\n" +
  "    if (/duplicate key|projects_project_code_key|23505/i.test(msg)) {\r\n" +
  "      showToast('Kode proyek ' + projectCode + ' sudah ada. Naikkan Nomor Urut.');\r\n" +
  "    } else {\r\n" +
  "      showToast('Gagal simpan: ' + msg);\r\n" +
  "    }\r\n" +
  "  }\r\n}\r\n\r\nasync function deleteKapalProject(id, code) {",
  'friendly duplicate-key error in submitAddStockpile'
);

fs.writeFileSync(path, src);
console.log('Done.');
