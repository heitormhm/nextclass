-- Garantir que a RLS policy para INSERT está correta
-- Remover policies antigas primeiro
DROP POLICY IF EXISTS "Authenticated teachers can insert jobs" ON public.teacher_jobs;
DROP POLICY IF EXISTS "Teachers can insert own jobs" ON public.teacher_jobs;

-- Criar policy correta para INSERT
CREATE POLICY "teachers_can_insert_own_jobs"
  ON public.teacher_jobs 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);