-- Fuel Tracking Tables
CREATE TABLE IF NOT EXISTS public.fuel_bunkers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bunker_code   text NOT NULL UNIQUE,
  delivery_date date NOT NULL,
  tank_name     text NOT NULL CHECK (tank_name IN ('hijau','merah','kuning')),
  total_liters  numeric NOT NULL CHECK (total_liters > 0),
  notes         text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_transfers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_code text NOT NULL UNIQUE,
  bunker_id     uuid NOT NULL REFERENCES public.fuel_bunkers(id),
  drum_name     text NOT NULL,
  volume_liters numeric NOT NULL CHECK (volume_liters > 0),
  filled_date   date NOT NULL,
  status        text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged','deployed')),
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_dispenses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id      uuid NOT NULL UNIQUE REFERENCES public.fuel_transfers(id),
  unit_id          uuid NOT NULL REFERENCES public.units(id),
  hm_at_fill       numeric NOT NULL,
  dispense_date    date NOT NULL,
  dispense_time    time,
  liters_dispensed numeric NOT NULL,
  l_per_hr         numeric,
  notes            text,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fuel_tank_transfers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_tank     text NOT NULL CHECK (from_tank IN ('hijau','merah','kuning')),
  to_tank       text NOT NULL CHECK (to_tank IN ('hijau','merah','kuning')),
  volume_liters numeric NOT NULL CHECK (volume_liters > 0),
  transfer_date date NOT NULL,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  CHECK (from_tank <> to_tank)
);

ALTER TABLE public.fuel_bunkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_dispenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_tank_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_fuel_bunkers" ON public.fuel_bunkers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_fuel_transfers" ON public.fuel_transfers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_fuel_dispenses" ON public.fuel_dispenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "admin_fuel_tank_transfers" ON public.fuel_tank_transfers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
