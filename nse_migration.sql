CREATE TABLE IF NOT EXISTS nse_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE NOT NULL,
  session_num  SMALLINT NOT NULL CHECK (session_num BETWEEN 1 AND 3),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  hm_awal      NUMERIC,
  hm_akhir     NUMERIC,
  unit_id      UUID REFERENCES units(id),
  month_year   TEXT NOT NULL,
  paid_batch   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_date, session_num)
);
CREATE INDEX IF NOT EXISTS idx_nse_sessions_month_year ON nse_sessions(month_year);
