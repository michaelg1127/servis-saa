-- 2026-10-17: a Bangau operator can also run STD trucks on the same ship (e.g. Andi on K09-01),
-- so one person may have one row per unit_type per project.
ALTER TABLE public.woodlog_operator_salary DROP CONSTRAINT IF EXISTS woodlog_operator_salary_project_op_unique;
ALTER TABLE public.woodlog_operator_salary ADD CONSTRAINT woodlog_operator_salary_project_op_type_unique UNIQUE (project_id, operator_name, unit_type);
