-- Create recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_route TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- RLS Policies
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own active recommendations"
  ON recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND is_active = TRUE);

-- Index for performance
CREATE INDEX idx_recommendations_user_active 
  ON recommendations(user_id, is_active, created_at DESC)
  WHERE is_active = TRUE;

-- Auto-expire old recommendations
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE recommendations
  SET is_active = FALSE
  WHERE expires_at < NOW() AND is_active = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expire_recommendations
  AFTER INSERT ON recommendations
  EXECUTE FUNCTION expire_old_recommendations();