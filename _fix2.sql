-- 1. Fix X28-19 (K7) decimal typo: 8.1124 → 8112.4
UPDATE fuel_dispenses fd
SET hm_at_fill = 8112.4
FROM fuel_transfers ft
WHERE ft.id = fd.transfer_id AND ft.transfer_code = 'X28-19';

-- 2. Recompute X26-22 (K7) l_per_hr now that prev HM is correct
--    prev (X28-19): hm=8112.4, gauge=0, liters=200
--    current (X26-22): hm=8035.2, gauge=null → use liters: 210 / (8035.2 - 8112.4)
--    Wait — 8035.2 < 8112.4 so X26-22 is actually BEFORE X28-19 in HM.
--    X26-22 (Aug 4, hm=8035.2) is before X28-19 (Aug 9, hm=8112.4).
--    So X26-22 needs the record BEFORE it (not X28-19).
--    Leave X26-22 l_per_hr as null — it's a first fill for K7 (nothing before it with correct HMs).

-- 3. Retroactive l_per_hr for manually inserted records with valid calcs
UPDATE fuel_dispenses fd SET l_per_hr = 12.26
FROM fuel_transfers ft WHERE ft.id = fd.transfer_id AND ft.transfer_code = 'X25-20';  -- G8

UPDATE fuel_dispenses fd SET l_per_hr = 13.29
FROM fuel_transfers ft WHERE ft.id = fd.transfer_id AND ft.transfer_code = 'K-AWAL-7'; -- J02

UPDATE fuel_dispenses fd SET l_per_hr = 28.57
FROM fuel_transfers ft WHERE ft.id = fd.transfer_id AND ft.transfer_code = 'X26-6';   -- J02

UPDATE fuel_dispenses fd SET l_per_hr = 18.42
FROM fuel_transfers ft WHERE ft.id = fd.transfer_id AND ft.transfer_code = 'X25-15';  -- K1

UPDATE fuel_dispenses fd SET l_per_hr = 13.29
FROM fuel_transfers ft WHERE ft.id = fd.transfer_id AND ft.transfer_code = 'X25-31';  -- K3

UPDATE fuel_dispenses fd SET l_per_hr = 13.22
FROM fuel_transfers ft WHERE ft.id = fd.transfer_id AND ft.transfer_code = 'K-AWAL-8'; -- K3

UPDATE fuel_dispenses fd SET l_per_hr = 20.50
FROM fuel_transfers ft WHERE ft.id = fd.transfer_id AND ft.transfer_code = 'X24-53';  -- K5
