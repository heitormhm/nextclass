-- Fix search_path for expire_old_recommendations function
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.recommendations
  SET is_active = FALSE
  WHERE expires_at < NOW() AND is_active = TRUE;
  RETURN NEW;
END;
$$;