-- Inbox WA Supervisor (4 Okt 2026): store the supervisor's verdict on each draft,
-- so the dry-run "Rapor" can compare it with what the admin decided.
-- Run once in Supabase → SQL Editor. Safe to re-run.
ALTER TABLE public.wa_inbox ADD COLUMN IF NOT EXISTS check_result jsonb;
ALTER TABLE public.wa_inbox ADD COLUMN IF NOT EXISTS checked_at   timestamptz;
