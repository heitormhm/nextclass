-- Add tags column to annotations table
ALTER TABLE public.annotations 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add index for better performance on tag queries
CREATE INDEX IF NOT EXISTS idx_annotations_tags ON public.annotations USING GIN(tags);