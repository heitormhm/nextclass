-- Create table for lecture deep search sessions
CREATE TABLE IF NOT EXISTS public.lecture_deep_search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_step TEXT,
  research_data JSONB,
  result TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_lecture_deep_search_lecture_id ON public.lecture_deep_search_sessions(lecture_id);
CREATE INDEX idx_lecture_deep_search_status ON public.lecture_deep_search_sessions(status);
CREATE INDEX idx_lecture_deep_search_user_id ON public.lecture_deep_search_sessions(user_id);

-- Enable RLS
ALTER TABLE public.lecture_deep_search_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own lecture deep searches"
  ON public.lecture_deep_search_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lecture deep searches"
  ON public.lecture_deep_search_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on lecture deep searches"
  ON public.lecture_deep_search_sessions FOR ALL
  USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_lecture_deep_search_sessions_updated_at
  BEFORE UPDATE ON public.lecture_deep_search_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();