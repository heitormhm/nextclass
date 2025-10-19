-- Add teacher configuration fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS weekly_report_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS video_quality text DEFAULT '1080p',
ADD COLUMN IF NOT EXISTS transcription_language text DEFAULT 'pt-BR';

-- Add check constraint for video quality
ALTER TABLE users 
ADD CONSTRAINT check_video_quality 
CHECK (video_quality IN ('720p', '1080p', '4k'));

-- Add check constraint for transcription language
ALTER TABLE users 
ADD CONSTRAINT check_transcription_language 
CHECK (transcription_language IN ('pt-BR', 'en-US', 'es-ES'));