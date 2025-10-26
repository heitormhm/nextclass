-- Add missing columns to teacher_jobs for progress tracking
ALTER TABLE public.teacher_jobs 
ADD COLUMN IF NOT EXISTS progress numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_message text;

-- Create index for better performance on realtime subscriptions
CREATE INDEX IF NOT EXISTS idx_teacher_jobs_status_updated 
ON public.teacher_jobs(status, updated_at DESC);

-- Ensure RLS policies allow authenticated teachers to insert
DROP POLICY IF EXISTS "Teachers can insert own jobs" ON public.teacher_jobs;

CREATE POLICY "Authenticated teachers can insert jobs"
  ON public.teacher_jobs 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);