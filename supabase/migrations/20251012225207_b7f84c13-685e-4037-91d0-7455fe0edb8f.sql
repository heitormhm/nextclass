-- Fix security warning: Set search_path for update_jobs_updated_at function
DROP FUNCTION IF EXISTS update_jobs_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_jobs_timestamp
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();