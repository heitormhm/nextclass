-- Fix RLS policies for lecture_deep_search_sessions
-- Ensure authenticated users can insert and update their own sessions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can create their own lecture deep searches" ON public.lecture_deep_search_sessions;
DROP POLICY IF EXISTS "Authenticated users can insert sessions" ON public.lecture_deep_search_sessions;
DROP POLICY IF EXISTS "Authenticated users can update own sessions" ON public.lecture_deep_search_sessions;

-- Create clear policies for authenticated users
CREATE POLICY "Authenticated users can insert own sessions"
  ON public.lecture_deep_search_sessions 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own sessions"
  ON public.lecture_deep_search_sessions 
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);