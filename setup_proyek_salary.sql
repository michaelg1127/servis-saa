-- PS-DB: Proyek salary schema changes

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS paid_batch text
  CHECK (paid_batch IN ('mid_month', 'end_of_month'));

CREATE TABLE IF NOT EXISTS proyek_kasbon (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year    text NOT NULL,
  operator_name text NOT NULL,
  amount        numeric NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE proyek_kasbon ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'proyek_kasbon' AND policyname = 'public_all'
  ) THEN
    CREATE POLICY "public_all" ON proyek_kasbon
      FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;
