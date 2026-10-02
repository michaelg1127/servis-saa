// Fix: tank gauges + BBM Riwayat silently truncated at Supabase max_rows=1000.
// fuel_transfers / fuel_dispenses passed 1000 rows on 2026-10-02 -> newest drum
// fills no longer subtracted from Tanki Hijau, bar stuck.
const fs = require('fs');
const FILE = 'index.html';
let src = fs.readFileSync(FILE, 'utf8');
let fails = 0;
const NL = String.fromCharCode(13, 10); // index.html uses CRLF

function replaceExact(from, to, desc) {
  from = from.split('\n').join(NL);
  to = to.split('\n').join(NL);
  const count = src.split(from).length - 1;
  if (count !== 1) { console.error('MISS (' + count + '): ' + desc); fails++; return; }
  src = src.replace(from, to);
  console.log('OK: ' + desc);
}

// 1. Generic pager, placed right before fetchServiceLogMap
replaceExact(
  "async function fetchServiceLogMap() {",
  "// Supabase caps every response at 1000 rows (server max_rows). Use this for any\n" +
  "// unfiltered query on a table that can grow past that. buildQuery must return a\n" +
  "// fresh query each call and include a deterministic .order() (end with 'id').\n" +
  "async function fetchAllRows(buildQuery) {\n" +
  "  const PAGE = 1000;\n" +
  "  let all = [];\n" +
  "  for (let page = 0; ; page++) {\n" +
  "    const { data, error } = await buildQuery().range(page * PAGE, page * PAGE + PAGE - 1);\n" +
  "    if (error) return { data: null, error };\n" +
  "    all = all.concat(data || []);\n" +
  "    if (!data || data.length < PAGE) break;\n" +
  "  }\n" +
  "  return { data: all, error: null };\n" +
  "}\n\n" +
  "async function fetchServiceLogMap() {",
  'add fetchAllRows helper'
);

// 2. calcTankLevels
replaceExact(
  "    sb.from('fuel_bunkers').select('tank_name, total_liters'),\n" +
  "    sb.from('fuel_transfers').select('volume_liters, bunker_id, fuel_bunkers(tank_name)'),\n" +
  "    sb.from('fuel_tank_transfers').select('from_tank, to_tank, volume_liters'),",
  "    fetchAllRows(() => sb.from('fuel_bunkers').select('tank_name, total_liters').order('id')),\n" +
  "    fetchAllRows(() => sb.from('fuel_transfers').select('volume_liters, bunker_id, fuel_bunkers(tank_name)').order('id')),\n" +
  "    fetchAllRows(() => sb.from('fuel_tank_transfers').select('from_tank, to_tank, volume_liters').order('id')),",
  'calcTankLevels paginated'
);
replaceExact(
  "  const levels = { hijau: 0, merah: 0, kuning: 0 };\n  (bunkRes.data",
  "  if (bunkRes.error || transRes.error || ttRes.error) throw (bunkRes.error || transRes.error || ttRes.error);\n" +
  "  const levels = { hijau: 0, merah: 0, kuning: 0 };\n  (bunkRes.data",
  'calcTankLevels surfaces errors'
);

// 3. loadFuelRiwayat
replaceExact(
  "      sb.from('fuel_dispenses')\n        .select('id, dispense_date, dispense_time, hm_at_fill,",
  "      fetchAllRows(() => sb.from('fuel_dispenses')\n        .select('id, dispense_date, dispense_time, hm_at_fill,",
  'riwayat dispenses open'
);
replaceExact(
  "        .order('dispense_date', { ascending: false }).order('created_at', { ascending: false }),\n" +
  "      sb.from('fuel_tank_transfers')\n" +
  "        .select('id, from_tank, to_tank, volume_liters, transfer_date, notes, bunker_id, created_at')\n" +
  "        .order('created_at', { ascending: false }),\n" +
  "      sb.from('fuel_bunkers')\n" +
  "        .select('id, bunker_code, tank_name, total_liters, delivery_date')\n" +
  "        .order('delivery_date', { ascending: false }),",
  "        .order('dispense_date', { ascending: false }).order('created_at', { ascending: false }).order('id')),\n" +
  "      fetchAllRows(() => sb.from('fuel_tank_transfers')\n" +
  "        .select('id, from_tank, to_tank, volume_liters, transfer_date, notes, bunker_id, created_at')\n" +
  "        .order('created_at', { ascending: false }).order('id')),\n" +
  "      fetchAllRows(() => sb.from('fuel_bunkers')\n" +
  "        .select('id, bunker_code, tank_name, total_liters, delivery_date')\n" +
  "        .order('delivery_date', { ascending: false }).order('id')),",
  'riwayat all three paginated'
);

if (fails) { console.error(fails + ' patch(es) failed, file NOT written'); process.exit(1); }
fs.writeFileSync(FILE, src, 'utf8');
console.log('index.html written');
