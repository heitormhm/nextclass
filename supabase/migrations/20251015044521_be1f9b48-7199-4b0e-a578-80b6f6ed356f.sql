-- Add suggestions_job_id column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS suggestions_job_id UUID REFERENCES jobs(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_suggestions_job_id 
ON messages(suggestions_job_id) 
WHERE suggestions_job_id IS NOT NULL;