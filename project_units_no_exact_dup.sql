-- A unit may work the same project in more than one session (e.g. K7 HM 1000-1010, then
-- again 1015-1025), so (project_id, unit_id) is NOT unique. What can never be valid is the
-- same unit starting twice at the same HM on one project: that is the double-save duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS project_units_project_unit_hmawal_key
  ON public.project_units (project_id, unit_id, hm_awal) NULLS NOT DISTINCT;
