-- Create internship_sessions table
CREATE TABLE public.internship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  internship_type TEXT NOT NULL,
  location_name TEXT NOT NULL,
  location_details TEXT,
  tags TEXT[] DEFAULT '{}',
  transcript JSONB,
  ai_summary JSONB,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for internship_sessions
ALTER TABLE public.internship_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.internship_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.internship_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.internship_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create internship_locations table
CREATE TABLE public.internship_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  full_address TEXT,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_user_usage ON public.internship_locations(user_id, usage_count DESC);
CREATE INDEX idx_locations_name_search ON public.internship_locations USING gin(to_tsvector('portuguese', name));

ALTER TABLE public.internship_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own locations"
  ON public.internship_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own locations"
  ON public.internship_locations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create internship_tags table
CREATE TABLE public.internship_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tag)
);

CREATE INDEX idx_tags_user_usage ON public.internship_tags(user_id, usage_count DESC);

ALTER TABLE public.internship_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags"
  ON public.internship_tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tags"
  ON public.internship_tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);