-- Fix K(A15) and R units showing OVERDUE with no service history
-- Run in Supabase SQL editor (project: xpecefriamslzidlcsuj)
-- Sets last_hm = NULL for any maintenance_schedule row where last_hm = 0
-- and no real service log entry exists for that unit+type combination.

UPDATE maintenance_schedules ms
SET last_hm = NULL, last_date = NULL
WHERE ms.last_hm = 0
  AND NOT EXISTS (
    SELECT 1 FROM service_log sl
    WHERE sl.unit_id = ms.unit_id
      AND sl.maintenance_type = ms.type_name
  );
