-- Pool Bunker Migration — Tanki Merah & Kuning
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run twice (ON CONFLICT DO NOTHING on OB inserts)

DO $$
DECLARE
  merah_total NUMERIC;
  kuning_total NUMERIC;
  mob_id UUID;
  kob_id UUID;
  fill RECORD;
  i INTEGER;
  merah_count INTEGER := 0;
  kuning_count INTEGER := 0;
BEGIN

  -- 1a. Compute totals from existing (non-OB) bunkers
  SELECT COALESCE(SUM(total_liters), 0) INTO merah_total
    FROM fuel_bunkers WHERE tank_name = 'merah' AND bunker_code <> 'M-OB';

  SELECT COALESCE(SUM(total_liters), 0) INTO kuning_total
    FROM fuel_bunkers WHERE tank_name = 'kuning' AND bunker_code <> 'K-OB';

  RAISE NOTICE 'Merah total: % L | Kuning total: % L', merah_total, kuning_total;

  -- 1b. Create OB pool bunkers (idempotent)
  INSERT INTO fuel_bunkers (bunker_code, tank_name, total_liters, delivery_date, notes)
  VALUES ('M-OB', 'merah', merah_total, CURRENT_DATE, 'Pool bunker — migrated 2026-08-18')
  ON CONFLICT (bunker_code) DO NOTHING;

  INSERT INTO fuel_bunkers (bunker_code, tank_name, total_liters, delivery_date, notes)
  VALUES ('K-OB', 'kuning', kuning_total, CURRENT_DATE, 'Pool bunker — migrated 2026-08-18')
  ON CONFLICT (bunker_code) DO NOTHING;

  SELECT id INTO mob_id FROM fuel_bunkers WHERE bunker_code = 'M-OB';
  SELECT id INTO kob_id FROM fuel_bunkers WHERE bunker_code = 'K-OB';
  RAISE NOTICE 'M-OB id: % | K-OB id: %', mob_id, kob_id;

  -- 1c. Migrate fills: point all old Merah/Kuning fills to OB bunkers
  UPDATE fuel_transfers
    SET bunker_id = mob_id
    WHERE bunker_id IN (
      SELECT id FROM fuel_bunkers WHERE tank_name = 'merah' AND bunker_code <> 'M-OB'
    );

  UPDATE fuel_transfers
    SET bunker_id = kob_id
    WHERE bunker_id IN (
      SELECT id FROM fuel_bunkers WHERE tank_name = 'kuning' AND bunker_code <> 'K-OB'
    );

  -- 1d. Renumber Merah fills chronologically (two-pass for UNIQUE constraint)
  i := 1;
  FOR fill IN (
    SELECT id FROM fuel_transfers WHERE bunker_id = mob_id ORDER BY created_at ASC
  ) LOOP
    UPDATE fuel_transfers SET transfer_code = 'TEMP-M-' || i WHERE id = fill.id;
    i := i + 1;
  END LOOP;
  merah_count := i - 1;

  i := 1;
  FOR fill IN (
    SELECT id FROM fuel_transfers WHERE bunker_id = mob_id ORDER BY created_at ASC
  ) LOOP
    UPDATE fuel_transfers SET transfer_code = 'M-' || i WHERE id = fill.id;
    i := i + 1;
  END LOOP;

  -- 1d. Renumber Kuning fills chronologically (two-pass)
  i := 1;
  FOR fill IN (
    SELECT id FROM fuel_transfers WHERE bunker_id = kob_id ORDER BY created_at ASC
  ) LOOP
    UPDATE fuel_transfers SET transfer_code = 'TEMP-K-' || i WHERE id = fill.id;
    i := i + 1;
  END LOOP;
  kuning_count := i - 1;

  i := 1;
  FOR fill IN (
    SELECT id FROM fuel_transfers WHERE bunker_id = kob_id ORDER BY created_at ASC
  ) LOOP
    UPDATE fuel_transfers SET transfer_code = 'K-' || i WHERE id = fill.id;
    i := i + 1;
  END LOOP;

  RAISE NOTICE 'Renumbered % Merah fills (M-1..M-%), % Kuning fills (K-1..K-%)',
    merah_count, merah_count, kuning_count, kuning_count;

  -- 1e. Delete old per-session Merah/Kuning bunker records
  DELETE FROM fuel_bunkers
    WHERE tank_name IN ('merah', 'kuning')
      AND bunker_code NOT IN ('M-OB', 'K-OB');

  GET DIAGNOSTICS i = ROW_COUNT;
  RAISE NOTICE 'Deleted % old bunker records', i;

  -- 1f. Update fuel_tank_transfers to reference OB bunkers
  UPDATE fuel_tank_transfers
    SET bunker_id = mob_id
    WHERE to_tank = 'merah' AND bunker_id IS NOT NULL AND bunker_id <> mob_id;

  UPDATE fuel_tank_transfers
    SET bunker_id = kob_id
    WHERE to_tank = 'kuning' AND bunker_id IS NOT NULL AND bunker_id <> kob_id;

  -- Verification
  RAISE NOTICE '--- Verification ---';
  RAISE NOTICE 'M-OB fills: %',
    (SELECT string_agg(transfer_code, ', ' ORDER BY created_at) FROM fuel_transfers WHERE bunker_id = mob_id);
  RAISE NOTICE 'K-OB fills: %',
    (SELECT string_agg(transfer_code, ', ' ORDER BY created_at) FROM fuel_transfers WHERE bunker_id = kob_id);
  RAISE NOTICE 'Remaining Merah/Kuning bunkers: %',
    (SELECT string_agg(bunker_code, ', ') FROM fuel_bunkers WHERE tank_name IN ('merah','kuning'));
  RAISE NOTICE '✅ Migration complete';

END $$;
