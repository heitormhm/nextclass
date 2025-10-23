-- FASE 1: Criar RLS Policy para Service Role (CRÍTICO)
-- Permitir service_role fazer TODAS operações em teacher_jobs
-- Sem isso, edge functions com SERVICE_ROLE_KEY falham ao criar jobs
CREATE POLICY "Service role full access to teacher_jobs"
ON public.teacher_jobs 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);