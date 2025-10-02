-- Add progress_step column to lesson_plans table for real-time progress tracking
ALTER TABLE public.lesson_plans
ADD COLUMN progress_step text;

COMMENT ON COLUMN public.lesson_plans.progress_step IS 'Current step in the lesson plan generation process, updated in real-time by the edge function';