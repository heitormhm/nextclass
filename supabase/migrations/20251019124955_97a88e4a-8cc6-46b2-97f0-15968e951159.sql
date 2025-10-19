-- Criar tabela para armazenar jobs de geração de planos de aula
CREATE TABLE IF NOT EXISTS public.lesson_plan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  structured_content JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_lesson_plan_jobs_job_id ON public.lesson_plan_jobs(job_id);
CREATE INDEX idx_lesson_plan_jobs_teacher_id ON public.lesson_plan_jobs(teacher_id);
CREATE INDEX idx_lesson_plan_jobs_status ON public.lesson_plan_jobs(status);
CREATE INDEX idx_lesson_plan_jobs_created_at ON public.lesson_plan_jobs(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.lesson_plan_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Professores podem visualizar apenas seus próprios jobs
CREATE POLICY "Teachers can view their own jobs"
  ON public.lesson_plan_jobs
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Policy: Professores podem criar seus próprios jobs
CREATE POLICY "Teachers can create their own jobs"
  ON public.lesson_plan_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_lesson_plan_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_lesson_plan_jobs_updated_at
  BEFORE UPDATE ON public.lesson_plan_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lesson_plan_jobs_updated_at();