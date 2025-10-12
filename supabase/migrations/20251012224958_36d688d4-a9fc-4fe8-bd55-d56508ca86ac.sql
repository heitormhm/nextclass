-- ============================================
-- FASE 1: Criar Tabela Universal de Jobs
-- ============================================

-- Drop old table (migration)
DROP TABLE IF EXISTS deep_search_sessions CASCADE;

-- Create universal jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('DEEP_SEARCH', 'LESSON_PLAN_GENERATION')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'DECOMPOSING', 'RESEARCHING', 'SYNTHESIZING', 'COMPLETED', 'FAILED')
  ),
  input_payload JSONB NOT NULL,
  intermediate_data JSONB DEFAULT '{}'::jsonb,
  result TEXT,
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(job_type);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- RLS Policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for frontend updates
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_jobs_timestamp
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();