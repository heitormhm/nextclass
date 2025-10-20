-- Add columns to library_materials if not exists
ALTER TABLE library_materials
ADD COLUMN IF NOT EXISTS disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE;

ALTER TABLE library_materials
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create library-materials storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('library-materials', 'library-materials', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for library-materials bucket
DROP POLICY IF EXISTS "Teachers can upload library materials" ON storage.objects;
CREATE POLICY "Teachers can upload library materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'library-materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Teachers can update their library materials" ON storage.objects;
CREATE POLICY "Teachers can update their library materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'library-materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Teachers can delete their library materials" ON storage.objects;
CREATE POLICY "Teachers can delete their library materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'library-materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Everyone can view published library materials" ON storage.objects;
CREATE POLICY "Everyone can view published library materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'library-materials');