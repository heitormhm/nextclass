-- Add audio_url column to store full lecture audio
ALTER TABLE lectures 
ADD COLUMN audio_url TEXT;

COMMENT ON COLUMN lectures.audio_url IS 'URL do áudio completo da aula no Supabase Storage';

-- Create storage bucket for lecture audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('lecture-audio', 'lecture-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (teachers) to upload audio
CREATE POLICY "Teachers can upload lecture audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lecture-audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow teachers to read their own audio
CREATE POLICY "Teachers can read their lecture audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lecture-audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow teachers to delete their own audio
CREATE POLICY "Teachers can delete their lecture audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lecture-audio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);