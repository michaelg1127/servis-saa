-- Enable anon role to run fuel migration script
-- This grants anon users access to fuel tables for one-time migration only
-- Run this in Supabase SQL Editor, then run node patch_bbm5_db.js, then optionally remove this policy

-- Add anon policy for fuel_bunkers (INSERT for migration, SELECT always allowed)
CREATE POLICY "anon_fuel_bunkers_migration" ON public.fuel_bunkers FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Add anon policy for fuel_transfers (UPDATE/INSERT for renumbering, SELECT always allowed)
CREATE POLICY "anon_fuel_transfers_migration" ON public.fuel_transfers FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Add anon policy for fuel_tank_transfers (UPDATE for tank xfer references)
CREATE POLICY "anon_fuel_tank_transfers_migration" ON public.fuel_tank_transfers FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Note: After migration completes, these policies can be removed with:
-- DROP POLICY "anon_fuel_bunkers_migration" ON public.fuel_bunkers;
-- DROP POLICY "anon_fuel_transfers_migration" ON public.fuel_transfers;
-- DROP POLICY "anon_fuel_tank_transfers_migration" ON public.fuel_tank_transfers;
