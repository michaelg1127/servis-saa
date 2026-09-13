// fix_service_log_import.js
// Fixes service_log CSV before re-import:
//   1. Normalizes unit codes to uppercase (k8 → K8)
//   2. Removes rows with unit_code = G1 (unit does not exist)
// Then bulk-inserts valid rows to Supabase.
//
// Usage:
//   SUPABASE_URL=https://xpecefriamslzidlcsuj.supabase.co \
//   SUPABASE_SERVICE_KEY=<service_role_key> \
//   node fix_service_log_import.js <path_to_csv>

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const csvPath = process.argv[2];
if (!csvPath) { console.error('Usage: node fix_service_log_import.js <csv_file>'); process.exit(1); }

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xpecefriamslzidlcsuj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_KEY) { console.error('Set SUPABASE_SERVICE_KEY env var'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => row[h] = (vals[i] || '').trim());
    return row;
  });
}

function parseDate(d) {
  // expects dd/mm/yyyy
  const parts = d.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
}

function parseHM(s) {
  // Remove thousands commas: "6,409" → 6409
  return parseFloat(s.replace(/,/g, ''));
}

async function main() {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(raw);

  console.log(`Loaded ${rows.length} rows from CSV`);

  // Fetch unit map (code → id)
  const { data: units, error: uErr } = await sb.from('units').select('id, code');
  if (uErr) { console.error('Failed to fetch units:', uErr.message); process.exit(1); }
  const unitMap = {};
  units.forEach(u => unitMap[u.code.toUpperCase()] = u.id);

  const skipped = [];
  const valid = [];

  for (const row of rows) {
    const code = (row.unit_code || '').toUpperCase();

    if (code === 'G1') {
      skipped.push({ reason: 'G1 unit does not exist', row });
      continue;
    }

    const unitId = unitMap[code];
    if (!unitId) {
      skipped.push({ reason: `Unknown unit code: ${code}`, row });
      continue;
    }

    const serviceDate = parseDate(row.service_date);
    if (!serviceDate) {
      skipped.push({ reason: `Bad date: ${row.service_date}`, row });
      continue;
    }

    const hmVal = parseHM(row.hm_at_service);
    if (isNaN(hmVal)) {
      skipped.push({ reason: `Bad HM: ${row.hm_at_service}`, row });
      continue;
    }

    valid.push({
      unit_id: unitId,
      maintenance_type: row.maintenance_type,
      service_date: serviceDate,
      hm_at_service: hmVal,
      mekanik_name: row.mekanik_name || null,
      parts_used: row.parts_used || null,
      cost_idr: row.cost_idr ? parseInt(row.cost_idr.replace(/[^0-9]/g, '')) : null,
      notes: row.notes || null,
    });
  }

  console.log(`Valid rows: ${valid.length} | Skipped: ${skipped.length}`);
  if (skipped.length > 0) {
    console.log('\nSkipped rows:');
    skipped.forEach(s => console.log(`  [${s.reason}] unit=${s.row.unit_code} date=${s.row.service_date}`));
  }

  if (valid.length === 0) { console.log('Nothing to insert.'); return; }

  // Insert in batches of 100
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH);
    const { error } = await sb.from('service_log').insert(batch);
    if (error) { console.error(`Batch ${i}–${i+BATCH} failed:`, error.message); process.exit(1); }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${valid.length}...`);
  }

  console.log('\nDone! Run Admin → Sync Jadwal dari Service Log after this.');
}

main().catch(e => { console.error(e); process.exit(1); });
