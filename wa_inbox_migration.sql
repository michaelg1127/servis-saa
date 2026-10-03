-- ============================================================
-- INBOX WA — drafts extracted by Claude from WhatsApp groups
-- Spec: docs/superpowers/specs/2026-10-03-wa-inbox-design.md
-- Run once in Supabase SQL editor.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wa_inbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  kind            text NOT NULL CHECK (kind IN ('project_kapal','project_unit_hm','fuel_dispense',
                                                 'service_request','service_log','hm_update','nse_session')),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','duplicate')),
  source_group    text NOT NULL,
  wa_sender       text,
  wa_sent_at      timestamptz NOT NULL,
  photo_taken_at  timestamptz,
  wa_text         text,
  unit_code       text,
  payload         jsonb NOT NULL,
  payload_edited  jsonb,
  confidence      text NOT NULL DEFAULT 'high' CHECK (confidence IN ('high','medium','low')),
  issues          text[],
  parent_id       uuid REFERENCES public.wa_inbox(id) ON DELETE SET NULL,
  dedupe_key      text UNIQUE,
  target_table    text,
  target_id       uuid,
  reviewed_by     uuid REFERENCES public.profiles(id),
  reviewed_at     timestamptz,
  reject_reason   text
);
CREATE INDEX IF NOT EXISTS idx_wa_inbox_status ON public.wa_inbox(status, wa_sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_inbox_parent ON public.wa_inbox(parent_id);

ALTER TABLE public.wa_inbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_wa_inbox" ON public.wa_inbox;
CREATE POLICY "admin_all_wa_inbox" ON public.wa_inbox FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
