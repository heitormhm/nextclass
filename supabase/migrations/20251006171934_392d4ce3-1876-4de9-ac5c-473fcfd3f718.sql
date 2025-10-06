-- Create table to track deep search progress
CREATE TABLE public.deep_search_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  progress_step TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deep_search_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own search sessions"
ON public.deep_search_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own search sessions"
ON public.deep_search_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search sessions"
ON public.deep_search_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_deep_search_user_created ON public.deep_search_sessions(user_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deep_search_sessions;

-- Create function to update timestamps
CREATE TRIGGER update_deep_search_sessions_updated_at
BEFORE UPDATE ON public.deep_search_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();