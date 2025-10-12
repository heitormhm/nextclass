-- Add research_data column to store intermediate research results
ALTER TABLE deep_search_sessions 
ADD COLUMN IF NOT EXISTS research_data jsonb;