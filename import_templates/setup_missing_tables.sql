-- ── Run this in Supabase SQL Editor ──────────────────────────────────────────
-- Creates all tables that are missing (profiles already exists, skip it)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── UNITS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.units (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code                 TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  model                TEXT,
  current_hm           NUMERIC DEFAULT 0,
  operator_name        TEXT,
  assigned_operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read units"
  ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and SPV can modify units"
  ON public.units FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','spv')));

-- ─── MAINTENANCE TYPES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_types (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type_name           TEXT NOT NULL UNIQUE,
  default_interval_hm INTEGER NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.maintenance_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read maintenance types"
  ON public.maintenance_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage maintenance types"
  ON public.maintenance_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── MAINTENANCE SCHEDULES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  unit_id      UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  type_name    TEXT NOT NULL,
  interval_hm  INTEGER NOT NULL,
  last_hm      NUMERIC,
  last_date    DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (unit_id, type_name)
);
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read schedules"
  ON public.maintenance_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and SPV can modify schedules"
  ON public.maintenance_schedules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','spv')));

-- ─── HM UPDATES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hm_updates (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  unit_id     UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  hm_value    NUMERIC NOT NULL,
  recorded_by UUID REFERENCES public.profiles(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.hm_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read HM updates"
  ON public.hm_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators can insert HM for assigned unit"
  ON public.hm_updates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.units WHERE id = unit_id AND assigned_operator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','spv'))
  );

CREATE OR REPLACE FUNCTION public.update_unit_hm()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.units
  SET current_hm = NEW.hm_value, updated_at = NOW()
  WHERE id = NEW.unit_id AND NEW.hm_value >= COALESCE(current_hm, 0);
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER trg_hm_update
  AFTER INSERT ON public.hm_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_unit_hm();

-- ─── SERVICE REQUESTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_requests (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sr_number        TEXT UNIQUE,
  unit_id          UUID NOT NULL REFERENCES public.units(id),
  category         TEXT NOT NULL,
  description      TEXT NOT NULL,
  urgency          TEXT NOT NULL DEFAULT 'normal'
                     CHECK (urgency IN ('normal','urgent','darurat')),
  submitted_by     UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  status           TEXT NOT NULL DEFAULT 'pending_spv'
                     CHECK (status IN ('pending_spv','approved_spv','scheduled',
                                       'in_progress','done_confirm','confirmed','rejected')),
  assigned_mkn_id  UUID REFERENCES public.profiles(id),
  scheduled_date   DATE,
  mkn_notes        TEXT,
  rejection_reason TEXT,
  spv_approved_at  TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  confirmed_at     TIMESTAMPTZ
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read service requests"
  ON public.service_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators and above can submit service requests"
  ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role != 'pending'));
CREATE POLICY "SPV, MKN, Admin can update service requests"
  ON public.service_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','spv','mkn')));

CREATE OR REPLACE FUNCTION public.set_sr_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.sr_number := 'SR-' || LPAD((
    SELECT COALESCE(MAX(CAST(SUBSTRING(sr_number FROM 4) AS INTEGER)), 0) + 1
    FROM public.service_requests WHERE sr_number IS NOT NULL
  )::TEXT, 3, '0');
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER trg_sr_number
  BEFORE INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_sr_number();

-- ─── JOB ORDERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_orders (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jo_number       TEXT UNIQUE,
  unit_id         UUID NOT NULL REFERENCES public.units(id),
  type            TEXT NOT NULL,
  assigned_mkn_id UUID REFERENCES public.profiles(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','done')),
  scheduled_date  DATE,
  priority        TEXT NOT NULL DEFAULT 'MED'
                    CHECK (priority IN ('HIGH','MED','LOW')),
  linked_sr_id    UUID REFERENCES public.service_requests(id),
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.job_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read job orders"
  ON public.job_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin and SPV can create job orders"
  ON public.job_orders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','spv')));
CREATE POLICY "Admin, SPV, MKN can update job orders"
  ON public.job_orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','spv','mkn')));

CREATE OR REPLACE FUNCTION public.set_jo_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.jo_number := 'JO-' || LPAD((
    SELECT COALESCE(MAX(CAST(SUBSTRING(jo_number FROM 4) AS INTEGER)), 0) + 1
    FROM public.job_orders WHERE jo_number IS NOT NULL
  )::TEXT, 3, '0');
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER trg_jo_number
  BEFORE INSERT ON public.job_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_jo_number();

-- ─── PARTS REQUESTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parts_requests (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pr_number     TEXT UNIQUE,
  job_order_id  UUID REFERENCES public.job_orders(id) ON DELETE CASCADE,
  unit_id       UUID REFERENCES public.units(id),
  part_name     TEXT NOT NULL,
  qty           NUMERIC NOT NULL,
  uom           TEXT NOT NULL DEFAULT 'pcs',
  requested_by  UUID REFERENCES public.profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.parts_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read parts requests"
  ON public.parts_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "MKN and Admin can create parts requests"
  ON public.parts_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mkn','admin')));
CREATE POLICY "Admin and SPV can approve parts requests"
  ON public.parts_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','spv')));

CREATE OR REPLACE FUNCTION public.set_pr_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.pr_number := 'PR-' || LPAD((
    SELECT COALESCE(MAX(CAST(SUBSTRING(pr_number FROM 4) AS INTEGER)), 0) + 1
    FROM public.parts_requests WHERE pr_number IS NOT NULL
  )::TEXT, 3, '0');
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER trg_pr_number
  BEFORE INSERT ON public.parts_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_pr_number();

-- ─── SERVICE LOG ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_log (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  unit_id          UUID NOT NULL REFERENCES public.units(id),
  unit_code        TEXT,
  maintenance_type TEXT NOT NULL,
  hm_at_service    NUMERIC,
  service_date     DATE NOT NULL,
  mkn_id           UUID REFERENCES public.profiles(id),
  mkn_name         TEXT,
  parts_used       TEXT,
  cost_idr         BIGINT DEFAULT 0,
  notes            TEXT,
  job_order_id     UUID REFERENCES public.job_orders(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.service_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All auth can read service log"
  ON public.service_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "MKN and Admin can insert service log"
  ON public.service_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mkn','admin')));
CREATE POLICY "Admin can update service log"
  ON public.service_log FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.update_after_service_log()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.maintenance_schedules
  SET last_hm = NEW.hm_at_service, last_date = NEW.service_date, updated_at = NOW()
  WHERE unit_id = NEW.unit_id AND type_name = NEW.maintenance_type
    AND (last_hm IS NULL OR NEW.hm_at_service >= last_hm);
  UPDATE public.units
  SET current_hm = GREATEST(COALESCE(current_hm, 0), COALESCE(NEW.hm_at_service, 0)), updated_at = NOW()
  WHERE id = NEW.unit_id;
  RETURN NEW;
END; $$;
CREATE OR REPLACE TRIGGER trg_service_log
  AFTER INSERT ON public.service_log
  FOR EACH ROW EXECUTE FUNCTION public.update_after_service_log();

-- ─── SEED: MAINTENANCE TYPES ─────────────────────────────────────────────────
INSERT INTO public.maintenance_types (type_name, default_interval_hm) VALUES
  ('Engine Oil & Filter', 250), ('Hydraulic Oil Filter', 500), ('Air Filter', 500),
  ('Fuel Filter', 250), ('Greasing All Points', 50), ('Final Drive Oil', 1000),
  ('Coolant Check', 500), ('V-Belt Check', 500), ('Battery Check', 250),
  ('Wire Rope Inspection', 250), ('Impeller Inspection', 500), ('Injector Service', 2000),
  ('Track / Undercarriage Check', 500), ('Transmission Oil', 1000), ('Swing Gear Oil', 1000)
ON CONFLICT (type_name) DO NOTHING;
