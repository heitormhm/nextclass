-- Create deep_search_sessions table for AI-powered web research
CREATE TABLE IF NOT EXISTS public.deep_search_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  search_type TEXT,
  progress_step TEXT,
  result TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deep_search_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own search sessions
CREATE POLICY "Users can view their own search sessions"
  ON public.deep_search_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own search sessions
CREATE POLICY "Users can create their own search sessions"
  ON public.deep_search_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update search sessions (for edge functions)
CREATE POLICY "Service role can update search sessions"
  ON public.deep_search_sessions
  FOR UPDATE
  USING (true);

-- Create index for performance
CREATE INDEX idx_deep_search_sessions_user_id ON public.deep_search_sessions(user_id);
CREATE INDEX idx_deep_search_sessions_status ON public.deep_search_sessions(status);

-- Add trigger for updated_at
CREATE TRIGGER update_deep_search_sessions_updated_at
  BEFORE UPDATE ON public.deep_search_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();