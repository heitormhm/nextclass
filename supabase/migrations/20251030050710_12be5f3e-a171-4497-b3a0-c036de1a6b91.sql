-- ==========================================
-- PHASE 2: Material Didático V2 Jobs Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.material_v2_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  progress NUMERIC DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_step TEXT,
  result TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_v2_jobs ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own jobs
CREATE POLICY "Teachers can view their own material jobs"
  ON public.material_v2_jobs
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Service role has full access
CREATE POLICY "Service role full access on material jobs"
  ON public.material_v2_jobs
  FOR ALL
  USING (true);

-- Update timestamp trigger
CREATE TRIGGER update_material_v2_jobs_updated_at
  BEFORE UPDATE ON public.material_v2_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.material_v2_jobs;

-- ==========================================
-- PHASE 3: Performance Indexes
-- ==========================================

-- Index for lecture analytics queries
CREATE INDEX IF NOT EXISTS idx_lectures_teacher_material_v2 
  ON public.lectures(teacher_id, created_at DESC) 
  WHERE material_didatico_v2 IS NOT NULL;

-- Index for job queries
CREATE INDEX IF NOT EXISTS idx_material_v2_jobs_lecture_status 
  ON public.material_v2_jobs(lecture_id, status, created_at DESC);

-- Index for teacher job history
CREATE INDEX IF NOT EXISTS idx_material_v2_jobs_teacher_created 
  ON public.material_v2_jobs(teacher_id, created_at DESC);

-- ==========================================
-- PHASE 3: Telemetry Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.material_generation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.material_v2_jobs(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  research_queries_count INTEGER,
  web_searches_count INTEGER,
  markdown_length INTEGER,
  mermaid_diagrams_count INTEGER,
  latex_formulas_count INTEGER,
  generation_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_generation_metrics ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access on metrics"
  ON public.material_generation_metrics
  FOR ALL
  USING (true);

-- Teachers can view metrics for their lectures
CREATE POLICY "Teachers can view metrics for their lectures"
  ON public.material_generation_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lectures
      WHERE lectures.id = material_generation_metrics.lecture_id
      AND lectures.teacher_id = auth.uid()
    )
  );

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_metrics_lecture_created 
  ON public.material_generation_metrics(lecture_id, created_at DESC);