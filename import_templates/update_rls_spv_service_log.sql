-- Allow SPV to insert into service_log (in addition to mkn and admin)
DROP POLICY IF EXISTS "MKN and Admin can insert service log" ON public.service_log;
CREATE POLICY "MKN, SPV and Admin can insert service log"
  ON public.service_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('mkn','spv','admin')));
