-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated teachers can insert jobs" ON public.teacher_jobs;
DROP POLICY IF EXISTS "Allow updates for own jobs or service role" ON public.teacher_jobs;
DROP POLICY IF EXISTS "Teachers can view own jobs" ON public.teacher_jobs;

-- Create more permissive policy for INSERT
CREATE POLICY "Teachers can create jobs"
  ON public.teacher_jobs 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = teacher_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'teacher'
      AND is_validated = true
    )
  );

-- Ensure UPDATE policy allows progress tracking
CREATE POLICY "Teachers and service can update jobs"
  ON public.teacher_jobs 
  FOR UPDATE
  TO authenticated, service_role
  USING (
    auth.uid() = teacher_id 
    OR auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'teacher'
    )
  );

-- Add SELECT policy
CREATE POLICY "Teachers can view own jobs"
  ON public.teacher_jobs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = teacher_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'teacher'
    )
  );