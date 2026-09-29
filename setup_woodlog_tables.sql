-- Table 1: per-operator salary rows linked to woodlog projects
CREATE TABLE IF NOT EXISTS woodlog_operator_salary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  unit_type text NOT NULL CHECK (unit_type IN ('bangau', 'std', 'hourly')),
  tonnage_mt numeric,
  salary_amount numeric NOT NULL,
  paid_batch text CHECK (paid_batch IN ('mid_month', 'end_of_month')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE woodlog_operator_salary ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'woodlog_operator_salary' AND policyname = 'public_all'
  ) THEN
    CREATE POLICY "public_all" ON woodlog_operator_salary
      FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Table 2: monthly KASBON (cash advance deductions) per operator
CREATE TABLE IF NOT EXISTS woodlog_kasbon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  operator_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE woodlog_kasbon ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'woodlog_kasbon' AND policyname = 'public_all'
  ) THEN
    CREATE POLICY "public_all" ON woodlog_kasbon
      FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;
