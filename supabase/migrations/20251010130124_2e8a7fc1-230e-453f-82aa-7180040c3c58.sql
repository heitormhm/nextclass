-- Enable realtime for deep_search_sessions table
DO $$ 
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'deep_search_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deep_search_sessions;
  END IF;
END $$;

-- Ensure table has REPLICA IDENTITY FULL for complete row data in realtime updates
ALTER TABLE public.deep_search_sessions REPLICA IDENTITY FULL;