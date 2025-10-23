-- FASE 1: Criar tabela teacher_jobs para processamento assíncrono
CREATE TABLE teacher_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  job_type TEXT NOT NULL, -- 'GENERATE_QUIZ' | 'GENERATE_FLASHCARDS'
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  input_payload JSONB,
  result_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_teacher_jobs_teacher_id ON teacher_jobs(teacher_id);
CREATE INDEX idx_teacher_jobs_status ON teacher_jobs(status);
CREATE INDEX idx_teacher_jobs_lecture_id ON teacher_jobs(lecture_id);

-- RLS Policies
ALTER TABLE teacher_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own jobs"
ON teacher_jobs FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own jobs"
ON teacher_jobs FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Service role can update jobs"
ON teacher_jobs FOR UPDATE
USING (true);

-- Habilitar Realtime para notificações instantâneas
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_jobs;