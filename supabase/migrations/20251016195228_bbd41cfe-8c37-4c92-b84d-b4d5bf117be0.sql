-- Add status column to personal_events
ALTER TABLE personal_events 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled'));

-- Add status column to class_events
ALTER TABLE class_events 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_personal_events_status ON personal_events(status);
CREATE INDEX IF NOT EXISTS idx_class_events_status ON class_events(status);