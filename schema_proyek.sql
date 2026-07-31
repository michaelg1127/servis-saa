-- ============================================================
-- PROYEK MODULE SCHEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code         text NOT NULL UNIQUE,
  type                 text NOT NULL CHECK (type IN ('kapal','stockpile')),
  nama_kapal           text,
  pemberi_kerja        text NOT NULL,
  kade                 text,
  start_date           date NOT NULL,
  end_date             date NOT NULL,
  month_year           text NOT NULL,
  ship_number_in_month int,
  cargo_type           text,
  total_mt_m3          numeric,
  unit_price           numeric,
  harga_solar_rpl      numeric,
  invoice_number       text,
  code_prefix          text,
  code_seq             int,
  notes                text,
  created_at           timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_units (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  unit_id          uuid NOT NULL REFERENCES public.units(id),
  hm_awal          numeric NOT NULL,
  hm_akhir         numeric NOT NULL,
  solar_awal_pct   smallint NOT NULL CHECK (solar_awal_pct BETWEEN 0 AND 100),
  solar_akhir_pct  smallint NOT NULL CHECK (solar_akhir_pct BETWEEN 0 AND 100),
  solar_isi_liters numeric NOT NULL DEFAULT 0,
  hm_gap_reason    text,
  created_at       timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_projects" ON public.projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_project_units" ON public.project_units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
