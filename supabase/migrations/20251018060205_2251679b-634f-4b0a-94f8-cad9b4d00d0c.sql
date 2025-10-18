-- Drop old constraint that expects 'lecture', 'quiz', 'deadline', 'event'
ALTER TABLE class_events 
DROP CONSTRAINT IF EXISTS class_events_event_type_check;

-- Add new constraint that accepts 'presencial' and 'online'
ALTER TABLE class_events 
ADD CONSTRAINT class_events_event_type_check 
CHECK (event_type IN ('presencial', 'online'));

-- Update any existing records to have valid values
UPDATE class_events 
SET event_type = 'presencial' 
WHERE event_type NOT IN ('presencial', 'online');