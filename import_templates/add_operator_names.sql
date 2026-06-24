-- Add operator_name column to units table
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS operator_name TEXT;

-- Update operator names per unit
UPDATE public.units SET operator_name = 'Daniel'  WHERE code = 'A1';
UPDATE public.units SET operator_name = 'Ramdan'  WHERE code = 'A3';
UPDATE public.units SET operator_name = 'Andhi'   WHERE code = 'A5';
UPDATE public.units SET operator_name = 'Yunus'   WHERE code = 'A7';
UPDATE public.units SET operator_name = 'Ali'     WHERE code = 'A8';
UPDATE public.units SET operator_name = 'Supri'   WHERE code = 'A10';
UPDATE public.units SET operator_name = 'Aldi'    WHERE code = 'B1';
UPDATE public.units SET operator_name = 'Asmanto' WHERE code = 'B3';
UPDATE public.units SET operator_name = 'Sigit'   WHERE code = 'B5';
UPDATE public.units SET operator_name = 'Mukri'   WHERE code = 'B7';
UPDATE public.units SET operator_name = 'Taupik'  WHERE code = 'B8';
UPDATE public.units SET operator_name = 'Diky'    WHERE code = 'G3';
UPDATE public.units SET operator_name = 'Egi'     WHERE code = 'G5';
UPDATE public.units SET operator_name = 'Nur'     WHERE code = 'G7';
UPDATE public.units SET operator_name = 'Robby'   WHERE code = 'G8';
UPDATE public.units SET operator_name = 'Sareng'  WHERE code = 'K1';
UPDATE public.units SET operator_name = 'Riski'   WHERE code = 'K3';
UPDATE public.units SET operator_name = 'Fahmi'   WHERE code = 'K5';
UPDATE public.units SET operator_name = 'Wili'    WHERE code = 'K7';
UPDATE public.units SET operator_name = 'Obang'   WHERE code = 'K8';
UPDATE public.units SET operator_name = 'Darmo'   WHERE code = 'R';
UPDATE public.units SET operator_name = 'Ryan'    WHERE code = 'K(A15)';
